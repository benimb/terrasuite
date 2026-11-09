/* TerraSuite : fonctionnement hors réseau de l'application unique et des modules (TerraGeo, TerraEstim, TerraPlanning, TerraDocs, TerraSourcing).
   L'application est mise en cache à l'installation, les modules à leur première ouverture ; mise à jour en arrière-plan.
   TerraChantier et TerraContacts ont leur propre service (TerraChantier/sw.js). */
const VERSION = 'ts-0.2';
const SHELL = ['./', 'index.html', 'suite/app.css', 'suite/app.js', 'manifest.webmanifest', 'suite/icons/icon-192.png', 'suite/icons/icon-512.png', 'suite/icons/maskable-512.png', 'suite/icons/apple-touch-icon.png',
  'TerraChantier/vendor/supabase.js', 'TerraChantier/common.js', 'TerraChantier/db.js', 'TerraChantier/plan.js', 'TerraChantier/carnet.js', 'TerraChantier/projets-api.js', 'TerraChantier/ts-link.js', 'TerraChantier/terrasuite-compte.js', 'TerraChantier/sync.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => /^ts-/.test(k) && k !== VERSION && k !== 'ts-ext').map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // polices et bibliothèques publiques (cdnjs, jsdelivr) : mises en cache au premier usage
  if (/fonts\.(googleapis|gstatic)\.com$|cdnjs\.cloudflare\.com$|cdn\.jsdelivr\.net$|unpkg\.com$/.test(u.hostname)) { e.respondWith(caches.open('ts-ext').then(c => c.match(e.request).then(r => r || fetch(e.request).then(n => { if (n.ok || n.type === 'opaque') c.put(e.request, n.clone()); return n; })))); return; }
  if (u.origin !== location.origin) return; // serveur de l'agence et services publics (cadastre, PLU…) : toujours en direct
  e.respondWith(caches.open(VERSION).then(c => c.match(e.request, { ignoreSearch: true }).then(r => {
    const net = fetch(e.request).then(n => { if (n.ok) c.put(e.request, n.clone()); return n; }).catch(() => r);
    return r || net;
  })));
});
self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });
