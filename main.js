/* ============================================================
   Amir H. Maharati 
   ============================================================ */

(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var finePointer = window.matchMedia('(pointer: fine)');

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  /* ---------- footer year ---------- */

  function setYear() {
    var el = document.getElementById('year');
    if (el) el.textContent = String(new Date().getFullYear());
  }

  /* ---------- mobile navigation ---------- */

  function initNav() {
    var btn = document.getElementById('menu-btn');
    var nav = document.getElementById('nav');
    if (!btn || !nav) return;

    function setOpen(open) {
      nav.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      document.body.classList.toggle('nav-open', open);
    }

    btn.addEventListener('click', function () {
      setOpen(btn.getAttribute('aria-expanded') !== 'true');
    });

    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        setOpen(false);
        btn.focus();
      }
    });

    // A resize past the breakpoint must not leave the sheet stuck open.
    window.addEventListener('resize', function () {
      if (window.innerWidth > 860) setOpen(false);
    });
  }

  /* ---------- scroll-linked progress rail ----------
     Driver: scroll. Parameter: 0..1. The parameter maps to a target,
     a damped value chases it, and the transform is written at most
     once per frame and only when the rounded value moves. */

  function initRail() {
    var fill = document.getElementById('rail-fill');
    if (!fill) return;

    var target = 0;
    var current = 0;
    var painted = -1;
    var ticking = false;

    function measure() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      target = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(frame);
      }
    }

    function frame() {
      current += (target - current) * (reduced.matches ? 1 : 0.18);
      if (Math.abs(target - current) < 0.0005) current = target;

      var rounded = Math.round(current * 1000);
      if (rounded !== painted) {
        painted = rounded;
        fill.style.transform = 'scaleX(' + (rounded / 1000).toFixed(3) + ')';
      }

      if (current !== target) requestAnimationFrame(frame);
      else ticking = false;
    }

    window.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    measure();
  }

  /* ---------- reveal on enter ----------
     The hidden state lives behind the .js class that the document
     added in <head>, so content is visible if this never runs. */

  function initReveals() {
    var items = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
    if (!items.length) return;

    if (reduced.matches || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var siblings = el.parentElement
          ? Array.prototype.slice.call(el.parentElement.children).filter(function (n) {
              return n.classList.contains('reveal');
            })
          : [el];
        var index = siblings.indexOf(el);
        el.style.setProperty('--d', Math.min(index, 6) * 70 + 'ms');
        el.classList.add('is-in');
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------- current section in the nav ---------- */

  function initSpy() {
    if (!('IntersectionObserver' in window)) return;

    var links = Array.prototype.slice.call(document.querySelectorAll('.nav__list a'));
    var map = {};
    var sections = [];

    links.forEach(function (link) {
      var id = link.getAttribute('href').slice(1);
      var section = document.getElementById(id);
      if (!section) return;
      map[id] = link;
      sections.push(section);
    });
    if (!sections.length) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var link = map[entry.target.id];
        if (!link) return;
        if (entry.isIntersecting) {
          links.forEach(function (l) { l.classList.remove('is-current'); });
          link.classList.add('is-current');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    sections.forEach(function (s) { io.observe(s); });
  }

  /* ---------- publication filter ---------- */

  function initFilters() {
    var chips = Array.prototype.slice.call(document.querySelectorAll('.chip'));
    var pubs = Array.prototype.slice.call(document.querySelectorAll('.pub'));
    var status = document.getElementById('filter-status');
    if (!chips.length || !pubs.length) return;

    var labels = {
      all: 'all publications',
      original: 'original articles',
      review: 'review articles',
      'case': 'case reports'
    };

    function apply(type) {
      var shown = 0;
      pubs.forEach(function (pub) {
        var match = type === 'all' || pub.dataset.type === type;
        pub.hidden = !match;
        if (match) shown++;
      });

      chips.forEach(function (chip) {
        var on = chip.dataset.filter === type;
        chip.classList.toggle('is-on', on);
        chip.setAttribute('aria-pressed', on ? 'true' : 'false');
      });

      if (status) {
        status.textContent = 'Showing ' + shown + ' ' + (labels[type] || 'publications') + '.';
      }
    }

    chips.forEach(function (chip) {
      chip.addEventListener('click', function () { apply(chip.dataset.filter); });
    });
  }

  /* ---------- signature: coverage track ----------
     One bar per publication, ordered by year, height scaled to the
     journal impact factor. The shape is the record, not decoration. */

  function initTrack() {
    var track = document.getElementById('track');
    var host = document.getElementById('track-groups');
    if (!track || !host) return;

    var data = Array.prototype.slice.call(document.querySelectorAll('.pub')).map(function (pub) {
      var yearEl = pub.querySelector('.pub__year');
      var ifEl = pub.querySelector('.pub__if');
      var journalEl = pub.querySelector('.pub__journal');
      return {
        year: yearEl ? parseInt(yearEl.textContent, 10) : 0,
        impact: ifEl ? parseFloat(ifEl.textContent.replace(/[^0-9.]/g, '')) : 0,
        journal: journalEl ? journalEl.textContent.trim() : ''
      };
    }).filter(function (d) { return d.year > 0; });

    if (!data.length) return;

    data.sort(function (a, b) { return a.year - b.year; });

    var newest = data[data.length - 1].year;
    var peak = data.reduce(function (m, d) { return Math.max(m, d.impact); }, 1);

    // Group by year. Each group's flex-grow is its paper count, so the
    // label below it spans exactly the bars it describes.
    var years = [];
    var byYear = {};
    data.forEach(function (d) {
      if (!byYear[d.year]) {
        byYear[d.year] = [];
        years.push(d.year);
      }
      byYear[d.year].push(d);
    });

    var frag = document.createDocumentFragment();
    var index = 0;

    years.forEach(function (year) {
      var papers = byYear[year];

      var group = document.createElement('div');
      group.className = 'track__group';
      group.style.flex = papers.length + ' 1 0';

      var bars = document.createElement('div');
      bars.className = 'track__bars';

      papers.forEach(function (d) {
        var bar = document.createElement('span');
        bar.className = 'track__bar' + (year === newest ? ' track__bar--hot' : '');
        bar.style.setProperty('--h', (0.16 + (d.impact / peak) * 0.84).toFixed(3));
        bar.style.setProperty('--d', Math.min(index * 22, 900) + 'ms');
        bar.title = d.journal + ' \u00b7 ' + year + (d.impact ? ' \u00b7 IF ' + d.impact : '');
        bars.appendChild(bar);
        index++;
      });

      var label = document.createElement('span');
      label.className = 'track__label';
      label.innerHTML = year + '<b>' + papers.length + '</b>';

      group.appendChild(bars);
      group.appendChild(label);
      frag.appendChild(group);
    });

    host.appendChild(frag);

    if (reduced.matches || !('IntersectionObserver' in window)) {
      track.classList.add('is-in');
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) {
        track.classList.add('is-in');
        io.disconnect();
      }
    }, { threshold: 0.3 });
    io.observe(track);
  }

  /* ---------- counting figures ---------- */

  function initCounters() {
    var nums = Array.prototype.slice.call(document.querySelectorAll('.figure__num'));
    if (!nums.length) return;

    if (reduced.matches || !('IntersectionObserver' in window)) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        io.unobserve(el);

        var end = parseInt(el.dataset.count, 10);
        if (!end) return;

        var start = performance.now();
        var duration = 900;
        var painted = -1;

        function step(now) {
          var t = Math.min(1, (now - start) / duration);
          var eased = 1 - Math.pow(1 - t, 3);
          var value = Math.round(end * eased);
          if (value !== painted) {
            painted = value;
            el.textContent = value.toLocaleString('en-US');
          }
          if (t < 1) requestAnimationFrame(step);
        }

        el.textContent = '0';
        requestAnimationFrame(step);
      });
    }, { threshold: 0.6 });

    nums.forEach(function (n) { io.observe(n); });
  }

  /* ---------- hero portrait parallax ----------
     2D pointer parameter, clamped and damped. Pointer devices only,
     and the rest state is dead centre. */

  function initParallax() {
    var frame = document.querySelector('.hero__frame');
    var hero = document.querySelector('.hero');
    if (!frame || !hero) return;
    if (reduced.matches || !finePointer.matches) return;

    var targetX = 0, targetY = 0;
    var x = 0, y = 0;
    var running = false;
    var LIMIT = 10;

    function onMove(e) {
      var rect = hero.getBoundingClientRect();
      targetX = ((e.clientX - rect.left) / rect.width - 0.5) * 2 * LIMIT;
      targetY = ((e.clientY - rect.top) / rect.height - 0.5) * 2 * LIMIT;
      start();
    }

    function reset() {
      targetX = 0;
      targetY = 0;
      start();
    }

    function start() {
      if (running) return;
      running = true;
      requestAnimationFrame(frameStep);
    }

    function frameStep() {
      x += (targetX - x) * 0.08;
      y += (targetY - y) * 0.08;

      if (Math.abs(targetX - x) < 0.05 && Math.abs(targetY - y) < 0.05) {
        x = targetX;
        y = targetY;
        running = false;
      }

      frame.style.transform = 'translate3d(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px,0)';
      if (running) requestAnimationFrame(frameStep);
    }

    hero.addEventListener('pointermove', onMove);
    hero.addEventListener('pointerleave', reset);
    window.addEventListener('blur', reset);
  }

  /* ---------- boot ----------
     Order matters. Nothing is hidden until the failsafe is armed, so
     there is no state in which content can be stranded off-screen. */

  function revealEverything() {
    var root = document.documentElement;
    root.classList.remove('motion-ready');
    Array.prototype.forEach.call(document.querySelectorAll('.reveal'), function (el) {
      el.classList.add('is-in');
    });
    var track = document.getElementById('track');
    if (track) track.classList.add('is-in');
  }

  // Any uncaught error at any point puts the page back into its
  // visible rest state rather than leaving sections blank.
  window.addEventListener('error', revealEverything);

  function run(name, fn) {
    try {
      fn();
    } catch (err) {
      if (window.console && console.warn) console.warn('[site] ' + name + ' failed:', err);
    }
  }

  ready(function () {
    var armed = false;

    // Failsafe: if the reveal pass has not completed within 2s —
    // slow device, observer never fires, anything at all — show
    // everything unconditionally.
    var failsafe = setTimeout(function () {
      if (!armed) revealEverything();
    }, 2000);

    run('reveals', function () {
      document.documentElement.classList.add('motion-ready');
      initReveals();
      armed = true;
      clearTimeout(failsafe);
    });

    run('year', setYear);

    // Second guard: the observer can be set up correctly and still
    // never fire on some engines. Confirm that anything already in
    // the first viewport has actually revealed.
    setTimeout(function () {
      var stuck = Array.prototype.filter.call(
        document.querySelectorAll('.reveal'),
        function (el) {
          if (el.classList.contains('is-in')) return false;
          var box = el.getBoundingClientRect();
          return box.top < window.innerHeight && box.bottom > 0;
        }
      );
      if (stuck.length) revealEverything();
    }, 2500);

    run('nav', initNav);
    run('rail', initRail);
    run('spy', initSpy);
    run('filters', initFilters);
    run('track', initTrack);
    run('counters', initCounters);
    run('parallax', initParallax);
  });
})();
