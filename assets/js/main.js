/* =========================================================================
   Bangladesh Energy Crisis 2026 - The Daily Star special report
   Scroll-driven state (which step is current) is read from a passive scroll
   listener, because a scroll event is delivered even when painting is
   throttled and rAF is not. Everything else is IntersectionObserver and CSS
   scroll-driven animation.
   ========================================================================= */
(function () {
  'use strict';

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NARROW = function () { return window.matchMedia('(max-width: 720px)').matches; };
  var STACKED = function () { return window.matchMedia('(max-width: 1023px)').matches; };
  var SVGNS = 'http://www.w3.org/2000/svg';

  /* ------------------------------------------------------------ helpers */

  function q(sel, root) { return (root || document).querySelector(sel); }
  function qa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  /* SVG element factory. Every attribute is written verbatim, so callers keep
     using SVG's own hyphenated names. */
  function el(tag, attrs, text) {
    var n = document.createElementNS(SVGNS, tag);
    if (attrs) {
      for (var k in attrs) {
        if (Object.prototype.hasOwnProperty.call(attrs, k) && attrs[k] != null) {
          n.setAttribute(k, attrs[k]);
        }
      }
    }
    if (text != null) n.textContent = text;
    return n;
  }

  /* viewBox carries the aspect ratio, so the chart fills its host and the host
     reserves the right height before any of this runs */
  function svg(w, h, cls) {
    return el('svg', {
      viewBox: '0 0 ' + w + ' ' + h, width: '100%',
      preserveAspectRatio: 'xMidYMid meet',
      role: 'img', class: cls || null
    });
  }

  function group(v) {
    var n = Number(v);
    if (!isFinite(n)) return String(v);
    var p = String(n).split('.');
    p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return p.join('.');
  }

  /* Charts are authored at a fixed viewBox and scaled to the container by CSS.
     Type would shrink with them, so font sizes are divided back out by however
     much the SVG had to shrink. Capped, or a phone would get billboard type. */
  function scaleK(host, W) {
    var w = (host && host.clientWidth) || W;
    return Math.max(1, Math.min(2.1, W / w));
  }

  function watchReveals(root) {
    var nodes = qa('.rv, .rv-f', root);
    if (!nodes.length) return;
    if (REDUCED) {
      nodes.forEach(function (n) { n.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.06 });
    nodes.forEach(function (n) { io.observe(n); });
  }

  /* --------------------------------------------------------------- data */

  /* Every figure below is transcribed from the fact-checked dataset in
     uploads/data_visualizations.json, which carries a claim id and a source
     article for each one. Nothing here is interpolated: where the reporting
     has no figure for a day, the series has no entry, and the charts draw a
     gap rather than a line. Statuses follow the dataset vocabulary, where
     'reported' means the number appears verbatim in the source and 'approx'
     means the source hedged it ('about', 'over'), which the charts hatch. */
  var DATA = {

    /* national power shortfall, MW, by day. C-112 to C-117, C-001.
       The 28 June 3,000 MW figure is deliberately absent: it is capacity lost
       from the grid, a different metric with a different cause. */
    shortfall: [
      { d: '2026-07-24', v: 500,  s: 'approx' },
      { d: '2026-08-01', v: 2174, s: 'reported' },
      { d: '2026-08-02', v: 3000, s: 'approx' },
      { d: '2026-08-03', v: 3000, s: 'approx' },
      { d: '2026-08-04', v: 2000, s: 'approx' },
      { d: '2026-08-06', v: 335,  s: 'reported' },
      { d: '2026-08-07', v: 740,  s: 'reported' },
      { d: '2026-08-08', v: 2167, s: 'reported' },
      { d: '2026-08-09', v: 3000, s: 'approx' },
      { d: '2026-08-10', v: 3750, s: 'reported' }
    ],

    /* administered prices, March to August 2026. C-053 to C-060.
       Liquid fuel lanes open at the rate in force before 18 April. */
    lanes: [
      {
        name: 'Diesel', unit: 'Tk per litre', color: '#FFD98C', dom: [95, 121],
        pts: [['2026-03-01', 100], ['2026-04-18', 115], ['2026-06-01', 115]],
        marks: { '2026-04-18': '+15%' }
      },
      {
        name: 'Octane', unit: 'Tk per litre', color: '#E5793F', dom: [114, 151],
        pts: [['2026-03-01', 120], ['2026-04-18', 140], ['2026-06-01', 145]]
      },
      {
        name: 'LPG, 12kg cylinder', unit: 'Tk per cylinder', color: '#9B84E8', dom: [1280, 2010],
        pts: [
          ['2026-03-01', 1341], ['2026-04-02', 1728], ['2026-04-19', 1940],
          ['2026-06-02', 1885], ['2026-07-02', 1528], ['2026-08-02', 1598]
        ],
        marks: { '2026-04-19': 'peak', '2026-07-02': 'trough' }
      },
      {
        name: 'Autogas', unit: 'Tk per litre', color: '#4FD6C4', dom: [66, 94],
        pts: [
          ['2026-05-01', 89.5], ['2026-06-02', 86.93],
          ['2026-07-02', 70.4], ['2026-08-02', 73.67]
        ]
      },
      {
        name: 'Electricity, retail', unit: 'Tk per kWh, weighted average', color: '#6BBDF2', dom: [8.8, 11.1],
        pts: [['2026-03-01', 9.11], ['2026-06-04', 10.4]],
        marks: { '2026-06-04': 'after rollback from 10.63' }
      }
    ],

    /* delivered against required gas pressure, PSI, at the peak of the July
       shortage. C-034 to C-042, C-134, C-135. The two ceramics entries report
       different requirements and are both kept, unreconciled. */
    psi: [
      { sec: 'Ceramics', ent: 'Fresh Ceramics', req: [30, 35], del: [15, 16], color: '#FFD98C' },
      { sec: 'Ceramics', ent: 'Manufacturers association, 29 July letter', req: [15, 15], del: [0, 3], color: '#FFD98C' },
      { sec: 'Knitwear', ent: 'BKMEA member factories', req: [10, 10], del: [1, 2], color: '#9B84E8' },
      { sec: 'Denim and textiles', ent: 'Shasha Denims', req: [8, 8], del: [2, 3], color: '#6BBDF2' },
      { sec: 'Captive power', ent: 'Little Star Spinning Mills, Ashulia', req: [10, 10], del: [0.5, 1.5], color: '#4FD6C4' },
      { sec: 'CNG stations', ent: 'National, 24 July', req: [7, 8], del: [0, 2], color: '#E5793F' },
      { sec: 'CNG stations', ent: 'National, 4 August', req: [7, 8], del: [0, 1], color: '#E5793F' },
      { sec: 'CNG stations', ent: 'Sylhet, a gas producing region', req: [14, 15], del: [4, 5], color: '#E5793F' }
    ],

    /* reported outage figures by place. C-069 to C-075. Hours and share of
       demand met are different measurements and the strip separates them. */
    strip: [
      { loc: 'Bagmara, Rajshahi', h: 16, v: 'About 16 hours a day' },
      { loc: 'Kapasia, Gazipur', h: 11, v: '10 to 12 hours a day' },
      { loc: 'Sreepur, Gazipur', h: 11, v: '10 to 12 hours a day' },
      { loc: 'Kaliganj, Gazipur', h: 11, v: '10 to 12 hours a day' },
      { loc: 'Kaliakair, Gazipur', h: 11, v: '10 to 12 hours a day' },
      { loc: 'Pabna', h: 9, v: '8 to 10 hours a day' },
      { loc: 'Gopalganj', h: 9, v: '8 to 10 hours a day' },
      { loc: 'Fulpur, Mymensingh', h: 7, v: 'Over 7 hours in a day' },
      { loc: 'Khulna', h: 4, v: '3 to 5 hours a day' },
      { loc: 'Natore PBS-2', pct: 35, v: '35% of demand met' },
      { loc: 'Mouchak and Bannara, Gazipur', pct: 45.7, v: '32 MW allocated against 70 MW needed' }
    ]
  };

  /* Keeps exactly one step current: the one holding the reading line, or the
     nearest to it.

     Two rules learned the hard way. (1) The decision runs off a passive scroll
     listener, not a rAF loop: scroll events still arrive when frames are being
     dropped, so a slow device cannot skip a step. (2) The observer that backs
     it up must watch the SAME line the decision uses, or it fires at moments
     that disagree with the answer. */
  function trackSteps(steps, onChange, anchorFrac) {
    if (!steps.length) return;
    var cur = -1, band = null;
    var mq = window.matchMedia('(max-width: 1023px)');
    /* stacked layouts pin the graphic to the top, so the card reads lower */
    function frac() { return anchorFrac ? anchorFrac() : (mq.matches ? 0.68 : 0.5); }

    function pick() {
      var a = window.innerHeight * frac();
      var best = -1, bestD = Infinity;
      for (var i = 0; i < steps.length; i++) {
        var r = steps[i].getBoundingClientRect();
        if (r.top <= a && r.bottom >= a) { best = i; break; }
        var d = Math.min(Math.abs(r.top - a), Math.abs(r.bottom - a));
        if (d < bestD) { bestD = d; best = i; }
      }
      if (best < 0 || best === cur) return;
      cur = best;
      for (var j = 0; j < steps.length; j++) {
        steps[j].setAttribute('aria-current', j === best ? 'true' : 'false');
      }
      if (onChange) onChange(steps[best], best);
    }

    function buildBand() {
      if (band) band.disconnect();
      var top = Math.round(frac() * 1000) / 10;
      band = new IntersectionObserver(pick, {
        rootMargin: '-' + top + '% 0px -' + (100 - top) + '% 0px', threshold: 0
      });
      for (var i = 0; i < steps.length; i++) band.observe(steps[i]);
    }
    buildBand();

    var relayout = function () { buildBand(); pick(); };
    if (mq.addEventListener) mq.addEventListener('change', relayout);
    else if (mq.addListener) mq.addListener(relayout);

    window.addEventListener('scroll', pick, { passive: true });
    window.addEventListener('resize', relayout, { passive: true });
    pick();
  }

  /* ------------------------------------------------------------ counters */

  function tick(node) {
    var target = parseFloat(node.getAttribute('data-count'));
    var pre = node.getAttribute('data-prefix') || '';
    var suf = node.getAttribute('data-suffix') || '';
    var grp = node.getAttribute('data-format') === 'group';
    function paint(v) {
      var s = grp ? group(Math.round(v)) : String(Math.round(v));
      node.textContent = pre + s + suf;
    }
    if (REDUCED) { paint(target); return; }
    var t0 = performance.now(), dur = 900;
    function step(t) {
      var p = Math.min(1, (t - t0) / dur);
      paint(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  (function () {
    var box = q('#counters');
    if (!box) return;
    var nodes = qa('[data-count]', box);
    nodes.forEach(function (n) { n.textContent = (n.getAttribute('data-prefix') || '') + (n.getAttribute('data-format') === 'group' ? group(n.getAttribute('data-count')) : n.getAttribute('data-count')) + (n.getAttribute('data-suffix') || ''); });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.disconnect();
        nodes.forEach(function (n, i) { setTimeout(function () { tick(n); }, i * 55); });
      });
    }, { threshold: 0.3 });
    io.observe(box);
  })();

  /* -------------------------------------------- chart: production vs LNG */

  /* Two states rather than a time series: where the gas came from then, and
     where it comes from now. Ribbons carry each source across the shift. */
  (function () {
    var host = q('#chart-prod');
    if (!host) return;
    var W = 680, H = 382, m = { t: 74, r: 118, b: 66, l: 96 };
    var K = scaleK(host, W, H), F = function (v) { return Math.round(v * K * 10) / 10; };
    var s = svg(W, H);

    var A2 = { fy: 'FY2018-19', dom: 27.2, lng: 3.28 };
    var B2 = { fy: 'FY2024-25', dom: 19.6, lng: 7.98 };
    [A2, B2].forEach(function (d) { d.tot = d.dom + d.lng; d.share = d.lng / d.tot * 100; });
    var MAX = A2.tot, base = H - m.b, span = base - m.t;
    var hh = function (v) { return v / MAX * span; };

    s.setAttribute('aria-label',
      'Where Bangladesh got its gas. In FY2018-19, 27.2 billion cubic metres came from domestic fields and 3.28 from imported LNG, 11 percent of the total. In FY2024-25, domestic supply had fallen to 19.6 and imports had risen to 7.98, 29 percent of a smaller total.');

    var bw = 84;
    A2.x = m.l; B2.x = W - m.r - bw;

    var defs = el('defs', {});
    [['rbDom', '#4FD6C4'], ['rbLng', '#9B84E8']].forEach(function (g) {
      var lg2 = el('linearGradient', { id: g[0], x1: '0', y1: '0', x2: '1', y2: '0' });
      lg2.appendChild(el('stop', { offset: '0', 'stop-color': g[1], 'stop-opacity': '.30' }));
      lg2.appendChild(el('stop', { offset: '1', 'stop-color': g[1], 'stop-opacity': '.13' }));
      defs.appendChild(lg2);
    });
    s.appendChild(defs);

    // ribbons carrying each source from the old state to the new one
    function ribbon(y1a, y1b, y2a, y2b, fill) {
      var x1 = A2.x + bw, x2 = B2.x, c1 = x1 + (x2 - x1) * 0.5, c2 = x2 - (x2 - x1) * 0.5;
      var d = 'M' + x1 + ' ' + y1a +
        ' C' + c1 + ' ' + y1a + ' ' + c2 + ' ' + y2a + ' ' + x2 + ' ' + y2a +
        ' L' + x2 + ' ' + y2b +
        ' C' + c2 + ' ' + y2b + ' ' + c1 + ' ' + y1b + ' ' + x1 + ' ' + y1b + ' Z';
      var p = el('path', { d: d, fill: fill, opacity: REDUCED ? 1 : 0 });
      if (!REDUCED) { p.style.transition = 'opacity 620ms cubic-bezier(.22,1,.36,1) 220ms'; p.setAttribute('data-fade', '1'); }
      s.appendChild(p);
    }
    var aDomTop = base - hh(A2.dom), aLngTop = base - hh(A2.tot);
    var bDomTop = base - hh(B2.dom), bLngTop = base - hh(B2.tot);
    ribbon(base, aDomTop, base, bDomTop, 'url(#rbDom)');
    ribbon(aDomTop, aLngTop, bDomTop, bLngTop, 'url(#rbLng)');

    function column(d, domTop, lngTop, side) {
      var g = el('g', {});
      var segs = [
        { y: domTop, h: base - domTop, fill: '#4FD6C4', v: d.dom, name: 'Domestic fields' },
        { y: lngTop, h: domTop - lngTop, fill: '#9B84E8', v: d.lng, name: 'Imported LNG' }
      ];
      segs.forEach(function (sg, i) {
        var r = el('rect', { x: d.x, y: sg.y, width: bw, height: sg.h, fill: sg.fill });
        if (!REDUCED) {
          r.setAttribute('y', base); r.setAttribute('height', 0);
          r.style.transition = 'y 620ms cubic-bezier(.22,1,.36,1) ' + (i * 90) + 'ms, height 620ms cubic-bezier(.22,1,.36,1) ' + (i * 90) + 'ms';
          r.setAttribute('data-grow', sg.y + '|' + sg.h);
        }
        g.appendChild(r);
        var lx = side === 'left' ? d.x - 12 : d.x + bw + 12;
        var anch = side === 'left' ? 'end' : 'start';
        var cy = sg.y + sg.h / 2;
        g.appendChild(el('text', { x: lx, y: cy - 1, 'text-anchor': anch, fill: '#F5F2EA', 'font-family': 'Geist Mono, monospace', 'font-size': F(14) }, sg.v.toFixed(2)));
        if (sg.h > 34 || i === 1) {
          g.appendChild(el('text', { x: lx, y: cy + 14, 'text-anchor': anch, fill: sg.fill, 'font-family': 'Geist, sans-serif', 'font-size': F(10.5) }, sg.name));
        }
      });
      // header
      g.appendChild(el('text', { x: d.x + bw / 2, y: lngTop - 34, 'text-anchor': 'middle', fill: '#F5F2EA', 'font-family': 'Geist, sans-serif', 'font-size': F(13) }, d.fy));
      g.appendChild(el('text', { x: d.x + bw / 2, y: lngTop - 18, 'text-anchor': 'middle', fill: '#918878', 'font-family': 'Geist Mono, monospace', 'font-size': F(10) }, d.tot.toFixed(2) + ' bcm total'));
      // baseline tick
      g.appendChild(el('line', { x1: d.x, y1: base, x2: d.x + bw, y2: base, stroke: '#3B3329', 'stroke-width': 1 }));
      // share of imports
      g.appendChild(el('text', { x: d.x + bw / 2, y: base + 26, 'text-anchor': 'middle', fill: '#9B84E8', 'font-family': 'Geist Mono, monospace', 'font-size': F(16) }, Math.round(d.share) + '%'));
      g.appendChild(el('text', { x: d.x + bw / 2, y: base + 40, 'text-anchor': 'middle', fill: '#918878', 'font-family': 'Geist, sans-serif', 'font-size': F(9.5) }, 'imported'));
      s.appendChild(g);
    }
    column(A2, aDomTop, aLngTop, 'left');
    column(B2, bDomTop, bLngTop, 'right');

    // the two movements, written across the middle
    var midX = (A2.x + bw + B2.x) / 2;
    var mv = el('g', { opacity: REDUCED ? 1 : 0 });
    if (!REDUCED) { mv.style.transition = 'opacity 500ms ease-out 620ms'; mv.setAttribute('data-fade', '1'); }
    mv.appendChild(el('text', { x: midX - 10, y: (aDomTop + bDomTop) / 2 + 44, 'text-anchor': 'middle', fill: '#7EE8DA', 'font-family': 'Geist Mono, monospace', 'font-size': F(15) }, '\u221228%'));
    mv.appendChild(el('text', { x: midX + 46, y: (aLngTop + bLngTop) / 2 + 17, 'text-anchor': 'middle', fill: '#C9B9FF', 'font-family': 'Geist Mono, monospace', 'font-size': F(15) }, '+143%'));
    s.appendChild(mv);

    host.appendChild(s);
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.disconnect();
        qa('[data-grow]', s).forEach(function (r) {
          var p = r.getAttribute('data-grow').split('|');
          r.setAttribute('y', p[0]); r.setAttribute('height', p[1]);
        });
        qa('[data-fade]', s).forEach(function (n) { n.setAttribute('opacity', 1); });
      });
    }, { threshold: 0.25 });
    io.observe(host);

  })();

  /* --------------------------------------- chart: reported daily shortfall */

  (function () {
    var host = q('#chart-grid');
    if (!host) return;
    var W = 880, H = 430, m = { t: 46, r: 16, b: 54, l: 58 };
    var K = scaleK(host, W, H), F = function (v) { return Math.round(v * K * 10) / 10; };
    var s = svg(W, H);
    s.setAttribute('aria-label', 'Bar chart of national power shortfall by day in early August. 2,174 MW on 1 August, about 3,000 on 2 and 3 August, over 2,000 on 4 August, 335 on 6 August, 740 on 7 August, 2,167 on 8 August, about 3,000 on 9 August, 3,750 on 10 August. No figure was reported for 5 August.');

    var DAY = 864e5, d0 = Date.parse('2026-08-01'), d1 = Date.parse('2026-08-10');
    var SF = DATA.shortfall.filter(function (d) { return Date.parse(d.d) >= d0; });
    var n = Math.round((d1 - d0) / DAY) + 1;
    var slot = (W - m.l - m.r) / n;
    var idx = function (d) { return Math.round((Date.parse(d) - d0) / DAY); };
    var cx = function (i) { return m.l + i * slot + slot / 2; };
    var y = function (v) { return H - m.b - v / 4000 * (H - m.t - m.b); };
    var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var EASE = 'cubic-bezier(.22,1,.36,1)';

    var defs = el('defs');
    var pat = el('pattern', { id: 'appxhatch', width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
    pat.appendChild(el('rect', { width: 6, height: 6, fill: 'rgba(229,121,63,.14)' }));
    pat.appendChild(el('line', { x1: 0, y1: 0, x2: 0, y2: 6, stroke: '#E5793F', 'stroke-width': 2, opacity: 0.55 }));
    defs.appendChild(pat);
    s.appendChild(defs);

    [0, 1000, 2000, 3000, 4000].forEach(function (v) {
      s.appendChild(el('line', { x1: m.l, y1: y(v), x2: W - m.r, y2: y(v), stroke: v ? '#2C2620' : '#4A4137', 'stroke-width': 1 }));
      s.appendChild(el('text', { x: m.l - 10, y: y(v) + F(3.6), 'text-anchor': 'end', fill: '#918878', 'font-family': 'Geist Mono, monospace', 'font-size': F(10.5) }, group(v)));
    });
    s.appendChild(el('text', { x: m.l - 10, y: m.t - 22, 'text-anchor': 'end', fill: '#918878', 'font-family': 'Geist Mono, monospace', 'font-size': F(10) }, 'MW'));

    var have = {};
    SF.forEach(function (d) { have[idx(d.d)] = 1; });
    for (var i = 0; i < n; i++) {
      var dt = new Date(d0 + i * DAY);
      if (!have[i]) s.appendChild(el('line', { x1: cx(i), y1: H - m.b, x2: cx(i), y2: H - m.b - 7, stroke: '#4A4137', 'stroke-width': 1.5 }));
      if (i % 3 === 0) s.appendChild(el('text', { x: cx(i), y: H - m.b + F(19), 'text-anchor': 'middle', fill: '#918878', 'font-family': 'Geist Mono, monospace', 'font-size': F(10.5) }, dt.getUTCDate() + ' ' + MON[dt.getUTCMonth()]));
    }

    var bw = Math.min(slot * 0.5, 40);
    SF.forEach(function (d, k) {
      var i2 = idx(d.d), top = y(d.v), appx = d.s !== 'reported', g = el('g');
      g.appendChild(el('rect', {
        x: cx(i2) - bw / 2, y: top, width: bw, height: (H - m.b) - top,
        fill: appx ? 'url(#appxhatch)' : '#E5793F', stroke: appx ? '#E5793F' : 'none', 'stroke-width': appx ? 1.2 : 0
      }));
      g.appendChild(el('text', { x: cx(i2), y: top - F(10), 'text-anchor': 'middle', fill: '#F5F2EA', 'font-family': 'Geist Mono, monospace', 'font-size': F(11.5) }, group(d.v)));
      if (!REDUCED) {
        g.style.opacity = 0;
        g.style.transform = 'translateY(14px)';
        g.style.transition = 'opacity 400ms ' + EASE + ' ' + (k * 55) + 'ms, transform 520ms ' + EASE + ' ' + (k * 55) + 'ms';
        g.setAttribute('data-pop', '1');
      }
      s.appendChild(g);
    });

    host.appendChild(s);
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.disconnect();
        qa('[data-pop]', s).forEach(function (g) { g.style.opacity = 1; g.style.transform = 'none'; });
      });
    }, { threshold: 0.2 });
    io.observe(host);

  })();

  /* ------------------------------------------------- chart: tariff lanes */

  (function () {
    var host = q('#chart-lanes');
    if (!host) return;
    var lanes = DATA.lanes;
    // narrow screens get the lane name stacked above its track instead of a
    // left gutter, so the type never has to shrink to fit
    var NARROWL = (host.clientWidth || 900) < 640;
    var W = NARROWL ? 400 : 760;
    var laneH = NARROWL ? 104 : 78;
    var top = NARROWL ? 30 : 34;
    var H = top + lanes.length * laneH + 30;
    var m = NARROWL ? { l: 6, r: 46 } : { l: 150, r: 96 };
    var K = scaleK(host, W, H), F = function (v) { return Math.round(v * K * 10) / 10; };
    var s = svg(W, H, 'lanes');
    s.setAttribute('aria-label', 'Five stepped price lanes, March to August 2026. Diesel, octane, LPG, autogas and retail electricity. LPG rises to a peak in April, falls to a trough in July, then turns up in August.');
    var t0 = Date.parse('2026-03-01'), t1 = Date.parse('2026-08-12');
    var X = function (d) { return m.l + (Date.parse(d) - t0) / (t1 - t0) * (W - m.l - m.r); };

    ['2026-03-01', '2026-04-01', '2026-05-01', '2026-06-01', '2026-07-01', '2026-08-01'].forEach(function (d, di) {
      s.appendChild(el('line', { x1: X(d), y1: top - 12, x2: X(d), y2: H - 26, stroke: '#3B3329', 'stroke-width': 1, opacity: 0.7 }));
      if (NARROWL && di % 2) return;
      s.appendChild(el('text', { x: X(d), y: top - 18, 'text-anchor': 'middle', fill: '#918878', 'font-family': 'Geist Mono, monospace', 'font-size': F(10) },
        ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'][(new Date(d)).getUTCMonth() - 2]));
    });

    lanes.forEach(function (lane, li) {
      var nameH = NARROWL ? 34 : 0;
      var yTop = top + li * laneH + nameH, inner = laneH - 26 - nameH;
      var Y = function (v) { return yTop + inner - (v - lane.dom[0]) / (lane.dom[1] - lane.dom[0]) * inner; };
      s.appendChild(el('line', { x1: m.l, y1: yTop + inner + 8, x2: W - m.r, y2: yTop + inner + 8, stroke: '#3B3329', 'stroke-width': 1 }));
      if (NARROWL) {
        s.appendChild(el('text', { x: m.l, y: yTop - 20, fill: '#F5F2EA', 'font-family': 'Geist, sans-serif', 'font-size': F(12.5) }, lane.name));
        s.appendChild(el('text', { x: m.l, y: yTop - 7, fill: '#918878', 'font-family': 'Geist Mono, monospace', 'font-size': F(10) }, lane.unit));
      } else {
        s.appendChild(el('text', { x: 0, y: yTop + 12, fill: '#F5F2EA', 'font-family': 'Geist, sans-serif', 'font-size': 12.5 }, lane.name));
        s.appendChild(el('text', { x: 0, y: yTop + 28, fill: '#918878', 'font-family': 'Geist Mono, monospace', 'font-size': 10 }, lane.unit));
      }

      var d = '';
      lane.pts.forEach(function (p, i) {
        var px = X(p[0]), py = Y(p[1]);
        if (i === 0) d += 'M' + px + ' ' + py;
        else d += ' L' + px + ' ' + Y(lane.pts[i - 1][1]) + ' L' + px + ' ' + py;
      });
      d += ' L' + X('2026-08-12') + ' ' + Y(lane.pts[lane.pts.length - 1][1]);
      var path = el('path', { d: d, class: 'step', stroke: lane.color });
      s.appendChild(path);
      var L = 900; try { L = path.getTotalLength(); } catch (e) {}
      path.style.setProperty('--len', L);

      lane.pts.forEach(function (p, i) {
        if (i === lane.pts.length - 1 && lane.pts.length > 1 && p[1] === lane.pts[i - 1][1]) return;
        var px = X(p[0]), py = Y(p[1]);
        s.appendChild(el('circle', { cx: px, cy: py, r: 3.4, fill: lane.color }));
        var mk = lane.marks && lane.marks[p[0]];
        var lbl = (p[1] % 1 === 0 ? p[1] : p[1].toFixed(2));
        var t = el('text', { x: px + 6, y: py - 6, fill: mk ? '#F98A80' : '#F5F2EA', 'font-family': 'Geist Mono, monospace', 'font-size': F(10.5) }, (mk && !NARROWL) ? lbl + ' ' + mk : lbl);
        // trailing labels read leftward so they cannot run off the right edge,
        // but never the first point, whose label would then leave the frame
        if (i > 0 && (i === lane.pts.length - 2 || i === lane.pts.length - 1)) { t.setAttribute('text-anchor', 'end'); t.setAttribute('x', px - 6); }
        s.appendChild(t);
      });
    });

    // 18 April annotation
    var ax = X('2026-04-18');
    s.appendChild(el('line', { x1: ax, y1: top - 12, x2: ax, y2: H - 26, stroke: '#F2665F', 'stroke-width': 1.2, 'stroke-dasharray': '4 4' }));
    var an = el('text', { x: ax + 6, y: H - 10, fill: '#F98A80', 'font-family': 'Geist Mono, monospace', 'font-size': F(10) }, NARROWL ? '18 Apr' : '18 Apr, Brent down 9% to $90');
    if (NARROWL) { an.setAttribute('text-anchor', 'middle'); an.setAttribute('x', ax); }
    s.appendChild(an);

    host.appendChild(s);
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { io.disconnect(); s.classList.add('in'); } });
    }, { threshold: 0.2 });
    io.observe(host);

    var rows = [];
    lanes.forEach(function (l) { l.pts.forEach(function (p) { rows.push([l.name, p[0], p[1]]); }); });
  })();

  /* --------------------------------------------------- pressure ladder */

  (function () {
    var host = q('#psi');
    if (!host) return;
    var MAX = 36;
    var pc = function (v) { return Math.max(0, Math.min(100, v / MAX * 100)); };
    var one = function (v) { return String(Math.round(v * 10) / 10); };
    var num = function (a) { return a[0] === a[1] ? one(a[0]) : one(a[0]) + '\u2013' + one(a[1]); };

    var ax = document.createElement('div');
    ax.className = 'psi-axis';
    ax.innerHTML = '<span class="pu">Sector</span><div class="pa">' +
      [0, 10, 20, 30].map(function (v) { return '<i style="left:' + pc(v) + '%">' + v + '</i>'; }).join('') +
      '</div><span class="pu">PSI, delivered of needed</span>';
    host.appendChild(ax);

    DATA.psi.forEach(function (g, k) {
      var row = document.createElement('div');
      row.className = 'psi-row';
      row.style.setProperty('--c', g.color);
      row.style.setProperty('--w', pc(g.del[0]) + '%');
      row.style.setProperty('--w2', (pc(g.del[1]) - pc(g.del[0])) + '%');
      /* a sector that never stated its requirement gets no marker at all,
         rather than a marker at zero, which would read as needing nothing */
      var needW = g.req ? pc(g.req[1]) - pc(g.req[0]) : 0;
      var need = g.req
        ? '<span class="need' + (needW > 0.4 ? ' band' : '') + '" style="left:' + pc(g.req[0]) + '%;width:' + Math.max(0, needW) + '%"><b>needed</b></span>'
        : '';
      row.innerHTML =
        '<div class="psi-lab"><b>' + g.sec + '</b><span>' + g.ent + '</span></div>' +
        '<div class="psi-track"><i class="got"></i><i class="soft"></i>' + need + '</div>' +
        '<div class="psi-num"><b>' + num(g.del) + '</b><span>' + (g.req ? 'of ' + num(g.req) + ' needed' : 'requirement not stated') + '</span></div>';
      host.appendChild(row);
      if (REDUCED) { row.className += ' in'; return; }
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          io.disconnect();
          setTimeout(function () { row.className += ' in'; }, Math.min(k, 8) * 70);
        });
      }, { threshold: 0.35 });
      io.observe(row);
    });

  })();

  /* ---------------------------------------------------- plant glyphs */

  (function () {
    var host = q('#plants');
    if (!host) return;
    var off = [true, true, true, true, true, false, false];
    off.forEach(function (isOff, i) {
      var d = document.createElement('div');
      d.className = 'plant' + (isOff ? ' off' : '');
      var s = svg(48, 48);
      s.setAttribute('aria-hidden', 'true');
      var col = isOff ? '#F2665F' : '#4FD6C4';
      s.appendChild(el('rect', { x: 6, y: 22, width: 36, height: 20, fill: '#241F18', stroke: col, 'stroke-width': 1.4 }));
      s.appendChild(el('rect', { x: 12, y: 8, width: 8, height: 14, fill: '#241F18', stroke: col, 'stroke-width': 1.4 }));
      s.appendChild(el('rect', { x: 26, y: 13, width: 8, height: 9, fill: '#241F18', stroke: col, 'stroke-width': 1.4 }));
      if (isOff) {
        s.appendChild(el('line', { x1: 4, y1: 44, x2: 44, y2: 6, stroke: '#F2665F', 'stroke-width': 2 }));
      } else {
        s.appendChild(el('path', { d: 'M16 8 q3 -5 0 -8', fill: 'none', stroke: col, 'stroke-width': 1.4, opacity: 0.8 }));
      }
      d.appendChild(s);
      var p = document.createElement('div'); p.className = 'pl'; p.textContent = isOff ? 'shut' : 'running';
      d.appendChild(p);
      host.appendChild(d);
    });
    var cap = document.createElement('p');
    cap.className = 'note';
    cap.style.marginTop = '14px';
    cap.style.flexBasis = '100%';
    cap.textContent = 'Five of seven state fertiliser plants shut between 4 March and 28 June.';
    host.appendChild(cap);
  })();

  /* --------------------------------------------------- outage hours strip */

  (function () {
    var host = q('#strip');
    if (!host) return;
    function row(d) {
      var r = document.createElement('div');
      r.className = 'srow';
      var isPct = d.pct != null;
      r.innerHTML =
        '<span class="loc">' + d.loc + '</span>' +
        '<span class="tr' + (isPct ? ' alt' : '') + '" style="--w:' + (isPct ? d.pct : d.h / 16 * 100).toFixed(1) + '%"><i></i></span>' +
        '<span class="v">' + d.v + '</span>';
      return r;
    }
    DATA.strip.filter(function (d) { return d.h != null; }).forEach(function (d) { host.appendChild(row(d)); });
    var hdr = document.createElement('div');
    hdr.className = 'srow';
    hdr.style.background = 'var(--cove-800)';
    hdr.innerHTML = '<span class="loc mono" style="font-size:11px;letter-spacing:.1em;color:var(--text-tertiary);text-transform:uppercase">Share of demand met</span><span class="v mono" style="font-size:11px;color:var(--text-tertiary)">a different measure, not on the hours scale</span>';
    host.appendChild(hdr);
    DATA.strip.filter(function (d) { return d.pct != null; }).forEach(function (d) { host.appendChild(row(d)); });
  })();

  /* ------------------------------------------------------- causal chain */

  (function () {
    var host = q('#chain');
    if (!host) return;
    var wrap = q('#chain-wrap');
    var ALT = 'Causal chain from the war in February to load shedding and pressure collapse in August.';

    var TXT = {
      n1: { t: ['War, 28 February'] },
      n2: { t: ['Domestic gas decline,', 'seven years'] },
      n3: { t: ['FSRU fire, 21 July'], acc: 1 },
      n6: { t: ['Hormuz restricted'] },
      n7: { t: ['LNG share rises to', 'about 37 percent'] },
      n8: { t: ['450 MMcfd lost'], acc: 1 },
      n10: { t: ['Qatar halves deliveries'] },
      n11: { t: ['Spot dependence rises'] },
      n12: { t: ['Two terminal dependency'] },
      n13: { t: ['Supply 2,620 to 2,170'] },
      n14: { t: ['57 percent of', 'demand met'], acc: 1 },
      n15: { t: ['Gas to power 900 to 650'] },
      n16: { t: ['Gas generation', '5,200 to 3,500 MW'] },
      n17: { t: ['Furnace oil substitution'] },
      n18: { t: ['Load shedding', 'over 3,000 MW'] },
      n19: { t: ['Industrial pressure collapse'] },
      n20: { t: ['CNG pressure collapse'] },
      n21: { t: ['Household pressure collapse'] }
    };

    /* wide layout: five columns as [x, width], and [column, y, height] per box */
    var COL = { l1: [4, 176], l2: [222, 182], l3: [446, 190], l4: [676, 178], l5: [886, 230] };
    var GEO = {
      n1: ['l1', 30, 42], n2: ['l1', 108, 54], n3: ['l1', 268, 42],
      n6: ['l2', 30, 42], n7: ['l2', 108, 54], n8: ['l2', 268, 42],
      n10: ['l3', 16, 42], n11: ['l3', 72, 42], n12: ['l3', 134, 42], n13: ['l3', 268, 42],
      n14: ['l4', 268, 42],
      n15: ['l5', 130, 40], n16: ['l5', 184, 40], n17: ['l5', 250, 40], n18: ['l5', 304, 40],
      n19: ['l5', 394, 40], n20: ['l5', 448, 40], n21: ['l5', 502, 40]
    };

    var LINKS = [
      ['n1', 'n6'], ['n6', 'n10'], ['n6', 'n11'],
      ['n2', 'n7'], ['n7', 'n12'], ['n12', 'n13', 'v'],
      ['n3', 'n8'], ['n8', 'n13'], ['n13', 'n14'],
      ['n14', 'n15'], ['n14', 'n19'], ['n14', 'n20'], ['n14', 'n21'],
      ['n15', 'n16', 'v'], ['n16', 'n17', 'v'], ['n17', 'n18', 'v']
    ];

    /* reading order for the stacked layout, ordered so that all but five links
       are a straight drop into the box below */
    var ORDER = ['n1', 'n6', 'n10', 'n11', 'n2', 'n7', 'n12', 'n3', 'n8', 'n13',
                 'n14', 'n15', 'n16', 'n17', 'n18', 'n19', 'n20', 'n21'];

    function link(g, d, i) {
      var p = el('path', { d: d, class: 'lk' });
      p.setAttribute('data-order', i);
      g.appendChild(p);
    }
    function arrow(g, x, y, down, i) {
      var p = el('path', {
        d: down ? 'M' + (x - 4) + ' ' + (y - 7) + ' l4 6 l4 -6'
                : 'M' + (x - 8) + ' ' + (y - 4) + ' l7 4 l-7 4',
        fill: 'none', stroke: '#918878', 'stroke-width': 1.5, class: 'lk'
      });
      p.setAttribute('data-order', i);
      g.appendChild(p);
    }
    function boxes(s, N) {
      Object.keys(N).forEach(function (k) {
        var n = N[k], g = el('g', {});
        g.appendChild(el('rect', { x: n.x, y: n.y, width: n.w, height: n.h, class: 'box' + (n.acc ? ' acc' : '') }));
        n.t.forEach(function (row, i) {
          var ty = n.y + n.h / 2 + (i - (n.t.length - 1) / 2) * 14 + 4.5;
          g.appendChild(el('text', { x: n.x + 12, y: ty, class: 'nd' + (n.t.length > 1 ? ' sm' : '') }, row));
        });
        s.appendChild(g);
      });
    }

    function buildWide() {
      var s = svg(1120, 580, 'chain');
      s.setAttribute('aria-label', ALT);
      var N = {};
      Object.keys(GEO).forEach(function (k) {
        var g = GEO[k], c = COL[g[0]];
        var n = { x: c[0], w: c[1], y: g[1], h: g[2], t: TXT[k].t, acc: TXT[k].acc };
        n.cy = n.y + n.h / 2; n.cx = n.x + n.w / 2;
        N[k] = n;
      });
      var lg = el('g', {});
      s.appendChild(lg);
      LINKS.forEach(function (L, i) {
        var a = N[L[0]], b = N[L[1]], vert = L[2] === 'v', d;
        if (vert) d = 'M' + a.cx + ' ' + (a.y + a.h) + ' V' + b.y;
        else {
          var x1 = a.x + a.w, mid = x1 + (b.x - x1) * 0.5;
          d = 'M' + x1 + ' ' + a.cy + ' H' + mid + ' V' + b.cy + ' H' + b.x;
        }
        link(lg, d, i);
        arrow(lg, vert ? b.cx : b.x, vert ? b.y : b.cy, vert, i);
      });
      boxes(s, N);
      return s;
    }

    /* stacked layout, used wherever the wide one would need a horizontal
       scrollbar. One box per row at close to 1:1 scale, so the type stays the
       size it was authored at, and every link that is not a straight drop
       takes its own lane in the left gutter. */
    function buildTall(avail) {
      var W = Math.max(300, Math.min(680, avail));
      var GUT = 30, BW = W - GUT - 6, BH = 40, GAP = 18;
      var N = {}, y = 6;
      ORDER.forEach(function (k, i) {
        N[k] = {
          x: GUT, w: BW, y: y, h: BH, i: i, cx: GUT + BW / 2, cy: y + BH / 2,
          t: [TXT[k].t.join(' ')], acc: TXT[k].acc
        };
        y += BH + GAP;
      });
      var s = svg(W, y - GAP + 6, 'chain');
      s.setAttribute('aria-label', ALT);
      var lg = el('g', {});
      s.appendChild(lg);
      var lanes = {};
      LINKS.forEach(function (L, i) {
        var a = N[L[0]], b = N[L[1]];
        if (b.i === a.i + 1) {
          var x = GUT + 26;
          link(lg, 'M' + x + ' ' + (a.y + a.h) + ' V' + b.y, i);
          arrow(lg, x, b.y, 1, i);
        } else {
          var n = lanes[L[0]] = (lanes[L[0]] || 0) + 1;
          var gx = [22, 14.5, 7][(n - 1) % 3];
          link(lg, 'M' + a.x + ' ' + a.cy + ' H' + gx + ' V' + b.cy + ' H' + b.x, i);
          arrow(lg, b.x, b.cy, 0, i);
        }
      });
      boxes(s, N);
      return s;
    }

    var shown = false;
    function reveal(s) {
      var links = qa('.lk', s);
      if (REDUCED || shown) {
        links.forEach(function (l) { l.classList.add('on'); });
        return;
      }
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          io.disconnect();
          shown = true;
          links.forEach(function (l) {
            var o = parseInt(l.getAttribute('data-order') || '0', 10);
            setTimeout(function () { l.classList.add('on'); }, 100 + Math.min(o, 13) * 85);
          });
        });
      }, { threshold: 0.12 });
      io.observe(host);
    }

    var tall = null;
    function render() {
      var avail = Math.round((wrap || host).clientWidth || 360);
      var want = avail < 900;
      if (want === tall) return;
      tall = want;
      host.innerHTML = '';
      host.style.aspectRatio = want ? 'auto' : '1120 / 580';
      if (wrap) wrap.classList.toggle('vert', want);
      var s = want ? buildTall(avail) : buildWide();
      s.removeAttribute('width');
      s.style.width = '100%';
      s.style.height = 'auto';
      host.appendChild(s);
      reveal(s);
    }
    render();
    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(render, 200);
    }, { passive: true });
  })();

  /* ------------------------------------------------------- FSRU stepper */

  (function () {
    var steps = qa('#fsru-steps .ss-step');
    var fsru = q('#fsru');
    if (!steps.length || !fsru) return;
    var carrier = q('#carrier', fsru), ign = q('#ignition', fsru),
        flow = q('#pipeFlow', fsru), split = q('#gridsplit', fsru),
        gsGas = q('#gsGas', fsru), gsOil = q('#gsOil', fsru),
        kSupply = q('#kSupply'), kMet = q('#kMet'), kNote = q('#kNote');
    var FL = 320; try { FL = flow.getTotalLength(); } catch (e) {}
    flow.setAttribute('stroke-dasharray', FL);
    flow.setAttribute('stroke-dashoffset', 0);
    flow.style.transition = REDUCED ? 'none' : 'stroke-dashoffset 520ms cubic-bezier(.4,0,.2,1)';
    gsOil.removeAttribute('transform');

    var costTxt = el('text', { x: 330, y: 26, class: 'vl', 'text-anchor': 'middle', fill: '#F98A80', 'font-family': 'Geist Mono, monospace', 'font-size': 12, opacity: 0 }, 'Tk 90cr a day on oil against Tk 31cr on gas');
    costTxt.style.transition = 'opacity 400ms ease-out';
    fsru.appendChild(costTxt);

    var fired = false;
    function apply(state) {
      var afterFail = ['drop', 'gap', 'grid', 'cost'].indexOf(state) >= 0;
      carrier.setAttribute('transform', state === 'berth' ? 'translate(0,0)' : 'translate(88,0)');
      ign.classList.toggle('on', state !== 'berth');
      var ring = q('.ig-ring', ign);
      if (state !== 'berth' && !fired && !REDUCED) { fired = true; ring.classList.add('fire'); }
      flow.setAttribute('stroke-dashoffset', ['valve', 'drop', 'gap', 'grid', 'cost'].indexOf(state) >= 0 ? FL : 0);
      split.classList.toggle('on', state === 'grid' || state === 'cost');
      if (state === 'grid' || state === 'cost') {
        gsGas.setAttribute('width', 85); gsOil.setAttribute('x', 605); gsOil.setAttribute('width', 41);
      } else {
        gsGas.setAttribute('width', 126); gsOil.setAttribute('width', 0);
      }
      costTxt.setAttribute('opacity', state === 'cost' ? 1 : 0);
      kSupply.textContent = afterFail ? '2,170' : '2,620';
      kMet.textContent = afterFail ? '57%' : '69%';
      if (kNote) {
        kNote.textContent = state === 'gap'
          ? 'MMcfd. The gap is 1,630, derived as 3,800 minus 2,170.'
          : (state === 'grid' || state === 'cost')
            ? 'MMcfd. Gas generation 5,200 down to 3,500 MW. Oil fills part of it.'
            : 'MMcfd. Demand marker was already far above supply before the failure.';
      }
    }
    apply('berth');
    trackSteps(steps, function (el) { apply(el.getAttribute('data-state')); });
  })();

  /* -------------------------------------- generic sticky split observer */

  (function () {
    qa('.sticky-split').forEach(function (root) {
      if (root.id === 'ss-fsru') return;
      trackSteps(qa('.ss-step', root));
    });
  })();

  /* ------------------------------------------------------------- ribbon */

  function buildRibbon() {
    var host = q('#ribbon');
    if (!host) return;
    host.innerHTML = '';
    var docH = document.documentElement.scrollHeight;
    if (!docH) return;
    var anchors = [
      ['#start', 2620, '2,620'],
      ['#ch1', 2620, null],
      ['#ch2', 2620, null],
      ['#ss-fsru', 2170, '2,170'],
      ['#ch3', 2170, null],
      ['#ch4', 2170, null],
      ['#ch5', 2170, null],
      ['#coda', 2350, '2,350']
    ];
    var scale = function (v) { return 18 + (v - 2000) / (3900 - 2000) * 200; };
    var pts = [];
    anchors.forEach(function (a) {
      var n = q(a[0]);
      if (!n) return;
      var top = n.getBoundingClientRect().top + window.pageYOffset;
      pts.push({ y: Math.max(0, Math.min(1, top / docH)), v: a[1], lbl: a[2] });
    });
    if (pts.length < 2) return;
    pts.push({ y: 1, v: pts[pts.length - 1].v, lbl: null });

    var s = el('svg', { viewBox: '0 0 240 1000', preserveAspectRatio: 'none' });
    var d = 'M' + scale(pts[0].v).toFixed(1) + ' 0';
    for (var i = 1; i < pts.length; i++) {
      var p0 = pts[i - 1], p1 = pts[i];
      var y0 = p0.y * 1000, y1 = p1.y * 1000;
      if (p0.v === p1.v) d += ' L' + scale(p1.v).toFixed(1) + ' ' + y1.toFixed(1);
      else {
        var cy = (y0 + y1) / 2;
        d += ' C' + scale(p0.v).toFixed(1) + ' ' + cy.toFixed(1) + ' ' + scale(p1.v).toFixed(1) + ' ' + cy.toFixed(1) + ' ' + scale(p1.v).toFixed(1) + ' ' + y1.toFixed(1);
      }
    }
    s.appendChild(el('path', { d: d, fill: 'none', stroke: '#918878', 'stroke-width': 2, opacity: 0.3, 'vector-effect': 'non-scaling-stroke' }));
    s.appendChild(el('line', { x1: scale(3800), y1: 0, x2: scale(3800), y2: 1000, stroke: '#918878', 'stroke-width': 1, 'stroke-dasharray': '6 7', opacity: 0.18, 'vector-effect': 'non-scaling-stroke' }));
    host.appendChild(s);

    var dl = document.createElement('div');
    dl.className = 'ribbon-tick';
    dl.style.top = '13%';
    dl.style.right = (240 - scale(3800) + 8) + 'px';
    dl.style.textAlign = 'left';
    dl.innerHTML = 'demand<b>3,800</b>';
    host.appendChild(dl);

    pts.forEach(function (p) {
      if (!p.lbl) return;
      var t = document.createElement('div');
      t.className = 'ribbon-tick';
      t.style.top = (p.y * 100).toFixed(2) + '%';
      t.style.right = (240 - scale(p.v) + 10) + 'px';
      t.style.textAlign = 'left';
      t.innerHTML = 'supply<b>' + p.lbl + '</b>';
      host.appendChild(t);
    });
  }

  (function () {
    qa('.ribbon-inline').forEach(function (n) {
      var v = parseFloat(n.getAttribute('data-supply'));
      var f = q('.fill', n), dm = q('.dem', n);
      var pct = v / 3900 * 100;
      f.style.width = '0%';
      dm.style.left = (3800 / 3900 * 100) + '%';
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          io.disconnect();
          f.style.transition = REDUCED ? 'none' : 'width 700ms cubic-bezier(.22,1,.36,1)';
          f.style.width = pct.toFixed(1) + '%';
        });
      }, { threshold: 0.4 });
      io.observe(n);
    });
  })();

  /* --------------------------------------------------------------- bloom */

  (function () {
    var bloom = q('#bloom');
    if (!bloom) return;
    var io = new IntersectionObserver(function (es) {
      var any = es.some(function (e) { return e.isIntersecting; });
      if (any) bloom.classList.add('on');
      else if (es.every(function (e) { return !e.isIntersecting; })) bloom.classList.remove('on');
    }, { threshold: 0.05 });
    ['#ch3', '#ch4'].forEach(function (sel) { var n = q(sel); if (n) io.observe(n); });
  })();

  /* ------------------------------------------------- progress fallback */

  (function () {
    var bar = q('#progress');
    if (!bar) return;
    var supported = window.CSS && CSS.supports && CSS.supports('animation-timeline', 'scroll()');
    if (supported && !REDUCED) return;
    var h = 1, queued = false;
    function measure() { h = Math.max(1, document.documentElement.scrollHeight - window.innerHeight); }
    function paint() {
      queued = false;
      bar.style.transform = 'scaleX(' + Math.min(1, window.pageYOffset / h) + ')';
    }
    function onScroll() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(paint);
    }
    measure();
    paint();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function () { measure(); onScroll(); }, { passive: true });
  })();

  /* ------------------------------------------------------------------ maps */

  var TILE = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
  var ATTR = '&copy; OpenStreetMap contributors &copy; CARTO';
  /* Maxar high-resolution imagery, served through the Esri World Imagery
     service. Used where the ground itself carries the point. */
  var SAT = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
  var SAT_ATTR = 'Imagery &copy; Esri, Maxar, Earthstar Geographics';

  function baseMap(id, opts, tile) {
    var lock = NARROW();
    var sat = !!(tile && tile.sat);
    var m = L.map(id, Object.assign({
      zoomControl: !lock,
      scrollWheelZoom: false,
      dragging: !lock,
      touchZoom: !lock,
      doubleClickZoom: !lock,
      boxZoom: false,
      keyboard: !lock,
      attributionControl: true
    }, opts || {}));
    if (sat) {
      var hostEl = document.getElementById(id);
      if (hostEl) hostEl.className += ' map-sat';
    }
    L.tileLayer(sat ? SAT : TILE, {
      attribution: sat ? SAT_ATTR : ATTR, subdomains: sat ? [] : 'abcd',
      maxZoom: (tile && tile.maxZoom) || (sat ? 16 : 12), minZoom: 2,
      detectRetina: false, updateWhenIdle: true, keepBuffer: 1, crossOrigin: !sat
    }).addTo(m);
    return m;
  }
  var POPUP = {
    autoPanPaddingTopLeft: [70, 30], autoPanPaddingBottomRight: [30, 60],
    closeButton: true, maxWidth: 260
  };
  function label(m, latlng, text, sub, cls, opt) {
    opt = opt || {};
    var side = opt.side === 'left';
    var html = '<span class="mlabel ' + (cls || '') + (side ? ' rt' : '') + '">' + text +
      (sub ? '<span class="sm">' + sub + '</span>' : '') + '</span>';
    return L.marker(latlng, {
      interactive: false,
      icon: L.divIcon({
        className: 'mpin' + (side ? ' mpin-left' : ''),
        html: html, iconSize: [1, 1],
        iconAnchor: [(side ? 10 : -10) - (opt.dx || 0), 8 - (opt.dy || 0)]
      })
    }).addTo(m);
  }

  /* the sea route. every waypoint is open water. it goes around India and
     south of Sri Lanka because that is where ships actually go. */
  var ROUTE = [
    [25.90, 51.55], [26.05, 52.60], [26.35, 53.80], [26.58, 55.20], [26.60, 56.35],
    [26.45, 56.55], [25.70, 57.20], [24.60, 58.60], [23.60, 60.20], [22.20, 61.80],
    [20.40, 63.40], [18.20, 65.20], [15.60, 67.60], [12.80, 70.20], [10.20, 72.20],
    [8.20, 74.20], [6.60, 76.40], [5.60, 78.60], [5.30, 80.60], [5.80, 82.60],
    [7.60, 84.60], [10.20, 86.60], [13.20, 88.40], [16.20, 90.00], [18.60, 90.90],
    [20.40, 91.40], [21.20, 91.72], [21.48, 91.83]
  ];

  var HORMUZ_IDX = 5;

  function mapHormuz() {
    var m = baseMap('map1', {});
    var bounds = L.latLngBounds([[3.0, 48.0], [30.5, 95.0]]);
    m.fitBounds(bounds, { padding: [24, 24] });

    var west = ROUTE.slice(0, HORMUZ_IDX + 1);
    var east = ROUTE.slice(HORMUZ_IDX);

    var pWest = L.polyline(west, { color: '#FFD98C', weight: 2.6, opacity: 0.95, lineJoin: 'round' }).addTo(m);
    var pEast = L.polyline(east, { color: '#FFD98C', weight: 2.6, opacity: 0.95, lineJoin: 'round' }).addTo(m);

    function draw(p) {
      if (REDUCED || !p._path) return;
      try {
        var L2 = p._path.getTotalLength();
        p._path.style.strokeDasharray = L2;
        p._path.style.strokeDashoffset = L2;
        p._path.style.transition = 'stroke-dashoffset 800ms cubic-bezier(.22,1,.36,1)';
        requestAnimationFrame(function () { p._path.style.strokeDashoffset = 0; });
      } catch (e) {}
    }
    draw(pWest); draw(pEast);

    var hormuz = L.circleMarker(ROUTE[HORMUZ_IDX], { radius: 8, color: '#F2665F', weight: 2, fillColor: '#F2665F', fillOpacity: 0.25 }).addTo(m);
    L.circleMarker(ROUTE[0], { radius: 6, color: '#FFD98C', weight: 2, fillColor: '#1B1712', fillOpacity: 1 }).addTo(m);
    L.circleMarker(ROUTE[ROUTE.length - 1], { radius: 6, color: '#FFD98C', weight: 2, fillColor: '#1B1712', fillOpacity: 1 }).addTo(m);

    label(m, ROUTE[0], 'Ras Laffan', 'QATAR, LOADING PORT', '', { side: 'left', dy: 4 });
    label(m, ROUTE[HORMUZ_IDX], 'Strait of Hormuz', 'ABOUT A FIFTH OF WORLD LNG', 'acc', { dy: -22 });
    label(m, ROUTE[ROUTE.length - 1], 'Moheshkhali', 'BANGLADESH, TWO FSRUs');
    label(m, [15.4, 83.0], 'BAY OF BENGAL', null);
    label(m, [14.0, 63.5], 'ARABIAN SEA', null);

    var aramco = null;
    var steps = qa('#map1-steps .map-step');
    var faceEl = q('#map1-block .map-face');
    var faces = [
      'Shipping lane drawn as a sea route through the Gulf of Oman, the Arabian Sea and the Bay of Bengal. It is not a straight line because ships cannot take one.',
      'East of Hormuz the lane is drawn faint. Fourteen Ras Laffan cargoes cleared the strait after the war began. None of them arrived here.',
      'Aramco Trading Singapore supplied one replacement cargo, at $21.55 per MMBtu for delivery on 11 to 12 August.'
    ];

    function go(i) {
      steps.forEach(function (b, j) { b.setAttribute('aria-current', j === i ? 'true' : 'false'); });
      if (faceEl) faceEl.textContent = faces[i];
      pEast.setStyle({ opacity: i >= 1 ? 0.15 : 0.95 });
      hormuz.setStyle({ fillOpacity: i >= 1 ? 0.75 : 0.25, radius: i >= 1 ? 10 : 8 });
      if (i === 2) {
        if (!aramco) {
          aramco = L.layerGroup([
            L.circleMarker([1.29, 103.85], { radius: 7, color: '#6BBDF2', weight: 2, fillOpacity: 0 })
          ]).addTo(m);
          label(m, [1.29, 103.85], 'Aramco Trading Singapore', '$21.55 PER MMBTU, 11-12 AUG');
        }
        m.flyToBounds(L.latLngBounds([[-3.0, 48.0], [30.5, 108.0]]), { padding: [24, 24], duration: REDUCED ? 0 : 0.7 });
      } else if (i === 1) {
        m.flyToBounds(L.latLngBounds([[19.0, 50.0], [30.0, 68.0]]), { padding: [24, 24], duration: REDUCED ? 0 : 0.7 });
      } else {
        m.flyToBounds(bounds, { padding: [24, 24], duration: REDUCED ? 0 : 0.7 });
      }
    }
    steps.forEach(function (b, i) { b.addEventListener('click', function () { go(i); }); });

    if (!REDUCED) {
      var active = -1;
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          var i = parseInt(e.target.getAttribute('data-mstep'), 10);
          if (i !== active) { active = i; go(i); }
        });
      }, { rootMargin: '-40% 0px -40% 0px', threshold: 0 });
      steps.forEach(function (b) { io.observe(b); });
    }

    var alt = document.createElement('p');
    alt.className = 'vh';
    alt.textContent = 'Map of the LNG sea route. It begins at Ras Laffan in Qatar, passes through the Strait of Hormuz, follows the Gulf of Oman and the Arabian Sea, passes west of the Lakshadweep islands, rounds the southern tip of India and Sri Lanka, crosses the Bay of Bengal, and ends at Moheshkhali in Bangladesh. The route does not cross land.';
    q('#map1-block').appendChild(alt);
  }

  function mapMoheshkhali() {
    var m = baseMap('map2', {}, { sat: 1, maxZoom: 15 });
    m.setView([21.51, 91.86], 11);
    var pts = [
      { ll: [21.45, 91.80], t: 'Excelerate FSRU', s: 'FAULT, 21 JULY. 450 MMCFD LOST', acc: 1 },
      { ll: [21.55, 91.76], t: 'Summit FSRU', s: 'THE OTHER HALF OF IMPORT CAPACITY' },
      { ll: [21.53, 91.865], t: 'Pipeline landfall', s: 'MOHESHKHALI ISLAND' },
      { ll: [21.43, 92.00], t: "Cox's Bazar", s: null }
    ];
    pts.forEach(function (p) {
      L.circleMarker(p.ll, {
        radius: p.acc ? 11 : 8, color: p.acc ? '#F2665F' : '#FFD98C', weight: 2,
        fillColor: p.acc ? '#F2665F' : '#1B1712', fillOpacity: p.acc ? 0.35 : 1
      }).addTo(m).bindPopup('<b>' + p.t + '</b>' + (p.s ? '<span class="pv">' + p.s + '</span>' : ''), POPUP);
      label(m, p.ll, p.t, p.s, p.acc ? 'acc' : '');
    });
    L.polyline([[21.45, 91.80], [21.49, 91.83], [21.53, 91.865]], { color: '#4FD6C4', weight: 2, dashArray: '5 5', opacity: 0.8 }).addTo(m);
    var alt = document.createElement('p');
    alt.className = 'vh';
    alt.textContent = "Map of Moheshkhali island off Cox's Bazar. The Excelerate floating terminal, where the fault occurred on 21 July, sits south west of the island. The Summit floating terminal sits to its north. A pipeline runs from the terminals to a landfall on the island. Terminal positions are indicative.";
    q('#map2-block').appendChild(alt);
  }

  function mapImpact() {
    var m = baseMap('map3', { zoomSnap: 0.25 });
    m.fitBounds(L.latLngBounds([[21.7, 88.3], [26.3, 92.4]]), { padding: [16, 16] });
    var pts = [
      { ll: [24.55, 88.83], n: 'Bagmara', h: 16, v: 'About 16 hours a day', c: 'C-069', s: '16 HOURS A DAY', lab: { dx: 4, dy: -46 } },
      { ll: [24.13, 90.57], n: 'Kapasia', h: 11, v: '10 to 12 hours a day', c: 'C-070', mute: 1 },
      { ll: [24.20, 90.47], n: 'Sreepur', h: 11, v: '10 to 12 hours a day', c: 'C-070', mute: 1 },
      { ll: [23.92, 90.57], n: 'Kaliganj', h: 11, v: '10 to 12 hours a day', c: 'C-070', mute: 1 },
      { ll: [24.07, 90.22], n: 'Kaliakair', h: 11, v: '10 to 12 hours a day', c: 'C-070', mute: 1 },
      { ll: [24.00, 89.24], n: 'Pabna', h: 9, v: '8 to 10 hours a day', c: 'C-071', s: '8 TO 10 HOURS', lab: { side: 'left', dy: 34 } },
      { ll: [23.0050, 89.8266], n: 'Gopalganj', h: 9, v: '8 to 10 hours a day', s: '8 TO 10 HOURS', lab: { dy: -22 } },
      { ll: [24.98, 90.32], n: 'Fulpur', h: 7, v: 'Over 7 hours in a day', c: 'C-072', s: 'OVER 7 HOURS', lab: { dy: -38 } },
      { ll: [22.82, 89.56], n: 'Khulna', h: 4, v: '3 to 5 hours a day', c: 'C-073', s: '3 TO 5 HOURS', lab: { dy: 10 } },
      { ll: [24.41, 89.00], n: 'Natore PBS-2', ring: 1, v: '35% OF DEMAND MET', c: 'C-074', s: '35% OF DEMAND MET', lab: { side: 'left', dx: -14, dy: 30 } },
      { ll: [24.15, 90.30], n: 'Mouchak and Bannara', ring: 1, v: '32 MW allocated against 70 MW needed', c: 'C-075', mute: 1 }
    ];
    pts.forEach(function (p) {
      var r = p.ring ? 9 : (p.mute ? 4 + Math.sqrt(p.h) * 2.5 : 4 + Math.sqrt(p.h) * 3.2);
      var mk = L.circleMarker(p.ll, p.ring
        ? { radius: r, color: '#6BBDF2', weight: 2, fillOpacity: 0, dashArray: '3 3' }
        : { radius: r, color: '#F2665F', weight: p.mute ? 1 : 1.5, fillColor: '#F2665F', fillOpacity: p.mute ? 0.18 : 0.32 }).addTo(m);
      mk.bindPopup('<b>' + p.n + '</b><span class="pv">' + p.v + '</span>', POPUP);
    });

    var alt = document.createElement('div');
    alt.className = 'vh';
    alt.innerHTML = '<p>Point map of reported outage figures in Bangladesh.</p><ul>' +
      pts.map(function (p) { return '<li>' + p.n + ': ' + p.v + '</li>'; }).join('') +
      '</ul><p>Absence of a marker means no figure was reported, not that supply was normal.</p>';
    q('#map3-block').appendChild(alt);
  }

  function mapChattogram() {
    var m = baseMap('map4', {}, { maxZoom: 13, sat: 1 });
    var wide = window.matchMedia('(min-width: 1024px)').matches;
    var b = L.latLngBounds([[21.95, 91.50], [22.90, 92.15]]);
    m.fitBounds(b, wide
      ? { paddingTopLeft: [Math.min(500, Math.round(window.innerWidth * 0.46)), 34], paddingBottomRight: [34, 34] }
      : { padding: [22, 22] });

    L.circle([22.36, 91.81], { radius: 23000, color: '#F2665F', weight: 1.4, dashArray: '4 6', fillColor: '#F2665F', fillOpacity: 0.10 }).addTo(m);
    L.circleMarker([22.36, 91.81], { radius: 7, color: '#F2665F', weight: 2, fillColor: '#F2665F', fillOpacity: 0.5 }).addTo(m);
    label(m, [22.36, 91.81], 'Chattogram', '2,987 MW GENERATED AT PEAK', 'acc', { dy: -20 });
    label(m, [22.24, 91.94], 'Karnaphuli franchise', 'ABOUT 100 MMCFD SHORT', '', { dy: 20 });

    var alt = document.createElement('p');
    alt.className = 'vh';
    alt.textContent = 'Map zoomed on Chattogram in south east Bangladesh, with the metropolitan area ringed. The city supplied 2,987 MW to the national grid at peak, was allocated 1,529 MW back, and had a local peak demand of 1,621 MW.';
    q('#map4-block').appendChild(alt);
  }

  function mapBeats() {
    var block = q('#map5-block');
    if (!block) return;
    var m = baseMap('map5', {}, { maxZoom: 14 });
    var STOPS = [
      { ll: [23.7085, 90.4360], d: 0.030, r: 1600, n: 'Gandaria', s: 'DHAKA' },
      { ll: [22.7000, 89.5200], d: 0.130, r: 5200, n: 'Batiaghata', s: 'KHULNA' },
      { ll: [23.4600, 91.1800], d: 0.110, r: 4600, n: 'Cumilla', s: null },
      { ll: [24.0700, 90.2200], d: 0.100, r: 4200, n: 'Kaliakair', s: 'GAZIPUR' }
    ];
    m.setView([23.55, 90.45], 7);
    setTimeout(function () { m.invalidateSize(); }, 80);

    var dots = STOPS.map(function (s2) {
      return L.circleMarker(s2.ll, { radius: 7, color: '#F2665F', weight: 1.6, fillColor: '#F2665F', fillOpacity: 0.18 }).addTo(m);
    });
    var halo = L.circle(STOPS[0].ll, { radius: STOPS[0].r, color: '#F98A80', weight: 1.2, dashArray: '3 5', fillColor: '#F2665F', fillOpacity: 0.08 }).addTo(m);
    STOPS.forEach(function (s2) { label(m, s2.ll, s2.n, s2.s, 'acc', { dy: -26 }); });

    var wide = window.matchMedia('(min-width: 900px)').matches;
    var steps = qa('#map5-block .ms-step');
    var cur = -1;

    function go(i) {
      if (i === cur || !STOPS[i]) return;
      cur = i;
      steps.forEach(function (st, j) { st.setAttribute('aria-current', j === i ? 'true' : 'false'); });
      var s2 = STOPS[i];
      dots.forEach(function (dt, j) { dt.setStyle({ fillOpacity: j === i ? 0.42 : 0.10, opacity: j === i ? 1 : 0.35 }); });
      halo.setLatLng(s2.ll);
      halo.setRadius(s2.r);
      var bb = L.latLngBounds([[s2.ll[0] - s2.d, s2.ll[1] - s2.d], [s2.ll[0] + s2.d, s2.ll[1] + s2.d]]);
      var opt = wide
        ? { paddingTopLeft: [Math.min(500, Math.round(window.innerWidth * 0.46)), 40], paddingBottomRight: [40, 40], maxZoom: 13 }
        : { paddingTopLeft: [20, 24], paddingBottomRight: [20, Math.round(window.innerHeight * 0.36)], maxZoom: 13 };
      if (REDUCED) { opt.animate = false; m.fitBounds(bb, opt); }
      else { opt.duration = 1.05; m.flyToBounds(bb, opt); }
    }

    block.className += ' ms-live';
    var pending = 0;
    function pick() {
      pending = 0;
      var mid = window.innerHeight / 2, best = -1, bestD = 1e9;
      steps.forEach(function (st, i) {
        var r = st.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) return;
        var d = Math.abs((r.top + r.bottom) / 2 - mid);
        if (d < bestD) { bestD = d; best = i; }
      });
      if (best >= 0) go(best);
    }
    var io = new IntersectionObserver(function () {
      if (!pending) pending = requestAnimationFrame(pick);
    }, { rootMargin: '-40% 0px -40% 0px', threshold: 0 });
    steps.forEach(function (st) { io.observe(st); });
    pick();

    var alt = document.createElement('p');
    alt.className = 'vh';
    alt.textContent = 'Map that moves between four places as the reader scrolls: Gandaria in Dhaka, Batiaghata in Khulna, Cumilla, and Kaliakair in Gazipur.';
    block.appendChild(alt);
  }

  /* ------------------------------------ gas and oil fields, February 2025 */

  var F_ST = {
    prod: { c: '#4FD6C4', l: 'Producing' },
    near: { c: '#FFD98C', l: 'Producing, near depletion' },
    susp: { c: '#A79C88', l: 'Suspended' },
    dep:  { c: '#F2665F', l: 'Depleted, abandoned' },
    disc: { c: '#6BBDF2', l: 'Discovered, not producing' },
    oil:  { c: '#E5793F', l: 'Oil field, abandoned' }
  };

  var FIELDS = [
    { n: 'Titas', ll: [23.95, 91.10], st: 'prod', dist: 'Brahmanbaria', up: 'Brahmanbaria Sadar', dy: '1962', db: 'Pakistan Shell Oil Company', py: '1968', giip: 9039, rec: 7582, cum: 5553.6, rem: 2028.4, fy: 129.05, note: 'Largest gas field by reserve, and the second-largest producer.' },
    { n: 'Habiganj', ll: [24.19, 91.42], st: 'near', dist: 'Habiganj', up: 'Madhabpur (Shahjibazar)', dy: '1963', db: 'Pakistan Shell Oil Company', py: '1968', giip: 3981, rec: 2787, cum: 2779.1, rem: 7.9, fy: 38.47, note: 'The reported remaining figure rests on a 2010-vintage estimate, yet the field still produces about 38 Bcf a year. The reserve base is being reassessed with 3D seismic.' },
    { n: 'Bibiyana', ll: [24.55, 91.68], st: 'prod', dist: 'Habiganj', up: 'Nabiganj', dy: '1998', db: 'Unocal and Occidental, now Chevron', py: '2007', giip: 8383, rec: 5755.4, cum: 6206.3, rem: 1320, est: 1, fy: 347.47, note: 'The top national producer, about half of all output. Petrobangla puts recoverable reserves at 7,666 Bcf; roughly 1.3 Tcf realistically remains.' },
    { n: 'Jalalabad', ll: [24.83, 91.83], st: 'prod', dist: 'Sylhet', up: 'Dakshin Surma', dy: '1989', db: 'Scimitar Oil, now Chevron', py: '1999', giip: 2716, rec: 1429.3, cum: 1690.6, rem: 650, est: 1, fy: 52.03, note: 'Cumulative output has passed the old recoverable estimate. Recent reporting puts what is left below about 700 Bcf.' },
    { n: 'Kailashtila', ll: [24.80, 91.98], st: 'prod', dist: 'Sylhet', up: 'Golapganj', dy: '1962', db: 'Pakistan Shell Oil Company', py: '1983', giip: 3463, rec: 2880, cum: 813, rem: 2067, fy: 14.89, note: 'A wet-gas field rich in condensate, with over 2 Tcf still recoverable.' },
    { n: 'Rashidpur', ll: [24.40, 91.62], st: 'prod', dist: 'Habiganj', up: 'Bahubal', dy: '1960', db: 'Pakistan Shell Oil Company', py: '1983', giip: 3887, rec: 3134, cum: 734.5, rem: 2399.5, fy: 25.17, note: 'One of the largest remaining balances in the country, about 2.4 Tcf.' },
    { n: 'Bakhrabad', ll: [23.52, 90.97], st: 'prod', dist: 'Cumilla', up: 'Muradnagar', dy: '1969', db: 'Shell Oil Company', py: '1984', giip: 1825, rec: 1387, cum: 890.4, rem: 496.6, fy: 10.24, note: 'Pressure fell rapidly after the 1990s peak.' },
    { n: 'Narsingdi', ll: [24.00, 90.75], st: 'prod', dist: 'Narsingdi', up: 'Shibpur', dy: '1990', db: 'Petrobangla (BGFCL)', py: '1996', giip: 405, rec: 345, cum: 257.5, rem: 87.5, fy: 8.19 },
    { n: 'Meghna', ll: [23.75, 90.78], st: 'prod', dist: 'Brahmanbaria', up: 'Bancharampur', dy: '1990', db: 'Petrobangla (BGFCL)', py: '1997', giip: 122, rec: 101, cum: 82.8, rem: 18.2, fy: 1.62 },
    { n: 'Sylhet', ll: [24.96, 92.02], st: 'prod', dist: 'Sylhet', up: 'Golapganj (Haripur)', dy: '1955', db: 'Pakistan Petroleum Ltd', py: '1961', giip: 580, rec: 408, cum: 225.9, rem: 182.1, fy: 3.73, note: "Bangladesh's first gas discovery, in 1955. The same geological structure holds the Haripur oil pool." },
    { n: 'Beanibazar', ll: [24.82, 92.17], st: 'prod', dist: 'Sylhet', up: 'Beanibazar', dy: '1981', db: 'Petrobangla', py: '2004 (approx.)', giip: 225, rec: 137, cum: 118.6, rem: 18.4, fy: 5.35, note: 'Wet gas, high in condensate.' },
    { n: 'Fenchuganj', ll: [24.68, 91.93], st: 'prod', dist: 'Sylhet', up: 'Fenchuganj', dy: '1988', db: 'Petrobangla', py: '2004 (approx.)', giip: 483, rec: 329, cum: 179.3, rem: 149.7, fy: 3.09, note: 'Holds the deepest well in Bangladesh, about 4,977 metres.' },
    { n: 'Moulvibazar', ll: [24.31, 91.77], st: 'prod', dist: 'Moulvibazar', up: 'Barlekha, near Sreemangal', dy: '1997', db: 'Occidental, now Chevron', py: '2005', giip: 494, rec: 428, cum: 357.3, rem: 70.7, fy: 5.55, note: 'Site of the 1997 Magurchhara blowout.' },
    { n: 'Shahbazpur', ll: [22.42, 90.75], st: 'prod', dist: 'Bhola', up: 'Borhanuddin', dy: '1995', db: 'BAPEX', py: '2009', giip: 415, rec: 261, cum: 186.6, rem: 74.4, fy: 24.83, note: 'The main field on Bhola island. It supplies the island, and is not yet on the national grid.' },
    { n: 'Saldanadi', ll: [23.66, 90.93], st: 'prod', dist: 'Cumilla', up: 'Muradnagar', dy: '1996', db: 'Petrobangla (BAPEX)', py: '1998', giip: 393, rec: 275, cum: 99.7, rem: 175.3, fy: 1.14 },
    { n: 'Srikail', ll: [23.62, 90.99], st: 'prod', dist: 'Cumilla', up: 'Muradnagar (Block 9)', dy: '2004, re-established 2012', db: 'BAPEX', py: '2012', giip: 230, rec: 161, cum: 156, rem: 5, fy: 7.59, note: 'Nearly exhausted on current figures.' },
    { n: 'Bangura', ll: [23.57, 91.02], st: 'prod', dist: 'Cumilla', up: 'Muradnagar (Block 9)', dy: '2004', db: 'Tullow', py: '2006', giip: 730, rec: 621, cum: 570.3, rem: 50.7, fy: 13.37, note: 'Operated by Tullow.' },
    { n: 'Begumganj', ll: [22.95, 91.12], st: 'prod', dist: 'Noakhali', up: 'Begumganj', dy: '1977', db: 'Petrobangla', py: '2016 (approx.)', giip: 47, rec: 33, cum: 17.4, rem: 15.6, fy: 2.81, note: 'A small field revived through the Begumganj-3 well.' },
    { n: 'Sundalpur', ll: [22.88, 91.28], st: 'prod', dist: 'Noakhali', up: 'Companiganj', dy: '2011 (approx.)', db: 'BAPEX', py: '2013', giip: 62.2, rec: 50.2, cum: 26.3, rem: 23.9, fy: 1.19 },
    { n: 'Semutang', ll: [22.87, 91.85], st: 'prod', dist: 'Khagrachhari', up: 'Manikchhari', dy: '1969', db: 'OGDC (Pakistan)', py: '2015 (approx.)', giip: 654, rec: 318, cum: 14.9, rem: 303.1, fy: 0.29, note: 'The only field in the Chittagong Hill Tracts. Long undeveloped, with about 303 Bcf still recoverable.' },
    { n: 'Chhatak', ll: [25.03, 91.66], st: 'susp', dist: 'Sunamganj', up: 'Chhatak', dy: '1959', db: 'Pakistan Petroleum Ltd', py: '1960, suspended 1985', giip: 677, rec: 474, cum: 25.8, rem: 448.2, fy: 0, note: 'Suspended in 1985 after water flooded the reservoir. About 448 Bcf remains on the books.' },
    { n: 'Kamta', ll: [24.00, 90.40], st: 'susp', dist: 'Gazipur', up: 'Gazipur (approx.)', dy: '1982', db: 'Petrobangla', py: '1985, suspended 1991', giip: 72, rec: 50, cum: 21.1, rem: 28.9, fy: 0, note: 'Suspended in 1991 after water influx.' },
    { n: 'Feni', ll: [23.03, 91.42], st: 'susp', dist: 'Feni', up: 'Feni Sadar', dy: '1981', db: 'Petrobangla', py: '1994, suspended 1998', giip: 185, rec: 130, cum: 63, rem: 67, fy: 0, note: 'Suspended in 1998.' },
    { n: 'Rupganj', ll: [23.75, 90.55], st: 'susp', dist: 'Narayanganj', up: 'Rupganj', dy: '2011 (approx.)', db: 'BAPEX', py: 'Test production only', giip: 48, rec: 33.6, cum: 0.7, rem: 32.9, fy: 0, note: 'Only about 0.7 Bcf was ever produced. Effectively idle.' },
    { n: 'Sangu', ll: [21.95, 91.62], st: 'dep', off: 1, dist: 'Bay of Bengal', up: 'Offshore Block 16, about 50 km south west of Chattogram', dy: '1996', db: 'Cairn Energy, later Santos', py: '1998, abandoned about 2013', giip: 976, rec: 771, cum: 489.5, rem: 281.5, fy: 0, note: "The only offshore field ever to have produced here, and now spent. The book figure overstates what is really left." },
    { n: 'Kutubdia', ll: [21.88, 91.70], st: 'disc', off: 1, dist: 'Bay of Bengal', up: 'Offshore, off Kutubdia island', dy: '1977', db: 'Union Oil Company (USA)', py: 'Never produced', giip: 65, rec: 46, cum: 0, rem: 46, fy: 0, note: 'A small offshore discovery that was never developed.' },
    { n: 'Bhola North', ll: [22.55, 90.72], st: 'disc', dist: 'Bhola', up: 'Borhanuddin and Daulatkhan', dy: '2018', db: 'BAPEX', py: 'Not in production', rec: 435, cum: 0, rem: 435, est: 1, note: 'About 435 Bcf, waiting on the Bhola to Barishal pipeline. Not in the Hydrocarbon Unit field table.' },
    { n: 'Ilisha', ll: [22.75, 90.63], st: 'disc', dist: 'Bhola', up: 'Bhola Sadar (Ilisha)', dy: '2023', db: 'BAPEX', py: 'Not in production', rec: 200, cum: 0, rem: 200, est: 1, note: "The country's 29th gas field, found in May 2023. Idle, awaiting a grid connection." },
    { n: 'Zakiganj', ll: [24.90, 92.36], st: 'disc', dist: 'Sylhet', up: 'Zakiganj', dy: '2021', db: 'BAPEX', py: 'Not in production', rec: 52, cum: 0, rem: 52, est: 1, note: 'The 28th gas field, found in August 2021. No pipeline has been built to it.' },
    { n: 'Haripur', ll: [24.94, 92.04], st: 'oil', dist: 'Sylhet', up: 'Golapganj (Haripur)', dy: '1986', db: 'Petrobangla, Sylhet-7 well', py: '1987, suspended July 1994', oip: 'About 10 million barrels', prod: '560,869 barrels', note: "Bangladesh's only oil field. It shares the Sylhet structure with the gas field beside it. Figures are in barrels, not Bcf." }
  ];

  function fBcf(v) {
    if (v == null) return null;
    var s = v >= 100 ? Math.round(v).toLocaleString('en-US') : String(Math.round(v * 10) / 10);
    return s + ' Bcf' + (v >= 1000 ? ' (' + (v / 1000).toFixed(1) + ' Tcf)' : '');
  }
  function fRad(rem) { return 4.4 + Math.sqrt(Math.max(rem || 0, 1)) * 0.40; }
  function fRow(k, v) { return '<div><span class="k">' + k + '</span><span class="val">' + v + '</span></div>'; }
  function fLine(k, v, cls, est) {
    if (v == null) return '';
    return '<div class="fr' + (cls ? ' ' + cls : '') + '"><span>' + k + '</span><b>' + v +
      (est ? '<em class="fest">&asymp; est.</em>' : '') + '</b></div>';
  }

  function fTip(f) {
    var st = F_ST[f.st];
    var v = f.st === 'oil' ? '560,869 barrels produced'
      : fBcf(f.rem) + ' remaining' + (f.est ? ' (est.)' : '');
    return '<span class="tn">' + f.n + '</span>' +
      '<span class="ts" style="--c:' + st.c + '">' + st.l + '</span>' +
      '<span class="tv">' + v + '</span>' +
      '<span class="th">Click for the full record</span>';
  }

  function fPopup(f) {
    var st = F_ST[f.st];
    var h = '<div class="fpc"><span class="fname">' + f.n + '</span>' +
      '<span class="fmeta">' + (f.st === 'oil' ? 'Crude oil' : 'Natural gas') + ' &middot; ' +
      (f.off ? 'Offshore' : 'Onshore') + '</span>' +
      '<span class="fchip" style="--c:' + st.c + '">' + st.l + '</span>' +
      '<div class="fwho">' + fRow('Where', f.up + (f.off ? '' : ', ' + f.dist + ' district')) +
      fRow('Found', f.dy + ', by ' + f.db) + fRow('Produced', f.py) + '</div>';

    if (f.st === 'oil') {
      h += '<div class="fres">' + fLine('Oil in place', f.oip) +
        fLine('Produced, 1987 to 1994', f.prod, 'hi') + '</div>';
    } else {
      h += '<div class="fres">' +
        fLine('Total gas in place', fBcf(f.giip)) +
        fLine('Recoverable', fBcf(f.rec)) +
        fLine('Already produced', fBcf(f.cum)) +
        fLine('Still remaining', fBcf(f.rem), 'hi', f.est) + '</div>';
      var tot = (f.cum || 0) + (f.rem || 0);
      var pct = tot ? Math.round((f.cum || 0) / tot * 100) : 0;
      h += '<div class="fbar"><i style="width:' + pct + '%"></i></div>' +
        '<div class="fbl"><span>' + pct + '% produced</span><span><b>' + (100 - pct) + '% still there</b></span></div>';
    }
    if (f.note) h += '<p class="fnote">' + f.note + '</p>';
    return h + '</div>';
  }

  var FPOP = {
    className: 'fpop', maxWidth: 320, minWidth: 272, closeButton: true,
    autoPanPaddingTopLeft: [24, 18], autoPanPaddingBottomRight: [24, 24]
  };

  function mapFields() {
    /* the leash has to be much larger than the fitted view: the fit is
       height-constrained, so the visible longitude span already runs wider
       than the country. a tight maxBounds would clamp every popup autoPan
       back to zero and crop the card against the shell. */
    var m = baseMap('fmap', { zoomSnap: 0.25, minZoom: 6, maxBoundsViscosity: 0.5 });
    var bb = L.latLngBounds([[20.55, 88.00], [26.75, 92.80]]);
    var wide = window.matchMedia('(min-width: 1024px)').matches;
    m.fitBounds(bb, { padding: wide ? [24, 24] : [16, 16] });
    m.setMaxBounds(bb.pad(1.6));
    label(m, [21.20, 90.55], 'BAY OF BENGAL', null);

    FIELDS.slice().sort(function (a, b) { return (b.rem || 0) - (a.rem || 0); }).forEach(function (f) {
      var st = F_ST[f.st], mk, r = fRad(f.rem), fillOn, fillOff;
      if (f.st === 'oil') {
        mk = L.marker(f.ll, {
          icon: L.divIcon({ className: 'foilpin', html: '<i class="foil"></i>', iconSize: [19, 19], iconAnchor: [9.5, 9.5] }),
          riseOnHover: true, keyboard: false
        });
      } else {
        fillOff = f.st === 'disc' ? 0.07 : 0.30;
        fillOn = f.st === 'disc' ? 0.24 : 0.55;
        mk = L.circleMarker(f.ll, {
          radius: r, color: st.c, weight: f.st === 'disc' ? 1.6 : 1.3,
          fillColor: st.c, fillOpacity: fillOff, className: 'fdot',
          dashArray: f.st === 'disc' ? '3 3' : null
        });
        mk.on('mouseover', function () { mk.setStyle({ fillOpacity: fillOn, weight: 2.4 }); mk.bringToFront(); });
        mk.on('mouseout', function () { mk.setStyle({ fillOpacity: fillOff, weight: f.st === 'disc' ? 1.6 : 1.3 }); });
      }
      mk.addTo(m);
      mk.bindTooltip(fTip(f), {
        className: 'ftip', direction: 'top', opacity: 1,
        offset: [0, f.st === 'oil' ? -12 : -(r + 5)]
      });
      mk.bindPopup(fPopup(f), FPOP);
    });

    /* tooltips take precedence over the legend, and never get cropped by the
       top edge of the shell: flip the card below its marker if it would be. */
    var shellEl = q('#fields-block .map-shell'), keyEl = q('#fields-block .fkey');
    m.on('tooltipopen', function (e) {
      var tt = e.tooltip, el = tt._container;
      if (!el || !shellEl) return;
      var sh = shellEl.getBoundingClientRect(), r = el.getBoundingClientRect();
      if (r.top < sh.top + 8 && tt.options.direction === 'top') {
        tt.options.direction = 'bottom';
        tt.options.offset = [0, -tt.options.offset[1]];
        tt.update();
        r = el.getBoundingClientRect();
      }
      if (!keyEl) return;
      var k = keyEl.getBoundingClientRect();
      keyEl.classList.toggle('yield',
        r.left < k.right + 10 && r.right > k.left - 10 && r.top < k.bottom + 10 && r.bottom > k.top - 10);
    });
    m.on('tooltipclose', function (e) {
      var tt = e.tooltip;
      if (tt.options.direction === 'bottom') {
        tt.options.direction = 'top';
        tt.options.offset = [0, -tt.options.offset[1]];
      }
      if (keyEl) keyEl.classList.remove('yield');
    });

    var alt = document.createElement('div');
    alt.className = 'vh';
    alt.innerHTML = '<p>Map of the 29 gas fields and one oil field of Bangladesh, with remaining reserves as of February 2025.</p><ul>' +
      FIELDS.map(function (f) {
        return '<li>' + f.n + ', ' + f.dist + '. ' + F_ST[f.st].l + '. ' +
          (f.st === 'oil' ? 'About 10 million barrels in place, 560,869 barrels produced.' : fBcf(f.rem) + ' remaining.') + '</li>';
      }).join('') + '</ul>';
    q('#fields-block').appendChild(alt);
  }

  function lazyMap(blockId, fn) {
    var block = q('#' + blockId);
    if (!block) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.disconnect();
        try { fn(); } catch (err) { if (window.console) console.warn('map failed', blockId, err); }
      });
    }, { rootMargin: '300px 0px 300px 0px', threshold: 0 });
    io.observe(block);
  }

  function startMaps() {
    if (typeof L === 'undefined') return;
    lazyMap('fields-block', mapFields);
    lazyMap('map1-block', mapHormuz);
    lazyMap('map2-block', mapMoheshkhali);
    lazyMap('map3-block', mapImpact);
    lazyMap('map4-block', mapChattogram);
    lazyMap('map5-block', mapBeats);
  }

  /* ------------------------------------------------- persistent wordmark */

  (function () {
    var shell = q('.hero-shell');
    if (!shell) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        document.documentElement.classList.toggle('past-hero', !e.isIntersecting);
      });
    }, { threshold: 0 });
    io.observe(shell);
  })();

  /* ------------------------------------------------ cargo tally, pinned */

  (function () {
    var root = q('#cargo'), field = q('#cgField');
    if (!root || !field) return;
    var QATAR = 19, SPOT = 35;

    var frag = document.createDocumentFragment();
    for (var i = 0; i < QATAR + SPOT; i++) {
      var d = document.createElement('i');
      d.className = i < QATAR ? 'q' : 's';
      d.style.setProperty('--i', i < QATAR ? i : i - QATAR);
      frag.appendChild(d);
    }
    field.appendChild(frag);

    /* the stage is centred in its own full-height pin, so the reading line is
       the viewport centre at every width */
    trackSteps(qa('.cg-step', root), function (el, i) {
      root.setAttribute('data-stage', i + 1);
    }, function () { return 0.5; });
  })();

  /* ------------------------------------------ the four day policy clock */

  (function () {
    var rail = q('#fdpRail');
    if (!rail) return;
    var prog = q('#fdpProg'), dayN = q('#fdpDay'), dateN = q('#fdpDate'), noteN = q('#fdpNote');
    var BASE = Date.UTC(2026, 4, 24), DAYMS = 86400000;
    var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    function fmt(day) {
      var d = new Date(BASE + day * DAYMS);
      return d.getUTCDate() + ' ' + MON[d.getUTCMonth()] + ' 2026';
    }
    var nodes = [];
    function mark(node, day, note, clamp) { node.__m = { day: day, note: note, clamp: clamp }; nodes.push(node); }

    qa('.ce', rail).forEach(function (n) {
      mark(n, parseInt(n.getAttribute('data-day'), 10) || 0, n.getAttribute('data-note'), n.classList.contains('tight'));
    });
    // an empty stretch of rail is measured, not just left blank: one tick per
    // elapsed day, and a sentinel every couple of days to move the counter
    qa('.ce-void', rail).forEach(function (v) {
      var from = parseInt(v.getAttribute('data-from'), 10);
      var span = parseInt(v.getAttribute('data-to'), 10) - from;
      if (!(span > 3)) return;
      var n = Math.min(24, Math.max(2, Math.round(span / 2)));
      for (var i = 1; i <= n; i++) {
        var p = i / (n + 1);
        var s = document.createElement('i');
        s.className = 'ck-sen';
        s.style.top = (p * 100).toFixed(2) + '%';
        v.appendChild(s);
        mark(s, Math.round(from + span * p), null);
      }
      if (span >= 10) {
        for (var k = 1; k < span; k++) {
          var t = document.createElement('i');
          t.className = 'ck-tick';
          t.style.top = (k / span * 100).toFixed(3) + '%';
          v.appendChild(t);
        }
      }
    });

    var cur = null;
    function set(node) {
      var m = node.__m;
      if (!m || m === cur) return;
      cur = m;
      dayN.textContent = m.day;
      dateN.textContent = fmt(m.day);
      if (m.note) noteN.textContent = m.note;
      q('.ck-card').classList.toggle('hot', !!m.clamp);
      var r = node.getBoundingClientRect(), rr = rail.getBoundingClientRect();
      prog.style.height = Math.max(0, r.top + r.height / 2 - rr.top - 6) + 'px';
    }
    var io = new IntersectionObserver(function (es) {
      var mid = window.innerHeight / 2, best = null, bd = Infinity;
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var r = e.target.getBoundingClientRect();
        var d = Math.abs((r.top + r.bottom) / 2 - mid);
        if (d < bd) { bd = d; best = e.target; }
      });
      if (best) set(best);
    }, { rootMargin: '-49.8% 0px -49.8% 0px', threshold: 0 });
    nodes.forEach(function (n) { io.observe(n); });
  })();

  /* ------------------------------------------------------- back to top */

  (function () {
    var btn = q('#totop');
    if (!btn) return;
    var on = false, tick = 0;
    function upd() {
      tick = 0;
      var want = window.pageYOffset > window.innerHeight * 1.15;
      if (want !== on) { on = want; btn.classList.toggle('on', on); }
    }
    window.addEventListener('scroll', function () {
      if (!tick) tick = requestAnimationFrame(upd);
    }, { passive: true });
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' });
    });
    upd();
  })();

  /* -------------------------------------------------------------- boot */

  function boot() {
    watchReveals(document);
    buildRibbon();
    // maps last, and only once the document load event has fired, so tile
    // requests can never hold the page load open
    function later() { setTimeout(startMaps, 120); }
    if (document.readyState === 'complete') later();
    else window.addEventListener('load', later, { once: true });
    var t;
    window.addEventListener('resize', function () {
      clearTimeout(t);
      t = setTimeout(buildRibbon, 250);
    }, { passive: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
