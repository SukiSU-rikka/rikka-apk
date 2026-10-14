'use strict';
window.RikkaImages=(()=>{
  async function load(url){const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error('手机无法读取这张图片，请选择 JPG、PNG、WebP 或系统支持的 HEIC 图片'));img.src=url;});return img;}
  function encode(source,maxSide=2400){
    const scale=Math.min(1,maxSide/Math.max(source.width,source.height));let canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(source.width*scale));canvas.height=Math.max(1,Math.round(source.height*scale));
    let ctx=canvas.getContext('2d');ctx.fillStyle='#f3e7d5';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(source,0,0,canvas.width,canvas.height);let quality=.87,data='';
    for(let step=0;step<14;step++){data=canvas.toDataURL('image/jpeg',quality);if(data.length<=1500000)break;if(quality>.63)quality-=.08;else{const smaller=document.createElement('canvas');smaller.width=Math.max(1,Math.floor(canvas.width*.75));smaller.height=Math.max(1,Math.floor(canvas.height*.75));smaller.getContext('2d').drawImage(canvas,0,0,smaller.width,smaller.height);canvas=smaller;quality=.8;}}
    return data;
  }
  async function process(blob,maxSide=2400){if(!blob?.size)throw new Error('没有读取到图片内容，请重新选择');const url=URL.createObjectURL(blob);try{return encode(await load(url),maxSide);}finally{URL.revokeObjectURL(url);}}
  async function saveBackground(data){return RikkaGallery.save(data);}
  async function selectIcon(data){unbusy();const img=await load(data);showDialog('裁剪你的桌面图标','<div class="crop-stage"><canvas id="icon-crop" width="512" height="512"></canvas></div><p class="hint">圆形线内是主要显示区域；调整到你喜欢的位置。</p><label class="field-label" for="icon-zoom">缩放</label><input id="icon-zoom" type="range" min="1" max="3" step="0.05" value="1"><label class="field-label" for="icon-x">左右位置</label><input id="icon-x" type="range" min="0" max="100" value="50"><label class="field-label" for="icon-y">上下位置</label><input id="icon-y" type="range" min="0" max="100" value="50"><button id="save-custom-icon" class="primary full">保存并设置桌面图标</button>');
    const canvas=$('#icon-crop');const draw=()=>{const z=Number($('#icon-zoom').value),side=Math.min(img.width,img.height)/z,x=(img.width-side)*Number($('#icon-x').value)/100,y=(img.height-side)*Number($('#icon-y').value)/100;canvas.getContext('2d').drawImage(img,x,y,side,side,0,0,512,512);};['icon-zoom','icon-x','icon-y'].forEach(id=>$('#'+id).oninput=draw);draw();
    $('#save-custom-icon').onclick=safe(async()=>{const data=canvas.toDataURL('image/jpeg',.9);await DB.put('meta',{id:'custom-icon',data});closeDialog();await render();if(window.Android?.pinCustomIcon)Android.pinCustomIcon(data);else toast('裁剪图标已保存；安卓安装版可将它添加到桌面');});
  }
  async function render(){
    let selected=settings.launcherIcon||'portrait';if(window.Android?.selectedIcon)selected=Android.selectedIcon();$$('[data-icon-preset]').forEach(x=>{x.classList.toggle('active',x.dataset.iconPreset===selected);x.setAttribute('aria-pressed',x.dataset.iconPreset===selected?'true':'false');});
    const custom=await DB.get('meta','custom-icon');$('#custom-icon-preview').src=custom?.data||'icons/rikka.jpg';$('#reuse-custom-icon').disabled=!custom?.data;
  }
  function register(){
    $('#icon-input').onchange=safe(async e=>{try{if(e.target.files[0]){busy('正在适配图标图片…');await selectIcon(await process(e.target.files[0],1280));}}finally{e.target.value='';unbusy();}});
    $('#choose-custom-icon').onclick=()=>{if(window.Android?.pickIconImage)Android.pickIconImage();else $('#icon-input').click();};
    $('#reuse-custom-icon').onclick=safe(async()=>{const custom=await DB.get('meta','custom-icon');if(custom?.data){if(window.Android?.pinCustomIcon)Android.pinCustomIcon(custom.data);else await selectIcon(custom.data);}});
    $$('[data-icon-preset]').forEach(b=>b.onclick=()=>{settings.launcherIcon=b.dataset.iconPreset;saveSettings();if(window.Android?.changeIcon)Android.changeIcon(b.dataset.iconPreset);else{safe(render)();toast('图标偏好已保存');}});
  }
  return{process,saveBackground,selectIcon,render,register};
})();
