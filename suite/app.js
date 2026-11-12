/* TerraSuite : application unique, le projet au centre.
   Un projet s'ouvre sur ses onglets de phases (ESQ, AVP, PRO / DCE, analyse des offres, chantier, OPR, réception, GPA),
   plus le planning et la fiche, transversaux. Les modules existants (TerraGeo, TerraEstim, TerraPlanning, TerraChantier,
   TerraDocs, TerraContacts, TerraModel) s'ouvrent dans l'onglet, sur le projet ; leurs données sont synchronisées par ts-link.js et sync.js.
   Les bibliothèques communes à tous les projets (catalogue des produits, base de prix, articles de CCTP, contacts, veille AO) sont à part. */
const TS_VERSION = '0.6.18';
const TSApp = (() => {
  const SVG = {
    back: '<path d="M15 18l-6-6 6-6"/>', plus: '<path d="M12 5v14M5 12h14"/>', cam: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>', home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>', lib: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5V21h16"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>', ext: '<path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>',
    reload: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>'
  };
  /* maison pleine : un projet existant ; la même en pointillé : un projet à créer */
  const HOUSE = dash => `<svg class="house" viewBox="0 0 64 64" aria-hidden="true">${dash
    ? '<path d="M10 30 L32 11 L54 30 V54 H10 Z" fill="none" stroke="#b5532f" stroke-width="3" stroke-dasharray="6 5" stroke-linejoin="round"/><path d="M32 33 V47 M25 40 H39" stroke="#b5532f" stroke-width="3" stroke-linecap="round"/>'
    : '<path d="M10 30 L32 11 L54 30 V54 H10 Z" fill="#b5532f" stroke="#b5532f" stroke-width="3" stroke-linejoin="round"/><rect x="27" y="38" width="10" height="16" rx="1.5" fill="#fff"/>'}</svg>`;
  const ico = n => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${SVG[n] || ''}</svg>`;
  const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const LS = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };

  /* ---------- onglets du projet : phases de la mission ---------- */
  const T_GEO = p => `TerraGeo/TerraGeo.html#projet=${p.id}`, T_EST = p => `TerraEstim/TerraEstim.html#projet=${p.id}`, T_CH = p => `TerraChantier/index.html#/projet/${p.id}`, T_MOD = p => `TerraModel/TerraModel.html#projet=${p.id}`;
  const TABS = [
    { id: 'apercu', nom: "Vue d'ensemble", c: '#b5532f', subs: [['apercu', "Vue d'ensemble", 'native']] },
    { id: 'esq', nom: 'ESQ', c: '#8a5a12', subs: [['site', 'Site', 'frame', T_GEO], ['m3d', 'Maquette 3D', 'frame', T_MOD], ['esq', 'Estimation sommaire', 'soon']] },
    { id: 'avp', nom: 'AVP', c: '#a16207', subs: [['plans', 'Plans et notice', 'native'], ['estimA', 'Estimation', 'frame', T_EST], ['auto', 'PC, DP, modificatifs', 'native']] },
    { id: 'pro', nom: 'PRO / DCE', c: '#2f8f5b', subs: [['estim', 'Estimation', 'frame', T_EST], ['desc', 'Descriptif (CCTP)', 'frame', T_EST, '[data-tab=cctp]'], ['produits', 'Produits', 'frame', p => `TerraDocs/TerraDocs.html#projet=${p.id}`], ['dce', 'Dossier DCE', 'native']] },
    { id: 'act', nom: 'Analyse des offres', c: '#0f766e', subs: [['offres', 'Offres reçues', 'frame', p => `TerraEstim/TerraEstim.html#dpgf=${p.id}`], ['rapport', "Rapport d'analyse", 'soon'], ['marches', 'Marchés', 'soon']] },
    { id: 'chantier', nom: 'Chantier', c: '#7a4fb0', subs: [['chantier', 'Visites et CR', 'frame', T_CH], ['os', 'Ordres de service', 'native'], ['situations', 'Situations', 'native']] },
    { id: 'opr', nom: 'OPR', c: '#c2410c', subs: [['opr', 'Réserves', 'frame', T_CH], ['pvopr', "PV d'OPR", 'native']] },
    { id: 'recep', nom: 'Réception', c: '#b45309', subs: [['pv', 'PV de réception, levée des réserves', 'native'], ['doe', 'DOE, DIUO', 'native']] },
    { id: 'gpa', nom: 'GPA', c: '#6b7280', subs: [['gpa', 'Désordres signalés', 'native'], ['fingpa', 'Fin de GPA', 'native']] },
    { id: 'planning', nom: 'Planning', c: '#2f6fb5', tr: true, subs: [['planning', 'Planning', 'frame', p => `TerraPlanning/TerraPlanning.html#projet=${p.id}`]] },
    { id: 'projet', nom: 'Fiche et intervenants', c: '#9a3b6b', tr: true, subs: [['fiche', 'Fiche', 'native'], ['inter', 'Intervenants, lots du marché', 'frame', p => `TerraChantier/contacts.html#/projets/${p.id}`]] }
  ];
  const SOON = {
    m3d: ['Maquette 3D', "Modeleur de volumes posé sur la parcelle du site : niveaux, toitures, ouvertures. Ses surfaces alimenteront l'estimation sommaire et ses niveaux les plans du chantier."],
    esq: ['Estimation sommaire', "Surfaces de la maquette 3D × ratios de la base de prix × indice du lieu du site, comparées aux projets semblables de la base commune. En attendant, l'estimation détaillée est dans AVP et PRO / DCE."],
    plans: ['Plans et notice', "Dépôt des plans et de la notice de l'avant-projet (PDF), avec indice et date ; repris dans le dossier de PC."],
    dce: ['Dossier DCE', 'Assemblage du dossier de consultation : CCTP par pièce, DPGF vierges par lot, plans, planning, règlement de consultation.'],
    rapport: ["Rapport d'analyse des offres", "Comparaison ligne à ligne des DPGF avec l'estimation, notation, proposition d'attribution par lot. Les offres reçues sont dans le sous-onglet voisin."],
    marches: ['Marchés', "Entreprise retenue et montant par lot ; repris dans les intervenants, le planning et le chantier. L'attribution des lots se fait aujourd'hui dans Fiche et intervenants."],
    os: ['Ordres de service', 'OS de démarrage et OS modificatifs : numérotation, objet, montants, délais, signature.'],
    situations: ['Situations de travaux', "Avancement et montants par lot et par mois, visa de l'architecte, récapitulatif des paiements."],
    pvopr: ["PV d'opérations préalables à la réception", "Liste des réserves par lot reprise du sous-onglet Réserves, signée sur place et envoyée aux entreprises."],
    pv: ['PV de réception, PV de levée des réserves', 'Réception avec ou sans réserves, par lot ou tous lots ; levée des réserves une à une avec photo après intervention ; PV de non-réception.'],
    doe: ['DOE, DIUO', 'Dossiers des ouvrages exécutés reçus par lot ; produits posés repris des prescriptions.'],
    gpa: ['Désordres signalés', "Réclamations du maître d'ouvrage pendant l'année de parfait achèvement, suivi des interventions des entreprises."],
    fingpa: ['Fin de GPA', 'Courrier de fin de garantie de parfait achèvement, libération des retenues de garantie.']
  };
  const PH2TAB = { 'Faisabilité': 'esq', ESQ: 'esq', APS: 'avp', APD: 'avp', PC: 'avp', PRO: 'pro', DCE: 'pro', ACT: 'act', VISA: 'chantier', DET: 'chantier', AOR: 'opr', GPA: 'gpa' };
  const PHASE_ORDER = TABS.filter(t => !t.tr && t.id !== 'apercu').map(t => t.id);
  const tabOf = id => TABS.find(t => t.id === id);

  /* ---------- bibliothèques communes ---------- */
  const LIBS = [
    { id: 'catalogue', nom: 'Catalogue des produits', c: '#4338ca', url: 'TerraDocs/TerraDocs.html', click: '[data-tab=produits]' },
    { id: 'prix', nom: 'Base de prix', c: '#2f8f5b', url: 'TerraEstim/TerraEstim.html', click: '[data-tab=lib]' },
    { id: 'cctp', nom: 'Articles de CCTP types', c: '#0f766e', url: 'TerraEstim/TerraEstim.html', click: '[data-tab=cctp]' },
    { id: 'contacts', nom: 'Contacts', c: '#9a3b6b', url: 'TerraChantier/contacts.html' },
    { id: 'ao', nom: "Veille appels d'offres", c: '#0f766e', url: 'TerraSourcing/TerraSourcing.html' }
  ];

  /* ---------- état ---------- */
  const st = { projets: [], q: '', route: [], frames: new Map(), installEvt: null, counts: {} };
  const $m = () => document.getElementById('main');
  const go = h => { if (location.hash !== h) location.hash = h; else draw(); };

  /* ---------- données d'un projet, lues dans les bases de l'appareil ---------- */
  function idbGet(dbName, store, key) {
    return new Promise(ok => { try { const r = indexedDB.open(dbName); r.onupgradeneeded = () => { try { r.transaction.abort(); } catch (e) {} ok(null); };
      r.onsuccess = () => { const d = r.result; if (!d.objectStoreNames.contains(store)) { d.close(); return ok(null); } const q = d.transaction(store).objectStore(store).get(key); q.onsuccess = () => { ok(q.result || null); d.close(); }; q.onerror = () => { ok(null); d.close(); }; };
      r.onerror = () => ok(null); } catch (e) { ok(null); } });
  }
  let cacheEst = null, cacheAt = 0;
  async function estData() {
    if (cacheEst && Date.now() - cacheAt < 30000) return cacheEst;
    const [est, src] = await Promise.all([idbGet('terraestim', 'kv', 'te-estimations'), idbGet('terraestim', 'kv', 'te-sources')]);
    cacheEst = { est: est || LS.get('te-estimations', {}), src: src || {} }; cacheAt = Date.now(); return cacheEst;
  }
  async function docsAll() { try { return (await DB.all('docs')).filter(d => !d.deleted); } catch (e) { return []; } }
  const tok = s => String(s || '').split(/[,;\n]+/).map(x => norm(x)).filter(Boolean);
  async function projectData(p) {
    const docs = await docsAll(), mine = docs.filter(d => d.projetId === p.id);
    const byKey = (app, coll) => new Map(mine.filter(d => d.app === app && d.coll === coll).map(d => [String(d.rid), d.data]));
    const geo = byKey('geo', 'fiches'); (LS.get('tg-fiches', []) || []).filter(f => f.projet === p.id).forEach(f => geo.set(String(f.id), f));
    const plan = byKey('planning', 'plannings'); Object.entries(LS.get('tf-plannings', {}) || {}).filter(([, v]) => v && v.project && v.project.projet === p.id).forEach(([k, v]) => plan.set(k, v));
    const ED = await estData();
    const est = byKey('estim', 'estimations'); Object.entries(ED.est || {}).filter(([, v]) => v && v.projet === p.id).forEach(([k, v]) => est.set(k, v));
    const src = byKey('estim', 'sources'); Object.entries(ED.src || {}).filter(([, v]) => v && v.projet === p.id).forEach(([k, v]) => src.set(k, v));
    const keys = [p.code, p.nom].filter(Boolean).map(norm);
    const td = LS.get('terradocs.v1', null), prods = new Map();
    const inP = x => tok(x.projets).some(t => keys.includes(t) || t === norm(p.id));
    (td && Array.isArray(td.produits) ? td.produits : []).filter(inP).forEach(x => prods.set(x.id, x));
    docs.filter(d => d.app === 'docs' && d.coll === 'produits' && d.data && inP(d.data)).forEach(d => prods.set(String(d.rid), d.data));
    let chs = [], vis = [], res = [];
    try { chs = (await DB.all('chantiers')).filter(c => c.projetId === p.id); for (const c of chs) { vis.push(...await DB.all('visites', c.id)); res.push(...await DB.all('reserves', c.id)); } } catch (e) {}
    vis.sort((a, b) => String(b.date || b.updatedAt || '').localeCompare(String(a.date || a.updatedAt || '')));
    const recent = mine.filter(d => d.app !== 'suite').sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))).slice(0, 8);
    const pvs = mine.filter(d => d.app === 'suite' && d.coll === 'pv').map(d => d.data), recep = pvs.filter(r => /^Réception/.test(r.type || '') && r.date).sort((a, b) => String(a.date).localeCompare(String(b.date)))[0] || null;
    const gpaO = mine.filter(d => d.app === 'suite' && d.coll === 'gpa' && d.data && d.data.etat !== 'Réglé').length;
    /* maquette 3D (TerraModel) : une par projet, gardée dans le navigateur et synchronisée */
    const mods = byKey('terramodel', 'maquettes'); { const lm = (LS.get('terramodel-maquettes', {}) || {})[p.id]; if (lm) mods.set(p.id, lm); }
    const mod = mods.get(p.id) || [...mods.values()][0] || null;
    return { mod, geo, plan, est, src, prods, chs, vis, res, recent, pvs, recep, gpaO };
  }

  /* ---------- colonne de gauche ---------- */
  function drawSide() {
    const r = st.route, curP = r[0] === 'p' ? r[1] : '', curL = r[0] === 'b' ? r[1] : '';
    const q = norm(st.q), L = st.projets.filter(p => !q || norm([p.code, p.nom, p.ville, p.moa].join(' ')).includes(q));
    const act = L.filter(p => p.statut !== 'archive' && p.statut !== 'termine'), old = L.filter(p => p.statut === 'archive' || p.statut === 'termine');
    const item = p => `<a class="pitem${p.id === curP ? ' on' : ''}${p.statut === 'archive' ? ' arch' : ''}" href="#/p/${p.id}"><span class="l1"><b>${E(p.code || '—')}</b><span class="ph">${E(p.phase || '')}</span></span><span class="nm">${E(p.nom || 'Projet sans nom')}</span></a>`;
    document.getElementById('side').innerHTML = `
      <a class="brand" href="#/"><img class="logo" src="suite/logo.svg" alt=""><b>Terra<span>Suite</span></b><span class="ver">${TS_VERSION} bêta</span></a>
      <div class="search"><label class="hint" for="pq">Chercher un projet</label><input id="pq" type="search" placeholder="Code, nom, commune" value="${E(st.q)}"></div>
      <div class="side-h"><span class="cap">Projets</span><button class="btn sm pri" id="newP">${ico('plus')}Projet</button></div>
      <nav class="plist" aria-label="Projets">${act.map(item).join('') || '<div class="empty" style="padding:8px 12px">Aucun projet</div>'}${old.length ? `<details style="margin-top:6px"><summary class="hint" style="padding:6px 12px;cursor:pointer">Terminés, archivés (${old.length})</summary>${old.map(item).join('')}</details>` : ''}</nav>
      <div class="libs"><span class="cap">Commun à tous les projets</span>${LIBS.map(b => `<a class="litem${curL === b.id ? ' on' : ''}" href="#/b/${b.id}"><span class="dot" style="background:${b.c}"></span>${E(b.nom)}<span class="n">${E(st.counts[b.id] ?? '')}</span></a>`).join('')}</div>
      <div class="side-f"><a class="sync" id="syncSt" href="#/compte"><span id="syncTx">Synchronisation</span></a><a href="#/compte">Compte</a></div>`;
    const qi = document.getElementById('pq'); qi.oninput = () => { st.q = qi.value; const pos = qi.selectionStart; drawSide(); const n = document.getElementById('pq'); n.focus(); n.setSelectionRange(pos, pos); if (st.route[0] === 'projets') drawHome(); };
    document.getElementById('newP').onclick = newProject;
    paintSync();
  }
  function drawBottom() {
    const r = st.route[0] || '';
    const a = (h, n, i, on, cls = '') => `<a href="${h}" class="${on ? 'on ' : ''}${cls}">${ico(i)}${n}</a>`;
    document.getElementById('bottom').innerHTML = a('#/', 'Accueil', 'home', r === '' || r === 'agence' || r === 'compte') + a('#/projets', 'Projets', 'list', r === 'projets' || r === 'p') + a('#/photo', 'Photo', 'cam', false, 'photo') + a('#/b', 'Bibliothèques', 'lib', r === 'b');
  }
  function paintSync() {
    const el = document.getElementById('syncSt'); if (!el || typeof Sync === 'undefined') return; Sync.paint();
    const s = Sync.state ? Sync.state() : { msg: '' }, tx = document.getElementById('syncTx');
    if (tx) tx.textContent = s.state === 'ok' ? 'Synchronisé' : s.state === 'run' ? 'Synchronisation…' : s.state === 'wait' ? 'Hors réseau' : s.state === 'err' && !/connect|agence/i.test(s.msg || '') ? 'Synchronisation à vérifier' : 'Non connecté';
    el.title = s.msg || '';
  }

  /* ---------- accueil : travailler sur un projet ou créer un projet ---------- */
  async function drawAccueil() {
    const ag = typeof Carnet !== 'undefined' ? Carnet.agence() : null, arch = ag && typeof Carnet !== 'undefined' ? Carnet.architecte() : null, et = TSA.etat();
    const act = st.projets.filter(p => p.statut !== 'archive' && p.statut !== 'termine');
    const rec = (LS.get('ts-recents', []) || []).map(id => st.projets.find(p => p.id === id)).filter(Boolean).slice(0, 4);
    const quick = (rec.length ? rec : act.slice(0, 4));
    /* le prénom vient du compte connecté (sinon on ne sait pas qui utilise l'appareil) */
    const who = et.connecte && et.profil ? (et.profil.nom || '').trim().split(/\s+/)[0] || ((arch && et.profil.email && arch.email && arch.email.toLowerCase() === et.profil.email.toLowerCase()) ? arch.prenom : '') : '';
    const hello = who ? 'Bonjour ' + who : 'Bonjour';
    $m().innerHTML = `<div class="body home"><div class="wrap" style="max-width:980px">
      <div class="suite-id"><img src="suite/logo.svg" alt="" width="64" height="64"><div><div class="wm">Terra<span>Suite</span></div><div class="tag">Le projet d'architecture, de l'esquisse à la garantie de parfait achèvement</div></div></div>
      <div class="hhead"><span id="agLogoH" class="hlogo"></span><div>${ag && ag.nom ? `<div class="k">${E(ag.nom)}</div>` : ''}<h1>${E(hello)}</h1></div></div>
      ${!et.pret ? `<div class="card note"><div><b>Connectez-vous à votre compte TerraSuite</b><div class="muted">Pour retrouver vos projets et leur contenu sur le PC, la tablette et le téléphone.</div></div><a class="btn pri" href="#/compte">Se connecter</a></div>` : ''}
      ${!ag && !LS.get('ts-agence-plus-tard', false) ? `<div class="card note"><div><b>Première connexion : renseignez le profil de votre agence</b><div class="muted">Nom, adresse, logo, architectes : en tête des comptes-rendus, des PV et des documents. Une fois pour toute l'agence.</div></div><div class="row"><button class="btn" id="agLater">Plus tard</button><a class="btn pri" href="#/agence">Renseigner</a></div></div>` : ''}
      <div class="choices">
        <a class="choice" href="#/projets"><span class="ci">${HOUSE(false)}</span><span class="ct">Travailler sur un projet</span><span class="cd">${act.length ? act.length + ' projet(s) en cours' : 'Aucun projet en cours'}</span></a>
        <button class="choice" id="newP3"><span class="ci">${HOUSE(true)}</span><span class="ct">Créer un projet</span><span class="cd">Code, nom, phase : le reste se complète au fil des phases</span></button>
      </div>
      ${quick.length ? `<div class="cap" style="margin:22px 0 8px">${rec.length ? 'Ouverts récemment' : 'Projets en cours'}</div><div class="grid">${quick.map(p => `<a class="card pcard" href="#/p/${p.id}" style="min-height:0"><span class="h"><span class="dot" style="background:${(tabOf(PH2TAB[p.phase]) || TABS[0]).c}"></span>${E(p.code || '—')}<span class="hint" style="margin-left:auto">${E(p.phase || '')}</span></span><span class="d" style="color:var(--ink);font-size:14px">${E(p.nom || '')}</span></a>`).join('')}</div>` : ''}
      <div class="hlinks"><a href="#/agence">${ag ? "Compléter ou corriger le profil de l'agence" : "Profil de l'agence"}</a><a href="#/b">Bibliothèques</a><a href="#/compte">Compte et appareils</a></div>
    </div></div>`;
    document.getElementById('newP3').onclick = newProject;
    const later = document.getElementById('agLater'); if (later) later.onclick = () => { LS.set('ts-agence-plus-tard', true); drawAccueil(); };
    if (ag && ag.logoId && typeof BlobURL === 'function') BlobURL(ag.logoId).then(u => { const el = document.getElementById('agLogoH'); if (u && el) el.innerHTML = `<img src="${u}" alt="Logo de l'agence">`; });
  }

  /* ---------- profil de l'agence (fiche commune avec TerraContacts : en tête des CR, des PV et des documents) ---------- */
  async function drawAgence() {
    if (typeof Carnet === 'undefined') { $m().innerHTML = '<div class="body"><p class="empty">Profil indisponible.</p></div>'; return; }
    await Carnet.load();
    const pr = TSA.etat().profil;
    const ag = Carnet.agence() ? JSON.parse(JSON.stringify(Carnet.agence())) : { id: DB.uid(), agence: true, role: 'MOE', nom: (pr && pr.agence && pr.agence.nom) || '', adresse: '', cp: '', ville: '', tel: '', email: '', site: '', siret: '', ordre: '', notes: '', lots: [], logoId: '', personnes: [{ id: DB.uid(), civ: '', prenom: '', nom: '', fonction: 'Architecte', mobile: '', tel: '', email: (pr && pr.email) || '', principal: true }] };
    const isNew = !Carnet.agence();
    $m().innerHTML = `<div class="phead"><div class="t"><a class="btn icon back" href="#/" aria-label="Accueil">${ico('back')}</a><div style="flex:1"><div class="k">${isNew ? 'Première connexion' : 'Agence'}</div><h1>Profil de l'agence</h1><div class="w">En tête des comptes-rendus, des listes de réserves, des PV et des documents. L'architecte par défaut signe les CR et les photos. Commun à toute l'agence et à tous ses appareils.</div></div></div><div style="height:14px"></div></div>
      <div class="body"><div class="wrap" style="max-width:980px"><div class="card" id="agF" style="display:flex;flex-direction:column;gap:12px">${Carnet.formHTML(ag, { isAg: true })}</div>
      <div class="row" style="justify-content:flex-end;margin-top:12px"><a class="btn" href="#/">Annuler</a><button class="btn pri" id="agOk">Enregistrer</button></div></div></div>`;
    const form = document.getElementById('agF'); let collect = Carnet.bindForm(form, ag, { isAg: true });
    form.addEventListener('redraw', () => { form.innerHTML = Carnet.formHTML(ag, { isAg: true }); collect = Carnet.bindForm(form, ag, { isAg: true }); });
    document.getElementById('agOk').onclick = async () => { collect(); if (!ag.nom) return toast("Indiquez le nom de l'agence"); ag.personnes = ag.personnes.filter(p => p.nom || p.prenom || p.email); ag.agence = true; await Carnet.put(ag); toast('Profil de l’agence enregistré'); go('#/'); };
  }

  /* ---------- liste des projets ---------- */
  async function drawHome() {
    const q = norm(st.q), L = st.projets.filter(p => p.statut !== 'archive' && (!q || norm([p.code, p.nom, p.ville].join(' ')).includes(q)));
    const tabNom = p => { const t = tabOf(PH2TAB[p.phase]); return t ? t.nom : (p.phase || ''); };
    $m().innerHTML = `<div class="phead"><div class="t"><a class="btn icon back" href="#/" aria-label="Accueil">${ico('back')}</a><div style="flex:1"><div class="k">Travailler sur un projet</div><h1>Projets</h1><div class="w">${st.projets.length} projet(s) de l'agence</div></div><div class="acts"><button class="btn pri" id="newP2">${ico('plus')}Nouveau projet</button></div></div><div style="height:14px"></div></div>
      <div class="body"><div class="wrap">
        <div class="pl-mobile"><input class="inp" id="pq2" type="search" placeholder="Chercher un projet" value="${E(st.q)}" aria-label="Chercher un projet" style="margin-bottom:12px">
          ${L.map(p => `<a class="mitem" href="#/p/${p.id}"><span><b>${E(p.code || '—')}</b><span class="nm">${E(p.nom || '')}${p.ville ? ' · ' + E(p.ville) : ''}</span></span><span class="ph">${E(tabNom(p) || '—')}</span></a>`).join('') || '<p class="empty">Aucun projet. Créez-en un avec « Nouveau projet ».</p>'}</div>
        <div class="pl-desk grid">${L.map(p => `<a class="card pcard" href="#/p/${p.id}"><span class="h"><span class="dot" style="background:${(tabOf(PH2TAB[p.phase]) || TABS[0]).c}"></span>${E(p.code || '—')}</span><span class="v">${E(p.nom || 'Projet sans nom')}</span><span class="d">${E([p.ville, tabNom(p), (TSP.STATUTS.find(s => s[0] === p.statut) || [, ''])[1]].filter(Boolean).join(' · '))}</span></a>`).join('') || '<p class="empty">Aucun projet. Créez-en un avec « Nouveau projet ».</p>'}</div>
      </div></div>`;
    document.getElementById('newP2').onclick = newProject;
    const q2 = document.getElementById('pq2'); if (q2) q2.oninput = () => { st.q = q2.value; const pos = q2.selectionStart; drawHome().then(() => { const n = document.getElementById('pq2'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } }); };
  }

  /* ---------- projet ---------- */
  async function drawProject(id, tabId, subId) {
    const p = st.projets.find(x => x.id === id) || await TSP.get(id);
    if (!p) { $m().innerHTML = `<div class="body"><p class="empty">Projet introuvable sur cet appareil. Il apparaîtra après la synchronisation s'il a été créé ailleurs.</p><a class="btn" href="#/">Projets</a></div>`; return; }
    LS.set('ts-last-projet', p.id); LS.set('ts-recents', [p.id, ...(LS.get('ts-recents', []) || []).filter(x => x !== p.id)].slice(0, 8));
    const curTab = PH2TAB[p.phase] || '', curIdx = PHASE_ORDER.indexOf(curTab);
    if (!tabId) { const last = LS.get('ts-tab-' + p.id, null); tabId = last || 'apercu'; }
    const tab = tabOf(tabId) || TABS[0], sub = tab.subs.find(s => s[0] === subId) || tab.subs[0];
    LS.set('ts-tab-' + p.id, tab.id);
    const statut = (TSP.STATUTS.find(s => s[0] === p.statut) || [, ''])[1];
    const tabsH = TABS.map(t => { const i = PHASE_ORDER.indexOf(t.id), b = i < 0 || curIdx < 0 ? '' : i < curIdx ? '<span class="badge done" title="Phase faite">✓</span>' : i === curIdx ? '<span class="badge cur">en cours</span>' : '';
      return `<a class="tab${t.id === tab.id ? ' on' : ''}${t.tr ? ' tr' : ''}" href="#/p/${p.id}/${t.id}" style="--c:${t.c}"><span class="dot" style="background:${t.c}"></span>${E(t.nom)}${b}</a>`; }).join('');
    const subsH = tab.subs.length > 1 ? `<nav class="subs" aria-label="Sous-onglets">${tab.subs.map(s => `<a class="sub${s[0] === sub[0] ? ' on' : ''}" href="#/p/${p.id}/${tab.id}/${s[0]}" style="${s[0] === sub[0] ? `background:${tab.c};border-color:${tab.c}` : ''}">${E(s[1])}${s[2] === 'soon' ? '<span class="soon">à venir</span>' : ''}</a>`).join('')}</nav>` : '<div style="height:10px"></div>';
    const url = sub[2] === 'frame' ? sub[3](p) : '';
    $m().innerHTML = `<div class="phead"><div class="t"><a class="btn icon back" href="#/" aria-label="Projets">${ico('back')}</a><div style="flex:1;min-width:0"><div class="k">Projet${statut ? ' · ' + E(statut) : ''}${p.phase ? ' · phase ' + E(p.phase) : ''}</div><h1>${E(p.code || '—')} · ${E(p.nom || 'Projet sans nom')}</h1><div class="w">${E([p.adresse, [p.cp, p.ville].filter(Boolean).join(' ')].filter(Boolean).join(', ') || 'Adresse à renseigner dans la fiche')}</div></div>
        <div class="acts"><a class="btn sm desk${tab.id === 'planning' ? ' on' : ''}" href="#/p/${p.id}/planning" style="--c:#2f6fb5"><span class="dot" style="background:#2f6fb5"></span>Planning</a><a class="btn sm desk${tab.id === 'projet' ? ' on' : ''}" href="#/p/${p.id}/projet" style="--c:#9a3b6b"><span class="dot" style="background:#9a3b6b"></span>Fiche et intervenants</a>${url ? `<a class="btn sm wide" href="${E(url)}" target="_blank" rel="noopener" title="Ouvrir dans un nouvel onglet">${ico('ext')}Plein écran</a><button class="btn sm" id="reF" title="Recharger le module" aria-label="Recharger le module">${ico('reload')}</button>` : ''}<a class="btn sm" href="#/p/${p.id}/chantier/chantier" style="color:#7a4fb0">${ico('cam')}<span class="wide">Visite de chantier</span></a></div></div>
      <nav class="tabs" aria-label="Phases du projet">${tabsH}</nav>${subsH}</div><div class="body" id="pbody"></div>`;
    const sel = document.querySelector('.tab.on'); if (sel) sel.scrollIntoView({ block: 'nearest', inline: 'center' });
    const body = document.getElementById('pbody');
    st.imm = IMMERSIVE.has(sub[0]); setImm(false);
    if (sub[2] === 'frame') { body.className = 'body frame'; mountFrame(body, url, sub[4]); const rf = document.getElementById('reF'); if (rf) rf.onclick = () => { st.frames.delete(url); mountFrame(body, url, sub[4], true); }; return; }
    if (sub[2] === 'soon') { const s = SOON[sub[0]] || [sub[1], '']; body.innerHTML = `<div class="card soonbox"><div class="hint">Prévu dans une prochaine version</div><h2 style="margin-top:4px">${E(s[0])}</h2><p class="muted">${E(s[1])}</p></div>`; return; }
    if (typeof TSMod !== 'undefined' && TSMod.MODS[sub[0]]) return TSMod.MODS[sub[0]](p, body);
    if (sub[0] === 'apercu') return drawOverview(p, body, curTab);
    if (sub[0] === 'fiche') return drawFiche(p, body);
    if (sub[0] === 'auto') return drawAuto(p, body);
  }

  /* mode plein écran sur téléphone et tablette (petit écran ou écran tactile, en portrait comme en paysage) : pendant l'édition dans un module (maquette 3D), l'en-tête du projet,
     les onglets et la barre du bas se masquent ; le bouton ☰ du module les fait revenir */
  const IMMERSIVE = new Set(['m3d']), SMALL = matchMedia('(max-width: 899px), (max-height: 560px), (pointer: coarse), (hover: none)');
  function setImm(on) {
    on = !!on; const ts = document.getElementById('ts'); if (!ts || ts.classList.contains('immersive') === on) return;
    ts.classList.toggle('immersive', on);
    for (const f of st.frames.values()) try { f.contentWindow.postMessage({ ts: 'immersive', on }, '*'); } catch (e) {}
  }
  addEventListener('message', e => {
    const d = e.data; if (!d || typeof d !== 'object') return;
    if (d.ts === 'edit' && st.imm && SMALL.matches) setImm(true);
    else if (d.ts === 'menus') setImm(false);
  });
  addEventListener('hashchange', () => setImm(false));
  /* adresse du module marquée de la version de la suite : après une mise à jour, le module est rechargé et non repris d'un cache */
  const withV = u => u.replace(/^([^#?]*)(\?[^#]*)?/, (m, a, q) => a + (q ? q + '&' : '?') + 'v=' + TS_VERSION);
  /* modules ouverts dans un cadre ; les derniers ouverts restent chargés (retour instantané) */
  function mountFrame(body, url, click, fresh) {
    let f = st.frames.get(url);
    if (!f || fresh) {
      f = document.createElement('iframe'); f.src = withV(url); f.title = 'Module TerraSuite'; f.setAttribute('allow', 'camera; microphone; geolocation; clipboard-write; fullscreen');
      if (click) f.addEventListener('load', () => { let n = 0; const t = setInterval(() => { try { const b = f.contentDocument && f.contentDocument.querySelector(click); if (b) { b.click(); clearInterval(t); } } catch (e) { clearInterval(t); } if (++n > 40) clearInterval(t); }, 250); }, { once: true });
      st.frames.set(url, f);
      while (st.frames.size > 4) { const k = st.frames.keys().next().value; st.frames.get(k).remove(); st.frames.delete(k); }
    } else { st.frames.delete(url); st.frames.set(url, f); }
    body.appendChild(f);
  }

  /* résumé de la maquette 3D : surfaces horizontales (planchers, toitures), verticales (façades), volume */
  const NFm = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
  function modTxt(m) {
    const s = m && m.surf; if (!s || !s.total) return '';
    const N = Array.isArray(s.niveaux) ? s.niveaux.filter(x => x && +x.surface > 0) : [], sdp = N.reduce((a, x) => a + +x.surface, 0);
    return 'Maquette 3D : ' + [sdp ? NFm.format(sdp) + ' m² de plancher (' + N.length + ' niveau' + (N.length > 1 ? 'x' : '') + ')' : '', s.horizontales ? NFm.format(s.horizontales) + ' m² horizontaux' : '', s.verticales ? NFm.format(s.verticales) + ' m² de façades' : '', s.volume ? NFm.format(s.volume) + ' m³' : ''].filter(Boolean).join(', ');
  }
  /* ---------- vue d'ensemble ---------- */
  async function drawOverview(p, body, curTab) {
    body.innerHTML = '<div class="hint">Lecture des données du projet…</div>';
    const D = await projectData(p);
    const auto = Array.isArray(p.autorisations) ? p.autorisations : [];
    const lastAuto = auto.slice().sort((a, b) => String(b.depot || '').localeCompare(String(a.depot || '')))[0];
    const resO = D.res.filter(r => !r.deleted && r.statut !== 'levee' && !r.levee).length, resL = D.res.length - resO;
    const n = (x, s, pl) => x ? `${x} ${x > 1 ? pl : s}` : '';
    const C = {
      esq: [D.geo.size ? n(D.geo.size, 'étude de site', 'études de site') : 'Site à étudier', modTxt(D.mod) || 'site, maquette 3D, estimation sommaire', 'site'],
      avp: [lastAuto ? `${lastAuto.type || 'Dossier'} : ${lastAuto.etat || '—'}` : (D.est.size ? n(D.est.size, 'estimation', 'estimations') : 'Plans, estimation, PC'), 'plans, estimation, PC, DP et modificatifs', lastAuto ? 'auto' : 'estimA'],
      pro: [D.est.size ? n(D.est.size, 'estimation', 'estimations') : 'Estimation à faire', [n(D.prods.size, 'produit prescrit', 'produits prescrits'), 'CCTP, DCE'].filter(Boolean).join(' · '), 'estim'],
      act: [D.src.size ? n(D.src.size, 'offre reçue', 'offres reçues') : 'Aucune offre', 'DPGF des entreprises, marchés', 'offres'],
      chantier: [D.vis.length ? n(D.vis.length, 'visite', 'visites') : (D.chs.length ? 'Chantier ouvert' : 'Pas de chantier'), D.vis[0] ? 'dernière : ' + (fmtD(D.vis[0].date || D.vis[0].updatedAt) || '') : 'visites, CR, photos sur plans', 'chantier'],
      opr: [D.res.length ? `${resO} ouverte(s), ${resL} levée(s)` : 'Aucune réserve', 'réserves localisées sur les plans', 'opr'],
      recep: [D.recep ? 'Réception le ' + fmtD(D.recep.date) : (D.pvs.length ? D.pvs.length + ' PV' : 'Pas encore'), 'PV de réception, levée des réserves, DOE', 'pv'],
      gpa: [D.gpaO ? D.gpaO + ' désordre(s) en cours' : (D.recep ? 'Aucun désordre en cours' : 'Après la réception'), 'désordres, fin de garantie', D.gpaO ? 'gpa' : 'fingpa'],
      planning: [D.plan.size ? n(D.plan.size, 'planning', 'plannings') : 'Pas de planning', 'études et travaux', 'planning'],
      projet: [n((p.intervenants || []).length, 'intervenant', 'intervenants') || 'Intervenants à saisir', [p.moa, n((p.lots || []).length, 'lot du marché', 'lots du marché')].filter(Boolean).join(' · ') || 'MOA, lots, entreprises', 'fiche']
    };
    const LBL = { 'geo|fiches': 'Étude de site', 'planning|plannings': 'Planning', 'estim|estimations': 'Estimation', 'estim|sources': 'Offre (DPGF)', 'estim|articles': 'Article de CCTP', 'docs|produits': 'Produit', 'terramodel|maquettes': 'Maquette 3D' };
    const act = [...D.recent.map(d => ({ t: d.updatedAt, s: (LBL[d.app + '|' + d.coll] || 'Donnée') + ' : ' + (d.data && (d.data.title || d.data.nom || (d.data.project && d.data.project.name) || d.data.titre) || ''), c: (tabOf(d.app === 'geo' || d.app === 'terramodel' ? 'esq' : d.app === 'planning' ? 'planning' : d.coll === 'sources' ? 'act' : 'pro') || TABS[0]).c })),
      ...D.vis.slice(0, 5).map(v => ({ t: v.date || v.updatedAt, s: `Visite de chantier${v.num ? ' n° ' + v.num : ''}`, c: '#7a4fb0' }))].sort((a, b) => String(b.t).localeCompare(String(a.t))).slice(0, 8);
    body.innerHTML = `<div class="wrap">
      <div class="grid">${TABS.filter(t => t.id !== 'apercu').map(t => { const c = C[t.id]; const i = PHASE_ORDER.indexOf(t.id), ci = PHASE_ORDER.indexOf(curTab);
        const etat = i < 0 ? '' : ci < 0 ? '' : i < ci ? 'fait' : i === ci ? 'en cours' : '';
        return `<a class="card pcard" href="#/p/${p.id}/${t.id}/${c[2]}"><span class="h"><span class="dot" style="background:${t.c}"></span>${E(t.nom)}${etat ? `<span class="badge${etat === 'en cours' ? ' cur' : ''}" style="margin-left:auto">${etat}</span>` : ''}</span><span class="v">${E(c[0])}</span><span class="d">${E(c[1])}</span></a>`; }).join('')}</div>
      <div class="grid3" style="margin-top:14px">
        <div class="card"><h2>Activité récente</h2>${act.length ? `<div class="list">${act.map(a => `<div class="li"><span class="dot" style="background:${a.c};margin-top:7px"></span><div><div>${E(a.s)}</div><div class="m">${E(fmtD(a.t) || '')}</div></div></div>`).join('')}</div>` : '<p class="empty">Rien encore sur cet appareil.</p>'}</div>
        <div class="card"><h2>Projet</h2><div class="list">
          <div class="li"><div><div class="m">Maître d'ouvrage</div>${E(p.moa || '—')}</div></div>
          <div class="li"><div><div class="m">Type, nature des travaux</div>${E([p.typeOuvrage, p.nature].filter(Boolean).join(' · ') || '—')}</div></div>
          <div class="li"><div><div class="m">Surface</div>${E(p.surface ? p.surface + ' m²' : '—')}</div></div>
          <div class="li"><div><div class="m">Indice de prix du lieu</div>${(() => { const l = TSP.loc(p); return E(String(l.coef).replace('.', ',') + (l.nom ? ' (' + l.nom + ')' : '')); })()}</div></div>
        </div><a class="btn sm" href="#/p/${p.id}/projet/fiche" style="margin-top:10px">Compléter la fiche</a></div>
      </div></div>`;
  }

  /* ---------- fiche du projet ---------- */
  function drawFiche(p, body) {
    const o = (L, v) => L.map(x => { const [k, n] = Array.isArray(x) ? x : [x, x]; return `<option value="${E(k)}"${k === v ? ' selected' : ''}>${E(n)}</option>`; }).join('');
    const fld = (k, lab, type = 'text', extra = '') => `<label class="f">${lab}<input id="f_${k}" type="${type}" value="${E(p[k] ?? '')}" ${extra}></label>`;
    body.innerHTML = `<div class="wrap" style="max-width:980px"><div class="card"><div class="grid2">
        ${fld('code', 'Code')}${fld('nom', 'Nom du projet')}
        <label class="f">Statut<select id="f_statut">${o(TSP.STATUTS, p.statut)}</select></label>
        <label class="f">Phase en cours<select id="f_phase"><option value=""></option>${o(TSP.PHASES, p.phase)}</select></label>
        <label class="f">Type d'ouvrage<select id="f_typeOuvrage"><option value=""></option>${o(TSP.TYPES, p.typeOuvrage)}</select></label>
        <label class="f">Nature des travaux<select id="f_nature"><option value=""></option>${o(TSP.NATURES, p.nature)}</select></label>
        ${fld('adresse', 'Adresse')}${fld('cp', 'Code postal', 'text', 'inputmode="numeric"')}${fld('ville', 'Commune')}${fld('parcelles', 'Parcelles')}
        ${fld('moa', "Maître d'ouvrage")}${fld('surface', 'Surface (m²)', 'text', 'inputmode="decimal"')}
        <label class="f">Indice de prix du lieu<input id="f_coefLoc" type="text" inputmode="decimal" value="${E(p.coefLoc ?? '')}" placeholder="${E(String(TSP.loc({ ...p, coefLoc: '' }).coef).replace('.', ','))} (département)"></label>
      </div><label class="f" style="margin-top:12px">Notes<textarea id="f_notes">${E(p.notes || '')}</textarea></label>
      <div class="row" style="margin-top:14px;justify-content:space-between"><span class="hint" id="fSt">Enregistrement automatique</span><a class="btn sm" href="#/p/${p.id}/projet/inter">Intervenants, lots du marché</a></div></div></div>`;
    let t = null; const todo = new Set();
    const flush = async () => { if (!todo.size) return; const keys = [...todo]; todo.clear();
      const cur = await TSP.get(p.id) || p;
      for (const k of keys) { const el = document.getElementById('f_' + k); if (!el) continue; let v = el.value; if (k === 'coefLoc') v = v.trim() === '' ? '' : String(v).replace(',', '.'); cur[k] = v; }
      await TSP.put(cur); Object.assign(p, cur);
      const s = document.getElementById('fSt'); if (s) s.textContent = 'Enregistré'; if (keys.some(k => ['code', 'nom', 'phase', 'statut', 'ville'].includes(k))) { await loadProjets(); drawSide(); } };
    body.querySelectorAll('input,select,textarea').forEach(el => { el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => { todo.add(el.id.slice(2)); clearTimeout(t); t = setTimeout(flush, 500); }); el.addEventListener('blur', () => { clearTimeout(t); flush(); }); });
  }

  /* ---------- autorisations d'urbanisme (PC initial, modificatifs, DP, DAACT…), rangées avec le projet ---------- */
  const A_TYPES = ['Permis de construire', 'Permis de construire modificatif', 'Déclaration préalable', "Permis d'aménager", 'Permis de démolir', 'Transfert de permis', "Déclaration d'ouverture de chantier", "Déclaration d'achèvement (DAACT)", 'Autre'];
  const A_ETATS = [['À préparer', '#f1eee9', '#3c4043'], ['Déposé', '#e7eef8', '#1f4f8a'], ['En instruction', '#fdf0d5', '#7a4d00'], ['Pièces demandées', '#fde2d0', '#8f3f22'], ['Accordé', '#e3f1e8', '#1e6b41'], ['Accordé tacitement', '#e3f1e8', '#1e6b41'], ['Refusé', '#fbe0e0', '#8a1c1c'], ['Retiré', '#eceff1', '#3c4043'], ['Purgé de recours', '#e3f1e8', '#1e6b41']];
  function drawAuto(p, body) {
    const A = Array.isArray(p.autorisations) ? p.autorisations : [];
    const opt = (L, v) => L.map(x => `<option${x === v ? ' selected' : ''}>${E(x)}</option>`).join('');
    const etat = e => { const x = A_ETATS.find(a => a[0] === e); return x ? `background:${x[1]};color:${x[2]}` : ''; };
    body.innerHTML = `<div class="wrap"><div class="card">
      <div class="row" style="justify-content:space-between;margin-bottom:8px"><div><h2 style="margin:0">Autorisations d'urbanisme</h2><div class="hint">Tout l'historique du projet : PC initial, PC modificatifs (y compris pendant le chantier), DP, transfert, ouverture et achèvement de chantier.</div></div><button class="btn pri" id="aAdd">${ico('plus')}Dossier</button></div>
      <div class="tscroll"><table class="t"><thead><tr><th style="min-width:220px">Dossier</th><th style="min-width:150px">N°</th><th>Dépôt</th><th>Décision</th><th style="min-width:170px">État</th><th style="min-width:200px">Notes</th><th></th></tr></thead><tbody>
      ${A.map((a, i) => `<tr data-i="${i}"><td><select data-k="type" aria-label="Type de dossier">${opt(A_TYPES, a.type)}</select></td><td><input data-k="num" value="${E(a.num || '')}" placeholder="PC 075 120 26 V0001" aria-label="Numéro"></td><td><input data-k="depot" type="date" value="${E(a.depot || '')}" aria-label="Date de dépôt"></td><td><input data-k="decision" type="date" value="${E(a.decision || '')}" aria-label="Date de décision"></td><td><select data-k="etat" aria-label="État" style="${etat(a.etat)};font-weight:700">${opt(A_ETATS.map(x => x[0]), a.etat)}</select></td><td><input data-k="notes" value="${E(a.notes || '')}" aria-label="Notes"></td><td><button class="btn sm danger" data-del="${i}" aria-label="Supprimer">✕</button></td></tr>`).join('') || '<tr><td colspan="7" class="empty" style="padding:14px 10px">Aucun dossier. « Dossier » ajoute un PC, un modificatif, une DP…</td></tr>'}
      </tbody></table></div>
      <p class="hint" style="margin:10px 0 0">Délais d'instruction de droit commun : DP 1 mois, PC maison individuelle 2 mois, autres PC et PA 3 mois (majorations possibles : ABF, ERP, consultations). Recours des tiers : 2 mois à compter de l'affichage sur le terrain.</p>
    </div></div>`;
    const save = async () => { const cur = await TSP.get(p.id) || p; cur.autorisations = A; await TSP.put(cur); Object.assign(p, cur); };
    document.getElementById('aAdd').onclick = async () => { A.push({ id: TSP.uid(), type: A.some(a => a.type === 'Permis de construire') ? 'Permis de construire modificatif' : 'Permis de construire', num: '', depot: '', decision: '', etat: 'À préparer', notes: '' }); await save(); drawAuto(p, body); };
    body.querySelectorAll('[data-k]').forEach(el => el.addEventListener('change', async () => { const i = +el.closest('tr').dataset.i; A[i][el.dataset.k] = el.value; await save(); if (el.dataset.k === 'etat') drawAuto(p, body); }));
    body.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { if (!confirm('Supprimer ce dossier ?')) return; A.splice(+b.dataset.del, 1); await save(); drawAuto(p, body); });
  }

  /* ---------- bibliothèques ---------- */
  function drawLib(id) {
    const small = matchMedia('(max-width:899px)').matches;
    if (!id && small) {
      $m().innerHTML = `<div class="phead"><div class="t"><div><div class="k">Commun à tous les projets</div><h1>Bibliothèques</h1></div></div><div style="height:14px"></div></div><div class="body"><div class="wrap">${LIBS.map(b => `<a class="mitem" href="#/b/${b.id}"><span style="display:flex;gap:12px;align-items:center"><span class="dot" style="background:${b.c};width:10px;height:10px"></span><b style="font-size:16px">${E(b.nom)}</b></span><span class="nm">${E(st.counts[b.id] ?? '')}</span></a>`).join('')}</div></div>`;
      return;
    }
    const b = LIBS.find(x => x.id === id) || LIBS[0];
    $m().innerHTML = `<div class="phead"><div class="t"><a class="btn icon back" href="#/b" aria-label="Bibliothèques">${ico('back')}</a><div style="flex:1"><div class="k">Bibliothèque de l'agence · commune à tous les projets</div><h1>${E(b.nom)}</h1></div><div class="acts"><a class="btn sm wide" href="${E(b.url)}" target="_blank" rel="noopener">${ico('ext')}Plein écran</a></div></div><div style="height:12px"></div></div><div class="body frame" id="lbody"></div>`;
    mountFrame(document.getElementById('lbody'), b.url + (b.click ? '' : ''), b.click);
  }

  /* ---------- compte, synchronisation, installation ---------- */
  function drawCompte() {
    $m().innerHTML = `<div class="phead"><div class="t"><div><div class="k">TerraSuite ${TS_VERSION} bêta</div><h1>Compte et appareils</h1></div></div><div style="height:14px"></div></div>
      <div class="body"><div class="wrap" style="max-width:860px;display:flex;flex-direction:column;gap:14px">
        <div class="card note"><div><b>Profil de l'agence</b><div class="muted">Nom, adresse, logo, architectes : en tête des CR, des PV et des documents.</div></div><a class="btn" href="#/agence">Compléter ou corriger</a></div>
        <div id="tsaBox"></div>
        <div class="card"><h2>Synchronisation</h2><p class="muted" style="margin:0 0 10px" id="syMsg"></p><div class="row"><button class="btn pri" id="syNow">Synchroniser maintenant</button></div>
          <p class="hint" style="margin:10px 0 0">Projets, estimations, DPGF, CCTP, plannings, études de site, produits, contacts, chantiers et photos sont enregistrés sur cet appareil et sur le serveur de l'agence. Hors réseau, tout reste utilisable ; l'envoi reprend au retour du réseau.</p></div>
        <div class="card"><h2>Installer TerraSuite sur cet appareil</h2><p class="muted" style="margin:0 0 10px">Une seule application pour le PC, la tablette et le téléphone, à la même adresse : ${E(location.origin + location.pathname)}</p>
          <div class="row">${st.installEvt ? '<button class="btn pri" id="inst">Installer</button>' : ''}<span class="hint">${st.installEvt ? '' : "Sur téléphone : menu du navigateur › « Ajouter à l'écran d'accueil ». Sur PC (Chrome, Edge) : icône d'installation dans la barre d'adresse."}</span></div></div>
      </div></div>`;
    try { TSA.panel(document.getElementById('tsaBox')); } catch (e) { document.getElementById('tsaBox').innerHTML = '<div class="card">Compte indisponible : ' + E(e.message) + '</div>'; }
    const m = () => { const s = Sync.state(); const el = document.getElementById('syMsg'); if (el) el.textContent = s.msg; }; m();
    document.getElementById('syNow').onclick = async () => { await Sync.run(); m(); paintSync(); };
    const ib = document.getElementById('inst'); if (ib) ib.onclick = async () => { st.installEvt.prompt(); await st.installEvt.userChoice; st.installEvt = null; drawCompte(); };
  }

  /* ---------- nouveau projet ---------- */
  function newProject() {
    const sh = sheet('Nouveau projet', `<div class="grid2"><label class="f">Code<input id="npC" placeholder="ex. CTN" autocomplete="off"></label><label class="f">Nom du projet<input id="npN" autocomplete="off"></label>
      <label class="f">Phase<select id="npP">${TSP.PHASES.map(x => `<option${x === 'ESQ' ? ' selected' : ''}>${E(x)}</option>`).join('')}</select></label><label class="f">Commune<input id="npV" autocomplete="off"></label></div>`,
      `<button class="btn" data-close>Annuler</button><button class="btn pri" id="npOk">Créer</button>`);
    setTimeout(() => sh.el.querySelector('#npC').focus(), 50);
    sh.el.querySelector('#npOk').onclick = async () => {
      const code = sh.el.querySelector('#npC').value.trim(), nom = sh.el.querySelector('#npN').value.trim(); if (!code && !nom) return toast('Donnez au moins un code ou un nom');
      const p = await TSP.create({ code, nom, phase: sh.el.querySelector('#npP').value, ville: sh.el.querySelector('#npV').value.trim() });
      sh.close(); await loadProjets(); go('#/p/' + p.id + '/projet/fiche');
    };
  }

  /* ---------- aiguillage ---------- */
  async function loadProjets() { try { st.projets = await TSP.all(); } catch (e) { st.projets = []; } }
  async function counts() {
    try {
      const td = LS.get('terradocs.v1', null); st.counts.catalogue = td && td.produits ? td.produits.length : '';
      const pr = await idbGet('terraestim', 'kv', 'te-prestations'); st.counts.prix = pr ? Object.keys(pr).length : '';
      const ar = await idbGet('terraestim', 'kv', 'te-articles'); st.counts.cctp = ar ? Object.values(ar).filter(a => a && !a.recueil).length || '' : '';
      st.counts.contacts = (await DB.all('contacts')).length || '';
    } catch (e) {}
  }
  function draw() {
    const r = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent); st.route = r;
    document.title = 'TerraSuite';
    if (r[0] === 'photo') { const last = LS.get('ts-last-projet', null); if (last && st.projets.some(p => p.id === last)) return go(`#/p/${last}/chantier/chantier`); toast('Ouvrez un projet, puis « Visite de chantier »'); return go('#/'); }
    drawSide(); drawBottom();
    if (r[0] === 'p' && r[1]) return drawProject(r[1], r[2], r[3]);
    if (r[0] === 'b') return drawLib(r[1]);
    if (r[0] === 'compte') return drawCompte();
    if (r[0] === 'agence') return drawAgence();
    if (r[0] === 'projets') return drawHome();
    return drawAccueil();
  }

  async function start() {
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      const had = !!navigator.serviceWorker.controller; let done = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => { if (had && !done) { done = true; location.reload(); } });
      navigator.serviceWorker.register('sw.js').then(r => r.update()).catch(e => console.warn('SW', e));
    }
    addEventListener('beforeinstallprompt', e => { e.preventDefault(); st.installEvt = e; if (st.route[0] === 'compte') drawCompte(); });
    await loadProjets(); await counts(); try { if (typeof Carnet !== 'undefined') await Carnet.load(); } catch (e) {}
    addEventListener('hashchange', draw);
    draw();
    const reHome = () => { if (!st.route[0]) drawAccueil(); else if (st.route[0] === 'projets') drawHome(); };
    TSP.onChange(async () => { await loadProjets(); drawSide(); reHome(); });
    try { TSA.onChange(() => { paintSync(); reHome(); }); } catch (e) {}
    if (typeof Sync !== 'undefined') {
      Sync.onReceive(async got => { paintSync(); if (!got) return; cacheEst = null; if (typeof Carnet !== 'undefined') await Carnet.load(true); await loadProjets(); await counts(); drawSide(); const r = st.route; if (!r[0]) drawAccueil(); else if (r[0] === 'projets') drawHome(); else if (r[0] === 'p' && (!r[2] || r[2] === 'apercu')) drawProject(r[1], r[2], r[3]); });
      Sync.start(); setInterval(paintSync, 3000);
    }
  }
  return { start, draw, TABS, LIBS };
})();
TSApp.start();
