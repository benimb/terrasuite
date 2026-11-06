/* TerraSuite : compte utilisateur, bibliothèque de l'agence et base commune.
   - Un compte (e-mail, mot de passe) sur le serveur central TerraSuite ; chaque compte appartient à une agence.
   - La bibliothèque privée (projets, contacts, chantiers) est celle de l'agence : visible de ses seuls membres.
   - Tout ce qui est saisi dans les applications (projets, DPGF, estimations, CCTP, plannings, études de faisabilité, produits prescrits)
     alimente aussi la base commune, après anonymisation : noms, adresses, maîtres d'ouvrage, entreprises et personnes sont retirés ;
     restent le département, l'indice de prix du lieu, le type d'ouvrage, la nature des travaux, la surface, la phase, les quantités et les prix.
   Fichier autonome, chargé par chaque application depuis ../TerraChantier/terrasuite-compte.js (même dossier que projets-api.js). */
const TSA = (() => {
  const SRC = (document.currentScript && document.currentScript.src) || '';
  const BASE = SRC.replace(/[^/]*$/, '');
  /* serveur central TerraSuite (Supabase) : adresse et clé publique, à renseigner une fois (ou dans le compte) */
  const DEF = { url: 'https://jkfxoapwpsbvporsfwho.supabase.co', key: 'sb_publishable_i70WIqsYN_40tk9N7OJbjA_2q6Fcaic' };
  const LS = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cfg = () => ({ ...DEF, ...LS.get('ts-central', {}) });
  let sb = null, sbKey = '', libP = null;
  const listeners = new Set(); const emit = () => listeners.forEach(f => { try { f(); } catch (e) {} });
  function loadLib() {
    if (window.supabase) return Promise.resolve(true);
    return libP || (libP = new Promise(ok => { const s = document.createElement('script'); s.src = BASE + 'vendor/supabase.js'; s.onload = () => ok(!!window.supabase); s.onerror = () => ok(false); document.head.appendChild(s); }));
  }
  async function client() {
    const c = cfg(); if (!c.url || !c.key) return null; if (!(await loadLib())) return null;
    const k = c.url + '|' + c.key; if (!sb || sbKey !== k) { sb = window.supabase.createClient(c.url, c.key, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'tc-auth' } }); sbKey = k; }
    return sb;
  }
  async function session() { const c = await client(); if (!c) return null; try { const { data } = await c.auth.getSession(); return data.session; } catch (e) { return null; } }
  /* profil : nom, agence, acceptation des conditions ; gardé dans le navigateur pour l'affichage hors réseau */
  async function profil(fresh) {
    const ses = await session(); if (!ses) { LS.set('ts-profil', null); return null; }
    const old = LS.get('ts-profil', null); if (!fresh && old && old.uid === ses.user.id) return old;
    try {
      const c = await client(); const { data, error } = await c.from('ts_profils').select('nom, role, cgu_at, agence_id, ts_agences(nom, code_invit)').eq('user_id', ses.user.id).maybeSingle(); if (error) throw error;
      const p = { uid: ses.user.id, email: ses.user.email, nom: data ? data.nom : '', role: data ? data.role : '', cgu: !!(data && data.cgu_at), agence: data && data.agence_id ? { id: data.agence_id, nom: data.ts_agences ? data.ts_agences.nom : '', code: data.ts_agences ? data.ts_agences.code_invit : '' } : null };
      LS.set('ts-profil', p); return p;
    } catch (e) { return old && old.uid === ses.user.id ? old : { uid: ses.user.id, email: ses.user.email, agence: null, cgu: false, horsReseau: true }; }
  }
  const etat = () => { const c = cfg(), p = LS.get('ts-profil', null); return { serveur: !!(c.url && c.key), connecte: !!p, profil: p, pret: !!(p && p.agence && p.cgu) }; };
  async function signIn(email, pw) { const c = await client(); if (!c) throw new Error('serveur TerraSuite non renseigné'); const { error } = await c.auth.signInWithPassword({ email, password: pw }); if (error) throw error; const p = await profil(true); emit(); return p; }
  async function signUp(email, pw) { const c = await client(); if (!c) throw new Error('serveur TerraSuite non renseigné'); const { data, error } = await c.auth.signUp({ email, password: pw }); if (error) throw error; if (!data.session) return { confirmer: true }; const p = await profil(true); emit(); return p; }
  async function signOut() { const c = await client(); if (c) await c.auth.signOut(); LS.set('ts-profil', null); emit(); }
  async function creerAgence(nom, nomUser) { const c = await client(); const { error } = await c.rpc('ts_creer_agence', { p_nom: nom, p_user: nomUser }); if (error) throw error; const p = await profil(true); emit(); Contrib.soon(2000); return p; }
  async function rejoindre(code, nomUser) { const c = await client(); const { error } = await c.rpc('ts_rejoindre_agence', { p_code: code.trim(), p_user: nomUser }); if (error) throw error; const p = await profil(true); emit(); Contrib.soon(2000); return p; }

  /* ================= Anonymisation ================= */
  const strip = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
  const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  /* motif insensible à la casse et aux accents (« Chatenay » trouve « Châtenay ») */
  const ACC = { a: 'aàâäá', e: 'eéèêë', i: 'iîïí', o: 'oôöó', u: 'uùûüú', c: 'cç', y: 'yÿ', n: 'nñ' };
  const SEP = "[\\s\\-'’.]+";
  const pat = t => strip(t).toLowerCase().split(/[\s\-'’.]+/).filter(Boolean).map(w => [...w].map(ch => ACC[ch] ? '[' + ACC[ch] + ACC[ch].toUpperCase() + ']' : reEsc(ch)).join('')).join(SEP);
  /* termes dérivés : parties d'un nom de maître d'ouvrage (« Ville de X » donne aussi X), noms de communes composés (X-sur-Y), sigles d'un intitulé d'opération */
  const SIGLES_COURANTS = new Set(['ERP', 'PMR', 'DTU', 'CVC', 'VMC', 'SSI', 'TCE', 'BET', 'MOE', 'MOA', 'OPC', 'DCE', 'APD', 'APS', 'PRO', 'ESQ', 'DPGF', 'CCTP', 'CCAP', 'RDC', 'HQE', 'BBC', 'RT', 'RE', 'PLU', 'SDP', 'SHON', 'CET', 'GTB', 'TGBT', 'IGH', 'ICPE', 'EHPAD', 'UEMO', 'HLM', 'ZAC', 'BTP', 'SPS', 'CSPS', 'AMO', 'GPA', 'AOR', 'DET', 'VISA', 'ACT']);
  function derive(terms) {
    const out = [...terms];
    for (const [t0, rep] of terms) { const t = String(t0 || ''); if (!t) continue;
      for (const part of t.split(/\s*[,;(]\s*|\s+-\s+|\s+–\s+/)) if (part.trim().length >= 6 && part.trim() !== t.trim()) out.push([part.trim(), rep]);
      const m = t.match(/^(?:ville|commune|mairie|département|conseil départemental|région|communauté (?:d'agglomération|de communes)|métropole)\s+(?:de|du|d'|des)\s*(.+)$/i); if (m) out.push([m[1].replace(/[,(].*$/, '').trim(), '[commune]']);
      for (const c of t.match(/\p{Lu}[\p{L}'’]+(?:-[\p{L}'’]+)+/gu) || []) out.push([c, '[commune]']);
      for (const c of t.match(/\b\p{Lu}{3,6}\b/gu) || []) if (!SIGLES_COURANTS.has(c)) out.push([c, '[sigle]']);
    }
    return out;
  }
  /* termes à retirer : [texte, remplacement] ; un terme de 3 lettres (code de projet) n'est retiré qu'écrit en majuscules */
  function scrubber(terms0) {
    const terms = derive(terms0); const L = []; const seen = new Set();
    for (const [t0, rep] of terms) { const t = String(t0 || '').trim(); if (t.length < 3) continue; const k = strip(t).toLowerCase(); if (seen.has(k)) continue; seen.add(k); L.push([t, rep]); }
    L.sort((a, b) => b[0].length - a[0].length);
    const rx = L.map(([t, rep]) => [new RegExp('(^|[^\\p{L}\\p{N}])(' + pat(t) + ')(?=$|[^\\p{L}\\p{N}])', 'giu'), rep, t.length < 4]);
    return s => {
      if (!s) return s; let x = String(s);
      for (const [r, rep, court] of rx) x = x.replace(r, (m, a, b) => (court && b !== b.toUpperCase()) ? m : a + rep);
      /* intervenants nommés dans les généralités d'un CCTP (« L'économiste de l'opération est : … ») */
      x = x.replace(/((?:ma[iî]tre d['’]\s?(?:œ|oe)uvre|ma[iî]trise d['’]\s?(?:œ|oe)uvre|ma[iî]tre d['’]\s?ouvrage|[ée]conomiste|bureau d['’]\s?[ée]tudes|contr[ôo]leur technique|coordonnateur|architecte|mandataire)[^:\n]{0,80}?\s(?:est|sont)\s*:\s*\n+)([^\n]{2,90})/giu, '$1[intervenant]');
      x = x.replace(/\b\d{1,4}(?:\s?(?:bis|ter))?,?\s+(?:rue|av(?:\.|enue)?|bd|boulevard|place|pl\.|chemin|allée|allee|impasse|quai|route|cours|square|villa|passage|voie|sentier|rond-point)(?=[\s.])[^,\n;()]{0,60}/giu, '[adresse]')
        .replace(/\b\d{5}\s*[-–]?\s*\p{Lu}[\p{L}'’-]{2,}(?:[\s-][\p{L}'’-]+){0,4}?(?=\s*(?:$|[,.;:)\n])|\s\d)/gu, '[code postal, commune]');
      return x.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[e-mail]').replace(/(?:\+33\s?|\b0)[1-9](?:[\s.-]?\d{2}){4}\b/g, '[téléphone]').replace(/\b\d{3}\s?\d{3}\s?\d{3}\s?\d{5}\b/g, '[SIRET]');
    };
  }
  const scrubKeep = sc => sc;
  const num = v => { const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(/\s/g, '').replace(',', '.')); return isFinite(n) ? n : null; };
  const pick = (o, ks) => { const r = {}; for (const k of ks) if (o[k] !== undefined && o[k] !== null && o[k] !== '') r[k] = o[k]; return r; };

  /* ================= Lecture des données locales de toutes les applications (même navigateur) ================= */
  const idbAll = (name, store) => new Promise(ok => { try { const r = indexedDB.open(name); r.onerror = () => ok([]); r.onupgradeneeded = () => { r.transaction.abort(); ok([]); };
    r.onsuccess = () => { const d = r.result; if (!d.objectStoreNames.contains(store)) { d.close(); return ok([]); } const q = d.transaction(store).objectStore(store).getAll(); q.onsuccess = () => { ok(q.result || []); d.close(); }; q.onerror = () => { ok([]); d.close(); }; }; } catch (e) { ok([]); } });
  const idbKv = (name, key) => new Promise(ok => { try { const r = indexedDB.open(name); r.onerror = () => ok(null); r.onupgradeneeded = () => { r.transaction.abort(); ok(null); };
    r.onsuccess = () => { const d = r.result; if (!d.objectStoreNames.contains('kv')) { d.close(); return ok(null); } const q = d.transaction('kv').objectStore('kv').get(key); q.onsuccess = () => { ok(q.result || null); d.close(); }; q.onerror = () => { ok(null); d.close(); }; }; } catch (e) { ok(null); } });
  async function teCol(c) { const o = await idbKv('terraestim', 'te-' + c); if (o) return o; return LS.get('te-' + c, {}) || {}; }

  /* ================= Contribution à la base commune ================= */
  const Contrib = (() => {
    let timer = null, busy = false, last = LS.get('ts-contrib-etat', null);
    const hash = s => { let h1 = 0x811c9dc5, h2 = 0x01000193; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 16777619); h2 = Math.imul(h2 ^ c, 2246822507); } return (h1 >>> 0).toString(36) + (h2 >>> 0).toString(36); };
    /* identifiant commun d'un élément : le même sur tous les postes (données de départ partagées comptées une seule fois) */
    const cid = (genre, id) => genre + ':' + hash(genre + '|' + id);
    async function collect() {
      const out = [];
      const TP = typeof TSP !== 'undefined' ? TSP : null;
      const projets = (await idbAll('terrachantier', 'projets')).filter(p => !p.deleted);
      const contacts = (await idbAll('terrachantier', 'contacts')).filter(c => !c.deleted);
      const pById = new Map(projets.map(p => [p.id, p]));
      const deptP = p => TP && p ? TP.dept(p) : (p && p.cp ? String(p.cp).slice(0, 2) : '');
      const locP = p => TP && p ? TP.loc(p).coef : null;
      /* termes à retirer : projets, intervenants, entreprises, personnes du carnet, agence */
      const terms = [];
      const persons = o => { for (const k of ['nom', 'prenom', 'contact', 'email', 'tel', 'mobile', 'portable']) if (typeof o[k] === 'string') terms.push([o[k], k === 'email' ? '[e-mail]' : k === 'tel' || k === 'mobile' || k === 'portable' ? '[téléphone]' : '[personne]']); };
      for (const p of projets) {
        terms.push([p.nom, '[opération]'], [p.adresse, '[adresse]'], [p.ville, '[commune]'], [p.moa, "[maître d'ouvrage]"]); if (p.code && p.code.length >= 3) terms.push([p.code, '[projet]']);
        (p.intervenants || []).forEach(x => { terms.push([x.nom, '[intervenant]']); persons({ contact: x.contact, email: x.email, tel: x.tel }); });
        (p.lots || []).forEach(l => { if (l.ent) { terms.push([l.ent.nom, '[entreprise]']); persons({ contact: l.ent.contact, email: l.ent.email, tel: l.ent.tel }); } });
      }
      for (const c of contacts) { if (c.kind === 'agence' || c.role === 'MOA' || c.role === 'ENT' || c.role === 'MOE') terms.push([c.nom || c.raison, '[organisme]']); (c.personnes || c.contacts || []).forEach(persons); persons({ email: c.email, tel: c.tel }); }
      const ag = LS.get('ts-profil', null); if (ag && ag.agence) terms.push([ag.agence.nom, '[agence]']);
      const meta = p => p ? { dept: deptP(p), loc: locP(p), type_ouvrage: p.typeOuvrage || '', nature: p.nature || '', phase: p.phase || '', surface: num(p.surface) } : {};
      const projOfId = id => id ? pById.get(id) || null : null;

      /* projets */
      for (const p of projets) {
        const d = { statut: p.statut, budget: num(p.budget), annees: Object.fromEntries(Object.entries(p.dates || {}).filter(([, v]) => v).map(([k, v]) => [k, String(v).slice(0, 7)])), lots: (p.lots || []).map(l => ({ num: l.num, comp: l.comp, attribue: !!(l.ent && l.ent.nom) })), parcelles: String(p.parcelles || '').split(/[,;]/).filter(x => x.trim()).length };
        out.push({ id: cid('projet', p.id), genre: 'projet', ...meta(p), mois: (p.updatedAt || '').slice(0, 7), data: d });
      }
      /* TerraEstim : DPGF, estimations, CCTP de projet */
      const sources = await teCol('sources'), ests = await teCol('estimations'), arts = await teCol('articles'), sets = await teCol('settings'), prest = await teCol('prestations');
      for (const [id, s] of Object.entries(sources || {})) {
        if (!s || !Array.isArray(s.lignes)) continue; const p = projOfId(s.projet);
        const sc = scrubKeep(scrubber([...terms, [s.entreprise, '[entreprise]'], [s.moa, "[maître d'ouvrage]"], [s.operation, '[opération]']]));
        const dept = String(s.dept || '').trim() || (p ? deptP(p) : '');
        out.push({ id: cid('dpgf', id), genre: 'dpgf', ...meta(p), dept, loc: TP && TP.LOC[dept] ? TP.LOC[dept][1] : (p ? locP(p) : null), phase: 'Offre', mois: s.mois || '', surface: p ? num(p.surface) : null,
          data: { lot: s.lot || '', lots: s.lots || [], retenue: !!s.retenue, rang: s.rang || '', montant: num(s.montant), lignes: s.lignes.map(l => ({ ...pick(l, ['kind', 'num', 'unit', 'lot']), des: sc(l.des || ''), ...(num(l.qte) !== null ? { qte: num(l.qte) } : {}), ...(num(l.pu) !== null ? { pu: num(l.pu) } : {}) })) } });
      }
      for (const [id, e] of Object.entries(ests || {})) {
        if (!e || !Array.isArray(e.lignes)) continue; const p = projOfId(e.projet);
        const sc = scrubKeep(scrubber([...terms, [e.operation, '[opération]'], [e.moa, "[maître d'ouvrage]"]]));
        const lignes = e.lignes.filter(l => l && (l.des || l.pid)).map(l => ({ lot: l.lot || '', des: sc(l.des || (prest[l.pid] ? prest[l.pid].designation : '')), unit: l.unit || (prest[l.pid] ? prest[l.pid].unite : ''), ...(num(l.qte) !== null ? { qte: num(l.qte) } : {}), ...(num(l.pu) !== null ? { pu: num(l.pu) } : {}) }));
        out.push({ id: cid('estimation', id), genre: 'estimation', ...meta(p), phase: e.phase || (p && p.phase) || '', mois: e.mois || '', surface: num(e.surface) ?? (p ? num(p.surface) : null), loc: num(e.loc) ?? (p ? locP(p) : null),
          data: { surfLabel: e.surfLabel || '', aleas: num(e.aleas), lignes } });
      }
      const rcs = ((sets || {}).recueils || {}).list || [];
      const byRc = new Map(); for (const [id, a] of Object.entries(arts || {})) { if (!a || !a.cctp) continue; if (!byRc.has(a.cctp)) byRc.set(a.cctp, []); byRc.get(a.cctp).push(a); }
      for (const [rc, list] of byRc) {
        const r = rcs.find(x => x.id === rc) || {}, p = projOfId(r.projet);
        const sc = scrubKeep(scrubber([...terms, [r.nom, '[opération]'], [r.moa, "[maître d'ouvrage]"], [r.court, '[projet]']]));
        out.push({ id: cid('cctp', rc), genre: 'cctp', ...meta(p), mois: '', data: { pieces: Object.fromEntries(Object.entries(r.pieces || {}).map(([k, v]) => [k, { nom: sc(v.nom || ''), lot: v.lot || '' }])),
          articles: list.map(a => ({ type: a.type, code: a.code, piece: a.piece || '', lot: a.lot || '', titre: sc(a.titre || ''), texte: sc(a.texte || '') })) } });
      }
      /* TerraPlanning */
      for (const [id, v] of Object.entries(LS.get('tf-plannings', {}) || {})) {
        const P = v && v.project; if (!P || !Array.isArray(P.tasks)) continue; const p = projOfId(P.projet || (P.meta || {}).projet);
        const sc = scrubKeep(scrubber([...terms, [P.title, '[opération]'], [(P.meta || {}).operation, '[opération]'], [(P.meta || {}).moa, "[maître d'ouvrage]"]]));
        out.push({ id: cid('planning', id), genre: 'planning', ...meta(p), mois: P.start ? String(P.start).slice(0, 7) : '', data: { kind: P.kind || '', document: sc((P.meta || {}).document || ''), hoursPerDay: P.hoursPerDay, workdays: P.calendar ? P.calendar.workdays : null,
          tasks: P.tasks.filter(t => !t.blank).map(t => ({ uid: t.uid, level: t.level, name: sc(t.name || ''), ...(t.dur ? { dur: t.dur } : {}), ...(t.ms ? { ms: true } : {}), ...(t.preds && t.preds.length ? { preds: t.preds.map(x => pick(x, ['uid', 'type', 'lag'])) } : {}), ...(t.lot ? { lot: t.lot } : {}) })) } });
      }
      /* TerraGeo : études de faisabilité */
      for (const f of LS.get('tg-fiches', []) || []) {
        if (!f || !f.id || !(f.parcelles || []).length) continue; const p = projOfId(f.projet);
        const dept = f.insee ? (/^97/.test(f.insee) ? f.insee.slice(0, 3) : f.insee.slice(0, 2)) : (p ? deptP(p) : '');
        const res = f.res || {}, zon = (res.zonage || res.zones || res.gpu || []);
        out.push({ id: cid('faisa', f.id), genre: 'faisa', ...meta(p), dept, loc: TP && TP.LOC[dept] ? TP.LOC[dept][1] : null, mois: f.updated ? new Date(f.updated).toISOString().slice(0, 7) : '',
          data: { parcelles: f.parcelles.length, terrain: f.parcelles.reduce((a, x) => a + (num(x.contenance) || 0), 0), zones: Array.isArray(zon) ? zon.map(z => z && (z.libelle || z.libelong || z.typezone || z.nom)).filter(Boolean).slice(0, 12) : [] } });
      }
      /* TerraDocs : produits prescrits par projet */
      const D = LS.get('terradocs.v1', null);
      if (D && Array.isArray(D.produits)) for (const p of projets) {
        const keys = [p.code, p.nom].filter(Boolean).map(x => strip(x).toLowerCase().trim());
        const prods = D.produits.filter(x => String(x.projets || '').split(/[,;\n]+/).some(t => keys.includes(strip(t).toLowerCase().trim())));
        if (prods.length) out.push({ id: cid('produits', p.id), genre: 'produits', ...meta(p), mois: '', data: { produits: prods.map(x => pick(x, ['lot', 'fabricant', 'nom', 'reference', 'statut'])) } });
      }
      return out;
    }
    /* envoi des éléments nouveaux ou modifiés (empreinte du contenu), par paquets */
    async function run() {
      if (busy) return; const st = etat(); if (!st.pret || !navigator.onLine) return; busy = true;
      try {
        const c = await client(); if (!c || !(await session())) return;
        const items = await collect(), sent = LS.get('ts-contrib', {}); const todo = [];
        for (const it of items) { const h = hash(JSON.stringify(it)); if (sent[it.id] !== h) todo.push([it, h]); }
        let n = 0, pack = [], size = 0;
        const flush = async () => { if (!pack.length) return; const { error } = await c.rpc('ts_contribuer', { p_items: pack.map(x => x[0]) }); if (error) throw error; pack.forEach(([it, h]) => { sent[it.id] = h; }); LS.set('ts-contrib', sent); n += pack.length; pack = []; size = 0; };
        for (const x of todo) { const s = JSON.stringify(x[0]).length; if (size + s > 1500000 || pack.length >= 40) await flush(); pack.push(x); size += s; }
        await flush();
        last = { at: new Date().toISOString(), n, total: items.length }; LS.set('ts-contrib-etat', last); emit();
      } catch (e) { last = { ...(last || {}), err: e.message || String(e), errAt: new Date().toISOString() }; LS.set('ts-contrib-etat', last); console.warn('TerraSuite, base commune', e); }
      finally { busy = false; }
    }
    function soon(ms = 8000) { clearTimeout(timer); timer = setTimeout(run, ms); }
    function start() { soon(6000); setInterval(run, 10 * 60000); addEventListener('online', () => soon(3000)); }
    return { collect, run, soon, start, last: () => LS.get('ts-contrib-etat', null) };
  })();

  /* chiffres de la base commune (nombre d'éléments par genre) */
  async function stats() { const c = await client(); if (!c || !(await session())) return null; const { data, error } = await c.rpc('ts_commun_stats'); return error ? null : data; }

  /* ================= Interface : panneau du compte ================= */
  const CGU = `En créant un compte, vous acceptez que tout ce que vous saisissez dans les applications TerraSuite (projets, DPGF, estimations, CCTP, plannings, études de faisabilité, produits prescrits) alimente la base commune TerraSuite, après anonymisation : les noms d'opération, adresses, communes, maîtres d'ouvrage, entreprises, personnes, e-mails et téléphones sont retirés avant l'envoi ; restent le département, l'indice de prix du lieu, le type d'ouvrage, la nature des travaux, la surface, la phase, les descriptions d'ouvrages, les quantités, les prix et les durées. La base commune profite à tous les utilisateurs. Vos données complètes restent dans la bibliothèque de votre agence, visible de ses seuls membres. Photos et plans ne sont jamais envoyés à la base commune.`;
  function panel(el, opt = {}) {
    const S = etat(), c = cfg(), p = S.profil, L = Contrib.last();
    const genres = { projet: 'projets', dpgf: 'DPGF', estimation: 'estimations', cctp: 'CCTP', planning: 'plannings', faisa: 'études de faisabilité', produits: 'listes de produits' };
    const f = (id, t, type = 'text', v = '', ac = '') => `<label class="f">${t}<input type="${type}" id="${id}" value="${E(v)}"${ac ? ` autocomplete="${ac}"` : ''}></label>`;
    let h = '';
    if (!S.serveur || opt.serveur) h += `<div class="card" style="display:flex;flex-direction:column;gap:8px"><b>Serveur central TerraSuite</b><div class="hint">Adresse et clé publique (anon) du projet Supabase TerraSuite, fournies par TERRAFORM.</div><div class="grid2">${f('tsU', 'Adresse', 'url', c.url)}${f('tsK', 'Clé publique', 'text', c.key)}</div><div class="row"><button class="btn" id="tsCfg">Enregistrer</button></div></div>`;
    if (S.serveur && !p) h += `<div class="card" style="display:flex;flex-direction:column;gap:8px"><b>Se connecter</b><div class="grid2">${f('tsE', 'E-mail', 'email', LS.get('ts-email', ''), 'username')}${f('tsP', 'Mot de passe', 'password', '', 'current-password')}</div>
      <div class="row" style="flex-wrap:wrap"><button class="btn pri" id="tsIn">Se connecter</button><button class="btn" id="tsUp">Créer mon compte</button></div></div>`;
    if (p && !p.agence) h += `<div class="card" style="display:flex;flex-direction:column;gap:8px"><b>Votre agence</b><div class="hint">Connecté : ${E(p.email)}. Rattachez votre compte à une agence : créez-la, ou rejoignez-la avec le code d'invitation donné par un de ses membres.</div>
      ${f('tsNom', 'Votre nom', 'text', p.nom || '')}
      <div class="grid2">${f('tsAg', "Nom de l'agence (création)")}${f('tsCode', "Code d'invitation (rejoindre)")}</div>
      <label class="row small" style="gap:8px;align-items:flex-start"><input type="checkbox" id="tsCgu" style="margin-top:3px"><span>${E(CGU)}</span></label>
      <div class="row" style="flex-wrap:wrap"><button class="btn pri" id="tsCreer">Créer l'agence</button><button class="btn" id="tsJoin">Rejoindre l'agence</button><button class="btn" id="tsOut">Se déconnecter</button></div></div>`;
    if (p && p.agence) h += `<div class="card" style="display:flex;flex-direction:column;gap:8px"><b>Compte TerraSuite</b>
      <div>${E(p.nom || p.email)} · <span class="muted">${E(p.email)}</span></div><div>Agence : <b>${E(p.agence.nom)}</b>${p.agence.code ? ` · code d'invitation pour vos collègues : <code>${E(p.agence.code)}</code>` : ''}</div>
      <div class="hint">Bibliothèque de l'agence : projets, contacts et chantiers, partagés entre ses membres. Base commune : tout ce que vous saisissez y contribue, anonymisé.</div>
      <div class="hint" id="tsContrib">${L && L.at ? `Dernier envoi à la base commune : ${new Date(L.at).toLocaleString('fr-FR')} (${L.n} élément(s) nouveaux ou modifiés sur ${L.total})` : 'Premier envoi à la base commune en préparation.'}${L && L.err ? ` · <span style="color:var(--warn,#c2410c)">dernier essai interrompu : ${E(L.err)}</span>` : ''}</div>
      <div class="hint" id="tsStats"></div>
      <div class="row" style="flex-wrap:wrap"><button class="btn" id="tsNow">Envoyer maintenant</button><button class="btn" id="tsSee">Voir ce qui est envoyé</button><button class="btn" id="tsOut">Se déconnecter</button></div><pre id="tsPrev" hidden style="max-height:320px;overflow:auto;font-size:11.5px;white-space:pre-wrap;background:var(--soft,#f4f4f4);padding:8px;border-radius:8px"></pre></div>`;
    el.innerHTML = h + '<div class="hint" id="tsMsg" style="margin-top:6px"></div>';
    const q = id => el.querySelector('#' + id), note = m => { const x = q('tsMsg'); if (x) x.textContent = m; }, re = () => panel(el, opt);
    const run = (b, fn) => b && (b.onclick = async () => { b.disabled = true; try { await fn(); } catch (e) { note(e.message || String(e)); } finally { b.disabled = false; } });
    run(q('tsCfg'), async () => { LS.set('ts-central', { url: q('tsU').value.trim().replace(/\/$/, ''), key: q('tsK').value.trim() }); sb = null; re(); });
    run(q('tsIn'), async () => { LS.set('ts-email', q('tsE').value.trim()); await signIn(q('tsE').value.trim(), q('tsP').value); re(); });
    run(q('tsUp'), async () => { LS.set('ts-email', q('tsE').value.trim()); const r = await signUp(q('tsE').value.trim(), q('tsP').value); if (r && r.confirmer) note('Compte créé : confirmez votre adresse avec le lien reçu par e-mail, puis connectez-vous.'); else re(); });
    run(q('tsOut'), async () => { await signOut(); re(); });
    const cgu = () => { if (!q('tsCgu').checked) throw new Error('Cochez l\'acceptation des conditions de la base commune.'); if (!q('tsNom').value.trim()) throw new Error('Indiquez votre nom.'); };
    run(q('tsCreer'), async () => { cgu(); if (!q('tsAg').value.trim()) throw new Error("Indiquez le nom de l'agence."); await creerAgence(q('tsAg').value.trim(), q('tsNom').value.trim()); re(); });
    run(q('tsJoin'), async () => { cgu(); if (!q('tsCode').value.trim()) throw new Error("Indiquez le code d'invitation."); await rejoindre(q('tsCode').value, q('tsNom').value.trim()); re(); });
    run(q('tsNow'), async () => { note('Envoi en cours…'); await Contrib.run(); re(); });
    run(q('tsSee'), async () => { const it = await Contrib.collect(), pr = q('tsPrev'); const by = {}; it.forEach(x => { by[x.genre] = (by[x.genre] || 0) + 1; });
      pr.textContent = Object.entries(by).map(([g, n]) => `${n} ${genres[g] || g}`).join(' · ') + '\n\nExemple (premier élément de chaque genre) :\n\n' + Object.keys(by).map(g => JSON.stringify(it.find(x => x.genre === g), null, 1).slice(0, 1800)).join('\n\n'); pr.hidden = false; });
    if (q('tsStats')) stats().then(s => { if (s && q('tsStats')) q('tsStats').textContent = 'Base commune : ' + Object.entries(s).map(([g, n]) => `${n} ${genres[g] || g}`).join(' · '); });
  }
  /* ligne d'état pour les pages d'accueil des applications */
  function pied(hub = BASE + 'contacts.html#/compte') {
    const S = etat();
    return !S.serveur || !S.connecte ? `Compte TerraSuite : non connecté. <a href="${hub}">Se connecter</a> pour partager la bibliothèque de l'agence et alimenter la base commune.`
      : !S.pret ? `Compte TerraSuite : ${E(S.profil.email)}, agence à renseigner. <a href="${hub}">Compléter</a>.`
      : `Compte TerraSuite : ${E(S.profil.nom || S.profil.email)} · ${E(S.profil.agence.nom)}. Vos saisies alimentent la base commune, anonymisées.`;
  }
  /* au chargement : profil rafraîchi, puis contribution en arrière-plan */
  setTimeout(async () => { if (cfg().url) { await profil(true); emit(); Contrib.start(); } }, 1500);
  return { cfg, setCfg: c => { LS.set('ts-central', c); sb = null; }, client, session, profil, etat, signIn, signUp, signOut, creerAgence, rejoindre, Contrib, stats, panel, pied, CGU, scrubber, onChange: f => listeners.add(f) };
})();
