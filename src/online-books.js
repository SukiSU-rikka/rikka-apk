window.RikkaOnlineBooks=(()=>{
const AOZORA_MIRRORS=[
'https://cdn.jsdelivr.net/gh/aozorahack/aozorabunko_text@master/',
'https://raw.githubusercontent.com/aozorahack/aozorabunko_text/master/'
];
let aozoraIndex=null,authorMap=null,bundledIndex=null,aozoraTimer=0,aozoraMode='search';

function $(s){return document.querySelector(s);}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

// 青空名作：全文内置于 aozora-picks/，离线可导入
let aozoraPicks=null;
const aozoraPickByPath={};
async function loadAozoraPicks(){
if(aozoraPicks)return aozoraPicks;
const r=await fetch('aozora-picks/index.json');
if(!r.ok)throw new Error('内置名作缺失，请更新 App');
aozoraPicks=await r.json();
for(const p of aozoraPicks)aozoraPickByPath[p.p]=p;
return aozoraPicks;
}

function switchTab(name){
document.querySelectorAll('[data-otab]').forEach(b=>b.classList.toggle('active',b.dataset.otab===name));
document.querySelectorAll('.otab').forEach(p=>p.classList.toggle('hidden',p.id!=='otab-'+name));
if(name==='bundled')loadBundled();
}

/* ---------- 青空文库 ---------- */
async function loadAozoraIndex(statusEl){
if(aozoraIndex)return aozoraIndex;
if(statusEl)statusEl.textContent='正在加载作品索引（约 2 MB，仅首次需要）…';
const r=await fetch('aozora-index.json');
if(!r.ok)throw new Error('索引文件缺失，请更新 App');
aozoraIndex=await r.json();
// 构建作者映射
authorMap={};
for(const e of aozoraIndex){
const a=e[1]||'佚名';
(authorMap[a]=authorMap[a]||[]).push(e);
}
if(statusEl)statusEl.textContent='已载入 '+aozoraIndex.length.toLocaleString()+' 部作品，可离线搜索。';
return aozoraIndex;
}
function searchAozora(q){
q=q.trim();if(!q||q.length<1)return[];
const out=[],ql=q.toLowerCase();
for(const e of aozoraIndex){
if(e[0].indexOf(q)>=0||e[1].indexOf(q)>=0||e[0].toLowerCase().indexOf(ql)>=0)out.push(e);
if(out.length>=60)break;
}
return out;
}
function renderAuthorList(){
const box=$('#aozora-results'),status=$('#aozora-status');
const authors=Object.keys(authorMap).sort();
status.textContent='共 '+authors.length+' 位作者，点击查看作品。';
// 只显示作品数>=3的作者，避免列表过长
const major=authors.filter(a=>authorMap[a].length>=3);
const minor=authors.length-major.length;
box.innerHTML='<div class="author-grid">'+major.map(a=>'<button class="online-item author" data-author="'+esc(a)+'"><b>'+esc(a)+'</b><span>'+authorMap[a].length+' 部</span></button>').join('')+'</div>'
+(minor?'<p class="hint">另有 '+minor+' 位作品较少的作者，可用上方搜索查找。</p>':'');
box.querySelectorAll('[data-author]').forEach(b=>b.onclick=()=>renderAuthorWorks(b.dataset.author));
}
function renderAuthorWorks(author){
const box=$('#aozora-results'),status=$('#aozora-status');
const list=authorMap[author]||[];
status.textContent=author+' · '+list.length+' 部，点击下载导入。';
box.innerHTML='<button class="text-button" id="author-back">← 返回作者列表</button><div style="height:8px"></div>'
+list.slice(0,100).map((e,i)=>'<button class="online-item" data-awork="'+i+'"><b>'+esc(e[0])+'</b></button>').join('')
+(list.length>100?'<p class="hint">仅显示前 100 部，可用搜索精确查找。</p>':'');
$('#author-back').onclick=renderAuthorList;
box.querySelectorAll('[data-awork]').forEach(b=>b.onclick=()=>importAozora(list[+b.dataset.awork],b));
}
function setAozoraMode(m){
aozoraMode=m;
document.querySelectorAll('[data-amode]').forEach(b=>b.classList.toggle('active',b.dataset.amode===m));
$('#aozora-search-row').classList.toggle('hidden',m!=='search');
if(m==='author'){
const status=$('#aozora-status');
loadAozoraIndex(status).then(renderAuthorList).catch(e=>{status.textContent=e.message;});
}else{
$('#aozora-results').innerHTML='';
const st=$('#aozora-status');
if(aozoraIndex)st.textContent='已载入 '+aozoraIndex.length.toLocaleString()+' 部作品，可离线搜索。';
}
}
function cleanAozora(text){
const lines=text.split(/\r?\n/);
const isDash=l=>/^-{8,}\s*$/.test(l);
let start=0,lastDash=-1;
const headEnd=Math.min(80,lines.length);
for(let i=0;i<headEnd;i++){if(isDash(lines[i]))lastDash=i;}
if(lastDash>=0)start=lastDash+1;
let end=lines.length;
for(let i=lines.length-1;i>start;i--){
if(lines[i].trim().indexOf('底本：')===0){end=i;break;}
}
if(end===lines.length){
for(let i=lines.length-1;i>start;i--){
if(isDash(lines[i])){
const tail=lines.slice(i+1).join('\n');
if(/底本|青空文庫作成ファイル/.test(tail)){end=i;}
break;
}
}
}
let body=lines.slice(start,end).join('\n');
body=body.replace(/\n*青空文庫作成ファイル：[\s\S]*$/,'');
body=body.replace(/［＃[^］]*］/g,'');
body=body.replace(/《[^》]*》/g,'');
body=body.replace(/｜/g,'');
body=body.replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
return body;
}
async function decodeSmart(buf){
const bytes=new Uint8Array(buf);
const cands=[];
try{cands.push(['shift-jis',new TextDecoder('shift-jis').decode(bytes)]);}catch(e){}
try{cands.push(['utf-8',new TextDecoder('utf-8').decode(bytes)]);}catch(e){}
try{cands.push(['euc-jp',new TextDecoder('euc-jp').decode(bytes)]);}catch(e){}
let best='',bestScore=Infinity;
for(const[,t]of cands){
const bad=(t.match(/\uFFFD/g)||[]).length;
const score=bad*1000000-t.length;
if(score<bestScore){bestScore=score;best=t;}
}
return best;
}
async function fetchAozoraText(path){
let lastErr=null;
for(const base of AOZORA_MIRRORS){
try{
const r=await fetch(base+path);
if(!r.ok){lastErr=new Error('下载失败（'+r.status+'）');continue;}
return{buf:await r.arrayBuffer(),src:base+path};
}catch(e){lastErr=e;}
}
throw new Error('网络连接失败，请检查网络后重试');
}
async function importAozoraPick(pick,btn){
const old=btn.innerHTML;btn.disabled=true;btn.textContent='导入中…';
try{
const r=await fetch('aozora-picks/'+pick.f);
if(!r.ok)throw new Error('内置文件缺失');
const text=await decodeSmart(await r.arrayBuffer());
const body=cleanAozora(text);
if(body.length<100)throw new Error('正文提取失败');
const doc=await makeDoc(pick.t,body,'aozora',{author:pick.a,source:'青空文库（App内置）',license:'青空文库收录作品（公版或依许可分发）'});
toast('已导入《'+pick.t+'》');
openDoc(doc.id);
}catch(e){toast('导入失败：'+e.message);}
btn.disabled=false;btn.innerHTML=old;
}
async function importAozora(entry,btn){
const title=entry[0],author=entry[1],path=entry[2];
const old=btn.innerHTML;btn.disabled=true;btn.textContent='下载中…';
try{
try{await loadAozoraPicks();}catch(e){}
let text,src;
const bp=aozoraPickByPath[path];
if(bp){
const r=await fetch('aozora-picks/'+bp.f);
if(r.ok){text=await decodeSmart(await r.arrayBuffer());src='青空文库（App内置）';}
}
if(text===undefined){
const got=await fetchAozoraText(path);
text=await decodeSmart(got.buf);src=got.src;
}
const body=cleanAozora(text);
if(body.length<100)throw new Error('正文提取失败，换一部试试');
const doc=await makeDoc(title,body,'aozora',{author:author,source:src,license:'青空文库收录作品（公版或依许可分发，详见来源页）'});
toast('已导入《'+title+'》');
openDoc(doc.id);
}catch(e){toast('导入失败：'+e.message);}
btn.disabled=false;btn.innerHTML=old;
}
function renderAozoraResults(list){
const box=$('#aozora-results');
if(!list.length){box.innerHTML='<p class="hint">没有找到，换个关键词试试。</p>';return;}
box.innerHTML=list.map((e,i)=>'<button class="online-item" data-aozora="'+i+'"><b>'+esc(e[0])+'</b><span>'+esc(e[1])+'</span></button>').join('');
box.querySelectorAll('[data-aozora]').forEach(b=>b.onclick=()=>importAozora(list[+b.dataset.aozora],b));
}
function onAozoraInput(){
clearTimeout(aozoraTimer);
aozoraTimer=setTimeout(async()=>{
const q=$('#aozora-q').value,status=$('#aozora-status');
if(!q.trim()){$('#aozora-results').innerHTML='';return;}
try{
await loadAozoraIndex(status);
renderAozoraResults(searchAozora(q));
}catch(e){status.textContent=e.message;}
},350);
}

/* ---------- 内置书库 ---------- */
async function loadBundled(){
const status=$('#bundled-status'),box=$('#bundled-results');
if(bundledIndex){renderBundled();return;}
status.textContent='加载中…';
try{
const r=await fetch('library/index.json');
if(!r.ok)throw new Error('内置书库缺失');
bundledIndex=await r.json();
status.textContent='共 '+bundledIndex.length+' 部，随 App 离线提供。';
renderBundled();
}catch(e){status.textContent=e.message;}
}
function renderBundled(){
const box=$('#bundled-results');
box.innerHTML=bundledIndex.map((e,i)=>'<button class="online-item" data-bundled="'+i+'"><b>'+esc(e.t)+'</b><span>'+esc(e.a)+' · '+esc(e.c||'文学')+'</span></button>').join('');
box.querySelectorAll('[data-bundled]').forEach(b=>b.onclick=()=>importBundled(bundledIndex[+b.dataset.bundled],b));
}
async function importBundled(entry,btn){
const old=btn.innerHTML;btn.disabled=true;btn.textContent='导入中…';
try{
const r=await fetch('library/'+entry.f);
if(!r.ok)throw new Error('文件缺失');
const text=(await r.text()).trim();
if(text.length<100)throw new Error('正文为空');
const doc=await makeDoc(entry.t,text,'bundled',{author:entry.a,license:'公版作品（著作权已过期）'});
toast('已导入《'+entry.t+'》');
openDoc(doc.id);
}catch(e){toast('导入失败：'+e.message);}
btn.disabled=false;btn.innerHTML=old;
}

function register(){
document.querySelectorAll('[data-otab]').forEach(b=>b.onclick=()=>switchTab(b.dataset.otab));
document.querySelectorAll('[data-amode]').forEach(b=>b.onclick=()=>setAozoraMode(b.dataset.amode));
$('#aozora-q').addEventListener('input',onAozoraInput);
}
return{register,_test:{cleanAozora,decodeSmart,searchAozora,loadAozoraIndex:()=>aozoraIndex}};
})();
