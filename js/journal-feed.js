/**
 * journal-feed.js — wires the static Màn 5 (Journal Feed) markup to real
 * data via api.js (getPosts / sendReaction). Depends on api.js being
 * loaded first.
 */
(function () {
  const state = {
    side: "a",
    category: "",
    search: "",
    page: 1,
    pageSize: 4,
    sort: "chronological",
    savedOnly: false,
  };

  const BOOKMARKS_KEY = "kj_bookmarked_slugs";

  const resultsEl = document.getElementById("feed-results");
  const pageLabelEl = document.getElementById("feed-page-label");
  const rangeLabelEl = document.getElementById("feed-range-label");
  const prevBtn = document.getElementById("feed-prev-page");
  const nextBtn = document.getElementById("feed-next-page");
  const searchInput = document.getElementById("feed-search-input");
  const headerSearchInput = document.getElementById("header-search-input");
  const sortToggle = document.getElementById("feed-sort-toggle");
  const sortLabel = document.getElementById("feed-sort-label");
  const sideA = document.getElementById("side-toggle-a");
  const sideB = document.getElementById("side-toggle-b");
  const bookmarksToggle = document.getElementById("feed-bookmarks-toggle");
  const categoryPills = Array.from(document.querySelectorAll("#feed-category-pills button"));
  const totalFragmentsEl = document.getElementById("feed-total-fragments");

  // The eyebrow ("N FRAGMENTS WRITTEN") and each category pill's count
  // were hardcoded fake numbers (124, 38, 22...) left over from the Figma
  // mock — they don't match the real 8-post sample dataset. Replace them
  // with real counts, computed once from getPosts() (independent of the
  // current Side/search filters, same as the original design intent).
  async function loadCounts() {
    let all, perCategory;
    try {
      [all, ...perCategory] = await Promise.all([
        getPosts({ pageSize: 1 }),
        ...categoryPills.filter((p) => p.dataset.category).map((p) => getPosts({ category: p.dataset.category, pageSize: 1 })),
      ]);
    } catch {
      // Both the real backend AND the sample-data fallback failed (e.g. the
      // static file itself is unreachable) — leave the eyebrow/pill labels
      // as they were rather than throwing an unhandled rejection; render()
      // already shows a visible error for this same failure.
      return;
    }

    totalFragmentsEl.textContent = `${all.total} FRAGMENTS WRITTEN`;

    let i = 0;
    categoryPills.forEach((pill) => {
      const label = pill.querySelector("div");
      if (!label) return;
      const count = pill.dataset.category ? perCategory[i++].total : all.total;
      label.textContent = `${pill.dataset.label} (${count})`;
    });
  }

  function getBookmarks() {
    try {
      return new Set(JSON.parse(localStorage.getItem(BOOKMARKS_KEY)) || []);
    } catch {
      return new Set();
    }
  }
  function isBookmarked(slug) {
    return getBookmarks().has(slug);
  }
  function toggleBookmark(slug) {
    const set = getBookmarks();
    if (set.has(slug)) set.delete(slug);
    else set.add(slug);
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(Array.from(set)));
    return set.has(slug);
  }

  // escapeHtml() and formatDate() are defined once in api.js (loaded before
  // this file) and used here as globals.

  function featuredCardHtml(post) {
    const takeaways = post.takeaways || [];
    const marginIcons = ["margin1.svg", "margin2.svg", "margin3.svg"];
    return `
      <div class="article-featured-technical-paper-card">
        <div class="overlay"></div>
        <div class="container18">
          <div class="container19">
            <div class="container20">
              <div class="overlay2"><div class="text12">Featured Case Study</div></div>
              <div class="background4"><div class="text13">${escapeHtml(post.level || post.category)}</div></div>
              <div class="container3"><div class="text14">•</div></div>
              <div class="container3"><div class="text15">Archived ${formatDate(post.date)}</div></div>
              <div class="container3"><div class="text14">•</div></div>
              <div class="container21">
                <img class="container22" src="assets/journal-feed/container29.svg" alt="" />
                <div class="text15">${escapeHtml(post.readTime)} min read</div>
              </div>
            </div>
            <div class="heading-2"><div>${escapeHtml(post.title)}</div></div>
            <div class="kj-card-excerpt">${escapeHtml(post.excerpt)}</div>
            ${takeaways.length ? `
            <div class="technical-summary-key-takeaways-box">
              <div class="container23">
                <img class="container24" src="assets/journal-feed/container32.svg" alt="" />
                <div class="container3"><div class="text16">Core Architecture Takeaways</div></div>
              </div>
              <div class="list">
                ${takeaways.map((t, i) => `
                <div class="item">
                  <img class="margin2" src="assets/journal-feed/${marginIcons[i % marginIcons.length]}" alt="" />
                  <div class="text17">${escapeHtml(t)}</div>
                </div>`).join("")}
              </div>
            </div>` : ""}
            <div class="tags-and-cta">
              <div class="container14">
                ${post.tags.map((t) => `<div class="background5"><div class="text18">#${escapeHtml(t)}</div></div>`).join("")}
              </div>
              <button type="button" class="button6" data-action="react" data-slug="${escapeHtml(post.slug)}" data-type="endorse">
                <div class="button-shadow"></div>
                <div class="container16"><div class="text19">Read Field Report</div></div>
                <img class="container25" src="assets/journal-feed/container36.svg" alt="" />
              </button>
            </div>
          </div>
          ${post.code ? `
          <div class="code-benchmark-snippet-panel">
            <div class="code-benchmark-snippet-panel-shadow"></div>
            <div class="margin5">
              <div class="horizontal-border">
                <div class="container26">
                  <div class="background6"></div><div class="background7"></div><div class="background8"></div>
                  <div class="margin6"><div class="text20">${escapeHtml(post.code.filename)}</div></div>
                </div>
                <div class="background9"><div class="text21">${escapeHtml(post.code.meta)}</div></div>
              </div>
            </div>
            <div class="pre"><div class="code"><div class="text22" style="white-space:pre-wrap;width:auto;height:auto;">${escapeHtml(post.code.content)}</div></div></div>
            <div class="margin7">
              <div class="horizontal-border2">
                <div class="container27">
                  <img class="container28" src="assets/journal-feed/container39.svg" alt="" />
                  <div class="text25">${escapeHtml(post.code.throughput)}</div>
                </div>
                <div class="container3"><div class="text26">SIMD Vectorized</div></div>
              </div>
            </div>
          </div>` : ""}
        </div>
      </div>`;
  }

  function cardHtml(post) {
    const bookmarked = isBookmarked(post.slug);
    return `
      <div class="article-card-1">
        <div class="container29">
          <div class="container30">
            <div class="container3"><div class="text27">${escapeHtml(post.code || post.category)}</div></div>
            <div class="container21">
              <img class="container31" src="assets/journal-feed/container45.svg" alt="" />
              <div class="text15">${escapeHtml(post.readTime)} min</div>
            </div>
          </div>
          <div class="heading-3"><div>${escapeHtml(post.title)}</div></div>
          <div class="container32"><div>${escapeHtml(post.excerpt)}</div></div>
        </div>
        <div class="horizontal-border3">
          <div class="container3"><div class="text28">${post.tags.map((t) => "#" + escapeHtml(t)).join(" ")}</div></div>
          <button
            type="button"
            class="button-bookmark${bookmarked ? " is-bookmarked" : ""}"
            data-action="bookmark"
            data-slug="${escapeHtml(post.slug)}"
            aria-pressed="${bookmarked}"
            title="${bookmarked ? "Remove bookmark" : "Bookmark this entry"}"
          >
            <img class="container33" src="assets/journal-feed/container48.svg" alt="" />
          </button>
        </div>
      </div>`;
  }

  function emptyStateHtml() {
    const hint = state.savedOnly
      ? "Bạn chưa bookmark bài nào (bấm icon 🔖 trên 1 bài để lưu), hoặc bộ lọc hiện tại không khớp bài đã lưu."
      : "Thử đổi Side, bỏ bớt bộ lọc theo chủ đề, hoặc xóa từ khóa tìm kiếm.";
    return `
      <div style="width:100%;text-align:center;padding:56px 24px;background:#ffffff;border-radius:12px;">
        <p style="font-family:'Geist-Regular',sans-serif;font-size:15px;color:#7c6f5f;margin-bottom:6px;">
          Không tìm thấy bài viết phù hợp.
        </p>
        <p style="font-family:'Geist-Regular',sans-serif;font-size:13px;color:#a89a86;">
          ${hint}
        </p>
      </div>`;
  }

  function setBookmarksToggleActive() {
    bookmarksToggle.classList.toggle("feed-bookmarks-toggle-active", state.savedOnly);
    bookmarksToggle.setAttribute("aria-pressed", String(state.savedOnly));
  }

  function setSideActive() {
    const isA = state.side === "a";
    sideA.classList.toggle("side-toggle-is-active", isA);
    sideA.classList.toggle("side-toggle-is-inactive", !isA);
    sideA.setAttribute("aria-pressed", String(isA));
    sideB.classList.toggle("side-toggle-is-active", !isA);
    sideB.classList.toggle("side-toggle-is-inactive", isA);
    sideB.setAttribute("aria-pressed", String(!isA));
  }

  function setCategoryActive() {
    categoryPills.forEach((pill) => {
      const isActive = pill.dataset.category === state.category;
      pill.className = isActive ? "button4" : "button5";
      pill.setAttribute("aria-pressed", String(isActive));
      const label = pill.querySelector("div");
      if (label) label.className = isActive ? "text11" : "text10";
    });
  }

  // Bumped on every render() call so an older in-flight request (e.g. the
  // getPosts() call kicked off by a keystroke before the user hit backspace
  // and retyped) can recognize it's been superseded and quietly drop its
  // response instead of overwriting a newer, already-rendered result.
  let renderToken = 0;
  let loadingTimer;

  async function render() {
    const token = ++renderToken;
    resultsEl.setAttribute("aria-busy", "true");
    // Only show the "loading" dimmed state if the fetch is slow enough to
    // notice (sample-data reads resolve near-instantly; a real backend
    // over the network won't) — avoids a pointless flash on every keystroke.
    clearTimeout(loadingTimer);
    loadingTimer = setTimeout(() => {
      if (token === renderToken) resultsEl.classList.add("feed-results-loading");
    }, 200);

    let data;
    try {
      if (state.savedOnly) {
        // Bookmarks are a per-browser concept the API knows nothing about,
        // so fetch every matching post first, filter by the local bookmark
        // set, then paginate ourselves the same way getPosts() would.
        const all = await getPosts({ ...state, page: 1, pageSize: 100000 });
        if (token !== renderToken) return; // a newer render() has since started
        const bookmarks = getBookmarks();
        const filtered = all.posts.filter((p) => bookmarks.has(p.slug));
        const { items, total, page, pageSize, totalPages } = _paginate(filtered, state.page, state.pageSize);
        state.page = page;
        data = { posts: items, total, page, pageSize, totalPages };
      } else {
        data = await getPosts(state);
        if (token !== renderToken) return; // a newer render() has since started
      }
    } catch (err) {
      if (token !== renderToken) return;
      clearTimeout(loadingTimer);
      resultsEl.classList.remove("feed-results-loading");
      resultsEl.innerHTML = `<div style="padding:24px;color:#954413;">Đã có lỗi khi tải bài viết: ${escapeHtml(err.message)}</div>`;
      resultsEl.removeAttribute("aria-busy");
      return;
    }

    clearTimeout(loadingTimer);
    resultsEl.classList.remove("feed-results-loading");

    const { posts, total, page, totalPages } = data;

    if (posts.length === 0) {
      resultsEl.innerHTML = emptyStateHtml();
    } else {
      const featured = posts.find((p) => p.featured);
      const rest = posts.filter((p) => p !== featured);
      resultsEl.innerHTML =
        (featured ? featuredCardHtml(featured) : "") +
        (rest.length ? `<div class="secondary-engineering-grid">${rest.map(cardHtml).join("")}</div>` : "");
    }

    const startIdx = total === 0 ? 0 : (page - 1) * state.pageSize + 1;
    const endIdx = Math.min(page * state.pageSize, total);
    pageLabelEl.textContent = `Page ${page} of ${totalPages}`;
    rangeLabelEl.textContent = `Showing entries ${startIdx}–${endIdx} of ${total} reflections`;
    prevBtn.disabled = page <= 1;
    nextBtn.disabled = page >= totalPages;

    resultsEl.removeAttribute("aria-busy");
  }

  // Both the filter bar's own search box (#feed-search-input) and the
  // shared header's search box (#header-search-input, top-right of every
  // page) drive the same search state — typing in either one filters the
  // feed and keeps the other box's value in sync.
  let searchDebounce;
  function handleSearchInput(sourceInput, otherInput) {
    if (otherInput) otherInput.value = sourceInput.value;
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      state.search = sourceInput.value.trim();
      state.page = 1;
      render();
    }, 300);
  }
  searchInput.addEventListener("input", () => handleSearchInput(searchInput, headerSearchInput));
  if (headerSearchInput) {
    headerSearchInput.addEventListener("input", () => handleSearchInput(headerSearchInput, searchInput));
  }

  sideA.addEventListener("click", () => {
    if (state.side === "a") return;
    state.side = "a";
    state.page = 1;
    setSideActive();
    render();
  });
  sideB.addEventListener("click", () => {
    if (state.side === "b") return;
    state.side = "b";
    state.page = 1;
    setSideActive();
    render();
  });

  categoryPills.forEach((pill) => {
    pill.addEventListener("click", () => {
      const cat = pill.dataset.category;
      if (state.category === cat) return;
      state.category = cat;
      state.page = 1;
      setCategoryActive();
      render();
    });
  });

  sortToggle.addEventListener("click", () => {
    state.sort = state.sort === "chronological" ? "reads" : "chronological";
    sortLabel.textContent = state.sort === "chronological" ? "Sort: Chronological" : "Sort: Most Read";
    render();
  });

  prevBtn.addEventListener("click", () => {
    if (state.page <= 1) return;
    state.page -= 1;
    render();
  });
  nextBtn.addEventListener("click", () => {
    state.page += 1;
    render();
  });

  bookmarksToggle.addEventListener("click", () => {
    state.savedOnly = !state.savedOnly;
    state.page = 1;
    setBookmarksToggleActive();
    render();
  });

  resultsEl.addEventListener("click", async (e) => {
    const reactBtn = e.target.closest('[data-action="react"]');
    if (reactBtn) {
      reactBtn.disabled = true;
      try {
        await sendReaction(reactBtn.dataset.slug, reactBtn.dataset.type);
      } finally {
        reactBtn.disabled = false;
      }
      return;
    }

    const bookmarkBtn = e.target.closest('[data-action="bookmark"]');
    if (bookmarkBtn) {
      const nowBookmarked = toggleBookmark(bookmarkBtn.dataset.slug);
      bookmarkBtn.classList.toggle("is-bookmarked", nowBookmarked);
      bookmarkBtn.setAttribute("aria-pressed", String(nowBookmarked));
      bookmarkBtn.title = nowBookmarked ? "Remove bookmark" : "Bookmark this entry";
      sendReaction(bookmarkBtn.dataset.slug, "save");
      // Un-bookmarking while viewing "saved only" should drop it from view.
      if (state.savedOnly && !nowBookmarked) render();
    }
  });

  // Cmd/Ctrl+K focuses the search box, matching the "⌘K" hint next to it.
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
    }
  });

  setSideActive();
  setCategoryActive();
  setBookmarksToggleActive();
  render();
  loadCounts();
})();
