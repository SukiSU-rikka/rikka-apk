'use strict';
// カクヨム 接入（v3.1.0）
// 做法对齐 Novelty 1.11.0（L4Ph/Novelty, lib/sites/kakuyomu/kakuyomu_site.dart），并用它的真实页面样本测过：
//  - 排行：/rankings/<分类>/<期间>?work_variation=long|short（会 307 跳转，原生通道会跟随），
//          数据在 __NEXT_DATA__ 的 Apollo 缓存 ROOT_QUERY["rankedWorks(...)"].nodes
//  - 搜索：/search?q=&genre_name=&serial_status=&total_character_count_range=&page=
//          数据在 ROOT_QUERY["searchWorks(...)"].nodes
//  - 作品：/works/<id> 的 Apollo 缓存 Work:<id>；完整目录不在这里，
//          要用 Work.firstPublicEpisodeUnion 拿第一话 ID，再取 /works/<id>/episodes/<第一话>/episode_sidebar
//          （li.widget-toc-chapter = 章名，li.widget-toc-episode = 每一话）
//  - 正文：.widget-episodeBody 里的 <p>，class="blank" 是空行，作者 ruby 原样保留
//  - robots.txt 禁止的路径（.../read、/login 等）一律不请求；两次请求至少间隔 1 秒
// 所有请求只能走原生桥 Android.httpGet（Narou.getText 已封装重试）。
window.Kakuyomu = (() => {
const SITE = 'https://kakuyomu.jp';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const clean = s => String(s || '').replace(/\s+/g, ' ').trim();
const parse = html => new DOMParser().parseFromString(html, 'text/html');

// 分类（slug 是カクヨム官方 URL 里的写法）
const GENRES = [
 ['all', '综合'], ['fantasy', '异世界幻想'], ['action', '现代幻想'], ['sf', '科幻 SF'],
 ['love_story', '恋爱'], ['romance', '恋爱喜剧'], ['drama', '现代剧'], ['horror', '恐怖'],
 ['mystery', '推理'], ['nonfiction', '随笔・纪实'], ['history', '历史・时代'],
 ['criticism', '创作论・评论'], ['others', '诗・童话・其他']
];
const GENRE_NAME = Object.fromEntries(GENRES);
const GENRE_JA = { FANTASY: '异世界幻想', ACTION: '现代幻想', SF: 'SF', LOVE_STORY: '恋爱', ROMANCE: '恋爱喜剧', DRAMA: '现代剧', HORROR: '恐怖', MYSTERY: '推理', NONFICTION: '随笔', HISTORY: '历史', CRITICISM: '评论', OTHERS: '其他', FAN_FICTION: '二次创作' };
const PERIODS = [['daily', '日榜'], ['weekly', '周榜'], ['monthly', '月榜'], ['yearly', '年榜'], ['entire', '总榜']];

const DISALLOW = [/^\/shared_drafts\//, /^\/works\/[^/]+\/episodes\/[^/]+\/read$/, /^\/login/, /^\/auth\/login/, /^\/violation_report/, /^\/site_feedback/];
let lastAt = 0;
async function get(url) {
 if (!window.Narou || !Narou.getText) throw new Error('网络模块未加载');
 const path = new URL(url).pathname;
 if (DISALLOW.some(r => r.test(path))) throw new Error('カクヨム 不允许抓取这个页面');
 const wait = lastAt + 1000 - Date.now(); if (wait > 0) await sleep(wait); lastAt = Date.now();
 try { return await Narou.getText(url); }
 catch (e) {
  if (/不允许|not allowed|forbidden host/i.test(e.message)) throw new Error('安装包的网络通道还没放行 kakuyomu.jp（需要按 MUSE-GUIDE 更新原生白名单）');
  throw e;
 }
}

// ---- Apollo 缓存 ----
function nextData(html) {
 const m = String(html || '').match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
 if (!m) return null;
 try { return JSON.parse(m[1]); } catch (e) { return null; }
}
function apolloOf(html) {
 const nd = nextData(html);
 const st = nd && nd.props && nd.props.pageProps && nd.props.pageProps.__APOLLO_STATE__;
 return st && typeof st === 'object' ? st : null;
}
const deref = (st, x) => (x && typeof x === 'object' && x.__ref) ? st[x.__ref] : x;

function workInfo(st, w) {
 const author = deref(st, w.author) || {};
 return {
  id: String(w.id || ''),
  title: clean(w.title),
  author: clean(author.activityName || author.name || author.screenName || ''),
  catchphrase: clean(w.catchphrase || ''),
  intro: String(w.introduction || '').trim(),
  genre: GENRE_JA[w.genre] || '',
  status: w.serialStatus === 'COMPLETED' ? 'done' : w.serialStatus === 'RUNNING' ? 'running' : '',
  short: /SHORT/i.test(String(w.workType || w.workVariation || '')),
  episodes: Number(w.publicEpisodeCount) || 0,
  chars: Number(w.totalCharacterCount) || 0,
  stars: Number(w.totalReviewPoint) || 0
 };
}
// 按页面里出现的顺序收集作品：从 ROOT_QUERY 出发顺着 __ref 走（排行、搜索结果就在这里），
// 一个 Work 都没摸到时才退回到缓存里所有 Work。
function worksFromApollo(st) {
 const order = [], seen = new Set(), visited = new Set();
 const visit = v => {
  if (!v || typeof v !== 'object') return;
  if (Array.isArray(v)) { v.forEach(visit); return; }
  if (v.__ref) {
   if (/^Work:/.test(v.__ref)) { if (!seen.has(v.__ref)) { seen.add(v.__ref); order.push(v.__ref); } return; }
   if (visited.has(v.__ref)) return; visited.add(v.__ref); visit(st[v.__ref]); return;
  }
  for (const k in v) visit(v[k]);
 };
 visit(st.ROOT_QUERY);
 if (!order.length) for (const k in st) if (/^Work:/.test(k)) order.push(k);
 return order.map(k => st[k]).filter(w => w && w.title).map(w => workInfo(st, w));
}
// 退路：直接扫页面链接
function worksFromHtml(html) {
 const doc = parse(html), out = new Map();
 doc.querySelectorAll('a[href*="/works/"]').forEach(a => {
  const m = (a.getAttribute('href') || '').match(/\/works\/(\d{6,})\/?(?:[?#].*)?$/);
  if (!m) return;
  const title = clean(a.textContent);
  if (!title || title.length < 2 || /続きを読む|もっと見る|作品詳細/.test(title)) return;
  if (out.has(m[1]) && out.get(m[1]).title.length >= title.length) return;
  let author = '', box = a;
  for (let i = 0; i < 5 && box && !author; i++) { box = box.parentElement; const u = box && box.querySelector('a[href*="/users/"]'); if (u) author = clean(u.textContent); }
  out.set(m[1], { id: m[1], title, author, catchphrase: '', intro: '', genre: '', status: '', short: false, episodes: 0, chars: 0, stars: 0 });
 });
 return [...out.values()];
}
function worksFromQuery(st, prefix) {
 const root = st.ROOT_QUERY || {};
 const key = Object.keys(root).find(k => k.indexOf(prefix + '(') === 0);
 if (!key || !root[key] || !Array.isArray(root[key].nodes)) return null;
 return root[key].nodes.map(n => deref(st, n)).filter(w => w && w.title).map(w => workInfo(st, w));
}
function worksFrom(html, prefix) {
 const st = apolloOf(html);
 const exact = st && prefix ? worksFromQuery(st, prefix) : null;
 if (exact) return exact;
 const list = st ? worksFromApollo(st) : [];
 return list.length ? list : worksFromHtml(html);
}

// ---- 排行 / 搜索 ----
async function ranking(genre, period, variation) {
 const g = GENRE_NAME[genre] ? genre : 'all';
 const p = PERIODS.some(x => x[0] === period) ? period : 'daily';
 const v = '?work_variation=' + (variation === 'short' ? 'short' : 'long');
 return worksFrom(await get(SITE + '/rankings/' + g + '/' + p + v), 'rankedWorks').slice(0, 100);
}
async function search(word, opts) {
 opts = opts || {};
 const q = new URLSearchParams({ q: word });
 if (opts.genre && opts.genre !== 'all') q.set('genre_name', opts.genre);
 if (opts.status) q.set('serial_status', opts.status);
 if (opts.chars) q.set('total_character_count_range', opts.chars);
 if (opts.page > 1) q.set('page', String(opts.page));
 return worksFrom(await get(SITE + '/search?' + q.toString()), 'searchWorks').slice(0, 40);
}

// ---- 作品页：详情 + 完整目录 ----
function parseSidebar(html) {
 const doc = parse(html), out = [];
 let chapter = '';
 doc.querySelectorAll('li.widget-toc-chapter, li.widget-toc-episode').forEach(li => {
  if (li.classList.contains('widget-toc-chapter')) { chapter = clean(li.textContent); return; }
  const a = li.querySelector('a.widget-toc-episode-episodeTitle') || li.querySelector('a[href*="/episodes/"]');
  const m = a && (a.getAttribute('href') || '').match(/\/works\/(\d+)\/episodes\/(\d+)/);
  if (!m) return;
  const label = li.querySelector('.widget-toc-episode-titleLabel');
  out.push({ id: m[2], title: clean(label ? label.textContent : a.textContent) || '第' + (out.length + 1) + '话', chapter, url: SITE + '/works/' + m[1] + '/episodes/' + m[2] });
 });
 return out;
}
async function getWork(workId) {
 workId = String(workId).replace(/\D/g, '');
 const html = await get(SITE + '/works/' + workId);
 const st = apolloOf(html);
 let info = null, chapters = [];
 const w = st && (st['Work:' + workId] || Object.keys(st).filter(k => /^Work:/.test(k)).map(k => st[k]).find(x => String(x.id) === workId));
 if (w) {
  info = workInfo(st, w);
  // 1) 和 Novelty 一样：第一话的 episode_sidebar 里有完整目录（含章名）
  const first = w.firstPublicEpisodeUnion && w.firstPublicEpisodeUnion.__ref;
  if (first && /^Episode:/.test(first)) {
   try { chapters = parseSidebar(await get(SITE + '/works/' + workId + '/episodes/' + first.split(':').pop() + '/episode_sidebar')); }
   catch (e) { chapters = []; }
  }
  // 2) 退路：Apollo 缓存里的 tableOfContents（旧页面结构）
  if (!chapters.length) for (const ref of (w.tableOfContents || [])) {
   const toc = deref(st, ref); if (!toc) continue;
   const ch = deref(st, toc.chapter), chapterTitle = clean(ch && ch.title);
   for (const er of (toc.episodeUnions || toc.episodes || [])) {
    const ep = deref(st, er); if (!ep || !ep.id) continue;
    chapters.push({ id: String(ep.id), title: clean(ep.title) || '第' + (chapters.length + 1) + '话', chapter: chapterTitle, url: SITE + '/works/' + workId + '/episodes/' + ep.id });
   }
  }
 }
 // 3) 再退：作品页上能看到的话链接
 if (!chapters.length) {
  const doc = parse(html), seen = new Set();
  doc.querySelectorAll('a[href*="/episodes/"]').forEach(a => {
   const m = (a.getAttribute('href') || '').match(/\/works\/(\d+)\/episodes\/(\d+)/);
   if (!m || m[1] !== workId || seen.has(m[2])) return; seen.add(m[2]);
   chapters.push({ id: m[2], title: clean(a.textContent) || '第' + (chapters.length + 1) + '话', chapter: '', url: SITE + '/works/' + workId + '/episodes/' + m[2] });
  });
 }
 if (!info) {
  const t = parse(html).querySelector('title');
  info = { id: workId, title: clean(t && t.textContent).replace(/\s*-\s*カクヨム$/, '') || workId, author: '', intro: '', catchphrase: '', genre: '', status: '', short: false, episodes: chapters.length, chars: 0, stars: 0 };
 }
 if (!info.episodes) info.episodes = chapters.length;
 return { info, chapters };
}

// ---- 正文：保留段落、空行与作者 ruby ----
function walk(node, b) {
 for (const n of node.childNodes) {
  if (n.nodeType === 3) { b.text(n.nodeValue.replace(/[\r\n]+/g, '')); continue; }
  if (n.nodeType !== 1) continue;
  const tag = n.tagName;
  if (tag === 'RUBY') {
   let base = '', rt = '';
   for (const c of n.childNodes) {
    if (c.nodeType === 3) base += c.nodeValue;
    else if (c.tagName === 'RT') rt += c.textContent;
    else if (c.tagName === 'RP') continue;
    else base += c.textContent; // RB 和 傍点 <em> 都算底字
   }
   b.ruby(base, rt); continue;
  }
  if (tag === 'BR') { b.text('\n'); continue; }
  if (tag === 'RT' || tag === 'RP' || tag === 'SCRIPT' || tag === 'STYLE') continue;
  if (tag === 'IMG') { b.text('［挿絵］'); continue; }
  walk(n, b);
 }
}
function appendBody(html, b) {
 const doc = parse(html);
 const el = doc.querySelector('.widget-episodeBody') || doc.querySelector('.js-episode-body') || doc.querySelector('[class*="episodeBody"]');
 if (!el) throw new Error('正文解析失败（页面结构可能变了）');
 const ps = el.querySelectorAll('p');
 if (ps.length) {
  let blank = 0;
  ps.forEach(p => {
   if (p.classList.contains('blank') || !clean(p.textContent)) { if (++blank === 1) b.text('\n'); return; }
   blank = 0; walk(p, b); b.text('\n');
  });
 } else { walk(el, b); b.text('\n'); }
}

// opts: {info, chapters, from, to}
async function importWork(workId, opts, onProgress) {
 opts = opts || {};
 const got0 = opts.info && opts.chapters ? { info: opts.info, chapters: opts.chapters } : await getWork(workId);
 const { info, chapters } = got0;
 if (!chapters.length) throw new Error('目录为空');
 const from = Math.max(1, opts.from || 1), to = Math.min(chapters.length, opts.to || chapters.length);
 const list = chapters.slice(from - 1, to);
 const b = new RikkaSourceRuby.Builder();
 const single = chapters.length === 1;
 let lastChapter = '', fail = 0, got = 0;
 for (let i = 0; i < list.length; i++) {
  const c = list[i];
  if (onProgress) onProgress(i + 1, list.length, c.title);
  if (!single) {
   if (c.chapter && c.chapter !== lastChapter) { b.text('■ ' + c.chapter + '\n\n'); lastChapter = c.chapter; }
   b.text('【' + c.title + '】\n\n');
  }
  try { appendBody(await get(c.url), b); b.text('\n\n'); got++; }
  catch (e) { fail++; b.text('（这一话下载失败：' + e.message + '）\n\n'); }
  if (b.parts.reduce((n, s) => n + s.length, 0) > 950000) { b.text('（篇幅已接近单本上限，后面的话请分批导入）'); break; }
  }
 if (!got) throw new Error('一话都没下载成功，请检查网络');
 const r = b.done();
 return { title: info.title, author: info.author, desc: info.intro || info.catchphrase || '', text: r.text.replace(/\n{3,}/g, '\n\n').trim(), ruby: r.ruby, workId: info.id || String(workId), from, to: from + got + fail - 1, failed: fail };
}

return { GENRES, PERIODS, ranking, search, getWork, importWork, _test: { nextData, apolloOf, worksFrom, worksFromHtml, parseSidebar, appendBody } };
})();
