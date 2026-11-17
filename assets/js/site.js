/* samydelagrange.com — script unique, sans dépendance, sans cookie.
   Les formulaires sont envoyés à HubSpot par l'API Forms (formulaires natifs du portail),
   comme sur chez-noemie.com : aucun script HubSpot n'est chargé sur le site. */
(function () {
  'use strict';

  var SD = window.SD || {};
  var HS = SD.hubspot || {};
  var loadedAt = Date.now();
  var root = document.documentElement;

  /* Le script de l'en-tête retire la classe « motion » si ce fichier ne se charge pas : on annule ce filet. */
  clearTimeout(window.__sdT);
  var motion = root.classList.contains('motion');
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* ——— Libellés partagés entre l'accueil, le bilan et HubSpot ——— */
  var GOALS = {
    impots: { label: 'Réduire mes impôts', hs: 'Défiscalisation', pistes: "Épargne retraite, investissements ouvrant droit à réduction d’impôt, organisation de vos revenus." },
    retraite: { label: 'Préparer ma retraite', hs: 'Retraite', pistes: "Plan d’épargne retraite, assurance-vie, revenus immobiliers." },
    placer: { label: 'Placer une somme', hs: 'Diversifier son patrimoine', pistes: 'Assurance-vie, contrat de capitalisation, SCPI, produits structurés.' },
    revenus: { label: 'Percevoir des revenus', hs: '', pistes: 'SCPI, immobilier, rachats programmés en assurance-vie.' },
    immobilier: { label: "Investir dans l’immobilier", hs: '', pistes: 'Immobilier en direct, SCPI, nue-propriété, financement.' },
    transmettre: { label: 'Transmettre et protéger mes proches', hs: 'Transmission', pistes: "Donation, démembrement de propriété, clause bénéficiaire d’assurance-vie." },
    cession: { label: 'Céder mon entreprise', hs: '', pistes: '' },
    financer: { label: 'Financer un projet', hs: 'Financer un projet', pistes: '' }
  };
  var RANGES = { a: 'Moins de 100 000 €', b: '100 000 à 500 000 €', c: '500 000 € à 2 M€', d: 'Plus de 2 M€' };

  /* ——— Menu mobile ——— */
  var toggle = $('.nav-toggle');
  var nav = $('#menu');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.closest('.site-header').classList.toggle('menu-open', open);
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.closest('.site-header').classList.remove('menu-open');
      }
    });
  }

  /* ——— Accueil : premier pas du bilan ——— */
  var starter = $('[data-starter]');
  if (starter) {
    var link = $('[data-starter-link]', starter);
    var pistes = $('[data-pistes]', starter);
    var picked = { objectif: 'impots', patrimoine: 'b' };
    var refresh = function () {
      link.setAttribute('href', (SD.base || '/') + 'bilan-patrimonial/?objectif=' + picked.objectif + '&patrimoine=' + picked.patrimoine);
      pistes.textContent = GOALS[picked.objectif].pistes;
      pistes.classList.remove('swap');
      void pistes.offsetWidth;
      pistes.classList.add('swap');
    };
    $$('[data-group]', starter).forEach(function (group) {
      group.addEventListener('click', function (e) {
        var chip = e.target.closest('.chip');
        if (!chip) return;
        $$('.chip', group).forEach(function (c) { c.setAttribute('aria-pressed', String(c === chip)); });
        picked[group.getAttribute('data-group')] = chip.getAttribute('data-value');
        refresh();
      });
    });
    refresh();
  }

  /* ——— Envoi vers HubSpot ——— */
  function hsSubmit(formKey, fields, consentText, subscribe) {
    var guid = (HS.forms || {})[formKey];
    if (!guid || !HS.portalId || !HS.api) return Promise.reject(new Error('formulaire non configuré'));
    var consent = { consentToProcess: true, text: consentText };
    if (subscribe && HS.subscriptionTypeId) {
      consent.communications = [{ value: true, subscriptionTypeId: Number(HS.subscriptionTypeId), text: 'Je souhaite recevoir la lettre mensuelle de Samy Delagrange.' }];
    }
    var payload = {
      fields: fields.filter(function (f) { return f[1]; }).map(function (f) { return { objectTypeId: '0-1', name: f[0], value: f[1] }; }),
      context: { pageUri: location.href.split('?')[0], pageName: document.title },
      legalConsentOptions: { consent: consent }
    };
    return fetch(HS.api + HS.portalId + '/' + guid, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (res) {
      if (!res.ok) throw new Error('HubSpot ' + res.status);
      return res;
    });
  }

  /* ——— Lecture et contrôle des champs ——— */
  function value(form, name) {
    var els = $$('[name="' + name + '"]', form);
    if (!els.length) return '';
    var first = els[0];
    if (first.type === 'radio') {
      var on = els.filter(function (el) { return el.checked; })[0];
      return on ? on.value : '';
    }
    if (first.type === 'checkbox') return first.checked ? first.value : '';
    return first.value.trim();
  }
  function isEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); }

  function validate(scope, form) {
    var firstBad = null;
    $$('.field[data-required]', scope).forEach(function (field) {
      var name = field.getAttribute('data-required');
      var v = value(form, name);
      var ok = name === 'email' ? isEmail(v) : name === 'telephone' ? v.replace(/\D/g, '').length >= 9 : !!v;
      field.classList.toggle('invalid', !ok);
      var msg = $('.error', field);
      if (msg) msg.hidden = ok;
      if (!ok && !firstBad) firstBad = field;
    });
    if (firstBad) {
      var target = $('input, select, textarea', firstBad);
      if (target) target.focus();
    }
    return !firstBad;
  }
  function isBot(form, minSeconds) {
    return !!value(form, 'site_web') || (Date.now() - loadedAt) < minSeconds * 1000;
  }
  function show(el) {
    el.hidden = false;
    el.focus({ preventScroll: true });
    el.scrollIntoView({ block: 'start', behavior: 'auto' });
  }
  function fallback(form, recap) {
    var box = $('[data-fallback]', form.parentNode);
    form.hidden = true;
    $('[data-recap]', box).value = recap;
    show(box);
    var copy = $('[data-copy]', box);
    copy.addEventListener('click', function () {
      var area = $('[data-recap]', box);
      area.select();
      var done = function () { copy.textContent = 'Récapitulatif copié'; };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(area.value).then(done, function () { document.execCommand('copy'); done(); });
      } else { document.execCommand('copy'); done(); }
    });
  }
  function identity(form) {
    return [
      ['civilite_madame', value(form, 'civilite')],
      ['firstname', value(form, 'prenom')],
      ['lastname', value(form, 'nom')],
      ['email', value(form, 'email')],
      ['phone', value(form, 'telephone')]
    ];
  }
  function identityLines(form) {
    return [
      value(form, 'civilite') + ' ' + value(form, 'prenom') + ' ' + value(form, 'nom'),
      'E-mail : ' + value(form, 'email'),
      'Téléphone : ' + (value(form, 'telephone') || 'non renseigné')
    ];
  }
  function line(label, v) { return v ? label + ' : ' + v : ''; }

  /* ——— Bilan patrimonial ——— */
  var bilan = $('#bilan-form');
  if (bilan) {
    var steps = $$('.step', bilan);
    var current = 0;
    var prev = $('[data-prev]', bilan);
    var next = $('[data-next]', bilan);
    var submit = $('[data-submit]', bilan);
    var bar = $('[data-progress-bar]', bilan);
    var label = $('[data-progress-label]', bilan);
    var errorBox = $('.form-error', bilan);

    var params = new URLSearchParams(location.search);
    ['objectif', 'patrimoine'].forEach(function (name) {
      var wanted = params.get(name);
      var input = wanted && $('[name="' + name + '"][value="' + wanted.replace(/[^a-z]/g, '') + '"]', bilan);
      if (input) input.checked = true;
    });
    if (HS.subscriptionTypeId) { var optin = $('[data-lettre-optin]', bilan); if (optin) optin.hidden = false; }

    var go = function (index, focus) {
      current = index;
      steps.forEach(function (s, i) { s.classList.toggle('current', i === index); });
      prev.hidden = index === 0;
      next.hidden = index === steps.length - 1;
      submit.hidden = index !== steps.length - 1;
      bar.style.width = ((index + 1) / steps.length * 100) + '%';
      label.textContent = 'Étape ' + (index + 1) + ' sur ' + steps.length;
      errorBox.hidden = true;
      if (focus) {
        var legend = $('legend', steps[index]);
        legend.setAttribute('tabindex', '-1');
        legend.focus({ preventScroll: true });
        bilan.scrollIntoView({ block: 'start', behavior: 'auto' });
      }
    };
    next.addEventListener('click', function () { if (validate(steps[current], bilan)) go(current + 1, true); });
    prev.addEventListener('click', function () { go(current - 1, true); });
    go(0, false);

    bilan.addEventListener('submit', function (e) {
      e.preventDefault();
      if (current !== steps.length - 1) { if (validate(steps[current], bilan)) go(current + 1, true); return; }
      if (!validate(steps[current], bilan)) return;
      var goal = GOALS[value(bilan, 'objectif')] || { label: '', hs: '' };
      var answers = [
        '[Bilan patrimonial – samydelagrange.com]',
        line('Objectif', goal.label),
        line('Patrimoine à organiser', RANGES[value(bilan, 'patrimoine')]),
        line('Âge', value(bilan, 'age')),
        line('Situation familiale', value(bilan, 'famille')),
        line('Enfants', value(bilan, 'enfants')),
        line('Situation professionnelle', value(bilan, 'activite')),
        line('Revenus nets annuels du foyer', value(bilan, 'revenus')),
        line("Tranche marginale d’imposition", value(bilan, 'tmi')),
        line('Épargne mensuelle possible', value(bilan, 'epargne')),
        line('Somme à placer', value(bilan, 'somme')),
        line('Précisions', value(bilan, 'precisions'))
      ].filter(Boolean);
      var done = function () { bilan.hidden = true; show($('[data-done]', bilan.parentNode)); };
      if (isBot(bilan, 8)) { done(); return; }
      var fields = identity(bilan).concat([
        ['objectif_de_la_transaction__clone_', goal.hs],
        ['origine_de_la_piste', 'Site internet'],
        ['message', answers.join('\n')]
      ]);
      submit.disabled = true;
      submit.textContent = 'Envoi en cours';
      hsSubmit('bilan', fields, "J’accepte que Samy Delagrange utilise ces informations pour étudier ma situation et me recontacter.", !!value(bilan, 'lettre'))
        .then(done)
        .catch(function () { fallback(bilan, answers.concat(identityLines(bilan)).join('\n')); });
    });
  }

  /* ——— Demande de rendez-vous ——— */
  var agenda = $('[data-agenda]');
  if (agenda && SD.meetingsUrl) {
    $('[data-agenda-link]', agenda).setAttribute('href', SD.meetingsUrl);
    agenda.hidden = false;
    agenda.style.marginBottom = '28px';
  }
  var rdv = $('#rdv-form');
  if (rdv) {
    var rdvSubmit = $('[data-submit]', rdv);
    rdv.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validate(rdv, rdv)) return;
      var answers = [
        '[Demande de rendez-vous – samydelagrange.com]',
        line('Moment préféré', value(rdv, 'moment')),
        line('Sujet', value(rdv, 'precisions'))
      ].filter(Boolean);
      var done = function () { rdv.hidden = true; show($('[data-done]', rdv.parentNode)); };
      if (isBot(rdv, 4)) { done(); return; }
      var fields = identity(rdv).concat([
        ['origine_de_la_piste', 'Site internet'],
        ['message', answers.join('\n')]
      ]);
      rdvSubmit.disabled = true;
      rdvSubmit.textContent = 'Envoi en cours';
      hsSubmit('rendezVous', fields, "J’accepte que Samy Delagrange utilise ces informations pour me recontacter.", false)
        .then(done)
        .catch(function () { fallback(rdv, answers.concat(identityLines(rdv)).join('\n')); });
    });
  }

  /* ——— Lettre mensuelle ——— */
  $$('form[data-form="lettre"]').forEach(function (form) {
    var status = $('.status', form);
    var button = $('button[type="submit"]', form);
    var say = function (text) { status.textContent = text; status.hidden = false; };
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = value(form, 'email');
      if (!isEmail(email)) { say('Indiquez une adresse e-mail valide.'); $('input[type="email"]', form).focus(); return; }
      if (value(form, 'site_web')) { say('Inscription enregistrée. À bientôt dans votre boîte de réception.'); return; }
      button.disabled = true;
      hsSubmit('lettre', [['email', email], ['origine_de_la_piste', 'Site internet']], "En m’inscrivant, j’accepte de recevoir la lettre mensuelle de Samy Delagrange par e-mail.", true)
        .then(function () { form.reset(); say('Inscription enregistrée. À bientôt dans votre boîte de réception.'); })
        .catch(function () { button.disabled = false; say("L’inscription n’a pas abouti. Écrivez-moi à " + (SD.email || '') + '.'); });
    });
  });

  /* ═══════════ Mouvement ═══════════
     Tout ce qui suit est du confort : sans lui, la page est entière et lisible. */

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function fmt(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }

  /* Nombre qui roule jusqu'à sa nouvelle valeur */
  function roll(el, to, from, ms) {
    cancelAnimationFrame(el.__raf);
    var start = from === undefined ? (el.__v === undefined ? to : el.__v) : from;
    el.__v = to;
    if (!motion || start === to) { el.textContent = fmt(to); return; }
    var t0 = performance.now();
    var dur = ms || 520;
    (function tick(now) {
      var k = clamp((now - t0) / dur, 0, 1);
      var eased = 1 - Math.pow(1 - k, 4);
      el.textContent = fmt(start + (to - start) * eased);
      if (k < 1) el.__raf = requestAnimationFrame(tick);
    })(t0);
  }

  /* Découpe un texte en mots. masque = chaque mot monte depuis une fenêtre ; sinon simple enveloppe.
     Le texte complet reste lisible d'un seul tenant par les lecteurs d'écran. */
  function split(el, masque) {
    var full = el.textContent.replace(/\s+/g, ' ').trim();
    var holder = document.createElement('span');
    holder.setAttribute('aria-hidden', 'true');
    while (el.firstChild) holder.appendChild(el.firstChild);
    var count = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 1) { walk(child); return; }
        if (child.nodeType !== 3) return;
        var frag = document.createDocumentFragment();
        child.nodeValue.split(/([ \n\t]+)/).forEach(function (part) {
          if (!part) return;
          if (/^[ \n\t]+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
          var w = document.createElement('span');
          w.className = 'w';
          w.style.setProperty('--w', count++);
          if (masque) { var inner = document.createElement('span'); inner.textContent = part; w.appendChild(inner); }
          else w.textContent = part;
          frag.appendChild(w);
        });
        node.replaceChild(frag, child);
      });
    })(holder);
    var sr = document.createElement('span');
    sr.className = 'vh';
    sr.textContent = full;
    el.appendChild(sr);
    el.appendChild(holder);
    return $$('.w', holder);
  }

  var header = $('.site-header');
  var scenes = [];

  if (motion) {
    $$('[data-split]').forEach(function (el) { split(el, true); el.classList.add('split'); });

    /* Apparitions à l'entrée dans l'écran */
    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        seen.unobserve(entry.target);
      });
    }, { threshold: 0, rootMargin: '0px 0px -8% 0px' });
    var start = function () { $$('[data-reveal], [data-split]').forEach(function (el) { seen.observe(el); }); };
    var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    Promise.race([fontsReady, new Promise(function (ok) { setTimeout(ok, 700); })]).then(start, start);
  }

  /* Méthode : l'étape la plus proche du milieu de l'écran commande l'illustration */
  var scene = $('[data-scene]');
  if (scene) {
    var list = $('.msteps', scene);
    var msteps = $$('.mstep', scene);
    var mstage = $('.stage-m', scene);
    var panels = $$('[data-panel]', scene);
    var wide = window.matchMedia('(min-width: 1021px)');
    var activeStep = -1;
    var inline = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { if (entry.isIntersecting && !wide.matches) entry.target.classList.add('active'); });
    }, { threshold: 0.3 });
    var place = function () {
      activeStep = -1;
      panels.forEach(function (panel, i) {
        panel.classList.remove('active');
        (wide.matches ? mstage : msteps[i]).appendChild(panel);
      });
      scene.classList.toggle('live', wide.matches);
    };
    scene.classList.add('on');
    place();
    panels.forEach(function (panel) { inline.observe(panel); });
    if (wide.addEventListener) wide.addEventListener('change', function () { place(); frame(); });
    scenes.push(function (vh) {
      var mid = vh * 0.45;
      var best = 0;
      var gap = Infinity;
      msteps.forEach(function (step, i) {
        var r = step.getBoundingClientRect();
        var d = Math.abs(r.top + 40 - mid);
        if (d < gap) { gap = d; best = i; }
      });
      var lr = list.getBoundingClientRect();
      list.style.setProperty('--fill', clamp((mid - lr.top - 22) / (lr.height - 44), 0, 1).toFixed(4));
      if (best === activeStep) return;
      activeStep = best;
      msteps.forEach(function (step, i) { step.classList.toggle('active', i === best); step.classList.toggle('past', i < best); });
      if (wide.matches) panels.forEach(function (panel, i) { panel.classList.toggle('active', i === best); });
    });
  }

  /* Honoraires : deux modes, un seul à l'écran */
  var fees = $('[data-fees]');
  if (fees) {
    var seg = $('.seg', fees);
    var tabs = $$('[role="tab"]', fees);
    var feePanels = $$('[role="tabpanel"]', fees);
    var amounts = [3000, 0];
    var selectFee = function (index, byUser) {
      tabs.forEach(function (tab, i) {
        tab.setAttribute('aria-selected', String(i === index));
        tab.tabIndex = i === index ? 0 : -1;
      });
      feePanels.forEach(function (panel, i) { panel.hidden = i !== index; panel.classList.remove('show'); });
      seg.style.setProperty('--pos', index);
      if (!byUser) return;
      void feePanels[index].offsetWidth;
      feePanels[index].classList.add('show');
      roll($('[data-count]', feePanels[index]), amounts[index], amounts[1 - index], 900);
      tabs[index].focus();
    };
    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { selectFee(i, true); });
      tab.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); selectFee(1 - i, true); }
      });
    });
    selectFee(0, false);
    if (motion) {
      var first = $('[data-count]', feePanels[0]);
      new IntersectionObserver(function (entries, io) {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        roll(first, 3000, 0, 1400);
      }, { threshold: 0.6 }).observe(first);
    }
  }

  /* Repères chiffrés */
  $$('[data-calc]').forEach(function (card) {
    var kind = card.getAttribute('data-calc');
    var out = $('[data-out]', card);
    var picked = function (name) { var on = $('input[name="' + name + '"]:checked', card); return on ? Number(on.value) : 0; };
    var update = function () {
      var result = 0;
      if (kind === 'per') {
        var range = $('.range', card);
        var paid = Number(range.value);
        range.style.setProperty('--pct', ((paid - range.min) / (range.max - range.min) * 100).toFixed(1) + '%');
        $('[data-versement]', card).textContent = fmt(paid) + ' €';
        result = paid * picked('per-tmi') / 100;
      } else if (kind === 'donation') {
        result = 100000 * picked('don-parents') * picked('don-enfants');
      } else {
        result = picked('vie-foyer');
      }
      roll(out, result);
    };
    card.addEventListener('input', update);
    card.addEventListener('change', update);
    update();
  });

  /* Solutions : la famille survolée ou choisie affiche sa liste */
  var sol = $('[data-sol]');
  if (sol) {
    var solTabs = $$('.sol-tabs button', sol);
    var solPanels = $$('.sol-panel', sol);
    var selectSol = function (index) {
      solTabs.forEach(function (tab, i) { tab.setAttribute('aria-pressed', String(i === index)); });
      solPanels.forEach(function (panel, i) { panel.classList.toggle('on', i === index); });
    };
    sol.classList.add('live');
    solTabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { selectSol(i); });
      tab.addEventListener('focus', function () { selectSol(i); });
      if (fine) tab.addEventListener('pointerenter', function () { selectSol(i); });
    });
  }

  /* À propos : la phrase s'encre mot après mot */
  var statement = $('[data-lit]');
  if (statement && motion) {
    var words = split(statement, false);
    var litCount = -1;
    statement.classList.add('lit');
    scenes.push(function (vh) {
      var r = statement.getBoundingClientRect();
      var n = Math.round(clamp((vh * 0.88 - r.top) / (r.height + vh * 0.38), 0, 1) * words.length);
      if (n === litCount) return;
      litCount = n;
      words.forEach(function (w, i) { w.classList.toggle('on', i < n); });
    });
  }

  /* Bandeau et halo du haut de page : léger décalage au défilement */
  var marquee = $('[data-marquee] .marquee-track');
  var aura = $('.hero-aura');
  if (motion) {
    scenes.push(function (vh, y) {
      if (marquee) marquee.style.setProperty('--shift', (-y * 0.14).toFixed(1));
      if (aura && y < vh * 1.4) aura.style.setProperty('--sy', (y * 0.22).toFixed(1));
    });
  }

  /* Une seule lecture du défilement par image */
  var queued = false;
  function frame() {
    queued = false;
    var y = window.scrollY;
    var vh = window.innerHeight;
    var max = root.scrollHeight - vh;
    if (header) {
      header.classList.toggle('scrolled', y > 8);
      header.style.setProperty('--p', max > 0 ? clamp(y / max, 0, 1).toFixed(4) : '0');
    }
    scenes.forEach(function (fn) { fn(vh, y); });
  }
  function ask() { if (!queued) { queued = true; requestAnimationFrame(frame); } }
  window.addEventListener('scroll', ask, { passive: true });
  window.addEventListener('resize', ask);
  frame();

  /* Pointeur : halo des blocs sombres, étiquettes du haut de page, encre des tuiles, boutons aimantés */
  if (motion && fine) {
    $$('[data-spot]').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
    var hero = $('[data-hero]');
    if (hero) {
      hero.addEventListener('pointermove', function (e) {
        var r = hero.getBoundingClientRect();
        hero.style.setProperty('--px', ((e.clientX - r.left) / r.width * 2 - 1).toFixed(3));
        hero.style.setProperty('--py', ((e.clientY - r.top) / r.height * 2 - 1).toFixed(3));
      });
    }
    $$('[data-magnet]').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--tx', clamp((e.clientX - r.left - r.width / 2) * 0.22, -10, 10).toFixed(1) + 'px');
        el.style.setProperty('--ty', clamp((e.clientY - r.top - r.height / 2) * 0.3, -6, 6).toFixed(1) + 'px');
      });
      el.addEventListener('pointerleave', function () { el.style.setProperty('--tx', '0px'); el.style.setProperty('--ty', '0px'); });
    });
  }
  $$('.tile').forEach(function (tile) {
    tile.addEventListener('pointerenter', function (e) {
      var r = tile.getBoundingClientRect();
      tile.style.setProperty('--x', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
      tile.style.setProperty('--y', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
    });
  });
})();
