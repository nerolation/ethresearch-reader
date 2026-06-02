// Static site builder: reads every {slug}.md, renders it, enriches with the
// metadata fetched from ethresear.ch, and emits a self-contained ./site/.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderPost } from './render.js';
import { layout, postMain, indexMain, formatDate, escapeHtml } from './templates.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const POSTS = path.join(ROOT, 'posts');
const SITE = path.join(ROOT, 'site');
const ASSETS = path.join(SITE, 'assets');
const SRC_ASSETS = path.join(ROOT, 'build', 'assets');

// CMU Serif (Computer Modern Unicode) — the classic LaTeX look.
const CMU_FONTS = ['regular', 'italic', 'bold', 'bolditalic'];

const normalizeTitle = (s) => String(s || '').replace(/''/g, '"').replace(/``/g, '"');

function listSlugs() {
  return fs
    .readdirSync(POSTS)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''))
    .sort();
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
}

function vendorAssets() {
  fs.mkdirSync(ASSETS, { recursive: true });
  // KaTeX css + fonts (katex.min.css references ./fonts relatively)
  fs.mkdirSync(path.join(ASSETS, 'katex'), { recursive: true });
  fs.copyFileSync(
    path.join(ROOT, 'node_modules/katex/dist/katex.min.css'),
    path.join(ASSETS, 'katex', 'katex.min.css')
  );
  copyDir(path.join(ROOT, 'node_modules/katex/dist/fonts'), path.join(ASSETS, 'katex', 'fonts'));
  // CMU Serif (vendored woff2 in build/vendor/cmu)
  fs.mkdirSync(path.join(ASSETS, 'fonts'), { recursive: true });
  const cmuDir = path.join(ROOT, 'build', 'vendor', 'cmu');
  for (const style of CMU_FONTS) {
    const name = `cmu-serif-${style}.woff2`;
    const from = path.join(cmuDir, name);
    if (fs.existsSync(from)) fs.copyFileSync(from, path.join(ASSETS, 'fonts', name));
  }
  // Content images + author avatars
  copyDir(path.join(ROOT, 'images'), path.join(SITE, 'images'));
  copyDir(path.join(ROOT, 'data', 'avatars'), path.join(ASSETS, 'avatars'));
  // Our stylesheet + script
  fs.copyFileSync(path.join(SRC_ASSETS, 'style.css'), path.join(ASSETS, 'style.css'));
  fs.copyFileSync(path.join(SRC_ASSETS, 'app.js'), path.join(ASSETS, 'app.js'));
}

function buildPosts() {
  const meta = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'meta.json'), 'utf8'));
  const slugs = listSlugs();
  const knownSlugs = new Set(slugs);
  const posts = slugs.map((slug) => {
    const raw = fs.readFileSync(path.join(POSTS, `${slug}.md`), 'utf8');
    const r = renderPost(raw, { knownSlugs });
    const m = meta[slug] || {};
    const a = m.author || {};
    const author = {
      name: a.name || 'Unknown author',
      username: a.username || null,
      avatarLocal: a.avatarLocal || null,
      profileUrl: a.username ? `https://ethresear.ch/u/${a.username}` : null,
    };
    const metaTitle = normalizeTitle(m.title);
    const titlePlain = r.titlePlain || metaTitle || slug;
    return {
      slug,
      url: m.url || `https://ethresear.ch/t/${slug}`,
      titlePlain,
      titleHtml: r.titleHtml || escapeHtml(metaTitle || slug),
      html: r.html,
      headings: r.headings || [],
      excerpt: r.excerpt || '',
      searchText: r.searchText || '',
      readingMinutes: r.readingMinutes,
      words: r.words,
      author,
      createdAt: m.createdAt || null,
      dateLabel: formatDate(m.createdAt),
      tags: Array.isArray(m.tags) ? m.tags : [],
      likes: m.postLikes ?? null,
      views: m.views ?? null,
    };
  });

  // Newest first.
  posts.sort((x, y) => (y.createdAt || '').localeCompare(x.createdAt || '') || x.titlePlain.localeCompare(y.titlePlain));
  return posts;
}

// Attach up to 3 related posts (most shared tags; prefer same author, then likes).
function attachRelated(posts) {
  for (const p of posts) {
    const scored = [];
    for (const q of posts) {
      if (q === p) continue;
      const shared = p.tags.filter((t) => q.tags.includes(t)).length;
      if (!shared) continue;
      scored.push({ q, shared, same: q.author.username === p.author.username ? 1 : 0 });
    }
    scored.sort((a, b) => b.shared - a.shared || b.same - a.same || (b.q.likes || 0) - (a.q.likes || 0));
    p.related = scored.slice(0, 3).map((s) => s.q);
  }
}

function authorIndex(posts) {
  const map = new Map();
  for (const p of posts) {
    const key = p.author.username || p.author.name;
    if (!key || p.author.name === 'Unknown author') continue;
    const cur = map.get(key) || {
      name: p.author.name,
      username: p.author.username,
      avatarLocal: p.author.avatarLocal,
      profileUrl: p.author.profileUrl,
      count: 0,
    };
    cur.count++;
    map.set(key, cur);
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function tagIndex(posts) {
  const counts = new Map();
  for (const p of posts) for (const t of p.tags) counts.set(t, (counts.get(t) || 0) + 1);
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function main() {
  // Fresh output dir.
  fs.rmSync(SITE, { recursive: true, force: true });
  fs.mkdirSync(SITE, { recursive: true });

  const posts = buildPosts();
  attachRelated(posts);
  const authors = authorIndex(posts);
  const tags = tagIndex(posts);
  const topTags = tags.slice(0, 16); // keep the filter row tidy; search covers the rest
  const siteAvatar = authors[0] && authors[0].avatarLocal ? `assets/avatars/${authors[0].avatarLocal}` : '';

  vendorAssets();

  // Post pages.
  posts.forEach((post, i) => {
    const nav = { prev: posts[i - 1] || null, next: posts[i + 1] || null };
    const postAvatar = post.author.avatarLocal ? `assets/avatars/${post.author.avatarLocal}` : siteAvatar;
    const html = layout({
      title: `${post.titlePlain} · Ethereum Research reader`,
      description: post.excerpt,
      base: '',
      bodyClass: 'page-post',
      readingProgress: true,
      ogType: 'article',
      canonical: post.url, // the original ethresear.ch thread is canonical
      ogUrl: post.url,
      ogImage: postAvatar,
      author: post.author.name,
      main: postMain(post, nav),
    });
    fs.writeFileSync(path.join(SITE, `${post.slug}.html`), html);
  });

  // Index.
  const indexHtml = layout({
    title: 'Ethereum Research · reader',
    description: `A clean, read-only reading archive of ${posts.length} original Ethereum protocol research posts from ethresear.ch.`,
    base: '',
    bodyClass: 'page-index',
    ogImage: siteAvatar,
    main: indexMain(posts, topTags, authors),
  });
  fs.writeFileSync(path.join(SITE, 'index.html'), indexHtml);

  // Search index (titles + body text) for the typeahead / full-text search.
  const searchIndex = posts.map((p) => ({
    s: p.slug,
    t: p.titlePlain,
    a: p.author.name,
    d: p.dateLabel,
    tl: p.titlePlain.toLowerCase(),
    bl: `${p.titlePlain} ${p.author.name} ${p.tags.join(' ')} ${p.searchText}`.toLowerCase(),
  }));
  fs.writeFileSync(path.join(SITE, 'search-index.json'), JSON.stringify(searchIndex));

  console.log(`Built ${posts.length} posts + index → ${path.relative(ROOT, SITE)}/`);
  console.log(`Authors: ${authors.length} | tags: ${tags.length} (showing ${topTags.length}) | images: ${fs.existsSync(path.join(SITE, 'images')) ? fs.readdirSync(path.join(SITE, 'images')).length : 0}`);
  console.log('Top authors: ' + authors.slice(0, 10).map((a) => `${a.name}(${a.count})`).join(', '));
}

main();
