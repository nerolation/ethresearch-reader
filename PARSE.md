# Downloading ethresear.ch posts

Discourse site. To add new posts, given the activity/topic-list HTML:

1. **Parse topics**: each row links `<a class="title raw-link raw-topic-link" href="/t/{slug}/{id}/...">`. Extract `{id}` + `{slug}`.
2. **Fetch post markdown**: `curl -sL https://ethresear.ch/raw/{id}/1 -o posts/{slug}.md` (raw first post, no replies). Be polite: ~0.4s between requests.
3. **Images**: refs look like `upload://{hash}.{ext}`. Download each via `https://ethresear.ch/uploads/short-url/{hash}.{ext}` into `images/`, then rewrite `upload://{hash}.{ext}` → `images/{hash}.{ext}` in the `.md`. Also rewrite direct `https://ethresear.ch/uploads/.../{file}` → `images/{file}`.

Leave non-image external links (e.g. PDFs) untouched. Verify downloads with `file` (reject HTML/0-byte).
