(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.RikkaVoiceCore=factory();})(typeof window==='object'?window:this,()=>{
 'use strict';
 function clamp(n,min,max,fallback){n=Number(n);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;}
 function endpoint(raw){let u;try{u=new URL(String(raw).trim());}catch(e){throw Error('请填写完整的语音接口地址');}const ip=u.hostname.split('.').map(Number),privateIP=/^\d+\.\d+\.\d+\.\d+$/.test(u.hostname)&&ip.every(n=>n>=0&&n<=255)&&(ip[0]===10||ip[0]===127||ip[0]===192&&ip[1]===168||ip[0]===172&&ip[1]>=16&&ip[1]<=31);if(u.username||u.password||u.hash||u.search||!(u.protocol==='https:'||u.protocol==='http:'&&privateIP))throw Error('语音服务需使用 HTTPS；同一 Wi-Fi 下可填写内网 IP 的 HTTP 地址，不要在地址中放密钥');return u.href;}
 function chunks(text,max=180){max=Math.max(20,Math.floor(max));const chars=Array.from(String(text||'').trim());const result=[];let buf='';for(const c of chars){buf+=c;if(Array.from(buf).length>=max||(/[。！？!?\n]/.test(c)&&buf.length>=16)){if(buf.trim())result.push(buf.trim());buf='';}}if(buf.trim())result.push(buf.trim());return result;}
 function payload(text,s){return {text,text_lang:'ja',ref_audio_path:String(s.voiceReference||''),prompt_text:String(s.voiceTranscript||''),prompt_lang:'ja',text_split_method:'cut5',batch_size:1,media_type:'wav',streaming_mode:false,speed_factor:clamp(s.rate,.6,1.4,1),temperature:clamp(s.voiceTemperature,.5,1,.8),top_k:5,top_p:1,seed:-1,parallel_infer:true};}
 return{clamp,endpoint,chunks,payload};
});
