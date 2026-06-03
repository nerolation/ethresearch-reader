// HTML templates for the static site. Pure string builders — no runtime deps.

export const escapeHtml = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export const escapeAttr = (s) => escapeHtml(s).replace(/'/g, '&#39;');

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

// ---- icons (inline SVG) -------------------------------------------------
const I = {
  heart:
    '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" class="i-heart"><path d="M12 21s-7.5-4.6-10-9.2C.6 9 1.6 5.5 4.8 4.6 7 4 9 5 12 8c3-3 5-4 7.2-3.4 3.2.9 4.2 4.4 2.8 7.2C19.5 16.4 12 21 12 21z"/></svg>',
  ext: '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" class="i-ext"><path d="M7 17 17 7M9 7h8v8"/></svg>',
  sun: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" class="i-sun"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8"/></svg>',
  moon: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" class="i-moon"><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.6 6.6 0 0 0 9.8 9.8z"/></svg>',
  search:
    '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/></svg>',
  up: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
};

const FAVICON =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="%233a5a98"/><text x="16" y="23" font-family="Georgia,serif" font-size="20" fill="%23fff" text-anchor="middle">Ξ</text></svg>'
  );

function siteHeader(base) {
  return `<header class="site-header">
  <div class="wrap header-wrap">
    <a class="brand" href="${base}index.html">Ethereum Research<span class="brand-dim"> reader</span></a>
    <nav class="site-nav">
      <a class="nav-link" href="https://ethresear.ch" target="_blank" rel="noopener">ethresear.ch ${I.ext}</a>
      <button class="theme-toggle" type="button" aria-label="Toggle colour theme" aria-pressed="false" title="Toggle light / dark">${I.sun}${I.moon}</button>
    </nav>
  </div>
</header>`;
}

function siteFooter() {
  return `<footer class="site-footer">
  <div class="wrap">
    <p>A clean, read-only interface for posts on <a href="https://ethresear.ch" target="_blank" rel="noopener">ethresear.ch</a>. This site does not replace it &mdash; all curation, discussion and likes happen on the original forum. Text and figures &copy; their respective authors.</p>
  </div>
</footer>`;
}

export function layout({
  title, description = '', base = '', bodyClass = '', main, readingProgress = false,
  ogType = 'website', canonical = '', ogUrl = '', ogImage = '', author = '',
}) {
  const themeBoot =
    `<script>(function(){try{var t=localStorage.getItem('theme');` +
    `if(t!=='light'&&t!=='dark'){t=(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light';}` +
    `document.documentElement.setAttribute('data-theme',t);}catch(e){}})();</script>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeAttr(description)}">
<meta name="color-scheme" content="light dark">
${author ? `<meta name="author" content="${escapeAttr(author)}">` : ''}
${canonical ? `<link rel="canonical" href="${escapeAttr(canonical)}">` : ''}
<meta property="og:title" content="${escapeAttr(title)}">
<meta property="og:description" content="${escapeAttr(description)}">
<meta property="og:type" content="${ogType}">
${ogUrl ? `<meta property="og:url" content="${escapeAttr(ogUrl)}">` : ''}
${ogImage ? `<meta property="og:image" content="${escapeAttr(ogImage)}">` : ''}
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${escapeAttr(title)}">
<meta name="twitter:description" content="${escapeAttr(description)}">
${ogImage ? `<meta name="twitter:image" content="${escapeAttr(ogImage)}">` : ''}
<link rel="icon" href="${FAVICON}">
<link rel="stylesheet" href="${base}assets/katex/katex.min.css">
<link rel="stylesheet" href="${base}assets/style.css">
${themeBoot}
</head>
<body class="${bodyClass}">
${readingProgress ? '<div class="reading-progress" aria-hidden="true"><span></span></div>' : ''}
${siteHeader(base)}
<main class="site-main">
${main}
</main>
${siteFooter()}
<script src="${base}assets/app.js" defer></script>
</body>
</html>`;
}

function avatarTag(author, cls) {
  if (author.avatarLocal) {
    return `<img class="${cls}" src="assets/avatars/${escapeAttr(author.avatarLocal)}" alt="" width="48" height="48" loading="lazy">`;
  }
  const initials = (author.name || '?')
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return `<span class="${cls} avatar-fallback" aria-hidden="true">${escapeHtml(initials)}</span>`;
}

function tagChips(tags, base = '') {
  if (!tags || !tags.length) return '';
  return tags
    .map(
      (t) =>
        `<a class="tag" href="${base}index.html?tag=${encodeURIComponent(t)}">${escapeHtml(t)}</a>`
    )
    .join('');
}

// ---- post page ----------------------------------------------------------
export function postMain(post, nav) {
  const likeBadge =
    post.likes != null ? `<span class="dot">&middot;</span><span class="meta-likes">${I.heart} ${post.likes}</span>` : '';
  const byline = post.author.profileUrl
    ? `<a class="byline" href="${escapeAttr(post.author.profileUrl)}" target="_blank" rel="noopener">${avatarTag(post.author, 'avatar')}<span>${escapeHtml(post.author.name)}</span></a>`
    : `<span class="byline">${avatarTag(post.author, 'avatar')}<span>${escapeHtml(post.author.name)}</span></span>`;

  const navHtml =
    nav.prev || nav.next
      ? `<nav class="post-nav">
${nav.prev ? `<a class="post-nav-item prev" href="${escapeAttr(nav.prev.slug)}.html"><span class="nav-dir">&larr; Newer</span><span class="nav-title">${escapeHtml(nav.prev.titlePlain)}</span></a>` : '<span class="post-nav-item empty"></span>'}
${nav.next ? `<a class="post-nav-item next" href="${escapeAttr(nav.next.slug)}.html"><span class="nav-dir">Older &rarr;</span><span class="nav-title">${escapeHtml(nav.next.titlePlain)}</span></a>` : '<span class="post-nav-item empty"></span>'}
</nav>`
      : '';

  const toc = (post.headings || []).filter((h) => h.level === 2 || h.level === 3);
  const tocHtml = toc.length >= 3
    ? `<aside class="post-toc" aria-label="Table of contents"><p class="toc-title">On this page</p><nav><ul>${toc
        .map((h) => `<li class="toc-l${h.level}"><a href="#${escapeAttr(h.id)}">${escapeHtml(h.text)}</a></li>`)
        .join('')}</ul></nav></aside>`
    : '';
  const related = post.related && post.related.length
    ? `<section class="related"><h2 class="related-title">Related posts</h2><div class="related-grid">${post.related
        .map((r) => `<a class="related-card" href="${escapeAttr(r.slug)}.html"><span class="related-card-title">${r.titleHtml}</span><span class="related-card-meta">${miniAvatar(r.author)}${escapeHtml(r.author.name)}</span></a>`)
        .join('')}</div></section>`
    : '';

  return `<div class="post-wrap">${tocHtml}<article class="post">
  <a class="back-link" href="index.html">&larr; All posts</a>
  <header class="post-head">
    ${post.tags.length ? `<div class="post-tags">${tagChips(post.tags)}</div>` : ''}
    <h1 class="post-title">${post.titleHtml}</h1>
    <div class="post-meta">
      ${byline}
      ${post.dateLabel ? `<span class="dot">&middot;</span><time datetime="${escapeAttr(post.createdAt || '')}">${escapeHtml(post.dateLabel)}</time>` : ''}
      <span class="dot">&middot;</span><span>${post.readingMinutes} min read</span>
      ${likeBadge}
    </div>
  </header>
  <div class="post-body">
${post.html}
  </div>
  <div class="engage">
    <a class="like-btn" href="${escapeAttr(post.url)}" target="_blank" rel="noopener" title="Opens the original thread on ethresear.ch, where you can like it">
      ${I.heart}<span class="like-label">Like on ethresear.ch</span>${post.likes != null ? `<span class="like-count">${post.likes}</span>` : ''}${I.ext}
    </a>
    <a class="discuss-link" href="${escapeAttr(post.url)}" target="_blank" rel="noopener">Read the replies &amp; discuss on ethresear.ch ${I.ext}</a>
  </div>
  ${related}
  ${navHtml}
</article>
<button class="to-top" type="button" aria-label="Back to top" title="Back to top">${I.up}</button>
</div>`;
}

// ---- index page ---------------------------------------------------------
function miniAvatar(author) {
  if (author.avatarLocal) {
    return `<img class="mini-avatar" src="assets/avatars/${escapeAttr(author.avatarLocal)}" alt="" width="20" height="20" loading="lazy">`;
  }
  return '';
}

function postEntry(post) {
  const authorKey = (post.author.username || post.author.name || '').toLowerCase();
  const search = `${post.titlePlain} ${post.excerpt} ${post.author.name} ${post.tags.join(' ')}`.toLowerCase();
  const likes = post.likes != null ? `<span class="sep">&middot;</span><span class="entry-likes">${I.heart} ${post.likes}</span>` : '';
  const tags = post.tags
    .slice(0, 3)
    .map((t) => `<button type="button" class="entry-tag tag-filter-btn" data-tag="${escapeAttr(t)}" title="Filter by ${escapeAttr(t)}">${escapeHtml(t)}</button>`)
    .join('');
  return `<li class="entry" data-slug="${escapeAttr(post.slug)}" data-title="${escapeAttr(post.titlePlain.toLowerCase())}" data-date="${escapeAttr(post.createdAt || '')}" data-likes="${post.likes ?? 0}" data-tags="${escapeAttr(post.tags.join(' '))}" data-author="${escapeAttr(authorKey)}" data-search="${escapeAttr(search)}">
  <a class="entry-link" href="${escapeAttr(post.slug)}.html">
    <h2 class="entry-title">${post.titleHtml}</h2>
    ${post.excerpt ? `<p class="entry-excerpt">${escapeHtml(post.excerpt)}</p>` : ''}
  </a>
  <div class="entry-meta">
    <span class="entry-author">${miniAvatar(post.author)}${escapeHtml(post.author.name)}</span>
    ${post.dateLabel ? `<span class="sep">&middot;</span><time datetime="${escapeAttr(post.createdAt || '')}">${escapeHtml(post.dateLabel)}</time>` : ''}
    <span class="sep">&middot;</span><span>${post.readingMinutes} min read</span>
    ${likes}
    ${tags ? `<span class="entry-tags">${tags}</span>` : ''}
  </div>
</li>`;
}

export function indexMain(posts, tags, authors) {
  const AUTHOR_PRIMARY = 12; // most-prolific authors shown by default; rest behind "+N more"
  const authorChip = (a, isExtra) =>
    `<button class="tag-chip author-chip${isExtra ? ' author-extra' : ''}" type="button" data-author="${escapeAttr((a.username || a.name).toLowerCase())}" aria-pressed="false">${miniAvatar(a)}${escapeHtml(a.name)} <span class="tag-count">${a.count}</span></button>`;
  const authorButtons =
    authors.slice(0, AUTHOR_PRIMARY).map((a) => authorChip(a, false)).join('') +
    authors.slice(AUTHOR_PRIMARY).map((a) => authorChip(a, true)).join('') +
    (authors.length > AUTHOR_PRIMARY
      ? `<button type="button" class="more-toggle" id="moreAuthors" aria-expanded="false" aria-controls="authorFilter">+${authors.length - AUTHOR_PRIMARY} more</button>`
      : '');
  const tagButtons = tags
    .map(
      (t) =>
        `<button class="tag-chip" type="button" data-tag="${escapeAttr(t.name)}" aria-pressed="false">${escapeHtml(t.name)} <span class="tag-count">${t.count}</span></button>`
    )
    .join('');

  return `<div class="index">
  <section class="hero hero-archive">
    <p class="hero-eyebrow">A reading archive</p>
    <h1 class="hero-title">Ethereum Research</h1>
    <p class="hero-tagline">Protocol research from <a href="https://ethresear.ch" target="_blank" rel="noopener">ethresear.ch</a>, set for quiet reading.</p>
    <p class="hero-stats"><span>${posts.length} posts</span><span class="sep"></span><span>${authors.length} researchers</span></p>
  </section>

  <div class="toolbar">
    <div class="search-box">
      ${I.search}
      <input type="search" id="search" placeholder="Search ${posts.length} posts&hellip;" autocomplete="off" aria-label="Search posts" role="combobox" aria-expanded="false" aria-controls="searchSuggest" aria-autocomplete="list">
      <ul class="search-suggest" id="searchSuggest" role="listbox" hidden></ul>
    </div>
    <label class="sort-box">Sort
      <select id="sort" aria-label="Sort posts">
        <option value="new">Newest</option>
        <option value="old">Oldest</option>
        <option value="likes">Most likes</option>
        <option value="title">Title A&ndash;Z</option>
      </select>
    </label>
  </div>

  <div class="chip-row authors-row" id="authorFilter" role="group" aria-label="Filter by author">
    <button class="tag-chip active" type="button" data-author="" aria-pressed="true">All authors</button>
    ${authorButtons}
  </div>

  <details class="topics">
    <summary>Browse by topic</summary>
    <div class="chip-row" id="tagFilter" role="group" aria-label="Filter by tag">
      <button class="tag-chip active" type="button" data-tag="" aria-pressed="true">All</button>
      ${tagButtons}
    </div>
  </details>

  <p class="result-count" id="resultCount" aria-live="polite"></p>

  <ol class="entry-list" id="postList">
    ${posts.map(postEntry).join('\n    ')}
  </ol>
  <div class="load-sentinel" id="loadMore" aria-hidden="true"></div>
  <p class="empty-state" id="emptyState" hidden>No posts match your filters.</p>
</div>`;
}
