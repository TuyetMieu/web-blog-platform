/**
 * api.js — shared data layer for all pages.
 *
 * Talks to the Flask backend at /api/... . If the backend isn't running yet
 * (network error, or BE hasn't implemented an endpoint), every function
 * falls back to the local sample JSON in data/posts.sample.json and
 * data/notes.sample.json so the frontend can be built and demoed
 * independently. Swap nothing when BE is ready — same function signatures,
 * same return shapes either way.
 *
 * Also hosts escapeHtml()/formatDate(), the two small rendering helpers
 * both journal-feed.js and whisper-box.js need — defined once here instead
 * of duplicated per page, since both already load this file first.
 *
 * Functions are plain globals (no bundler/module system): just load this
 * file with <script src="js/api.js"></script> before your page's own
 * script, then call getPosts(), getPost(), sendNote(), sendReaction(),
 * getNotes(), escapeHtml(), formatDate() directly.
 */

const API_BASE = "/api";
const POSTS_SAMPLE_URL = "data/posts.sample.json";
const NOTES_SAMPLE_URL = "data/notes.sample.json";
const LOCAL_NOTES_KEY = "kj_local_notes";
const LOCAL_REACTIONS_KEY = "kj_local_reactions";

let _postsSampleCache = null;
let _notesSampleCache = null;

async function _loadPostsSample() {
  if (_postsSampleCache) return _postsSampleCache;
  const res = await fetch(POSTS_SAMPLE_URL);
  if (!res.ok) throw new Error(`Could not load sample data: ${POSTS_SAMPLE_URL}`);
  _postsSampleCache = await res.json();
  return _postsSampleCache;
}

async function _loadNotesSample() {
  if (_notesSampleCache) return _notesSampleCache;
  const res = await fetch(NOTES_SAMPLE_URL);
  if (!res.ok) throw new Error(`Could not load sample data: ${NOTES_SAMPLE_URL}`);
  _notesSampleCache = await res.json();
  return _notesSampleCache;
}

function _getLocalNotes() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_NOTES_KEY)) || [];
  } catch {
    return [];
  }
}

function _saveLocalNote(note) {
  const notes = _getLocalNotes();
  notes.unshift(note);
  localStorage.setItem(LOCAL_NOTES_KEY, JSON.stringify(notes));
}

function _getLocalReactionDelta(slug, type) {
  try {
    const all = JSON.parse(localStorage.getItem(LOCAL_REACTIONS_KEY)) || {};
    return all[`${slug}:${type}`] || 0;
  } catch {
    return 0;
  }
}

function _bumpLocalReaction(slug, type) {
  let all = {};
  try {
    all = JSON.parse(localStorage.getItem(LOCAL_REACTIONS_KEY)) || {};
  } catch {
    all = {};
  }
  const key = `${slug}:${type}`;
  all[key] = (all[key] || 0) + 1;
  localStorage.setItem(LOCAL_REACTIONS_KEY, JSON.stringify(all));
  return all[key];
}

function _paginate(items, page, pageSize) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}

/** Escapes text for safe use inside HTML content AND double-quoted
 * attributes (e.g. data-slug="${escapeHtml(slug)}") — used by both
 * journal-feed.js and whisper-box.js when rendering fetched data. */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Formats an ISO date string for display (e.g. "Oct 14, 2024"); falls
 * back to the raw string if it doesn't parse as a date. */
function formatDate(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/**
 * getPosts({ side, category, tag, search, page, pageSize, sort })
 * → { posts, total, page, pageSize, totalPages }
 *
 * side: "a" | "b" (Engineering vs Life & Soul)
 * category: exact match against a post's "category" field
 * tag: matches if present (case-insensitive) in the post's "tags" array
 * search: case-insensitive substring match against title + excerpt
 * sort: "chronological" (default, newest first) | "reads"
 */
async function getPosts(params = {}) {
  const {
    side,
    category,
    tag,
    search,
    page = 1,
    pageSize = 8,
    sort = "chronological",
  } = params;

  try {
    const qs = new URLSearchParams();
    if (side) qs.set("side", side);
    if (category) qs.set("category", category);
    if (tag) qs.set("tag", tag);
    if (search) qs.set("search", search);
    qs.set("page", page);
    qs.set("pageSize", pageSize);
    qs.set("sort", sort);

    const res = await fetch(`${API_BASE}/posts?${qs.toString()}`);
    if (!res.ok) throw new Error("backend not ready");
    return await res.json();
  } catch {
    const all = await _loadPostsSample();

    let filtered = all.filter((post) => {
      if (side && post.side !== side) return false;
      if (category && post.category !== category) return false;
      if (tag && !post.tags.some((t) => t.toLowerCase() === tag.toLowerCase())) return false;
      if (search) {
        const q = search.toLowerCase();
        const haystack = `${post.title} ${post.excerpt}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    filtered = filtered.slice().sort((a, b) => {
      if (sort === "reads") return b.stats.reads - a.stats.reads;
      return new Date(b.date) - new Date(a.date);
    });

    const { items, total, page: p, pageSize: ps, totalPages } = _paginate(filtered, page, pageSize);
    return { posts: items, total, page: p, pageSize: ps, totalPages };
  }
}

/** getPost(slug) → post object, or null if not found */
async function getPost(slug) {
  try {
    const res = await fetch(`${API_BASE}/posts/${encodeURIComponent(slug)}`);
    if (!res.ok) throw new Error("backend not ready");
    return await res.json();
  } catch {
    const all = await _loadPostsSample();
    return all.find((post) => post.slug === slug) || null;
  }
}

/**
 * getNotes({ topic, search, page, pageSize }) → { notes, total, page, pageSize, totalPages }
 * search: case-insensitive substring match against name + message + location.
 * Includes any notes sent via sendNote() while offline (stored locally),
 * newest first, merged in ahead of the sample set.
 */
async function getNotes(params = {}) {
  const { topic, search, page = 1, pageSize = 10 } = params;

  try {
    const qs = new URLSearchParams();
    if (topic) qs.set("topic", topic);
    if (search) qs.set("search", search);
    qs.set("page", page);
    qs.set("pageSize", pageSize);

    const res = await fetch(`${API_BASE}/notes?${qs.toString()}`);
    if (!res.ok) throw new Error("backend not ready");
    return await res.json();
  } catch {
    const sample = await _loadNotesSample();
    const all = [..._getLocalNotes(), ...sample];

    let filtered = topic ? all.filter((n) => n.topic === topic) : all;
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter((n) => {
        const haystack = `${n.name || ""} ${n.message || ""} ${n.location || ""}`.toLowerCase();
        return haystack.includes(q);
      });
    }
    const { items, total, page: p, pageSize: ps, totalPages } = _paginate(filtered, page, pageSize);
    return { notes: items, total, page: p, pageSize: ps, totalPages };
  }
}

/**
 * sendNote({ name, email, topic, message }) → the created note object
 * When offline, the note is kept in this browser's localStorage so it
 * shows up immediately in getNotes() — it is NOT shared with anyone else
 * until the real backend is wired up.
 */
async function sendNote({ name, email, topic, message }) {
  const payload = { name: name || "Anonymous", email: email || null, topic, message };

  try {
    const res = await fetch(`${API_BASE}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("backend not ready");
    return await res.json();
  } catch {
    const note = {
      id: `local-${Date.now()}`,
      name: payload.name,
      role: null,
      location: "Sent offline",
      topic: payload.topic,
      message: payload.message,
      date: new Date().toISOString().slice(0, 10),
      reply: null,
      pendingSync: true,
    };
    _saveLocalNote(note);
    return note;
  }
}

/**
 * sendReaction(slug, type) → { slug, type, count }
 * type is a short label, e.g. "endorse", "teaSteep", "save".
 * When offline, the increment is tracked in localStorage and added on top
 * of the sample post's stored count (purely for demo purposes, per-browser).
 */
async function sendReaction(slug, type = "endorse") {
  try {
    const res = await fetch(`${API_BASE}/posts/${encodeURIComponent(slug)}/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });
    if (!res.ok) throw new Error("backend not ready");
    return await res.json();
  } catch {
    const post = await getPost(slug);
    const base = post ? post.stats.notes : 0;
    const delta = _bumpLocalReaction(slug, type);
    return { slug, type, count: base + delta };
  }
}
