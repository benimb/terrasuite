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
  const CSS = `.ori{max-width:1120px;margin:0 auto;padding:28px 24px 48px;display:flex;flex-direction:column;gap:22px;color:var(--ink,#1c1f22)}
.ori h1{margin:0;font-size:26px;letter-spacing:-.01em;line-height:1.15}.ori .lead{margin:6px 0 0;color:var(--muted,#666);font-size:15px;line-height:1.5;max-width:760px}
.ori h2{margin:0 0 10px;font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted,#666);font-weight:700}
.ori-resume{display:flex;align-items:center;gap:14px;padding:14px 18px;border:1.5px solid var(--accent,#333);border-radius:12px;background:var(--accent-soft,var(--soft,#eef));cursor:pointer;text-align:left;font:inherit;color:inherit;width:100%}
.ori-resume:hover{filter:brightness(.98)}.ori-resume .k{font-size:12px;font-weight:700;color:var(--accent,#333);text-transform:uppercase;letter-spacing:.05em}.ori-resume b{display:block;font-size:16px}.ori-resume span.s{font-size:13px;color:var(--muted,#666)}
.ori-acts{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px}
.ori-act{display:flex;gap:12px;align-items:flex-start;text-align:left;padding:16px;border:1px solid var(--line,#ddd);border-radius:12px;background:var(--panel,var(--surface,#fff));cursor:pointer;font:inherit;color:inherit;transition:border-color .12s,transform .12s}
.ori-act:hover,.ori-act:focus-visible{border-color:var(--accent,#333);transform:translateY(-1px);outline:none}
.ori-act .ic{flex:0 0 38px;height:38px;border-radius:10px;display:grid;place-items:center;background:var(--accent-soft,var(--soft,#eef));color:var(--accent,#333)}
.ori-act.pri .ic{background:var(--accent,#333);color:var(--accent-ink,#fff)}
.ori-act svg,.ori-resume svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.ori-act b{display:block;font-size:15px;margin-bottom:3px}.ori-act span{font-size:13px;color:var(--muted,#666);line-height:1.4}
.ori-cols{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:22px;align-items:start}
@media (max-width:820px){.ori-cols{grid-template-columns:1fr}.ori{padding:18px 14px 40px}}
.ori-box{border:1px solid var(--line,#ddd);border-radius:12px;background:var(--panel,var(--surface,#fff));padding:14px 16px}
.ori-box+.ori-box{margin-top:14px}
.ori-q{width:100%;margin:0 0 8px;padding:7px 10px;border:1px solid var(--line,#ddd);border-radius:8px;font:inherit;background:var(--sunk,transparent);color:inherit;box-sizing:border-box}
.ori-ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;max-height:420px;overflow:auto}
.ori-ul button{display:flex;gap:10px;align-items:baseline;width:100%;text-align:left;padding:8px 6px;border:0;border-bottom:1px solid var(--line2,var(--line,#eee));background:none;font:inherit;color:inherit;cursor:pointer;border-radius:6px}
.ori-ul button:hover{background:var(--sel,var(--soft,#f3f3f3))}.ori-ul .t{flex:1;min-width:0;font-weight:600;font-size:14px}.ori-ul .s{font-size:12.5px;color:var(--muted,#666);white-space:nowrap}
.ori-ul .c{font:700 12px ui-monospace,monospace;color:var(--accent,#333);min-width:44px}
.ori-empty{color:var(--muted,#666);font-size:14px;padding:6px 0}
.ori-steps{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:7px;font-size:14px;line-height:1.45}.ori-steps b{font-weight:700}
.ori-pj{display:flex;flex-direction:column;gap:6px}.ori-pj .row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.ori-pj .row .t{flex:1;min-width:120px;font-size:14px}
.ori-pj .row button{font-weight:600;font-size:12.5px;font-family:inherit;padding:4px 9px;border:1px solid var(--line,#ddd);border-radius:7px;background:none;color:inherit;cursor:pointer}.ori-pj .row button:hover{border-color:var(--accent,#333);color:var(--accent,#333)}
.ori-foot{font-size:12.5px;color:var(--muted,#666)}
.ori.compact{padding:16px 14px 32px;gap:16px}.ori.compact h1{font-size:21px}.ori.compact .ori-cols,.ori.compact .ori-acts{grid-template-columns:1fr}.ori.compact .ori-act{padding:11px 12px}`;
  function style() { if (document.getElementById('ori-css')) return; const s = document.createElement('style'); s.id = 'ori-css'; s.textContent = CSS; document.head.appendChild(s); }
  /* cfg : { titre, lead, reprendre:{t,s,go}, actions:[{ic,t,s,go,pri}], liste:{titre,items:[{c,t,s,go}],vide,recherche}, projets:{titre,items:[{c,t,boutons:[{t,go}]}],vide}, etapes:[html], pied } */
  function render(el, cfg) {
    style(); const fns = []; const f = fn => { fns.push(fn); return fns.length - 1; };
    const L = cfg.liste, P = cfg.projets;
    const pjHtml = P ? `<div class="ori-box"><h2>${E(P.titre || 'Projets de l\'agence')}</h2><div class="ori-pj">${P.items.map(p => `<div class="row"><span class="t">${p.c ? `<b>${E(p.c)}</b> · ` : ''}${E(p.t)}</span>${p.boutons.map(b => `<button data-of="${f(b.go)}">${E(b.t)}</button>`).join('')}</div>`).join('') || `<div class="ori-empty">${E(P.vide || 'Aucun projet en cours.')}</div>`}</div></div>` : '';
    const listHtml = items => items.map(x => `<li><button data-of="${f(x.go)}">${x.c !== undefined ? `<span class="c">${E(x.c)}</span>` : ''}<span class="t">${E(x.t)}</span>${x.s ? `<span class="s">${E(x.s)}</span>` : ''}</button></li>`).join('');
    el.innerHTML = `<div class="ori-scroll" style="height:100%;max-height:100%;overflow:auto;width:100%"><div class="ori${cfg.compact ? ' compact' : ''}">
      <div><h1>${E(cfg.titre)}</h1>${cfg.lead ? `<p class="lead">${cfg.lead}</p>` : ''}</div>
      ${cfg.reprendre ? `<button class="ori-resume" data-of="${f(cfg.reprendre.go)}">${svg('play')}<span><span class="k">Reprendre</span><b>${E(cfg.reprendre.t)}</b>${cfg.reprendre.s ? `<span class="s">${E(cfg.reprendre.s)}</span>` : ''}</span></button>` : ''}
      <div><h2>Que voulez-vous faire ?</h2><div class="ori-acts">${cfg.actions.map(a => `<button class="ori-act${a.pri ? ' pri' : ''}" data-of="${f(a.go)}"><span class="ic">${svg(a.ic)}</span><span><b>${E(a.t)}</b><span>${E(a.s || '')}</span></span></button>`).join('')}</div></div>
      <div class="ori-cols"><div>${L ? `<div class="ori-box"><h2>${E(L.titre)} ${L.items.length ? `<span style="font-weight:400">(${L.items.length})</span>` : ''}</h2>${L.recherche && L.items.length > 6 ? '<input type="search" class="ori-q" placeholder="Rechercher…" aria-label="Rechercher dans la liste">' : ''}<ul class="ori-ul">${listHtml(L.items) || `<li class="ori-empty">${E(L.vide || 'Rien pour le moment.')}</li>`}</ul></div>` : pjHtml}${cfg.extra || ''}</div>
        <div>${L ? pjHtml : ''}
          ${cfg.etapes ? `<div class="ori-box"><h2>Comment ça marche</h2><ol class="ori-steps">${cfg.etapes.map(s => `<li>${s}</li>`).join('')}</ol></div>` : ''}
          ${cfg.pied ? `<p class="ori-foot">${cfg.pied}</p>` : ''}</div></div></div></div>`;
    el.querySelectorAll('[data-of]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); const fn = fns[+b.dataset.of]; if (fn) fn(); }));
    const q = el.querySelector('.ori-q'); if (q) q.addEventListener('input', () => { const v = q.value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); el.querySelectorAll('.ori-ul li').forEach(li => { li.hidden = v && !li.textContent.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(v); }); });
  }
  const date = t => { if (!t) return ''; const d = new Date(t); return isNaN(d) ? '' : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }); };
  return { render, date, svg };
})();
