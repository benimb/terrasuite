/* TerraContacts : carnet de contacts de la suite (maîtres d'ouvrage, bureaux d'études, entreprises…) et fiche de l'agence.
   Les contacts servent aux chantiers (intervenants, destinataires des photos et des CR) et, par le format d'échange, aux autres applications. */
const APP_VERSION = '0.9.2';
const S = { _fresh: true }; // utilisé par la synchronisation
let F = { role: '', q: '' };

const topBar = () => `<div class="top">${suiteBtn()}<h1><span class="brand">Terra<b>Contacts</b></span> <span class="ver">v${APP_VERSION} bêta</span><small>Projets, contacts et agence</small></h1><span class="sync" id="syncSt" title="Synchronisation"><i></i></span><button class="icon-btn" id="bSet" aria-label="Réglages">${ICON.gear}</button></div>`;
/* accueil : page d'entrée quand TerraContacts est ouvert seul ; dans TerraSuite (cadre), la bibliothèque « Contacts » ouvre directement le carnet */
const EMBED = window.self !== window.top;
const tabs = cur => `<nav class="tabs">${[...(EMBED ? [] : [['accueil', 'Accueil']]), ['projets', 'Projets'], ['contacts', 'Contacts'], ['agence', 'Mon agence'], ['compte', 'Mon compte']].map(([k, t]) => `<a href="#/${k}" class="${k === cur ? 'on' : ''}">${t}</a>`).join('')}<a href="./">TerraChantier →</a></nav>`;

async function render() {
  let r = location.hash.replace(/^#\/?/, '').split('/')[0]; const app = $('#app');
  if (!r) r = EMBED ? 'contacts' : 'accueil';
  await DB.silent(() => Carnet.load());
  /* fiche d'un projet ouverte dans TerraSuite : la suite donne déjà le projet et la navigation */
  const inProj = EMBED && r === 'projets' && /^#\/?projets\/[^/]+/.test(location.hash);
  app.classList.toggle('in-proj', inProj);
  app.innerHTML = topBar() + (inProj ? '' : tabs(r)) + '<main id="main"></main>';
  $('#bSet').onclick = settingsSheet; if (typeof TSUndo !== 'undefined') TSUndo.buttons($('.top'), { cls: 'icon-btn', before: $('#syncSt') }); Sync.paint();
  const seg = location.hash.replace(/^#\/?/, '').split('/');
  if (r === 'projets') return seg[1] ? Projets.fiche($('#main'), seg[1]) : Projets.list($('#main'));
  if (r === 'compte') return viewCompte($('#main'));
  if (r === 'accueil') return viewAccueil($('#main'));
  (r === 'agence' ? viewAgence : viewList)($('#main'));
}
window.addEventListener('hashchange', render);

/* ---------- accueil : grandes actions et projets récents ---------- */
async function viewAccueil(m) {
  m.style.padding = '0'; m.innerHTML = '<div id="oriC"></div>';
  const all = await TSP.all(), act = all.filter(p => p.statut !== 'archive' && p.statut !== 'termine').sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
  const nC = Carnet.sorted().length, ag = Carnet.agence();
  const newContact = async () => { if (await Carnet.edit(null, { role: 'ENT' })) { location.hash = '#/contacts'; render(); } };
  const imp = () => { location.hash = '#/contacts'; setTimeout(() => { const b = $('#bImp'); if (b) b.click(); }, 300); };
  Ori.render($('#oriC'), {
    titre: 'TerraContacts',
    lead: 'Projets de l\'agence, carnet des intervenants (maîtres d\'ouvrage, bureaux d\'études, entreprises) et fiche de votre agence, communs à toute la suite.',
    reprendre: act[0] ? { t: TSP.label(act[0]), s: 'Dernier projet modifié', go: () => { location.hash = '#/projets/' + act[0].id; } } : null,
    actions: [
      { ic: 'plus', pri: true, t: 'Nouveau projet', s: 'Créé une fois ici, puis retrouvé dans chaque application.', go: async () => { const p = await TSP.create({ nom: '' }); if (typeof Sync !== 'undefined') Sync.soon(); location.hash = '#/projets/' + p.id; } },
      { ic: 'plus', t: 'Nouveau contact', s: 'Maître d\'ouvrage, bureau d\'études, entreprise…', go: newContact },
      { ic: 'grid', t: 'Carnet de contacts', s: (nC ? nC + ' fiche' + (nC > 1 ? 's' : '') : 'Aucune fiche') + ' : rechercher, filtrer par rôle, exporter.', go: () => { location.hash = '#/contacts'; } },
      { ic: 'doc', t: ag ? 'Mon agence' : 'Renseigner mon agence', s: ag ? ag.nom : 'Nom, logo, architectes : en tête des CR et des PV.', go: () => { location.hash = '#/agence'; } },
      { ic: 'up', t: 'Importer des contacts', s: 'Excel, CSV, vCard ou JSON TerraSuite.', go: imp },
      { ic: 'link', t: 'Mon compte', s: 'Compte TerraSuite, synchronisation.', go: () => { location.hash = '#/compte'; } }
    ],
    liste: { titre: 'Projets en cours', vide: 'Aucun projet : créez le premier.', recherche: true, items: act.map(p => ({ c: p.code || '', t: p.nom || '(sans nom)', s: [p.ville, p.phase].filter(Boolean).join(' · '), go: () => { location.hash = '#/projets/' + p.id; } })) },
    etapes: ['<b>Renseignez votre agence</b> une fois : elle signe les comptes-rendus et les documents.', '<b>Créez un projet</b> : il apparaît dans TerraEstim, TerraPlanning, TerraGeo et TerraChantier.', '<b>Ajoutez les intervenants</b> au carnet, ou reprenez ceux de vos chantiers.'],
    pied: 'Données enregistrées dans ce navigateur et synchronisées entre vos appareils (Réglages).'
  });
}

/* ---------- liste ---------- */
async function viewList(m) {
  const all = Carnet.sorted(), chs = await DB.all('chantiers'), unlinked = chs.reduce((n, c) => n + (c.entreprises || []).filter(e => e.nom && !(e.contactId && Carnet.byId(e.contactId))).length, 0);
  const uses = id => chs.filter(c => (c.entreprises || []).some(e => e.contactId === id)).map(c => c.code || c.nom);
  const roleOf = c => c.agence ? 'MOE' : c.role, catOf = c => roleCat(roleOf(c)), counts = ROLE_CATS.map(([k]) => [k, all.filter(c => catOf(c) === k).length]).filter(x => x[1]);
  m.innerHTML = `${!Carnet.agence() ? `<div class="install"><div class="grow"><b>Commencez par votre agence</b><div class="small muted">Nom, coordonnées, logo, architectes : l'architecte par défaut signe les comptes-rendus et les photos des chantiers.</div></div><a class="btn pri" href="#/agence">Mon agence</a></div>` : ''}
    ${unlinked ? `<div class="install"><div class="grow"><b>${unlinked} intervenant(s) saisi(s) dans les chantiers hors du carnet</b><div class="small muted">Les reprendre crée leurs fiches (sans doublon de nom) et les relie aux chantiers.</div></div><button class="btn pri" id="bFrom">Reprendre</button></div>` : ''}
    <div class="bar"><h2 class="grow" style="font-size:20px">Contacts <span class="muted small">${all.length}</span></h2><button class="btn" id="bImp">Importer</button><button class="btn" id="bExp">Exporter</button><button class="btn pri" id="bNew">+ Nouveau contact</button></div>
    <div class="bar"><input type="search" id="q" placeholder="Rechercher : nom, ville, interlocuteur, lot…" value="${esc(F.q)}" style="max-width:420px"></div>
    <div class="levels bar"><button class="chip${!F.role ? ' on' : ''}" data-r="">Tous (${all.length})</button>${counts.map(([k, n]) => `<button class="chip${F.role === k ? ' on' : ''}" data-r="${k}">${esc(catName(k))} (${n})</button>`).join('')}</div>
    <div id="lst"></div>`;
  const draw = () => {
    const q = norm(F.q), list = all.filter(c => (!F.role || catOf(c) === F.role) && (!q || norm([c.nom, c.ville, c.cp, c.notes, Carnet.lotsTxt(c), ...c.personnes.map(p => [Carnet.fullName(p), p.fonction, p.email].join(' '))].join(' ')).includes(q)));
    const groups = ROLE_CATS.map(([k]) => [k, list.filter(c => catOf(c) === k)]).filter(g => g[1].length);
    $('#lst', m).innerHTML = groups.map(([k, cs]) => `<div class="lothead">${esc(catName(k))}</div><div class="list">${cs.map(c => { const u = uses(c.id);
      return `<div class="card" data-c="${c.id}" style="cursor:pointer"><div class="row" style="align-items:flex-start"><div class="grow"><b>${esc(c.nom)}</b> <span class="tag-role">${esc(c.agence ? 'Architecte' : roleName(c.role))}</span>${c.agence ? ' <span class="badge b-refusee">votre agence</span>' : ''}<div class="small muted">${esc([[c.cp, c.ville].filter(Boolean).join(' '), c.lots.length ? 'lots ' + Carnet.lotsTxt(c) : '', u.length ? 'chantiers : ' + u.join(', ') : ''].filter(Boolean).join(' · '))}</div></div>
        <span class="row small" style="gap:12px;flex-wrap:wrap;justify-content:flex-end">${c.tel ? `<a href="tel:${esc(c.tel.replace(/\s/g, ''))}" data-stop>${esc(c.tel)}</a>` : ''}${c.email ? `<a href="mailto:${esc(c.email)}" data-stop>${esc(c.email)}</a>` : ''}</span></div>
        ${c.personnes.length ? `<div class="small" style="margin-top:6px;display:flex;flex-direction:column;gap:3px">${c.personnes.map(p => `<span>${p.principal && c.personnes.length > 1 ? '★ ' : ''}<b>${esc(Carnet.fullName(p))}</b>${p.fonction ? ' · <span class="muted">' + esc(p.fonction) + '</span>' : ''}${p.mobile || p.tel ? ` · <a href="tel:${esc((p.mobile || p.tel).replace(/\s/g, ''))}" data-stop>${esc(p.mobile || p.tel)}</a>` : ''}${p.email ? ` · <a href="mailto:${esc(p.email)}" data-stop>${esc(p.email)}</a>` : ''}</span>`).join('')}</div>` : ''}</div>`; }).join('')}</div>`).join('')
      || `<div class="empty"><b>${all.length ? 'Aucun contact ne correspond' : 'Carnet vide'}</b>${all.length ? '' : 'Ajoutez vos contacts un par un, importez un fichier Excel, CSV ou vCard, ou reprenez les intervenants de vos chantiers.'}</div>`;
    $$('[data-stop]', m).forEach(a => a.onclick = e => e.stopPropagation());
    $$('[data-c]', m).forEach(el => el.onclick = async () => { const c = Carnet.byId(el.dataset.c); if (c.agence) { location.hash = '#/agence'; return; } if (await Carnet.edit(c) !== undefined) render(); });
  };
  draw();
  $('#q', m).oninput = e => { F.q = e.target.value; draw(); };
  $$('[data-r]', m).forEach(b => b.onclick = () => { F.role = b.dataset.r; render(); });
  $('#bNew', m).onclick = async () => { if (await Carnet.edit(null, { role: catRoles(F.role)[0] || 'ENT' })) render(); };
  if ($('#bFrom', m)) $('#bFrom', m).onclick = async () => { const r = await Carnet.fromChantiers(); toast(`${r.made} fiche(s) créée(s), ${r.linked} intervenant(s) relié(s)`); render(); };
  $('#bExp', m).onclick = () => { const sh = sheet('Exporter le carnet', `<button class="card ch" id="eX" style="text-align:left;cursor:pointer"><span class="grow"><b>Excel</b><div class="small muted">Une ligne par interlocuteur, filtrable. À ouvrir ou à transmettre.</div></span></button>
      <button class="card ch" id="eJ" style="text-align:left;cursor:pointer"><span class="grow"><b>Format d'échange TerraSuite (JSON)</b><div class="small muted">Pour les autres applications de la suite (TerraEstim, TerraPlanning) ou pour une autre agence.</div></span></button>`);
    $('#eX', sh.el).onclick = () => { Carnet.exportXlsx(); sh.close(); }; $('#eJ', sh.el).onclick = () => { Carnet.exportJSON(); sh.close(); }; };
  $('#bImp', m).onclick = () => { const inp = $('#impIn'); inp.value = ''; inp.onchange = async () => { const f = inp.files[0]; if (!f) return;
    try { if (/\.json$/i.test(f.name)) { const n = await importJSON(f); toast(`${n} fiche(s) importée(s)`); } else { const r = await Carnet.importFile(f); toast(`${r.made} contact(s) créé(s), ${r.upd} complété(s)`, 3500); } render(); }
    catch (e) { console.error(e); toast('Import impossible : ' + e.message, 4500); } }; inp.click(); };
}
async function importJSON(f) {
  const d = JSON.parse(await f.text()); if (d.format !== 'terrasuite-contacts') throw new Error("ce n'est pas un carnet TerraSuite"); let n = 0;
  for (const c of d.contacts || []) { if (c.nomen !== NOMEN_V) { c.lots = lotsNomen(c.lots); c.nomen = NOMEN_V; } const cur = Carnet.byId(c.id); if (c.agence && Carnet.agence() && Carnet.agence().id !== c.id) c.agence = false; if (!cur || (c.updatedAt || '') > (cur.updatedAt || '')) { await Carnet.put(c); n++; } }
  return n;
}

/* ---------- compte TerraSuite : connexion, agence, base commune ---------- */
function viewCompte(m) {
  m.innerHTML = `<div class="bar"><h2 class="grow" style="font-size:20px">Mon compte TerraSuite</h2></div>
    <div class="hint" style="margin-bottom:10px">Un seul compte pour toutes les applications de la suite. La bibliothèque (projets, contacts, chantiers) est celle de votre agence et se synchronise entre ses membres et leurs appareils. Tout ce que vous saisissez alimente aussi la base commune TerraSuite, anonymisé.</div>
    <div id="tsaBox" style="display:flex;flex-direction:column;gap:10px"></div>`;
  if (typeof TSA === 'undefined') { $('#tsaBox', m).innerHTML = '<div class="empty">Module de compte absent (terrasuite-compte.js).</div>'; return; }
  TSA.panel($('#tsaBox', m), { serveur: true }); TSA.onChange(() => { if (/compte/.test(location.hash)) { Sync.soon(); } });
}
/* ---------- agence ---------- */
function viewAgence(m) {
  const ag = Carnet.agence() ? JSON.parse(JSON.stringify(Carnet.agence())) : { id: DB.uid(), agence: true, role: 'MOE', nom: '', adresse: '', cp: '', ville: '', tel: '', email: '', site: '', siret: '', ordre: '', notes: '', lots: [], logoId: '', personnes: [{ id: DB.uid(), civ: '', prenom: '', nom: '', fonction: 'Architecte', mobile: '', tel: '', email: '', principal: true }] };
  m.innerHTML = `<div class="bar"><h2 class="grow" style="font-size:20px">Mon agence</h2></div>
    <div class="hint" style="margin-bottom:10px">Ces informations figurent en tête des comptes-rendus et des listes de réserves. L'architecte par défaut est l'émetteur des comptes-rendus et des photos sur chaque nouveau chantier (modifiable chantier par chantier). Elles sont partagées par les appareils synchronisés de l'agence.</div>
    <div class="card" id="agF" style="display:flex;flex-direction:column;gap:10px">${Carnet.formHTML(ag, { isAg: true })}</div>
    <div class="bar" style="margin-top:12px"><span class="grow"></span><button class="btn pri" id="agOk">Enregistrer</button></div>`;
  const form = $('#agF', m); let collect = Carnet.bindForm(form, ag, { isAg: true });
  form.addEventListener('redraw', () => { form.innerHTML = Carnet.formHTML(ag, { isAg: true }); collect = Carnet.bindForm(form, ag, { isAg: true }); });
  $('#agOk', m).onclick = async () => { collect(); if (!ag.nom) return toast("Indiquez le nom de l'agence"); ag.personnes = ag.personnes.filter(p => p.nom || p.prenom || p.email); ag.agence = true; await Carnet.put(ag); toast('Agence enregistrée'); render(); };
}

/* ---------- réglages ---------- */
async function settingsSheet() {
  const cfg = await Sync.config();
  const sh = sheet('Réglages', `<div class="card"><b>Synchronisation entre appareils</b><div class="hint" style="margin:4px 0 8px">Même connexion que TerraChantier : le carnet est partagé par tous les appareils de l'agence connectés au même projet.</div>${Sync.formHTML(cfg)}</div>
    <div class="small muted">TerraContacts ${APP_VERSION} bêta · TerraSuite${Carnet.agence() ? ' · ' + esc(Carnet.agence().nom) : ''}</div>`, `<button class="btn pri" data-close>Fermer</button>`);
  Sync.bindForm(sh.el);
}

(async function init() {
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  if (typeof TSUndo !== 'undefined') TSUndo.init(async items => { await DB.undoApply(items); await Carnet.load(true); Sync.soon(); await render(); });
  registerSW(); await render(); Sync.start();
})();
