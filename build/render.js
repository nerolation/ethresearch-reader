// Markdown -> HTML rendering for ethresear.ch posts.
//
// Produces fully static HTML: KaTeX math is pre-rendered at build time (only
// katex.css is needed at runtime, no JS), code is highlighted with highlight.js,
// headings get linkable ids, and Discourse-specific quirks are normalised.

import MarkdownIt from 'markdown-it';
import texmath from 'markdown-it-texmath';
import katex from 'katex';
import anchor from 'markdown-it-anchor';
import hljs from 'highlight.js';

const ORIGIN = 'https://ethresear.ch';
// Resolve Discourse upload refs that weren't localised (non-image attachments,
// root-relative /uploads paths) to absolute, working URLs.
function absoluteUpload(u) {
  if (u.startsWith('upload://')) return `${ORIGIN}/uploads/short-url/${u.slice('upload://'.length)}`;
  if (u.startsWith('/uploads/')) return ORIGIN + u;
  return u;
}

export const slugify = (s) =>
  String(s)
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[`*_~$]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const md = new MarkdownIt({
  html: true, // posts contain raw <img>, <div align=center>, <br>
  linkify: true, // autolink bare URLs
  typographer: true, // curly quotes, dashes — classic typography
  // Deliberate: render soft line breaks as flowing prose (not <br>). The source
  // posts use logical sentence-per-line breaks; flowing text reads more like a
  // typeset article. Hard paragraph breaks (blank lines) are preserved.
  breaks: false,
  highlight(code, lang) {
    const cls = 'hljs language-' + (lang || 'text');
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="code-block"><code class="${cls}">${
          hljs.highlight(code, { language: lang, ignoreIllegals: true }).value
        }</code></pre>`;
      } catch {
        /* fall through */
      }
    }
    return `<pre class="code-block"><code class="hljs">${md.utils.escapeHtml(code)}</code></pre>`;
  },
});

// Authors write variable names like \text{MAX_BLOB_GAS} with literal underscores.
// KaTeX treats `_`/`^` as sub/superscript even inside text-mode macros and errors
// out (Discourse's renderer tolerated it). Escape unescaped _/^ inside the
// text-producing macros. The inner pattern allows one level of nested braces so
// \text{a_{b}} and \textbf{MAX_GAS} are both handled.
const TEXT_MACRO = /\\(text|textbf|textrm|textit|textsf|texttt|textnormal)\s*\{((?:[^{}]|\{[^{}]*\})*)\}/g;
function sanitizeMath(src) {
  return src
    .replace(/⁄/g, '/') // fraction slash ⁄ → / (KaTeX lacks metrics for it)
    .replace(TEXT_MACRO, (m, macro, inner) => {
      const fixed = inner.replace(/(?<!\\)([_^])/g, '\\$1');
      return `\\${macro}{${fixed}}`;
    });
}
const katexEngine = Object.create(katex);
katexEngine.renderToString = (src, opts) => katex.renderToString(sanitizeMath(src), opts);

md.use(texmath, {
  engine: katexEngine,
  delimiters: 'dollars',
  katexOptions: { throwOnError: false, strict: false, output: 'htmlAndMathml' },
});

md.use(anchor, {
  level: [2, 3, 4],
  slugify,
  permalink: anchor.permalink.linkInsideHeader({
    symbol: '#',
    placement: 'after',
    ariaHidden: true,
    class: 'heading-anchor',
  }),
});

// Links: rewrite references to sibling posts that exist in THIS archive to their
// local page (keeps the archive self-contained / offline). Other ethresear.ch and
// external links open in a new tab.
const defaultLink = md.renderer.rules.link_open || ((t, i, o, e, s) => s.renderToken(t, i, o));
md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
  let href = tokens[idx].attrGet('href') || '';
  if (href.startsWith('upload://') || href.startsWith('/uploads/')) {
    href = absoluteUpload(href);
    tokens[idx].attrSet('href', href);
  }
  const known = env && env.knownSlugs;
  const internal = href.match(/^https?:\/\/ethresear\.ch\/t\/([a-z0-9-]+)(?:\/\d+){0,2}(#\S*)?$/i);
  if (known && internal && known.has(internal[1])) {
    tokens[idx].attrSet('href', `${internal[1]}.html${internal[2] || ''}`);
  } else if (/^https?:\/\//i.test(href)) {
    tokens[idx].attrSet('target', '_blank');
    tokens[idx].attrSet('rel', 'noopener noreferrer');
  }
  return defaultLink(tokens, idx, options, env, self);
};

// Images: strip Discourse "|WxH" sizing from the alt text, cap intrinsic width,
// lazy-load. We deliberately do NOT render alt as a caption — Discourse alts are
// usually upload filenames (e.g. "boxplot2"), not real captions.
md.renderer.rules.image = function (tokens, idx) {
  const token = tokens[idx];
  let alt = token.content || '';
  let width = null;
  const m = alt.match(/^(.*?)\s*\|\s*(\d+)x(\d+)\s*$/);
  if (m) {
    alt = m[1].trim();
    width = parseInt(m[2], 10);
  }
  const src = absoluteUpload(token.attrGet('src') || '');
  const style = width ? ` style="width:min(100%, ${width}px)"` : '';
  return `<img class="post-img" src="${md.utils.escapeHtml(src)}" alt="${md.utils.escapeHtml(
    alt
  )}" loading="lazy" decoding="async"${style}>`;
};

// Wrap tables so wide tables scroll horizontally on small screens.
const defaultTableOpen = md.renderer.rules.table_open || ((t, i, o, e, s) => s.renderToken(t, i, o));
md.renderer.rules.table_open = function (tokens, idx, options, env, self) {
  return '<div class="table-wrap">' + defaultTableOpen(tokens, idx, options, env, self);
};
const defaultTableClose = md.renderer.rules.table_close || ((t, i, o, e, s) => s.renderToken(t, i, o));
md.renderer.rules.table_close = function (tokens, idx, options, env, self) {
  return defaultTableClose(tokens, idx, options, env, self) + '</div>';
};

// Normalise Discourse /raw quirks without disturbing code or math.
function preprocess(src) {
  const lines = src.split('\n');
  const out = [];
  let inFence = false;
  let fenceChar = '';
  let inMath = false;
  for (let raw of lines) {
    const t = raw.trimStart();
    const fm = t.match(/^(`{3,}|~{3,})/);
    if (fm) {
      if (!inFence) {
        inFence = true;
        fenceChar = fm[1][0];
      } else if (t[0] === fenceChar) {
        inFence = false;
      }
      out.push(raw);
      continue;
    }
    if (inFence) {
      out.push(raw);
      continue;
    }
    // Toggle display-math state on lines containing an odd number of `$$`.
    if (t.startsWith('$$')) {
      const count = (t.match(/\$\$/g) || []).length;
      if (count % 2 === 1) inMath = !inMath;
      out.push(raw);
      continue;
    }
    if (inMath) {
      out.push(raw);
      continue;
    }
    // Discourse escapes real blockquotes as "\>"; restore them.
    raw = raw.replace(/^(\s*)\\>/, '$1>');
    // Repair malformed self-closing widths like width="600px/".
    raw = raw.replace(/width\s*=\s*"(\d+)px?\/?"/gi, 'width="$1"');
    out.push(raw);
  }
  return out.join('\n');
}

// Pull the first level-1 heading out of the document to use as the title.
function extractTitle(src) {
  const lines = src.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') continue;
    const m = line.match(/^#\s+(.+?)\s*#*\s*$/);
    if (m) {
      lines.splice(i, 1);
      // Normalise doubled typewriter quotes ('' and ``) to real double quotes.
      const title = m[1].trim().replace(/''/g, '"').replace(/``/g, '"');
      return { title, body: lines.join('\n') };
    }
    break; // first non-blank line isn't an H1 — leave body untouched
  }
  return { title: null, body: src };
}

// Reduce markdown links/images to their visible text (handles nested brackets
// like the citation form [[1]](url)). Iterates until stable.
function stripLinks(t) {
  let prev;
  do {
    prev = t;
    t = t
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // inline images
      .replace(/!\[[^\]]*\]\[[^\]]*\]/g, '') // reference images
      .replace(/\[((?:[^[\]]|\[[^\]]*\])*)\]\([^)]*\)/g, '$1') // inline links
      .replace(/\[((?:[^[\]]|\[[^\]]*\])*)\]\[[^\]]*\]/g, '$1'); // reference links
  } while (t !== prev);
  return t;
}

// Plain text for titles, excerpts and meta descriptions: no markdown, no raw
// URLs — just the words. (Links in the post BODY are rendered as real <a> tags;
// this is only for summary text.)
function plainText(s) {
  return stripLinks(String(s))
    .replace(/<[^>]+>/g, '') // html tags
    .replace(/`+([^`]*)`+/g, '$1') // inline code
    .replace(/\$[^$]*\$/g, '') // inline math
    .replace(/\bhttps?:\/\/[^\s)]+/g, '') // bare URLs
    .replace(/\bwww\.[^\s)]+/g, '')
    .replace(/[[\]]/g, '') // stray brackets
    .replace(/[*_~]/g, '') // emphasis marks
    .replace(/\\([>_~*\-[\]!.])/g, '$1') // Discourse backslash-escapes
    .replace(/\(\s*[,;]*\s*\)/g, '') // empty () left by removed content
    .replace(/\s+([,.;:!?])/g, '$1') // space before punctuation
    .replace(/\s{2,}/g, ' ')
    .trim()
    .replace(/[\s:;,–—-]+$/, ''); // dangling "see:", trailing punctuation
}

// Paragraphs that carry no information about the post's content — they make poor
// index/social summaries, so we skip them and keep scanning for real prose.
function isLowValue(raw, text) {
  if (!text || text.length < 25) return true; // empty or too thin (e.g. a bare "see: <url>")
  if (/^(by |authored by|written by|co-?authored|many thanks|thanks to|special thanks|with thanks|h\/?t|shoutout|hi community|hello community|dear community)/i.test(text)) return true;
  if (/^(for (background|context|reference)|see( also)?|previous (work|ideas?)|related (work|reading)|prerequisites?|prior work)\b[:,]?\s*$/i.test(text)) return true; // pointer-only intro
  if (/^tl;?dr:?$/i.test(text)) return true; // bare TL;DR label
  return false;
}

function makeExcerpt(body, limit = 200) {
  // Group the body into paragraphs (split on blank lines / block markers).
  const paras = [];
  let cur = [];
  const flush = () => {
    if (cur.length) paras.push(cur.join(' '));
    cur = [];
  };
  for (const ln of body.split('\n')) {
    const t = ln.trim();
    if (t === '') {
      flush();
      continue;
    }
    if (/^(#|>|\||`{3}|~{3}|!\[|<\w|\$\$)/.test(t)) {
      flush();
      continue; // headings/quotes/images/code/html/math are not excerpt material
    }
    cur.push(t.replace(/^([-*+]|\d+\.)\s+/, '')); // strip list markers
  }
  flush();

  for (const raw of paras) {
    const text = plainText(raw).replace(/^TL;?DR:?\s*/i, '').trim();
    if (isLowValue(raw, text)) continue;
    return text.length > limit ? text.slice(0, limit).replace(/\s+\S*$/, '') + '…' : text;
  }
  return '';
}

function wordCount(body) {
  return body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\$\$[\s\S]*?\$\$/g, ' ')
    .replace(/\$[^$\n]*\$/g, ' ')
    .replace(/[#>*_`~|()[\]!]/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
}

// Single-line $$...$$ written as the trailing content of a paragraph/list item is
// emitted by texmath as a block <section> nested inside <p> — invalid HTML that
// browsers split. Lift those <section> equations out of their enclosing <p>.
function liftBlockMath(html) {
  // The (?:(?!</p>)[\s\S])*? groups stay strictly inside a single paragraph, so a
  // match can never span across paragraph boundaries (which would never converge).
  const re = /<p>((?:(?!<\/p>)[\s\S])*?)<section>([\s\S]*?)<\/section>((?:(?!<\/p>)[\s\S])*?)<\/p>/g;
  let prev;
  for (let i = 0; i < 6; i++) {
    prev = html;
    html = html.replace(
      re,
      (m, a, b, c) =>
        `${a.trim() ? `<p>${a}</p>` : ''}<section>${b}</section>${c.trim() ? `<p>${c}</p>` : ''}`
    );
    if (html === prev) break;
  }
  return html;
}

// Wrap fenced code blocks with a header (language label + copy button).
function wrapCodeBlocks(html) {
  return html.replace(
    /<pre class="code-block"><code class="([^"]*)">([\s\S]*?)<\/code><\/pre>/g,
    (m, cls, code) => {
      const lm = cls.match(/language-([\w+#-]+)/);
      const lang = lm ? lm[1] : 'text';
      return `<figure class="code-wrap"><figcaption class="code-head"><span class="code-lang">${lang}</span><button class="code-copy" type="button" aria-label="Copy code to clipboard">Copy</button></figcaption><pre class="code-block"><code class="${cls}">${code}</code></pre></figure>`;
    }
  );
}

// Collect h2/h3 headings (with ids) for a table of contents.
function extractHeadings(html) {
  const out = [];
  const re = /<h([23]) id="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/g;
  let m;
  while ((m = re.exec(html))) {
    const text = m[3]
      .replace(/<a class="heading-anchor"[\s\S]*?<\/a>/g, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
      .trim();
    if (text) out.push({ level: Number(m[1]), id: m[2], text });
  }
  return out;
}

// Tag wide inline math so CSS can let it scroll instead of overflowing the column.
// Only "display-sized" inline formulas are tagged, so ordinary inline math keeps
// its correct text baseline.
function tagWideInlineMath(html) {
  return html.replace(/<eq>([\s\S]*?)<\/eq>/g, (m, inner) => {
    const tex = (inner.match(/x-tex">([\s\S]*?)<\/annotation>/) || [])[1] || '';
    const wide = tex.length > 48 || /\\frac|\\begin|\\sum|\\int|\\prod|\\d?frac/.test(tex);
    return wide ? `<eq class="eq-wide">${inner}</eq>` : m;
  });
}

export function renderPost(rawMarkdown, opts = {}) {
  const { title, body } = extractTitle(rawMarkdown);
  const processed = preprocess(body);
  const env = { knownSlugs: opts.knownSlugs || null };
  let html = wrapCodeBlocks(tagWideInlineMath(liftBlockMath(md.render(processed, env))));
  // Raw-HTML upload refs (e.g. Discourse <a class="attachment" href="/uploads/…">)
  // bypass the token rules — resolve them to absolute, working URLs too.
  html = html
    .replace(/(["'])\/uploads\//g, `$1${ORIGIN}/uploads/`)
    .replace(/(["'])upload:\/\//g, `$1${ORIGIN}/uploads/short-url/`);
  const words = wordCount(body);
  return {
    title,
    titlePlain: title ? plainText(title) : null,
    titleHtml: title ? md.renderInline(preprocess(title), env) : null,
    html,
    headings: extractHeadings(html),
    excerpt: makeExcerpt(processed),
    searchText: plainText(processed).slice(0, 1800), // for the full-text search index
    words,
    readingMinutes: Math.max(1, Math.round(words / 200)),
  };
}

export { md, plainText };
