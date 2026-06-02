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

  /* ---- Index: search, author + tag filters, sort ---------------------- */
  var list = document.getElementById('postList');
  if (!list) return;

  var cards = Array.prototype.slice.call(list.querySelectorAll('.entry'));
  var ordered = cards.slice(); // current display order
  var sentinel = document.getElementById('loadMore');
  var PAGE = 24; // entries revealed per batch
  var shown = PAGE;
  var search = document.getElementById('search');
  var sortSel = document.getElementById('sort');
  var tagFilter = document.getElementById('tagFilter');
  var authorFilter = document.getElementById('authorFilter');
  var topicsDetails = document.querySelector('details.topics');
  var resultCount = document.getElementById('resultCount');
  var emptyState = document.getElementById('emptyState');
  var filters = { tag: [], author: [] };

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

  function matchesCard(card, q) {
    var mSearch = !q || (card.getAttribute('data-search') || '').indexOf(q) !== -1;
    var cardTags = (card.getAttribute('data-tags') || '').split(/\s+/);
    var mTag = filters.tag.length === 0 || filters.tag.some(function (t) { return cardTags.indexOf(t) !== -1; });
    var mAuthor = filters.author.length === 0 || filters.author.indexOf(card.getAttribute('data-author')) !== -1;
    return mSearch && mTag && mAuthor;
  }

  // Render in display order, revealing only the first `shown` matching entries.
  function render() {
    var q = (search && search.value || '').trim().toLowerCase();
    var matched = 0;
    ordered.forEach(function (card) {
      if (matchesCard(card, q)) {
        matched++;
        card.hidden = matched > shown;
      } else {
        card.hidden = true;
      }
    });
    var filtered = q || filters.tag.length || filters.author.length;
    if (resultCount) {
      resultCount.textContent = filtered ? matched + ' of ' + cards.length + ' posts' : cards.length + ' posts';
    }
    if (emptyState) emptyState.hidden = matched !== 0;
    if (sentinel) sentinel.hidden = matched <= shown; // hide trigger when nothing left to load
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
    ordered.forEach(function (c) { list.appendChild(c); });
    apply();
  }

  // Infinite scroll: reveal more as the sentinel nears the viewport. A rAF-throttled
  // scroll/resize handler with a "fill" loop also covers very tall viewports.
  function nearBottom() {
    if (!sentinel || sentinel.hidden) return false;
    var vh = window.innerHeight || document.documentElement.clientHeight;
    return sentinel.getBoundingClientRect().top < vh + 600;
  }
  function fill() {
    var guard = 0;
    while (nearBottom() && guard++ < 60) loadMore();
  }
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; fill(); });
  }
  document.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });

  function bindGroup(container, attr) {
    if (!container) return;
    var key = attr === 'data-tag' ? 'tag' : 'author';
    container.addEventListener('click', function (e) {
      var btn = e.target.closest('.tag-chip');
      if (!btn) return;
      var v = btn.getAttribute(attr);
      if (v === '') {
        filters[key] = [];
      } else {
        var i = filters[key].indexOf(v);
        if (i === -1) filters[key].push(v); else filters[key].splice(i, 1);
      }
      syncGroup(container, attr);
      apply();
    });
  }

  // Tag pills on the cards act as quick filters.
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

  // Deep links: ?q=, ?tag=, ?author=
  try {
    var params = new URLSearchParams(window.location.search);
    if (search && (params.get('q') || params.get('search'))) search.value = params.get('q') || params.get('search');
    if (params.get('tag')) filters.tag = [params.get('tag')];
    if (params.get('author')) filters.author = [params.get('author').toLowerCase()];
    if (filters.tag.length && topicsDetails) topicsDetails.open = true;
  } catch (e) {}

  bindGroup(tagFilter, 'data-tag');
  bindGroup(authorFilter, 'data-author');
  if (search) search.addEventListener('input', apply);
  if (sortSel) sortSel.addEventListener('change', function () { sortCards(sortSel.value); });

  // "/" focuses search; Escape clears it.
  document.addEventListener('keydown', function (e) {
    var tag = (e.target && e.target.tagName) || '';
    if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(tag) && search) { e.preventDefault(); search.focus(); }
    else if (e.key === 'Escape' && document.activeElement === search) { search.value = ''; apply(); search.blur(); }
  });

  syncGroup(tagFilter, 'data-tag');
  syncGroup(authorFilter, 'data-author');
  apply();
  fill(); // top up if the first batch doesn't fill a tall viewport
})();
