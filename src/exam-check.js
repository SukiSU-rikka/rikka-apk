'use strict';
/* RikkaExamCheck：题目自检
 * 1. 文の組み立て（★ 排序题）：由「正确顺序的 4 个片段 + ★ 在第几格」在代码里拼出题干和答案，
 *    ★ 位置、答案、解析出自同一份数据，不会再互相对不上。
 * 2. 答案与解析对账：解析里写明的答案（「正确答案是4」「★处为「…」」等）和答案键不一致时，
 *    让 AI 独立重做这道题当裁判：裁判同意解析 → 改答案；裁判同意答案键 → 解析作废、按正确答案重新讲解；
 *    都不同意 → 生成的题直接丢弃重出，真题保留答案键并在解析前注明分歧。 */
window.RikkaExamCheck=(()=>{
 const FW={'１':'1','２':'2','３':'3','４':'4','Ａ':'A','Ｂ':'B','Ｃ':'C','Ｄ':'D','ａ':'A','ｂ':'B','ｃ':'C','ｄ':'D','a':'A','b':'B','c':'C','d':'D'};
 const toIdx=(ch,q)=>{
  const c=FW[ch]||ch;
  if(/^[1-4]$/.test(c)){const i=+c-1;return i<q.choices.length?i:-1;}
  if(!q.num&&/^[A-D]$/.test(c)){const i=c.charCodeAt(0)-65;return i<q.choices.length?i:-1;}
  return -1;
 };
 const norm=s=>String(s||'').replace(/\[\[|\]\]/g,'').replace(/[\s　、。，,．.・「」『』“”"'‘’（）()〈〉＿_★]/g,'');
 function choiceByText(q,t){
  const n=norm(t);if(!n)return -1;
  const hits=q.choices.map((c,i)=>norm(c)===n?i:-1).filter(i=>i>=0);
  return hits.length===1?hits[0]:-1;
 }
 const KEYWORD='(?:正确答案|正確答案|正确选项|正确的选项|正解|答案应|答案|应选|应该选|故选|所以选|★处|★の所|★に入るの)';
 const NUM_RE=new RegExp(KEYWORD+'\\s*(?:应?是|应为|为|為|是|：|:|は|＝|=)?\\s*(?:选项|第)?\\s*([1-4１-４A-DＡ-Ｄa-dａ-ｄ])(?![0-9０-９A-Za-z])','g');
 const TXT_RE=new RegExp(KEYWORD+'\\s*(?:应?是|应为|为|為|是|：|:|は|＝|=)?\\s*[「『“"]([^」』”"]{1,40})[」』”"]','g');
 /** 解析里明确写出的正确答案（选项下标），没写或看不出来返回 -1。取文中最先出现的那一处。 */
 function statedAnswer(q){
  if(!q||!Array.isArray(q.choices))return -1;
  if(Number.isInteger(q.explainAnswer)&&q.explainAnswer>=0&&q.explainAnswer<q.choices.length)return q.explainAnswer;
  const t=String(q.explain||'');if(!t)return -1;
  let best=-1,at=Infinity,m;
  NUM_RE.lastIndex=0;while((m=NUM_RE.exec(t))){const i=toIdx(m[1],q);if(i>=0&&m.index<at){best=i;at=m.index;}break;}
  TXT_RE.lastIndex=0;while((m=TXT_RE.exec(t))){const i=choiceByText(q,m[1]);if(i>=0){if(m.index<at){best=i;at=m.index;}break;}}
  return best;
 }
 const isKumitate=q=>!!q&&(q.rtype==='kumitate'||q.qtype==='kumitate'||/組み立て|组み立て/.test(q.partTitle||'')||/★/.test(q.q||''));
 /** 排序题题干坏了：没有 ★、题干只是大题说明文字、或者去掉空格后几乎没有句子内容。 */
 function brokenKumitate(q){
  if(!isKumitate(q))return false;
  const s=String(q.q||'');
  if(!/★/.test(s))return true;
  if(/入る最もよい|入るのに最もよい|えらびなさい|選びなさい|一つ選んで/.test(s))return true;
  const body=s.replace(/^\s*[（(]?\s*[0-9０-９]+\s*[)）.．]?\s*/,'').replace(/[＿_★\s　]/g,'');
  return body.length<4;
 }
 /* ---------- 排序题：代码拼题干 ---------- */
 const SLOT='＿＿＿',STAR='＿★＿';
 function stem(before,n,star,after){
  const slots=Array.from({length:n},(_,i)=>i===star?STAR:SLOT).join(' ');
  return (String(before||'').trim()+' '+slots+' '+String(after||'').trim()).trim();
 }
 function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
 /** AI 给的结构 → 题目字段。pieces 是正确顺序的 4 个片段，star 是 ★ 所在格（1 开始）。失败返回 null。 */
 function buildKumitate(x){
  const pieces=(Array.isArray(x&&x.pieces)?x.pieces:[]).map(p=>String(p??'').trim());
  const star=Number(x&&x.star)-1,before=String(x&&x.before||'').trim(),after=String(x&&x.after||'').trim();
  if(pieces.length!==4||pieces.some(p=>!p||/[＿_★]/.test(p))||new Set(pieces).size!==4)return null;
  if(!(star>=0&&star<4))return null;
  if(!before&&!after)return null;
  let choices=shuffle(pieces);
  // 正确答案的位置尽量别总落在同一个号上：洗出来正好按原顺序时再洗一次
  if(choices.every((c,i)=>c===pieces[i]))choices=shuffle(pieces);
  const answer=choices.indexOf(pieces[star]);
  const sentence=before+pieces.join('')+after;
  const head='正确顺序：「'+sentence+'」，排列为 '+pieces.map(p=>choices.indexOf(p)+1).join('→')+'，★ 处是「'+pieces[star]+'」，所以选 '+(answer+1)+'。';
  return{q:stem(before,4,star,after),choices,answer,explainHead:head,sentence};
 }
 /* ---------- AI ---------- */
 const cfg=()=>RikkaProfiles.config();
 function qText(q,withKey){
  return (q.passage?'文章：\n'+q.passage+'\n':'')+(q.speakText?'听力原文：\n'+q.speakText+'\n':'')+'题目：'+q.q+'\n选项：\n'+q.choices.map((c,i)=>(i+1)+'. '+c).join('\n')+(withKey?'\n参考答案：'+(q.answer+1):'');
 }
 /** 让 AI 不看答案独立做一遍，返回选项下标；失败返回 -1。 */
 async function judge(q){
  try{
   const raw=await HanaAI.chat(cfg(),[{role:'system',content:'你是 JLPT 日本语能力考试的阅卷老师。独立作答下面这道单选题（题干里 [[ ]] 包住的是画线部分，★ 是排序题要填的那一格）。仔细推敲每个选项后只给出唯一正确的一个。只返回 JSON：{"answer":N}，N 是选项编号（1 开始），不要 Markdown。'},{role:'user',content:qText(q,false)}],{purpose:'exam-check',temperature:0,maxTokens:400});
   const d=HanaCore.jsonObject(raw);const n=Number(d&&d.answer)-1;
   return Number.isInteger(n)&&n>=0&&n<q.choices.length?n:-1;
  }catch(e){return -1;}
 }
 /** 坏掉的排序题：用 4 个选项和解析里的整句，重排出正确顺序并按答案放 ★。成功返回新字段，否则 null。 */
 async function repairKumitate(q){
  if(!Array.isArray(q.choices)||q.choices.length!==4)return null;
  try{
   const raw=await HanaAI.chat(cfg(),[{role:'system',content:'你在修一道 JLPT「文の組み立て」排序题：4 个选项是要排进句子的 4 个片段，题干丢了句子本身。根据选项和解析，还原完整句子：before 是空格前的部分，after 是空格后的部分，order 是 4 个选项编号（1–4，每个恰好用一次）按正确顺序排列。before+按 order 排好的片段+after 必须是一句自然通顺、语法正确的日语。只返回 JSON：{"before":"","order":[1,2,3,4],"after":""}，不要 Markdown。'},{role:'user',content:'选项：\n'+q.choices.map((c,i)=>(i+1)+'. '+c).join('\n')+'\n解析：'+(q.explain||'（无）')}],{purpose:'exam-check',temperature:0,maxTokens:600});
   const d=HanaCore.jsonObject(raw);
   const order=(Array.isArray(d&&d.order)?d.order:[]).map(n=>Number(n)-1);
   if(order.length!==4||new Set(order).size!==4||order.some(i=>!(i>=0&&i<4)))return null;
   const before=String(d.before||'').trim(),after=String(d.after||'').trim();
   if(!before&&!after)return null;
   // 答案不动，★ 放到答案片段在正确顺序里的位置
   let ans=q.answer;const said=statedAnswer(q);if(said>=0)ans=said;
   const star=order.indexOf(ans);if(star<0)return null;
   const sentence=before+order.map(i=>q.choices[i]).join('')+after;
   const head='正确顺序：「'+sentence+'」，排列为 '+order.map(i=>i+1).join('→')+'，★ 处是「'+q.choices[ans]+'」，所以选 '+(ans+1)+'。';
   return{q:stem(before,4,star,after),answer:ans,explainHead:head};
  }catch(e){return null;}
 }
 /* ---------- 对账 ---------- */
 function issue(q){
  if(!q||!Array.isArray(q.choices)||q.checked)return null; // 已经核对过（含“三者不一致”已注明的）不再反复核对
  if(brokenKumitate(q))return 'kumitate';
  const s=statedAnswer(q);
  if(s>=0&&s!==q.answer)return 'conflict';
  return null;
 }
 const lab=(q,i)=>q.num?String(i+1):'ABCD'[i];
 /** 修一道题。返回 {fix, drop}：fix 是要合并进题目的字段（可能为空对象），drop=true 表示这道题不可信应丢弃。
  *  real=true 时（真题）不丢题，只改答案或注明分歧。 */
 async function resolve(q,real){
  const kind=issue(q);
  if(!kind)return{fix:{},drop:false};
  if(kind==='kumitate'){
   const r=await repairKumitate(q);
   if(!r)return real?{fix:{checked:'kumitate-failed',note:'这道排序题的题干没识别完整，★ 的位置可能不准，请以原卷为准'},drop:false}:{fix:{},drop:true};
   const fix={q:r.q,answer:r.answer,explain:r.explainHead+(q.explain?'\n'+q.explain:''),explainAnswer:undefined,checked:'kumitate'};
   // 修好后再对一次账（★ 处与答案应一致）
   const after=Object.assign({},q,fix);
   if(issue(after)==='conflict')fix.explain=r.explainHead;
   return{fix,drop:false};
  }
  const said=statedAnswer(q),key=q.answer,j=await judge(q);
  const keyName=real?'答案表':'原答案';
  if(j>=0&&j===said)return{fix:{answer:said,explainAnswer:undefined,checked:'answer-fixed',note:keyName+'是 '+lab(q,key)+'，与解析不符，已按解析和复核改为 '+lab(q,said)},drop:false};
  if(j>=0&&j===key)return{fix:{explain:'',explainAnswer:undefined,checked:'explain-dropped',note:'原解析写的答案（'+lab(q,said)+'）与'+keyName+'不符，复核确认答案是 '+lab(q,key)+'，已重新讲解'},drop:false};
  if(!real)return{fix:{},drop:true};
  return{fix:{explainAnswer:undefined,checked:'disputed',note:keyName+'是 '+lab(q,key)+'，解析说 '+lab(q,said)+(j>=0?'，AI 复核选 '+lab(q,j):'')+'，三者不一致，请以原卷为准'},drop:false};
 }
 /** 批量对账（出题、识别真题时用）。并发 3 个，只对有问题的题调 AI。返回保留下来的题。 */
 async function reconcile(qs,{real=false}={}){
  const out=qs.slice(),bad=out.map((q,i)=>issue(q)?i:-1).filter(i=>i>=0),dropped=new Set();
  let k=0;
  async function worker(){
   while(k<bad.length){
    const i=bad[k++];
    try{const r=await resolve(out[i],real);if(r.drop)dropped.add(i);else out[i]=apply(out[i],r.fix);}
    catch(e){if(!real)dropped.add(i);}
   }
  }
  await Promise.all([worker(),worker(),worker()]);
  return out.filter((_,i)=>!dropped.has(i));
 }
 function apply(q,fix){
  const o=Object.assign({},q,fix);
  for(const k of Object.keys(fix))if(fix[k]===undefined)delete o[k];
  return o;
 }
 return{statedAnswer,brokenKumitate,isKumitate,buildKumitate,repairKumitate,judge,issue,resolve,reconcile,apply,stem};
})();
