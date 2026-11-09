/* TerraSuite : synchronisation des données de chaque application (estimations, CCTP, DPGF, plannings, études de site, produits…)
   entre les appareils de l'agence, fiche par fiche.
   - Chaque fiche d'une application est copiée dans la base TerraSuite du navigateur (IndexedDB « terrachantier », magasin « docs »),
     que la synchronisation (sync.js, lancée par l'application TerraSuite, TerraChantier ou TerraContacts) envoie au serveur de l'agence.
   - Fusion à trois voies : pour chaque fiche, l'appareil garde l'empreinte de la dernière version échangée (« base »).
     Fiche modifiée ici seulement → envoyée ; modifiée ailleurs seulement → reprise ; jamais échangée → la version du serveur l'emporte.
   - Une fiche supprimée ici est marquée supprimée pour les autres appareils.
   Fichier autonome, chargé par chaque application depuis ../TerraChantier/ts-link.js. */
const TSLink = (() => {
  const NAME = 'terrachantier', STORES = ['chantiers', 'plans', 'photos', 'visites', 'reserves', 'contacts', 'projets', 'docs'];
  const chan = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('terrasuite-docs') : null;
  let dbp = null;
  const upgrade = d => { for (const s of STORES) if (!d.objectStoreNames.contains(s)) { const os = d.createObjectStore(s, { keyPath: 'id' }); os.createIndex('chantierId', 'chantierId'); os.createIndex('dirty', 'dirty'); }
    if (!d.objectStoreNames.contains('blobs')) d.createObjectStore('blobs', { keyPath: 'id' }); if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta', { keyPath: 'k' }); };
  /* ouvre la base telle qu'elle est ; ajoute les magasins manquants (base créée par une version antérieure) */
  function open() {
    return dbp || (dbp = new Promise((ok, ko) => {
      if (!self.indexedDB) return ko(new Error('base du navigateur indisponible'));
      const r = indexedDB.open(NAME);
      r.onupgradeneeded = () => upgrade(r.result);
      r.onsuccess = () => { const d = r.result; if (STORES.every(s => d.objectStoreNames.contains(s)) && d.objectStoreNames.contains('meta')) { d.onversionchange = () => { d.close(); dbp = null; }; return ok(d); }
        const v = d.version + 1; d.close(); const r2 = indexedDB.open(NAME, v); r2.onupgradeneeded = () => upgrade(r2.result);
        r2.onsuccess = () => { r2.result.onversionchange = () => { r2.result.close(); dbp = null; }; ok(r2.result); }; r2.onerror = () => ko(r2.error); r2.onblocked = () => ko(new Error('base occupée par une autre page')); };
      r.onerror = () => ko(r.error);
    }).catch(e => { dbp = null; throw e; }));
  }
  const req = r => new Promise((ok, ko) => { r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); });
  async function tx(stores, mode, fn) { const d = await open(); return new Promise((ok, ko) => { const t = d.transaction(stores, mode); let out; Promise.resolve(fn(t)).then(v => { out = v; }); t.oncomplete = () => ok(out); t.onerror = () => ko(t.error); t.onabort = () => ko(t.error); }); }
  const meta = async (k, v) => { if (v === undefined) { const r = await tx(['meta'], 'readonly', t => req(t.objectStore('meta').get(k))); return r ? r.v : undefined; } await tx(['meta'], 'readwrite', t => t.objectStore('meta').put({ k, v })); };

  /* écriture stable (clés triées) : le serveur range les clés autrement, l'empreinte ne doit pas en dépendre */
  const stable = v => v === null || typeof v !== 'object' ? JSON.stringify(v === undefined ? null : v) : Array.isArray(v) ? '[' + v.map(x => x === undefined ? 'null' : stable(x)).join(',') + ']'
    : '{' + Object.keys(v).filter(k => v[k] !== undefined && typeof v[k] !== 'function').sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  /* empreinte 128 bits (cyrb128) : sert aussi d'identifiant de fiche au format attendu par le serveur */
  function h128(str) {
    let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
    for (let i = 0, k; i < str.length; i++) { k = str.charCodeAt(i); h1 = h2 ^ Math.imul(h1 ^ k, 597399067); h2 = h3 ^ Math.imul(h2 ^ k, 2869860233); h3 = h4 ^ Math.imul(h3 ^ k, 951274213); h4 = h1 ^ Math.imul(h4 ^ k, 2716044179); }
    h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067); h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233); h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213); h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
    h1 ^= (h2 ^ h3 ^ h4); h2 ^= h1; h3 ^= h1; h4 ^= h1;
    return [h1, h2, h3, h4].map(x => (x >>> 0).toString(16).padStart(8, '0')).join('');
  }
  const hash = o => h128(stable(o));
  const docId = (app, coll, rid) => { const x = h128(app + '|' + coll + '|' + rid); return `${x.slice(0, 8)}-${x.slice(8, 12)}-4${x.slice(13, 16)}-a${x.slice(17, 20)}-${x.slice(20, 32)}`; };
  const baseKey = (app, coll) => 'link:' + app + ':' + coll;
  const toList = recs => recs instanceof Map ? [...recs.entries()] : Array.isArray(recs) ? recs.map(r => [String(r.id), r]) : Object.entries(recs || {});

  async function docsOf(app, coll) {
    const all = await tx(['docs'], 'readonly', t => req(t.objectStore('docs').getAll()));
    const m = new Map(); for (const d of all) if (d.app === app && d.coll === coll) m.set(String(d.rid), d); return m;
  }
  /* la synchronisation a-t-elle déjà reçu une fois le contenu du serveur sur cet appareil ? (sinon on n'envoie rien : on risquerait d'écraser le travail des autres appareils) */
  async function synced() { try { return !!(await meta('syncAt')); } catch (e) { return false; } }

  /* reprise des fiches reçues des autres appareils : renvoie { recs (Map rid → fiche), changed (nombre), removed (rids supprimés) } */
  async function pull(app, coll, local) {
    const out = new Map(toList(local)); let changed = 0; const removed = [];
    try {
      const docs = await docsOf(app, coll); if (!docs.size) return { recs: out, changed, removed };
      const base = (await meta(baseKey(app, coll))) || {};
      for (const [rid, d] of docs) {
        const L = out.get(rid), hL = L === undefined ? null : hash(L), b = base[rid];
        if (d.deleted) { if (L !== undefined && b !== undefined && hL === b) { out.delete(rid); removed.push(rid); changed++; } delete base[rid]; continue; }
        if (L === undefined) { if (b === undefined || d.h !== b) { out.set(rid, d.data); base[rid] = d.h; changed++; } continue; } // supprimée ici et pas modifiée ailleurs : la suppression partira à l'envoi
        if (hL === d.h) { base[rid] = d.h; continue; }
        if (b === undefined || hL === b) { out.set(rid, d.data); base[rid] = d.h; changed++; }
      }
      await meta(baseKey(app, coll), base);
    } catch (e) { console.warn('TSLink.pull', app, coll, e); }
    return { recs: out, changed, removed };
  }

  /* envoi des fiches modifiées sur cet appareil. opts.projet(fiche) : identifiant du projet ; opts.skip(rid, empreinte) : fiche inchangée depuis le fichier de données (pas d'envoi) */
  async function push(app, coll, local, opts = {}) {
    try {
      if (!(await synced())) return 0;
      const docs = await docsOf(app, coll), base = (await meta(baseKey(app, coll))) || {}, now = new Date().toISOString(), puts = [];
      const L = toList(local), seen = new Set();
      for (const [rid0, rec] of L) {
        const rid = String(rid0); seen.add(rid); if (rec === undefined || rec === null) continue;
        const h = hash(rec); if (base[rid] === h) continue;
        const d = docs.get(rid);
        if (d && !d.deleted && d.h === h) { base[rid] = h; continue; }
        if (!d && base[rid] === undefined && opts.skip && opts.skip(rid, h)) { base[rid] = h; continue; }
        puts.push({ id: docId(app, coll, rid), app, coll, rid, projetId: (opts.projet && opts.projet(rec)) || null, chantierId: null, data: rec, h, deleted: false, updatedAt: now, dirty: 1 });
        base[rid] = h;
      }
      for (const rid of Object.keys(base)) if (!seen.has(rid)) { const d = docs.get(rid); if (d && !d.deleted) puts.push({ ...d, deleted: true, updatedAt: now, dirty: 1 }); delete base[rid]; }
      if (puts.length) await tx(['docs'], 'readwrite', t => { const os = t.objectStore('docs'); puts.forEach(p => os.put(p)); });
      await meta(baseKey(app, coll), base);
      if (puts.length && chan) chan.postMessage({ type: 'dirty', app, coll, n: puts.length });
      return puts.length;
    } catch (e) { console.warn('TSLink.push', app, coll, e); return 0; }
  }

  /* raccordement d'une application : appelle onRemote() quand des fiches arrivent d'un autre appareil (synchronisation faite ici ou dans un autre onglet) */
  const listeners = new Set();
  if (chan) chan.onmessage = e => { if (e.data && e.data.type === 'received') listeners.forEach(f => { try { f(e.data); } catch (x) {} }); };
  function onRemote(f) { listeners.add(f); }
  /* signal envoyé par la synchronisation après réception */
  function received(n) { const msg = { type: 'received', n }; if (chan) chan.postMessage(msg); listeners.forEach(f => { try { f(msg); } catch (x) {} }); }
  /* empreintes des fiches d'un fichier de données (pour ne pas envoyer ce que chaque appareil a déjà) */
  function seedHashes(obj) { const m = new Map(); for (const [k, v] of toList(obj)) m.set(String(k), hash(v)); return m; }
  /* application ouverte dans l'application TerraSuite (cadre) : pas de lien de retour propre */
  const embedded = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();
  if (embedded) document.documentElement.classList.add('ts-embed');
  return { pull, push, onRemote, received, hash, docId, seedHashes, embedded, synced, open };
})();
