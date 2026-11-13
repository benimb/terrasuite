/* TerraSuite : les projets de l'agence (onglet « Projets » de TerraContacts, à côté de « Mon agence »).
   Un projet réunit l'identité de l'opération, ses intervenants, ses lots du marché et leurs entreprises ;
   les estimations (TerraEstim), plannings (TerraPlanning), études de parcelle (TerraGeo) et chantiers (TerraChantier) s'y rattachent. */
const Projets = (() => {
  /* les autres applications de la suite sont dans les dossiers voisins (ordinateur ou version publiée) ; pas dans la version installable seule */
  const SUITE = !/github\.io$/.test(location.hostname);
  const APPS = [['estim', 'TerraEstim', '../TerraEstim/TerraEstim.html', 'Estimations, CCTP, DPGF'], ['planning', 'TerraPlanning', '../TerraPlanning/TerraPlanning.html', 'Plannings'], ['geo', 'TerraGeo', '../TerraGeo/TerraGeo.html', 'Faisabilité : parcelle, urbanisme'], ['docs', 'TerraDocs', '../TerraDocs/TerraDocs.html', 'Produits prescrits']];
  const ROLES_P = [['MOA', "Maître d'ouvrage"], ['AMO', "Assistance à maîtrise d'ouvrage"], ['BET', "Bureau d'études"], ['ECO', 'Économiste'], ['BCT', 'Bureau de contrôle'], ['CSPS', 'Coordination SPS'], ['OPC', 'OPC'], ['PAY', 'Paysagiste'], ['AUT', 'Autre']];
  const lotLabel = t => { const k = t.slice(0, 2), v = t.slice(2); if (k === 'L:') { const l = DEFAULT_LOTS.find(x => x[0] === v); return v + ' ' + (l ? l[1] : ''); } if (k === 'C:') return 'sous-lot ' + v; if (k === 'P:') return 'pièce ' + v; return t; };
  const entSnap = (c, pid) => { const p = (pid && (c.personnes || []).find(x => x.id === pid)) || (c.personnes || []).find(x => x.principal) || (c.personnes || [])[0]; return { cid: c.id, nom: c.nom, contact: p ? Carnet.fullName(p) : '', tel: (p && (p.mobile || p.tel)) || c.tel || '', email: (p && p.email) || c.email || '' }; };
  let F = { q: '', statut: 'actifs' };

  async function list(m) {
    const all = await TSP.all(), q = norm(F.q);
    const shown = all.filter(p => (F.statut === 'tous' || (F.statut === 'actifs' ? p.statut !== 'archive' && p.statut !== 'termine' : p.statut === F.statut)) && (!q || norm([p.code, p.nom, p.ville, p.adresse, p.moa].join(' ')).includes(q)));
    m.innerHTML = `<div class="bar"><h2 class="grow" style="font-size:20px">Projets <span class="muted small">${all.length}</span></h2><button class="btn pri" id="pNew">+ Nouveau projet</button></div>
      <div class="hint" style="margin-bottom:10px">Un projet se crée ici une fois, puis se retrouve dans chaque application : estimation, CCTP et DPGF (TerraEstim), planning (TerraPlanning), faisabilité (TerraGeo), chantier (TerraChantier).</div>
      <div class="bar"><input type="search" id="pQ" placeholder="Rechercher : code, nom, ville, maître d'ouvrage" value="${esc(F.q)}" style="max-width:420px"></div>
      <div class="levels bar">${[['actifs', 'En cours'], ['termine', 'Terminés'], ['archive', 'Archivés'], ['tous', 'Tous']].map(([k, t]) => `<button class="chip${F.statut === k ? ' on' : ''}" data-s="${k}">${t}</button>`).join('')}</div>
      <div class="list">${shown.map(p => `<a class="card ch" href="#/projets/${p.id}" style="text-decoration:none;color:inherit"><div class="row" style="align-items:flex-start"><span class="ico" style="min-width:44px;text-align:center;font-weight:700">${esc((p.code || p.nom || '?').slice(0, 5).toUpperCase())}</span><span class="grow"><b>${esc(p.nom || 'Sans nom')}</b>${p.phase ? ` <span class="tag-role">${esc(p.phase)}</span>` : ''}${p.statut !== 'cours' ? ` <span class="badge">${esc((TSP.STATUTS.find(s => s[0] === p.statut) || ['', ''])[1])}</span>` : ''}<div class="small muted">${esc([[p.cp, p.ville].filter(Boolean).join(' '), p.moa, p.lots.length ? p.lots.length + ' lot(s) du marché' : ''].filter(Boolean).join(' · '))}</div></span></div></a>`).join('') || `<div class="empty"><b>${all.length ? 'Aucun projet ne correspond' : 'Aucun projet'}</b>${all.length ? '' : 'Créez votre premier projet : il sera proposé dans TerraEstim, TerraPlanning, TerraGeo et TerraChantier.'}</div>`}</div>`;
    $('#pQ', m).oninput = e => { F.q = e.target.value; const pos = e.target.selectionStart; list(m).then(() => { const i = $('#pQ', m); i.focus(); i.setSelectionRange(pos, pos); }); };
    $$('[data-s]', m).forEach(b => b.onclick = () => { F.statut = b.dataset.s; list(m); });
    $('#pNew', m).onclick = async () => { const p = await TSP.create({ nom: '' }); if (typeof Sync !== 'undefined') Sync.soon(); location.hash = '#/projets/' + p.id; };
  }

  async function fiche(m, id) {
    const p = await TSP.get(id); if (!p) { location.hash = '#/projets'; return; }
    const save = async () => { await TSP.put(p); if (typeof Sync !== 'undefined') Sync.soon(); };
    const fld = (k, t, ph = '', type = 'text') => `<label class="f">${t}<input type="${type}" data-p="${k}" value="${esc(p[k] || '')}" placeholder="${esc(ph)}"></label>`;
    const dt = (k, t) => `<label class="f">${t}<input type="date" data-d="${k}" value="${esc((p.dates || {})[k] || '')}"></label>`;
    m.innerHTML = `<div class="bar"><a class="btn sm" href="#/projets">← Projets</a><h2 class="grow" style="font-size:20px">${esc(TSP.label(p))}</h2><button class="btn danger" id="pDel">Supprimer</button></div>
      <div class="card" style="display:flex;flex-direction:column;gap:10px"><b>Projet</b>
        <div class="grid2">${fld('code', 'Code court', 'CTN')}${fld('nom', "Nom de l'opération", 'Réhabilitation de…')}
          <label class="f">Phase<select data-p="phase"><option value=""></option>${TSP.PHASES.map(x => `<option${p.phase === x ? ' selected' : ''}>${x}</option>`).join('')}</select></label>
          <label class="f">État<select data-p="statut">${TSP.STATUTS.map(([k, t]) => `<option value="${k}"${p.statut === k ? ' selected' : ''}>${t}</option>`).join('')}</select></label></div>
        <div class="grid2"><label class="f">Type d'ouvrage<select data-p="typeOuvrage"><option value=""></option>${TSP.TYPES.map(x => `<option${p.typeOuvrage === x ? ' selected' : ''}>${x}</option>`).join('')}</select></label>
          <label class="f">Nature des travaux<select data-p="nature"><option value=""></option>${TSP.NATURES.map(x => `<option${p.nature === x ? ' selected' : ''}>${x}</option>`).join('')}</select></label></div>
        <div class="grid2"><label class="f adr">Adresse du site<input type="text" id="pAdr" value="${esc(p.adresse || '')}" placeholder="Tapez l'adresse puis choisissez-la dans la liste" autocomplete="off" role="combobox" aria-autocomplete="list" aria-controls="pAdrS"><div class="adrs" id="pAdrS" role="listbox" hidden></div></label>${fld('cp', 'Code postal')}${fld('ville', 'Commune')}${fld('parcelles', 'Parcelles cadastrales', 'AB 123, AB 124')}</div>
        <div class="row small" id="pGeo" style="flex-wrap:wrap;gap:8px"></div>
        <div class="row small" id="pLocI" style="flex-wrap:wrap;gap:8px"></div>
        <div class="grid2"><label class="f">Maître d'ouvrage<span class="row" style="gap:6px"><input type="text" data-p="moa" value="${esc(p.moa || '')}"><button type="button" class="btn sm" id="pMoa">Carnet</button></span></label>${fld('surface', 'Surface (m² SDP)', '', 'text')}${fld('budget', 'Enveloppe travaux (€ HT)')}</div>
        <div class="grid2">${dt('etudes', 'Début des études')}${dt('dce', 'Remise du DCE')}${dt('travaux', 'Début des travaux')}${dt('reception', 'Réception')}</div>
        <label class="f">Notes<textarea data-p="notes" rows="2">${esc(p.notes || '')}</textarea></label></div>

      <div class="lothead">Intervenants</div>
      <div class="card" style="padding:0 8px">${p.intervenants.length ? `<table class="t"><tbody>${p.intervenants.map((x, i) => `<tr><td style="width:190px"><select data-ir="${i}">${ROLES_P.map(([k, t]) => `<option value="${k}"${x.role === k ? ' selected' : ''}>${t}</option>`).join('')}</select></td><td><b>${esc(x.nom)}</b><div class="small muted">${esc([x.contact, x.tel, x.email].filter(Boolean).join(' · '))}</div></td><td style="width:40px"><button class="btn sm danger" data-ix="${i}" aria-label="Retirer">×</button></td></tr>`).join('')}</tbody></table>` : '<div class="empty" style="padding:14px">Aucun intervenant.</div>'}</div>
      <div class="bar" style="margin-top:8px"><button class="btn" id="pInt">+ Intervenant du carnet</button></div>

      <div class="lothead">Lots du marché</div>
      <div class="hint" style="margin-bottom:6px">Chaque lot du marché regroupe un ou plusieurs lots de la nomenclature TerraSuite (et, depuis TerraEstim, des sous-lots ou des pièces du CCTP de projet). L'entreprise retenue est reprise par TerraEstim, TerraPlanning et TerraChantier.</div>
      <div class="list">${p.lots.map((l, i) => `<div class="card" data-l="${i}" style="display:flex;flex-direction:column;gap:8px">
        <div class="row" style="gap:6px"><input type="text" data-lk="num" value="${esc(l.num || '')}" style="width:60px" placeholder="N°" aria-label="Numéro du lot"><input type="text" data-lk="nom" value="${esc(l.nom || '')}" placeholder="Intitulé du lot" aria-label="Intitulé du lot" style="flex:1"><button class="btn sm" data-up="${i}"${i ? '' : ' disabled'} aria-label="Monter">↑</button><button class="btn sm danger" data-lx="${i}" aria-label="Supprimer le lot">×</button></div>
        <div class="row" style="flex-wrap:wrap;gap:5px">${l.comp.map((t, j) => `<span class="chip" style="cursor:default">${esc(lotLabel(t))} <button class="btn sm" data-cx="${j}" style="padding:0 5px;border:0" aria-label="Retirer">×</button></span>`).join('') || '<span class="hint">Aucun lot de la nomenclature.</span>'}
          <select data-ca="${i}" style="max-width:260px"><option value="">+ Lot de la nomenclature…</option>${DEFAULT_LOTS.map(([c, n]) => `<option value="L:${c}">${c} ${esc(n)}</option>`).join('')}</select></div>
        <div class="row small" style="gap:8px"><span class="muted">Entreprise :</span>${l.ent && l.ent.nom ? `<b>${esc(l.ent.nom)}</b><span class="muted">${esc([l.ent.contact, l.ent.tel, l.ent.email].filter(Boolean).join(' · '))}</span>` : '<span class="muted">non attribuée</span>'}<span class="grow"></span><button class="btn sm" data-ent="${i}" title="Choisir l'entreprise titulaire du lot dans le carnet de contacts, ou la créer">${l.ent && l.ent.nom ? "Changer d'entreprise" : "Définir l'entreprise"}</button>${l.ent && l.ent.nom ? `<button class="btn sm danger" data-entx="${i}" aria-label="Retirer l'entreprise">×</button>` : ''}</div></div>`).join('') || '<div class="empty" style="padding:14px">Aucun lot du marché.</div>'}</div>
      <div class="bar" style="margin-top:8px"><button class="btn" id="pLot">+ Lot du marché</button>${!p.lots.length ? '<button class="btn" id="pLotsN" title="Un lot du marché par lot de la nomenclature, à regrouper ensuite">Partir de la nomenclature</button>' : ''}</div>

      <div class="lothead">Dans les applications</div>
      <div class="list" id="pDocs"><div class="hint">Recherche des éléments rattachés…</div></div>`;
    $$('[data-p]', m).forEach(i => i.onchange = async () => { p[i.dataset.p] = i.value.trim(); if (['cp', 'ville'].includes(i.dataset.p)) delete p.geo; await save(); geoLine(); if (['code', 'nom'].includes(i.dataset.p)) $('h2', m).textContent = TSP.label(p); });
    /* adresse du site : recherche dans la Base Adresse Nationale ; l'adresse choisie est localisée (point, code INSEE) et TerraGeo l'utilise directement */
    const adr = $('#pAdr', m), sug = $('#pAdrS', m), tgo = '../TerraGeo/TerraGeo.html#projet=' + p.id; let adrT = 0, adrF = [], adrN = 0;
    let geoLine = () => { const g = p.geo, el = $('#pGeo', m); if (!el) return;
      el.innerHTML = g ? `<span style="color:var(--ok);font-weight:600">● Adresse localisée</span><span class="muted">${esc(g.label)}${g.insee ? ' · INSEE ' + esc(g.insee) : ''}</span><span class="grow"></span><a class="btn sm" href="${tgo}">Étude de faisabilité dans TerraGeo →</a>`
        : p.adresse ? `<span class="muted">Adresse non localisée : choisissez-la dans la liste proposée, ou</span><button type="button" class="btn sm" id="pLoc">Localiser</button><span class="grow"></span><a class="btn sm" href="${tgo}">Étude de faisabilité dans TerraGeo →</a>`
        : '<span class="muted">L\'adresse choisie dans la liste est localisée : TerraGeo ouvre directement la parcelle du projet.</span>';
      const b = $('#pLoc', el); if (b) b.onclick = async () => { const f = (await ban([p.adresse, p.cp, p.ville].filter(Boolean).join(' '), 1))[0]; if (f && f.properties.score > 0.5) choose(f); else toast('Adresse introuvable : précisez-la ou choisissez-la dans la liste'); }; };
    const ban = async (q, n = 5) => { try { const r = await fetch('https://api-adresse.data.gouv.fr/search/?q=' + encodeURIComponent(q) + '&limit=' + n + (n > 1 ? '&autocomplete=1' : '')); return r.ok ? (await r.json()).features || [] : []; } catch (e) { return []; } };
    const choose = async f => { const g = f.properties, [lon, lat] = f.geometry.coordinates; sug.hidden = true;
      p.adresse = g.type === 'municipality' ? '' : g.name; p.cp = g.postcode || p.cp; p.ville = g.city || p.ville;
      p.geo = { lon, lat, insee: g.citycode || '', label: g.label, name: g.name, postcode: g.postcode || '', city: g.city || '', context: g.context || '', type: g.type || '' };
      await save(); adr.value = p.adresse; $('[data-p=cp]', m).value = p.cp || ''; $('[data-p=ville]', m).value = p.ville || ''; geoLine(); };
    const show = fs => { adrF = fs; adrN = -1; sug.innerHTML = fs.map((f, i) => `<button type="button" role="option" data-a="${i}">${esc(f.properties.label)}<small>${esc(f.properties.context || '')}</small></button>`).join(''); sug.hidden = !fs.length;
      $$('[data-a]', sug).forEach(b => { b.onmousedown = e => e.preventDefault(); b.onclick = () => choose(adrF[+b.dataset.a]); }); };
    adr.oninput = () => { clearTimeout(adrT); const q = adr.value.trim(); if (q.length < 4) { sug.hidden = true; return; } adrT = setTimeout(async () => { const fs = await ban(q); if (adr.value.trim() === q) show(fs); }, 250); };
    adr.onkeydown = e => { const bs = $$('[data-a]', sug); if (sug.hidden || !bs.length) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); adrN = (adrN + (e.key === 'ArrowDown' ? 1 : bs.length - 1)) % bs.length; bs.forEach((b, i) => b.classList.toggle('on', i === adrN)); }
      else if (e.key === 'Enter' && adrN >= 0) { e.preventDefault(); choose(adrF[adrN]); } else if (e.key === 'Escape') sug.hidden = true; };
    adr.onblur = () => setTimeout(() => { sug.hidden = true; }, 150);
    adr.onchange = async () => { const v = adr.value.trim(); if (v === (p.adresse || '')) return; p.adresse = v; delete p.geo; await save(); geoLine(); };
    /* indice de prix du lieu (département du projet), repris par TerraEstim pour ses estimations ; modifiable */
    const fmtK = v => String(v).replace('.', ',');
    const locLine = () => { const el = $('#pLocI', m); if (!el) return; const L = TSP.loc(p);
      el.innerHTML = `<span class="muted">Indice de prix du lieu</span><input type="text" id="pCoef" inputmode="decimal" value="${L.manuel ? esc(fmtK(p.coefLoc)) : ''}" placeholder="${L.table !== null ? fmtK(L.table) : '1'}" style="width:70px" aria-label="Indice de prix du lieu">
        <span class="muted">${L.dept ? (L.nom ? esc(L.nom) + ' (' + esc(L.dept) + ')' : 'département ' + esc(L.dept)) + (L.manuel ? ` · valeur du département : ${fmtK(L.table ?? 1)}` : ' · valeur du département') : 'renseignez l\'adresse ou le code postal'} · 1 = médiane des départements ; appliqué aux prix de référence de TerraEstim</span>`;
      $('#pCoef', el).onchange = async e => { const v = parseFloat(String(e.target.value).replace(',', '.')); if (isFinite(v) && v > 0.3 && v < 4) p.coefLoc = v; else delete p.coefLoc; await save(); locLine(); }; };
    const geoLine0 = geoLine; geoLine = () => { geoLine0(); locLine(); };
    geoLine();
    $$('[data-d]', m).forEach(i => i.onchange = async () => { p.dates = { ...(p.dates || {}), [i.dataset.d]: i.value }; await save(); });
    const re = async () => { await save(); fiche(m, id); };
    $('#pMoa', m).onclick = async () => { const k = await Carnet.pick({ role: 'MOA', title: "Maître d'ouvrage" }); if (!k) return; p.moa = k.c.nom; p.moaId = k.c.id; if (!p.intervenants.some(x => x.cid === k.c.id)) p.intervenants.unshift({ role: 'MOA', ...entSnap(k.c, k.pid) }); re(); };
    $('#pInt', m).onclick = async () => { const k = await Carnet.pick({ title: 'Intervenant du projet' }); if (!k) return; const r = ROLES_P.some(x => x[0] === k.c.role) ? k.c.role : 'AUT'; p.intervenants.push({ role: r, ...entSnap(k.c, k.pid) }); re(); };
    $$('[data-ir]', m).forEach(s => s.onchange = () => { p.intervenants[+s.dataset.ir].role = s.value; save(); });
    $$('[data-ix]', m).forEach(b => b.onclick = () => { p.intervenants.splice(+b.dataset.ix, 1); re(); });
    $$('[data-l]', m).forEach(card => { const i = +card.dataset.l, l = p.lots[i];
      $$('[data-lk]', card).forEach(inp => inp.onchange = () => { l[inp.dataset.lk] = inp.value.trim(); save(); });
      $$('[data-cx]', card).forEach(b => b.onclick = () => { l.comp.splice(+b.dataset.cx, 1); re(); });
      $('[data-ca]', card).onchange = e => { const t = e.target.value; if (!t) return; p.lots.forEach(x => { x.comp = x.comp.filter(y => y !== t); }); l.comp.push(t); if (!l.nom) { const d = DEFAULT_LOTS.find(x => 'L:' + x[0] === t); if (d) l.nom = d[1]; } re(); }; });
    $$('[data-up]', m).forEach(b => b.onclick = () => { const i = +b.dataset.up; [p.lots[i - 1], p.lots[i]] = [p.lots[i], p.lots[i - 1]]; re(); });
    $$('[data-lx]', m).forEach(b => b.onclick = () => { const l = p.lots[+b.dataset.lx]; if (!confirm(`Supprimer le lot ${l.num || ''} ${l.nom || ''} ?`)) return; p.lots.splice(+b.dataset.lx, 1); re(); });
    $$('[data-ent]', m).forEach(b => b.onclick = async () => { const l = p.lots[+b.dataset.ent], lc = (l.comp.find(t => t.startsWith('L:')) || '').slice(2); const k = await Carnet.pick({ role: 'ENT', title: 'Définir l\'entreprise du lot ' + (l.num || ''), lot: lc }); if (!k) return; l.ent = entSnap(k.c, k.pid); re(); });
    $$('[data-entx]', m).forEach(b => b.onclick = () => { delete p.lots[+b.dataset.entx].ent; re(); });
    $('#pLot', m).onclick = () => { p.lots.push({ id: TSP.uid(), num: String(p.lots.length + 1), nom: '', comp: [] }); re(); };
    if ($('#pLotsN', m)) $('#pLotsN', m).onclick = () => { p.lots = DEFAULT_LOTS.filter(([c]) => c !== '00').map(([c, n], k) => ({ id: TSP.uid(), num: String(k + 1), nom: n, comp: ['L:' + c] })); re(); };
    $('#pDel', m).onclick = async () => { if (!confirm(`Supprimer le projet « ${TSP.label(p)} » ? Les estimations, plannings et chantiers rattachés sont conservés.`)) return; await TSP.del(p.id); if (typeof Sync !== 'undefined') Sync.soon(); location.hash = '#/projets'; };
    docs($('#pDocs', m), p);
  }

  /* éléments rattachés au projet dans chaque application (même navigateur, même dossier ou même site) */
  async function linked(p) {
    const out = { estim: [], planning: [], geo: [], docs: [], chantier: [] };
    try { if (!indexedDB.databases || (await indexedDB.databases()).some(d => d.name === 'terraestim')) {
      const d = await new Promise((ok, ko) => { const r = indexedDB.open('terraestim'); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); r.onupgradeneeded = () => r.transaction.abort(); });
      if (d.objectStoreNames.contains('kv')) { const ests = await new Promise(ok => { const r = d.transaction('kv').objectStore('kv').get('te-estimations'); r.onsuccess = () => ok(r.result || {}); r.onerror = () => ok({}); });
        for (const [eid, e] of Object.entries(ests)) if (e && e.projet === p.id) out.estim.push({ t: e.title || 'Estimation', s: [e.phase, e.cctp ? 'CCTP de projet' : ''].filter(Boolean).join(' · '), h: '../TerraEstim/TerraEstim.html#est=' + eid });
        const srcs = await new Promise(ok => { const r = d.transaction('kv').objectStore('kv').get('te-sources'); r.onsuccess = () => ok(r.result || {}); r.onerror = () => ok({}); });
        const mine = Object.values(srcs).filter(x => x && x.projet === p.id);
        if (mine.length) out.estim.push({ t: `DPGF importées : ${mine.length}`, s: [...new Set(mine.map(x => x.entreprise).filter(Boolean))].length + ' entreprise(s), dont ' + mine.filter(x => x.retenue).length + ' retenue(s)', h: '../TerraEstim/TerraEstim.html#dpgf=' + p.id }); }
      d.close(); } } catch (e) {}
    try { const m = JSON.parse(localStorage.getItem('tf-plannings') || '{}'); for (const [pid, d] of Object.entries(m)) if (d && d.project && d.project.projet === p.id) out.planning.push({ t: d.name || 'Planning', s: d.project.kind === 'frise' ? 'frise' : '', h: '../TerraPlanning/TerraPlanning.html#planning=' + encodeURIComponent(pid) }); } catch (e) {}
    try { for (const f of JSON.parse(localStorage.getItem('tg-fiches') || '[]')) if (f && f.projet === p.id) out.geo.push({ t: f.nom || 'Étude de parcelle', s: (f.parcelles || []).length ? f.parcelles.length + ' parcelle(s)' : '', h: '../TerraGeo/TerraGeo.html#fiche=' + f.id }); } catch (e) {}
    try { const td = JSON.parse(localStorage.getItem('terradocs.v1') || 'null'); if (td && Array.isArray(td.produits)) { const keys = [p.code, p.nom].filter(Boolean).map(norm);
      const n = td.produits.filter(x => String(x.projets || '').split(/[,;\n]+/).map(t => norm(t.trim())).some(t => keys.includes(t))).length;
      if (n) out.docs.push({ t: `${n} produit(s) prescrit(s)`, s: 'champ « Projets » de la fiche produit', h: '../TerraDocs/TerraDocs.html#projet=' + p.id }); } } catch (e) {}
    for (const c of await DB.all('chantiers')) if (c.projetId === p.id) out.chantier.push({ t: c.nom, s: c.code || '', h: './#/c/' + c.id });
    return out;
  }
  async function docs(el, p) {
    const L = await linked(p), item = x => `<a class="card ch" href="${esc(x.h)}" style="text-decoration:none;color:inherit;padding:8px 12px"><b>${esc(x.t)}</b>${x.s ? ` <span class="small muted">${esc(x.s)}</span>` : ''}</a>`;
    const block = (k, name, sub, items, add) => `<div class="card" style="display:flex;flex-direction:column;gap:6px"><div class="row"><b class="grow">${name} <span class="small muted">${sub}</span></b>${add}</div>${items.map(item).join('') || '<span class="hint">Rien de rattaché pour l\'instant.</span>'}</div>`;
    el.innerHTML = (SUITE ? APPS.map(([k, n, h, sub]) => block(k, n, sub, L[k], `<a class="btn sm" href="${h}#projet=${p.id}">${{ estim: 'Estimation du projet', planning: 'Planning du projet', geo: 'Étude de parcelle', docs: 'Voir les produits' }[k]}</a>`)).join('') : '')
      + block('chantier', 'TerraChantier', 'Comptes-rendus, OPR, photos', L.chantier, `<a class="btn sm" href="./#/projet/${p.id}">Ouvrir ou créer le chantier</a>`)
      + (SUITE ? '' : '<div class="hint">Estimations, plannings et études de parcelle : depuis la suite installée sur l\'ordinateur ou publiée.</div>');
  }
  return { list, fiche, linked };
})();
