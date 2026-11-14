window.RikkaOnlineBooks=(()=>{
const AOZORA_MIRRORS=[
'https://cdn.jsdelivr.net/gh/aozorahack/aozorabunko_text@master/',
'https://raw.githubusercontent.com/aozorahack/aozorabunko_text/master/'
];
let aozoraIndex=null,authorMap=null,aozoraTimer=0,aozoraMode='search';

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
if(name==='narou'&&!$('#narou-results').children.length)reloadNarou();
if(name==='kakuyomu'&&!$('#kakuyomu-results').children.length)reloadKakuyomu();
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
/* 搜索归一：简体/繁体/日式新旧字等异体字折叠到同一写法，全角英数转半角并小写，
   去掉所有空格。索引与查询两边都过一遍，中文简体、繁体、日文原文都能互相搜到。 */
const SEARCH_FOLD_GROUPS=['国國','間间閒','潤润','澤沢泽','龍龙竜','樹树','東东','樂乐','雲云','書书','門门','馬马','車车','鳥鸟','魚鱼','長长','張张','劉刘','葉叶','發发','宮宫','島嶋岛','廣广','廳厅','樓楼','櫻桜樱','峰峯','岡岗崗冈','岩巖','淵渊','岳嶽','榮荣栄','營营営','勞劳','聲声','聽听聴','說说説','讀读読','寫写','畫画','圖图図','會会','來来','還还','過过','時时','點点','熱热','燈灯','風风','電电','氣气','實实','現现','見见','觀观観','覺觉覚','親亲','遠远','進进','運运','動动','開开','關关関','無无','萬万','與与','專专','團团団','園园','圓圆円','戀恋','愛爱','優优','個个','們们','這这','為为','從从','後后','裏里裡','兒儿','孫孙','婦妇','學学','術术','醫医','藥药','鐵铁鉄','銀银','錢钱銭','線线','綿绵','經经経','濟济済','藝艺','戰战戦','戲戏戯','戶户戸','應应応','態态','懷怀','總总','聰聪','職职','勝胜','負负','買买','賣卖','質质','財财','貧贫','貴贵','貪贪','賃赁','賢贤','澀涩渋','濕湿','濱滨浜','瀧泷滝','灣湾','滿满','漁渔','漢汉','沖冲','決决','況况','淚泪','淨净','涼凉','淺浅','溫温','測测','湯汤','準准','滅灭','煩烦','燒烧焼','煙烟','爭争','爺爷','床牀','狀状','獨独','獵猎','獸兽獣','獻献','環环','產产産','當当','盗盜','盤盘','盧卢','真眞','眾众衆','蘇苏','蘭兰','虛虚','蟲虫','衛卫','裝装','規规','覽览','訪访','訴诉','詞词','試试','詩诗','話话','認认','語语','誠诚','誤误','談谈','讓让','豐丰豊','貝贝','貞贞','員员','貨货','貫贯','貸贷','費费','賀贺','賊贼','賞赏','賴赖','趙赵','跡迹','軍军','輝辉','輩辈','輪轮','轉转','輕轻軽','農农','週周','遊游','達达','遷迁','選选','遺遗','邊边辺','釋释釈','鍋锅','鎖锁','鐘钟','鋼钢','鑑鉴','閉闭','坂阪','陣阵','陰阴','陽阳','際际','隨随','險险険','隱隐隠','雙双','難难','霧雾','靜静','響响','頂顶','項项','順顺','預预','領领','頭头','題题','顏颜顔','願愿','飛飞','飯饭','飲饮','館馆','驅驱','驛驿駅','驗验','鶴鹤','麥麦','黃黄','黒黑','黨党','齒齿歯','魯鲁','姫姬','ケヶ','カヵ','鏡镜','夢梦','歩步','鴎鷗鸥','謝谢','斎斋','徳德','紅红','寛宽'];
const SEARCH_FOLD_MAP={};
for(const g of SEARCH_FOLD_GROUPS)for(let i=1;i<g.length;i++)SEARCH_FOLD_MAP[g[i]]=g[0];
function foldSearchText(s){
s=String(s||'');
let out='';
for(const ch of s){
const code=ch.codePointAt(0);
if(code>=0xFF10&&code<=0xFF19)out+=String.fromCharCode(code-0xFF10+48);
else if(code>=0xFF21&&code<=0xFF3A)out+=String.fromCharCode(code-0xFF21+65);
else if(code>=0xFF41&&code<=0xFF5A)out+=String.fromCharCode(code-0xFF41+97);
else if(ch===' '||ch==='　'||ch==='\t'||ch==='\n'||ch==='\r')continue;
else out+=SEARCH_FOLD_MAP[ch]||ch;
}
return out.toLowerCase();
}
window.RikkaSearchFold=foldSearchText;
/* 中文译名别名：归一也救不了的改译标题，手工对到日文原题 */
const SEARCH_ALIAS={'痴人之爱':'痴人の愛','伊豆的舞女':'伊豆の踊子','伊豆的舞娘':'伊豆の踊子','我是猫':'吾輩は猫である','少爷':'坊っちゃん','银河铁道之夜':'銀河鉄道の夜','银河铁路之夜':'銀河鉄道の夜','千只鹤':'千羽鶴','罗生门':'羅生門','鼻子':'鼻','竹林中':'藪の中','地狱变':'地獄変','蜘蛛丝':'蜘蛛の糸','奉教人之死':'奉教人の死','侏儒的话':'侏儒の言葉','山月记':'山月記','柠檬':'檸檬','跑吧梅洛斯':'走れメロス','维荣之妻':'ヴィヨンの妻','御伽草纸':'お伽草紙','心':'こころ','哥儿':'坊っちゃん','高濑舟':'高瀬舟','阴翳礼赞':'陰翳礼讃','细雪':'細雪','芦刈':'蘆刈','钥匙':'鍵','疯癫老人日记':'瘋癲老人日記','脑髓地狱':'ドグラ・マグラ','两分铜币':'二銭銅貨','心理测试':'心理試験','要求很多的餐馆':'注文の多い料理店','风之歌':'セロ弾きのゴーシュ','大提琴手高修':'セロ弾きのゴーシュ','堕落论':'堕落論','樱之森的满开之下':'桜の森の満開の下','青梅竹马':'たけくらべ','除夜':'大つごもり'};
let aozoraFolded=null;
function searchAozora(q){
q=q.trim();if(!q||q.length<1)return[];
if(!aozoraFolded)aozoraFolded=aozoraIndex.map(e=>[foldSearchText(e[0]),foldSearchText(e[1]||'')]);
const fq=foldSearchText(q);if(!fq)return[];
const targets=[fq];
for(const k of Object.keys(SEARCH_ALIAS))if(foldSearchText(k)===fq)targets.push(foldSearchText(SEARCH_ALIAS[k]));
const out=[];
for(let i=0;i<aozoraIndex.length;i++){
const f=aozoraFolded[i];
for(const t of targets){
if(f[0].indexOf(t)>=0||f[1].indexOf(t)>=0){out.push(aozoraIndex[i]);break;}
}
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
box.querySelectorAll('[data-author]').forEach(b=>b.onclick=()=>renderAuthorWorks(b.dataset.author,renderAuthorList));
}
function renderAuthorWorks(author,back){
back=back||renderAuthorList;
const box=$('#aozora-results'),status=$('#aozora-status');
const list=authorMap[author]||[];
status.textContent=author+' · '+list.length+' 部，点击下载导入。';
box.innerHTML='<button class="text-button" id="author-back">← 返回</button><div style="height:8px"></div>'
+list.slice(0,100).map((e,i)=>'<button class="online-item" data-awork="'+i+'"><b>'+esc(e[0])+'</b></button>').join('')
+(list.length>100?'<p class="hint">仅显示前 100 部，可用搜索精确查找。</p>':'');
$('#author-back').onclick=()=>back();
box.querySelectorAll('[data-awork]').forEach(b=>b.onclick=()=>importAozora(list[+b.dataset.awork],b));
}
/* 分类推荐：按读者能感受到的“类型”把常读的作者分组，难度标签给学习者参考 */
const AOZORA_SHELVES=[
{t:'入门友好 · 童话与短篇',d:'句子短、假名多，N4–N3 也能读',a:['新美南吉','小川未明','宮沢賢治','村山籌子','浜田広介','鈴木三重吉','楠山正雄']},
{t:'文豪名作',d:'教科书级经典，N2 起',a:['夏目漱石','芥川龍之介','太宰治','森鴎外','中島敦','梶井基次郎','島崎藤村','有島武郎','志賀直哉','菊池寛']},
{t:'推理 · 怪奇 · 科幻',d:'情节抓人，适合追读',a:['江戸川乱歩','夢野久作','海野十三','小酒井不木','久生十蘭','甲賀三郎','大阪圭吉','浜尾四郎']},
{t:'时代小说 · 捕物帐',d:'江户风情与武士口吻',a:['岡本綺堂','吉川英治','山本周五郎','国枝史郎','野村胡堂','中里介山']},
{t:'昭和 · 无赖派',d:'口语化的现代文',a:['坂口安吾','織田作之助','堀辰雄','横光利一','林芙美子','岡本かの子','宮本百合子']},
{t:'诗歌 · 短歌俳句',d:'适合朗读',a:['中原中也','萩原朔太郎','石川啄木','北原白秋','正岡子規','三好達治','八木重吉','与謝野晶子']},
{t:'随笔 · 科学 · 美食',d:'说明文体，词汇实用',a:['寺田寅彦','中谷宇吉郎','北大路魯山人','和辻哲郎','佐藤垢石','上村松園']},
{t:'明治大正 · 雅文',d:'文语与口语交织，挑战向',a:['樋口一葉','泉鏡花','幸田露伴','永井荷風','長谷川時雨','片山廣子']}
];
function renderAozoraShelves(){
const box=$('#aozora-results'),status=$('#aozora-status');
status.textContent='按类型挑作者，点开看作品。';
box.innerHTML=AOZORA_SHELVES.map(sh=>{
const names=sh.a.filter(a=>authorMap[a]);
if(!names.length)return '';
return '<section class="shelf-group"><div class="shelf-group-head"><b>'+esc(sh.t)+'</b><span>'+esc(sh.d)+'</span></div><div class="author-grid">'+names.map(a=>'<button class="online-item author" data-author="'+esc(a)+'"><b>'+esc(a)+'</b><span>'+authorMap[a].length+' 部</span></button>').join('')+'</div></section>';
}).join('');
box.querySelectorAll('[data-author]').forEach(b=>b.onclick=()=>renderAuthorWorks(b.dataset.author,renderAozoraShelves));
}
function setAozoraMode(m){
aozoraMode=m;
document.querySelectorAll('[data-amode]').forEach(b=>b.classList.toggle('active',b.dataset.amode===m));
$('#aozora-search-row').classList.toggle('hidden',m!=='search');
if(m==='author'||m==='pick'){
const status=$('#aozora-status');
loadAozoraIndex(status).then(m==='pick'?renderAozoraShelves:renderAuthorList).catch(e=>{status.textContent=e.message;});
}else{
$('#aozora-results').innerHTML='';
const st=$('#aozora-status');
if(aozoraIndex)st.textContent='已载入 '+aozoraIndex.length.toLocaleString()+' 部作品，可离线搜索。';
}
}
function cleanAozora(text){return cleanAozoraMarked(text,true);}
function cleanAozoraMarked(text,plain){
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
if(!plain)return body;
return body.replace(/《[^》]*》/g,'').replace(/｜/g,'').replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
}
// 同上，但把青空文库的注音（《》）抽出来保存，阅读时优先使用
function cleanAozoraRuby(text){
const marked=cleanAozoraMarked(text);
const r=RikkaSourceRuby.fromAozora(marked);
return{text:r.text.replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim(),ruby:r.ruby};
}
function aozoraRubyExtras(r){return r.ruby.length?{sourceRuby:r.ruby,rubyGlobal:RikkaSourceRuby.globalMap(r.ruby)}:{};}
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
const cr=cleanAozoraRuby(text),body=cr.text;
if(body.length<100)throw new Error('正文提取失败');
const doc=await makeDoc(pick.t,body,'aozora',{author:pick.a,source:'青空文库（App内置）',license:'青空文库收录作品（公版或依许可分发）',...aozoraRubyExtras(cr)});
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
const cr=cleanAozoraRuby(text),body=cr.text;
if(body.length<100)throw new Error('正文提取失败，换一部试试');
const doc=await makeDoc(title,body,'aozora',{author:author,source:src,license:'青空文库收录作品（公版或依许可分发，详见来源页）',...aozoraRubyExtras(cr)});
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

/* ---------- なろう ---------- */
let narouMode='rank',narouTag='';
const NAROU_TAGS=['異世界転生','異世界転移','悪役令嬢','スローライフ','日常','学園','ほのぼの','ざまぁ','婚約破棄','追放','チート','ハッピーエンド','百合','ラブコメ','ミステリー','ホラー','料理','もふもふ','ダンジョン','現代ファンタジー','青春','ギャグ','シリアス','短編'];
function narouFilters(){
  const p={};
  const genre=$('#narou-genre').value,type=$('#narou-type').value,length=$('#narou-length').value;
  if(genre)p.genre=genre;if(type)p.type=type;if(length)p.length=length;
  return p;
}
function narouFilterText(){
  const parts=[];
  for(const id of ['narou-genre','narou-type','narou-length']){const el=$('#'+id);if(el.value)parts.push(el.selectedOptions[0].text.split(' · ')[0]);}
  return parts.length?' · '+parts.join(' · '):'';
}
async function loadNarouRank(){
  const status=$('#narou-status'),box=$('#narou-results');
  const order=$('#narou-order').value;
  status.textContent='加载中…';box.innerHTML='';
  try{
    const {list}=await Narou.api(Object.assign({order,lim:30},narouFilters()));
    renderNarou(list,box);
    status.textContent=list.length?'共 '+list.length+' 部（'+$('#narou-order').selectedOptions[0].text+narouFilterText()+'）':'这个组合下没有作品，换个分类试试';
  }catch(e){status.textContent='加载失败：'+narouNetHint(e);}
}
function renderNarouTags(){
  $('#narou-tags').innerHTML=NAROU_TAGS.map(t=>'<button class="tag-chip'+(t===narouTag?' active':'')+'" data-ntag="'+esc(t)+'">#'+esc(t)+'</button>').join('');
  $('#narou-tags').querySelectorAll('[data-ntag]').forEach(b=>b.onclick=()=>{narouTag=b.dataset.ntag;renderNarouTags();loadNarouTag();});
}
async function loadNarouTag(){
  const status=$('#narou-status'),box=$('#narou-results');
  if(!narouTag){box.innerHTML='';status.textContent='点一个标签，看看这个类型里大家在读什么。';return;}
  status.textContent='加载 #'+narouTag+' …';box.innerHTML='';
  try{
    const {list,allcount}=await Narou.api(Object.assign({word:narouTag,keyword:1,order:$('#narou-order').value,lim:30},narouFilters()));
    renderNarou(list,box);
    status.textContent='#'+narouTag+' 共 '+Number(allcount||0).toLocaleString()+' 部，按「'+$('#narou-order').selectedOptions[0].text+'」显示前 '+list.length+' 部';
  }catch(e){status.textContent='加载失败：'+narouNetHint(e);}
}
async function searchNarou(){
  const q=$('#narou-q').value.trim();
  const status=$('#narou-status'),box=$('#narou-results');
  if(!q){box.innerHTML='';status.textContent='';return;}
  status.textContent='搜索中…';
  try{
    // 直接粘贴作品链接或 N 码也可以
    const code=(q.match(/\b(n\d{4}[a-z]{1,3})\b/i)||[])[1];
    if(code){const d=await Narou.getDetail(code);renderNarou(d?[d]:[],box);status.textContent=d?'按作品编号找到':'没有这个编号的作品';return;}
    const {list,allcount}=await Narou.api(Object.assign({word:q,lim:30,order:'hyoka',title:1,ex:1,wname:1,keyword:1},narouFilters()));
    renderNarou(list,box);
    status.textContent='找到 '+Number(allcount||0).toLocaleString()+' 部，显示前 '+list.length+' 部';
  }catch(e){status.textContent='搜索失败：'+narouNetHint(e);}
}
function reloadNarou(){if(narouMode==='rank')loadNarouRank();else if(narouMode==='tag')loadNarouTag();else searchNarou();}
function renderNarou(list,box){
  const gl={1:'恋爱',2:'幻想',3:'文艺',4:'SF',99:'其他',98:'无类型'};
  box.innerHTML=list.map((n,i)=>{
    // API：noveltype 2=短篇；end 0=完结（短篇也是 0），1=连载中
    const st=Number(n.noveltype)===2?'<span class="chip">短篇</span>':Number(n.end)===0?'<span class="chip">完结</span>':'<span class="chip">连载中</span>';
    const eps=Number(n.noveltype)===2?'':(n.general_all_no?' · '+n.general_all_no+' 话':'');
    return '<button class="online-item" data-narou="'+i+'"><b>'+esc(n.title)+'</b><span>'+esc(n.writer)+' · '+(gl[n.biggenre]||'')+eps+' '+st+'</span><span class="hint">'+esc((n.story||'').replace(/\s+/g,' ').slice(0,80))+'…</span></button>';
  }).join('');
  box._data=list;
  box.querySelectorAll('[data-narou]').forEach(b=>b.onclick=()=>showNarouDetail(box._data[+b.dataset.narou],b));
}
// 选择导入范围（不用 confirm/prompt：安卓 WebView 里它们可能不弹出）
function askNarouRange(n,chapters){
  return new Promise(resolve=>{
    const total=chapters.length,short=total===1&&chapters[0].short;
    const def=Math.min(total,30);
    showDialog('导入なろう作品','<p><b>'+esc(n.title)+'</b></p><p class="hint">'+esc(n.writer)+' · '+(short?'短篇':'共 '+total+' 话')+'</p><p class="hint">'+esc((n.story||'').replace(/\s+/g,' ').slice(0,160))+'</p>'+
      (short?'':'<p>导入第 <input id="nr-from" class="text-input" type="number" min="1" max="'+total+'" value="1" style="width:5.5em"> 话 到 第 <input id="nr-to" class="text-input" type="number" min="1" max="'+total+'" value="'+def+'" style="width:5.5em"> 话</p><p class="hint">长篇建议分批导入（每批几十话），单本上限约 100 万字。作者标的注音会原样保留。</p>')+
      '<button class="primary full" id="nr-go">开始导入</button>');
    let settled=false;const finish=v=>{if(settled)return;settled=true;resolve(v);};
    $('#nr-go').onclick=()=>{
      let from=1,to=1;
      if(!short){from=Math.max(1,Math.min(total,parseInt($('#nr-from').value,10)||1));to=Math.max(from,Math.min(total,parseInt($('#nr-to').value,10)||from));}
      closeDialog();finish({from,to});
    };
    $('#dialog').addEventListener('close',()=>finish(null),{once:true});
  });
}
async function showNarouDetail(n,btn){
  const old=btn.innerHTML;btn.disabled=true;
  const status=$('#narou-status');
  try{
    status.textContent='获取《'+n.title+'》目录…';
    const chapters=await Narou.getChapters(n.ncode,n,p=>{if(p>1)status.textContent='获取目录… 第 '+p+' 页';});
    if(!chapters.length)throw new Error('目录为空');
    status.textContent='';
    const range=await askNarouRange(n,chapters);
    if(!range)return;
    const doc=await Narou.importNovel(n.ncode,{detail:n,chapters,from:range.from,to:range.to},(i,total,title)=>{
      status.textContent='下载中 '+i+'/'+total+'：'+title;
    });
    const partial=chapters.length>1&&(doc.from>1||doc.to<chapters.length);
    const title=doc.title+(partial?'（第'+doc.from+'–'+doc.to+'话）':'');
    const imp=await makeDoc(title,doc.text,'narou',{author:doc.author,desc:doc.desc,ncode:doc.ncode,source:'小説家になろう',sourceUrl:'https://ncode.syosetu.com/'+doc.ncode+'/',sourceRuby:doc.ruby,rubyGlobal:RikkaSourceRuby.globalMap(doc.ruby)});
    status.textContent=doc.failed?'导入完成，有 '+doc.failed+' 话下载失败（正文里已标出）':'导入完成';
    toast('已导入《'+title+'》');
    openDoc(imp.id);
  }catch(e){status.textContent='导入失败：'+narouNetHint(e);toast('导入失败：'+e.message);}
  finally{btn.disabled=false;btn.innerHTML=old;}
}
function setNarouMode(m){
  narouMode=m;
  document.querySelectorAll('[data-nmode]').forEach(b=>b.classList.toggle('active',b.dataset.nmode===m));
  $('#narou-search-row').classList.toggle('hidden',m!=='search');
  $('#narou-tags').classList.toggle('hidden',m!=='tag');
  if(m==='tag')renderNarouTags();
  reloadNarou();
}

/* ---------- カクヨム ---------- */
let kakuyomuMode='rank',kakuyomuList=[];
function fmtChars(n){return n>=10000?(n/10000).toFixed(n>=100000?0:1)+' 万字':n?n.toLocaleString()+' 字':'';}
function renderKakuyomu(list){
  const box=$('#kakuyomu-results');kakuyomuList=list;
  box.innerHTML=list.map((w,i)=>{
    const st=w.short?'<span class="chip">短篇</span>':w.status==='done'?'<span class="chip">完结</span>':w.status==='running'?'<span class="chip">连载中</span>':'';
    const meta=[w.author,w.genre,w.episodes&&!w.short?w.episodes+' 话':'',fmtChars(w.chars),w.stars?'★'+w.stars.toLocaleString():''].filter(Boolean).join(' · ');
    const blurb=(w.catchphrase||w.intro||'').replace(/\s+/g,' ');
    return '<button class="online-item" data-kwork="'+i+'"><b>'+(i<3&&kakuyomuMode==='rank'?'<span class="rank-no">'+(i+1)+'</span>':'')+esc(w.title)+'</b><span>'+esc(meta)+' '+st+'</span>'+(blurb?'<span class="hint">'+esc(blurb.slice(0,80))+(blurb.length>80?'…':'')+'</span>':'')+'</button>';
  }).join('');
  box.querySelectorAll('[data-kwork]').forEach(b=>b.onclick=()=>showKakuyomuDetail(kakuyomuList[+b.dataset.kwork],b));
}
async function loadKakuyomuRank(){
  const status=$('#kakuyomu-status-line');
  status.textContent='加载中…';$('#kakuyomu-results').innerHTML='';
  try{
    const list=await Kakuyomu.ranking($('#kakuyomu-genre').value,$('#kakuyomu-period').value,$('#kakuyomu-variation').value);
    renderKakuyomu(list);
    status.textContent=list.length?'共 '+list.length+' 部（'+$('#kakuyomu-genre').selectedOptions[0].text+' · '+$('#kakuyomu-period').selectedOptions[0].text+'）':'没有取到排行，可能是页面结构变了，试试搜索';
  }catch(e){status.textContent='加载失败：'+e.message;}
}
async function searchKakuyomu(){
  const q=$('#kakuyomu-q').value.trim(),status=$('#kakuyomu-status-line');
  if(!q){$('#kakuyomu-results').innerHTML='';status.textContent='';return;}
  status.textContent='搜索中…';
  try{
    const id=(q.match(/kakuyomu\.jp\/works\/(\d+)/)||q.match(/^(\d{12,})$/)||[])[1];
    if(id){const {info,chapters}=await Kakuyomu.getWork(id);info.episodes=info.episodes||chapters.length;renderKakuyomu([info]);status.textContent='按作品链接找到';return;}
    const list=await Kakuyomu.search(q,{genre:$('#kakuyomu-genre').value,status:$('#kakuyomu-status').value,chars:$('#kakuyomu-chars').value});
    renderKakuyomu(list);
    status.textContent=list.length?'显示前 '+list.length+' 部':'没有找到，换个关键词试试';
  }catch(e){status.textContent='搜索失败：'+e.message;}
}
function reloadKakuyomu(){if(kakuyomuMode==='rank')loadKakuyomuRank();else searchKakuyomu();}
function setKakuyomuMode(m){
  kakuyomuMode=m;
  document.querySelectorAll('[data-kmode]').forEach(b=>b.classList.toggle('active',b.dataset.kmode===m));
  $('#kakuyomu-search-row').classList.toggle('hidden',m!=='search');
  document.querySelectorAll('#otab-kakuyomu .k-rank-only').forEach(el=>el.classList.toggle('hidden',m!=='rank'));
  document.querySelectorAll('#otab-kakuyomu .k-search-only').forEach(el=>el.classList.toggle('hidden',m!=='search'));
  reloadKakuyomu();
}
function askRange(title,n,total,short){
  return new Promise(resolve=>{
    const def=Math.min(total,30);
    showDialog(title,'<p><b>'+esc(n.title)+'</b></p><p class="hint">'+esc(n.author||'')+' · '+(short?'短篇':'共 '+total+' 话')+'</p><p class="hint">'+esc((n.desc||'').replace(/\s+/g,' ').slice(0,160))+'</p>'+
      (short?'':'<p>导入第 <input id="kr-from" class="text-input" type="number" min="1" max="'+total+'" value="1" style="width:5.5em"> 话 到 第 <input id="kr-to" class="text-input" type="number" min="1" max="'+total+'" value="'+def+'" style="width:5.5em"> 话</p><p class="hint">长篇建议分批导入（每批几十话），单本上限约 100 万字。作者标的注音会原样保留。</p>')+
      '<button class="primary full" id="kr-go">开始导入</button>');
    let settled=false;const finish=v=>{if(settled)return;settled=true;resolve(v);};
    $('#kr-go').onclick=()=>{
      let from=1,to=total;
      if(!short){from=Math.max(1,Math.min(total,parseInt($('#kr-from').value,10)||1));to=Math.max(from,Math.min(total,parseInt($('#kr-to').value,10)||from));}
      closeDialog();finish({from,to});
    };
    $('#dialog').addEventListener('close',()=>finish(null),{once:true});
  });
}
async function showKakuyomuDetail(w,btn){
  const old=btn.innerHTML;btn.disabled=true;
  const status=$('#kakuyomu-status-line');
  try{
    status.textContent='获取《'+w.title+'》目录…';
    const {info,chapters}=await Kakuyomu.getWork(w.id);
    if(!chapters.length)throw new Error('目录为空');
    status.textContent='';
    const short=chapters.length===1;
    const range=await askRange('导入カクヨム作品',{title:info.title,author:info.author,desc:info.catchphrase||info.intro},chapters.length,short);
    if(!range)return;
    const r=await Kakuyomu.importWork(w.id,{info,chapters,from:range.from,to:range.to},(i,total,title)=>{status.textContent='下载中 '+i+'/'+total+'：'+title;});
    const partial=chapters.length>1&&(r.from>1||r.to<chapters.length);
    const title=r.title+(partial?'（第'+r.from+'–'+r.to+'话）':'');
    const doc=await makeDoc(title,r.text,'kakuyomu',{author:r.author,desc:r.desc,workId:r.workId,source:'カクヨム',sourceUrl:'https://kakuyomu.jp/works/'+r.workId,sourceRuby:r.ruby,rubyGlobal:RikkaSourceRuby.globalMap(r.ruby)});
    status.textContent=r.failed?'导入完成，有 '+r.failed+' 话下载失败（正文里已标出）':'导入完成';
    toast('已导入《'+title+'》');
    openDoc(doc.id);
  }catch(e){status.textContent='导入失败：'+e.message;toast('导入失败：'+e.message);}
  finally{btn.disabled=false;btn.innerHTML=old;}
}

/* ===== 找日文原作（v3.0.6）=====
 * 轻小说文库只有中文译本。这里用 AI 把中文书名对到日文原题，再去なろう / カクヨム 实际搜一遍确认，
 * 找到网络版就能直接导入阅读。AI 只负责“书名对照”，最终以两个站点的搜索结果为准。 */
const FINDER_SYSTEM='你是日本轻小说、网络小说资料专家。用户给出一部作品的中文译名（可能是简称、俗称或不完整）。请找出对应的日本原作。只返回一个合法 JSON 对象，不要 Markdown 围栏：{"candidates":[{"ja":"日文原题（正式书名，逐字准确）","short":"日文常用简称，没有就空字符串","author":"作者日文名","web":"narou / kakuyomu / both / none / unknown 之一：是否有在「小説家になろう」或「カクヨム」公开的网络连载版","zh":"常见中文译名","note":"一句中文说明，例如：书籍版有大幅改写；网络版已完结；只有商业出版"}]}。最多 3 个，按可能性排序。不确定是否有网络版就写 unknown；不认识这部作品就返回空数组，绝对不要编造书名。';
let finderData=[];
async function findOriginal(){
  const q=$('#finder-q').value.trim(),status=$('#finder-status'),box=$('#finder-results');
  if(!q){status.textContent='';box.innerHTML='';return;}
  box.innerHTML='';
  const isJa=/[ぁ-んァ-ヶ]/.test(q);
  if(isJa){renderFinder([{ja:q,short:'',author:'',web:'unknown',zh:'',note:'按你输入的日文书名直接搜索'}]);return;}
  if(!HanaAI.configured()){status.textContent='把中文书名对到日文原题需要 AI（设置 → AI 服务）。也可以直接输入日文书名。';return;}
  status.textContent='正在查日文原题…';$('#finder-go').disabled=true;
  try{
    const raw=await HanaAI.chat(config(),[{role:'system',content:FINDER_SYSTEM},{role:'user',content:q.slice(0,80)}],{purpose:'create',temperature:.1,maxTokens:800});
    const d=HanaCore.jsonObject(raw),list=Array.isArray(d&&d.candidates)?d.candidates.filter(c=>c&&typeof c.ja==='string'&&c.ja.trim()).slice(0,3):[];
    if(!list.length){status.textContent='AI 没认出这部作品。可以换个译名，或直接输入日文书名。';return;}
    renderFinder(list.map(c=>({ja:c.ja.trim().slice(0,80),short:String(c.short||'').slice(0,40),author:String(c.author||'').slice(0,40),web:String(c.web||'unknown'),zh:String(c.zh||'').slice(0,60),note:String(c.note||'').slice(0,120)})));
  }catch(e){status.textContent='查找失败：'+e.message;}
  finally{$('#finder-go').disabled=false;}
}
function renderFinder(list){
  finderData=list;const box=$('#finder-results'),status=$('#finder-status');
  const webText={narou:'有なろう网络版',kakuyomu:'有カクヨム网络版',both:'なろう / カクヨム 都有',none:'只有商业出版',unknown:'是否有网络版：待确认'};
  box.innerHTML=list.map((c,i)=>'<div class="finder-card" data-fi="'+i+'"><b lang="ja">'+esc(c.ja)+'</b>'+(c.short?'<span class="chip">'+esc(c.short)+'</span>':'')+'<p class="finder-meta">'+esc([c.author,c.zh,webText[c.web]||''].filter(Boolean).join(' · '))+'</p>'+(c.note?'<p class="hint">'+esc(c.note)+'</p>':'')+'<div class="finder-hits" id="finder-hits-'+i+'"><span class="hint">正在なろう / カクヨム 上核对…</span></div><div class="button-row wrap"><button class="secondary" data-fgo="narou" data-fi="'+i+'">去なろう搜</button><button class="secondary" data-fgo="kakuyomu" data-fi="'+i+'">去カクヨム搜</button></div></div>').join('');
  status.textContent='找到 '+list.length+' 个可能的原作，正在两个站点核对是否有免费网络版…';
  box.querySelectorAll('[data-fgo]').forEach(b=>b.onclick=()=>finderJump(b.dataset.fgo,finderData[+b.dataset.fi]));
  Promise.all(list.map((c,i)=>verifyFinder(c,i))).then(()=>{status.textContent='核对完成。点下面的作品可直接查看章节并导入。';});
}
async function verifyFinder(c,i){
  const host=$('#finder-hits-'+i);if(!host)return;const hits=[];
  const words=[c.ja,c.short].filter(Boolean);
  try{for(const w of words){const {list}=await Narou.api({word:w,lim:3,order:'hyoka',title:1});if(list&&list.length){list.slice(0,2).forEach(n=>hits.push({site:'narou',item:n,title:n.title,meta:n.writer}));break;}}}catch(e){}
  try{if(window.Kakuyomu)for(const w of words){const list=await Kakuyomu.search(w,{});if(list&&list.length){list.slice(0,2).forEach(k=>hits.push({site:'kakuyomu',item:k,title:k.title,meta:k.author}));break;}}}catch(e){}
  if(!host.isConnected)return;
  if(!hits.length){host.innerHTML='<p class="hint">两个站点都没搜到同名作品，这部可能只有商业出版版本。</p>';return;}
  host.innerHTML=hits.map((h,k)=>'<button class="online-item" data-fh="'+k+'"><b>'+esc(h.title||'')+'</b><span>'+(h.site==='narou'?'なろう':'カクヨム')+(h.meta?' · '+esc(h.meta):'')+'</span></button>').join('');
  host.querySelectorAll('[data-fh]').forEach(b=>b.onclick=()=>{const h=hits[+b.dataset.fh];if(h.site==='narou')showNarouDetail(h.item,b);else showKakuyomuDetail(h.item,b);});
}
function finderJump(site,c){
  if(!c)return;const q=c.ja;
  if(site==='narou'){switchTab('narou');setNarouMode('search');$('#narou-q').value=q;searchNarou();}
  else{switchTab('kakuyomu');setKakuyomuMode('search');$('#kakuyomu-q').value=q;searchKakuyomu();}
}
function register(){
document.querySelectorAll('[data-otab]').forEach(b=>b.onclick=()=>switchTab(b.dataset.otab));
document.querySelectorAll('[data-amode]').forEach(b=>b.onclick=()=>setAozoraMode(b.dataset.amode));
document.querySelectorAll('[data-nmode]').forEach(b=>b.onclick=()=>setNarouMode(b.dataset.nmode));
document.querySelectorAll('[data-kmode]').forEach(b=>b.onclick=()=>setKakuyomuMode(b.dataset.kmode));
for(const id of ['narou-order','narou-genre','narou-type','narou-length'])$('#'+id).onchange=reloadNarou;
let narouTimer=0;$('#narou-q').addEventListener('input',()=>{clearTimeout(narouTimer);narouTimer=setTimeout(searchNarou,600);});
if(window.Kakuyomu){
$('#kakuyomu-genre').innerHTML=Kakuyomu.GENRES.map(g=>'<option value="'+g[0]+'">'+esc(g[1])+'</option>').join('');
$('#kakuyomu-period').innerHTML=Kakuyomu.PERIODS.map(p=>'<option value="'+p[0]+'"'+(p[0]==='weekly'?' selected':'')+'>'+esc(p[1])+'</option>').join('');
for(const id of ['kakuyomu-genre','kakuyomu-period','kakuyomu-variation','kakuyomu-status','kakuyomu-chars'])$('#'+id).onchange=reloadKakuyomu;
let kTimer=0;$('#kakuyomu-q').addEventListener('input',()=>{clearTimeout(kTimer);kTimer=setTimeout(searchKakuyomu,700);});
}
$('#aozora-q').addEventListener('input',onAozoraInput);
if($('#finder-go')){$('#finder-go').onclick=()=>findOriginal();$('#finder-q').addEventListener('keydown',e=>{if(e.key==='Enter')findOriginal();});}
}
return{register,_test:{cleanAozora,cleanAozoraRuby,decodeSmart,searchAozora,loadAozoraIndex:()=>aozoraIndex}};
})();
