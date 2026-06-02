# Ethereum Research — reader

A clean, classic, **read-only** reading interface for [ethresear.ch](https://ethresear.ch).
It collects the original posts (not replies) of the **top-10 most-liked authors** on the
forum and presents them for calm, focused reading. It does **not** replace ethresear.ch —
all curation, discussion and likes still happen there.

- **Static**: plain HTML/CSS + a little progressive-enhancement JS. No backend; works offline / over `file://`.
- **Classic typography**: self-hosted **CMU Serif** (Computer Modern / Latin Modern — the LaTeX look), light & dark themes.
- **Math**: LaTeX (`$…$`, `$$…$$`) pre-rendered with KaTeX at build time (no runtime JS needed for math).
- **Like → original**: every post's _Like_ button opens its canonical ethresear.ch thread.
- **Browse**: centered masthead; home index with live search (press <kbd>/</kbd>), **author** & **topic** filter chips, and sort.
- **Read**: sticky table of contents with scroll-spy (long posts), related posts (shared tags), reading-progress bar, reading time, image lightbox, code blocks with language label + copy button, back-to-top, linkable headings, responsive, print styles.

## Layout

```
.
├── posts/             ← content source: one {slug}.md per post
├── images/            ← post images (referenced as images/{hash}.ext)
├── data/
│   ├── meta.json      ← per-post metadata (author, date, likes, tags, canonical id)
│   └── avatars/       ← cached author avatars
├── build/
│   ├── fetch-posts.js ← scrape top-N users' authored topics + images + metadata
│   ├── fetch-meta.js  ← (incremental) refresh metadata for existing posts
│   ├── render.js      ← markdown → HTML (KaTeX, highlight.js, anchors, Discourse fixes)
│   ├── templates.js   ← HTML templates (shell, post page, index)
│   ├── build.js       ← orchestrator: render + vendor assets → site/
│   ├── assets/        ← style.css + app.js (source; copied into site/)
│   └── vendor/cmu/    ← self-hosted CMU Serif woff2
└── site/              ← BUILD OUTPUT (self-contained, deployable)
```

## Build

```bash
npm install          # markdown-it, katex, highlight.js, markdown-it-anchor
npm run scrape       # fetch the top-10 authors' topics + images + metadata (resumable, polite)
npm run build        # render everything into ./site
# or both:
npm run all
```

Then open `site/index.html`, or serve it:

```bash
python3 -m http.server -d site 8000   # → http://localhost:8000
```

Deploy by uploading `site/` to any static host (Netlify, S3, …).

**GitHub Pages** is automated: `.github/workflows/deploy.yml` runs `npm ci && npm run build`
on every push to `main` and publishes `site/`. Enable it once under **Settings → Pages →
Build and deployment → Source: GitHub Actions**. The site uses relative paths, so it works
from the project subpath (`https://<user>.github.io/ethresearch-reader/`).

### Which authors / how many

`fetch-posts.js` reads `…/directory_items.json?order=likes_received&period=all`, takes a
ranking slice, then pulls every topic each user **created** (via
`/topics/created-by/{user}.json`) and its first post (`/raw/{id}/1`). Re-runs skip posts
already on disk, so it is safe to resume.

Select which part of the ranking to fetch:

```bash
RANK_FROM=1  RANK_TO=10 npm run scrape   # top 10 (default)
RANK_FROM=11 RANK_TO=20 npm run scrape   # the next 10
```

**Authenticated access (recommended).** Provide an ethresear.ch API key and requests are
made via `Api-Key`/`Api-Username` (sanctioned, higher rate limits) instead of anonymous
scraping. The key is a **secret — never commit it**:

```bash
export ETHRESEARCH_API_KEY=…            # or place it in ../ethresearch_read_key.txt (outside the repo)
export ETHRESEARCH_API_USER=Nero_eth    # optional; any valid username for a global key
```

`.gitignore` excludes the key file, and the key is read only at runtime.

## Adding / refreshing

- `npm run scrape` again picks up any new topics by those authors (incremental).
- To refresh metadata (likes, tags) for posts already downloaded: `npm run fetch`.
- To add an arbitrary post by hand, follow `PARSE.md` and drop a `{slug}.md` into `posts/`.

## Customising

- **Colours / theme**: CSS custom properties at the top of `build/assets/style.css`
  (`:root` = light, `html[data-theme='dark']` = dark).
- **Font**: replace the `@font-face` block + `--font-serif` in `build/assets/style.css`
  (and the vendored files / copy step in `build/build.js`).
- **Reading width**: `--measure` in `build/assets/style.css`.

## Rendering notes

`render.js` normalises Discourse `/raw` quirks: escaped blockquotes (`\>`), image sizing
(`![alt|WxH]`), malformed `<img width="600px/">`, literal underscores inside `\text{…}`
(which KaTeX rejects), and display math accidentally nested inside `<p>`. References to
sibling posts that exist in this archive are rewritten to local pages; other links open in
a new tab. Headings get linkable anchors; wide tables, code and display math scroll.
