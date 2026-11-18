/* ============================================================
   Hexo Theme · Cyrene（昔涟）
   交互：明暗切换 / 目录 / 代码复制 / 搜索 / 灯箱 / 氛围装饰
   ============================================================ */
(function () {
  'use strict';

  var cfg = window.CYRENE_CONFIG || {};
  var strings = cfg.strings || {};
  var doc = document;
  var root = doc.documentElement;
  var body = doc.body;
  var storageKey = 'cyrene-theme';
  var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var header = doc.getElementById('site-header');
  var nav = doc.getElementById('site-nav');
  var navToggle = doc.getElementById('nav-toggle');
  var themeToggle = doc.getElementById('theme-toggle');
  var progress = doc.getElementById('reading-progress');
  var toTop = doc.getElementById('back-to-top');

  function $(selector, context) {
    return (context || doc).querySelector(selector);
  }

  function $$(selector, context) {
    return Array.prototype.slice.call((context || doc).querySelectorAll(selector));
  }

  function on(el, event, handler, options) {
    if (el) el.addEventListener(event, handler, options);
  }

  /* ---------- Theme ---------- */
  function currentTheme() {
    return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function syncGiscus(theme) {
    if (!cfg.giscus) return;
    var iframe = $('iframe.giscus-frame');
    if (!iframe || !iframe.contentWindow) return;
    iframe.contentWindow.postMessage({
      giscus: { setConfig: { theme: theme === 'dark' ? 'dark' : 'light' } }
    }, 'https://giscus.app');
  }

  function setTheme(theme, persist) {
    root.setAttribute('data-theme', theme);
    if (persist) {
      try { localStorage.setItem(storageKey, theme); } catch (e) {}
    }
    if (themeToggle) {
      var label = theme === 'dark'
        ? (strings.toLight || 'Switch to light')
        : (strings.toDark || 'Switch to dark');
      themeToggle.setAttribute('aria-label', label);
      themeToggle.setAttribute('title', label);
      themeToggle.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
    }
    syncGiscus(theme);
  }

  setTheme(currentTheme(), false);

  on(themeToggle, 'click', function () {
    setTheme(currentTheme() === 'dark' ? 'light' : 'dark', true);
  });

  if (window.matchMedia) {
    var scheme = window.matchMedia('(prefers-color-scheme: dark)');
    var onSchemeChange = function (event) {
      var stored = null;
      try { stored = localStorage.getItem(storageKey); } catch (e) {}
      if (!stored) setTheme(event.matches ? 'dark' : 'light', false);
    };
    if (scheme.addEventListener) scheme.addEventListener('change', onSchemeChange);
    else if (scheme.addListener) scheme.addListener(onSchemeChange);
  }

  window.addEventListener('load', function () {
    if (cfg.giscus) window.setTimeout(function () { syncGiscus(currentTheme()); }, 1000);
  });

  /* ---------- Mobile nav ---------- */
  function closeNav() {
    if (!nav) return;
    nav.classList.remove('is-open');
    if (navToggle) {
      navToggle.classList.remove('is-active');
      navToggle.setAttribute('aria-expanded', 'false');
    }
    body.classList.remove('nav-open');
  }

  on(navToggle, 'click', function (event) {
    event.stopPropagation();
    if (!nav) return;
    var open = nav.classList.toggle('is-open');
    navToggle.classList.toggle('is-active', open);
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    body.classList.toggle('nav-open', open);
  });

  on(nav, 'click', function (event) {
    if (event.target.closest('a')) closeNav();
  });

  on(doc, 'click', function (event) {
    if (nav && nav.classList.contains('is-open') && !nav.contains(event.target) && !navToggle.contains(event.target)) {
      closeNav();
    }
  });

  on(doc, 'keydown', function (event) {
    if (event.key === 'Escape') closeNav();
  });

  on(window, 'resize', function () {
    if (window.innerWidth > 860) closeNav();
  });

  /* ---------- Scroll: header / progress / back-to-top ---------- */
  var scrollTick = false;

  function onScroll() {
    scrollTick = false;
    var y = window.pageYOffset || doc.documentElement.scrollTop;

    if (header) header.classList.toggle('is-scrolled', y > 8);
    if (toTop) toTop.classList.toggle('is-visible', y > 480);

    if (progress && body.classList.contains('is-post')) {
      var max = doc.documentElement.scrollHeight - window.innerHeight;
      var pct = max > 0 ? Math.min(100, Math.max(0, (y / max) * 100)) : 0;
      progress.style.width = pct + '%';
    }
  }

  on(window, 'scroll', function () {
    if (!scrollTick) {
      scrollTick = true;
      window.requestAnimationFrame(onScroll);
    }
  }, { passive: true });
  onScroll();

  on(toTop, 'click', function () {
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  });

  /* ---------- Copy code ---------- */
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var area = doc.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.top = '-9999px';
      doc.body.appendChild(area);
      area.select();
      try {
        var ok = doc.execCommand('copy');
        area.remove();
        if (ok) resolve();
        else reject(new Error('copy failed'));
      } catch (err) {
        area.remove();
        reject(err);
      }
    });
  }

  function setupCopyButtons() {
    if (!cfg.copyCode) return;
    $$('.post-content figure.highlight, .post-content pre').forEach(function (block) {
      if (block.tagName === 'PRE' && block.closest('figure.highlight')) return;
      if (block.dataset.copyReady === '1') return;
      block.dataset.copyReady = '1';

      var target = block.tagName === 'PRE'
        ? block
        : (block.querySelector('.code pre') || block.querySelector('pre'));
      if (!target) return;

      var button = doc.createElement('button');
      button.type = 'button';
      button.className = 'copy-btn';
      button.textContent = strings.copy || 'Copy';
      button.setAttribute('aria-label', strings.copy || 'Copy');

      button.addEventListener('click', function () {
        var buttonInsideTarget = target.contains(button);
        if (buttonInsideTarget) button.remove();
        var text = target.innerText;
        if (buttonInsideTarget) block.appendChild(button);
        copyText(text).then(function () {
          button.textContent = strings.copied || 'Copied';
          button.classList.add('is-copied');
          window.setTimeout(function () {
            button.textContent = strings.copy || 'Copy';
            button.classList.remove('is-copied');
          }, 1800);
        }).catch(function () {
          button.textContent = strings.copyFailed || 'Copy failed';
          window.setTimeout(function () {
            button.textContent = strings.copy || 'Copy';
          }, 1800);
        });
      });

      block.appendChild(button);
    });
  }

  /* ---------- Table of contents ---------- */
  function slugify(text) {
    return String(text).trim().toLowerCase()
      .replace(/[\s\u3000]+/g, '-')
      .replace(/[^\p{L}\p{N}\-_]/gu, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60);
  }

  function buildTOC() {
    var content = doc.getElementById('post-content');
    var containers = $$('[data-toc]');
    if (!content || !containers.length) return;

    var headings = $$('h2, h3', content).filter(function (heading) {
      return (heading.textContent || '').trim().length > 0;
    });

    if (!headings.length) {
      var layout = $('.post-layout');
      if (layout) layout.classList.add('no-toc');
      var aside = doc.getElementById('post-toc');
      if (aside) aside.classList.add('is-empty');
      $$('.toc-inline').forEach(function (el) { el.hidden = true; });
      return;
    }

    var seen = {};
    headings.forEach(function (heading, index) {
      var text = (heading.textContent || '').replace(/♪/g, '').trim();
      if (!heading.id) {
        var base = slugify(text) || ('section-' + (index + 1));
        var id = base;
        var n = 2;
        while (doc.getElementById(id)) {
          id = base + '-' + n;
          n += 1;
        }
        heading.id = id;
      }
      if (seen[heading.id]) return;
      seen[heading.id] = true;
    });

    var links = [];
    containers.forEach(function (container) {
      container.innerHTML = '';
      headings.forEach(function (heading) {
        var link = doc.createElement('a');
        link.className = 'toc-link toc-level-' + heading.tagName.charAt(1);
        link.href = '#' + heading.id;
        link.dataset.target = heading.id;
        link.textContent = (heading.textContent || '').trim();
        link.addEventListener('click', function () {
          var details = container.closest('details');
          if (details) details.removeAttribute('open');
        });
        container.appendChild(link);
        links.push(link);
      });
    });

    function setActive(id) {
      links.forEach(function (link) {
        link.classList.toggle('is-active', link.dataset.target === id);
      });
    }

    var spyTick = false;
    function spy() {
      spyTick = false;
      var offset = (header ? header.offsetHeight : 70) + 60;
      var active = headings[0].id;
      for (var i = 0; i < headings.length; i += 1) {
        if (headings[i].getBoundingClientRect().top <= offset) active = headings[i].id;
        else break;
      }
      setActive(active);
    }

    on(window, 'scroll', function () {
      if (!spyTick) {
        spyTick = true;
        window.requestAnimationFrame(spy);
      }
    }, { passive: true });
    spy();
  }

  /* ---------- Lightbox ---------- */
  function setupLightbox() {
    if (!cfg.lightbox) return;
    var content = doc.getElementById('post-content');
    var images = content ? $$('img', content) : [];
    if (!images.length) return;
    content.classList.add('has-lightbox');

    var box = doc.createElement('div');
    box.className = 'lightbox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.innerHTML = '<button class="lightbox-close" type="button" aria-label="' +
      (strings.close || 'Close') + '">&times;</button><img alt=""><p class="lightbox-caption"></p>';
    doc.body.appendChild(box);

    var image = box.querySelector('img');
    var caption = box.querySelector('.lightbox-caption');
    var closeButton = box.querySelector('.lightbox-close');
    var lastFocus = null;

    function close() {
      box.classList.remove('is-open');
      body.classList.remove('lightbox-open');
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    function open(img) {
      lastFocus = doc.activeElement;
      image.src = img.currentSrc || img.src;
      image.alt = img.alt || '';
      caption.textContent = img.alt || '';
      caption.hidden = !img.alt;
      box.classList.add('is-open');
      body.classList.add('lightbox-open');
      closeButton.focus();
    }

    images.forEach(function (img) {
      img.setAttribute('role', 'button');
      img.setAttribute('tabindex', '0');
      img.setAttribute('aria-label', img.alt || (strings.preview || 'Preview image'));
      img.addEventListener('click', function (event) {
        event.preventDefault();
        open(img);
      });
      img.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          open(img);
        }
      });
    });

    closeButton.addEventListener('click', close);
    box.addEventListener('click', function (event) {
      if (event.target === box) close();
    });
    on(doc, 'keydown', function (event) {
      if (!box.classList.contains('is-open')) return;
      if (event.key === 'Escape') close();
    });
  }

  /* ---------- Misc enhancements ---------- */
  function wrapTables() {
    $$('.post-content table').forEach(function (table) {
      if (table.closest('figure.highlight')) return;
      if (table.parentElement && table.parentElement.classList.contains('table-wrap')) return;
      var wrap = doc.createElement('div');
      wrap.className = 'table-wrap';
      table.parentNode.insertBefore(wrap, table);
      wrap.appendChild(table);
    });
  }

  function markExternalLinks() {
    $$('.post-content a[href]').forEach(function (link) {
      var href = link.getAttribute('href') || '';
      if (!/^https?:\/\//i.test(href)) return;
      if (link.hostname && link.hostname !== window.location.hostname) {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      }
    });
  }

  /* ---------- Local search ---------- */
  function initSearch() {
    var page = doc.getElementById('search-page');
    if (!page) return;
    var input = doc.getElementById('search-input');
    var status = doc.getElementById('search-status');
    var results = doc.getElementById('search-results');
    if (!input || !status || !results) return;

    var source = page.getAttribute('data-source') || cfg.searchSource;
    var hint = status.getAttribute('data-hint') || status.textContent;
    var entries = null;
    var pending = null;
    var debounceTimer = null;
    var currentQuery = '';

    function setStatus(text) {
      status.textContent = text;
    }

    function toPlain(html) {
      var box = doc.createElement('div');
      box.innerHTML = html || '';
      $$('script, style', box).forEach(function (node) { node.remove(); });
      return (box.textContent || '').replace(/\s+/g, ' ').trim();
    }

    function parseSearchData(text) {
      var trimmed = text.trim();
      if (trimmed.charAt(0) === '{' || trimmed.charAt(0) === '[') {
        try {
          var json = JSON.parse(trimmed);
          var list = Array.isArray(json) ? json : (json.posts || json.entries || []);
          return list.map(function (item) {
            return {
              title: item.title || '',
              url: item.url || item.path || item.link || '',
              content: item.content || item.text || ''
            };
          });
        } catch (e) {}
      }

      var xml = new DOMParser().parseFromString(text, 'text/xml');
      if (xml.querySelector('parsererror')) return [];
      return Array.prototype.map.call(xml.querySelectorAll('entry'), function (entry) {
        function pick(selector) {
          var node = entry.querySelector(selector);
          return node ? node.textContent : '';
        }
        return {
          title: pick('title'),
          url: pick('url') || pick('link'),
          content: pick('content') || pick('summary')
        };
      });
    }

    function loadEntries() {
      if (entries) return Promise.resolve(entries);
      if (pending) return pending;
      pending = fetch(source, { cache: 'no-store' })
        .then(function (response) {
          if (!response.ok) throw new Error('HTTP ' + response.status);
          return response.text();
        })
        .then(function (text) {
          entries = parseSearchData(text);
          return entries;
        })
        .catch(function (error) {
          pending = null;
          throw error;
        });
      return pending;
    }

    function highlightInto(el, text, query) {
      text = text || '';
      if (!query) {
        el.textContent = text;
        return;
      }
      var lower = text.toLowerCase();
      var needle = query.toLowerCase();
      var index = 0;
      var pos;
      while ((pos = lower.indexOf(needle, index)) !== -1) {
        if (pos > index) el.appendChild(doc.createTextNode(text.slice(index, pos)));
        var mark = doc.createElement('mark');
        mark.textContent = text.slice(pos, pos + query.length);
        el.appendChild(mark);
        index = pos + query.length;
        if (index >= text.length) break;
      }
      if (index < text.length) el.appendChild(doc.createTextNode(text.slice(index)));
    }

    function createResult(item, query) {
      var link = doc.createElement('a');
      link.className = 'search-result';
      link.href = item.url || '#';

      var title = doc.createElement('h3');
      title.className = 'search-result-title';
      highlightInto(title, item.title || item.url || '', query);

      var snippet = doc.createElement('p');
      snippet.className = 'search-result-snippet';
      var content = item.content || '';
      var index = content.toLowerCase().indexOf(query.toLowerCase());
      var text = content;
      if (index > -1) {
        var start = Math.max(0, index - 60);
        var end = Math.min(content.length, index + query.length + 100);
        text = (start > 0 ? '…' : '') + content.slice(start, end) + (end < content.length ? '…' : '');
      } else {
        text = content.slice(0, 160);
      }
      highlightInto(snippet, text, query);

      var url = doc.createElement('span');
      url.className = 'search-result-url';
      url.textContent = item.url || '';

      link.appendChild(title);
      if (text) link.appendChild(snippet);
      if (item.url) link.appendChild(url);
      return link;
    }

    function render(raw) {
      var query = raw.trim();
      currentQuery = query;
      if (!query) {
        results.innerHTML = '';
        setStatus(hint);
        return;
      }

      setStatus(strings.searchLoading || 'Searching...');
      loadEntries().then(function (list) {
        if (currentQuery !== query) return;
        var needle = query.toLowerCase();
        var matches = list.filter(function (item) {
          return ((item.title || '') + ' ' + toPlain(item.content)).toLowerCase().indexOf(needle) !== -1;
        }).map(function (item) {
          return { title: item.title, url: item.url, content: toPlain(item.content) };
        });

        results.innerHTML = '';

        if (!matches.length) {
          setStatus('');
          var empty = doc.createElement('p');
          empty.className = 'search-empty';
          empty.textContent = strings.searchEmpty || 'Nothing found';
          results.appendChild(empty);
          return;
        }

        setStatus((strings.searchFound || '{count} found').replace('{count}', matches.length));
        matches.slice(0, 30).forEach(function (item) {
          results.appendChild(createResult(item, query));
        });
      }).catch(function () {
        setStatus(strings.searchError || 'Search failed');
      });
    }

    input.addEventListener('input', function () {
      window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(function () { render(input.value); }, 180);
    });

    var params = new URLSearchParams(window.location.search);
    var initial = params.get('q') || '';
    if (initial) {
      input.value = initial;
      render(initial);
    }
  }

  function setupSearchShortcut() {
    on(doc, 'keydown', function (event) {
      if (!(event.ctrlKey || event.metaKey) || (event.key !== 'k' && event.key !== 'K')) return;
      var input = doc.getElementById('search-input');
      if (input) {
        event.preventDefault();
        input.focus();
        input.select();
      } else if (cfg.searchUrl) {
        event.preventDefault();
        window.location.href = cfg.searchUrl;
      }
    });
  }

  /* ---------- Ambient decorations ---------- */
  function makeStars() {
    var box = doc.getElementById('bg-stars');
    if (!box || !cfg.stars || reduceMotion) return;
    var colors = ['rgba(255,255,255,0.9)', 'rgba(255,196,220,0.9)', 'rgba(202,186,255,0.9)'];
    var count = window.innerWidth < 720 ? 26 : 48;
    for (var i = 0; i < count; i += 1) {
      var star = doc.createElement('span');
      star.className = 'star';
      var size = (Math.random() * 2 + 1).toFixed(1) + 'px';
      star.style.width = size;
      star.style.height = size;
      star.style.left = (Math.random() * 100).toFixed(2) + '%';
      star.style.top = (Math.random() * 100).toFixed(2) + '%';
      star.style.color = colors[i % colors.length];
      star.style.background = colors[i % colors.length];
      star.style.setProperty('--dur', (3 + Math.random() * 4).toFixed(1) + 's');
      star.style.setProperty('--delay', (Math.random() * 6).toFixed(1) + 's');
      star.style.opacity = (0.25 + Math.random() * 0.5).toFixed(2);
      box.appendChild(star);
    }
  }

  function makePetals() {
    var box = doc.getElementById('bg-petals');
    if (!box || !cfg.petals || reduceMotion) return;
    var count = window.innerWidth < 720 ? 5 : 9;
    for (var i = 0; i < count; i += 1) {
      var petal = doc.createElement('span');
      petal.className = 'petal';
      petal.style.setProperty('--size', (8 + Math.random() * 8).toFixed(1) + 'px');
      petal.style.setProperty('--left', (Math.random() * 100).toFixed(2) + 'vw');
      petal.style.setProperty('--dur', (14 + Math.random() * 14).toFixed(1) + 's');
      petal.style.setProperty('--delay', (-Math.random() * 24).toFixed(1) + 's');
      petal.style.setProperty('--drift', (Math.random() * 120 - 60).toFixed(0) + 'px');
      petal.style.setProperty('--petal-opacity', (0.3 + Math.random() * 0.3).toFixed(2));
      box.appendChild(petal);
    }
  }

  function setupCursorGlow() {
    if (!cfg.cursorGlow || reduceMotion) return;
    if (!window.matchMedia || !window.matchMedia('(pointer: fine)').matches) return;
    var glow = doc.getElementById('cursor-glow');
    if (!glow) return;
    glow.classList.add('is-on');
    var x = -500;
    var y = -500;
    var frame = 0;
    on(doc, 'mousemove', function (event) {
      x = event.clientX;
      y = event.clientY;
      if (!frame) {
        frame = window.requestAnimationFrame(function () {
          frame = 0;
          glow.style.setProperty('--x', x + 'px');
          glow.style.setProperty('--y', y + 'px');
        });
      }
    }, { passive: true });
  }

  function initCursorFX() {
    if (reduceMotion) return;

    var trailEnabled = cfg.cursorTrail !== false;
    var rippleEnabled = cfg.clickRipple !== false;
    if (!trailEnabled && !rippleEnabled) return;

    var canvas = doc.createElement('canvas');
    canvas.className = 'cursor-fx';
    canvas.setAttribute('aria-hidden', 'true');
    doc.body.appendChild(canvas);

    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var width = 0;
    var height = 0;

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();
    on(window, 'resize', resize);

    var particles = [];
    var ripples = [];
    var lastX = null;
    var lastY = null;
    var running = false;
    var lastTime = 0;
    var maxParticles = 260;

    function random(min, max) {
      return min + Math.random() * (max - min);
    }

    function ensureLoop() {
      if (running) return;
      running = true;
      lastTime = window.performance.now();
      window.requestAnimationFrame(frame);
    }

    function addParticle(x, y, options) {
      options = options || {};
      var life = options.life || random(0.45, 0.8);
      particles.push({
        x: x,
        y: y,
        vx: options.vx !== undefined ? options.vx : random(-12, 12),
        vy: options.vy !== undefined ? options.vy : random(-18, -2),
        size: options.size || random(1.6, 3.6),
        hue: Math.random() < 0.22 ? 286 : 332,
        life: life,
        maxLife: life
      });
      if (particles.length > maxParticles) {
        particles.splice(0, particles.length - maxParticles);
      }
    }

    function addTrail(x, y) {
      if (!trailEnabled) return;
      var startX = lastX === null ? x : lastX;
      var startY = lastY === null ? y : lastY;
      var dx = x - startX;
      var dy = y - startY;
      var distance = Math.sqrt(dx * dx + dy * dy);
      var steps = Math.max(1, Math.min(9, Math.ceil(distance / 9)));

      for (var i = 1; i <= steps; i += 1) {
        var t = i / steps;
        addParticle(
          startX + dx * t + random(-1.2, 1.2),
          startY + dy * t + random(-1.2, 1.2)
        );
      }

      lastX = x;
      lastY = y;
      ensureLoop();
    }

    function addRipple(x, y) {
      if (!rippleEnabled) return;

      ripples.push({
        x: x,
        y: y,
        life: 0.82,
        maxLife: 0.82,
        radius: random(68, 96)
      });

      for (var i = 0; i < 7; i += 1) {
        var angle = (Math.PI * 2 * i) / 7 + random(-0.2, 0.2);
        var speed = random(34, 72);
        addParticle(x, y, {
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: random(1.4, 2.6),
          life: random(0.4, 0.7)
        });
      }

      ensureLoop();
    }

    function frame(now) {
      var dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      ctx.clearRect(0, 0, width, height);

      for (var i = particles.length - 1; i >= 0; i -= 1) {
        var p = particles[i];
        p.life -= dt;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }

        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 14 * dt;

        var alpha = Math.max(0, p.life / p.maxLife);
        var glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
        glow.addColorStop(0, 'hsla(' + p.hue + ', 92%, 78%, ' + (alpha * 0.58) + ')');
        glow.addColorStop(0.42, 'hsla(' + p.hue + ', 86%, 72%, ' + (alpha * 0.24) + ')');
        glow.addColorStop(1, 'hsla(' + p.hue + ', 86%, 72%, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 238, 247, ' + (alpha * 0.52) + ')';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }

      for (var j = ripples.length - 1; j >= 0; j -= 1) {
        var r = ripples[j];
        r.life -= dt;
        if (r.life <= 0) {
          ripples.splice(j, 1);
          continue;
        }

        var progress = 1 - r.life / r.maxLife;
        var eased = 1 - Math.pow(1 - progress, 3);
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius * eased, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(247, 164, 201, ' + ((1 - progress) * 0.72) + ')';
        ctx.lineWidth = Math.max(0.6, 2.4 * (1 - progress));
        ctx.stroke();

        var innerProgress = Math.max(0, (progress - 0.16) / 0.84);
        if (innerProgress > 0) {
          ctx.beginPath();
          ctx.arc(r.x, r.y, r.radius * 0.72 * (1 - Math.pow(1 - innerProgress, 3)), 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(255, 221, 238, ' + ((1 - innerProgress) * 0.5) + ')';
          ctx.lineWidth = Math.max(0.5, 1.5 * (1 - innerProgress));
          ctx.stroke();
        }
      }

      if (particles.length || ripples.length) {
        window.requestAnimationFrame(frame);
      } else {
        running = false;
      }
    }

    if (trailEnabled) {
      on(doc, 'pointermove', function (event) {
        if (event.pointerType === 'touch') return;
        addTrail(event.clientX, event.clientY);
      }, { passive: true });
      on(doc, 'pointerleave', function () {
        lastX = null;
        lastY = null;
      });
    }

    if (rippleEnabled) {
      on(doc, 'pointerdown', function (event) {
        addRipple(event.clientX, event.clientY);
      }, { passive: true });
    }
  }

  function initCoverAnimation() {
    var nodes = $$('.text-anim');
    if (!nodes.length) return;

    doc.documentElement.classList.add('js');

    var pinyin = {
      '下': 'xia',
      '次': 'ci',
      '见': 'jian',
      '面': 'mian',
      '时': 'shi',
      '我': 'wo',
      '们': 'men',
      '会': 'hui',
      '手': 'shou',
      '捧': 'peng',
      '鲜': 'xian',
      '花': 'hua'
    };
    var noiseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789{}[]<>/\\|=+-_*&^%#@!';
    var noise = function (len) {
      var out = '';
      for (var i = 0; i < len; i += 1) {
        out += noiseChars.charAt(Math.floor(Math.random() * noiseChars.length));
      }
      return out;
    };
    var timers = [];

    nodes.forEach(function (node) {
      var text = node.getAttribute('data-text') || '';
      var ghost = node.querySelector('.text-ghost');
      var live = node.querySelector('.text-live');
      if (!ghost || !live) return;

      ghost.textContent = text;

      if (node.getAttribute('data-anim') === '0' || reduceMotion) {
        live.textContent = text;
        node.classList.add('is-finished');
        return;
      }

      var chars = Array.from(text);
      if (!chars.length) return;

      live.textContent = '';
      var spans = chars.map(function (ch) {
        var span = doc.createElement('span');
        span.className = 'text-char';
        span.textContent = ch === ' ' ? '\u00a0' : noise(1);
        live.appendChild(span);
        return span;
      });
      var locked = chars.map(function () { return false; });

      var noiseTimer = window.setInterval(function () {
        spans.forEach(function (span, index) {
          if (!locked[index]) {
            span.textContent = chars[index] === ' ' ? '\u00a0' : noise(chars[index].length > 1 ? 2 : 1);
          }
        });
      }, 45);
      timers.push(noiseTimer);

      var base = Number(node.getAttribute('data-delay')) || 250;
      var stagger = Number(node.getAttribute('data-stagger')) || 70;
      var usePinyin = node.getAttribute('data-pinyin') === '1';

      function reveal(index) {
        var span = spans[index];
        var ch = chars[index];
        locked[index] = true;
        span.textContent = ch === ' ' ? '\u00a0' : ch;
        span.classList.remove('is-pinyin');
        span.classList.add('is-revealed');
        if (index === chars.length - 1) {
          window.setTimeout(function () {
            window.clearInterval(noiseTimer);
            node.classList.add('is-finished');
          }, 380);
        }
      }

      chars.forEach(function (ch, index) {
        window.setTimeout(function () {
          if (ch === ' ' || ch === '\u3000') {
            reveal(index);
            return;
          }

          var py = usePinyin && /[\u4e00-\u9fff]/.test(ch) ? pinyin[ch] : '';
          if (py) {
            locked[index] = true;
            spans[index].textContent = py;
            spans[index].classList.add('is-pinyin');
            window.setTimeout(function () { reveal(index); }, 160);
          } else {
            reveal(index);
          }
        }, base + index * stagger);
      });
    });

    window.setTimeout(function () {
      timers.forEach(function (timer) { window.clearInterval(timer); });
    }, 6000);
  }

  /* ---------- Init ---------- */
  function init() {
    setupCopyButtons();
    buildTOC();
    setupLightbox();
    wrapTables();
    markExternalLinks();
    initSearch();
    setupSearchShortcut();
    makeStars();
    makePetals();
    setupCursorGlow();
    initCursorFX();
    initCoverAnimation();
  }

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
