/* =========================================================
   home.js — Màn 1: Home / Desk View
   Cần js/api.js + js/layout.js nạp trước.
   ========================================================= */
(function () {
  "use strict";

  var KJ = window.KJ;
  var api = KJ.api;
  var esc = KJ.escapeHtml;
  var $ = KJ.$;
  var $$ = KJ.$$;

  var featuredSlot = $("[data-featured-slot]");
  var entryGrid = $("[data-entry-grid]");
  var featuredSlug = null;
  var filter = "all";

  /* ---------- 1. Số bài mỗi mặt sổ ---------- */
  async function loadCounts() {
    try {
      var cats = await api.categories();
      var totals = { A: 0, B: 0 };
      cats.forEach(function (c) { totals[c.side] += c.count; });
      totals.all = totals.A + totals.B;
      $$("[data-side-count]").forEach(function (el) {
        var n = totals[el.dataset.sideCount];
        el.textContent = el.closest(".filter-switcher__btn") ? "(" + n + ")" : String(n);
      });
    } catch (err) {
      console.warn("[home] Không tải được số liệu:", err);
    }
  }

  /* ---------- 2. Bài nổi bật ---------- */
  function featuredHtml(post) {
    var poured = !!KJ.reacted.get(post.slug).tea;
    var saved = KJ.bookmarks.has(post.slug);
    var side = KJ.SIDES[post.side];
    return (
      '<article class="featured-entry" data-slug="' + esc(post.slug) + '">' +
        '<div class="featured-entry__content">' +
          '<div class="featured-entry__meta">' +
            '<span class="badge ' + side.badge + '">' + side.short + " · Featured " + (post.side === "A" ? "Case Study" : "Essay") + "</span>" +
            '<span class="meta-text">' + KJ.formatDate(post.date, "vi") + "</span>" +
            '<span class="meta-text">·</span>' +
            '<span class="meta-text">' + post.readMinutes + " min read</span>" +
          "</div>" +
          '<h3 class="featured-entry__title"><a href="' + KJ.articleUrl(post.slug) + '">' + esc(post.title) + "</a></h3>" +
          '<p class="featured-entry__desc">' + esc(post.excerpt) + "</p>" +
          '<div class="featured-entry__actions">' +
            '<div class="featured-entry__reactions">' +
              '<button type="button" class="reaction-btn' + (poured ? " is-active" : "") + '" data-pour-tea aria-pressed="' + poured + '"' + (poured ? " disabled" : "") + ">" +
                '<i class="bi bi-cup-hot-fill"></i> <span data-reaction-label>Pour Tea (' + post.reactions.tea + ")</span>" +
              "</button>" +
              (post.noteCount ? '<span class="meta-text"><i class="bi bi-chat-left-text"></i> ' + post.noteCount + " Marginal Note" + (post.noteCount > 1 ? "s" : "") + "</span>" : "") +
              '<span class="meta-text"><i class="bi bi-eye"></i> ' + KJ.formatCount(post.reads) + " reads</span>" +
            "</div>" +
            '<div class="featured-entry__links">' +
              '<button type="button" class="icon-btn' + (saved ? " is-active" : "") + '" data-bookmark-btn aria-pressed="' + saved + '" aria-label="Bookmark bài viết này">' +
                '<i class="bi ' + (saved ? "bi-bookmark-fill" : "bi-bookmark") + '"></i>' +
              "</button>" +
              '<a href="' + KJ.articleUrl(post.slug) + '" class="text-link">Read Full Parchment <i class="bi bi-arrow-right"></i></a>' +
            "</div>" +
          "</div>" +
        "</div>" +
        (post.cover
          ? '<figure class="featured-entry__figure"><img src="' + esc(post.cover) + '" alt="">' +
            (post.extra.coverCaption ? "<figcaption>" + esc(post.extra.coverCaption) + "</figcaption>" : "") + "</figure>"
          : "") +
        '<div class="ribbon" aria-hidden="true"><i class="bi bi-star-fill"></i> FAV</div>' +
      "</article>"
    );
  }

  async function loadFeatured() {
    try {
      var data = await api.listPosts({ featured: true, sort: "reads", perPage: 1 });
      var post = data.posts[0];
      if (!post) {
        featuredSlot.innerHTML = "";
        return;
      }
      featuredSlug = post.slug;
      featuredSlot.innerHTML = featuredHtml(post);
      bindFeatured(post);
    } catch (err) {
      featuredSlot.innerHTML = "";
      console.error(err);
    }
  }

  function bindFeatured(post) {
    var root = $(".featured-entry", featuredSlot);
    var teaBtn = $("[data-pour-tea]", root);
    teaBtn.addEventListener("click", async function () {
      if (teaBtn.disabled) return;
      teaBtn.disabled = true;
      teaBtn.setAttribute("aria-busy", "true");
      try {
        var res = await api.react(post.slug, "tea");
        KJ.reacted.mark(post.slug, "tea");
        teaBtn.classList.add("is-active");
        teaBtn.setAttribute("aria-pressed", "true");
        $("[data-reaction-label]", teaBtn).textContent = "Pour Tea (" + res.count + ")";
        KJ.toast("Đã rót cho Kiên một tách trà 🍵", { duration: 2500 });
      } catch (err) {
        teaBtn.disabled = false;
        KJ.toast("Chưa rót được trà, bạn thử lại nhé.", { kind: "error" });
      } finally {
        teaBtn.removeAttribute("aria-busy");
      }
    });

    var bookmarkBtn = $("[data-bookmark-btn]", root);
    bookmarkBtn.addEventListener("click", function () {
      var saved = KJ.bookmarks.toggle(post.slug);
      bookmarkBtn.setAttribute("aria-pressed", String(saved));
      bookmarkBtn.classList.toggle("is-active", saved);
      $("i", bookmarkBtn).className = "bi " + (saved ? "bi-bookmark-fill" : "bi-bookmark");
      KJ.toast(saved ? "Đã lưu vào sổ đánh dấu. Xem lại ở The Dual Journal." : "Đã bỏ đánh dấu.", { duration: 2200 });
    });
  }

  /* ---------- 3. Lưới bài: Side A / Side B ---------- */
  function widgetHtml(post) {
    var x = post.extra || {};
    if (x.snippet) return '<div class="code-mini">' + esc(x.snippet) + "</div>";
    if (x.metric) {
      return (
        '<div class="metric-chart">' +
          '<div class="metric-chart__text">' +
            '<p class="metric-chart__label">' + esc(x.metric.label) + "</p>" +
            '<p class="metric-chart__value">' + esc(x.metric.value) + "</p>" +
          "</div>" +
          (x.metric.chart ? '<img src="' + esc(x.metric.chart) + '" alt="" class="metric-chart__svg">' : "") +
        "</div>"
      );
    }
    if (x.quote) return '<blockquote class="excerpt excerpt--inline">"' + esc(x.quote) + '"</blockquote>';
    if (x.pullQuote) return '<p class="excerpt excerpt--quote">' + esc(x.pullQuote) + "</p>";
    return "";
  }

  function cardHtml(post) {
    var side = KJ.SIDES[post.side];
    var tagClass = post.side === "A" ? "tag" : "tag tag--pill";
    return (
      '<article class="entry-card" data-side="' + post.side + '">' +
        '<div class="entry-card__meta">' +
          '<span class="badge ' + side.badge + '">' + side.short + (post.category ? " · " + esc(post.category) : "") + "</span>" +
          '<span class="meta-text">' + KJ.formatDate(post.date, "vi") + "</span>" +
        "</div>" +
        '<h3 class="entry-card__title"><a href="' + KJ.articleUrl(post.slug) + '">' + esc(post.title) + "</a></h3>" +
        '<p class="entry-card__desc">' + esc(post.excerpt) + "</p>" +
        widgetHtml(post) +
        '<div class="entry-card__footer">' +
          '<div class="tag-list">' +
            post.tags.slice(0, 3).map(function (t) {
              return '<a class="' + tagClass + '" href="' + KJ.journalUrl({ side: post.side, tag: t }) + '">#' + esc(t) + "</a>";
            }).join("") +
          "</div>" +
          '<span class="meta-text">' + post.readMinutes + " min read</span>" +
        "</div>" +
      "</article>"
    );
  }

  var entriesToken = 0;
  async function loadEntries() {
    var token = ++entriesToken;
    entryGrid.classList.add("is-loading");
    entryGrid.setAttribute("aria-busy", "true");
    try {
      var notFeatured = function (p) { return p.slug !== featuredSlug; };
      var posts;
      if (filter === "all") {
        var both = await Promise.all([
          api.listPosts({ side: "A", perPage: 3 }),
          api.listPosts({ side: "B", perPage: 3 })
        ]);
        var a = both[0].posts.filter(notFeatured).slice(0, 2);
        var b = both[1].posts.filter(notFeatured).slice(0, 2);
        posts = [];
        for (var i = 0; i < 2; i++) {
          if (a[i]) posts.push(a[i]);
          if (b[i]) posts.push(b[i]);
        }
      } else {
        var one = await api.listPosts({ side: filter, perPage: 5 });
        posts = one.posts.filter(notFeatured).slice(0, 4);
      }
      if (token !== entriesToken) return;
      entryGrid.innerHTML = posts.length
        ? posts.map(cardHtml).join("")
        : '<div class="empty-state"><p class="empty-state__title">Trang sổ này còn trống.</p></div>';
    } catch (err) {
      if (token !== entriesToken) return;
      entryGrid.innerHTML =
        '<div class="empty-state empty-state--error"><p class="empty-state__title">Không tải được các trang nhật ký.</p>' +
        '<p class="empty-state__hint">' + esc(err.message) + "</p></div>";
    } finally {
      if (token === entriesToken) {
        entryGrid.classList.remove("is-loading");
        entryGrid.removeAttribute("aria-busy");
      }
    }
  }

  var filterSwitcher = $("[data-filter-switcher]");
  filterSwitcher.addEventListener("click", function (event) {
    var btn = event.target.closest("[data-filter]");
    if (!btn || btn.dataset.filter === filter) return;
    filter = btn.dataset.filter;
    $$("[data-filter]", filterSwitcher).forEach(function (b) {
      var on = b === btn;
      b.classList.toggle("filter-switcher__btn--active", on);
      b.setAttribute("aria-pressed", String(on));
    });
    loadEntries();
  });

  /* ---------- 4. Form "Handwritten Postcard" ---------- */
  var postcardForm = $("[data-postcard-form]");
  if (postcardForm) {
    var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    var status = $(".postcard-form__status", postcardForm);
    var counter = $("[data-char-count]", postcardForm);
    var seals = $$("[data-topic]", postcardForm);
    var topic = "AtticMusings";

    function setError(field, message) {
      var wrap = field.closest(".form-field");
      if (!wrap) return;
      wrap.classList.toggle("has-error", Boolean(message));
      field.setAttribute("aria-invalid", String(Boolean(message)));
      var el = $(".form-field__error", wrap);
      if (message) {
        if (!el) {
          el = document.createElement("p");
          el.className = "form-field__error";
          wrap.appendChild(el);
        }
        el.textContent = message;
      } else if (el) {
        el.remove();
      }
    }

    function showStatus(text, type) {
      status.textContent = text;
      status.className = "postcard-form__status form-status" + (type ? " form-status--" + type : "");
    }

    function updateCount() {
      counter.textContent = postcardForm.elements.message.value.length + " / 2000";
    }

    seals.forEach(function (seal) {
      seal.addEventListener("click", function () {
        topic = seal.dataset.topic;
        seals.forEach(function (s) { s.setAttribute("aria-checked", String(s === seal)); });
      });
    });

    postcardForm.elements.message.addEventListener("input", updateCount);

    postcardForm.addEventListener("submit", async function (event) {
      event.preventDefault();

      var message = postcardForm.elements.message;
      var name = postcardForm.elements["sender-name"];
      var email = postcardForm.elements["sender-email"];
      var ok = true;

      if (message.value.trim().length < 10) {
        setError(message, "Lời nhắn cần ít nhất 10 ký tự.");
        ok = false;
      } else {
        setError(message, "");
      }

      if (email.value.trim() && !EMAIL_RE.test(email.value.trim())) {
        setError(email, "Email chưa đúng định dạng, ví dụ: ban@domain.com");
        ok = false;
      } else {
        setError(email, "");
      }

      if (!ok) {
        var firstInvalid = $(".has-error textarea, .has-error input", postcardForm);
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      var submitBtn = $(".submit-btn", postcardForm);
      submitBtn.disabled = true;
      showStatus("Đang gửi…");

      try {
        await api.sendNote({
          message: message.value.trim(),
          name: name.value.trim(),
          email: email.value.trim(),
          topic: topic
        });
        postcardForm.reset();
        updateCount();
        if (KJ.replayClass) KJ.replayClass(postcardForm, "is-stamped");
        showStatus("Đã gửi. Cảm ơn bạn đã viết cho Kiên! Bưu thiếp sẽ được đọc cùng tách trà sáng mai.", "ok");
      } catch (err) {
        showStatus("Gửi chưa được: " + err.message, "error");
      } finally {
        submitBtn.disabled = false;
      }
    });

    updateCount();
  }

  /* ---------- 5. Desk Pinboard Notes ---------- */
  var STICKY = ["sticky-note--amber", "sticky-note--kraft", "sticky-note--sage"];

  async function loadPinboard() {
    var board = $("[data-pinboard]");
    try {
      var data = await api.listNotes({ perPage: 3 });
      if (!data.notes.length) {
        board.innerHTML = '<p class="meta-text">Chưa có lời nhắn nào được ghim.</p>';
        return;
      }
      board.innerHTML = data.notes.map(function (note, i) {
        var who = note.name + (note.location ? ", " + note.location.split(",")[0] : "");
        return (
          '<div class="sticky-note ' + STICKY[i % STICKY.length] + '">' +
            "<p>" + (i === 1 ? "" : "“") + esc(note.message) + (i === 1 ? "" : "”") + "</p>" +
            '<div class="sticky-note__footer">' +
              "<span>— " + esc(who) + "</span>" +
              "<span>" + esc(KJ.relativeDate(note.date)) + "</span>" +
            "</div>" +
          "</div>"
        );
      }).join("");
    } catch (err) {
      board.innerHTML = '<p class="meta-text">Không tải được bảng ghim: ' + esc(err.message) + "</p>";
    }
  }

  loadCounts();
  loadFeatured().then(loadEntries);
  loadPinboard();
})();
