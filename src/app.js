'use strict';
const $=s=>document.querySelector(s),$$=s=>Array.from(document.querySelectorAll(s)),C=HanaCore,D=HANA_DATA,DB=HanaStore;
const icon=n=>'<svg aria-hidden="true"><use href="#i-'+n+'"/></svg>';
const defaults={font:22,segment:180,ruby:'all',theme:'light',rate:.85,dedupe:true,analysis:true,autoAI:false,aiFurigana:true,wordAI:true,base:'https://api.deepseek.com',model:'deepseek-flash',provider:'deepseek',bgShade:72,bgBlur:0,bgPosition:'center',showWords:false,rememberPosition:true,dailyNew:10,sessionSize:20,launcherIcon:'portrait',showDictionary:false,showExam:false,randomGenre:'all',promptLength:'medium',randomCast:'female',defaultStyle:'novel',defaultLevel:'N3',defaultStoryLength:500,voiceEngine:'system',vvBase:'http://127.0.0.1:50021',vvSpeaker:null,vvDialogueSpeaker:'',voiceReadingMode:'smart',voiceIntonation:1,voiceShadow:false,voiceSleep:0,voiceSentencePause:.35,voiceHlStyle:'block',voiceHlColor:'',voiceHlRead:true,voiceHlOffset:0,voiceCast:false,voiceEnglishAI:true,voiceBackground:true,voiceEndpoint:'',voiceReference:'',voiceTranscript:'',voiceModelTag:'rikka-v1',pitch:1,volume:1,speechGap:.5,speechFollow:true,voiceTemperature:.8,showStoryTargets:false,autoPolishPrompt:false,backgroundCycle:false,backgroundInterval:30,storyDraft:null,lessonCollapsed:false,lessonDetailCollapsed:false,fxOverlay:'auto',fxDensity:'mid',preparseWords:true,themeMotion:true};
let settings={...defaults};try{settings={...defaults,...JSON.parse(localStorage.getItem('hana_settings')||'{}')};}catch(e){}
let backgroundImage='';
let docs=[],words=[],overrides={...D.overrides},current=null,page=0,view='library',filter='all',renderVersion=0,wordSelection=null,generationId=null,restoreExpected=false;
let tokenSerial=0,tokenCache=new Map(),workerPending=new Map(),analysisBusy=new Set(),analysisErrors=new Map(),reviewQueue=[],reviewIndex=0,reviewRevealed=false;
const PAGE_SIZE=4;const navItems=[['library','book','书架'],['import','plus','导入'],['create','star','故事'],['learn','search','词典'],['words','cards','生词'],['exam','exam','考试'],['settings','settings','设置']];
const worker=new Worker('tokenizer-worker.js');let resolveReady,rejectReady;
const ready=new Promise((r,j)=>{resolveReady=r;rejectReady=j;});ready.catch(()=>{});
const readyTimer=setTimeout(()=>{rejectReady(new Error('离线词典加载超时，请关闭应用后重试'));$('#engine-status').textContent='词典加载超时';},120000);
worker.onmessage=e=>{const m=e.data;if(m.type==='ready'){clearTimeout(readyTimer);resolveReady();$('#engine-status').textContent='离线词典已就绪';return;}if(m.type==='failed'){clearTimeout(readyTimer);rejectReady(new Error('离线词典加载失败'));toast('离线词典加载失败，请重新打开应用');return;}const p=workerPending.get(m.id);if(p){workerPending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(new Error(m.error)):p.resolve(m.tokens);}};
worker.onerror=()=>{clearTimeout(readyTimer);rejectReady(new Error('注音引擎无法启动，请更新手机的 Android System WebView'));for(const p of workerPending.values()){clearTimeout(p.timer);p.reject(new Error('注音引擎发生错误'));}workerPending.clear();};
async function tokenize(text){await ready;const nameR=(current&&current.nameReadings)||{};const aiAll=(current&&current.aiReadings)||{},aiPrefix=text+'\0',aiR={};for(const k of Object.keys(aiAll))if(k.startsWith(aiPrefix))aiR[k.slice(aiPrefix.length)]=aiAll[k];const rg=(current&&current.rubyGlobal)||{},rgT={};for(const k in rg)if(text.indexOf(k)>=0)rgT[k]=rg[k];const srcRuby=(current&&current.sourceRuby&&window.RikkaSourceRuby)?RikkaSourceRuby.forText(text,current.sourceRuby):[];const uR={},uAll={...(settings.userReadings||{}),...((current&&current.userReadings)||{})};for(const k in uAll)if(text.indexOf(k)>=0)uR[k]=uAll[k];const eff={...rgT,...aiR,...nameR,...overrides,...uR};const key=text+'\0'+JSON.stringify(eff)+'\0'+JSON.stringify(srcRuby);if(tokenCache.has(key))return tokenCache.get(key);const tokens=await new Promise((resolve,reject)=>{const id=++tokenSerial;const timer=setTimeout(()=>{workerPending.delete(id);reject(new Error('这段文字处理时间过长，请缩短后重试'));},45000);workerPending.set(id,{resolve,reject,timer});worker.postMessage({id,text,overrides:eff,ruby:srcRuby});});if(tokenCache.size>220)tokenCache.delete(tokenCache.keys().next().value);tokenCache.set(key,tokens);return tokens;}
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('show'),4200);}
function busy(message){$('#busy-text').textContent=message;$('#busy').classList.remove('hidden');}
function unbusy(){$('#busy').classList.add('hidden');}
function safe(fn){return async(...args)=>{try{return await fn(...args);}catch(e){unbusy();toast(e.message||String(e));console.error(e.message||e);}};}
function uid(){return typeof crypto.randomUUID==='function'?crypto.randomUUID():'hana_'+Date.now()+'_'+Math.random().toString(36).slice(2);}
function saveSettings(){RikkaAppearance.remember();localStorage.setItem('hana_settings',JSON.stringify(settings));applySettings();}
function applySettings(){RikkaAppearance.applyTheme();document.documentElement.style.setProperty('--reader-size',settings.font+'px');document.body.classList.toggle('ruby-none',settings.ruby==='none');document.body.classList.toggle('ruby-tap',settings.ruby==='tap');document.body.classList.toggle('analysis-off',!settings.analysis);$('#toggle-ruby').classList.toggle('active',settings.ruby!=='none');$('#toggle-analysis').classList.toggle('active',settings.analysis);$('#segment-preview').textContent=settings.segment;renderNavigation();applyBackground();}
function config(){return RikkaProfiles.config();}
function formatDate(date){return new Date(date).toLocaleDateString('zh-CN',{month:'numeric',day:'numeric'});}
function dayKey(){return new Date().toLocaleDateString('en-CA');}
async function trackDay(){const m=await DB.get('meta','days')||{id:'days',days:[]};if(!m.days.includes(dayKey())){m.days.push(dayKey());await DB.put('meta',m);}}
function showDialog(title,html){$('#dialog-title').textContent=title;$('#dialog-body').innerHTML=html;if(!$('#dialog').open)$('#dialog').showModal();}
function closeDialog(){$('#dialog').close();}
function nav(target){
  if(view==='reader'&&target!=='reader'){savePosition();RikkaVoice.stop();}
  if(view==='settings'&&target!=='settings')saveSetUi({scroll:Math.round($('#main').scrollTop)});
  renderVersion++;view=target;document.body.dataset.view=target;$$('.view').forEach(x=>x.classList.toggle('hidden',x.id!=='view-'+target));$$('.nav-button').forEach(b=>b.classList.toggle('active',b.dataset.nav===target||(target==='reader'&&b.dataset.nav==='library')));closeDialog();$('#main').scrollTo(0,0);
  $('#page-eyebrow').textContent={library:'阅读',import:'导入',reader:'阅读',create:'故事',learn:'词典',words:'生词',exam:'考试',settings:'设置'}[target];
  if(target==='learn')safe(RikkaDictionary.render)();if(target==='library')renderBooks();if(target==='settings'){renderSettings();restoreSettingsGroups();restoreSettingsScroll();window.RikkaSettingsUI?.refresh();}if(target==='words')safe(renderWords)();if(target==='exam')safe(RikkaExam.render)();if(target==='create')renderStudio();
}
function empty(title,detail=''){return '<div class="empty-state">'+icon('book')+C.escape(title)+'<p>'+C.escape(detail)+'</p></div>';}
/* 封面配色：日本传统色，按书名稳定取色 */
const COVER_COLORS=[['#2B3E6B','#F2F0E8'],['#7A2E39','#F6EDE4'],['#2F5D50','#F1F0E6'],['#C9B27C','#2B2620'],['#B85C4B','#FBF3EA'],['#4A4E69','#EFEAF5'],['#D7C4BB','#3B2E2A'],['#5B7F95','#F4F7F8'],['#8A6F9E','#F7F2FA'],['#E5DFD3','#2E3A5A'],['#3C3C3C','#E9C46A'],['#9AA87F','#22301C']];
function coverPalette(seed){let h=2166136261;for(const ch of String(seed))h=Math.imul(h^ch.codePointAt(0),16777619);return COVER_COLORS[(h>>>0)%COVER_COLORS.length];}
function renderBooks(){
  const query=$('#book-search').value.trim().toLowerCase();const fq=window.RikkaSearchFold?RikkaSearchFold(query):'';$('#book-count').textContent=docs.length;const recent=docs.filter(d=>d.lastRead).sort((a,b)=>b.lastRead-a.lastRead)[0];$('#resume-book').classList.toggle('hidden',!recent);if(recent){$('#resume-book').style.setProperty('--resume-c',coverPalette(recent.title+(recent.author||''))[0]);$('#resume-title').textContent=recent.title;$('#resume-progress').textContent='第 '+(Number(recent.position||0)+1)+' 段';$('#resume-book').onclick=safe(()=>openDoc(recent.id));}
  const list=docs.filter(d=>(filter==='all'||filter==='reading'&&d.lastRead||d.type===filter)&&(!query||(d.title+' '+d.text).toLowerCase().includes(query)||(fq&&(RikkaSearchFold(d.title).includes(fq)||(d.author&&RikkaSearchFold(d.author).includes(fq)))))).sort((a,b)=>(b.lastRead||b.created)-(a.lastRead||a.created));
  $('#books').innerHTML=list.length?list.map(d=>{
    const progress=d.lastRead?Math.min(100,Math.round((Number(d.position||0)+1)/d.paragraphs.length*100)):0;
    const pal=coverPalette(d.title+(d.author||''));
    return '<button class="book-card" data-book="'+C.escape(d.id)+'"><div class="cover" style="--c1:'+pal[0]+';--c2:'+pal[1]+'"><svg class="cover-mark" aria-hidden="true"><use href="#i-flower"/></svg><span class="cover-title" lang="ja">'+C.escape(d.title.slice(0,24))+'</span><span class="cover-band"></span><span class="cover-author">'+C.escape(d.author||(d.type==='story'?'六花の物語':d.type==='bundled'?'青空文庫':d.format?String(d.format).toUpperCase():'貼り付け'))+'</span>'+(d.lastRead?'<span class="cover-ribbon"></span>':'')+'</div><h3>'+C.escape(d.title)+'</h3><span class="book-sub">'+(d.lastRead?'已读 '+progress+'%':d.text.length.toLocaleString()+' 字')+'</span><div class="book-progress"><span style="width:'+progress+'%"></span></div></button>';
  }).join(''):empty(query?'没有找到这篇阅读':'书架等你放入第一本书','贴入文字，或导入一份日语文档。');RikkaShelf.render();
}
async function saveDoc(doc){await DB.put('documents',doc);const i=docs.findIndex(d=>d.id===doc.id);if(i>=0)docs[i]=doc;else docs.push(doc);}
async function makeDoc(title,text,type='paste',extras={}){
  text=text.replace(/\u0000/g,'').trim();if(!text)throw new Error('请先粘贴一段日语');if(text.length>1000000)throw new Error('正文超过 100 万字，请分章节导入');
  const doc={id:uid(),title:title.trim()||text.replace(/\s+/g,' ').slice(0,24),text,type,created:Date.now(),lastRead:0,position:0,paragraphs:C.splitParagraphs(text,settings.segment),analyses:{},...extras};await saveDoc(doc);return doc;
}
async function openDoc(id,at){
 RikkaVoice.stop();
 if(view==='reader')await savePosition();const doc=docs.find(d=>d.id===id)||await DB.get('documents',id);if(!doc)throw new Error('这篇阅读已被删除');
 const mark=at==null&&settings.rememberPosition?RikkaShelf.bookmark(doc):null;const position=at??mark?.paragraph??(settings.rememberPosition?doc.position||0:0);
 RikkaShelf.begin();current=doc;page=Math.max(0,Math.min(Math.floor(position/PAGE_SIZE),Math.ceil(doc.paragraphs.length/PAGE_SIZE)-1));nav('reader');doc.lastRead=Date.now();await saveDoc(doc);await trackDay();await renderReader(position,mark);
 if(mark)toast('已回到上次读到的位置 · 第 '+(position+1)+' 段');
}
function renderTokens(tokens,paragraph){return tokens.map((t,i)=>'<span class="token'+(C.kanji.test(t.s)&&!t.r?' unknown':'')+(t.uncertain?' uncertain':'')+'" data-token="'+i+'" data-paragraph="'+paragraph+'" tabindex="0" role="button" aria-label="'+C.escape(t.s+' '+t.r)+'">'+(t.rp&&t.rpr===t.r?C.rubyHtml(t.rp):C.ruby(t.s,t.r))+'</span>').join('');}
let shownTokens={},rawTokens={};
const RS=RikkaReadingSync;
function hiraStr(x){return String(x||'').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-96));}
/* ===== 读音统一（v3.0.5）=====
 * 正文、解析列表、点词弹窗以前各用各的读音，经常对不上（如正文「告(つげ)」、解析「嘘告 うそこく」）。
 * 现在：分词器给出原始 token（rawTokens）→ 整段解析的读音回写 → 点词解析的读音回写 → 得到正文 token（shownTokens）。
 * 解析列表与弹窗显示的读音一律从正文 token 推出来，所以三处永远一致。被分词器切碎的词会合并回整体。 */
const HONO_RX=/^(.{2,}?)(さん|ちゃん|くん|君|様|さま|氏|殿|先輩|先生)$/,HONO_R={'さん':'さん','ちゃん':'ちゃん','くん':'くん','君':'くん','様':'さま','さま':'さま','氏':'し','殿':'どの','先輩':'せんぱい','先生':'せんせい'};
function readingLocked(t,doc){return t.source==='author'||t.source==='curated'||overrides[t.s]!=null||(settings.userReadings&&settings.userReadings[t.s]!=null)||!!(doc&&doc.userReadings&&doc.userReadings[t.s]!=null)||!!(doc&&doc.nameReadings&&doc.nameReadings[t.s]);}
function analysisSpans(a){
  const out=[];if(!a||a.source!=='ai'||!Array.isArray(a.vocabulary))return out;
  for(const v of a.vocabulary){
    if(!v||!v.surface||!RS.hasKanji(v.surface))continue;
    const r=RS.valid(v.surface,v.surfaceReading)||RS.surfaceFromBase(v.word,v.reading,v.surface);if(!r)continue;
    const m=v.surface.match(HONO_RX);
    if(m&&RS.hasKanji(m[1])){const hr=HONO_R[m[2]];if(r.endsWith(hr)){const br=RS.valid(m[1],r.slice(0,-hr.length));if(br){out.push({surface:m[1],reading:br,base:m[1]});continue;}}}
    out.push({surface:v.surface,reading:r,base:v.word});
  }
  return out;
}
/* 点词解析结果 → 正文读音。span 是 AI 判断出的完整词（分词器切碎时比点的那块更长） */
function wordAiSpan(ai,surface,text){
  if(!ai)return null;
  if(ai.span&&ai.span!==surface&&ai.span.includes(surface)&&text.includes(ai.span)&&Array.from(ai.span).length<=16){const r=RS.valid(ai.span,ai.spanReading);if(r)return {surface:ai.span,reading:r,base:ai.word||ai.span};}
  const own=!ai.span||ai.span===surface;
  const r=(own&&RS.valid(surface,ai.spanReading))||(ai.word?RS.surfaceFromBase(ai.word,ai.reading,surface):'');
  return r?{surface,reading:r,base:ai.word&&ai.word!==surface?ai.word:''}:null;
}
function wordSpans(index,raw){
  const text=current.paragraphs[index]||'',out=[];let pos=0;
  raw.forEach((t,i)=>{const at=pos;pos+=(t.s||'').length;if(!t.s||!RS.hasKanji(t.s))return;
    const sp=wordAiSpan(wordAiFor(t,sentenceOf(text,raw,i),false),t.s,text);if(sp)out.push({...sp,at,len:t.s.length});});
  return out;
}
function resolveTokens(index,raw){
  const doc=current;if(!doc||!raw||!raw.length)return raw||[];
  const text=doc.paragraphs[index]||'',lock=t=>readingLocked(t,doc);
  let toks=RS.apply(raw.slice(),text,analysisSpans(doc.analyses&&doc.analyses[index]),'analysis',lock);
  toks=RS.apply(toks,text,wordSpans(index,raw),'word',t=>lock(t)||t.aiFixed==='analysis');
  return toks;
}
function tokenAt(index,offset){const toks=shownTokens[index]||[];let p=0;for(let k=0;k<toks.length;k++){const e=p+toks[k].s.length;if(offset>=p&&offset<e)return {t:toks[k],k};p=e;}return null;}
function restoreSelection(index){const sel=wordSelection;if(!sel||sel.index!==index||sel.offset==null||!$('#dialog').open)return;const hit=tokenAt(index,sel.offset);if(hit)$('[data-paragraph="'+index+'"][data-token="'+hit.k+'"]')?.classList.add('selected');}
/* 重新合成某一段的正文读音；有变化就重绘正文和解析列表 */
function repaintParagraph(index){
  if(!current||!rawTokens[index])return false;
  const next=resolveTokens(index,rawTokens[index]),prev=shownTokens[index]||[];
  const same=prev.length===next.length&&prev.every((t,k)=>t.s===next[k].s&&t.r===next[k].r);
  shownTokens[index]=next;if(same)return false;
  const el=$('#paragraph-'+index+' .japanese');if(el){el.innerHTML=renderTokens(next,index);restoreSelection(index);}
  renderLesson(index,next);return true;
}
const repaintQueue=new Set();let repaintTimer=0;
function scheduleRepaint(index){repaintQueue.add(index);clearTimeout(repaintTimer);repaintTimer=setTimeout(()=>{const list=[...repaintQueue];repaintQueue.clear();if(view!=='reader')return;list.forEach(i=>{try{repaintParagraph(i);}catch(e){}});},350);}
/* 解析列表里显示的读音：从正文 token 推出（原形读音按活用关系反推），推不出才用解析自带的 */
function vocabReadingFrom(toks,text,v){
  if(!v)return '';if(!toks||!toks.length||!v.surface)return v.reading||'';
  const sr=RS.readingOf(toks,text,v.surface);if(!sr)return v.reading||'';
  if(v.word===v.surface)return sr;
  return RS.baseFromSurface(v.word,v.surface,sr)||v.reading||'';
}
function vocabReading(index,v){return vocabReadingFrom(shownTokens[index],current?.paragraphs[index]||'',v);}
/* 弹窗里“词典原形”的读音必须和上面大字注音一致 */
function consistentReading(v){
  if(!v.surfaceReading||!v.surface)return v.reading||'';
  if(v.word===v.surface)return v.surfaceReading;
  return RS.baseFromSurface(v.word,v.surface,v.surfaceReading)||v.reading||'';
}
async function renderReader(scrollTo,bookmark){
  RikkaShelf.begin();
  if(!current)return;const doc=current,version=++renderVersion;shownTokens={};rawTokens={};preQueue=[];await loadDocWords(doc);await lexLoad();if(version!==renderVersion)return;$('#reader-title').textContent=doc.title;$('#story-continue-bar').classList.toggle('hidden',doc.type!=='story');$('#reader-mode').textContent=HanaAI.configured()?(settings.autoAI?'AI 自动解析已开启':'离线注音 · 可点 AI 深入解析'):'离线词典 · 常用语法匹配';
  const start=page*PAGE_SIZE,end=Math.min(start+PAGE_SIZE,doc.paragraphs.length);$('#reader-position').textContent='第 '+(start+1)+'–'+end+' 段 / 共 '+doc.paragraphs.length+' 段';
  $('#reader-content').innerHTML=Array.from({length:end-start},(_,j)=>{const i=start+j;return '<article class="paragraph-card" id="paragraph-'+i+'" data-index="'+i+'"><div class="paragraph-head"><span>段落 '+String(i+1).padStart(2,'0')+'</span><button data-speak="'+i+'" aria-label="朗读这一段">'+icon('volume')+'</button></div><div class="japanese" lang="ja"><span class="hint">正在为这一段标注假名…</span></div><div class="lesson" id="lesson-'+i+'"></div></article>';}).join('');
  const total=Math.ceil(doc.paragraphs.length/PAGE_SIZE);$('#reader-pagination').innerHTML='<button class="secondary" id="prev-page" '+(page===0?'disabled':'')+'>上一页</button><span>'+(page+1)+' / '+total+'</span><button class="secondary" id="next-page" '+(page>=total-1?'disabled':'')+'>下一页</button><input id="jump-page" class="jump-input" type="number" min="1" max="'+total+'" placeholder="页" aria-label="跳至页码">';
  $('#prev-page').onclick=safe(()=>movePage(page-1));$('#next-page').onclick=safe(()=>movePage(page+1));$('#jump-page').onchange=safe(e=>{const p=Number(e.target.value);if(!Number.isInteger(p)||p<1||p>total)throw new Error('请输入 1–'+total+' 的页码');return movePage(p-1);});
  for(let i=start;i<end;i++){
    try{const tokens=await tokenize(doc.paragraphs[i]);if(version!==renderVersion||current.id!==doc.id)return;rawTokens[i]=tokens;shownTokens[i]=resolveTokens(i,tokens);$('#paragraph-'+i+' .japanese').innerHTML=renderTokens(shownTokens[i],i);renderLesson(i,shownTokens[i]);queueAiDisambiguation(i,tokens);preparseParagraph(doc,i,tokens);}
    catch(e){if(version!==renderVersion)return;$('#paragraph-'+i+' .japanese').textContent=doc.paragraphs[i];$('#lesson-'+i).innerHTML='<p class="error-note">'+C.escape(e.message)+'</p>';}
  }
  if(version!==renderVersion)return;
  current.position=Number.isInteger(scrollTo)?scrollTo:start;updateProgress();await saveDoc(current);
  if(bookmark)RikkaShelf.restore(bookmark);else if(scrollTo>start)$('#paragraph-'+scrollTo)?.scrollIntoView({behavior:'instant',block:'start'});
  RikkaShelf.end();RikkaShelf.capture();await saveDoc(current);
  observeParagraphs();if(settings.autoAI&&HanaAI.configured())autoAnalyze(doc,version,start,end);
  // 预解析下一页：后台 tokenize + AI 语境判读，翻页时直接可用
  prefetchNextPage(doc,version,end);
}
/* 下一页的单词预解析等你读到本页六成再开始，不读下去就不花这份钱 */
let nextPagePre=[],nextPageDoc=null;
function maybePreparseNext(){if(view!=='reader'||!nextPagePre.length||!current||nextPageDoc!==current.id)return;const m=$('#main');if(m.scrollTop+m.clientHeight<m.scrollHeight*.6)return;const list=nextPagePre;nextPagePre=[];for(const[i,tokens]of list)preparseParagraph(current,i,tokens);}
async function prefetchNextPage(doc,version,from){
 nextPagePre=[];nextPageDoc=doc.id;
 if(!HanaAI.configured()||(!settings.aiFurigana&&!wantPreparse()))return;
 const to=Math.min(from+PAGE_SIZE,doc.paragraphs.length);
 for(let i=from;i<to;i++){
  try{
   if(version!==renderVersion||current?.id!==doc.id)return;
   const tokens=await tokenize(doc.paragraphs[i]);
   if(version!==renderVersion||current?.id!==doc.id)return;
   if(settings.aiFurigana)queueAiDisambiguation(i,tokens);
   nextPagePre.push([i,tokens]);
  }catch(e){/* 后台预解析失败不打扰用户 */}
 }
 maybePreparseNext();
}
async function movePage(next){RikkaVoice.stop();if(!current)return;page=Math.max(0,Math.min(next,Math.ceil(current.paragraphs.length/PAGE_SIZE)-1));$('#main').scrollTo(0,0);await renderReader(page*PAGE_SIZE);}
function formDescription(t){
  if(!t||t.s===t.b)return '';
  const forms={'連用形':'连用形，常连接ます、后续助动词或复合动词','連用タ接続':'接た／て等的连用形式，实际时态需结合后续助动词','未然形':'未然形，常接ない、れる等','仮定形':'假定形，常接ば','基本形':'基本形','体言接続':'连接名词的形式','連用デ接続':'连接で的形式'};
  const type=t.ct?.includes('五段')?'五段动词':t.ct?.includes('一段')?'一段动词':t.ct?.includes('サ変')?'サ变动词':t.ct?.includes('カ変')?'カ变动词':t.ct?.includes('形容詞')?'い形容词':'';
  return '原形 '+t.b+' → '+t.s+'。'+(type?type+'；':'')+(forms[t.cf]||'具体活用需结合后续词判断')+'。';
}
function offlineAnalysis(index,tokens,doc=current){
  const text=doc.paragraphs[index],vocabulary=[],seen=new Set();
  for(const t of tokens){const entry=D.lexicon[t.b]||D.lexicon[t.s];if(entry&&!seen.has(entry.word)){seen.add(entry.word);vocabulary.push({...entry,surface:t.s,form:formDescription(t)});}}
  for(const entry of Object.values(D.lexicon))if(!seen.has(entry.word)&&entry.word.length>1&&text.includes(entry.word)){seen.add(entry.word);vocabulary.push({...entry,surface:entry.word,form:''});}
  const grammar=D.grammar.map(g=>{const m=text.match(new RegExp(g.pattern,'u'));return m?{...g,evidence:m[0]}:null;}).filter(Boolean).slice(0,8);

  return {translation:'',vocabulary:vocabulary.slice(0,12),grammar,source:'offline'};
}
function lessonData(index){return current.analyses?.[index]||offlineAnalysis(index,shownTokens[index]||[]);}
function repeatedCount(word,index){if(!settings.dedupe)return 0;let count=0;for(let j=0;j<index;j++)if(current.paragraphs[j].includes(word)&&++count>=2)break;return count;}
function vocabRows(vocab,index){
  let visible='',folded='',n=0;
  for(let j=0;j<vocab.length;j++){
    const v=vocab[j],rd=vocabReading(index,v),saved=words.some(w=>w.word===v.word&&w.reading===rd),repeat=repeatedCount(v.word,index);n++;
    const html='<div class="vocab-row"><span class="num">'+String(n).padStart(2,'0')+'</span><div class="vocab-info"><button class="vocab-title" data-vocab="'+index+':'+j+'">'+C.escape(v.word)+'<span class="vocab-reading">'+C.escape(rd)+'</span></button><span class="level">'+C.escape(v.level||'参考')+'</span>'+(repeat?'<span class="level">再次遇见</span>':'')+'<p class="vocab-meaning">'+C.escape(v.meaning)+'</p>'+(v.form?'<p class="vocab-meaning">'+C.escape(v.form)+'</p>':'')+(v.origin?'<p class="vocab-meaning">原词：'+C.escape(v.origin)+'</p>':'')+'</div><button class="icon-button" data-add-word="'+index+':'+j+'" aria-label="'+(saved?'已收藏':'收藏 '+C.escape(v.word))+'">'+icon(saved?'check':'plus')+'</button></div>';
    if(repeat>=2)folded+=html;else visible+=html;
  }
  return (visible||(!folded?'<p class="hint">此段没有命中内置重点词库。点击正文单词可查看读音与原形，AI 可补充中文释义。</p>':''))+(folded?'<details><summary class="hint">已多次遇见的词（展开复习）</summary>'+folded+'</details>':'');
}
function grammarRows(grammar){return grammar.length?grammar.map((g,i)=>'<div class="grammar-card"><h4>'+(i+1)+'. '+C.escape(g.name)+' <span class="level">'+C.escape(g.level||'参考')+'</span></h4><p><b>意思：</b>'+C.escape(g.meaning)+'</p><p><b>接续：</b>'+C.escape(g.construction)+'</p><p><b>用法：</b>'+C.escape(g.usage)+'</p><div class="grammar-example"><span class="annotate-example" lang="ja">'+C.escape(g.example)+'</span><small>'+C.escape(g.translation)+'</small></div></div>').join(''):'<p class="hint">没有命中内置语法规则。可以点“AI 深入解析”结合原文讲解。</p>';}
const CHEV='<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>';
function renderLesson(index,tokens){
  const el=$('#lesson-'+index);if(!el||!current)return;const a=current.analyses?.[index]||offlineAnalysis(index,tokens);const isBusy=analysisBusy.has(current.id+':'+index),err=analysisErrors.get(current.id+':'+index);
  // 重绘时保留这一段当前停在哪个标签、是否单独展开过
  const prevTab=el.querySelector('.lesson-tabs [data-tab].active')?.dataset.tab||'vocab',localOpen=!!el.querySelector('.lesson-detail.local-open'),reviewOpen=!!el.querySelector('.vocab-panel details[open]');
  const folded=!!settings.lessonCollapsed;el.classList.toggle('collapsed',folded);
  const detailFolded=!!settings.lessonDetailCollapsed&&!localOpen;
  el.innerHTML='<div class="lesson-title"><div><b>这一段，读懂了吗</b><br><span>'+(a.source==='ai'?'AI 解析 · 已保存':'离线词库与规则 · 等级仅供参考')+'</span></div><button class="ai-button" data-ai="'+index+'" '+(isBusy?'disabled':'')+'>'+(isBusy?'解析中…':a.source==='ai'?'重新解析':'✧ AI 深入解析')+'</button><button class="lesson-fold" data-fold aria-expanded="'+(!folded)+'" aria-label="'+(folded?'展开整段解析':'折叠整段解析（含翻译）')+'">'+CHEV+'</button></div>'
   +'<div class="lesson-body"><div class="lesson-inner">'+(err?'<p class="error-note">'+C.escape(err)+'</p>':'')+'<p class="translation'+(a.translation?'':' empty')+'">'+C.escape(a.translation||'中文全文翻译可通过 AI 解析生成。')+'</p>'
   +'<div class="lesson-detail'+(detailFolded?' folded':'')+(localOpen&&settings.lessonDetailCollapsed?' local-open':'')+'"><div class="lesson-tabs"><button class="'+(prevTab==='vocab'?'active':'')+'" data-tab="vocab" data-lesson="'+index+'">重点词汇 '+a.vocabulary.length+'</button><button class="'+(prevTab==='grammar'?'active':'')+'" data-tab="grammar" data-lesson="'+index+'">语法解析 '+a.grammar.length+'</button>'
   +'<button class="detail-fold" data-detail-fold aria-expanded="'+(!detailFolded)+'" aria-label="'+(detailFolded?'展开词汇与语法':'只收起词汇与语法，保留翻译')+'"><span>'+(detailFolded?'展开':'收起')+'</span>'+CHEV+'</button></div>'
   +'<div class="detail-body"><div class="detail-inner"><div class="vocab-panel'+(prevTab==='vocab'?'':' hidden')+'">'+vocabRows(a.vocabulary,index)+'</div><div class="grammar-panel'+(prevTab==='grammar'?'':' hidden')+'">'+grammarRows(a.grammar)+'</div></div></div></div></div></div>';
  if(reviewOpen)el.querySelector('.vocab-panel details')?.setAttribute('open','');
  if(prevTab==='grammar')annotateExamples(el).catch(()=>{});
}
/* 折叠时让手指下的这一段不跳走：动画期间每帧补偿滚动 */
function holdAnchor(el){if(!el)return;const main=$('#main'),top0=el.getBoundingClientRect().top,t0=performance.now();const step=()=>{const d=el.getBoundingClientRect().top-top0;if(Math.abs(d)>1)main.scrollTop+=d;if(performance.now()-t0<460)requestAnimationFrame(step);};requestAnimationFrame(step);}
function setDetailState(d,folded){d.classList.toggle('folded',folded);const b=d.querySelector('[data-detail-fold]');if(b){b.setAttribute('aria-expanded',String(!folded));b.setAttribute('aria-label',folded?'展开词汇与语法':'只收起词汇与语法，保留翻译');const t=b.querySelector('span');if(t)t.textContent=folded?'展开':'收起';}}
/* 整段解析折叠（含翻译）：记住上一次的选择，所有段落、下次打开都沿用 */
function toggleLessonFold(btn){
  const lesson=btn.closest('.lesson');holdAnchor(lesson);
  settings.lessonCollapsed=!settings.lessonCollapsed;saveSettings();
  const folded=settings.lessonCollapsed;
  $$('.lesson').forEach(el=>{el.classList.toggle('collapsed',folded);const b=el.querySelector('[data-fold]');if(b){b.setAttribute('aria-expanded',String(!folded));b.setAttribute('aria-label',folded?'展开整段解析':'折叠整段解析（含翻译）');}});
}
/* 只折叠词汇与语法（翻译保留）：同样全书记住；收起状态下点标签只临时展开这一段 */
function toggleDetailFold(btn){
  const det=btn.closest('.lesson-detail');if(!det)return;holdAnchor(btn.closest('.lesson'));
  const fold=!det.classList.contains('folded');
  settings.lessonDetailCollapsed=fold;saveSettings();
  $$('.lesson-detail').forEach(d=>{d.classList.remove('local-open');setDetailState(d,fold);});
}
async function annotateExamples(container){for(const el of container.querySelectorAll('.annotate-example')){if(el.dataset.done)continue;const text=el.textContent;const tokens=await tokenize(text);if(!el.isConnected)return;el.innerHTML=tokens.map(t=>C.ruby(t.s,t.r)).join('');el.dataset.done='1';}}
async function analyze(index,force=false){
  const doc=current,key=doc.id+':'+index;if(analysisBusy.has(key))return;if(doc.analyses[index]&&!force)return;
  if(!HanaAI.configured()){toast('先在设置里填写 AI 密钥，即可获得完整中文讲解');nav('settings');$('#settings-ai').open=true;$('#ai-key').focus();return;}
  analysisBusy.add(key);analysisErrors.delete(key);if(current===doc)renderLesson(index,shownTokens[index]||[]);
  try{
    const text=doc.paragraphs[index],ck='a:'+textHash(text);let result=null;
    // 第一次解析这段：先看本机有没有解析过一模一样的文字（重导入、同一章多次打开）；点“重新解析”才一定重新请求
    if(!doc.analyses[index]){try{const hit=await DB.get('cache',ck);if(hit&&hit.text===text&&hit.v&&hit.v.source==='ai'){result={...hit.v};HanaAI.recordSaved('analysis');}}catch(e){}}
    if(!result){result=await HanaAI.analyze(config(),text);result.model=settings.model;DB.put('cache',{id:ck,text,v:result,t:Date.now()}).catch(()=>{});}
    doc.analyses[index]=result;await saveDoc(doc);if(current===doc&&view==='reader'){repaintParagraph(index);renderLesson(index,shownTokens[index]||[]);}}
  catch(e){analysisErrors.set(key,e.message);throw e;}
  finally{analysisBusy.delete(key);if(current===doc&&view==='reader')renderLesson(index,shownTokens[index]||[]);}
}
let aiDisambTimer=null;const aiDisambQueue=[],aiDisambTried=new Set();
function queueAiDisambiguation(index,tokens){
 if(!settings.aiFurigana||!HanaAI.configured()||!current)return;
 const sentence=current.paragraphs[index]||'',docId=current.id;
 for(const t of tokens){
  if(!t.needsAi)continue;
  const word=t.s||t.surface_form||'';
  if(!word)continue;
  const key=docId+'\0'+sentence+'\0'+word;
  if(aiDisambTried.has(key)||(current.aiReadings&&current.aiReadings[sentence+'\0'+word]))continue;
  aiDisambTried.add(key);
  aiDisambQueue.push({index,sentence,word,docId});
 }
 clearTimeout(aiDisambTimer);
 aiDisambTimer=setTimeout(runAiDisambiguation,1200);
}
async function runAiDisambiguation(){
 if(!aiDisambQueue.length||!current)return;
 const doc=current,batch=aiDisambQueue.splice(0,15).filter(q=>q.docId===doc.id);
 if(!batch.length){if(aiDisambQueue.length)aiDisambTimer=setTimeout(runAiDisambiguation,300);return;}
 try{
  const result=await HanaAI.disambiguate(config(),batch);
  let changed=false;
  for(const[idx,reading]of Object.entries(result)){
   const item=batch[Number(idx)];if(!item)continue;
   const key=item.sentence+'\0'+item.word;
   if(!doc.aiReadings)doc.aiReadings={};
   if(doc.aiReadings[key]!==reading){doc.aiReadings[key]=reading;changed=true;}
  }
  if(changed){
   await saveDoc(doc);
   if(current!==doc)return;
   tokenCache.clear();
   const affected=[...new Set(batch.map(b=>b.index))];
   for(const i of affected){
    if(!shownTokens[i])continue;
    try{
     const tokens=await tokenize(doc.paragraphs[i]);
     if(current!==doc)return;
     rawTokens[i]=tokens;
     repaintParagraph(i);
    }catch(e){}
   }
  }
 }catch(e){}
 if(aiDisambQueue.length)aiDisambTimer=setTimeout(runAiDisambiguation,1200);
}
async function autoAnalyze(doc,version,start,end){for(let i=start;i<end;i++){if(version!==renderVersion||view!=='reader'||current!==doc||!settings.autoAI)return;try{await analyze(i);}catch(e){/* 单段失败只记录错误，不中断后续段落 */}}}
let autoHeartbeat=0;
function startAutoHeartbeat(){
  if(autoHeartbeat)return;
  autoHeartbeat=setInterval(()=>{
    try{
      if(!settings.autoAI||!HanaAI.configured()||view!=='reader'||!current||analysisBusy.size>0)return;
      const doc=current,start=page*PAGE_SIZE,end=Math.min(start+PAGE_SIZE,doc.paragraphs.length);
      for(let i=start;i<end;i++){
        if(doc.analyses[i])continue;
        const key=doc.id+':'+i;
        if(analysisBusy.has(key))continue;
        const err=analysisErrors.get(key)||'';
        if(/密钥|余额|401|402/.test(err))continue;
        safe(()=>analyze(i))();
        break;
      }
    }catch(e){}
  },8000);
}
let observer,positionTimer;
function observeParagraphs(){observer?.disconnect();}
function updateProgress(){if(current)$('#reading-progress span').style.width=Math.min(100,(current.position+1)/current.paragraphs.length*100)+'%';}
async function savePosition(){if(view==='reader'&&current){RikkaShelf.capture();await saveDoc(current);}}
function speak(text){return safe(()=>RikkaVoice.speak(text))();}
function stopSpeech(){RikkaVoice.stop();}
async function addWord(v,context){const existing=words.find(w=>w.word===v.word&&w.reading===v.reading);if(existing){toast('这个词已经在生词本里了');return;}const w={...v,id:uid(),context:context||'',book:current?.title||'',created:Date.now(),due:Date.now(),reviews:0,interval:0};await DB.put('words',w);words.push(w);toast('已加入生词手帐');if(view==='reader')Object.keys(shownTokens).forEach(i=>renderLesson(Number(i),shownTokens[i]));}
/* ===== 点词秒开：整页单词预解析（v3.1.0）=====
 * v3.0.3 是“点了才去问 AI”，每次要等几秒。现在改成：一页渲染好，后台就把这一页（以及下一页）
 * 里所有的词按句子批量交给 AI 解析好，存进本书自己的单词库（IndexedDB meta: wordai:<书ID>）。
 * 点词时直接从库里取，没有任何等待；还没轮到的词会被插队优先解析，再不行才单独请求。
 * 批量结果是“精简版”（不含例句），弹窗里可以一键补全例句与更多讲解。 */
const WORD_CACHE_KEY='rikka_word_ai_v1',WORD_CACHE_MAX=1500,wordAiBusy=new Map();let wordCache=null;
function wordCacheMap(){if(!wordCache){try{wordCache=JSON.parse(localStorage.getItem(WORD_CACHE_KEY)||'{}')||{};}catch(e){wordCache={};}}return wordCache;}
function wordCacheKey(surface,sentence){return surface+' ⇢ '+sentence;}
/* —— 本书单词库（不限条数，跟着书走，删书时一起删）—— */
let docWords={id:'',map:{}},docWordsTimer=0,docWordsDirty=false;
async function loadDocWords(doc){if(!doc||docWords.id===doc.id)return;await flushDocWords();docWords={id:doc.id,map:{}};try{const m=await DB.get('meta','wordai:'+doc.id);if(m&&m.map&&typeof m.map==='object'&&docWords.id===doc.id)docWords.map=m.map;}catch(e){}}
function flushDocWords(){clearTimeout(docWordsTimer);if(!docWordsDirty||!docWords.id)return Promise.resolve();docWordsDirty=false;return DB.put('meta',{id:'wordai:'+docWords.id,map:docWords.map}).catch(()=>{});}
function docWordsPut(key,value){if(!current||docWords.id!==current.id)return;docWords.map[key]=value;docWordsDirty=true;clearTimeout(docWordsTimer);docWordsTimer=setTimeout(flushDocWords,1500);}
function wordCachePeek(key){const own=docWords.id&&current&&docWords.id===current.id?docWords.map[key]:null;if(own)return own;const hit=wordCacheMap()[key];return hit?hit.v:null;}
function wordCacheGet(key){const own=docWords.id&&current&&docWords.id===current.id?docWords.map[key]:null;if(own)return own;const hit=wordCacheMap()[key];if(!hit)return null;hit.t=Date.now();return hit.v;}
function wordCachePut(key,value){docWordsPut(key,value);if(value&&value.brief)return;const m=wordCacheMap();m[key]={v:value,t:Date.now()};let keys=Object.keys(m);if(keys.length>WORD_CACHE_MAX)keys.sort((a,b)=>m[a].t-m[b].t).slice(0,keys.length-WORD_CACHE_MAX).forEach(k=>delete m[k]);
  for(let tries=0;tries<3;tries++){try{localStorage.setItem(WORD_CACHE_KEY,JSON.stringify(m));return;}catch(e){keys=Object.keys(m).sort((a,b)=>m[a].t-m[b].t);keys.slice(0,Math.ceil(keys.length/2)).forEach(k=>{if(k!==key)delete m[k];});}}}
function wantWordAi(){return settings.wordAI!==false&&HanaAI.configured();}
function wantPreparse(){return settings.preparseWords!==false&&wantWordAi();}
/* ===== 跨书单词缓存（v3.0.6）=====
 * 以前缓存的键是“词 + 整句”，同一个词换一句话就要重新问 AI，书越读越费 token。
 * 现在多一层“词库缓存”：AI 判断为意思/读音固定（ambiguous=false）的词，解析一次就存进本机词库，
 * 以后在任何书、任何句子里遇到同一个词形都直接用，不再请求。多义词、多音词、单个汉字、
 * 分词器拿不准读音的词仍按句子解析，保证准确。弹窗里随时可以“按这句重新解析”。 */
const LEX_MAX=40000;let lex=new Map(),lexReady=null,lexDirty=new Map(),lexTimer=0;const lexSavedSeen=new Set();
function lexKey(t){return (t.s||'')+'|'+(t.b&&t.b!=='*'?t.b:t.s)+'|'+(t.p||'');}
function lexLoad(){return lexReady||(lexReady=DB.all('cache').then(rows=>{for(const r of rows||[])if(r&&typeof r.id==='string'&&r.id.startsWith('w:')&&r.v)lex.set(r.id.slice(2),r);}).catch(()=>{}));}
/* 这类词换句子就可能变：不走词库缓存 */
function lexRisky(t){return !t||!t.s||t.needsAi||t.uncertain||(Array.isArray(t.readings)&&new Set(t.readings).size>1)||(RS.hasKanji(t.s)&&Array.from(t.s).length===1);}
function lexGet(t){if(lexRisky(t))return null;const e=lex.get(lexKey(t));return e&&e.v&&!e.v.ambiguous?e:null;}
function lexPut(t,v){
  if(!t||!v||v.ambiguous||lexRisky(t)||(v.span&&v.span!==t.s))return;
  const k=lexKey(t),old=lex.get(k);if(old&&!old.v.brief&&v.brief)return;// 已有完整版就不用精简版覆盖
  const {lex:_l,...clean}=v;const rec={id:'w:'+k,v:{...clean,lex:true},t:Date.now(),n:(old?.n||0)+1};lex.set(k,rec);lexDirty.set(rec.id,rec);
  clearTimeout(lexTimer);lexTimer=setTimeout(lexFlush,2000);
}
async function lexFlush(){clearTimeout(lexTimer);const items=[...lexDirty.values()];lexDirty.clear();try{await DB.putMany('cache',items);}catch(e){}
  if(lex.size>LEX_MAX){const old=[...lex.values()].sort((a,b)=>a.t-b.t).slice(0,Math.ceil(lex.size*.1));old.forEach(r=>lex.delete(r.id.slice(2)));try{await DB.removeMany('cache',old.map(r=>r.id));}catch(e){}}}
async function lexClear(){lex.clear();lexDirty.clear();try{await DB.clear('cache');}catch(e){}}
/* 取一个 token 的单词解析：本句结果 > 词库缓存 */
function wordAiFor(t,sentence,touch){const key=wordCacheKey(t.s,sentence),own=touch?wordCacheGet(key):wordCachePeek(key);if(own)return own;const e=lexGet(t);if(e){if(touch){e.t=Date.now();e.n=(e.n||0)+1;lexDirty.set(e.id,e);clearTimeout(lexTimer);lexTimer=setTimeout(lexFlush,4000);}return e.v;}return null;}
/* 预解析时跳过的词：助词助动词、标点、非自立词、极常见词（点它时仍会即时解析） */
const PRE_POS_SKIP=/^(助詞|助動詞|記号|フィラー|その他)$/,PRE_P1_SKIP=/^(非自立|接尾|数|代名詞)$/;
const PRE_COMMON=new Set('する いる ある なる れる られる せる させる ない くる いく いう おもう みる できる こと もの よう ため とき ところ これ それ あれ どれ この その あの どの ここ そこ あそこ こちら そちら 私 僕 俺 あなた 君 彼 彼女 人 今 言う 思う 見る 来る 行く 出る 入る 時 中 方 上 下 前 後 日 年 月 さん ちゃん くん 様 まだ もう また すぐ とても ちょっと 少し 何 誰 どう そう こう ああ はい いいえ うん ええ いい よい 良い 大きい 小さい 多い 少ない 今日 明日 昨日 一 二 三 一人 二人 自分 本当 全部 みんな 皆'.split(' '));
function preWorthy(t){if(!t||!t.s||PRE_SKIP.test(t.s)||PRE_POS_SKIP.test(t.p||''))return false;if(settings.preparseAll)return true;if(PRE_P1_SKIP.test(t.p1||''))return false;const b=t.b&&t.b!=='*'?t.b:t.s;if(PRE_COMMON.has(b)||PRE_COMMON.has(t.s))return false;if(/^[ぁ-ゖー]+$/.test(t.s)&&Array.from(t.s).length<=2)return false;return true;}
/* 整段解析的跨书缓存：同一段文字（例如重新导入同一章）不再重复花钱 */
function textHash(s){let h1=0x811c9dc5,h2=0x1000193;for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);h1=Math.imul(h1^c,16777619)>>>0;h2=Math.imul(h2^c,2246822519)>>>0;}return h1.toString(36)+h2.toString(36)+s.length.toString(36);}
/* 单词解析可以用另一个更便宜的模型 */
function wordConfig(){const c=config(),m=String(settings.wordModel||'').trim();return m?{...c,model:m}:c;}

/* 找出第 tokenIndex 个词所在的那一句（按 。！？ 换行切），太短就向前后多带一点语境 */
function sentenceOf(text,tokens,tokenIndex){
  const surface=tokens[tokenIndex]?.s||'';
  let pos=0;for(let k=0;k<tokenIndex;k++)pos+=(tokens[k]?.s||'').length;
  let at=text.startsWith(surface,pos)?pos:text.indexOf(surface,Math.max(0,pos-30));if(at<0)at=text.indexOf(surface);if(at<0)return text.slice(0,240);
  const end=/[。！？!?\n]/;let a=at,b=at+surface.length;
  while(a>0&&!end.test(text[a-1]))a--;while(b<text.length&&!end.test(text[b]))b++;while(b<text.length&&/[。！？!?」』）)…]/.test(text[b]))b++;
  if(b-a<14){while(a>0&&at-a<60)a--;while(b<text.length&&b-at<60)b++;}
  let out=text.slice(a,b).trim().replace(/^[」』）)]+/,'');if(out.length>240)out=text.slice(Math.max(0,at-110),Math.min(text.length,at+surface.length+110)).trim();return out||surface;
}
function tokenSentence(index,tokenIndex){return sentenceOf(current.paragraphs[index]||'',shownTokens[index]||[],tokenIndex);}
function applyWordAi(sel,ai){sel.ai=ai;if(!sel.dictMeaning){sel.meaning=ai.meaning;if(ai.word)sel.word=ai.word;if(ai.reading||ai.word)sel.reading=ai.reading||'';sel.level=ai.level||sel.level;}if(ai.form)sel.form=ai.form;if(ai.origin&&!sel.origin)sel.origin=ai.origin;}

/* —— 预解析队列 —— */
const PRE_SKIP=/^[\s\p{P}\p{S}0-9０-９]+$/u,PRE_CHUNK=16,PRE_PARALLEL=2;
let preQueue=[],preRunning=0,preDocId='';const seenLex=new Set();const prePending=new Map(),preFailed=new Map();
function preStatus(){const el=$('#reader-mode');if(!el||view!=='reader'||!current)return;const left=preQueue.reduce((n,c)=>n+c.items.length,0)+[...prePending.values()].length;
  if(!wantPreparse()){return;}
  el.textContent=left?'正在预解析单词… 还剩 '+left+' 个':'本页单词已预解析 · 点词秒开';el.classList.toggle('pre-busy',!!left);}
/* 把一段里还没解析过的词收集成批次 */
function preparseParagraph(doc,index,tokens,urgent){
  if(!wantPreparse()||!doc||!tokens||!tokens.length)return;
  if(preDocId!==doc.id){preQueue=[];preDocId=doc.id;seenLex.clear();}
  const text=doc.paragraphs[index]||'',seen=new Set(),items=[];let savedHits=0;
  tokens.forEach((t,i)=>{
    if(!preWorthy(t))return;
    const sentence=sentenceOf(text,tokens,i),key=wordCacheKey(t.s,sentence);
    if(seen.has(key)||prePending.has(key)||wordAiBusy.has(key)||wordCachePeek(key))return;
    if(lexGet(t)){if(!lexSavedSeen.has(key)){lexSavedSeen.add(key);savedHits++;}return;}
    const lk=lexKey(t);if(!lexRisky(t)&&seenLex.has(lk))return;seenLex.add(lk);
    if((preFailed.get(key)||0)>=2)return;
    seen.add(key);items.push({key,surface:t.s,base:t.b,reading:t.r,pos:t.p,sentence,tok:{s:t.s,b:t.b,p:t.p,p1:t.p1,needsAi:t.needsAi,uncertain:t.uncertain,readings:t.readings}});
  });
  if(savedHits){HanaAI.recordSaved('words',savedHits);savedHits=0;}
  if(!items.length){preStatus();return;}
  const chunks=[];for(let k=0;k<items.length;k+=PRE_CHUNK)chunks.push({docId:doc.id,index,items:items.slice(k,k+PRE_CHUNK)});
  if(urgent)preQueue.unshift(...chunks);else preQueue.push(...chunks);
  preStatus();pumpPreparse();
}
function pumpPreparse(){
  while(preRunning<PRE_PARALLEL&&preQueue.length){
    const chunk=preQueue.shift();
    if(chunk.docId!==current?.id)continue;
    chunk.items=chunk.items.filter(it=>!wordCachePeek(it.key)&&!prePending.has(it.key)&&!wordAiBusy.has(it.key)&&!lexGet(it.tok));
    if(!chunk.items.length)continue;
    runPreChunk(chunk);
  }
}
async function runPreChunk(chunk){
  preRunning++;
  let release;const done=new Promise(r=>release=r);
  chunk.items.forEach(it=>prePending.set(it.key,done));
  preStatus();
  try{
    const result=await HanaAI.explainWords(wordConfig(),chunk.items);
    chunk.items.forEach((it,i)=>{if(result[i])lexPut(it.tok,result[i]);});
    if(current?.id===chunk.docId){chunk.items.forEach((it,i)=>{const ai=result[i];if(ai)wordCachePut(it.key,ai);else preFailed.set(it.key,(preFailed.get(it.key)||0)+1);});scheduleRepaint(chunk.index);}
  }catch(e){
    chunk.items.forEach(it=>preFailed.set(it.key,(preFailed.get(it.key)||0)+1));
    // 密钥/余额问题：整页都别再试了
    if(/密钥|余额|401|402|403/.test(e.message||'')){preQueue=[];}
  }finally{
    chunk.items.forEach(it=>prePending.delete(it.key));release();preRunning--;
    if(wordSelection&&chunk.items.some(it=>it.key===wordSelection.aiKey))settleSelection(wordSelection);
    preStatus();pumpPreparse();
  }
}
/* 点到的词正在批量解析中：等那一批回来；批量没覆盖到就单独请求 */
function settleSelection(sel){
  const hit=wordCacheGet(sel.aiKey)||(sel.token?wordAiFor(sel.token,sel.sentence,true):null);
  if(hit){applyWordAi(sel,hit);syncSelection(sel);sel.aiLoading=false;refreshWordDialog(sel);return;}
  if(!prePending.has(sel.aiKey)&&!wordAiBusy.has(sel.aiKey)&&wantWordAi())requestWordAi(sel);
}
async function requestWordAi(sel){
  const key=sel.aiKey;if(!key)return;sel.aiError='';sel.aiLoading=true;refreshWordDialog(sel);
  try{let p=wordAiBusy.get(key);if(!p){p=HanaAI.explainWord(wordConfig(),{surface:sel.surface,base:sel.token?.b,reading:sel.surfaceReading,pos:sel.token?.p,sentence:sel.sentence});wordAiBusy.set(key,p);}
    const ai=await p;wordCachePut(key,ai);if(sel.token&&(!ai.span||ai.span===sel.token.s))lexPut(sel.token,ai);applyWordAi(sel,ai);syncSelection(sel);}
  catch(e){sel.aiError=e.message||String(e);}
  finally{wordAiBusy.delete(key);sel.aiLoading=false;refreshWordDialog(sel);}
}
/* 只在弹窗还开着、而且显示的还是这个词时才刷新，避免用户已经点了别的词 */
function refreshWordDialog(sel){const sheet=$('#dialog-body .word-sheet');if(wordSelection===sel&&$('#dialog').open&&sheet&&sheet.dataset.key===sel.aiKey)renderWordDialog();}
/* 弹窗显示的词跟着正文走：正文把切碎的词合并了，弹窗也显示合并后的整词与同一个读音 */
function syncSelection(sel){
  if(!sel||sel.index==null||sel.offset==null||!current)return;
  repaintParagraph(sel.index);
  const hit=tokenAt(sel.index,sel.offset);if(!hit)return;
  const t=hit.t;sel.token=t;sel.surfaceReading=t.r;
  if(t.s!==sel.surface){sel.surface=t.s;const ai=sel.ai;if(ai){sel.dictMeaning='';applyWordAi(sel,ai);}if(!(ai&&ai.span===t.s&&ai.word)&&t.b&&t.b!=='*')sel.word=t.b;}
}
/* 合并出来的词：先看组成它的原 token 有没有已经按整词解析过的结果 */
function partWordAi(index,offset,surface){
  const raw=rawTokens[index]||[],text=current.paragraphs[index]||'';let p=0;
  for(let k=0;k<raw.length;k++){const s0=p,e=p+raw[k].s.length;p=e;if(e<=offset||s0>=offset+surface.length)continue;
    const ai=wordCachePeek(wordCacheKey(raw[k].s,sentenceOf(text,raw,k)));if(ai&&ai.span===surface)return ai;}
  return null;
}
async function openToken(index,tokenIndex){const toks=shownTokens[index]||[],t=toks[tokenIndex];if(!t)return;const a=lessonData(index);
  let offset=0;for(let k=0;k<tokenIndex;k++)offset+=toks[k].s.length;
  const dict=a.vocabulary.find(v=>v.surface===t.s||v.word===t.b)||D.lexicon[t.b]||D.lexicon[t.s]||RikkaDictionary.lookup(t.b,t.r)||RikkaDictionary.lookup(t.s,t.r)||null;
  const base=t.b&&t.b!=='*'?t.b:t.s,sentence=tokenSentence(index,tokenIndex);
  const v=dict||{word:base,reading:t.s===base?t.r:'',meaning:'',level:'参考',form:formDescription(t)};
  const sel={...v,dictMeaning:dict?(dict.meaning||''):'',surface:t.s,surfaceReading:t.r,context:current.paragraphs[index],sentence,index,offset,token:t,aiKey:wordCacheKey(t.s,sentence)};
  wordSelection=sel;let cached=wordCacheGet(sel.aiKey)||wordAiFor(t,sentence,true);if(cached&&cached.lex)HanaAI.recordSaved('word');
  if(!cached&&t.merged){cached=partWordAi(index,offset,t.s);if(cached)wordCachePut(sel.aiKey,cached);}
  if(cached){applyWordAi(sel,cached);sel.surface=t.s;sel.surfaceReading=t.r;}
  $$('.token.selected').forEach(x=>x.classList.remove('selected'));$('[data-paragraph="'+index+'"][data-token="'+tokenIndex+'"]')?.classList.add('selected');
  if(!cached&&wantWordAi()){
    if(prePending.has(sel.aiKey)){sel.aiLoading=true;renderWordDialog();return;}// 这一批马上回来
    // 还在队列里排着：把这一段提到最前面，同时这个词自己单独先问
    preQueue.sort((x,y)=>(y.index===index)-(x.index===index));
  }
  renderWordDialog();if(!cached&&wantWordAi())requestWordAi(sel);}
function wordAiHtml(v){
  if(!v.aiKey)return '';
  const ai=v.ai;
  if(ai){const row=(label,text)=>text?'<p class="word-ai-row"><b>'+label+'</b>'+C.escape(text)+'</p>':'';
    const foot=v.aiLoading?'<span class="word-ai-more"><span class="spinner"></span>正在补充例句与讲解…</span>':(v.aiError?'<p class="error-note">'+C.escape(v.aiError)+'</p>':'')+'<button class="text-button small" id="dialog-word-retry">'+(ai.lex?'↻ 按这句重新解析':ai.brief?'✧ 例句与更多讲解':'重新解析')+'</button>';
    return '<div class="word-ai"><div class="word-ai-head"><span>'+(ai.lex?'词库缓存 · 未消耗 AI':'本句里的意思')+'</span>'+(ai.pos?'<small>'+C.escape(ai.pos)+(ai.level&&ai.level!=='参考'?' · '+C.escape(ai.level):'')+'</small>':'')+'</div><p class="word-ai-meaning">'+C.escape(ai.meaning)+'</p>'+row('构成',ai.parts)+row('变化',ai.form)+row('原词',ai.origin)+row('补充',ai.detail)+(ai.example?'<div class="grammar-example"><span lang="ja">'+C.escape(ai.example)+'</span>'+(ai.exampleTranslation?'<small>'+C.escape(ai.exampleTranslation)+'</small>':'')+'</div>':'')+foot+'</div>';}
  if(v.aiLoading)return '<div class="word-ai word-ai-loading"><span class="spinner"></span><span>正在结合这句话解析…</span></div>';
  if(v.aiError)return '<div class="word-ai"><p class="error-note">'+C.escape(v.aiError)+'</p><button class="secondary" id="dialog-word-retry">重新解析这个词</button></div>';
  if(!HanaAI.configured())return v.dictMeaning?'':'<div class="word-ai"><p class="word-ai-meaning">离线词库里没有这个词。</p><p class="hint">到「设置 → AI」填好 API Key，点任何词都会现场解析它在这句话里的意思。</p><button class="secondary" id="dialog-go-settings">去设置</button></div>';
  return '<div class="word-ai"><button class="secondary" id="dialog-word-retry">AI 解析这个词</button></div>';
}
function renderWordDialog(){const v=wordSelection;v.reading=consistentReading(v);const saved=words.some(w=>w.word===v.word&&w.reading===v.reading);const meaning=v.aiKey?v.dictMeaning:v.meaning;
  const pos=v.ai?.pos||(v.token?v.token.p:'');
  showDialog('这个词，记住了',
  '<div class="word-sheet" data-key="'+C.escape(v.aiKey||'')+'"><div class="dialog-word" lang="ja">'+C.ruby(v.surface||v.word,v.surfaceReading||v.reading)+'</div><p class="word-pos">词典原形：'+C.escape(v.word)+(v.reading?'（'+C.escape(v.reading)+'）':'')+(pos?' · '+C.escape(pos):'')+'</p>'+(meaning?'<p class="definition">'+(v.aiKey&&v.ai?'<span class="word-dict-tag">词典</span>':'')+C.escape(meaning)+'</p>':'')+wordAiHtml(v)+(!v.ai&&v.form?'<p class="hint">'+C.escape(v.form)+'</p>':'')+(!v.ai&&v.origin?'<p class="hint">原词：'+C.escape(v.origin)+'</p>':'')+'<div class="button-row"><button class="primary" id="dialog-add-word"'+(v.aiLoading&&!meaning?' disabled':'')+'>'+icon(saved?'check':'plus')+(saved?'已经收藏':'加入生词本')+'</button><button class="secondary" id="dialog-speak">'+icon('volume')+'听读音</button></div>'+(v.index!=null?'<div class="dialog-links"><button class="text-button" id="dialog-ai">对这一段进行 AI 深入解析</button>'+(RS.hasKanji(v.surface)?'<button class="text-button small" id="dialog-fix-reading">读音不对？我来改</button>':'')+'</div><div id="fix-reading-box"></div>':'')+'</div>');
  $('#dialog-add-word').onclick=safe(()=>{if(!v.meaning)throw new Error('还没有释义，等解析完成再收藏');const {token,ai,aiKey,aiLoading,aiError,dictMeaning,...w}=v;if(ai&&!w.form&&ai.parts)w.form=ai.parts;return addWord(w,v.context);});$('#dialog-speak').onclick=()=>speak(v.surfaceReading||v.reading||v.word);
  if($('#dialog-word-retry'))$('#dialog-word-retry').onclick=()=>{if(!HanaAI.configured()){toast('请先到设置里填写 AI API Key');return;}requestWordAi(v);};
  if($('#dialog-go-settings'))$('#dialog-go-settings').onclick=()=>{closeDialog();nav('settings');};
  if($('#dialog-ai'))$('#dialog-ai').onclick=safe(async()=>{closeDialog();await analyze(v.index,true);});
  if($('#dialog-fix-reading'))$('#dialog-fix-reading').onclick=()=>openFixReading(v);
}
/* 用户手动纠正读音：本书生效或所有书生效，之后正文、解析、弹窗都用这个读音，AI 也不会再改它 */
function openFixReading(v){
  const box=$('#fix-reading-box');if(!box)return;
  box.innerHTML='<div class="fix-reading"><label class="field-label" for="fix-surface-input">要改的文字（词被切碎时可以补全，如 美 → 美琴）</label><input id="fix-surface-input" class="text-input" lang="ja" autocomplete="off" value="'+C.escape(v.surface)+'"><label class="field-label" for="fix-reading-input">应该读作</label><input id="fix-reading-input" class="text-input" lang="ja" inputmode="text" autocomplete="off" value="'+C.escape(v.surfaceReading||'')+'"><p class="hint">输入这段文字完整的平假名读音（带送假名），例如 眠れた → ねむれた、美琴 → みこと。</p><div class="button-row wrap"><button class="primary" data-fix-scope="doc">只在这本书里改</button><button class="secondary" data-fix-scope="all">所有书都这样读</button>'+(hasUserReading(v.surface)?'<button class="text-button danger" data-fix-scope="reset">恢复自动注音</button>':'')+'</div></div>';
  const input=$('#fix-reading-input');input.focus();input.select();
  box.querySelectorAll('[data-fix-scope]').forEach(b=>b.onclick=safe(()=>saveFixReading(v,b.dataset.fixScope,input.value,$('#fix-surface-input').value)));
}
function hasUserReading(surface){return !!((settings.userReadings&&settings.userReadings[surface])||(current&&current.userReadings&&current.userReadings[surface]));}
async function saveFixReading(v,scope,raw,surf){
  const surface=String(surf||v.surface).trim();
  if(!surface||surface.length>20)throw new Error('要改的文字不能为空，也别超过 20 个字');
  if(scope!=='reset'&&current&&!current.paragraphs[v.index].includes(surface))throw new Error('这一段里找不到「'+surface+'」，请照原文填写');
  if(scope==='reset'){if(settings.userReadings)delete settings.userReadings[surface];if(current&&current.userReadings)delete current.userReadings[surface];}
  else{const r=RS.valid(surface,raw);if(!r)throw new Error('读音要和词面对应（全平假名、送假名一致），例如 眠れた → ねむれた');
    if(scope==='all'){settings.userReadings={...(settings.userReadings||{}),[surface]:r};if(current&&current.userReadings)delete current.userReadings[surface];}
    else{current.userReadings={...(current.userReadings||{}),[surface]:r};}}
  saveSettings();await saveDoc(current);tokenCache.clear();closeDialog();
  const at=v.index;await renderReader(at);$('#paragraph-'+at)?.scrollIntoView({block:'center'});
  toast(scope==='reset'?'已恢复自动注音':'已记住：'+surface+' → '+(scope==='all'?'所有书':'这本书'));
}
async function renderWords(){words=await DB.all('words');$('#word-total').textContent=words.length;$('#word-due').textContent=words.filter(w=>w.due<=Date.now()).length;const days=await DB.get('meta','days');$('#study-days').textContent=days?.days?.length||0;const q=$('#word-search').value.trim().toLowerCase();const list=words.filter(w=>(w.word+' '+w.reading+' '+w.meaning).toLowerCase().includes(q)).sort((a,b)=>b.created-a.created);$('#word-list').innerHTML=list.length?list.map(w=>'<button class="word-entry" data-word="'+C.escape(w.id)+'"><div><b lang="ja">'+C.ruby(w.word,w.reading)+'</b><p>'+C.escape(w.meaning)+'</p><small>'+C.escape(w.book||'阅读收藏')+' · '+(w.due<=Date.now()?'等待复习':formatDate(w.due)+' 再见')+'</small></div>'+icon('back').replace('<svg','<svg style="transform:rotate(180deg);width:15px;color:var(--muted)"')+'</button>').join(''):empty(q?'没有找到这个词':'把心动的词，留在这里','阅读时点一下单词，再点“加入生词本”。');}
function openSavedWord(id){const w=words.find(x=>x.id===id);if(!w)return;wordSelection={...w,surface:w.word,surfaceReading:w.reading};renderWordDialog();const b=document.createElement('button');b.className='text-button danger';b.textContent='从生词本移除';b.style.marginTop='16px';b.onclick=safe(async()=>{await DB.remove('words',w.id);words=words.filter(x=>x.id!==w.id);closeDialog();await renderWords();toast('已移除生词');});$('#dialog-body').appendChild(b);}
function startReview(){reviewQueue=words.filter(w=>w.due<=Date.now()).sort((a,b)=>a.due-b.due);reviewIndex=0;reviewRevealed=false;if(!reviewQueue.length){toast('今天的复习完成了，可以去读一段新内容');return;}$('#review-area').classList.remove('hidden');renderReview();$('#review-area').scrollIntoView({behavior:'smooth'});}
function renderReview(){if(reviewIndex>=reviewQueue.length){$('#review-area').innerHTML='<div class="review-card"><h2>今天的词，又熟悉了一点。</h2><p class="hint">本轮完成 '+reviewQueue.length+' 个词的复习。</p><button class="secondary" id="finish-review">回到生词手帐</button></div>';$('#finish-review').onclick=()=>$('#review-area').classList.add('hidden');safe(renderWords)();return;}const w=reviewQueue[reviewIndex];$('#review-area').innerHTML='<div class="review-card"><div class="label-row"><span class="eyebrow">回忆卡片 '+(reviewIndex+1)+' / '+reviewQueue.length+'</span><button class="text-button" id="exit-review">结束本轮</button></div><div class="front">'+C.escape(w.word)+'</div>'+(reviewRevealed?'<p class="answer">'+C.escape(w.reading)+'</p><p class="meaning">'+C.escape(w.meaning)+'</p><p class="hint">'+C.escape(w.context?.slice(0,180)||'')+'</p><div class="review-buttons"><button class="secondary" data-rating="again">再练一次 · 10 分钟</button><button class="secondary" data-rating="good">记住了</button><button class="primary" data-rating="easy">很熟悉</button></div>':'<p class="hint">先回忆读音和意思，再翻开答案。</p><button class="primary" id="reveal-answer">显示答案</button>')+'</div>';$('#exit-review').onclick=()=>$('#review-area').classList.add('hidden');if($('#reveal-answer'))$('#reveal-answer').onclick=()=>{reviewRevealed=true;renderReview();};$$('[data-rating]').forEach(b=>b.onclick=safe(async()=>{const next=C.nextReview(w,b.dataset.rating);await DB.put('words',next);words[words.findIndex(x=>x.id===w.id)]=next;reviewIndex++;reviewRevealed=false;renderReview();}));}
/* ===== 设置页记忆（v3.0.5）=====
 * 1) 哪几组设置是展开的、上次滚到哪里：离开再回来、重开应用都保持
 * 2) AI 服务、语音服务这两组要点“保存”才生效：没保存就离开时，填到一半的内容先记成草稿，回来还在（密钥不记）
 * 3) 开关类选项（自动解析、AI 注音、点词解析）改了立即生效，不用再点保存 */
const SET_UI_KEY='rikka_settings_ui',DRAFT_KEY='rikka_settings_draft';
function setUi(){try{return JSON.parse(localStorage.getItem(SET_UI_KEY)||'{}')||{};}catch(e){return {};}}
function saveSetUi(patch){try{localStorage.setItem(SET_UI_KEY,JSON.stringify({...setUi(),...patch}));}catch(e){}}
function restoreSettingsGroups(){const open=setUi().open;if(!Array.isArray(open))return;$$('#view-settings .settings-group').forEach(d=>{const want=open.includes(d.id);if(d.open!==want)d.open=want;});}
function restoreSettingsScroll(){const y=Number(setUi().scroll)||0;if(!y)return;requestAnimationFrame(()=>requestAnimationFrame(()=>{if(view==='settings')$('#main').scrollTop=y;}));}
/* 用量面板：今天 / 近 7 天，每种用途花了多少 token、缓存帮你省了多少次 */
function renderUsage(){
  const host=$('#ai-usage');if(!host)return;
  const NAMES={analysis:'整段解析',words:'单词预解析',word:'点词解析',furigana:'读音校对',create:'创作与其他'};
  const fmt=n=>n>=10000?(n/10000).toFixed(1)+' 万':String(Math.round(n));
  const table=(u)=>{const rows=Object.entries(NAMES).filter(([k])=>u[k]).map(([k,n])=>{const r=u[k];return '<tr><td>'+n+'</td><td>'+r.calls+'</td><td>'+fmt(r.input)+(r.cached?'<small>（缓存 '+fmt(r.cached)+'）</small>':'')+'</td><td>'+fmt(r.output)+'</td><td>'+(r.cacheHits||0)+'</td></tr>';}).join('');
    return rows?'<table class="usage-table"><thead><tr><th>用途</th><th>请求</th><th>输入</th><th>输出</th><th>省下</th></tr></thead><tbody>'+rows+'</tbody></table>':'<p class="hint">还没有记录。</p>';};
  host.innerHTML='<b>今天</b>'+table(HanaAI.usage(1))+'<b>近 7 天</b>'+table(HanaAI.usage(7))+'<p class="hint">“输入/输出”是服务商返回的真实 token 数；“省下”是命中本机缓存、没有发出的请求次数。本机单词缓存：<b>'+lex.size+'</b> 个词。</p>';
}
function registerSettingsMemory(){
  const host=$('#view-settings');if(!host)return;
  host.addEventListener('toggle',e=>{if(!e.target.classList||!e.target.classList.contains('settings-group'))return;saveSetUi({open:$$('#view-settings .settings-group').filter(d=>d.open).map(d=>d.id)});},true);
  $('#main').addEventListener('scroll',()=>{if(view==='reader')maybePreparseNext();},{passive:true});
  if($('#preparse-all'))$('#preparse-all').addEventListener('change',e=>{settings.preparseAll=e.target.checked;saveSettings();});
  if($('#word-model'))$('#word-model').addEventListener('change',e=>{settings.wordModel=e.target.value.trim().slice(0,80);saveSettings();toast(settings.wordModel?'单词解析将使用 '+settings.wordModel:'单词解析与主模型相同');});
  if($('#clear-word-cache'))$('#clear-word-cache').onclick=safe(async()=>{await lexClear();renderUsage();toast('单词缓存已清空');});
  let t=0;$('#main').addEventListener('scroll',()=>{if(view!=='settings')return;clearTimeout(t);t=setTimeout(()=>saveSetUi({scroll:Math.round($('#main').scrollTop)}),250);},{passive:true});
  for(const[id,key]of [['auto-ai','autoAI'],['ai-furigana','aiFurigana'],['word-ai','wordAI']]){const el=$('#'+id);if(el)el.addEventListener('change',e=>{settings[key]=e.target.checked;saveSettings();});}
  const fields={ai:['profile-name','ai-provider','ai-protocol','ai-base','ai-model'],voice:['voice-endpoint','voice-reference','voice-transcript','voice-model-tag']};
  for(const[group,ids]of Object.entries(fields))ids.forEach(id=>{const el=$('#'+id);if(!el)return;const cap=()=>RikkaDraft.capture(group);el.addEventListener('input',cap);el.addEventListener('change',()=>setTimeout(cap,0));});
  const model=$('#ai-model-pick');if(model)model.addEventListener('change',()=>setTimeout(()=>RikkaDraft.capture('ai'),0));
  restoreSettingsGroups();
}
window.RikkaDraft=(()=>{
  const FIELDS={ai:['profile-name','ai-provider','ai-protocol','ai-base','ai-model'],voice:['voice-endpoint','voice-reference','voice-transcript','voice-model-tag']};
  const NOTE={ai:'#ai-draft-note',voice:'#voice-draft-note'};
  let restoring=false;
  function all(){try{return JSON.parse(localStorage.getItem(DRAFT_KEY)||'{}')||{};}catch(e){return {};}}
  function put(d){try{localStorage.setItem(DRAFT_KEY,JSON.stringify(d));}catch(e){}}
  function owner(group){return group==='ai'?(RikkaProfiles.config().id||''):'voice';}
  function saved(group){if(group==='ai'){const p=RikkaProfiles.config();return {'profile-name':p.name,'ai-provider':p.provider,'ai-protocol':p.protocol,'ai-base':p.base,'ai-model':p.model};}return {'voice-endpoint':settings.voiceEndpoint||'','voice-reference':settings.voiceReference||'','voice-transcript':settings.voiceTranscript||'','voice-model-tag':settings.voiceModelTag||''};}
  function note(group,on){const el=$(NOTE[group]);if(el)el.classList.toggle('hidden',!on);}
  function capture(group){if(restoring)return;const base=saved(group),vals={};let dirty=false;for(const id of FIELDS[group]){const el=$('#'+id);if(!el)continue;vals[id]=el.value;if(String(el.value)!==String(base[id]??''))dirty=true;}
    const d=all();if(dirty)d[group]={owner:owner(group),vals,at:Date.now()};else delete d[group];put(d);note(group,dirty);}
  function restore(group){const d=all()[group];if(!d||d.owner!==owner(group)){note(group,false);return;}restoring=true;try{for(const[id,v]of Object.entries(d.vals||{})){const el=$('#'+id);if(el&&typeof v==='string')el.value=v;}}finally{restoring=false;}note(group,true);}
  function clear(group){const d=all();delete d[group];put(d);note(group,false);}
  return {capture,restore,clear};
})();
function renderSettings(){lexLoad().then(renderUsage);if($('#preparse-all'))$('#preparse-all').checked=!!settings.preparseAll;if($('#word-model'))$('#word-model').value=settings.wordModel||'';const vals={'font-size':settings.font,'segment-size':settings.segment,'ruby-mode':settings.ruby,'speech-rate':settings.rate,'theme-mode':settings.theme,'ai-base':settings.base,'ai-model':settings.model,'ai-provider':settings.provider};for(const[id,v]of Object.entries(vals))$('#'+id).value=v;$('#font-value').textContent=settings.font+' px';$('#dedupe-words').checked=settings.dedupe;$('#auto-ai').checked=settings.autoAI;$('#ai-furigana').checked=settings.aiFurigana;if($('#word-ai'))$('#word-ai').checked=settings.wordAI!==false;if($('#preparse-words'))$('#preparse-words').checked=settings.preparseWords!==false;if($('#theme-motion'))$('#theme-motion').checked=settings.themeMotion!==false;if($('#fx-overlay'))$('#fx-overlay').value=settings.fxOverlay||'auto';if($('#fx-density'))$('#fx-density').value=settings.fxDensity||'mid';$('#key-badge').textContent=HanaAI.configured()?'已保存密钥':'未配置';$('#ai-key').value='';renderBackgroundSettings();$('#show-words-nav').checked=settings.showWords;$('#remember-position').checked=settings.rememberPosition;$('#show-dictionary-nav').checked=settings.showDictionary;$('#show-exam-nav').checked=settings.showExam;RikkaStory.render();RikkaVoice.renderSettings();RikkaAppearance.render();safe(RikkaImages.render)();RikkaProfiles.render();RikkaGallery.render();}
function renderStudio(){RikkaStory.enter();$('#ai-studio-status').innerHTML=HanaAI.configured()?'<b>创作服务已就绪</b><p>使用 '+C.escape(settings.model)+'。每一章都会保存在书架，生成后即可阅读。</p>':'<b>先连接你的 AI 服务</b><p>在设置中填写 API Key，即可自由生成与续写。也可以先打开内置故事，体验离线注音。</p><button class="text-button" data-nav="settings">前往设置 →</button>';}
function updateContinuePreview(){
  const wrap=$('#continue-preview-wrap'),box=$('#continue-preview');if(!wrap||!box)return;
  const on=$('#story-continue').checked,doc=current;
  if(!on||!doc||doc.type!=='story'){wrap.classList.add('hidden');return;}
  const summary=String(doc.summary||''),tail=String(doc.text||'').slice(-160);
  box.innerHTML='<b>剧情摘要：</b>'+(summary?C.escape(summary.slice(0,220))+(summary.length>220?'…':''):'（暂无摘要，将从第一章重新概括）')+'<br><b>上一章末尾：</b>'+C.escape(tail||'（空）');
  wrap.classList.remove('hidden');
}
function goContinueStory(){
  const doc=current;closeDialog();nav('create');
  if(doc&&doc.type==='story'&&doc.spec){
    if(doc.spec.style)$('#story-style').value=doc.spec.style;
    if(doc.spec.level)$('#story-level').value=doc.spec.level;
    if(doc.spec.length)$('#story-length').value=String(doc.spec.length);
    if(doc.spec.theme)$('#story-theme').value=doc.spec.theme;
    if(doc.spec.characters)$('#story-characters').value=doc.spec.characters;
  }
  $('#story-continue').checked=true;
  RikkaStory.remember();RikkaStory.hint();updateContinuePreview();
  setTimeout(()=>{const el=$('#continuation-fields');if(el)el.scrollIntoView({behavior:'smooth',block:'start'});},120);
  toast('已带上本故事的设定，直接写续写方向即可');
}
async function generateStory(){
  if(!HanaAI.configured()){nav('settings');$('#settings-ai').open=true;toast('填写 AI 密钥后，就能生成自己的故事');return;}
  let continuing=$('#story-continue').checked,baseDoc=continuing?current:null;if(continuing&&(!baseDoc||baseDoc.type!=='story'))throw new Error('请先从书架打开一篇由故事工坊生成的小说，再选择续写');
  const spec={theme:$('#story-theme').value.trim(),level:$('#story-level').value,length:Number($('#story-length').value),characters:$('#story-characters').value.trim(),targets:settings.showStoryTargets?$('#story-targets').value.trim():'',style:$('#story-style').value,continuation:$('#story-continuation').value.trim(),sourceBg:$('#story-source-bg')?$('#story-source-bg').value.trim():'',segment:settings.segment};
  if(continuing&&baseDoc.spec){
    const themeChanged=spec.theme!==(baseDoc.spec.theme||'').trim();
    const charChanged=spec.characters!==(baseDoc.spec.characters||'').trim();
    if(themeChanged||charChanged){continuing=false;baseDoc=null;$('#story-continue').checked=false;RikkaStory.hint();updateContinuePreview();toast('主题或人物已修改，将生成新故事');}
  }
  if(!continuing&&!spec.theme)throw new Error('先写下你想读的故事主题');
  if(continuing&&baseDoc.spec){spec.characters=baseDoc.spec.characters;spec.theme=baseDoc.spec.theme;spec.style=baseDoc.spec.style||spec.style;}
  $('#generate-story').disabled=true;$('#cancel-generate').classList.remove('hidden');$('#generation-status').classList.remove('hidden');
  try{if(settings.autoPolishPrompt){const field=continuing?'continuation':'theme';if(spec[field]){$('#generation-status').textContent='正在润色提示词…';spec[field]=await HanaAI.polish(config(),spec[field],{continuation:continuing,style:spec.style,level:spec.level,promptLength:settings.promptLength},{onId:id=>generationId=id});$(continuing?'#story-continuation':'#story-theme').value=spec[field];RikkaStory.remember();}}
  const chapter=continuing?(baseDoc.chapters||1)+1:1;let outline=null;
  if(!continuing){$('#generation-status').textContent='正在规划故事大纲…';outline=await HanaAI.outline(config(),spec,{onId:id=>generationId=id});$('#generation-status').textContent='正在写第一章，完成后会自动注音…';}
  else{outline=baseDoc.outline||null;$('#generation-status').textContent='正在续写第'+chapter+'章…';}
  const generated=await HanaAI.novel(config(),spec,{summary:baseDoc?baseDoc.summary||'':'',tail:baseDoc?baseDoc.text.slice(-2600):'',outline,chapter},{onId:id=>generationId=id});let doc;
    if(generated.readings){if(baseDoc)baseDoc.nameReadings={...(baseDoc.nameReadings||{}),...generated.readings};}
    if(baseDoc){baseDoc.text+='\n\n'+generated.text;const at=baseDoc.paragraphs.length;baseDoc.paragraphs.push(...C.splitParagraphs(generated.text,settings.segment));baseDoc.summary=generated.summary;baseDoc.chapters=(baseDoc.chapters||1)+1;baseDoc.position=at;doc=baseDoc;await saveDoc(doc);}
    else doc=await makeDoc(generated.title,generated.text,'story',{summary:generated.summary,spec,chapters:1,outline,nameReadings:generated.readings||undefined});
    toast(continuing?'新一章已经写好':'故事已经写好，开始阅读吧');await openDoc(doc.id,doc.position);
  }catch(e){$('#generation-status').textContent=e.message;throw e;}
  finally{generationId=null;$('#generate-story').disabled=false;$('#cancel-generate').classList.add('hidden');}
}
async function handleFile(name,bytes){busy('正在提取文档文字…');try{const result=await HanaImport.parse(name,bytes,$('#encoding').value);if(result.backup){await restoreBackup(result.backup);return;}if(restoreExpected)throw new Error('请选择六花导出的 .json 学习备份');const doc=await makeDoc(result.title,result.text,'import',{format:result.kind});unbusy();toast('文档已加入书架');await openDoc(doc.id);}finally{restoreExpected=false;unbusy();}}
function pickFile(restore=false){restoreExpected=restore;if(window.Android)Android.pickFile();else{$('#file-input').accept=restore?'.json':'.txt,.md,.docx,.epub,.pdf,.html,.htm,.json';$('#file-input').click();}}
function exportFile(name,mime,text){if(window.Android)Android.saveFile(name,mime,text);else{const blob=new Blob([text],{type:mime}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}}
async function backup(){await savePosition();const data={app:'hanayomi',version:1,exportedAt:new Date().toISOString(),settings:{...settings,voiceEndpoint:'',voiceReference:'',voiceTranscript:''},documents:await DB.all('documents'),words:await DB.all('words'),meta:(await DB.all('meta')).filter(m=>!String(m.id).startsWith('wordai:'))};exportFile('六花日语-学习备份-'+new Date().toISOString().slice(0,10)+'.json','application/json',JSON.stringify(data,null,2));}
async function restoreBackup(data){
  if(analysisBusy.size||generationId)throw new Error('请等当前 AI 请求结束后再恢复备份');
  if(data?.app!=='hanayomi'||data.version!==1||!Array.isArray(data.documents)||!Array.isArray(data.words)||!Array.isArray(data.meta))throw new Error('这不是有效的六花学习备份');
  if(data.documents.length>1000||data.words.length>100000)throw new Error('备份内容过多，请拆分');
  const cleanDocs=data.documents.map(d=>{if(!d||typeof d.id!=='string'||typeof d.text!=='string'||typeof d.title!=='string'||!Array.isArray(d.paragraphs)||d.paragraphs.some(p=>typeof p!=='string')||d.text.length>1000000||d.paragraphs.length>30000)throw new Error('备份含有损坏的阅读条目');const a={};for(const [i,entry]of Object.entries(d.analyses||{})){if(Number.isInteger(Number(i))&&Number(i)>=0&&Number(i)<d.paragraphs.length)try{a[i]=C.validateAnalysis(entry,d.paragraphs[Number(i)]);}catch(e){}}return {...d,analyses:a,position:Math.max(0,Math.min(Number(d.position)||0,d.paragraphs.length-1))};});
  const cleanWords=data.words.map(w=>{if(!w||typeof w.id!=='string'||typeof w.word!=='string'||typeof w.reading!=='string'||typeof w.meaning!=='string')throw new Error('备份含有损坏的生词条目');return {...w,due:Number(w.due)||Date.now(),created:Number(w.created)||Date.now(),interval:Number(w.interval)||0,reviews:Number(w.reviews)||0};});
  const cleanMeta=[];for(const m of data.meta){if(m?.id==='background-gallery'){const g=RikkaGallery.sanitize(m);if(g)cleanMeta.push(g);}if(['study-progress','study-log','study-session'].includes(m?.id)){const clean=await RikkaStudy.sanitizeMeta(m);if(clean)cleanMeta.push(clean);}if(m?.id==='custom-icon'&&typeof m.data==='string'&&/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(m.data)&&m.data.length<2000000)cleanMeta.push({id:'custom-icon',data:m.data});if(m?.id==='background'&&typeof m.data==='string'&&/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(m.data)&&m.data.length<6000000)cleanMeta.push({id:'background',data:m.data});if(m?.id==='days'&&Array.isArray(m.days))cleanMeta.push({id:'days',days:m.days.filter(x=>typeof x==='string').slice(0,20000)});/* 已删除：不再从备份导入用户自定义读音（内置已验证读音不受影响） */}
  if(cleanMeta.some(m=>m.id==='background')&&!cleanMeta.some(m=>m.id==='background-gallery'))await DB.remove('meta','background-gallery');await DB.restore({documents:cleanDocs,words:cleanWords,meta:cleanMeta});RikkaShelf.forget(cleanDocs.map(d=>d.id));await RikkaStudy.reload();const bs=data.settings||{};for(const[k,options]of Object.entries({randomGenre:['all',...Object.keys(RikkaStory.genres)],promptLength:['short','medium','long'],randomCast:['female','mixed'],defaultStyle:Object.keys(RikkaStory.styles),defaultLevel:['N5','N4','N3','N2','N1'],defaultStoryLength:[300,500,900,1500]}))if(options.includes(bs[k]))settings[k]=bs[k];for(const k of ['theme','ruby','bgPosition']){const options={theme:RikkaAppearance.themes.map(t=>t.id),ruby:['all','tap','none'],bgPosition:['center','top','bottom']};if(options[k].includes(bs[k]))settings[k]=bs[k];}for(const [k,min,max]of [['font',18,32],['segment',60,2000],['rate',.5,1.5],['bgShade',20,95],['bgBlur',0,16],['dailyNew',5,50],['sessionSize',10,50],['pitch',.7,1.3],['volume',.1,1],['speechGap',0,2],['voiceTemperature',.5,1],['backgroundInterval',10,180]])if(Number.isFinite(bs[k]))settings[k]=Math.max(min,Math.min(max,bs[k]));for(const k of ['dedupe','analysis','showWords','rememberPosition','showDictionary','showExam','speechFollow','showStoryTargets','autoPolishPrompt','backgroundCycle','lessonCollapsed','preparseWords','themeMotion'])if(typeof bs[k]==='boolean')settings[k]=bs[k];if(bs.storyDraft&&typeof bs.storyDraft==='object'){settings.storyDraft={};for(const k of ['theme','characters','targets','continuation','sourceBg'])settings.storyDraft[k]=typeof bs.storyDraft[k]==='string'?bs.storyDraft[k].slice(0,6000):'';}saveSettings();docs=await DB.all('documents');words=await DB.all('words');overrides={...D.overrides};await RikkaGallery.init();tokenCache.clear();current=null;renderVersion++;nav('library');toast('已恢复 '+cleanDocs.length+' 篇阅读和 '+cleanWords.length+' 个生词');
}
async function exportReading(){if(!current)return;const doc=current;busy('正在导出带假名的阅读文档…');try{let body='';for(let i=0;i<doc.paragraphs.length;i++){const tokens=resolveTokens(i,await tokenize(doc.paragraphs[i]));body+='<section><p lang="ja" class="jp">'+tokens.map(t=>C.ruby(t.s,t.r)).join('')+'</p>';const a=doc.analyses[i]||offlineAnalysis(i,tokens,doc);if(a.translation)body+='<p>'+C.escape(a.translation)+'</p>';body+='<h3>重点词汇</h3><ol>'+a.vocabulary.map(v=>'<li>'+C.escape(v.word)+'（'+C.escape(vocabReadingFrom(tokens,doc.paragraphs[i],v))+'）：'+C.escape(v.meaning)+(v.form?'；'+C.escape(v.form):'')+'</li>').join('')+'</ol><h3>语法解析</h3>'+grammarRows(a.grammar)+'</section>';if(i%10===0){$('#busy-text').textContent='正在导出 '+(i+1)+' / '+doc.paragraphs.length+' 段';await new Promise(r=>setTimeout(r,0));}}exportFile(doc.title+'-带假名.html','text/html','<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+C.escape(doc.title)+'</title><style>body{max-width:780px;margin:35px auto;padding:0 20px;font:15px/1.9 sans-serif;color:#302b3c}section{border-bottom:1px solid #ddd;padding:15px 0}.jp{font:23px/2.7 serif;white-space:pre-wrap}rt{font:11px sans-serif;color:#7960ac}h3{font-size:15px;margin-top:20px}.grammar-card{margin:15px 0}small{display:block;color:#777}</style><h1>'+C.escape(doc.title)+'</h1>'+body+'</html>');}finally{unbusy();}}
function readerMenu(){showDialog('阅读选项','<div class="menu-list"><button id="menu-restart">从头阅读</button><button id="menu-rename">修改标题</button><button id="menu-export">导出带假名与解析的 HTML</button><button id="menu-resegment">按当前设置重新分段</button><button id="menu-continue">在故事工坊续写</button><button id="menu-delete" class="danger">删除这篇阅读</button></div>');$('#menu-restart').onclick=safe(async()=>{closeDialog();RikkaShelf.forget([current.id]);delete current.bookmark;current.position=0;page=0;$('#main').scrollTo(0,0);await renderReader(0);await savePosition();});$('#menu-rename').onclick=()=>{showDialog('修改标题','<input class="text-input" id="rename-title" maxlength="100" value="'+C.escape(current.title)+'"><button id="rename-save" class="primary full" style="margin-top:17px">保存标题</button>');$('#rename-save').onclick=safe(async()=>{const title=$('#rename-title').value.trim();if(!title)throw new Error('标题不能为空');current.title=title;await saveDoc(current);$('#reader-title').textContent=title;closeDialog();});};$('#menu-export').onclick=safe(async()=>{closeDialog();await exportReading();});$('#menu-resegment').onclick=()=>{showDialog('重新分段','<p class="hint">会按约 '+settings.segment+' 字重新分段，已保存的 AI 解析将清空，阅读位置回到开头。正文和生词会保留。</p><button id="do-resegment" class="primary full">重新分段</button>');$('#do-resegment').onclick=safe(async()=>{if(analysisBusy.size)throw new Error('请等当前 AI 解析完成后再重新分段');current.paragraphs=C.splitParagraphs(current.text,settings.segment);current.analyses={};current.position=0;delete current.bookmark;RikkaShelf.forget([current.id]);page=0;await saveDoc(current);closeDialog();await renderReader(0);});};$('#menu-continue').onclick=()=>goContinueStory();$('#menu-delete').onclick=()=>{const doc=current;showDialog('删除阅读','<p class="hint">“'+C.escape(doc.title)+'”的正文和段落解析将被删除，收藏的生词会保留。</p><button id="delete-doc" class="primary full">删除这篇阅读</button>');$('#delete-doc').onclick=safe(async()=>{if(analysisBusy.size)throw new Error('请等当前解析完成后再删除');await DB.remove('documents',doc.id);DB.remove('meta','wordai:'+doc.id).catch(()=>{});RikkaShelf.forget([doc.id]);docs=docs.filter(d=>d.id!==doc.id);current=null;nav('library');toast('阅读已删除');});};}
async function paste(){let text='';if(window.Android)text=Android.clipboard();else try{text=await navigator.clipboard.readText();}catch(e){toast('请长按文本框，选择粘贴');$('#input-text').focus();return;}if(!text){toast('剪贴板没有可粘贴的文字');return;}$('#input-text').value=text;$('#input-count').textContent=text.length.toLocaleString()+' 字';}
function registerEvents(){
  $('#continue-story-btn').onclick=()=>goContinueStory();
  if($('#preparse-words'))$('#preparse-words').onchange=e=>{settings.preparseWords=e.target.checked;saveSettings();};
  if($('#theme-motion'))$('#theme-motion').onchange=e=>{settings.themeMotion=e.target.checked;saveSettings();};if($('#fx-overlay'))$('#fx-overlay').onchange=e=>{settings.fxOverlay=e.target.value;saveSettings();};if($('#fx-density'))$('#fx-density').onchange=e=>{settings.fxDensity=e.target.value;saveSettings();};
  document.addEventListener('visibilitychange',()=>{if(document.hidden)flushDocWords();});
  document.addEventListener('click',safe(async e=>{
    const navButton=e.target.closest('[data-nav]');if(navButton){nav(navButton.dataset.nav);return;}
    const action=e.target.closest('[data-action]');if(action){if(action.dataset.action==='pick')pickFile();if(action.dataset.action==='paste')await paste();if(action.dataset.action==='theme'){RikkaAppearance.toggleDark();}return;}
    const book=e.target.closest('[data-book]');if(book){if(!RikkaShelf.handleClick(book.dataset.book))await openDoc(book.dataset.book);return;}
    const fb=e.target.closest('[data-filter]');if(fb){filter=fb.dataset.filter;$$('[data-filter]').forEach(b=>b.classList.toggle('active',b===fb));renderBooks();return;}
    const token=e.target.closest('[data-token]');if(token){await openToken(Number(token.dataset.paragraph),Number(token.dataset.token));return;}
    const sp=e.target.closest('[data-speak]');if(sp){await RikkaVoice.read(Number(sp.dataset.speak),false);return;}
    const fold=e.target.closest('[data-fold]');if(fold){toggleLessonFold(fold);return;}
    const ai=e.target.closest('[data-ai]');if(ai){await analyze(Number(ai.dataset.ai),true);return;}
    const dfold=e.target.closest('[data-detail-fold]');if(dfold){toggleDetailFold(dfold);return;}
    const tab=e.target.closest('[data-tab][data-lesson]');if(tab){const container=$('#lesson-'+tab.dataset.lesson);if(!container)return;const det=container.querySelector('.lesson-detail');if(det&&det.classList.contains('folded')){det.classList.add('local-open');setDetailState(det,false);}container.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===tab));container.querySelector('.vocab-panel').classList.toggle('hidden',tab.dataset.tab!=='vocab');container.querySelector('.grammar-panel').classList.toggle('hidden',tab.dataset.tab!=='grammar');if(tab.dataset.tab==='grammar')await annotateExamples(container);return;}
    const add=e.target.closest('[data-add-word]');if(add){const[i,j]=add.dataset.addWord.split(':').map(Number);const ent=lessonData(i).vocabulary[j];await addWord({...ent,reading:vocabReading(i,ent)},current.paragraphs[i]);return;}
    const v=e.target.closest('[data-vocab]');if(v){const[i,j]=v.dataset.vocab.split(':').map(Number),entry=lessonData(i).vocabulary[j],rd=vocabReading(i,entry);wordSelection={...entry,reading:rd,surface:entry.word,surfaceReading:rd,index:i,context:current.paragraphs[i]};renderWordDialog();return;}
    const word=e.target.closest('[data-word]');if(word){openSavedWord(word.dataset.word);return;}
    const prompt=e.target.closest('[data-prompt]');if(prompt){const prompts={'温馨校园':'两个性格天然可爱的女生在现代校园中度过平凡却温暖的一天。','日常恋爱':'两个女生在书店偶遇，从共同喜欢的一本小说开始，展开轻松细腻的恋爱故事。','轻幻想':'现代校园的社团活动室出现一扇通往星空花园的小门，两个女生一起探索。','旅行随笔':'两位女生搭乘乡间列车去海边小镇，记录沿途的景色与小小的发现。'};$('#story-theme').value=prompts[prompt.dataset.prompt];RikkaStory.remember();}
  }));
  document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('.token')){e.preventDefault();e.target.click();}});
  $('#close-dialog').onclick=closeDialog;$('#dialog').addEventListener('click',e=>{if(e.target===$('#dialog')){const r=$('#dialog').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog();}});
  $('#input-text').oninput=()=>$('#input-count').textContent=$('#input-text').value.length.toLocaleString()+' 字';
  $('#start-reading').onclick=safe(async()=>{const b=$('#start-reading');b.disabled=true;try{const doc=await makeDoc($('#input-title').value,$('#input-text').value);$('#input-text').value='';$('#input-title').value='';$('#input-count').textContent='0 字';await openDoc(doc.id);}finally{b.disabled=false;}});
  $('#file-input').onchange=safe(async e=>{const f=e.target.files[0];if(f)await handleFile(f.name,new Uint8Array(await f.arrayBuffer()));e.target.value='';});
  const drop=$('#drop-zone');for(const name of ['dragover','dragenter'])drop.addEventListener(name,e=>{e.preventDefault();drop.classList.add('dragover');});drop.addEventListener('dragleave',()=>drop.classList.remove('dragover'));drop.addEventListener('drop',safe(async e=>{e.preventDefault();drop.classList.remove('dragover');const f=e.dataTransfer.files[0];if(f)await handleFile(f.name,new Uint8Array(await f.arrayBuffer()));}));
  $('#book-search').oninput=renderBooks;$('#word-search').oninput=safe(renderWords);
  $('#toggle-ruby').onclick=()=>{settings.ruby=settings.ruby==='none'?'all':'none';saveSettings();};$('#toggle-analysis').onclick=()=>{settings.analysis=!settings.analysis;saveSettings();};$('#stop-speech').onclick=stopSpeech;$('#reader-more').onclick=readerMenu;
  $('#reader-font').onclick=()=>{showDialog('阅读字号','<p class="hint">调整后立即生效</p><input id="reader-range" type="range" min="18" max="32" value="'+settings.font+'" style="width:100%;accent-color:var(--primary)"><p id="reader-font-value" class="hint">'+settings.font+' px</p>');$('#reader-range').oninput=e=>{settings.font=Number(e.target.value);saveSettings();$('#reader-font-value').textContent=settings.font+' px';};};
  $('#reader-find').onclick=()=>{showDialog('在这篇阅读中查找','<input id="find-query" class="text-input" placeholder="输入日语关键词"><div id="find-results"></div>');$('#find-query').oninput=()=>{const q=$('#find-query').value.trim();const hits=q?current.paragraphs.map((p,i)=>({p,i})).filter(x=>x.p.includes(q)).slice(0,50):[];$('#find-results').innerHTML=hits.map(x=>'<button class="menu-list-hit secondary full" data-hit="'+x.i+'" style="margin-top:10px;text-align:left">第 '+(x.i+1)+' 段 · '+C.escape(x.p.slice(Math.max(0,x.p.indexOf(q)-10),x.p.indexOf(q)+q.length+30))+'</button>').join('');$$('[data-hit]').forEach(b=>b.onclick=safe(async()=>{const i=Number(b.dataset.hit);closeDialog();page=Math.floor(i/PAGE_SIZE);await renderReader(i);}));};$('#find-query').focus();};
  $('#generate-story').onclick=safe(generateStory);$('#cancel-generate').onclick=()=>{if(generationId)HanaAI.cancel(generationId);};$('#use-words').onclick=()=>{$('#story-targets').value=words.filter(w=>w.due<=Date.now()).slice(0,5).map(w=>w.word).join('、')||words.slice(0,5).map(w=>w.word).join('、');RikkaStory.remember();if(!words.length)toast('先在阅读页收藏几个生词');};
  $('#start-review').onclick=startReview;
  $('#font-size').oninput=e=>{settings.font=Number(e.target.value);$('#font-value').textContent=settings.font+' px';saveSettings();};for(const[id,key]of [['segment-size','segment'],['ruby-mode','ruby'],['theme-mode','theme']])$('#'+id).onchange=e=>{settings[key]=key==='segment'?Math.max(60,Math.min(2000,Number(e.target.value)||180)):e.target.value;e.target.value=settings[key];saveSettings();};$('#dedupe-words').onchange=e=>{settings.dedupe=e.target.checked;saveSettings();};
  $('#backup').onclick=safe(backup);$('#restore').onclick=()=>pickFile(true);$('#export-words').onclick=()=>{const csvCell=s=>'"'+String(s??'').replace(/"/g,'""')+'"';const rows=[['词语','假名','中文释义','原文语境','来源','复习次数'],...words.map(w=>[w.word,w.reading,w.meaning,w.context,w.book,w.reviews])];exportFile('六花-生词本.csv','text/csv','\ufeff'+rows.map(r=>r.map(v=>csvCell(/^[=+@\-]/.test(String(v))?"'"+v:v)).join(',')).join('\r\n'));};
  $('#licenses').onclick=()=>showDialog('开源组件与许可','<p class="hint">Kuromoji.js 0.1.2：Apache-2.0；其 IPADIC 词典包含独立的自由使用许可与来源声明。</p><p class="hint">fflate 0.8.2：MIT。PDF.js 4.10.38：Apache-2.0。完整许可随源码包附在 app/src/main/assets/licenses。</p><p class="hint">复合词读音：EDRDG JMdict（CC BY-SA 4.0）。来源、修改说明及许可随源码提供。</p><p class="hint">分级词库：OpenJLPT / Tanos（CC BY-SA 4.0，详见来源声明），Japanese-Chinese-thesaurus（Unlicense）。本版整理、过滤并补充中文释义；125 节中文语法为本应用编写。等级仅为学习参考。</p><p class="hint">阅读内容默认保存在本机。应用不包含广告、统计追踪或内置共享密钥。</p>');
  registerBackgroundEvents();
  $('#hide-busy').onclick=unbusy;
  window.addEventListener('pagehide',()=>safe(savePosition)());
}
window.handleBack=()=>{if($('#dialog').open){closeDialog();return true;}if(view==='exam'&&window.RikkaExam?.back&&RikkaExam.back())return true;if(view!=='library'){nav('library');return true;}return false;};
window.nativeEvent=safe(async e=>{
 if(e.type==='voice'){RikkaVoice.native(e.data);return;}
 if(e.type==='folderPicked'||e.type==='folderList'||e.type==='ocrResult'){RikkaReal.onNative(e.type,e.data);return;}
 if(e.type==='voiceHost'){RikkaVoice.hostResult(typeof e.data==='string'?JSON.parse(e.data):e.data);return;}
 if(e.type==='network'){HanaAI.settle(e.data);return;}
 if(e.type==='insets'){RikkaAppearance.insets(e.data);return;}
 if(e.type==='imageBusy'){busy(e.data==='icon'?'正在适配图标图片…':'正在适配背景图片…');return;}
 if(e.type==='backgroundReady'){await RikkaImages.saveBackground(e.data.dataUrl);return;}
 if(e.type==='iconReady'){await RikkaImages.selectIcon(e.data.dataUrl);return;}
 if(e.type==='iconChanged'){await RikkaImages.render();toast('已切换应用图标，桌面可能需要稍等刷新');return;}
 if(e.type==='background'){const bytes=Uint8Array.from(atob(e.data.base64),c=>c.charCodeAt(0));await setBackground(new Blob([bytes]));return;}
 if(e.type==='file'){const bytes=Uint8Array.from(atob(e.data.base64),c=>c.charCodeAt(0));await handleFile(e.data.name,bytes);}
 else if(e.type==='sharedText'){nav('import');$('#input-text').value=e.data;$('#input-count').textContent=e.data.length.toLocaleString()+' 字';toast('已接收分享的文字，点“注音并开始阅读”即可');}
 else if(e.type==='error'||e.type==='toast'){unbusy();toast(e.data);}
});
function renderNavigation(){const navHtml=navItems.filter(([id])=>(id!=='words'||settings.showWords)&&(id!=='learn'||settings.showDictionary)&&(id!=='exam'||settings.showExam)).map(([id,i,name])=>'<button class="nav-button '+(id===view||id==='library'&&view==='reader'?'active':'')+'" data-nav="'+id+'">'+icon(i)+'<span>'+name+'</span></button>').join('');const bn=$('#bottom-nav');if(bn.dataset.sig!==navHtml){bn.dataset.sig=navHtml;$('#desktop-nav').innerHTML=navHtml;bn.querySelectorAll('.nav-button').forEach(x=>x.remove());bn.insertAdjacentHTML('beforeend',navHtml);}if(window.RikkaGlassNav)RikkaGlassNav.push();}
async function init(){
  startAutoHeartbeat();RikkaProfiles.init();renderNavigation();$('#today').textContent=new Date().toLocaleDateString('zh-CN',{month:'long',day:'numeric'});applySettings();registerEvents();RikkaShelf.register();RikkaImages.register();RikkaAppearance.register();RikkaStory.register();RikkaOnlineBooks.register();RikkaVoice.register();RikkaProfiles.register();RikkaGallery.register();registerSettingsMemory();
  docs=await DB.all('documents');words=await DB.all('words');overrides={...D.overrides};await RikkaGallery.init();
  const initialized=await DB.get('meta','initialized');if(!initialized){await DB.put('meta',{id:'initialized',value:true});}
  renderBooks();safe(RikkaDictionary.init)();if(window.Android)Android.ready();
}
function applyBackground(){RikkaGallery.paint();}
function renderBackgroundSettings(){$('#background-preview').style.backgroundImage=backgroundImage?'url("'+backgroundImage+'")':'none';$('#background-preview').classList.toggle('has-image',!!backgroundImage);$('#background-shade').value=settings.bgShade;$('#background-shade-value').textContent=settings.bgShade+'%';$('#background-blur').value=settings.bgBlur;$('#background-blur-value').textContent=settings.bgBlur+' px';$('#background-position').value=settings.bgPosition;}
async function setBackground(blob){busy('正在适配你的背景图片…');try{await RikkaImages.saveBackground(await RikkaImages.process(blob));}finally{unbusy();}}
function registerBackgroundEvents(){$('#choose-background').onclick=()=>{if(window.Android)Android.pickImage();else $('#background-input').click();};$('#background-input').onchange=safe(async e=>{try{const file=e.target.files[0];if(file)await setBackground(file);}finally{e.target.value='';}});$('#remove-background').onclick=safe(async()=>{await DB.remove('meta','background');backgroundImage='';applyBackground();renderBackgroundSettings();toast('已恢复默认背景');});$('#background-shade').oninput=e=>{settings.bgShade=Number(e.target.value);saveSettings();$('#background-shade-value').textContent=settings.bgShade+'%';};$('#background-blur').oninput=e=>{settings.bgBlur=Number(e.target.value);saveSettings();$('#background-blur-value').textContent=settings.bgBlur+' px';};$('#background-position').onchange=e=>{settings.bgPosition=e.target.value;saveSettings();};}
safe(init)();
