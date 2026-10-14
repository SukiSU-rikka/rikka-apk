(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.HanaCore=factory();})(typeof self!=='undefined'?self:this,function(){
  'use strict';
  const kanji=/[\u3400-\u9fff\uf900-\ufaff\u{20000}-\u{2fa1f}々〆]/u;
  const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const hira=s=>String(s||'').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60));
  const regexEscape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  function rubyParts(surface,reading){
    if(!kanji.test(surface))return [{base:surface,reading:''}];
    reading=hira(reading);if(!reading||reading==='*')return [{base:surface,reading:'？',unknown:true}];
    const groups=surface.match(/[\u3400-\u9fff\uf900-\ufaff\u{20000}-\u{2fa1f}々〆]+|[^\u3400-\u9fff\uf900-\ufaff\u{20000}-\u{2fa1f}々〆]+/gu)||[surface];
    const rx=new RegExp('^'+groups.map(g=>kanji.test(g)?'(.+?)':regexEscape(hira(g))).join('')+'$','u');
    const match=reading.match(rx);if(!match)return [{base:surface,reading}];
    let idx=0;return groups.map(g=>({base:g,reading:kanji.test(g)?match[++idx]:''}));
  }
  function ruby(surface,reading){return rubyParts(surface,reading).map(p=>p.reading?'<ruby'+(p.unknown?' class="uncertain"':'')+'>'+escape(p.base)+'<rt>'+escape(p.reading)+'</rt></ruby>':escape(p.base)).join('');}
  function splitParagraphs(text,target=180){
    text=String(text).replace(/\r\n?/g,'\n').replace(/\u0000/g,'');target=Math.max(60,Math.min(2000,Number(target)||180));const result=[];let current='';
    const sentences=text.split(/\n/).map(x=>x.trim()).filter(Boolean).flatMap(p=>p.match(/[^。！？!?]+[。！？!?]+[」』）】”]*|[^。！？!?]+$/gu)||[p]);
    for(let sentence of sentences){if(current&&Array.from(current+sentence).length>target){result.push(current);current='';}
      while(Array.from(sentence).length>target*1.8){const chars=Array.from(sentence);let end=Math.min(target,chars.length),head=chars.slice(0,end).join(''),cut=head.search(/[、，,；;][^、，,；;]*$/u);if(cut>head.length*.5)end=Array.from(head.slice(0,cut+1)).length;result.push(chars.slice(0,end).join(''));sentence=chars.slice(end).join('');}current+=sentence;}
    if(current)result.push(current);return result;
  }
  function endpoint(url){
    let u;try{u=new URL(String(url).trim());}catch(e){throw new Error('请填写完整的 HTTPS 服务地址');}
    if(u.protocol!=='https:'||u.username||u.password||u.hash||u.search)throw new Error('服务地址必须使用 HTTPS，且不能含账号、查询参数或片段');
    let path=u.pathname.replace(/\/+$/,'');if(!path.endsWith('/chat/completions'))path+='/chat/completions';u.pathname=path;return u.toString();
  }
  function jsonObject(raw){
    if(typeof raw!=='string')throw new Error('AI 返回的内容不是文本');
    const clean=raw.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
    try{return JSON.parse(clean);}catch(e){const a=clean.indexOf('{'),b=clean.lastIndexOf('}');if(a>=0&&b>a)try{return JSON.parse(clean.slice(a,b+1));}catch(ignore){}throw new Error('AI 没有返回可解析的 JSON，请重试或更换模型');}
  }
  function cleanString(s,max=6000){return typeof s==='string'?s.slice(0,max):'';}
  function validateAnalysis(raw,text){
    const data=typeof raw==='string'?jsonObject(raw):raw;
    if(!data||typeof data.translation!=='string'||!Array.isArray(data.vocabulary)||!Array.isArray(data.grammar))throw new Error('解析缺少翻译、词汇或语法字段，请重试');
    const vocabulary=data.vocabulary.filter(v=>v&&typeof v.word==='string'&&v.word.length&&typeof v.surface==='string'&&v.surface.length&&text.includes(v.surface)).slice(0,18).map(v=>({word:cleanString(v.word,60),surface:cleanString(v.surface,80),reading:cleanString(v.reading,100),meaning:cleanString(v.meaning,1000),level:cleanString(v.level,12),form:cleanString(v.form,1500),origin:cleanString(v.origin,100)}));
    const grammar=data.grammar.filter(g=>g&&typeof g.name==='string'&&typeof g.evidence==='string'&&g.evidence.length&&text.includes(g.evidence)).slice(0,12).map(g=>({name:cleanString(g.name,100),level:cleanString(g.level,12),construction:cleanString(g.construction,800),meaning:cleanString(g.meaning,800),usage:cleanString(g.usage,1800),evidence:cleanString(g.evidence,1000),example:cleanString(g.example,600),translation:cleanString(g.translation,600)}));
    return {translation:cleanString(data.translation,9000),vocabulary,grammar,source:'ai',at:Date.now()};
  }
  function validateNovel(raw){const d=typeof raw==='string'?jsonObject(raw):raw;if(!d||typeof d.text!=='string'||!/[\u3041-\u30ff]/.test(d.text)||d.text.length<80)throw new Error('返回的小说内容不完整，请重试');if(d.text.length>30000)throw new Error('生成内容过长，请减少每次字数');let readings=null;if(d.readings&&typeof d.readings==='object'&&!Array.isArray(d.readings)){readings={};for(const[k,v]of Object.entries(d.readings)){if(typeof k==='string'&&typeof v==='string'&&k.length>=1&&k.length<=12&&/^[ぁ-ん]+$/.test(v.trim())&&/[㐀-䶿一-鿿々〆]/.test(k))readings[k]=v.trim();}if(!Object.keys(readings).length)readings=null;}return {title:cleanString(d.title,80)||'未命名的故事',text:d.text.trim(),summary:cleanString(d.summary,2000),readings};}
  function nextReview(card,rating,now=Date.now()){
    const count=Math.max(0,Number(card.reviews)||0)+1;
    if(rating==='again')return {...card,reviews:count,interval:0,due:now+10*60000};
    const previous=Number(card.interval)||0;const days=rating==='easy'?Math.max(4,Math.round(previous*3)):previous<1?1:Math.round(previous*2.2);
    return {...card,reviews:count,interval:Math.min(days,365),due:now+Math.min(days,365)*86400000};
  }
  return {kanji,escape,hira,rubyParts,ruby,splitParagraphs,endpoint,jsonObject,validateAnalysis,validateNovel,nextReview};
});
