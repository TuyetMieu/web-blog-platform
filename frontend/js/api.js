/* =========================================================
   api.js — Lớp dữ liệu dùng chung (window.KJ.api)
   Gộp từ api.js (FE4) + request/mock của article.js (FE2), theo đúng
   contract của backend Flask trong thư mục ../backend.

   - Thử gọi backend thật ở API_BASE ("/api").
   - Nếu không có backend (mở bằng file://, server tĩnh trả HTML 404,
     lỗi mạng) hoặc URL có ?mock=1 → chạy "mock API" trong trình duyệt
     trên data/site-content.js, trả về ĐÚNG shape JSON như backend.
   - Mọi response (thật hoặc mock) đi qua normalizePost/normalizeNote
     nên các trang chỉ làm việc với 1 kiểu dữ liệu.
   ========================================================= */
(function () {
  "use strict";

  var KJ = (window.KJ = window.KJ || {});
  var API_BASE = window.KJ_API_BASE || "/api";
  var WORDS_PER_MIN = 220;
  var POSTS_PER_PAGE = 6;
  var NOTES_PER_PAGE = 10;
  var MAX_PER_PAGE = 20;
  var REACTION_TYPES = ["tea", "insight", "calm", "resonate"];
  var NOTE_TOPICS = ["EngineeringSolitude", "TeaAndHanoi", "AtticMusings", "BookMusings"];

  var params = new URLSearchParams(location.search);
  // "auto" = chưa biết; "api" = backend thật đã trả lời; "mock" = dữ liệu mẫu
  var mode = location.protocol === "file:" || params.has("mock") ? "mock" : "auto";

  function ApiError(message, status) {
    var err = new Error(message);
    err.name = "ApiError";
    err.status = status || 0;
    return err;
  }

  function setMode(next) {
    if (mode === next) return;
    mode = next;
    if (next === "mock") {
      console.info("[api] Không có backend ở " + API_BASE + " → dùng dữ liệu mẫu (data/site-content.js).");
    }
    document.dispatchEvent(new CustomEvent("kj:api-mode", { detail: { mode: next } }));
  }

  function toQuery(query) {
    if (!query) return "";
    var qs = new URLSearchParams();
    Object.keys(query).forEach(function (key) {
      var value = query[key];
      if (value === undefined || value === null || value === "") return;
      qs.set(key, Array.isArray(value) ? value.join(",") : String(value));
    });
    var s = qs.toString();
    return s ? "?" + s : "";
  }

  async function request(method, path, options) {
    options = options || {};
    if (mode === "mock") return mockRequest(method, path, options);

    var res;
    try {
      res = await fetch(API_BASE + path + toQuery(options.query), {
        method: method,
        headers: options.body ? { "Content-Type": "application/json" } : undefined,
        body: options.body ? JSON.stringify(options.body) : undefined
      });
    } catch (networkErr) {
      if (mode === "api") throw ApiError("Không kết nối được máy chủ. Vui lòng thử lại.", 0);
      setMode("mock");
      return mockRequest(method, path, options);
    }

    var isJson = /json/.test(res.headers.get("Content-Type") || "");
    if (!isJson) {
      // Server tĩnh (Live Server, python -m http.server…) trả trang HTML → chưa có API.
      if (mode === "api") throw ApiError("Máy chủ trả dữ liệu không hợp lệ (HTTP " + res.status + ").", res.status);
      setMode("mock");
      return mockRequest(method, path, options);
    }

    setMode("api");
    var data = res.status === 204 ? null : await res.json();
    if (!res.ok) throw ApiError((data && data.error) || "HTTP " + res.status, res.status);
    return data;
  }

  /* =========================================================
     Mock API — mô phỏng backend trên data/site-content.js
     ========================================================= */
  var LOCAL = {
    reactions: "kj.mock.reactions", // { "slug:type": delta }
    reads: "kj.mock.reads",         // { slug: delta }
    notes: "kj.mock.notes"          // note đã gửi khi offline (chưa ghim → không công khai)
  };

  function readLocal(key, fallback) {
    try {
      var v = localStorage.getItem(key);
      return v === null ? fallback : JSON.parse(v);
    } catch (e) {
      return fallback;
    }
  }
  function writeLocal(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* bỏ qua */ }
  }

  function content() {
    return window.KJ_CONTENT;
  }

  // Chỉ tải data/site-content.js khi thật sự cần dữ liệu mẫu (có backend thì không tải).
  var contentPromise = null;
  function ensureContent() {
    if (window.KJ_CONTENT) return Promise.resolve();
    if (!contentPromise) {
      contentPromise = new Promise(function (resolve, reject) {
        var s = document.createElement("script");
        s.src = "data/site-content.js";
        s.onload = function () { resolve(); };
        s.onerror = function () {
          contentPromise = null;
          reject(ApiError("Không tải được dữ liệu mẫu (data/site-content.js).", 500));
        };
        document.head.appendChild(s);
      });
    }
    return contentPromise;
  }

  function wordCount(html) {
    var text = String(html || "").replace(/<[^>]+>/g, " ").trim();
    return text ? text.split(/\s+/).length : 0;
  }

  function mockPosts() {
    var list = content().posts;
    var reactionDelta = readLocal(LOCAL.reactions, {});
    var readDelta = readLocal(LOCAL.reads, {});
    var noteCounts = {};
    content().notes.concat(readLocal(LOCAL.notes, [])).forEach(function (n) {
      if (n.postSlug) noteCounts[n.postSlug] = (noteCounts[n.postSlug] || 0) + 1;
    });
    return list.map(function (p, index) {
      var reactions = {};
      REACTION_TYPES.forEach(function (t) {
        reactions[t] = ((p.reactions && p.reactions[t]) || 0) + (reactionDelta[p.slug + ":" + t] || 0);
      });
      return {
        _id: index + 1,
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt || null,
        side: p.side,
        category: p.category || null,
        tags: (p.tags || []).slice().sort(),
        cover: p.cover || null,
        date: p.date,
        featured: !!p.featured,
        reads: (p.reads || 0) + (readDelta[p.slug] || 0),
        read_minutes: Math.max(1, Math.round(wordCount(p.content) / WORDS_PER_MIN)),
        note_count: noteCounts[p.slug] || 0,
        reactions: reactions,
        extra: p.extra || {},
        content: p.content || ""
      };
    });
  }

  // Giống backend: ORDER BY date DESC, id DESC
  function byDateDesc(a, b) {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return b._id - a._id;
  }

  function stripInternal(p, withContent) {
    var out = {};
    Object.keys(p).forEach(function (k) {
      if (k === "_id" || (k === "content" && !withContent)) return;
      out[k] = p[k];
    });
    return out;
  }

  function pageOf(items, query, defaultPer) {
    var per = clampInt(query.per_page, defaultPer, 1, MAX_PER_PAGE);
    var page = clampInt(query.page, 1, 1, 100000);
    var total = items.length;
    return {
      total: total,
      total_pages: Math.max(1, Math.ceil(total / per)),
      page: page,
      per_page: per,
      items: items.slice((page - 1) * per, page * per)
    };
  }

  function clampInt(value, fallback, min, max) {
    var n = parseInt(value, 10);
    if (isNaN(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }

  function wait(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  async function mockRequest(method, path, options) {
    await ensureContent();
    await wait(120); // giả lập độ trễ mạng nhẹ để thấy trạng thái loading
    var query = options.query || {};
    var body = options.body || {};
    var m;

    if (method === "GET" && path === "/posts") {
      var list = mockPosts().filter(function (p) {
        if (query.side && p.side !== query.side) return false;
        if (query.category && p.category !== query.category) return false;
        if (query.tag && p.tags.indexOf(query.tag) === -1) return false;
        if (query.featured === true || query.featured === "true") { if (!p.featured) return false; }
        if (query.slugs) {
          var slugs = Array.isArray(query.slugs) ? query.slugs : String(query.slugs).split(",");
          if (slugs.indexOf(p.slug) === -1) return false;
        }
        if (query.q) {
          var q = String(query.q).toLowerCase();
          if ((p.title + " " + (p.excerpt || "")).toLowerCase().indexOf(q) === -1) return false;
        }
        return true;
      });
      list.sort(query.sort === "reads" ? function (a, b) { return b.reads - a.reads || byDateDesc(a, b); } : byDateDesc);
      var paged = pageOf(list, query, POSTS_PER_PAGE);
      return {
        total: paged.total,
        total_pages: paged.total_pages,
        page: paged.page,
        per_page: paged.per_page,
        posts: paged.items.map(function (p) { return stripInternal(p, false); })
      };
    }

    if (method === "GET" && path === "/posts/categories") {
      var counts = {};
      mockPosts().forEach(function (p) {
        if (!p.category) return;
        var key = p.side + "|" + p.category;
        counts[key] = (counts[key] || 0) + 1;
      });
      return Object.keys(counts).sort().map(function (key) {
        var parts = key.split("|");
        return { side: parts[0], name: parts[1], count: counts[key] };
      });
    }

    if ((m = path.match(/^\/posts\/([^/]+)$/)) && method === "GET") {
      var all = mockPosts().sort(byDateDesc);
      var slug = decodeURIComponent(m[1]);
      var i = all.findIndex(function (p) { return p.slug === slug; });
      if (i === -1) throw ApiError("Post not found", 404);
      var nav = function (p) {
        return p ? { slug: p.slug, title: p.title, side: p.side, read_minutes: p.read_minutes } : null;
      };
      var detail = stripInternal(all[i], true);
      detail.prev = nav(all[i - 1]); // mới hơn (giống backend)
      detail.next = nav(all[i + 1]); // cũ hơn
      return detail;
    }

    if ((m = path.match(/^\/posts\/([^/]+)\/react$/)) && method === "POST") {
      var rSlug = decodeURIComponent(m[1]);
      if (!mockPosts().some(function (p) { return p.slug === rSlug; })) throw ApiError("Post not found", 404);
      if (REACTION_TYPES.indexOf(body.type) === -1) throw ApiError("Invalid reaction type", 400);
      var deltas = readLocal(LOCAL.reactions, {});
      deltas[rSlug + ":" + body.type] = (deltas[rSlug + ":" + body.type] || 0) + 1;
      writeLocal(LOCAL.reactions, deltas);
      var updated = mockPosts().find(function (p) { return p.slug === rSlug; });
      return { type: body.type, count: updated.reactions[body.type] };
    }

    if ((m = path.match(/^\/posts\/([^/]+)\/read$/)) && method === "POST") {
      var readSlug = decodeURIComponent(m[1]);
      var post = mockPosts().find(function (p) { return p.slug === readSlug; });
      if (!post) throw ApiError("Post not found", 404);
      var reads = readLocal(LOCAL.reads, {});
      reads[readSlug] = (reads[readSlug] || 0) + 1;
      writeLocal(LOCAL.reads, reads);
      return { reads: post.reads + 1 };
    }

    if (method === "GET" && path === "/notes") {
      var notes = content().notes.map(function (n, idx) {
        return {
          id: idx + 1,
          message: n.message,
          name: n.name || null,
          role: n.role || null,
          location: n.location || null,
          topic: n.topic,
          date: n.date,
          reply: n.reply || null,
          reply_context: n.replyContext || null,
          _id: idx + 1
        };
      }).filter(function (n) {
        if (query.topic && n.topic !== query.topic) return false;
        if (query.q) {
          var q = String(query.q).toLowerCase();
          if ([n.name, n.message, n.location].join(" ").toLowerCase().indexOf(q) === -1) return false;
        }
        return true;
      }).sort(byDateDesc);
      var np = pageOf(notes, query, NOTES_PER_PAGE);
      return {
        total: np.total,
        total_pages: np.total_pages,
        page: np.page,
        notes: np.items.map(function (n) { return stripInternal(n, false); })
      };
    }

    if (method === "POST" && path === "/notes") {
      var message = String(body.message || "").trim();
      if (!message) throw ApiError("Message is required", 400);
      if (message.length > 2000) throw ApiError("Message is too long", 400);
      if (NOTE_TOPICS.indexOf(body.topic) === -1) throw ApiError("Invalid topic", 400);
      if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) throw ApiError("Invalid email", 400);
      if (body.post_slug && !content().posts.some(function (p) { return p.slug === body.post_slug; })) {
        throw ApiError("Post not found", 404);
      }
      var saved = readLocal(LOCAL.notes, []);
      saved.unshift({ message: message, name: body.name || null, topic: body.topic, postSlug: body.post_slug || null, date: today() });
      writeLocal(LOCAL.notes, saved.slice(0, 50));
      return { ok: true };
    }

    if (method === "GET" && path === "/about") return JSON.parse(JSON.stringify(content().about));

    throw ApiError("Not found", 404);
  }

  function today() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  /* =========================================================
     Chuẩn hoá dữ liệu cho frontend
     ========================================================= */
  var SIDE_OF = { engineering: "A", life: "B" };
  var SIDE_PARAM = { A: "engineering", B: "life", a: "engineering", b: "life", engineering: "engineering", life: "life" };

  function normalizeNav(n) {
    if (!n) return null;
    return { slug: n.slug, title: n.title, side: SIDE_OF[n.side] || null, readMinutes: n.read_minutes || null };
  }

  function normalizePost(p) {
    if (!p) return null;
    var reactions = {};
    REACTION_TYPES.forEach(function (t) { reactions[t] = (p.reactions && p.reactions[t]) || 0; });
    return {
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt || "",
      side: SIDE_OF[p.side] || "A",
      category: p.category || "",
      tags: p.tags || [],
      cover: p.cover || null,
      date: p.date,
      featured: !!p.featured,
      reads: p.reads || 0,
      readMinutes: p.read_minutes || 1,
      noteCount: p.note_count || 0,
      reactions: reactions,
      extra: p.extra || {},
      content: p.content || "",
      // backend: prev = bài mới hơn, next = bài cũ hơn → đặt tên rõ nghĩa
      newer: normalizeNav(p.prev),
      older: normalizeNav(p.next)
    };
  }

  function normalizeNote(n) {
    return {
      id: n.id,
      message: n.message,
      name: n.name || "Anonymous",
      role: n.role || "",
      location: n.location || "",
      topic: n.topic,
      date: n.date,
      reply: n.reply || "",
      replyContext: n.reply_context || ""
    };
  }

  /* =========================================================
     API công khai
     ========================================================= */
  KJ.api = {
    REACTION_TYPES: REACTION_TYPES,
    NOTE_TOPICS: NOTE_TOPICS,
    mode: function () { return mode; },

    /** listPosts({ side:'A'|'B', category, tag, q, slugs[], featured, sort:'recent'|'reads', page, perPage })
     *  → { posts, total, totalPages, page, perPage } */
    listPosts: async function (opts) {
      opts = opts || {};
      var data = await request("GET", "/posts", {
        query: {
          side: SIDE_PARAM[opts.side],
          category: opts.category,
          tag: opts.tag,
          q: opts.q,
          slugs: opts.slugs && opts.slugs.length ? opts.slugs : undefined,
          featured: opts.featured ? "true" : undefined,
          sort: opts.sort === "reads" ? "reads" : undefined,
          page: opts.page,
          per_page: opts.perPage
        }
      });
      return {
        posts: (data.posts || []).map(normalizePost),
        total: data.total || 0,
        totalPages: data.total_pages || 1,
        page: data.page || 1,
        perPage: data.per_page || opts.perPage || POSTS_PER_PAGE
      };
    },

    /** categories() → [{ side:'A'|'B', name, count }] */
    categories: async function () {
      var rows = await request("GET", "/posts/categories");
      return rows.map(function (r) { return { side: SIDE_OF[r.side] || "A", name: r.name, count: r.count }; });
    },

    /** getPost(slug) → post đầy đủ (content, newer, older) */
    getPost: async function (slug) {
      return normalizePost(await request("GET", "/posts/" + encodeURIComponent(slug)));
    },

    /** react(slug, type) → { type, count } */
    react: function (slug, type) {
      return request("POST", "/posts/" + encodeURIComponent(slug) + "/react", { body: { type: type } });
    },

    /** markRead(slug) → { reads } */
    markRead: function (slug) {
      return request("POST", "/posts/" + encodeURIComponent(slug) + "/read", { body: {} });
    },

    /** listNotes({ topic, q, page, perPage }) → { notes, total, totalPages, page } (chỉ note đã ghim) */
    listNotes: async function (opts) {
      opts = opts || {};
      var data = await request("GET", "/notes", {
        query: { topic: opts.topic, q: opts.q, page: opts.page, per_page: opts.perPage }
      });
      return {
        notes: (data.notes || []).map(normalizeNote),
        total: data.total || 0,
        totalPages: data.total_pages || 1,
        page: data.page || 1
      };
    },

    /** sendNote({ message, name, email, topic, postSlug }) → { ok: true } */
    sendNote: function (note) {
      return request("POST", "/notes", {
        body: {
          message: note.message,
          name: note.name || undefined,
          email: note.email || undefined,
          topic: note.topic,
          post_slug: note.postSlug || undefined
        }
      });
    },

    /** about() → nội dung Màn 6 */
    about: function () {
      return request("GET", "/about");
    }
  };
})();
