/* =========================================================
   layout.js — Phần dùng chung cho mọi trang (window.KJ)
   - Dựng header (status bar + nav) và footer vào [data-site-header] /
     [data-site-footer] để 5 trang không phải lặp markup.
   - Theme Warm Cream / Parchment / Dusk (lưu localStorage).
   - Âm thanh "Cafe & Rain Ambience" tổng hợp bằng Web Audio (không cần file mp3).
   - Bảng tìm kiếm ⌘K / Ctrl+K, toast, đồng hồ Hà Nội.
   - Helper: store, escapeHtml, formatDate, bookmarks, sideLabel…
   Nạp SAU js/api.js và TRƯỚC script riêng của từng trang.
   ========================================================= */
(function () {
  "use strict";

  var KJ = (window.KJ = window.KJ || {});
  var page = document.body.dataset.page || "";

  /* ---------- Helper ---------- */
  KJ.$ = function (sel, root) { return (root || document).querySelector(sel); };
  KJ.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  KJ.store = {
    get: function (key, fallback) {
      try {
        var v = localStorage.getItem("kj." + key);
        return v === null ? fallback : JSON.parse(v);
      } catch (e) {
        return fallback;
      }
    },
    set: function (key, value) {
      try {
        if (value === null || value === undefined) localStorage.removeItem("kj." + key);
        else localStorage.setItem("kj." + key, JSON.stringify(value));
      } catch (e) { /* bỏ qua: chế độ ẩn danh / bị chặn */ }
    }
  };

  KJ.escapeHtml = function (str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  var MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var MONTHS_VI = ["Một", "Hai", "Ba", "Tư", "Năm", "Sáu", "Bảy", "Tám", "Chín", "Mười", "Mười Một", "Mười Hai"];

  function parseDate(value) {
    if (!value) return null;
    var m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    var d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(value);
    return isNaN(d) ? null : d;
  }

  /** style: "en" → "Oct 18, 2024" · "vi" → "18 Tháng Mười, 2024" · "short" → "18 Oct 2024" */
  KJ.formatDate = function (value, style) {
    var d = parseDate(value);
    if (!d) return String(value || "");
    if (style === "vi") return String(d.getDate()).padStart(2, "0") + " Tháng " + MONTHS_VI[d.getMonth()] + ", " + d.getFullYear();
    if (style === "short") return String(d.getDate()).padStart(2, "0") + " " + MONTHS_EN[d.getMonth()] + " " + d.getFullYear();
    return MONTHS_EN[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear();
  };

  KJ.relativeDate = function (value) {
    var d = parseDate(value);
    if (!d) return "";
    var days = Math.round((d - new Date().setHours(0, 0, 0, 0)) / 864e5);
    if (days > -1) return "Today";
    if (days > -30) return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(days, "day");
    return MONTHS_EN[d.getMonth()] + " " + String(d.getDate()).padStart(2, "0");
  };

  KJ.formatCount = function (n) {
    return n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "") + "k" : String(n);
  };

  KJ.SIDES = {
    A: { short: "Side A", name: "Side A: Craft & Systems", badge: "badge--sage", dot: "dot--terracotta", subtitle: "Engineering • Rust • Go • Arch" },
    B: { short: "Side B", name: "Side B: Soul & Everyday", badge: "badge--peach", dot: "", subtitle: "Hanoi Rain • Film • Solitude" }
  };

  KJ.TOPICS = {
    EngineeringSolitude: "Engineering Solitude",
    TeaAndHanoi: "Tea & Hanoi",
    AtticMusings: "Attic Musings",
    BookMusings: "Book Musings"
  };

  KJ.articleUrl = function (slug) { return "article.html?slug=" + encodeURIComponent(slug); };
  KJ.journalUrl = function (params) {
    var qs = new URLSearchParams();
    Object.keys(params || {}).forEach(function (k) { if (params[k]) qs.set(k, params[k]); });
    var s = qs.toString();
    return "journal.html" + (s ? "?" + s : "");
  };

  /* Bookmark: lưu trên trình duyệt, dùng chung Home + Journal */
  KJ.bookmarks = {
    all: function () { return KJ.store.get("bookmarks", []); },
    has: function (slug) { return KJ.bookmarks.all().indexOf(slug) !== -1; },
    toggle: function (slug) {
      var list = KJ.bookmarks.all();
      var i = list.indexOf(slug);
      if (i === -1) list.unshift(slug); else list.splice(i, 1);
      KJ.store.set("bookmarks", list);
      return i === -1;
    }
  };

  /* Reaction đã thả (mỗi loại 1 lần / bài / trình duyệt) */
  KJ.reacted = {
    get: function (slug) { return KJ.store.get("reacted." + slug, {}); },
    mark: function (slug, type) {
      var r = KJ.reacted.get(slug);
      r[type] = true;
      KJ.store.set("reacted." + slug, r);
    }
  };

  /* ---------- Toast ---------- */
  function toastHost() {
    var host = KJ.$("#toasts");
    if (!host) {
      host = document.createElement("div");
      host.id = "toasts";
      host.className = "toasts";
      host.setAttribute("aria-live", "polite");
      document.body.appendChild(host);
    }
    return host;
  }

  KJ.toast = function (message, opts) {
    opts = opts || {};
    var el = document.createElement("div");
    el.className = "toast" + (opts.kind ? " toast--" + opts.kind : "");
    el.setAttribute("role", opts.kind === "error" ? "alert" : "status");
    var text = document.createElement("span");
    text.textContent = message;
    el.appendChild(text);
    var timer;
    function close() {
      clearTimeout(timer);
      if (!el.isConnected) return;
      el.classList.add("is-leaving");
      setTimeout(function () { el.remove(); }, 200);
    }
    if (opts.action) {
      var act = document.createElement("button");
      act.type = "button";
      act.className = "toast__action";
      act.textContent = opts.action;
      act.addEventListener("click", function () { close(); opts.onAction(); });
      el.appendChild(act);
    }
    var x = document.createElement("button");
    x.type = "button";
    x.className = "toast__close";
    x.setAttribute("aria-label", "Đóng");
    x.textContent = "×";
    x.addEventListener("click", close);
    el.appendChild(x);
    toastHost().appendChild(el);
    timer = setTimeout(close, opts.duration || 3500);
    el.addEventListener("mouseenter", function () { clearTimeout(timer); });
    el.addEventListener("mouseleave", function () { timer = setTimeout(close, 2000); });
    return close;
  };

  /* ---------- Theme ---------- */
  var THEMES = { light: "Warm Cream", parchment: "Parchment", dusk: "Charcoal Dusk" };
  KJ.THEMES = THEMES;
  KJ.getTheme = function () { return document.documentElement.dataset.theme || "light"; };
  KJ.setTheme = function (name) {
    if (!THEMES[name]) name = "light";
    document.documentElement.dataset.theme = name;
    KJ.store.set("theme", name);
    KJ.$$("[data-theme-toggle]").forEach(function (btn) {
      btn.setAttribute("aria-pressed", String(name === "dusk"));
      btn.classList.toggle("is-active", name === "dusk");
    });
    document.dispatchEvent(new CustomEvent("kj:theme", { detail: { theme: name } }));
  };

  /* ---------- Ambience: mưa trên mái tôn + tiếng quán cà phê (Web Audio) ---------- */
  var ambience = { ctx: null, master: null, playing: false };

  function noiseBuffer(ctx, seconds) {
    var buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    var data = buffer.getChannelData(0);
    var last = 0;
    for (var i = 0; i < data.length; i++) {
      var white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02; // brown noise: trầm, giống mưa xa
      data[i] = last * 3.5;
    }
    return buffer;
  }

  function buildAmbience() {
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) throw new Error("Trình duyệt không hỗ trợ Web Audio");
    var ctx = new Ctx();
    var master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    // Lớp 1: mưa đều (brown noise qua lowpass)
    var rain = ctx.createBufferSource();
    rain.buffer = noiseBuffer(ctx, 4);
    rain.loop = true;
    var rainFilter = ctx.createBiquadFilter();
    rainFilter.type = "lowpass";
    rainFilter.frequency.value = 1200;
    var rainGain = ctx.createGain();
    rainGain.gain.value = 0.55;
    rain.connect(rainFilter).connect(rainGain).connect(master);
    rain.start();

    // Lớp 2: giọt mưa lách tách trên mái tôn (white noise highpass, nhấp nháy ngẫu nhiên)
    var drops = ctx.createBufferSource();
    var dropBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    var d = dropBuf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() < 0.0009 ? (Math.random() * 2 - 1) : d[i - 1] * 0.92 || 0;
    drops.buffer = dropBuf;
    drops.loop = true;
    var dropFilter = ctx.createBiquadFilter();
    dropFilter.type = "bandpass";
    dropFilter.frequency.value = 2400;
    var dropGain = ctx.createGain();
    dropGain.gain.value = 0.35;
    drops.connect(dropFilter).connect(dropGain).connect(master);
    drops.start();

    // Lớp 3: tiếng ồn quán cà phê rất nhỏ (lowpass thấp + dao động chậm)
    var hum = ctx.createBufferSource();
    hum.buffer = noiseBuffer(ctx, 3);
    hum.loop = true;
    var humFilter = ctx.createBiquadFilter();
    humFilter.type = "lowpass";
    humFilter.frequency.value = 380;
    var humGain = ctx.createGain();
    humGain.gain.value = 0.25;
    var lfo = ctx.createOscillator();
    var lfoGain = ctx.createGain();
    lfo.frequency.value = 0.07;
    lfoGain.gain.value = 0.1;
    lfo.connect(lfoGain).connect(humGain.gain);
    lfo.start();
    hum.connect(humFilter).connect(humGain).connect(master);
    hum.start();

    ambience.ctx = ctx;
    ambience.master = master;
  }

  KJ.ambience = {
    isPlaying: function () { return ambience.playing; },
    toggle: function () { return ambience.playing ? KJ.ambience.stop() : KJ.ambience.play(); },
    play: async function () {
      try {
        if (!ambience.ctx) buildAmbience();
        await ambience.ctx.resume();
        ambience.master.gain.setTargetAtTime(0.35, ambience.ctx.currentTime, 0.6);
        ambience.playing = true;
      } catch (err) {
        console.error(err);
        KJ.toast("Không phát được âm thanh nền trên trình duyệt này.", { kind: "error" });
        ambience.playing = false;
      }
      syncAmbience();
    },
    stop: function () {
      if (ambience.ctx) {
        ambience.master.gain.setTargetAtTime(0, ambience.ctx.currentTime, 0.3);
        var ctx = ambience.ctx;
        setTimeout(function () { if (!ambience.playing) ctx.suspend(); }, 1200);
      }
      ambience.playing = false;
      syncAmbience();
    }
  };

  function syncAmbience() {
    KJ.$$("[data-ambience-toggle]").forEach(function (btn) {
      btn.setAttribute("aria-pressed", String(ambience.playing));
      btn.classList.toggle("is-active", ambience.playing);
    });
    document.dispatchEvent(new CustomEvent("kj:ambience", { detail: { playing: ambience.playing } }));
  }

  /* ---------- Header / Footer ---------- */
  var NAV = [
    { id: "home", href: "index.html", label: "Home / Desk View" },
    { id: "journal", href: "journal.html", label: "The Dual Journal" },
    { id: "article", href: "article.html", label: "Article Reading" },
    { id: "whisper", href: "whisper-box.html", label: "The Whisper Box" },
    { id: "about", href: "about.html", label: "About & Now" }
  ];

  function headerHtml() {
    return (
      '<div class="status-bar">' +
        '<div class="status-bar__group status-bar__group--left">' +
          '<span class="status-bar__item"><i class="bi bi-cloud-sun"></i> Hanoi / 22°C<span class="status-bar__weather-extra">&nbsp;Soft Fog &amp; Morning Sun</span></span>' +
          '<span class="status-bar__divider">·</span>' +
          '<span class="status-bar__item"><i class="bi bi-clock"></i> <time data-clock>--:--</time> · Desk Time</span>' +
          '<span class="status-bar__divider">·</span>' +
          '<span class="status-bar__badge"><i class="bi bi-cup-hot-fill"></i> Brewing Oolong &amp; Crafting Distributed Systems</span>' +
          '<span class="status-bar__item status-bar__mode" data-api-mode hidden title="Chưa kết nối backend — đang hiển thị dữ liệu mẫu"><i class="bi bi-database-slash"></i> Offline · dữ liệu mẫu</span>' +
        "</div>" +
        '<div class="status-bar__group status-bar__group--right">' +
          '<button type="button" class="status-bar__toggle" data-ambience-toggle aria-pressed="false"><i class="bi bi-soundwave"></i> Cafe &amp; Rain Ambience</button>' +
          '<button type="button" class="status-bar__toggle" data-theme-toggle aria-pressed="false"><i class="bi bi-sunset"></i> Dusk / Warm Daylight</button>' +
        "</div>" +
      "</div>" +
      '<div class="nav-bar">' +
        '<a href="index.html" class="nav-bar__brand">' +
          '<img src="assets/logo.png" alt="" class="nav-bar__logo">' +
          '<span class="nav-bar__title">Kiên\'s Journal</span>' +
        "</a>" +
        '<nav class="nav-bar__nav" aria-label="Primary">' +
          NAV.map(function (item) {
            var active = item.id === page;
            return '<a href="' + item.href + '" class="nav-bar__link' + (active ? " nav-bar__link--active" : "") + '"' + (active ? ' aria-current="page"' : "") + ">" + KJ.escapeHtml(item.label) + "</a>";
          }).join("") +
        "</nav>" +
        '<div class="nav-bar__actions">' +
          '<button type="button" class="nav-bar__search" data-search-open aria-haspopup="dialog">' +
            '<i class="bi bi-search"></i> <span class="nav-bar__search-label">Search Musings</span> <kbd data-search-kbd>⌘K</kbd>' +
          "</button>" +
          '<a href="/api/rss" class="nav-bar__icon" data-rss-link aria-label="RSS Feed" title="RSS Feed"><i class="bi bi-rss"></i></a>' +
          '<a href="about.html" class="nav-bar__profile" aria-label="About Kiên">' +
            '<img src="assets/profile.png" alt="Kiên — Software Artisan &amp; Essayist" class="nav-bar__avatar">' +
          "</a>" +
        "</div>" +
      "</div>"
    );
  }

  function footerHtml() {
    return (
      '<h2 class="site-footer__title">Kiên\'s Personal Desk</h2>' +
      '<p class="site-footer__tagline">Typeset in EB Garamond &amp; Geist · Written with ink, tea, and curious code from a quiet corner in Hanoi. Built to be slow, cozy, and honest.</p>' +
      '<nav class="site-footer__links" aria-label="Footer">' +
        '<a href="about.html#colophon">Colophon</a>' +
        '<a href="/api/rss" data-rss-link><i class="bi bi-rss"></i> RSS Feed</a>' +
        '<a href="whisper-box.html#community-board">Guestbook</a>' +
        '<a href="about.html#tip-jar">Secret Coffee Tip Jar ☕</a>' +
      "</nav>" +
      '<p class="site-footer__copyright">© ' + new Date().getFullYear() + " Kiên. Handcrafted reflections, quiet software craftsmanship, and personal notes.</p>"
    );
  }

  var headerEl = KJ.$("[data-site-header]");
  if (headerEl) {
    headerEl.classList.add("site-header");
    headerEl.id = "site-header";
    headerEl.innerHTML = headerHtml();
  }
  var footerEl = KJ.$("[data-site-footer]");
  if (footerEl) {
    footerEl.classList.add("site-footer");
    footerEl.innerHTML = footerHtml();
  }

  // Chiều cao header thật (dùng cho sticky/scroll-margin ở trang Article)
  function syncHeaderHeight() {
    if (headerEl) document.documentElement.style.setProperty("--header-h", headerEl.offsetHeight + "px");
  }
  syncHeaderHeight();
  window.addEventListener("resize", syncHeaderHeight);

  // Phím tắt hiển thị đúng hệ điều hành
  if (!/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) {
    KJ.$$("[data-search-kbd]").forEach(function (k) { k.textContent = "Ctrl K"; });
  }

  // Đồng hồ giờ Hà Nội
  var clockFmt = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Ho_Chi_Minh" });
  function tick() {
    KJ.$$("[data-clock]").forEach(function (el) { el.textContent = clockFmt.format(new Date()); });
  }
  tick();
  setInterval(tick, 30 * 1000);

  // Trạng thái backend
  function syncMode(mode) {
    KJ.$$("[data-api-mode]").forEach(function (el) { el.hidden = mode !== "mock"; });
  }
  document.addEventListener("kj:api-mode", function (e) { syncMode(e.detail.mode); });
  if (KJ.api) syncMode(KJ.api.mode());

  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-ambience-toggle]")) KJ.ambience.toggle();
    if (e.target.closest("[data-theme-toggle]")) KJ.setTheme(KJ.getTheme() === "dusk" ? "light" : "dusk");
    var rss = e.target.closest("[data-rss-link]");
    if (rss && KJ.api && KJ.api.mode() !== "api") {
      e.preventDefault();
      KJ.toast("RSS Feed được phục vụ bởi backend (GET /api/rss). Hãy chạy backend để dùng.");
    }
  });

  KJ.setTheme(KJ.store.get("theme", "light"));

  /* ---------- Bảng tìm kiếm ⌘K ---------- */
  var palette = null;
  var searchState = { token: 0, active: -1, results: [] };

  function highlight(text, q) {
    var safe = KJ.escapeHtml(text);
    if (!q) return safe;
    var re = new RegExp("(" + KJ.escapeHtml(q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "ig");
    return safe.replace(re, "<mark>$1</mark>");
  }

  function buildPalette() {
    palette = document.createElement("dialog");
    palette.className = "search-palette";
    palette.setAttribute("aria-label", "Tìm kiếm bài viết");
    palette.innerHTML =
      '<div class="search-palette__bar">' +
        '<i class="bi bi-search"></i>' +
        '<input type="search" class="search-palette__input" placeholder="Search through thoughts, code fragments, or quiet stories…" autocomplete="off" aria-label="Từ khoá">' +
        "<kbd>Esc</kbd>" +
      "</div>" +
      '<div class="search-palette__results" role="listbox" aria-live="polite"></div>' +
      '<div class="search-palette__foot meta-text"><span>↑↓ chọn · Enter mở bài</span><a href="journal.html" class="text-link" data-search-all>Mở The Dual Journal <i class="bi bi-arrow-right"></i></a></div>';
    document.body.appendChild(palette);

    var input = KJ.$("input", palette);
    var debounce;
    input.addEventListener("input", function () {
      clearTimeout(debounce);
      debounce = setTimeout(function () { runSearch(input.value.trim()); }, 200);
    });
    input.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (!searchState.results.length) return;
        var dir = e.key === "ArrowDown" ? 1 : -1;
        searchState.active = (searchState.active + dir + searchState.results.length) % searchState.results.length;
        paintActive();
      } else if (e.key === "Enter") {
        var target = searchState.results[Math.max(0, searchState.active)];
        if (target) location.href = KJ.articleUrl(target.slug);
        else if (input.value.trim()) location.href = KJ.journalUrl({ q: input.value.trim() });
      }
    });
    // Đóng có animation (css/motion.css: .search-palette.is-closing)
    function closePalette() {
      if (!palette.open || palette.classList.contains("is-closing")) return;
      palette.classList.add("is-closing");
      setTimeout(function () {
        palette.classList.remove("is-closing");
        palette.close();
      }, 150);
    }
    palette.addEventListener("cancel", function (e) { // phím Esc
      e.preventDefault();
      closePalette();
    });
    palette.addEventListener("click", function (e) {
      if (e.target === palette) closePalette(); // bấm ra ngoài
      var all = e.target.closest("[data-search-all]");
      if (all && input.value.trim()) {
        e.preventDefault();
        location.href = KJ.journalUrl({ q: input.value.trim() });
      }
    });
  }

  function paintActive() {
    KJ.$$(".search-result", palette).forEach(function (el, i) {
      el.classList.toggle("is-active", i === searchState.active);
      el.setAttribute("aria-selected", String(i === searchState.active));
      if (i === searchState.active) el.scrollIntoView({ block: "nearest" });
    });
  }

  async function runSearch(q) {
    var box = KJ.$(".search-palette__results", palette);
    var token = ++searchState.token;
    try {
      var data = await KJ.api.listPosts({ q: q || undefined, perPage: 8 });
      if (token !== searchState.token) return;
      searchState.results = data.posts;
      searchState.active = data.posts.length ? 0 : -1;
      if (!data.posts.length) {
        box.innerHTML = '<p class="search-palette__hint">Không tìm thấy bài nào khớp “' + KJ.escapeHtml(q) + "”.</p>";
        return;
      }
      box.innerHTML = (q ? "" : '<p class="search-palette__hint" style="text-align:left;padding:8px 16px 4px">Mới viết gần đây</p>') +
        data.posts.map(function (p) {
          var side = KJ.SIDES[p.side];
          return '<a class="search-result" role="option" href="' + KJ.articleUrl(p.slug) + '">' +
            '<span class="search-result__meta"><span class="badge ' + side.badge + '">' + side.short + (p.category ? " · " + KJ.escapeHtml(p.category) : "") + '</span><span class="meta-text">' + KJ.formatDate(p.date) + "</span></span>" +
            '<span class="search-result__title">' + highlight(p.title, q) + "</span>" +
            '<span class="search-result__excerpt">' + highlight(p.excerpt, q) + "</span>" +
          "</a>";
        }).join("");
      paintActive();
    } catch (err) {
      if (token !== searchState.token) return;
      box.innerHTML = '<p class="search-palette__hint">Không tìm được lúc này: ' + KJ.escapeHtml(err.message) + "</p>";
    }
  }

  KJ.openSearch = function (initial) {
    if (!palette) buildPalette();
    var input = KJ.$("input", palette);
    if (typeof initial === "string") input.value = initial;
    if (!palette.open) palette.showModal();
    input.focus();
    input.select();
    runSearch(input.value.trim());
  };

  // Trang có ô tìm kiếm riêng (Journal) có thể ghi đè hành vi ⌘K
  KJ.onSearchShortcut = null;

  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-search-open]")) KJ.openSearch();
  });
  document.addEventListener("keydown", function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      if (typeof KJ.onSearchShortcut === "function") KJ.onSearchShortcut();
      else KJ.openSearch();
    }
  });
})();
