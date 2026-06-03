# AGENTS.md

Static, read-only reader for ethresear.ch posts (top-N most-liked authors' authored topics, not replies). Pure HTML/CSS + tiny JS; offline-capable; KaTeX math pre-rendered; CMU Serif; light/dark.

## Commands
- `npm install`
- `npm run scrape` — fetch posts+images+metadata (env below)
- `npm run build` — render `posts/` + `images/` + `data/meta.json` → `site/` (no network)
- `npm run fetch` — refresh metadata only

## Layout
- `posts/{slug}.md` — content (one per post). `images/` — referenced as `images/{hash}.ext`.
- `data/meta.json` — author/date/likes/tags/canonical id. `data/avatars/`.
- `build/` — `fetch-posts.js`, `fetch-meta.js`, `render.js`, `templates.js`, `build.js`, `assets/{style.css,app.js}`, `vendor/cmu/` (woff2).
- `site/` — build output (git-ignored). `node_modules/` git-ignored.
- Build artifacts in `site/`: `search-index.json` (typeahead/full-text), `offline.css` (self-contained: CMU fonts inlined, math via native MathML).

## Homepage / features
- Index: typeahead search (title-first, full-text), author filter (top-12 + "+N more"), topic disclosure, sort, lazy-load (24/scroll).
- Offline: "Download for Offline Reading" enters select-mode (checkboxes + Select all/none) — or per-post "Save for offline". Builds one self-contained `.html`. "Include images" toggle: on → `offline.css` (CMU inlined) + images inlined (~full); off → `offline-lite.css` (no fonts) + images dropped (~93% smaller). Math always via MathML. Needs http(s) (fetch); blocked on file://.

## Fetch (build/fetch-posts.js)
- Discourse public endpoints: `/directory_items.json`, `/topics/created-by/{u}.json`, `/raw/{id}/1`, `/t/{id}.json`.
- Ranking slice: `RANK_FROM`/`RANK_TO` (1-indexed, inclusive). Resumable (skips existing `posts/*.md`).
- Auth: `ETHRESEARCH_API_KEY` env or `../ethresearch_read_key.txt` (outside repo) → sent as `Api-Key`+`Api-Username` (`ETHRESEARCH_API_USER`, default `Nero_eth`). Global key; any username works.
- Has 429/5xx backoff (honors Retry-After). `PAUSE_MS` default 400.

## Secrets — never commit
API key is read at runtime only; never hardcode/commit. `.gitignore` blocks key/env files. Scan staged files for the key value before any push.

## Render quirks handled (render.js)
Discourse `\>` blockquotes, `![alt|WxH]` sizing, literal `_` in `\text{}` (KaTeX), block math nested in `<p>`, in-archive `ethresear.ch/t/{slug}` links rewritten to local `{slug}.html`, `/uploads` + `upload://` → absolute, excerpts strip markdown/URLs.

## Deploy
GitHub Pages via `.github/workflows/deploy.yml` on push to `main` (`npm ci && npm run build` → publish `site/`, `.nojekyll`). Relative paths → works under `/repo/` subpath. Enable: Settings → Pages → Source: GitHub Actions.

## Known-benign
Some links stay literal/red — these are faithful to source author typos (parenthesized URLs, `@mentions`, `htts://`, ambiguous `$`). Backtick-wrapped links render as code (correct). Not bugs.
