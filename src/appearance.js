'use strict';
window.RikkaAppearance=(()=>{
 // fx：主题背后的动态层（花瓣/星光/猫爪……），由 themes-plus.css 画，JS 只负责撒粒子
 const themes=[
  {id:'light',name:'雪白',color:'#F3F5F9'},
  {id:'sepia',name:'文庫',color:'#F1ECE1'},
  {id:'sakura',name:'薄桜',color:'#fff0f3'},
  {id:'mint',name:'若竹',color:'#edf7f0'},
  {id:'dark',name:'雪夜',color:'#10141C',dark:true},
  {id:'midnight',name:'藍夜',color:'#142332',dark:true},
  {id:'glass',name:'琉璃',color:'#E9EEF8',fx:'liquid',tag:'液态玻璃',gradient:'linear-gradient(135deg,#c9e4ff,#f6d8ff 50%,#d6fff1)'},
  {id:'glassnight',name:'琉璃夜',color:'#0E1222',dark:true,fx:'liquid',tag:'液态玻璃',gradient:'linear-gradient(135deg,#1b2350,#4b2a6b 55%,#0f4a5a)'},
  {id:'ichigo',name:'苺ミルク',color:'#FFF0F4',fx:'hearts',tag:'少女',gradient:'linear-gradient(160deg,#fff5f8,#ffd6e4 55%,#ffb8cf)'},
  {id:'wataame',name:'綿あめ',color:'#F5EEFF',fx:'cotton',tag:'可爱',gradient:'linear-gradient(160deg,#ffe0ef,#e7dcff 50%,#d3e9ff)'},
  {id:'yumekawa',name:'ゆめかわ',color:'#F4EDFF',fx:'dream',tag:'梦幻',gradient:'linear-gradient(135deg,#ffd1ea,#e2d1ff 40%,#c9f1ff 75%,#d9ffe9)'},
  {id:'neko',name:'猫町',color:'#FFF4F1',fx:'paws',tag:'猫娘',gradient:'linear-gradient(135deg,#ffe3ea,#fff6e6 60%,#ffd9c7)'},
  {id:'mahou',name:'魔法少女',color:'#FCEBFA',fx:'sparkle',tag:'二次元',gradient:'linear-gradient(135deg,#ffc6ec,#d9c8ff 55%,#bfe7ff)'},
  {id:'hanafubuki',name:'花吹雪',color:'#FFF4F7',fx:'sakura',tag:'樱花飘落',gradient:'linear-gradient(160deg,#fff7fa,#ffdce8 55%,#f6c3d6)'},
  {id:'momiji',name:'紅葉',color:'#FBF2E7',fx:'leaves',tag:'落叶',gradient:'linear-gradient(160deg,#fff6ea,#f6d6b6 55%,#de9a6a)'},
  {id:'hatsuyuki',name:'初雪',color:'#E4ECF5',fx:'snow',tag:'细雪',gradient:'linear-gradient(180deg,#c3d2e4,#e6edf5 60%,#fbfcfe)'},
  {id:'natsuzora',name:'夏空',color:'#DDEFFF',fx:'clouds',tag:'二次元',gradient:'linear-gradient(180deg,#5aa9ff,#bfe3ff 60%,#fff)'},
  {id:'soda',name:'奶油苏打',color:'#E8FBF6',fx:'bubbles',tag:'可爱',gradient:'linear-gradient(180deg,#7fe3d0,#d8fff6 65%,#fff3f5)'},
  {id:'yozakura',name:'夜桜',color:'#141428',dark:true,fx:'sakura',tag:'二次元',gradient:'linear-gradient(160deg,#1a1a3a,#3a2350 60%,#f2a7c3)'},
  {id:'hoshifuru',name:'星降る夜',color:'#121433',dark:true,fx:'starry',tag:'梦幻',gradient:'linear-gradient(170deg,#0e1030,#2a2160 60%,#5b3a8a)'},
  {id:'kyokkou',name:'极光',color:'#07161D',dark:true,fx:'aurora',tag:'动态',gradient:'linear-gradient(160deg,#04161e,#0c5b52 50%,#5a2d82)'},
  {id:'neon',name:'电波霓虹',color:'#0D0221',dark:true,fx:'neon',tag:'赛博',gradient:'linear-gradient(135deg,#0d0221,#ff2a6d 60%,#05d9e8)'}
 ];
 // 动态层交给 fx-engine.js 用一块画布画（旧的 CSS 粒子会让 WebView 闪屏）
 function effectiveFx(t){const o=settings.fxOverlay||'auto';if(o==='none')return '';if(o!=='auto')return o;return t.fx||'';}
 function paintFx(t){const kind=effectiveFx(t);document.body.classList.toggle('fx-theme',!!kind);document.body.classList.toggle('fx-falling',/^(sakura|leaves|snow|hearts|dream|cotton|starry)$/.test(kind));if(window.RikkaFx)RikkaFx.set(kind,{dark:!!t.dark,motion:settings.themeMotion!==false,density:settings.fxDensity||'mid'});}
 function applyTheme(){const t=themes.find(t=>t.id===settings.theme)||themes[0];document.body.dataset.theme=t.id;document.body.classList.toggle('dark',!!t.dark);document.body.classList.toggle('sepia',t.id==='sepia');document.body.classList.toggle('fx-still',settings.themeMotion===false);paintFx(t);document.querySelector('meta[name="theme-color"]').content=t.color;if(window.Android?.systemAppearance)Android.systemAppearance(t.color,!!t.dark);else if(window.Android?.theme)Android.theme(!!t.dark);}
 function insets(data){const root=document.documentElement;root.style.setProperty('--system-top',Math.max(0,Number(data.top)||0)+'px');root.style.setProperty('--system-bottom',Math.max(0,Number(data.bottom)||0)+'px');root.style.setProperty('--keyboard-height',Math.max(0,Number(data.keyboard)||0)+'px');root.style.setProperty('--system-left',Math.max(0,Number(data.left)||0)+'px');root.style.setProperty('--system-right',Math.max(0,Number(data.right)||0)+'px');document.body.classList.toggle('keyboard-open',Number(data.keyboard)>100);}
 function render(){
  const sel=$('#theme-mode');
  if(sel&&sel.options.length!==themes.length)sel.innerHTML='<optgroup label="经典">'+themes.filter(t=>!t.fx).map(t=>'<option value="'+t.id+'">'+t.name+'</option>').join('')+'</optgroup><optgroup label="动态主题">'+themes.filter(t=>t.fx).map(t=>'<option value="'+t.id+'">'+t.name+' · '+t.tag+'</option>').join('')+'</optgroup>';
  if(sel)sel.value=settings.theme;
  const host=$('#theme-swatches');host.innerHTML=themes.map(t=>'<button class="theme-swatch '+(settings.theme===t.id?'active':'')+(t.fx?' fx':'')+'" data-theme-pick="'+t.id+'" aria-label="'+t.name+'" aria-pressed="'+(settings.theme===t.id)+'"><span style="background:'+(t.gradient||t.color)+'"></span><small>'+t.name+'</small>'+(t.tag?'<em>'+t.tag+'</em>':'')+'</button>').join('');$$('[data-theme-pick]').forEach(b=>b.onclick=()=>{settings.theme=b.dataset.themePick;saveSettings();$('#theme-mode').value=settings.theme;render();});}
 function register(){
  $('#show-words-nav').onchange=e=>{settings.showWords=e.target.checked;saveSettings();};$('#remember-position').onchange=e=>{settings.rememberPosition=e.target.checked;saveSettings();};$('#show-dictionary-nav').onchange=e=>{settings.showDictionary=e.target.checked;saveSettings();};$('#show-exam-nav').onchange=e=>{settings.showExam=e.target.checked;saveSettings();};
  $('#theme-mode').addEventListener('change',render);
  $('#refresh-balance').onclick=safe(async()=>{const button=$('#refresh-balance'),host=$('#balance-result');if($('#ai-base').value.trim()!==settings.base||$('#ai-key').value.trim()){host.textContent='请先点“保存设置”，再查询当前服务的余额';return;}button.disabled=true;host.textContent='正在查询服务商余额…';try{const result=await HanaAI.balance(config());host.innerHTML=result.balances.map(b=>'<div class="balance-amount"><strong>'+C.escape(b.total)+'</strong><span>'+C.escape(b.currency)+'</span></div><p class="hint">充值余额 '+C.escape(b.paid)+' · 赠送余额 '+C.escape(b.granted)+'</p>').join('')+'<p class="hint">'+(result.available?'账户可用':'服务商返回账户额度不足')+' · 查询于 '+new Date().toLocaleTimeString('zh-CN')+'<br>这是服务商返回的余额，后续使用会变化。</p>';}catch(e){host.textContent=e.message;}finally{button.disabled=false;}});
 }
 /* 右上角日/夜切换：分别记住“上一次用的浅色主题”和“上一次用的深色主题”，来回切不会丢 */
 function remember(){const t=themes.find(t=>t.id===settings.theme);if(!t)return;if(t.dark)settings.lastDarkTheme=t.id;else settings.lastLightTheme=t.id;}
 function toggleDark(){const t=themes.find(t=>t.id===settings.theme)||themes[0];const want=t.dark?settings.lastLightTheme:settings.lastDarkTheme;const ok=themes.find(x=>x.id===want&&!!x.dark===!t.dark);settings.theme=ok?ok.id:(t.dark?'light':'dark');saveSettings();render();}
 return{themes,applyTheme,insets,render,register,remember,toggleDark};
})();
