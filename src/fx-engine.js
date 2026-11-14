'use strict';
/* 主题动态层（v3.0.5 重写）
 * 旧版用几十个 CSS 动画元素 + 大面积 blur 滤镜 + 动画 border-radius，安卓 WebView 会把它们拆成很多巨大的 GPU 图层，
 * 显存/图块不够时就会整屏闪一下（闪屏）。现在整层只用一块 <canvas> 画：
 *   · 只有一个图层，所有粒子贴图预先画好，每帧只做 drawImage
 *   · 限 30 帧，切到后台 / 关屏自动停，关掉“主题动态效果”时只画一帧静止画面
 *   · 模糊类效果（液态玻璃、极光）用半分辨率画，省电
 * 新增：樱花（sakura）、红叶与银杏（leaves）、细雪（snow）飘落。 */
window.RikkaFx=(()=>{
  const TAU=Math.PI*2,rand=(a,b)=>a+Math.random()*(b-a),pick=a=>a[Math.random()*a.length|0];
  let cv=null,g=null,kind='',dark=false,still=false,density=1,parts=[],bg=null,raf=0,last=0,clock=0,W=0,H=0,S=1,resizeTimer=0;
  const reduce=window.matchMedia?matchMedia('(prefers-reduced-motion: reduce)'):null;
  function canvas(w,h,draw){const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w));c.height=Math.max(1,Math.round(h));const x=c.getContext('2d');draw(x,c.width,c.height);return c;}
  const cache={};function spr(key,make){return cache[key]||(cache[key]=make());}

  /* ---------- 贴图 ---------- */
  function petalPath(x,cx,cy,r){
    x.beginPath();x.moveTo(cx,cy+r);
    x.bezierCurveTo(cx-r*1.05,cy+r*.45,cx-r*.95,cy-r*.75,cx-r*.32,cy-r*.98);
    x.quadraticCurveTo(cx-r*.12,cy-r*.9,cx,cy-r*.7);
    x.quadraticCurveTo(cx+r*.12,cy-r*.9,cx+r*.32,cy-r*.98);
    x.bezierCurveTo(cx+r*.95,cy-r*.75,cx+r*1.05,cy+r*.45,cx,cy+r);x.closePath();
  }
  function sakuraPetal(base,tip){return canvas(64,64,(x)=>{const gr=x.createLinearGradient(32,62,32,2);gr.addColorStop(0,base);gr.addColorStop(.55,tip);gr.addColorStop(1,tip);x.fillStyle=gr;petalPath(x,32,33,28);x.fill();
    x.globalAlpha=.35;x.strokeStyle=base;x.lineWidth=1;x.beginPath();x.moveTo(32,60);x.quadraticCurveTo(31,40,32,18);x.stroke();
    x.globalAlpha=.5;const hl=x.createRadialGradient(24,26,1,24,26,16);hl.addColorStop(0,'rgba(255,255,255,.9)');hl.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=hl;petalPath(x,32,33,28);x.fill();});}
  function sakuraFlower(night){return canvas(96,96,(x)=>{const gr=x.createRadialGradient(48,48,4,48,48,44);gr.addColorStop(0,night?'#f59ab8':'#e5689a');gr.addColorStop(.4,night?'#fcd3e1':'#f7aec8');gr.addColorStop(1,night?'#fff4f8':'#ffe4ee');
    for(let k=0;k<5;k++){x.save();x.translate(48,48);x.rotate(k*TAU/5);x.translate(-48,-48);x.fillStyle=gr;petalPath(x,48,27,20);x.fill();x.restore();}
    x.fillStyle='#e8678f';for(let k=0;k<10;k++){const a=k*TAU/10,rr=k%2?7:9;x.beginPath();x.arc(48+Math.cos(a)*rr,48+Math.sin(a)*rr,1.6,0,TAU);x.fill();}
    x.fillStyle='#f7c35c';x.beginPath();x.arc(48,48,3.2,0,TAU);x.fill();});}
  function maple(c1,c2){return canvas(96,96,(x)=>{
    const R=[[0,-44],[7,-26],[20,-34],[16,-15],[38,-24],[31,-8],[44,-2],[26,7],[30,20],[12,14],[4,30]];
    x.beginPath();x.moveTo(48+R[0][0],50+R[0][1]);for(const[a,b]of R)x.lineTo(48+a,50+b);for(let k=R.length-1;k>=0;k--)x.lineTo(48-R[k][0],50+R[k][1]);x.closePath();
    const gr=x.createLinearGradient(20,10,76,86);gr.addColorStop(0,c2);gr.addColorStop(1,c1);x.fillStyle=gr;x.lineJoin='round';x.strokeStyle=gr;x.lineWidth=2.5;x.stroke();x.fill();
    x.strokeStyle='rgba(90,25,10,.35)';x.lineWidth=1.2;x.beginPath();for(const[a,b]of[[0,-40],[34,-20],[-34,-20],[24,16],[-24,16]]){x.moveTo(48,72);x.lineTo(48+a*.85,50+b*.85);}x.stroke();
    x.strokeStyle='rgba(110,45,20,.8)';x.lineWidth=2;x.beginPath();x.moveTo(48,72);x.lineTo(48,92);x.stroke();});}
  function ginkgo(c1,c2){return canvas(96,96,(x)=>{
    x.beginPath();x.moveTo(48,58);x.bezierCurveTo(30,52,12,34,10,22);x.quadraticCurveTo(24,8,44,12);x.lineTo(48,24);x.lineTo(52,12);x.quadraticCurveTo(72,8,86,22);x.bezierCurveTo(84,34,66,52,48,58);x.closePath();
    const gr=x.createLinearGradient(48,60,48,8);gr.addColorStop(0,c1);gr.addColorStop(1,c2);x.fillStyle=gr;x.fill();
    x.strokeStyle='rgba(140,95,10,.28)';x.lineWidth=.8;x.beginPath();for(let k=-5;k<=5;k++){x.moveTo(48,57);x.lineTo(48+k*7,16+Math.abs(k)*1.6);}x.stroke();
    x.strokeStyle='rgba(150,110,30,.85)';x.lineWidth=2;x.beginPath();x.moveTo(48,57);x.quadraticCurveTo(49,74,46,90);x.stroke();});}
  function oval(c1,c2){return canvas(64,96,(x)=>{x.beginPath();x.moveTo(32,6);x.bezierCurveTo(56,26,54,62,32,80);x.bezierCurveTo(10,62,8,26,32,6);const gr=x.createLinearGradient(10,10,54,80);gr.addColorStop(0,c2);gr.addColorStop(1,c1);x.fillStyle=gr;x.fill();
    x.strokeStyle='rgba(70,40,15,.35)';x.lineWidth=1;x.beginPath();x.moveTo(32,8);x.lineTo(32,92);for(let k=0;k<4;k++){const y=24+k*13;x.moveTo(32,y+6);x.lineTo(19,y-2);x.moveTo(32,y+6);x.lineTo(45,y-2);}x.stroke();});}
  function flake(soft){return canvas(48,48,(x)=>{const gr=x.createRadialGradient(24,24,0,24,24,24);
    if(soft){gr.addColorStop(0,'rgba(255,255,255,.95)');gr.addColorStop(.35,'rgba(255,255,255,.6)');gr.addColorStop(1,'rgba(255,255,255,0)');}
    else{gr.addColorStop(0,'#fff');gr.addColorStop(.42,'rgba(255,255,255,.95)');gr.addColorStop(.55,'rgba(170,192,220,.55)');gr.addColorStop(.7,'rgba(255,255,255,.12)');gr.addColorStop(1,'rgba(255,255,255,0)');}
    x.fillStyle=gr;x.fillRect(0,0,48,48);});}
  function glow(color,size=128){return canvas(size,size,(x)=>{const h=size/2,gr=x.createRadialGradient(h,h,0,h,h,h);gr.addColorStop(0,color);gr.addColorStop(.55,color.replace(/[\d.]+\)$/,m=>(parseFloat(m)*.45)+')'));gr.addColorStop(1,color.replace(/[\d.]+\)$/,'0)'));x.fillStyle=gr;x.fillRect(0,0,size,size);});}
  function star(c){return canvas(64,64,(x)=>{x.shadowColor='rgba(255,190,240,.95)';x.shadowBlur=10;const gr=x.createLinearGradient(14,14,50,50);gr.addColorStop(0,'#fff');gr.addColorStop(1,c);x.fillStyle=gr;x.beginPath();
    const P=[[32,6],[36,28],[58,32],[36,36],[32,58],[28,36],[6,32],[28,28]];P.forEach(([a,b],k)=>k?x.lineTo(a,b):x.moveTo(a,b));x.closePath();x.fill();x.shadowBlur=0;x.fillStyle='#fff';x.beginPath();x.arc(32,32,3,0,TAU);x.fill();});}
  function paw(c){return canvas(64,64,(x)=>{x.fillStyle=c;x.beginPath();x.ellipse(32,44,12,10,0,0,TAU);x.fill();for(const[a,b]of[[13,28],[24,17],[40,17],[51,28]]){x.beginPath();x.ellipse(a,b,6,7,0,0,TAU);x.fill();}});}
  function bubble(){return canvas(64,64,(x)=>{const gr=x.createRadialGradient(22,20,1,32,32,31);gr.addColorStop(0,'rgba(255,255,255,.95)');gr.addColorStop(.2,'rgba(255,255,255,.18)');gr.addColorStop(.75,'rgba(120,220,205,.2)');gr.addColorStop(1,'rgba(255,255,255,.6)');x.fillStyle=gr;x.beginPath();x.arc(32,32,30,0,TAU);x.fill();x.strokeStyle='rgba(255,255,255,.75)';x.lineWidth=1.2;x.stroke();});}
  function cloud(){return canvas(300,130,(x)=>{x.fillStyle='#fff';x.shadowColor='rgba(255,255,255,.9)';x.shadowBlur=14;for(const[a,b,r]of[[70,82,38],[118,62,50],[172,70,44],[220,86,34],[140,92,40],[100,96,30],[190,96,30]]){x.beginPath();x.arc(a,b,r,0,TAU);x.fill();}});}
  function band(colors){return canvas(256,96,(x)=>{const gr=x.createLinearGradient(0,0,256,0);colors.forEach(([o,c])=>gr.addColorStop(o,c));x.fillStyle=gr;x.fillRect(0,0,256,96);x.globalCompositeOperation='destination-in';const v=x.createLinearGradient(0,0,0,96);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(.35,'rgba(0,0,0,1)');v.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=v;x.fillRect(0,0,256,96);});}

  /* ---------- 飘落类（樱花 / 落叶 / 雪）共用的物理 ---------- */
  function wind(t,base,amp){return base+amp*(Math.sin(t*.11)+.6*Math.sin(t*.29+1.3)+.35*Math.sin(t*.73+2.1));}
  function faller(p,fresh,cfg){
    p.z=rand(.45,1);p.size=rand(cfg.size[0],cfg.size[1])*p.z;p.vy=rand(cfg.vy[0],cfg.vy[1])*(.55+.45*p.z);
    p.sw=rand(cfg.sway[0],cfg.sway[1]);p.sf=rand(.5,1.3);p.ph=rand(0,TAU);p.rot=rand(0,TAU);p.vr=rand(-cfg.spin,cfg.spin);p.flip=rand(0,TAU);p.vf=rand(cfg.flip[0],cfg.flip[1])*(Math.random()<.5?-1:1);
    p.x=rand(-40,W+40);p.y=fresh?rand(-40,H):rand(-80,-20);p.a=cfg.alpha*(.55+.45*p.z);p.t=rand(0,100);
  }
  function stepFaller(p,dt,t,cfg){
    p.t+=dt;const w=wind(t,cfg.wind,cfg.gust)*p.z;
    p.x+=(w+Math.cos(p.t*p.sf+p.ph)*p.sw)*dt;p.y+=p.vy*dt;p.rot+=(p.vr+(cfg.rock?Math.cos(p.t*p.sf+p.ph)*cfg.rock:0))*dt;p.flip+=p.vf*dt;
    if(p.y>H+50||p.x<-90||p.x>W+90){faller(p,false,cfg);if(w>12&&Math.random()<.5){p.x=-30;p.y=rand(-40,H*.6);}else if(w<-12&&Math.random()<.5){p.x=W+30;p.y=rand(-40,H*.6);}}
  }
  function drawSprite(p,img,flip){
    const c=Math.cos(p.rot),s=Math.sin(p.rot),f=flip?Math.cos(p.flip):1,k=S;
    g.setTransform(k*c*f,k*s*f,-k*s,k*c,k*p.x,k*p.y);
    g.globalAlpha=p.a*(flip?.72+.28*Math.abs(f):1);
    const w=p.size,h=p.size*img.height/img.width;g.drawImage(img,-w/2,-h/2,w,h);
  }

  const K={};
  K.sakura={n:34,res:2,cfg:{size:[13,26],vy:[28,62],sway:[10,34],spin:1.4,flip:[1.2,3.2],wind:14,gust:16,alpha:.92},
    setup(){const s=dark?[['#f6a3c1','#ffe3ee'],['#f9b9d0','#fff0f6'],['#ee8fb2','#ffd7e6']]:[['#e8739d','#ffd3e2'],['#ef8db0','#ffe1eb'],['#de5f8c','#fbc2d6']];
      this.imgs=s.map(([a,b])=>spr('petal'+a,()=>sakuraPetal(a,b)));this.flower=spr('flower'+dark,()=>sakuraFlower(dark));},
    init(p,fresh){faller(p,fresh,this.cfg);p.img=Math.random()<.09?this.flower:pick(this.imgs);if(p.img===this.flower){p.size*=1.5;p.vf*=.35;p.vy*=.85;}},
    step(p,dt,t){stepFaller(p,dt,t,this.cfg);},
    draw(p){drawSprite(p,p.img,true);}};
  K.leaves={n:16,res:2,cfg:{size:[26,46],vy:[22,46],sway:[18,46],spin:.6,rock:1.6,flip:[.4,1.3],wind:9,gust:12,alpha:.95},
    setup(){this.imgs=[spr('m1',()=>maple('#b9301c','#e9683a')),spr('m2',()=>maple('#d86a1f','#f4a940')),spr('m3',()=>maple('#a8243a','#df5546')),spr('g1',()=>ginkgo('#d9a21c','#f8d65e')),spr('g2',()=>ginkgo('#e3b02a','#fbe27c')),spr('o1',()=>oval('#9c5a2a','#cf8a42'))];},
    init(p,fresh){faller(p,fresh,this.cfg);p.img=pick(this.imgs);},
    step(p,dt,t){stepFaller(p,dt,t,this.cfg);},
    draw(p){drawSprite(p,p.img,true);}};
  K.snow={n:60,res:2,cfg:{size:[4,13],vy:[18,46],sway:[6,20],spin:0,flip:[0,0],wind:5,gust:9,alpha:.95},
    setup(){this.imgs=[spr('f0',()=>flake(false)),spr('f1',()=>flake(true))];},
    init(p,fresh){faller(p,fresh,this.cfg);p.img=p.z>.8?this.imgs[1]:this.imgs[0];if(p.z>.85)p.size*=1.7;},
    step(p,dt,t){stepFaller(p,dt,t,this.cfg);},
    draw(p){drawSprite(p,p.img,false);}};

  /* ---------- 旧主题的效果，改用画布重画（外观保持原样） ---------- */
  K.sparkle={n:22,res:2,
    setup(){this.imgs=['#ffc4ec','#c9b8ff','#a9e4ff','#ffc4ec'].map(c=>spr('st'+c,()=>star(c)));this.glows=[spr('gp',()=>glow('rgba(255,170,230,.45)')),spr('gv',()=>glow('rgba(180,160,255,.40)')),spr('gb',()=>glow('rgba(150,215,255,.40)'))];},
    init(p){p.x=rand(0,W);p.y=rand(0,H);p.size=rand(9,22);p.per=rand(2.3,5.5);p.ph=rand(0,1);p.img=pick(this.imgs);p.rot=0;},
    step(p,dt,t){const u=((t/p.per)+p.ph)%1;const e=u<.45?u/.45:u<.6?1-(u-.45)/.15*.15:.85*(1-(u-.6)/.4);p.a=Math.max(0,e);p.sc=.2+.8*p.a;p.rot=u*1.05;if(u<.02&&!p.moved){p.x=rand(0,W);p.y=rand(0,H);p.moved=true;}if(u>.5)p.moved=false;},
    back(t){const d=Math.sin(t*TAU/48);g.globalAlpha=1;const m=Math.max(W,H);[[.2,.2,.8],[.85,.3,.7],[.5,.95,.9]].forEach(([x,y,s],i)=>{const r=m*s;g.setTransform(S,0,0,S,0,0);g.drawImage(this.glows[i],(x+d*.04)*W-r/2,(y-d*.03)*H-r/2,r,r);});},
    draw(p){const q={...p,size:p.size*p.sc};drawSprite(q,p.img,false);}};
  K.paws={n:12,res:2,
    setup(){this.imgs=['#f3a6b6','#f7c59f','#d9b8f5','#f3a6b6'].map(c=>spr('paw'+c,()=>paw(c)));},
    init(p,fresh){p.x=rand(0,W);p.y0=H*1.08;p.dur=rand(9,22);p.u=fresh?rand(0,1):0;p.w=rand(-60,60);p.r0=rand(-.8,.8);p.size=rand(15,34);p.img=pick(this.imgs);},
    step(p,dt){p.u+=dt/p.dur;if(p.u>=1){this.init(p,false);}const u=p.u;p.y=p.y0-u*H*1.23;p.xx=p.x+p.w*u;p.rot=p.r0+u*.35;p.a=u<.15?u/.15*.55:u<.7?.55-(u-.15)/.55*.15:.4*(1-(u-.7)/.3);},
    draw(p){drawSprite({...p,x:p.xx},p.img,false);}};
  K.bubbles={n:18,res:2,
    setup(){this.img=spr('bub',bubble);this.gl=[spr('bgp',()=>glow('rgba(255,190,205,.45)')),spr('bgt',()=>glow('rgba(120,225,205,.45)'))];},
    init(p,fresh){p.x=rand(0,W);p.dur=rand(9,22);p.u=fresh?rand(0,1):0;p.w=rand(-60,60);p.size=Math.random()<.25?rand(5,12):rand(12,30);p.rot=0;},
    step(p,dt){p.u+=dt/p.dur;if(p.u>=1)this.init(p,false);const e=p.u*p.u;p.y=H*1.06-e*H*1.18;p.xx=p.x+p.w*Math.sin(p.u*Math.PI);p.a=1-.8*p.u;},
    back(){g.setTransform(S,0,0,S,0,0);g.globalAlpha=1;const r=Math.max(W,H)*.9;g.drawImage(this.gl[0],W*.3-r/2,H*1.05-r/2,r,r);g.drawImage(this.gl[1],W*.75-r/2,H*1.05-r/2,r,r);},
    draw(p){drawSprite({...p,x:p.xx},this.img,false);}};
  K.clouds={n:6,res:1.5,fixed:true,
    setup(){this.img=spr('cloud',cloud);this.sun=spr('sun',()=>glow('rgba(255,252,228,.95)',256));},
    init(p,fresh){p.y=rand(0,H*.55);p.size=Math.min(560,W*.62*rand(.6,1.35));p.dur=rand(36,88);p.u=fresh?rand(0,1):0;p.rot=0;p.a=.85;},
    step(p,dt){p.u+=dt/p.dur;if(p.u>=1)this.init(p,false);p.x=-W*.45+p.u*W*1.9;},
    back(t){const m=Math.max(W,H),r=m*1.2*(1+.04*(1+Math.sin(t*TAU/18)));g.setTransform(S,0,0,S,0,0);g.globalAlpha=.9;g.drawImage(this.sun,W+m*.05-r/2,-m*.05-r/2,r,r);},
    draw(p){drawSprite(p,this.img,false);}};
  K.liquid={n:4,res:.5,fixed:true,
    setup(){const day=['rgba(120,185,255,.85)','rgba(235,140,255,.8)','rgba(90,225,195,.8)','rgba(255,200,110,.8)'],night=['rgba(63,107,255,.8)','rgba(192,77,255,.75)','rgba(20,214,192,.7)','rgba(255,106,162,.7)'];this.imgs=(dark?night:day).map(c=>spr('blob'+c,()=>glow(c,128)));},
    init(p,fresh,i){p.bx=rand(.1,.9);p.by=rand(.1,.9);p.img=this.imgs[i%4];p.s=rand(.55,1.35);p.per=rand(14,35);p.ph=rand(0,TAU);p.w=rand(-60,60);},
    step(p,dt,t){const u=t/p.per+p.ph;p.x=p.bx*W+Math.sin(u)*p.w*2;p.y=p.by*H+Math.sin(u*.7+1)*H*.15;p.sx=1+.12*Math.sin(u*1.3);p.sy=1+.12*Math.cos(u*1.1);},
    draw(p){const m=Math.max(W,H)*.62*p.s;g.setTransform(S*p.sx,0,0,S*p.sy,S*p.x,S*p.y);g.globalAlpha=dark?.55:.75;g.drawImage(p.img,-m/2,-m/2,m,m);}};
  K.aurora={n:3,res:.5,fixed:true,
    setup(){this.imgs=[spr('a0',()=>band([[0,'rgba(45,245,164,0)'],[.3,'rgba(45,245,164,1)'],[.55,'rgba(38,211,197,1)'],[.8,'rgba(38,211,197,0)'],[1,'rgba(38,211,197,0)']])),spr('a1',()=>band([[.1,'rgba(123,92,255,0)'],[.4,'rgba(123,92,255,1)'],[.6,'rgba(197,91,255,1)'],[.9,'rgba(197,91,255,0)']])),spr('a2',()=>band([[.05,'rgba(63,224,255,0)'],[.35,'rgba(63,224,255,1)'],[.65,'rgba(107,255,184,1)'],[1,'rgba(107,255,184,0)']]))];},
    init(p,fresh,i){p.i=i;p.per=rand(12,30);p.ph=rand(0,TAU);p.y=-H*.1+rand(0,1)*H*.25;p.a=[.55,.4,.35][i%3];},
    step(p,dt,t){p.u=.5+.5*Math.sin(t/p.per*TAU*.5+p.ph);},
    back(){if(!bg)return;g.setTransform(1,0,0,1,0,0);g.globalAlpha=.7;g.drawImage(bg,0,0);},
    draw(p){const sk=(-18+32*p.u)*Math.PI/180,tx=(-6+14*p.u)*W/100,sy=.8+.35*p.u,w=W*1.6,h=H*.46*sy;g.setTransform(S,0,Math.tan(sk)*S,S,S*(-W*.3+tx),S*p.y);g.globalAlpha=p.a;g.drawImage(this.imgs[p.i%3],0,0,w,h);},
    stars(){bg=canvas(W*S,H*S,(x)=>{x.fillStyle='#fff';for(let k=0;k<26;k++){x.globalAlpha=rand(.4,1);x.beginPath();x.arc(rand(0,W)*S,rand(0,H*.9)*S,rand(.5,1.1)*S,0,TAU);x.fill();}});}};
  K.neon={n:10,res:1.5,
    setup(){this.dots=[spr('nc',()=>glow('rgba(5,217,232,1)',48)),spr('np',()=>glow('rgba(255,42,109,1)',48))];},
    init(p,fresh,i){p.bx=rand(0,W);p.by=rand(0,H*.7);p.per=rand(9,22);p.ph=rand(0,TAU);p.w=rand(-60,60);p.img=this.dots[i%2];p.size=rand(14,26);p.rot=0;},
    step(p,dt,t){const u=.5+.5*Math.sin(t/p.per*TAU*.5+p.ph);p.x=p.bx+p.w*u;p.y=p.by-H*.14*u;p.a=1-.7*u;},
    back(t){
      g.setTransform(S,0,0,S,0,0);
      if(bg){g.globalAlpha=.22;g.drawImage(bg,0,0,W,H);}
      const y0=H*.6,vx=W/2;g.lineWidth=1;
      const off=(t/3.5)%1;g.strokeStyle='rgba(255,42,109,.55)';g.beginPath();
      for(let k=0;k<14;k++){const q=(k+off)/14,y=y0+(H*1.05-y0)*q*q;g.globalAlpha=Math.min(1,q*2.2);g.moveTo(0,y);g.lineTo(W,y);}g.stroke();
      g.strokeStyle='rgba(5,217,232,.45)';g.globalAlpha=.8;g.beginPath();for(let k=-12;k<=12;k++){g.moveTo(vx+k*8,y0);g.lineTo(vx+k*W*.16,H*1.05);}g.stroke();
      g.globalAlpha=1;},
    draw(p){drawSprite(p,p.img,false);},
    stars(){const r=Math.min(W,H)*.46;bg=canvas(W*S,H*S,(x)=>{x.scale(S,S);const cx=W/2,cy=H*.18+r/2,gr=x.createLinearGradient(0,cy-r/2,0,cy+r/2);gr.addColorStop(0,'#ffd319');gr.addColorStop(.6,'#ff2a6d');gr.addColorStop(1,'#c400ff');x.fillStyle=gr;x.beginPath();x.arc(cx,cy,r/2,0,TAU);x.fill();x.globalCompositeOperation='destination-out';for(let y=cy-r/2+10;y<cy+r/2;y+=14)x.fillRect(cx-r/2,y,r,4);});}};
  /* ---------- v3.0.5 少女 / 梦幻系 ---------- */
  function heart(c1,c2){return canvas(64,64,(x)=>{x.beginPath();x.moveTo(32,56);x.bezierCurveTo(9,41,3,25,14,15);x.bezierCurveTo(22,8,31,13,32,21);x.bezierCurveTo(33,13,42,8,50,15);x.bezierCurveTo(61,25,55,41,32,56);x.closePath();
    const gr=x.createLinearGradient(14,10,46,56);gr.addColorStop(0,c2);gr.addColorStop(1,c1);x.fillStyle=gr;x.shadowColor=c1;x.shadowBlur=6;x.fill();x.shadowBlur=0;
    x.fillStyle='rgba(255,255,255,.75)';x.beginPath();x.ellipse(21,22,5,3.2,-.7,0,TAU);x.fill();x.beginPath();x.arc(27,17,1.6,0,TAU);x.fill();});}
  function puff(c){return canvas(300,130,(x)=>{x.fillStyle=c;x.shadowColor=c;x.shadowBlur=18;for(const[a,b,r]of[[70,82,36],[118,64,48],[172,70,42],[220,86,32],[140,92,38],[100,96,28],[190,96,28]]){x.beginPath();x.arc(a,b,r,0,TAU);x.fill();}
    x.shadowBlur=0;x.globalCompositeOperation='source-atop';const hl=x.createLinearGradient(0,20,0,130);hl.addColorStop(0,'rgba(255,255,255,.75)');hl.addColorStop(.6,'rgba(255,255,255,0)');x.fillStyle=hl;x.fillRect(0,0,300,130);});}
  function moon(){return canvas(160,160,(x)=>{const gr=x.createRadialGradient(80,80,0,80,80,80);gr.addColorStop(0,'rgba(255,246,214,.55)');gr.addColorStop(.35,'rgba(255,236,200,.18)');gr.addColorStop(1,'rgba(255,236,200,0)');x.fillStyle=gr;x.fillRect(0,0,160,160);
    const c=document.createElement('canvas');c.width=c.height=160;const y=c.getContext('2d');y.fillStyle='#fff6dc';y.beginPath();y.arc(80,80,22,0,TAU);y.fill();y.globalCompositeOperation='destination-out';y.beginPath();y.arc(91,72,20,0,TAU);y.fill();x.shadowColor='rgba(255,240,200,.95)';x.shadowBlur=14;x.drawImage(c,0,0);x.shadowBlur=0;});}
  function twinkle(p,t){const u=((t/p.per)+p.ph)%1;const e=u<.45?u/.45:u<.6?1-(u-.45)/.15*.15:.85*(1-(u-.6)/.4);return Math.max(0,e);}
  // 爱心：从下往上慢慢飘，轻轻左右摇摆，偶尔夹几颗小星星
  K.hearts={n:20,res:2,
    setup(){const c=dark?[['#ff6fa5','#ffc2da'],['#c99bff','#ecd9ff'],['#ff9fc4','#fff0f6']]:[['#f2578f','#ffb3cf'],['#ff86b0','#ffd6e6'],['#c27ef0','#ebd3ff'],['#ff9aa8','#ffe0e4']];this.imgs=c.map(([a,b])=>spr('h'+a,()=>heart(a,b)));this.star=spr('st#ffc4ec',()=>star('#ffc4ec'));},
    init(p,fresh){p.z=rand(.45,1);p.st=Math.random()<.18;p.img=p.st?this.star:pick(this.imgs);p.size=(p.st?rand(8,14):rand(13,26))*p.z;p.x=rand(0,W);p.dur=rand(12,24)/(.6+.4*p.z);p.u=fresh?rand(0,1):0;p.w=rand(-40,40);p.sw=rand(8,22);p.ph=rand(0,TAU);p.r0=rand(-.35,.35);},
    step(p,dt,t){p.u+=dt/p.dur;if(p.u>=1)this.init(p,false);const u=p.u;p.y=H*1.05-u*H*1.15;p.xx=p.x+p.w*u+Math.sin(t*.9+p.ph)*p.sw;p.rot=p.r0+Math.sin(t*1.2+p.ph)*.25;const env=u<.12?u/.12:u>.8?(1-u)/.2:1;p.a=(.55+.4*p.z)*env;p.beat=1+.06*Math.max(0,Math.sin(t*3+p.ph));},
    draw(p){drawSprite({...p,x:p.xx,size:p.size*(p.st?1:p.beat)},p.img,false);}};
  // 梦幻光点：大颗柔焦光斑缓缓漂移、呼吸，夹着细小闪光
  K.dream={n:26,res:1.5,
    setup(){const c=['rgba(255,160,212,.85)','rgba(180,150,255,.85)','rgba(130,210,255,.8)','rgba(140,240,200,.75)','rgba(255,222,140,.75)'];this.orbs=c.map(v=>spr('o'+v,()=>glow(v,128)));this.sts=['#ffc4ec','#c9b8ff','#a9e4ff'].map(v=>spr('st'+v,()=>star(v)));},
    init(p,fresh,i){p.orb=i%3!==2;p.x=rand(0,W);p.y=rand(0,H);p.rot=0;if(p.orb){p.img=pick(this.orbs);p.size=rand(50,150);p.vx=rand(-6,6);p.vy=rand(-9,-2);p.per=rand(6,13);p.ph=rand(0,TAU);}else{p.img=pick(this.sts);p.size=rand(7,15);p.per=rand(2.5,5.5);p.ph=rand(0,1);}},
    step(p,dt,t){if(p.orb){p.x+=p.vx*dt;p.y+=p.vy*dt;const m=p.size;if(p.y<-m)p.y=H+m;if(p.x<-m)p.x=W+m;if(p.x>W+m)p.x=-m;p.a=(dark?.4:.62)+.25*Math.sin(t/p.per*TAU+p.ph);p.sc=1+.08*Math.sin(t/p.per*TAU*.7+p.ph);}else{p.a=twinkle(p,t);p.sc=.25+.75*p.a;p.rot=((t/p.per)+p.ph)%1;if(p.a<.02){p.x=rand(0,W);p.y=rand(0,H);}}},
    draw(p){drawSprite({...p,size:p.size*p.sc},p.img,false);}};
  // 星降る夜：满天细碎星光闪烁 + 偶尔一颗流星 + 右上一弯月亮
  K.starry={n:90,res:2,
    setup(){this.dot=spr('sd',()=>glow('rgba(255,255,255,1)',24));this.dotb=spr('sdb',()=>glow('rgba(200,210,255,1)',24));this.moon=spr('moon',moon);this.shoot=null;this.next=rand(2,5);},
    init(p){p.x=rand(0,W);p.y=rand(0,H*.92);p.size=Math.random()<.12?rand(5,8):rand(2,4.5);p.per=rand(2,6);p.ph=rand(0,TAU);p.base=rand(.35,.9);p.img=Math.random()<.3?this.dotb:this.dot;p.rot=0;},
    step(p,dt,t){p.a=p.base*(.55+.45*Math.sin(t/p.per*TAU+p.ph));},
    back(t){const m=Math.min(W,H)*.55;g.setTransform(S,0,0,S,0,0);g.globalAlpha=.95;g.drawImage(this.moon,W*.8-m/2,H*.3-m/2,m,m);},
    draw(p){drawSprite(p,p.img,false);},
    after(dt){ // 流星
      this.next-=dt;if(!this.shoot&&this.next<=0&&dt>0){this.shoot={x:rand(W*.2,W*1.05),y:rand(-10,H*.35),u:0,len:rand(90,170),sp:rand(.9,1.4)};this.next=rand(4,9);}
      const s=this.shoot;if(!s)return;s.u+=dt*s.sp;if(s.u>=1){this.shoot=null;return;}
      const d=s.u*Math.min(W,H)*.75,hx=s.x-d*.86,hy=s.y+d*.5,tx=hx+s.len*.86,ty=hy-s.len*.5,al=Math.sin(s.u*Math.PI);
      g.setTransform(S,0,0,S,0,0);const gr=g.createLinearGradient(hx,hy,tx,ty);gr.addColorStop(0,'rgba(255,255,255,'+(.95*al)+')');gr.addColorStop(1,'rgba(255,255,255,0)');g.globalAlpha=1;g.strokeStyle=gr;g.lineWidth=1.6;g.lineCap='round';g.beginPath();g.moveTo(hx,hy);g.lineTo(tx,ty);g.stroke();
      g.globalAlpha=al;g.drawImage(this.dot,hx-5,hy-5,10,10);}};
  // 棉花糖：粉蓝紫的软云慢慢飘，云间有小星星
  K.cotton={n:16,res:1.5,
    setup(){this.puffs=['#ffc0da','#b9d5ff','#d3c2ff','#ffd9e8'].map(c=>spr('pf'+c,()=>puff(c)));this.sts=['#ffc4ec','#c9b8ff','#a9e4ff'].map(v=>spr('st'+v,()=>star(v)));},
    init(p,fresh,i){p.cl=i<7;p.rot=0;if(p.cl){p.img=pick(this.puffs);p.y0=rand(-.05,1)*H;p.size=Math.min(520,W*rand(.45,.85));p.dur=rand(60,110);p.u=fresh?rand(0,1):0;p.ph=rand(0,TAU);p.a=dark?.4:.92;}else{p.img=pick(this.sts);p.x=rand(0,W);p.y=rand(0,H);p.size=rand(7,13);p.per=rand(2.5,5);p.ph=rand(0,1);}},
    step(p,dt,t){if(p.cl){p.u+=dt/p.dur;if(p.u>=1)this.init(p,false,0);p.x=-W*.5+p.u*W*2;p.y=p.y0+Math.sin(t*.25+p.ph)*10;}else{p.a=twinkle(p,t);p.sc=.25+.75*p.a;if(p.a<.02){p.x=rand(0,W);p.y=rand(0,H);}}},
    draw(p){if(p.cl)drawSprite(p,p.img,false);else drawSprite({...p,size:p.size*p.sc},p.img,false);}};
  K.petals=K.sakura;// 旧名字

  /* ---------- 主循环 ---------- */
  function counts(k){const area=Math.max(.6,Math.min(2.2,W*H/(412*900)));return Math.max(1,Math.round(k.n*(k.fixed?1:area*density)));}
  function build(){
    const k=K[kind];if(!k||!cv)return;
    W=innerWidth||cv.clientWidth||400;H=innerHeight||cv.clientHeight||800;
    const dpr=Math.min(window.devicePixelRatio||1,2);S=k.res<1?k.res:Math.min(dpr,k.res);
    cv.width=Math.round(W*S);cv.height=Math.round(H*S);bg=null;
    k.setup();if(k.stars)k.stars();
    const n=counts(k);parts=[];for(let i=0;i<n;i++){const p={};k.init(p,true,i);parts.push(p);}
  }
  function frame(dt){
    const k=K[kind];if(!k)return;clock+=dt;
    g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;g.clearRect(0,0,cv.width,cv.height);
    if(k.back)k.back(clock);
    // 远的先画、近的后画，层次更自然
    for(const p of parts)k.step(p,dt,clock);
    if(parts.length&&parts[0].z!=null)parts.sort((a,b)=>a.z-b.z);
    for(const p of parts)k.draw(p);
    if(k.after)k.after(dt);
    g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;
  }
  function loop(now){
    raf=0;if(!running())return;
    raf=requestAnimationFrame(loop);
    const gap=now-last;if(gap<31)return;// ≈30 帧
    last=now;frame(Math.min(.066,gap/1000));
  }
  function running(){return !!kind&&!!K[kind]&&!still&&!document.hidden&&!(reduce&&reduce.matches);}
  function kick(){if(raf)cancelAnimationFrame(raf);raf=0;if(!kind||!g)return;if(running()){last=performance.now();raf=requestAnimationFrame(loop);}else{frame(0);}}
  function host(){
    if(cv&&cv.isConnected)return;
    cv=document.querySelector('canvas.theme-fx');
    if(!cv){document.querySelectorAll('.theme-fx').forEach(e=>e.remove());cv=document.createElement('canvas');cv.className='theme-fx';cv.setAttribute('aria-hidden','true');const shell=document.querySelector('.app-shell');document.body.insertBefore(cv,shell||document.body.firstChild);}
    g=cv.getContext('2d');
  }
  /* kind：'' 关闭；isDark：深色主题配色；motion：false 时只画一帧；dens：'low'|'mid'|'high' */
  function set(next,o={}){
    host();const nd=!!o.dark,ns=o.motion===false,dn={low:.6,mid:1,high:1.6}[o.density]||1;
    const changed=next!==kind||nd!==dark||dn!==density;
    kind=K[next]?next:'';dark=nd;still=ns;density=dn;cv.dataset.fx=kind;
    if(!kind){if(raf)cancelAnimationFrame(raf);raf=0;parts=[];g&&g.clearRect(0,0,cv.width,cv.height);return;}
    if(changed||!parts.length){clock=rand(0,60);build();if(still)for(let i=0;i<40;i++)frame(.05);}
    kick();
  }
  window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(!kind||!cv)return;const w=innerWidth,h=innerHeight;if(Math.abs(w-W)<2&&Math.abs(h-H)<2)return;
    // 只是键盘弹出这类纵向变化：粒子按比例挪，不重新撒
    const k=K[kind],oldH=H;W=w;H=h;const s=S;cv.width=Math.round(W*s);cv.height=Math.round(H*s);bg=null;if(k.stars)k.stars();for(const p of parts){if(p.y!=null&&oldH)p.y*=H/oldH;}kick();},200);});
  document.addEventListener('visibilitychange',kick);
  if(reduce&&reduce.addEventListener)reduce.addEventListener('change',kick);
  return {set,kinds:Object.keys(K)};
})();
