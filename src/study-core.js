(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.RikkaReview=factory();})(typeof self!=='undefined'?self:this,function(){
 'use strict';const DAY=86400000;
 function localDay(now=Date.now()){const d=new Date(now);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
 function normalize(s){return String(s||'').normalize('NFKC').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-96)).replace(/[\s・･]/g,'').trim();}
 function accepts(input,answer){const value=normalize(input);return !!value&&String(answer).split(/[／/、]/).some(a=>normalize(a)===value);}
 function schedule(previous,rating,now=Date.now()){
  if(!['again','hard','good','easy'].includes(rating))throw new Error('invalid review rating');
  const p=previous||{},old=Math.max(0,Number(p.interval)||0);let ease=Number(p.ease)||2.5,interval,streak=(p.streak||0)+1,lapses=p.lapses||0;
  if(rating==='again'){interval=0;streak=0;lapses++;ease=Math.max(1.3,ease-.2);}
  else if(rating==='hard'){interval=Math.max(1,Math.ceil(old*1.2));ease=Math.max(1.3,ease-.15);}
  else if(rating==='easy'){interval=old?Math.max(old+1,Math.ceil(old*ease*1.3)):4;ease=Math.min(3.2,ease+.1);}
  else interval=old?old<3?3:Math.max(old+1,Math.ceil(old*ease)):1;
  interval=Math.min(interval,365);return {...p,interval,ease,streak,lapses,reviews:(p.reviews||0)+1,firstSeen:p.firstSeen||now,lastSeen:now,due:rating==='again'?now+10*60000:now+interval*DAY,wrong:rating==='again'?true:streak>=2?false:!!p.wrong};
 }
 function mastered(p){return !!p&&p.interval>=21&&p.streak>=3;}
 function queue(items,progress,{now=Date.now(),limit=20,newLimit=10,mode='daily',usedNew=0}={}){
  const due=items.filter(i=>progress[i.id]&&progress[i.id].due<=now).sort((a,b)=>progress[a.id].due-progress[b.id].due);
  if(mode==='wrong')return items.filter(i=>progress[i.id]?.wrong).sort((a,b)=>(progress[b.id].lapses||0)-(progress[a.id].lapses||0)).slice(0,limit).map(i=>i.id);
  if(mode==='due')return due.slice(0,limit).map(i=>i.id);
  const fresh=items.filter(i=>!progress[i.id]).slice(0,Math.max(0,newLimit-usedNew));return [...due,...fresh].slice(0,limit).map(i=>i.id);
 }
 function sanitizeProgress(value,validIds){const clean={};if(!value||typeof value!=='object'||Array.isArray(value))return clean;
  for(const[id,p]of Object.entries(value)){if(!validIds.has(id)||!p||typeof p!=='object')continue;const num=(v,max)=>Math.min(max,Math.max(0,Number(v)||0));clean[id]={interval:num(p.interval,365),ease:Math.min(3.2,Math.max(1.3,Number(p.ease)||2.5)),streak:num(p.streak,100000),lapses:num(p.lapses,100000),reviews:num(p.reviews,100000),firstSeen:num(p.firstSeen,8640000000000000),lastSeen:num(p.lastSeen,8640000000000000),due:num(p.due,8640000000000000),wrong:!!p.wrong};}return clean;
 }
 return{schedule,queue,accepts,normalize,localDay,mastered,sanitizeProgress,DAY};
});
