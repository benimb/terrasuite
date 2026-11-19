/* TerraSuite : écrans propres à l'application (documents, ordres de service, situations, PV, GPA).
   Les fiches sont rangées dans la base TerraSuite (magasin « docs », application « suite ») et synchronisées comme les autres.
   Les PV reprennent les réserves de TerraChantier (chantiers rattachés au projet). Impression avec l'en-tête de l'agence. */
const TSMod = (() => {
  const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const NF = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const num = v => { const n = parseFloat(String(v ?? '').replace(/\s/g, '').replace(',', '.')); return isFinite(n) ? n : 0; };
  const eur = v => v === '' || v === null || v === undefined ? '' : NF.format(num(v)) + ' €';
  const dFr = d => d ? new Date(String(d).length === 10 ? d + 'T12:00' : d).toLocaleDateString('fr-FR') : '';
  const today = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };

  /* ---------- données ---------- */
  const SD = {
    async list(coll, pid) { try { return (await DB.all('docs')).filter(d => d.app === 'suite' && d.coll === coll && d.projetId === pid && !d.deleted).map(d => d.data).sort((a, b) => String(a.ordre ?? a.date ?? '').localeCompare(String(b.ordre ?? b.date ?? ''), 'fr', { numeric: true })); } catch (e) { return []; } },
    async put(coll, pid, rec) { rec.id = rec.id || DB.uid(); await DB.put('docs', { id: TSLink.docId('suite', coll, rec.id), app: 'suite', coll, rid: rec.id, projetId: pid, chantierId: null, data: rec, h: TSLink.hash(rec), deleted: false }); if (typeof Sync !== 'undefined') Sync.soon(); return rec; },
    async del(coll, pid, rec) { await DB.put('docs', { id: TSLink.docId('suite', coll, rec.id), app: 'suite', coll, rid: rec.id, projetId: pid, chantierId: null, data: rec, h: '', deleted: true }); if (typeof Sync !== 'undefined') Sync.soon(); }
  };
  /* chantier(s) du projet (TerraChantier) : lots, entreprises, réserves */
  async function chantierOf(p) {
    let chs = []; try { chs = (await DB.all('chantiers')).filter(c => c.projetId === p.id).sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''))); } catch (e) {}
    const ch = chs[0] || null, ents = ch ? (ch.entreprises || []) : [];
    let lots = ch && (ch.lots || []).length ? ch.lots.map(l => { const e = ents.find(x => x.id === l.entrepriseId); return { id: l.id, code: l.code || '', nom: l.nom || '', ent: e ? e.nom : '' }; })
      : (p.lots || []).map(l => ({ id: l.id, code: l.num || '', nom: l.nom || '', ent: l.entreprise || (l.ent && l.ent.nom) || '' }));
    lots = lots.sort((a, b) => String(a.code).localeCompare(String(b.code), 'fr', { numeric: true }));
    let res = []; for (const c of chs) { try { res.push(...(await DB.all('reserves', c.id)).filter(r => !r.deleted)); } catch (e) {} }
    res.sort((a, b) => (a.numero || 0) - (b.numero || 0));
    return { ch, chs, lots, ents, res };
  }
  const lotLabel = l => [l.code, l.nom].filter(Boolean).join(' ') + (l.ent ? ' · ' + l.ent : '');

  /* ---------- impression : en-tête de l'agence ---------- */
  async function printDoc(title, p, html) {
    const ag = typeof Carnet !== 'undefined' ? Carnet.agence() : null, arch = ag && Carnet.architecte ? Carnet.architecte() : null;
    let logo = ''; if (ag && ag.logoId && typeof BlobURL === 'function') { const u = await BlobURL(ag.logoId); if (u) logo = `<img src="${u}" alt="" style="max-height:52px;max-width:200px">`; }
    let pr = document.getElementById('tsPrint'); if (!pr) { pr = document.createElement('div'); pr.id = 'tsPrint'; document.body.appendChild(pr); }
    pr.innerHTML = `<div class="ph"><div>${logo}<div class="ag"><b>${E(ag ? ag.nom : '')}</b><br>${E([ag && ag.adresse, ag && [ag.cp, ag.ville].filter(Boolean).join(' ')].filter(Boolean).join(', '))}${ag && (ag.tel || ag.email) ? '<br>' + E([ag.tel, ag.email].filter(Boolean).join(' · ')) : ''}${arch ? '<br>' + E([arch.prenom, arch.nom].filter(Boolean).join(' ') + (arch.fonction ? ', ' + arch.fonction : '')) : ''}</div></div>
      <div class="pj"><b>${E(p.code || '')} · ${E(p.nom || '')}</b><br>${E([p.adresse, [p.cp, p.ville].filter(Boolean).join(' ')].filter(Boolean).join(', '))}${p.moa ? "<br>Maître d'ouvrage : " + E(p.moa) : ''}</div></div>
      <h1>${E(title)}</h1>${html}<div class="pf">${E(ag ? ag.nom : 'TerraSuite')} · ${E(p.code || '')} · imprimé le ${dFr(today())}</div>`;
    setTimeout(() => window.print(), 150);
  }
  const sign = (L) => `<table class="sig"><tr>${L.map(x => `<td><b>${E(x)}</b><br>Date et signature</td>`).join('')}</tr></table>`;

  /* ---------- tableau éditable générique ---------- */
  async function table(body, p, cfg) {
    const rows = await SD.list(cfg.coll, p.id);
    const C = await chantierOf(p), lotOpts = ['', ...C.lots.map(lotLabel)];
    const cell = (c, r, i) => {
      const v = r[c.k] ?? '';
      if (c.type === 'select') { const L = c.opts === 'lots' ? (lotOpts.includes(v) ? lotOpts : [...lotOpts, v]) : c.opts; return `<select data-i="${i}" data-k="${c.k}" aria-label="${E(c.lab)}">${L.map(o => `<option${o === v ? ' selected' : ''}>${E(o)}</option>`).join('')}</select>`; }
      if (c.type === 'check') return `<input type="checkbox" data-i="${i}" data-k="${c.k}" ${v ? 'checked' : ''} aria-label="${E(c.lab)}" style="width:20px;height:20px">`;
      return `<input data-i="${i}" data-k="${c.k}" type="${c.type || 'text'}" value="${E(v)}" ${c.num ? 'inputmode="decimal" style="text-align:right"' : ''} aria-label="${E(c.lab)}" ${c.ph ? `placeholder="${E(c.ph)}"` : ''}>`;
    };
    body.innerHTML = `<div class="wrap"><div class="card">
      <div class="row" style="justify-content:space-between;margin-bottom:8px"><h2 style="margin:0">${E(cfg.title)}</h2><div class="row">${cfg.print ? '<button class="btn" id="tPr">Imprimer</button>' : ''}<button class="btn pri" id="tAdd">+ ${E(cfg.addLabel || 'Ligne')}</button></div></div>
      <div class="tscroll"><table class="t"><thead><tr>${cfg.cols.map(c => `<th style="${c.w ? 'min-width:' + c.w + 'px' : ''}${c.num ? ';text-align:right' : ''}">${E(c.lab)}</th>`).join('')}<th></th></tr></thead><tbody>
      ${rows.map((r, i) => `<tr>${cfg.cols.map(c => `<td>${cell(c, r, i)}</td>`).join('')}<td><button class="btn sm danger" data-del="${i}" aria-label="Supprimer">✕</button></td></tr>`).join('') || `<tr><td colspan="${cfg.cols.length + 1}" class="empty" style="padding:14px 10px">${E(cfg.empty || 'Aucune ligne.')}</td></tr>`}
      </tbody>${cfg.foot ? `<tfoot>${cfg.foot(rows)}</tfoot>` : ''}</table></div>
      ${cfg.after ? cfg.after(rows, C) : ''}</div></div>`;
    const re = () => table(body, p, cfg);
    body.querySelector('#tAdd').onclick = async () => { await SD.put(cfg.coll, p.id, cfg.newRec(rows, C)); re(); };
    if (cfg.print) body.querySelector('#tPr').onclick = () => cfg.print(rows, C);
    body.querySelectorAll('[data-k]').forEach(el => el.addEventListener('change', async () => { const r = rows[+el.dataset.i]; r[el.dataset.k] = el.type === 'checkbox' ? el.checked : el.value; await SD.put(cfg.coll, p.id, r); if (cfg.foot || cfg.redraw) re(); }));
    body.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { if (!confirm('Supprimer cette ligne ?')) return; await SD.del(cfg.coll, p.id, rows[+b.dataset.del]); re(); });
    if (cfg.bind) cfg.bind(rows, C);
  }

  /* ---------- documents déposés (plans et notice, DCE, DOE) ---------- */
  async function documents(body, p, cfg) {
    const rows = await SD.list(cfg.coll, p.id);
    const size = n => n > 1e6 ? (n / 1e6).toFixed(1).replace('.', ',') + ' Mo' : Math.max(1, Math.round(n / 1e3)) + ' Ko';
    body.innerHTML = `<div class="wrap"><div class="card">
      <div class="row" style="justify-content:space-between;margin-bottom:8px"><h2 style="margin:0">${E(cfg.title)}</h2><label class="btn pri" style="cursor:pointer">+ Déposer des fichiers<input type="file" id="dIn" multiple hidden accept="${E(cfg.accept || '.pdf,image/*,.dwg,.dxf,.docx,.xlsx,.zip')}"></label></div>
      <div class="tscroll"><table class="t"><thead><tr><th style="min-width:240px">Document</th>${cfg.lot ? '<th style="min-width:200px">Lot</th>' : ''}<th>Indice</th><th>Date</th><th>Fichier</th><th></th></tr></thead><tbody>
      ${rows.map((r, i) => `<tr><td><input data-i="${i}" data-k="titre" value="${E(r.titre)}" aria-label="Titre"></td>${cfg.lot ? `<td><input data-i="${i}" data-k="lot" value="${E(r.lot || '')}" aria-label="Lot" list="dLots"></td>` : ''}<td style="width:80px"><input data-i="${i}" data-k="indice" value="${E(r.indice || '')}" aria-label="Indice"></td><td style="width:160px"><input data-i="${i}" data-k="date" type="date" value="${E(r.date || '')}" aria-label="Date"></td><td style="white-space:nowrap"><button class="btn sm" data-open="${i}">Ouvrir</button> <span class="hint">${E(size(r.taille || 0))}</span></td><td><button class="btn sm danger" data-del="${i}" aria-label="Supprimer">✕</button></td></tr>`).join('') || `<tr><td colspan="6" class="empty" style="padding:14px 10px">Aucun document.</td></tr>`}
      </tbody></table></div>${cfg.lot ? `<datalist id="dLots">${(await chantierOf(p)).lots.map(l => `<option value="${E(lotLabel(l))}">`).join('')}</datalist>` : ''}${cfg.after || ''}</div></div>`;
    const re = () => documents(body, p, cfg);
    body.querySelector('#dIn').onchange = async e => {
      const fs = [...e.target.files]; if (!fs.length) return;
      for (const f of fs) { const blobId = await DB.putBlob(f); await SD.put(cfg.coll, p.id, { titre: f.name.replace(/\.[^.]+$/, ''), fichier: f.name, type: f.type, taille: f.size, blobId, indice: '', date: today(), lot: '' }); }
      toast(fs.length + ' fichier(s) déposé(s)'); re();
    };
    body.querySelectorAll('[data-k]').forEach(el => el.addEventListener('change', async () => { const r = rows[+el.dataset.i]; r[el.dataset.k] = el.value; await SD.put(cfg.coll, p.id, r); }));
    body.querySelectorAll('[data-open]').forEach(b => b.onclick = async () => { const r = rows[+b.dataset.open]; const u = await BlobURL(r.blobId); if (!u) return toast('Fichier pas encore disponible sur cet appareil (synchronisation en cours)'); const a = document.createElement('a'); a.href = u; a.target = '_blank'; a.rel = 'noopener'; if (!/pdf|image/.test(r.type || '')) a.download = r.fichier || 'document'; document.body.appendChild(a); a.click(); a.remove(); });
    body.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { if (!confirm('Retirer ce document ?')) return; await SD.del(cfg.coll, p.id, rows[+b.dataset.del]); re(); });
  }

  /* ---------- réserves (TerraChantier) ---------- */
  const RES_ST = { ouverte: 'Ouverte', encours: 'En cours', levee: 'Levée' };
  function resTable(res, lots, { withLevee } = {}) {
    if (!res.length) return '<p>Aucune réserve.</p>';
    const byLot = new Map(); res.forEach(r => { const k = r.lotId || ''; if (!byLot.has(k)) byLot.set(k, []); byLot.get(k).push(r); });
    return [...byLot.entries()].map(([lid, L]) => { const l = lots.find(x => x.id === lid); return `<h2>${E(l ? lotLabel(l) : 'Sans lot')}</h2><table class="pt"><thead><tr><th>N°</th><th>Localisation</th><th>Description</th><th>Constat</th>${withLevee ? '<th>Levée</th>' : '<th>Échéance</th>'}<th>État</th></tr></thead><tbody>${L.map(r => `<tr><td>${E(r.numero || '')}</td><td>${E(r.localisation || '')}</td><td>${E(r.description || '')}</td><td>${dFr(r.dateConstat)}</td><td>${withLevee ? dFr(r.dateLevee) : dFr(r.echeance)}</td><td>${E(RES_ST[r.statut] || r.statut || '')}</td></tr>`).join('')}</tbody></table>`; }).join('');
  }

  async function pvOpr(p, body) {
    const C = await chantierOf(p), recs = await SD.list('pvopr', p.id), rec = recs[0] || { date: today(), presents: '', notes: '' };
    const open = C.res.filter(r => r.statut !== 'levee');
    body.innerHTML = `<div class="wrap"><div class="card">
      <div class="row" style="justify-content:space-between"><h2 style="margin:0">PV d'opérations préalables à la réception</h2><button class="btn pri" id="pPr">Imprimer le PV</button></div>
      <div class="grid2" style="margin-top:12px"><label class="f">Date des OPR<input type="date" id="pD" value="${E(rec.date)}"></label><label class="f">Présents<input id="pP" value="${E(rec.presents)}" placeholder="MOA, MOE, entreprises…"></label></div>
      <label class="f" style="margin-top:10px">Observations<textarea id="pN">${E(rec.notes)}</textarea></label>
      ${C.res.length ? `<p class="muted" style="margin:12px 0 0">${open.length} réserve(s) ouverte(s) sur ${C.res.length}, ${new Set(open.map(r => r.lotId)).size} lot(s) concerné(s).</p>` : `<div class="note" style="margin-top:12px;padding:10px 12px;border-radius:10px;background:var(--accent-soft,#f6e7e0)"><b>Aucune réserve relevée.</b> Relevez d'abord les réserves sur place (OPR › Réserves) : le PV les reprend par lot. <a href="#/p/${p.id}/opr/opr">Relever les réserves</a></div>`}</div></div>`;
    const save = async () => { rec.date = body.querySelector('#pD').value; rec.presents = body.querySelector('#pP').value; rec.notes = body.querySelector('#pN').value; await SD.put('pvopr', p.id, rec); };
    body.querySelectorAll('input,textarea').forEach(el => el.addEventListener('change', save));
    body.querySelector('#pPr').onclick = async () => { if (!C.res.length && !confirm('Aucune réserve relevée : imprimer un PV sans réserve ?')) return; await save(); printDoc("Procès-verbal des opérations préalables à la réception", p, `<p>Opérations préalables à la réception effectuées le <b>${dFr(rec.date)}</b>.${rec.presents ? '<br>Présents : ' + E(rec.presents) : ''}</p>${rec.notes ? '<p>' + E(rec.notes) + '</p>' : ''}<p>Liste des réserves constatées, par lot :</p>${resTable(open, C.lots)}${sign(['Maître d\'ouvrage', 'Maître d\'œuvre', 'Entreprise(s)'])}`); };
  }

  const PV_TYPES = ['Réception sans réserve', 'Réception avec réserves', 'Levée des réserves', 'Non-réception'];
  async function pvReception(p, body) {
    const C = await chantierOf(p);
    await table(body, p, {
      coll: 'pv', title: 'PV de réception, PV de levée des réserves', addLabel: 'PV',
      hint: "La date de réception fait courir les garanties (parfait achèvement 1 an, biennale 2 ans, décennale 10 ans). Les PV reprennent les réserves de TerraChantier.",
      cols: [{ k: 'type', lab: 'PV', type: 'select', opts: PV_TYPES, w: 200 }, { k: 'date', lab: 'Date', type: 'date' }, { k: 'lots', lab: 'Lots', type: 'select', opts: 'lots', w: 220 }, { k: 'delai', lab: 'Délai de levée', ph: '30 jours' }, { k: 'notes', lab: 'Observations', w: 220 }, { k: 'signe', lab: 'Signé', type: 'check' }],
      empty: "Aucun PV. « + PV » prépare un PV de réception ou de levée des réserves.",
      newRec: rows => ({ type: rows.some(r => /^Réception/.test(r.type)) ? 'Levée des réserves' : (C.res.some(r => r.statut !== 'levee') ? 'Réception avec réserves' : 'Réception sans réserve'), date: today(), lots: '', delai: '', notes: '', signe: false, ordre: String(rows.length + 1).padStart(3, '0') }),
      after: rows => `<div class="row" style="margin-top:12px;flex-wrap:wrap">${rows.map((r, i) => `<button class="btn sm" data-pv="${i}">Imprimer : ${E(r.type)}${r.date ? ' du ' + dFr(r.date) : ''}</button>`).join('')}</div>`,
      redraw: true,
      bind: rows => body.querySelectorAll('[data-pv]').forEach(b => b.onclick = () => {
      const r = rows[+b.dataset.pv], lotTxt = r.lots ? 'Lot concerné : ' + E(r.lots) : 'Tous corps d\'état';
      const lotsF = r.lots ? C.lots.filter(l => lotLabel(l) === r.lots).map(l => l.id) : null, inLot = x => !lotsF || lotsF.includes(x.lotId);
      const open = C.res.filter(x => x.statut !== 'levee' && inLot(x)), done = C.res.filter(x => x.statut === 'levee' && inLot(x));
      let html = `<p>${lotTxt}.</p>`;
      if (r.type === 'Réception sans réserve') html += `<p>Le maître d'ouvrage, après avoir procédé aux opérations préalables, prononce la réception des travaux <b>sans réserve</b> avec effet au <b>${dFr(r.date)}</b>.</p>`;
      if (r.type === 'Réception avec réserves') html += `<p>Le maître d'ouvrage prononce la réception des travaux avec effet au <b>${dFr(r.date)}</b>, <b>assortie des réserves</b> ci-dessous, que les entreprises s'engagent à lever${r.delai ? ' dans un délai de ' + E(r.delai) : ''}.</p>${resTable(open, C.lots)}`;
      if (r.type === 'Levée des réserves') html += `<p>Les réserves ci-dessous, formulées à la réception, ont été levées. Constat du <b>${dFr(r.date)}</b>.</p>${resTable(done, C.lots, { withLevee: true })}${open.length ? `<p>Réserves restant à lever :</p>${resTable(open, C.lots)}` : '<p><b>Toutes les réserves sont levées.</b></p>'}`;
      if (r.type === 'Non-réception') html += `<p>Le maître d'ouvrage refuse de prononcer la réception à la date du <b>${dFr(r.date)}</b>, pour les motifs suivants :</p><p>${E(r.notes || '…')}</p>`;
      if (r.notes && r.type !== 'Non-réception') html += `<p>Observations : ${E(r.notes)}</p>`;
      printDoc(r.type === 'Levée des réserves' ? 'Procès-verbal de levée des réserves' : r.type === 'Non-réception' ? 'Procès-verbal de non-réception' : 'Procès-verbal de réception des travaux', p, html + sign(['Maître d\'ouvrage', 'Maître d\'œuvre', 'Entreprise']));
      })
    });
  }

  const OS_TYPES = ['Démarrage des travaux', 'Travaux modificatifs', 'Travaux supplémentaires', 'Arrêt des travaux', 'Reprise des travaux', 'Prolongation de délai', 'Autre'];
  const osModule = (p, body) => table(body, p, {
    coll: 'os', title: 'Ordres de service', addLabel: 'OS', hint: 'Numérotation, objet, montant et incidence sur le délai ; imprimable pour signature.',
    cols: [{ k: 'num', lab: 'N°', w: 60 }, { k: 'date', lab: 'Date', type: 'date' }, { k: 'type', lab: 'Nature', type: 'select', opts: OS_TYPES, w: 190 }, { k: 'lot', lab: 'Lot, entreprise', type: 'select', opts: 'lots', w: 220 }, { k: 'objet', lab: 'Objet', w: 240 }, { k: 'montant', lab: 'Montant HT', num: true, w: 120 }, { k: 'delai', lab: 'Délai (j)', num: true, w: 80 }, { k: 'signe', lab: 'Signé', type: 'check' }],
    empty: "Aucun ordre de service. « + OS » ajoute l'OS de démarrage.",
    newRec: rows => ({ num: String(rows.length + 1), date: today(), type: rows.length ? 'Travaux modificatifs' : 'Démarrage des travaux', lot: '', objet: '', montant: '', delai: '', signe: false, ordre: String(rows.length + 1).padStart(3, '0') }),
    foot: rows => `<tr><td colspan="5" style="text-align:right;font-weight:700">Total des OS</td><td style="text-align:right;font-weight:700;padding-right:18px">${eur(rows.reduce((a, r) => a + num(r.montant), 0))}</td><td style="text-align:right;font-weight:700;padding-right:18px">${rows.reduce((a, r) => a + num(r.delai), 0) || ''}</td><td colspan="2"></td></tr>`,
    print: rows => printDoc('Ordres de service', p, `<table class="pt"><thead><tr><th>N°</th><th>Date</th><th>Nature</th><th>Lot, entreprise</th><th>Objet</th><th>Montant HT</th><th>Délai</th></tr></thead><tbody>${rows.map(r => `<tr><td>${E(r.num)}</td><td>${dFr(r.date)}</td><td>${E(r.type)}</td><td>${E(r.lot)}</td><td>${E(r.objet)}</td><td style="text-align:right">${eur(r.montant)}</td><td>${E(r.delai ? r.delai + ' j' : '')}</td></tr>`).join('')}</tbody></table>${sign(['Maître d\'ouvrage', 'Maître d\'œuvre', 'Entreprise'])}`)
  });

  const situations = (p, body) => table(body, p, {
    coll: 'situations', title: 'Situations de travaux', addLabel: 'Situation', hint: "Montants cumulés par lot et par mois ; le visa de l'architecte est daté. Le tableau d'avancement s'imprime.",
    cols: [{ k: 'num', lab: 'N°', w: 60 }, { k: 'mois', lab: 'Mois', type: 'month' }, { k: 'lot', lab: 'Lot, entreprise', type: 'select', opts: 'lots', w: 220 }, { k: 'marche', lab: 'Marché HT', num: true, w: 120 }, { k: 'cumul', lab: 'Cumul HT', num: true, w: 120 }, { k: 'visa', lab: 'Visa MOE', type: 'date' }, { k: 'notes', lab: 'Notes', w: 180 }],
    empty: 'Aucune situation.',
    newRec: rows => ({ num: String(rows.length + 1), mois: today().slice(0, 7), lot: '', marche: '', cumul: '', visa: '', notes: '', ordre: String(rows.length + 1).padStart(3, '0') }),
    redraw: true,
    after: rows => { const last = new Map(); rows.forEach(r => { const k = r.lot || '—'; const c = last.get(k); if (!c || String(r.mois) >= String(c.mois)) last.set(k, r); });
      return last.size ? `<h2 style="margin:16px 0 6px;font-size:15px">Avancement par lot (dernière situation)</h2><div class="tscroll"><table class="t"><thead><tr><th>Lot, entreprise</th><th>Mois</th><th style="text-align:right">Marché HT</th><th style="text-align:right">Cumul HT</th><th style="text-align:right">Avancement</th></tr></thead><tbody>${[...last.entries()].map(([k, r]) => `<tr><td>${E(k)}</td><td>${E(r.mois || '')}</td><td style="text-align:right">${eur(r.marche)}</td><td style="text-align:right">${eur(r.cumul)}</td><td style="text-align:right">${num(r.marche) ? Math.round(num(r.cumul) / num(r.marche) * 100) + ' %' : ''}</td></tr>`).join('')}</tbody></table></div>` : ''; },
    print: rows => printDoc('Situations de travaux', p, `<table class="pt"><thead><tr><th>N°</th><th>Mois</th><th>Lot, entreprise</th><th>Marché HT</th><th>Cumul HT</th><th>Avancement</th><th>Visa</th></tr></thead><tbody>${rows.map(r => `<tr><td>${E(r.num)}</td><td>${E(r.mois)}</td><td>${E(r.lot)}</td><td style="text-align:right">${eur(r.marche)}</td><td style="text-align:right">${eur(r.cumul)}</td><td>${num(r.marche) ? Math.round(num(r.cumul) / num(r.marche) * 100) + ' %' : ''}</td><td>${dFr(r.visa)}</td></tr>`).join('')}</tbody></table>`)
  });

  const GPA_ST = ['Signalé', "Transmis à l'entreprise", 'Intervention programmée', 'Réglé', 'Contesté'];
  const gpa = (p, body) => table(body, p, {
    coll: 'gpa', title: 'Désordres signalés pendant la garantie de parfait achèvement', addLabel: 'Désordre', hint: "Réclamations du maître d'ouvrage dans l'année qui suit la réception ; suivi jusqu'à l'intervention de l'entreprise.",
    cols: [{ k: 'date', lab: 'Signalé le', type: 'date' }, { k: 'localisation', lab: 'Localisation', w: 150 }, { k: 'description', lab: 'Désordre', w: 260 }, { k: 'lot', lab: 'Lot, entreprise', type: 'select', opts: 'lots', w: 220 }, { k: 'etat', lab: 'État', type: 'select', opts: GPA_ST, w: 190 }, { k: 'intervention', lab: 'Intervention', type: 'date' }],
    empty: 'Aucun désordre signalé.',
    newRec: () => ({ date: today(), localisation: '', description: '', lot: '', etat: 'Signalé', intervention: '' }),
    print: rows => printDoc('Suivi des désordres (garantie de parfait achèvement)', p, `<table class="pt"><thead><tr><th>Signalé le</th><th>Localisation</th><th>Désordre</th><th>Lot, entreprise</th><th>État</th><th>Intervention</th></tr></thead><tbody>${rows.map(r => `<tr><td>${dFr(r.date)}</td><td>${E(r.localisation)}</td><td>${E(r.description)}</td><td>${E(r.lot)}</td><td>${E(r.etat)}</td><td>${dFr(r.intervention)}</td></tr>`).join('')}</tbody></table>`)
  });

  async function finGpa(p, body) {
    const pvs = await SD.list('pv', p.id), rec = pvs.filter(r => /^Réception/.test(r.type) && r.date).sort((a, b) => String(a.date).localeCompare(String(b.date)))[0];
    const des = await SD.list('gpa', p.id), ouverts = des.filter(d => d.etat !== 'Réglé');
    const add = (d, y) => { const x = new Date(d + 'T12:00'); x.setFullYear(x.getFullYear() + y); return x.toISOString().slice(0, 10); };
    const fin = rec ? add(rec.date, 1) : '', jours = fin ? Math.ceil((new Date(fin + 'T12:00') - new Date()) / 864e5) : null;
    body.innerHTML = `<div class="wrap"><div class="grid3">
      <div class="card"><h2>Garanties</h2>${rec ? `<div class="list"><div class="li"><div><div class="m">Réception</div>${dFr(rec.date)} (${E(rec.type.toLowerCase())})</div></div><div class="li"><div><div class="m">Fin de la garantie de parfait achèvement</div><b>${dFr(fin)}</b> ${jours > 0 ? `· dans ${jours} jour(s)` : '· échue'}</div></div><div class="li"><div><div class="m">Fin de la garantie biennale (bon fonctionnement)</div>${dFr(add(rec.date, 2))}</div></div><div class="li"><div><div class="m">Fin de la garantie décennale</div>${dFr(add(rec.date, 10))}</div></div></div>` : '<p class="empty">Date de réception inconnue : saisissez le PV de réception (onglet Réception).</p>'}</div>
      <div class="card"><h2>Désordres non réglés</h2>${ouverts.length ? `<div class="list">${ouverts.map(d => `<div class="li"><div><div>${E(d.description || 'Désordre')}</div><div class="m">${E([dFr(d.date), d.lot, d.etat].filter(Boolean).join(' · '))}</div></div></div>`).join('')}</div>` : '<p class="empty">Aucun.</p>'}
        <button class="btn" id="fPr" style="margin-top:10px" ${rec ? '' : 'disabled'}>Imprimer le constat de fin de GPA</button></div></div></div>`;
    const b = body.querySelector('#fPr'); if (b && rec) b.onclick = () => printDoc('Fin de la garantie de parfait achèvement', p, `<p>Réception prononcée le <b>${dFr(rec.date)}</b>. La garantie de parfait achèvement (article 1792-6 du Code civil) prend fin le <b>${dFr(fin)}</b>.</p>${ouverts.length ? `<p>Désordres signalés et non réglés à ce jour :</p><table class="pt"><thead><tr><th>Signalé le</th><th>Localisation</th><th>Désordre</th><th>Lot, entreprise</th><th>État</th></tr></thead><tbody>${ouverts.map(d => `<tr><td>${dFr(d.date)}</td><td>${E(d.localisation)}</td><td>${E(d.description)}</td><td>${E(d.lot)}</td><td>${E(d.etat)}</td></tr>`).join('')}</tbody></table>` : '<p>Aucun désordre signalé ne reste à régler.</p>'}${sign(['Maître d\'ouvrage', 'Maître d\'œuvre'])}`);
  }

  /* ---------- marchés de travaux : un marché par lot du marché du projet (entreprise retenue dans la fiche, montant, dates) ---------- */
  async function marches(p, body) {
    const P = (typeof TSP !== 'undefined' && await TSP.get(p.id)) || p, L = (P.lots || []).slice().sort((a, b) => String(a.num || '').localeCompare(String(b.num || ''), 'fr', { numeric: true }));
    const recs = await SD.list('marches', p.id), by = new Map(recs.map(r => [r.lotId, r]));
    const fiche = `#/p/${p.id}/projet/fiche`;
    if (!L.length) { body.innerHTML = `<div class="wrap"><div class="card"><h2 style="margin-top:0">Marchés de travaux</h2><p class="muted">Aucun lot du marché pour ce projet. Les lots du marché (allotissement) et les entreprises retenues se définissent dans la fiche du projet ; un marché est ensuite suivi ici pour chaque lot.</p><a class="btn pri" href="${fiche}">Définir les lots du marché</a></div></div>`; return; }
    const rec = l => by.get(l.id) || { lotId: l.id, montant: '', signe: '', notifie: '', delai: '', notes: '' };
    const tot = L.reduce((a, l) => a + num(rec(l).montant), 0);
    body.innerHTML = `<div class="wrap"><div class="card">
      <div class="row" style="justify-content:space-between;margin-bottom:8px"><h2 style="margin:0">Marchés de travaux</h2><div class="row"><a class="btn" href="${fiche}">Lots et entreprises</a><button class="btn" id="mPr">Imprimer</button></div></div>
      <div class="tscroll"><table class="t"><thead><tr><th style="min-width:200px">Lot du marché</th><th style="min-width:200px">Entreprise retenue</th><th style="min-width:130px;text-align:right">Montant HT</th><th>Signé le</th><th>Notifié le</th><th style="min-width:90px">Délai (mois)</th><th style="min-width:180px">Notes</th></tr></thead><tbody>
      ${L.map(l => { const r = rec(l); return `<tr data-l="${E(l.id)}"><td><b>${E(l.num || '')}</b> ${E(l.nom || '')}</td><td>${l.ent && l.ent.nom ? E(l.ent.nom) : `<a href="${fiche}">à désigner</a>`}</td>
        <td><input data-k="montant" value="${E(r.montant)}" inputmode="decimal" style="text-align:right" aria-label="Montant HT"></td><td><input data-k="signe" type="date" value="${E(r.signe)}" aria-label="Signé le"></td><td><input data-k="notifie" type="date" value="${E(r.notifie)}" aria-label="Notifié le"></td><td><input data-k="delai" value="${E(r.delai)}" inputmode="decimal" aria-label="Délai en mois"></td><td><input data-k="notes" value="${E(r.notes)}" aria-label="Notes"></td></tr>`; }).join('')}
      </tbody><tfoot><tr><td colspan="2" style="text-align:right;font-weight:700">Total des marchés</td><td style="text-align:right;font-weight:700;padding-right:18px">${eur(tot)}</td><td colspan="4"></td></tr></tfoot></table></div>
      <p class="hint" style="margin:10px 0 0">L'entreprise retenue vient de la fiche du projet (lots du marché) ou de l'offre marquée « retenue » dans Devis d'entreprises.</p></div></div>`;
    body.querySelectorAll('tr[data-l] [data-k]').forEach(el => el.addEventListener('change', async () => { const l = L.find(x => x.id === el.closest('tr').dataset.l), r = rec(l); r[el.dataset.k] = el.value; by.set(l.id, await SD.put('marches', p.id, r)); if (el.dataset.k === 'montant') marches(p, body); }));
    body.querySelector('#mPr').onclick = () => printDoc('Récapitulatif des marchés de travaux', p, `<table class="pt"><thead><tr><th>Lot</th><th>Entreprise</th><th>Montant HT</th><th>Signé le</th><th>Notifié le</th><th>Délai</th></tr></thead><tbody>${L.map(l => { const r = rec(l); return `<tr><td>${E([l.num, l.nom].filter(Boolean).join(' '))}</td><td>${E(l.ent && l.ent.nom || '')}</td><td style="text-align:right">${eur(r.montant)}</td><td>${dFr(r.signe)}</td><td>${dFr(r.notifie)}</td><td>${E(r.delai ? r.delai + ' mois' : '')}</td></tr>`; }).join('')}<tr><td colspan="2"><b>Total</b></td><td style="text-align:right"><b>${eur(tot)}</b></td><td colspan="3"></td></tr></tbody></table>`);
  }

  /* ---------- rapport d'analyse des offres : offres reçues (DPGF importées dans TerraEstim) comparées par lot ---------- */
  function idbKV(dbName, key) { return new Promise(ok => { try { const r = indexedDB.open(dbName); r.onupgradeneeded = () => { try { r.transaction.abort(); } catch (e) {} ok(null); }; r.onsuccess = () => { const d = r.result; if (!d.objectStoreNames.contains('kv')) { d.close(); return ok(null); } const q = d.transaction('kv').objectStore('kv').get(key); q.onsuccess = () => { ok(q.result || null); d.close(); }; q.onerror = () => { ok(null); d.close(); }; }; r.onerror = () => ok(null); } catch (e) { ok(null); } }); }
  async function rapport(p, body) {
    const src = new Map();
    try { (await DB.all('docs')).filter(d => d.app === 'estim' && d.coll === 'sources' && !d.deleted && d.data && (d.projetId === p.id || d.data.projet === p.id)).forEach(d => src.set(String(d.rid), d.data)); } catch (e) {}
    const kv = await idbKV('terraestim', 'te-sources'); Object.entries(kv || {}).filter(([, s]) => s && s.projet === p.id).forEach(([k, s]) => src.set(k, s));
    const S = [...src.entries()].map(([id, s]) => ({ id, ...s }));
    const offres = `#/p/${p.id}/act/offres`;
    if (!S.length) { body.innerHTML = `<div class="wrap"><div class="card"><h2 style="margin-top:0">Rapport d'analyse des offres</h2><p class="muted">Aucune offre reçue pour ce projet. Importez les DPGF remplies par les entreprises dans « Devis d'entreprises » : elles sont comparées ici lot par lot (montant, rang, écarts).</p><a class="btn pri" href="${offres}">Importer des offres</a></div></div>`; return; }
    const G = new Map(); S.forEach(s => { const k = (s.lots && s.lots.length ? s.lots.join(' + ') : s.lot) || 'Sans lot'; if (!G.has(k)) G.set(k, []); G.get(k).push(s); });
    const pct = (a, b) => b ? (a - b) / b * 100 : 0, fP = v => (v > 0 ? '+' : '') + v.toFixed(1).replace('.', ',') + ' %';
    const blocks = [...G.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0]), 'fr', { numeric: true })).map(([lot, L]) => {
      L.sort((a, b) => num(a.montant) - num(b.montant)); const min = num(L[0].montant), moy = L.reduce((a, s) => a + num(s.montant), 0) / L.length;
      return { lot, rows: L.map((s, i) => ({ ent: s.entreprise || '—', m: num(s.montant), rang: i + 1, eMin: pct(num(s.montant), min), eMoy: pct(num(s.montant), moy), ret: !!s.retenue, mois: s.mois || '' })), moy };
    });
    const tbl = (b, cls) => `<table class="${cls}"><thead><tr><th>Rang</th><th>Entreprise</th><th style="text-align:right">Montant HT</th><th style="text-align:right">Écart au moins-disant</th><th style="text-align:right">Écart à la moyenne</th><th></th></tr></thead><tbody>${b.rows.map(r => `<tr><td>${r.rang}</td><td>${E(r.ent)}</td><td style="text-align:right">${eur(r.m)}</td><td style="text-align:right">${r.rang === 1 ? '—' : fP(r.eMin)}</td><td style="text-align:right">${fP(r.eMoy)}</td><td>${r.ret ? '<b>retenue</b>' : ''}</td></tr>`).join('')}</tbody></table>`;
    body.innerHTML = `<div class="wrap"><div class="card">
      <div class="row" style="justify-content:space-between;margin-bottom:8px"><h2 style="margin:0">Rapport d'analyse des offres</h2><div class="row"><a class="btn" href="${offres}">Offres reçues</a><button class="btn" id="rPr">Imprimer</button></div></div>
      <p class="muted" style="margin:0 0 10px">${S.length} offre${S.length > 1 ? 's' : ''} sur ${G.size} lot${G.size > 1 ? 's' : ''}. La comparaison ligne à ligne et le choix de l'entreprise retenue se font dans « Devis d'entreprises ».</p>
      ${blocks.map(b => `<h3 style="margin:14px 0 6px">Lot ${E(b.lot)} <span class="hint">· ${b.rows.length} offre${b.rows.length > 1 ? 's' : ''}, moyenne ${eur(b.moy)}</span></h3><div class="tscroll">${tbl(b, 't')}</div>`).join('')}</div></div>`;
    body.querySelector('#rPr').onclick = () => printDoc("Rapport d'analyse des offres", p, blocks.map(b => `<h2>Lot ${E(b.lot)}</h2>${tbl(b, 'pt')}`).join('') + sign(["Maître d'œuvre"]));
  }

  /* ---------- règles du PLU : analyse du règlement préparée par Claude (format terrasuite-plu), règle par règle avec l'extrait cité ---------- */
  async function plu(p, body) {
    const recs = await SD.list('plu', p.id), r = recs.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))[0];
    const imp = `<button class="btn" id="pluImp">Importer l'analyse de Claude</button>`, get = `<button class="btn${r ? '' : ' pri'}" id="pluGet">${r ? 'Récupérer à nouveau' : 'Récupérer le règlement'}</button>`;
    if (!r) { body.innerHTML = `<div class="wrap"><div class="card"><h2 style="margin-top:0">Règles du PLU</h2><p class="muted">« Récupérer le règlement » cherche la zone au point du projet (étude de site, sinon adresse de la fiche) sur le Géoportail de l'urbanisme, télécharge le règlement et en extrait le chapitre de la zone, article par article, rangé par thème. Pour les valeurs relevées (hauteurs, reculs, emprise, stationnement…) avec leur extrait, demandez ensuite l'analyse à Claude et importez le fichier qu'il vous rend.</p><div class="row" style="gap:8px;flex-wrap:wrap">${get}${imp}</div><p class="hint" id="pluSt"></p></div></div>`; bindImp(); return; }
    const R = Array.isArray(r.regles) ? r.regles : [], G = new Map(); R.forEach(x => { const k = x.theme || 'Autres règles'; if (!G.has(k)) G.set(k, []); G.get(k).push(x); });
    const C = r.constructible || {}, cKeys = Object.entries(C).filter(([, v]) => v !== '' && v !== null && v !== undefined);
    const regle = x => r.auto ? `<details class="plur"><summary><b>${E(x.regle || '')}</b> <span class="hint">p. ${E(x.page || '')}</span></summary><blockquote style="white-space:pre-wrap">${E(x.extrait || '')}</blockquote></details>` : `<div class="plur"><div class="row" style="justify-content:space-between;gap:8px;align-items:baseline"><b>${E(x.regle || '')}</b>${x.valeur ? `<span class="badge cur">${E(x.valeur)}</span>` : ''}</div>${x.extrait ? `<blockquote>${E(x.extrait)}</blockquote>` : ''}<div class="hint">${E([x.article, x.page ? 'p. ' + x.page : ''].filter(Boolean).join(' · '))}${x.attention ? ` · <span style="color:var(--warn)">${E(x.attention)}</span>` : ''}</div></div>`;
    body.innerHTML = `<div class="wrap" style="max-width:980px"><div class="card">
      <div class="row" style="justify-content:space-between;margin-bottom:6px;flex-wrap:wrap;gap:8px"><h2 style="margin:0">Règles du PLU${r.zone ? ' · zone ' + E(r.zone) : ''}${r.zoneNom ? ' <span class="hint">' + E(r.zoneNom) + '</span>' : ''}</h2><div class="row" style="gap:8px;flex-wrap:wrap">${get}${imp}<button class="btn" id="pluPr">Imprimer</button></div></div><p class="hint" id="pluSt"></p>
      ${r.auto ? `<div class="card note" style="margin:8px 0 12px"><div style="flex:1"><b>Texte du règlement, non analysé.</b> ${r.parcelles ? 'Parcelle ' + E(r.parcelles) + '. ' : ''}Chapitre de la zone ${E(r.zone)} ${r.chapitreTrouve ? `(pages ${E((r.pages || []).join(' à '))})` : '(chapitre non repéré : pages qui citent la zone)'}, découpé en articles. Pour les valeurs relevées et la synthèse, copiez la demande et collez-la dans une conversation avec Claude, puis importez le fichier qu'il vous rend.${r.url ? ` <a href="${E(r.url)}" target="_blank" rel="noopener">Règlement complet (PDF)</a>` : ''}</div><button class="btn sm" id="pluAsk">Copier la demande pour Claude</button></div>` : ''}
      <p class="muted" style="margin:0 0 10px">${E([r.commune, r.document, r.version ? 'version ' + r.version : '', r.date ? 'analyse du ' + dFr(r.date) : ''].filter(Boolean).join(' · '))}</p>
      ${cKeys.length ? `<div class="grid3 pluc">${cKeys.map(([k, v]) => `<div class="card" style="padding:10px 12px"><div class="hint">${E(k)}</div><div style="font-weight:700">${E(v)}</div></div>`).join('')}</div>` : ''}
      ${r.synthese ? `<p style="margin:12px 0">${E(r.synthese)}</p>` : ''}
      ${[...G.entries()].map(([g, L]) => `<h3 style="margin:16px 0 6px">${E(g)}</h3>${L.map(regle).join('')}`).join('')}
      <p class="hint" style="margin-top:14px">Analyse préparée par Claude à partir du règlement fourni ; seul le règlement opposable fait foi. Vérifiez les extraits avant tout dépôt.</p></div></div>`;
    bindImp();
    body.querySelector('#pluPr').onclick = () => printDoc('Règles du PLU' + (r.zone ? ' · zone ' + r.zone : ''), p, `<p>${E([r.commune, r.document, r.version].filter(Boolean).join(' · '))}</p>${cKeys.length ? `<table class="pt"><tbody>${cKeys.map(([k, v]) => `<tr><th>${E(k)}</th><td>${E(v)}</td></tr>`).join('')}</tbody></table>` : ''}${[...G.entries()].map(([g, L]) => `<h2>${E(g)}</h2><table class="pt"><thead><tr><th>Règle</th><th>Valeur</th><th>Extrait</th><th>Article</th></tr></thead><tbody>${L.map(x => `<tr><td>${E(x.regle || '')}</td><td>${E(x.valeur || '')}</td><td>${E(x.extrait || '')}</td><td>${E([x.article, x.page ? 'p. ' + x.page : ''].filter(Boolean).join(' · '))}</td></tr>`).join('')}</tbody></table>`).join('')}`);
    function bindImp() {
      const st = t => { const e = body.querySelector('#pluSt'); if (e) e.textContent = t; };
      body.querySelector('#pluGet').onclick = async e => { e.target.disabled = true;
        try { let geo = []; try { geo = JSON.parse(localStorage.getItem('tg-fiches') || '[]').filter(f => f.projet === p.id); geo.push(...(await DB.all('docs')).filter(d => d.app === 'geo' && d.coll === 'fiches' && d.projetId === p.id && !d.deleted && d.data).map(d => d.data)); } catch (x) {}
          const pt = await TSPLU.locate(p, geo); if (!pt) throw new Error("projet non situé : choisissez la parcelle dans ESQ › Site ou renseignez l'adresse dans la fiche");
          const R = await TSPLU.fetchFor(pt, st); if (!R.A.length) throw new Error(`règlement lu (${R.pages.length} pages) mais chapitre de la zone ${R.z.libelle} introuvable ; ouvrez le PDF : ${R.url}`);
          if (r && !r.auto && !confirm("Remplacer l'analyse de Claude par le texte brut du règlement ?")) { e.target.disabled = false; st(''); return; }
          for (const o of recs) await SD.del('plu', p.id, o); await SD.put('plu', p.id, TSPLU.record(R, pt)); plu(p, body);
        } catch (x) { st('Impossible : ' + (x.message || x)); e.target.disabled = false; } };
      const ask = body.querySelector('#pluAsk'); if (ask) ask.onclick = async () => { const t = `Analyse le PLU du projet ${[p.code, p.nom].filter(Boolean).join(' · ')} : zone ${r.zone}${r.zoneNom ? ' (' + r.zoneNom + ')' : ''}, document ${r.document}${r.version ? ' approuvé le ' + r.version : ''}, règlement ${r.url}, point ${(r.point || []).map(v => (+v).toFixed(6)).join(', ')}, chapitre de la zone pages ${(r.pages || []).join(' à ')}. Rends-moi le fichier terrasuite-plu à importer.`;
        try { await navigator.clipboard.writeText(t); ask.textContent = 'Demande copiée'; } catch (x) { prompt('Copiez la demande :', t); } };
      body.querySelector('#pluImp').onclick = () => { const i = document.createElement('input'); i.type = 'file'; i.accept = '.json,application/json'; i.onchange = async () => { try { const J = JSON.parse(await i.files[0].text()); if (J.format !== 'terrasuite-plu') throw new Error('format terrasuite-plu attendu'); for (const o of recs) await SD.del('plu', p.id, o); await SD.put('plu', p.id, { ...J, date: J.date || today() }); plu(p, body); } catch (e) { alert('Import impossible : ' + (e.message || e)); } }; i.click(); }; }
  }

  /* ---------- programme : locaux et surfaces utiles (saisie, ou programme du maître d'ouvrage analysé par Claude, format terrasuite-programme), comparés à la maquette 3D ---------- */
  async function programme(p, body) {
    const recs = await SD.list('prog', p.id); let r = recs.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))[0] || null;
    const L = r && Array.isArray(r.locaux) ? r.locaux : [];
    const NF0 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }), su = x => num(x.surface) * (num(x.nombre) || 1);
    const save = async () => { r = r || { id: DB.uid(), format: 'terrasuite-programme', date: today(), locaux: L }; r.locaux = L; await SD.put('prog', p.id, r); };
    /* maquette 3D du projet (TerraModel) : surfaces de plancher par niveau */
    let mq = null; try { const m = (JSON.parse(localStorage.getItem('terramodel-maquettes') || '{}') || {})[p.id]; const N = m && m.surf && Array.isArray(m.surf.niveaux) ? m.surf.niveaux.filter(x => x && num(x.surface) > 0) : []; if (N.length) mq = N.reduce((a, x) => a + num(x.surface), 0); } catch (e) {}
    const tot = L.reduce((a, x) => a + su(x), 0), nb = L.reduce((a, x) => a + (num(x.nombre) || 1), 0);
    const key = x => [x.batiment || '', x.niveau || ''].join('\u0001'), G = new Map(); L.forEach((x, i) => { const k = key(x); if (!G.has(k)) G.set(k, []); G.get(k).push(i); });
    const imp = `<button class="btn${L.length ? '' : ' pri'}" id="prImp">${L.length ? 'Remplacer par un programme analysé' : 'Importer le programme analysé'}</button>`;
    const cell = (i, k, w, ph, inm) => `<td><input data-i="${i}" data-k="${k}" value="${E(L[i][k] ?? '')}"${ph ? ` placeholder="${E(ph)}"` : ''}${inm ? ' inputmode="decimal" style="text-align:right;width:' + w + 'px"' : ` style="min-width:${w}px"`} aria-label="${E(k)}"></td>`;
    body.innerHTML = `<div class="wrap" style="max-width:1100px"><div class="card">
      <div class="row" style="justify-content:space-between;margin-bottom:6px;flex-wrap:wrap;gap:8px"><h2 style="margin:0">Programme${r && r.titre ? ' · ' + E(r.titre) : ''}</h2><div class="row" style="gap:8px;flex-wrap:wrap">${imp}<button class="btn" id="prAdd">Local</button>${L.length ? '<button class="btn" id="prPr">Imprimer</button>' : ''}</div></div>
      ${L.length ? '' : `<p class="muted">Saisissez les locaux un à un (« Local »), ou déposez le programme du maître d'ouvrage (PDF, tableau, notes) dans une conversation avec Claude : il relève chaque local avec son nombre, sa surface utile, son bâtiment et son niveau, et vous renvoie un fichier à importer ici.</p>`}
      ${r && (r.source || r.synthese) ? `<p class="muted" style="margin:0 0 10px">${E([r.source, r.date ? 'analyse du ' + dFr(r.date) : ''].filter(Boolean).join(' · '))}</p>${r.synthese ? `<p style="margin:0 0 10px">${E(r.synthese)}</p>` : ''}` : ''}
      ${L.length ? `<div class="grid3" style="margin-bottom:12px"><div class="card" style="padding:10px 12px"><div class="hint">Surface utile du programme</div><div style="font-weight:700;font-size:18px">${NF0.format(tot)} m²</div><div class="hint">${nb} ${nb > 1 ? 'locaux' : 'local'}</div></div>
        <div class="card" style="padding:10px 12px"><div class="hint">Maquette 3D (surface de plancher)</div><div style="font-weight:700;font-size:18px">${mq ? NF0.format(mq) + ' m²' : '—'}</div><div class="hint">${mq ? 'rapport SU / SDP : ' + NF0.format(tot / mq * 100) + ' %' : 'niveaux à définir dans la maquette'}</div></div>
        <div class="card" style="padding:10px 12px"><div class="hint">Surface de plancher à prévoir</div><div style="font-weight:700;font-size:18px">≈ ${NF0.format(tot / 0.82)} m²</div><div class="hint">SU / 0,82 (circulations, murs, locaux techniques)${mq ? ' · écart maquette ' + (mq - tot / 0.82 >= 0 ? '+' : '') + NF0.format(mq - tot / 0.82) + ' m²' : ''}</div></div></div>
      <div class="tscroll"><table class="t"><thead><tr><th>Bâtiment</th><th>Niveau</th><th style="min-width:200px">Local</th><th>Nombre</th><th>Surface unitaire (m²)</th><th>Total (m²)</th><th style="min-width:180px">Exigences</th><th></th></tr></thead><tbody>
      ${[...G.entries()].map(([k, I]) => { const [b, n] = k.split('\u0001'), st = I.reduce((a, i) => a + su(L[i]), 0);
        return I.map(i => `<tr>${cell(i, 'batiment', 70)}${cell(i, 'niveau', 60, 'RDC')}${cell(i, 'nom', 200)}${cell(i, 'nombre', 50, '1', 1)}${cell(i, 'surface', 70, '', 1)}<td style="text-align:right;white-space:nowrap">${NF0.format(su(L[i]))}</td>${cell(i, 'exigences', 180)}<td><button class="btn sm danger" data-del="${i}" aria-label="Supprimer">✕</button></td></tr>`).join('')
          + (G.size > 1 ? `<tr class="prtot"><td colspan="5" style="text-align:right"><b>${E([b ? 'Bâtiment ' + b : '', n].filter(Boolean).join(' · ') || 'Sans niveau')}</b></td><td style="text-align:right"><b>${NF0.format(st)}</b></td><td colspan="2"></td></tr>` : ''); }).join('')}
      <tr class="prtot"><td colspan="5" style="text-align:right"><b>Total</b></td><td style="text-align:right"><b>${NF0.format(tot)}</b></td><td colspan="2"></td></tr></tbody></table></div>
      <p class="hint" style="margin-top:10px">Surfaces utiles du programme. Le rapport SU / SDP courant est de 0,80 à 0,85 en logement, 0,70 à 0,80 en équipement ; la surface de plancher de la maquette vient de ses niveaux (TerraModel).</p>` : ''}</div></div>`;
    const redraw = () => programme(p, body);
    body.querySelectorAll('[data-k]').forEach(el => el.addEventListener('change', async () => { L[+el.dataset.i][el.dataset.k] = el.value; await save(); redraw(); }));
    body.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { L.splice(+b.dataset.del, 1); await save(); redraw(); });
    body.querySelector('#prAdd').onclick = async () => { const last = L[L.length - 1] || {}; L.push({ batiment: last.batiment || '', niveau: last.niveau || '', nom: '', nombre: '1', surface: '', exigences: '' }); await save(); await redraw(); const ins = body.querySelectorAll(`[data-i="${L.length - 1}"][data-k="nom"]`); if (ins[0]) ins[0].focus(); };
    body.querySelector('#prImp').onclick = () => { const i = document.createElement('input'); i.type = 'file'; i.accept = '.json,application/json'; i.onchange = async () => { try { const J = JSON.parse(await i.files[0].text()); if (J.format !== 'terrasuite-programme') throw new Error('format terrasuite-programme attendu'); if (!Array.isArray(J.locaux) || !J.locaux.length) throw new Error('aucun local'); if (L.length && !confirm('Remplacer les ' + L.length + ' locaux actuels ?')) return; for (const o of recs) await SD.del('prog', p.id, o); await SD.put('prog', p.id, { ...J, locaux: J.locaux.map(x => ({ batiment: x.batiment || '', niveau: x.niveau || '', nom: x.nom || '', nombre: String(x.nombre ?? 1), surface: String(x.surface ?? ''), exigences: x.exigences || '' })), date: J.date || today() }); redraw(); } catch (e) { alert('Import impossible : ' + (e.message || e)); } }; i.click(); };
    const pr = body.querySelector('#prPr'); if (pr) pr.onclick = () => printDoc('Programme' + (r && r.titre ? ' · ' + r.titre : ''), p, `<table class="pt"><thead><tr><th>Bâtiment</th><th>Niveau</th><th>Local</th><th>Nombre</th><th>Surface unitaire</th><th>Total</th><th>Exigences</th></tr></thead><tbody>${L.map(x => `<tr><td>${E(x.batiment)}</td><td>${E(x.niveau)}</td><td>${E(x.nom)}</td><td>${E(x.nombre)}</td><td>${E(x.surface)}</td><td>${NF0.format(su(x))} m²</td><td>${E(x.exigences || '')}</td></tr>`).join('')}<tr><th colspan="5">Total surface utile</th><th>${NF0.format(tot)} m²</th><th></th></tr></tbody></table>`);
  }

  const MODS = {
    plans: (p, b) => documents(b, p, { coll: 'plans', title: "Plans et notice de l'avant-projet", hint: 'Plans, coupes, façades, notice descriptive, perspectives : avec indice et date ; repris pour le dossier de PC.', accept: '.pdf,image/*,.dwg,.dxf,.docx' }),
    dce: (p, b) => documents(b, p, { coll: 'dce', title: 'Dossier de consultation des entreprises', hint: 'Pièces du DCE : RC, CCAP, CCTP par lot, DPGF vierges, plans, planning. Le CCTP et la DPGF se génèrent dans le sous-onglet Descriptif (TerraEstim).', lot: true }),
    doe: (p, b) => documents(b, p, { coll: 'doe', title: 'DOE, DIUO', hint: "Dossiers des ouvrages exécutés reçus par lot (plans d'exécution, notices, fiches techniques, PV d'essais), DIUO du coordonnateur SPS.", lot: true }),
    secu: (p, b) => TSSecu.view(p, b, { SD, printDoc, dFr, today }),
    plu, prog: programme, marches, rapport, os: osModule, situations, pvopr: pvOpr, pv: pvReception, gpa, fingpa: finGpa
  };
  return { MODS, SD };
})();
