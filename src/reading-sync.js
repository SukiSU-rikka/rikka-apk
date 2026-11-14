/* 读音统一层（v3.0.5）
 * 以前同一个词有四个互不相通的读音来源：分词器、AI 读音判读、整段解析、点词解析。
 * 正文用前两个，解析列表和点词弹窗各用自己的，于是会出现
 * 正文「嘘(うそ)告(つげ)」、解析「嘘告 うそこく」、弹窗「告 つげ / 词典原形 こく」三种说法。
 * 现在所有 AI 给出的读音都先回写到正文 token 上（必要时把被切碎的词合并），
 * 解析列表和弹窗再一律从正文 token 取读音，所以三个地方永远是同一个读音。
 * 优先级：作者原注音 / 内置校订 / 用户自定义 > 整段解析 > 点词解析 > AI 读音判读 > 分词器。 */
window.RikkaReadingSync=(()=>{
  const C=HanaCore;
  const RK='\\u3400-\\u9fff\\uf900-\\ufaff\\u{20000}-\\u{2fa1f}々〆ヶヵ〇';
  const KANJI=new RegExp('['+RK+']','u');
  const GROUP=new RegExp('['+RK+']+|[ぁ-ゖァ-ヺー]+|[^'+RK+'ぁ-ゖァ-ヺー]+','gu');
  const KANA_ONLY=/^[ぁ-ゖァ-ヺー]+$/;
  const hira=s=>C.hira(String(s||'').trim());
  const patternCache=new Map();
  /* 用词面给读音做“骨架校验”：词面里的假名必须原样出现在读音的对应位置。
   * 眠れた → ^(.+?)れた$，所以 AI 误给原形读音 ねむれる 会被拒掉。 */
  function pattern(surface){
    let rx=patternCache.get(surface);if(rx)return rx;
    const groups=surface.match(GROUP)||[];
    let src='^';for(const g of groups)src+=KANA_ONLY.test(g)?hira(g).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'):'(.+?)';
    rx=new RegExp(src+'$','u');if(patternCache.size>800)patternCache.clear();patternCache.set(surface,rx);return rx;
  }
  /* 返回合格的平假名读音，不合格返回空串 */
  function valid(surface,reading){
    surface=String(surface||'');if(!surface||!KANJI.test(surface))return '';
    const r=hira(reading).replace(/\s+/g,'');
    if(!r||!/^[ぁ-ゖー]+$/.test(r)||r.length>surface.length*7+4)return '';
    return pattern(surface).test(r)?r:'';
  }
  function commonPrefix(a,b){let p=0;while(p<a.length&&p<b.length&&a[p]===b[p])p++;return p;}
  // カ変「来る」的词干读音随活用变：来ない(こ) 来ます(き) 来れば(く)
  function kuruStem(tail){const c=tail[0]||'';if(/[なよらさいず]/.test(c))return 'こ';if(/[まただてちつ]/.test(c))return 'き';return 'く';}
  /* 由原形读音推出原文活用形的读音：眠れる/ねむれる + 眠れた → ねむれた */
  function surfaceFromBase(word,reading,surface){
    word=String(word||'');surface=String(surface||'');const r=hira(reading);
    if(!word||!surface||!r)return '';
    if(word===surface)return valid(surface,r);
    const p=commonPrefix(word,surface);if(!p)return '';
    const wt=word.slice(p),st=surface.slice(p);
    if(KANJI.test(wt)||KANJI.test(st))return '';
    if(/来る$/.test(word)&&wt==='る'&&r.endsWith('くる')){return valid(surface,r.slice(0,-2)+kuruStem(st)+hira(st));}
    const hw=hira(wt);if(!r.endsWith(hw))return '';
    return valid(surface,r.slice(0,r.length-hw.length)+hira(st));
  }
  /* 反过来：由正文里活用形的读音推出原形读音，用于让解析/弹窗里的“原形读音”与正文一致 */
  function baseFromSurface(word,surface,surfaceReading){
    word=String(word||'');surface=String(surface||'');const r=hira(surfaceReading);
    if(!word||!surface||!r)return '';
    if(word===surface)return r;
    const p=commonPrefix(word,surface);if(!p)return '';
    const wt=word.slice(p),st=surface.slice(p);
    if(KANJI.test(wt)||KANJI.test(st))return '';
    const hs=hira(st);if(!r.endsWith(hs))return '';
    let stem=r.slice(0,r.length-hs.length);
    if(/来る$/.test(word)&&wt==='る'&&/[こきく]$/.test(stem))return stem.slice(0,-1)+'くる';
    const out=stem+hira(wt);return KANJI.test(word)?(pattern(word).test(out)?out:''):out;
  }
  function offsets(tokens){const off=[];let p=0;for(const t of tokens){off.push(p);p+=(t.s||'').length;}return off;}
  function tokenReading(t){return KANJI.test(t.s||'')?hira(t.r||''):hira(t.s||'');}
  /* 把 [a,b) 这段文字设成一个读音为 reading 的 token。必要时合并多个 token，
   * 边缘只允许切开纯假名部分；碰到被锁定的 token 就放弃，绝不乱改。 */
  function setRange(tokens,a,b,reading,base,origin,isLocked){
    const off=offsets(tokens);let i=-1,j=-1;
    for(let x=0;x<tokens.length;x++){const s=off[x],e=s+tokens[x].s.length;if(i<0&&a>=s&&a<e)i=x;if(b>s&&b<=e){j=x;break;}}
    if(i<0||j<0||j<i)return tokens;
    for(let x=i;x<=j;x++)if(isLocked(tokens[x]))return tokens;
    const head=tokens[i],tail=tokens[j];
    const pre=head.s.slice(0,a-off[i]),post=tail.s.slice(b-off[j]);
    if(pre){if(!KANA_ONLY.test(pre)||!tokenReading(head).startsWith(hira(pre)))return tokens;}
    if(post){if(!KANA_ONLY.test(post)||!tokenReading(tail).endsWith(hira(post)))return tokens;}
    const surface=tokens.slice(i,j+1).map(t=>t.s).join('').slice(pre.length,(off[j]+tail.s.length-off[i])-post.length);
    const single=i===j&&!pre&&!post;
    // 分词器对这个词有把握（有词典候选读音、没标“拿不准”），而 AI 给的读音不在候选里：多半是 AI 读错了，不采用。
    // 人名等专有名词、被切碎需要合并的词不受此限。
    if(single&&!head.uncertain&&!head.needsAi&&!head.unknown&&!/固有名詞/.test(head.p1||'')&&Array.isArray(head.readings)&&head.readings.length&&!head.readings.some(x=>hira(x)===reading))return tokens;
    if(single&&head.r===reading&&!head.uncertain){if(!head.aiFixed)tokens=tokens.slice(),tokens[i]={...head,aiFixed:origin};return tokens;}
    const posSrc=j>i&&/^(助詞|助動詞|記号)$/.test(tail.p||'')?head:tail;
    const merged={...(single?head:posSrc),s:surface,r:reading,b:single?(base||head.b):(base||surface),merged:!single||!!head.merged,
      rp:undefined,rpr:undefined,source:'ai',aiFixed:origin,uncertain:false,unknown:false,needsAi:false,readings:[reading]};
    const out=tokens.slice(0,i);
    if(pre)out.push({...head,s:pre,r:hira(pre),b:pre,rp:undefined,rpr:undefined,merged:true,uncertain:false,needsAi:false});
    out.push(merged);
    if(post)out.push({...tail,s:post,r:hira(post),b:post,rp:undefined,rpr:undefined,merged:true,uncertain:false,needsAi:false});
    return out.concat(tokens.slice(j+1));
  }
  /* spans: [{surface, reading, base, at?, len?}]
   *  - 有 at：只改包含 [at, at+len) 的那一处（点词解析，按位置）
   *  - 没有 at：本段所有出现处（整段解析）；单字词出现多次时不动，避免「方」「上」这类多音字被一刀切 */
  function apply(tokens,text,spans,origin,isLocked){
    if(!spans||!spans.length||!tokens||!tokens.length)return tokens;
    if(tokens.map(t=>t.s).join('')!==text)return tokens;
    for(const sp of spans){
      const surface=sp.surface;if(!surface||!sp.reading)continue;
      const starts=[];let k=text.indexOf(surface);while(k>=0){starts.push(k);k=text.indexOf(surface,k+1);}
      if(!starts.length)continue;
      let use;
      if(sp.at!=null){use=starts.filter(s=>s<=sp.at&&sp.at+(sp.len||1)<=s+surface.length).slice(0,1);}
      else{if(Array.from(surface).length<2&&starts.length>1)continue;use=starts;}
      for(const s of use)tokens=setRange(tokens,s,s+surface.length,sp.reading,sp.base,origin,isLocked);
    }
    return tokens;
  }
  /* 解析列表/弹窗用：从正文 token 读出某段文字的读音（必须和 token 边界对齐，或只差纯假名边） */
  function readingOf(tokens,text,surface){
    if(!surface||!tokens||!tokens.length||!KANJI.test(surface))return '';
    const off=offsets(tokens);let k=text.indexOf(surface);
    while(k>=0){
      const a=k,b=k+surface.length;let i=-1,j=-1;
      for(let x=0;x<tokens.length;x++){const s=off[x],e=s+tokens[x].s.length;if(i<0&&a>=s&&a<e)i=x;if(b>s&&b<=e){j=x;break;}}
      if(i>=0&&j>=i){
        let r='';for(let x=i;x<=j;x++)r+=tokenReading(tokens[x]);
        const pre=tokens[i].s.slice(0,a-off[i]),post=tokens[j].s.slice(b-off[j]);
        let ok=true;
        if(pre){if(KANA_ONLY.test(pre)&&r.startsWith(hira(pre)))r=r.slice(pre.length);else ok=false;}
        if(ok&&post){if(KANA_ONLY.test(post)&&r.endsWith(hira(post)))r=r.slice(0,r.length-post.length);else ok=false;}
        if(ok&&valid(surface,r))return r;
      }
      k=text.indexOf(surface,k+1);
    }
    return '';
  }
  return {valid,surfaceFromBase,baseFromSurface,apply,readingOf,hasKanji:s=>KANJI.test(String(s||''))};
})();
