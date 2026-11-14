(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.RikkaVoiceCore=factory();})(typeof window==='object'?window:this,()=>{
 'use strict';
 function clamp(n,min,max,fallback){n=Number(n);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;}
 function privateHost(h){const ip=h.split('.').map(Number);return h==='localhost'||/^\d+\.\d+\.\d+\.\d+$/.test(h)&&ip.every(n=>n>=0&&n<=255)&&(ip[0]===10||ip[0]===127||ip[0]===192&&ip[1]===168||ip[0]===172&&ip[1]>=16&&ip[1]<=31);}
 function endpoint(raw){let u;try{u=new URL(String(raw).trim());}catch(e){throw Error('请填写完整的语音接口地址');}if(u.username||u.password||u.hash||u.search||!(u.protocol==='https:'||u.protocol==='http:'&&privateHost(u.hostname)))throw Error('语音服务需使用 HTTPS；同一 Wi-Fi 下可填写内网 IP 的 HTTP 地址，不要在地址中放密钥');return u.href;}
 // VOICEVOX 兼容接口的基础地址（六花声库 / AivisSpeech / VOICEVOX）：只留协议+主机+端口
 function vvBase(raw){let s=String(raw||'').trim();if(!s)throw Error('请填写声音接口地址');if(!/^https?:\/\//i.test(s))s='http://'+s;let u;try{u=new URL(s);}catch(e){throw Error('声音接口地址格式不对，例如 http://127.0.0.1:50021');}if(u.username||u.password)throw Error('地址里不要放账号密码');if(!(u.protocol==='https:'||u.protocol==='http:'&&privateHost(u.hostname)))throw Error('只能用本机（127.0.0.1）或同一 Wi-Fi 下的内网地址');return u.protocol+'//'+u.host;}
 function isLocal(base){try{const h=new URL(base).hostname;return h==='127.0.0.1'||h==='localhost';}catch(e){return false;}}
 function chunks(text,max=180){max=Math.max(20,Math.floor(max));const chars=Array.from(String(text||'').trim());const result=[];let buf='';for(const c of chars){buf+=c;if(Array.from(buf).length>=max||(/[。！？!?\n]/.test(c)&&buf.length>=16)){if(buf.trim())result.push(buf.trim());buf='';}}if(buf.trim())result.push(buf.trim());return result;}
 function payload(text,s){return {text,text_lang:'ja',ref_audio_path:String(s.voiceReference||''),prompt_text:String(s.voiceTranscript||''),prompt_lang:'ja',text_split_method:'cut5',batch_size:1,media_type:'wav',streaming_mode:false,speed_factor:clamp(s.rate,.6,1.4,1),temperature:clamp(s.voiceTemperature,.5,1,.8),top_k:5,top_p:1,seed:-1,parallel_infer:true};}

 // ── 读音对齐：让“读出来的”和“标出来的”一致 ──
 // 六花的注音来源：author=作者 ruby，builtin=你改过的读音/人名/全书统一注音，ai=AI 按语境校对，
 // curated=人工核对过的特殊读法（明日→あした 等），rule=数字量词规则。
 // 这些正是朗读引擎最容易读错的地方：把它们换成片假名再交给引擎，引擎就只能照读。
 const KANJI=/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff々〆ヶ]/u;
 const TRUSTED=new Set(['author','builtin','ai','curated']);
 const kata=s=>String(s||'').replace(/[ぁ-ゖ]/g,c=>String.fromCharCode(c.charCodeAt(0)+96));
 function ttsText(tokens,mode){
  if(!Array.isArray(tokens)||!tokens.length)return '';
  if(mode==='engine')return tokens.map(t=>t.s||'').join('');
  return tokens.map(t=>{const s=t.s||'';if(!KANJI.test(s)||!t.r)return s;const pin=mode==='all'||TRUSTED.has(t.source)||!!t.aiFixed;return pin?kata(t.r):s;}).join('');
 }
 // ── 旁白 / 台词分开：「」『』里的话可以用另一个声音或风格 ──
 function dialogueParts(text,narrator,dialogue,max=180){
  const tag=(arr,sp,kind)=>arr.map(t=>({text:speakable(t),speaker:sp,kind})).filter(p=>p.text.replace(/[\s、。]/g,''));
  if(dialogue===null||dialogue===undefined||dialogue===''||String(dialogue)===String(narrator))return tag(chunks(text,max),narrator,'n');
  const out=[];const rx=/[「『][^「」『』]*[」』]/g;let last=0,m;
  while((m=rx.exec(text))){const before=text.slice(last,m.index);if(before.trim())out.push(...tag(chunks(before,max),narrator,'n'));out.push(...tag(chunks(m[0],max),dialogue,'d'));last=rx.lastIndex;}
  const rest=text.slice(last);if(rest.trim())out.push(...tag(chunks(rest,max),narrator,'n'));
  return out.filter(p=>p.text.replace(/[「」『』\s]/g,''));
 }
 // 音调：六花滑块 0.7–1.3 → VOICEVOX pitchScale −0.15–0.15
 function vvParams(s){return{speed:clamp(s.rate,.5,2,1),pitch:clamp((Number(s.pitch)-1)*.5,-.15,.15,0),intonation:clamp(s.voiceIntonation,0,2,1),volume:1};}
 // ── 逐词高亮：以“词”为单位切朗读片段，并记录每个词的音拍数 ──
 const SMALL=/[ぁぃぅぇぉゃゅょゎゕゖァィゥェォャュョヮヵヶ]/;
 function moraCount(kana){let n=0;for(const c of Array.from(String(kana||'')))if(/[ぁ-ゖァ-ヺー]/.test(c)&&!SMALL.test(c))n++;return n;}
 // ── 英文单词 → 片假名（引擎遇到英文会一个字母一个字母念）──
 const LETTER={a:'エー',b:'ビー',c:'シー',d:'ディー',e:'イー',f:'エフ',g:'ジー',h:'エイチ',i:'アイ',j:'ジェー',k:'ケー',l:'エル',m:'エム',n:'エヌ',o:'オー',p:'ピー',q:'キュー',r:'アール',s:'エス',t:'ティー',u:'ユー',v:'ブイ',w:'ダブリュー',x:'エックス',y:'ワイ',z:'ゼット'};
 const EN={ok:'オーケー',okay:'オーケー',yes:'イエス',no:'ノー',hello:'ハロー',hi:'ハイ',bye:'バイ',thank:'サンク',thanks:'サンクス',you:'ユー',love:'ラブ',game:'ゲーム',over:'オーバー',level:'レベル',up:'アップ',skill:'スキル',status:'ステータス',quest:'クエスト',guild:'ギルド',party:'パーティー',boss:'ボス',dungeon:'ダンジョン',magic:'マジック',item:'アイテム',menu:'メニュー',system:'システム',error:'エラー',start:'スタート',stop:'ストップ',restart:'リスタート',load:'ロード',save:'セーブ',reset:'リセット',online:'オンライン',offline:'オフライン',log:'ログ',login:'ログイン',logout:'ログアウト',user:'ユーザー',player:'プレイヤー',name:'ネーム',point:'ポイント',hp:'エイチピー',mp:'エムピー',exp:'イーエックスピー',lv:'レベル',max:'マックス',min:'ミニ',time:'タイム',type:'タイプ',mode:'モード',hard:'ハード',easy:'イージー',normal:'ノーマル',special:'スペシャル',ultimate:'アルティメット',super:'スーパー',hyper:'ハイパー',power:'パワー',speed:'スピード',attack:'アタック',defense:'ディフェンス',shield:'シールド',sword:'ソード',fire:'ファイア',ice:'アイス',water:'ウォーター',wind:'ウインド',dark:'ダーク',light:'ライト',black:'ブラック',white:'ホワイト',red:'レッド',blue:'ブルー',green:'グリーン',gold:'ゴールド',silver:'シルバー',dragon:'ドラゴン',king:'キング',queen:'クイーン',prince:'プリンス',princess:'プリンセス',angel:'エンジェル',devil:'デビル',demon:'デーモン',ghost:'ゴースト',monster:'モンスター',hero:'ヒーロー',idol:'アイドル',live:'ライブ',stage:'ステージ',music:'ミュージック',song:'ソング',happy:'ハッピー',lucky:'ラッキー',sweet:'スイート',cool:'クール',cute:'キュート',kawaii:'カワイイ',smile:'スマイル',heart:'ハート',star:'スター',dream:'ドリーム',world:'ワールド',story:'ストーリー',end:'エンド',ending:'エンディング',true:'トゥルー',bad:'バッド',good:'グッド',best:'ベスト',news:'ニュース',phone:'フォン',smartphone:'スマートフォン',mail:'メール',line:'ライン',twitter:'ツイッター',youtube:'ユーチューブ',google:'グーグル',internet:'インターネット',web:'ウェブ',site:'サイト',app:'アプリ',pc:'ピーシー',ai:'エーアイ',sns:'エスエヌエス',tv:'テレビ',cd:'シーディー',dvd:'ディーブイディー',coffee:'コーヒー',cafe:'カフェ',shop:'ショップ',school:'スクール',class:'クラス',club:'クラブ',team:'チーム',member:'メンバー',leader:'リーダー',master:'マスター',boy:'ボーイ',girl:'ガール',lady:'レディ',sir:'サー',mister:'ミスター',miss:'ミス',the:'ザ',of:'オブ',and:'アンド',or:'オア',in:'イン',on:'オン',to:'トゥー',a:'ア',an:'アン',is:'イズ',it:'イット',my:'マイ',me:'ミー',i:'アイ',we:'ウィー',go:'ゴー',get:'ゲット',set:'セット',ready:'レディ',fight:'ファイト',win:'ウィン',lose:'ルーズ',chance:'チャンス',check:'チェック',sorry:'ソーリー',please:'プリーズ',wow:'ワオ',oh:'オー',no1:'ナンバーワン',vs:'バーサス',ss:'ダブルエス',sss:'トリプルエス'};
 const KV={a:'ア',i:'イ',u:'ウ',e:'エ',o:'オ'};
 const KC={k:'カキクケコ',g:'ガギグゲゴ',s:'サシスセソ',z:'ザジズゼゾ',t:'タティトゥテト',d:'ダディドゥデド',n:'ナニヌネノ',h:'ハヒフヘホ',b:'バビブベボ',p:'パピプペポ',m:'マミムメモ',y:'ヤイユイェヨ',r:'ラリルレロ',l:'ラリルレロ',w:'ワウィウウェウォ',f:'ファフィフフェフォ',v:'ヴァヴィヴヴェヴォ',j:'ジャジジュジェジョ',c:'カシクセコ',q:'クァクィククェクォ',x:'クサクシクスクセクソ'};
 const KEND={k:'ク',g:'グ',s:'ス',z:'ズ',t:'ト',d:'ド',n:'ン',h:'',b:'ブ',p:'プ',m:'ム',y:'イ',r:'ー',l:'ル',w:'ウ',f:'フ',v:'ブ',j:'ジ',c:'ク',q:'ク',x:'クス'};
 function cv(c,v){const row=KC[c];if(!row)return KV[v];const idx='aiueo'.indexOf(v);
  if(c==='t'){return['タ','ティ','トゥ','テ','ト'][idx];}if(c==='d'){return['ダ','ディ','ドゥ','デ','ド'][idx];}
  if(c==='y'){return['ヤ','イ','ユ','イェ','ヨ'][idx];}if(c==='w'){return['ワ','ウィ','ウ','ウェ','ウォ'][idx];}
  if(c==='f'){return['ファ','フィ','フ','フェ','フォ'][idx];}if(c==='v'){return['ヴァ','ヴィ','ヴ','ヴェ','ヴォ'][idx];}
  if(c==='j'){return['ジャ','ジ','ジュ','ジェ','ジョ'][idx];}if(c==='q'){return['クァ','クィ','ク','クェ','クォ'][idx];}
  if(c==='x'){return['クサ','クシ','クス','クセ','クソ'][idx];}
  if(c==='c')return'aou'.includes(v)?['カ','','ク','','コ'][idx]:['','シ','','セ',''][idx];
  return row[idx];}
 // 规则拼读（词典里没有时的兜底，能让大多数词“像英语地”读出来，而不是逐个字母）
 function e2kRule(w){
  w=w.toLowerCase().replace(/ph/g,'f').replace(/ck/g,'k').replace(/qu/g,'kw').replace(/[aeiou]tion/g,m=>m[0]==='a'?'\u000aeition':m).replace(/tion/g,'\u0001').replace(/sion/g,'\u0002').replace(/ture/g,'\u0003').replace(/sh/g,'\u0004').replace(/ch/g,'\u0005').replace(/th/g,'s').replace(/(ee|ea)/g,'\u0006').replace(/oo/g,'\u0007').replace(/ou|ow$/g,'\u000b').replace(/(er|or|ar)$/,'\u0009').replace(/([^aeiou])e$/,'$1').replace(/y$/,'\u0008').replace(/m(?=[pb])/g,'n').replace(/\u000a/g,'').replace(/u(?=[bcdfgklmnpstvz](?:[bcdfgklmnpstvz]|$))/g,'a');
  const SP={'\u0001':'ション','\u0002':'ジョン','\u0003':'チャー','\u0006':'イー','\u0007':'ウー','\u0008':'ィ','\u0009':'アー','\u000b':'アウ'};
  const VSP={'\u0006':['i','ー'],'\u0007':['u','ー'],'\u0009':['a','ー'],'\u000b':['a','ウ'],'\u0008':['i','ー']};
  let out='';
  for(let i=0;i<w.length;i++){
   const c=w[i],n=w[i+1];
   if(SP[c]){out+=SP[c];continue;}
   if(n&&VSP[n]&&/[a-z]/.test(c)&&!'aiueo'.includes(c)){out+=(cv(c,VSP[n][0])||'')+VSP[n][1];i++;continue;}
   if((c==='\u0004'||c==='\u0005')&&n&&VSP[n]){out+=(c==='\u0004'?['シャ','シ','シュ','シェ','ショ']:['チャ','チ','チュ','チェ','チョ'])['aiueo'.indexOf(VSP[n][0])]+VSP[n][1];i++;continue;}
   if(c==='\u0004'){if(n&&'aiueo'.includes(n)){out+=['シャ','シ','シュ','シェ','ショ']['aiueo'.indexOf(n)];i++;}else out+='シュ';continue;}
   if(c==='\u0005'){if(n&&'aiueo'.includes(n)){out+=['チャ','チ','チュ','チェ','チョ']['aiueo'.indexOf(n)];i++;}else out+='チ';continue;}
   if('aiueo'.includes(c)){if((c==='e'||c==='o'||c==='a')&&n==='r'&&!(w[i+2]&&'aiueo'.includes(w[i+2]))){out+=KV[c]==='エ'?'アー':KV[c]+'ー';i++;continue;}out+=KV[c];continue;}
   if(c===n){if(c!=='n'&&c!=='m'&&c!=='l'&&c!=='r'&&c!=='s')out+='ッ';continue;}
   if(n&&'aiueo'.includes(n)){out+=cv(c,n)||'';i++;continue;}
   out+=KEND[c]??'';
  }
  return out.replace(/ィ$/,'ィー').replace(/^ィ/,'イ')||w;
 }
 function englishToKana(word,custom){
  const raw=String(word),low=raw.toLowerCase();
  if(custom&&custom[low])return custom[low];
  if(EN[low])return EN[low];
  if(/^[A-Z]{1,5}$/.test(raw))return Array.from(low).map(c=>LETTER[c]||'').join('');   // NPC、HP、AI 这类缩写按字母读才对
  if(low.length<=1)return LETTER[low]||low;
  return e2kRule(low);
 }
 // ── 符号：装饰符号不念，省略号/破折号当停顿 ──
 const SILENT=/^[☆★♪♫♬♡♥❤◆◇■□●○◎◯※▼▲△▽→←↑↓⇒＊*＃#＆&＠@～〜~｜|＿_＾^＼\\／\/＜＞<>＝=・･「」『』【】〈〉《》〔〕［］\[\]{}｛｝（）()”“"'’‘`´]+$/;
 const PAUSE_SYM=/^[…‥―─—－]+$/;
 function speakable(s,customEn){
  if(!s)return'';
  if(SILENT.test(s))return'';
  if(PAUSE_SYM.test(s))return'、';
  let t=s.replace(/[A-Za-zＡ-Ｚａ-ｚ][A-Za-zＡ-Ｚａ-ｚ'’]*/g,m=>englishToKana(m.normalize('NFKC').replace(/[’']/g,''),customEn));
  t=t.replace(/[！!]{2,}/g,'！').replace(/[？?]{2,}/g,'？').replace(/[！!][？?]+|[？?][！!]+/g,'？').replace(/[☆★♪♫♬♡♥❤◆◇■□●○◎◯※]/g,'').replace(/[…‥]+|[―─—]{2,}/g,'、');
  return t;
 }
 function tokenInfo(t,mode,customEn){
  const s=t.s||'',hasK=KANJI.test(s);
  const pin=hasK&&t.r&&mode!=='engine'&&(mode==='all'||TRUSTED.has(t.source)||!!t.aiFixed);
  let m;
  if(hasK)m=moraCount(t.r)||Array.from(s).length*2;
  else if(/[ぁ-ゖァ-ヺー]/.test(s))m=moraCount(s);
  else if(/[A-Za-zＡ-Ｚａ-ｚ]/.test(s))m=moraCount(speakable(s,customEn))||Array.from(s).length;
  else if(/[0-9０-９]/.test(s))m=moraCount(t.r)||Array.from(s).length*2;
  else m=0;
  const pw=/[。！？!?]/.test(s)?2.2:/[、，,]/.test(s)?1.2:PAUSE_SYM.test(s)?1.2:/\n/.test(s)?1.5:0;
  return{say:pin?kata(t.r):speakable(s,customEn),m,pw};
 }
 // tokens → [{text, speaker, kind:'n'|'d', qi, toks:[{k,m,pw}]}]
 //  o.split：台词（「」『』）单独成段并编号 qi（第几句台词，从 1 起，只数最外层括号），供广播剧模式分配角色
 function tokenParts(tokens,o){
  o=o||{};const max=o.max||150,first=o.firstMax||max,out=[];let cur=null,inQ=false,qi=0,depth=0;
  const dl=(o.dialogue===null||o.dialogue===undefined||o.dialogue===''||String(o.dialogue)===String(o.narrator))?null:o.dialogue;
  const split=dl!=null||!!o.split;
  const len=()=>Array.from(cur.text).length;
  const open=()=>{const d=inQ&&split;cur={text:'',speaker:d&&dl!=null?dl:(o.narrator??null),kind:d?'d':'n',qi:d?qi:0,toks:[]};};
  const close=()=>{if(!cur)return;if(cur.text.replace(/[\s、。！？!?]/g,''))out.push(cur);else if(cur.toks.length&&out.length){const prev=out[out.length-1];prev.toks.push(...cur.toks.map(x=>({...x,m:0})));prev.text+=cur.text;}cur=null;};
  tokens.forEach((t,k)=>{
   const s=t.s||'',opens=/[「『]/.test(s),closes=/[」』]/.test(s);
   if(opens){if(!inQ){qi++;if(split&&cur)close();inQ=true;}depth+=(s.match(/[「『]/g)||[]).length;}
   if(!cur)open();
   const info=tokenInfo(t,o.mode||'smart',o.english);
   cur.toks.push({k,m:info.m,pw:info.pw});cur.text+=info.say;
   const limit=out.length?max:first;
   if(closes){depth=Math.max(0,depth-(s.match(/[」』]/g)||[]).length);if(inQ&&depth===0){inQ=false;if(split){cur.endQuote=true;close();return;}}}
   if(/[。！？!?\n]/.test(s)&&len()>=(out.length?14:6)){cur.endSentence=true;close();return;}
   if(len()>=limit&&/[、，,]/.test(s)){close();return;}
   if(len()>=limit*1.5)close();
  });
  close();
  return out;
 }
 // 给 AI 看的文本：每句最外层台词前加编号 [P段-句]，与 tokenParts 的 qi 一一对应
 function markQuotes(text,para){let depth=0,q=0,out='';for(const c of Array.from(text)){if(/[「『]/.test(c)){if(depth===0){q++;out+='[P'+para+'-'+q+']';}depth++;}else if(/[」』]/.test(c))depth=Math.max(0,depth-1);out+=c;}return{text:out,count:q};}
 function englishWords(text){const out=new Set();for(const raw of String(text).normalize('NFKC').match(/[A-Za-z][A-Za-z']+/g)||[]){const w=raw.replace(/'/g,'').toLowerCase();if(EN[w]||/^[A-Z]{1,5}$/.test(raw))continue;out.add(w);}return[...out];}
 // 每个词在这一段音频里的起止时间（秒）。有 VOICEVOX 音拍时间轴就按音拍对齐，没有就按音拍数在有声区间里分配
 function timeline(part,data,speed){
  const toks=part&&part.toks;if(!toks||!toks.length||!data)return[];
  const res=[],marks=Array.isArray(data.marks)?data.marks:null,mm=marks&&marks.filter(x=>!x[3]);
  const totalM=toks.reduce((a,t)=>a+t.m,0);
  if(mm&&mm.length&&totalM>0){
   const last=marks[marks.length-1][2],dur=data.dur||0,post=0.1/(speed||1);
   const scale=last>0&&dur>0?Math.min(1.15,Math.max(0.85,(dur-post)/last)):1;
   const L=mm.length;let c=0;
   for(const t of toks){
    if(t.m>0){const a=Math.min(L-1,Math.floor(c/totalM*L)),b=Math.min(L-1,Math.max(a,Math.ceil((c+t.m)/totalM*L)-1));res.push({k:t.k,s:mm[a][1]*scale,e:mm[b][2]*scale});c+=t.m;}
    else{const p=res.length?res[res.length-1].e:mm[0][1]*scale;res.push({k:t.k,s:p,e:p});}
   }
   return res;
  }
  const v=data.voiced||[0,data.dur||0],vs=v[0],ve=Math.max(v[0]+0.05,v[1]);
  const W=toks.reduce((a,t)=>a+t.m+t.pw,0)||1;let c=0;
  for(const t of toks){const s0=vs+(ve-vs)*c/W;c+=t.m+t.pw;const e0=vs+(ve-vs)*(c-t.pw)/W;res.push({k:t.k,s:s0,e:Math.max(s0,e0)});}
  return res;
 }
 // WAV → Float32 单声道（不经过 <audio>，所以不受 WebView 的自动播放限制，也不挑解码器）
 function parseWav(buf){
  const u8=new Uint8Array(buf),dv=new DataView(buf),n=buf.byteLength;
  const tag=o=>String.fromCharCode(u8[o],u8[o+1],u8[o+2],u8[o+3]);
  if(n<12||tag(0)!=='RIFF'||tag(8)!=='WAVE')throw Error('声音引擎返回的不是 WAV 音频（'+n+' 字节，开头 '+Array.from(u8.slice(0,8)).map(b=>b.toString(16).padStart(2,'0')).join(' ')+'）');
  let p=12,fmt=1,ch=1,rate=24000,bits=16,dOff=-1,dLen=0,marks=null;
  while(p+8<=n){const id=tag(p);let L=dv.getUint32(p+4,true);const b=p+8;if(b+L>n)L=n-b;
   if(id==='fmt '){fmt=dv.getUint16(b,true);ch=dv.getUint16(b+2,true)||1;rate=dv.getUint32(b+4,true);bits=dv.getUint16(b+14,true);if(fmt===0xFFFE&&L>=26)fmt=dv.getUint16(b+24,true);}
   else if(id==='data'){dOff=b;dLen=L;}
   else if(id==='rktm'){try{marks=JSON.parse(new TextDecoder().decode(u8.subarray(b,b+L)).replace(/\0+$/,''));}catch(e){}}
   p=b+L+(L&1);}
  if(dOff<0||!rate)throw Error('声音引擎返回的 WAV 里没有音频数据');
  const bps=bits/8,frames=Math.floor(dLen/(bps*ch)),pcm=new Float32Array(frames);
  for(let f=0;f<frames;f++){let acc=0;for(let c=0;c<ch;c++){const o=dOff+(f*ch+c)*bps;
   acc+=fmt===3&&bits===32?dv.getFloat32(o,true):bits===16?dv.getInt16(o,true)/32768:bits===24?((u8[o]|(u8[o+1]<<8)|(u8[o+2]<<16))<<8>>8)/8388608:bits===32?dv.getInt32(o,true)/2147483648:bits===8?(u8[o]-128)/128:0;}
   pcm[f]=acc/ch;}
  let vs=0,ve=frames;for(let i=0;i<frames;i++)if(Math.abs(pcm[i])>0.015){vs=i;break;}for(let i=frames-1;i>=0;i--)if(Math.abs(pcm[i])>0.015){ve=i+1;break;}
  return{pcm,rate,marks,dur:frames/rate,voiced:[vs/rate,ve/rate]};
 }
 // ── 高质量重采样（Kaiser 窗 sinc，查表）──
 // 浏览器的 AudioBufferSourceNode 遇到“音频采样率 ≠ 播放采样率”（VOICEVOX 24kHz → 手机 48kHz）时只做线性插值，
 // 会在 12～24kHz 产生镜像噪声，听起来就是一层“电流声 / 嘶嘶声”。这里先自己高质量地转成播放采样率再交给浏览器。
 const RS_T=16,RS_RES=512;let rsK=null;
 function bessel0(x){let s=1,t=1;for(let k=1;k<30;k++){t*=(x/(2*k))**2;s+=t;if(t<1e-12)break;}return s;}
 function rsKernel(){ // 查表：x∈[0,RS_T]，Kaiser 窗 sinc（截止 0.92 × 较低一侧的奈奎斯特频率）
  if(rsK)return rsK;const cut=0.92,beta=8.0,i0=bessel0(beta),n=RS_T*RS_RES+2;rsK=new Float32Array(n);
  for(let i=0;i<n;i++){const x=i/RS_RES;if(x>=RS_T){rsK[i]=0;continue;}const w=bessel0(beta*Math.sqrt(1-(x/RS_T)**2))/i0;rsK[i]=(x===0?1:Math.sin(Math.PI*cut*x)/(Math.PI*cut*x))*w;}
  return rsK;
 }
 function resample(pcm,from,to){
  if(!from||!to||from===to)return pcm;
  const K=rsKernel(),r=to/from,n=Math.floor(pcm.length*r),out=new Float32Array(n),L=pcm.length;
  const sc=Math.min(1,r),span=RS_T/sc,inv=1/r;   // 降采样时核按输出采样间隔拉宽，防止混叠
  for(let i=0;i<n;i++){
   const pos=i*inv,lo=Math.max(0,Math.ceil(pos-span)),hi=Math.min(L-1,Math.floor(pos+span));
   let acc=0,ws=0;
   for(let k=lo;k<=hi;k++){const x=Math.abs(k-pos)*sc*RS_RES,xi=x|0;const w=K[xi]+(K[xi+1]-K[xi])*(x-xi);acc+=pcm[k]*w;ws+=w;}
   out[i]=ws?acc/ws:0;
  }
  return out;
 }
 // 防削波：峰值超过 0.97 时整体压下来（削波会产生刺耳的“滋滋”声）
 function safePeak(pcm){let pk=0;for(let i=0;i<pcm.length;i++){const a=Math.abs(pcm[i]);if(a>pk)pk=a;}if(pk>0.97){const g=0.97/pk;for(let i=0;i<pcm.length;i++)pcm[i]*=g;}return pcm;}
 return{resample,safePeak,clamp,endpoint,vvBase,isLocal,chunks,payload,ttsText,dialogueParts,vvParams,kata,moraCount,tokenParts,timeline,parseWav,englishToKana,speakable,markQuotes,englishWords};
});
