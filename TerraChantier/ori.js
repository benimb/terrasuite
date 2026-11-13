/* ===== Page d'accueil de l'application (orientation) : que faire en arrivant ===== */
const Ori = (() => {
  const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const I = {
    plus: '<path d="M12 5v14M5 12h14"/>', up: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
    open: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>', proj: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 4v5"/>',
    doc: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>', grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>', map: '<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>', save: '<path d="M5 3h11l5 5v13H3V3z"/><path d="M7 3v6h8M7 21v-7h10v7"/>', link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>', star: '<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>', play: '<path d="M6 4l14 8-14 8z"/>'
  };
  const svg = k => `<svg viewBox="0 0 24 24" aria-hidden="true">${I[k] || I.plus}</svg>`;
  /* accueil simplifié (TerraSuite, 13/11/2026) : 4 grandes actions au plus, les autres repliées dans « Autres actions » ;
     éléments récents et projets limités à 6 lignes (« Tout afficher » pour le reste) ; mode d'emploi replié */
  const CSS = `.ori{max-width:1040px;margin:0 auto;padding:28px 24px 48px;display:flex;flex-direction:column;gap:22px;color:var(--ink,#1c1f22)}
.ori h1{margin:0;font-size:26px;letter-spacing:-.01em;line-height:1.15}.ori .lead{margin:6px 0 0;color:var(--muted,#666);font-size:14.5px;line-height:1.5;max-width:720px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.ori h2{margin:0 0 10px;font-size:12.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted,#666);font-weight:700;display:flex;align-items:baseline;gap:8px}
.ori h2 .n{font-weight:400;letter-spacing:0;text-transform:none}
.ori-resume{display:flex;align-items:center;gap:14px;padding:14px 18px;border:1.5px solid var(--accent,#333);border-radius:12px;background:var(--accent-soft,var(--soft,#eef));cursor:pointer;text-align:left;font:inherit;color:inherit;width:100%}
.ori-resume:hover{filter:brightness(.98)}.ori-resume .k{font-size:12px;font-weight:700;color:var(--accent,#333);text-transform:uppercase;letter-spacing:.05em}.ori-resume b{display:block;font-size:16px}.ori-resume span.s{font-size:13px;color:var(--muted,#666)}
.ori-acts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.ori-acts.n1{grid-template-columns:minmax(0,360px)}.ori-acts.n2{grid-template-columns:repeat(2,minmax(0,1fr))}.ori-acts.n3{grid-template-columns:repeat(3,minmax(0,1fr))}
@media (max-width:900px){.ori-acts,.ori-acts.n3{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:520px){.ori-acts,.ori-acts.n2,.ori-acts.n3{grid-template-columns:1fr}}
.ori-act{display:flex;flex-direction:column;gap:10px;align-items:flex-start;text-align:left;padding:18px 16px;min-height:132px;border:1px solid var(--line,#ddd);border-radius:14px;background:var(--panel,var(--surface,#fff));cursor:pointer;font:inherit;color:inherit;transition:border-color .12s,transform .12s,box-shadow .12s}
.ori-act:hover,.ori-act:focus-visible{border-color:var(--accent,#333);transform:translateY(-1px);box-shadow:0 4px 14px rgba(0,0,0,.07);outline:none}
.ori-act .ic{width:44px;height:44px;border-radius:12px;display:grid;place-items:center;background:var(--accent-soft,var(--soft,#eef));color:var(--accent,#333)}
.ori-act.pri .ic{background:var(--accent,#333);color:var(--accent-ink,#fff)}
.ori-act svg{width:23px;height:23px}.ori-resume svg,.ori-more svg{width:18px;height:18px}
.ori svg{fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.ori-act b{display:block;font-size:15.5px;line-height:1.25}.ori-act span.s{font-size:12.5px;color:var(--muted,#666);line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.ori-more{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:12px}
.ori-more .ori-lbl{font-size:12.5px;color:var(--muted,#666);margin-right:4px}
.ori-more button{display:inline-flex;align-items:center;gap:6px;font:inherit;font-size:13px;padding:6px 11px;border:1px solid var(--line,#ddd);border-radius:999px;background:var(--panel,transparent);color:inherit;cursor:pointer}
.ori-more button:hover{border-color:var(--accent,#333);color:var(--accent,#333)}
.ori-cols{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:22px;align-items:start}.ori-cols.one{grid-template-columns:minmax(0,1fr)}
@media (max-width:820px){.ori-cols{grid-template-columns:1fr}.ori{padding:18px 14px 40px}}
.ori-box{border:1px solid var(--line,#ddd);border-radius:12px;background:var(--panel,var(--surface,#fff));padding:14px 16px}
.ori-q{width:100%;margin:0 0 8px;padding:7px 10px;border:1px solid var(--line,#ddd);border-radius:8px;font:inherit;background:var(--sunk,transparent);color:inherit;box-sizing:border-box}
.ori-ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;max-height:420px;overflow:auto}
.ori-ul button{display:flex;gap:10px;align-items:baseline;width:100%;text-align:left;padding:8px 6px;border:0;border-bottom:1px solid var(--line2,var(--line,#eee));background:none;font:inherit;color:inherit;cursor:pointer;border-radius:6px}
.ori-ul li:last-child button{border-bottom:0}
.ori-ul button:hover{background:var(--sel,var(--soft,#f3f3f3))}.ori-ul .t{flex:1;min-width:0;font-weight:600;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ori-ul .s{font-size:12.5px;color:var(--muted,#666);white-space:nowrap}
.ori-ul .c{font:700 12px ui-monospace,monospace;color:var(--accent,#333);min-width:44px}
.ori-all{margin-top:8px;font:inherit;font-size:13px;color:var(--accent,#333);background:none;border:0;padding:4px 0;cursor:pointer;text-decoration:underline;text-underline-offset:2px}
.ori-empty{color:var(--muted,#666);font-size:14px;padding:6px 0}
.ori-pj{display:flex;flex-direction:column}.ori-pj .row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:7px 0;border-bottom:1px solid var(--line2,var(--line,#eee))}.ori-pj .row:last-child{border-bottom:0}.ori-pj .row .t{flex:1;min-width:120px;font-size:14px}
.ori-pj .row button{font-weight:600;font-size:12.5px;font-family:inherit;padding:4px 9px;border:1px solid var(--line,#ddd);border-radius:7px;background:none;color:inherit;cursor:pointer}.ori-pj .row button:hover{border-color:var(--accent,#333);color:var(--accent,#333)}
.ori-help summary{cursor:pointer;font-size:13px;color:var(--muted,#666);list-style:none;display:inline-flex;gap:6px;align-items:center}
.ori-help summary::-webkit-details-marker{display:none}.ori-help summary::before{content:'?';display:inline-grid;place-items:center;width:18px;height:18px;border-radius:50%;border:1px solid var(--line,#ccc);font-size:11px;font-weight:700}
.ori-help[open] summary{margin-bottom:8px}
.ori-steps{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:6px;font-size:13.5px;line-height:1.45;max-width:760px}.ori-steps b{font-weight:700}
.ori-foot{font-size:12px;color:var(--muted,#666);margin:0}
.ori.compact{padding:16px 14px 32px;gap:16px}.ori.compact h1{font-size:21px}.ori.compact .ori-cols,.ori.compact .ori-acts{grid-template-columns:1fr}.ori.compact .ori-act{min-height:0;padding:12px 14px;flex-direction:row;align-items:center}.ori.compact .ori-act .ic{width:38px;height:38px;flex:none}`;
  function style() { if (document.getElementById('ori-css')) return; const s = document.createElement('style'); s.id = 'ori-css'; s.textContent = CSS; document.head.appendChild(s); }
  const MAXA = 4, MAXL = 6;
  /* cfg : { titre, lead, reprendre:{t,s,go}, actions:[{ic,t,s,go,pri}], liste:{titre,items:[{c,t,s,go}],vide,recherche}, projets:{titre,items:[{c,t,boutons:[{t,go}]}],vide}, etapes:[html], pied, extra, compact }
     Les actions sont données par ordre d'importance : les 4 premières en grand (les « pri » d'abord), les suivantes dans « Autres actions ». */
  function render(el, cfg) {
    style(); const fns = []; const f = fn => { fns.push(fn); return fns.length - 1; };
    const L = cfg.liste, P = cfg.projets;
    const acts = [...(cfg.actions || [])].map((a, i) => ({ a, i })).sort((x, y) => (y.a.pri ? 1 : 0) - (x.a.pri ? 1 : 0) || x.i - y.i).map(x => x.a);
    const big = acts.slice(0, MAXA), more = acts.slice(MAXA);
    const listRows = items => items.map((x, i) => `<li${i >= MAXL ? ' data-more hidden' : ''}><button data-of="${f(x.go)}">${x.c !== undefined ? `<span class="c">${E(x.c)}</span>` : ''}<span class="t">${E(x.t)}</span>${x.s ? `<span class="s">${E(x.s)}</span>` : ''}</button></li>`).join('');
    const allBtn = n => n > MAXL ? `<button class="ori-all" data-all>Tout afficher (${n})</button>` : '';
    const listHtml = L ? `<div class="ori-box" data-box><h2>${E(L.titre)}${L.items.length ? ` <span class="n">${L.items.length}</span>` : ''}</h2>${L.recherche && L.items.length > MAXL ? '<input type="search" class="ori-q" placeholder="Rechercher…" aria-label="Rechercher dans la liste" hidden>' : ''}<ul class="ori-ul">${listRows(L.items) || `<li class="ori-empty">${E(L.vide || 'Rien pour le moment.')}</li>`}</ul>${allBtn(L.items.length)}</div>` : '';
    const pjHtml = P ? `<div class="ori-box" data-box><h2>${E(P.titre || 'Projets de l\'agence')}${P.items.length ? ` <span class="n">${P.items.length}</span>` : ''}</h2><div class="ori-pj">${P.items.map((p, i) => `<div class="row"${i >= MAXL ? ' data-more hidden' : ''}><span class="t">${p.c ? `<b>${E(p.c)}</b> · ` : ''}${E(p.t)}</span>${p.boutons.map(b => `<button data-of="${f(b.go)}">${E(b.t)}</button>`).join('')}</div>`).join('') || `<div class="ori-empty">${E(P.vide || 'Aucun projet en cours.')}</div>`}</div>${allBtn(P.items.length)}</div>` : '';
    const cols = [listHtml + (cfg.extra || ''), pjHtml].filter(Boolean);
    el.innerHTML = `<div class="ori-scroll" style="height:100%;max-height:100%;overflow:auto;width:100%"><div class="ori${cfg.compact ? ' compact' : ''}">
      <div><h1>${E(cfg.titre)}</h1>${cfg.lead ? `<p class="lead">${cfg.lead}</p>` : ''}</div>
      ${cfg.reprendre ? `<button class="ori-resume" data-of="${f(cfg.reprendre.go)}">${svg('play')}<span><span class="k">Reprendre</span><b>${E(cfg.reprendre.t)}</b>${cfg.reprendre.s ? `<span class="s">${E(cfg.reprendre.s)}</span>` : ''}</span></button>` : ''}
      <div><div class="ori-acts n${Math.min(big.length, 4)}">${big.map(a => `<button class="ori-act${a.pri ? ' pri' : ''}" data-of="${f(a.go)}" title="${E(a.s || '')}"><span class="ic">${svg(a.ic)}</span><span><b>${E(a.t)}</b>${a.s ? `<span class="s">${E(a.s)}</span>` : ''}</span></button>`).join('')}</div>
        ${more.length ? `<div class="ori-more"><span class="ori-lbl">Autres actions :</span>${more.map(a => `<button data-of="${f(a.go)}" title="${E(a.s || '')}">${svg(a.ic)}${E(a.t)}</button>`).join('')}</div>` : ''}</div>
      ${cols.length ? `<div class="ori-cols${cols.length === 1 ? ' one' : ''}">${cols.map(c => `<div>${c}</div>`).join('')}</div>` : ''}
      ${cfg.etapes ? `<details class="ori-help"><summary>Comment ça marche</summary><ol class="ori-steps">${cfg.etapes.map(s => `<li>${s}</li>`).join('')}</ol></details>` : ''}
      ${cfg.pied ? `<p class="ori-foot">${cfg.pied}</p>` : ''}</div></div>`;
    el.querySelectorAll('[data-of]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); const fn = fns[+b.dataset.of]; if (fn) fn(); }));
    el.querySelectorAll('[data-all]').forEach(b => b.addEventListener('click', () => { const box = b.closest('[data-box]'); box.querySelectorAll('[data-more]').forEach(x => { x.hidden = false; x.removeAttribute('data-more'); }); const q = box.querySelector('.ori-q'); if (q) { q.hidden = false; q.focus(); } b.remove(); }));
    const q = el.querySelector('.ori-q'); if (q) q.addEventListener('input', () => { const v = q.value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); el.querySelectorAll('.ori-ul li').forEach(li => { li.hidden = v && !li.textContent.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(v); }); });
  }
  const date = t => { if (!t) return ''; const d = new Date(t); return isNaN(d) ? '' : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }); };
  return { render, date, svg };
})();
