// Lexivanto service worker (Phase 5).
// Deliberately small: pages always come from the network when online, so players never get stuck
// on an old version. Only the offline page is cached. Versioned assets use the normal HTTP cache.
// Kill switch: if this file ever misbehaves, deploy a version whose install handler calls
// self.registration.unregister() (see OPERATIONS.md); every player's browser picks it up on its next visit.
const CACHE='lexivanto-offline-1';
const OFFLINE='/offline.html';
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.add(new Request(OFFLINE,{cache:'reload'}))).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
  if(event.request.mode!=='navigate')return;
  event.respondWith(fetch(event.request).catch(()=>caches.match(OFFLINE)));
});
// Pushes carry no content: ask the server what to show, using this device's subscription as the key.
self.addEventListener('push',event=>{
  event.waitUntil((async()=>{
    let message=null;
    try{const sub=await self.registration.pushManager.getSubscription();const r=await fetch('/api/push/pending',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({endpoint:sub?.endpoint||''})});message=(await r.json()).message;}catch{}
    const m=message||{title:'Lexivanto',body:'Something is waiting for you in Lexivanto.',url:'/'};
    await self.registration.showNotification(m.title,{body:m.body,icon:'/icon-192.png',badge:'/icon-192.png',tag:m.kind||'lexivanto',renotify:true,data:{url:m.url||'/'}});
  })());
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const url=new URL(event.notification.data?.url||'/',self.location.origin).href;
  event.waitUntil((async()=>{const all=await self.clients.matchAll({type:'window',includeUncontrolled:true});for(const c of all){if(new URL(c.url).origin===self.location.origin){await c.navigate(url).catch(()=>{});return c.focus();}}return self.clients.openWindow(url);})());
});
