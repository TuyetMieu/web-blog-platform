/* =========================================================
   motion.js — Chuyển cảnh & micro-interaction (đi cùng css/motion.css)
   - Chuyển trang: fade-out trước khi rời trang (trình duyệt chưa có
     View Transitions giữa các trang; Chrome/Edge mới dùng CSS @view-transition).
   - Hiện dần khi cuộn tới (IntersectionObserver), cả với nội dung render sau.
   - Ripple khi bấm nút, thanh chọn có nền trượt, ảnh hiện dần khi tải xong.
   - Đổi theme bằng vòng tròn lan ra từ điểm bấm (View Transitions API).
   Nạp SAU js/layout.js và TRƯỚC script riêng của trang.
   ========================================================= */
(function () {
  "use strict";

  var KJ = (window.KJ = window.KJ || {});
  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var motionOn = function () { return !reduceMotion.matches; };

  root.classList.add("js-motion");

  /* ---------- 1. Chuyển trang: chiều trượt + fallback khi không có View Transitions ---------- */
  var ORDER = ["index", "journal", "article", "whisper-box", "about"];
  function pageIndex(url) {
    return ORDER.indexOf(url.pathname.split("/").pop().replace(/\.html$/, "") || "index");
  }

  /** Chiều trượt tới url: data-nav-dir trên link > vị trí trong menu > mặc định tiến */
  function directionTo(url, link) {
    if (link && link.dataset.navDir) return link.dataset.navDir;
    var from = pageIndex(new URL(location.href));
    var to = pageIndex(url);
    return from !== -1 && to !== -1 && to < from ? "back" : "forward";
  }

  document.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest("a[href]");
    if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
    var url = new URL(a.href, location.href);
    if (url.origin !== location.origin || url.pathname.indexOf("/api/") === 0) return;
    if (url.pathname === location.pathname && url.search === location.search) return; // cùng trang (#hash)

    var dir = directionTo(url, a);
    // Trang mới đọc 2 gợi ý này: chiều trượt nội dung (js/boot.js) và vị trí xuất phát của pill menu
    try {
      sessionStorage.setItem("kj.navdir", JSON.stringify({ dir: dir, to: url.pathname + url.search, at: Date.now() }));
      sessionStorage.setItem("kj.navfrom", JSON.stringify({ page: pageName(new URL(location.href)), at: Date.now() }));
    } catch (err) { /* bỏ qua */ }

    // Trình duyệt chưa có View Transitions giữa các trang: tự trượt <main> ra rồi mới chuyển
    if (root.classList.contains("no-vt") && motionOn()) {
      e.preventDefault();
      root.classList.toggle("nav-back", dir === "back");
      root.classList.add("is-leaving");
      setTimeout(function () { location.href = url.href; }, 200);
    }
  });

  /* ---------- 2. Hiện dần khi cuộn tới ---------- */
  var REVEAL = [
    ".hero__top", ".bento__card", ".quick-post", ".journal-feed__header", ".featured-entry", ".entry-card",
    ".whisper-postbox__header", ".postcard-form", ".pinboard__header", ".sticky-note", ".archive-more",
    ".notebook-head > *", ".filter-panel", ".case-study", ".leaf-card", ".leaf-ribbon",
    ".crumbs", ".banner", ".reader__main", ".reader__aside", ".reactions", ".postcard", ".leaf",
    ".whisper-head > *", ".airmail", ".solitude-card", ".board-head", ".board-topics", ".note-card", ".artifacts__head", ".artifact",
    ".about-hero__portrait", ".about-hero__text", ".stat", ".about-section-head", ".now-card", ".gear", ".timeline__item",
    ".gallery__item", ".colophon", ".tip-jar", ".about-gear > h2", ".about-timeline > h2",
    ".empty-state", ".lost > *"
  ].join(",");

  var batch = [];
  var batchTimer = null;
  var observer = "IntersectionObserver" in window
    ? new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          observer.unobserve(entry.target);
          batch.push(entry.target);
        });
        // Các phần tử lộ ra cùng lúc được hiện so le (stagger)
        clearTimeout(batchTimer);
        batchTimer = setTimeout(flushBatch, 16);
      }, { rootMargin: "0px 0px -6% 0px", threshold: 0 })
    : null;

  function flushBatch() {
    batch.sort(function (a, b) {
      var ra = a.getBoundingClientRect();
      var rb = b.getBoundingClientRect();
      return ra.top - rb.top || ra.left - rb.left;
    });
    batch.forEach(function (el, i) {
      el.style.setProperty("--reveal-delay", Math.min(i, 8) * 70 + "ms");
      el.classList.add("is-revealed");
    });
    batch = [];
  }

  function registerReveal(scope) {
    if (!observer || !motionOn()) return;
    var nodes = [];
    if (scope.nodeType === 1 && scope.matches(REVEAL)) nodes.push(scope);
    if (scope.querySelectorAll) nodes = nodes.concat(Array.prototype.slice.call(scope.querySelectorAll(REVEAL)));
    nodes.forEach(function (el) {
      if (el.classList.contains("reveal") || el.closest(".search-palette, .toasts")) return;
      el.classList.add("reveal");
      observer.observe(el);
    });
  }

  /* ---------- 3. Ảnh hiện dần khi tải xong ---------- */
  var IMG = ".polaroid img, .featured-entry__figure img, .case-study__cover img, .gallery__item img, .artifact img, .photo__frame img, .about-hero__portrait img";

  function registerImages(scope) {
    if (!scope.querySelectorAll) return;
    var imgs = Array.prototype.slice.call(scope.querySelectorAll(IMG));
    if (scope.nodeType === 1 && scope.matches(IMG)) imgs.push(scope);
    imgs.forEach(function (img) {
      if (img.classList.contains("img-fade")) return;
      img.classList.add("img-fade");
      var done = function () { img.classList.add("is-loaded"); };
      if (img.complete) done();
      else {
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
      }
    });
  }

  /* ---------- 4. Thanh chọn có nền trượt (Side A/B, bộ lọc Home, menu header) ---------- */
  var SLIDERS = ".filter-switcher, .side-switch, .nav-bar__nav";

  function activeOf(group) {
    return group.querySelector('[aria-pressed="true"], .filter-switcher__btn--active, .nav-bar__link--active');
  }

  function moveIndicator(group, animate, target) {
    var indicator = group.querySelector(":scope > .slide-indicator");
    var active = target || activeOf(group);
    if (!indicator) return;
    indicator.hidden = !active;
    if (!active) return;
    indicator.classList.toggle("no-anim", !animate);
    indicator.style.width = active.offsetWidth + "px";
    indicator.style.height = active.offsetHeight + "px";
    indicator.style.transform = "translate(" + active.offsetLeft + "px, " + active.offsetTop + "px)";
  }

  /* Menu header: mục của trang vừa rời (để pill trượt từ đó sang mục hiện tại) */
  function pageName(url) {
    return url.pathname.split("/").pop().replace(/\.html$/, "") || "index";
  }
  function previousNavLink(nav) {
    var fromName = null;
    try {
      var hint = JSON.parse(sessionStorage.getItem("kj.navfrom"));
      sessionStorage.removeItem("kj.navfrom");
      if (hint && Date.now() - hint.at < 5000) fromName = hint.page;
    } catch (e) { /* bỏ qua */ }
    // Không bấm link (nút Back/Forward) → lấy trang trước từ Navigation API
    var activation = window.navigation && window.navigation.activation;
    if (!fromName && activation && activation.from && activation.from.url) {
      fromName = pageName(new URL(activation.from.url));
    }
    if (!fromName) return null;
    return Array.prototype.find.call(nav.querySelectorAll(".nav-bar__link"), function (a) {
      return pageName(new URL(a.href, location.href)) === fromName;
    }) || null;
  }

  function registerSliders(scope) {
    if (!scope.querySelectorAll) return;
    Array.prototype.forEach.call(scope.querySelectorAll(SLIDERS), function (group) {
      if (group.classList.contains("has-indicator")) return;
      group.classList.add("has-indicator");
      var indicator = document.createElement("span");
      indicator.className = "slide-indicator";
      indicator.setAttribute("aria-hidden", "true");
      group.insertBefore(indicator, group.firstChild);

      var from = group.matches(".nav-bar__nav") && motionOn() ? previousNavLink(group) : null;
      if (from && from !== activeOf(group)) {
        // Đặt pill ở mục trang trước, rồi trượt sang mục trang hiện tại (như Side A/B)
        moveIndicator(group, false, from);
        void getComputedStyle(indicator).transform; // ép trình duyệt ghi nhận vị trí xuất phát
        group.dataset.sliding = "1";
        indicator.addEventListener("transitionend", function done(e) {
          if (e.propertyName !== "transform") return;
          delete group.dataset.sliding;
          indicator.removeEventListener("transitionend", done);
        });
        requestAnimationFrame(function () {
          requestAnimationFrame(function () { moveIndicator(group, true); });
        });
      } else {
        moveIndicator(group, false);
      }
      // Nút active đổi (do script trang cập nhật aria-pressed / class) → trượt theo
      new MutationObserver(function (mutations) {
        var relevant = mutations.some(function (m) { return m.target !== indicator && m.target.parentNode === group; });
        if (relevant) moveIndicator(group, true);
      }).observe(group, { subtree: true, attributes: true, attributeFilter: ["aria-pressed", "class"] });
    });
  }

  // Canh lại khi đổi kích thước / font web tải xong (bỏ qua nếu pill đang trượt)
  function realignIndicators() {
    Array.prototype.forEach.call(document.querySelectorAll(".has-indicator"), function (g) {
      if (!g.dataset.sliding) moveIndicator(g, false);
    });
  }
  window.addEventListener("resize", realignIndicators);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(realignIndicators);

  /* ---------- 5. Ripple khi bấm ---------- */
  var RIPPLE = ".submit-btn, .pill-btn, .reaction, .reaction-btn, .seal, .category-pill, .side-switch__btn, .filter-switcher__btn, .swatch, .segmented__btn, .archive-more__btn, .quick-post__link, .status-bar__toggle, .player__btn, .focus-btn";

  document.addEventListener("pointerdown", function (e) {
    if (!motionOn() || e.button !== 0) return;
    var el = e.target.closest(RIPPLE);
    if (!el || el.disabled) return;
    var rect = el.getBoundingClientRect();
    var size = Math.max(rect.width, rect.height) * 2.2;
    var ripple = document.createElement("span");
    ripple.className = "ripple";
    ripple.style.setProperty("--ripple-size", size + "px");
    ripple.style.left = e.clientX - rect.left + "px";
    ripple.style.top = e.clientY - rect.top + "px";
    el.classList.add("has-ripple");
    el.appendChild(ripple);
    ripple.addEventListener("animationend", function () { ripple.remove(); });
  });

  /* ---------- 6. Đổi theme: vòng tròn lan ra từ điểm bấm ---------- */
  var lastPointer = null;
  document.addEventListener("pointerdown", function (e) {
    lastPointer = { x: e.clientX, y: e.clientY, t: Date.now() };
  }, true);

  var baseSetTheme = KJ.setTheme;
  var baseGetTheme = KJ.getTheme;
  var pendingTheme = null; // theme đang chuyển tới (View Transition áp dụng ở khung hình sau)
  if (typeof baseSetTheme === "function") {
    KJ.getTheme = function () { return pendingTheme || baseGetTheme(); };
    KJ.setTheme = function (name) {
      if (name === KJ.getTheme() || !motionOn()) return baseSetTheme(name);

      var fromPointer = lastPointer && Date.now() - lastPointer.t < 800;
      if (!document.startViewTransition || !fromPointer) {
        // Không có View Transitions (hoặc đổi bằng phím T) → chuyển màu mượt
        root.classList.add("theme-fade");
        baseSetTheme(name);
        setTimeout(function () { root.classList.remove("theme-fade"); }, 400);
        return;
      }

      var x = lastPointer.x;
      var y = lastPointer.y;
      var radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      root.classList.add("theme-vt");
      pendingTheme = name;
      var transition = document.startViewTransition(function () {
        pendingTheme = null;
        baseSetTheme(name);
      });
      transition.ready.then(function () {
        root.animate(
          { clipPath: ["circle(0px at " + x + "px " + y + "px)", "circle(" + radius + "px at " + x + "px " + y + "px)"] },
          { duration: 650, easing: "cubic-bezier(0.4, 0, 0.2, 1)", pseudoElement: "::view-transition-new(root)" }
        );
      }).catch(function () { /* bị huỷ: bỏ qua */ });
      transition.finished.finally(function () { root.classList.remove("theme-vt"); });
    };
  }

  /* Chạy 1 thay đổi DOM trong View Transition nếu có (vd. bật chế độ tập trung) */
  KJ.withTransition = function (update) {
    if (!document.startViewTransition || !motionOn()) {
      update();
      return;
    }
    root.classList.add("same-vt"); // crossfade nhẹ thay vì trượt như chuyển trang
    document.startViewTransition(update).finished.finally(function () {
      root.classList.remove("same-vt");
    });
  };

  /* Chạy lại 1 animation CSS dựa trên class (vd. đóng dấu khi gửi bưu thiếp) */
  KJ.replayClass = function (el, cls) {
    if (!el) return;
    el.classList.remove(cls);
    void el.offsetWidth; // ép reflow để animation chạy lại
    el.classList.add(cls);
    setTimeout(function () { el.classList.remove(cls); }, 1200);
  };

  /* ---------- 7. Header đổ bóng khi đã cuộn ---------- */
  var header = document.querySelector(".site-header");
  if (header) {
    var syncHeader = function () { header.classList.toggle("is-scrolled", window.scrollY > 8); };
    window.addEventListener("scroll", syncHeader, { passive: true });
    syncHeader();
  }

  /* ---------- Khởi động + theo dõi nội dung render sau (API trả về) ---------- */
  function enhance(scope) {
    registerReveal(scope);
    registerImages(scope);
    registerSliders(scope);
  }

  enhance(document.body);
  new MutationObserver(function (mutations) {
    mutations.forEach(function (m) {
      Array.prototype.forEach.call(m.addedNodes, function (node) {
        if (node.nodeType === 1) enhance(node);
      });
    });
  }).observe(document.body, { childList: true, subtree: true });
})();
