/* =========================================================
   journal.js — Màn 5: The Dual Journal (Journal Feed)
   Chuyển từ journal-feed.js (FE4) sang api/layout dùng chung:
   Side A/B, lọc chủ đề + tag, tìm kiếm (debounce), sort, bookmark,
   phân trang, chống race-condition, trạng thái URL có thể chia sẻ.
   ========================================================= */
(function () {
  "use strict";

  var KJ = window.KJ;
  var api = KJ.api;
  var esc = KJ.escapeHtml;
  var $ = KJ.$;
  var $$ = KJ.$$;

  var PAGE_SIZE = 4;
  var url = new URLSearchParams(location.search);
  var state = {
    side: url.get("side") === "B" ? "B" : "A",
    category: url.get("category") || "",
    tag: url.get("tag") || "",
    q: url.get("q") || "",
    page: Math.max(1, parseInt(url.get("page"), 10) || 1),
    sort: url.get("sort") === "reads" ? "reads" : "recent",
    savedOnly: url.get("saved") === "1"
  };

  var resultsEl = $("#feed-results");
  var searchInput = $("#feed-search");
  var sortBtn = $("#feed-sort");
  var savedBtn = $("#feed-saved");
  var pillsEl = $("#category-pills");
  var activeTagEl = $("#active-tag");
  var prevBtn = $("#feed-prev");
  var nextBtn = $("#feed-next");
  var categories = [];

  /* ---------- URL ---------- */
  function syncUrl() {
    var qs = new URLSearchParams();
    if (state.side === "B") qs.set("side", "B");
    if (state.category) qs.set("category", state.category);
    if (state.tag) qs.set("tag", state.tag);
    if (state.q) qs.set("q", state.q);
    if (state.sort === "reads") qs.set("sort", "reads");
    if (state.savedOnly) qs.set("saved", "1");
    if (state.page > 1) qs.set("page", String(state.page));
    var s = qs.toString();
    history.replaceState(null, "", location.pathname + (s ? "?" + s : ""));
  }

  /* ---------- Điều khiển ---------- */
  function paintControls() {
    $$(".side-switch__btn").forEach(function (btn) {
      btn.setAttribute("aria-pressed", String(btn.dataset.side === state.side));
    });
    sortBtn.querySelector("span").textContent = state.sort === "reads" ? "Sort: Most Read" : "Sort: Chronological";
    savedBtn.setAttribute("aria-pressed", String(state.savedOnly));
    savedBtn.querySelector("i").className = "bi " + (state.savedOnly ? "bi-bookmark-fill" : "bi-bookmark");
    if (searchInput.value !== state.q) searchInput.value = state.q;

    activeTagEl.hidden = !state.tag;
    if (state.tag) {
      activeTagEl.innerHTML = 'Lọc theo tag <button type="button" data-clear-tag aria-label="Bỏ lọc tag">#' + esc(state.tag) + ' <i class="bi bi-x"></i></button>';
    }
    paintPills();
  }

  function paintPills() {
    var mine = categories.filter(function (c) { return c.side === state.side; });
    var total = mine.reduce(function (sum, c) { return sum + c.count; }, 0);
    var pills = [{ name: "", label: "All Entries", count: total }].concat(mine.map(function (c) {
      return { name: c.name, label: c.name, count: c.count };
    }));
    pillsEl.innerHTML = pills.map(function (p) {
      return '<button type="button" class="category-pill" data-category="' + esc(p.name) + '" aria-pressed="' + (p.name === state.category) + '">' +
        esc(p.label) + (categories.length ? " (" + p.count + ")" : "") + "</button>";
    }).join("");
  }

  async function loadCategories() {
    try {
      categories = await api.categories();
      var all = categories.reduce(function (sum, c) { return sum + c.count; }, 0);
      $("[data-total-fragments]").textContent = all;
      paintPills();
    } catch (err) {
      console.warn("[journal] Không tải được chủ đề:", err);
    }
  }

  /* ---------- HTML ---------- */
  function tagLinks(post) {
    return post.tags.map(function (t) {
      return '<a href="' + KJ.journalUrl({ side: post.side, tag: t }) + '" data-tag="' + esc(t) + '">#' + esc(t) + "</a>";
    }).join(" ");
  }

  function caseStudyHtml(post) {
    var x = post.extra || {};
    var aside = "";
    if (x.code) {
      aside =
        '<div class="code-panel">' +
          '<div class="code-panel__bar">' +
            '<span class="code-panel__dots"><i></i><i></i><i></i><span class="code-panel__file">' + esc(x.code.filename) + "</span></span>" +
            (x.code.meta ? '<span class="code-panel__badge">' + esc(x.code.meta) + "</span>" : "") +
          "</div>" +
          "<pre><code>" + esc(x.code.content) + "</code></pre>" +
          '<div class="code-panel__foot"><span><i class="bi bi-graph-up-arrow"></i> ' + esc(x.code.footer || "") + "</span><span>" + esc(x.code.badge || "") + "</span></div>" +
        "</div>";
    } else if (post.cover) {
      aside = '<figure class="case-study__cover"><img src="' + esc(post.cover) + '" alt="">' +
        (x.coverCaption ? "<figcaption>" + esc(x.coverCaption) + "</figcaption>" : "") + "</figure>";
    }
    var takeaways = x.takeaways || [];
    return (
      '<article class="case-study' + (aside ? "" : " case-study--no-aside") + '">' +
        '<div class="case-study__main">' +
          '<div class="case-study__meta">' +
            '<span class="badge badge--peach">Featured ' + (post.side === "A" ? "Case Study" : "Essay") + "</span>" +
            '<span class="badge badge--neutral badge--mono">' + esc(x.level || post.category) + "</span>" +
            '<span class="meta-text">Archived ' + KJ.formatDate(post.date) + "</span>" +
            '<span class="meta-text">•</span>' +
            '<span class="meta-text"><i class="bi bi-clock"></i> ' + post.readMinutes + " min read</span>" +
          "</div>" +
          '<h2 class="case-study__title"><a href="' + KJ.articleUrl(post.slug) + '">' + esc(post.title) + "</a></h2>" +
          '<p class="case-study__excerpt">' + esc(post.excerpt) + "</p>" +
          (takeaways.length
            ? '<div class="takeaways">' +
                '<p class="takeaways__title"><i class="bi bi-check2-circle"></i> Core ' + (post.side === "A" ? "Architecture" : "") + " Takeaways</p>" +
                '<ul class="takeaways__list">' + takeaways.map(function (t) {
                  return '<li class="takeaways__item"><i class="bi bi-check-circle"></i><span>' + esc(t) + "</span></li>";
                }).join("") + "</ul>" +
              "</div>"
            : "") +
          '<div class="case-study__foot">' +
            '<div class="tag-list">' + post.tags.map(function (t) {
              return '<a class="tag" href="' + KJ.journalUrl({ side: post.side, tag: t }) + '" data-tag="' + esc(t) + '">#' + esc(t) + "</a>";
            }).join("") + "</div>" +
            '<a class="pill-btn pill-btn--primary" href="' + KJ.articleUrl(post.slug) + '">' + (post.side === "A" ? "Read Field Report" : "Read Full Parchment") + ' <i class="bi bi-arrow-right"></i></a>' +
          "</div>" +
        "</div>" +
        aside +
      "</article>"
    );
  }

  function leafCardHtml(post) {
    var saved = KJ.bookmarks.has(post.slug);
    var code = (post.extra && post.extra.refCode) || post.category;
    return (
      '<article class="leaf-card">' +
        '<div>' +
          '<div class="leaf-card__top">' +
            '<span class="leaf-card__code">' + esc(code) + "</span>" +
            '<span class="meta-text"><i class="bi bi-clock"></i> ' + post.readMinutes + " min</span>" +
          "</div>" +
          '<h3 class="leaf-card__title"><a href="' + KJ.articleUrl(post.slug) + '">' + esc(post.title) + "</a></h3>" +
          '<p class="leaf-card__excerpt">' + esc(post.excerpt) + "</p>" +
        "</div>" +
        '<div class="leaf-card__foot">' +
          '<div class="leaf-card__tags">' + tagLinks(post) + "</div>" +
          '<button type="button" class="icon-btn" data-bookmark="' + esc(post.slug) + '" aria-pressed="' + saved + '" title="' + (saved ? "Bỏ đánh dấu" : "Đánh dấu bài này") + '">' +
            '<i class="bi ' + (saved ? "bi-bookmark-fill" : "bi-bookmark") + '"></i>' +
          "</button>" +
        "</div>" +
      "</article>"
    );
  }

  function emptyHtml(title, hint) {
    return '<div class="empty-state"><p class="empty-state__title">' + title + '</p><p class="empty-state__hint">' + hint + "</p></div>";
  }

  /* ---------- Render ---------- */
  var renderToken = 0;
  var loadingTimer;

  async function render() {
    var token = ++renderToken;
    syncUrl();
    paintControls();
    resultsEl.setAttribute("aria-busy", "true");
    clearTimeout(loadingTimer);
    loadingTimer = setTimeout(function () {
      if (token === renderToken) resultsEl.classList.add("is-loading");
    }, 200);

    var query = {
      side: state.side,
      category: state.category || undefined,
      tag: state.tag || undefined,
      q: state.q || undefined,
      sort: state.sort,
      page: state.page,
      perPage: PAGE_SIZE
    };

    var data;
    try {
      if (state.savedOnly) {
        var slugs = KJ.bookmarks.all();
        data = slugs.length
          ? await api.listPosts(Object.assign(query, { slugs: slugs }))
          : { posts: [], total: 0, totalPages: 1, page: 1 };
      } else {
        data = await api.listPosts(query);
      }
    } catch (err) {
      if (token !== renderToken) return;
      finish();
      resultsEl.innerHTML = '<div class="empty-state empty-state--error"><p class="empty-state__title">Đã có lỗi khi tải bài viết.</p><p class="empty-state__hint">' + esc(err.message) + "</p></div>";
      return;
    }
    if (token !== renderToken) return; // đã có lần render mới hơn

    // Trang yêu cầu vượt quá số trang thật (vd. link cũ) → về trang cuối
    if (data.page > data.totalPages && data.total > 0) {
      state.page = data.totalPages;
      return render();
    }

    finish();
    var posts = data.posts;
    if (!posts.length) {
      resultsEl.innerHTML = state.savedOnly
        ? emptyHtml("Chưa có bài nào được đánh dấu ở mặt sổ này.", "Bấm biểu tượng 🔖 trên một bài để lưu lại, hoặc tắt bộ lọc bài đã lưu.")
        : emptyHtml("Không tìm thấy bài viết phù hợp.", "Thử đổi Side, bỏ bớt bộ lọc chủ đề/tag, hoặc xoá từ khoá tìm kiếm.") + '<div data-other-side></div>';
      if (!state.savedOnly && (state.q || state.tag)) suggestOtherSide(token);
    } else {
      var featured = posts.find(function (p) { return p.featured; });
      var rest = posts.filter(function (p) { return p !== featured; });
      resultsEl.innerHTML =
        (featured ? caseStudyHtml(featured) : "") +
        (rest.length ? '<div class="leaf-grid">' + rest.map(leafCardHtml).join("") + "</div>" : "");
    }

    var start = data.total === 0 ? 0 : (data.page - 1) * PAGE_SIZE + 1;
    var end = Math.min(data.page * PAGE_SIZE, data.total);
    $("#feed-page-label").textContent = "Page " + data.page + " of " + data.totalPages;
    $("#feed-range-label").textContent = "Showing entries " + start + "–" + end + " of " + data.total + " reflections";
    prevBtn.disabled = data.page <= 1;
    nextBtn.disabled = data.page >= data.totalPages;

    function finish() {
      clearTimeout(loadingTimer);
      resultsEl.classList.remove("is-loading");
      resultsEl.removeAttribute("aria-busy");
    }
  }

  // Không có kết quả ở mặt này nhưng có ở mặt kia → gợi ý chuyển
  async function suggestOtherSide(token) {
    var other = state.side === "A" ? "B" : "A";
    try {
      var data = await api.listPosts({ side: other, tag: state.tag || undefined, q: state.q || undefined, perPage: 1 });
      if (token !== renderToken || !data.total) return;
      var slot = $("[data-other-side]", resultsEl);
      if (!slot) return;
      slot.innerHTML = '<p style="text-align:center"><button type="button" class="pill-btn" data-switch-side="' + other + '">' +
        "Có " + data.total + " kết quả ở " + KJ.SIDES[other].name + ' <i class="bi bi-arrow-right"></i></button></p>';
    } catch (e) { /* bỏ qua gợi ý */ }
  }

  /* ---------- Sự kiện ---------- */
  function update(patch) {
    Object.assign(state, patch);
    render();
  }

  $$(".side-switch__btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (state.side === btn.dataset.side) return;
      update({ side: btn.dataset.side, category: "", tag: "", page: 1 });
    });
  });

  pillsEl.addEventListener("click", function (e) {
    var pill = e.target.closest("[data-category]");
    if (!pill || pill.dataset.category === state.category) return;
    update({ category: pill.dataset.category, page: 1 });
  });

  activeTagEl.addEventListener("click", function (e) {
    if (e.target.closest("[data-clear-tag]")) update({ tag: "", page: 1 });
  });

  var debounce;
  searchInput.addEventListener("input", function () {
    clearTimeout(debounce);
    debounce = setTimeout(function () {
      update({ q: searchInput.value.trim(), page: 1 });
    }, 300);
  });

  sortBtn.addEventListener("click", function () {
    update({ sort: state.sort === "reads" ? "recent" : "reads", page: 1 });
  });

  savedBtn.addEventListener("click", function () {
    update({ savedOnly: !state.savedOnly, page: 1 });
  });

  prevBtn.addEventListener("click", function () {
    if (state.page > 1) update({ page: state.page - 1 });
    window.scrollTo({ top: $(".feed").offsetTop - 120 });
  });
  nextBtn.addEventListener("click", function () {
    update({ page: state.page + 1 });
    window.scrollTo({ top: $(".feed").offsetTop - 120 });
  });

  resultsEl.addEventListener("click", function (e) {
    // Bấm tag trong kết quả: lọc ngay tại trang, không tải lại
    var tagLink = e.target.closest("[data-tag]");
    if (tagLink) {
      e.preventDefault();
      update({ tag: tagLink.dataset.tag, category: "", page: 1 });
      return;
    }

    var switchBtn = e.target.closest("[data-switch-side]");
    if (switchBtn) {
      update({ side: switchBtn.dataset.switchSide, category: "", page: 1 });
      return;
    }

    var bookmarkBtn = e.target.closest("[data-bookmark]");
    if (bookmarkBtn) {
      var saved = KJ.bookmarks.toggle(bookmarkBtn.dataset.bookmark);
      bookmarkBtn.setAttribute("aria-pressed", String(saved));
      bookmarkBtn.title = saved ? "Bỏ đánh dấu" : "Đánh dấu bài này";
      bookmarkBtn.querySelector("i").className = "bi " + (saved ? "bi-bookmark-fill" : "bi-bookmark");
      if (state.savedOnly && !saved) render(); // đang xem bài đã lưu → bỏ lưu thì ẩn khỏi danh sách
    }
  });

  // ⌘K / Ctrl+K trên trang này focus ô tìm kiếm của feed (như gợi ý ⌘K trong ô)
  KJ.onSearchShortcut = function () {
    searchInput.focus();
    searchInput.select();
  };

  render();
  loadCategories();
})();
