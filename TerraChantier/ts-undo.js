/* TerraSuite : annulation commune aux applications (les 10 dernières opérations).
   Chaque application enregistre ses modifications de fiches : TSUndo.record([{ s: collection, id, before, after }], libellé),
   « before » et « after » étant la fiche avant et après (null : fiche absente). Les saisies rapprochées sur les mêmes fiches
   (frappe au clavier) forment une seule opération. L'application fournit apply(items) qui remet les fiches dans l'état demandé.
   Boutons ↶ ↷ et raccourcis Ctrl+Z, Ctrl+Y (Ctrl+Maj+Z) ; dans un champ de saisie, Ctrl+Z reste celui du champ. */
const TSUndo = (() => {
  const LIMIT = 10, MERGE = 1500, U = [], R = [], subs = [];
  let apply = null, busy = false;
  const js = v => v == null ? null : JSON.stringify(v), un = v => v == null ? null : JSON.parse(v);
  const keys = e => e.items.map(i => i.s + '/' + i.id).sort().join('|');
  const notify = () => subs.forEach(f => { try { f(); } catch (e) {} });
  let open = null; // opérations d'un même geste (même tour d'exécution) : une seule entrée
  function record(items, label = 'modification') {
    if (busy || !apply) return;
    const L = items.map(i => ({ s: i.s, id: i.id, b: typeof i.before === 'string' || i.before == null ? i.before ?? null : js(i.before), a: typeof i.after === 'string' || i.after == null ? i.after ?? null : js(i.after) }));
    if (open) { for (const i of L) { const x = open.items.find(y => y.s === i.s && y.id === i.id); if (x) x.a = i.a; else open.items.push(i); } return; }
    open = { label, t: Date.now(), items: L }; setTimeout(close, 0);
  }
  function close() {
    const e = open; open = null; if (!e) return; e.items = e.items.filter(i => i.b !== i.a); if (!e.items.length) return;
    const last = U[U.length - 1];
    const edit = x => x.items.every(i => i.b != null && i.a != null); // création et suppression restent des opérations à part
    if (last && e.t - last.t < MERGE && last.label === e.label && keys(last) === keys(e) && edit(last) && edit(e)) { for (const i of e.items) last.items.find(x => x.s === i.s && x.id === i.id).a = i.a; last.t = e.t; }
    else { U.push(e); if (U.length > LIMIT) U.shift(); }
    R.length = 0; notify();
  }
  async function step(from, to, side) {
    close(); if (busy || !from.length || !apply) return false; const e = from.pop(); busy = true;
    try { await apply(e.items.map(i => ({ s: i.s, id: i.id, value: un(side === 'undo' ? i.b : i.a) })), side, e.label); to.push(e); }
    catch (err) { console.warn('TSUndo', err); }
    finally { busy = false; notify(); }
    return true;
  }
  const undo = () => step(U, R, 'undo'), redo = () => step(R, U, 'redo');
  const field = t => t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
  /* boutons ↶ ↷ placés dans el (avant before) */
  function buttons(el, { cls = 'btn', before = null } = {}) {
    if (!el) return; if (!document.getElementById('ts-undo-css')) { const c = document.createElement('style'); c.id = 'ts-undo-css'; c.textContent = '.ts-undo button{font-size:17px;line-height:1}.ts-undo button:disabled{opacity:.35;cursor:default}'; document.head.appendChild(c); }
    const w = document.createElement('span'); w.className = 'ts-undo'; w.style.cssText = 'display:inline-flex;gap:4px;align-items:center';
    w.innerHTML = `<button type="button" class="${cls}" data-u="u" aria-label="Annuler">↶</button><button type="button" class="${cls}" data-u="r" aria-label="Rétablir">↷</button>`;
    el.insertBefore(w, before); const [bu, br] = w.querySelectorAll('button');
    bu.onclick = undo; br.onclick = redo;
    const paint = () => { const a = U[U.length - 1], b = R[R.length - 1]; bu.disabled = !a; br.disabled = !b; bu.title = a ? `Annuler : ${a.label} (Ctrl+Z) · ${U.length} opération(s) en mémoire` : 'Rien à annuler'; br.title = b ? `Rétablir : ${b.label} (Ctrl+Y)` : 'Rien à rétablir'; };
    const sub = () => { if (!w.isConnected) { const i = subs.indexOf(sub); if (i >= 0) subs.splice(i, 1); return; } paint(); };
    subs.push(sub); paint(); return w;
  }
  function init(applyFn) {
    apply = applyFn;
    document.addEventListener('keydown', ev => {
      if (!(ev.ctrlKey || ev.metaKey) || ev.altKey || field(ev.target)) return; const k = ev.key.toLowerCase();
      if (k === 'z' && !ev.shiftKey) { ev.preventDefault(); undo(); } else if (k === 'y' || (k === 'z' && ev.shiftKey)) { ev.preventDefault(); redo(); }
    });
  }
  return { init, record, undo, redo, buttons, onChange: f => subs.push(f), get busy() { return busy; }, get size() { return U.length; }, LIMIT };
})();
if (typeof window !== 'undefined') window.TSUndo = TSUndo;
