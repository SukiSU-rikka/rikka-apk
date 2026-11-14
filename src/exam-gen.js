'use strict';
/* ExamGen: 离线 JLPT 风格出题器
 * 数据源：study-vocab.json（6633 词）、study-grammar.json（125 条语法）。
 * 可无限生成 文字・語彙（读音 / 表记 / 语义）与 文法（填空）题；读解、听力由题库或 AI 补充。 */
window.ExamGen=(()=>{
 const LEVELS=['N5','N4','N3','N2','N1'];
 const KANJI=/[\u3400-\u9fff々〆]/;
 let vocab=null,grammar=null,byLevel={},gByLevel={};

 async function load(){
  if(vocab)return;
  const [v,g]=await Promise.all([fetch('study-vocab.json').then(r=>r.json()),fetch('study-grammar.json').then(r=>r.json())]);
  vocab=(v.items||[]).filter(x=>x&&x.word&&x.reading&&x.level);
  grammar=(g.items||[]).filter(x=>x&&x.cloze&&x.answer&&x.level);
  byLevel={};gByLevel={};
  for(const l of LEVELS){byLevel[l]=vocab.filter(x=>x.level===l);gByLevel[l]=grammar.filter(x=>x.level===l);}
 }
 /* ---- 随机数（可复现） ---- */
 function rng(seed){let a=(seed>>>0)||1;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
 const pick=(r,a)=>a[Math.floor(r()*a.length)];
 function shuffle(r,a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

 /* ---- 读音干扰项 ---- */
 const VOICE={か:'が',き:'ぎ',く:'ぐ',け:'げ',こ:'ご',さ:'ざ',し:'じ',す:'ず',せ:'ぜ',そ:'ぞ',た:'だ',て:'で',と:'ど',は:'ば',ひ:'び',ふ:'ぶ',へ:'べ',ほ:'ぼ'};
 const UNVOICE={};for(const k in VOICE)UNVOICE[VOICE[k]]=k;
 const HALF={ば:'ぱ',び:'ぴ',ぶ:'ぷ',べ:'ぺ',ぼ:'ぽ',ぱ:'ば',ぴ:'び',ぷ:'ぶ',ぺ:'べ',ぽ:'ぼ'};
 const SIMILAR={し:'ち',ち:'し',つ:'す',す:'つ',ぬ:'め',め:'ぬ',き:'さ',さ:'き',ゆ:'よ',よ:'ゆ',ゅ:'ょ',ょ:'ゅ'};
 const O_ROW=/[おこそとのほもよろごぞどぼぽょ]/;
 function mutations(rd,r){
  const ch=Array.from(rd),out=new Set();
  const idxs=ch.map((_,i)=>i);
  for(const i of shuffle(r,idxs)){
   const c=ch[i];
   if(VOICE[c])out.add(ch.slice(0,i).join('')+VOICE[c]+ch.slice(i+1).join(''));
   if(UNVOICE[c])out.add(ch.slice(0,i).join('')+UNVOICE[c]+ch.slice(i+1).join(''));
   if(HALF[c])out.add(ch.slice(0,i).join('')+HALF[c]+ch.slice(i+1).join(''));
   if(SIMILAR[c])out.add(ch.slice(0,i).join('')+SIMILAR[c]+ch.slice(i+1).join(''));
   if(c==='う'&&i>0&&O_ROW.test(ch[i-1]))out.add(ch.slice(0,i).join('')+ch.slice(i+1).join(''));          // 去长音
   if(c==='っ')out.add(ch.slice(0,i).join('')+ch.slice(i+1).join(''));                                  // 去促音
   if((O_ROW.test(c)||c==='ゆ')&&ch[i+1]!=='う'&&ch[i+1]!=='ん'&&i<ch.length-1)out.add(ch.slice(0,i+1).join('')+'う'+ch.slice(i+1).join('')); // 加长音
   if(i>0&&i<ch.length-1&&/[きくちつ]/.test(c)&&/[かきくけこさしすせそたちつてとぱぴぷぺぽ]/.test(ch[i+1]||''))out.add(ch.slice(0,i+1).join('')+'っ'+ch.slice(i+1).join('')); // 加促音
  }
  out.delete(rd);
  return Array.from(out).filter(x=>(x.length>=2||rd.length<2)&&!/^[ぱぴぷぺぽ]/.test(x)&&!/っ[ぱぴぷぺぽ]?$/.test(x)&&!/ー/.test(x)===!/ー/.test(rd));
 }
 const hasKanji=w=>KANJI.test(w.word);
 function readingChoices(item,pool,r){
  const bad=new Set(vocab.filter(v=>v.word===item.word).map(v=>v.reading));
  let c=shuffle(r,mutations(item.reading,r)).filter(x=>!bad.has(x));
  const chosen=[];
  for(const x of c){if(!chosen.includes(x))chosen.push(x);if(chosen.length===3)break;}
  if(chosen.length<3){ // 兜底：同级别、长度相近的其他词读音
   for(const v of shuffle(r,pool)){
    if(bad.has(v.reading)||chosen.includes(v.reading)||/ー/.test(v.reading)||v.reading.length<2||Math.abs(v.reading.length-item.reading.length)>1||!(v.reading[0]===item.reading[0]||v.reading.slice(-1)===item.reading.slice(-1)))continue;
    chosen.push(v.reading);if(chosen.length===3)break;
   }
  }
  return chosen.length===3?chosen:null;
 }
 function writeChoices(item,pool,r){
  const sameReading=new Set(vocab.filter(v=>v.reading===item.reading).map(v=>v.word));
  const chars=Array.from(item.word).filter(c=>KANJI.test(c));
  const sharing=pool.filter(v=>hasKanji(v)&&!sameReading.has(v.word)&&v.word!==item.word&&chars.some(c=>v.word.includes(c)));
  const sameLen=pool.filter(v=>hasKanji(v)&&!sameReading.has(v.word)&&v.word!==item.word&&Array.from(v.word).length===Array.from(item.word).length);
  const out=[];
  for(const v of shuffle(r,sharing).concat(shuffle(r,sameLen))){if(!out.includes(v.word)){out.push(v.word);if(out.length===3)break;}}
  return out.length===3?out:null;
 }
 function cleanMeaning(m){
  m=String(m||'').replace(/（[^）]*）/g,'').replace(/[①-⑳]/g,'').replace(/【[^】]*】/g,'|').replace(/^\|+/,'');
  m=m.split('|')[0].split(/[；;]/)[0];
  const parts=m.split(/[，,、]/).map(s=>s.trim()).filter(Boolean);
  return parts.slice(0,2).join('，').slice(0,16);
 }
 function meaningChoices(item,pool,r){
  const ans=cleanMeaning(item.meaning);if(!ans)return null;
  const out=[];
  const same=pool.filter(v=>v.pos===item.pos&&v.word!==item.word);
  for(const v of shuffle(r,same.length>=12?same:pool)){
   const m=cleanMeaning(v.meaning);
   if(!m||m===ans||out.includes(m)||m.slice(0,2)===ans.slice(0,2))continue;
   out.push(m);if(out.length===3)break;
  }
  return out.length===3?{ans,wrong:out}:null;
 }
 function place(r,correct,wrong){
  const choices=shuffle(r,[correct].concat(wrong));
  return {choices,answer:choices.indexOf(correct)};
 }
 const letters=['A','B','C','D'];

 /* ---- 单题 ---- */
 function vocabQ(level,r,kind,n,usedWords){
  const pool=byLevel[level];
  for(let tries=0;tries<40;tries++){
   const it=pick(r,pool);
   if(usedWords.has(it.word))continue;
   if(kind==='read'){
    if(!hasKanji(it)||it.reading===it.word)continue;
    const wrong=readingChoices(it,pool,r);if(!wrong)continue;
    const p=place(r,it.reading,wrong);usedWords.add(it.word);
    return {id:'',level,section:'vocab',type:'read',q:'「'+it.word+'」の読み方として最もよいものを、A〜Dから一つ選びなさい。',passage:'',choices:p.choices,answer:p.answer,
     explain:it.word+' 读作 '+it.reading+'（'+cleanMeaning(it.meaning)+'）。其余选项是常见的清浊音、长音、促音混淆。',source:'自动生成'};
   }
   if(kind==='write'){
    if(!hasKanji(it)||it.reading===it.word)continue;
    const wrong=writeChoices(it,pool,r);if(!wrong)continue;
    const p=place(r,it.word,wrong);usedWords.add(it.word);
    return {id:'',level,section:'vocab',type:'write',q:'「'+it.reading+'」の漢字として最もよいものを、A〜Dから一つ選びなさい。',passage:'',choices:p.choices,answer:p.answer,
     explain:it.reading+' 写作「'+it.word+'」（'+cleanMeaning(it.meaning)+'）。其他选项与正确答案共用部分汉字，注意区分。',source:'自动生成'};
   }
   // meaning：日→中 或 中→日
   const mc=meaningChoices(it,pool,r);if(!mc)continue;
   usedWords.add(it.word);
   if(r()<.5){
    const p=place(r,mc.ans,mc.wrong);
    return {id:'',level,section:'vocab',type:'meaning',q:'「'+it.word+(it.word!==it.reading?'」（'+it.reading+'）':'」')+'の意味として最もよいものを選びなさい。',passage:'',choices:p.choices,answer:p.answer,
     explain:it.word+'（'+it.reading+'）：'+cleanMeaning(it.meaning)+'。',source:'自动生成'};
   }
   const others=shuffle(r,pool.filter(v=>v.word!==it.word&&v.pos===it.pos&&cleanMeaning(v.meaning)!==mc.ans&&v.reading!==it.reading)).slice(0,3).map(v=>v.word);
   if(others.length<3)continue;
   const p=place(r,it.word,others);
   return {id:'',level,section:'vocab',type:'meaning',q:'「'+mc.ans+'」を意味する日本語として最もよいものを選びなさい。',passage:'',choices:p.choices,answer:p.answer,
    explain:'「'+mc.ans+'」对应 '+it.word+'（'+it.reading+'）。',source:'自动生成'};
  }
  return null;
 }
 const PLAIN=['plain','jisho','ta','nai','noun'];
 function cls(g){
  const left=String(g.construction||'').split('＋')[0];
  const s=new Set();
  if(/动词て形/.test(left))s.add('te');
  if(/ます形/.test(left))s.add('masu');
  if(/辞书形/.test(left))s.add('jisho');
  if(/た形/.test(left))s.add('ta');
  if(/ない形/.test(left))s.add('nai');
  if(/意志形/.test(left))s.add('vol');
  if(/ば形/.test(left))s.add('ba');
  if(/普通形/.test(left))PLAIN.forEach(x=>s.add(x));
  if(/名词|人|话题|宾语|场所|目的地|时间|对象|来源|な形容词/.test(left))s.add('noun');
  if(/い形容词/.test(left))s.add('adj');
  if(/礼貌句|普通句/.test(left))s.add('sentence');
  if(!s.size)s.add('other:'+left);
  return s;
 }
 const FINAL=/^(です|ます|ました|ません|でした|ではありません|ではない)$/;
 function disjoint(a,b){for(const x of a)if(b.has(x))return false;return true;}
 function grammarQs(level,r,n,used){
  const pool=gByLevel[level],near=(gByLevel[LEVELS[LEVELS.indexOf(level)+1]]||[]).concat(gByLevel[LEVELS[LEVELS.indexOf(level)-1]]||[]);
  const out=[];
  for(const g of shuffle(r,pool)){
   if(out.length>=n)break;
   if(used.has(g.id))continue;
   const gc=cls(g);
   const base=shuffle(r,pool.concat(near)).filter(x=>x.answer!==g.answer&&!x.answer.includes(g.answer)&&!g.answer.includes(x.answer));
   const strict=base.filter(x=>disjoint(gc,cls(x))&&!(FINAL.test(x.answer)&&FINAL.test(g.answer)));
   const wrong=[];
   for(const x of strict.concat(base)){if(!wrong.includes(x.answer)){wrong.push(x.answer);if(wrong.length===3)break;}}
   if(wrong.length<3)continue;
   used.add(g.id);
   const p=place(r,g.answer,wrong);
   out.push({id:'',level,section:'grammar',type:'cloze',q:g.cloze+'　（'+g.translation+'）',passage:'',choices:p.choices,answer:p.answer,
    explain:'「'+g.word+'」：'+g.meaning+'。接续：'+g.construction+'。'+g.usage+' 例：'+g.example,source:'自动生成'});
  }
  return out;
 }

 /* ---- 公开 API ---- */
 function vocabSet(level,n,r){
  const used=new Set(),out=[];
  const mix=['read','read','write','meaning'];
  for(let i=0;i<n;i++){
   const q=vocabQ(level,r,mix[i%mix.length],i,used)||vocabQ(level,r,'meaning',i,used);
   if(q)out.push(q);
  }
  // 题型分组：读音 → 表记 → 语义（与真题的大题顺序一致）
  const order={read:0,write:1,meaning:2};
  return out.sort((a,b)=>order[a.type]-order[b.type]);
 }
 const SIZES={mini:{vocab:6,grammar:5,reading:2,listening:2,name:'迷你卷'},std:{vocab:14,grammar:10,reading:4,listening:4,name:'标准卷'},full:{vocab:28,grammar:18,reading:8,listening:8,name:'全真卷'}};
 /* 生成试卷骨架：vocab/grammar 离线生成；reading/listening 从 extra 里补，缺口记在 missing */
 async function buildPaper(level,sizeKey,extra,seed){
  await load();
  seed=seed||(Date.now()%1e9);
  const r=rng(seed),sz=SIZES[sizeKey]||SIZES.std;
  const sections=[],missing={};
  const sec=(key,qs)=>{qs.forEach((q,i)=>{q.id='g'+seed+'-'+key[0]+(i+1);});sections.push({key,qs});};
  sec('vocab',vocabSet(level,sz.vocab,r));
  const used=new Set();
  let gq=grammarQs(level,r,sz.grammar,used);
  if(gq.length<sz.grammar){ // 题库兜底
   const ex=(extra&&extra.grammar||[]).slice(0,sz.grammar-gq.length);gq=gq.concat(ex.map(q=>Object.assign({},q)));
  }
  sec('grammar',gq);
  for(const k of ['reading','listening']){
   const have=(extra&&extra[k]||[]).slice(0,sz[k]).map(q=>Object.assign({},q));
   if(have.length)sec(k,have);
   if(have.length<sz[k])missing[k]=sz[k]-have.length;
  }
  return {id:'p-'+seed,level,kind:'generated',title:level+' '+sz.name+' · #'+String(seed).slice(-4),createdAt:Date.now(),seed,size:sizeKey,sections,missing};
 }
 /* 无限专项：返回 n 道新题 */
 async function practice(level,section,n,type){
  await load();
  const r=rng(Date.now()%1e9+Math.floor(Math.random()*1e6));
  let qs=[];
  if(section==='vocab'){
   const used=new Set(),kinds=type&&type!=='all'?[type]:['read','write','meaning'];
   for(let i=0;i<n;i++){const q=vocabQ(level,r,kinds[i%kinds.length],i,used);if(q)qs.push(q);}
  }else if(section==='grammar')qs=grammarQs(level,r,n,new Set());
  const t=Date.now();qs.forEach((q,i)=>{q.id='gp'+t+'-'+i;});
  return qs;
 }
 return {load,buildPaper,practice,SIZES,LEVELS,cleanMeaning,_test:{mutations,vocabSet,grammarQs,rng}};
})();
