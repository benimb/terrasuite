/* TerraSuite : règles de sécurité incendie et d'accessibilité applicables au projet.
   1. classement du bâtiment à partir de la fiche du projet et de la maquette 3D (hauteur du dernier plancher, nombre d'étages) :
      habitation (familles 1 à 4, arrêté du 31 janvier 1986), ERP (type et catégorie, CCH R143-19 et seuils de la 5e catégorie),
      immeuble de grande hauteur (CCH R146-3), lieu de travail (code du travail) ;
   2. textes d'accessibilité applicables (neuf ou existant, habitation ou ERP) ;
   3. contrôles sur les données du projet (ascenseur, famille 3A, hauteur, sous-sol…), conformes, non conformes ou à vérifier.
   Les exigences détaillées (dégagements, isolement, désenfumage, cheminements…) sont relevées par Claude dans la conversation
   et importées ici (format terrasuite-secu), comme l'analyse du PLU. Les seuils sont rappelés à titre indicatif : le texte en vigueur fait foi. */
const TSSecu = (() => {
  const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = v => { const n = parseFloat(String(v ?? '').replace(/\s/g, '').replace(',', '.')); return isFinite(n) ? n : null; };
  const NF1 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });

  /* seuils du 1er groupe (au-delà : 4e catégorie ou plus) : [sous-sol, étages, ensemble des niveaux] ; null = sans seuil propre */
  const TYPES = {
    J: ['Structures d\'accueil pour personnes âgées ou handicapées', null, null, 100, 'Seuil propre : 25 résidents (personnes âgées) ou 20 (personnes handicapées), ou 100 personnes au total.'],
    L: ['Salles d\'audition, de conférences, de réunions, de spectacles, à usage multiple', 100, null, 200, 'Salles de spectacles ou à usage multiple : 20 en sous-sol, 50 au total.'],
    M: ['Magasins de vente, centres commerciaux', 100, 100, 200],
    N: ['Restaurants et débits de boissons', 100, 200, 200],
    O: ['Hôtels et pensions de famille', null, null, 100],
    P: ['Salles de danse et salles de jeux', 20, 100, 120],
    R: ['Établissements d\'enseignement, colonies de vacances', 100, 100, 200, 'Écoles maternelles, crèches, haltes-garderies : interdites en sous-sol, tout accueil en étage classe au moins en 4e catégorie (20 si un seul niveau en étage), 100 au total ; locaux à sommeil : 30.'],
    S: ['Bibliothèques, centres de documentation', 100, 100, 200],
    T: ['Salles d\'exposition à vocation commerciale', 100, 100, 200],
    U: ['Établissements de soins', null, null, 100, 'Avec hébergement : 20 lits.'],
    V: ['Établissements de culte', 100, 200, 300],
    W: ['Administrations, banques, bureaux', 100, 100, 200],
    X: ['Établissements sportifs couverts', 100, 100, 200],
    Y: ['Musées', 100, 100, 200],
    PA: ['Établissements de plein air', null, null, 300],
    CTS: ['Chapiteaux, tentes et structures', null, null, 50],
    GA: ['Gares accessibles au public', null, null, 200, 'Gares souterraines et mixtes : 1er groupe quel que soit l\'effectif.'],
    OA: ['Hôtels-restaurants d\'altitude', null, null, 20],
    EF: ['Établissements flottants', 0, 0, 0, 'Pas de 5e catégorie.']
  };
  const D = { usage: 'hab_coll', travaux: 'neuf', depot: '', indiv: 'isolee', bandeIndep: false, etages: '', hauteur: '', sousSols: '0', distEsc: '', voieEchelles: true, logements: '', ascenseur: false,
    erp: false, erpType: 'N', effSS: '', effRdc: '', effEt: '', personnel: '', travail: false };

  /* maquette 3D du projet (TerraModel) : niveaux, cote du plancher le plus haut, étages au-dessus du sol */
  function maquette(p) {
    try { const m = (JSON.parse(localStorage.getItem('terramodel-maquettes') || '{}') || {})[p.id]; const N = m && m.surf && Array.isArray(m.surf.niveaux) ? m.surf.niveaux.filter(x => x && isFinite(+x.z)) : [];
      if (!N.length) return null; const zs = N.map(x => +x.z).sort((a, b) => a - b), up = zs.filter(z => z > 0.5), under = zs.filter(z => z < -0.5);
      return { niveaux: N.length, hauteur: Math.max(0, zs[zs.length - 1]), etages: up.length, sousSols: under.length, nom: m.nom || '' };
    } catch (e) { return null; }
  }

  /* ---------- classement ---------- */
  function classer(r) {
    const h = num(r.hauteur), et = num(r.etages), out = [], hab = r.usage === 'hab_coll' || r.usage === 'hab_ind';
    if (hab) {
      let fam = '', why = '';
      if (h !== null && h > 50) { fam = 'IGH (classe GHA)'; why = 'plancher bas du dernier niveau à plus de 50 m (CCH R146-3)'; }
      else if (h !== null && h > 28) { fam = '4e famille'; why = 'plancher bas du logement le plus haut entre 28 m et 50 m'; }
      else if (r.usage === 'hab_ind') {
        if (et === null) { fam = '1re ou 2e famille'; why = "nombre d'étages à préciser"; }
        else if (r.indiv === 'bande') { fam = et === 0 || (et <= 1 && r.bandeIndep) ? '1re famille' : '2e famille'; why = et === 0 ? 'maisons à rez-de-chaussée groupées en bande' : et <= 1 && r.bandeIndep ? 'maisons à un étage sur rez-de-chaussée en bande, structures indépendantes' : 'maisons en bande à étage(s)'; }
        else { fam = et <= 1 ? '1re famille' : '2e famille'; why = et <= 1 ? 'maison isolée ou jumelée, un étage sur rez-de-chaussée au plus' : "maison isolée ou jumelée de plus d'un étage sur rez-de-chaussée"; }
      } else {
        if (et === null) { fam = 'à déterminer'; why = "nombre d'étages sur rez-de-chaussée à préciser"; }
        else if (et <= 3) { fam = '2e famille'; why = 'habitation collective, trois étages sur rez-de-chaussée au plus'; }
        else { const d = num(r.distEsc), lim = r.depot && r.depot < '2015-10-01' ? 7 : 10, a = et <= 7 && d !== null && d <= lim && r.voieEchelles;
          fam = a ? '3e famille A' : '3e famille B'; why = a ? `R+${et}, porte palière à ${NF1.format(d)} m de l'escalier (${lim} m au plus), accès par voie échelles` : `ne remplit pas les trois conditions de la 3e famille A (R+7 au plus, porte palière à ${lim} m au plus de l'escalier, voie échelles)`; }
      }
      out.push({ k: 'hab', titre: 'Habitation', val: fam, why, ref: 'Arrêté du 31 janvier 1986 modifié, article 3' });
    }
    if (r.erp || r.usage === 'erp') {
      const T = TYPES[r.erpType] || TYPES.N, ss = num(r.effSS) || 0, rdc = num(r.effRdc) || 0, etg = num(r.effEt) || 0, pub = ss + rdc + etg, pers = num(r.personnel) || 0;
      const over = [T[1] !== null && T[1] !== undefined && ss >= T[1] && (T[1] > 0 || ss > 0), T[2] !== null && T[2] !== undefined && etg >= T[2] && (T[2] > 0 || etg > 0), T[3] !== null && T[3] !== undefined && pub >= T[3]];
      const g1 = r.erpType === 'EF' || over.some(Boolean), tot = pub + pers;
      const cat = !g1 ? 5 : tot > 1500 ? 1 : tot > 700 ? 2 : tot > 300 ? 3 : 4;
      const seuil = [T[1] !== null ? 'sous-sol ' + T[1] : '', T[2] !== null ? 'étages ' + T[2] : '', T[3] !== null ? 'ensemble ' + T[3] : ''].filter(Boolean).join(', ');
      out.push({ k: 'erp', titre: 'Établissement recevant du public', val: `type ${r.erpType}, ${cat === 1 ? '1re' : cat + 'e'} catégorie`, cat,
        why: pub ? (g1 ? `public ${pub} (sous-sol ${ss}, rez-de-chaussée ${rdc}, étages ${etg}) au-delà du seuil de la 5e catégorie (${seuil}) ; catégorie sur public + personnel = ${tot}` : `public ${pub} sous les seuils de la 5e catégorie (${seuil}) ; le personnel n'est pas compté`) : 'effectif du public à saisir',
        ref: cat === 5 ? 'CCH R143-19 ; arrêté du 25 juin 1980, livre III (petits établissements, PE)' : 'CCH R143-19 ; arrêté du 25 juin 1980 (dispositions générales et particulières du type ' + r.erpType + ')', note: T[4] || '' });
      if (h !== null && h > 28) out.push({ k: 'igh', titre: 'Immeuble de grande hauteur', val: 'IGH', why: 'plancher bas du dernier niveau à plus de 28 m', ref: 'CCH R146-3 et R146-4 ; règlement de sécurité IGH' });
    }
    if (r.travail || r.usage === 'travail') {
      if (h !== null && h > 28) out.push({ k: 'igh', titre: 'Immeuble de grande hauteur', val: h > 50 ? 'IGH classe GHW 2' : 'IGH classe GHW 1', why: 'bureaux, plancher bas du dernier niveau à ' + (h > 50 ? 'plus de 50 m' : 'plus de 28 m et 50 m au plus'), ref: 'CCH R146-3 et R146-4' });
      else out.push({ k: 'trav', titre: 'Lieu de travail', val: 'code du travail', why: 'locaux de travail sans public' + (h !== null ? ', dernier plancher à ' + NF1.format(h) + ' m' : ''), ref: 'Code du travail, livre II de la 4e partie (conception des lieux de travail, articles R4216-1 et suivants)' });
    }
    /* un seul IGH : classe des bureaux si le bâtiment en comprend */
    const ig = out.filter(x => x.k === 'igh'); if (ig.length > 1) { const keep = ig.find(x => /GHW/.test(x.val)) || ig[0]; return out.filter(x => x.k !== 'igh' || x === keep); }
    return out;
  }

  /* ---------- accessibilité ---------- */
  function access(r) {
    const neuf = r.travaux === 'neuf', out = [];
    if (r.usage === 'hab_coll') out.push(neuf
      ? { titre: 'Bâtiment d\'habitation collectif neuf', ref: 'CCH (décret 2019-305 du 11 avril 2019) ; arrêté du 24 décembre 2015 modifié', pts: ['Au moins 20 % des logements accessibles, les autres évolutifs (logements en rez-de-chaussée ou desservis par ascenseur) ; permis déposés depuis le 1er octobre 2019', "Ascenseur obligatoire au-delà de deux étages accueillant des logements au-dessus ou au-dessous du rez-de-chaussée (R+3) ; permis déposés depuis le 1er octobre 2019", 'Cheminements extérieurs, stationnement adapté, parties communes, locaux collectifs'] }
      : { titre: "Bâtiment d'habitation collectif existant (travaux ou changement de destination)", ref: 'Arrêté du 26 février 2007', pts: ['Exigences sur les parties modifiées ; logements créés par changement de destination soumis aux règles du neuf avec atténuations'] });
    if (r.usage === 'hab_ind') out.push(neuf
      ? { titre: 'Maison individuelle neuve', ref: 'Arrêté du 24 décembre 2015 modifié', pts: ['Applicable aux maisons construites pour être louées ou vendues, pas à celles construites pour son propre usage', 'Cheminement depuis la voie, stationnement, unité de vie au niveau d\'accès'] }
      : { titre: 'Maison individuelle existante', ref: '—', pts: ["Pas d'obligation générale d'accessibilité pour les travaux dans une maison existante"] });
    if (r.erp || r.usage === 'erp') out.push(neuf
      ? { titre: 'ERP neuf', ref: 'Arrêté du 20 avril 2017 (permis déposés depuis le 1er juillet 2017)', pts: ['Cheminements extérieurs, stationnement, accès, accueil, circulations intérieures horizontales et verticales, sanitaires, équipements', 'Attestation de prise en compte des règles d\'accessibilité jointe au permis, attestation de conformité à l\'achèvement', 'Registre public d\'accessibilité (arrêté du 19 avril 2017)'] }
      : { titre: 'ERP existant', ref: 'Arrêté du 8 décembre 2014 modifié', pts: ['Mise en accessibilité des parties où des travaux sont faits, avec dérogations possibles', 'Registre public d\'accessibilité (arrêté du 19 avril 2017)', 'Agenda d\'accessibilité programmée si l\'établissement n\'est pas encore conforme'] });
    if (r.travail || r.usage === 'travail') out.push({ titre: 'Lieu de travail', ref: 'Code du travail (lieux de travail neufs ou aménagés)', pts: ['Accessibilité des locaux de travail aux personnes handicapées : circulations, portes, sanitaires, postes de travail'] });
    return out;
  }

  /* ---------- contrôles sur les données du projet ---------- */
  function controles(r, cl, mq) {
    const C = [], h = num(r.hauteur), et = num(r.etages), ss = num(r.sousSols) || 0, add = (s, t, d) => C.push({ s, t, d });
    if (h === null) add('?', 'Hauteur du dernier plancher', 'à saisir, ou à reprendre de la maquette 3D');
    else if (mq && Math.abs(mq.hauteur - h) > 0.05) add('?', 'Hauteur du dernier plancher', `saisie ${NF1.format(h)} m, maquette ${NF1.format(mq.hauteur)} m`);
    if (r.usage === 'hab_coll') {
      const al = r.depot && r.depot < '2019-10-01' ? 3 : 2; /* plus de trois étages avant le décret 2019-305, plus de deux depuis */
      if (et !== null && et > al && r.travaux === 'neuf') add(r.ascenseur ? 'ok' : 'ko', 'Ascenseur', r.ascenseur ? `prévu (R+${et})` : `obligatoire à R+${et} (plus de ${al === 2 ? 'deux' : 'trois'} étages de logements) et non prévu`);
      if (et !== null && et <= al && r.travaux === 'neuf') add('ok', 'Ascenseur', `non obligatoire à R+${et}`);
      if (et !== null && et === 3 && h !== null && h > 8) add('!', 'Escalier', 'R+3 dont le plancher bas du logement le plus haut est à plus de 8 m : escalier encloisonné');
      const f = cl.find(x => x.k === 'hab'); if (f && /3e famille B/.test(f.val) && et <= 7) add('!', 'Famille 3B', 'classement en 3A possible si la distance porte palière / escalier et la voie échelles le permettent : moins de contraintes sur l\'escalier');
      const n = num(r.logements); if (n && r.travaux === 'neuf') add('!', 'Logements accessibles', `${Math.ceil(n * 0.2)} logement(s) accessible(s) au moins sur ${n} (20 %), les autres évolutifs`);
    }
    if (r.erp || r.usage === 'erp') {
      if (r.erpType === 'R' && ss > 0) add('!', 'Sous-sol', 'accueil des enfants de maternelle et de crèche interdit en sous-sol');
      const e = cl.find(x => x.k === 'erp'); if (e && !(num(r.effSS) || num(r.effRdc) || num(r.effEt))) add('?', 'Effectif du public', 'à saisir par niveau pour classer l\'établissement');
      if (e && e.cat <= 4) add('!', 'Commission de sécurité', `ERP du 1er groupe (${e.cat === 1 ? '1re' : e.cat + 'e'} catégorie) : avis de la commission sur le permis, visite avant ouverture`);
      if (ss > 0 && (num(r.effSS) || 0) > 0) add('!', 'Public en sous-sol', `${num(r.effSS)} personnes en sous-sol : dégagements et désenfumage propres`);
    }
    if (cl.some(x => x.k === 'igh')) add('!', 'Grande hauteur', 'IGH : autorisation spécifique, avis de la commission consultative départementale');
    if (mq && et !== null && mq.etages !== et) add('?', "Nombre d'étages", `saisi R+${et}, maquette R+${mq.etages}`);
    return C;
  }

  /* demande à coller dans une conversation avec Claude */
  function demande(p, r, cl) {
    return `Relève les exigences de sécurité incendie et d'accessibilité applicables au projet ${[p.code, p.nom].filter(Boolean).join(' · ')}${p.adresse ? ', ' + [p.adresse, p.cp, p.ville].filter(Boolean).join(' ') : ''}.
Données : usage ${({ hab_coll: 'habitation collective', hab_ind: 'maison individuelle', erp: 'ERP', travail: 'bureaux / lieu de travail' })[r.usage]}${r.erp && r.usage !== 'erp' ? ' + ERP' : ''}${r.travail && r.usage !== 'travail' ? ' + bureaux' : ''}, ${r.travaux === 'neuf' ? 'construction neuve' : 'travaux sur existant'}${r.depot ? ', dépôt du permis ' + r.depot : ''}, R+${r.etages || '?'}, ${r.sousSols || 0} sous-sol(s), dernier plancher à ${r.hauteur || '?'} m${r.logements ? ', ' + r.logements + ' logements' : ''}${r.erp || r.usage === 'erp' ? `, ERP type ${r.erpType}, public ${[r.effSS || 0, r.effRdc || 0, r.effEt || 0].join(' / ')} (sous-sol / RDC / étages), personnel ${r.personnel || 0}` : ''}.
Classement calculé par TerraSuite : ${cl.map(x => x.titre + ' : ' + x.val).join(' ; ') || 'à déterminer'}.
Vérifie ce classement, puis donne pour chaque thème (dégagements et escaliers, isolement et résistance au feu, réaction au feu, désenfumage, accès des secours, moyens de secours, cheminements, stationnement, circulations, sanitaires, logements adaptés) les exigences chiffrées avec le texte et l'article, en vérifiant chaque référence sur Légifrance.
Rends un fichier JSON : {"format":"terrasuite-secu","date":"AAAA-MM-JJ","synthese":"…","classement":"…","exigences":[{"domaine":"incendie|accessibilité","theme":"…","exigence":"…","valeur":"…","texte":"…","article":"…","url":"…"}],"points":["à vérifier…"]}`;
  }

  /* ---------- écran ---------- */
  async function view(p, body, X) {
    const { SD, printDoc, dFr, today } = X;
    const recs = await SD.list('secu', p.id); let r = recs.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))[0] || null;
    const mq = maquette(p);
    if (!r) { r = { id: DB.uid(), format: 'terrasuite-secu-donnees', date: today(), ...D }; if (mq) { r.hauteur = String(mq.hauteur); r.etages = String(mq.etages); r.sousSols = String(mq.sousSols); } }
    const save = async () => { r.date = today(); await SD.put('secu', p.id, r); };
    const cl = classer(r), ac = access(r), ct = controles(r, cl, mq), A = r.analyse || null;
    const fld = (k, lab, w, hint) => `<label class="sf"><span>${lab}</span><input data-k="${k}" value="${E(r[k] ?? '')}" inputmode="decimal" style="width:${w || 80}px">${hint ? `<small class="hint">${hint}</small>` : ''}</label>`;
    const chk = (k, lab) => `<label class="sf ck"><input type="checkbox" data-c="${k}"${r[k] ? ' checked' : ''}> ${lab}</label>`;
    const sel = (k, lab, opts) => `<label class="sf"><span>${lab}</span><select data-k="${k}">${opts.map(([v, t]) => `<option value="${v}"${r[k] === v ? ' selected' : ''}>${E(t)}</option>`).join('')}</select></label>`;
    const ST = { ok: ['Conforme', 'var(--ok)'], ko: ['Non conforme', 'var(--warn)'], '!': ['Exigence', 'var(--info)'], '?': ['À vérifier', '#a16207'] };
    const hab = r.usage === 'hab_coll' || r.usage === 'hab_ind', erpOn = r.erp || r.usage === 'erp';
    body.innerHTML = `<style>.sf{display:inline-flex;flex-direction:column;gap:3px;margin:0 14px 10px 0;font-size:13px;vertical-align:top}.sf>span{color:var(--muted)}.sf.ck{flex-direction:row;align-items:center;gap:6px;margin-top:18px}.sf small{max-width:220px}.secl{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));margin:6px 0 14px}.secl .card{padding:12px 14px}.secl .v{font-weight:700;font-size:17px;margin:2px 0}.sct td{vertical-align:top}.stb{display:inline-block;font-size:11px;font-weight:700;color:#fff;border-radius:4px;padding:2px 6px;white-space:nowrap}.secu h3{margin:18px 0 8px;font-size:15px}.secu ul{margin:4px 0 0 18px;padding:0}</style>
    <div class="wrap secu" style="max-width:1100px"><div class="card">
      <div class="row" style="justify-content:space-between;margin-bottom:6px;flex-wrap:wrap;gap:8px"><h2 style="margin:0">Incendie et accessibilité</h2><div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn" id="scAsk">Copier la demande pour Claude</button><button class="btn" id="scImp">Importer l'analyse de Claude</button><button class="btn" id="scPr">Imprimer</button></div></div>
      <p class="muted" style="margin:0 0 12px">Classement et textes applicables calculés à partir des données ci-dessous${mq ? ' (hauteur et étages repris de la maquette 3D' + (mq.nom ? ' « ' + E(mq.nom) + ' »' : '') + ')' : ''}. Pour les exigences détaillées article par article, copiez la demande dans une conversation avec Claude et importez le fichier qu'il vous rend. Seuils rappelés à titre indicatif : le texte en vigueur fait foi.</p>
      <div>
        ${sel('usage', 'Usage principal', [['hab_coll', 'Habitation collective'], ['hab_ind', 'Maison individuelle'], ['erp', 'ERP'], ['travail', 'Bureaux, lieu de travail']])}
        ${sel('travaux', 'Nature des travaux', [['neuf', 'Construction neuve'], ['existant', 'Travaux sur existant']])}
        <label class="sf"><span>Dépôt du permis</span><input type="date" data-k="depot" value="${E(r.depot || '')}"></label>
        ${fld('etages', 'Étages sur RDC', 60, 'R+n')}${fld('sousSols', 'Sous-sols', 50)}${fld('hauteur', 'Dernier plancher (m)', 70, 'plancher bas du niveau le plus haut, depuis le sol accessible aux secours')}
        ${mq ? `<button class="btn sm" id="scMq" style="margin:18px 14px 10px 0">Reprendre la maquette (R+${mq.etages}, ${NF1.format(mq.hauteur)} m)</button>` : ''}
      </div>
      ${hab ? `<div>${r.usage === 'hab_ind' ? sel('indiv', 'Maisons', [['isolee', 'Isolée ou jumelée'], ['bande', 'Groupées en bande']]) + (r.indiv === 'bande' ? chk('bandeIndep', 'Structures indépendantes') : '') : fld('distEsc', 'Porte palière → escalier (m)', 70, 'logement le plus éloigné') + chk('voieEchelles', 'Logements accessibles par voie échelles') + fld('logements', 'Logements', 60) + chk('ascenseur', 'Ascenseur prévu')}</div>` : ''}
      <div>${r.usage !== 'erp' ? chk('erp', 'Comprend un ERP (commerce, crèche…)') : ''}${r.usage !== 'travail' ? chk('travail', 'Comprend des bureaux sans public') : ''}</div>
      ${erpOn ? `<div>${sel('erpType', "Type d'ERP", Object.entries(TYPES).map(([k, v]) => [k, k + ' · ' + v[0]]))}${fld('effSS', 'Public sous-sol', 60)}${fld('effRdc', 'Public RDC', 60)}${fld('effEt', 'Public étages', 60)}${fld('personnel', 'Personnel', 60)}</div>` : ''}

      <h3>Classement incendie</h3>
      ${cl.length ? `<div class="secl">${cl.map(x => `<div class="card"><div class="hint">${E(x.titre)}</div><div class="v">${E(x.val)}</div><div style="font-size:13px">${E(x.why)}</div>${x.note ? `<div class="hint" style="margin-top:4px">${E(x.note)}</div>` : ''}<div class="hint" style="margin-top:6px">${E(x.ref)}</div></div>`).join('')}</div>` : '<p class="muted">Choisissez l\'usage.</p>'}
      <h3>Accessibilité</h3>
      <div class="secl">${ac.map(x => `<div class="card"><div class="v" style="font-size:15px">${E(x.titre)}</div><div class="hint">${E(x.ref)}</div><ul>${x.pts.map(t => `<li style="font-size:13px">${E(t)}</li>`).join('')}</ul></div>`).join('')}</div>
      <h3>Contrôles sur le projet</h3>
      ${ct.length ? `<table class="t sct"><tbody>${ct.map(c => `<tr><td style="width:110px"><span class="stb" style="background:${ST[c.s][1]}">${ST[c.s][0]}</span></td><td style="width:200px"><b>${E(c.t)}</b></td><td>${E(c.d)}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">Aucun point relevé.</p>'}
      ${A ? `<h3>Exigences relevées par Claude <span class="hint">${E(A.date ? 'analyse du ' + dFr(A.date) : '')}</span></h3>${A.synthese ? `<p>${E(A.synthese)}</p>` : ''}${A.classement ? `<p class="hint">Classement retenu : ${E(A.classement)}</p>` : ''}
        <div class="tscroll"><table class="t sct"><thead><tr><th>Domaine</th><th>Thème</th><th style="min-width:260px">Exigence</th><th>Valeur</th><th>Référence</th></tr></thead><tbody>${(A.exigences || []).map(x => `<tr><td>${E(x.domaine)}</td><td>${E(x.theme)}</td><td>${E(x.exigence)}</td><td style="white-space:nowrap">${E(x.valeur)}</td><td>${x.url ? `<a href="${E(x.url)}" target="_blank" rel="noopener">${E([x.texte, x.article].filter(Boolean).join(', '))}</a>` : E([x.texte, x.article].filter(Boolean).join(', '))}</td></tr>`).join('')}</tbody></table></div>
        ${(A.points || []).length ? `<p class="hint" style="margin-top:8px">À vérifier : ${A.points.map(E).join(' · ')}</p>` : ''}` : ''}
      <p class="hint" style="margin-top:14px">Sources : arrêté du 31 janvier 1986 (habitation), CCH R143-19 (catégories d'ERP), R146-3 (grande hauteur), arrêté du 25 juin 1980 (ERP), décret 2019-305 (ascenseur, logements évolutifs), arrêtés du 24 décembre 2015, 26 février 2007, 20 avril 2017 et 8 décembre 2014 (accessibilité).</p>
    </div></div>`;
    const redraw = () => view(p, body, X);
    body.querySelectorAll('[data-k]').forEach(el => el.addEventListener('change', async () => { r[el.dataset.k] = el.value; await save(); redraw(); }));
    body.querySelectorAll('[data-c]').forEach(el => el.addEventListener('change', async () => { r[el.dataset.c] = el.checked; await save(); redraw(); }));
    const bm = body.querySelector('#scMq'); if (bm) bm.onclick = async () => { r.hauteur = String(mq.hauteur); r.etages = String(mq.etages); r.sousSols = String(mq.sousSols); await save(); redraw(); };
    body.querySelector('#scAsk').onclick = async e => { const t = demande(p, r, cl); try { await navigator.clipboard.writeText(t); e.target.textContent = 'Demande copiée'; } catch (x) { prompt('Copiez la demande :', t); } };
    body.querySelector('#scImp').onclick = () => { const i = document.createElement('input'); i.type = 'file'; i.accept = '.json,application/json'; i.onchange = async () => { try { const J = JSON.parse(await i.files[0].text()); if (J.format !== 'terrasuite-secu') throw new Error('format terrasuite-secu attendu'); if (!Array.isArray(J.exigences)) throw new Error('liste « exigences » absente'); r.analyse = J; await save(); redraw(); } catch (x) { alert('Import impossible : ' + (x.message || x)); } }; i.click(); };
    body.querySelector('#scPr').onclick = () => printDoc('Sécurité incendie et accessibilité', p,
      `<h2>Classement incendie</h2><table class="pt"><tbody>${cl.map(x => `<tr><td><b>${E(x.titre)}</b></td><td><b>${E(x.val)}</b><br>${E(x.why)}${x.note ? '<br><i>' + E(x.note) + '</i>' : ''}</td><td>${E(x.ref)}</td></tr>`).join('')}</tbody></table>
      <h2>Accessibilité</h2><table class="pt"><tbody>${ac.map(x => `<tr><td><b>${E(x.titre)}</b><br>${E(x.ref)}</td><td>${x.pts.map(E).join('<br>')}</td></tr>`).join('')}</tbody></table>
      <h2>Contrôles</h2><table class="pt"><tbody>${ct.map(c => `<tr><td>${ST[c.s][0]}</td><td><b>${E(c.t)}</b></td><td>${E(c.d)}</td></tr>`).join('')}</tbody></table>
      ${A ? `<h2>Exigences relevées</h2><table class="pt"><thead><tr><th>Thème</th><th>Exigence</th><th>Valeur</th><th>Référence</th></tr></thead><tbody>${(A.exigences || []).map(x => `<tr><td>${E(x.theme)}</td><td>${E(x.exigence)}</td><td>${E(x.valeur)}</td><td>${E([x.texte, x.article].filter(Boolean).join(', '))}</td></tr>`).join('')}</tbody></table>` : ''}
      <p style="font-size:10px;color:#666">Classement indicatif établi par TerraSuite à partir des données du projet ; le texte en vigueur fait foi.</p>`);
  }
  return { view, classer, access, controles, TYPES };
})();
