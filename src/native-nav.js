'use strict';
/* 六花 · 原生液态玻璃底栏的网页侧（只在外壳提供 window.RikkaGlass 时启用）
 * 网页底栏 #bottom-nav 仍然负责：入口显隐、选中项、路由（data-nav 点击）——这些逻辑一行没改。
 * 本文件只做三件事：把底栏状态（入口、选中项、显隐、位置、主题色）同步给原生栏；
 * 原生栏点击时，代点对应的网页按钮；网页滚动时通知原生栏刷新玻璃。 */
window.RikkaGlassNav=(()=>{
 const G=()=>window.RikkaGlass;
 const png=new Map(); // 图标名 -> PNG data URL（白色，原生侧再按主题色着色）
 let last='',raf=0;
 async function iconPng(name){
  if(png.has(name))return png.get(name);
  const sym=document.getElementById('i-'+name);
  if(!sym){png.set(name,'');return '';}
  const vb=sym.getAttribute('viewBox')||'0 0 24 24';
  const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+vb+'" width="72" height="72" color="#fff" fill="none" stroke="#fff" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">'+sym.innerHTML+'</svg>';
  const url=await new Promise(res=>{
   const img=new Image();
   img.onload=()=>{try{const c=document.createElement('canvas');c.width=c.height=72;c.getContext('2d').drawImage(img,0,0,72,72);res(c.toDataURL('image/png'));}catch(e){res('');}};
   img.onerror=()=>res('');
   img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
  });
  png.set(name,url);return url;
 }
 async function push(){
  if(!G())return;
  const nav=document.getElementById('bottom-nav');if(!nav)return;
  const btns=[...nav.querySelectorAll('.nav-button')];
  const items=[];
  for(const b of btns){
   const use=b.querySelector('use');const name=((use&&(use.getAttribute('href')||use.getAttribute('xlink:href')))||'').replace(/^#i-/,'');
   items.push({id:b.dataset.nav,label:(b.querySelector('span')||{}).textContent||'',icon:name,png:await iconPng(name)});
  }
  const cs=getComputedStyle(document.body),v=k=>cs.getPropertyValue(k).trim();
  const r=nav.getBoundingClientRect();
  const st={
   items,active:btns.findIndex(b=>b.classList.contains('active')),
   visible:getComputedStyle(nav).display!=='none'&&r.width>0,
   dark:document.body.classList.contains('dark'),motion:!document.body.classList.contains('fx-still'),
   primary:v('--primary'),surface:v('--paper'),outline:v('--border'),
   rect:{left:r.left,right:innerWidth-r.right,bottom:innerHeight-r.bottom},dpr:devicePixelRatio||1
  };
  const json=JSON.stringify(st);
  if(json!==last){last=json;try{G().update(json);}catch(e){}}
 }
 const schedule=()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;push();});};
 // 原生栏点击 → 代点网页按钮，走原来的 data-nav 路由
 function tap(id){const b=document.querySelector('#bottom-nav [data-nav="'+String(id).replace(/"/g,'')+'"]');if(b)b.click();}
 function start(){
  if(!G())return;
  document.body.classList.add('native-nav');
  const s=document.createElement('style');
  s.textContent='body.native-nav #bottom-nav{visibility:hidden}'; // 保留占位与显隐规则，只是不画
  document.head.appendChild(s);
  const nav=document.getElementById('bottom-nav');
  new MutationObserver(schedule).observe(nav,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  new MutationObserver(schedule).observe(document.body,{attributes:true,attributeFilter:['class','data-view','data-theme','style']});
  addEventListener('resize',schedule);if(window.visualViewport)visualViewport.addEventListener('resize',schedule);
  let sr=0;
  document.addEventListener('scroll',()=>{if(sr)return;sr=requestAnimationFrame(()=>{sr=0;try{G().dirty();}catch(e){}});},{capture:true,passive:true});
  schedule();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
 return{push:schedule,tap};
})();
