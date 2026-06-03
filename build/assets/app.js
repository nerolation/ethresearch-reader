/* Progressive enhancement for the Ethereum Research reader.
   With JS disabled, all posts still show and read; this only adds niceties. */
(function () {
  'use strict';

  /* ---- Theme toggle --------------------------------------------------- */
  var toggle = document.querySelector('.theme-toggle');
  function isDark() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  }
  function syncToggle() {
    if (toggle) toggle.setAttribute('aria-pressed', isDark() ? 'true' : 'false');
  }
  syncToggle();
  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = isDark() ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
      syncToggle();
    });
  }

  /* ---- Reading progress (post pages) ---------------------------------- */
  var bar = document.querySelector('.reading-progress span');
  if (bar) {
    var onScroll = function () {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      var pct = max > 0 ? (h.scrollTop || document.body.scrollTop) / max : 0;
      bar.style.width = Math.max(0, Math.min(1, pct)) * 100 + '%';
    };
    document.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    onScroll();
  }

  /* ---- Image lightbox ------------------------------------------------- */
  var body = document.querySelector('.post-body');
  if (body) {
    var box = null;
    var close = function () {
      if (!box) return;
      var el = box;
      el.classList.remove('open');
      setTimeout(function () { if (el && el.parentNode) el.parentNode.removeChild(el); }, 200);
      box = null;
    };
    body.addEventListener('click', function (e) {
      var img = e.target.closest('img');
      if (!img) return;
      close();
      box = document.createElement('div');
      box.className = 'lightbox';
      var big = document.createElement('img');
      big.src = img.currentSrc || img.src;
      big.alt = img.alt || '';
      box.appendChild(big);
      box.addEventListener('click', close);
      document.body.appendChild(box);
      requestAnimationFrame(function () { if (box) box.classList.add('open'); });
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  }

  /* ---- Code copy buttons ---------------------------------------------- */
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
  }
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('.code-copy');
    if (!btn) return;
    var wrap = btn.closest('.code-wrap');
    var code = wrap && wrap.querySelector('code');
    if (!code) return;
    var text = code.innerText;
    var done = function () {
      btn.textContent = 'Copied'; btn.classList.add('copied');
      setTimeout(function () { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 1500);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
    } else { fallbackCopy(text); done(); }
  });

  /* ---- Back to top ---------------------------------------------------- */
  var toTop = document.querySelector('.to-top');
  if (toTop) {
    var toggleTop = function () { toTop.classList.toggle('show', window.scrollY > 600); };
    document.addEventListener('scroll', toggleTop, { passive: true });
    toTop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
    toggleTop();
  }

  /* ---- Table-of-contents scroll spy ----------------------------------- */
  var tocLinks = Array.prototype.slice.call(document.querySelectorAll('.post-toc a'));
  if (tocLinks.length) {
    var hs = tocLinks
      .map(function (a) {
        var id = decodeURIComponent(a.getAttribute('href').slice(1));
        return { a: a, el: document.getElementById(id) };
      })
      .filter(function (x) { return x.el; });
    var onTocScroll = function () {
      var active = hs[0];
      for (var i = 0; i < hs.length; i++) {
        if (hs[i].el.getBoundingClientRect().top <= 140) active = hs[i]; else break;
      }
      hs.forEach(function (x) { x.a.classList.toggle('active', x === active); });
    };
    document.addEventListener('scroll', onTocScroll, { passive: true });
    onTocScroll();
  }

  /* ---- Offline selection + single-file download (all pages) ---------- */
  var OFF = (function offline() {
    var KEY = 'ethr-offline-selection';
    var sel;
    try { sel = JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { sel = []; }
    var selectMode = false;
    var isHome = !!document.getElementById('offlineStart');
    function persist() { try { localStorage.setItem(KEY, JSON.stringify(sel)); } catch (e) {} }
    var bar = document.getElementById('dlBar');
    var countEl = document.getElementById('dlCount');
    var goBtn = document.getElementById('dlGo');
    var clearBtn = document.getElementById('dlClear');
    var dlImgs = document.getElementById('dlImgs');
    var otCount = document.getElementById('otCount');
    var otGo = document.getElementById('otGo');
    function has(s) { return sel.indexOf(s) !== -1; }
    function toggle(s) {
      var i = sel.indexOf(s);
      if (i === -1) sel.push(s); else sel.splice(i, 1);
      persist(); syncAll();
    }
    function setAll(slugs) { sel = slugs.slice(); persist(); syncAll(); }
    function clearAll() { sel = []; persist(); syncAll(); }
    function setMode(on) { selectMode = !!on; document.body.classList.toggle('select-mode', selectMode); syncAll(); }
    function syncAll() {
      if (bar && countEl) {
        bar.hidden = sel.length === 0 || selectMode || isHome; // homepage uses the inline toolbar instead
        countEl.textContent = sel.length + (sel.length === 1 ? ' post selected' : ' posts selected');
      }
      document.querySelectorAll('.entry-check').forEach(function (b) {
        var on = has(b.getAttribute('data-slug'));
        b.setAttribute('aria-checked', on ? 'true' : 'false');
        var li = b.closest('.entry'); if (li) li.classList.toggle('selected', on);
      });
      document.querySelectorAll('.save-offline').forEach(function (b) {
        var on = has(b.getAttribute('data-slug'));
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        var lbl = b.querySelector('.so-label'); if (lbl) lbl.textContent = on ? 'Saved for offline' : 'Save for offline';
      });
      if (otCount) otCount.textContent = sel.length + ' selected';
      if (otGo) { otGo.disabled = sel.length === 0; var sp = otGo.querySelector('span'); if (sp) sp.textContent = sel.length ? 'Download (' + sel.length + ')' : 'Download'; }
    }
    document.addEventListener('click', function (e) {
      var chk = e.target.closest && e.target.closest('.entry-check');
      if (chk) { e.preventDefault(); toggle(chk.getAttribute('data-slug')); return; }
      var sv = e.target.closest && e.target.closest('.save-offline');
      if (sv) { toggle(sv.getAttribute('data-slug')); }
    });
    if (clearBtn) clearBtn.addEventListener('click', clearAll);
    if (goBtn) goBtn.addEventListener('click', function () { build({ images: !dlImgs || dlImgs.checked }); });

    function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }
    function escAttr(s) { return esc(s).replace(/"/g, '&quot;'); }

    async function build(opts) {
      if (!sel.length) return;
      var withImages = !(opts && opts.images === false);
      if (location.protocol === 'file:') {
        alert('Offline download needs the site served over http(s) — browsers block reading files from a file:// page.\n\nUse the published site, or run a local server:  python3 -m http.server -d site');
        return;
      }
      var busy = [goBtn, otGo].filter(Boolean);
      var prev = busy.map(function (b) { return b.innerHTML; });
      busy.forEach(function (b) { b.disabled = true; });
      if (otGo) { var s0 = otGo.querySelector('span'); if (s0) s0.textContent = 'Preparing…'; }
      if (goBtn) goBtn.textContent = 'Preparing…';
      try {
        var css = await fetch(withImages ? 'offline.css' : 'offline-lite.css').then(function (r) { return r.text(); });
        var cache = {};
        async function inlineImg(src) {
          if (cache[src]) return cache[src];
          try {
            var blob = await fetch(src).then(function (r) { return r.blob(); });
            var data = await new Promise(function (res, rej) { var fr = new FileReader(); fr.onload = function () { res(fr.result); }; fr.onerror = rej; fr.readAsDataURL(blob); });
            cache[src] = data; return data;
          } catch (e) { return src; } // cross-origin (ethresear.ch uploads): leave as-is
        }
        var parser = new DOMParser();
        var articles = [];
        for (var k = 0; k < sel.length; k++) {
          try {
            var html = await fetch(sel[k] + '.html').then(function (r) { return r.text(); });
            var doc = parser.parseFromString(html, 'text/html');
            var body = doc.querySelector('.post-body'); if (!body) continue;
            var titleEl = doc.querySelector('.post-title');
            var authorEl = doc.querySelector('.post-meta .byline span');
            var timeEl = doc.querySelector('.post-meta time');
            var likeEl = doc.querySelector('.like-btn');
            var orig = likeEl ? likeEl.getAttribute('href') : '';
            body.querySelectorAll('.code-copy, .heading-anchor').forEach(function (e) { e.remove(); });
            var imgs = body.querySelectorAll('img');
            if (withImages) {
              for (var ii = 0; ii < imgs.length; ii++) {
                var s = imgs[ii].getAttribute('src');
                if (s && s.indexOf('data:') !== 0) { imgs[ii].setAttribute('src', await inlineImg(s)); imgs[ii].removeAttribute('loading'); }
              }
            } else {
              for (var ij = 0; ij < imgs.length; ij++) {
                var alt = imgs[ij].getAttribute('alt') || '';
                var ph = document.createElement('p');
                ph.className = 'img-omitted';
                ph.textContent = '[image' + (alt ? ': ' + alt : '') + ']';
                imgs[ij].replaceWith(ph);
              }
            }
            articles.push('<article class="post"><div class="post-body"><h1 class="post-title">' + (titleEl ? titleEl.innerHTML : esc(sel[k])) + '</h1>'
              + '<p class="post-byline">' + esc(authorEl ? authorEl.textContent : '') + (timeEl ? ' · ' + esc(timeEl.textContent) : '')
              + (orig ? ' · <a href="' + escAttr(orig) + '">View original ↗</a>' : '') + '</p>'
              + body.innerHTML + '</div></article>');
          } catch (e) {}
        }
        if (!articles.length) throw new Error('nothing to export');
        var date = new Date().toISOString().slice(0, 10);
        var out = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
          + '<title>Ethereum Research — offline (' + articles.length + ' posts)</title>'
          + '<script>try{document.documentElement.setAttribute("data-theme",(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches)?"dark":"light");}catch(e){}<\/script>'
          + '<style>' + css + '</style></head><body class="offline">'
          + '<header class="offline-head"><h1>Ethereum Research</h1><p>Offline selection · ' + articles.length + ' posts · ' + date + (withImages ? '' : ' · text only') + '</p></header><main>'
          + articles.join('\n') + '</main></body></html>';
        var url = URL.createObjectURL(new Blob([out], { type: 'text/html' }));
        var a = document.createElement('a');
        a.href = url; a.download = 'ethresearch-offline-' + articles.length + '-posts' + (withImages ? '' : '-text') + '.html';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
      } catch (e) {
        var msg = (e && e.message) || String(e);
        if (/fetch|load failed|networkerror/i.test(msg)) msg += ' — if you opened this as a local file, serve it over http instead (python3 -m http.server -d site).';
        alert('Sorry, the offline download failed: ' + msg);
      }
      busy.forEach(function (b, i) { b.disabled = false; b.innerHTML = prev[i]; });
      syncAll();
    }

    syncAll();
    return { has: has, toggle: toggle, setAll: setAll, clear: clearAll, sync: syncAll, setMode: setMode, build: build };
  })();

  /* ---- Index: search, author + tag filters, sort ---------------------- */
  var list = document.getElementById('postList');
  if (!list) return;

  var cards = Array.prototype.slice.call(list.querySelectorAll('.entry'));
  var ordered = cards.slice(); // current sort order
  var sentinel = document.getElementById('loadMore');
  var PAGE = 24; // entries revealed per batch
  var shown = PAGE;
  var search = document.getElementById('search');
  var suggest = document.getElementById('searchSuggest');
  var sortSel = document.getElementById('sort');
  var tagFilter = document.getElementById('tagFilter');
  var authorFilter = document.getElementById('authorFilter');
  var topicsDetails = document.querySelector('details.topics');
  var resultCount = document.getElementById('resultCount');
  var emptyState = document.getElementById('emptyState');
  var filters = { tag: [], author: [] };

  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }

  // Full-text index (titles + body), fetched lazily on first search interaction.
  var searchIndex = null, idxBySlug = {};
  function loadIndex() {
    if (searchIndex || loadIndex._p) return;
    loadIndex._p = fetch('search-index.json')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        searchIndex = data;
        data.forEach(function (r) { idxBySlug[r.s] = r; });
        var q = (search && search.value || '').trim().toLowerCase();
        if (q) { render(); buildSuggestions(q); } // upgrade to full-text now that it's ready
      })
      .catch(function () {});
  }

  function syncGroup(container, attr) {
    if (!container) return;
    var sel = attr === 'data-tag' ? filters.tag : filters.author;
    container.querySelectorAll('.tag-chip').forEach(function (btn) {
      var v = btn.getAttribute(attr);
      var on = v === '' ? sel.length === 0 : sel.indexOf(v) !== -1;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function passesFilters(card) {
    var cardTags = (card.getAttribute('data-tags') || '').split(/\s+/);
    var mTag = filters.tag.length === 0 || filters.tag.some(function (t) { return cardTags.indexOf(t) !== -1; });
    var mAuthor = filters.author.length === 0 || filters.author.indexOf(card.getAttribute('data-author')) !== -1;
    return mTag && mAuthor;
  }

  // Title matches first, then body/full-text matches; each group keeps the sort
  // order. Display order is driven by CSS `order` (flex), so no DOM moves.
  function render() {
    var q = (search && search.value || '').trim().toLowerCase();
    var titleHits = [], textHits = [];
    ordered.forEach(function (card) {
      if (!passesFilters(card)) { card.hidden = true; return; }
      if (!q) { titleHits.push(card); return; }
      var rec = idxBySlug[card.getAttribute('data-slug')];
      var titleHit, anyHit;
      if (rec) {
        titleHit = rec.tl.indexOf(q) !== -1;
        anyHit = titleHit || rec.bl.indexOf(q) !== -1;
      } else { // index not loaded yet — fall back to the inline data-search blob
        titleHit = (card.getAttribute('data-title') || '').indexOf(q) !== -1;
        anyHit = titleHit || (card.getAttribute('data-search') || '').indexOf(q) !== -1;
      }
      if (anyHit) (titleHit ? titleHits : textHits).push(card);
      else card.hidden = true;
    });
    var result = titleHits.concat(textHits);
    result.forEach(function (card, i) { card.style.order = i; card.hidden = i >= shown; });
    var matched = result.length;
    var filtered = q || filters.tag.length || filters.author.length;
    if (resultCount) resultCount.textContent = filtered ? matched + ' of ' + cards.length + ' posts' : cards.length + ' posts';
    if (emptyState) emptyState.hidden = matched !== 0;
    if (sentinel) sentinel.hidden = matched <= shown;
  }

  function apply() { shown = PAGE; render(); } // reset the window on filter/search/sort change
  function loadMore() { shown += PAGE; render(); }

  function sortCards(mode) {
    ordered.sort(function (a, b) {
      var da = a.getAttribute('data-date') || '', db = b.getAttribute('data-date') || '';
      var ta = a.getAttribute('data-title') || '', tb = b.getAttribute('data-title') || '';
      if (mode === 'old') return da.localeCompare(db) || ta.localeCompare(tb);
      if (mode === 'likes') return (+b.getAttribute('data-likes')) - (+a.getAttribute('data-likes')) || db.localeCompare(da) || ta.localeCompare(tb);
      if (mode === 'title') return ta.localeCompare(tb) || db.localeCompare(da);
      return db.localeCompare(da) || ta.localeCompare(tb); // newest
    });
    apply();
  }

  /* ---- typeahead suggestions ----------------------------------------- */
  var sgActive = -1;
  function highlight(text, q) {
    var i = text.toLowerCase().indexOf(q);
    if (i < 0) return escapeHtml(text);
    return escapeHtml(text.slice(0, i)) + '<mark>' + escapeHtml(text.slice(i, i + q.length)) + '</mark>' + escapeHtml(text.slice(i + q.length));
  }
  function closeSuggest() {
    if (suggest) { suggest.hidden = true; suggest.innerHTML = ''; }
    sgActive = -1;
    if (search) { search.setAttribute('aria-expanded', 'false'); search.removeAttribute('aria-activedescendant'); }
  }
  function buildSuggestions(q) {
    if (!suggest || !search) return;
    if (!q) { closeSuggest(); return; }
    if (!searchIndex) { loadIndex(); return; } // will rebuild once the index arrives
    var pre = [], inc = [];
    for (var i = 0; i < searchIndex.length; i++) {
      var r = searchIndex[i], pos = r.tl.indexOf(q);
      if (pos === 0) pre.push(r); else if (pos > 0) inc.push(r);
    }
    var items = pre.concat(inc).slice(0, 7); // prefix matches first
    sgActive = -1;
    if (!items.length) {
      suggest.innerHTML = '<li class="sg-empty">No title matches — see full-text results below</li>';
    } else {
      suggest.innerHTML = items.map(function (r, idx) {
        return '<li class="sg-item" role="option" id="sg' + idx + '" data-slug="' + escapeHtml(r.s) + '">'
          + '<span class="sg-title">' + highlight(r.t, q) + '</span>'
          + '<span class="sg-meta">' + escapeHtml(r.a) + (r.d ? ' · ' + escapeHtml(r.d) : '') + '</span></li>';
      }).join('');
    }
    suggest.hidden = false;
    search.setAttribute('aria-expanded', 'true');
  }
  function setActive(n) {
    var els = suggest ? suggest.querySelectorAll('.sg-item') : [];
    if (!els.length) return;
    sgActive = (n + els.length) % els.length;
    for (var i = 0; i < els.length; i++) els[i].classList.toggle('active', i === sgActive);
    search.setAttribute('aria-activedescendant', 'sg' + sgActive);
    els[sgActive].scrollIntoView({ block: 'nearest' });
  }
  function go(slug) { if (slug) window.location.href = slug + '.html'; }
  if (suggest) {
    suggest.addEventListener('mousedown', function (e) { e.preventDefault(); }); // keep input focus
    suggest.addEventListener('click', function (e) {
      var it = e.target.closest('.sg-item');
      if (it) go(it.getAttribute('data-slug'));
    });
  }

  /* ---- infinite scroll ----------------------------------------------- */
  function nearBottom() {
    if (!sentinel || sentinel.hidden) return false;
    var vh = window.innerHeight || document.documentElement.clientHeight;
    return sentinel.getBoundingClientRect().top < vh + 600;
  }
  function fill() { var g = 0; while (nearBottom() && g++ < 60) loadMore(); }
  var ticking = false;
  function onScroll() { if (ticking) return; ticking = true; requestAnimationFrame(function () { ticking = false; fill(); }); }
  document.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });

  /* ---- filter chips -------------------------------------------------- */
  function bindGroup(container, attr) {
    if (!container) return;
    var key = attr === 'data-tag' ? 'tag' : 'author';
    container.addEventListener('click', function (e) {
      var btn = e.target.closest('.tag-chip');
      if (!btn) return;
      var v = btn.getAttribute(attr);
      if (v === '') filters[key] = [];
      else { var i = filters[key].indexOf(v); if (i === -1) filters[key].push(v); else filters[key].splice(i, 1); }
      syncGroup(container, attr);
      apply();
    });
  }
  list.addEventListener('click', function (e) {
    var btn = e.target.closest('.tag-filter-btn');
    if (!btn) return;
    var tag = btn.getAttribute('data-tag');
    if (filters.tag.indexOf(tag) === -1) filters.tag.push(tag);
    if (topicsDetails) topicsDetails.open = true;
    syncGroup(tagFilter, 'data-tag');
    apply();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* ---- deep links: ?q=, ?tag=, ?author= ------------------------------ */
  try {
    var params = new URLSearchParams(window.location.search);
    if (search && (params.get('q') || params.get('search'))) search.value = params.get('q') || params.get('search');
    if (params.get('tag')) filters.tag = [params.get('tag')];
    if (params.get('author')) filters.author = [params.get('author').toLowerCase()];
    if (filters.tag.length && topicsDetails) topicsDetails.open = true;
  } catch (e) {}

  bindGroup(tagFilter, 'data-tag');
  bindGroup(authorFilter, 'data-author');

  // "+N more" / "Show fewer" for the author chips.
  var moreAuthors = document.getElementById('moreAuthors');
  if (moreAuthors && authorFilter) {
    var nExtra = authorFilter.querySelectorAll('.author-extra').length;
    moreAuthors.addEventListener('click', function () {
      var exp = authorFilter.classList.toggle('expanded');
      moreAuthors.setAttribute('aria-expanded', exp ? 'true' : 'false');
      moreAuthors.textContent = exp ? 'Show fewer' : '+' + nExtra + ' more';
    });
  }

  if (search) {
    search.addEventListener('focus', loadIndex);
    search.addEventListener('input', function () {
      loadIndex();
      var q = search.value.trim().toLowerCase();
      apply();
      buildSuggestions(q);
    });
    search.addEventListener('keydown', function (e) {
      var open = suggest && !suggest.hidden;
      if (e.key === 'ArrowDown') { if (open) { e.preventDefault(); setActive(sgActive + 1); } }
      else if (e.key === 'ArrowUp') { if (open) { e.preventDefault(); setActive(sgActive - 1); } }
      else if (e.key === 'Enter') {
        var els = suggest ? suggest.querySelectorAll('.sg-item') : [];
        if (open && sgActive >= 0 && els[sgActive]) { e.preventDefault(); go(els[sgActive].getAttribute('data-slug')); return; }
        closeSuggest();
      } else if (e.key === 'Escape') {
        if (open) { e.preventDefault(); closeSuggest(); }
        else { search.value = ''; apply(); closeSuggest(); search.blur(); }
      }
    });
    search.addEventListener('blur', function () { setTimeout(closeSuggest, 120); });
    if (search.value.trim()) loadIndex();
  }
  if (sortSel) sortSel.addEventListener('change', function () { sortCards(sortSel.value); });

  // "/" focuses the search box from anywhere.
  document.addEventListener('keydown', function (e) {
    var tag = (e.target && e.target.tagName) || '';
    if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(tag) && search) { e.preventDefault(); search.focus(); }
  });

  /* ---- offline select mode (homepage) -------------------------------- */
  function matchedSlugs() {
    var q = (search && search.value || '').trim().toLowerCase();
    var out = [];
    ordered.forEach(function (card) {
      if (!passesFilters(card)) return;
      if (q) {
        var rec = idxBySlug[card.getAttribute('data-slug')];
        var hit = rec ? (rec.tl.indexOf(q) !== -1 || rec.bl.indexOf(q) !== -1) : ((card.getAttribute('data-search') || '').indexOf(q) !== -1);
        if (!hit) return;
      }
      out.push(card.getAttribute('data-slug'));
    });
    return out;
  }
  var offlineStart = document.getElementById('offlineStart');
  var offlineToolbar = document.getElementById('offlineToolbar');
  if (offlineStart && offlineToolbar) {
    offlineStart.addEventListener('click', function () { offlineStart.hidden = true; offlineToolbar.hidden = false; OFF.setMode(true); });
    var otDone = document.getElementById('otDone');
    if (otDone) otDone.addEventListener('click', function () { offlineToolbar.hidden = true; offlineStart.hidden = false; OFF.setMode(false); });
    var otAll = document.getElementById('otAll');
    if (otAll) otAll.addEventListener('click', function () {
      var slugs = matchedSlugs();
      if (slugs.length > 100 && !window.confirm('Select all ' + slugs.length + ' posts? The download will be large.')) return;
      OFF.setAll(slugs);
    });
    var otNone = document.getElementById('otNone');
    if (otNone) otNone.addEventListener('click', function () { OFF.clear(); });
    var otImgs = document.getElementById('otImgs');
    var otGoBtn = document.getElementById('otGo');
    if (otGoBtn) otGoBtn.addEventListener('click', function () { OFF.build({ images: !otImgs || otImgs.checked }); });
  }

  syncGroup(tagFilter, 'data-tag');
  syncGroup(authorFilter, 'data-author');
  apply();
  fill(); // top up if the first batch doesn't fill a tall viewport
})();
