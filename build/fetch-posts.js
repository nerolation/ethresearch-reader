// Scrape authored topics (NOT replies) of the top-N ethresear.ch users by
// all-time likes received, into the local archive.
//
//   1. top users  : /directory_items.json?period=all&order=likes_received
//   2. their topics: /topics/created-by/{username}.json  (paginated)
//   3. each topic  : /raw/{id}/1  -> {slug}.md   (first post only, per PARSE.md)
//                    images upload://… and /uploads/… -> images/ + rewritten refs
//   4. metadata    : /t/{id}.json -> data/meta.json  (author, date, likes, tags)
//
// Resumable: existing {slug}.md and meta entries are skipped. Polite: ~0.4s/req.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const POSTS = path.join(ROOT, 'posts');
const IMAGES = path.join(ROOT, 'images');
const META_PATH = path.join(ROOT, 'data', 'meta.json');
const AVATAR_DIR = path.join(ROOT, 'data', 'avatars');
const ORIGIN = 'https://ethresear.ch';
const TOP_N = Number(process.env.TOP_N || 10);
const PAUSE_MS = 400;
const UA = { 'user-agent': 'ethresearch-reader/1.0 (static archive builder)' };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (const d of [POSTS, IMAGES, AVATAR_DIR, path.dirname(META_PATH)]) fs.mkdirSync(d, { recursive: true });

async function getJSON(url) {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}
async function getText(url) {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.text();
}

function validImage(buf) {
  if (!buf || buf.length < 100) return false;
  // Reject HTML error pages, but allow XML-declared SVGs (<?xml …><svg>).
  const head = buf.subarray(0, 64).toString('latin1').toLowerCase().trimStart();
  if (head.startsWith('<!doctype html') || head.startsWith('<html')) return false;
  return true;
}

async function download(url, dest) {
  if (fs.existsSync(dest) && fs.statSync(dest).size > 100) return true;
  try {
    const r = await fetch(url, { headers: UA, redirect: 'follow' });
    if (!r.ok) return false;
    const buf = Buffer.from(await r.arrayBuffer());
    if (!validImage(buf)) return false;
    fs.writeFileSync(dest, buf);
    return true;
  } catch {
    return false;
  }
}

const IMG_EXT = /^(png|jpe?g|gif|webp|svg|bmp|tiff?|avif)$/i;

// Download every image referenced in the markdown and rewrite refs to images/.
async function localizeImages(md) {
  let out = md;
  const jobs = [];
  const seen = new Set();

  // upload://{hash}.{ext}
  for (const m of md.matchAll(/upload:\/\/([A-Za-z0-9]+)\.(\w+)/g)) {
    const [full, hash, ext] = m;
    if (seen.has(full)) continue;
    seen.add(full);
    const file = `${hash}.${ext}`;
    if (IMG_EXT.test(ext)) {
      jobs.push({ full, url: `${ORIGIN}/uploads/short-url/${file}`, file, kind: 'img' });
    } else {
      // non-image attachment: point at the working absolute URL instead
      out = out.split(full).join(`${ORIGIN}/uploads/short-url/${file}`);
    }
  }
  // direct https://ethresear.ch/uploads/.../{file}
  for (const m of md.matchAll(/https?:\/\/ethresear\.ch\/uploads\/[^\s)"'<>]+\/([A-Za-z0-9._-]+\.(\w+))/g)) {
    const [full, file, ext] = m;
    if (seen.has(full)) continue;
    seen.add(full);
    if (IMG_EXT.test(ext)) jobs.push({ full, url: full, file, kind: 'img' });
  }

  for (const job of jobs) {
    const dest = path.join(IMAGES, job.file);
    const ok = await download(job.url, dest);
    if (ok) out = out.split(job.full).join(`images/${job.file}`);
    else process.stdout.write(`!img(${job.file}) `);
    await sleep(PAUSE_MS);
  }
  return out;
}

async function downloadAvatar(username, template) {
  if (!username || !template) return null;
  const local = `${username.toLowerCase()}.png`;
  const dest = path.join(AVATAR_DIR, local);
  if (fs.existsSync(dest)) return local;
  const ok = await download(ORIGIN + template.replace('{size}', '120'), dest);
  await sleep(PAUSE_MS);
  return ok ? local : null;
}

async function fetchMeta(id, slug) {
  const t = await getJSON(`${ORIGIN}/t/${id}.json`);
  const p = (t.post_stream && t.post_stream.posts && t.post_stream.posts[0]) || {};
  const like = (p.actions_summary || []).find((a) => a.id === 2);
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
    postLikes: like ? like.count : null,
    author: {
      name: p.name || p.username || null,
      username: p.username || null,
      avatarUrl: p.avatar_template ? ORIGIN + p.avatar_template.replace('{size}', '120') : null,
      avatarLocal,
    },
  };
}

async function topicsOf(username) {
  const topics = [];
  for (let page = 0; page < 40; page++) {
    let data;
    try {
      data = await getJSON(`${ORIGIN}/topics/created-by/${username}.json?page=${page}`);
    } catch {
      break;
    }
    const list = (data.topic_list && data.topic_list.topics) || [];
    if (!list.length) break;
    for (const t of list) topics.push({ id: t.id, slug: t.slug, title: t.title });
    await sleep(PAUSE_MS);
    if (!(data.topic_list && data.topic_list.more_topics_url)) break;
  }
  return topics;
}

async function main() {
  const meta = (() => {
    try { return JSON.parse(fs.readFileSync(META_PATH, 'utf8')); } catch { return {}; }
  })();

  console.log(`Fetching top ${TOP_N} users by all-time likes…`);
  const dir = await getJSON(`${ORIGIN}/directory_items.json?period=all&order=likes_received&page=0`);
  const users = (dir.directory_items || []).slice(0, TOP_N).map((it) => ({
    username: it.user.username,
    name: it.user.name,
    likes: it.likes_received,
  }));
  users.forEach((u, i) => console.log(`  ${i + 1}. @${u.username} (${u.name || ''}) — ${u.likes} likes`));

  // Build the global topic worklist (dedup by id).
  const byId = new Map();
  for (const u of users) {
    await sleep(PAUSE_MS);
    const ts = await topicsOf(u.username);
    console.log(`@${u.username}: ${ts.length} topics`);
    for (const t of ts) if (!byId.has(t.id)) byId.set(t.id, { ...t, username: u.username });
  }
  const work = [...byId.values()];
  console.log(`\nTotal unique topics: ${work.length}\n`);

  let savedMd = 0, savedMeta = 0, skipped = 0, failed = 0, done = 0;
  for (const t of work) {
    done++;
    const mdPath = path.join(POSTS, `${t.slug}.md`);
    const tag = `[${done}/${work.length}] ${t.slug}`;
    try {
      if (!fs.existsSync(mdPath)) {
        const raw = await getText(`${ORIGIN}/raw/${t.id}/1`);
        await sleep(PAUSE_MS);
        if (!raw || raw.trim().length < 5 || /^\s*<(?:!doctype|html)/i.test(raw)) {
          console.log(`${tag} — empty/HTML, skip`); failed++; continue;
        }
        const localized = await localizeImages(raw);
        fs.writeFileSync(mdPath, localized);
        savedMd++;
        process.stdout.write(`${tag} md✓ `);
      } else {
        skipped++;
      }
      if (!meta[t.slug] || !meta[t.slug].id) {
        meta[t.slug] = await fetchMeta(t.id, t.slug);
        fs.writeFileSync(META_PATH, JSON.stringify(meta, null, 2));
        savedMeta++;
        process.stdout.write(`meta✓(@${meta[t.slug].author.username},♥${meta[t.slug].postLikes ?? '?'})\n`);
        await sleep(PAUSE_MS);
      } else if (savedMd) {
        process.stdout.write('\n');
      }
    } catch (e) {
      console.log(`${tag} — FAIL: ${e.message}`); failed++;
    }
  }
  fs.writeFileSync(META_PATH, JSON.stringify(meta, null, 2));
  console.log(`\nDone. new md: ${savedMd}, new meta: ${savedMeta}, skipped existing: ${skipped}, failed: ${failed}.`);
  console.log(`Total posts in archive: ${fs.readdirSync(POSTS).filter((f) => f.endsWith('.md')).length}`);
}

main().catch((e) => { console.error('FATAL', e); process.exit(1); });
