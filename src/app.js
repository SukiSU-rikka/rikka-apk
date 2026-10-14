'use strict';
const $=s=>document.querySelector(s),$$=s=>Array.from(document.querySelectorAll(s)),C=HanaCore,D=HANA_DATA,DB=HanaStore;
const icon=n=>'<svg aria-hidden="true"><use href="#i-'+n+'"/></svg>';
const defaults={font:22,segment:180,ruby:'all',theme:'light',rate:.85,dedupe:true,analysis:true,autoAI:false,aiFurigana:true,base:'https://api.deepseek.com',model:'deepseek-flash',provider:'deepseek',bgShade:72,bgBlur:0,bgPosition:'center',showWords:false,rememberPosition:true,dailyNew:10,sessionSize:20,launcherIcon:'portrait',showDictionary:false,randomGenre:'all',promptLength:'medium',randomCast:'female',defaultStyle:'novel',defaultLevel:'N3',defaultStoryLength:500,voiceEngine:'system',voiceEndpoint:'',voiceReference:'',voiceTranscript:'',voiceModelTag:'rikka-v1',pitch:1,volume:1,speechGap:.5,speechFollow:true,voiceTemperature:.8,showStoryTargets:false,autoPolishPrompt:false,backgroundCycle:false,backgroundInterval:30,storyDraft:null};
let settings={...defaults};try{settings={...defaults,...JSON.parse(localStorage.getItem('hana_settings')||'{}')};}catch(e){}
let backgroundImage='';
let docs=[],words=[],overrides={...D.overrides},current=null,page=0,view='library',filter='all',renderVersion=0,wordSelection=null,generationId=null,restoreExpected=false;
let tokenSerial=0,tokenCache=new Map(),workerPending=new Map(),analysisBusy=new Set(),analysisErrors=new Map(),reviewQueue=[],reviewIndex=0,reviewRevealed=false;
const PAGE_SIZE=4;const navItems=[['library','book','书架'],['import','plus','导入'],['create','star','故事'],['learn','search','词典'],['words','cards','生词'],['settings','settings','设置']];
const worker=new Worker('tokenizer-worker.js');let resolveReady,rejectReady;
const ready=new Promise((r,j)=>{resolveReady=r;rejectReady=j;});ready.catch(()=>{});
const readyTimer=setTimeout(()=>{rejectReady(new Error('离线词典加载超时，请关闭应用后重试'));$('#engine-status').textContent='词典加载超时';},120000);
worker.onmessage=e=>{const m=e.data;if(m.type==='ready'){clearTimeout(readyTimer);resolveReady();$('#engine-status').textContent='离线词典已就绪';return;}if(m.type==='failed'){clearTimeout(readyTimer);rejectReady(new Error('离线词典加载失败'));toast('离线词典加载失败，请重新打开应用');return;}const p=workerPending.get(m.id);if(p){workerPending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(new Error(m.error)):p.resolve(m.tokens);}};
worker.onerror=()=>{clearTimeout(readyTimer);rejectReady(new Error('注音引擎无法启动，请更新手机的 Android System WebView'));for(const p of workerPending.values()){clearTimeout(p.timer);p.reject(new Error('注音引擎发生错误'));}workerPending.clear();};
async function tokenize(text){await ready;const nameR=(current&&current.nameReadings)||{};const aiR=(current&&current.aiReadings)||{};const eff={...aiR,...nameR,...overrides};const key=text+'\0'+JSON.stringify(eff);if(tokenCache.has(key))return tokenCache.get(key);const tokens=await new Promise((resolve,reject)=>{const id=++tokenSerial;const timer=setTimeout(()=>{workerPending.delete(id);reject(new Error('这段文字处理时间过长，请缩短后重试'));},45000);workerPending.set(id,{resolve,reject,timer});worker.postMessage({id,text,overrides:eff});});if(tokenCache.size>220)tokenCache.delete(tokenCache.keys().next().value);tokenCache.set(key,tokens);return tokens;}
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('show'),4200);}
function busy(message){$('#busy-text').textContent=message;$('#busy').classList.remove('hidden');}
function unbusy(){$('#busy').classList.add('hidden');}
function safe(fn){return async(...args)=>{try{return await fn(...args);}catch(e){unbusy();toast(e.message||String(e));console.error(e.message||e);}};}
function uid(){return typeof crypto.randomUUID==='function'?crypto.randomUUID():'hana_'+Date.now()+'_'+Math.random().toString(36).slice(2);}
function saveSettings(){localStorage.setItem('hana_settings',JSON.stringify(settings));applySettings();}
function applySettings(){RikkaAppearance.applyTheme();document.documentElement.style.setProperty('--reader-size',settings.font+'px');document.body.classList.toggle('ruby-none',settings.ruby==='none');document.body.classList.toggle('ruby-tap',settings.ruby==='tap');document.body.classList.toggle('analysis-off',!settings.analysis);$('#toggle-ruby').classList.toggle('active',settings.ruby!=='none');$('#toggle-analysis').classList.toggle('active',settings.analysis);$('#segment-preview').textContent=settings.segment;renderNavigation();applyBackground();}
function config(){return RikkaProfiles.config();}
function formatDate(date){return new Date(date).toLocaleDateString('zh-CN',{month:'numeric',day:'numeric'});}
function dayKey(){return new Date().toLocaleDateString('en-CA');}
async function trackDay(){const m=await DB.get('meta','days')||{id:'days',days:[]};if(!m.days.includes(dayKey())){m.days.push(dayKey());await DB.put('meta',m);}}
function showDialog(title,html){$('#dialog-title').textContent=title;$('#dialog-body').innerHTML=html;if(!$('#dialog').open)$('#dialog').showModal();}
function closeDialog(){$('#dialog').close();}
function nav(target){
  if(view==='reader'&&target!=='reader'){savePosition();RikkaVoice.stop();}
  renderVersion++;view=target;$$('.view').forEach(x=>x.classList.toggle('hidden',x.id!=='view-'+target));$$('.nav-button').forEach(b=>b.classList.toggle('active',b.dataset.nav===target||(target==='reader'&&b.dataset.nav==='library')));closeDialog();$('#main').scrollTo(0,0);
  $('#page-eyebrow').textContent={library:'阅读',import:'导入',reader:'阅读',create:'故事',learn:'词典',words:'生词',settings:'设置'}[target];
  if(target==='learn')safe(RikkaDictionary.render)();if(target==='library')renderBooks();if(target==='settings')renderSettings();if(target==='words')safe(renderWords)();if(target==='create')renderStudio();
}
function empty(title,detail=''){return '<div class="empty-state">'+icon('book')+C.escape(title)+'<p>'+C.escape(detail)+'</p></div>';}
function renderBooks(){
  const query=$('#book-search').value.trim().toLowerCase();$('#book-count').textContent=docs.length;const recent=docs.filter(d=>d.lastRead).sort((a,b)=>b.lastRead-a.lastRead)[0];$('#resume-book').classList.toggle('hidden',!recent);if(recent){$('#resume-title').textContent=recent.title;$('#resume-progress').textContent='第 '+(Number(recent.position||0)+1)+' 段';$('#resume-book').onclick=safe(()=>openDoc(recent.id));}
  const list=docs.filter(d=>(filter==='all'||filter==='reading'&&d.lastRead||d.type===filter)&&(!query||(d.title+' '+d.text).toLowerCase().includes(query))).sort((a,b)=>(b.lastRead||b.created)-(a.lastRead||a.created));
  $('#books').innerHTML=list.length?list.map(d=>{
    const progress=d.lastRead?Math.min(100,Math.round((Number(d.position||0)+1)/d.paragraphs.length*100)):0;
    return '<button class="book-card" data-book="'+C.escape(d.id)+'"><div class="book-top"><span class="book-icon">'+icon(d.type==='story'?'star':'book')+'</span><span class="chip">'+C.escape(d.type==='story'?'原创故事':d.format||'粘贴')+'</span></div><h3>'+C.escape(d.title)+'</h3><p class="book-preview">'+C.escape(d.subtitle||d.text.slice(0,90))+'</p><div class="book-bottom"><span>'+d.text.length.toLocaleString()+' 字 · '+d.paragraphs.length+' 段</span><span>'+ (d.lastRead?'已读 '+progress+'%':formatDate(d.created)+' 添加')+'</span></div><div class="book-progress"><span style="width:'+progress+'%"></span></div></button>';
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
function renderTokens(tokens,paragraph){return tokens.map((t,i)=>'<span class="token'+(C.kanji.test(t.s)&&!t.r?' unknown':'')+(t.uncertain?' uncertain':'')+'" data-token="'+i+'" data-paragraph="'+paragraph+'" tabindex="0" role="button" aria-label="'+C.escape(t.s+' '+t.r)+'">'+C.ruby(t.s,t.r)+'</span>').join('');}
let shownTokens={};
function hiraStr(x){return String(x||'').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-96));}
/* 解析校准注音：AI 解析返回后，词面与解析词汇完全一致（且为原形）时，用解析的读音覆盖引擎注音 */
function calibrateWithAnalysis(index){
  const a=current&&current.analyses&&current.analyses[index];
  if(!a||a.source!=='ai'||!Array.isArray(a.vocabulary))return false;
  const tokens=shownTokens[index];
  if(!tokens||!tokens.length)return false;
  let changed=false;
  const stripHono=s=>{const m=String(s).match(/^(.*?)(?:さん|ちゃん|くん|様|氏|殿)$/);return m?m[1]:null;};
  const stripHonoR=s=>String(s).replace(/(?:さん|ちゃん|くん|さま|し|どの)$/,'');
  for(const t of tokens){
    if(!t.s||!t.r)continue;
    if(overrides[t.s])continue;
    let hit=null;
    for(const v of a.vocabulary){if(v&&v.surface===t.s){hit=v;break;}}
    if(hit&&hit.reading&&hit.surface===hit.word){
      const r=hiraStr(hit.reading.trim());
      if(r&&r!==t.r){t.r=r;changed=true;}
      continue;
    }
    const isNameLike=/固有名詞/.test(t.p1||'')||(/[一-鿿々]/.test(t.s)&&t.s.length>=2&&t.s.length<=6);
    if(isNameLike&&!hit){
      for(const v of a.vocabulary){
        if(!v||!v.surface||!v.reading)continue;
        const base=stripHono(v.surface);
        if(base&&base===t.s){
          const r=hiraStr(stripHonoR(String(v.reading).trim()));
          if(r&&/^[ぁ-ん]+$/.test(r)&&r!==t.r){t.r=r;changed=true;}
          break;
        }
      }
    }
  }
  return changed;
}
async function renderReader(scrollTo,bookmark){
  RikkaShelf.begin();
  if(!current)return;const doc=current,version=++renderVersion;shownTokens={};$('#reader-title').textContent=doc.title;$('#story-continue-bar').classList.toggle('hidden',doc.type!=='story');$('#reader-mode').textContent=HanaAI.configured()?(settings.autoAI?'AI 自动解析已开启':'离线注音 · 可点 AI 深入解析'):'离线词典 · 常用语法匹配';
  const start=page*PAGE_SIZE,end=Math.min(start+PAGE_SIZE,doc.paragraphs.length);$('#reader-position').textContent='第 '+(start+1)+'–'+end+' 段 / 共 '+doc.paragraphs.length+' 段';
  $('#reader-content').innerHTML=Array.from({length:end-start},(_,j)=>{const i=start+j;return '<article class="paragraph-card" id="paragraph-'+i+'" data-index="'+i+'"><div class="paragraph-head"><span>段落 '+String(i+1).padStart(2,'0')+'</span><button data-speak="'+i+'" aria-label="朗读这一段">'+icon('volume')+'</button></div><div class="japanese" lang="ja"><span class="hint">正在为这一段标注假名…</span></div><div class="lesson" id="lesson-'+i+'"></div></article>';}).join('');
  const total=Math.ceil(doc.paragraphs.length/PAGE_SIZE);$('#reader-pagination').innerHTML='<button class="secondary" id="prev-page" '+(page===0?'disabled':'')+'>上一页</button><span>'+(page+1)+' / '+total+'</span><button class="secondary" id="next-page" '+(page>=total-1?'disabled':'')+'>下一页</button><input id="jump-page" class="jump-input" type="number" min="1" max="'+total+'" placeholder="页" aria-label="跳至页码">';
  $('#prev-page').onclick=safe(()=>movePage(page-1));$('#next-page').onclick=safe(()=>movePage(page+1));$('#jump-page').onchange=safe(e=>{const p=Number(e.target.value);if(!Number.isInteger(p)||p<1||p>total)throw new Error('请输入 1–'+total+' 的页码');return movePage(p-1);});
  for(let i=start;i<end;i++){
    try{const tokens=await tokenize(doc.paragraphs[i]);if(version!==renderVersion||current.id!==doc.id)return;shownTokens[i]=tokens;calibrateWithAnalysis(i);$('#paragraph-'+i+' .japanese').innerHTML=renderTokens(tokens,i);renderLesson(i,tokens);queueAiDisambiguation(i,tokens);}
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
async function prefetchNextPage(doc,version,from){
 if(!settings.aiFurigana||!HanaAI.configured())return;
 const to=Math.min(from+PAGE_SIZE,doc.paragraphs.length);
 for(let i=from;i<to;i++){
  try{
   if(version!==renderVersion||current?.id!==doc.id)return;
   const tokens=await tokenize(doc.paragraphs[i]);
   if(version!==renderVersion||current?.id!==doc.id)return;
   queueAiDisambiguation(i,tokens);
  }catch(e){/* 后台预解析失败不打扰用户 */}
 }
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
    const v=vocab[j],saved=words.some(w=>w.word===v.word&&w.reading===v.reading),repeat=repeatedCount(v.word,index);n++;
    const html='<div class="vocab-row"><span class="num">'+String(n).padStart(2,'0')+'</span><div class="vocab-info"><button class="vocab-title" data-vocab="'+index+':'+j+'">'+C.escape(v.word)+'<span class="vocab-reading">'+C.escape(v.reading)+'</span></button><span class="level">'+C.escape(v.level||'参考')+'</span>'+(repeat?'<span class="level">再次遇见</span>':'')+'<p class="vocab-meaning">'+C.escape(v.meaning)+'</p>'+(v.form?'<p class="vocab-meaning">'+C.escape(v.form)+'</p>':'')+(v.origin?'<p class="vocab-meaning">原词：'+C.escape(v.origin)+'</p>':'')+'</div><button class="icon-button" data-add-word="'+index+':'+j+'" aria-label="'+(saved?'已收藏':'收藏 '+C.escape(v.word))+'">'+icon(saved?'check':'plus')+'</button></div>';
    if(repeat>=2)folded+=html;else visible+=html;
  }
  return (visible||(!folded?'<p class="hint">此段没有命中内置重点词库。点击正文单词可查看读音与原形，AI 可补充中文释义。</p>':''))+(folded?'<details><summary class="hint">已多次遇见的词（展开复习）</summary>'+folded+'</details>':'');
}
function grammarRows(grammar){return grammar.length?grammar.map((g,i)=>'<div class="grammar-card"><h4>'+(i+1)+'. '+C.escape(g.name)+' <span class="level">'+C.escape(g.level||'参考')+'</span></h4><p><b>意思：</b>'+C.escape(g.meaning)+'</p><p><b>接续：</b>'+C.escape(g.construction)+'</p><p><b>用法：</b>'+C.escape(g.usage)+'</p><div class="grammar-example"><span class="annotate-example" lang="ja">'+C.escape(g.example)+'</span><small>'+C.escape(g.translation)+'</small></div></div>').join(''):'<p class="hint">没有命中内置语法规则。可以点“AI 深入解析”结合原文讲解。</p>';}
function renderLesson(index,tokens){
  const el=$('#lesson-'+index);if(!el||!current)return;const a=current.analyses?.[index]||offlineAnalysis(index,tokens);const isBusy=analysisBusy.has(current.id+':'+index),err=analysisErrors.get(current.id+':'+index);
  el.innerHTML='<div class="lesson-title"><div><b>这一段，读懂了吗</b><br><span>'+(a.source==='ai'?'AI 解析 · 已保存':'离线词库与规则 · 等级仅供参考')+'</span></div><button class="ai-button" data-ai="'+index+'" '+(isBusy?'disabled':'')+'>'+(isBusy?'解析中…':a.source==='ai'?'重新解析':'✧ AI 深入解析')+'</button></div>'+(err?'<p class="error-note">'+C.escape(err)+'</p>':'')+'<p class="translation'+(a.translation?'':' empty')+'">'+C.escape(a.translation||'中文全文翻译可通过 AI 解析生成。')+'</p><div class="lesson-tabs"><button class="active" data-tab="vocab" data-lesson="'+index+'">重点词汇 '+a.vocabulary.length+'</button><button data-tab="grammar" data-lesson="'+index+'">语法解析 '+a.grammar.length+'</button></div><div class="vocab-panel">'+vocabRows(a.vocabulary,index)+'</div><div class="grammar-panel hidden">'+grammarRows(a.grammar)+'</div>';
}
async function annotateExamples(container){for(const el of container.querySelectorAll('.annotate-example')){if(el.dataset.done)continue;const text=el.textContent;const tokens=await tokenize(text);if(!el.isConnected)return;el.innerHTML=tokens.map(t=>C.ruby(t.s,t.r)).join('');el.dataset.done='1';}}
async function analyze(index,force=false){
  const doc=current,key=doc.id+':'+index;if(analysisBusy.has(key))return;if(doc.analyses[index]&&!force)return;
  if(!HanaAI.configured()){toast('先在设置里填写 AI 密钥，即可获得完整中文讲解');nav('settings');$('#settings-ai').open=true;$('#ai-key').focus();return;}
  analysisBusy.add(key);analysisErrors.delete(key);if(current===doc)renderLesson(index,shownTokens[index]||[]);
  try{const result=await HanaAI.analyze(config(),doc.paragraphs[index]);result.model=settings.model;doc.analyses[index]=result;await saveDoc(doc);if(current===doc&&view==='reader'){if(shownTokens[index]&&calibrateWithAnalysis(index))$('#paragraph-'+index+' .japanese').innerHTML=renderTokens(shownTokens[index],index);renderLesson(index,shownTokens[index]||[]);}}
  catch(e){analysisErrors.set(key,e.message);throw e;}
  finally{analysisBusy.delete(key);if(current===doc&&view==='reader')renderLesson(index,shownTokens[index]||[]);}
}
let aiDisambTimer=null;const aiDisambQueue=[];
function queueAiDisambiguation(index,tokens){
 if(!settings.aiFurigana||!HanaAI.configured()||!current)return;
 const sentence=current.paragraphs[index]||'';
 for(const t of tokens){
  if(!t.needsAi)continue;
  const word=t.surface_form||'';
  if(!word||(current.aiReadings&&current.aiReadings[word]))continue;
  if(aiDisambQueue.some(q=>q.word===word&&q.sentence===sentence))continue;
  aiDisambQueue.push({index,sentence,word});
 }
 clearTimeout(aiDisambTimer);
 aiDisambTimer=setTimeout(runAiDisambiguation,1200);
}
async function runAiDisambiguation(){
 if(!aiDisambQueue.length||!current)return;
 const doc=current,batch=aiDisambQueue.splice(0,15);
 try{
  const result=await HanaAI.disambiguate(config(),batch);
  let changed=false;
  for(const[word,reading]of Object.entries(result)){
   if(!doc.aiReadings)doc.aiReadings={};
   if(doc.aiReadings[word]!==reading){doc.aiReadings[word]=reading;changed=true;}
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
     shownTokens[i]=tokens;
     const el=$('#paragraph-'+i+' .japanese');
     if(el)el.innerHTML=renderTokens(tokens,i);
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
async function openToken(index,tokenIndex){const t=shownTokens[index]?.[tokenIndex];if(!t)return;const a=lessonData(index),v=a.vocabulary.find(v=>v.surface===t.s||v.word===t.b)||D.lexicon[t.b]||D.lexicon[t.s]||RikkaDictionary.lookup(t.b,t.r)||RikkaDictionary.lookup(t.s,t.r)||{word:t.b,reading:t.s===t.b?t.r:'',meaning:'离线中文词库暂未收录。可使用“AI 深入解析”补充本句释义。',level:'参考',form:formDescription(t)};wordSelection={...v,surface:t.s,surfaceReading:t.r,context:current.paragraphs[index],index,token:t};$$('.token.selected').forEach(x=>x.classList.remove('selected'));$('[data-paragraph="'+index+'"][data-token="'+tokenIndex+'"]')?.classList.add('selected');renderWordDialog();}
function renderWordDialog(){const v=wordSelection;const saved=words.some(w=>w.word===v.word&&w.reading===v.reading);showDialog('这个词，记住了',
  '<div class="dialog-word" lang="ja">'+C.ruby(v.surface||v.word,v.surfaceReading||v.reading)+'</div><p class="word-pos">词典原形：'+C.escape(v.word)+(v.reading?'（'+C.escape(v.reading)+'）':'')+(v.token?' · '+C.escape(v.token.p):'')+'</p><p class="definition">'+C.escape(v.meaning)+'</p>'+(v.form?'<p class="hint">'+C.escape(v.form)+'</p>':'')+(v.origin?'<p class="hint">原词：'+C.escape(v.origin)+'</p>':'')+'<div class="button-row"><button class="primary" id="dialog-add-word">'+icon(saved?'check':'plus')+(saved?'已经收藏':'加入生词本')+'</button><button class="secondary" id="dialog-speak">'+icon('volume')+'听读音</button></div>'+(v.index!=null?'<button class="text-button" id="dialog-ai">对这一段进行 AI 深入解析</button>':''));
  $('#dialog-add-word').onclick=safe(()=>addWord(v,v.context));$('#dialog-speak').onclick=()=>speak(v.surfaceReading||v.reading||v.word);
  if($('#dialog-ai'))$('#dialog-ai').onclick=safe(async()=>{closeDialog();await analyze(v.index,true);});
}
async function renderWords(){words=await DB.all('words');$('#word-total').textContent=words.length;$('#word-due').textContent=words.filter(w=>w.due<=Date.now()).length;const days=await DB.get('meta','days');$('#study-days').textContent=days?.days?.length||0;const q=$('#word-search').value.trim().toLowerCase();const list=words.filter(w=>(w.word+' '+w.reading+' '+w.meaning).toLowerCase().includes(q)).sort((a,b)=>b.created-a.created);$('#word-list').innerHTML=list.length?list.map(w=>'<button class="word-entry" data-word="'+C.escape(w.id)+'"><div><b lang="ja">'+C.ruby(w.word,w.reading)+'</b><p>'+C.escape(w.meaning)+'</p><small>'+C.escape(w.book||'阅读收藏')+' · '+(w.due<=Date.now()?'等待复习':formatDate(w.due)+' 再见')+'</small></div>'+icon('back').replace('<svg','<svg style="transform:rotate(180deg);width:15px;color:var(--muted)"')+'</button>').join(''):empty(q?'没有找到这个词':'把心动的词，留在这里','阅读时点一下单词，再点“加入生词本”。');}
function openSavedWord(id){const w=words.find(x=>x.id===id);if(!w)return;wordSelection={...w,surface:w.word,surfaceReading:w.reading};renderWordDialog();const b=document.createElement('button');b.className='text-button danger';b.textContent='从生词本移除';b.style.marginTop='16px';b.onclick=safe(async()=>{await DB.remove('words',w.id);words=words.filter(x=>x.id!==w.id);closeDialog();await renderWords();toast('已移除生词');});$('#dialog-body').appendChild(b);}
function startReview(){reviewQueue=words.filter(w=>w.due<=Date.now()).sort((a,b)=>a.due-b.due);reviewIndex=0;reviewRevealed=false;if(!reviewQueue.length){toast('今天的复习完成了，可以去读一段新内容');return;}$('#review-area').classList.remove('hidden');renderReview();$('#review-area').scrollIntoView({behavior:'smooth'});}
function renderReview(){if(reviewIndex>=reviewQueue.length){$('#review-area').innerHTML='<div class="review-card"><h2>今天的词，又熟悉了一点。</h2><p class="hint">本轮完成 '+reviewQueue.length+' 个词的复习。</p><button class="secondary" id="finish-review">回到生词手帐</button></div>';$('#finish-review').onclick=()=>$('#review-area').classList.add('hidden');safe(renderWords)();return;}const w=reviewQueue[reviewIndex];$('#review-area').innerHTML='<div class="review-card"><div class="label-row"><span class="eyebrow">回忆卡片 '+(reviewIndex+1)+' / '+reviewQueue.length+'</span><button class="text-button" id="exit-review">结束本轮</button></div><div class="front">'+C.escape(w.word)+'</div>'+(reviewRevealed?'<p class="answer">'+C.escape(w.reading)+'</p><p class="meaning">'+C.escape(w.meaning)+'</p><p class="hint">'+C.escape(w.context?.slice(0,180)||'')+'</p><div class="review-buttons"><button class="secondary" data-rating="again">再练一次 · 10 分钟</button><button class="secondary" data-rating="good">记住了</button><button class="primary" data-rating="easy">很熟悉</button></div>':'<p class="hint">先回忆读音和意思，再翻开答案。</p><button class="primary" id="reveal-answer">显示答案</button>')+'</div>';$('#exit-review').onclick=()=>$('#review-area').classList.add('hidden');if($('#reveal-answer'))$('#reveal-answer').onclick=()=>{reviewRevealed=true;renderReview();};$$('[data-rating]').forEach(b=>b.onclick=safe(async()=>{const next=C.nextReview(w,b.dataset.rating);await DB.put('words',next);words[words.findIndex(x=>x.id===w.id)]=next;reviewIndex++;reviewRevealed=false;renderReview();}));}
function renderSettings(){const vals={'font-size':settings.font,'segment-size':settings.segment,'ruby-mode':settings.ruby,'speech-rate':settings.rate,'theme-mode':settings.theme,'ai-base':settings.base,'ai-model':settings.model,'ai-provider':settings.provider};for(const[id,v]of Object.entries(vals))$('#'+id).value=v;$('#font-value').textContent=settings.font+' px';$('#dedupe-words').checked=settings.dedupe;$('#auto-ai').checked=settings.autoAI;$('#ai-furigana').checked=settings.aiFurigana;$('#key-badge').textContent=HanaAI.configured()?'已保存密钥':'未配置';$('#ai-key').value='';renderBackgroundSettings();$('#show-words-nav').checked=settings.showWords;$('#remember-position').checked=settings.rememberPosition;$('#show-dictionary-nav').checked=settings.showDictionary;RikkaStory.render();RikkaVoice.renderSettings();RikkaAppearance.render();safe(RikkaImages.render)();RikkaProfiles.render();RikkaGallery.render();}
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
  $('#generate-story').disabled=true;$('#cancel-generate').classList.remove('hidden');$('#generation-status').textContent=continuing?'正在续写下一章，并保持既有设定…':'正在写你的故事，完成后会自动注音…';$('#generation-status').classList.remove('hidden');
  try{if(settings.autoPolishPrompt){const field=continuing?'continuation':'theme';if(spec[field]){$('#generation-status').textContent='正在润色提示词…';spec[field]=await HanaAI.polish(config(),spec[field],{continuation:continuing,style:spec.style,level:spec.level,promptLength:settings.promptLength},{onId:id=>generationId=id});$(continuing?'#story-continuation':'#story-theme').value=spec[field];RikkaStory.remember();}}const generated=await HanaAI.novel(config(),spec,baseDoc?{summary:baseDoc.summary||'',tail:baseDoc.text.slice(-2600)}:null,{onId:id=>generationId=id});let doc;
    if(generated.readings){if(baseDoc)baseDoc.nameReadings={...(baseDoc.nameReadings||{}),...generated.readings};}
    if(baseDoc){baseDoc.text+='\n\n'+generated.text;const at=baseDoc.paragraphs.length;baseDoc.paragraphs.push(...C.splitParagraphs(generated.text,settings.segment));baseDoc.summary=generated.summary;baseDoc.chapters=(baseDoc.chapters||1)+1;baseDoc.position=at;doc=baseDoc;await saveDoc(doc);}
    else doc=await makeDoc(generated.title,generated.text,'story',{summary:generated.summary,spec,chapters:1,nameReadings:generated.readings||undefined});
    toast(continuing?'新一章已经写好':'故事已经写好，开始阅读吧');await openDoc(doc.id,doc.position);
  }catch(e){$('#generation-status').textContent=e.message;throw e;}
  finally{generationId=null;$('#generate-story').disabled=false;$('#cancel-generate').classList.add('hidden');}
}
async function handleFile(name,bytes){busy('正在提取文档文字…');try{const result=await HanaImport.parse(name,bytes,$('#encoding').value);if(result.backup){await restoreBackup(result.backup);return;}if(restoreExpected)throw new Error('请选择六花导出的 .json 学习备份');const doc=await makeDoc(result.title,result.text,'import',{format:result.kind});unbusy();toast('文档已加入书架');await openDoc(doc.id);}finally{restoreExpected=false;unbusy();}}
function pickFile(restore=false){restoreExpected=restore;if(window.Android)Android.pickFile();else{$('#file-input').accept=restore?'.json':'.txt,.md,.docx,.epub,.pdf,.html,.htm,.json';$('#file-input').click();}}
function exportFile(name,mime,text){if(window.Android)Android.saveFile(name,mime,text);else{const blob=new Blob([text],{type:mime}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}}
async function backup(){await savePosition();const data={app:'hanayomi',version:1,exportedAt:new Date().toISOString(),settings:{...settings,voiceEndpoint:'',voiceReference:'',voiceTranscript:''},documents:await DB.all('documents'),words:await DB.all('words'),meta:await DB.all('meta')};exportFile('六花日语-学习备份-'+new Date().toISOString().slice(0,10)+'.json','application/json',JSON.stringify(data,null,2));}
async function restoreBackup(data){
  if(analysisBusy.size||generationId)throw new Error('请等当前 AI 请求结束后再恢复备份');
  if(data?.app!=='hanayomi'||data.version!==1||!Array.isArray(data.documents)||!Array.isArray(data.words)||!Array.isArray(data.meta))throw new Error('这不是有效的六花学习备份');
  if(data.documents.length>1000||data.words.length>100000)throw new Error('备份内容过多，请拆分');
  const cleanDocs=data.documents.map(d=>{if(!d||typeof d.id!=='string'||typeof d.text!=='string'||typeof d.title!=='string'||!Array.isArray(d.paragraphs)||d.paragraphs.some(p=>typeof p!=='string')||d.text.length>1000000||d.paragraphs.length>30000)throw new Error('备份含有损坏的阅读条目');const a={};for(const [i,entry]of Object.entries(d.analyses||{})){if(Number.isInteger(Number(i))&&Number(i)>=0&&Number(i)<d.paragraphs.length)try{a[i]=C.validateAnalysis(entry,d.paragraphs[Number(i)]);}catch(e){}}return {...d,analyses:a,position:Math.max(0,Math.min(Number(d.position)||0,d.paragraphs.length-1))};});
  const cleanWords=data.words.map(w=>{if(!w||typeof w.id!=='string'||typeof w.word!=='string'||typeof w.reading!=='string'||typeof w.meaning!=='string')throw new Error('备份含有损坏的生词条目');return {...w,due:Number(w.due)||Date.now(),created:Number(w.created)||Date.now(),interval:Number(w.interval)||0,reviews:Number(w.reviews)||0};});
  const cleanMeta=[];for(const m of data.meta){if(m?.id==='background-gallery'){const g=RikkaGallery.sanitize(m);if(g)cleanMeta.push(g);}if(['study-progress','study-log','study-session'].includes(m?.id)){const clean=await RikkaStudy.sanitizeMeta(m);if(clean)cleanMeta.push(clean);}if(m?.id==='custom-icon'&&typeof m.data==='string'&&/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(m.data)&&m.data.length<2000000)cleanMeta.push({id:'custom-icon',data:m.data});if(m?.id==='background'&&typeof m.data==='string'&&/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(m.data)&&m.data.length<6000000)cleanMeta.push({id:'background',data:m.data});if(m?.id==='days'&&Array.isArray(m.days))cleanMeta.push({id:'days',days:m.days.filter(x=>typeof x==='string').slice(0,20000)});/* 已删除：不再从备份导入用户自定义读音（内置已验证读音不受影响） */}
  if(cleanMeta.some(m=>m.id==='background')&&!cleanMeta.some(m=>m.id==='background-gallery'))await DB.remove('meta','background-gallery');await DB.restore({documents:cleanDocs,words:cleanWords,meta:cleanMeta});RikkaShelf.forget(cleanDocs.map(d=>d.id));await RikkaStudy.reload();const bs=data.settings||{};for(const[k,options]of Object.entries({randomGenre:['all',...Object.keys(RikkaStory.genres)],promptLength:['short','medium','long'],randomCast:['female','mixed'],defaultStyle:Object.keys(RikkaStory.styles),defaultLevel:['N5','N4','N3','N2','N1'],defaultStoryLength:[300,500,900,1500]}))if(options.includes(bs[k]))settings[k]=bs[k];for(const k of ['theme','ruby','bgPosition']){const options={theme:RikkaAppearance.themes.map(t=>t.id),ruby:['all','tap','none'],bgPosition:['center','top','bottom']};if(options[k].includes(bs[k]))settings[k]=bs[k];}for(const [k,min,max]of [['font',18,32],['segment',60,2000],['rate',.5,1.5],['bgShade',20,95],['bgBlur',0,16],['dailyNew',5,50],['sessionSize',10,50],['pitch',.7,1.3],['volume',.1,1],['speechGap',0,2],['voiceTemperature',.5,1],['backgroundInterval',10,180]])if(Number.isFinite(bs[k]))settings[k]=Math.max(min,Math.min(max,bs[k]));for(const k of ['dedupe','analysis','showWords','rememberPosition','showDictionary','speechFollow','showStoryTargets','autoPolishPrompt','backgroundCycle'])if(typeof bs[k]==='boolean')settings[k]=bs[k];if(bs.storyDraft&&typeof bs.storyDraft==='object'){settings.storyDraft={};for(const k of ['theme','characters','targets','continuation','sourceBg'])settings.storyDraft[k]=typeof bs.storyDraft[k]==='string'?bs.storyDraft[k].slice(0,6000):'';}saveSettings();docs=await DB.all('documents');words=await DB.all('words');overrides={...D.overrides};await RikkaGallery.init();tokenCache.clear();current=null;renderVersion++;nav('library');toast('已恢复 '+cleanDocs.length+' 篇阅读和 '+cleanWords.length+' 个生词');
}
async function exportReading(){if(!current)return;const doc=current;busy('正在导出带假名的阅读文档…');try{let body='';for(let i=0;i<doc.paragraphs.length;i++){const tokens=await tokenize(doc.paragraphs[i]);body+='<section><p lang="ja" class="jp">'+tokens.map(t=>C.ruby(t.s,t.r)).join('')+'</p>';const a=doc.analyses[i]||offlineAnalysis(i,tokens,doc);if(a.translation)body+='<p>'+C.escape(a.translation)+'</p>';body+='<h3>重点词汇</h3><ol>'+a.vocabulary.map(v=>'<li>'+C.escape(v.word)+'（'+C.escape(v.reading)+'）：'+C.escape(v.meaning)+(v.form?'；'+C.escape(v.form):'')+'</li>').join('')+'</ol><h3>语法解析</h3>'+grammarRows(a.grammar)+'</section>';if(i%10===0){$('#busy-text').textContent='正在导出 '+(i+1)+' / '+doc.paragraphs.length+' 段';await new Promise(r=>setTimeout(r,0));}}exportFile(doc.title+'-带假名.html','text/html','<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+C.escape(doc.title)+'</title><style>body{max-width:780px;margin:35px auto;padding:0 20px;font:15px/1.9 sans-serif;color:#302b3c}section{border-bottom:1px solid #ddd;padding:15px 0}.jp{font:23px/2.7 serif;white-space:pre-wrap}rt{font:11px sans-serif;color:#7960ac}h3{font-size:15px;margin-top:20px}.grammar-card{margin:15px 0}small{display:block;color:#777}</style><h1>'+C.escape(doc.title)+'</h1>'+body+'</html>');}finally{unbusy();}}
function readerMenu(){showDialog('阅读选项','<div class="menu-list"><button id="menu-restart">从头阅读</button><button id="menu-rename">修改标题</button><button id="menu-export">导出带假名与解析的 HTML</button><button id="menu-resegment">按当前设置重新分段</button><button id="menu-continue">在故事工坊续写</button><button id="menu-delete" class="danger">删除这篇阅读</button></div>');$('#menu-restart').onclick=safe(async()=>{closeDialog();RikkaShelf.forget([current.id]);delete current.bookmark;current.position=0;page=0;$('#main').scrollTo(0,0);await renderReader(0);await savePosition();});$('#menu-rename').onclick=()=>{showDialog('修改标题','<input class="text-input" id="rename-title" maxlength="100" value="'+C.escape(current.title)+'"><button id="rename-save" class="primary full" style="margin-top:17px">保存标题</button>');$('#rename-save').onclick=safe(async()=>{const title=$('#rename-title').value.trim();if(!title)throw new Error('标题不能为空');current.title=title;await saveDoc(current);$('#reader-title').textContent=title;closeDialog();});};$('#menu-export').onclick=safe(async()=>{closeDialog();await exportReading();});$('#menu-resegment').onclick=()=>{showDialog('重新分段','<p class="hint">会按约 '+settings.segment+' 字重新分段，已保存的 AI 解析将清空，阅读位置回到开头。正文和生词会保留。</p><button id="do-resegment" class="primary full">重新分段</button>');$('#do-resegment').onclick=safe(async()=>{if(analysisBusy.size)throw new Error('请等当前 AI 解析完成后再重新分段');current.paragraphs=C.splitParagraphs(current.text,settings.segment);current.analyses={};current.position=0;delete current.bookmark;RikkaShelf.forget([current.id]);page=0;await saveDoc(current);closeDialog();await renderReader(0);});};$('#menu-continue').onclick=()=>goContinueStory();$('#menu-delete').onclick=()=>{const doc=current;showDialog('删除阅读','<p class="hint">“'+C.escape(doc.title)+'”的正文和段落解析将被删除，收藏的生词会保留。</p><button id="delete-doc" class="primary full">删除这篇阅读</button>');$('#delete-doc').onclick=safe(async()=>{if(analysisBusy.size)throw new Error('请等当前解析完成后再删除');await DB.remove('documents',doc.id);RikkaShelf.forget([doc.id]);docs=docs.filter(d=>d.id!==doc.id);current=null;nav('library');toast('阅读已删除');});};}
async function paste(){let text='';if(window.Android)text=Android.clipboard();else try{text=await navigator.clipboard.readText();}catch(e){toast('请长按文本框，选择粘贴');$('#input-text').focus();return;}if(!text){toast('剪贴板没有可粘贴的文字');return;}$('#input-text').value=text;$('#input-count').textContent=text.length.toLocaleString()+' 字';}
function registerEvents(){
  $('#continue-story-btn').onclick=()=>goContinueStory();
  document.addEventListener('click',safe(async e=>{
    const navButton=e.target.closest('[data-nav]');if(navButton){nav(navButton.dataset.nav);return;}
    const action=e.target.closest('[data-action]');if(action){if(action.dataset.action==='pick')pickFile();if(action.dataset.action==='paste')await paste();if(action.dataset.action==='theme'){settings.theme=settings.theme==='dark'?'light':'dark';saveSettings();}return;}
    const book=e.target.closest('[data-book]');if(book){if(!RikkaShelf.handleClick(book.dataset.book))await openDoc(book.dataset.book);return;}
    const fb=e.target.closest('[data-filter]');if(fb){filter=fb.dataset.filter;$$('[data-filter]').forEach(b=>b.classList.toggle('active',b===fb));renderBooks();return;}
    const token=e.target.closest('[data-token]');if(token){await openToken(Number(token.dataset.paragraph),Number(token.dataset.token));return;}
    const sp=e.target.closest('[data-speak]');if(sp){await RikkaVoice.read(Number(sp.dataset.speak),false);return;}
    const ai=e.target.closest('[data-ai]');if(ai){await analyze(Number(ai.dataset.ai),true);return;}
    const tab=e.target.closest('[data-tab]');if(tab){const container=$('#lesson-'+tab.dataset.lesson);container.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===tab));container.querySelector('.vocab-panel').classList.toggle('hidden',tab.dataset.tab!=='vocab');container.querySelector('.grammar-panel').classList.toggle('hidden',tab.dataset.tab!=='grammar');if(tab.dataset.tab==='grammar')await annotateExamples(container);return;}
    const add=e.target.closest('[data-add-word]');if(add){const[i,j]=add.dataset.addWord.split(':').map(Number);await addWord(lessonData(i).vocabulary[j],current.paragraphs[i]);return;}
    const v=e.target.closest('[data-vocab]');if(v){const[i,j]=v.dataset.vocab.split(':').map(Number),entry=lessonData(i).vocabulary[j];wordSelection={...entry,surface:entry.word,surfaceReading:entry.reading,index:i,context:current.paragraphs[i]};renderWordDialog();return;}
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
window.handleBack=()=>{if($('#dialog').open){closeDialog();return true;}if(view!=='library'){nav('library');return true;}return false;};
window.nativeEvent=safe(async e=>{
 if(e.type==='voice'){RikkaVoice.native(e.data);return;}
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
function renderNavigation(){const navHtml=navItems.filter(([id])=>(id!=='words'||settings.showWords)&&(id!=='learn'||settings.showDictionary)).map(([id,i,name])=>'<button class="nav-button '+(id===view||id==='library'&&view==='reader'?'active':'')+'" data-nav="'+id+'">'+icon(i)+'<span>'+name+'</span></button>').join('');if($('#bottom-nav').innerHTML!==navHtml){$('#desktop-nav').innerHTML=navHtml;$('#bottom-nav').innerHTML=navHtml;}}
async function init(){
  startAutoHeartbeat();RikkaProfiles.init();renderNavigation();$('#today').textContent=new Date().toLocaleDateString('zh-CN',{month:'long',day:'numeric'});applySettings();registerEvents();RikkaShelf.register();RikkaImages.register();RikkaAppearance.register();RikkaStory.register();RikkaOnlineBooks.register();RikkaVoice.register();RikkaProfiles.register();RikkaGallery.register();
  docs=await DB.all('documents');words=await DB.all('words');overrides={...D.overrides};await RikkaGallery.init();
  const initialized=await DB.get('meta','initialized');if(!initialized){await DB.put('meta',{id:'initialized',value:true});}
  renderBooks();safe(RikkaDictionary.init)();if(window.Android)Android.ready();
}
function applyBackground(){RikkaGallery.paint();}
function renderBackgroundSettings(){$('#background-preview').style.backgroundImage=backgroundImage?'url("'+backgroundImage+'")':'none';$('#background-preview').classList.toggle('has-image',!!backgroundImage);$('#background-shade').value=settings.bgShade;$('#background-shade-value').textContent=settings.bgShade+'%';$('#background-blur').value=settings.bgBlur;$('#background-blur-value').textContent=settings.bgBlur+' px';$('#background-position').value=settings.bgPosition;}
async function setBackground(blob){busy('正在适配你的背景图片…');try{await RikkaImages.saveBackground(await RikkaImages.process(blob));}finally{unbusy();}}
function registerBackgroundEvents(){$('#choose-background').onclick=()=>{if(window.Android)Android.pickImage();else $('#background-input').click();};$('#background-input').onchange=safe(async e=>{try{const file=e.target.files[0];if(file)await setBackground(file);}finally{e.target.value='';}});$('#remove-background').onclick=safe(async()=>{await DB.remove('meta','background');backgroundImage='';applyBackground();renderBackgroundSettings();toast('已恢复默认背景');});$('#background-shade').oninput=e=>{settings.bgShade=Number(e.target.value);saveSettings();$('#background-shade-value').textContent=settings.bgShade+'%';};$('#background-blur').oninput=e=>{settings.bgBlur=Number(e.target.value);saveSettings();$('#background-blur-value').textContent=settings.bgBlur+' px';};$('#background-position').onchange=e=>{settings.bgPosition=e.target.value;saveSettings();};}
safe(init)();
