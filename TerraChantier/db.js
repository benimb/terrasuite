/* TerraSuite en ligne (TerraChantier, TerraContacts) : base locale (IndexedDB), commune aux deux applications.
   Chaque fiche porte un identifiant unique, sa date de mise à jour et un drapeau « à synchroniser ».
   Une suppression est un marquage (deleted), pour qu'elle se propage aux autres appareils. */
const UNDO_LAB = { chantiers: 'fiche du chantier', plans: 'plan', photos: 'photo', visites: 'compte-rendu', reserves: 'réserve', contacts: 'contact' };
const DB = (() => {
  const NAME = 'terrachantier', VER = 4, STORES = ['chantiers', 'plans', 'photos', 'visites', 'reserves', 'contacts', 'projets', 'docs']; // « contacts » : carnet TerraContacts (v2) ; « projets » : projets de l'agence (v3) ; « docs » : données des autres applications (v4, ts-link.js)
  let dbp = null;
  const open = () => dbp || (dbp = new Promise((ok, ko) => {
    const r = indexedDB.open(NAME, VER);
    r.onupgradeneeded = () => {
      const d = r.result;
      for (const s of STORES) if (!d.objectStoreNames.contains(s)) { const os = d.createObjectStore(s, { keyPath: 'id' }); os.createIndex('chantierId', 'chantierId'); os.createIndex('dirty', 'dirty'); }
      if (!d.objectStoreNames.contains('blobs')) d.createObjectStore('blobs', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta', { keyPath: 'k' });
    };
    r.onsuccess = () => { r.result.onversionchange = () => { r.result.close(); dbp = null; }; ok(r.result); };
    r.onerror = () => { if (r.error && r.error.name === 'VersionError') { const r2 = indexedDB.open(NAME); r2.onsuccess = () => ok(r2.result); r2.onerror = () => ko(r2.error); } else ko(r.error); }; // base déjà mise à niveau par une autre page
  }));
  const tx = async (stores, mode, fn) => { const d = await open(); return new Promise((ok, ko) => { const t = d.transaction(stores, mode); let out; Promise.resolve(fn(t)).then(v => { out = v; }); t.oncomplete = () => ok(out); t.onerror = () => ko(t.error); t.onabort = () => ko(t.error); }); };
  const req = r => new Promise((ok, ko) => { r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); });
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10));
  return {
    uid,
    /* annulation (ts-undo.js) : chaque écriture faite par l'utilisateur garde la fiche d'avant ; écritures reçues des autres appareils et mises à niveau (quiet) exclues */
    quiet: 0,
    async put(store, o, { remote = false } = {}) { if (!o.id) o.id = uid(); const U = !remote && !this.quiet && typeof TSUndo !== 'undefined' && UNDO_LAB[store], before = U ? await this.get(store, o.id) : null;
      if (!remote) { o.updatedAt = new Date().toISOString(); o.dirty = 1; } else o.dirty = 0; await tx([store], 'readwrite', t => t.objectStore(store).put(o));
      if (U) TSUndo.record([{ s: store, id: o.id, before: before && !before.deleted ? before : null, after: o.deleted ? null : o }], UNDO_LAB[store]); return o; },
    /* remise d'une fiche dans l'état demandé par l'annulation (null : fiche supprimée) */
    async undoApply(items) { for (const { s, id, value } of items) { if (value) await this.put(s, value); else { const cur = await this.get(s, id); if (cur && !cur.deleted) { cur.deleted = true; await this.put(s, cur); } } } },
    async silent(fn) { this.quiet++; try { return await fn(); } finally { this.quiet--; } },
    async get(store, id) { return tx([store], 'readonly', t => req(t.objectStore(store).get(id))); },
    async all(store, chantierId, { withDeleted = false } = {}) {
      const rows = await tx([store], 'readonly', t => { const os = t.objectStore(store); return req(chantierId ? os.index('chantierId').getAll(chantierId) : os.getAll()); });
      return withDeleted ? rows : rows.filter(r => !r.deleted);
    },
    async dirty(store) { return (await tx([store], 'readonly', t => req(t.objectStore(store).getAll()))).filter(r => r.dirty); },
    async del(store, id) { const o = await this.get(store, id); if (!o) return; o.deleted = true; return this.put(store, o); },
    async putBlob(blob, id) { id = id || uid(); await tx(['blobs'], 'readwrite', t => t.objectStore('blobs').put({ id, blob, type: blob.type, size: blob.size, synced: 0 })); return id; },
    async getBlob(id) { if (!id) return null; const r = await tx(['blobs'], 'readonly', t => req(t.objectStore('blobs').get(id))); return r ? r.blob : null; },
    async blobRec(id) { return tx(['blobs'], 'readonly', t => req(t.objectStore('blobs').get(id))); },
    async markBlob(id, synced) { const r = await this.blobRec(id); if (!r) return; r.synced = synced; await tx(['blobs'], 'readwrite', t => t.objectStore('blobs').put(r)); },
    async allBlobIds() { return tx(['blobs'], 'readonly', t => req(t.objectStore('blobs').getAllKeys())); },
    async meta(k, v) { if (v === undefined) { const r = await tx(['meta'], 'readonly', t => req(t.objectStore('meta').get(k))); return r ? r.v : undefined; } await tx(['meta'], 'readwrite', t => t.objectStore('meta').put({ k, v })); return v; },
    STORES
  };
})();
/* adresse d'affichage d'une image stockée (gardée en mémoire le temps de la session) */
const BlobURL = (() => { const m = new Map(); return async id => { if (!id) return ''; if (m.has(id)) return m.get(id); let b = await DB.getBlob(id); if (!b && typeof Sync !== 'undefined') b = await Sync.fetchBlob(id); if (!b) return ''; const u = URL.createObjectURL(b); m.set(id, u); return u; }; })();
