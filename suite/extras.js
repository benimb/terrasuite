/* TerraSuite : recherche globale, « Ma semaine » sur tous les projets, prise en main avec projet exemple, partage de l'état d'un projet.
   Lit les bases de l'appareil (base TerraSuite « terrachantier », base TerraEstim, stockage de TerraSourcing) ; n'écrit que pour le projet exemple. */
const TSX = (() => {
  const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const iso = d => { const x = new Date(d); return new Date(x - x.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
  const today = () => iso(Date.now());
  const addD = (d, n) => iso(new Date(d + 'T12:00').getTime() + n * 864e5);
  const dFr = d => d ? new Date(String(d).length === 10 ? d + 'T12:00' : d).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }) : '';
  const NF = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
  const num = v => { const n = parseFloat(String(v ?? '').replace(/\s/g, '').replace(',', '.')); return isFinite(n) ? n : 0; };
  const LSget = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } };

  /* ---------- lecture des données ---------- */
  function idbKV(dbName, key) { return new Promise(ok => { try { const r = indexedDB.open(dbName); r.onupgradeneeded = () => { try { r.transaction.abort(); } catch (e) {} ok(null); }; r.onsuccess = () => { const d = r.result; if (!d.objectStoreNames.contains('kv')) { d.close(); return ok(null); } const q = d.transaction('kv').objectStore('kv').get(key); q.onsuccess = () => { ok(q.result || null); d.close(); }; q.onerror = () => { ok(null); d.close(); }; }; r.onerror = () => ok(null); } catch (e) { ok(null); } }); }
  const scripts = {};
  const loadScript = src => scripts[src] || (scripts[src] = new Promise(ok => { const s = document.createElement('script'); s.src = src; s.onload = () => ok(true); s.onerror = () => ok(false); document.head.appendChild(s); }));
  async function all(store, ch) { try { return await DB.all(store, ch); } catch (e) { return []; } }
  async function chantierData() {
    const chs = await all('chantiers'), vis = [], res = [];
    for (const c of chs) { (await all('visites', c.id)).forEach(v => vis.push({ ...v, _ch: c })); (await all('reserves', c.id)).forEach(r => res.push({ ...r, _ch: c })); }
    return { chs, vis, res };
  }
  const suiteDocs = async () => (await all('docs')).filter(d => d.app === 'suite' && d.data);

  /* ---------- recherche globale ---------- */
  async function search(ctx, q) {
    const main = ctx.main(); q = String(q || '').trim();
    main.innerHTML = `<div class="phead"><div class="t"><a class="btn icon back" href="#/" aria-label="Accueil">${ctx.ico('back')}</a><div style="flex:1"><div class="k">Toute l'agence</div><h1>Chercher</h1></div></div>
      <div class="gsearch"><input id="gq" class="inp" type="search" placeholder="Projet, contact, produit, article de CCTP, compte-rendu, réserve…" value="${E(q)}" aria-label="Chercher dans toute l'agence"></div><div style="height:12px"></div></div>
      <div class="body"><div class="wrap" id="gres">${q.length < 2 ? '<p class="empty">Tapez au moins deux lettres.</p>' : '<p class="hint">Recherche…</p>'}</div></div>`;
    const gi = document.getElementById('gq'); gi.focus(); gi.setSelectionRange(q.length, q.length);
    let tm; gi.oninput = () => { clearTimeout(tm); tm = setTimeout(() => history.replaceState(null, '', '#/cherche/' + encodeURIComponent(gi.value.trim())) || run(gi.value.trim()), 250); };
    const run = async qq => {
      const out = document.getElementById('gres'); if (!out) return;
      if (qq.length < 2) { out.innerHTML = '<p class="empty">Tapez au moins deux lettres.</p>'; return; }
      const T = norm(qq).split(/\s+/).filter(Boolean), hit = s => { const n = norm(s); return T.every(t => n.includes(t)); };
      const P = ctx.projets(), pl = id => P.find(p => p.id === id), pLab = p => p ? [p.code, p.nom].filter(Boolean).join(' · ') : '';
      const G = [];
      G.push(['Projets', P.filter(p => hit([p.code, p.nom, p.ville, p.adresse, p.moa, p.notes].join(' '))).map(p => ({ t: pLab(p), s: [p.ville, p.phase, p.moa].filter(Boolean).join(' · '), h: `#/p/${p.id}` }))]);
      const K = typeof Carnet !== 'undefined' && Carnet.all ? Carnet.all() : [];
      G.push(['Contacts', (K || []).filter(k => hit([k.nom, k.ville, k.email, k.tel, k.role, (k.personnes || []).map(x => [x.prenom, x.nom, x.fonction, x.email].join(' ')).join(' ')].join(' '))).map(k => ({ t: k.nom || 'Contact', s: [k.role, k.ville, (k.personnes || []).map(x => [x.prenom, x.nom].filter(Boolean).join(' ')).filter(Boolean).slice(0, 2).join(', ')].filter(Boolean).join(' · '), h: '#/b/contacts' }))]);
      const EI = []; P.forEach(p => { (p.lots || []).filter(l => l.ent && l.ent.nom).forEach(l => EI.push({ n: l.ent.nom, x: [l.ent.contact, l.ent.tel, l.ent.email].join(' '), s: `${[l.num, l.nom].filter(Boolean).join(' ')} · ${pLab(p)}`, h: `#/p/${p.id}/projet/fiche` })); (p.intervenants || []).forEach(i => EI.push({ n: i.nom || '', x: [i.contact, i.role, i.tel, i.email].join(' '), s: `${i.role || 'Intervenant'} · ${pLab(p)}`, h: `#/p/${p.id}/projet/fiche` })); });
      G.push(['Entreprises et intervenants des projets', EI.filter(e => hit(e.n + ' ' + e.x)).map(e => ({ t: e.n, s: e.s, h: e.h }))]);
      const { vis, res } = await chantierData();
      G.push(['Comptes-rendus', vis.filter(v => hit([v.prochaine, v.redacteur, (v.observations || []).map(o => [o.titre, o.texte, o.localisation].join(' ')).join(' ')].join(' '))).map(v => { const p = pl(v._ch.projetId); return { t: `CR n° ${v.numero || ''} du ${dFr(v.date)}`, s: pLab(p) || v._ch.nom, h: p ? `#/p/${p.id}/chantier/chantier` : '#/' }; })]);
      G.push(['Réserves', res.filter(r => hit([r.description, r.localisation, r.commentaire].join(' '))).map(r => { const p = pl(r._ch.projetId); return { t: `Réserve n° ${r.numero || ''} · ${r.description || ''}`, s: [pLab(p) || r._ch.nom, r.localisation, r.statut === 'levee' ? 'levée' : 'ouverte'].filter(Boolean).join(' · '), h: p ? `#/p/${p.id}/opr/opr` : '#/' }; })]);
      out.innerHTML = draw(G) + '<p class="hint" id="gmore">Produits et articles de CCTP…</p>';
      /* produits et articles : fichiers de données publiés, chargés à la première recherche */
      await Promise.all([loadScript('TerraDocs/TerraDocs-donnees.js'), loadScript('TerraEstim/TerraEstim-donnees.js')]);
      const prods = new Map(); ((window.TD_DONNEES && TD_DONNEES.produits) || []).forEach(x => prods.set(x.id, x)); ((LSget('terradocs.v1', {}) || {}).produits || []).forEach(x => prods.set(x.id, x));
      (await all('docs')).filter(d => d.app === 'docs' && d.coll === 'produits' && d.data && !d.deleted).forEach(d => prods.set(String(d.rid), d.data));
      G.push(['Produits', [...prods.values()].filter(x => hit([x.nom, x.fabricant, x.reference, x.motsCles, x.notes].join(' '))).map(x => ({ t: x.nom || 'Produit', s: [x.fabricant, x.reference].filter(Boolean).join(' · '), h: '#/b/catalogue/' + encodeURIComponent('p=' + x.id) }))]);
      const arts = { ...((window.TE_DONNEES && TE_DONNEES.articles) || {}), ...((await idbKV('terraestim', 'te-articles')) || {}) };
      G.push(['Articles de CCTP', Object.entries(arts).filter(([, a]) => a && !a.deleted && a.type !== 'chap' && hit([a.code, a.titre, a.texte].join(' '))).map(([, a]) => ({ t: [a.code, a.titre].filter(Boolean).join(' '), s: String(a.texte || '').slice(0, 120), h: '#/b/cctp' }))]);
      if (document.getElementById('gres') === out) out.innerHTML = draw(G);
    };
    const draw = G => { const n = G.reduce((a, [, L]) => a + L.length, 0);
      return (n ? '' : '<p class="empty">Aucun résultat.</p>') + G.filter(([, L]) => L.length).map(([g, L]) => `<section class="gres"><h2>${E(g)} <span class="hint">${L.length}</span></h2><div class="list">${L.slice(0, 8).map(x => `<a class="li gli" href="${E(x.h)}"><div><div>${E(x.t)}</div>${x.s ? `<div class="m">${E(x.s)}</div>` : ''}</div></a>`).join('')}${L.length > 8 ? `<div class="hint" style="padding:6px 0">… et ${L.length - 8} autre(s) : précisez la recherche.</div>` : ''}</div></section>`).join(''); };
    run(q);
  }

  /* ---------- Ma semaine : ce qui est en retard, à faire dans les 7 jours, en attente ---------- */
  async function weekItems(projets) {
    const t0 = today(), t7 = addD(t0, 7), P = projets.filter(p => p.statut !== 'archive' && p.statut !== 'termine'), pl = id => P.find(p => p.id === id);
    const pLab = p => [p.code, p.nom].filter(Boolean).join(' · '), I = [];
    const add = (o) => I.push(o);
    const { vis, res } = await chantierData();
    /* comptes-rendus : à diffuser, prochaine réunion */
    const lastBy = new Map(); vis.forEach(v => { const k = v._ch.id; if (!lastBy.has(k) || String(v.date) > String(lastBy.get(k).date)) lastBy.set(k, v); });
    for (const v of lastBy.values()) { const p = pl(v._ch.projetId); if (!p) continue;
      if (!v.diffuseLe && v.date && v.date >= addD(t0, -21)) add({ k: 'cr', d: v.date, late: true, t: `Diffuser le CR n° ${v.numero || ''} du ${dFr(v.date)}`, p, h: `#/p/${p.id}/chantier/chantier` });
      if (v.prochaine) add({ k: 'reu', d: '', t: `Prochaine réunion : ${v.prochaine}`, p, h: `#/p/${p.id}/chantier/chantier` }); }
    /* réserves à lever */
    const byP = new Map(); res.filter(r => r.statut !== 'levee' && r.echeance && r.echeance <= t7).forEach(r => { const p = pl(r._ch.projetId); if (!p) return; const a = byP.get(p.id) || { p, n: 0, late: 0, d: r.echeance }; a.n++; if (r.echeance < t0) a.late++; if (r.echeance < a.d) a.d = r.echeance; byP.set(p.id, a); });
    for (const a of byP.values()) add({ k: 'res', d: a.d, late: a.late > 0, t: `${a.n} réserve${a.n > 1 ? 's' : ''} à lever${a.late ? ` (${a.late} en retard)` : ' cette semaine'}`, p: a.p, h: `#/p/${a.p.id}/opr/opr` });
    /* écrans de la suite : OS à signer, situations à viser, désordres de GPA, fin de GPA */
    const D = await suiteDocs();
    for (const p of P) {
      const mine = D.filter(d => d.projetId === p.id && !d.deleted).map(d => ({ c: d.coll, ...d.data }));
      const os = mine.filter(x => x.c === 'os' && !x.signe); if (os.length) add({ k: 'os', d: '', t: `${os.length} ordre${os.length > 1 ? 's' : ''} de service à faire signer`, p, h: `#/p/${p.id}/chantier/os` });
      const si = mine.filter(x => x.c === 'situations' && !x.visa && (x.marche || x.cumul)); if (si.length) add({ k: 'sit', d: '', t: `${si.length} situation${si.length > 1 ? 's' : ''} à viser`, p, h: `#/p/${p.id}/chantier/situations` });
      const g = mine.filter(x => x.c === 'gpa' && x.etat !== 'Réglé'); if (g.length) add({ k: 'gpa', d: '', t: `${g.length} désordre${g.length > 1 ? 's' : ''} de GPA en cours`, p, h: `#/p/${p.id}/gpa/gpa` });
      const rec = mine.filter(x => x.c === 'pv' && /^Réception/.test(x.type || '') && x.date).sort((a, b) => String(a.date).localeCompare(String(b.date)))[0];
      if (rec) { const fin = addD(rec.date, 365); if (fin >= t0 && fin <= addD(t0, 30)) add({ k: 'gpa', d: fin, t: `Fin de la garantie de parfait achèvement le ${dFr(fin)}`, p, h: `#/p/${p.id}/gpa/fingpa` }); }
      (p.autorisations || []).filter(a => ['Déposé', 'En instruction', 'Pièces demandées'].includes(a.etat)).forEach(a => add({ k: 'urb', d: '', late: a.etat === 'Pièces demandées', t: `${a.type || 'Autorisation'}${a.num ? ' ' + a.num : ''} : ${a.etat.toLowerCase()}${a.depot ? ' depuis le ' + dFr(a.depot) : ''}`, p, h: `#/p/${p.id}/avp/auto` }));
    }
    /* appels d'offres suivis (TerraSourcing) : dates limites dans les 10 jours */
    const S = LSget('ts-suivi', {}) || {}, ACT = new Set(['etude', 'go', 'analyse', 'equipe', 'redaction']);
    Object.values(S).filter(o => o && ACT.has(o.statut) && o.dl && o.dl.slice(0, 10) >= t0 && o.dl.slice(0, 10) <= addD(t0, 10)).forEach(o => add({ k: 'ao', d: o.dl.slice(0, 10), t: `Remise des ${o.dlKind || 'offres'} : ${o.objet || 'appel d\'offres'}`, s: o.acheteur || '', h: '#/b/ao' }));
    const rank = x => (x.late ? 0 : 1) * 1e9 + (x.d ? Number(x.d.replace(/-/g, '')) : 99999999);
    return I.sort((a, b) => rank(a) - rank(b)).map(x => ({ ...x, pl: x.p ? pLab(x.p) : (x.s || '') }));
  }
  const KIND = { cr: ['CR', '#7a4fb0'], reu: ['Réunion', '#7a4fb0'], res: ['Réserves', '#c2410c'], os: ['OS', '#7a4fb0'], sit: ['Situations', '#7a4fb0'], gpa: ['GPA', '#6b7280'], urb: ['Urbanisme', '#a16207'], ao: ['AO', '#b45309'] };
  const itemsHTML = (I, max) => I.slice(0, max || 999).map(x => `<a class="li wk" href="${E(x.h)}"><span class="wtag" style="--c:${KIND[x.k][1]}">${KIND[x.k][0]}</span><div style="min-width:0"><div class="${x.late ? 'late' : ''}">${E(x.t)}</div><div class="m">${E([x.pl, x.d && x.k !== 'cr' ? dFr(x.d) : ''].filter(Boolean).join(' · '))}</div></div></a>`).join('');
  async function week(ctx) {
    const main = ctx.main();
    main.innerHTML = `<div class="phead"><div class="t"><a class="btn icon back" href="#/" aria-label="Accueil">${ctx.ico('back')}</a><div style="flex:1"><div class="k">Tous les projets en cours</div><h1>Ma semaine</h1><div class="w">En retard d'abord, puis les 7 prochains jours et ce qui attend une action.</div></div></div><div style="height:14px"></div></div>
      <div class="body"><div class="wrap" style="max-width:860px"><div class="card"><div class="list" id="wkL"><p class="hint">Lecture des projets…</p></div></div></div></div>`;
    const I = await weekItems(ctx.projets()); const el = document.getElementById('wkL'); if (!el) return;
    el.innerHTML = I.length ? itemsHTML(I) : '<p class="empty">Rien d\'urgent : pas de CR à diffuser, de réserve à échéance, d\'OS à signer ni d\'appel d\'offres à rendre cette semaine.</p>';
  }

  /* ---------- accueil : ma semaine en bref, prise en main ---------- */
  async function steps(projets) {
    const docs = await all('docs'), any = (app, coll) => docs.some(d => d.app === app && d.coll === coll && !d.deleted);
    const est = any('estim', 'estimations') || Object.keys((await idbKV('terraestim', 'te-estimations')) || {}).length > 0;
    const geo = any('geo', 'fiches') || (LSget('tg-fiches', []) || []).some(f => f.projet);
    const vis = (await all('visites')).length > 0;
    const ag = typeof Carnet !== 'undefined' && Carnet.agence && Carnet.agence();
    const p0 = projets.find(p => p.code !== 'EXEMPLE') || projets[0], ph = p0 ? `#/p/${p0.id}` : '';
    return [
      [!!ag, "Renseigner le profil de l'agence", 'Logo, adresse, architectes : en tête des CR et des PV.', '#/agence'],
      [projets.length > 0, 'Créer un projet', 'Code, nom, phase ; le reste se complète au fil des phases.', '#/projets'],
      [geo, 'Situer la parcelle', 'ESQ › Site : cadastre, PLU, servitudes, vue 3D.', ph ? ph + '/esq/site' : ''],
      [est, 'Faire une première estimation', 'ESQ ou AVP › Estimation, à partir de la base de prix.', ph ? ph + '/avp/estimA' : ''],
      [vis, 'Faire une visite de chantier', 'Chantier › Visites et CR : photos sur plans, compte-rendu.', ph ? ph + '/chantier/chantier' : '']
    ];
  }
  async function homeBlocks(ctx, el) {
    if (!el) return;
    const P = ctx.projets(), S = await steps(P), done = S.filter(s => s[0]).length, hide = LSget('ts-pem-masque', false);
    const I = P.length ? await weekItems(P) : [];
    let h = '';
    if (P.length) h += `<div class="card wkcard"><div class="row" style="justify-content:space-between"><h2 style="margin:0">Cette semaine</h2><a class="btn sm" href="#/semaine">Tout voir${I.length > 5 ? ' (' + I.length + ')' : ''}</a></div><div class="list">${I.length ? itemsHTML(I, 5) : '<p class="empty" style="margin:6px 0 0">Rien d\'urgent cette semaine.</p>'}</div></div>`;
    if (done < S.length && !hide) h += `<div class="card pem"><div class="row" style="justify-content:space-between"><h2 style="margin:0">Prise en main <span class="hint">${done} / ${S.length}</span></h2><button class="btn sm" id="pemHide">Masquer</button></div>
      <ol class="pemL">${S.map(([ok, t, d, href]) => `<li class="${ok ? 'ok' : ''}"><span class="ck" aria-hidden="true">${ok ? '✓' : ''}</span><div>${href && !ok ? `<a href="${href}">${E(t)}</a>` : `<b>${E(t)}</b>`}<div class="m">${E(d)}</div></div></li>`).join('')}</ol>
      ${P.some(p => p.code === 'EXEMPLE') ? '' : `<div class="row" style="margin-top:10px;gap:10px;flex-wrap:wrap"><button class="btn" id="pemEx">Ouvrir un projet exemple</button><span class="hint">Un projet de maison de ville déjà rempli (lots, entreprises, marchés, offres, chantier, réserves) pour tout essayer, à supprimer ensuite.</span></div>`}</div>`;
    el.innerHTML = h;
    const hb = document.getElementById('pemHide'); if (hb) hb.onclick = () => { try { localStorage.setItem('ts-pem-masque', 'true'); } catch (e) {} homeBlocks(ctx, el); };
    const ex = document.getElementById('pemEx'); if (ex) ex.onclick = async () => { ex.disabled = true; ex.textContent = 'Création…'; const p = await sample(); await ctx.reload(); ctx.go('#/p/' + p.id); };
  }

  /* ---------- projet exemple ---------- */
  async function sample() {
    const u = () => DB.uid(), d0 = today(), ent = (nom, contact, tel) => ({ cid: '', nom, contact, tel, email: '' });
    const lots = [['01', 'Démolition, gros œuvre', ent('Bâtir Est', 'M. Lefèvre', '01 48 00 00 01')], ['02', 'Charpente, couverture', ent('Toits de France', 'Mme Roux', '01 48 00 00 02')], ['03', 'Menuiseries extérieures', ent('Fenêtres Martin', 'M. Martin', '01 48 00 00 03')], ['04', 'Plâtrerie, peinture', null], ['05', 'Plomberie, chauffage', ent('Thermo Services', 'M. Diallo', '01 48 00 00 05')]].map(([num, nom, e]) => ({ id: u(), num, nom, ...(e ? { ent: e } : {}), comp: [] }));
    const p = await TSP.create({ code: 'EXEMPLE', nom: 'Maison de ville (exemple)', phase: 'DET', ville: 'Montreuil', cp: '93100', adresse: "12 rue de l'Exemple", moa: 'M. et Mme Martin', surface: '180', typeOuvrage: 'Logement individuel', nature: 'Réhabilitation lourde', notes: "Projet d'exemple créé pour la prise en main : modifiez-le ou supprimez-le (Fiche et intervenants › Supprimer le projet).", lots,
      autorisations: [{ type: 'Permis de construire', num: 'PC 093 048 26 X0001', depot: addD(d0, -150), decision: addD(d0, -60), etat: 'Accordé', notes: '' }, { type: 'Permis de construire modificatif', num: 'PC 093 048 26 X0001 M01', depot: addD(d0, -20), decision: '', etat: 'En instruction', notes: 'Modification de la façade sur jardin' }] });
    const S = TSMod.SD;
    const mt = { '01': 98000, '02': 42000, '03': 36500, '05': 31000 };
    for (const l of lots) if (mt[l.num]) await S.put('marches', p.id, { lotId: l.id, montant: String(mt[l.num]), signe: addD(d0, -45), notifie: addD(d0, -40), delai: '8', notes: '' });
    await S.put('os', p.id, { num: '1', date: addD(d0, -35), type: 'Démarrage des travaux', lot: 'Tous lots', objet: 'Démarrage du chantier', montant: '', delai: '', signe: true, ordre: '001' });
    await S.put('os', p.id, { num: '2', date: addD(d0, -3), type: 'Travaux modificatifs', lot: '01 Démolition, gros œuvre · Bâtir Est', objet: 'Reprise en sous-œuvre du mur mitoyen', montant: '6400', delai: '10', signe: false, ordre: '002' });
    await S.put('situations', p.id, { num: '1', mois: d0.slice(0, 7), lot: '01 Démolition, gros œuvre · Bâtir Est', marche: '98000', cumul: '27500', visa: '', notes: '', ordre: '001' });
    for (const [i, e, m, r] of [[1, 'Bâtir Est', 98000, true], [2, 'Maçonnerie Duval', 104500, false], [3, 'BTP Rénov', 112300, false]])
      await DB.put('docs', { id: TSLink.docId('estim', 'sources', 'ex-' + p.id.slice(0, 8) + '-' + i), app: 'estim', coll: 'sources', rid: 'ex-' + p.id.slice(0, 8) + '-' + i, projetId: p.id, chantierId: null, data: { projet: p.id, lot: '01', entreprise: e, montant: m, retenue: r, operation: p.nom, mois: addD(d0, -70).slice(0, 7) }, h: '', deleted: false });
    /* chantier, un compte-rendu, des réserves */
    const ag = typeof Carnet !== 'undefined' && Carnet.agence ? Carnet.agence() : null;
    const ents = [{ id: u(), role: 'MOA', nom: 'M. et Mme Martin', contact: '', fonction: '', tel: '', email: '', convoque: true }, { id: u(), role: 'MOE', nom: ag ? ag.nom : 'Agence', contact: '', fonction: '', tel: '', email: '', convoque: true }];
    const cl = lots.map(l => { let eid = ''; if (l.ent) { const e = { id: u(), role: 'ENT', nom: l.ent.nom, contact: l.ent.contact, fonction: '', tel: l.ent.tel, email: '', convoque: true }; ents.push(e); eid = e.id; } return { id: u(), code: l.num, nom: l.nom, entrepriseId: eid }; });
    const ch = { id: u(), nom: p.nom, code: p.code, adresse: "12 rue de l'Exemple, 93100 Montreuil", moa: p.moa, moe: ag ? ag.nom : '', projetId: p.id, lots: cl, entreprises: ents, emetteurId: ents[1].id };
    ch.chantierId = ch.id; await DB.put('chantiers', ch);
    await DB.put('visites', { id: u(), chantierId: ch.id, type: 'C', numero: 1, date: addD(d0, -6), heure: '09:30', meteo: 'Couvert', redacteur: '', presents: {}, convoques: {}, autres: '', observations: [], prochaine: 'Mardi à 9 h 30 sur site', diffusion: '' });
    const R = [['Fissure en pied du mur mitoyen, à reprendre', 'Séjour, RDC', cl[0].id, addD(d0, -2)], ['Solin de cheminée non étanche', 'Toiture', cl[1].id, addD(d0, 4)], ['Jeu en partie haute de la porte-fenêtre', 'Chambre 1, R+1', cl[2].id, addD(d0, 6)]];
    let n = 0; for (const [description, localisation, lotId, echeance] of R) await DB.put('reserves', { id: u(), chantierId: ch.id, numero: ++n, lotId, description, localisation, planId: null, x: null, y: null, photoIds: [], statut: 'ouverte', phase: 'OPR', dateConstat: addD(d0, -6), dateLevee: '', echeance, commentaire: '' });
    if (typeof Sync !== 'undefined') Sync.soon();
    return p;
  }

  /* ---------- partage : page autonome de l'état du projet, à envoyer au maître d'ouvrage ou aux entreprises ---------- */
  async function share(p) {
    const ag = typeof Carnet !== 'undefined' && Carnet.agence ? Carnet.agence() : null;
    const { vis, res, chs } = await chantierData();
    const mineCh = chs.filter(c => c.projetId === p.id), lotsCh = mineCh.flatMap(c => c.lots || []);
    const V = vis.filter(v => v._ch.projetId === p.id).sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const Ro = res.filter(r => r._ch.projetId === p.id && r.statut !== 'levee').sort((a, b) => (a.numero || 0) - (b.numero || 0));
    const D = (await suiteDocs()).filter(d => d.projetId === p.id && !d.deleted).map(d => ({ c: d.coll, ...d.data }));
    const M = new Map(D.filter(x => x.c === 'marches').map(x => [x.lotId, x]));
    const lotN = id => { const l = lotsCh.find(x => x.id === id); return l ? [l.code, l.nom].filter(Boolean).join(' ') : ''; };
    const tr = (cells, th) => `<tr>${cells.map(c => `<${th ? 'th' : 'td'}>${c}</${th ? 'th' : 'td'}>`).join('')}</tr>`;
    const sec = (t, body) => body ? `<h2>${E(t)}</h2>${body}` : '';
    const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${E(p.code || '')} · ${E(p.nom || '')} : état du projet</title>
<style>body{font:15px/1.5 system-ui,sans-serif;color:#1c1f22;max-width:880px;margin:0 auto;padding:24px 18px}h1{font-size:24px;margin:4px 0}h2{font-size:17px;margin:26px 0 8px;border-bottom:2px solid #b5532f;padding-bottom:4px}table{width:100%;border-collapse:collapse;font-size:14px}th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #e2ddd5;vertical-align:top}th{color:#5f6368;font-weight:600}.k{color:#5f6368;font-size:13px}.ag{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;color:#5f6368;font-size:13px}.n{text-align:right;white-space:nowrap}footer{margin-top:30px;color:#888;font-size:12px}</style></head><body>
<div class="ag"><div><b>${E(ag ? ag.nom : '')}</b>${ag ? '<br>' + E([ag.adresse, [ag.cp, ag.ville].filter(Boolean).join(' ')].filter(Boolean).join(', ')) : ''}</div><div>État au ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</div></div>
<div class="k" style="margin-top:18px">Projet${p.phase ? ' · phase ' + E(p.phase) : ''}</div><h1>${E(p.code || '')} · ${E(p.nom || '')}</h1><div>${E([p.adresse, [p.cp, p.ville].filter(Boolean).join(' ')].filter(Boolean).join(', '))}${p.moa ? "<br>Maître d'ouvrage : " + E(p.moa) : ''}</div>
${sec('Lots et entreprises', (p.lots || []).length ? `<table>${tr(['Lot', 'Entreprise', 'Marché HT'], true)}${p.lots.map(l => tr([E([l.num, l.nom].filter(Boolean).join(' ')), E(l.ent && l.ent.nom || 'à désigner'), `<span class="n">${M.get(l.id) && num(M.get(l.id).montant) ? NF.format(num(M.get(l.id).montant)) + ' €' : ''}</span>`])).join('')}</table>` : '')}
${sec("Autorisations d'urbanisme", (p.autorisations || []).length ? `<table>${tr(['Dossier', 'N°', 'Dépôt', 'Décision', 'État'], true)}${p.autorisations.map(a => tr([E(a.type), E(a.num || ''), E(a.depot ? new Date(a.depot).toLocaleDateString('fr-FR') : ''), E(a.decision ? new Date(a.decision).toLocaleDateString('fr-FR') : ''), E(a.etat || '')])).join('')}</table>` : '')}
${sec('Réunions de chantier', V.length ? `<table>${tr(['Compte-rendu', 'Date', 'Prochaine réunion'], true)}${V.slice(0, 6).map(v => tr([E('CR n° ' + (v.numero || '')), E(v.date ? new Date(v.date).toLocaleDateString('fr-FR') : ''), E(v.prochaine || '')])).join('')}</table>` : '')}
${sec(`Réserves ouvertes (${Ro.length})`, Ro.length ? `<table>${tr(['N°', 'Lot', 'Localisation', 'Réserve', 'À lever avant'], true)}${Ro.map(r => tr([E(r.numero || ''), E(lotN(r.lotId)), E(r.localisation || ''), E(r.description || ''), E(r.echeance ? new Date(r.echeance).toLocaleDateString('fr-FR') : '')])).join('')}</table>` : '')}
<footer>Document établi avec TerraSuite. Il reflète l'état du projet à la date indiquée ; les comptes-rendus et PV signés font foi.</footer></body></html>`;
    const name = `${(p.code || 'Projet').replace(/[^\w-]+/g, '_')} - état du projet.html`, blob = new Blob([html], { type: 'text/html' });
    try { const f = new File([blob], name, { type: 'text/html' }); if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: `${p.code || ''} · ${p.nom || ''}` }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  return { search, week, homeBlocks, share, sample, weekItems };
})();
