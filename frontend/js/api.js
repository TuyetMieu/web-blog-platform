/**
 * api.js — shared data layer for all pages.
 *
 * Talks to the Flask backend at /api/...
 *
 * If the backend isn't running yet, functions fall back
 * to local sample JSON so the frontend can still work.
 */

const API_BASE = "/api";

const POSTS_SAMPLE_URL = "data/posts.sample.json";
const NOTES_SAMPLE_URL = "data/notes.sample.json";

const LOCAL_NOTES_KEY = "kj_local_notes";
const LOCAL_REACTIONS_KEY = "kj_local_reactions";

let _postsSampleCache = null;
let _notesSampleCache = null;


// ============================================================
// LOAD SAMPLE DATA
// ============================================================

async function _loadPostsSample() {
  if (_postsSampleCache) {
    return _postsSampleCache;
  }

  const res = await fetch(POSTS_SAMPLE_URL);

  if (!res.ok) {
    throw new Error(
      `Could not load sample data: ${POSTS_SAMPLE_URL}`
    );
  }

  _postsSampleCache = await res.json();

  return _postsSampleCache;
}


async function _loadNotesSample() {
  if (_notesSampleCache) {
    return _notesSampleCache;
  }

  const res = await fetch(NOTES_SAMPLE_URL);

  if (!res.ok) {
    throw new Error(
      `Could not load sample data: ${NOTES_SAMPLE_URL}`
    );
  }

  _notesSampleCache = await res.json();

  return _notesSampleCache;
}


// ============================================================
// LOCAL NOTES
// ============================================================

function _getLocalNotes() {
  try {
    return JSON.parse(
      localStorage.getItem(LOCAL_NOTES_KEY)
    ) || [];
  } catch {
    return [];
  }
}


function _saveLocalNote(note) {
  const notes = _getLocalNotes();

  notes.unshift(note);

  localStorage.setItem(
    LOCAL_NOTES_KEY,
    JSON.stringify(notes)
  );
}


// ============================================================
// LOCAL REACTIONS
// ============================================================

function _getLocalReactionDelta(slug, type) {
  try {
    const all =
      JSON.parse(
        localStorage.getItem(LOCAL_REACTIONS_KEY)
      ) || {};

    return all[`${slug}:${type}`] || 0;
  } catch {
    return 0;
  }
}


function _bumpLocalReaction(slug, type) {
  let all = {};

  try {
    all =
      JSON.parse(
        localStorage.getItem(LOCAL_REACTIONS_KEY)
      ) || {};
  } catch {
    all = {};
  }

  const key = `${slug}:${type}`;

  all[key] = (all[key] || 0) + 1;

  localStorage.setItem(
    LOCAL_REACTIONS_KEY,
    JSON.stringify(all)
  );

  return all[key];
}


// ============================================================
// PAGINATION
// ============================================================

function _paginate(items, page, pageSize) {
  const total = items.length;

  const totalPages = Math.max(
    1,
    Math.ceil(total / pageSize)
  );

  const safePage = Math.min(
    Math.max(1, page),
    totalPages
  );

  const start = (safePage - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    total,
    page: safePage,
    pageSize,
    totalPages
  };
}


// ============================================================
// HELPERS
// ============================================================

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function formatDate(iso) {
  const d = new Date(iso);

  if (isNaN(d)) {
    return iso || "";
  }

  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}


// ============================================================
// POSTS
// ============================================================

/**
 * getPosts({
 *   side,
 *   category,
 *   tag,
 *   search,
 *   page,
 *   pageSize,
 *   sort
 * })
 *
 * side:
 *   "a" -> engineering
 *   "b" -> life
 *   "engineering"
 *   "life"
 */

async function getPosts(params = {}) {
  const {
    side = null,
    category = null,
    tag = null,
    search = null,
    page = 1,
    pageSize = 8,
    sort = "recent"
  } = params;

  try {
    const qs = new URLSearchParams();

    // Convert frontend side names to backend side names
    if (side) {
      const backendSide =
        side === "a"
          ? "engineering"
          : side === "b"
            ? "life"
            : side;

      qs.set("side", backendSide);
    }

    if (category) {
      qs.set("category", category);
    }

    if (tag) {
      qs.set("tag", tag);
    }

    if (search) {
      qs.set("q", search);
    }

    qs.set("page", page);
    qs.set("per_page", pageSize);
    qs.set("sort", sort);

    const res = await fetch(
      `${API_BASE}/posts?${qs.toString()}`
    );

    if (!res.ok) {
      throw new Error("backend not ready");
    }

    const data = await res.json();

    return {
      posts: Array.isArray(data.posts)
        ? data.posts
        : [],
      total: Number(data.total || 0),
      page: Number(data.page || page),
      pageSize: Number(
        data.per_page ||
        data.pageSize ||
        pageSize
      ),
      totalPages: Number(
        data.total_pages ||
        data.totalPages ||
        1
      )
    };

  } catch {
    // ========================================================
    // FALLBACK TO SAMPLE DATA
    // ========================================================

    const all = await _loadPostsSample();

    let filtered = all.filter((post) => {

      if (side) {
        const backendSide =
          side === "a"
            ? "engineering"
            : side === "b"
              ? "life"
              : side;

        if (
          post.side !== backendSide &&
          post.side !== side
        ) {
          return false;
        }
      }

      if (
        category &&
        post.category !== category
      ) {
        return false;
      }

      if (
        tag &&
        Array.isArray(post.tags) &&
        !post.tags.some(
          (t) =>
            String(t).toLowerCase() ===
            String(tag).toLowerCase()
        )
      ) {
        return false;
      }

      if (search) {
        const q = search.toLowerCase();

        const haystack =
          `${post.title || ""} ${post.excerpt || ""}`
            .toLowerCase();

        if (!haystack.includes(q)) {
          return false;
        }
      }

      return true;
    });


    // Sort
    filtered = filtered
      .slice()
      .sort((a, b) => {

        if (sort === "reads") {
          return (
            (b.stats?.reads || 0) -
            (a.stats?.reads || 0)
          );
        }

        return (
          new Date(b.date) -
          new Date(a.date)
        );
      });


    const {
      items,
      total,
      page: safePage,
      pageSize: safePageSize,
      totalPages
    } = _paginate(
      filtered,
      page,
      pageSize
    );

    return {
      posts: items,
      total,
      page: safePage,
      pageSize: safePageSize,
      totalPages
    };
  }
}


// ============================================================
// SINGLE POST
// ============================================================

async function getPost(slug) {
  try {
    const res = await fetch(
      `${API_BASE}/posts/${encodeURIComponent(slug)}`
    );

    if (!res.ok) {
      throw new Error("backend not ready");
    }

    return await res.json();

  } catch {
    const all = await _loadPostsSample();

    return (
      all.find(
        (post) => post.slug === slug
      ) || null
    );
  }
}


// ============================================================
// NOTES
// ============================================================

/**
 * getNotes({
 *   topic,
 *   search,
 *   page,
 *   pageSize
 * })
 */

async function getNotes(params = {}) {
  const {
    topic = null,
    search = null,
    page = 1,
    pageSize = 10
  } = params;

  try {
    const qs = new URLSearchParams();

    if (topic) {
      qs.set("topic", topic);
    }

    // Backend uses "q", NOT "search"
    if (search) {
      qs.set("q", search);
    }

    qs.set("page", page);

    // Backend uses "per_page", NOT "pageSize"
    qs.set("per_page", pageSize);

    const res = await fetch(
      `${API_BASE}/notes?${qs.toString()}`
    );

    if (!res.ok) {
      throw new Error("backend not ready");
    }

    const data = await res.json();

    const backendNotes =
      Array.isArray(data.notes)
        ? data.notes
        : [];

    // Backend trả 200 nhưng chưa có note
    // → dùng sample data
    if (backendNotes.length === 0) {
      throw new Error("No notes from backend");
    }

    return {
      notes: backendNotes,
      total: Number(data.total || 0),
      page: Number(data.page || page),
      pageSize: Number(
        data.per_page ||
        data.pageSize ||
        pageSize
      ),
      totalPages: Number(
        data.total_pages ||
        data.totalPages ||
        1
      )
    };

  } catch {
    // ========================================================
    // FALLBACK TO SAMPLE DATA
    // ========================================================

    const sample = await _loadNotesSample();

    const all = [
      ..._getLocalNotes(),
      ...sample
    ];

    let filtered = topic
      ? all.filter(
          (n) => n.topic === topic
        )
      : all;


    if (search) {
      const q = search.toLowerCase();

      filtered = filtered.filter((n) => {

        const haystack =
          `${n.name || ""} ${
            n.message || ""
          } ${
            n.location || ""
          }`.toLowerCase();

        return haystack.includes(q);
      });
    }


    const {
      items,
      total,
      page: safePage,
      pageSize: safePageSize,
      totalPages
    } = _paginate(
      filtered,
      page,
      pageSize
    );

    return {
      notes: items,
      total,
      page: safePage,
      pageSize: safePageSize,
      totalPages
    };
  }
}


// ============================================================
// SEND NOTE
// ============================================================

async function sendNote({
  name,
  email,
  topic,
  message
}) {
  const payload = {
    name: name || "Anonymous",
    email: email || null,
    topic,
    message
  };

  try {
    const res = await fetch(
      `${API_BASE}/notes`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    );

    if (!res.ok) {
      throw new Error("backend not ready");
    }

    return await res.json();

  } catch {
    const note = {
      id: `local-${Date.now()}`,
      name: payload.name,
      role: null,
      location: "Sent offline",
      topic: payload.topic,
      message: payload.message,
      date: new Date()
        .toISOString()
        .slice(0, 10),
      reply: null,
      pendingSync: true
    };

    _saveLocalNote(note);

    return note;
  }
}


// ============================================================
// REACTIONS
// ============================================================

/**
 * sendReaction(slug, type)
 *
 * Backend endpoint:
 * POST /api/posts/<slug>/react
 */

async function sendReaction(
  slug,
  type = "endorse"
) {
  try {
    const res = await fetch(
      `${API_BASE}/posts/${encodeURIComponent(slug)}/react`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          type
        })
      }
    );

    if (!res.ok) {
      throw new Error("backend not ready");
    }

    return await res.json();

  } catch {
    const post = await getPost(slug);

    let base = 0;

    if (post) {
      if (post.reactions) {
        base =
          post.reactions[type] || 0;
      } else if (post.stats) {
        base =
          post.stats.notes || 0;
      }
    }

    const delta =
      _bumpLocalReaction(
        slug,
        type
      );

    return {
      slug,
      type,
      count: base + delta
    };
  }
}