'use strict';
// 小説家になろう 接入（v3.0.2）
// 安装包的 WebView 会拦掉所有外部请求（shouldInterceptRequest 对非本地资源一律返回 403），
// 所以 JSONP、直连 fetch、公共代理在这个壳里全都不可能成功。
// 唯一通道：原生桥 Android.httpGet(id, url)，结果回调 window.__rikkaHttp(id, body, err)。
// 书单/搜索/排行走官方 API（out=json），目录/正文抓 ncode.syosetu.com 网页。
// 正文里作者标的 ruby 原样保留，作为“原文注音”覆盖自动注音。
window.Narou = (() => {
const API = 'https://api.syosetu.com/novelapi/api/';
const SITE = 'https://ncode.syosetu.com/';
const OF = 't-n-w-s-bg-g-k-nt-e-ga-l-ti-gl-nu';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const hasNative = () => !!(window.Android && typeof Android.httpGet === 'function');
const NO_BRIDGE = '安装包缺少なろう网络通道（Android.httpGet），需要用 v3.0.2 的原生补丁重新打包';

const pending = new Map(); let hid = 0;
window.__rikkaHttp = (id, body, err) => { const p = pending.get(id); if (!p) return; pending.delete(id); clearTimeout(p.t); if (err) p.reject(new Error(err)); else p.resolve(body); };
function nativeGet(url) {
 return new Promise((resolve, reject) => {
  if (!hasNative()) { reject(new Error(NO_BRIDGE)); return; }
  const id = 'n' + (++hid);
  const t = setTimeout(() => { pending.delete(id); reject(new Error('请求超时')); }, 30000);
  pending.set(id, { resolve, reject, t });
  try { Android.httpGet(id, url); } catch (e) { pending.delete(id); clearTimeout(t); reject(e); }
 });
}
// 失败自动重试一次（なろう偶尔 5xx / 超时）
async function getText(url) {
 try { return await nativeGet(url); }
 catch (e) {
  if (!hasNative() || /不允许|HTTP 4\d\d/.test(e.message)) throw e;
  await sleep(800);
  return nativeGet(url);
 }
}
function shape(data) {
 if (!Array.isArray(data)) throw new Error('API 返回格式异常');
 return { allcount: (data[0] && data[0].allcount) || 0, list: data.slice(1) };
}
async function api(params) {
 const q = new URLSearchParams(Object.assign({ out: 'json', of: OF }, params));
 const t = await getText(API + '?' + q.toString());
 let data; try { data = JSON.parse(t); } catch (e) { throw new Error('API 返回的不是 JSON'); }
 return shape(data);
}

async function ranking(order, lim, genre) {
 const p = { order: order || 'dailypoint', lim: lim || 20 };
 if (genre) p.genre = genre;
 return api(p);
}
async function search(word, genre, order, lim) {
 const p = { word: word, lim: lim || 20, order: order || 'hyoka', title: 1, ex: 1, wname: 1 };
 if (genre) p.genre = genre;
 return api(p);
}
async function getDetail(ncode) {
 const r = await api({ ncode: String(ncode).toLowerCase(), lim: 1 });
 return r.list[0] || null;
}

const parse = html => new DOMParser().parseFromString(html, 'text/html');
const clean = s => String(s || '').replace(/\s+/g, ' ').trim();

// ---- 目录（新版页面每页 100 话，?p=2 翻页）----
async function getChapters(ncode, detail, onPage) {
 ncode = String(ncode).toLowerCase();
 detail = detail || await getDetail(ncode);
 if (detail && Number(detail.noveltype) === 2) return [{ no: 1, url: SITE + ncode + '/', title: detail.title, chapter: '', short: true }];
 const out = []; let chapter = '';
 for (let p = 1; p <= 300; p++) {
  if (onPage) onPage(p);
  const doc = parse(await getText(SITE + ncode + '/' + (p > 1 ? '?p=' + p : '')));
  const nodes = doc.querySelectorAll('.p-eplist__chapter-title, .p-eplist__sublist');
  if (!nodes.length) {
   // 旧版页面结构
   doc.querySelectorAll('.index_box .chapter_title, .index_box dl.novel_sublist2').forEach(el => {
    if (el.classList.contains('chapter_title')) { chapter = clean(el.textContent); return; }
    const a = el.querySelector('a'); const m = a && (a.getAttribute('href') || '').match(/\/(\d+)\/?$/);
    if (m) out.push({ no: +m[1], url: SITE + ncode + '/' + m[1] + '/', title: clean(a.textContent), chapter });
   });
   if (!out.length && p === 1 && doc.querySelector('.p-novel__body, #novel_honbun')) {
    return [{ no: 1, url: SITE + ncode + '/', title: detail ? detail.title : ncode, chapter: '', short: true }];
   }
   break;
  }
  nodes.forEach(el => {
   if (el.classList.contains('p-eplist__chapter-title')) { chapter = clean(el.textContent); return; }
   const a = el.querySelector('a.p-eplist__subtitle') || el.querySelector('a');
   const m = a && (a.getAttribute('href') || '').match(/\/(\d+)\/?(?:[?#].*)?$/);
   if (m) out.push({ no: +m[1], url: SITE + ncode + '/' + m[1] + '/', title: clean(a.textContent), chapter });
  });
  if (!doc.querySelector('a.c-pager__item--next')) break;
  await sleep(350);
 }
 if (!out.length && detail && detail.general_all_no) {
  for (let i = 1; i <= detail.general_all_no; i++) out.push({ no: i, url: SITE + ncode + '/' + i + '/', title: '第' + i + '话', chapter: '' });
 }
 return out;
}

// ---- 正文：保留段落与作者 ruby ----
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
    else base += c.textContent;
   }
   b.ruby(base, rt); continue;
  }
  if (tag === 'BR') { b.text('\n'); continue; }
  if (tag === 'RT' || tag === 'RP' || tag === 'SCRIPT' || tag === 'STYLE') continue;
  if (tag === 'IMG') { b.text('［挿絵］'); continue; }
  walk(n, b);
 }
}
function bodiesOf(doc) {
 let els = [...doc.querySelectorAll('.p-novel__body .p-novel__text')].filter(el => !el.classList.contains('p-novel__text--preface') && !el.classList.contains('p-novel__text--afterword'));
 if (!els.length) { const old = doc.querySelector('#novel_honbun'); if (old) els = [old]; }
 return els;
}
function appendBody(doc, b) {
 const els = bodiesOf(doc);
 if (!els.length) throw new Error('正文解析失败（页面结构可能变了）');
 for (const el of els) {
  const ps = el.querySelectorAll(':scope > p');
  if (ps.length) ps.forEach(p => { walk(p, b); b.text('\n'); });
  else { walk(el, b); b.text('\n'); }
 }
}
async function getChapterText(url) {
 const b = new RikkaSourceRuby.Builder();
 appendBody(parse(await getText(url)), b);
 const r = b.done();
 return { text: r.text.replace(/\n{3,}/g, '\n\n').trim(), ruby: r.ruby };
}

// opts: {detail, chapters, from, to}
async function importNovel(ncode, opts, onProgress) {
 if (typeof opts === 'function') { onProgress = opts; opts = {}; }
 opts = opts || {};
 const detail = opts.detail && opts.detail.title ? opts.detail : await getDetail(ncode);
 if (!detail) throw new Error('小说不存在或已删除');
 const chapters = opts.chapters || await getChapters(ncode, detail);
 const from = Math.max(1, opts.from || 1), to = Math.min(chapters.length, opts.to || chapters.length);
 const list = chapters.slice(from - 1, to);
 const b = new RikkaSourceRuby.Builder();
 let lastChapter = '', fail = 0, got = 0, size = 0;
 for (let i = 0; i < list.length; i++) {
  const c = list[i];
  if (onProgress) onProgress(i + 1, list.length, c.title);
  if (!c.short) {
   if (c.chapter && c.chapter !== lastChapter) { b.text('■ ' + c.chapter + '\n\n'); lastChapter = c.chapter; }
   b.text('【' + c.title + '】\n\n');
  }
  try {
   appendBody(parse(await getText(c.url)), b); b.text('\n\n'); got++;
  } catch (e) { fail++; b.text('（这一话下载失败：' + e.message + '）\n\n'); }
  size = b.parts.reduce((n, s) => n + s.length, 0);
  if (size > 950000) { b.text('（篇幅已接近单本上限，后面的话请分批导入）'); break; }
  if (i < list.length - 1) await sleep(500);
 }
 if (!got) throw new Error('一话都没下载成功，请检查网络');
 const r = b.done();
 return { title: detail.title, author: detail.writer, desc: detail.story || '', text: r.text.replace(/\n{3,}/g, '\n\n').trim(), ruby: r.ruby, source: 'なろう', ncode: String(detail.ncode || ncode).toLowerCase(), from, to: from + got + fail - 1, failed: fail, native: hasNative() };
}

return { api, ranking, search, getDetail, getChapters, getChapterText, importNovel, getText, hasNative };
})();
