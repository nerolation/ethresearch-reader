// Fetch public metadata for each downloaded ethresear.ch post.
//
// For every {slug}.md in the content root we:
//   1. resolve the canonical topic id by following the 301 from /t/{slug}
//   2. fetch /t/{id}.json for title, author, date, tags, views, like counts
//   3. download the author avatar once (deduped by username) into data/avatars/
//
// Results are merged into data/meta.json. Re-runs are incremental: a slug that
// already has an entry is skipped unless --force is passed. Be polite: ~0.4s
// between network requests, as PARSE.md asks.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const POSTS = path.join(ROOT, 'posts');
const META_PATH = path.join(ROOT, 'data', 'meta.json');
const AVATAR_DIR = path.join(ROOT, 'data', 'avatars');
const ORIGIN = 'https://ethresear.ch';
const FORCE = process.argv.includes('--force');
const PAUSE_MS = 400;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function slugs() {
  return fs
    .readdirSync(POSTS)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''))
    .sort();
}

function loadMeta() {
  try {
    return JSON.parse(fs.readFileSync(META_PATH, 'utf8'));
  } catch {
    return {};
  }
}

async function fetchText(url, opts = {}) {
  const res = await fetch(url, {
    redirect: 'follow',
    headers: { 'user-agent': 'ethresearch-reader/1.0 (static archive builder)' },
    ...opts,
  });
  return res;
}

async function resolveId(slug) {
  // Following the redirect lands on /t/{slug}/{id}; pull the id from the final URL.
  const res = await fetchText(`${ORIGIN}/t/${slug}`);
  const m = res.url.match(/\/t\/[^/]+\/(\d+)/);
  if (m) return Number(m[1]);
  // Fallback: some slugs may already be canonical.
  const m2 = res.url.match(/\/(\d+)(?:[/?#]|$)/);
  return m2 ? Number(m2[1]) : null;
}

async function downloadAvatar(username, template) {
  if (!username || !template) return null;
  const local = `${username.toLowerCase()}.png`;
  const dest = path.join(AVATAR_DIR, local);
  if (fs.existsSync(dest)) return local;
  const url = ORIGIN + template.replace('{size}', '120');
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 100) return null; // reject empties
    fs.writeFileSync(dest, buf);
    await sleep(PAUSE_MS);
    return local;
  } catch {
    return null;
  }
}

async function fetchTopic(slug) {
  const id = await resolveId(slug);
  await sleep(PAUSE_MS);
  if (!id) throw new Error('could not resolve id');

  const res = await fetchText(`${ORIGIN}/t/${id}.json`);
  if (!res.ok) throw new Error(`topic json ${res.status}`);
  const t = JSON.parse(await res.text());
  const p = (t.post_stream && t.post_stream.posts && t.post_stream.posts[0]) || {};
  const likeAction = (p.actions_summary || []).find((a) => a.id === 2);
  const avatarLocal = await downloadAvatar(p.username, p.avatar_template);

  return {
    id,
    url: `${ORIGIN}/t/${t.slug || slug}/${id}`,
    title: t.title || null,
    createdAt: p.created_at || t.created_at || null,
    tags: Array.isArray(t.tags) ? t.tags : [],
    views: t.views ?? null,
    postsCount: t.posts_count ?? null,
    topicLikes: t.like_count ?? null,
    postLikes: likeAction ? likeAction.count : null,
    author: {
      name: p.name || p.username || null,
      username: p.username || null,
      avatarUrl: p.avatar_template ? ORIGIN + p.avatar_template.replace('{size}', '120') : null,
      avatarLocal,
    },
  };
}

async function main() {
  const meta = loadMeta();
  const list = slugs();
  let done = 0;
  let failed = 0;
  for (const slug of list) {
    if (!FORCE && meta[slug] && meta[slug].id) {
      done++;
      continue;
    }
    process.stdout.write(`[${done + failed + 1}/${list.length}] ${slug} … `);
    try {
      meta[slug] = await fetchTopic(slug);
      fs.writeFileSync(META_PATH, JSON.stringify(meta, null, 2)); // checkpoint each
      console.log(`ok (id=${meta[slug].id}, ${meta[slug].author.name}, ♥${meta[slug].postLikes ?? '?'})`);
      done++;
    } catch (e) {
      console.log(`FAILED: ${e.message}`);
      meta[slug] = meta[slug] || { error: e.message };
      failed++;
    }
    await sleep(PAUSE_MS);
  }
  fs.writeFileSync(META_PATH, JSON.stringify(meta, null, 2));
  console.log(`\nDone. ${done} ok, ${failed} failed → ${path.relative(ROOT, META_PATH)}`);
}

main();
