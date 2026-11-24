/* ==========================================================
   CENA 3D · peças grandes que aparecem conforme a página desce
   Modelos montados só com geometria do three.js e texturas
   pintadas em canvas (nenhum arquivo de modelo nem de imagem):
     - a megacidade wireframe neon (Início e Perfil)
     - a placa de circuito / Arduino (Stack, Trajetória e TechFix)
     - a placa de vídeo cyberpunk GPU (Chaos Eng, ERP Campo e Finnace Tech)
     - o troféu de ouro de engenharia (Serviços e Métricas)
     - o robozinho cyberpunk amigável dizendo "Olá!" (Contato)
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
       PEÇA 2 · PLACA DE VÍDEO CYBERPUNK (GPU RTX HIGH-END)
       PCB preto com contatos PCIe dourados, dissipador com aletas
       de alumínio, heatpipes de cobre, carcaça angular cyberpunk,
       backplate com iluminação, 3 ventoinhas giratórias com anéis
       ARGB neon, barra lateral "GEFORCE RTX" e cabos de energia.
       ========================================================== */
    function criarPlacaVideo(){
      var rnd = semente(1337);
      var gpu = new T.Group();

      var LARG = 28, ALT = 12.5, PROF = 5.0; // dimensões da GPU em cm

      // Textura do PCB com trilhas de circuito
      var texPcb = tex(tela(512, 256, function(g, w, h){
        g.fillStyle = '#0a0b0e'; g.fillRect(0, 0, w, h);
        salpicar(g, w, h, 2800, ['rgba(255,255,255,.02)', 'rgba(0,0,0,.4)'], 2, rnd);
        g.lineWidth = 1.4;
        for (var i = 0; i < 35; i++) {
          g.strokeStyle = i % 3 === 0 ? 'rgba(66,232,255,.45)' : 'rgba(216,180,90,.35)';
          var x = rnd() * w, y = rnd() * h;
          g.beginPath(); g.moveTo(x, y);
          g.lineTo(x + 20, y + 20); g.lineTo(x + 55, y + 20);
          g.stroke();
        }
      }), true);

      // Backplate metálico com gravação a laser estilizada
      var texBackplate = tex(tela(512, 256, function(g, w, h){
        var gr = g.createLinearGradient(0, 0, w, h);
        gr.addColorStop(0, '#1c1e24'); gr.addColorStop(1, '#0e1014');
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
        g.strokeStyle = 'rgba(66,232,255,.55)'; g.lineWidth = 2.5;
        g.beginPath();
        g.moveTo(20, 20); g.lineTo(w - 110, 20); g.lineTo(w - 50, 75); g.lineTo(w - 20, h - 20);
        g.stroke();
        // recortes de exaustão flow-through estilo RTX 40
        g.fillStyle = '#07080a';
        for (var k = 0; k < 6; k++) {
          g.fillRect(w - 130 + k * 16, 45, 9, h - 90);
        }
        g.fillStyle = 'rgba(66,232,255,.95)';
        g.font = 'bold 22px Arial, sans-serif';
        g.fillText('RTX CYBER // TITAN', 38, h / 2 - 8);
        g.font = 'bold 13px Arial, sans-serif';
        g.fillStyle = 'rgba(236,72,153,.85)';
        g.fillText('FULLSTACK ENGINE · 24GB GDDR6X', 38, h / 2 + 18);
      }), true);

      // Textura das aletas do dissipador
      var texAletas = tex(tela(256, 256, function(g, w, h){
        g.fillStyle = '#4a505b'; g.fillRect(0, 0, w, h);
        for (var y = 0; y < h; y += 4) {
          g.fillStyle = '#828a99'; g.fillRect(0, y, w, 2);
          g.fillStyle = '#22252c'; g.fillRect(0, y + 2, w, 2);
        }
      }), false, true);
      texAletas.repeat.set(1, 8);

      var metalCobre = new T.MeshStandardMaterial({ color: 0xd97736, metalness: 0.95, roughness: 0.25 });
      var metalPrata = new T.MeshStandardMaterial({ color: 0x9fa8b6, metalness: 0.9, roughness: 0.28 });
      var metalPreto = fisico({ color: 0x16181d, metalness: 0.85, roughness: 0.35, clearcoat: 0.4, clearcoatRoughness: 0.2 });
      var ouro = new T.MeshStandardMaterial({ color: 0xe5b84c, metalness: 1, roughness: 0.2 });
      var plasticoCinza = new T.MeshStandardMaterial({ color: 0x242730, roughness: 0.5 });
      var ledCianoMat = new T.MeshStandardMaterial({ color: 0x42e8ff, emissive: 0x42e8ff, emissiveIntensity: 1.6, transparent: true, opacity: 0.95 });
      var ledMagentaMat = new T.MeshStandardMaterial({ color: 0xec4899, emissive: 0xec4899, emissiveIntensity: 1.4, transparent: true, opacity: 0.95 });

      // 1. PCB principal
      var pcb = new T.Mesh(caixaRed(LARG, ALT, 0.4, 0.15), new T.MeshStandardMaterial({ map: texPcb, roughness: 0.65 }));
      pcb.position.set(0, 0, -PROF / 2 + 0.2);
      gpu.add(pcb);

      // 2. Backplate traseiro
      var backplate = new T.Mesh(caixaRed(LARG - 0.4, ALT - 0.4, 0.3, 0.2), new T.MeshStandardMaterial({ map: texBackplate, metalness: 0.85, roughness: 0.3 }));
      backplate.position.set(0, 0, -PROF / 2 - 0.15);
      gpu.add(backplate);

      // 3. Conector PCIe dourado
      var pcie = new T.Group();
      var dente1 = new T.Mesh(new T.BoxGeometry(4.2, 1.3, 0.35), ouro);
      dente1.position.set(-LARG / 2 + 4.2, -ALT / 2 - 0.65, -PROF / 2 + 0.2);
      var dente2 = new T.Mesh(new T.BoxGeometry(15.5, 1.3, 0.35), ouro);
      dente2.position.set(-LARG / 2 + 14.8, -ALT / 2 - 0.65, -PROF / 2 + 0.2);
      pcie.add(dente1); pcie.add(dente2);
      gpu.add(pcie);

      // 4. Espelho Traseiro I/O Bracket
      var bracket = new T.Mesh(caixaRed(0.3, ALT + 4.0, PROF + 0.6, 0.1), metalPrata);
      bracket.position.set(-LARG / 2 - 0.15, -0.6, 0);
      gpu.add(bracket);
      for (var p = 0; p < 4; p++) {
        var porta = new T.Mesh(new T.BoxGeometry(0.35, 0.9, 1.5), metalPreto);
        porta.position.set(-LARG / 2 - 0.2, -ALT / 2 + 2.2 + p * 2.3, (p % 2 === 0 ? 0.8 : -0.8));
        gpu.add(porta);
      }

      // 5. Bloco de Dissipação (Heatsink)
      var dissipadorMat = new T.MeshStandardMaterial({ map: texAletas, roughness: 0.35, metalness: 0.8 });
      var dissipador = new T.Mesh(caixaRed(LARG - 2.5, ALT - 1.8, PROF - 1.8, 0.2), dissipadorMat);
      dissipador.position.set(0.5, 0, 0);
      gpu.add(dissipador);

      // Heatpipes de cobre
      var heatpipes = [];
      [-ALT / 2 + 2.8, 0, ALT / 2 - 2.8].forEach(function(hy){
        var curvaHp = new T.CatmullRomCurve3([
          new T.Vector3(-LARG / 2 + 1.5, hy, 0.3),
          new T.Vector3(-LARG / 2 + 3.5, hy + 0.5, 1.3),
          new T.Vector3(LARG / 2 - 3.8, hy + 0.5, 1.3),
          new T.Vector3(LARG / 2 - 1.0, hy, 0.3)
        ]);
        var tuboHp = new T.Mesh(new T.TubeGeometry(curvaHp, 32, 0.36, 12, false), metalCobre);
        gpu.add(tuboHp);
        heatpipes.push(tuboHp);
      });

      // 6. Carcaça Frontal (Shroud)
      var shroudMat = fisico({ color: 0x181a20, metalness: 0.6, roughness: 0.35, clearcoat: 0.4, clearcoatRoughness: 0.2 });
      var shroud = new T.Mesh(caixaRed(LARG - 0.6, ALT - 0.6, 1.2, 0.5), shroudMat);
      shroud.position.set(0, 0, PROF / 2 - 0.4);
      gpu.add(shroud);

      // Detalhes chanfrados na carcaça em neon
      [[-LARG / 2 + 2.5, ALT / 2 - 1.2], [LARG / 2 - 2.5, ALT / 2 - 1.2], [-LARG / 2 + 2.5, -ALT / 2 + 1.2], [LARG / 2 - 2.5, -ALT / 2 + 1.2]].forEach(function(pos, i){
        var friso = new T.Mesh(new T.BoxGeometry(3.6, 0.4, 0.3), (i % 2 === 0 ? ledCianoMat : ledMagentaMat));
        friso.position.set(pos[0], pos[1], PROF / 2 + 0.25);
        gpu.add(friso);
      });

      // 7. Sistema de 3 Ventoinhas (Triple Fan Cooling System)
      var fans = [];
      var posFansX = [-8.2, 0, 8.2];
      var raioFan = 3.7;

      posFansX.forEach(function(fx, fanIdx){
        var fanGrupo = new T.Group();
        fanGrupo.position.set(fx, 0, PROF / 2 + 0.05);

        // Anel ARGB ao redor da abertura
        var anelRgb = new T.Mesh(new T.TorusGeometry(raioFan + 0.22, 0.15, 10, 36), (fanIdx === 1 ? ledMagentaMat : ledCianoMat));
        anelRgb.position.set(fx, 0, PROF / 2 + 0.15);
        gpu.add(anelRgb);

        // Hub central
        var hub = new T.Mesh(new T.CylinderGeometry(1.2, 1.3, 0.75, 24), metalPreto);
        hub.rotation.x = Math.PI / 2;
        fanGrupo.add(hub);

        var badge = new T.Mesh(new T.CircleGeometry(0.95, 20), (fanIdx === 1 ? ledMagentaMat : ouro));
        badge.position.z = 0.4;
        fanGrupo.add(badge);

        // Pás da ventoinha (11 lâminas aerodinâmicas)
        var numPas = 11;
        var pasMat = new T.MeshStandardMaterial({
          color: 0x1e222b, roughness: 0.3, metalness: 0.4,
          transparent: true, opacity: 0.92
        });

        for (var p = 0; p < numPas; p++) {
          var ang = (p / numPas) * Math.PI * 2;
          var pa = new T.Mesh(new T.BoxGeometry(0.7, 2.3, 0.12), pasMat);
          pa.position.set(Math.cos(ang) * 2.1, Math.sin(ang) * 2.1, 0.15);
          pa.rotation.z = ang + 0.45;
          pa.rotation.y = 0.4;
          fanGrupo.add(pa);
        }

        gpu.add(fanGrupo);
        fans.push({ grupo: fanGrupo, direcao: fanIdx === 1 ? -1 : 1, anel: anelRgb });
      });

      // 8. Barra de LED no Topo com Logotipo
      var topoBarra = new T.Group();
      topoBarra.position.set(0, ALT / 2 + 0.2, 0);

      var topoMoldura = new T.Mesh(caixaRed(LARG - 4, 0.95, PROF - 0.8, 0.2), metalPreto);
      topoBarra.add(topoMoldura);

      var texLogoTopo = tex(tela(512, 64, function(g, w, h){
        g.fillStyle = '#06080c'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#42e8ff'; g.font = 'bold 24px Arial, sans-serif';
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText('RONALDO.DEV · GEFORCE RTX', w / 2, h / 2);
      }), true);

      var logoPlaca = new T.Mesh(new T.PlaneGeometry(LARG - 7, 0.75), new T.MeshStandardMaterial({
        map: texLogoTopo, emissive: 0x42e8ff, emissiveIntensity: 1.0, transparent: true
      }));
      logoPlaca.rotation.x = -Math.PI / 2;
      logoPlaca.position.set(0, 0.5, 0);
      topoBarra.add(logoPlaca);

      // Conector de energia 12VHPWR no topo
      var plugEnergia = new T.Mesh(caixaRed(2.4, 1.1, 1.3, 0.1), plasticoCinza);
      plugEnergia.position.set(LARG / 2 - 4.5, 0.75, 0);
      topoBarra.add(plugEnergia);

      [-0.5, -0.15, 0.15, 0.5].forEach(function(cx, k){
        var corCabo = k % 2 === 0 ? 0x42e8ff : 0xec4899;
        var curvaC = new T.CatmullRomCurve3([
          new T.Vector3(LARG / 2 - 4.5 + cx, 1.1, 0),
          new T.Vector3(LARG / 2 - 4.5 + cx * 1.4, 2.8, 0.6),
          new T.Vector3(LARG / 2 - 3.5 + cx * 1.8, 5.0, 1.6)
        ]);
        var tuboC = new T.Mesh(new T.TubeGeometry(curvaC, 20, 0.15, 8, false), new T.MeshStandardMaterial({ color: corCabo, roughness: 0.5 }));
        topoBarra.add(tuboC);
      });

      gpu.add(topoBarra);

      // Sprite de glow halo ARGB frontal
      var glowCentral = sprite(brilho('rgba(66,232,255,1)'), 15, 0x42e8ff);
      glowCentral.position.set(0, 0, PROF / 2 + 1.0);
      glowCentral.material.opacity = 0.35;
      gpu.add(glowCentral);

      // Estados de animação interativa
      var velBase = 7.0; // rotação padrão das ventoinhas (rad/s)
      var velBoost = 0;
      var flashLuz = 0;
      var tremor = 0;
      var festa = 0;

      return {
        grupo: gpu, escala: 0.85, cor: [66, 232, 255],
        atualizar: function(dt, t, giro){
          velBoost = Math.max(0, velBoost - dt * 4.0);
          flashLuz = Math.max(0, flashLuz - dt * 2.0);
          tremor = Math.max(0, tremor - dt * 3.0);
          festa = Math.max(0, festa - dt * 0.7);

          // Rotação suave da placa no espaço 3D para exibir frente, topo e lateral
          giro.rotation.set(
            0.18 + Math.sin(t * 0.45) * 0.08,
            -0.35 + Math.sin(t * 0.35) * 0.38,
            Math.sin(t * 0.5) * 0.06
          );

          if (tremor > 0) {
            giro.position.x = (Math.random() - 0.5) * tremor * 0.5;
            giro.position.y = (Math.random() - 0.5) * tremor * 0.3;
          } else {
            giro.position.x = 0;
            giro.position.y = 0;
          }

          // Rotação contínua dos 3 fans (aceleram no boost)
          var velRot = (velBase + velBoost * 22.0 + festa * 30.0) * dt;
          for (var f = 0; f < fans.length; f++) {
            fans[f].grupo.rotation.z += velRot * fans[f].direcao;
            // Ondulação de iluminação nos anéis ARGB
            var ondaRgb = 0.7 + 0.3 * Math.sin(t * 3.5 + f * 1.5);
            fans[f].anel.material.emissiveIntensity = (ondaRgb + flashLuz * 2.0 + festa * 2.5);
          }

          // Iluminação do logotipo superior
          var intensidadeLogo = 1.0 + 0.5 * Math.sin(t * 2.5) + flashLuz * 2.0 + festa * 2.0;
          logoPlaca.material.emissiveIntensity = intensidadeLogo;
          glowCentral.material.opacity = Math.min(1.0, 0.25 + 0.2 * Math.sin(t * 2.5) + flashLuz * 0.5 + festa * 0.5);
        },
        evento: function(nome){
          if (nome === 'soco') {
            velBoost = 1.6; flashLuz = 1.2;
          } else if (nome === 'pulo') {
            velBoost = Math.max(velBoost, 0.9); flashLuz = 0.7;
          } else if (nome === 'coleta') {
            velBoost = 1.2; flashLuz = 1.0;
          } else if (nome === 'dano') {
            tremor = 1.8;
          } else if (nome === 'trofeu') {
            velBoost = 2.0; flashLuz = 1.5; festa = 1.2;
          }
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
       CIDADE WIREFRAME · megacidade neon que recebe o visitante
       nas fases de abertura, com grade synthwave e dados subindo
       ========================================================== */
    function criarCidade(){
      var rnd = semente(20261117);
      var cidade = new T.Group();

      // chão em grade, como um simulador de synthwave
      var grade = new T.GridHelper(58, 26, 0xb026ff, 0x7928ca);
      grade.material.transparent = true;
      grade.material.opacity = 0.3;
      grade.position.y = -0.02;
      cidade.add(grade);

      // torres: caixas escuras com arestas neon alternando ciano e roxo
      var innerGrupo = new T.Group();
      cidade.add(innerGrupo);
      var sobras = [];
      for (var i = 0; i < 15; i++) {
        var lado = (i % 2 === 0 ? 1 : -1) * (2.2 + rnd() * 9.5);
        var z = (rnd() - 0.5) * 22;
        var w = 1.6 + rnd() * 2.6, h = 4 + rnd() * 11, d = 1.6 + rnd() * 2.6;
        var b = new T.Mesh(
          new T.BoxGeometry(w, h, d),
          new T.MeshBasicMaterial({ color: 0x0a0614 })
        );
        b.position.set(lado, h / 2, z);
        innerGrupo.add(b);
        var arestas = new T.LineSegments(
          new T.EdgesGeometry(b.geometry),
          new T.LineBasicMaterial({ color: (i % 3 === 0) ? 0x42e8ff : 0xb026ff, transparent: true, opacity: 0.55 + rnd() * 0.3 })
        );
        arestas.position.copy(b.position);
        innerGrupo.add(arestas);
        sobras.push({ arestas: arestas, fase: rnd() * 6.28, base: arestas.material.opacity });
        // antena com luz magenta piscando no topo de algumas torres
        if (rnd() > 0.55) {
          var luz = sprite(brilho('rgba(236,72,153,1)'), 2.6, 0xec4899);
          luz.position.set(lado, h + 1.2, z);
          innerGrupo.add(luz);
          sobras.push({ luz: luz, fase: rnd() * 6.28 });
        }
      }

      // sol synthwave de fundo, magenta, meio afundado na grade
      var sol = sprite(brilho('rgba(236,72,153,1)'), 26, 0xec4899);
      sol.material.opacity = 0.5;
      sol.position.set(0, 6, -26);
      cidade.add(sol);

      // fagulhas de informação subindo da grade
      var qtd = 90, cores = new Float32Array(qtd * 3), pos = new Float32Array(qtd * 3), fases = [];
      for (var k = 0; k < qtd; k++) {
        pos[k * 3] = (rnd() - 0.5) * 46;
        pos[k * 3 + 1] = rnd() * 16;
        pos[k * 3 + 2] = (rnd() - 0.5) * 30;
        fases.push(rnd() * 10);
        cores[k * 3] = 0.26; cores[k * 3 + 1] = 0.91; cores[k * 3 + 2] = 1;
      }
      var geoDados = new T.BufferGeometry();
      geoDados.setAttribute('position', new T.BufferAttribute(pos, 3));
      geoDados.setAttribute('color', new T.BufferAttribute(cores, 3));
      var dados = new T.Points(geoDados, new T.PointsMaterial({
        size: 0.55, map: tex(brilho('rgba(120,240,255,1)'), true), vertexColors: true,
        transparent: true, blending: T.AdditiveBlending, depthWrite: false
      }));
      cidade.add(dados);

      var flash = 0;
      return {
        grupo: cidade, escala: 1.5, cor: [176, 38, 255],
        atualizar: function(dt, t, giro){
          flash = Math.max(0, flash - dt * 0.9);
          innerGrupo.rotation.y += 0.1 * dt;
          giro.rotation.x = 0.06 + Math.sin(t * 0.4) * 0.03;
          for (var i2 = 0; i2 < sobras.length; i2++) {
            var s = sobras[i2];
            if (s.arestas) s.arestas.material.opacity = s.base * (0.72 + 0.28 * Math.sin(t * 1.8 + s.fase)) + flash * 0.4;
            else if (s.luz) s.luz.material.opacity = 0.35 + 0.65 * Math.pow(Math.max(0, Math.sin(t * 2.4 + s.fase)), 8);
          }
          sol.material.opacity = 0.42 + 0.1 * Math.sin(t * 0.7) + flash * 0.5;
          var vv = 3.2 + flash * 9;
          for (var k2 = 0; k2 < qtd; k2++) {
            pos[k2 * 3 + 1] += dt * vv;
            if (pos[k2 * 3 + 1] > 17) pos[k2 * 3 + 1] = 0;
            var br2 = 0.4 + 0.6 * Math.pow(Math.max(0, Math.sin(t * 2 + fases[k2])), 5);
            cores[k2 * 3] = br2 * 0.35; cores[k2 * 3 + 1] = br2 * 0.9; cores[k2 * 3 + 2] = br2;
          }
          geoDados.attributes.position.needsUpdate = true;
          geoDados.attributes.color.needsUpdate = true;
        },
        evento: function(nome){
          if (nome === 'pouso') flash = 0.8;
          else if (nome === 'coleta' || nome === 'soco') flash = Math.max(flash, 0.5);
        }
      };
    }

    /* ==========================================================
       PEÇA 5 · ROBOZINHO CYBERPUNK "OLÁ!" (unidade = centímetro)
       Androide flutuante futurista com visor digital emotivo,
       antena com LED pulsante, braço robótico articulado acenando,
       propulsor antigravitacional e balão holográfico dizendo "Olá!".
       ========================================================== */
    function criarRobozinho(){
      var rnd = semente(9001);
      var robo = new T.Group();

      // Materiais limpos e luminosos
      var chassiBranco = fisico({ color: 0xf8fafc, roughness: 0.18, metalness: 0.12, clearcoat: 0.9, clearcoatRoughness: 0.08 });
      var metalTitânio = fisico({ color: 0x475569, roughness: 0.32, metalness: 0.82, clearcoat: 0.4 });
      var metalPrata = new T.MeshStandardMaterial({ color: 0xd8e0ec, metalness: 0.92, roughness: 0.2 });
      var cianoNeon = new T.MeshStandardMaterial({ color: 0x42e8ff, emissive: 0x42e8ff, emissiveIntensity: 1.8, transparent: true, opacity: 0.95 });
      var magentaNeon = new T.MeshStandardMaterial({ color: 0xec4899, emissive: 0xec4899, emissiveIntensity: 1.5, transparent: true, opacity: 0.95 });
      var lenteOlhoMat = new T.MeshStandardMaterial({ color: 0x42e8ff, emissive: 0x42e8ff, emissiveIntensity: 2.2, roughness: 0.1 });

      // 1. Cabeça do Robozinho (Esférica, aerodinâmica e limpa, sem placas ou telas coladas)
      var cabecaGrupo = new T.Group();
      cabecaGrupo.position.set(0, 3.8, 0);

      // Capacete esférico contínuo e liso
      var capacete = new T.Mesh(new T.SphereGeometry(3.5, 48, 36), chassiBranco);
      capacete.scale.set(1.03, 0.98, 1.02);
      cabecaGrupo.add(capacete);

      // Olhos robóticos 3D expressivos (embutidos organicamente na curvatura da face)
      var olhos = [];
      [-1.15, 1.15].forEach(function(ox, idx){
        var olhoGrupo = new T.Group();
        var rotY = ox > 0 ? 0.26 : -0.26;
        olhoGrupo.position.set(ox, 0.4, 3.16);
        olhoGrupo.rotation.set(-0.06, rotY, 0);

        // Aro circular de acabamento em titânio/cromo
        var aroOlho = new T.Mesh(new T.TorusGeometry(0.68, 0.07, 10, 32), metalPrata);
        olhoGrupo.add(aroOlho);

        // Lente em cúpula de LED ciano brilhante
        var lenteOlho = new T.Mesh(new T.SphereGeometry(0.62, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.55), lenteOlhoMat);
        lenteOlho.position.z = -0.1;
        olhoGrupo.add(lenteOlho);

        // Pupila/íris digital interna
        var pupila = new T.Mesh(new T.RingGeometry(0.2, 0.42, 24), new T.MeshBasicMaterial({ color: 0xffffff, side: T.DoubleSide }));
        pupila.position.z = 0.45;
        olhoGrupo.add(pupila);

        // Glow neon ao redor do olho
        var glowOlho = sprite(brilho('rgba(66,232,255,1)'), 2.6, 0x42e8ff);
        glowOlho.position.z = 0.5;
        olhoGrupo.add(glowOlho);

        cabecaGrupo.add(olhoGrupo);
        olhos.push({ grupo: olhoGrupo, lente: lenteOlho, pupila: pupila, glow: glowOlho });
      });

      // Bochechas amigáveis com blush suave magenta neon
      [-1.6, 1.6].forEach(function(bx){
        var blush = sprite(brilho('rgba(236,72,153,1)'), 1.8, 0xec4899);
        blush.position.set(bx, -0.25, 3.12);
        blush.material.opacity = 0.55;
        cabecaGrupo.add(blush);
      });

      // Sorriso digital sutil em arco neon ciano (embutido na face)
      var sorriso = new T.Mesh(new T.TorusGeometry(0.48, 0.045, 8, 24, Math.PI * 0.75), cianoNeon);
      sorriso.rotation.set(0.12, 0, Math.PI * 1.125);
      sorriso.position.set(0, -0.42, 3.32);
      cabecaGrupo.add(sorriso);

      // Antena no topo da cabeça
      var hasteAntena = new T.Mesh(new T.CylinderGeometry(0.08, 0.12, 1.8, 12), metalPrata);
      hasteAntena.position.set(0, 4.2, -0.2);
      cabecaGrupo.add(hasteAntena);

      var bolaAntena = new T.Mesh(new T.SphereGeometry(0.35, 16, 12), magentaNeon);
      bolaAntena.position.set(0, 5.1, -0.2);
      cabecaGrupo.add(bolaAntena);

      var haloAntena = sprite(brilho('rgba(236,72,153,1)'), 3.2, 0xec4899);
      haloAntena.position.set(0, 5.1, -0.2);
      cabecaGrupo.add(haloAntena);

      // Módulos laterais (fones futuristas com anéis neon)
      [-3.5, 3.5].forEach(function(sideX){
        var fone = new T.Mesh(new T.CylinderGeometry(0.85, 0.85, 0.5, 24), metalTitânio);
        fone.rotation.z = Math.PI / 2;
        fone.position.set(sideX, 0, 0);
        cabecaGrupo.add(fone);

        var anelFone = new T.Mesh(new T.TorusGeometry(0.86, 0.08, 8, 24), cianoNeon);
        anelFone.rotation.y = Math.PI / 2;
        anelFone.position.set(sideX + (sideX > 0 ? 0.28 : -0.28), 0, 0);
        cabecaGrupo.add(anelFone);
      });

      robo.add(cabecaGrupo);

      // 2. Tronco / Corpo do Robozinho
      var corpoGrupo = new T.Group();
      corpoGrupo.position.set(0, -0.2, 0);

      var pescoco = new T.Mesh(new T.CylinderGeometry(1.3, 1.5, 0.7, 20), metalTitânio);
      pescoco.position.set(0, 2.7, 0);
      corpoGrupo.add(pescoco);

      var torso = new T.Mesh(new T.SphereGeometry(2.9, 32, 24), chassiBranco);
      torso.scale.set(0.95, 1.15, 0.95);
      torso.position.set(0, 0.8, 0);
      corpoGrupo.add(torso);

      // Painel peitoral com núcleo de energia (Reator Ciano)
      var painelPeito = new T.Mesh(new T.CylinderGeometry(1.15, 1.15, 0.25, 24), metalPrata);
      painelPeito.rotation.x = Math.PI / 2;
      painelPeito.position.set(0, 1.2, 2.7);
      corpoGrupo.add(painelPeito);

      var reatorLuz = new T.Mesh(new T.CircleGeometry(0.85, 24), cianoNeon);
      reatorLuz.position.set(0, 1.2, 2.85);
      corpoGrupo.add(reatorLuz);

      var reatorGlow = sprite(brilho('rgba(66,232,255,1)'), 5.0, 0x42e8ff);
      reatorGlow.position.set(0, 1.2, 2.9);
      corpoGrupo.add(reatorGlow);

      // Faixa decorativa neon magenta na cintura
      var faixaTorso = new T.Mesh(new T.TorusGeometry(2.65, 0.08, 8, 36), magentaNeon);
      faixaTorso.rotation.x = Math.PI / 2;
      faixaTorso.position.set(0, 0.3, 0);
      corpoGrupo.add(faixaTorso);

      // 3. Braço Esquerdo (Descansando com atitude amigável)
      var bracoEsq = new T.Group();
      bracoEsq.position.set(-3.0, 1.4, 0);

      var ombroE = new T.Mesh(new T.SphereGeometry(0.6, 16, 12), metalTitânio);
      bracoEsq.add(ombroE);

      var membroE = new T.Mesh(caixaRed(0.75, 2.3, 0.75, 0.2), chassiBranco);
      membroE.position.set(-0.35, -1.1, 0.15);
      membroE.rotation.z = -0.22;
      bracoEsq.add(membroE);

      var maoE = new T.Mesh(new T.SphereGeometry(0.42, 14, 10), metalPrata);
      maoE.position.set(-0.65, -2.3, 0.35);
      bracoEsq.add(maoE);
      corpoGrupo.add(bracoEsq);

      // 4. Braço Direito Erguido Acenando (Wave Arm)
      var bracoDir = new T.Group();
      bracoDir.position.set(3.0, 1.4, 0);

      var ombroD = new T.Mesh(new T.SphereGeometry(0.6, 16, 12), metalTitânio);
      bracoDir.add(ombroD);

      var antebracoD = new T.Group();
      antebracoD.position.set(0.6, 0.5, 0);
      antebracoD.rotation.z = -0.92;

      var membroD = new T.Mesh(caixaRed(0.75, 2.2, 0.75, 0.2), chassiBranco);
      membroD.position.set(0, 1.0, 0);
      antebracoD.add(membroD);

      var maoD = new T.Group();
      maoD.position.set(0, 2.15, 0);

      var palmaD = new T.Mesh(new T.SphereGeometry(0.46, 16, 12), metalPrata);
      maoD.add(palmaD);

      [-0.24, 0, 0.24].forEach(function(dx){
        var dedo = new T.Mesh(new T.CylinderGeometry(0.08, 0.08, 0.55, 8), metalPrata);
        dedo.position.set(dx, 0.42, 0);
        maoD.add(dedo);
      });

      antebracoD.add(maoD);
      bracoDir.add(antebracoD);
      corpoGrupo.add(bracoDir);

      // 5. Propulsor Antigravitacional Inferior (Thruster)
      var propulsor = new T.Mesh(new T.ConeGeometry(1.5, 1.7, 24), metalTitânio);
      propulsor.position.set(0, -1.9, 0);
      corpoGrupo.add(propulsor);

      var anelFogo = new T.Mesh(new T.TorusGeometry(1.4, 0.11, 8, 28), cianoNeon);
      anelFogo.rotation.x = Math.PI / 2;
      anelFogo.position.set(0, -1.8, 0);
      corpoGrupo.add(anelFogo);

      var chamaThruster = sprite(brilho('rgba(66,232,255,1)'), 8.0, 0x42e8ff);
      chamaThruster.position.set(0, -3.2, 0);
      chamaThruster.material.opacity = 0.7;
      corpoGrupo.add(chamaThruster);

      robo.add(corpoGrupo);

      // 6. BALÃO HOLOGRÁFICO "OLÁ!" (Fundo translúcido neon sem manchas pretas)
      var balaoGrupo = new T.Group();
      balaoGrupo.position.set(5.2, 4.8, 1.2);

      var texBalao = tex(tela(512, 256, function(g, w, h){
        g.clearRect(0, 0, w, h);
        var r = 36;
        var bx = 20, by = 20, bw = w - 40, bh = h - 65;

        // Fundo gradiente translúcido cibernético luminoso (sem preto chapado)
        var gradFundo = g.createLinearGradient(bx, by, bx + bw, by + bh);
        gradFundo.addColorStop(0, 'rgba(15, 30, 68, 0.68)');
        gradFundo.addColorStop(0.5, 'rgba(32, 18, 58, 0.65)');
        gradFundo.addColorStop(1, 'rgba(48, 12, 60, 0.68)');
        g.fillStyle = gradFundo;

        g.beginPath();
        g.moveTo(bx + r, by);
        g.lineTo(bx + bw - r, by);
        g.quadraticCurveTo(bx + bw, by, bx + bw, by + r);
        g.lineTo(bx + bw, by + bh - r);
        g.quadraticCurveTo(bx + bw, by + bh, bx + bw - r, by + bh);
        g.lineTo(bx + 75, by + bh);
        g.lineTo(bx + 35, by + bh + 36);
        g.lineTo(bx + 50, by + bh);
        g.lineTo(bx + r, by + bh);
        g.quadraticCurveTo(bx, by + bh, bx, by + bh - r);
        g.lineTo(bx, by + r);
        g.quadraticCurveTo(bx, by, bx + r, by);
        g.closePath();
        g.fill();

        // Borda neon vibrante
        g.lineWidth = 5;
        var gradBorda = g.createLinearGradient(0, 0, w, h);
        gradBorda.addColorStop(0, '#42e8ff');
        gradBorda.addColorStop(0.5, '#b026ff');
        gradBorda.addColorStop(1, '#ec4899');
        g.strokeStyle = gradBorda;
        g.shadowColor = '#42e8ff';
        g.shadowBlur = 16;
        g.stroke();

        // Texto principal com brilho
        g.shadowBlur = 12;
        g.shadowColor = '#42e8ff';
        g.fillStyle = '#ffffff';
        g.font = '900 68px Arial, sans-serif';
        g.textAlign = 'center';
        g.fillText('Olá! 👋', w / 2, 94);

        // Subtítulo
        g.shadowBlur = 0;
        g.fillStyle = '#42e8ff';
        g.font = 'bold 28px Arial, sans-serif';
        g.fillText('VAMOS CONVERSAR?', w / 2, 148);
      }), true);

      var balaoMesh = new T.Mesh(new T.PlaneGeometry(7.2, 3.6), new T.MeshBasicMaterial({
        map: texBalao, transparent: true, side: T.DoubleSide, depthWrite: false
      }));
      balaoGrupo.add(balaoMesh);
      robo.add(balaoGrupo);

      // Estados de animação
      var velAceno = 6.0;
      var boostAceno = 0;
      var flashLuz = 0;
      var tremor = 0;
      var festa = 0;

      return {
        grupo: robo, escala: 1.25, cor: [66, 232, 255],
        atualizar: function(dt, t, giro){
          boostAceno = Math.max(0, boostAceno - dt * 2.0);
          flashLuz = Math.max(0, flashLuz - dt * 1.5);
          tremor = Math.max(0, tremor - dt * 3.0);
          festa = Math.max(0, festa - dt * 0.7);

          // Flutuação suave (hover)
          robo.position.y = Math.sin(t * 2.2) * 0.45;

          // Rotação suave da cabeça e do corpo
          giro.rotation.y = -0.22 + Math.sin(t * 0.6) * 0.22;
          giro.rotation.x = 0.08 + Math.sin(t * 0.5) * 0.04;
          cabecaGrupo.rotation.y = Math.sin(t * 1.5) * 0.15;
          cabecaGrupo.rotation.z = Math.sin(t * 2.0) * 0.04;

          // Aceno da mãozinha
          var acenoFreq = (velAceno + boostAceno * 10.0 + festa * 14.0);
          maoD.rotation.z = Math.sin(t * acenoFreq) * 0.55;

          // Flutuação do balão holográfico
          balaoGrupo.position.y = 4.8 + Math.sin(t * 2.8) * 0.22;
          balaoGrupo.rotation.z = Math.sin(t * 2.2) * 0.04;

          // Jato do propulsor pulsando
          chamaThruster.scale.set(
            1.0 + Math.sin(t * 14) * 0.15,
            1.0 + Math.cos(t * 14) * 0.25 + boostAceno * 0.4,
            1.0
          );
          chamaThruster.material.opacity = 0.65 + 0.25 * Math.sin(t * 12) + flashLuz * 0.3;

          // Luz da antena pulsando
          bolaAntena.material.emissiveIntensity = 1.2 + 0.8 * Math.sin(t * 4.0) + flashLuz * 2.0 + festa * 2.0;
          haloAntena.material.opacity = 0.4 + 0.3 * Math.sin(t * 4.0) + flashLuz * 0.5;

          // Brilho pulsante dos olhos em LED ciano
          lenteOlhoMat.emissiveIntensity = 2.0 + 0.5 * Math.sin(t * 3.0) + flashLuz * 1.8 + festa * 2.0;

          // Tremor em dano
          if (tremor > 0) {
            giro.position.x = (Math.random() - 0.5) * tremor * 0.5;
            giro.position.y = (Math.random() - 0.5) * tremor * 0.3;
          } else {
            giro.position.x = 0;
            giro.position.y = 0;
          }
        },
        evento: function(nome){
          if (nome === 'pulo') {
            boostAceno = 1.5; flashLuz = 1.0;
          } else if (nome === 'soco') {
            boostAceno = 2.0; flashLuz = 1.2;
          } else if (nome === 'coleta') {
            boostAceno = 1.2; flashLuz = 0.8;
          } else if (nome === 'dano') {
            tremor = 1.5;
          } else if (nome === 'trofeu') {
            boostAceno = 2.5; flashLuz = 1.5; festa = 1.2;
          }
        }
      };
    }

    /* ==========================================================
       PALCO: quando cada peça aparece, onde fica e como sai
       ========================================================== */
    var PECAS = [
      { criar: criarCidade, de: 0, ate: 1 },
      { criar: criarPlaca, de: 2, ate: 4 },
      { criar: criarPlacaVideo, de: 5, ate: 7 },
      { criar: criarTrofeu, de: 8, ate: 9 },
      { criar: criarRobozinho, de: 10, ate: 10 }
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
