/* ==========================================================
   FUNDO · Leonida Sunset & Vice City Neon Night
   Céu tropical que muda do pôr do sol (rosa/laranja/ouro) para
   a noite neon de Vice City conforme a página desce, com sol
   retrô, silhuetas de palmeiras balançando ao vento e partículas
   que viram rastros de velocidade na rolagem rápida.
   ========================================================== */
(function(){
  'use strict';
  var cv = document.getElementById('fundo');
  if (!cv) return;
  var ctx = cv.getContext('2d');
  var semMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var Q = PV.qualidade;
  function nivel(){ return Q ? Q.nivel : 'alto'; }

  var W = 0, H = 0, DPR = 1, parts = [], tempo = 0;
  var CAMADAS = [0.14, 0.32, 0.58];

  // Paradas de cor ao longo da página (0 = topo pôr do sol, 1 = madrugada neon)
  var PARADAS = [
    [0.00, [255, 46, 147]],   // Vice Hot Pink
    [0.38, [255, 140, 66]],   // Sunset Coral
    [0.72, [147, 51, 234]],   // Twilight Violet
    [1.00, [0, 245, 212]]     // Ocean Cyan
  ];

  // Partículas neon Vice City (ouro, rosa, ciano, coral)
  var TINTAS = [
    [255, 209, 102], // Gold
    [255, 46, 147],  // Hot Pink
    [0, 245, 212],   // Ocean Cyan
    [255, 140, 66]   // Coral
  ];

  function corEm(t){
    for (var i = 1; i < PARADAS.length; i++) {
      if (t <= PARADAS[i][0]) {
        var a = PARADAS[i - 1], b = PARADAS[i], f = (t - a[0]) / (b[0] - a[0]);
        return [0, 1, 2].map(function(k){ return Math.round(a[1][k] + (b[1][k] - a[1][k]) * f); });
      }
    }
    return PARADAS[PARADAS.length - 1][1];
  }

  function medir(){
    var nv = nivel();
    DPR = nv === 'alto' ? Math.min(window.devicePixelRatio || 1, 1.5) : 1;
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    var n = nv === 'alto' ? Math.min(140, (W * H) / 10000) : (nv === 'medio' ? Math.min(60, (W * H) / 20000) : 0);
    n = Math.round(n);
    ultimaChave = '';
    parts = [];
    for (var i = 0; i < n; i++) {
      var c = i % 3;
      parts.push({
        x: Math.random() * W,
        y: Math.random() * H,
        c: c,
        tam: c === 2 ? 2.2 : (c === 1 ? 1.5 : 1.1),
        derivaY: (semMovimento ? 0 : -(24 + Math.random() * 44)) * (0.6 + c * 0.35),
        derivaX: (semMovimento ? 0 : (Math.random() - 0.5) * 18),
        comp: 8 + c * 6 + Math.random() * 10,
        tinta: TINTAS[i % TINTAS.length],
        alfa: 0.25 + c * 0.2 + Math.random() * 0.15
      });
    }
  }

  function desenharSol(prof){
    if (prof > 0.55) return;
    var vis = 1 - prof / 0.55;
    var sx = W * 0.78;
    var sy = H * (0.28 + prof * 0.45);
    var r = Math.min(W, H) * 0.17;

    ctx.save();
    ctx.globalAlpha = vis * 0.32;
    var g = ctx.createLinearGradient(sx, sy - r, sx, sy + r);
    g.addColorStop(0, '#ffd166');
    g.addColorStop(0.5, '#ff8c42');
    g.addColorStop(1, '#ff2e93');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();

    // Cortes horizontais estilo Miami Vice no terço inferior do sol
    ctx.globalCompositeOperation = 'destination-out';
    ctx.globalAlpha = 0.85;
    for (var i = 0; i < 5; i++) {
      var fy = sy + r * (0.18 + i * 0.15);
      var fh = 2 + i * 1.8;
      ctx.fillRect(sx - r - 2, fy, r * 2 + 4, fh);
    }
    ctx.restore();
  }

  function desenharPalmeira(bx, by, altura, curva, balanco, alfa){
    ctx.save();
    ctx.globalAlpha = alfa;
    ctx.strokeStyle = '#07020e';
    ctx.fillStyle = '#07020e';

    var topoX = bx + curva + balanco;
    var topoY = by - altura;
    ctx.lineWidth = Math.max(4, altura * 0.045);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(bx + curva * 0.45, by - altura * 0.55, topoX, topoY);
    ctx.stroke();

    // Folhas da palmeira
    var folhas = 7;
    for (var i = 0; i < folhas; i++) {
      var ang = -Math.PI + (i / (folhas - 1)) * Math.PI * 1.15 - 0.1 + balanco * 0.004;
      var comp = altura * (0.36 + (i % 2) * 0.08);
      var fx = topoX + Math.cos(ang) * comp;
      var fy = topoY + Math.sin(ang) * comp * 0.65 + comp * 0.22;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(topoX, topoY);
      ctx.quadraticCurveTo(
        topoX + Math.cos(ang) * comp * 0.55,
        topoY + Math.sin(ang) * comp * 0.35 - 10,
        fx,
        fy
      );
      ctx.stroke();
    }
    ctx.restore();
  }

  var ultimoY = window.scrollY, vel = 0, antes = performance.now(), acum = 0, ultimaChave = '';

  function desenhar(dt){
    tempo += dt;
    var y = window.scrollY, d = y - ultimoY;
    ultimoY = y;
    vel += (d - vel) * 0.25;

    var alt = Math.max(1, document.documentElement.scrollHeight - H);
    var prof = Math.min(1, Math.max(0, y / alt));
    var cor = corEm(prof);
    var tm = PV.cena3d && PV.cena3d.tom();
    if (tm) cor = cor.map(function(c, k){ return Math.round(c + (tm.cor[k] - c) * tm.forca * 0.75); });

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // Brilho atmosférico Leonida
    var g = ctx.createRadialGradient(W * 0.55, H * 0.95, 0, W * 0.55, H * 0.95, Math.max(W, H) * 0.95);
    var forca = 0.11 + prof * 0.16 + (tm ? tm.forca * 0.12 : 0);
    g.addColorStop(0, 'rgba(' + cor.join(',') + ',' + forca + ')');
    g.addColorStop(0.6, 'rgba(255, 46, 147, 0.05)');
    g.addColorStop(1, 'rgba(9, 4, 18, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    if (nivel() !== 'baixo') desenharSol(prof);

    // Palmeiras tropicais em paralaxe suave nas bordas inferiores
    if (W > 640 && nivel() !== 'baixo') {
      var vento = semMovimento ? 0 : Math.sin(tempo * 1.1) * 7;
      var pyBase = H + Math.min(90, prof * 120);
      desenharPalmeira(W * 0.06, pyBase, H * 0.34, 26, vento, 0.48);
      desenharPalmeira(W * 0.94, pyBase + 18, H * 0.38, -32, -vento * 0.85, 0.44);
    }

    // Partículas flutuantes que viram speed-lines na rolagem rápida
    var risco = Math.min(Math.abs(vel), 65);
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i], f = CAMADAS[p.c];
      p.y -= d * f - (semMovimento ? 0 : p.derivaY * dt);
      p.x += (semMovimento ? 0 : p.derivaX * dt);
      if (p.y < -90) { p.y += H + 180; p.x = Math.random() * W; }
      if (p.y > H + 90) { p.y -= H + 180; p.x = Math.random() * W; }
      if (p.x < -20) p.x += W + 40;
      if (p.x > W + 20) p.x -= W + 40;

      var tr = Math.round(cor[0] + (p.tinta[0] - cor[0]) * 0.65),
          tg = Math.round(cor[1] + (p.tinta[1] - cor[1]) * 0.65),
          tb = Math.round(cor[2] + (p.tinta[2] - cor[2]) * 0.65);

      ctx.fillStyle = 'rgba(' + tr + ',' + tg + ',' + tb + ',' + p.alfa + ')';
      if (risco > 6) {
        var comp = p.comp + risco * f * 1.6;
        ctx.fillRect(p.x, p.y - comp, p.tam, comp);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.tam, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function laco(agora){
    requestAnimationFrame(laco);
    var dt = Math.min((agora - antes) / 1000, 0.1);
    antes = agora;
    if (document.hidden) return;
    var nv = nivel();
    if (nv !== 'alto') {
      acum += dt;
      if (acum < 1 / 30) return;
      dt = Math.min(acum, 0.1); acum = 0;
    }
    if (nv === 'baixo') {
      var tm = PV.cena3d && PV.cena3d.tom();
      var chave = Math.round(window.scrollY / 6) + '|' + (tm ? Math.round(tm.forca * 20) : '');
      if (chave === ultimaChave) return;
      ultimaChave = chave;
    }
    desenhar(dt);
  }

  window.addEventListener('resize', medir);
  if (Q) Q.aoMudar(medir);
  medir();
  requestAnimationFrame(laco);
})();
