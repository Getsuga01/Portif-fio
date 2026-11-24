/* ==========================================================
   GTA 6 · Motor de Interações & Animações Vice City
   - Tilt 3D + spotlight especular nos cartões (.cartao)
   - Botões magnéticos (.botao-pixel, .botao-linha)
   - Nível de Procurado (★★★★★) reativo ao scroll e cliques
   - Radar / Minimapa de Leonida com salto rápido entre missões
   - Toast "MISSÃO CUMPRIDA +RESPECT" ao concluir ou baixar CV
   - Text Scramble cinético nos títulos das fases
   - Retícula neon personalizada no desktop (.q-alto)
   ========================================================== */
(function(){
  'use strict';
  var semMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var Q = PV.qualidade;
  function nivel(){ return Q ? Q.nivel : 'alto'; }
  function emJogo(){ return document.body.classList.contains('modo-jogo'); }

  /* ---------- 1. Tilt 3D & Spotlight nos cartões ---------- */
  var cartoes = document.querySelectorAll('.cartao');
  cartoes.forEach(function(card){
    card.addEventListener('pointermove', function(e){
      if (semMovimento || nivel() === 'baixo' || emJogo() || e.pointerType !== 'mouse') return;
      var r = card.getBoundingClientRect();
      var x = e.clientX - r.left;
      var y = e.clientY - r.top;
      var px = (x / r.width) * 100;
      var py = (y / r.height) * 100;
      card.style.setProperty('--mx', px.toFixed(1) + '%');
      card.style.setProperty('--my', py.toFixed(1) + '%');
      if (nivel() === 'alto') {
        var rx = ((y / r.height) - 0.5) * -9;
        var ry = ((x / r.width) - 0.5) * 9;
        card.style.setProperty('--rx', rx.toFixed(2) + 'deg');
        card.style.setProperty('--ry', ry.toFixed(2) + 'deg');
        card.classList.add('tilt-ativo');
      }
    });
    card.addEventListener('pointerleave', function(){
      card.classList.remove('tilt-ativo');
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
  });

  /* ---------- 2. Botões Magnéticos ---------- */
  if (!semMovimento) {
    document.querySelectorAll('.heroi-acoes .botao-pixel, .heroi-acoes .botao-linha').forEach(function(btn){
      btn.addEventListener('pointermove', function(e){
        if (nivel() !== 'alto' || e.pointerType !== 'mouse') return;
        var r = btn.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) * 0.22;
        var dy = (e.clientY - (r.top + r.height / 2)) * 0.28;
        btn.style.transform = 'translate(' + dx.toFixed(1) + 'px, ' + dy.toFixed(1) + 'px)';
      });
      btn.addEventListener('pointerleave', function(){
        btn.style.transform = '';
      });
    });
  }

  /* ---------- 3. Nível de Procurado (★★★★★) ---------- */
  var wantedEl = document.getElementById('gtaWanted');
  var estrelas = wantedEl ? Array.prototype.slice.call(wantedEl.querySelectorAll('.gta-star')) : [];
  var nivelManual = 0;

  function atualizarEstrelas(qtd){
    var alvo = Math.max(qtd, nivelManual);
    estrelas.forEach(function(st, i){
      st.classList.toggle('ativa', i < alvo);
    });
    if (wantedEl) {
      wantedEl.classList.toggle('piscando', alvo >= 4);
      wantedEl.setAttribute('aria-label', 'Nível de procurado: ' + alvo + ' de 5 estrelas');
    }
  }

  if (wantedEl) {
    wantedEl.addEventListener('click', function(){
      nivelManual = (nivelManual % 5) + 1;
      atualizarEstrelas(nivelManual);
      if (nivelManual === 5) mostrarToast('NÍVEL MÁXIMO ★★★★★', 'VICE CITY EM ALERTA');
    });
  }

  /* ---------- 4. Radar de Leonida & Progresso de Missão ---------- */
  var radar = document.getElementById('gtaRadar');
  var radarZona = document.getElementById('gtaRadarZona');
  var radarCoords = document.getElementById('gtaRadarCoords');
  var radarBlip = document.getElementById('gtaRadarBlip');
  var fases = Array.prototype.slice.call(document.querySelectorAll('section.fase'));
  var faseAtualIdx = 0;

  function aoRolarGTA(){
    var vh = window.innerHeight;
    var y = window.scrollY;
    var alt = Math.max(1, document.documentElement.scrollHeight - vh);
    var prof = Math.min(1, Math.max(0, y / alt));

    for (var i = 0; i < fases.length; i++) {
      if (fases[i].getBoundingClientRect().top <= vh * 0.42) faseAtualIdx = i;
    }

    var faseAtiva = fases[faseAtualIdx];
    var nomeZona = faseAtiva ? (faseAtiva.getAttribute('data-nome') || 'Leonida') : 'Vice City';
    if (radarZona) radarZona.textContent = nomeZona.toUpperCase();
    if (radarCoords) {
      var lat = (25.76 + prof * 0.18).toFixed(2);
      var lon = (80.19 + prof * 0.14).toFixed(2);
      radarCoords.textContent = lat + '° N · ' + lon + '° W';
    }
    if (radarBlip) {
      var ang = prof * Math.PI * 2;
      var dist = 8 + prof * 8;
      radarBlip.style.left = (22 + Math.cos(ang) * dist).toFixed(1) + 'px';
      radarBlip.style.top = (22 + Math.sin(ang) * dist).toFixed(1) + 'px';
    }

    var estrelasScroll = Math.min(5, Math.max(1, Math.ceil((faseAtualIdx + 1) / 2.2)));
    atualizarEstrelas(estrelasScroll);

    if (prof > 0.92 && !missaoConcluidaMostrada) {
      missaoConcluidaMostrada = true;
      mostrarToast('MISSÃO CUMPRIDA', '+RESPECT · VAMOS CONVERSAR');
    }
  }

  if (radar) {
    radar.addEventListener('click', function(){
      var prox = (faseAtualIdx + 1) % fases.length;
      fases[prox].scrollIntoView({ behavior: semMovimento ? 'auto' : 'smooth' });
    });
  }

  var agendado = false;
  window.addEventListener('scroll', function(){
    if (!agendado) { agendado = true; requestAnimationFrame(function(){ agendado = false; aoRolarGTA(); }); }
  }, { passive: true });
  aoRolarGTA();

  /* ---------- 5. Toast "MISSÃO CUMPRIDA" ---------- */
  var toast = document.getElementById('gtaToast');
  var toastTitulo = document.getElementById('gtaToastTitulo');
  var toastSub = document.getElementById('gtaToastSub');
  var toastTimer = null;
  var missaoConcluidaMostrada = false;

  function mostrarToast(titulo, sub){
    if (!toast) return;
    if (toastTitulo) toastTitulo.textContent = titulo;
    if (toastSub) toastSub.textContent = sub;
    toast.classList.add('visivel');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ toast.classList.remove('visivel'); }, 3600);
  }

  var btnCv = document.querySelector('a[download]');
  if (btnCv) {
    btnCv.addEventListener('click', function(){
      mostrarToast('ARQUIVO OBTIDO', 'CURRÍCULO BAIXADO · +RESPECT');
    });
  }

  /* ---------- 6. Text Scramble nos títulos H2 ---------- */
  var CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789★$#';
  function scramble(el){
    if (el.dataset.scrambled) return;
    el.dataset.scrambled = '1';
    var original = el.textContent;
    var iter = 0;
    var id = setInterval(function(){
      el.textContent = original.split('').map(function(ch, idx){
        if (ch === ' ' || idx < iter) return original[idx];
        return CHARS[Math.floor(Math.random() * CHARS.length)];
      }).join('');
      iter += 0.65;
      if (iter >= original.length) {
        el.textContent = original;
        clearInterval(id);
      }
    }, 26);
  }

  if (!semMovimento && 'IntersectionObserver' in window) {
    var obsTitulo = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if (!e.isIntersecting || nivel() === 'baixo') return;
        if (!e.target.hasAttribute('data-letras')) scramble(e.target);
        obsTitulo.unobserve(e.target);
      });
    }, { threshold: 0.35 });
    document.querySelectorAll('.fase h2').forEach(function(h){ obsTitulo.observe(h); });
  }

  /* ---------- 7. Retícula Neon Personalizada (.q-alto) ---------- */
  var cursor = document.getElementById('gtaCursor');
  if (cursor && !semMovimento && window.matchMedia('(pointer: fine)').matches) {
    var cx = -100, cy = -100, tx = -100, ty = -100, cursorAtivo = false;
    window.addEventListener('pointermove', function(e){
      if (e.pointerType !== 'mouse' || nivel() !== 'alto' || emJogo()) {
        cursor.classList.remove('ativo');
        return;
      }
      tx = e.clientX; ty = e.clientY;
      if (!cursorAtivo) { cx = tx; cy = ty; cursorAtivo = true; }
      cursor.classList.add('ativo');
      var alvo = e.target && e.target.closest('a, button, .cartao, .gta-wanted, .gta-radar');
      cursor.classList.toggle('foco', Boolean(alvo));
    }, { passive: true });
    document.addEventListener('mouseleave', function(){ cursor.classList.remove('ativo'); });

    (function animCursor(){
      requestAnimationFrame(animCursor);
      if (!cursorAtivo || document.hidden || nivel() !== 'alto') return;
      cx += (tx - cx) * 0.24;
      cy += (ty - cy) * 0.24;
      cursor.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
    })();
  }

  /* ---------- 8. Anime.js · Animações GTA VI ---------- */
  (function(){
    var semMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (semMovimento || typeof anime === 'undefined') return;

    /* 8.1 Loading screen estilo GTA VI */
    var loading = document.createElement('div');
    loading.className = 'gta-loading';
    loading.innerHTML =
      '<div class="gta-loading-logo">RA<span>·</span>DEV</div>' +
      '<div class="gta-loading-barra"></div>' +
      '<div class="gta-loading-texto">CARREGANDO LEONIDA...</div>';
    document.body.insertBefore(loading, document.body.firstChild);

    var tlLoad = anime.timeline({
      easing: 'easeOutExpo',
      duration: 1200,
      complete: function(){
        loading.style.opacity = '0';
        setTimeout(function(){ loading.remove(); }, 600);
      }
    });
    tlLoad.add({
      targets: '.gta-loading-logo',
      opacity: [0, 1],
      scale: [0.8, 1],
      duration: 800
    })
    .add({
      targets: '.gta-loading-barra',
      width: [0, '100%'],
      duration: 1600
    }, '-=600')
    .add({
      targets: '.gta-loading-texto',
      opacity: [0, 1],
      duration: 600
    }, '-=800');

    /* 8.2 Wanted level · pulso estrelas com anime */
    var estrelas = document.querySelectorAll('.gta-star');
    if (estrelas.length) {
      anime({
        targets: estrelas,
        scale: [1, 1.25, 1],
        opacity: [0.18, 1, 0.18],
        duration: 2000,
        delay: anime.stagger(150),
        loop: true,
        direction: 'alternate',
        easing: 'easeInOutSine'
      });
    }

    /* 8.3 Radar · blip pulso e varredura suave */
    var radarBlip = document.getElementById('gtaRadarBlip');
    var radarVarredura = document.getElementById('gtaRadarVarredura');
    if (radarBlip) {
      anime({
        targets: radarBlip,
        scale: [0.8, 1.4, 0.8],
        opacity: [0.7, 1, 0.7],
        duration: 1400,
        loop: true,
        easing: 'easeInOutQuad'
      });
    }

    /* 8.4 Reveal de fases ao scroll */
    var fases = document.querySelectorAll('section.fase');
    var obsReveal = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if (!entry.isIntersecting) return;
        var el = entry.target;
        el.classList.add('rev', 'dentro');
        obsReveal.unobserve(el);
      });
    }, { threshold: 0.12 });
    fases.forEach(function(f){ obsReveal.observe(f); });

    /* 8.5 Stagger para cartões .cartao */
    var cartoes = document.querySelectorAll('.cartao');
    anime({
      targets: cartoes,
      opacity: [0, 1],
      translateY: [30, 0],
      filter: ['blur(12px)', 'blur(0)'],
      duration: 700,
      delay: anime.stagger(100, { start: 200 }),
      easing: 'easeOutQuad'
    });

    /* 8.6 Stagger para frentes e itens de lista */
    var frentes = document.querySelectorAll('.frente, .premio, .competicao, .degrau, .fato');
    if (frentes.length) {
      anime({
        targets: frentes,
        opacity: [0, 1],
        translateY: [20, 0],
        duration: 600,
        delay: anime.stagger(80),
        easing: 'easeOutQuad'
      });
    }
  })();

})();
