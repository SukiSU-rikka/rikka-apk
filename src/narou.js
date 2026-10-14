'use strict';
/* なろう小説 API 集成：搜索、排行、详情、导入（JSONP 绕过 WebView CORS） */
window.Narou = (() => {
const API = 'https://api.syosetu.com/novelapi/api/';

const GENRES = {
'': '全部', '101': '异世界恋爱', '102': '现实恋爱',
'201': '高幻想', '202': '低幻想',
'301': '纯文学', '302': '人情剧', '303': '历史', '304': '推理',
'305': '恐怖', '306': '动作', '307': '喜剧',
'401': 'VR游戏', '402': '宇宙', '403': '空想科学', '404': '惊悚',
};

let cbCounter = 0;
// JSONP 请求：通过 <script> 标签绕过 CORS
function jsonp(params, timeout = 20000) {
return new Promise((resolve, reject) => {
const cbName = '_narou_cb_' + (++cbCounter) + '_' + Date.now();
const q = new URLSearchParams({ out: 'jsonp', callback: cbName,...params});
const script = document.createElement('script');
const timer = setTimeout(() => {
cleanup();
reject(new Error('请求超时（20秒）'));
}, timeout);
function cleanup() {
clearTimeout(timer);
if (script.parentNode) script.parentNode.removeChild(script);
delete window[cbName];
}
window[cbName] = (data) => {
cleanup();
resolve(data);
};
script.onerror = () => {
cleanup();
reject(new Error('网络请求失败'));
};
script.src = API + '?' + q.toString();
document.head.appendChild(script);
});
}

async function api(params) {
const data = await jsonp(params);
const allcount = data[0]?.allcount || 0;
return { allcount, list: data.slice(1)};
}

async function ranking(order = 'dailypoint', lim = 20, genre = '') {
const p = { order, lim, of: 't-n-w-s-k-g-l-e-ti'};
if (genre) p.genre = genre;
return api(p);
}

async function search(word, genre = '', order = 'hyoka', lim = 20) {
const p = { word, lim, order, of: 't-n-w-s-k-g-l-e-ti', title: 1, ex: 1};
if (genre) p.genre = genre;
return api(p);
}

async function getDetail(ncode) {
const { list} = await api({ ncode, lim: 1, of: 't-n-w-s-k-g-l-e-ti'});
return list[0] || null;
}

// 章节列表：用 JSONP 无法抓 HTML，改用 fetch（ncode.syosetu.com 可能允许 CORS）
// 如果不行，提示用户用 Novelty 或浏览器打开
async function getChapters(ncode) {
// 先试 API 方式获取话数信息
const detail = await getDetail(ncode);
const url = `https://ncode.syosetu.com/${ncode}/`;
try {
const r = await fetch(url, { mode: 'cors'});
if (!r.ok) throw new Error('HTTP ' + r.status);
const html = await r.text();
const chapters = [];
const re = /<a href="(\/n\d+[a-z]+\/\d+\/)">([^<]+)<\/a>/g;
let m;
while ((m = re.exec(html))!== null) {
chapters.push({ url: 'https://ncode.syosetu.com' + m[1], title: m[2].trim()});
}
if (chapters.length) return chapters;
} catch (e) {
console.warn('目录抓取失败:', e.message);
}
// 降级：用 general_all_no（总话数）构造章节 URL
// ncode.syosetu.com/{ncode}/{i}/ 格式
const total = detail?.general_all_no || 1;
const chapters = [];
for (let i = 1; i <= total; i++) {
chapters.push({ url: `${url}${i}/`, title: `第${i}话`});
}
return chapters;
}

async function getChapterText(url) {
const r = await fetch(url, { mode: 'cors'});
if (!r.ok) throw new Error('获取正文失败: ' + r.status);
const html = await r.text();
let m = html.match(/<div class="p-novel__body">([\s\S]*?)<\/div>\s*<\/div>/)
|| html.match(/<div id="novel_honbun"[^>]*>([\s\S]*?)<\/div>/);
if (!m) throw new Error('正文解析失败');
let body = m[1];
body = body.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n');
const tmp = document.createElement('div');
tmp.innerHTML = body;
return (tmp.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
}

async function importNovel(ncode, onProgress) {
const detail = await getDetail(ncode);
if (!detail) throw new Error('小说不存在');
const chapters = await getChapters(ncode);
const parts = [];
for (let i = 0; i < chapters.length; i++) {
onProgress?.(i + 1, chapters.length, chapters[i].title);
try {
const text = await getChapterText(chapters[i].url);
parts.push(`\n\n${text}`);
} catch (e) {
parts.push(`\n\n（本章获取失败：${e.message}）`);
}
await new Promise(r => setTimeout(r, 500));
}
return {
title: detail.title,
author: detail.writer,
desc: detail.story || '',
text: parts.join('\n\n'),
source: 'なろう',
ncode,
};
}

return { GENRES, api, ranking, search, getDetail, getChapters, getChapterText, importNovel};
})();
