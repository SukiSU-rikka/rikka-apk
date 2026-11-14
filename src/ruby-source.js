// 原文自带注音（作者 / 青空文库标注的 ruby）
// 作者亲手标的读音一定比自动分析可靠：导入时把 ruby 抽出来单独保存，
// 阅读时按位置覆盖自动注音。正文本身保持干净（朗读、AI 分析不受影响）。
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.RikkaSourceRuby=factory();})(typeof self!=='undefined'?self:this,()=>{
 'use strict';
 const PREFIX=6;
 const KANJI_CH=/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u{20000}-\u{2ffff}々〆ヵヶ〇]/u;
 const KANJI_TAIL=/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u{20000}-\u{2ffff}々〆ヵヶ〇]+$/u;
 const KATA_TAIL=/[ァ-ヺー]+$/u;
 const hira=s=>String(s||'').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-96));

 // 逐段拼正文，同时记录 [前文(同一行内最多6字), 底字, 读音]
 class Builder{
  constructor(){this.parts=[];this.line='';this.entries=[];}
  text(s){s=String(s||'');if(!s)return;this.parts.push(s);const nl=s.lastIndexOf('\n');this.line=nl>=0?s.slice(nl+1):(this.line+s);if(this.line.length>64)this.line=this.line.slice(-64);}
  ruby(base,reading){
   base=String(base||'').replace(/\s+/g,'');reading=String(reading||'').replace(/\s+/g,'');
   if(!base)return;
   if(!reading||reading===base||!KANJI_CH.test(base)||/[《》｜|]/.test(reading)){this.text(base);return;}
   this.entries.push([this.line.slice(-PREFIX),base,reading]);this.text(base);
  }
  done(){return{text:this.parts.join(''),ruby:this.entries};}
 }

 // 青空文库：｜底字《よみ》 或 漢字《よみ》（底字为紧挨着的汉字串）
 function fromAozora(src){
  const b=new Builder();const rx=/｜([^｜《》\n]+)《([^》\n]*)》|《([^》\n]*)》/g;let last=0,m;
  while((m=rx.exec(src))){
   let before=src.slice(last,m.index);
   if(m[1]!==undefined){b.text(before.replace(/｜/g,''));b.ruby(m[1],m[2]);}
   else{
    before=before.replace(/｜/g,'');
    const k=before.match(KANJI_TAIL)||before.match(KATA_TAIL);
    if(k){b.text(before.slice(0,before.length-k[0].length));b.ruby(k[0],m[3]);}
    else b.text(before);
   }
   last=rx.lastIndex;
  }
  b.text(src.slice(last).replace(/｜/g,''));
  return b.done();
 }

 // 同一词在全书里读法一致、且是平假名读音 → 也用于没标注音的地方
 // （なろう 作者通常只在人名第一次出现时标注音）
 function globalMap(entries){
  const seen=new Map();
  for(const [,base,rd] of entries||[]){
   if(Array.from(base).length<2||!/^[\u3400-\u9fff々〆ヶ]+$/u.test(base)||!/^[ぁ-ゖー]+$/.test(rd))continue;
   const s=seen.get(base)||new Set();s.add(rd);seen.set(base,s);
  }
  const out={};for(const [base,set] of seen)if(set.size===1)out[base]=[...set][0];
  return out;
 }

 // 在一段文字里定位注音位置
 function locate(text,entries){
  const spans=[];
  for(const e of entries||[]){
   const pre=e[0]||'',base=e[1],rd=e[2];if(!base)continue;
   let k=text.indexOf(base);
   while(k>=0){
    const L=pre.length;let before=text.slice(Math.max(0,k-L),k);
    const nl=before.lastIndexOf('\n');const atStart=k-L<0||nl>=0;if(nl>=0)before=before.slice(nl+1);
    if(pre.endsWith(before)&&(before.length===L||atStart))spans.push([k,k+base.length,rd]);
    k=text.indexOf(base,k+1);
   }
  }
  spans.sort((a,b)=>a[0]-b[0]||(b[1]-b[0])-(a[1]-a[0]));
  const out=[];let end=-1;for(const s of spans){if(s[0]>=end){out.push(s);end=s[1];}}
  return out;
 }

 // tokens: 分词器输出 {s,r,rp,rpr,...}；把作者注音覆盖上去
 function apply(tokens,text,entries){
  if(!entries||!entries.length||!tokens.length)return tokens;
  const spans=locate(text,entries);if(!spans.length)return tokens;
  if(tokens.map(t=>t.s).join('')!==text)return tokens; // 对不上就不动，绝不乱套
  for(let si=spans.length-1;si>=0;si--){
   const [a,b,rd]=spans[si];
   const off=[];let p=0;for(const t of tokens){off.push(p);p+=t.s.length;}
   let i=-1,j=-1;
   for(let x=0;x<tokens.length;x++){const s=off[x],e=s+tokens[x].s.length;if(i<0&&a>=s&&a<e)i=x;if(b>s&&b<=e){j=x;break;}}
   if(i<0||j<0||j<i)continue;
   // 把覆盖范围内的 token 注音分块拼起来
   let parts=[];
   for(let x=i;x<=j;x++){
    const t=tokens[x];
    const ps=(t.rp&&t.rpr===t.r)?t.rp:[{base:t.s,reading:KANJI_CH.test(t.s)?(t.r||''):''}];
    parts.push(...ps.map(q=>({...q})));
   }
   const relA=a-off[i],relB=b-off[i];
   // 切开纯假名块，使边界对齐；汉字块切不开就放弃（保持自动注音）
   const cut=pos=>{let c=0;for(let x=0;x<parts.length;x++){const L=parts[x].base.length;if(pos===c)return true;if(pos>c&&pos<c+L){if(parts[x].reading&&KANJI_CH.test(parts[x].base))return false;parts.splice(x,1,{base:parts[x].base.slice(0,pos-c),reading:''},{base:parts[x].base.slice(pos-c),reading:''});return true;}c+=L;}return pos===c;};
   if(!cut(relA)||!cut(relB))continue;
   let c=0;const np=[];let placed=false;
   for(const q of parts){const L=q.base.length;if(c>=relA&&c+L<=relB){if(!placed){np.push({base:text.slice(a,b),reading:rd,author:true});placed=true;}}else np.push(q);c+=L;}
   const r=np.map(q=>q.reading?hira(q.reading):hira(q.base)).join('');
   const surface=tokens.slice(i,j+1).map(t=>t.s).join('');
   const head=tokens[i];
   const merged=i===j?{...head}:{...head,b:surface,merged:true};
   Object.assign(merged,{s:surface,r,rp:np,rpr:r,source:'author',uncertain:false,unknown:false,needsAi:false,readings:[r]});
   tokens.splice(i,j-i+1,merged);
  }
  return tokens;
 }

 // 只挑当前这段用得到的注音，减小传给分词线程的数据
 function forText(text,entries){const out=[];if(!Array.isArray(entries))return out;for(const e of entries)if(Array.isArray(e)&&typeof e[0]==='string'&&typeof e[1]==='string'&&typeof e[2]==='string'&&e[1]&&text.indexOf(e[1])>=0)out.push(e);return out;}

 return{Builder,fromAozora,globalMap,locate,apply,forText,hira};
});
