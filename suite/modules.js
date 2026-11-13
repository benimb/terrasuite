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
      <p class="muted" style="margin:12px 0 0">${open.length} réserve(s) ouverte(s) sur ${C.res.length}, ${new Set(open.map(r => r.lotId)).size} lot(s) concerné(s).</p></div></div>`;
    const save = async () => { rec.date = body.querySelector('#pD').value; rec.presents = body.querySelector('#pP').value; rec.notes = body.querySelector('#pN').value; await SD.put('pvopr', p.id, rec); };
    body.querySelectorAll('input,textarea').forEach(el => el.addEventListener('change', save));
    body.querySelector('#pPr').onclick = async () => { await save(); printDoc("Procès-verbal des opérations préalables à la réception", p, `<p>Opérations préalables à la réception effectuées le <b>${dFr(rec.date)}</b>.${rec.presents ? '<br>Présents : ' + E(rec.presents) : ''}</p>${rec.notes ? '<p>' + E(rec.notes) + '</p>' : ''}<p>Liste des réserves constatées, par lot :</p>${resTable(open, C.lots)}${sign(['Maître d\'ouvrage', 'Maître d\'œuvre', 'Entreprise(s)'])}`); };
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

  const MODS = {
    plans: (p, b) => documents(b, p, { coll: 'plans', title: "Plans et notice de l'avant-projet", hint: 'Plans, coupes, façades, notice descriptive, perspectives : avec indice et date ; repris pour le dossier de PC.', accept: '.pdf,image/*,.dwg,.dxf,.docx' }),
    dce: (p, b) => documents(b, p, { coll: 'dce', title: 'Dossier de consultation des entreprises', hint: 'Pièces du DCE : RC, CCAP, CCTP par lot, DPGF vierges, plans, planning. Le CCTP et la DPGF se génèrent dans le sous-onglet Descriptif (TerraEstim).', lot: true }),
    doe: (p, b) => documents(b, p, { coll: 'doe', title: 'DOE, DIUO', hint: "Dossiers des ouvrages exécutés reçus par lot (plans d'exécution, notices, fiches techniques, PV d'essais), DIUO du coordonnateur SPS.", lot: true }),
    os: osModule, situations, pvopr: pvOpr, pv: pvReception, gpa, fingpa: finGpa
  };
  return { MODS, SD };
})();
