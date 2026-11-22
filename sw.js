// Офлайн-работа и обновление приложения.
// Страница и файлы приложения отдаются из кэша этой версии. Новая версия (новый sw.js) скачивается в свой кэш,
// проверяется (номер версии внутри index.html) и включается только по кнопке «Обновить приложение».
// Данные пользователя (localStorage) здесь не хранятся и при обновлении не затрагиваются.
const VERSION = '2026-11-22.5';
const PREFIX = 'raspisanie-';            // все кэши этого приложения начинаются так; чужие кэши не трогаем
const CACHE = PREFIX + VERSION;
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(FILES.map(f => new Request(f, {cache: 'reload'})));
    const html = await (await c.match('./index.html')).text();
    if (!html.includes("APP_VERSION = '" + VERSION + "'")){ await caches.delete(CACHE); throw new Error('index.html другой версии'); }
    if (!self.registration.active) await self.skipWaiting(); // самая первая установка — сразу
  })());
});
self.addEventListener('message', e => {
  const d = e.data || {};
  if (d.type === 'version' && e.ports && e.ports[0]) e.ports[0].postMessage({version: VERSION});
  if (d.type === 'activate') self.skipWaiting();
});
// удалить кэши прежних версий этого приложения (только с префиксом PREFIX)
// Удаляются только кэши более старых версий: кэш новой версии, которая сейчас устанавливается, не трогаем.
const verKey = v => /^\d{4}-\d{2}-\d{2}\.\d+$/.test(v) ? v.split(/[-.]/).map(n => n.padStart(6, '0')).join('') : '';
const isOlder = k => k !== CACHE && /^raspisanie-(v\d+|\d{4}-\d{2}-\d{2}\.\d+)$/.test(k) && verKey(k.slice(PREFIX.length)) < verKey(VERSION);
const cleanup = async () => { for (const k of await caches.keys()) if (isOlder(k)) await caches.delete(k); };
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    await cleanup();
    await self.clients.claim();
    // старый sw.js мог дописать свой кэш уже после очистки — повторить чуть позже
    setTimeout(() => cleanup().catch(() => {}), 3000);
  })());
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.endsWith('/version.json')){
    // номер опубликованной версии — только из сети, без кэша
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
