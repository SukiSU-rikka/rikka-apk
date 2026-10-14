/* Offline prompts: no API call, no key needed. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.RikkaStory=factory();})(typeof window==='object'?window:this,()=>{
'use strict';
const styles={
novel:{label:'轻小说',hint:'叙述与对白结合，句式按 N5–N1 控制。',instruction:'自然的现代轻小说。对白和叙述交替，不滥用拟声词和夸张人设。'},
spoken:{label:'日常口语',hint:'练习省略、缩约、语气词与相づち，区分朋友和陌生人。',instruction:'以真实日常对话为主，人物说话有上下文，恰当使用相づち、省略、口语缩约（ている→てる、という→って等）。初级只少量引入缩约，避免机械教科书对话。'},
internet:{label:'网络交流',hint:'日本推特/X 真实口语：w、〜み、语气碎片化。',instruction:'写成日本推特(X)上的真实发言：短句碎片化、语气随意，像朋友间吐槽。必须使用日本年轻人真实的网络表达：w/草/www（笑）、〜み（嬉しみ、辛み）、〜すぎる、語彙力ない、尊い、推し、エモい、それな、わかりみ、沼る、りょ、おk、あざす；允许顔文字和(笑)(泣)。不要编造不存在的流行词。'},
news:{label:'新闻练习',hint:'学习报道句式与正式用语；生成内容为虚构练习，不是真实新闻。',instruction:'创作虚构的日语新闻阅读练习，标题必须以开头；正文开头说明「日本語学習のための架空のニュースです。」。使用虚构地点、人物、事件，不冒充实际新闻，不编造真实机构的声明。包含标题、导语、背景、不同观点，按难度选择报道用语。'},
essay:{label:'随笔',hint:'观察生活、表达感受，练习自然书面语与段落衔接。',instruction:'自然的日语生活随笔，以小事为中心，注重观察、感受和段落逻辑，避免满篇抽象说教。'},
work:{label:'职场敬语',hint:'区分同事、客户与上司；练习请求、确认和委婉表达。',instruction:'以职场情境对话或邮件往来为主，区分内外关系，正确使用丁寧語、尊敬語、謙譲語。低级以です・ます体和简单请求为主，不超出目标难度堆砌敬语。'},
classical:{label:'古典文',hint:'文語体：けり・なり・たり・ず・き，平安式优雅散文。',instruction:'用古典日语（文語体）写：活用文語動詞・助動詞（けり、なり、たり、ず、き、し、む、べし等），句式典雅，平安物语式叙述。不用现代口语。'},
kansai:{label:'关西弁',hint:'人物用关西方言对话：や・ねん・へん。',instruction:'人物对话使用自然的关西方言：語尾や、ねん、へん、やんか、おおきに、ほんま等，叙述部分可用标准语。对话要像真实的大阪人说话，不堆砌方言词。'},
horror:{label:'恐怖',hint:'悬疑恐怖：氛围压抑，渐进式惊悚。',instruction:'写悬疑恐怖故事：注重氛围营造、心理压迫感和渐进式惊悚，不靠血腥堆砌。用日常细节的不对劲感推进恐惧，结尾留白。'},
free:{label:'不限',hint:'不指定风格，自然写好故事。',instruction:'不指定特定表达风格，自然流畅地写好故事，优先保证情节和人物。'},
mystery:{label:'推理',hint:'本格推理：伏笔、误导、结局反转。',instruction:'写本格推理故事：开头埋下伏笔和误导，侦探或旁观者视角推进，线索对读者公平呈现，结局反转但逻辑自洽。不写超自然破案。'},
scifi:{label:'科幻',hint:'未来科技、宇宙、AI、时间题材。',instruction:'写科幻故事：未来科技、宇宙、人工智能、时间等题材，用科幻设定推进剧情，设定前后自洽，有科学幻想的浪漫感。'},
fantasy:{label:'奇幻',hint:'异世界、魔法、剑与冒险。',instruction:'写奇幻冒险故事：异世界、魔法、剑与冒险元素，世界观完整，有冒险的爽快感和成长线。'},
romance:{label:'恋爱',hint:'纯爱故事：心动瞬间、关系渐进。',instruction:'写纯爱/恋爱故事：细腻的情感描写，捕捉心动的瞬间，两人关系自然渐进。适合练习情感表达和心理描写。'},
jidai:{label:'时代剧',hint:'江户武士口吻：拙者、ござる。',instruction:'写江户时代背景故事：武士、町人、宿场町等，用时代剧口吻（拙者、ござる、〜でござる、〜いたす），有时代感但不写得太难懂。'},
fairy:{label:'童话',hint:'昔々开头，简单温暖，适合初级。',instruction:'写童话故事：以"昔々あるところに"式开头，句式简单，情节温暖，有明确的寓意。适合初级水平，不用复杂语法。'},
comedy:{label:'搞笑',hint:'漫才式吐槽装傻，节奏明快。',instruction:'写搞笑故事：漫才式的吐槽与装傻，人物互动节奏明快，包袱密集但自然，读完让人想笑。'},
iyashi:{label:'治愈',hint:'温柔日常，小确幸，读完暖暖的。',instruction:'写治愈系故事：温柔的日常片段，捕捉生活中的小确幸，节奏舒缓，读完心里暖暖的。适合睡前读。'},
adult:{label:'成人向',hint:'18+ 成人向情色描写：大胆直白，露骨性描写。',instruction:'创作面向成年读者的情色文学，登场人物均为成年人。以最大胆直白的笔触写性与亲密场景：必须使用明确具体的生殖器名称与性行为词汇（如阴茎、阴道、乳房、阴蒂、做爱、口交、抽插等），不许用隐喻、暗喻、省略号或那里身体之类含糊代称一笔带过；细致描写性器的形态触感、性交的过程与体位变化、身体反应与高潮心理。保持情色张力，不写非自愿情节。'}
};
const genres={
campus:{name:'校园日常',places:['放学后的图书室','文化祭前夜的教室','梅雨季的旧校舍走廊','社团活动室的窗边','毕业典礼后的天台','体育馆后面的樱花树下','午休时的屋顶','考试周的自习室'],events:['在一本旧书里发现夹着的匿名便条','为了一场小误会，两人一起满校园找丢失的东西','收到一封写了三年却没寄出的信','被临时抓去搭档布置文化祭摊位','发现平时沉默的同学藏着惊人的爱好','在失物招领处认领到不属于自己的东西','雨天共用一把伞走去车站','毕业纪念册上多了一句没署名的话']},
romance:{name:'温柔恋爱',places:['打烊前半小时的小书店','樱花花瓣落在水面的河边','雨后反光的公交站','周末午后人很少的咖啡店','飘着面包香的街角小店','黄昏时的天桥上','电影院散场后的出口','初雪那天的便利店门口'],events:['鼓起勇气问对方要不要一起走回家','把准备了很久的礼物错送给了别人','因为借了同一本书三次而慢慢熟悉','约定每天分享一件今天的小事','想说喜欢，说出口的却是反话','在对方常去的店里偶遇，假装是巧合','一起等末班车，车却迟迟不来','把没说完的话写在纸巾背面递过去']},
fantasy:{name:'轻幻想',places:['只在黄昏营业的杂货铺','倒映着另一片天空的湖','很久没人上去的钟楼','深夜亮着灯的校园花园','开往不存在车站的末班电车','雾气散不去的山间小路','满是旧钟表的修理店'],events:['捡到一把能听见心声的钥匙','发现自己的影子比自己快了一步','收到一张盖着明天邮戳的明信片','答应帮一颗迷路的星星找到回去的路','每次说谎，天上就飘起一阵小雨','在梦里去过的地方，醒来后发现真的存在','旧相机拍出的照片里多了一个人']},
mystery:{name:'日常推理',places:['闭馆前一小时的地方图书馆','社区摄影展的角落','周末的旧物集市','贴满通知的社团布告栏','民宿的公共客厅','雨天的咖啡馆窗边'],events:['每天同一时间，总有一杯没人点的热茶放在桌上','根据一张旧照片找出礼物的真正主人','一张没人改动过的时间表，对不上任何人的记忆','围绕一张撕掉一角的票根展开的推理','同一句留言，被两个人读出完全不同的意思','失踪的钥匙出现在所有人都找过的地方']},
travel:{name:'旅行生活',places:['海边小镇清晨的市场','雪后安静的山间温泉街','一天只有三班车的乡下小站','离岛灯塔下的防波堤','夏日祭典散场后的夜市','高原上的观星台'],events:['错过末班车，被热心的当地人收留了一晚','为了找明信片上的风景，多坐了一站路','向店主打听一道从没见过的小吃的做法','用很少的预算规划出一条散步路线','临时改了计划，却遇到了更喜欢的风景','在车站的留言本上看到三年前的自己']},
city:{name:'都市观察',places:['小区里的共享花园','车站旁的老商店街','刚开业的社区活动室','清晨有点挤的通勤电车','周末步行街的长椅上','深夜还开着的拉面店'],events:['为一家老店要不要装修争论了一个下午','为了减少食物浪费想出一个小办法','发现网上的评价和亲身体验完全不一样','交换各自节省时间的小习惯','一起策划一次邻里之间的旧物交换','在电车上捡到一本写满批注的书']}
};
// 多种开场结构，避免千篇一律
const openers=[
(place,cast,event)=>`在${place}，${cast}${event}。`,
(place,cast,event)=>`${cast}在${place}，${event}。`,
(place,cast,event)=>`事情从${place}开始——${cast}${event}。`,
(place,cast,event)=>`${place}。${cast}${event}。`,
];
const developments=[
'一件小事让两人的距离悄悄变化，对话里藏着没说出口的话。',
'两人的看法不太一样，但谁都没有恶意，气氛微妙地松动了。',
'一个不起眼的细节被反复提起，最后成了关键。',
'中途出了点小意外，两个人商量着自己解决。',
'前半段随手一提的小事，在结尾轻轻扣了回来。',
'一次没绕弯子的交谈，改变了事情的走向。',
'时间有点不够了，两人决定先把最重要的事做完。',
];
function generate(options={},rng=Math.random){const pick=a=>a[Math.min(a.length-1,Math.floor(rng()*a.length))];const key=genres[options.genre]?options.genre:pick(Object.keys(genres));const g=genres[key],style=styles[options.style]?options.style:'novel';const cast=options.cast==='mixed'?'性格不同的两个人':'两个女生';const opener=pick(openers);
let theme=opener(pick(g.places),cast,pick(g.events));
if(options.length!=='short')theme+=pick(developments);
if(options.length==='long')theme+='把时间、人物关系和眼前的小目标交代清楚。用一两处声音、气味或光线的细节立住场景。人物会停顿、犹豫，用自然的反应推进，不突然长篇独白。';
if(style==='news')theme=`以“${g.name}”为题材，${theme}改编成一篇明确标注虚构的地方新闻练习，呈现事件和不同立场。`;
if(style==='internet')theme+='用朋友群聊或帖子加评论的形式展开。';
const characters=(options.cast==='mixed'?'人物性别不限，姓名前后一致。':'主要角色均为女性，姓名前后一致。')+(style==='news'?'使用虚构地名与机构，写清楚报道对象。':style==='work'?'明确同事、客户或上司的关系，敬语符合身份。':'');
return{theme,characters,genre:key,style};
}
function preferences(){return{genre:settings.randomGenre,length:settings.promptLength,cast:settings.randomCast,style:$('#story-style').value||settings.defaultStyle};}
let undo=null;
function hint(){$('#story-style-hint').textContent=(styles[$('#story-style').value]||styles.novel).hint;$('#prompt-count').textContent=$('#story-theme').value.length+' 字';$('#story-target-fields').classList.toggle('hidden',!settings.showStoryTargets);$('#continuation-fields').classList.toggle('hidden',!$('#story-continue').checked);}
function remember(){settings.storyDraft={theme:$('#story-theme').value,characters:$('#story-characters').value,targets:$('#story-targets').value,continuation:$('#story-continuation').value,sourceBg:$('#story-source-bg')?$('#story-source-bg').value:''};saveSettings();hint();}
function random(){const p=generate(preferences());$('#story-theme').value=p.theme;$('#story-characters').value=p.characters;$('#story-continue').checked=false;remember();toast('灵感已填好');}
function render(){for(const[id,key]of [['random-genre','randomGenre'],['prompt-length','promptLength'],['random-cast','randomCast'],['default-style','defaultStyle'],['default-level','defaultLevel'],['default-story-length','defaultStoryLength']])$('#'+id).value=settings[key];$('#show-story-targets').checked=settings.showStoryTargets;$('#auto-polish-prompt').checked=settings.autoPolishPrompt;hint();}
function enter(){const d=settings.storyDraft;if(d)for(const[id,key]of [['story-theme','theme'],['story-characters','characters'],['story-targets','targets'],['story-continuation','continuation']])$('#'+id).value=d[key]||'';if(d.sourceBg&&$('#story-source-bg')){$('#story-source-bg').value=d.sourceBg;$('#source-bg-fields').classList.remove('hidden');}$('#story-style').value=settings.defaultStyle;$('#story-level').value=settings.defaultLevel;$('#story-length').value=settings.defaultStoryLength;hint();}
async function polish(continuation=false){if(generationId)return;if(!HanaAI.configured()){nav('settings');$('#settings-ai').open=true;toast('请先保存 API 配置');return;}const input=$(continuation?'#story-continuation':'#story-theme'),button=$(continuation?'#polish-continuation':'#polish-story'),before=input.value.trim();if(!before)throw Error('请先写下想法，或点随机灵感');button.disabled=true;button.textContent='润色中…';try{const next=await HanaAI.polish(config(),before,{continuation,level:settings.defaultLevel,style:settings.defaultStyle,promptLength:settings.promptLength});if(input.value.trim()!==before){toast('你已修改输入，保留当前内容');return;}undo={id:input.id,text:input.value};input.value=next;$('#undo-polish').classList.remove('hidden');remember();}finally{button.disabled=false;button.textContent=continuation?'✧ AI 润色续写方向':'✧ AI 润色提示词';}}
async function generate(){if(generationId)return;if(!HanaAI.configured()){nav('settings');$('#settings-ai').open=true;toast('请先保存 API 配置');return;}const idea=$('#story-theme').value.trim(),button=$('#generate-prompt');button.disabled=true;button.textContent='生成中…';try{const r=await HanaAI.generatePrompt(config(),idea,{level:settings.defaultLevel,style:settings.defaultStyle,genre:settings.randomGenre,promptLength:settings.promptLength});undo={id:'story-theme',text:$('#story-theme').value};$('#story-theme').value=r.theme;if(!$('#story-characters').value.trim()&&r.characters)$('#story-characters').value=r.characters;$('#undo-polish').classList.remove('hidden');remember();toast('提示词已生成，可直接修改');}finally{button.disabled=false;button.textContent='✧ AI 生成提示词';}}
function clearAll(){for(const id of ['story-theme','story-characters','story-targets','story-continuation','story-source-bg']){const el=$('#'+id);if(el)el.value='';}$('#story-continue').checked=false;undo=null;$('#undo-polish').classList.add('hidden');remember();hint();updateContinuePreview();toast('已清空，可重新写');}
async function searchSource(){
const theme=$('#story-theme').value.trim();
if(!theme){toast('先写下主题，比如：宝贝公主');return;}
if(!HanaAI.configured()){nav('settings');$('#settings-ai').open=true;toast('请先保存 API 配置');return;}
let query=theme.replace(/^(动漫|动画|漫画|同人|小说|游戏)/,'').replace(/(剧情|故事|同人|介绍|简介)$/,'').trim().slice(0,30);
if(!query)query=theme.slice(0,30);
const btn=$('#search-source');btn.disabled=true;btn.textContent='生成中…';
try{
const summary=await HanaAI.sourceSummary(config(),query);
if(summary.indexOf('不了解该作品')>=0)throw new Error('AI 不了解这部作品，可手动粘贴剧情简介到下面');
$('#story-source-bg').value='【'+query+'】\n'+summary;
$('#source-bg-fields').classList.remove('hidden');
$('#source-bg-fields').open=true;
remember();
toast('已生成原作资料，可编辑后使用');
}catch(e){
toast('失败：'+e.message);
$('#source-bg-fields').classList.remove('hidden');
}finally{btn.disabled=false;btn.textContent='🔍 搜索原作资料';}
}
function register(){$('#search-source').onclick=safe(searchSource);$('#clear-story-all').onclick=clearAll;
document.querySelectorAll('[data-clear-field]').forEach(b=>b.onclick=()=>{const el=$('#'+b.dataset.clearField);if(el)el.value='';if(b.dataset.clearField==='story-continuation')updateContinuePreview();remember();hint();});
$('#generate-prompt').onclick=safe(generate);$('#random-story').onclick=random;for(const id of ['story-theme','story-characters','story-targets','story-continuation','story-source-bg'])$('#'+id).addEventListener('input',remember);for(const[id,key]of [['story-style','defaultStyle'],['story-level','defaultLevel'],['story-length','defaultStoryLength']])$('#'+id).onchange=e=>{settings[key]=key==='defaultStoryLength'?Number(e.target.value):e.target.value;remember();};$('#story-continue').onchange=()=>{hint();updateContinuePreview();};$('#polish-story').onclick=safe(()=>polish());$('#polish-continuation').onclick=safe(()=>polish(true));$('#undo-polish').onclick=()=>{if(undo){$('#'+undo.id).value=undo.text;undo=null;$('#undo-polish').classList.add('hidden');remember();}};for(const[id,key]of [['show-story-targets','showStoryTargets'],['auto-polish-prompt','autoPolishPrompt']])$('#'+id).onchange=e=>{settings[key]=e.target.checked;saveSettings();hint();};for(const[id,key]of [['random-genre','randomGenre'],['prompt-length','promptLength'],['random-cast','randomCast'],['default-style','defaultStyle'],['default-level','defaultLevel'],['default-story-length','defaultStoryLength']])$('#'+id).onchange=e=>{settings[key]=key==='defaultStoryLength'?Number(e.target.value):e.target.value;saveSettings();};}
return{styles,genres,generate,register,render,enter,random,remember,hint};
});
