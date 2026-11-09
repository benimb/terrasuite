/* TerraSuite : registre des projets, commun à toutes les applications.
   Les projets sont rangés dans la base TerraSuite du navigateur (IndexedDB « terrachantier », magasin « projets »),
   avec les contacts et les chantiers, et synchronisés entre appareils par TerraContacts et TerraChantier.
   Ce fichier est autonome : TerraEstim, TerraPlanning, TerraGeo l'utilisent depuis ../TerraChantier/projets-api.js. */
const TSP = (() => {
  const NAME = 'terrachantier', STORES = ['chantiers', 'plans', 'photos', 'visites', 'reserves', 'contacts', 'projets', 'docs'];
  const PHASES = ['Faisabilité', 'ESQ', 'APS', 'APD', 'PC', 'PRO', 'DCE', 'ACT', 'VISA', 'DET', 'AOR', 'GPA'];
  /* typologie, pour comparer les projets entre eux dans la base commune */
  const TYPES = ['Logement collectif', 'Logement individuel', 'Bureaux', 'Enseignement', 'Petite enfance', 'Santé, médico-social', 'Équipement sportif', 'Culture, loisirs', 'Commerce', 'Hôtellerie, restauration', 'Administration, services publics', 'Industrie, logistique', 'Patrimoine, monument', 'Autre'];
  const NATURES = ['Construction neuve', 'Extension', 'Réhabilitation lourde', 'Rénovation, réhabilitation légère', 'Restructuration', 'Aménagement intérieur', 'Rénovation énergétique', 'Entretien, mise en conformité'];
  const STATUTS = [['cours', 'En cours'], ['attente', 'En attente'], ['termine', 'Terminé'], ['archive', 'Archivé']];
  /* indice de localisation des prix de travaux par département (1 = médiane des départements de métropole).
     Source : Caisse des Dépôts, plans de financement des logements sociaux neufs par département 2017-2019 (prix de revient × part de la construction ÷ surface utile) ;
     Yonne (valeur isolée), Hautes-Alpes et Mayotte (absents) : médiane de leur région. Valeur modifiable projet par projet. */
  const LOC = {'01':['Ain',1.02],'02':['Aisne',0.97],'03':['Allier',1.09],'04':['Alpes-de-Haute-Provence',1.0],'05':['Hautes-Alpes',1.01],'06':['Alpes-Maritimes',1.07],'07':['Ardèche',0.85],'08':['Ardennes',0.92],'09':['Ariège',0.89],'10':['Aube',1.06],'11':['Aude',0.9],'12':['Aveyron',1.03],'13':['Bouches-du-Rhône',1.11],'14':['Calvados',0.99],'15':['Cantal',1.08],'16':['Charente',1.0],'17':['Charente-Maritime',0.99],'18':['Cher',1.03],'19':['Corrèze',0.85],'2A':['Corse-du-Sud',1.26],'2B':['Haute-Corse',1.17],'21':['Côte-d\'Or',1.1],'22':['Côtes-d\'Armor',1.01],'23':['Creuse',0.88],'24':['Dordogne',0.95],'25':['Doubs',1.03],'26':['Drôme',0.89],'27':['Eure',0.98],'28':['Eure-et-Loir',1.05],'29':['Finistère',0.96],'30':['Gard',0.98],'31':['Haute-Garonne',0.98],'32':['Gers',0.95],'33':['Gironde',1.04],'34':['Hérault',0.92],'35':['Ille-et-Vilaine',1.0],'36':['Indre',0.87],'37':['Indre-et-Loire',1.02],'38':['Isère',0.99],'39':['Jura',1.03],'40':['Landes',0.87],'41':['Loir-et-Cher',1.0],'42':['Loire',0.9],'43':['Haute-Loire',0.87],'44':['Loire-Atlantique',1.04],'45':['Loiret',0.99],'46':['Lot',0.92],'47':['Lot-et-Garonne',0.9],'48':['Lozère',0.8],'49':['Maine-et-Loire',1.0],'50':['Manche',1.02],'51':['Marne',1.08],'52':['Haute-Marne',1.06],'53':['Mayenne',0.94],'54':['Meurthe-et-Moselle',1.09],'55':['Meuse',0.95],'56':['Morbihan',0.91],'57':['Moselle',1.03],'58':['Nièvre',1.03],'59':['Nord',0.97],'60':['Oise',1.17],'61':['Orne',0.88],'62':['Pas-de-Calais',0.94],'63':['Puy-de-Dôme',1.11],'64':['Pyrénées-Atlantiques',1.09],'65':['Hautes-Pyrénées',0.92],'66':['Pyrénées-Orientales',0.84],'67':['Bas-Rhin',1.0],'68':['Haut-Rhin',0.95],'69':['Rhône',1.15],'70':['Haute-Saône',1.05],'71':['Saône-et-Loire',1.01],'72':['Sarthe',1.02],'73':['Savoie',0.99],'74':['Haute-Savoie',1.1],'75':['Paris',1.86],'76':['Seine-Maritime',1.02],'77':['Seine-et-Marne',1.18],'78':['Yvelines',1.38],'79':['Deux-Sèvres',1.01],'80':['Somme',1.02],'81':['Tarn',0.93],'82':['Tarn-et-Garonne',0.98],'83':['Var',1.01],'84':['Vaucluse',0.94],'85':['Vendée',0.92],'86':['Vienne',0.94],'87':['Haute-Vienne',0.94],'88':['Vosges',0.96],'89':['Yonne',1.03],'90':['Territoire de Belfort',0.99],'91':['Essonne',1.22],'92':['Hauts-de-Seine',1.33],'93':['Seine-Saint-Denis',1.37],'94':['Val-de-Marne',1.46],'95':['Val-d\'Oise',1.31],'971':['Guadeloupe',1.07],'972':['Martinique',0.79],'973':['Guyane',0.92],'974':['La Réunion',0.99],'976':['Mayotte',0.96]};
  const deptOf = p => { if (!p) return ''; const i = String((p.geo && p.geo.insee) || '').toUpperCase(); if (i) return /^97/.test(i) ? i.slice(0, 3) : i.slice(0, 2);
    const cp = String(p.cp || '').trim(); if (!/^\d{5}$/.test(cp)) return ''; if (/^97/.test(cp)) return cp.slice(0, 3); if (/^20/.test(cp)) return +cp.slice(0, 3) < 202 ? '2A' : '2B'; return cp.slice(0, 2); };
  const bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('terrasuite-projets') : null;
  let dbp = null;
  const upgrade = d => { for (const s of STORES) if (!d.objectStoreNames.contains(s)) { const os = d.createObjectStore(s, { keyPath: 'id' }); os.createIndex('chantierId', 'chantierId'); os.createIndex('dirty', 'dirty'); }
    if (!d.objectStoreNames.contains('blobs')) d.createObjectStore('blobs', { keyPath: 'id' }); if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta', { keyPath: 'k' }); };
  /* ouvre la base telle qu'elle est ; si le magasin « projets » manque (base créée par une version antérieure), il est ajouté */
  function open() {
    return dbp || (dbp = new Promise((ok, ko) => {
      if (!self.indexedDB) return ko(new Error('base du navigateur indisponible'));
      const r = indexedDB.open(NAME);
      r.onupgradeneeded = () => upgrade(r.result);
      r.onsuccess = () => { const d = r.result; if (STORES.every(s => d.objectStoreNames.contains(s))) { d.onversionchange = () => { d.close(); dbp = null; }; return ok(d); }
        const v = d.version + 1; d.close(); const r2 = indexedDB.open(NAME, v); r2.onupgradeneeded = () => upgrade(r2.result);
        r2.onsuccess = () => { r2.result.onversionchange = () => { r2.result.close(); dbp = null; }; ok(r2.result); }; r2.onerror = () => ko(r2.error); r2.onblocked = () => ko(new Error('base occupée par une autre page')); };
      r.onerror = () => ko(r.error);
    }).catch(e => { dbp = null; throw e; }));
  }
  const tx = async (mode, fn) => { const d = await open(); return new Promise((ok, ko) => { const t = d.transaction(['projets'], mode); let out; Promise.resolve(fn(t.objectStore('projets'))).then(v => { out = v; }); t.oncomplete = () => ok(out); t.onerror = () => ko(t.error); t.onabort = () => ko(t.error); }); };
  const req = r => new Promise((ok, ko) => { r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); });
  const uid = () => (self.crypto && crypto.randomUUID ? crypto.randomUUID() : 'p-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10));
  const fix = p => { p.lots = Array.isArray(p.lots) ? p.lots : []; p.intervenants = Array.isArray(p.intervenants) ? p.intervenants : []; p.statut = p.statut || 'cours'; p.lots.forEach(l => { l.id = l.id || uid(); l.comp = Array.isArray(l.comp) ? l.comp : []; }); return p; };
  const label = p => p ? [p.code, p.nom].filter(Boolean).join(' · ') || 'Projet sans nom' : '';
  const sortP = (a, b) => (a.statut === 'archive') - (b.statut === 'archive') || String(a.code || a.nom || '').localeCompare(String(b.code || b.nom || ''), 'fr', { numeric: true });
  const listeners = new Set();
  const emit = () => { listeners.forEach(f => { try { f(); } catch (e) {} }); };
  if (bc) bc.onmessage = emit;
  return {
    PHASES, STATUTS, TYPES, NATURES, uid, label, fix, LOC, dept: deptOf,
    /* indice de localisation du projet : valeur saisie au projet, sinon celle de son département */
    loc(p) { const d = deptOf(p), t = LOC[d], m = p && p.coefLoc !== undefined && p.coefLoc !== null && p.coefLoc !== '' && isFinite(+p.coefLoc) ? +p.coefLoc : null;
      return { coef: m !== null ? m : t ? t[1] : 1, table: t ? t[1] : null, dept: d, nom: t ? t[0] : '', manuel: m !== null }; },
    async ok() { try { await open(); return true; } catch (e) { return false; } },
    async all() { try { return (await tx('readonly', os => req(os.getAll()))).filter(p => !p.deleted).map(fix).sort(sortP); } catch (e) { return []; } },
    async get(id) { if (!id) return null; try { const p = await tx('readonly', os => req(os.get(id))); return p && !p.deleted ? fix(p) : null; } catch (e) { return null; } },
    /* enregistre (date de mise à jour et repère « à synchroniser » comme les autres fiches de la base) */
    async put(p) { fix(p); if (!p.id) p.id = uid(); if (!p.createdAt) p.createdAt = new Date().toISOString(); p.updatedAt = new Date().toISOString(); p.dirty = 1; p.chantierId = null;
      await tx('readwrite', os => os.put(JSON.parse(JSON.stringify(p)))); if (bc) bc.postMessage('maj'); emit(); return p; },
    async create(o = {}) { return this.put({ code: '', nom: '', adresse: '', cp: '', ville: '', parcelles: '', moa: '', moaId: '', surface: '', phase: '', statut: 'cours', dates: {}, notes: '', ...o, id: uid() }); },
    async del(id) { const p = await this.get(id); if (!p) return; p.deleted = true; return this.put(p); },
    onChange(f) { listeners.add(f); window.addEventListener('focus', f); },
    /* page des projets (dans TerraContacts), depuis une application rangée dans un dossier voisin */
    hub(id, base = '../TerraChantier/') { return base + 'contacts.html#/projets' + (id ? '/' + id : ''); },
    /* liste déroulante de projets, avec « Nouveau projet » */
    options(cur, list, { none = 'Aucun projet', create = true } = {}) {
      return `<option value="">${none}</option>${list.map(p => `<option value="${p.id}"${p.id === cur ? ' selected' : ''}>${String(label(p)).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))}${p.statut === 'archive' ? ' (archivé)' : ''}</option>`).join('')}${create ? '<option value="__new">+ Nouveau projet…</option>' : ''}`;
    },
    /* identifiant de projet passé dans l'adresse (#projet=…) */
    fromHash() { const m = location.hash.match(/projet=([\w-]+)/); return m ? m[1] : ''; }
  };
})();
