window.HanaImport=(()=>{
  const MAX=20*1024*1024,MAX_TEXT=1000000;
  function clean(text){return text.replace(/\r\n?/g,'\n').replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').replace(/\u0000/g,'').trim();}
  function decode(bytes,encoding='auto'){
    if(encoding!=='auto')return new TextDecoder(encoding).decode(bytes);
    if(bytes[0]===255&&bytes[1]===254)return new TextDecoder('utf-16le').decode(bytes);
    if(bytes[0]===254&&bytes[1]===255)return new TextDecoder('utf-16be').decode(bytes);
    try{return new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch(e){return new TextDecoder('shift_jis').decode(bytes);}
  }
  function htmlText(text){
    const doc=new DOMParser().parseFromString(text,'text/html');
    doc.querySelectorAll('script,style,rt,rp,noscript,iframe,object,svg,nav').forEach(x=>x.remove());
    doc.querySelectorAll('br').forEach(x=>x.replaceWith(doc.createTextNode('\n')));
    doc.querySelectorAll('p,div,h1,h2,h3,h4,li,section,article,tr').forEach(x=>x.appendChild(doc.createTextNode('\n\n')));
    return clean(doc.body.textContent||'');
  }
  function xml(text){const d=new DOMParser().parseFromString(text,'application/xml');if(d.querySelector('parsererror'))throw new Error('文档 XML 损坏或格式不受支持');return d;}
  function unzip(bytes){let count=0,size=0;return fflate.unzipSync(bytes,{filter:e=>{if(++count>12000)throw new Error('文档内部文件过多');const useful=/\.(?:xml|opf|xhtml|html|htm|txt)$/i.test(e.name);if(!useful)return false;size+=e.originalSize;if(e.originalSize>12*1024*1024||size>40*1024*1024)throw new Error('文档解压后过大，请按章节拆分');return true;}});}
  function get(files,name){const b=files[name];if(!b)throw new Error('文档缺少 '+name);return decode(b,'utf-8');}
  function resolvePath(base,href){const p=new URL(href,'https://document.local/'+base).pathname.slice(1);return decodeURIComponent(p);}
  async function parse(name,bytes,encoding='auto'){
    if(bytes.byteLength>(name.toLowerCase().endsWith('.json')?64*1024*1024:MAX))throw new Error('文档超过 20 MB，请先按章节拆分');
    const ext=name.toLowerCase().split('.').pop();let text='',title=name.replace(/\.[^.]+$/,''),kind=ext.toUpperCase();
    if(ext==='json')return {backup:JSON.parse(decode(bytes,'utf-8'))};
    if(['txt','md'].includes(ext))text=decode(bytes,encoding);
    else if(['html','htm'].includes(ext))text=htmlText(decode(bytes,encoding));
    else if(ext==='docx'){
      const files=unzip(bytes),doc=xml(get(files,'word/document.xml'));
      text=Array.from(doc.getElementsByTagNameNS('*','p')).map(p=>Array.from(p.getElementsByTagNameNS('*','t')).map(t=>t.textContent).join('')).join('\n\n');
    }else if(ext==='epub'){
      const files=unzip(bytes);if(files['META-INF/encryption.xml'])throw new Error('此 EPUB 含有加密资源，请使用未加密版本');
      const container=xml(get(files,'META-INF/container.xml'));const rf=container.getElementsByTagNameNS('*','rootfile')[0];if(!rf)throw new Error('EPUB 缺少书籍索引');
      const path=rf.getAttribute('full-path'),opf=xml(get(files,path)),manifest={};
      for(const item of opf.getElementsByTagNameNS('*','item'))manifest[item.getAttribute('id')]=item;
      const titleNode=opf.getElementsByTagNameNS('*','title')[0];if(titleNode?.textContent)title=titleNode.textContent;
      const chapters=[];
      for(const ref of opf.getElementsByTagNameNS('*','itemref')){
        if(ref.getAttribute('linear')==='no')continue;
        const item=manifest[ref.getAttribute('idref')];if(!item)continue;
        const href=item.getAttribute('href');if(!href||/^https?:/i.test(href))continue;
        const resolved=resolvePath(path,href);if(files[resolved])chapters.push(htmlText(get(files,resolved)));
      }
      text=chapters.join('\n\n');
    }else if(ext==='pdf'){
      if(!Promise.withResolvers)Promise.withResolvers=function(){let resolve,reject;const promise=new Promise((r,j)=>{resolve=r;reject=j;});return{promise,resolve,reject};};
      const pdfjs=await import('./vendor/pdf.mjs');pdfjs.GlobalWorkerOptions.workerSrc=new URL('vendor/pdf.worker.mjs',location.href).href;
      const loading=pdfjs.getDocument({data:bytes,cMapUrl:new URL('vendor/cmaps/',location.href).href,cMapPacked:true,standardFontDataUrl:new URL('vendor/standard_fonts/',location.href).href,isEvalSupported:false,useSystemFonts:true});
      let pdf;try{
        pdf=await loading.promise;if(pdf.numPages>700)throw new Error('PDF 超过 700 页，请先拆分');
        const pages=[];let count=0;
        for(let i=1;i<=pdf.numPages;i++){
          const page=await pdf.getPage(i),content=await page.getTextContent();let p='',lastY=null;
          for(const item of content.items){if(typeof item.str!=='string')continue;const y=item.transform?.[5];if(lastY!==null&&Math.abs(y-lastY)>8&&!p.endsWith('\n'))p+='\n';p+=item.str;if(item.hasEOL)p+='\n';lastY=y;}
          pages.push(p);count+=p.length;page.cleanup();if(count>MAX_TEXT)throw new Error('文字超过 100 万字，请先按章节拆分');
        }
        text=pages.join('\n\n');
      }finally{await loading.destroy();}
      if(text.trim().length<10)throw new Error('此 PDF 没有可提取的文字，可能是扫描版；请先 OCR 识别后导入');
    }else throw new Error('支持 TXT、MD、DOCX、EPUB、文字型 PDF 和 HTML；旧版 .doc 请先另存为 .docx');
    text=clean(text);if(!text)throw new Error('文档中没有可读取的正文');if(text.length>MAX_TEXT)throw new Error('文字超过 100 万字，请按章节拆分');
    return {title:title.slice(0,100),text,kind};
  }
  return {parse,decode,htmlText};
})();
