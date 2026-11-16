/* TerraSuite : récupération et lecture du règlement du PLU (Géoportail de l'urbanisme).
   1. zone d'urbanisme au point du projet (API Carto de l'IGN, module GPU) : libellé, document, fichier du règlement ;
   2. règlement téléchargé depuis la Géoplateforme (data.geopf.fr) et lu dans le navigateur (pdf.js, copie locale dans suite/lib) ;
   3. chapitre de la zone repéré par ses titres, découpé en articles, chaque article rangé par thème avec son texte exact et sa page.
   Rien n'est interprété ici : les valeurs (hauteurs, reculs, emprise…) sont relevées par Claude dans la conversation (format terrasuite-plu). */
const TSPLU = (() => {
  const GEOCODE = q => 'https://data.geopf.fr/geocodage/search?limit=1&q=' + encodeURIComponent(q);
  const ZONE = (lon, lat) => 'https://apicarto.ign.fr/api/gpu/zone-urba?geom=' + encodeURIComponent(JSON.stringify({ type: 'Point', coordinates: [lon, lat] }));
  const DOCU = (lon, lat) => 'https://apicarto.ign.fr/api/gpu/document?geom=' + encodeURIComponent(JSON.stringify({ type: 'Point', coordinates: [lon, lat] }));
  const FILE = z => `https://data.geopf.fr/annexes/gpu/documents/${z.partition}/${z.gpu_doc_id}/${z.nomfic}`;
  const THEMES = [
    ['Destinations et usages des sols', /destination|usage|affectation|interdit|occupations? (et utilisations? )?du sol|admis|soumis(es)? à condition|mixit/i],
    ['Implantation par rapport aux voies', /voie|emprises? publique|alignement|recul/i],
    ['Implantation par rapport aux limites séparatives', /limites? s[ée]parative|mitoyen/i],
    ['Implantation sur une même propriété', /m[êe]me (unit[ée] foncière|propri[ée]t[ée]|terrain)|les unes par rapport aux autres/i],
    ['Emprise au sol', /emprise au sol/i],
    ['Hauteur', /hauteur|gabarit|vel[ul]um/i],
    ['Aspect extérieur, façades, toitures, clôtures', /aspect|fa[çc]ade|toiture|cl[ôo]ture|qualit[ée] (urbaine|architecturale)|insertion/i],
    ['Espaces libres, plantations, pleine terre', /espaces? (libres?|verts?)|plantation|pleine terre|biotope|coefficient|v[ée]g[ée]tal|paysag/i],
    ['Stationnement', /stationnement|parking|v[ée]lo/i],
    ['Accès et voirie', /acc[èe]s|desserte|voirie/i],
    ['Réseaux', /r[ée]seau|assainissement|eaux? (pluviales?|us[ée]es)|[ée]lectricit|t[ée]l[ée]com|d[ée]chets/i],
    ['Performances énergétiques et environnementales', /[ée]nerg|environnement|performance/i]
  ];
  const themeOf = t => (THEMES.find(([, re]) => re.test(t)) || ['Autres dispositions'])[0];
  const j = async u => { const r = await fetch(u); if (!r.ok) throw new Error('HTTP ' + r.status + ' sur ' + new URL(u).hostname); return r.json(); };

  /* parcelle d'une adresse : celle qui contient le point, sinon la plus proche (le point de la BAN est souvent sur la voie, devant l'entrée), 30 m au plus */
  const rings = g => !g ? [] : g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
  function dist(g, lon, lat) { const k = Math.cos(lat * Math.PI / 180) * 111320, K = 111320, P = [lon * k, lat * K]; let best = Infinity, inside = false;
    for (const poly of rings(g)) for (const ring of poly) { const R = ring.map(c => [c[0] * k, c[1] * K]);
      for (let i = 0, j = R.length - 1; i < R.length; j = i++) { const [x1, y1] = R[j], [x2, y2] = R[i];
        if ((y2 > P[1]) !== (y1 > P[1]) && P[0] < (x1 - x2) * (P[1] - y2) / (y1 - y2) + x2) inside = !inside;
        const dx = x2 - x1, dy = y2 - y1, t = Math.max(0, Math.min(1, ((P[0] - x1) * dx + (P[1] - y1) * dy) / (dx * dx + dy * dy || 1)));
        best = Math.min(best, Math.hypot(P[0] - (x1 + t * dx), P[1] - (y1 + t * dy))); } }
    return inside ? 0 : best; }
  async function parcelNear(lon, lat, max = 30) {
    const d = 0.0004, box = { type: 'Polygon', coordinates: [[[lon - d, lat - d * .66], [lon + d, lat - d * .66], [lon + d, lat + d * .66], [lon - d, lat + d * .66], [lon - d, lat - d * .66]]] };
    const r = await j('https://apicarto.ign.fr/api/cadastre/parcelle?geom=' + encodeURIComponent(JSON.stringify(box)));
    return (r.features || []).map(f => ({ f, d: dist(f.geometry, lon, lat) })).filter(x => x.d <= max).sort((a, b) => a.d - b.d).map(x => ({ idu: x.f.properties.idu, section: x.f.properties.section, numero: x.f.properties.numero, contenance: x.f.properties.contenance, commune: x.f.properties.nom_com, geometry: x.f.geometry, d: Math.round(x.d) }));
  }
  /* point intérieur d'une parcelle (pour interroger le zonage sur la parcelle et non sur la voie) */
  function inner(g) { const P = rings(g)[0]; if (!P) return null; const R = P[0]; let a = 0, cx = 0, cy = 0; for (let i = 0, k = R.length - 1; i < R.length; k = i++) { const f = R[k][0] * R[i][1] - R[i][0] * R[k][1]; a += f; cx += (R[k][0] + R[i][0]) * f; cy += (R[k][1] + R[i][1]) * f; } return a ? [cx / (3 * a), cy / (3 * a)] : R[0]; }

  /* point du projet : étude de site TerraGeo, sinon adresse de la fiche (parcelle repérée automatiquement) */
  async function locate(p, geoFiches) {
    const f = (geoFiches || []).filter(x => x && Array.isArray(x.center)).sort((a, b) => (+b.updated || 0) - (+a.updated || 0))[0];
    if (f) return { lon: f.center[0], lat: f.center[1], src: 'étude de site « ' + (f.nom || '') + ' »' };
    const q = [p.adresse, p.cp, p.ville].filter(Boolean).join(' ').trim(); if (q.length < 4) return null;
    const g = await j(GEOCODE(q)); const c = g.features && g.features[0] && g.features[0].geometry.coordinates; if (!c) return null;
    let parc = []; try { parc = await parcelNear(c[0], c[1]); } catch (e) {}
    const ip = parc[0] && inner(parc[0].geometry);
    return { lon: ip ? ip[0] : c[0], lat: ip ? ip[1] : c[1], src: 'adresse ' + q, parc: parc.slice(0, 1) };
  }
  async function zoneAt(lon, lat) {
    const z = await j(ZONE(lon, lat)); const L = (z.features || []).map(f => f.properties).filter(x => x && x.nomfic);
    if (!L.length) { let d = null; try { d = await j(DOCU(lon, lat)); } catch (e) {} const dp = d && d.features && d.features[0] && d.features[0].properties;
      throw new Error(dp ? `document d'urbanisme « ${dp.du_type || ''} ${dp.grid_title || dp.name || ''} » sans zonage numérisé ici (carte communale, RNU ou PLU non versé au Géoportail)` : "aucun document d'urbanisme publié au Géoportail de l'urbanisme à cet endroit (règlement national d'urbanisme, ou commune non couverte)"); }
    return L[0];
  }

  /* lecture du PDF : lignes reconstituées par position verticale */
  let lib = null;
  async function pdfLib() { if (lib) return lib; const base = new URL('suite/lib/pdfjs/', location.href.replace(/[#?].*$/, '').replace(/[^/]*$/, '')).href; lib = await import(base + 'pdf.min.mjs'); lib.GlobalWorkerOptions.workerSrc = base + 'pdf.worker.min.mjs'; return lib; }
  async function readPdf(url, onProgress) {
    const L = await pdfLib(), r = await fetch(url); if (!r.ok) throw new Error('règlement introuvable (HTTP ' + r.status + ')');
    const doc = await L.getDocument({ data: await r.arrayBuffer(), isEvalSupported: false }).promise, pages = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const tc = await (await doc.getPage(i)).getTextContent(), rows = [];
      for (const it of tc.items) { if (!it.str) continue; const y = it.transform[5], x = it.transform[4]; let row = rows.find(r0 => Math.abs(r0.y - y) < 2.5); if (!row) rows.push(row = { y, it: [] }); row.it.push({ x, s: it.str, h: Math.abs(it.transform[3]) || it.height || 0 }); }
      rows.sort((a, b) => b.y - a.y);
      pages.push(rows.map(r0 => { r0.it.sort((a, b) => a.x - b.x); return { t: r0.it.map(o => o.s).join('').replace(/\s+/g, ' ').trim(), h: Math.max(...r0.it.map(o => o.h)) }; }).filter(l => l.t));
      if (onProgress && i % 10 === 0) onProgress(i, doc.numPages);
    }
    return pages;
  }

  /* chapitre de la zone : titres « Zone UC », « Dispositions applicables à la zone UC », « UC - … » ; on écarte le sommaire (points de conduite, numéros de page en fin de ligne) */
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const isToc = t => /\.{4,}|…{2,}|\s\d{1,3}$/.test(t) && t.length < 140;
  const zoneHead = t => { if (t.length > 120 || isToc(t)) return null; const m = t.match(/^(?:\d{1,2}(?:\.\d{1,2})*\.?\s*[-–]?\s*)?(?:titre\s+[ivx\d]+\s*[-–:]?\s*)?(?:chapitre\s+[ivx\d]+\s*[-–:]?\s*)?(?:dispositions? (?:applicables?|propres?|particuli[èe]res?) (?:à|aux?) (?:la |les )?)?zones?\s+([0-9]*[A-Z]{1,4}[a-z0-9]*)\b/i); return m ? m[1] : null; };
  function zoneBlock(pages, libelle) {
    const base = (libelle.match(/^\d*[A-Z]+/) || [libelle])[0], full = libelle;
    const heads = []; pages.forEach((L, i) => L.forEach(l => { const z = zoneHead(l.t); if (z) heads.push({ i, z, t: l.t }); }));
    const match = z => z === full || z === base || (z.startsWith(base) && !/^[A-Z]/.test(z.slice(base.length)));
    let start = heads.find(h => match(h.z) && h.i > 0) || heads.find(h => match(h.z));
    if (!start) { const re = new RegExp('\\b' + esc(base) + '\\b'); const P = pages.map((L, i) => [i, L.filter(l => re.test(l.t)).length]).filter(x => x[1] >= 3).map(x => x[0]); return { base, pages: P, found: false }; }
    /* plusieurs titres pour la zone (sommaire, puis chapitre) : on garde le dernier début de bloc dont la suite est longue */
    const exact = heads.filter(h => h.z === full), cands = exact.length ? exact : heads.filter(h => match(h.z)); let best = null;
    for (const c of cands) { const nx = heads.find(h => h.i > c.i && (exact.length ? h.z !== full : !match(h.z))); const end = nx ? nx.i - 1 : pages.length - 1; if (!best || end - c.i > best.end - best.i) best = { i: c.i, end }; }
    const P = []; for (let i = best.i; i <= best.end; i++) P.push(i); return { base, pages: P, found: true };
  }
  /* articles : « Article UC 10 », « Article 4 », « UC 4 - », « 2.3 Hauteur… », « Section », « Chapitre » */
  const artHead = (t, base) => t.length < 160 && !isToc(t) && (new RegExp('^(article|art\\.)\\s*(' + esc(base) + '\\s*[-.]?\\s*)?\\d', 'i').test(t) || new RegExp('^' + esc(base) + '\\s*[-.]?\\s*\\d{1,2}\\b\\s*[-–:.]', '').test(t) || /^(section|chapitre|paragraphe|sous-section)\s+[ivx\d]/i.test(t) || /^\d{1,2}(\.\d{1,2}){1,3}\.?\s*[-–.)]?\s+[A-ZÉÈÀÂ][a-zéèàâêîôûç’' ]/.test(t) && t.length < 110);
  function articles(pages, blk) {
    const A = []; let cur = null;
    for (const i of blk.pages) for (const l of pages[i]) {
      if (/^\d{1,3}$/.test(l.t) || /^page \d+/i.test(l.t)) continue; // folios
      if (artHead(l.t, blk.base)) { cur = { regle: l.t, page: i + 1, lignes: [] }; A.push(cur); }
      else if (cur) cur.lignes.push(l.t);
      else { cur = { regle: 'Préambule de la zone', page: i + 1, lignes: [l.t] }; A.push(cur); }
    }
    /* thème : celui du titre, sinon celui du titre parent (2.1.1 « Règle générale » sous 2.1 « Implantation… »), sinon celui de l'article précédent */
    const byNum = {}; let prev = 'Autres dispositions';
    for (const a of A) { const n = (a.regle.match(/^(\d{1,2}(?:\.\d{1,2})*)/) || [])[1]; let th = themeOf(a.regle);
      if (th === 'Autres dispositions' && n) { const parts = n.split('.'); while (parts.length > 1 && th === 'Autres dispositions') { parts.pop(); th = byNum[parts.join('.')] || th; } }
      if (th === 'Autres dispositions' && /^(r[èe]gles? (g[ée]n[ée]rales?|alternatives?|graphiques?|particuli[èe]res?)|cas g[ée]n[ée]ral|dispositions? (g[ée]n[ée]rales?|particuli[èe]res?)|exceptions?)/i.test(a.regle.replace(/^[\d.\s–-]+/, ''))) th = prev;
      if (n) byNum[n] = th; a.theme = th; if (th !== 'Autres dispositions') prev = th; }
    return A.filter(a => a.lignes.join(' ').length > 30).map(a => ({ theme: a.theme, regle: a.regle, extrait: a.lignes.join('\n'), page: a.page }));
  }

  /* chaîne complète pour un projet ou un point */
  async function fetchFor(pt, status) {
    status('Zone d\'urbanisme au point du projet…'); const z = await zoneAt(pt.lon, pt.lat);
    const url = FILE(z); status(`Zone ${z.libelle} : téléchargement du règlement (${z.nomfic})…`);
    const pages = await readPdf(url, (i, n) => status(`Lecture du règlement : page ${i} sur ${n}…`));
    const blk = zoneBlock(pages, z.libelle), A = articles(pages, blk);
    return { z, url, pages, blk, A };
  }
  const record = (R, pt) => ({ format: 'terrasuite-plu', auto: true, parcelles: (pt.parc || []).map(x => `${x.section} ${+x.numero || x.numero}`).join(', '), zone: R.z.libelle, zoneNom: R.z.libelong || '', typezone: R.z.typezone || '', document: R.z.idurba || '', version: R.z.datvalid ? R.z.datvalid.replace(/(\d{4})(\d\d)(\d\d)/, '$3/$2/$1') : '', url: R.url, point: [pt.lon, pt.lat], pages: R.blk.pages.length ? [R.blk.pages[0] + 1, R.blk.pages[R.blk.pages.length - 1] + 1] : [], chapitreTrouve: R.blk.found, regles: R.A, date: new Date().toISOString().slice(0, 10) });

  /* page de lecture brute (#/plu/<lon>/<lat>[/<page de départ>]) : texte intégral du chapitre de la zone, page par page, pour l'analyse par Claude */
  async function reader(el, lon, lat, from) {
    const E = s => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    el.innerHTML = '<div class="body"><div class="wrap"><div class="card"><h2>Règlement du PLU</h2><p class="hint" id="pluSt">…</p><div id="pluOut"></div></div></div></div>';
    const st = t => { const s = document.getElementById('pluSt'); if (s) s.textContent = t; };
    try { const R = await fetchFor({ lon: +lon, lat: +lat }, st); const P = R.blk.pages.filter(i => i + 1 >= (+from || 0)).slice(0, 25);
      st(`Zone ${R.z.libelle} (${R.z.libelong || ''}) · ${R.z.idurba} · chapitre ${R.blk.found ? 'repéré' : 'non repéré (pages citant la zone)'} : pages ${R.blk.pages.map(i => i + 1).join(', ')} sur ${R.pages.length}`);
      document.getElementById('pluOut').innerHTML = `<p><a href="${E(R.url)}" target="_blank" rel="noopener">Règlement (PDF)</a></p>` + P.map(i => `<h3>Page ${i + 1}</h3><pre style="white-space:pre-wrap;font:13px/1.45 inherit">${E(R.pages[i].map(l => l.t).join('\n'))}</pre>`).join('') + (R.blk.pages.filter(i => i + 1 >= (+from || 0)).length > 25 ? `<p class="hint">Suite : #/plu/${lon}/${lat}/${P[P.length - 1] + 2}</p>` : '');
    } catch (e) { st('Impossible : ' + (e.message || e)); }
  }
  return { locate, fetchFor, record, reader, themeOf, parcelNear };
})();
