/* TerraDocs : schémas de navigation.
   1. « maison » : coupe d'une maison sur son terrain ; chaque zone porte le code d'un lot (00 à 20).
   2. « lots » : un schéma de détail par lot ; chaque zone porte un motif reconnu dans le nom des sous-catégories
      (texte sans accents, en minuscules). Une sous-catégorie prend la première zone libre dont le motif correspond ;
      les sous-catégories sans zone restent proposées dans la liste à côté du schéma.
   Les couleurs viennent de classes CSS (c-…) définies dans TerraDocs.html, pour suivre le thème clair ou sombre. */
(() => {
  const R = (x, y, w, h, c, rx) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" class="${c}"${rx ? ` rx="${rx}"` : ''}/>`;
  const P = (pts, c) => `<polygon points="${pts}" class="${c}"/>`;
  const PL = (pts, c) => `<polyline points="${pts}" class="${c || 'ln'}"/>`;
  const L = (x1, y1, x2, y2, c) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${c || 'ln'}"/>`;
  const C = (cx, cy, r, c) => `<circle cx="${cx}" cy="${cy}" r="${r}" class="${c}"/>`;
  const PA = (d, c) => `<path d="${d}" class="${c}"/>`;
  const rep = (n, f) => Array.from({ length: n }, (_, i) => f(i)).join('');
  /* fenêtre en élévation : cadre, vitrage, traverse */
  const WIN = (x, y, w, h, c) => R(x, y, w, h, c || 'c-frame') + R(x + 4, y + 4, w - 8, h - 8, 'c-glass') + L(x + w / 2, y + 4, x + w / 2, y + h - 4);

  /* ================= maison en coupe (viewBox 0 0 1000 600) ================= */
  const maison = {
    vb: '0 0 1000 600',
    base: R(0, 430, 1000, 170, 'c-earth') + R(300, 430, 460, 100, 'c-void') + L(0, 430, 1000, 430, 'ln2'),
    zones: {
      '19': R(0, 424, 296, 6, 'c-green') + R(776, 424, 84, 6, 'c-green') + R(196, 360, 8, 66, 'c-wood') + C(200, 340, 34, 'c-green') + C(176, 360, 20, 'c-green') + C(224, 362, 20, 'c-green') + C(846, 412, 13, 'c-green'),
      '18': R(860, 426, 140, 8, 'c-pave') + rep(7, i => L(870 + i * 20, 426, 870 + i * 20, 434)) + R(918, 434, 26, 74, 'c-con') + R(914, 430, 34, 5, 'c-metal') + PL('760,500 918,500', 'pipe') + PL('944,490 1000,490', 'pipe'),
      '00': R(22, 384, 76, 42, 'c-site') + P('18,384 102,384 98,376 22,376', 'c-metal') + R(34, 396, 16, 12, 'c-glass') + R(60, 398, 14, 28, 'c-frame') + R(108, 392, 68, 34, 'c-none') + rep(5, i => L(108 + i * 17, 392, 108 + i * 17, 426)) + L(108, 392, 176, 392) + L(108, 409, 176, 409) + R(112, 424, 10, 4, 'c-con') + R(162, 424, 10, 4, 'c-con'),
      '02': R(300, 230, 12, 200, 'c-con') + R(748, 222, 12, 208, 'c-con') + R(300, 430, 460, 10, 'c-con') + R(300, 440, 12, 80, 'c-con') + R(748, 440, 12, 80, 'c-con') + R(312, 510, 436, 10, 'c-con') + R(292, 520, 28, 14, 'c-con') + R(740, 520, 28, 14, 'c-con') + R(300, 320, 180, 10, 'c-con') + R(556, 320, 204, 10, 'c-con') + R(556, 220, 204, 10, 'c-con'),
      '06': R(760, 214, 8, 216, 'c-ins') + R(768, 214, 6, 216, 'c-wood') + rep(10, i => L(768, 222 + i * 21, 774, 222 + i * 21)) + R(293, 236, 7, 194, 'c-render'),
      '13': R(586, 238, 130, 74, 'c-paint') + R(330, 340, 120, 50, 'c-paint2'),
      '03': PL('300,230 430,128 560,230', 'beam') + L(300, 230, 560, 230, 'beam') + L(430, 128, 430, 230, 'beam') + L(430, 200, 368, 182, 'beam2') + L(430, 200, 492, 182, 'beam2'),
      '04': P('284,240 430,114 576,240 566,242 430,126 294,242', 'c-tile') + C(286, 243, 5, 'c-metal') + P('343,175 372,152 380,161 351,184', 'c-glass2'),
      '05': R(556, 212, 214, 8, 'c-membrane') + R(756, 200, 18, 20, 'c-con') + PA('M612 212 Q640 186 668 212 Z', 'c-glass2'),
      '08': L(570, 186, 750, 186, 'rail') + rep(10, i => L(574 + i * 19, 186, 574 + i * 19, 212, 'ln')) + R(818, 396, 40, 30, 'c-none') + rep(6, i => L(822 + i * 7, 396, 822 + i * 7, 426, 'rail2')) + L(818, 398, 858, 398, 'rail2'),
      '09': R(468, 330, 6, 20, 'c-plaster') + R(468, 232, 6, 82, 'c-plaster') + R(474, 338, 176, 4, 'c-plaster') + R(694, 338, 54, 4, 'c-plaster') + L(520, 330, 520, 338) + L(600, 330, 600, 338) + L(720, 330, 720, 338),
      '10': R(467, 350, 8, 74, 'c-wood') + C(472, 388, 1.6, 'c-dark') + PL('480,424 480,412 492,412 492,400 504,400 504,388 516,388 516,376 528,376 528,364 540,364 540,352 552,352 552,340 560,340 560,330', 'stair'),
      '11': R(312, 424, 436, 6, 'c-tile2') + rep(21, i => L(332 + i * 20, 424, 332 + i * 20, 430)) + R(316, 258, 58, 56, 'c-tile2') + rep(4, i => L(316, 272 + i * 14, 374, 272 + i * 14)) + rep(3, i => L(330 + i * 14, 258, 330 + i * 14, 314)),
      '12': R(556, 314, 192, 6, 'c-soft'),
      '14': R(320, 294, 70, 20, 'c-white', 6) + R(398, 282, 26, 6, 'c-white', 2) + R(406, 288, 10, 26, 'c-white') + R(436, 292, 18, 22, 'c-white', 3) + R(434, 280, 10, 14, 'c-white', 2) + R(328, 448, 26, 54, 'c-white', 8) + PL('341,448 341,430', 'pipe'),
      '15': R(318, 398, 28, 22, 'c-metal') + rep(5, i => L(322 + i * 5, 400, 322 + i * 5, 418)) + R(780, 400, 30, 24, 'c-metal', 2) + C(795, 412, 8, 'c-none') + R(536, 100, 12, 112, 'c-con') + R(588, 448, 30, 40, 'c-metal', 3) + PL('603,448 603,430', 'pipe'),
      '16': R(380, 452, 28, 36, 'c-dark') + rep(3, i => L(384, 460 + i * 9, 404, 460 + i * 9, 'ln-l')) + L(392, 330, 392, 344) + C(392, 349, 6, 'c-light') + R(450, 404, 8, 8, 'c-white', 1) + L(394, 452, 394, 430, 'pipe2'),
      '17': L(652, 232, 652, 510, 'ln2') + L(692, 232, 692, 510, 'ln2') + R(655, 352, 34, 70, 'c-metal', 2) + L(672, 352, 672, 422),
      '07': R(301, 360, 10, 42, 'c-glass') + R(301, 252, 10, 44, 'c-glass') + R(749, 344, 10, 80, 'c-glass') + R(746, 334, 16, 10, 'c-frame') + R(749, 244, 10, 50, 'c-glass') + L(754, 344, 754, 424),
      '20': R(360, 396, 72, 28, 'c-wood') + R(358, 393, 76, 4, 'c-work') + R(360, 344, 72, 22, 'c-wood') + R(586, 404, 56, 20, 'c-fabric', 4) + R(586, 392, 12, 32, 'c-fabric', 4) + R(612, 292, 92, 16, 'c-fabric', 3) + R(608, 276, 6, 38, 'c-wood')
    },
    /* ordre de dessin : les grands ensembles d'abord, les petits objets au-dessus */
    ordre: ['19', '18', '00', '02', '06', '13', '03', '04', '05', '08', '09', '10', '11', '12', '14', '15', '16', '17', '07', '20'],
    pins: { '00': [60, 360], '02': [312, 540], '03': [430, 214], '04': [470, 140], '05': [700, 200], '06': [786, 300], '07': [736, 384], '08': [600, 176], '09': [486, 300], '10': [530, 404],
      '11': [420, 440], '12': [600, 326], '13': [700, 250], '14': [360, 284], '15': [796, 388], '16': [394, 474], '17': [672, 340], '18': [960, 470], '19': [200, 300], '20': [614, 384] }
  };

  /* ================= schémas de détail (viewBox 0 0 600 360) ================= */
  const G = R(0, 300, 600, 60, 'c-earth') + L(0, 300, 600, 300, 'ln2'); /* sol */
  const lots = {
    '00': { base: G, zones: [
      { k: /clotur|acces/, d: rep(6, i => R(330 + i * 40, 230, 38, 70, 'c-none') + L(330 + i * 40, 250, 368 + i * 40, 250) + L(330 + i * 40, 270, 368 + i * 40, 270) + rep(3, j => L(340 + i * 40 + j * 9, 230, 340 + i * 40 + j * 9, 300))) + rep(7, i => R(326 + i * 40, 296, 12, 6, 'c-con')), pin: [450, 214] },
      { k: /installation|base vie|cantonnement/, d: R(40, 220, 140, 80, 'c-site') + R(40, 140, 140, 80, 'c-site') + rep(2, i => R(60 + i * 60, 160, 36, 24, 'c-glass') + R(60 + i * 60, 240, 36, 24, 'c-glass')) + PL('180,150 214,150 214,300', 'rail') + rep(5, i => L(180, 180 + i * 24, 214, 168 + i * 24, 'ln')), pin: [110, 124] },
      { k: /signal|panneau/, d: R(240, 200, 60, 40, 'c-paint') + L(270, 240, 270, 300, 'rail'), pin: [270, 186] }
    ] },
    '01': { base: G + R(60, 120, 480, 180, 'c-void'), zones: [
      { k: /desamiant|amiante|plomb/, d: R(70, 130, 140, 160, 'c-hatch') + R(70, 130, 140, 160, 'c-none'), pin: [140, 116] },
      { k: /curage/, d: R(240, 230, 60, 60, 'c-metal') + R(310, 250, 50, 40, 'c-wood') + PL('250,230 270,210 300,224', 'ln'), pin: [300, 206] },
      { k: /demol/, d: PL('400,290 400,180 430,160 452,190 480,150 520,170 520,290', 'c-con') + rep(4, i => R(410 + i * 26, 296 - (i % 2) * 8, 18, 10, 'c-con')), pin: [460, 136] }
    ] },
    '02': { base: G, zones: [
      { k: /impermeab|cuvelage/, d: R(40, 160, 18, 190, 'c-con') + R(58, 160, 6, 190, 'c-water') + R(40, 340, 220, 14, 'c-con') + R(58, 334, 202, 6, 'c-water'), pin: [76, 150] },
      { k: /bloc/, d: rep(9, r => r % 2 ? R(100, 120 + r * 20, 20, 18, 'c-con') + R(122, 120 + r * 20, 42, 18, 'c-con') + R(166, 120 + r * 20, 42, 18, 'c-con') + R(210, 120 + r * 20, 20, 18, 'c-con') : rep(3, c => R(100 + c * 44, 120 + r * 20, 42, 18, 'c-con'))), pin: [166, 106] },
      { k: /plancher|predall|poutrell|hourdi/, d: R(250, 104, 200, 10, 'c-con') + rep(5, i => R(256 + i * 40, 114, 34, 14, 'c-con2') + R(290 + i * 40, 114, 6, 16, 'c-metal')), pin: [350, 92] },
      { k: /mortier|reparation|beton/, d: R(270, 136, 26, 164, 'c-con') + P('270,190 282,184 290,200 284,214 270,212', 'c-repair'), pin: [283, 164] },
      { k: /mastic|joint/, d: R(330, 160, 50, 140, 'c-con') + R(386, 160, 50, 140, 'c-con') + R(380, 160, 6, 140, 'c-joint'), pin: [383, 148] },
      { k: /verre|brique.*pave|pave.*verre/, d: R(470, 140, 100, 160, 'c-con') + rep(4, r => rep(3, c => R(476 + c * 32, 146 + r * 38, 28, 34, 'c-glass'))), pin: [520, 126] },
      { k: /fondation|semelle|micropieu/, d: R(20, 300, 80, 0, 'c-none'), pin: null }
    ] },
    '03': { base: G, zones: [
      { k: /ingenierie|lamelle|clt|poutre/, d: R(40, 120, 300, 26, 'c-wood') + rep(6, i => L(40, 124 + i * 4, 340, 124 + i * 4, 'ln-l')) + R(60, 200, 160, 70, 'c-wood') + rep(4, i => L(60, 214 + i * 14, 220, 214 + i * 14, 'ln-l')) + R(250, 180, 10, 120, 'c-wood') + R(250, 180, 60, 6, 'c-wood') + R(250, 294, 60, 6, 'c-wood'), pin: [190, 106] },
      { k: /connecteur|fixation|sabot|equerre/, d: R(340, 146, 18, 154, 'c-wood') + R(330, 120, 120, 26, 'c-wood') + P('358,146 382,146 382,150 362,150 362,170 358,170', 'c-metal') + rep(3, i => C(370, 154 + i * 5, 1.5, 'c-dark')), pin: [392, 162] },
      { k: /ossature|mob|mur.*bois|panneau/, d: R(420, 150, 150, 150, 'c-none') + rep(6, i => R(420 + i * 28, 150, 6, 150, 'c-wood')) + R(420, 150, 150, 6, 'c-wood') + R(420, 294, 150, 6, 'c-wood') + R(420, 156, 150, 138, 'c-ins-t'), pin: [496, 136] }
    ] },
    '04': { base: G + R(40, 270, 16, 30, 'c-con') + R(544, 270, 16, 30, 'c-con') + R(56, 278, 488, 6, 'c-plaster') + P('48,272 300,90 552,272', 'c-void'), zones: [
      { k: /sous-toiture|ecran/, d: P('44,282 300,98 300,106 52,290', 'c-membrane2'), pin: [96, 276] },
      { k: /tuile.*terre|terre cuite/, d: P('30,276 300,80 300,98 44,288', 'c-tile') + rep(7, i => L(64 + i * 34, 252 - i * 24.6, 70 + i * 34, 262 - i * 24.6, 'ln-w')), pin: [184, 150] },
      { k: /tuile.*verre|verre/, d: P('219,140 241,124 247,134 225,150', 'c-glass2'), pin: [246, 108] },
      { k: /fenetre.*toit|fenetre de toit/, d: P('112,222 158,189 166,200 120,233', 'c-frame') + P('118,220 155,193 160,200 123,227', 'c-glass2'), pin: [128, 186] },
      { k: /bac|acier|support/, d: P('300,80 572,276 558,288 300,98', 'c-metal') + rep(8, i => L(330 + i * 30, 102 + i * 21.7, 324 + i * 30, 110 + i * 21.7)), pin: [470, 170] },
      { k: /conduit.*lumiere|lumiere/, d: R(374, 152, 14, 126, 'c-glass') + PA('M370 152 Q381 136 392 152 Z', 'c-glass2') + R(364, 278, 34, 4, 'c-white'), pin: [404, 140] },
      { k: /acces|desenfumage|trappe/, d: P('468,212 504,238 496,248 460,222', 'c-frame') + P('468,212 482,184 516,206 504,238', 'c-glass2') + L(486, 228, 494, 206, 'rail2'), pin: [534, 196] },
      { k: /raccord|accessoire|motoris|zingu|gouttiere/, d: C(30, 282, 8, 'c-metal') + R(24, 290, 6, 10, 'c-metal') + R(288, 70, 24, 14, 'c-metal'), pin: [22, 256] }
    ] },
    '05': { base: G + R(20, 200, 560, 100, 'c-void') + R(20, 186, 560, 14, 'c-con') + R(20, 176, 560, 10, 'c-ins') + R(20, 170, 560, 6, 'c-membrane') + R(20, 150, 14, 36, 'c-con') + R(566, 150, 14, 36, 'c-con'), zones: [
      { k: /lanterneau|toit plat|fenetre/, d: R(80, 150, 90, 20, 'c-frame') + PA('M84 150 Q125 116 166 150 Z', 'c-glass2') + R(84, 186, 82, 14, 'c-void2'), pin: [125, 110] },
      { k: /exutoire|desenfum|denfc/, d: R(240, 156, 90, 14, 'c-frame') + P('240,156 268,104 344,124 330,156', 'c-glass2') + L(300, 156, 314, 120, 'rail2'), pin: [300, 90] },
      { k: /zenithal|voute|filante/, d: R(390, 158, 160, 12, 'c-frame') + PA('M394 158 Q470 92 546 158 Z', 'c-glass2') + rep(4, i => PA(`M${410 + i * 34} 152 Q${410 + i * 34} 120 ${410 + i * 34} 120`, 'ln')), pin: [470, 88] },
      { k: /membrane|bitum|etanch|vegetal/, d: R(180, 166, 50, 4, 'c-membrane'), pin: null }
    ] },
    '06': { base: G + R(20, 70, 560, 230, 'c-void'), zones: [
      { k: /bardage/, d: R(20, 70, 80, 230, 'c-wood') + rep(7, i => L(30 + i * 11, 70, 30 + i * 11, 300, 'ln-l')), pin: [60, 56] },
      { k: /brique/, d: R(100, 70, 80, 230, 'c-brick') + rep(19, r => L(100, 82 + r * 12, 180, 82 + r * 12, 'ln-w') + rep(3, c => L(108 + c * 26 + (r % 2) * 13, 70 + r * 12, 108 + c * 26 + (r % 2) * 13, 82 + r * 12, 'ln-w'))), pin: [140, 56] },
      { k: /enduit|ravalement/, d: R(180, 70, 80, 230, 'c-render') + P('214,200 246,188 252,196 222,210', 'c-metal') + L(232, 205, 236, 222, 'rail2'), pin: [220, 56] },
      { k: /isolation.*exterieur|ite|ventil/, d: R(260, 70, 80, 230, 'c-ins') + rep(5, i => L(260, 110 + i * 40, 340, 110 + i * 40, 'ln-l')) + rep(2, i => L(286 + i * 27, 70, 286 + i * 27, 300, 'ln-l')) + R(330, 70, 10, 230, 'c-render'), pin: [300, 56] },
      { k: /ossature bois|prefabriq|facade.*bois/, d: R(340, 70, 80, 230, 'c-none') + rep(4, i => R(342 + i * 25, 70, 6, 230, 'c-wood')) + R(340, 70, 80, 230, 'c-ins-t') + R(340, 182, 80, 6, 'c-wood'), pin: [380, 56] },
      { k: /verre de facade|allege|email/, d: R(420, 70, 80, 230, 'c-frame') + R(424, 74, 72, 66, 'c-glass') + R(424, 144, 72, 36, 'c-spandrel') + R(424, 184, 72, 66, 'c-glass') + R(424, 254, 72, 42, 'c-spandrel'), pin: [460, 56] },
      { k: /profile en u|u-glass|profil/, d: R(500, 70, 80, 230, 'c-glass') + rep(7, i => L(510 + i * 10, 70, 510 + i * 10, 300, 'ln')), pin: [540, 56] },
      { k: /mur-rideau|murs-rideaux|verriere/, d: R(500, 70, 80, 230, 'c-none'), pin: null }
    ] },
    '07': { base: G + R(20, 60, 560, 240, 'c-void'), zones: [
      { k: /mur-rideau|murs-rideaux|verriere/, d: R(30, 70, 120, 226, 'c-frame') + rep(3, r => rep(2, c => R(34 + c * 58, 74 + r * 74, 54, 70, 'c-glass'))), pin: [90, 56] },
      { k: /alumin(?!.*coulissant)|^aluminium$/, d: WIN(170, 80, 70, 90, 'c-alu'), pin: [205, 66] },
      { k: /^acier|acier$/, d: WIN(260, 80, 70, 90, 'c-dark'), pin: [295, 66] },
      { k: /^bois$|menuiserie.*bois/, d: WIN(350, 80, 70, 90, 'c-wood'), pin: [385, 66] },
      { k: /mixte/, d: WIN(440, 80, 70, 90, 'c-wood') + R(440, 80, 70, 6, 'c-alu') + R(440, 164, 70, 6, 'c-alu'), pin: [475, 66] },
      { k: /pvc/, d: WIN(520, 80, 56, 90, 'c-white'), pin: [548, 66] },
      { k: /coulissant|porte/, d: R(170, 196, 150, 100, 'c-alu') + R(176, 202, 70, 88, 'c-glass') + R(244, 202, 70, 88, 'c-glass') + L(250, 246, 260, 246, 'rail2'), pin: [245, 186] },
      { k: /occult|volet|store|brise/, d: R(340, 190, 90, 18, 'c-alu') + rep(8, i => R(342, 208 + i * 10, 86, 8, 'c-alu')), pin: [385, 180] },
      { k: /desenfumage|ouvrant|aeration/, d: R(450, 196, 60, 50, 'c-frame') + P('454,200 506,200 498,232 462,232', 'c-glass2') + L(480, 232, 480, 246, 'rail2'), pin: [480, 184] },
      { k: /vitrage|controle solaire|isolant/, d: R(526, 196, 8, 100, 'c-glass') + R(534, 200, 14, 92, 'c-void2') + R(548, 196, 8, 100, 'c-glass') + R(534, 196, 14, 4, 'c-dark') + R(534, 292, 14, 4, 'c-dark'), pin: [541, 184] },
      { k: /feuillete|securite|acoustique/, d: R(450, 262, 60, 34, 'c-glass') + L(450, 279, 510, 279, 'pvb'), pin: [480, 256] }
    ] },
    '08': { base: G, zones: [
      { k: /grille|clotur|portail/, d: R(20, 210, 200, 90, 'c-none') + rep(14, i => L(26 + i * 14, 212, 26 + i * 14, 300, 'rail2')) + L(20, 220, 220, 220, 'rail') + L(20, 290, 220, 290, 'rail') + R(110, 196, 10, 104, 'c-dark'), pin: [120, 184] },
      { k: /porte.*acier|cloison.*acier|^portes et cloisons/, d: R(250, 130, 90, 170, 'c-metal') + R(256, 136, 78, 164, 'c-metal2') + R(320, 214, 10, 4, 'c-dark') + R(270, 150, 50, 36, 'c-glass'), pin: [295, 116] },
      { k: /coupe-feu|coupe feu|coupe-fumee/, d: R(360, 130, 90, 170, 'c-red') + R(366, 136, 78, 164, 'c-red2') + R(430, 214, 10, 4, 'c-dark'), pin: [405, 116] },
      { k: /garde-corps|escalier|passerelle/, d: PL('470,300 470,276 494,276 494,252 518,252 518,228 542,228 542,204 580,204', 'stair2') + L(470, 250, 580, 160, 'rail') + rep(5, i => L(476 + i * 22, 245 - i * 18, 476 + i * 22, 276 - i * 24 + 24, 'rail2')), pin: [520, 150] },
      { k: /marquise|auvent|verriere/, d: R(250, 100, 200, 8, 'c-glass2'), pin: null }
    ] },
    '09': { base: G + R(20, 60, 560, 240, 'c-void') + R(20, 54, 560, 10, 'c-con'), zones: [
      { k: /protection passive|incendie|feu/, d: R(30, 64, 120, 20, 'c-metal') + R(26, 64, 128, 28, 'c-fire') + R(120, 64, 14, 236, 'c-metal') + R(116, 64, 22, 236, 'c-fire-t'), pin: [90, 106] },
      { k: /plafond/, d: R(160, 96, 300, 6, 'c-plaster') + rep(5, i => L(180 + i * 60, 64, 180 + i * 60, 96)) + rep(10, i => L(160 + i * 30, 96, 160 + i * 30, 102, 'ln-l')), pin: [310, 84] },
      { k: /baffle|acoustique/, d: rep(5, i => R(186 + i * 52, 116, 12, 40, 'c-acou') + L(192 + i * 52, 102, 192 + i * 52, 116)), pin: [310, 168] },
      { k: /cloison|doublage/, d: R(170, 180, 18, 120, 'c-plaster') + rep(5, i => R(174, 186 + i * 22, 10, 4, 'c-metal')) + R(214, 180, 8, 120, 'c-plaster'), pin: [190, 168] },
      { k: /isolant|laine/, d: R(222, 180, 40, 120, 'c-ins') + rep(5, i => PA(`M222 ${190 + i * 22} q20 -10 40 0`, 'ln-l')), pin: [242, 168] },
      { k: /plaque|platre/, d: rep(6, i => R(300 + i * 4, 206 - i * 4, 12, 94, 'c-plaster')) + R(360, 290, 110, 10, 'c-plaster') + R(364, 280, 102, 10, 'c-plaster') + R(368, 270, 94, 10, 'c-plaster'), pin: [380, 254] },
      { k: /trappe|faux plafond demont|dalle/, d: R(480, 96, 100, 6, 'c-plaster') + rep(4, i => L(480 + i * 25, 96, 480 + i * 25, 102, 'ln')), pin: [530, 84] }
    ] },
    '10': { base: G + R(20, 60, 560, 240, 'c-void'), zones: [
      { k: /^portes? interieure|porte/, d: R(30, 120, 76, 180, 'c-frame') + R(36, 126, 64, 174, 'c-wood') + C(92, 214, 3, 'c-dark'), pin: [68, 140] },
      { k: /quincaillerie|poignee|ferrure/, d: R(116, 196, 30, 6, 'c-metal', 3) + C(118, 199, 7, 'c-metal') + R(114, 208, 8, 18, 'c-metal', 2), pin: [134, 182] },
      { k: /escamotable|trappe/, d: R(160, 60, 70, 8, 'c-wood') + L(166, 68, 214, 300, 'rail') + L(186, 68, 234, 300, 'rail') + rep(8, i => L(170 + i * 6, 86 + i * 28, 190 + i * 6, 86 + i * 28, 'rail')), pin: [196, 46] },
      { k: /placard|rangement/, d: R(250, 100, 90, 200, 'c-wood') + rep(4, i => L(250, 140 + i * 40, 340, 140 + i * 40)) + L(295, 100, 295, 300), pin: [295, 86] },
      { k: /habillage|agencement/, d: R(26, 64, 124, 40, 'c-wood') + rep(11, i => L(36 + i * 10, 64, 36 + i * 10, 104, 'ln-l')), pin: [88, 50] },
      { k: /panneaux? decoratif|stratifie|hpl|compact/, d: rep(4, i => R(354 + i * 14, 120 + i * 8, 40, 180 - i * 8, ['c-wood', 'c-paint', 'c-dark', 'c-metal'][i])), pin: [394, 106] },
      { k: /resine|translucide/, d: R(436, 100, 50, 200, 'c-resin') + rep(5, i => C(452 + (i % 2) * 16, 130 + i * 34, 6, 'c-resin2')), pin: [461, 86] },
      { k: /verre decoratif|imprime|miroir/, d: R(498, 100, 36, 200, 'c-glass') + rep(10, i => L(498, 108 + i * 19, 534, 116 + i * 19, 'ln-l')), pin: [516, 86] },
      { k: /opacite|commutable|priva/, d: R(540, 100, 36, 200, 'c-glass-op') + R(552, 306, 12, 8, 'c-dark'), pin: [558, 86] },
      { k: /feu|ew|ei\b/, d: R(150, 236, 90, 64, 'c-frame') + R(156, 242, 78, 58, 'c-glass') + PA('M195 290 q-14 -16 0 -34 q2 14 10 16 q6 10 -10 18z', 'c-red'), pin: [195, 226] }
    ] },
    '11': { base: G + R(20, 60, 560, 240, 'c-void'), zones: [
      { k: /^carrelage,|gres|pierre/, d: R(20, 280, 200, 20, 'c-tile2') + rep(9, i => L(42 + i * 22, 280, 42 + i * 22, 300, 'ln')), pin: [198, 268] },
      { k: /mise en oeuvre|colle|mortier/, d: R(20, 300, 200, 6, 'c-glue') + PA('M60 270 l30 -14 l10 6 l-30 14z', 'c-metal'), pin: [40, 318] },
      { k: /desolidaris|etancheite sous/, d: R(20, 306, 200, 4, 'c-membrane2'), pin: [150, 320] },
      { k: /mosaique|verre|emaux/, d: rep(9, r => rep(6, c => R(22 + c * 15, 102 + r * 15, 13, 13, ['c-glass', 'c-glass2', 'c-tile2'][(r + c) % 3]))), pin: [65, 86] },
      { k: /profiles? de finition|finition/, d: R(110, 100, 6, 136, 'c-metal'), pin: [128, 120] },
      { k: /profiles? lumineux|lumineux/, d: R(120, 256, 96, 4, 'c-light'), pin: [140, 240] },
      { k: /douche|italienne/, d: R(240, 284, 110, 16, 'c-tile2') + R(286, 292, 18, 6, 'c-metal') + R(244, 120, 4, 160, 'c-glass') + PA('M320 130 q12 0 12 12', 'pipe') + rep(5, i => L(316 + i * 6, 150, 312 + i * 6, 190, 'water')), pin: [295, 108] },
      { k: /transition|seuil|joint/, d: R(350, 294, 30, 6, 'c-metal'), pin: [365, 284] },
      { k: /escalier|nez de marche/, d: PL('380,300 380,268 420,268 420,236 460,236 460,204 500,204', 'stair2') + R(414, 266, 8, 4, 'c-metal') + R(454, 234, 8, 4, 'c-metal') + R(494, 202, 8, 4, 'c-metal'), pin: [440, 190] },
      { k: /plancher technique|sureleve/, d: R(500, 266, 80, 10, 'c-tile2') + rep(3, i => R(506 + i * 30, 276, 4, 24, 'c-metal') + R(502 + i * 30, 296, 12, 4, 'c-metal')), pin: [540, 254] },
      { k: /balcon|terrasse|exterieur/, d: R(500, 150, 80, 8, 'c-tile2') + rep(3, i => R(508 + i * 28, 158, 6, 10, 'c-metal')) + R(500, 168, 80, 12, 'c-con'), pin: [540, 138] }
    ] },
    '12': { base: G + R(20, 60, 560, 240, 'c-void'), zones: [
      { k: /pvc|vinyl|lino/, d: R(30, 286, 200, 14, 'c-soft') + PA('M200 286 q30 -40 50 -10 q-20 10 -50 10z', 'c-soft'), pin: [120, 272] },
      { k: /caoutchouc/, d: R(250, 286, 180, 14, 'c-rubber') + rep(14, i => C(258 + i * 12, 290, 3, 'c-rubber2')), pin: [340, 272] },
      { k: /tapis|entree/, d: R(450, 292, 120, 8, 'c-dark') + rep(10, i => L(454 + i * 12, 292, 454 + i * 12, 300, 'ln-l')) + R(470, 140, 6, 152, 'c-frame') + R(546, 140, 6, 152, 'c-frame') + R(470, 134, 82, 6, 'c-frame'), pin: [510, 120] },
      { k: /moquette|textile|parquet|bois/, d: R(30, 220, 0, 0, 'c-none'), pin: null }
    ] },
    '13': { base: G + R(20, 60, 560, 240, 'c-void'), zones: [
      { k: /peinture|lasure|vernis/, d: R(30, 70, 140, 220, 'c-paint') + R(130, 180, 40, 14, 'c-fabric', 4) + L(150, 194, 150, 230, 'rail'), pin: [100, 56] },
      { k: /acoustique/, d: R(190, 70, 120, 220, 'c-acou') + rep(8, r => rep(5, c => C(204 + c * 23, 86 + r * 27, 3, 'c-void'))), pin: [250, 56] },
      { k: /verre laque|laque|credence/, d: R(330, 180, 110, 50, 'c-spandrel') + R(330, 230, 110, 70, 'c-wood') + R(326, 226, 118, 6, 'c-work'), pin: [385, 166] },
      { k: /film|vitrage/, d: R(460, 70, 110, 120, 'c-frame') + R(466, 76, 98, 108, 'c-glass') + R(466, 110, 98, 40, 'c-film'), pin: [515, 56] },
      { k: /adhesif|di-noc|revetement/, d: R(460, 210, 110, 80, 'c-wood') + P('540,210 570,210 570,240', 'c-white'), pin: [515, 200] },
      { k: /papier peint|toile/, d: R(330, 70, 110, 100, 'c-paint2') + rep(5, i => L(352 + i * 18, 70, 352 + i * 18, 170, 'ln-l')), pin: [385, 56] }
    ] },
    '14': { base: G + R(20, 60, 560, 240, 'c-void'), zones: [
      { k: /sanitaire|ceramique|appareil|wc|lavabo|vasque/, d: R(40, 250, 40, 50, 'c-white', 6) + R(36, 200, 30, 40, 'c-white', 4) + R(110, 180, 70, 16, 'c-white', 4) + R(136, 196, 18, 104, 'c-white'), pin: [100, 166] },
      { k: /robinetterie collective|collective|temporis/, d: R(200, 150, 50, 50, 'c-tile2') + R(220, 166, 10, 22, 'c-metal', 2) + R(214, 188, 22, 6, 'c-metal', 2), pin: [225, 136] },
      { k: /robinetterie de reseau|reseau|vanne/, d: L(270, 260, 380, 260, 'pipe') + P('310,250 326,260 310,270', 'c-red') + P('342,250 326,260 342,270', 'c-red') + L(326, 260, 326, 238, 'rail') + R(316, 232, 20, 6, 'c-red'), pin: [326, 222] },
      { k: /tube|raccord|cuivre|per/, d: PL('270,120 420,120 420,200', 'pipe') + PL('270,140 400,140 400,200', 'pipe-c') + C(420, 120, 5, 'c-metal'), pin: [345, 106] },
      { k: /evacuation|ecoulement/, d: PL('60,300 60,330 300,340', 'pipe-e') + PL('150,300 150,330', 'pipe-e'), pin: [200, 326] },
      { k: /eau chaude|ecs|chauffe-eau|ballon/, d: R(450, 120, 70, 170, 'c-white', 30) + PL('470,120 470,90', 'pipe') + PL('500,120 500,90', 'pipe-c') + R(470, 240, 30, 14, 'c-dark', 2), pin: [485, 106] }
    ] },
    '15': { base: G + R(20, 60, 560, 240, 'c-void'), zones: [
      { k: /plancher chauffant|plancher|chauffage au sol/, d: R(20, 290, 300, 10, 'c-render') + PA('M30 295 h40 v0 h40 h40 h40 h40 h40 h40', 'pipe-h'), pin: [170, 278] },
      { k: /radiateur|seche-serviette/, d: R(40, 200, 80, 60, 'c-metal') + rep(8, i => L(48 + i * 9, 204, 48 + i * 9, 256, 'ln-l')) + R(140, 150, 40, 90, 'c-none') + rep(7, i => R(140, 154 + i * 12, 40, 6, 'c-metal')) + R(140, 150, 4, 90, 'c-metal') + R(176, 150, 4, 90, 'c-metal'), pin: [80, 186] },
      { k: /chaudiere|production de chaleur/, d: R(200, 120, 60, 90, 'c-white', 4) + R(214, 140, 32, 10, 'c-dark') + PL('215,210 215,240', 'pipe') + PL('245,210 245,240', 'pipe-c'), pin: [230, 106] },
      { k: /pompe a chaleur|climatisation|pac/, d: R(520, 240, 56, 50, 'c-metal', 3) + C(548, 265, 16, 'c-none') + rep(4, i => L(532 + i * 8, 252, 564 - i * 8, 278, 'ln-l')) + R(476, 150, 96, 24, 'c-white', 6) + L(482, 168, 566, 168, 'ln-l'), pin: [548, 226] },
      { k: /ventilation|vmc|double flux/, d: PL('380,74 360,74', 'duct') + PL('460,74 560,74', 'duct') + R(380, 60, 80, 30, 'c-metal', 4), pin: [420, 44] },
      { k: /diffusion|grille|bouche/, d: PL('440,90 440,116', 'duct') + R(420, 116, 40, 8, 'c-metal') + rep(5, i => L(424 + i * 8, 116, 424 + i * 8, 124, 'ln')), pin: [440, 144] },
      { k: /conduit de fumee|fumee|cheminee|fumisterie/, d: R(330, 60, 16, 140, 'c-metal') + R(326, 52, 24, 10, 'c-metal'), pin: [338, 40] },
      { k: /poele|insert|foyer/, d: R(300, 200, 76, 90, 'c-dark', 6) + R(312, 214, 52, 40, 'c-fire2') + R(330, 196, 16, 6, 'c-metal'), pin: [338, 186] },
      { k: /gaz|propane|citerne/, d: R(410, 300, 100, 40, 'c-white', 20) + R(452, 294, 16, 6, 'c-metal'), pin: [460, 284] }
    ] },
    '16': { base: G + R(20, 60, 560, 240, 'c-void'), zones: [
      { k: /tableau|distribution/, d: R(40, 100, 90, 130, 'c-white', 4) + rep(4, i => R(50, 112 + i * 28, 70, 18, 'c-none') + rep(6, j => R(52 + j * 11, 114 + i * 28, 9, 14, 'c-dark'))), pin: [85, 86] },
      { k: /cable|chemin de cable/, d: PL('130,160 220,160 220,80 560,80', 'cable') + PL('130,170 230,170 230,90 560,90', 'cable2'), pin: [400, 66] },
      { k: /appareillage|prise|interrupteur/, d: R(250, 200, 24, 24, 'c-white', 3) + C(262, 212, 7, 'c-none') + C(259, 212, 1.5, 'c-dark') + C(265, 212, 1.5, 'c-dark') + R(290, 200, 24, 24, 'c-white', 3) + R(296, 206, 12, 12, 'c-none', 2), pin: [282, 186] },
      { k: /eclairage de securite|baes|securite/, d: R(360, 130, 70, 26, 'c-ok') + P('376,143 390,136 390,150', 'c-white') + R(392, 140, 24, 6, 'c-white'), pin: [395, 116] },
      { k: /desenfumage|dac|dcs/, d: R(470, 150, 40, 50, 'c-red', 3) + R(478, 160, 24, 18, 'c-white') + C(490, 188, 4, 'c-white'), pin: [490, 136] },
      { k: /eclairage|luminaire/, d: L(300, 80, 300, 106) + PA('M282 120 q18 -24 36 0z', 'c-light'), pin: [300, 132] },
      { k: /courant faible|reseau|vdi|alarme/, d: R(530, 200, 40, 50, 'c-white', 3) + rep(3, i => R(538, 210 + i * 12, 24, 6, 'c-dark')), pin: [550, 186] }
    ] },
    '17': { base: G + R(20, 40, 560, 260, 'c-void'), zones: [
      { k: /^ascenseur|ascenseur/, d: R(40, 40, 120, 260, 'c-none') + L(40, 40, 40, 300, 'ln2') + L(160, 40, 160, 300, 'ln2') + R(56, 150, 88, 110, 'c-metal', 3) + L(100, 150, 100, 260) + L(100, 40, 100, 150, 'rail2') + R(60, 40, 80, 14, 'c-dark'), pin: [100, 136] },
      { k: /plateforme|pmr|elevatrice/, d: R(190, 200, 90, 8, 'c-metal') + R(270, 140, 10, 160, 'c-metal') + L(190, 200, 190, 160, 'rail') + L(190, 160, 260, 160, 'rail') + R(200, 270, 80, 30, 'c-con'), pin: [235, 126] },
      { k: /monte-charge|monte-plat|charge/, d: R(310, 120, 80, 120, 'c-metal', 2) + R(318, 128, 64, 104, 'c-metal2') + rep(3, i => R(330, 200 - i * 22, 40, 20, 'c-wood')), pin: [350, 106] },
      { k: /escalier mecanique|trottoir/, d: P('410,300 450,300 570,140 580,140 580,160 460,300', 'c-metal') + rep(8, i => L(450 + i * 15, 300 - i * 20, 462 + i * 15, 300 - i * 20, 'ln')), pin: [510, 186] }
    ] },
    '18': { base: G, zones: [
      { k: /bordure|pave|dallage|enrobe/, d: R(20, 290, 300, 10, 'c-pave') + rep(15, i => L(40 + i * 20, 290, 40 + i * 20, 300)) + R(320, 282, 20, 18, 'c-con') + R(340, 296, 120, 4, 'c-asph'), pin: [170, 276] },
      { k: /caniveau|regard/, d: R(360, 300, 50, 40, 'c-con') + R(356, 294, 58, 6, 'c-metal') + rep(5, i => L(362 + i * 10, 294, 362 + i * 10, 300, 'ln-w')) + R(470, 290, 80, 10, 'c-metal') + rep(8, i => L(474 + i * 10, 290, 474 + i * 10, 300, 'ln-w')), pin: [440, 272] },
      { k: /assainissement|canalisation|tuyau|reseau/, d: PL('20,330 600,346', 'pipe-e') + R(200, 320, 60, 36, 'c-con2', 4), pin: [230, 312] },
      { k: /eaux pluviales|bassin|infiltration/, d: R(560, 310, 30, 40, 'c-water'), pin: null }
    ] },
    '19': { base: G, zones: [
      { k: /plantation|arbre|vegetal(?!ise)/, d: R(76, 220, 8, 80, 'c-wood') + C(80, 190, 40, 'c-green') + C(140, 284, 16, 'c-green'), pin: [80, 140] },
      { k: /arrosage|irrigation/, d: PL('180,306 360,306', 'pipe-c') + rep(3, i => L(210 + i * 60, 306, 210 + i * 60, 296, 'rail2') + PA(`M${200 + i * 60} 290 q10 -16 20 0`, 'water')), pin: [270, 280] },
      { k: /geotextile|feutre/, d: R(380, 314, 200, 4, 'c-membrane2') + R(380, 318, 200, 30, 'c-earth2'), pin: [480, 334] },
      { k: /permeable|vegetalise|dalle gazon/, d: R(380, 296, 200, 18, 'c-pave') + rep(8, i => R(386 + i * 24, 299, 14, 10, 'c-green')), pin: [480, 282] }
    ] },
    '20': { base: G + R(20, 40, 560, 260, 'c-void'), zones: [
      { k: /cuisine/, d: R(30, 230, 120, 70, 'c-wood') + R(28, 224, 124, 6, 'c-work') + R(30, 120, 120, 50, 'c-wood') + L(90, 120, 90, 170) + L(90, 230, 90, 300), pin: [90, 106] },
      { k: /table|bureau/, d: R(170, 236, 110, 8, 'c-wood') + R(176, 244, 6, 56, 'c-wood') + R(268, 244, 6, 56, 'c-wood') + R(200, 222, 40, 14, 'c-dark', 2), pin: [225, 208] },
      { k: /assise|convivialite|canape|chaise/, d: R(300, 250, 100, 34, 'c-fabric', 6) + R(300, 228, 100, 26, 'c-fabric', 6) + R(304, 284, 6, 16, 'c-dark') + R(390, 284, 6, 16, 'c-dark'), pin: [350, 212] },
      { k: /lit|armoire|dressing/, d: R(420, 254, 150, 30, 'c-fabric', 4) + R(420, 222, 10, 78, 'c-wood') + R(430, 246, 40, 10, 'c-white', 4) + R(490, 60, 80, 150, 'c-wood') + L(530, 60, 530, 210), pin: [495, 46] },
      { k: /rangement|bibliotheque|paroi/, d: R(170, 60, 120, 150, 'c-wood') + rep(4, i => L(170, 90 + i * 30, 290, 90 + i * 30)) + rep(9, i => R(176 + i * 12, 64 + (i % 3) * 30, 8, 24, ['c-paint', 'c-dark', 'c-spandrel'][i % 3])), pin: [230, 46] },
      { k: /rideau|voilage|store/, d: R(310, 60, 160, 6, 'c-metal') + rep(8, i => PA(`M${314 + i * 20} 66 q6 70 0 140 h14 q-6 -70 0 -140z`, 'c-fabric2')), pin: [390, 46] },
      { k: /acoustique|ecran/, d: R(402, 196, 14, 104, 'c-acou', 3) + rep(6, i => L(405, 206 + i * 15, 413, 206 + i * 15, 'ln-l')), pin: [409, 214] },
      { k: /signaletique|signal/, d: R(36, 60, 60, 30, 'c-ok') + P('46,75 58,68 58,82', 'c-white') + R(60, 72, 28, 6, 'c-white'), pin: [66, 50] }
    ] }
  };
  window.TD_SCHEMAS = { maison, lots };
})();
