/* ==========================================================
   CENA 3D · peças grandes que aparecem conforme a página desce
   Três modelos montados só com geometria do three.js e texturas
   pintadas em canvas (nenhum arquivo de modelo nem de imagem):
     - a placa Arduino Nano  (Atuação, Trajetória e Projetos)
     - a mão robótica Puppet (Web, Puppet e Criptografia)
     - um troféu de ouro     (Prêmios e Competições)
   Cada peça sobe de baixo quando a fase chega, fica no lado
   vazio da página, tinge o cenário com a sua cor e reage ao que
   o personagem faz (pulo, soco, coleta, dano).
   ========================================================== */
window.PV = window.PV || {};

PV.cena3d = (function(){
  'use strict';
  var Q = PV.qualidade;
  var impl = null, carregando = false;
  var THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';

  /* o three.js (600 KB) só é baixado depois que a página carregou,
     e só se o aparelho estiver no nível médio ou alto */
  function carregar(){
    if (impl || carregando || (Q && !Q.tem3d())) return;
    carregando = true;
    function pronto(){ impl = montar(); carregando = false; }
    if (window.THREE) { pronto(); return; }
    var s = document.createElement('script');
    s.src = THREE_URL; s.async = true;
    s.onload = pronto;
    s.onerror = function(){ carregando = false; };   // sem internet: o site segue sem as peças 3D
    document.head.appendChild(s);
  }
  if (document.readyState === 'complete') setTimeout(carregar, 400);
  else window.addEventListener('load', function(){ setTimeout(carregar, 400); });
  if (Q) Q.aoMudar(function(n){
    if (impl) impl.qualidade(n);
    else if (n !== 'baixo') carregar();
  });

  function montar(){
    var cv = document.getElementById('cena3d');
    if (!cv || !window.THREE) return null;
    var T = window.THREE;
    var semMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var nivel = Q ? Q.nivel : 'alto';
    var alto = nivel === 'alto';              // decide o que é montado; o resto se ajusta ao vivo
    var DET = alto ? 1 : 0.5;                 // detalhe das texturas pintadas

    var render;
    try {
      render = new T.WebGLRenderer({ canvas: cv, alpha: true, antialias: alto, powerPreference: 'high-performance' });
    } catch (e) { return null; }
    if (!render.getContext()) return null;
    render.setClearColor(0x000000, 0);
    render.outputEncoding = T.sRGBEncoding;
    render.toneMapping = T.ACESFilmicToneMapping;
    render.toneMappingExposure = 1.1;
    var ANISO = render.capabilities.getMaxAnisotropy();

    var cena = new T.Scene();
    var camera = new T.PerspectiveCamera(30, 1, 1, 600);
    camera.position.set(0, 0, 100);

    /* ==========================================================
       UTILIDADES
       ========================================================== */
    function semente(n){
      return function(){
        n = n + 0x6D2B79F5 | 0;
        var t = Math.imul(n ^ n >>> 15, 1 | n);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
      };
    }
    function tela(w, h, pintar){
      var c = document.createElement('canvas');
      c.width = w; c.height = h;
      pintar(c.getContext('2d'), w, h);
      return c;
    }
    function tex(c, cor, repetir){
      var t = new T.CanvasTexture(c);
      if (cor) t.encoding = T.sRGBEncoding;
      t.anisotropy = ANISO;
      if (repetir) t.wrapS = t.wrapT = T.RepeatWrapping;
      return t;
    }
    // no médio, o material físico (verniz/clearcoat) vira o padrão, bem mais leve para a placa de vídeo
    function fisico(p){
      if (alto) return new T.MeshPhysicalMaterial(p);
      var q = {};
      Object.keys(p).forEach(function(k){ if (!/^clearcoat|^transmission/.test(k)) q[k] = p[k]; });
      return new T.MeshStandardMaterial(q);
    }
    function salpicar(g, w, h, n, cores, tam, rnd){
      n = Math.round(n * DET);
      for (var i = 0; i < n; i++) {
        g.fillStyle = cores[i % cores.length];
        var s = tam * (0.4 + rnd());
        g.fillRect(rnd() * w, rnd() * h, s, s);
      }
    }
    function brilho(cor){
      return tela(128, 128, function(g){
        var gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
        gr.addColorStop(0, cor); gr.addColorStop(0.25, cor.replace(/[\d.]+\)$/, '0.45)')); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
      });
    }
    function sprite(canvas, escala, cor){
      var s = new T.Sprite(new T.SpriteMaterial({ map: tex(canvas, true), color: cor || 0xffffff, transparent: true, blending: T.AdditiveBlending, depthWrite: false }));
      s.scale.set(escala, escala, 1);
      return s;
    }

    /* caixa com cantos arredondados de verdade (normais suaves e UV por face):
       parte de um cubo subdividido, concentra os vértices perto das arestas
       e empurra cada um para a superfície arredondada */
    function caixaRed(w, h, d, r){
      var g = new T.BoxGeometry(2, 2, 2, 10, 10, 10);
      var pos = g.attributes.position, nor = g.attributes.normal;
      var meio = [w / 2, h / 2, d / 2];
      r = Math.min(r, meio[0], meio[1], meio[2]) * 0.999;
      var v = new T.Vector3(), dentro = new T.Vector3(), n = new T.Vector3();
      for (var i = 0; i < pos.count; i++) {
        var c = [pos.getX(i), pos.getY(i), pos.getZ(i)];
        for (var k = 0; k < 3; k++) {
          var u = Math.abs(c[k]), s = c[k] < 0 ? -1 : 1, plano = meio[k] - r;
          c[k] = s * (u < 0.6 ? (u / 0.6) * plano : plano + r * (u - 0.6) / 0.4);
        }
        v.set(c[0], c[1], c[2]);
        dentro.set(
          Math.max(-meio[0] + r, Math.min(meio[0] - r, v.x)),
          Math.max(-meio[1] + r, Math.min(meio[1] - r, v.y)),
          Math.max(-meio[2] + r, Math.min(meio[2] - r, v.z)));
        n.subVectors(v, dentro);
        if (n.lengthSq() < 1e-10) n.set(nor.getX(i), nor.getY(i), nor.getZ(i));
        else n.normalize();
        v.copy(dentro).addScaledVector(n, r);
        pos.setXYZ(i, v.x, v.y, v.z);
        nor.setXYZ(i, n.x, n.y, n.z);
      }
      return g;
    }

    var aux = new T.Object3D();
    function instancias(geo, mat, lista){
      var m = new T.InstancedMesh(geo, mat, lista.length);
      lista.forEach(function(it, i){
        aux.position.set(it[0], it[1], it[2]);
        aux.rotation.set(it[3] || 0, it[4] || 0, it[5] || 0);
        aux.scale.set(1, 1, 1);
        aux.updateMatrix();
        m.setMatrixAt(i, aux.matrix);
      });
      m.instanceMatrix.needsUpdate = true;
      return m;
    }

    /* ==========================================================
       LUZ E REFLEXOS
       ========================================================== */
    var ENV_QUENTE = null;
    (function(){
      // ambiente para os metais: um estúdio escuro com três softboxes
      var c = tela(1024, 512, function(g, w, h){
        var gr = g.createLinearGradient(0, 0, 0, h);
        gr.addColorStop(0, '#3a4c66'); gr.addColorStop(0.45, '#121c2b'); gr.addColorStop(1, '#05070c');
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
        function caixa(x, y, cw, ch, cor){
          var r = g.createLinearGradient(x, y, x, y + ch);
          r.addColorStop(0, cor); r.addColorStop(1, 'rgba(255,255,255,.35)');
          g.fillStyle = r; g.fillRect(x, y, cw, ch);
        }
        caixa(110, 70, 190, 90, '#ffffff');
        caixa(600, 120, 260, 46, '#bdf3ff');
        caixa(420, 40, 90, 150, '#ffe2b0');
        caixa(880, 200, 80, 60, '#ffffff');
        g.fillStyle = '#2a3b52'; g.fillRect(0, 330, w, 20);
      });
      var t = tex(c, true);
      t.mapping = T.EquirectangularReflectionMapping;
      var pm = new T.PMREMGenerator(render);
      cena.environment = pm.fromEquirectangular(t).texture;
      t.dispose();
      // um segundo ambiente, quente, só para o ouro do troféu
      var q = tex(tela(1024, 512, function(g, w, h){
        var gr = g.createLinearGradient(0, 0, 0, h);
        gr.addColorStop(0, '#8a6a3c'); gr.addColorStop(0.45, '#3a2812'); gr.addColorStop(1, '#120a04');
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
        g.fillStyle = '#fff6e2'; g.fillRect(90, 60, 220, 110);
        g.fillStyle = '#ffe2a8'; g.fillRect(560, 90, 300, 60);
        g.fillStyle = '#ffffff'; g.fillRect(400, 30, 70, 170);
        g.fillStyle = '#c99a50'; g.fillRect(0, 300, w, 40);
      }), true);
      q.mapping = T.EquirectangularReflectionMapping;
      ENV_QUENTE = pm.fromEquirectangular(q).texture;
      q.dispose(); pm.dispose();

      cena.add(new T.HemisphereLight(0xbfe0ff, 0x0a0f18, 0.5));
      var chave = new T.DirectionalLight(0xfff0dc, 1.7);
      chave.position.set(-35, 45, 60); cena.add(chave);
      var recorte = new T.DirectionalLight(0xb026ff, 1.5);
      recorte.position.set(45, 15, -40); cena.add(recorte);
      var baixo = new T.DirectionalLight(0xffb070, 0.35);
      baixo.position.set(10, -50, 20); cena.add(baixo);
    })();

    /* ==========================================================
       PEÇA 1 · PLACA ARDUINO NANO (unidade = milímetro)
       ========================================================== */
    function criarPlaca(){
      var W = 18, L = 45, E = 1.6, PX = alto ? 40 : 24;
      var rnd = semente(7);

      // furos dos dois barramentos de pinos, 2,54 mm entre si
      var furos = [];
      for (var i = 0; i < 15; i++) { furos.push([1.38, 4.4 + i * 2.54, i === 0]); furos.push([16.62, 4.4 + i * 2.54, false]); }
      var icsp = [];
      for (var a = 0; a < 3; a++) for (var b = 0; b < 2; b++) icsp.push([6.46 + a * 2.54, 40.3 + b * 2.0]);

      // trilhas: saem dos pinos, correm para dentro e viram 45° em direção ao chip
      var trilhas = [];
      for (var t = 0; t < 52; t++) {
        var f = furos[Math.floor(rnd() * furos.length)];
        var lado = f[0] < 9 ? 1 : -1;
        var x1 = f[0] + lado * (1.6 + rnd() * 2.4);
        var ax = 9 + (rnd() - 0.5) * 7, ay = 24.5 + (rnd() - 0.5) * 8;
        if (rnd() < 0.3) { ax = 4 + rnd() * 10; ay = 8 + rnd() * 30; }
        var dx = ax - x1, dy = ay - f[1], dg = Math.min(Math.abs(dx), Math.abs(dy));
        var x2 = x1 + Math.sign(dx) * dg, y2 = f[1] + Math.sign(dy) * dg;
        trilhas.push({ larg: rnd() < 0.12 ? 0.7 : 0.3, pts: [[f[0], f[1]], [x1, f[1]], [x2, y2], [x2, ay]] });
      }
      var vias = [];
      for (var v = 0; v < 34; v++) vias.push([2.8 + rnd() * 12.4, 6 + rnd() * 36]);
      var NOMES_E = ['D12', 'D11', 'D10', 'D9', 'D8', 'D7', 'D6', 'D5', 'D4', 'D3', 'D2', 'GND', 'RST', 'RX0', 'TX1'];
      var NOMES_D = ['D13', '3V3', 'REF', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', '5V', 'RST', 'GND', 'VIN'];

      function pintarPlaca(modo, baixo){
        return tela(W * PX, L * PX, function(g, w, h){
          var mm = PX;
          var cores = {
            cor:    { base: null, trilha: 'rgba(216,180,254,.65)', sombra: 'rgba(15,3,30,.55)', ilha: 'ouro', furo: '#0c0f14', tinta: 'rgba(238,244,247,.93)' },
            metal:  { base: 'rgb(0,150,0)', trilha: 'rgb(0,128,0)', sombra: null, ilha: 'rgb(0,64,255)', furo: 'rgb(0,200,0)', tinta: 'rgb(0,175,0)' },
            relevo: { base: '#7a7a7a', trilha: '#a2a2a2', sombra: null, ilha: '#b8b8b8', furo: '#2a2a2a', tinta: '#949494' }
          }[modo];
          if (modo === 'cor') {
            var gr = g.createLinearGradient(0, 0, w, h);
            gr.addColorStop(0, '#3b0d66'); gr.addColorStop(1, '#1f0636');
            g.fillStyle = gr; g.fillRect(0, 0, w, h);
            var r2 = semente(baixo ? 31 : 21);
            salpicar(g, w, h, 5200, ['rgba(255,255,255,.035)', 'rgba(0,0,0,.06)'], 2.2, r2);
            g.strokeStyle = 'rgba(0,20,45,.5)'; g.lineWidth = 0.35 * mm; g.strokeRect(0, 0, w, h);
          } else { g.fillStyle = cores.base; g.fillRect(0, 0, w, h); }

          g.lineJoin = 'round'; g.lineCap = 'round';
          var lista = baixo ? trilhas.slice(18) : trilhas;
          lista.forEach(function(tr){
            function caminho(){
              g.beginPath();
              tr.pts.forEach(function(pt, k){ var x = (baixo ? W - pt[0] : pt[0]) * mm, y = pt[1] * mm; if (k) g.lineTo(x, y); else g.moveTo(x, y); });
            }
            if (cores.sombra) { caminho(); g.strokeStyle = cores.sombra; g.lineWidth = (tr.larg + 0.18) * mm; g.stroke(); }
            caminho(); g.strokeStyle = cores.trilha; g.lineWidth = tr.larg * mm; g.stroke();
          });

          function ilha(x, y, r, quadrada){
            if (cores.ilha === 'ouro') {
              var go = g.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
              go.addColorStop(0, '#fbe6a2'); go.addColorStop(0.6, '#d9a94b'); go.addColorStop(1, '#a8772a');
              g.fillStyle = go;
            } else g.fillStyle = cores.ilha;
            if (quadrada) g.fillRect(x - r, y - r, r * 2, r * 2);
            else { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
          }
          furos.forEach(function(fu){
            var x = (baixo ? W - fu[0] : fu[0]) * mm, y = fu[1] * mm;
            ilha(x, y, 0.88 * mm, fu[2]);
            g.fillStyle = cores.furo; g.beginPath(); g.arc(x, y, 0.45 * mm, 0, Math.PI * 2); g.fill();
          });
          vias.forEach(function(vi){
            var x = (baixo ? W - vi[0] : vi[0]) * mm, y = vi[1] * mm;
            ilha(x, y, 0.32 * mm);
            g.fillStyle = cores.furo; g.beginPath(); g.arc(x, y, 0.14 * mm, 0, Math.PI * 2); g.fill();
          });
          if (!baixo) icsp.forEach(function(ic, k){
            ilha(ic[0] * mm, ic[1] * mm, 0.62 * mm, k === 0);
            g.fillStyle = cores.furo; g.beginPath(); g.arc(ic[0] * mm, ic[1] * mm, 0.34 * mm, 0, Math.PI * 2); g.fill();
          });

          // serigrafia branca
          g.fillStyle = cores.tinta; g.strokeStyle = cores.tinta;
          g.textBaseline = 'middle';
          g.font = 'bold ' + Math.round(0.72 * mm) + 'px Arial, sans-serif';
          if (!baixo) {
            for (var p = 0; p < 15; p++) {
              g.textAlign = 'left'; g.fillText(NOMES_E[p], 2.55 * mm, (4.4 + p * 2.54) * mm);
              g.textAlign = 'right'; g.fillText(NOMES_D[p], 15.45 * mm, (4.4 + p * 2.54) * mm);
            }
            g.textAlign = 'center';
            [['TX', 5.5], ['RX', 7.5], ['PWR', 10.5], ['L', 12.5]].forEach(function(l){ g.fillText(l[0], l[1] * mm, 12.6 * mm); });
            g.fillText('ICSP', 9 * mm, 43.9 * mm);
            g.font = 'bold ' + Math.round(1.25 * mm) + 'px Arial, sans-serif';
            g.fillText('DEV', 9 * mm, 37.6 * mm);
            g.lineWidth = 0.14 * mm;
            g.strokeRect(5.2 * mm, 32.6 * mm, 7.6 * mm, 3.8 * mm);            // contorno do botão
            g.save(); g.translate(9 * mm, 24.5 * mm); g.rotate(Math.PI / 4);   // contorno do chip a 45°
            g.strokeRect(-4.6 * mm, -4.6 * mm, 9.2 * mm, 9.2 * mm);
            g.beginPath(); g.arc(-3.7 * mm, -3.7 * mm, 0.35 * mm, 0, Math.PI * 2); g.fill();
            g.restore();
          } else {
            g.textAlign = 'center';
            g.font = 'bold ' + Math.round(1.0 * mm) + 'px Arial, sans-serif';
            g.fillText('CH340G', 9 * mm, 20.2 * mm);
            g.fillText('AMS1117', 9 * mm, 9.6 * mm);
            g.font = 'bold ' + Math.round(0.8 * mm) + 'px Arial, sans-serif';
            g.fillText('RONALDO · 2026', 9 * mm, 36 * mm);
          }
        });
      }

      var topoCor = tex(pintarPlaca('cor', false), true), topoMet = tex(pintarPlaca('metal', false)), topoRel = tex(pintarPlaca('relevo', false));
      var baixoCor = tex(pintarPlaca('cor', true), true), baixoMet = tex(pintarPlaca('metal', true)), baixoRel = tex(pintarPlaca('relevo', true));
      function matPlaca(cor, met, rel){
        return fisico({ map: cor, roughnessMap: met, metalnessMap: met, bumpMap: rel, bumpScale: 0.035, metalness: 1, roughness: 1, clearcoat: 0.55, clearcoatRoughness: 0.32 });
      }
      var borda = new T.MeshStandardMaterial({ color: 0xbcae78, roughness: 0.85 });
      var placa = new T.Mesh(new T.BoxGeometry(W, E, L), [borda, borda, matPlaca(topoCor, topoMet, topoRel), matPlaca(baixoCor, baixoMet, baixoRel), borda, borda]);

      var g = new T.Group();
      g.add(placa);
      function px(x){ return x - W / 2; }
      function pz(y){ return y - L / 2; }
      var topo = E / 2;

      var metal = new T.MeshStandardMaterial({ color: 0xd9dde2, metalness: 1, roughness: 0.26 });
      var ouro = new T.MeshStandardMaterial({ color: 0xe8b85a, metalness: 1, roughness: 0.3 });
      var solda = new T.MeshStandardMaterial({ color: 0xc8ccd2, metalness: 1, roughness: 0.18 });
      var plastPreto = new T.MeshStandardMaterial({ color: 0x18191c, roughness: 0.55 });
      var plastCinza = new T.MeshStandardMaterial({ color: 0xd8d8d2, roughness: 0.5 });

      // o ATmega328P, girado 45° como na placa de verdade
      var chipTopo = tex(tela(512, 512, function(c, w, h){
        c.fillStyle = '#16171a'; c.fillRect(0, 0, w, h);
        salpicar(c, w, h, 2600, ['rgba(255,255,255,.03)', 'rgba(0,0,0,.25)'], 2, semente(5));
        var d = c.createRadialGradient(92, 92, 4, 92, 92, 34);
        d.addColorStop(0, '#0b0b0d'); d.addColorStop(0.8, '#101012'); d.addColorStop(1, '#2a2b2f');
        c.fillStyle = d; c.beginPath(); c.arc(92, 92, 34, 0, Math.PI * 2); c.fill();
        c.fillStyle = 'rgba(170,174,182,.85)'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.font = 'bold 62px Arial, sans-serif'; c.fillText('MEGA328P', 256, 250);
        c.font = '42px Arial, sans-serif'; c.fillText('20AU  2026', 256, 318);
        c.font = 'bold 36px Arial, sans-serif'; c.fillText('PV', 256, 180);
      }), true);
      var chipLado = new T.MeshStandardMaterial({ color: 0x141416, roughness: 0.6 });
      var chip = new T.Group();
      chip.add(new T.Mesh(caixaRed(7, 1.0, 7, 0.12), [chipLado, chipLado, new T.MeshStandardMaterial({ map: chipTopo, roughness: 0.62 }), chipLado, chipLado, chipLado]));
      var pernas = [];
      for (var s = 0; s < 4; s++) for (var k = 0; k < 8; k++) {
        var o = (k - 3.5) * 0.8, ang = s * Math.PI / 2;
        var lx = Math.cos(ang) * 3.95, lz = Math.sin(ang) * 3.95;
        pernas.push([lx + Math.sin(ang) * o, -0.28, lz - Math.cos(ang) * o, 0, -ang, 0]);
      }
      chip.add(instancias(new T.BoxGeometry(1.1, 0.16, 0.32), metal, pernas));
      chip.position.set(px(9), topo + 0.62, pz(24.5));
      chip.rotation.y = Math.PI / 4;
      g.add(chip);

      // conector mini USB
      var usb = new T.Group();
      usb.add(new T.Mesh(caixaRed(7.7, 3.9, 9, 0.35), metal));
      var boca = new T.Mesh(new T.BoxGeometry(5.4, 2.2, 0.6), new T.MeshStandardMaterial({ color: 0x050506, roughness: 0.9 }));
      boca.position.set(0, 0.1, -4.35); usb.add(boca);
      var lingua = new T.Mesh(new T.BoxGeometry(3.6, 0.6, 0.7), plastPreto);
      lingua.position.set(0, 0.2, -4.1); usb.add(lingua);
      [-1.8, 1.8].forEach(function(x){
        var furo = new T.Mesh(new T.BoxGeometry(1.1, 0.12, 1.4), new T.MeshStandardMaterial({ color: 0x2a2d31, metalness: 1, roughness: 0.5 }));
        furo.position.set(x, 1.98, -1.5); usb.add(furo);
      });
      usb.position.set(px(9), topo + 1.95, pz(3.4));
      g.add(usb);

      // botão de reset, cristal, LEDs e componentes SMD
      var botao = new T.Mesh(caixaRed(3.4, 0.9, 3.4, 0.12), metal);
      botao.position.set(px(9), topo + 0.45, pz(34.5)); g.add(botao);
      var capa = new T.Mesh(new T.CylinderGeometry(0.95, 1.0, 0.7, 28), plastCinza);
      capa.position.set(px(9), topo + 1.2, pz(34.5)); g.add(capa);
      var cristal = new T.Mesh(caixaRed(1.8, 1.0, 3.6, 0.4), metal);
      cristal.position.set(px(14.2), topo + 0.5, pz(17)); g.add(cristal);

      var leds = [];
      [[5.5, 0xffd23a], [7.5, 0xff5a3c], [10.5, 0x46ff8c], [12.5, 0xffa030]].forEach(function(l, idx){
        var mat = new T.MeshStandardMaterial({ color: 0xfff6e0, emissive: l[1], emissiveIntensity: 0.15, roughness: 0.3, transparent: true, opacity: 0.95 });
        var m = new T.Mesh(caixaRed(1.6, 0.6, 0.9, 0.08), mat);
        m.position.set(px(l[0]), topo + 0.3, pz(11)); g.add(m);
        var luz = sprite(brilho('rgba(255,255,255,1)'), 7, l[1]);
        luz.position.set(px(l[0]), topo + 1.2, pz(11)); luz.material.opacity = 0; g.add(luz);
        leds.push({ mat: mat, luz: luz, nivel: idx === 2 ? 1 : 0, fixo: idx === 2 });
      });

      var smd = [];
      var corpoR = new T.MeshStandardMaterial({ color: 0x1b1b1d, roughness: 0.5 });
      var corpoC = new T.MeshStandardMaterial({ color: 0xb9925a, roughness: 0.6 });
      [[4.2, 20.5, 0], [4.2, 29, 0], [13.8, 29.5, 0], [13.6, 21, 1], [6, 15.5, 1], [12, 15.5, 1], [6.2, 31, 1], [11.8, 31, 0],
       [4.6, 24.6, 1], [13.4, 24.6, 0], [9, 16.2, 0], [9, 29.8, 1]].forEach(function(c){
        var corpo = new T.Mesh(caixaRed(1.6, 0.55, 0.85, 0.07), c[2] ? corpoC : corpoR);
        corpo.position.set(px(c[0]), topo + 0.28, pz(c[1]));
        corpo.rotation.y = (c[0] + c[1]) % 2 > 1 ? Math.PI / 2 : 0;
        g.add(corpo);
        [-0.66, 0.66].forEach(function(e){
          var ponta = new T.Mesh(new T.BoxGeometry(0.28, 0.58, 0.88), solda);
          ponta.position.set(e, 0, 0); corpo.add(ponta);
        });
        smd.push(corpo);
      });

      // barramentos de pinos por baixo e as soldas por cima
      var baseX = [px(1.38), px(16.62)];
      baseX.forEach(function(x){
        var barra = new T.Mesh(caixaRed(2.5, 2.5, 38.1, 0.2), plastPreto);
        barra.position.set(x, -topo - 1.25, pz(22.18)); g.add(barra);
      });
      var pinos = [], soldas = [];
      furos.forEach(function(fu){
        pinos.push([px(fu[0]), -4.1, pz(fu[1])]);
        soldas.push([px(fu[0]), topo + 0.3, pz(fu[1])]);
      });
      g.add(instancias(new T.BoxGeometry(0.64, 10.4, 0.64), ouro, pinos));
      g.add(instancias(new T.ConeGeometry(0.82, 0.6, 14), solda, soldas));
      var pinosIcsp = icsp.map(function(ic){ return [px(ic[0]), topo + 3.2, pz(ic[1])]; });
      g.add(instancias(new T.BoxGeometry(0.64, 6.4, 0.64), ouro, pinosIcsp));
      var baseIcsp = new T.Mesh(caixaRed(7.8, 2.5, 4.6, 0.2), plastPreto);
      baseIcsp.position.set(px(9), topo + 1.25, pz(41.3)); g.add(baseIcsp);

      // por baixo: o conversor USB e o regulador
      var ch = new T.Mesh(caixaRed(10, 1.5, 4, 0.1), [chipLado, chipLado, chipLado, new T.MeshStandardMaterial({ map: chipTopo, roughness: 0.62 }), chipLado, chipLado]);
      ch.position.set(px(9), -topo - 0.75, pz(20)); g.add(ch);
      var reg = new T.Mesh(caixaRed(6.5, 1.6, 3.5, 0.1), plastPreto);
      reg.position.set(px(9), -topo - 0.8, pz(9.5)); g.add(reg);

      var t0 = 0;
      return {
        grupo: g, escala: 0.82, cor: [176, 38, 255],
        atualizar: function(dt, t, giro){
          // pose: em pé, de frente para a câmera, girando devagar no eixo comprido
          giro.rotation.set(1.18 + Math.sin(t * 0.5) * 0.08, Math.sin(t * 0.33) * 0.55, Math.sin(t * 0.27) * 0.12);
          leds.forEach(function(l, i){
            if (i === 3) l.nivel = Math.max(l.nivel, (Math.sin(t * 6.3) > 0.2) ? 0.85 : 0);   // o "L" pisca sozinho
            if (!l.fixo) l.nivel = Math.max(0, l.nivel - dt * 3.2);
            l.mat.emissiveIntensity = 0.15 + l.nivel * 4;
            l.luz.material.opacity = l.nivel * 0.95;
          });
        },
        evento: function(nome){
          if (nome === 'pulo') leds[0].nivel = 1;
          else if (nome === 'pouso') leds[1].nivel = 1;
          else if (nome === 'soco' || nome === 'trofeu') leds.forEach(function(l){ l.nivel = 1; });
          else if (nome === 'coleta') { leds[0].nivel = 1; leds[1].nivel = 1; }
        }
      };
    }

    /* ==========================================================
       PEÇA 2 · MÃO ROBÓTICA PUPPET (unidade = centímetro)
       PLA creme com marcas de camada, servos azuis com polias
       pretas no antebraço e articulação por cabos.
       ========================================================== */
    function criarMao(){
      var rnd = semente(11);
      function pla(modo){
        return tela(512, 512, function(g, w, h){
          g.fillStyle = modo === 'cor' ? '#e8d39b' : (modo === 'rugo' ? 'rgb(0,165,0)' : '#808080');
          g.fillRect(0, 0, w, h);
          // camadas da impressão 3D: listras finas que pegam a luz
          for (var y = 0; y < h; y += 4) {
            var claro = (y / 4) % 2 === 0;
            if (modo === 'cor') g.fillStyle = claro ? 'rgba(255,250,232,.10)' : 'rgba(120,96,40,.08)';
            else if (modo === 'rugo') g.fillStyle = claro ? 'rgba(0,120,0,.5)' : 'rgba(0,210,0,.5)';
            else g.fillStyle = claro ? '#9a9a9a' : '#6a6a6a';
            g.fillRect(0, y, w, 2);
          }
          if (modo === 'cor') salpicar(g, w, h, 1600, ['rgba(110,86,30,.10)', 'rgba(255,255,255,.12)'], 2.5, rnd);
        });
      }
      var cor = tex(pla('cor'), true, true), rugo = tex(pla('rugo'), false, true), rel = tex(pla('relevo'), false, true);
      [cor, rugo, rel].forEach(function(t){ t.repeat.set(1, 1.6); });
      var plaMat = new T.MeshStandardMaterial({ map: cor, roughnessMap: rugo, bumpMap: rel, bumpScale: 0.03, roughness: 1, metalness: 0 });
      var plaEscuro = new T.MeshStandardMaterial({ color: 0xc9b07a, map: cor, bumpMap: rel, bumpScale: 0.03, roughness: 0.8 });
      var pino = new T.MeshStandardMaterial({ color: 0x9aa0a8, metalness: 1, roughness: 0.32 });
      var cabo = new T.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.4 });

      var mao = new T.Group();
      // palma
      var palma = new T.Mesh(caixaRed(8.2, 8.6, 2.7, 0.75), plaMat);
      palma.position.set(0, 4.3, 0); mao.add(palma);
      // gravação na palma
      var gravacao = new T.Mesh(new T.PlaneGeometry(5.6, 1.6), new T.MeshStandardMaterial({
        map: tex(tela(512, 146, function(g, w, h){
          g.fillStyle = 'rgba(150,118,52,.55)'; g.font = 'bold 92px Arial, sans-serif';
          g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('PUPPET', w / 2, h / 2 + 4);
        }), true), transparent: true, roughness: 0.9, depthWrite: false
      }));
      gravacao.position.set(0, 2.2, 1.36); mao.add(gravacao);
      [[-2.6, 6.9], [2.6, 6.9], [-2.6, 1.0], [2.6, 1.0]].forEach(function(pp){
        var parafuso = new T.Mesh(new T.CylinderGeometry(0.32, 0.32, 0.2, 18), pino);
        parafuso.rotation.x = Math.PI / 2; parafuso.position.set(pp[0], pp[1], 1.38); mao.add(parafuso);
      });

      // dedos: três falanges presas por pinos, cada junta é um grupo que gira
      var dedos = [];
      function dedo(x, y, z, tamanhos, larg, rotZ, rotY){
        var base = new T.Group();
        base.position.set(x, y, z); base.rotation.z = rotZ || 0; base.rotation.y = rotY || 0;
        mao.add(base);
        var juntas = [], pai = base;
        tamanhos.forEach(function(tam, i){
          var junta = new T.Group();
          if (i > 0) junta.position.y = tamanhos[i - 1];
          pai.add(junta);
          var ponta = i === tamanhos.length - 1;
          var seg = new T.Mesh(caixaRed(larg * (ponta ? 0.92 : 0.96), tam - 0.5, 1.5, ponta ? 0.68 : 0.48), plaMat);
          seg.position.y = tam / 2 + 0.25;
          junta.add(seg);
          // nó da dobradiça: cilindro de PLA atravessado por um pino de metal
          var no = new T.Mesh(new T.CylinderGeometry(0.66, 0.66, larg * 0.9, 28), plaEscuro);
          no.rotation.z = Math.PI / 2; junta.add(no);
          var eixo = new T.Mesh(new T.CylinderGeometry(0.2, 0.2, larg + 0.36, 14), pino);
          eixo.rotation.z = Math.PI / 2; junta.add(eixo);
          [-1, 1].forEach(function(l){
            var cabeca = new T.Mesh(new T.CylinderGeometry(0.3, 0.3, 0.1, 18), pino);
            cabeca.rotation.z = Math.PI / 2; cabeca.position.x = l * (larg / 2 + 0.18); junta.add(cabeca);
          });
          juntas.push(junta); pai = junta;
        });
        dedos.push({ juntas: juntas, base: base });
        return base;
      }
      dedo(-2.95, 9.0, 0, [3.9, 2.7, 2.2], 1.62);
      dedo(-0.98, 9.15, 0, [4.3, 3.0, 2.3], 1.66);
      dedo(0.98, 9.05, 0, [4.0, 2.8, 2.2], 1.62);
      dedo(2.9, 8.85, 0, [3.2, 2.3, 1.9], 1.45);
      dedo(-4.4, 2.6, 0.45, [3.3, 2.7], 1.8, 0.85, -0.55);    // polegar

      // cabos de articulação: da polia de cada servo, subindo pela palma até a base de cada dedo
      var antebraco = new T.Group();
      antebraco.position.set(0, -0.8, -0.2);
      mao.add(antebraco);
      var punho = new T.Mesh(caixaRed(7.2, 1.8, 3.1, 0.6), plaEscuro);
      punho.position.set(0, -0.2, 0); antebraco.add(punho);
      var eixoPunho = new T.Mesh(new T.CylinderGeometry(0.55, 0.55, 7.8, 20), pino);
      eixoPunho.rotation.z = Math.PI / 2; eixoPunho.position.set(0, 0.4, 0); antebraco.add(eixoPunho);
      var calha = new T.Group();
      var fundoC = caixaRed(8.0, 15.5, 1.4, 0.6);
      var paredes = [
        [caixaRed(0.8, 15.5, 3.6, 0.35), -3.6, 0, 0.7], [caixaRed(0.8, 15.5, 3.6, 0.35), 3.6, 0, 0.7],
        [caixaRed(8.0, 0.8, 3.6, 0.35), 0, 7.35, 0.7], [caixaRed(8.0, 0.9, 3.6, 0.35), 0, -7.3, 0.7]
      ];
      var chao = new T.Mesh(fundoC, plaMat); chao.position.z = -0.6; calha.add(chao);
      paredes.forEach(function(pp){ var m = new T.Mesh(pp[0], plaMat); m.position.set(pp[1], pp[2], pp[3]); calha.add(m); });
      var interior = new T.Mesh(caixaRed(6.4, 13.6, 0.3, 0.1), new T.MeshStandardMaterial({ color: 0xb59c64, map: cor, roughness: 0.9 }));
      interior.position.z = 0.15; calha.add(interior);
      calha.position.set(0, -9.0, -0.5);
      // mais largo perto do cotovelo, como o antebraço de verdade
      calha.children.forEach(function(m){
        var pos = m.geometry.attributes.position;
        if (m.geometry._afinado) return;
        for (var q = 0; q < pos.count; q++) {
          var yy = pos.getY(q) + m.position.y;
          pos.setX(q, pos.getX(q) * (1 + 0.16 * (7.75 - yy) / 15.5) + (m.position.x ? m.position.x * 0.16 * (7.75 - yy) / 15.5 : 0));
        }
        pos.needsUpdate = true; m.geometry._afinado = true;
      });
      antebraco.add(calha);

      var azul = fisico({ color: 0x2a49d6, roughness: 0.32, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.2, transparent: true, opacity: 0.94 });
      var rotulo = tex(tela(256, 256, function(g, w, h){
        g.fillStyle = '#2a49d6'; g.fillRect(0, 0, w, h);
        g.fillStyle = 'rgba(255,255,255,.85)'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.font = 'bold 54px Arial, sans-serif'; g.fillText('SG90', w / 2, h * 0.42);
        g.font = '30px Arial, sans-serif'; g.fillText('9g servo', w / 2, h * 0.64);
      }), true);
      var azulRotulo = fisico({ map: rotulo, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.2 });
      var polia = new T.MeshStandardMaterial({ color: 0x141518, roughness: 0.45 });
      var marca = new T.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.5 });
      var polias = [];
      [[-1.6, -5.4], [1.6, -5.4], [-1.6, -11.2], [1.6, -11.2]].forEach(function(sp, i){
        var servo = new T.Group();
        servo.position.set(sp[0], sp[1], 1.6);
        var corpo = new T.Mesh(caixaRed(2.3, 2.6, 1.2, 0.12), [azul, azul, azul, azul, azulRotulo, azul]);
        corpo.position.z = 0.6; servo.add(corpo);
        var aba = new T.Mesh(caixaRed(2.3, 3.3, 0.24, 0.06), azul);
        aba.position.z = 0.9; servo.add(aba);
        var eixo = new T.Mesh(new T.CylinderGeometry(0.3, 0.3, 0.5, 16), marca);
        eixo.rotation.x = Math.PI / 2; eixo.position.set(0, 0.6, 1.4); servo.add(eixo);
        var disco = new T.Group();
        disco.position.set(0, 0.6, 1.7);
        var d = new T.Mesh(new T.CylinderGeometry(1.05, 1.05, 0.3, 36), polia);
        d.rotation.x = Math.PI / 2; disco.add(d);
        for (var f = 0; f < 6; f++) {
          var ponto = new T.Mesh(new T.CylinderGeometry(0.12, 0.12, 0.32, 10), marca);
          ponto.rotation.x = Math.PI / 2;
          ponto.position.set(Math.cos(f * Math.PI / 3) * 0.7, Math.sin(f * Math.PI / 3) * 0.7, 0.02);
          disco.add(ponto);
        }
        servo.add(disco);
        antebraco.add(servo);
        polias.push(disco);
        // fios do servo: marrom, vermelho e laranja saindo pelo fim do antebraço
        [0x6b3a1e, 0xd2322b, 0xf08a1c].forEach(function(cf, k){
          var x0 = sp[0] + (k - 1) * 0.22;
          var curva = new T.CatmullRomCurve3([
            new T.Vector3(x0, sp[1] - 1.4, 1.9),
            new T.Vector3(x0 * 0.6 + (k - 1) * 0.3, sp[1] - 3.5, 2.2),
            new T.Vector3(x0 * 0.4 + (k - 1) * 0.35, -17.5, 1.4),
            new T.Vector3(x0 * 0.3 + (i % 2 ? 2 : -2) + (k - 1) * 0.4, -21, 0.2 + i * 0.3)
          ]);
          antebraco.add(new T.Mesh(new T.TubeGeometry(curva, 40, 0.11, 8, false), new T.MeshStandardMaterial({ color: cf, roughness: 0.45 })));
        });
      });
      // cabos de linha de pesca das polias até os dedos
      [[-2.95, -1.6, -5.4], [-0.98, 1.6, -5.4], [0.98, -1.6, -11.2], [2.9, 1.6, -11.2]].forEach(function(c){
        var curva = new T.CatmullRomCurve3([
          new T.Vector3(c[1] + 0.9, c[2] - 0.2 - 0.8, 1.9),
          new T.Vector3(c[0] * 0.8, 0.5, 1.75),
          new T.Vector3(c[0], 6.5, 1.45),
          new T.Vector3(c[0], 8.9, 1.0)
        ]);
        antebraco.parent.add(new T.Mesh(new T.TubeGeometry(curva, 40, 0.045, 6, false), cabo));
      });

      var fechar = 0, aceno = 0, tremor = 0;
      return {
        grupo: mao, escala: 1.16, cor: [235, 210, 150],
        atualizar: function(dt, t, giro){
          fechar = Math.max(0, fechar - dt * 0.9);
          aceno = Math.max(0, aceno - dt * 1.6);
          tremor = Math.max(0, tremor - dt * 2.5);
          giro.rotation.set(0.12 + Math.sin(t * 0.4) * 0.05, -0.38 + Math.sin(t * 0.3) * 0.28, Math.sin(t * 0.5) * 0.05 + Math.sin(t * 14) * aceno * 0.18);
          giro.position.x = (Math.random() - 0.5) * tremor;
          dedos.forEach(function(d, i){
            var onda = Math.pow(Math.max(0, Math.sin(t * 1.5 - i * 0.65)), 2);
            var c = Math.max(0.1 + onda * 0.55, fechar);
            if (i === 4) c = Math.max(0.15 + 0.3 * (0.5 + 0.5 * Math.sin(t * 1.1)), fechar * 0.8);
            var angulos = i === 4 ? [0.7, 0.9] : [1.25, 1.45, 1.1];
            d.juntas.forEach(function(j, k){ j.rotation.x = c * angulos[k]; });
          });
          polias.forEach(function(p, i){ p.rotation.z = (dedos[i] ? (fechar + Math.sin(t * 1.5 - i * 0.65)) : 0) * 1.8; });
        },
        evento: function(nome){
          if (nome === 'soco') fechar = 1;
          else if (nome === 'pulo' || nome === 'coleta') aceno = Math.max(aceno, 0.6);
          else if (nome === 'dano') tremor = 1.2;
          else if (nome === 'trofeu') fechar = 0.8;
        }
      };
    }

    /* ==========================================================
       PEÇA 3 · TROFÉU (unidade = centímetro)
       Taça torneada (LatheGeometry), alças em arco, base de
       mármore e plaqueta gravada.
       ========================================================== */
    function criarTrofeu(){
      var rnd = semente(19);
      var escovado = tex(tela(512, 512, function(g, w, h){
        g.fillStyle = 'rgb(0,52,255)'; g.fillRect(0, 0, w, h);
        for (var i = 0; i < 700; i++) {
          g.fillStyle = 'rgba(0,' + Math.floor(38 + rnd() * 34) + ',255,.35)';
          g.fillRect(0, rnd() * h, w, 1);
        }
      }), false, true);
      escovado.repeat.set(2, 4);
      var ouro = fisico({ color: 0xffc85a, metalness: 1, roughness: 1, roughnessMap: escovado, clearcoat: 0.4, clearcoatRoughness: 0.12, envMap: ENV_QUENTE, envMapIntensity: 1.7 });

      var trofeu = new T.Group();
      // luz quente própria: o ouro precisa de algo claro para refletir
      var quente = new T.PointLight(0xffd08a, 1.6, 40);
      quente.position.set(-4, 9, 8); trofeu.add(quente);
      var quente2 = new T.PointLight(0xfff4dc, 0.9, 40);
      quente2.position.set(6, 3, 6); trofeu.add(quente2);
      var perfil = [
        [0, 0], [2.45, 0], [2.45, 0.32], [2.1, 0.48], [1.3, 0.7], [0.78, 1.1], [0.62, 1.7], [0.62, 2.35], [1.02, 2.55],
        [1.02, 2.82], [0.62, 3.0], [0.52, 3.45], [0.85, 3.85], [1.8, 4.35], [2.65, 5.2], [3.15, 6.4], [3.32, 7.5],
        [3.52, 7.86], [3.42, 7.98], [3.18, 7.86], [3.0, 6.9], [2.5, 5.6], [1.3, 4.7], [0.01, 4.5]
      ].map(function(p){ return new T.Vector2(p[0], p[1]); });
      var curva = new T.SplineCurve(perfil);
      var taca = new T.Mesh(new T.LatheGeometry(curva.getPoints(140), 96), ouro);
      trofeu.add(taca);
      [-1, 1].forEach(function(lado){
        var alca = new T.Mesh(new T.TorusGeometry(1.25, 0.2, 18, 48, Math.PI * 1.15), ouro);
        alca.position.set(lado * 3.05, 6.15, 0);
        // o arco tem 1,15π; gira para o meio dele apontar para fora da taça
        alca.rotation.z = lado < 0 ? Math.PI * 0.425 : -Math.PI * 0.575;
        trofeu.add(alca);
      });
      // base de mármore com veios
      var marmore = tex(tela(512, 512, function(g, w, h){
        g.fillStyle = '#121418'; g.fillRect(0, 0, w, h);
        salpicar(g, w, h, 2000, ['rgba(255,255,255,.035)', 'rgba(0,0,0,.25)'], 3, rnd);
        // veios: curvas suaves, desfocadas, que se ramificam
        g.lineCap = 'round';
        g.shadowColor = 'rgba(230,236,245,.5)';
        for (var v = 0; v < 11; v++) {
          g.strokeStyle = 'rgba(214,222,232,' + (0.1 + rnd() * 0.22) + ')';
          g.lineWidth = 0.5 + rnd() * 1.6;
          g.shadowBlur = 3 + rnd() * 6;
          g.beginPath();
          var x = rnd() * w, y = -10;
          g.moveTo(x, y);
          while (y < h + 10) {
            var nx = x + (rnd() - 0.5) * 90, ny = y + 50 + rnd() * 70;
            g.quadraticCurveTo(x + (rnd() - 0.5) * 70, (y + ny) / 2, nx, ny);
            x = nx; y = ny;
          }
          g.stroke();
        }
        g.shadowBlur = 0;
      }), true);
      var pedra = fisico({ map: marmore, roughness: 0.3, clearcoat: 0.9, clearcoatRoughness: 0.08, envMapIntensity: 1.4 });
      var base = new T.Mesh(caixaRed(6.4, 2.2, 6.4, 0.22), pedra);
      base.position.set(0, -1.1, 0); trofeu.add(base);
      var friso = new T.Mesh(caixaRed(6.6, 0.22, 6.6, 0.08), ouro);
      friso.position.set(0, -0.05, 0); trofeu.add(friso);
      var placa = new T.Mesh(new T.PlaneGeometry(4.2, 1.25), fisico({
        metalness: 1, roughness: 0.32, envMap: ENV_QUENTE,
        map: tex(tela(672, 200, function(g, w, h){
          var gr = g.createLinearGradient(0, 0, w, h);
          gr.addColorStop(0, '#ffe7a6'); gr.addColorStop(0.5, '#d9a649'); gr.addColorStop(1, '#ffe2a0');
          g.fillStyle = gr; g.fillRect(0, 0, w, h);
          for (var k = 0; k < 160; k++) { g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(0, rnd() * h, w, 1); }
          g.strokeStyle = 'rgba(110,70,20,.7)'; g.lineWidth = 5; g.strokeRect(10, 10, w - 20, h - 20);
          g.fillStyle = 'rgba(92,58,14,.9)'; g.textAlign = 'center'; g.textBaseline = 'middle';
          g.font = 'bold 74px Arial, sans-serif'; g.fillText('1º LUGAR', w / 2, h * 0.42);
          g.font = 'bold 34px Arial, sans-serif'; g.fillText('RONALDO AVANSINI · 2026', w / 2, h * 0.76);
        }), true)
      }));
      placa.position.set(0, -1.1, 3.215); trofeu.add(placa);

      // brilhos em volta da taça
      var qtd = 70, pos = new Float32Array(qtd * 3), cores = new Float32Array(qtd * 3), fases = [];
      for (var b = 0; b < qtd; b++) {
        var ang = rnd() * Math.PI * 2, rr = 3.6 + rnd() * 3.2;
        pos[b * 3] = Math.cos(ang) * rr; pos[b * 3 + 1] = 1 + rnd() * 9; pos[b * 3 + 2] = Math.sin(ang) * rr;
        fases.push(rnd() * 10);
      }
      var geoB = new T.BufferGeometry();
      geoB.setAttribute('position', new T.BufferAttribute(pos, 3));
      geoB.setAttribute('color', new T.BufferAttribute(cores, 3));
      var pontos = new T.Points(geoB, new T.PointsMaterial({ size: 0.7, map: tex(brilho('rgba(255,236,190,1)'), true), vertexColors: true, transparent: true, blending: T.AdditiveBlending, depthWrite: false }));
      trofeu.add(pontos);

      var vel = 0.45, festa = 0;
      return {
        grupo: trofeu, escala: 3.0, cor: [236, 72, 153],
        atualizar: function(dt, t, giro){
          festa = Math.max(0, festa - dt * 0.6);
          vel += (0.45 - vel) * Math.min(1, dt * 1.2);
          giro.rotation.y += vel * dt;
          giro.rotation.x = 0.12 + Math.sin(t * 0.6) * 0.04;
          for (var i = 0; i < qtd; i++) {
            var br = Math.pow(Math.max(0, Math.sin(t * 2.2 + fases[i])), 6) + festa * 0.8;
            cores[i * 3] = br; cores[i * 3 + 1] = br * 0.9; cores[i * 3 + 2] = br * 0.7;
          }
          geoB.attributes.color.needsUpdate = true;
        },
        evento: function(nome){
          if (nome === 'trofeu') { vel = 9; festa = 1; }
          else if (nome === 'coleta') vel = Math.max(vel, 2.2);
          else if (nome === 'soco') festa = Math.max(festa, 0.5);
        }
      };
    }

    /* ==========================================================
       PALCO: quando cada peça aparece, onde fica e como sai
       ========================================================== */
    var PECAS = [
      { criar: criarPlaca, de: 2, ate: 4 },
      { criar: criarMao, de: 5, ate: 7 },
      { criar: criarTrofeu, de: 8, ate: 9 }
    ];
    var luzFundo = brilho('rgba(255,255,255,1)');

    PECAS.forEach(function(pc){
      pc.suporte = new T.Group();      // presença: sobe, desce, muda de lado
      pc.giro = new T.Group();         // a animação própria da peça
      pc.suporte.add(pc.giro);
      pc.suporte.visible = false;
      pc.halo = sprite(luzFundo, 70);
      pc.halo.position.z = -30;
      pc.halo.material.opacity = 0;
      pc.suporte.add(pc.halo);
      cena.add(pc.suporte);
      pc.presenca = 0; pc.x = 0; pc.pronta = false;
    });

    // monta uma peça por vez, sem travar o carregamento da página
    var fila = PECAS.slice();
    function montarProxima(){
      var pc = fila.shift();
      if (!pc) return;
      var p = pc.criar();
      pc.peca = p;
      var centro = new T.Box3().setFromObject(p.grupo).getCenter(new T.Vector3());
      p.grupo.position.sub(centro);
      pc.giro.add(p.grupo);
      pc.giro.scale.setScalar(p.escala);
      pc.halo.material.color.setRGB(p.cor[0] / 255, p.cor[1] / 255, p.cor[2] / 255);
      pc.pronta = true;
      (window.requestIdleCallback || function(f){ setTimeout(f, 30); })(montarProxima);
    }
    setTimeout(montarProxima, 60);

    var W = 0, H = 0;
    function medir(){
      W = window.innerWidth; H = window.innerHeight;
      var dpr = window.devicePixelRatio || 1;
      render.setPixelRatio(nivel === 'alto' ? Math.min(dpr, 1.5) : Math.min(dpr, 1) * 0.8);
      render.setSize(W, H, false);
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', medir);
    medir();

    var mx = 0, my = 0;
    window.addEventListener('pointermove', function(e){
      mx = e.clientX / window.innerWidth - 0.5; my = e.clientY / window.innerHeight - 0.5;
    }, { passive: true });

    function suave(t){ t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }

    var tempo = 0, antes = performance.now(), limpo = true, acumulado = 0;
    function laco(agora){
      requestAnimationFrame(laco);
      var dt = Math.min((agora - antes) / 1000, 0.05);
      antes = agora;
      if (document.hidden || nivel === 'baixo' || !PV.mundo || !PV.mundo.fases.length) return;
      if (nivel !== 'alto') {
        acumulado += dt;
        if (acumulado < 1 / 30) return;
        dt = Math.min(acumulado, 0.05); acumulado = 0;
      }
      tempo += semMovimento ? 0 : dt;

      var M = PV.mundo, c = window.scrollY + H / 2;
      var meiaAltura = Math.tan(camera.fov * Math.PI / 360) * camera.position.z;
      var meiaLargura = meiaAltura * camera.aspect;
      var estreita = camera.aspect < 1;
      var faseAgora = M.fases[M.faseDe(c)];
      var lado = faseAgora && faseAgora.el.classList.contains('dir') ? -1 : 1;
      var algum = false;

      PECAS.forEach(function(pc){
        var fi = M.fases[pc.de], ff = M.fases[pc.ate];
        if (!fi || !ff || !pc.pronta) { pc.suporte.visible = false; pc.presenca = 0; return; }
        var entrada = suave((c - (fi.top - H * 0.55)) / (H * 0.85));
        var saida = suave(((ff.bottom + H * 0.45) - c) / (H * 0.85));
        pc.presenca = Math.min(entrada, saida);
        pc.suporte.visible = pc.presenca > 0.001;
        if (!pc.suporte.visible) return;
        algum = true;
        // sobe de baixo ao chegar e vai embora por cima ao passar, como se estivesse atrás da página
        var y = -(1 - entrada) * meiaAltura * 2.1 + (1 - saida) * meiaAltura * 2.1;
        var alvoX = estreita ? lado * meiaLargura * 0.28 : lado * meiaLargura * 0.5;
        pc.x += (alvoX - pc.x) * (1 - Math.exp(-dt * 1.6));
        pc.suporte.position.set(pc.x, y, 0);
        var esc = (estreita ? 0.62 : 1) * (0.86 + 0.14 * pc.presenca);
        pc.suporte.scale.setScalar(esc);
        pc.suporte.rotation.set(my * 0.25, mx * 0.5 + (1 - entrada) * 1.4 - (1 - saida) * 1.0, 0);
        pc.halo.material.opacity = pc.presenca * 0.32;
        pc.peca.atualizar(dt, tempo, pc.giro);
      });

      if (algum) { render.render(cena, camera); limpo = false; }
      else if (!limpo) { render.clear(); limpo = true; }
    }
    requestAnimationFrame(laco);

    return {
      qualidade: function(n){
        nivel = n;
        if (n === 'baixo') { render.clear(); limpo = true; cv.style.display = 'none'; }
        else { cv.style.display = ''; medir(); }
      },
      /* o jogo avisa o que aconteceu; a peça que estiver na tela reage */
      evento: function(nome){
        PECAS.forEach(function(pc){ if (pc.pronta && pc.presenca > 0.05) pc.peca.evento(nome); });
      },
      /* cor e força da peça mais presente, para o fundo mudar junto */
      tom: function(){
        var melhor = null;
        PECAS.forEach(function(pc){ if (pc.pronta && (!melhor || pc.presenca > melhor.presenca)) melhor = pc; });
        return melhor && melhor.presenca > 0.01 ? { cor: melhor.peca.cor, forca: melhor.presenca } : null;
      }
    };
  }

  return {
    /* o jogo avisa o que aconteceu; a peça que estiver na tela reage */
    evento: function(nome){ if (impl) impl.evento(nome); },
    /* cor e força da peça mais presente, para o fundo mudar junto */
    tom: function(){ return impl ? impl.tom() : null; }
  };
})();
