'use strict';
window.RikkaVoice=(()=>{
 const V=RikkaVoiceCore;
 // ════════ 旧通道（系统语音 / 壳子原生播放的 GPT-SoVITS）════════
 let epoch=0,counter=0,state=null,activeId='',timer=null,abort=null,audio=null,objectURL=null;
 let jaVoice=null,voicesReady=false;
 // ════════ 新通道：Web Audio 无缝播放 + 逐词高亮 ════════
 let S=null,sessSeq=0,actx=null,master=null,raf=0;
 const vvCache=new Map();             // key → Promise<{pcm,rate,marks,dur,voiced}>
 const rikkaHosts=new Map();
 let vvVoiceList=[];
 const isVV=()=>settings.voiceEngine==='voicevox';
 const nativeAudio=()=>settings.voiceEngine==='gptsovits'&&!!window.Android?.voiceRequest;
 const streamMode=()=>isVV()||(settings.voiceEngine==='gptsovits'&&!window.Android?.voiceRequest);
 const sleep=ms=>new Promise(r=>setTimeout(r,ms));
 // ── 朗读位置记忆：精确到词，停止 / 暂停 / 换段时都会记下 ──
 const POSKEY=id=>'rikka_voicepos:'+id;
 function loadPos(id){try{const o=JSON.parse(localStorage.getItem(POSKEY(id))||'null');return o&&Number.isInteger(o.p)?o:null;}catch(e){return null;}}
 function savePos(s,force){if(!s||!s.docId||!s.lastPos)return;const now=Date.now();if(!force&&now-(s.savedAt||0)<1500)return;s.savedAt=now;try{localStorage.setItem(POSKEY(s.docId),JSON.stringify({...s.lastPos,t:now}));}catch(e){}}
 function visibleParas(){const out=[];for(const el of document.querySelectorAll('.paragraph-card[id^="paragraph-"]')){const r=el.getBoundingClientRect();if(r.bottom>150&&r.top<innerHeight-220)out.push(Number(el.id.slice(10)));}return out;}
 // 按“朗读”时从哪开始：上次停下的词还在屏幕上 → 从那个词接着读；翻到别处了 → 从屏幕上看到的第一段读
 function startPoint(){
  if(!current)return{p:0,k:null};
  const saved=loadPos(current.id),vis=view==='reader'?visibleParas():[];
  if(saved&&saved.p<current.paragraphs.length&&(!vis.length||vis.includes(saved.p)))return{p:saved.p,k:saved.k??null};
  if(vis.length)return{p:vis[0],k:null};
  const b=RikkaShelf.bookmark(current);return{p:b?.paragraph??current.position??page*PAGE_SIZE,k:null};
 }

 // ── 直连通道（壳子 → ContentProvider → 六花声库）──
 const hostReq=new Map();let hostSeq=0;
 const useHost=base=>V.isLocal(base)&&!!window.Android?.voiceHostFetch;
 function hostFetch(obj){return new Promise((res,rej)=>{const id='vh'+(++hostSeq);const t=setTimeout(()=>{hostReq.delete(id);rej(Error('六花声库响应超时（第一次载入声音包可能较慢，请再试一次）'));},180000);hostReq.set(id,{res,rej,t});try{Android.voiceHostFetch(id,JSON.stringify(obj));}catch(e){clearTimeout(t);hostReq.delete(id);rej(e);}});}
 function hostResult(d){const r=d&&hostReq.get(d.id);if(!r)return;hostReq.delete(d.id);clearTimeout(r.t);if(d.ok){try{const bin=atob(String(d.base64||'').replace(/\s+/g,''));const u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);r.res(u.buffer);}catch(e){r.rej(Error('六花声库返回的数据无法解码：'+e.message));}}else r.rej(Error(d.error||'六花声库合成失败'));}
 function hostCall(m){let o=null;try{o=JSON.parse(Android.voiceHostCall(m)||'null');}catch(e){}if(!o)throw Error('没找到六花声库：请先安装“六花声库”App（装好后打开一次）');if(o.error)throw Error(o.error);return o;}
 const LOCAL_PORTS=[50021,50031,52021,38021,18021];const httpBases=new Map();
 async function httpBase(base){
  if(!V.isLocal(base))return base;if(httpBases.has(base))return httpBases.get(base);
  const u=new URL(base),cand=[Number(u.port)||50021,...LOCAL_PORTS].filter((p,i,a)=>a.indexOf(p)===i);
  for(const p of cand){const b=u.protocol+'//'+u.hostname+':'+p;try{const r=await fetch(b+'/rikka/info',{cache:'no-store'});if(r.ok&&(await r.json()).app==='rikka-voice'){httpBases.set(base,b);rikkaHosts.set(b,true);return b;}}catch(e){}}
  return base;
 }
 function vvError(e,base){
  if(e&&e.name==='AbortError')return e;
  if(e instanceof TypeError||/Failed to fetch|NetworkError|Load failed/i.test(String(e&&e.message)))
   return Error(V.isLocal(base)?'连不上六花声库：这个版本的六花外壳还没有“直连通道”，请让 muse 按构建说明加上；临时办法是在六花声库首页打开“HTTP 接口”':'连不上电脑上的声音引擎：确认电脑端已启动、和手机在同一 Wi-Fi，并已允许局域网访问');
  return e instanceof Error?e:Error(String(e));
 }
 async function isRikkaHost(base){
  if(rikkaHosts.has(base))return rikkaHosts.get(base);
  let ok=false;try{const r=await fetch(base+'/rikka/info',{cache:'no-store'});ok=r.ok&&(await r.json()).app==='rikka-voice';}catch(e){if(V.isLocal(base))throw vvError(e,base);}
  rikkaHosts.set(base,ok);return ok;
 }
 // 一段文字 → WAV 的 ArrayBuffer
 async function synthBuffer(part){
  if(!isVV()){ // GPT-SoVITS（无原生桥时）
   const url=V.endpoint(settings.voiceEndpoint);const key=sessionStorage.getItem('rikka_voice_key');
   const r=await fetch(url,{method:'POST',redirect:'error',headers:{'Content-Type':'application/json',...(key?{Authorization:'Bearer '+key}:{})},body:JSON.stringify(V.payload(part.text,settings))});
   if(!r.ok)throw Error('语音服务返回 HTTP '+r.status+'，请检查模型与接口配置');return r.arrayBuffer();
  }
  const p=V.vvParams(settings);let base=V.vvBase(settings.vvBase);const speaker=part.speaker;
  if(useHost(base))return hostFetch({text:part.text,speaker:speaker==null?null:Number(speaker),...p});
  base=await httpBase(base);
  if(await isRikkaHost(base)){
   const r=await fetch(base+'/rikka/tts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:part.text,speaker:speaker==null?null:Number(speaker),...p})});
   if(!r.ok){let m='';try{m=(await r.json()).detail;}catch(e){}throw Error(m||('六花声库返回 HTTP '+r.status));}
   return r.arrayBuffer();
  }
  let sp=speaker;if(sp==null){const vs=await loadVoiceList(false);if(!vs.length)throw Error('电脑引擎里没有可用的声音');sp=vs[0].id;}
  const qr=await fetch(base+'/audio_query?speaker='+encodeURIComponent(sp)+'&text='+encodeURIComponent(part.text),{method:'POST'});
  if(!qr.ok)throw Error('声音引擎 audio_query 返回 HTTP '+qr.status+'（声音编号 '+sp+' 是否存在？）');
  const q=await qr.json();q.speedScale=p.speed;q.pitchScale=p.pitch;q.intonationScale=p.intonation;q.volumeScale=1;
  const r=await fetch(base+'/synthesis?speaker='+encodeURIComponent(sp),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(q)});
  if(!r.ok)throw Error('声音引擎 synthesis 返回 HTTP '+r.status);
  return r.arrayBuffer();
 }
 // 解码后立刻处理：转成播放采样率（高质量 sinc）、防削波。放在预合成阶段做，不占用播放那一刻
 function prepare(d){
  const target=actx?actx.sampleRate:desiredRate();
  if(target&&d.rate!==target){d.pcm=V.resample(d.pcm,d.rate,target);d.rate=target;}
  V.safePeak(d.pcm);return d;
 }
 function cacheKey(part){const p=V.vvParams(settings);return[desiredRate(),settings.voiceEngine,settings.vvBase,settings.voiceEndpoint,part.speaker,p.speed,p.pitch,p.intonation,part.text].join('\u0001');}
 // 取（并缓存）一段的音频；同一段只合成一次，“预合成”也走这里
 function getAudio(part){
  const k=cacheKey(part);let pr=vvCache.get(k);
  if(!pr){pr=synthBuffer(part).then(buf=>prepare(V.parseWav(buf))).catch(e=>{vvCache.delete(k);throw vvError(e,settings.vvBase||'');});vvCache.set(k,pr);while(vvCache.size>24)vvCache.delete(vvCache.keys().next().value);}
  else{vvCache.delete(k);vvCache.set(k,pr);}
  return pr;
 }

 // ── 英文单词：词典 → AI 校对（可选，结果缓存）→ 规则拼读 ──
 const EN_KEY='rikka_en2kana';let enCache=null;const enPending=new Map();
 function enDict(){if(!enCache){try{enCache=JSON.parse(localStorage.getItem(EN_KEY)||'{}')||{};}catch(e){enCache={};}}return enCache;}
 async function ensureEnglish(text){
  if(settings.voiceEnglishAI===false||!window.HanaAI?.configured?.())return;
  const d=enDict(),words=V.englishWords(text).filter(w=>!(w in d)).slice(0,40);if(!words.length)return;
  const key=words.join(',');if(!enPending.has(key))enPending.set(key,(async()=>{
   const sys='把下面的英文单词或人名转换成日语片假名读法（日本人读这个词时的通用外来语写法，人名按日式读法）。只返回一个合法 JSON 对象，键是原单词（小写），值是片假名。不要解释，不要 Markdown。';
   const raw=await HanaAI.chat(config(),[{role:'system',content:sys},{role:'user',content:words.join('\n')}],{purpose:'furigana',maxTokens:400});
   const o=HanaCore.jsonObject(raw)||{};for(const[k,v]of Object.entries(o))if(typeof v==='string'&&/^[ァ-ヺー・]+$/.test(v))d[k.toLowerCase()]=v.replace(/・/g,'');
   for(const w of words)if(!(w in d))d[w]=null;   // 问过但没给的词不再重复问
   try{localStorage.setItem(EN_KEY,JSON.stringify(d));}catch(e){}
  })().finally(()=>enPending.delete(key)));
  await Promise.race([enPending.get(key),sleep(5000)]).catch(()=>{});
 }
 const englishMap=()=>{const d=enDict(),o={};for(const k in d)if(d[k])o[k]=d[k];return o;};

 // ── 广播剧模式：AI 判断每句台词是谁说的、什么情绪，自动配不同的声音和风格 ──
 const CAST_KEY=id=>'rikka_cast:'+id;const castCache=new Map(),castPending=new Map();
 function castStore(id){if(!castCache.has(id)){let o=null;try{o=JSON.parse(localStorage.getItem(CAST_KEY(id))||'null');}catch(e){}castCache.set(id,o&&o.q?o:{q:{},chars:{},done:{}});}return castCache.get(id);}
 function castSave(id){try{localStorage.setItem(CAST_KEY(id),JSON.stringify(castStore(id)));}catch(e){}}
 const castOn=()=>isVV()&&!!settings.voiceCast&&!!window.HanaAI?.configured?.();
 async function ensureCast(idx,wait=true){
  if(!castOn()||!current)return null;
  const doc=current,st=castStore(doc.id);if(st.done[idx])return st;
  // 从 idx 起取一批段落（约 2400 字 / 14 段）一次问完，后面的段落基本都能直接命中
  const win=[];let len=0;for(let i=idx;i<doc.paragraphs.length&&win.length<14&&len<2400;i++){if(st.done[i]&&win.length)break;win.push(i);len+=doc.paragraphs[i].length;}
  const key=doc.id+':'+win[0];
  if(!castPending.has(key))castPending.set(key,(async()=>{
   const marked=win.map(i=>V.markQuotes(doc.paragraphs[i],i));
   if(!marked.some(m=>m.count)){win.forEach(i=>st.done[i]=1);castSave(doc.id);return;}
   const known=Object.entries(st.chars).slice(0,30).map(([n,c])=>n+'('+(c.g==='m'?'男':c.g==='f'?'女':'?')+')').join('、');
   const sys='你是日语小说的有声书配音导演。文本中每句台词前都有编号，如 [P12-1]。请判断每句台词是谁说的、说话人性别、这句话的情绪。'+
    '同一个人始终用同一个名字（用原文里最常用的称呼）。情绪只能是 normal、happy、angry、sad、whisper、surprised、scared 之一。'+
    '只返回一个合法 JSON 对象：{"lines":{"P12-1":{"who":"名字","g":"f或m或u","e":"情绪"}}}。实在判断不了说话人就写 "who":"?"。不要解释，不要 Markdown。';
   const user=(known?'已知角色：'+known+'\n\n':'')+marked.map(m=>m.text).join('\n\n');
   const raw=await HanaAI.chat(config(),[{role:'system',content:sys},{role:'user',content:user}],{purpose:'analysis',maxTokens:1500});
   const o=HanaCore.jsonObject(raw)||{},lines=o.lines||o;
   for(const[k,v]of Object.entries(lines||{})){if(!/^P\d+-\d+$/.test(k)||!v||typeof v!=='object')continue;const who=String(v.who||'?').trim()||'?';st.q[k]={w:who,g:['f','m'].includes(v.g)?v.g:'u',e:String(v.e||'normal')};if(who!=='?'&&!st.chars[who])st.chars[who]={g:st.q[k].g};}
   win.forEach(i=>st.done[i]=1);castSave(doc.id);
  })().catch(e=>{if(!st.warned){st.warned=1;toast('角色识别失败，这几段先用默认声音：'+e.message);}win.forEach(i=>st.done[i]=1);}).finally(()=>castPending.delete(key)));
  if(wait)await Promise.race([castPending.get(key),sleep(12000)]).catch(()=>{});
  return st;
 }
 const MALE=new Set(['玄野武宏','白上虎太郎','青山龍星','剣崎雌雄','ちび式じい','麒ヶ島宗麟','雀松朱司','栗田まろん','†聖騎士 紅桜†','猫使ビィ','中部つるぎ','暁記ミタマ']);
 const EMO={happy:['あまあま','喜び','うきうき','元気','楽々','ぶりっ子','ハイテンション','わーい'],angry:['ツンツン','ツンギレ','怒り','つよつよ','おこ'],sad:['なみだめ','悲しみ','かなしい','よわよわ','しょんぼり','ヘロヘロ','へろへろ','泣き'],whisper:['ささやき','ヒソヒソ','内緒話','ないしょ'],scared:['なみだめ','よわよわ','恐怖','びくびく'],surprised:['驚き','びっくり','ハイテンション']};
 function voiceChars(){const m=new Map();for(const v of vvVoiceList){const c=v.character||v.group||v.name;if(!m.has(c))m.set(c,[]);m.get(c).push(v);}return m;}
 function voiceForLine(info){
  const chars=voiceChars();const fallback=settings.vvDialogueSpeaker!==''&&settings.vvDialogueSpeaker!=null?settings.vvDialogueSpeaker:(settings.vvSpeaker??null);
  if(!info||info.w==='?'||!chars.size)return fallback;
  const st=castStore(current.id),c=st.chars[info.w]||(st.chars[info.w]={g:info.g});
  if(!c.v||!chars.has(c.v)){
   const narr=vvVoiceList.find(v=>String(v.id)===String(settings.vvSpeaker));const narrChar=narr?(narr.character||narr.group):null;
   const used=new Set(Object.values(st.chars).map(x=>x.v).filter(Boolean));
   const ok=[...chars.keys()].filter(n=>n!==narrChar);
   const fit=n=>c.g==='m'?MALE.has(n):c.g==='f'?!MALE.has(n):true;
   c.v=ok.find(n=>fit(n)&&!used.has(n))||ok.find(n=>!used.has(n))||ok.find(fit)||ok[0]||narrChar;castSave(current.id);
  }
  const styles=chars.get(c.v)||[];if(!styles.length)return fallback;
  const keys=EMO[info.e]||[];const hit=keys.length&&styles.find(v=>keys.some(k=>(v.style||v.name).includes(k)));
  return(hit||styles.find(v=>/ノーマル|normal|Neutral/i.test(v.style||v.name))||styles[0]).id;
 }

 // ── 段落 → 朗读片段（按词切，带读音对齐、英文转写、台词声音）──
 async function paraParts(text,index){
  let toks=null;
  try{
   toks=(index!=null&&typeof shownTokens==='object'&&shownTokens&&shownTokens[index])||null;
   if(!toks){toks=await tokenize(text);if(index!=null&&current&&current.paragraphs[index]===text)toks=resolveTokens(index,toks);}
   if(toks.map(t=>t.s).join('')!==text)toks=null;
  }catch(e){toks=null;}
  const cast=index!=null&&castOn();
  await Promise.all([ensureEnglish(text),cast?ensureCast(index):null,cast&&!vvVoiceList.length?loadVoiceList(false).catch(()=>{}):null]);
  if(cast&&current)ensureCast(Math.min(current.paragraphs.length-1,index+8),false);   // 提前识别后面几段
  const narr=isVV()?(settings.vvSpeaker??null):null,dlg=isVV()?settings.vvDialogueSpeaker:null;
  const mode=isVV()?(settings.voiceReadingMode||'smart'):'engine';
  let parts;
  if(toks)parts=V.tokenParts(toks,{mode,narrator:narr,dialogue:dlg===''||dlg===undefined?null:dlg,split:cast,english:englishMap(),max:isVV()?150:120,firstMax:60});
  else parts=V.dialogueParts(text,narr,dlg===''||dlg===undefined?null:dlg).map(p=>({...p,toks:null}));
  if(cast){const st=castStore(current.id);for(const p of parts)if(p.kind==='d'&&p.qi){const info=st.q['P'+index+'-'+p.qi];if(info){p.speaker=voiceForLine(info);p.who=info.w;}}}
  return parts;
 }

 // ── Web Audio ──
 // 播放采样率直接用声音本身的采样率（VOICEVOX 24kHz），由系统的高质量转换器转到喇叭；
 // 不让浏览器用线性插值去转（那是“电流声”的来源）
 const desiredRate=()=>isVV()?24000:settings.voiceEngine==='gptsovits'?32000:0;
 function audioCtx(){
  const want=desiredRate();
  if(actx&&want&&Math.abs(actx.sampleRate-want)>1&&!S){try{actx.close();}catch(e){}actx=null;}
  if(!actx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw Error('这个 WebView 不支持 Web Audio，无法播放');
   try{actx=want?new AC({latencyHint:'playback',sampleRate:want}):new AC({latencyHint:'playback'});}catch(e){actx=new AC({latencyHint:'playback'});}
   master=actx.createGain();master.connect(actx.destination);}
  master.gain.value=Math.max(0,Math.min(1,Number(settings.volume)||1));
  if(actx.state!=='running'&&!(S&&S.paused))actx.resume().catch(()=>{});
  return actx;
 }
 const live=s=>s&&s===S;
 function clearHighlight(){$$('.token.voice-now,.token.voice-read').forEach(el=>el.classList.remove('voice-now','voice-read'));}
 function stopStream(){
  const s=S;S=null;if(raf){cancelAnimationFrame(raf);raf=0;}
  if(s){savePos(s,true);try{s.wake?.release();}catch(e){}if(s.docId&&window.RikkaShelf?.capture)try{RikkaShelf.capture();}catch(e){}}
  if(s)for(const it of s.items){try{it.src.stop();}catch(e){}try{it.src.disconnect();}catch(e){}try{it.env?.disconnect();}catch(e){}}
  clearHighlight();
  if(actx&&actx.state==='suspended')actx.resume().catch(()=>{});
 }
 // 新的朗读会话：从 para 段第 startPart 片段（片段内 offset 秒）开始
 function startSession(o){
  stopStream();
  const s={id:++sessSeq,docId:o.docId||null,continuous:!!o.continuous,speakOnly:!!o.speakOnly,para:o.para??0,lastPara:o.para??0,plan:[],items:[],nextAt:0,paused:false,planDone:false,feeding:false,cur:null,hl:null,pendingNext:null};
  S=s;
  if(o.paused){s.paused=true;actx.suspend().catch(()=>{});}
  if(s.docId){
   try{navigator.wakeLock?.request('screen').then(l=>{if(live(s))s.wake=l;else l.release();}).catch(()=>{});}catch(e){}
   const min=Number(settings.voiceSleep)||0;if(min>0)s.sleepAt=Date.now()+min*60000;
  }
  return s;
 }
 function planPara(s,para,parts,from=0,offset=0,gap=0){parts.slice(from).forEach((part,i)=>s.plan.push({para,part,offset:i===0?offset:0,gap:i===0?gap:0}));}
 function nextParaReady(s){
  if(!s.continuous||!current||current.id!==s.docId)return null;
  const idx=s.lastPara+1;if(idx>=current.paragraphs.length)return null;
  if(!s.pendingNext||s.pendingNext.idx!==idx)s.pendingNext={idx,parts:paraParts(current.paragraphs[idx],idx)};
  return s.pendingNext;
 }
 async function feed(s){
  if(s.feeding)return;s.feeding=true;
  try{
   while(live(s)){
    if(s.plan.length<3){const nx=nextParaReady(s);if(nx&&!s.plan.length){const parts=await nx.parts;if(!live(s))return;s.pendingNext=null;s.lastPara=nx.idx;planPara(s,nx.idx,parts,0,0,Math.max(0,Number(settings.speechGap)||0));continue;}}
    if(!s.plan.length)break;
    for(let i=0;i<Math.min(2,s.plan.length);i++)getAudio(s.plan[i].part).catch(()=>{});          // 预合成后面两句（再多会和播放抢 CPU）
    if(s.plan.length<=2){const nx=nextParaReady(s);if(nx)nx.parts.then(ps=>{if(live(s)&&ps[0])getAudio(ps[0]).catch(()=>{});}).catch(()=>{});}
    while(live(s)&&s.items.length&&s.nextAt-actx.currentTime>(document.hidden?150:8))await sleep(250);   // 前台提前排 8 秒；切到后台时多排一些，防止后台计时器变慢造成断音
    if(!live(s))return;
    const e=s.plan.shift();
    if(!s.items.length&&!s.cur)status('正在合成…');
    let data;try{data=await getAudio(e.part);}catch(err){if(live(s))fail(s,err);return;}
    if(!live(s))return;
    schedule(s,e,data);
   }
   if(live(s))s.planDone=true;
  }finally{s.feeding=false;}
 }
 function schedule(s,e,data){
  const ctx=audioCtx();
  if(Math.abs(data.rate-ctx.sampleRate)>1){data.pcm=V.resample(data.pcm,data.rate,ctx.sampleRate);data.rate=ctx.sampleRate;}
  const buf=ctx.createBuffer(1,Math.max(1,data.pcm.length),data.rate);buf.copyToChannel(data.pcm,0);
  const src=ctx.createBufferSource();src.buffer=buf;
  const off=Math.max(0,Math.min(e.offset||0,data.dur-0.05));
  const when=Math.max(ctx.currentTime+0.04,s.nextAt+(e.gap||0)),endAt=when+data.dur-off;
  // 每段前后 6 毫秒淡入淡出：句子拼接处、从中间某个词开始读时都不会“啪”一声
  const env=ctx.createGain();env.gain.setValueAtTime(0,when);env.gain.linearRampToValueAtTime(1,when+0.006);env.gain.setValueAtTime(1,Math.max(when+0.006,endAt-0.006));env.gain.linearRampToValueAtTime(0,endAt);
  src.connect(env);env.connect(master);
  src.start(when,off);
  const it={para:e.para,part:e.part,when,off,end:endAt,src,env,tl:V.timeline(e.part,data,V.vvParams(settings).speed)};
  s.items.push(it);
  // 句间停顿：真人朗读在句号、台词结束后都会停一下；跟读模式再留出跟念的时间
  const sp=Number(settings.voiceSentencePause??.35)||0;
  const pause=e.part.endQuote?sp+0.15:e.part.endSentence?sp:/[、，,]$/.test(e.part.text)?Math.min(.15,sp/2):0;
  s.nextAt=it.end+pause+(s.docId&&settings.voiceShadow?Math.min(10,(data.dur-off)*1.1+0.4):0);
  if(!raf)raf=requestAnimationFrame(tick);
 }
 function tick(){
  raf=0;const s=S;if(!s||!actx)return;
  if(s.sleepAt&&Date.now()>=s.sleepAt){stopStream();paint('定时到了，已停止朗读（位置已记住）');return;}
  // 声音从“排进去”到“真正从喇叭/耳机出来”有延迟（蓝牙耳机尤其明显），高亮按听到的时间走；还可以在设置里手动校准
  const lag=(actx.outputLatency||0)+(actx.baseLatency||0)+(Number(settings.voiceHlOffset)||0)/1000;
  const t=actx.currentTime-lag;
  while(s.items.length>1&&s.items[0].end<t-0.05){const old=s.items.shift();try{old.src.disconnect();old.env?.disconnect();}catch(e){}}
  const it=s.items.find(x=>t>=x.when-0.02&&t<x.end);
  if(it){
   if(it!==s.cur){const paraChanged=!s.cur||s.cur.para!==it.para;if(s.cur&&!paraChanged)markAllRead(s.cur);s.cur=it;if(paraChanged)$$('.token.voice-read,.token.voice-now').forEach(el=>el.classList.remove('voice-read','voice-now'));if(paraChanged){onParagraph(s,it.para);if(!it.tl.length){s.lastPos={p:it.para,k:null};savePos(s,true);}}if(!s.paused)status('正在朗读');}
   highlight(s,it,t-it.when+it.off);
  }else if(s.items.length&&actx.currentTime-lag>=s.items[s.items.length-1].end-0.01&&!s.plan.length&&s.planDone&&!s.feeding){finish(s);return;}
  else if(s.items.length&&t>=s.items[s.items.length-1].end&&!s.paused&&s.cur)status('正在合成…');
  raf=requestAnimationFrame(tick);
 }
 function onParagraph(s,para){
  s.para=para;paint();
  if(!s.docId||!settings.speechFollow||view!=='reader'||!current||current.id!==s.docId)return;
  if(page!==Math.floor(para/PAGE_SIZE)){page=Math.floor(para/PAGE_SIZE);$('#main').scrollTo(0,0);renderReader(para);}
  else{const el=$('#paragraph-'+para);if(el){const r=el.getBoundingClientRect();if(r.top<0||r.top>innerHeight*0.6)el.scrollIntoView({behavior:'smooth',block:'start'});}}
 }
 const tokEl=(para,k)=>document.querySelector('#paragraph-'+para+' .japanese [data-token="'+k+'"]');
 function markAllRead(it){if(!it.tl.length)return;for(let j=it.hlIdx??0;j<it.tl.length;j++){const el=tokEl(it.para,it.tl[j].k);if(el){el.classList.remove('voice-now');el.classList.add('voice-read');}}it.hlIdx=it.tl.length;}
 // 读到哪个词亮哪个词；中间被跳过的短词（は、の、标点）也一起标成“已读”，不会漏字
 function highlight(s,it,tt){
  if(!it.tl.length||!s.docId)return;
  let idx=-1;for(let i=0;i<it.tl.length;i++){if(it.tl[i].s<=tt+0.03)idx=i;else break;}
  if(idx<0)return;
  let cur=idx;while(cur>0&&it.tl[cur].e<=it.tl[cur].s)cur--;
  const k=it.tl[cur].k,key=it.para+':'+k;
  if(s.hl&&s.hl.key===key&&s.hl.el&&s.hl.el.isConnected&&(it.hlIdx??0)>idx)return;
  for(let j=it.hlIdx??0;j<=idx;j++){if(j===cur)continue;const el=tokEl(it.para,it.tl[j].k);if(el){el.classList.remove('voice-now');el.classList.add('voice-read');}}
  it.hlIdx=idx+1;
  if(s.hl&&s.hl.el&&s.hl.key!==key){s.hl.el.classList.remove('voice-now');if(s.hl.para===it.para)s.hl.el.classList.add('voice-read');}
  const el=tokEl(it.para,k);s.hl={key,el,para:it.para};
  s.lastPos={p:it.para,k};savePos(s,false);
  if(!el)return;
  el.classList.remove('voice-read');el.classList.add('voice-now');
  if(settings.speechFollow){const r=el.getBoundingClientRect();if(r.bottom>innerHeight-230||r.top<150)el.scrollIntoView({behavior:'smooth',block:'center'});}
 }
 function finish(s){if(!live(s))return;stopStream();paint('朗读完成');}
 function fail(s,err){if(!live(s))return;stopStream();paint(err.message);toast(err.message);if(isVV()&&V.isLocal(settings.vvBase||'')&&/六花声库/.test(err.message))offerLaunch();}

 // 从第 para 段开始读；k = 从这一段里的第几个词开始（点词后接着读）
 async function readFrom(para,o={}){
  if(!current)return;
  para=Math.max(0,Math.min(current.paragraphs.length-1,Number(para)||0));
  const s=startSession({docId:current.id,continuous:o.continuous!==false,para,paused:!!o.paused});
  paint(currentLabel()+' · 准备中…');
  const parts=await paraParts(current.paragraphs[para],para);if(!live(s))return;
  let from=0,offset=0;
  if(o.k!=null){
   const idx=parts.findIndex(p=>p.toks&&p.toks.some(t=>t.k>=o.k));from=Math.max(0,idx);
   if(idx>=0){try{const data=await getAudio(parts[idx]);if(!live(s))return;const hit=V.timeline(parts[idx],data,V.vvParams(settings).speed).find(x=>x.k>=o.k);offset=hit?Math.max(0,hit.s-0.06):0;}catch(e){if(live(s))fail(s,e);return;}}
  }
  planPara(s,para,parts,from,offset,0);
  onParagraph(s,para);
  feed(s);
 }
 async function speakStream(text){
  const s=startSession({speakOnly:true,continuous:false});
  const parts=await paraParts(text,null);if(!live(s)||!parts.length)return;
  planPara(s,0,parts);feed(s);
 }

 // ════════ 公共入口 ════════
 function ensureVoices(){try{if(!window.speechSynthesis)return;const vs=speechSynthesis.getVoices();const jv=vs.find(v=>v.lang&&v.lang.toLowerCase().startsWith('ja'));if(jv){jaVoice=jv;voicesReady=true;}if(!voicesReady&&typeof speechSynthesis.onvoiceschanged!=='undefined'){speechSynthesis.onvoiceschanged=()=>{const vs2=speechSynthesis.getVoices();const j2=vs2.find(v=>v.lang&&v.lang.toLowerCase().startsWith('ja'));if(j2){jaVoice=j2;voicesReady=true;}};}}catch(e){}}
 try{ensureVoices();}catch(e){}
 const currentLabel=()=>settings.voiceEngine==='system'?'系统日语':isVV()?(V.isLocal(settings.vvBase||'')?'六花声库':'电脑声音'):'六花音色服务';
 function active(){if(S)return{docId:S.docId,para:S.cur?S.cur.para:S.para,paused:S.paused};if(state)return{docId:state.docId,para:state.paragraph,paused:state.paused};return null;}
 function paint(message){
  const a=active();setTimeout(notifyNative,0);const host=$('#voice-player');host.classList.toggle('hidden',!a||!a.docId);
  if(message!==undefined){$('#voice-status').textContent=message||'';$('#voice-test-status').textContent=message||'';}
  $('#voice-pause').textContent=a?.paused?'继续':'暂停';$('#voice-prev').disabled=!a||!a.docId||a.para<=0;$('#voice-next').disabled=!a||!a.docId||a.para>=((current?.paragraphs.length||1)-1);
  $$('.paragraph-card.speaking').forEach(x=>x.classList.remove('speaking'));if(a&&current&&a.docId===current.id)$('#paragraph-'+a.para)?.classList.add('speaking');
 }
 function status(suffix){const a=active();if(!a)return;let who='';if(S&&S.cur&&S.cur.part.kind==='d')who=S.cur.part.who&&S.cur.part.who!=='?'?' · '+S.cur.part.who:' · 台词';paint((a.docId?'第 '+(a.para+1)+' 段 · ':currentLabel()+' · ')+suffix+who);}
 function stop(silent=false){
  epoch++;clearTimeout(timer);activeId='';state=null;abort?.abort();abort=null;
  if(window.Android?.stopVoice)Android.stopVoice();else if(window.Android?.stopSpeech)Android.stopSpeech();
  window.speechSynthesis?.cancel();if(audio){audio.pause();audio.src='';audio=null;}if(objectURL){URL.revokeObjectURL(objectURL);objectURL=null;}
  stopStream();paint(silent?'':'朗读已结束');
 }
 async function speak(text){
  if(streamMode()){stop(true);audioCtx();return speakStream(text);}
  stop(true);const parts=V.chunks(text);if(!parts.length)return;state={parts,part:0,paused:false,docId:null,paragraph:0,continuous:false};await play(epoch);
 }
 async function read(index,continuous=true){
  if(!current)return;
  if(streamMode()){stop(true);audioCtx();return readFrom(index,{continuous});}
  stop(true);index=Math.max(0,Math.min(current.paragraphs.length-1,Number(index)||0));state={parts:V.chunks(current.paragraphs[index]),part:0,paused:false,docId:current.id,paragraph:index,continuous};await play(epoch);
 }
 function pause(){
  if(S){
   S.paused=!S.paused;
   if(S.paused){actx?.suspend().catch(()=>{});savePos(S,true);status('已暂停');}
   else{audioCtx();actx?.resume().catch(()=>{});status(S.cur?'正在朗读':'正在合成…');}
   paint();return;
  }
  if(!state)return;state.paused=!state.paused;clearTimeout(timer);if(state.paused){if(nativeAudio()&&window.Android?.pauseVoice)Android.pauseVoice();else{speechSynthesis?.pause();audio?.pause();}status(settings.voiceEngine==='system'?'已暂停 · 继续时从本句开始':'已暂停');}else{if(state.waiting){safe(()=>play(epoch))();}else if(state.pendingDone){state.pendingDone=false;safe(()=>done(epoch))();}else if(settings.voiceEngine==='system'){safe(()=>play(epoch))();}else if(nativeAudio()&&window.Android?.resumeVoice){Android.resumeVoice();status('正在朗读');}else if(audio){safe(async()=>{await audio.play();status('正在朗读');})();}else safe(()=>play(epoch))();}paint();
 }

 // ── 旧通道播放（系统语音、原生 GPT-SoVITS）──
 async function play(mark){if(mark!==epoch||!state||state.paused)return;
  try{
   if(state.docId&&settings.speechFollow&&view==='reader'){
    const target=state.paragraph;
    if(page!==Math.floor(target/PAGE_SIZE)){page=Math.floor(target/PAGE_SIZE);$('#main').scrollTo(0,0);await renderReader(target);}
    if(mark!==epoch||!state)return;
    $('#paragraph-'+target)?.scrollIntoView({behavior:'instant',block:'start'});
   }
   state.waiting=false;const text=state.parts[state.part];if(!text){await done(mark);return;}
   activeId='voice_'+mark+'_'+(++counter);const id=activeId;status(settings.voiceEngine==='system'?'正在朗读':'正在合成…');
   if(settings.voiceEngine==='gptsovits'&&window.Android?.voiceRequest){Android.voiceRequest(id,V.endpoint(settings.voiceEndpoint),JSON.stringify(V.payload(text,settings)),Number(settings.pitch),Number(settings.volume),String(settings.voiceModelTag||'rikka-v1'));return;}
   if(window.speechSynthesis){speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='ja-JP';u.rate=Number(settings.rate);u.pitch=Number(settings.pitch);u.volume=Number(settings.volume);try{ensureVoices();}catch(e){}if(jaVoice)u.voice=jaVoice;else{try{const fv=speechSynthesis.getVoices().find(v=>v.lang&&v.lang.toLowerCase().startsWith('ja'));if(fv){jaVoice=fv;u.voice=fv;}}catch(e){}}u.onend=()=>native({id,event:'done'});u.onerror=e=>native({id,event:'error',message:'系统日语朗读不可用：'+e.error});speechSynthesis.speak(u);}
   else throw Error('这台设备没有可用的日语朗读引擎');
  }catch(e){if(mark===epoch&&state){stop(true);paint(e.message);toast(e.message);}}
 }
 async function done(mark){if(mark!==epoch||!state)return;if(state.paused){state.pendingDone=true;return;}state.part++;if(state.part<state.parts.length){await play(mark);return;}
  if(state.continuous&&current?.id===state.docId&&state.paragraph+1<current.paragraphs.length){state.paragraph++;state.part=0;state.parts=V.chunks(current.paragraphs[state.paragraph]);state.waiting=true;status('段间停顿');timer=setTimeout(()=>play(mark),Number(settings.speechGap)*1000);}else{stop(true);paint('朗读完成');}
 }
 function native(data){if(!state||data.id!==activeId)return;if(data.event==='done'){safe(()=>done(epoch))();}else if(data.event==='error'){stop(true);paint(data.message||'语音服务暂时不可用');toast(data.message||'语音服务暂时不可用');}else if(data.event==='start'){if(!state.paused)status('正在朗读');}else if(data.event==='interrupted'){stop(true);paint('朗读已暂停：音频被其他应用占用');}}
 function offerLaunch(){if(window.Android?.openVoiceHost){try{Android.openVoiceHost();toast('已尝试打开六花声库，接口开启后再点一次朗读');}catch(e){}}}

 // ── 点词：停在点到的地方，看完释义接着从那里读 ──
 let tapWasPlaying=false,tapTarget=null,tapTimer=0;
 function onTokenTap(e){
  const tk=e.target.closest&&e.target.closest('[data-token][data-paragraph]');
  if(!tk||!S||!S.docId||!current||S.docId!==current.id)return;
  tapTarget={p:Number(tk.dataset.paragraph),k:Number(tk.dataset.token)};
  if(!tapTimer)tapWasPlaying=!S.paused;
  if(!S.paused){S.paused=true;actx?.suspend().catch(()=>{});}
  status('已暂停 · 关掉释义后从这个词接着读');
  // 释义弹窗可能要等 AI 返回才打开：最多等 4 秒；一直没弹窗（比如只是点了一下）就直接从这个词接着读
  clearInterval(tapTimer);const t0=Date.now();
  tapTimer=setInterval(()=>{if($('#dialog').open){clearInterval(tapTimer);tapTimer=0;}else if(Date.now()-t0>(tapSawDialog()?0:4000)){clearInterval(tapTimer);tapTimer=0;resumeFromTap();}},250);
 }
 let tapDialogSeen=false;const tapSawDialog=()=>tapDialogSeen;
 function resumeFromTap(){
  if(!tapTarget||!S)return;const t=tapTarget;tapTarget=null;clearInterval(tapTimer);tapTimer=0;tapDialogSeen=false;
  const cont=S.continuous;
  if(tapWasPlaying)audioCtx();
  safe(()=>readFrom(t.p,{k:t.k,continuous:cont,paused:!tapWasPlaying}))();
 }

 // ── 声音列表 ──
 async function loadVoiceList(render=true){
  let base=V.vvBase($('#vv-base')?.value||settings.vvBase);let list=[];
  if(useHost(base)){list=hostCall('voices').map(v=>({id:v.id,name:v.name,group:v.engineName,credit:v.credit,character:v.character,style:v.style}));vvVoiceList=list;if(render)renderVoiceSelects();if(!list.length)throw Error('六花声库里还没有声音：打开六花声库 → 声音，先下载一个');return list;}
  base=await httpBase(base);
  try{
   if(await isRikkaHost(base)){const r=await fetch(base+'/rikka/voices',{cache:'no-store'});list=(await r.json()).map(v=>({id:v.id,name:v.name,group:v.engineName,credit:v.credit,character:v.character,style:v.style}));}
   else{const r=await fetch(base+'/speakers',{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);for(const sp of await r.json())for(const st of sp.styles||[])if(!st.type||st.type==='talk')list.push({id:st.id,name:sp.name+'（'+st.name+'）',group:sp.name,credit:null,character:sp.name,style:st.name});}
  }catch(e){throw vvError(e,base);}
  vvVoiceList=list;if(render)renderVoiceSelects();return list;
 }
 function renderVoiceSelects(){
  const opt=(v,sel)=>'<option value="'+v.id+'"'+(String(sel)===String(v.id)?' selected':'')+'>'+C.escape(v.name)+'　#'+v.id+'</option>';
  const groups={};for(const v of vvVoiceList)(groups[v.group||'']=groups[v.group||'']||[]).push(v);
  const body=sel=>Object.entries(groups).map(([g,vs])=>g?'<optgroup label="'+C.escape(g)+'">'+vs.map(v=>opt(v,sel)).join('')+'</optgroup>':vs.map(v=>opt(v,sel)).join('')).join('');
  const n=$('#vv-speaker'),d=$('#vv-dialogue');if(!n||!d)return;
  n.innerHTML='<option value="">六花声库的默认声音</option>'+body(settings.vvSpeaker);
  d.innerHTML='<option value="">和旁白相同</option>'+body(settings.vvDialogueSpeaker);
  const credits=[...new Set(vvVoiceList.filter(v=>String(v.id)===String(settings.vvSpeaker)||String(v.id)===String(settings.vvDialogueSpeaker)).map(v=>v.credit).filter(Boolean))];
  $('#vv-credit').textContent=credits.length?'声音署名：'+credits.join('、')+'（公开发布朗读音频时需要标注）':'';
 }
 function renderSettings(){for(const[id,key]of [['voice-engine','voiceEngine'],['voice-endpoint','voiceEndpoint'],['voice-reference','voiceReference'],['voice-transcript','voiceTranscript'],['voice-model-tag','voiceModelTag'],['speech-rate','rate'],['speech-pitch','pitch'],['speech-volume','volume'],['speech-gap','speechGap'],['voice-temperature','voiceTemperature'],['vv-base','vvBase'],['voice-reading-mode','voiceReadingMode'],['voice-intonation','voiceIntonation']]){const el=$('#'+id);if(el)el.value=settings[key]??'';}$('#speech-follow').checked=settings.speechFollow;if($('#voice-shadow'))$('#voice-shadow').checked=!!settings.voiceShadow;
  for(const[id,key,fmt]of [['voice-sentence-pause','voiceSentencePause',v=>Number(v??.35).toFixed(2)+' 秒'],['voice-hl-offset','voiceHlOffset',v=>!Number(v)?'自动':(v>0?'晚 ':'早 ')+Math.abs(v)+' 毫秒']]){const el=$('#'+id);if(el){el.value=settings[key]??(key==='voiceSentencePause'?.35:0);const lab=$('#'+id+'-value');if(lab)lab.textContent=fmt(settings[key]);}}
  if($('#voice-hl-style'))$('#voice-hl-style').value=settings.voiceHlStyle||'block';if($('#voice-hl-color')&&settings.voiceHlColor)$('#voice-hl-color').value=settings.voiceHlColor;if($('#voice-hl-read'))$('#voice-hl-read').checked=settings.voiceHlRead!==false;
  if($('#voice-cast'))$('#voice-cast').checked=!!settings.voiceCast;if($('#voice-english-ai'))$('#voice-english-ai').checked=settings.voiceEnglishAI!==false;
  if($('#voice-background')){$('#voice-background').checked=settings.voiceBackground!==false;const ok=(()=>{try{return typeof window.Android?.readAloudVersion==='function'&&Number(Android.readAloudVersion())>=2;}catch(e){return false;}})();$('#voice-background-hint').textContent=ok?'外壳已支持：锁屏、切到别的 App 都会继续读，通知栏和耳机按键可以控制。':'当前外壳还不支持后台听书：需要 muse 按构建说明给外壳加上后台服务（一次性的），在那之前切到后台会停止朗读。';}if($('#voice-sleep'))$('#voice-sleep').value=String(settings.voiceSleep||0);$('#voice-key').value='';values();renderVoiceSelects();if(isVV()&&!vvVoiceList.length)loadVoiceList().catch(e=>{$('#vv-list-status').textContent=e.message;});if(window.RikkaDraft)RikkaDraft.restore('voice');}
 function values(){$('#rate-value').textContent=Number(settings.rate).toFixed(2)+'×';$('#pitch-value').textContent=Number(settings.pitch).toFixed(2)+'×';$('#volume-value').textContent=Math.round(settings.volume*100)+'%';$('#gap-value').textContent=Number(settings.speechGap).toFixed(1)+' 秒';$('#temperature-value').textContent=Number(settings.voiceTemperature).toFixed(2);if($('#intonation-value'))$('#intonation-value').textContent=Number(settings.voiceIntonation??1).toFixed(2);
  if(master)master.gain.value=Math.max(0,Math.min(1,Number(settings.volume)||1));
  $('#voice-service-fields').classList.toggle('hidden',settings.voiceEngine!=='gptsovits');$('#vv-fields')?.classList.toggle('hidden',!isVV());
  $('#voice-config-status').textContent=settings.voiceEngine==='system'?'使用手机安装的日语语音包；这不是六花音色。':isVV()?(V.isLocal(settings.vvBase||'')?'使用手机上的“六花声库”App：读到哪个词，哪个词就会亮起来；点词查意思会自动暂停，关掉后从那个词接着读。':'直接连接电脑上的 VOICEVOX 兼容引擎（AivisSpeech 等）。'):settings.voiceEndpoint?'已填写音色服务地址，点“试听”检查模型是否可用。':'尚未连接六花音色服务。填好服务后才能使用该音色。';}
 function save(){
  if(settings.voiceEngine==='gptsovits'){settings.voiceEndpoint=V.endpoint($('#voice-endpoint').value);settings.voiceReference=$('#voice-reference').value.trim();settings.voiceTranscript=$('#voice-transcript').value.trim();settings.voiceModelTag=$('#voice-model-tag').value.trim()||'rikka-v1';const key=$('#voice-key').value.trim();if(key){if(window.Android?.saveVoiceKey){const result=Android.saveVoiceKey(key);if(result!=='ok')throw Error(result);}else sessionStorage.setItem('rikka_voice_key',key);}$('#voice-key').value='';}
  if(isVV()){const nb=V.vvBase($('#vv-base').value);if(nb!==settings.vvBase){settings.vvBase=nb;vvCache.clear();}}
  if(window.RikkaDraft)RikkaDraft.clear('voice');saveSettings();values();
 }
 // ── 高亮样式（背景块 / 马克笔 / 下划线 / 只变字色，颜色可自选）──
 function applyHlStyle(){const b=document.body;if(!b)return;b.dataset.vh=settings.voiceHlStyle||'block';b.dataset.vhRead=settings.voiceHlRead===false?'0':'1';if(settings.voiceHlColor)b.style.setProperty('--vh',settings.voiceHlColor);else b.style.removeProperty('--vh');}
 // ── 后台听书：把状态告诉壳子（通知栏 / 耳机按键），壳子用 RikkaVoice.remote(...) 回传操作 ──
 // 只和“防崩溃版”壳子（提供 readAloudVersion()>=2）通信：旧版壳子的后台服务在“刚启动就停止”时会让整个 App 闪退。
 // 另外只在状态真的变化时才通知，并且“停止”延迟 1.5 秒发送，避免启动-停止挤在一起。
 let nativeSent='',nativeStopTimer=0,nativeOn=false;
 function nativeOk(){try{return settings.voiceBackground!==false&&typeof window.Android?.readAloudVersion==='function'&&Number(Android.readAloudVersion())>=2&&typeof Android.readAloudState==='function';}catch(e){return false;}}
 function notifyNative(){
  if(!nativeOk())return;
  const a=active(),playing=!!(a&&a.docId&&(S?S.cur:state));
  if(!playing){if(nativeOn&&!nativeStopTimer)nativeStopTimer=setTimeout(()=>{nativeStopTimer=0;const b=active();if(b&&b.docId)return;nativeOn=false;nativeSent='';try{Android.readAloudState('{"active":false}');}catch(e){}},1500);return;}
  clearTimeout(nativeStopTimer);nativeStopTimer=0;
  const msg=JSON.stringify({active:true,paused:!!a.paused,title:current?.title||'',paragraph:a.para+1,total:current?.paragraphs.length||0,text:(current?.paragraphs[a.para]||'').slice(0,60)});
  if(msg===nativeSent)return;nativeSent=msg;nativeOn=true;
  try{Android.readAloudState(msg);}catch(e){}
 }
 function remote(cmd){
  const a=active();
  if(cmd==='toggle'||cmd==='play'||cmd==='pause'){if(!a){if(cmd!=='pause')$('#read-aloud')?.click();return;}if(cmd==='toggle'||(cmd==='play')===!!a.paused)pause();return;}
  if(cmd==='stop'){stop();return;}
  if((cmd==='next'||cmd==='prev')&&a){try{audioCtx();}catch(e){}safe(()=>read((a.para||0)+(cmd==='next'?1:-1),S?S.continuous:state?.continuous))();}
 }
 // ── 角色声音表：看 / 改 AI 识别出来的角色用哪个声音 ──
 async function showCast(){
  if(!current){toast('先打开一本书');return;}
  if(!vvVoiceList.length)try{await loadVoiceList(false);}catch(e){toast(e.message);return;}
  const st=castStore(current.id),names=Object.keys(st.chars);
  const chars=[...voiceChars().keys()];
  const opt=sel=>'<option value="">自动</option>'+chars.map(c=>'<option'+(c===sel?' selected':'')+'>'+C.escape(c)+'</option>').join('');
  const rows=names.length?names.map((n,i)=>'<div class="correction-item"><b>'+C.escape(n)+'</b><select data-cast="'+i+'">'+opt(st.chars[n].v)+'</select></div>').join(''):'<p class="hint">还没有识别出角色。打开“广播剧模式”后朗读带台词的段落，AI 会自动识别；之后可以在这里改每个角色用哪个声音。</p>';
  showDialog('角色声音表 · '+current.title,rows+'<div class="button-row wrap"><button id="cast-reset" class="text-button danger">清空本书的角色识别</button></div><p class="hint">同一角色的不同情绪会自动换成该声音的对应风格（开心→あまあま/喜び，生气→ツンツン，难过→なみだめ，小声→ささやき）。</p>');
  $('#dialog-body').querySelectorAll('select[data-cast]').forEach(sel=>sel.onchange=()=>{const n=names[Number(sel.dataset.cast)];st.chars[n].v=sel.value||null;castSave(current.id);vvCache.clear();toast(n+' → '+(sel.value||'自动'));});
  $('#cast-reset').onclick=()=>{castCache.delete(current.id);try{localStorage.removeItem(CAST_KEY(current.id));}catch(e){}closeDialog();toast('已清空，下次朗读会重新识别');};
 }
 // 打开书时，后台先把要读的第一句合成好，按“连续朗读”就能立刻出声
 function warm(){
  if(!streamMode()||S||!current||view!=='reader')return;
  const idx=RikkaShelf.bookmark(current)?.paragraph??current.position??page*PAGE_SIZE;const text=current.paragraphs[idx];if(!text)return;
  paraParts(text,idx).then(ps=>{if(ps[0]&&!S)getAudio(ps[0]).catch(()=>{});}).catch(()=>{});
 }
 function register(){
  $('#read-aloud').onclick=()=>{
   if(!current)return;const sp=startPoint();
   if(streamMode()){try{stop(true);audioCtx();}catch(e){}safe(()=>readFrom(sp.p,{k:sp.k,continuous:true}))();}
   else safe(()=>read(sp.p,true))();
  };
  $('#voice-stop').onclick=()=>stop();$('#voice-settings-stop').onclick=()=>stop();$('#voice-pause').onclick=pause;
  const jump=d=>{const a=active();if(!a)return;try{audioCtx();}catch(e){}safe(()=>read((a.para||0)+d,S?S.continuous:state?.continuous))();};
  $('#voice-prev').onclick=()=>jump(-1);$('#voice-next').onclick=()=>jump(1);
  $('#voice-engine').onchange=e=>{stop();settings.voiceEngine=e.target.value;saveSettings();values();if(isVV())loadVoiceList().catch(er=>{$('#vv-list-status').textContent=er.message;});};
  for(const[id,key]of [['speech-rate','rate'],['speech-pitch','pitch'],['speech-volume','volume'],['speech-gap','speechGap'],['voice-temperature','voiceTemperature'],['voice-intonation','voiceIntonation']]){const el=$('#'+id);if(el)el.oninput=e=>{settings[key]=Number(e.target.value);saveSettings();values();};}
  $('#speech-follow').onchange=e=>{settings.speechFollow=e.target.checked;saveSettings();};
  if($('#voice-shadow'))$('#voice-shadow').onchange=e=>{settings.voiceShadow=e.target.checked;saveSettings();};
  const bindRange=(id,key,fmt)=>{const el=$('#'+id);if(!el)return;el.oninput=e=>{settings[key]=Number(e.target.value);saveSettings();const v=$('#'+id+'-value');if(v)v.textContent=fmt(settings[key]);};};
  bindRange('voice-sentence-pause','voiceSentencePause',v=>v.toFixed(2)+' 秒');
  bindRange('voice-hl-offset','voiceHlOffset',v=>v===0?'自动':(v>0?'晚 ':'早 ')+Math.abs(v)+' 毫秒');
  if($('#voice-hl-style'))$('#voice-hl-style').onchange=e=>{settings.voiceHlStyle=e.target.value;saveSettings();applyHlStyle();};
  if($('#voice-hl-color'))$('#voice-hl-color').oninput=e=>{settings.voiceHlColor=e.target.value;saveSettings();applyHlStyle();};
  if($('#voice-hl-theme'))$('#voice-hl-theme').onclick=()=>{settings.voiceHlColor='';saveSettings();applyHlStyle();toast('高亮颜色已跟随主题');};
  if($('#voice-hl-read'))$('#voice-hl-read').onchange=e=>{settings.voiceHlRead=e.target.checked;saveSettings();applyHlStyle();};
  if($('#voice-cast'))$('#voice-cast').onchange=e=>{settings.voiceCast=e.target.checked;saveSettings();vvCache.clear();if(e.target.checked&&!window.HanaAI?.configured?.())toast('广播剧模式需要先在“AI 服务”里配置 API');};
  if($('#voice-cast-table'))$('#voice-cast-table').onclick=()=>safe(showCast)();
  if($('#voice-english-ai'))$('#voice-english-ai').onchange=e=>{settings.voiceEnglishAI=e.target.checked;saveSettings();vvCache.clear();};
  if($('#voice-background'))$('#voice-background').onchange=e=>{settings.voiceBackground=e.target.checked;saveSettings();if(!e.target.checked&&nativeOn){nativeOn=false;nativeSent='';try{Android.readAloudState('{"active":false}');}catch(er){}}};
  applyHlStyle();
  if($('#voice-sleep'))$('#voice-sleep').onchange=e=>{settings.voiceSleep=Number(e.target.value)||0;saveSettings();if(S&&S.docId){const m=settings.voiceSleep;S.sleepAt=m>0?Date.now()+m*60000:0;}toast(settings.voiceSleep?settings.voiceSleep+' 分钟后自动停止':'已关闭定时停止');};
  $('#voice-reading-mode').onchange=e=>{settings.voiceReadingMode=e.target.value;saveSettings();};
  $('#vv-speaker').onchange=e=>{settings.vvSpeaker=e.target.value===''?null:Number(e.target.value);saveSettings();renderVoiceSelects();};
  $('#vv-dialogue').onchange=e=>{settings.vvDialogueSpeaker=e.target.value===''?'':Number(e.target.value);saveSettings();renderVoiceSelects();};
  $$('[data-vv-preset]').forEach(b=>b.onclick=safe(async()=>{$('#vv-base').value=b.dataset.vvPreset;save();settings.vvSpeaker=null;settings.vvDialogueSpeaker='';saveSettings();$('#vv-list-status').textContent='正在读取声音列表…';try{const l=await loadVoiceList();$('#vv-list-status').textContent='找到 '+l.length+' 个声音';}catch(e){$('#vv-list-status').textContent=e.message;}}));
  $('#vv-refresh').onclick=safe(async()=>{save();rikkaHosts.clear();httpBases.clear();$('#vv-list-status').textContent='正在读取声音列表…';try{const l=await loadVoiceList();$('#vv-list-status').textContent='找到 '+l.length+' 个声音';}catch(e){$('#vv-list-status').textContent=e.message;if(V.isLocal(settings.vvBase))offerLaunch();}});
  $('#vv-open-host').onclick=()=>{if(window.Android?.openVoiceHost){Android.openVoiceHost();}else toast('请从桌面打开“六花声库”');};
  $('#save-voice').onclick=safe(()=>{save();toast('语音设置已保存');});
  $('#voice-test').onclick=()=>{try{if(streamMode())audioCtx();}catch(e){}safe(async()=>{if(settings.voiceEngine!=='system')save();await speak(settings.vvDialogueSpeaker!==''&&settings.vvDialogueSpeaker!=null&&isVV()?'夕暮れの道を、二人で歩いた。「ねえ、明日も一緒に帰ろうよ」':'今日も、少しずつ日本語を読んでいこう。物語の続きが、待っているよ。');})();};
  $('#voice-reset').onclick=()=>{stop();Object.assign(settings,{rate:1,pitch:1,volume:1,speechGap:.5,voiceTemperature:.8,voiceIntonation:1});saveSettings();renderSettings();toast('已恢复自然朗读参数');};
  $('#clear-voice-key').onclick=safe(()=>{stop();if(window.Android?.saveVoiceKey){const r=Android.saveVoiceKey('');if(r!=='ok')throw Error(r);}else sessionStorage.removeItem('rikka_voice_key');toast('语音密钥已清除');});
  $('#clear-voice-cache').onclick=()=>{stop();vvCache.clear();window.Android?.clearVoiceCache?.();toast('语音缓存已清空');};
  document.addEventListener('click',onTokenTap,true);
  $('#dialog')?.addEventListener('close',()=>{if(tapTarget)resumeFromTap();});
  if($('#dialog'))new MutationObserver(()=>{if($('#dialog').open&&tapTarget)tapDialogSeen=true;}).observe($('#dialog'),{attributes:true,attributeFilter:['open']});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){if(S)savePos(S,true);else stop(true);}else if(S&&S.docId&&!S.paused){try{navigator.wakeLock?.request('screen').then(l=>{if(S)S.wake=l;}).catch(()=>{});}catch(e){}}});
  if(typeof window.renderReader==='function'&&!window.renderReader.__voiceWrapped){const orig=window.renderReader;const wrapped=async function(...a){const r=await orig.apply(this,a);setTimeout(warm,900);if(S&&S.hl)S.hl={key:''};return r;};wrapped.__voiceWrapped=true;window.renderReader=wrapped;}
 }
 return{speak,read,stop,pause,native,hostResult,remote,showCast,renderSettings,register,getState:()=>S||state};
})();
