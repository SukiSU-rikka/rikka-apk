(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.RikkaReadings=factory();})(typeof self!=='undefined'?self:this,()=>{
 'use strict';
 const hira=s=>String(s||'').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-96));
 // Exceptional readings verified by hand against real sentences.
 // Anything not listed here must agree with the morphological reading,
 // otherwise the span is left unmerged rather than guessed.
 const preferred={'六花':'りっか','其処':'そこ','此処':'ここ','何処':'どこ','彼処':'あそこ','夜中':'よなか','微笑み':'ほほえみ','台詞':'せりふ','明後日':'あさって','夜風':'よかぜ','一人':'ひとり','二人':'ふたり','挿れ':'いれ','二十歳':'はたち','一昨年':'おととし','乳母':'うば','番頭':'ばんとう','その外':'そのほか','この間':'このあいだ','この間中':'このあいだじゅう','その間':'そのあいだ','あの間':'あのあいだ','どの間':'どのあいだ','間':'あいだ','お兄':'おにい','声':'こえ','虎牙':'こが','角':'かど','他人事':'ひとごと','二日間':'ふつかかん','三日間':'みっかかん','四日間':'よっかかん','五日間':'いつかかん','六日間':'むいかかん','七日間':'なのかかん','八日間':'ようかかん','九日間':'ここのかかん','十日間':'とおかかん','三分咲き':'さんぶざき','七分咲き':'しちぶざき','身体':'からだ','先刻':'さっき','顏':'かお','固より':'もとより','固から':'もとから','是':'これ','出來':'でき','寐':'ね','大分':'だいぶ','大分市':'おおいたし','大分県':'おおいたけん','背後':'うしろ','弄る':'いじる','明い':'あかるい','割る':'わる','授ける':'さずける','預ける':'あずける','物言う':'ものいう','放す':'はなす','這入る':'はいる','拘り':'こだわり','烟る':'けむる','白み':'しろみ','脅かし':'おどかし','解れ':'ほつれ','委す':'まかす','訪い':'とぶらい','入替':'いれかえ','入替戦':'いれかえせん','逼る':'せまる','大人':'おとな','明日':'あした','昨日':'きのう','云爾':'しかいふ','云譯':'いひわけ','云訳':'いいわけ','云付け':'いひつけ','陽キャ':'ようきゃ','陰キャ':'いんきゃ','罰ゲーム':'ばつげーむ','嘘告':'うそこく','嘘告白':'うそこくはく'};
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
 // Loose comparison that ignores voicing / gemination / long-vowel noise:
 // さんかい≈さんがい, いちほん≈いっぽん. Used to accept a dictionary reading that
 // only fixes sound changes the morphological analyser missed.
 const DEVOICE={が:'か',ぎ:'き',ぐ:'く',げ:'け',ご:'こ',ざ:'さ',じ:'し',ず:'す',ぜ:'せ',ぞ:'そ',だ:'た',ぢ:'ち',づ:'つ',で:'て',ど:'と',ば:'は',び:'ひ',ぶ:'ふ',べ:'へ',ぼ:'ほ',ぱ:'は',ぴ:'ひ',ぷ:'ふ',ぺ:'へ',ぽ:'ほ'};
 const devoice=s=>hira(s).replace(/[がぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽ]/g,c=>DEVOICE[c]);
 // っ in either reading may stand for つ/く/ち/き in the other (促音化); lengths must match.
 function looseEq(a,b){a=devoice(a);b=devoice(b);if(a.length!==b.length)return false;for(let i=0;i<a.length;i++){if(a[i]===b[i])continue;if((a[i]==='っ'&&/[つくちき]/.test(b[i]))||(b[i]==='っ'&&/[つくちき]/.test(a[i])))continue;return false;}return true;}
 // Returns {reading, source, confident} or null when the reading cannot be
 // determined safely. null means: do not merge, do not override.
 function chooseReading(whole,joined,options,custom,single,tok,kanjiSplit){
  if(custom)return{reading:hira(custom),source:'builtin',confident:true};
  if(preferred[whole])return{reading:preferred[whole],source:'curated',confident:true};
  const opts=options||[];
  const readings=opts.map(x=>hira(x[0]));
  const unknownPart=/[*々〆\u3400-\u9fff]/u.test(joined);
  if(!unknownPart&&readings.includes(joined)){
   // The analyser sometimes picks a rare dictionary entry for a single word
   // (夜中→やちゅう). If the word has exactly one common reading, prefer it.
   const k=readings.indexOf(joined);
   const proper=tok&&String(tok.pos_detail_1||'').indexOf('固有名詞')===0;
   if(single&&!proper&&tok&&tok.pos==='名詞'&&Array.from(whole).length>=2&&opts[k]&&opts[k][1]===false){
    const commons=opts.filter(x=>x[1]);
    if(commons.length===1)return{reading:hira(commons[0][0]),source:'dict-common',confident:true};
   }
   return{reading:joined,source:'verified',confident:true};
  }
  if(unknownPart){
   // A token without any reading (其|処 → *しょ): trust the dictionary.
   const commons=opts.filter(x=>x[1]);
   const pick=commons.length===1?commons[0]:(opts.length===1?opts[0]:null);
   return pick?{reading:hira(pick[0]),source:'dict',confident:false}:null;
  }
  // 分词器不认识的汉字复合词被切成单字后乱猜读音（聖剣→きよし+けん、魔導具→ま+しるべ+ぐ、王都→おう+みやこ）：
  // 整词在词典里有收录时，以词典为准。
  if(kanjiSplit&&/^[\u3400-\u9fff々]{2,5}$/u.test(whole)&&opts.length){const commons=opts.filter(x=>x[1]);const pick=(commons.length?commons:opts)[0];return{reading:hira(pick[0]),source:'dict-compound',confident:true};}
  // A lone kanji the analyser guessed as a personal name (智→さとし) in running text.
  if(single&&readings.length===1&&tok&&tok.pos_detail_2==='人名'&&Array.from(whole).length===1)return{reading:readings[0],source:'dict',confident:false};
  const looseHits=readings.filter(r=>looseEq(r,joined));
  if(readings.length>1&&looseHits.length===1)return{reading:looseHits[0],source:'dict',confident:false};
  if(readings.length===1){
   // Only a common reading, or one that differs by sound changes alone, may
   // override the analyser. Rare alternates (百歳→ももとせ) are rejected.
   if(opts[0][1]||looseEq(readings[0],joined))return{reading:readings[0],source:'dict',confident:false};
   return null;
  }
  return null;
 }

 /* ================= 数字＋助数詞 =================
  * 三本→さんぼん、六匹→ろっぴき、4時→よじ、11月→じゅういちがつ、5日→いつか、1人→ひとり …
  * Kanji numerals are merged with the counter into one locked token;
  * Arabic digits keep their own token and only the counter's reading changes
  * (whole-word readings such as ひとり / ついたち cover the digits too). */
 const KNUM={'〇':0,'零':0,'一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9};
 const KUNIT={'十':10,'百':100,'千':1000};
 const KBIG={'万':1e4,'億':1e8,'兆':1e12};
 function parseKanjiNum(str){
  if(str==='何')return'nan';
  if(!/^[〇零一二三四五六七八九十百千万億兆]+$/.test(str))return null;
  if(!/[十百千万億兆]/.test(str)){let v=0;for(const c of str)v=v*10+KNUM[c];return str.length>1&&str[0]==='〇'?null:v;}
  let total=0,section=0,num=-1;
  for(const c of str){
   if(c in KNUM)num=num>=0?num*10+KNUM[c]:KNUM[c];
   else if(c in KUNIT){section+=(num<0?1:num)*KUNIT[c];num=-1;}
   else{if(num>=0)section+=num;total+=(section||1)*KBIG[c];section=0;num=-1;}
  }
  if(num>=0)section+=num;
  return total+section;
 }
 function parseDigits(str){const t=str.replace(/[０-９]/g,c=>String.fromCharCode(c.charCodeAt(0)-0xFEE0));return /^[0-9]{1,9}$/.test(t)?parseInt(t,10):null;}
 const D1=['','いち','に','さん','よん','ご','ろく','なな','はち','きゅう'];
 function elems10k(n){ // n < 10000 → [{plain,gem,cls,d,kind}]
  const out=[];const th=Math.floor(n/1000),hu=Math.floor(n%1000/100),te=Math.floor(n%100/10),on=n%10;
  if(th)out.push({plain:th===1?'せん':th===3?'さんぜん':th===8?'はっせん':D1[th]+'せん',cls:'n',kind:'1000'});
  if(hu){const pl=hu===1?'ひゃく':hu===3?'さんびゃく':hu===6?'ろっぴゃく':hu===8?'はっぴゃく':D1[hu]+'ひゃく';out.push({plain:pl,gem:pl.slice(0,-1)+'っ',cls:'gem',kind:'100'});}
  if(te){const pl=(te===1?'':D1[te])+'じゅう';out.push({plain:pl,gem:pl.slice(0,-1)+'っ',cls:'gem',kind:'10'});}
  if(on)out.push({plain:D1[on],gem:{1:'いっ',6:'ろっ',8:'はっ'}[on],cls:{1:'gem',6:'gem',8:'gem',3:'n'}[on]||'o',d:on,kind:'1'});
  return out;
 }
 function readNum(n,zero){
  if(n==='nan')return{head:'',last:{plain:'なん',cls:'n',kind:'nan'}};
  if(n===0)return{head:'',last:{plain:zero||'ぜろ',cls:'o',kind:'0'}};
  if(!(n>0&&n<1e12))return null;
  const els=[];const oku=Math.floor(n/1e8),man=Math.floor(n%1e8/1e4),rest=n%1e4;
  const join=a=>a.map(e=>e.plain).join('');
  if(oku)els.push({plain:join(elems10k(oku))+'おく',cls:'o',kind:'1e8'});
  if(man)els.push({plain:join(elems10k(man))+'まん',cls:'n',kind:'1e4'});
  els.push(...elems10k(rest));
  const last=els.pop();return{head:join(els),last};
 }
 const P_ROW={は:'ぱ',ひ:'ぴ',ふ:'ぷ',へ:'ぺ',ほ:'ぽ'},B_ROW={は:'ば',ひ:'び',ふ:'ぶ',へ:'べ',ほ:'ぼ'};
 const VOICE_ROW={か:'が',き:'ぎ',く:'ぐ',け:'げ',こ:'ご',さ:'ざ',し:'じ',す:'ず',せ:'ぜ',そ:'ぞ',た:'だ',ち:'ぢ',つ:'づ',て:'で',と:'ど',は:'ば',ひ:'び',ふ:'ぶ',へ:'べ',ほ:'ぼ'};
 const pForm=r=>(P_ROW[r[0]]||r[0])+r.slice(1),bForm=r=>(B_ROW[r[0]]||r[0])+r.slice(1),vForm=r=>(VOICE_ROW[r[0]]||r[0])+r.slice(1);
 const T47={v4:'よ',v7:'しち',v9:'く'};
 // t: H=本型(1,6,8,10,100促音+半濁/3,千,万,何浊) HP=分型(3,4,何也半濁) K=回型(促音) KV=階型(3,何浊) S/T=冊・点型(1,8,10促音) SV=足 P=无音变
 const CTR={
  '本':{r:'ほん',t:'H'},'匹':{r:'ひき',t:'H'},'杯':{r:'はい',t:'H'},'杯目':{r:'はいめ',t:'H'},'本目':{r:'ほんめ',t:'H'},
  '分':{r:'ふん',t:'HP'},'分間':{r:'ふんかん',t:'HP'},'泊':{r:'はく',t:'HP'},'発':{r:'はつ',t:'HP'},'歩':{r:'ほ',t:'HP'},'票':{r:'ひょう',t:'HP'},
  '回':{r:'かい',t:'K'},'回目':{r:'かいめ',t:'K'},'個':{r:'こ',t:'K'},'ヶ月':{r:'かげつ',t:'K'},'か月':{r:'かげつ',t:'K'},'カ月':{r:'かげつ',t:'K'},'ケ月':{r:'かげつ',t:'K'},'ヵ月':{r:'かげつ',t:'K'},'箇月':{r:'かげつ',t:'K'},'ヶ月間':{r:'かげつかん',t:'K'},'か月間':{r:'かげつかん',t:'K'},
  '件':{r:'けん',t:'K'},'曲':{r:'きょく',t:'K'},'巻':{r:'かん',t:'K'},'ヶ所':{r:'かしょ',t:'K'},'か所':{r:'かしょ',t:'K'},'カ所':{r:'かしょ',t:'K'},'箇所':{r:'かしょ',t:'K'},'ヶ国':{r:'かこく',t:'K'},'か国':{r:'かこく',t:'K'},'カ国':{r:'かこく',t:'K'},'期':{r:'き',t:'K'},'学期':{r:'がっき'},
  '階':{r:'かい',t:'KV'},'軒':{r:'けん',t:'KV'},
  '冊':{r:'さつ',t:'S'},'歳':{r:'さい',t:'S'},'才':{r:'さい',t:'S'},'週':{r:'しゅう',t:'S'},'週間':{r:'しゅうかん',t:'S'},'週目':{r:'しゅうめ',t:'S'},'隻':{r:'せき',t:'S'},'社':{r:'しゃ',t:'S'},'戦':{r:'せん',t:'S'},'足':{r:'そく',t:'SV'},
  '頭':{r:'とう',t:'T'},'着':{r:'ちゃく',t:'T'},'通':{r:'つう',t:'T'},'点':{r:'てん',t:'T'},'丁目':{r:'ちょうめ',t:'T'},
  '枚':{r:'まい'},'台':{r:'だい'},'度':{r:'ど'},'度目':{r:'どめ'},'番':{r:'ばん'},'番目':{r:'ばんめ'},'番線':{r:'ばんせん'},'秒':{r:'びょう'},'倍':{r:'ばい'},'号':{r:'ごう'},'名':{r:'めい'},'位':{r:'い'},'部':{r:'ぶ'},'列':{r:'れつ'},'章':{r:'しょう'},'話':{r:'わ'},'代':{r:'だい'},'割':{r:'わり'},'問':{r:'もん'},'人前':{r:'にんまえ',v4:'よ'},
  '円':{r:'えん',v4:'よ'},'年':{r:'ねん',v4:'よ'},'年間':{r:'ねんかん',v4:'よ'},'年生':{r:'ねんせい',v4:'よ'},'年目':{r:'ねんめ',v4:'よ'},'年後':{r:'ねんご',v4:'よ'},'年前':{r:'ねんまえ',v4:'よ'},
  '時':{r:'じ',...T47},'時間':{r:'じかん',v4:'よ',v9:'く'},'時半':{r:'じはん',...T47},'時頃':{r:'じごろ',...T47},'時限':{r:'じげん',...T47},
  '月':{r:'がつ',v4:'し',v7:'しち',v9:'く',max12:true},
  '人':{sp:'nin'},'日':{sp:'day'},'日間':{sp:'day',suf:'かん'},'日目':{sp:'day',suf:'め'}
 };
 const DAY={2:'ふつか',3:'みっか',4:'よっか',5:'いつか',6:'むいか',7:'なのか',8:'ようか',9:'ここのか',10:'とおか',14:'じゅうよっか',20:'はつか',24:'にじゅうよっか'};
 function counterReading(n,key,ctx){
  const def=CTR[key];if(!def)return null;ctx=ctx||{};
  if(def.sp==='nin'){
   if(n===1)return{full:'ひとり',whole:true};
   if(n===2)return{full:'ふたり',whole:true};
   const R=readNum(n);if(!R)return null;const L=R.last;
   const lf=L.d===4?'よ':L.d===7?'しち':L.plain;
   return{num:R.head+lf,ctr:'にん',full:R.head+lf+'にん'};
  }
  if(def.sp==='day'){
   const suf=def.suf||'';
   if(n===1&&!suf&&ctx.date)return{full:'ついたち',whole:true};
   if(DAY[n])return{full:DAY[n]+suf,whole:true};
   const R=readNum(n);if(!R)return null;const L=R.last;
   if(L.d===4&&n%10===4)return{full:R.head+'よっか'+suf,whole:true};
   const lf=L.d===7?'しち':L.d===9?'く':L.plain;
   return{num:R.head+lf,ctr:'にち'+suf,full:R.head+lf+'にち'+suf};
  }
  if(def.max12&&!(n==='nan'||(n>=1&&n<=12)))return null;
  const R=readNum(n,ctx.zero);if(!R)return null;const L=R.last,t=def.t||'P';
  let lf=L.plain,ctr=def.r;
  if(t==='P'){if(L.d===4&&def.v4)lf=def.v4;else if(L.d===7&&def.v7)lf=def.v7;else if(L.d===9&&def.v9)lf=def.v9;}
  else{
   const gemOK=L.gem&&((t==='H'||t==='HP'||t==='K'||t==='KV')||L.d===1||L.d===8||L.kind==='10');
   if(gemOK){lf=L.gem;if(t==='H'||t==='HP')ctr=pForm(ctr);}
   else if(L.cls==='n'){if(t==='H')ctr=bForm(ctr);else if(t==='HP')ctr=pForm(ctr);else if(t==='KV'||t==='SV')ctr=vForm(ctr);}
   else if(L.d===4&&t==='HP')ctr=pForm(ctr);
  }
  return{num:R.head+lf,ctr,full:R.head+lf+ctr};
 }
 const isNumTok=t=>t&&((t.pos==='名詞'&&t.pos_detail_1==='数')||t.surface_form==='何');
 function applyCounters(toks){
  const out=[];
  for(let i=0;i<toks.length;i++){
   let j=i,kind=null,str='';
   while(j<toks.length&&isNumTok(toks[j])){
    const sf=toks[j].surface_form||'';
    const k=/^[〇零一二三四五六七八九十百千万億兆何]+$/.test(sf)?'k':/^[0-9０-９]+$/.test(sf)?'d':null;
    if(!k||(kind&&kind!==k))break;kind=k;str+=sf;j++;
   }
   if(j===i){out.push(toks[i]);continue;}
   const ct=toks[j],key=ct&&ct.surface_form;
   const pushRaw=()=>{for(let x=i;x<j;x++)out.push(toks[x]);i=j-1;};
   if(!ct||!CTR[key]||(str.includes('何')&&str!=='何')){pushRaw();continue;}
   const nx=toks[j+1],nx2=toks[j+2],nxs=nx?nx.surface_form||'':'';
   // 三分の一 (fraction), 二分する, 一足先に, 何分にも … are not counters.
   if(key==='分'&&((nxs==='の'&&isNumTok(nx2))||/^(する|し|さ|され)$/.test(nxs)||(str==='何'&&/^(に|の)$/.test(nxs)))){pushRaw();continue;}
   if(key==='足'&&/^(先|早|遅|違い|お先)/.test(nxs)){pushRaw();continue;}
   if(key==='人'&&str==='何'&&nxs==='か'&&false){pushRaw();continue;}
   const n=kind==='k'?parseKanjiNum(str):parseDigits(str);
   if(n==null){pushRaw();continue;}
   if(kind==='k'&&preferred[str+key]){out.push({...ct,reading_source:'curated',merged:true,locked:true,uncertain:undefined,word_type:'KNOWN',surface_form:str+key,basic_form:str+key,reading:preferred[str+key],pos:'名詞',pos_detail_1:'数'});i=j;continue;}
   const pv=out[out.length-1];
   const date=!!(pv&&/月$/.test(pv.surface_form||'')&&/がつ$/.test(hira(pv.reading||'')));
   const res=counterReading(n,key,{date,zero:/[零〇]/.test(str)?'れい':''});
   if(!res){pushRaw();continue;}
   const lock={reading_source:'rule',merged:true,locked:true,uncertain:undefined,word_type:'KNOWN'};
   if(kind==='k'||res.whole){
    out.push({...ct,...lock,surface_form:str+key,basic_form:str+key,reading:res.full,pos:'名詞',pos_detail_1:'数'});
   }else{
    for(let x=i;x<j;x++)out.push({...toks[x],locked:true});
    out.push({...ct,...lock,merged:false,reading:res.ctr});
   }
   i=j;
  }
  return out;
 }

 /* ================= 语境规则（第二轮） ================= */
 const FOOD=/(カレー|料理|味|ラーメン|唐辛子|とうがらし|スープ|わさび|山葵|ワサビ|キムチ|ソース|麻婆|食べ|飲|酒|塩|醤油|味噌|舌|胡椒|スパイス|激辛|中辛|辛口|甘口|鍋|タレ|担々|担担|からし|芥子|カラシ|生姜|しょうが|ジンジャー|口の中|一口|ひと口|料理)/;
 const QUIT_OBJ=/^(タバコ|煙草|たばこ|酒|お酒|仕事|会社|学校|部活|練習|話|研究|勉強|喧嘩|けんか|ケンカ|冗談|ゲーム|ダイエット|旅|旅行|計画|試合|戦争|争い|悪戯|いたずら|イタズラ|真似|まね|それ|これ|あれ|の|こと|事|癖|習慣|連載|配信|活動|作業|検討|捜索|治療|攻撃|抵抗|演技|嘘|議論|言い訳|お喋り|おしゃべり|無駄遣い|夜更かし|浮気|恋)$/;
 const DAMAGE=/^(損害|被害|迷惑|恩恵|損失|影響|罰|ダメージ|打撃|恩|嫌疑|疑い|不利益|汚名|批判|非難|処分|天罰|神罰|お咎め|咎め|不興|損|害)$/;
 const EVENT_OBJ=/(会議|式|祭|試験|調査|実験|手術|選挙|作業|研究|テスト|検査|工事|治療|礼|儀|ライブ|イベント|授業|講義|練習|発表|活動|取引|交渉|改革|攻撃|行事|葬|演奏|公演|上映|販売|募集|捜査|捜索|訓練|審査|面接|会見|祈り|処理|決議|投票|採決|点検|修理|整備|説明|確認|分析|検証|議論|対応|手続き|準備|管理|運営|開催|実施|放送|配信|撮影|収録|演説|講演|処刑|拷問|召喚|詠唱|契約|復讐|改造|改修|検討|鑑定|診察|手当て|手当)/;
 const PATH_OBJ=/^(道|坂|川|海|空|ところ|所|街道|廊下|夜道|山道|峠|我が道|わが道|旅路|人生|雪道|獣道|けもの道|大通り|通り|裏道|小道|砂漠|荒野|森|雲)$/;
 const HONOR_CUE=/(いらっしゃ|おっしゃ|仰|なさ|ござい|どなた|誰|様|さん|先生|方々|ご存|お見え|来られ|おられ|お越し|お名前|お客|でいらっ|お嬢|社長|部長|課長|殿|陛下|閣下|お方)/;
 const COMPARE_CUE=/^.{0,3}(いい|良い|よい|よかっ|良かっ|よさ|まし|マシ|安|高|早|速|遅|多|少な|大き|小さ|便利|楽|好き|上手|得意|無難|確実|正し|近|遠|強|弱|ずっと|むしろ|向い|向き|心配|勝|負|有利|不利|似合|大事|大切|重要|簡単|難し|面白|嬉し|助か|都合|効率|安全|危険|おすすめ|オススメ|自然|普通|一般|多数|上|下|先|後|気に)/;
 const DIRECTION_VERB=/(向か|向け|向い|進|歩|走|曲が|行|来|逃げ|移|寄|戻|傾|流れ|飛|転が|伸び|広が|近づ|目を|視線|顔を|指|振り)/;
 const NAN_NEXT=new Set(['の','だ','です','でしょ','でし','じゃ','て','と','で','ら','なら','なの','だろ','だっ','ぞ','なん']);
 const NANI_NEXT=new Set(['か','が','を','も','に','から','より','や','かしら','よ','それ','これ','あれ','ひとつ','一つ','っ','とか','やら','ごと','事','者','故']);
 const HITOKE_AFTER=/^(が|の|も)?(ない|無い|なく|無く|なかっ|無かっ|少な|絶え|まばら|ありませ|なし|無し|途絶)/;
 const POPULAR_NOUN=/^(店|商品|作品|歌手|俳優|女優|漫画|番組|アニメ|ゲーム|キャラ|メニュー|職業|スポーツ|ブランド|モデル|アイドル|小説|映画|曲|歌|料理|サービス|アプリ|選手|候補|政治家|生徒)/;
 const ICHIBA_PREV=/^(魚|朝|青物|卸売|築地|豊洲|蚤の|フリー|夜|闇|奴隷|黒|中央卸売|骨董|露天|露店|港)$/;
 const swapPrefix=(t,from,to)=>{const r=hira(t.reading||'');if(r.indexOf(from)===0){t.reading=to+r.slice(from.length);t.reading_source='rule';t.uncertain=undefined;return true;}return false;};
 const isBoundary=t=>!t||/^[。！？!?「」『』（）()、，…―─\s]+$/.test(t.surface_form||'');
 function windowText(out,k,back,ahead){let s='';for(let x=k-1;x>=Math.max(0,k-back);x--){const f=out[x].surface_form||'';if(/[。！？!?]/.test(f))break;s=f+s;}let a='';for(let x=k+1;x<Math.min(out.length,k+1+ahead);x++){const f=out[x].surface_form||'';if(/[。！？!?]/.test(f))break;a+=f;}return s+'|'+a;}
 function applyExtraRules(out){
  for(let k=0;k<out.length;k++){
   const t=out[k];if(!t||t.reading_source==='curated'||t.reading_source==='builtin')continue;
   const s=t.surface_form||'',hr=hira(t.reading||'');
   const pv=out[k-1],pv2=out[k-2],nx=out[k+1],nxs=nx?nx.surface_form||'':'';
   // 何：后接 の/だ/です/て/と… 读 なん，后接 か/が/を/も/に… 读 なに
   if(s==='何'&&!t.locked){
    if(NAN_NEXT.has(nxs)&&hr!=='なん'){t.reading='なん';t.reading_source='rule';}
    else if(NANI_NEXT.has(nxs)&&hr!=='なに'){t.reading='なに';t.reading_source='rule';}
   }
   // 行った：「を」+事务性名词 → おこなった；其余（で行った、に行った、て行った）→ いった
   if(s==='行っ'){
    let oko=false;
    if(pv&&pv.surface_form==='を'&&pv2){const n=pv2.surface_form||'';oko=!PATH_OBJ.test(n)&&((pv2.pos_detail_1||'')==='サ変接続'||EVENT_OBJ.test(n)||!/^名詞/.test(pv2.pos||'')||n.length>=2);}
    else if(pv&&(pv.pos_detail_1||'')==='サ変接続'&&/^名詞/.test(pv.pos||''))oko=true;
    const want=oko?'おこなっ':'いっ';
    if(hr!==want){t.reading=want;t.reading_source='rule';t.uncertain=undefined;}
   }
   // 辛い：句中出现食物/味觉相关词 → からい
   if(/^辛(い|く|かっ|さ|そう|すぎ|けれ|口)?$/.test(s)&&hr.indexOf('つら')===0){
    if(FOOD.test(windowText(out,k,10,4)))swapPrefix(t,'つら','から');
   }
   // 止める：戒掉某事 → やめる；「止めて！」→ やめて
   if(/^止め/.test(s)&&hr.indexOf('とめ')===0){
    const obj=pv&&pv.surface_form==='を'&&pv2&&QUIT_OBJ.test(pv2.surface_form||'');
    const shout=isBoundary(pv)&&/^(て|ろ|よ|なさい|ない)$/.test(nxs)&&isBoundary(out[k+2]);
    if(obj||shout)swapPrefix(t,'とめ','やめ');
   }
   // 被る：帽子・布団… → かぶる；损害・迷惑… → こうむる
   if(/^被/.test(s)&&hr.indexOf('こうむ')===0){
    const dmg=pv&&pv.surface_form==='を'&&pv2&&DAMAGE.test(pv2.surface_form||'');
    if(!dmg)swapPrefix(t,'こうむ','かぶ');
   }
   // 人気がない場所 → ひとけ
   if(s==='人気'&&hr==='にんき'){
    let a='';for(let x=k+1;x<Math.min(out.length,k+4);x++)a+=out[x].surface_form||'';
    if(HITOKE_AFTER.test(a)){let after='';for(let x=k+2;x<Math.min(out.length,k+6);x++)after+=out[x].surface_form||'';
     const tail=after.replace(/^(が|の|も)?(ない|無い|なく|無く|なかっ|無かっ|少ない|少なく)/,'');
     if(!POPULAR_NOUN.test(tail)){t.reading='ひとけ';t.reading_source='rule';}}
   }
   // 魚市場・朝市場で → いちば
   if(s==='市場'&&hr==='しじょう'){
    if((pv&&ICHIBA_PREV.test(pv.surface_form||''))||(nxs==='で'&&/(買|売|魚|野菜|果物|肉)/.test(lookaheadText(out,k+2,4))))t.reading='いちば',t.reading_source='rule';
   }
   if(/市場$/.test(s)&&s!=='市場'&&ICHIBA_PREV.test(s.slice(0,-2))&&/しじょう$/.test(hr)){t.reading=hr.slice(0,-4)+'いちば';t.reading_source='rule';}
   // お腹空いた（が省略）→ すいた
   if(/^空(い|か|き|く)$/.test(s)&&hr.indexOf('あ')===0&&((pv&&/^(お)?腹$/.test(pv.surface_form||''))||(pv&&pv.surface_form==='が'&&pv2&&/^(お)?腹$/.test(pv2.surface_form||''))))swapPrefix(t,'あ','す');
   // 星が瞬く → またたく
   if(/^瞬/.test(s)&&hr.indexOf('まばた')===0&&/(星|光|灯|明かり|ネオン|ランプ|炎|火)/.test(windowText(out,k,4,0)))swapPrefix(t,'まばた','またた');
   // 一日中・世界中 → じゅう（午前中・授業中は ちゅう）
   if(s==='中'&&hr==='ちゅう'&&pv&&/^(一日|一晩|一年|年|夜|今日|世界|日本|国|町|街|村|家|体|身体|部屋|学校|会社|クラス|そこら|一週間|一ヶ月|一ヵ月|一か月|学年|城|屋敷|森|島|宇宙|大陸|王国|国中)$/.test(pv.surface_form||'')){t.reading='じゅう';t.reading_source='rule';}
   // 〇月一日 → ついたち
   if(s==='一日'&&hr!=='ついたち'&&pv&&/月$/.test(pv.surface_form||'')&&/がつ$/.test(hira(pv.reading||''))){t.reading='ついたち';t.reading_source='rule';}
  }
 }

 /* ================= 假名对位（ruby 对齐）评分 =================
  * 物の怪: も|のけ vs もの|け —— 用词典里的单字读音给每种切法打分。 */
 function makeScorer(lexicon){
  const cache=new Map();
  const has=(base,rd)=>{const key=base+'\0'+rd;if(cache.has(key))return cache.get(key);
   const opts=lexicon[base];let v=0;
   if(opts){const rs=opts.map(o=>hira(o[0]));
    if(rs.includes(rd))v=2;
    else if(Array.from(base).length===1&&rs.some(r=>r&&(vForm(r)===rd||pForm(r)===rd||(/[くつちき]$/.test(r)&&r.slice(0,-1)+'っ'===rd)||(/[くつちき]$/.test(r)&&vForm(r).slice(0,-1)+'っ'===rd))))v=1;}
   cache.set(key,v);return v;};
  return(base,rd)=>has(base,rd);
 }


 // ===== 小说常见误读（v3.0.1）=====
 // 跨词的固定写法：分词器会切开，整体按固定读音合并
 const IDIOMS={'兎に角':'とにかく','兎も角':'ともかく','兎角':'とかく','坊ちゃま':'ぼっちゃま','坊ちゃん':'ぼっちゃん','御坊ちゃま':'おぼっちゃま','婆や':'ばあや','爺や':'じいや','お姉様':'おねえさま','お姉さま':'おねえさま','主様':'ぬしさま'};
 function applyNovelRules(out){
  const sf=t=>(t&&t.surface_form)||'';
  const set=(t,r)=>{t.reading=r;t.reading_source='rule';t.uncertain=undefined;t.needsAi=undefined;t.merged=true;};
  for(let i=0;i<out.length;i++){
   const t=out[i];
   if(t.reading_source==='builtin')continue;
   // 固定写法合并（最多 4 个 token）
   let w='',hit=0;
   for(let j=i;j<Math.min(out.length,i+4);j++){w+=sf(out[j]);if(IDIOMS[w]){hit=j;break;}if(w.length>5)break;}
   if(hit>i||(hit===i&&IDIOMS[sf(t)]&&hira(t.reading||'')!==IDIOMS[sf(t)])){
    const whole=out.slice(i,hit+1).map(sf).join('');
    const last=out[hit];
    out.splice(i,hit-i+1,{...t,surface_form:whole,basic_form:whole,pos:last.pos,pos_detail_1:last.pos_detail_1,conjugated_form:'',conjugated_type:'',word_type:'KNOWN',readings:[IDIOMS[whole]],reading:IDIOMS[whole],reading_source:'rule',merged:true,locked:true,uncertain:undefined,needsAi:undefined});
    continue;
   }
   // 辿り着いた／たどり着いて：着|い 被当成「着る＋いる」，实为「着く」的音便
   if(sf(t)==='着'&&sf(out[i+1])==='い'&&/^(た|て|だ|ちゃ|たら|たり)/.test(sf(out[i+2]))){
    t.surface_form='着い';t.basic_form='着く';set(t,'つい');out.splice(i+1,1);continue;
   }
   // 〜を後にする（離れる）：あと
   if(sf(t)==='後'&&sf(out[i-1])==='を'&&sf(out[i+1])==='に'){set(t,'あと');continue;}
   // 如何＋する：どう（如何して／如何した／如何しよう）
   if(sf(t)==='如何'&&/^(し|する|すれ|せ|しよ|しろ)/.test(sf(out[i+1]))){set(t,'どう');continue;}
   // 日本：现代文默认 にほん（にっぽん 只在少数固定说法）
   if(sf(t)==='日本'&&hira(t.reading||'')==='にっぽん'){set(t,'にほん');continue;}
  }
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
  original = applyCounters(tokens);
  const out=[];
  for(let i=0;i<original.length;i++){
   const first=original[i],s1=first.surface_form||'';
   if(first.locked){out.push(first);continue;}
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
    if(!surface||t.locked||/\s|[。！？、，,.!?「」『』（）()]/.test(surface))break;
    if(j>i&&isBlocked(t)&&!preferred[whole+surface])break;
    whole+=surface;
    if(Array.from(whole).length>MAX_COMPOUND)break;
    joined+=hira(t.reading||surface);
    const custom=overrides[whole];
    const options=custom?null:lexicon[whole];
    if(!custom&&!options?.length&&!preferred[whole])continue;
    const decision=chooseReading(whole,joined,options,custom,j===i,original[i],j>i&&original.slice(i,j+1).every(t=>/^[\u3400-\u9fff々]+$/u.test(t.surface_form||''))&&!/[\u3400-\u9fff々]$/u.test((original[i-1]||{}).surface_form||'')&&!/^[一二三四五六七八九十百千万〇零幾数何]/.test(original[i].surface_form||''));
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
  applyExtraRules(out);
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
  // 云=言の略字（古典）：云＋言うの送り仮名 → い＋送り仮名
  // 例：云ふ=いふ、云った=いった、云ひ=いひ、御云ひつけ=おいいつけ、云わく=いわく
  // kuromoji の切り方：云った→云っ|た（未知語ユッ）／云|つ|た、云ふ→云|ふ、云々→云々（一語）
  // 発火は言うの活用に限定：云曰く＋として（云《いわく》として）の「と」では発火しない。
  // 仰云い（おっしゃい）は仰せの活用なので除外。云々は一トークンで発火しない。
  // v2.6.5 追加：①仰＋云→仰云（おっしゃ）に吸収（仰云る・仰云った・仰云います、コーパス4例全おっしゃ）；
  // ②云＋と／として→いわく（言はくの古典形。うん＋との実例は168ファイルでゼロ）；
  // ③curated：云爾=しかいふ、云譯=いひわけ、云訳=いいわけ、云付け=いひつけ（いずれも本文ルビで確認）。
  const IU1=new Set(['う','い','ふ','ひ','へ','は','わ']);
  for(let i=0;i<out.length;i++){
   const t=out[i],sf=t.surface_form||'';
   if(t.reading_source==='curated'||t.reading_source==='builtin')continue;
   if(sf==='云っ'){t.reading='いっ';t.reading_source='rule';t.uncertain=undefined;t.merged=true;continue;}
   if(sf==='云い'&&((out[i-1]||{}).surface_form||'')==='仰'){
    // 仰云い=おっしゃい：い は仰せの活用、云うではない
    t.reading='い';t.reading_source='rule';t.uncertain=undefined;continue;
   }
   if(sf!=='云')continue;
   if(((out[i-1]||{}).surface_form||'')==='仰'){
    // 仰云=おっしゃ：古典で仰るを仰云ると書く（云は送り仮名のしゃの代用）。
    // コーパス4例すべておっしゃ（仰云る・仰云った・仰云います）。
    // 云を仰に吸収して仰云（おっしゃ）にまとめる。
    const pv=out[i-1];
    pv.surface_form='仰云';pv.reading='おっしゃ';pv.reading_source='rule';pv.merged=true;pv.uncertain=undefined;
    out.splice(i,1);i--;continue;
   }
   const nx=out[i+1];if(!nx)continue;
   const ns=nx.surface_form||'';
   if(!/^[ぁ-んっー]/.test(ns))continue;
   // 云いわくとして／云いわくと：云=いわく（言はくの古典形）。
   // コーパス168ファイルで云＋と・としてがうん＋と（雲として等）の実例はゼロ。
   if(ns[0]==='と'){t.reading='いわく';t.reading_source='rule';t.uncertain=undefined;continue;}
   const nnx=out[i+2],nns=nnx?(nnx.surface_form||''):'';
   if((ns==='つ'||ns==='っ')&&/^(た|て)/.test(nns)){
    // 云|つ|た → 云つた（いった）；云|つ|てる → 云つてる（いってる）；古典仮名でつ=っ
    t.surface_form='云'+ns+nns;t.reading='いっ'+hira(nns);
    t.reading_source='rule';t.uncertain=undefined;t.merged=true;
    out.splice(i+1,2);continue;
   }
   const norm1=ns.replace(/つ/g,'っ');
   // 言うの送り仮名の先頭部分の長さを決める：っ(た|て)=2文字、う/い/ふ/ひ/へ/は/わ=1文字
   let take=0;
   if(/^っ(た|て)/.test(norm1))take=2;
   else if(IU1.has(norm1[0]))take=1;
   if(!take)continue;
   if(take>=ns.length){
    // トークン全体が送り仮名：云|つて → 云つて（いって）
    t.surface_form='云'+ns;t.reading='い'+hira(ns).replace(/つ/g,'っ');
    t.reading_source='rule';t.uncertain=undefined;t.merged=true;
    out.splice(i+1,1);continue;
   }
   const rest=ns.slice(take);
   if(/^[ぁ-んっー]+$/.test(rest)){
    // 余りは仮名だけ：云|ひつ → 云ひ（いひ）＋つ（つ）；云|ふも → 云ふ（いふ）＋も（も）；
    // 云|い草 → 云い（いい）＋草（ぐさ：元トークンの読みから継承）
    t.surface_form='云'+ns.slice(0,take);
    t.reading='い'+hira(ns.slice(0,take)).replace(/つ/g,'っ');
    t.reading_source='rule';t.uncertain=undefined;t.merged=true;
    const nxr=hira(nx.reading||'');
    const restReading=nxr.length>take?nxr.slice(take):hira(rest);
    const nt={...nx,surface_form:rest,reading:restReading,basic_form:rest};
    out.splice(i+1,1,nt);continue;
   }
   // 余りに漢字を含む：云|い草 → 云い草（いいぐさ：辞書読みを継承し連濁も正しく）
   t.surface_form='云'+ns;t.reading='い'+hira(nx.reading||ns).replace(/つ/g,'っ');
   t.reading_source='rule';t.uncertain=undefined;t.merged=true;
   out.splice(i+1,1);continue;
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
  applyNovelRules(out);
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
   // 心中：小说里多半是“心里”（しんちゅう）；只有接「する」或前面是 無理/一家/親子 才是殉情（しんじゅう）
   if(s==='心中'&&t.reading_source!=='curated'){
    const nx=(out[k+1]&&out[k+1].surface_form)||'',pv=(out[k-1]&&out[k-1].surface_form)||'';
    const suicide=/^(し|す|さ|しよ|せ|事件|未遂|者)/.test(nx)||/(無理|一家|親子|情死|集団)$/.test(pv);
    t.reading=suicide?'しんじゅう':'しんちゅう';t.reading_source='rule';t.uncertain=undefined;t.needsAi=undefined;
   }
   // その/この/あの/どの + 方: the particle (and verb) decide ほう vs かた.
   let dem=null,kataIdx=-1;
   const m=s.match(/^(その|この|あの|どの)方$/);
   if(m){dem=m[1];kataIdx=k;}
   else if(DEM_ONLY.test(s)&&out[k+1]&&out[k+1].surface_form==='方'){dem=s;kataIdx=k+1;}
   if(dem){
    const next=out[kataIdx+1];
    const p=next&&next.pos==='助詞'?next.surface_form:'';
    const target=out[kataIdx];
    // 合并成「その方」时读音带上指示词；单独的「方」只写 かた/ほう
    const pre=(target.surface_form||'').indexOf(dem)===0?dem:'';
    const fix=r=>{target.reading=pre+r;target.reading_source='rule';target.uncertain=undefined;};
    const ahead=lookaheadText(out,kataIdx+1,8);
    const after=lookaheadText(out,kataIdx+2,6);
    const strongCompare=/^(が|は|も)(いい|良い|よい|よかっ|良かっ|まし|マシ|便利|楽|早|安|近|無難|確実)/.test((next&&next.surface_form||'')+(out[kataIdx+2]&&out[kataIdx+2].surface_form||''));
    if(HONOR_CUE.test(ahead))fix('かた');
    else if(['より','ほど'].includes(p))fix('ほう');
    else if(['が','は','も'].includes(p)){
     if(dem==='あの'||dem==='どの')fix(strongCompare?'ほう':'かた');
     else if(COMPARE_CUE.test(after))fix('ほう');
     else fix(dem==='その'&&p==='が'?'ほう':'かた');
    }
    else if(p==='へ')fix(PERSON_VERB.test(after)?'かた':'ほう');
    else if(p==='に')fix(DIRECTION_VERB.test(after)||CHOOSE_VERB.test(after)?'ほう':'かた');
    else if(['を','と'].includes(p))fix(CHOOSE_VERB.test(after)?'ほう':'かた');
    else if(p==='の')fix('かた');
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

 function tokenizeSmart(tokenizer,text){
  const kataOkuri=(text.match(/[\u3400-\u9fff々][ァ-ヶ]/gu)||[]).length;
  const hiraCount=(text.match(/[ぁ-ゖ]/g)||[]).length;
  if(kataOkuri<3||hiraCount>kataOkuri*2)return tokenizer.tokenize(text);
  const conv=text.replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-96));
  const toks=tokenizer.tokenize(conv);let pos=0;
  for(const t of toks){const len=(t.surface_form||'').length;t.surface_form=text.slice(pos,pos+len);pos+=len;}
  return toks;
 }
 return{enrich,tokenizeSmart,makeScorer,counterReading,readNum};
});
