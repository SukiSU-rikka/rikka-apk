'use strict';
/* 六花设置页（3.5.0 重做）
 * 不改动任何设置项的 id 和保存逻辑，只重新组织界面：
 *  首页 = 搜索 + 常用 + 分类列表；点分类进入子页面；子页面里多个面板变成顶部标签，一次只显示一个；
 *  勾选框变开关、下拉框和标题同一行、长说明默认折叠两行。
 *  app.js 里原有的 `$('#settings-ai').open=true` 之类的调用照样有效（会自动进入对应子页面）。
 */
window.RikkaSettingsUI=(()=>{
 const TAB_KEY='rikka_set_tabs';
 const ICON={
  'settings-reading':'<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/>',
  'settings-appearance':'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  'settings-story':'<path d="M12 3l2.4 5.6L20 9.3l-4.3 3.9 1.2 5.8L12 16.1 7.1 19l1.2-5.8L4 9.3l5.6-.7z"/>',
  'settings-voice':'<path d="M11 5L6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>',
  'settings-ai':'<path d="M12 3v3M12 18v3M3 12h3M18 12h3"/><rect x="7" y="7" width="10" height="10" rx="3"/><circle cx="12" cy="12" r="1.5"/>',
  'settings-data':'<path d="M4 7c0-2 3.6-3 8-3s8 1 8 3-3.6 3-8 3-8-1-8-3zM4 7v10c0 2 3.6 3 8 3s8-1 8-3V7M4 12c0 2 3.6 3 8 3s8-1 8-3"/>'
 };
 const SHORT={'导航与阅读记忆':'导航','阅读显示':'显示','主题与动态效果':'主题','我的图片背景':'背景','用自己的图片做图标':'图标','创作偏好':'创作','备份与恢复':'备份','关于六花':'关于'};
 let host,home,head,groups=[],index=[],current=null,ready=false;
 const svg=p=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+p+'</svg>';
 const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const tabs=()=>{try{return JSON.parse(localStorage.getItem(TAB_KEY)||'{}')||{};}catch(e){return{};}};
 const fire=(el,type)=>el&&el.dispatchEvent(new Event(type,{bubbles:true}));

 // ── 结构整理 ──
 function rowOf(el){
  if(!el)return[];const cr=el.closest('label.check-row');if(cr)return[cr];
  const lab=el.id&&el.parentElement?.querySelector(':scope > label[for="'+el.id+'"]');
  return lab?[lab,el]:[el];
 }
 function splitAI(){
  const panel=document.querySelector('#settings-ai .settings-section > .panel');if(!panel||panel.dataset.split)return;
  panel.dataset.split='1';panel.dataset.tab='连接';
  const sec=panel.parentElement;
  const mk=(tab,title)=>{const p=document.createElement('div');p.className='panel';p.dataset.tab=tab;p.innerHTML='<h2>'+title+'</h2>';sec.appendChild(p);return p;};
  const feat=mk('功能','AI 功能'),use=mk('用量','用量与余额');
  const move=(els,to)=>els.forEach(e=>e&&to.appendChild(e));
  ['auto-ai','ai-furigana','word-ai','preparse-words','preparse-all'].forEach(id=>move(rowOf(document.getElementById(id)),feat));
  move(rowOf(document.getElementById('word-model')),feat);
  const usage=panel.querySelector('.usage-panel');
  if(usage){const after=usage.nextElementSibling;move([usage],use);if(after&&after.matches('p.hint:not([id])'))move([after],feat);}
  move([panel.querySelector('.api-balance')],use);
 }
 function wrapRows(root){
  root.querySelectorAll('label.field-label:not(.label-row)').forEach(lab=>{
   const nx=lab.nextElementSibling;if(!nx||nx.tagName!=='SELECT'||lab.parentElement.classList.contains('set-row'))return;
   const row=document.createElement('div');row.className='set-row';lab.before(row);row.append(lab,nx);
  });
  root.querySelectorAll('p.hint:not([id]):not(.status-line)').forEach(p=>{if(p.textContent.trim().length>38&&!p.classList.contains('clamp')){p.classList.add('clamp');p.addEventListener('click',()=>p.classList.toggle('open'));}});
  root.querySelectorAll('.button-row').forEach(r=>r.classList.add('compact-buttons'));
 }

 // ── 首页 ──
 function groupInfo(d){const b=d.querySelector(':scope > summary b'),sm=d.querySelector(':scope > summary small');return{id:d.id,title:b?b.textContent:d.id,sub:sm?sm.textContent:''};}
 function liveSub(id){
  const sel=x=>{const el=document.getElementById(x);return el&&el.selectedIndex>=0?el.options[el.selectedIndex].text:'';};
  const val=x=>document.getElementById(x)?.value||'';
  try{
   if(id==='settings-reading')return'字号 '+val('font-size')+' · 假名 '+sel('ruby-mode');
   if(id==='settings-appearance')return'主题：'+sel('theme-mode')+(sel('fx-overlay')&&!/关|无/.test(sel('fx-overlay'))?' · '+sel('fx-overlay'):'');
   if(id==='settings-voice'){const e=sel('voice-engine').split(/[（(/]/)[0].trim();const sp=document.getElementById('vv-speaker');const v=sp&&sp.value?sp.options[sp.selectedIndex].text.split('　')[0]:'';return e+(v&&document.getElementById('voice-engine').value==='voicevox'?' · '+v:'')+(document.getElementById('voice-cast')?.checked?' · 广播剧':'');}
   if(id==='settings-ai'){const ok=window.HanaAI?.configured?.();return ok?('已连接 · '+(val('profile-name')||sel('ai-provider'))+(val('ai-model')?' · '+val('ai-model'):'')):'未配置：解析、翻译、广播剧需要它';}
   if(id==='settings-story')return'默认难度 '+sel('default-level')+' · '+sel('default-style');
   if(id==='settings-data')return(document.querySelector('#view-settings .version')?.textContent||'').replace(' · Android 8.0+','')+' · 备份与恢复';
  }catch(e){}
  return'';
 }
 function buildHome(){
  home=document.createElement('div');home.id='set-home';
  home.innerHTML='<label class="set-search">'+svg('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>')+'<input id="set-search" type="search" placeholder="搜索设置，例如：后台听书、字号、API" autocomplete="off"></label>'+
   '<div id="set-results" class="set-card hidden"></div>'+
   '<div id="set-quick" class="set-card"></div>'+
   '<div id="set-list" class="set-card"></div>';
  host.querySelector('h1').after(home);
  home.querySelector('#set-search').addEventListener('input',e=>search(e.target.value));
 }
 function renderHome(){
  // 分类
  $('#set-list').innerHTML=groups.map(g=>{const i=groupInfo(g);return'<button class="set-item" data-open="'+i.id+'"><span class="set-ico">'+svg(ICON[i.id]||ICON['settings-data'])+'</span><span class="set-txt"><b>'+esc(i.title)+'</b><small>'+esc(liveSub(i.id)||i.sub)+'</small></span><span class="set-chev">›</span></button>';}).join('');
  $$('#set-list [data-open]').forEach(b=>b.onclick=()=>open(b.dataset.open));
  // 常用
  const font=document.getElementById('font-size'),ruby=document.getElementById('ruby-mode'),theme=document.getElementById('theme-mode');
  const seg=(sel,key)=>sel?'<div class="seg" data-mirror="'+key+'">'+[...sel.options].map(o=>'<button data-v="'+esc(o.value)+'"'+(o.value===sel.value?' class="on"':'')+'>'+esc(o.text.replace(/（.*?）|\(.*?\)/g,'').slice(0,6))+'</button>').join('')+'</div>':'';
  const engine=document.getElementById('voice-engine');
  $('#set-quick').innerHTML='<div class="set-quick-head">常用</div>'+
   (font?'<div class="q-row"><span>正文字号</span><span class="stepper"><button data-step="-1" aria-label="减小">A−</button><b id="q-font">'+esc(font.value)+'</b><button data-step="1" aria-label="增大">A+</button></span></div>':'')+
   (ruby?'<div class="q-row col"><span>假名显示</span>'+seg(ruby,'ruby-mode')+'</div>':'')+
   (theme&&theme.options.length<=6?'<div class="q-row col"><span>主题</span>'+seg(theme,'theme-mode')+'</div>':'')+
   (engine?'<div class="q-row"><span>朗读<small>'+esc(liveSub('settings-voice'))+'</small></span><span class="q-actions"><button class="chip-btn" data-q="test">▶ 试听</button><button class="chip-btn" data-q="voice">调整</button></span></div>':'');
  $$('#set-quick [data-step]').forEach(b=>b.onclick=()=>{const f=document.getElementById('font-size');const v=Math.max(Number(f.min||10),Math.min(Number(f.max||40),Number(f.value)+Number(b.dataset.step)*Number(f.step||1)));f.value=v;fire(f,'input');fire(f,'change');$('#q-font').textContent=f.value;});
  $$('#set-quick [data-mirror]').forEach(w=>w.querySelectorAll('button').forEach(b=>b.onclick=()=>{const sel=document.getElementById(w.dataset.mirror);sel.value=b.dataset.v;fire(sel,'change');fire(sel,'input');w.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));setTimeout(renderHome,50);}));
  const qt=home.querySelector('[data-q="test"]');if(qt)qt.onclick=()=>document.getElementById('voice-test')?.click();
  const qv=home.querySelector('[data-q="voice"]');if(qv)qv.onclick=()=>open('settings-voice');
 }

 // ── 搜索 ──
 function buildIndex(){
  index=[];
  groups.forEach(g=>{
   const gt=groupInfo(g).title;
   g.querySelectorAll('.settings-section > .panel').forEach(p=>{
    const pt=p.dataset.tab||'';
    const add=(el,text,title)=>{text=String(text||'').replace(/\s+/g,' ').trim();if(text.length>1)index.push({el,text,title:String(title||text).replace(/\s+/g,' ').trim(),gid:g.id,panel:p,where:gt+(pt?' › '+pt:'')});};
    p.querySelectorAll('label.check-row').forEach(el=>{const b=el.querySelector('b');add(el,el.textContent,b?b.textContent:el.textContent);});
    p.querySelectorAll('label.field-label').forEach(el=>add(el.closest('.set-row')||el,el.textContent));
    p.querySelectorAll('h2,h3,details>summary').forEach(el=>add(el,el.textContent));
    p.querySelectorAll('button').forEach(el=>{if(!el.closest('.seg'))add(el,el.textContent);});
   });
  });
 }
 function search(q){
  q=q.trim().toLowerCase();const box=$('#set-results');
  $('#set-quick').classList.toggle('hidden',!!q);$('#set-list').classList.toggle('hidden',!!q);box.classList.toggle('hidden',!q);
  if(!q)return;
  const words=q.split(/\s+/);const hits=index.filter(it=>words.every(w=>it.text.toLowerCase().includes(w)||it.where.toLowerCase().includes(w))).slice(0,30);
  box.innerHTML=hits.length?hits.map((h,i)=>'<button class="set-item res" data-hit="'+i+'"><span class="set-txt"><b>'+esc(h.text.slice(0,48))+'</b><small>'+esc(h.where)+'</small></span><span class="set-chev">›</span></button>').join(''):'<p class="hint" style="padding:14px 16px">没有找到“'+esc(q)+'”相关的设置</p>';
  box.querySelectorAll('[data-hit]').forEach(b=>b.onclick=()=>{const h=hits[Number(b.dataset.hit)];reveal(h);});
 }
 function reveal(h){
  open(h.gid,h.panel.dataset.tab);
  setTimeout(()=>{h.el.scrollIntoView({block:'center',behavior:'smooth'});h.el.classList.add('set-flash');setTimeout(()=>h.el.classList.remove('set-flash'),1600);},120);
 }

 // ── 子页面与标签 ──
 function panelsOf(g){return[...g.querySelectorAll(':scope > .settings-section > .panel')];}
 function tabName(p){if(p.dataset.tab)return p.dataset.tab;const h=p.querySelector('h2');const t=h?h.textContent.trim():'';return SHORT[t]||t.slice(0,6)||'设置';}
 function renderTabs(g){
  const ps=panelsOf(g);const bar=head.querySelector('.set-tabs');
  ps.forEach(p=>{if(!p.dataset.tab)p.dataset.tab=tabName(p);});
  const vis=ps.filter(p=>!p.classList.contains('hidden'));
  let want=g.dataset.tab;if(!vis.some(p=>p.dataset.tab===want))want=(vis.find(p=>p.dataset.tab===tabs()[g.id])||vis[0]||{}).dataset?.tab;
  g.dataset.tab=want||'';
  ps.forEach(p=>p.classList.toggle('tab-off',p.dataset.tab!==want));
  bar.classList.toggle('hidden',vis.length<2);
  bar.innerHTML=vis.map(p=>'<button data-tab="'+esc(p.dataset.tab)+'"'+(p.dataset.tab===want?' class="on"':'')+'>'+esc(p.dataset.tab)+'</button>').join('');
  bar.querySelectorAll('button').forEach(b=>b.onclick=()=>selectTab(g,b.dataset.tab,true));
 }
 function selectTab(g,name,user){
  g.dataset.tab=name;const t=tabs();t[g.id]=name;try{localStorage.setItem(TAB_KEY,JSON.stringify(t));}catch(e){}
  renderTabs(g);if(user)$('#main').scrollTo({top:0});
 }
 function open(id,tab){
  const g=document.getElementById(id);if(!g)return;
  if(tab)g.dataset.tab=tab;
  if(!g.open)g.open=true;else enter(g);
 }
 function enter(g){
  current=g;host.classList.add('in-page');
  groups.forEach(x=>{if(x!==g&&x.open)x.open=false;});
  const i=groupInfo(g);
  head.querySelector('.set-title b').textContent=i.title;
  head.querySelector('.set-title small').textContent=liveSub(g.id)||i.sub;
  renderTabs(g);
  $('#main').scrollTo({top:0});
 }
 function leave(){
  if(!current)return;const g=current;current=null;host.classList.remove('in-page');
  if(g.open)g.open=false;renderHome();$('#main').scrollTo({top:0});
 }
 function onToggle(e){
  const g=e.target;if(!g.classList||!g.classList.contains('settings-group'))return;
  if(g.open)enter(g);else if(current===g)leave();
 }

 function init(){
  host=document.getElementById('view-settings');if(!host||ready)return;ready=true;
  host.classList.add('set-v2');
  groups=[...host.querySelectorAll('.settings-group')];
  splitAI();
  groups.forEach(g=>wrapRows(g));
  head=document.createElement('div');head.id='set-page-head';
  head.innerHTML='<div class="set-head-row"><button class="set-back" aria-label="返回">‹</button><span class="set-title"><b></b><small></small></span></div><div class="set-tabs hidden"></div>';
  host.querySelector('h1').after(head);
  head.querySelector('.set-back').onclick=leave;
  buildHome();renderHome();buildIndex();
  host.addEventListener('toggle',onToggle,true);
  // 面板显示/隐藏（比如切换朗读来源后 GPT-SoVITS 面板出现）时，同步标签
  const mo=new MutationObserver(()=>{if(current)renderTabs(current);});
  groups.forEach(g=>panelsOf(g).forEach(p=>mo.observe(p,{attributes:true,attributeFilter:['class']})));
  // 设置值变化后，首页分类下的摘要跟着更新
  host.addEventListener('change',()=>{if(!current)setTimeout(renderHome,30);},true);
  const opened=groups.find(g=>g.open);if(opened)enter(opened);
  // 系统返回键：先退出子页面
  const wrapBack=()=>{const ob=window.handleBack;if(typeof ob!=='function'||ob.__set)return setTimeout(wrapBack,300);const nb=function(){if(typeof view!=='undefined'&&view==='settings'&&current&&!document.getElementById('dialog')?.open){leave();return true;}return ob.apply(this,arguments);};nb.__set=true;window.handleBack=nb;};
  wrapBack();
 }
 function refresh(){if(!ready)return;if(current){const i=groupInfo(current);head.querySelector('.set-title small').textContent=liveSub(current.id)||i.sub;renderTabs(current);}else renderHome();}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
 return{init,open,leave,refresh};
})();
