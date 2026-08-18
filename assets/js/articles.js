/* =============================================================================
   RELATED COVERAGE RAILS
   -----------------------------------------------------------------------------
   ADD AN ARTICLE   push an object onto the right group's items array:
                      { t: 'Headline',
                        s: 'Subheader, optional, leave out if there is none',
                        img: 'assets/img/news/article_9.jpg',
                        href: 'https://www.thedailystar.net/...' }
                    Order in the array is the order on the page.

   ADD A GROUP      add a key below, then drop one line into index.html where
                    the rail should sit:
                      <div class="wrap chart reads-blk"><div class="reads" data-reads="yourkey"></div></div>
                    A group with no placeholder in the page is skipped silently.
   ========================================================================== */
(function () {
  'use strict';

  var READS = {

    /* Chapter 1, after the Qatar cargo tally */
    qatar: {
      items: [
        { t: 'FSRU fragility exposing gas supply vulnerabilities',
          s: 'Every disruption at floating terminals spirals into national gas crisis',
          img: 'assets/img/news/article_5.jpg',
          href: 'https://www.thedailystar.net/business/news/fsru-fragility-exposing-gas-supply-vulnerabilities-4241201' }
      ]
    },

    /* Chapter 1, after the spot market inference */
    spot: {
      items: [
        { t: 'Govt approves LNG cargo from Aramco Trading Singapore at $21.55 per MMBtu',
          s: 'Cabinet committee clears August 11-12 delivery',
          img: 'assets/img/news/article_4.jpg',
          href: 'https://www.thedailystar.net/news/environment/natural-resources/energy/news/govt-approves-lng-cargo-aramco-trading-singapore-2155-mmbtu-4242361' }
      ]
    },

    /* opening section, after the gas fields map */
    fields: {
      items: [
        { t: 'Bibiyana gas field: Overreliance threatening energy security',
          img: 'assets/img/news/article_50.jpg',
          href: 'https://www.thedailystar.net/environment/natural-resources/energy/news/bibiyana-gas-field-overreliance-threatening-energy-security-3090976' }
      ]
    },

    /* Chapter 1, after the domestic production against imports flow chart */
    mix: {
      items: [
        { t: 'Govt braces for costly LNG future',
          s: 'Weighs new FSRU, land-based terminal as local gas declines',
          img: 'assets/img/news/article_12.jpg',
          href: 'https://www.thedailystar.net/news/bangladesh/news/govt-braces-costly-lng-future-4235196' }
      ]
    },

    /* Chapter 1, after the price absorber */
    absorber: {
      items: [
        { t: 'Domestic fuel prices may fall if global rates ease: Energy minister',
          s: 'Iqbal Hassan Mahmood says BPC is losing Tk 78 crore a day as international fuel prices remain above break-even levels',
          img: 'assets/img/news/article_25.jpg',
          href: 'https://www.thedailystar.net/news/environment/natural-resources/energy/news/domestic-fuel-prices-may-fall-if-global-rates-ease-energy-minister-4205286' }
      ]
    },

    /* Chapter 2, after the terminal schematic */
    fsru: {
      items: [
        { t: 'Gas supply cut hits homes, industries',
          s: 'Shutdown of LNG terminal leaves Bangladesh meeting only 57% of national demand',
          img: 'assets/img/news/article_16.jpg',
          href: 'https://www.thedailystar.net/news/bangladesh/news/gas-supply-cut-hits-homes-industries-4231241' },
        { t: 'Load shedding off the charts once again',
          s: 'Over 3,000MW of shortage caused by rebounding demand, gas supply crunch, disrupted coal power production',
          img: 'assets/img/news/article_1.jpg',
          href: 'https://www.thedailystar.net/news/bangladesh/news/load-shedding-the-charts-once-again-4244141' },
        { t: 'Gas shortage sparks extensive power cuts',
          img: 'assets/img/news/article_7.jpg',
          href: 'https://www.thedailystar.net/news/bangladesh/news/gas-shortage-sparks-extensive-power-cuts-4238811' }
      ]
    },

    /* Coda, after the 15 August update */
    latest: {
      label: 'The latest',
      items: [
        { t: 'Summit LNG back online; Excelerate FSRU now offline',
          img: 'assets/img/news/article_52.jpg',
          href: 'https://www.thedailystar.net/news/bangladesh/news/summit-lng-back-online-excelerate-fsru-now-offline-4247861' },
        { t: 'LNG supply worsens, chokes power output',
          s: 'Bad weather puts Summit FSRU offline; minister says little can be done right now',
          img: 'assets/img/news/article_53.jpg',
          href: 'https://www.thedailystar.net/news/bangladesh/news/lng-supply-worsens-chokes-power-output-4247451' }
      ]
    }

  };

  var LABEL = 'Related coverage';
  var SOURCE = 'thedailystar.net';
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* The thumbnail slot is 88 CSS px on a phone and 150 on a wide screen, but
     the source photographs are ~800px wide: 389KB of image for slots that need
     about 40KB. tools/build_images.py emits a 240w and a 480w variant of each;
     the width-described srcset lets the browser take the 240 on an ordinary
     phone and the 480 only where the pixel density actually calls for it. */
  function thumbSource(img) {
    var base = img.replace(/\.(jpe?g|png)$/i, '');
    return '<source type="image/webp" sizes="(max-width: 719px) 88px, 150px" srcset="' +
      esc(base + '-240w.webp') + ' 240w, ' + esc(base + '-480w.webp') + ' 480w">';
  }

  function card(a, i) {
    return '<a class="rd" href="' + esc(a.href) + '" target="_blank" rel="noopener noreferrer" style="--i:' + i + '">'
      +   '<span class="rd-im">'
      +     '<picture>' + thumbSource(a.img) + '<img src="' + esc(a.img) + '" alt="" loading="lazy" decoding="async"></picture>'
      +   '</span>'
      +   '<span class="rd-tx">'
      +     '<span class="rd-k">' + SOURCE + '</span>'
      +     '<span class="rd-t">' + esc(a.t) + '</span>'
      +     (a.s ? '<span class="rd-s">' + esc(a.s) + '</span>' : '')
      +     '<span class="rd-go">Read article<i aria-hidden="true">&#8594;</i></span>'
      +   '</span>'
      + '</a>';
  }

  function mount() {
    var io = null;
    if (!REDUCED && 'IntersectionObserver' in window) {
      io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
        });
      }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    }

    Object.keys(READS).forEach(function (key) {
      var host = document.querySelector('[data-reads="' + key + '"]');
      if (!host) return;
      var g = READS[key], items = (g && g.items) || [];
      if (!items.length) return;

      host.innerHTML =
        '<div class="rd-hd"><i class="tk" aria-hidden="true"></i>'
        + '<h4 class="rd-lbl">' + esc(g.label || LABEL) + '</h4>'
        + '<i class="ln" aria-hidden="true"></i></div>'
        + '<div class="rd-grid" data-n="' + items.length + '">'
        + items.map(card).join('')
        + '</div>';

      if (io) { io.observe(host); } else { host.classList.add('in'); }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else { mount(); }
})();

