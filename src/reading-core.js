(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.RikkaReadings=factory();})(typeof self!=='undefined'?self:this,()=>{
 'use strict';
 const hira=s=>String(s||'').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-96));
 // Exceptional readings verified by hand against real sentences.
 // Anything not listed here must agree with the morphological reading,
 // otherwise the span is left unmerged rather than guessed.
 const preferred={'微笑み':'ほほえみ','台詞':'せりふ','明後日':'あさって','夜風':'よかぜ','一人':'ひとり','二人':'ふたり','挿れ':'いれ','二十歳':'はたち','一昨年':'おととし','乳母':'うば','番頭':'ばんとう','その外':'そのほか','この間':'このあいだ','この間中':'このあいだじゅう','その間':'そのあいだ','あの間':'あのあいだ','どの間':'どのあいだ','間':'あいだ','お兄':'おにい','声':'こえ','虎牙':'こが','角':'かど','他人事':'ひとごと','二日間':'ふつかかん','三日間':'みっかかん','四日間':'よっかかん','五日間':'いつかかん','六日間':'むいかかん','七日間':'なのかかん','八日間':'ようかかん','九日間':'ここのかかん','十日間':'とおかかん','三分咲き':'さんぶざき','七分咲き':'しちぶざき','身体':'からだ','先刻':'さっき','顏':'かお','固より':'もとより','固から':'もとから','是':'これ','出來':'でき','寐':'ね','大分':'だいぶ','大分市':'おおいたし','背後':'うしろ','弄る':'いじる','明い':'あかるい','割る':'わる','授ける':'さずける','預ける':'あずける','物言う':'ものいう','放す':'はなす','這入る':'はいる','拘り':'こだわり','烟る':'けむる','白み':'しろみ','脅かし':'おどかし','解れ':'ほつれ','委す':'まかす','訪い':'とぶらい','入替':'いれかえ','入替戦':'いれかえせん','逼る':'せまる'};
 // Particles and auxiliaries always end a compound candidate: merging across
 // them (大人の対応, 来た, と言った) destroys word boundaries and grammar info.
 // Exception: 副助詞 like ずつ are part of the word itself (少しずつ).
 const BLOCK_POS=/^(助詞|助動詞)$/;
 const EXTENDABLE_P1=/^副助詞$/;
 const isBlocked=t=>BLOCK_POS.test(t.pos||'')&&!EXTENDABLE_P1.test(t.pos_detail_1||'');
 const MAX_COMPOUND=12;
 // After 今日は / 今晩は, only these followers mean the greeting usage.
 const GREETING_FOLLOW=/^[、。．.，！？!?」』）”]$/u;
 const DEM_PARA=/^(その|この|あの|どの)方$/;
 const DEM_ONLY=/^(その|この|あの|どの)$/;
 // Verbs that take a person with に/へ/を/と (→ かた) vs verbs of choosing (→ ほう).
 const PERSON_VERB=/(聞|訊|尋|会|逢|頼|伺|訪ね|電話|連絡|相談|任せ|預け|渡す|贈る|紹介|挨拶|お願い|招|誘)/;
 const CHOOSE_VERB=/(決める|選ぶ|定める)/;
 // ～分 minute-counter readings kuromoji gets wrong. P-group takes ぷん
 // (三分→さんぷん); F-group takes ふん (二分→にふん, not にぶん).
 const FUN_P={'一':'いっ','三':'さん','四':'よん','六':'ろっ','八':'はっ','何':'なん','十':'じゅっ','二十':'にじゅっ','三十':'さんじゅっ'};
 const FUN_F={'二':'に','九':'きゅう'};
 const FUN_NUM=Object.assign({},FUN_P,FUN_F);
 // Contexts where 十分 means "10 minutes" (→ じゅっぷん), not "enough".
 const FUN_DUR=/^(待|かか|遅れ|余裕|間|後|前|ほど|くらい|近く|以上|以内|未満)/;
 function funAfter(out,k){
  const nx=out[k+1];if(!nx)return'';
  const ns=nx.surface_form||'';
  if(ns==='の'){
   const nx2=out[k+2];
   if(nx2&&/^(一|二|三|四|五|六|七|八|九|十|百|千|万|[0-9０-９])/.test(nx2.surface_form||''))return'FRAC';
   return'の';
  }
  if(/^(する|します|した|して|しよう|される|させる)/.test(ns))return'SURU';
  return ns;
 }

 function isGreetingFollow(t){return !t||GREETING_FOLLOW.test(t.surface_form||'');}

 // Returns {reading, source, confident} or null when the reading cannot be
 // determined safely. null means: do not merge, do not override.
 function chooseReading(whole,joined,options,custom){
  if(custom)return{reading:hira(custom),source:'builtin',confident:true};
  if(preferred[whole])return{reading:preferred[whole],source:'curated',confident:true};
  const readings=(options||[]).map(x=>hira(x[0]));
  if(readings.includes(joined))return{reading:joined,source:'verified',confident:true};
  if(readings.length===1)return{reading:readings[0],source:'dict',confident:false};
  return null;
 }

 function enrich(original,lexicon,overrides={}){
 // 预处理：拆分 kuromoji 误粘的助词（如 角から 被切成一个"形容词"）
  const tokens=[];
  for(const t of original){
   const sf=t.surface_form||'';
   const m=sf.match(/^(.+)(から|まで|より|ほど|だけ|ばかり|くらい|ぐらい)$/);
   if(m&&t.pos!=='助詞'&&t.pos!=='助動詞'&&m[1].length>=1){
    const head=m[1], tail=m[2];
    const tailKata=tail.replace(/[ぁ-ん]/g,c=>String.fromCharCode(c.charCodeAt(0)+96));
    let headReading=t.reading||'';
    if(headReading.endsWith(tailKata)) headReading=headReading.slice(0,-tailKata.length);
    tokens.push({...t,surface_form:head,reading:headReading||head,basic_form:head});
    tokens.push({surface_form:tail,reading:tail,pos:'助詞',pos_detail_1:'格助詞',basic_form:tail,word_type:'UNKNOWN'});
    continue;
   }
   tokens.push(t);
  }
  original = tokens;
  const out=[];
  for(let i=0;i<original.length;i++){
   const first=original[i],s1=first.surface_form||'';
   // 今日は / 今晩は: greeting (こんにちは/こんばんは) only when it stands
   // alone or is followed by closing punctuation. Otherwise きょうは/こんばんは.
   if(s1==='今日'||s1==='今晩'){
    const wa=original[i+1];
    if(wa&&wa.surface_form==='は'&&wa.pos==='助詞'&&isGreetingFollow(original[i+2])){
     const reading=s1==='今日'?'こんにちは':'こんばんは';
     out.push({...wa,surface_form:s1+'は',reading,basic_form:s1+'は',word_type:'KNOWN',
      pos:'感動詞',pos_detail_1:'',conjugated_form:'',conjugated_type:'',
      readings:[reading],reading_source:'rule',merged:true});
     i+=1;continue;
    }
   }
   // 行っ: kuromoji 誤判为行う(おこなっ)，但「行ってみたい/みる」必为行く(いく)。
   // 行う+みたい极罕见，直接纠正。
   if(s1==='行っ'){
    const t2=original[i+1],t3=original[i+2];
    if(t2&&t2.surface_form==='て'&&t3&&(t3.surface_form==='み'||t3.surface_form==='見')){
     out.push({...first,reading:'イッ',readings:['いっ'],reading_source:'rule'});
     continue;
    }
   }
   if(!s1||/\s/.test(s1)||isBlocked(first)){out.push(first);continue;}
   let whole='',joined='',match=null;
   for(let j=i;j<original.length;j++){
    const t=original[j],surface=t.surface_form||'';
    if(!surface||/\s|[。！？、，,.!?「」『』（）()]/.test(surface))break;
    if(j>i&&isBlocked(t)&&!preferred[whole+surface])break;
    whole+=surface;
    if(Array.from(whole).length>MAX_COMPOUND)break;
    joined+=hira(t.reading||surface);
    const custom=overrides[whole];
    const options=custom?null:lexicon[whole];
    if(!custom&&!options?.length&&!preferred[whole])continue;
    const decision=chooseReading(whole,joined,options,custom);
    if(!decision)continue;
    const last=original[j];
    // POS comes from the last content token (Japanese compounds are right-headed);
    // if it is a functional particle like ずつ, fall back to the first token.
    const posSrc=isBlocked(last)?original[i]:last;
    match={end:j,whole,decision,readings:(options||[]).map(x=>hira(x[0])),
     pos:posSrc.pos,p1:posSrc.pos_detail_1||'',cf:posSrc.conjugated_form||'',ct:posSrc.conjugated_type||''};
   }
   if(match&&match.end>i){
    const d=match.decision;
    // A span starting with an inflected word (verb/adjective stem) must not
    // take an uncertain dictionary reading: 来(き) is not the noun 来(らい).
    if(!d.confident&&/^(動詞|形容詞)$/.test(original[i].pos||'')){out.push(first);}
    else{
     const properNoun=(original[i].pos_detail_1||'').indexOf('固有名詞')===0;
     out.push({...original[i],surface_form:match.whole,reading:d.reading,basic_form:match.whole,
      word_type:'KNOWN',pos:match.pos,pos_detail_1:match.p1,conjugated_form:match.cf,conjugated_type:match.ct,
      readings:match.readings,reading_source:d.source,merged:true,
      uncertain:(!d.confident&&properNoun)||undefined});
     i=match.end;
    }
   }else if(match){
    // Single token with a dictionary/override hit.
    const d=match.decision,t=original[i];
    if(!d.confident&&/^(動詞|形容詞)$/.test(t.pos||'')){out.push(t);}
    else{
     const properNoun=(t.pos_detail_1||'').indexOf('固有名詞')===0;
     out.push({...t,reading:d.reading,readings:match.readings,reading_source:d.source,
      uncertain:(!d.confident&&properNoun)||undefined});
    }
   }else out.push(first);
  }
  applyContextRules(out);
  // 合并 お+兄 → お兄（防 kuromoji 切散后 AI 只判 兄）
  for(let i=0;i<out.length-1;i++){
   if(out[i].surface_form==='お'&&out[i+1].surface_form==='兄'){
    out[i].surface_form='お兄';out[i].reading='おにい';out[i].reading_source='curated';out[i].merged=true;
    out.splice(i+1,1);i--;
   }
  }
  // 古典の補助動詞・動詞の漢字表記：連用形/て＋了＋送り仮名 → merge with okurigana
  // なって了った=しまった, 飲み了わる=のみおわる, 言い了おおせる=いいおおせる,
  // 始末に了えない=しまつにおえない, 音楽の了る=おんがくのおわる.
  // kuromoji splits 了|わる and reads 了 as りょう; the construction decides:
  // て/で (+は/も) ＋了… = しまう (おわる never follows て), otherwise the
  // okurigana decides. Merged into one token (like お+兄) so no empty reading
  // ever reaches the ruby renderer (empty → '？' unknown).
  // (dictionary already covers て/で＋了う=しまう as one token;
  //  kuromoji-merged 了せ is fixed in place in applyContextRules.)
  const ryouContrib=(nr,shimauFam)=>{
   if(shimauFam)return'しま';
   if(nr[0]==='わ')return'お';
   if(nr[0]==='っ'||nr[0]==='つ')return'おわ';
   if(nr[0]==='お'&&nr.length>1)return'';
   if(nr[0]==='せ')return'おお';
   if('るりれろら'.indexOf(nr[0])>=0)return'おわ';
   if(nr[0]==='ん')return'おわ'; // classical negative: 化し了んぬ=かしおわんぬ
   if(nr[0]==='え'||nr[0]==='お')return'お';
   return null;
  };
  for(let i=0;i<out.length-1;i++){
   const t=out[i];
   if((t.surface_form||'')!=='了')continue;
   if(t.reading_source==='curated'||t.reading_source==='builtin')continue;
   const nx=out[i+1],ns=nx?(nx.surface_form||''):'';
   if(!nx||!/^[ぁ-んー]+$/.test(ns))continue;
   const nr=hira(nx.reading||ns);
   const ps=(out[i-1]||{}).surface_form||'';
   const pps=(out[i-2]||{}).surface_form||'';
   // て/で (classical kana also writes っ as つ: なつて/なつた) + optional は/も
   const teFam=ps2=>ps2==='て'||ps2==='で'||ps2==='つて'||ps2==='つた'||ps2.endsWith('て')||ps2.endsWith('で');
   const shimauFam=teFam(ps)||((ps==='は'||ps==='も')&&teFam(pps));
   const contrib=ryouContrib(nr,shimauFam);
   if(contrib===null)continue;
   t.surface_form='了'+ns;t.reading=contrib+hira(nx.reading||ns);
   t.reading_source='rule';t.uncertain=undefined;t.merged=true;
   out.splice(i+1,1);i--;
  }
  // AI 语境判读：标记多读音疑难 token，后台由 AI 按句子定读音
  const AI_AMBIG=/^[兄角間方他側頃上下中生汁君様達重空]$/;
  for(const t of out){
   const sf=t.surface_form||'';
   // 单字多读音汉字标出，由 AI 按语境定夺；用户/词典已定的不标
   if(AI_AMBIG.test(sf)&&!t.merged&&
      t.reading_source!=='curated'&&t.reading_source!=='builtin'){
    t.needsAi=true;
   }
  }
  return out;
 }

 function lookaheadText(out,from,n){
  let s='';
  for(let k=from;k<Math.min(out.length,from+n);k++)s+=(out[k].surface_form||'')+(out[k].basic_form||'');
  return s;
 }

 function applyContextRules(out){
  for(let k=0;k<out.length;k++){
   const t=out[k];if(!t)continue;
   const s=t.surface_form||'';
   // その/この/あの/どの + 方: the particle (and verb) decide ほう vs かた.
   let dem=null,kataIdx=-1;
   const m=s.match(/^(その|この|あの|どの)方$/);
   if(m){dem=m[1];kataIdx=k;}
   else if(DEM_ONLY.test(s)&&out[k+1]&&out[k+1].surface_form==='方'){dem=s;kataIdx=k+1;}
   if(dem){
    const next=out[kataIdx+1];
    const p=next&&next.pos==='助詞'?next.surface_form:'';
    const target=out[kataIdx];
    const fix=r=>{target.reading=dem+r;target.reading_source='rule';target.uncertain=undefined;};
    if(['が','は','より','ほど'].includes(p))fix('ほう');
    else if(['に','へ','を','と'].includes(p)){
     const ahead=lookaheadText(out,kataIdx+2,5);
     if(CHOOSE_VERB.test(ahead))fix('ほう');
     else fix('かた');
    }
   }
   // 他 is multi-reading (ほか/た/かれ): standalone 他 followed by a particle
   // is ほか ("other") in modern Japanese. た lives in その他 and in compounds
   // (他人, 他殺, 他愛…), which the merger/dictionary handle separately, so
   // non-particle contexts are deliberately left untouched.
   if(s==='他'){
    const nx=out[k+1],p=nx?nx.surface_form:'';
    if(['の','に','へ','は','が','を','と','も','や','より','ほど','だけ','しか','さえ','こそ','でも','ばかり'].indexOf(p)>=0){
     t.reading='ほか';t.reading_source='rule';t.uncertain=undefined;
    }
   }
   // 古典の補助動詞・動詞の漢字表記：連用形/て＋了＋送り仮名
   // なって了った=しまった, 飲み了わる=のみおわる, 言い了おおせる=いいおおせる,
   // 始末に了えない=しまつにおえない, 音楽の了る=おんがくのおわる.
   // kuromoji splits 了|わる and reads 了 as りょう; the construction decides:
   // て/で (+は/も) ＋了… = しまう (おわる never follows て), otherwise the
   // okurigana decides (わる→おわる, る→おわる, おおせる→silent 了, える→おえる).
   // (dictionary already covers て/で＋了う=しまう as one token.)
   // kuromoji sometimes merges 了+okurigana itself (隠し|了せ|ない → 了せ(リョウセ)):
   // fix the reading in place (contribution is never empty here).
   if(/^了[ぁ-んー]+$/.test(s)&&t.reading_source!=='curated'&&t.reading_source!=='builtin'){
    const mm=s.match(/^了([ぁ-んー]+)$/);
    const ps2=(out[k-1]||{}).surface_form||'';
    const pps2=(out[k-2]||{}).surface_form||'';
    const teFam2=ps3=>ps3==='て'||ps3==='で'||ps3==='つて'||ps3==='つた'||ps3.endsWith('て')||ps3.endsWith('で');
    const shimauFam2=teFam2(ps2)||((ps2==='は'||ps2==='も')&&teFam2(pps2));
    const nr2=hira(mm[1]);let lr=null;
    if(shimauFam2)lr='しま';
    else if(nr2[0]==='せ')lr='おお';
    else if(nr2[0]==='わ')lr='お';
    if(lr!==null){t.reading=lr+hira(mm[1]);t.reading_source='rule';t.uncertain=undefined;t.merged=true;}
   }
   // (お)腹が空いた → すいた (お腹が空いた = hungry, not あいた).
   // 側 is そば standalone, がわ as a suffix. A 側 token right after a
   // content word (川側, あちら側, こっち側…) is the suffix → leave it.
   // Otherwise (sentence start, after その/particles/punctuation) it is そば.
   if(s==='側'){
    const pv=out[k-1],nx=out[k+1],p=nx?nx.surface_form:'';
    const prevContent=pv&&/^(名詞|代名詞|形容詞|動詞|接頭辞|接尾辞)/.test(pv.pos||'');
    if(!prevContent&&['に','へ','を','で','が','の','は','も','と','や','から','まで','より','ほど','だけ','しか','さえ','こそ','でも','ばかり'].indexOf(p)>=0){
     t.reading='そば';t.reading_source='rule';t.uncertain=undefined;
    }
   }
   // この間: このあいだ, except この間+に (during) → このかん.
   if(s==='この間'){
    const nx=out[k+1];
    if(nx&&nx.surface_form==='に'){t.reading='このかん';t.reading_source='rule';t.uncertain=undefined;}
   }
   if(s==='空い'&&hira(t.reading)==='あい'){
    const prev=out[k-1],prev2=out[k-2];
    if(prev&&prev.surface_form==='が'&&prev2&&/^(お)?腹$/.test(prev2.surface_form||'')){
     t.reading='すい';t.reading_source='rule';t.uncertain=undefined;
    }
   }
   // 戸/ドア/窓…が開く → あく (opens by itself). 花が開く (bloom) and
   // 心が開く (open one's heart) keep ひらく: only door-like subjects flip.
   const hr=hira(t.reading||'');
   if((s==='開く'&&hr==='ひらく')||(s==='開い'&&hr==='ひらい')||(s==='開か'&&hr==='ひらか')){
    const pv=out[k-1],pv2=out[k-2];
    if(pv&&pv.surface_form==='が'&&pv2&&/^(戸|ドア|窓|扉|蓋|門|口|引き戸|雨戸|シャッター|トランク|冷蔵庫|穴|目)$/.test(pv2.surface_form||'')){
     t.reading=s==='開く'?'あく':(s==='開い'?'あい':'あか');
     t.reading_source='rule';t.uncertain=undefined;
    }
   }
   // ～分 minute counter: kuromoji gives ふん/ぶん where ぷん is required
   // (三分→さんぷん, 二十分→にじゅっぷん, 何分→なんぷん). Fractions
   // (三分の一), 十分な/十分に (sufficient) and 二分する are left alone.
   const fa=funAfter(out,k);
   const fm=s.match(/^(一|二|三|四|六|八|九|何|十|二十|三十)分$/);
   if(fm&&FUN_NUM[fm[1]]&&/(ふん|ぶん|ぷん)$/.test(hr)){
    if(fa!=='FRAC'&&fa!=='SURU'&&fa!=='の'&&(fm[1]!=='十'||FUN_DUR.test(fa))){
     t.reading=FUN_NUM[fm[1]]+(FUN_P[fm[1]]?'ぷん':'ふん');t.reading_source='rule';t.uncertain=undefined;
    }
   }
   if(FUN_NUM[s]&&out[k+1]&&out[k+1].surface_form==='分'&&hira(out[k+1].reading||'')==='ふん'){
    const fa2=funAfter(out,k+1);
    if(fa2!=='FRAC'&&fa2!=='SURU'&&fa2!=='の'&&(s!=='十'||FUN_DUR.test(fa2))){
     t.reading=FUN_NUM[s];t.reading_source='rule';t.uncertain=undefined;
     const fb=out[k+1];fb.reading=FUN_P[s]?'ぷん':'ふん';fb.reading_source='rule';fb.uncertain=undefined;
    }
   }
   if(FUN_NUM[s]&&out[k+1]&&out[k+1].surface_form==='分間'&&hira(out[k+1].reading||'')==='ふんかん'){
    t.reading=FUN_NUM[s];t.reading_source='rule';t.uncertain=undefined;
    const fb=out[k+1];fb.reading='ぷんかん';fb.reading_source='rule';fb.uncertain=undefined;
   }
  }
 }

 return{enrich};
});
