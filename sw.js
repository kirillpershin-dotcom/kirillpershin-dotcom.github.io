// ÐÑÐ»Ð°Ð¹Ð½-ÑÐ°Ð±Ð¾ÑÐ° Ð¸ Ð¾Ð±Ð½Ð¾Ð²Ð»ÐµÐ½Ð¸Ðµ Ð¿ÑÐ¸Ð»Ð¾Ð¶ÐµÐ½Ð¸Ñ.
// Ð¡ÑÑÐ°Ð½Ð¸ÑÐ° Ð¸ ÑÐ°Ð¹Ð»Ñ Ð¿ÑÐ¸Ð»Ð¾Ð¶ÐµÐ½Ð¸Ñ Ð¾ÑÐ´Ð°ÑÑÑÑ Ð¸Ð· ÐºÑÑÐ° ÑÑÐ¾Ð¹ Ð²ÐµÑÑÐ¸Ð¸. ÐÐ¾Ð²Ð°Ñ Ð²ÐµÑÑÐ¸Ñ (Ð½Ð¾Ð²ÑÐ¹ sw.js) ÑÐºÐ°ÑÐ¸Ð²Ð°ÐµÑÑÑ Ð² ÑÐ²Ð¾Ð¹ ÐºÑÑ,
// Ð¿ÑÐ¾Ð²ÐµÑÑÐµÑÑÑ (Ð½Ð¾Ð¼ÐµÑ Ð²ÐµÑÑÐ¸Ð¸ Ð²Ð½ÑÑÑÐ¸ index.html) Ð¸ Ð²ÐºÐ»ÑÑÐ°ÐµÑÑÑ ÑÐ¾Ð»ÑÐºÐ¾ Ð¿Ð¾ ÐºÐ½Ð¾Ð¿ÐºÐµ Â«ÐÐ±Ð½Ð¾Ð²Ð¸ÑÑ Ð¿ÑÐ¸Ð»Ð¾Ð¶ÐµÐ½Ð¸ÐµÂ».
// ÐÐ°Ð½Ð½ÑÐµ Ð¿Ð¾Ð»ÑÐ·Ð¾Ð²Ð°ÑÐµÐ»Ñ (localStorage) Ð·Ð´ÐµÑÑ Ð½Ðµ ÑÑÐ°Ð½ÑÑÑÑ Ð¸ Ð¿ÑÐ¸ Ð¾Ð±Ð½Ð¾Ð²Ð»ÐµÐ½Ð¸Ð¸ Ð½Ðµ Ð·Ð°ÑÑÐ°Ð³Ð¸Ð²Ð°ÑÑÑÑ.
const VERSION = '2026-11-23.2';
const PREFIX = 'raspisanie-';            // Ð²ÑÐµ ÐºÑÑÐ¸ ÑÑÐ¾Ð³Ð¾ Ð¿ÑÐ¸Ð»Ð¾Ð¶ÐµÐ½Ð¸Ñ Ð½Ð°ÑÐ¸Ð½Ð°ÑÑÑÑ ÑÐ°Ðº; ÑÑÐ¶Ð¸Ðµ ÐºÑÑÐ¸ Ð½Ðµ ÑÑÐ¾Ð³Ð°ÐµÐ¼
const CACHE = PREFIX + VERSION;
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(FILES.map(f => new Request(f, {cache: 'reload'})));
    const html = await (await c.match('./index.html')).text();
    if (!html.includes("APP_VERSION = '" + VERSION + "'")){ await caches.delete(CACHE); throw new Error('index.html Ð´ÑÑÐ³Ð¾Ð¹ Ð²ÐµÑÑÐ¸Ð¸'); }
    if (!self.registration.active) await self.skipWaiting(); // ÑÐ°Ð¼Ð°Ñ Ð¿ÐµÑÐ²Ð°Ñ ÑÑÑÐ°Ð½Ð¾Ð²ÐºÐ° â ÑÑÐ°Ð·Ñ
  })());
});
self.addEventListener('message', e => {
  const d = e.data || {};
  if (d.type === 'version' && e.ports && e.ports[0]) e.ports[0].postMessage({version: VERSION});
  if (d.type === 'activate') self.skipWaiting();
});
// ÑÐ´Ð°Ð»Ð¸ÑÑ ÐºÑÑÐ¸ Ð¿ÑÐµÐ¶Ð½Ð¸Ñ Ð²ÐµÑÑÐ¸Ð¹ ÑÑÐ¾Ð³Ð¾ Ð¿ÑÐ¸Ð»Ð¾Ð¶ÐµÐ½Ð¸Ñ (ÑÐ¾Ð»ÑÐºÐ¾ Ñ Ð¿ÑÐµÑÐ¸ÐºÑÐ¾Ð¼ PREFIX)
// Ð£Ð´Ð°Ð»ÑÑÑÑÑ ÑÐ¾Ð»ÑÐºÐ¾ ÐºÑÑÐ¸ Ð±Ð¾Ð»ÐµÐµ ÑÑÐ°ÑÑÑ Ð²ÐµÑÑÐ¸Ð¹: ÐºÑÑ Ð½Ð¾Ð²Ð¾Ð¹ Ð²ÐµÑÑÐ¸Ð¸, ÐºÐ¾ÑÐ¾ÑÐ°Ñ ÑÐµÐ¹ÑÐ°Ñ ÑÑÑÐ°Ð½Ð°Ð²Ð»Ð¸Ð²Ð°ÐµÑÑÑ, Ð½Ðµ ÑÑÐ¾Ð³Ð°ÐµÐ¼.
const verKey = v => /^\d{4}-\d{2}-\d{2}\.\d+$/.test(v) ? v.split(/[-.]/).map(n => n.padStart(6, '0')).join('') : '';
const isOlder = k => k !== CACHE && /^raspisanie-(v\d+|\d{4}-\d{2}-\d{2}\.\d+)$/.test(k) && verKey(k.slice(PREFIX.length)) < verKey(VERSION);
const cleanup = async () => { for (const k of await caches.keys()) if (isOlder(k)) await caches.delete(k); };
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    await cleanup();
    await self.clients.claim();
    // ÑÑÐ°ÑÑÐ¹ sw.js Ð¼Ð¾Ð³ Ð´Ð¾Ð¿Ð¸ÑÐ°ÑÑ ÑÐ²Ð¾Ð¹ ÐºÑÑ ÑÐ¶Ðµ Ð¿Ð¾ÑÐ»Ðµ Ð¾ÑÐ¸ÑÑÐºÐ¸ â Ð¿Ð¾Ð²ÑÐ¾ÑÐ¸ÑÑ ÑÑÑÑ Ð¿Ð¾Ð·Ð¶Ðµ
    setTimeout(() => cleanup().catch(() => {}), 3000);
  })());
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.endsWith('/version.json')){
    // Ð½Ð¾Ð¼ÐµÑ Ð¾Ð¿ÑÐ±Ð»Ð¸ÐºÐ¾Ð²Ð°Ð½Ð½Ð¾Ð¹ Ð²ÐµÑÑÐ¸Ð¸ â ÑÐ¾Ð»ÑÐºÐ¾ Ð¸Ð· ÑÐµÑÐ¸, Ð±ÐµÐ· ÐºÑÑÐ°
    e.respondWith(fetch(req, {cache: 'no-store'}).then(r => { const h = new Headers(r.headers); h.set('X-App-SW', VERSION); return new Response(r.body, {status: r.status, statusText: r.statusText, headers: h}); }));
    return;
  }
  const isPage = req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('/index.html');
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const hit = isPage ? (await c.match('./index.html')) : (await c.match(req, {ignoreSearch: true}));
    if (isPage) cleanup().catch(() => {});
    if (hit) return hit;
    const res = await fetch(req);
    if (res.ok && !isPage) c.put(req, res.clone());
    return res;
  })());
});
