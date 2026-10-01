/* =========================================================
   article.js — Màn 3: Article Reading
   Chuyển từ js/article.js (FE2) sang api/layout dùng chung.
   Tải bài theo ?slug= (không có slug → bài mới nhất), mục lục, tiến độ
   đọc, đọc tiếp chỗ cũ, chế độ tập trung, cỡ chữ/phông, theme, âm thanh
   nền, reaction, Whisper Note (có lưu nháp), bài trước/sau.
   ========================================================= */
(function () {
  "use strict";

  var KJ = window.KJ;
  var api = KJ.api;
  var $ = KJ.$;
  var $$ = KJ.$$;
  var store = KJ.store;
  var toast = KJ.toast;

  var WORDS_PER_MIN = 220;
  var FONT_STEPS = [15, 16, 17, 18, 20, 22, 24];
  var THEME_LABEL = { light: "Warm Cream", parchment: "Parchment", dusk: "Charcoal" };

  var params = new URLSearchParams(location.search);
  var slug = params.get("slug") || "";
  var post = null;
  var readMinutes = 0;
  var readDone = 0;
  var readingSection = "";
  var fontSize = 18;

  function showState(html) {
    var el = $("#state");
    el.removeAttribute("aria-busy");
    el.innerHTML = html;
    el.hidden = false;
    $("#article").hidden = true;
  }

  async function load() {
    try {
      if (!slug) {
        // "Article Reading" trên menu → mở bài mới nhất
        var latest = await api.listPosts({ perPage: 1 });
        if (!latest.posts.length) {
          showState('Chưa có bài viết nào trong lưu trữ. <a href="index.html">Về trang chủ</a>');
          return;
        }
        slug = latest.posts[0].slug;
        history.replaceState(null, "", "article.html?slug=" + encodeURIComponent(slug) + location.hash);
      }
      render(await api.getPost(slug));
      markRead();
    } catch (err) {
      console.error(err);
      showState(err.status === 404
        ? 'Bài viết này không còn trong lưu trữ. <a href="journal.html">Mở The Dual Journal</a>'
        : 'Không tải được bài viết. <a href="">Thử lại</a>');
    }
  }

  // Tăng lượt đọc 1 lần / phiên / bài (phục vụ "Sort: Most Read")
  function markRead() {
    var key = "kj.read." + slug;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch (e) { /* bỏ qua */ }
    api.markRead(slug).catch(function () { /* không quan trọng */ });
  }

  function countWords(html) {
    var text = String(html || "").replace(/<[^>]+>/g, " ").trim();
    return text ? text.split(/\s+/).length : 0;
  }

  function render(data) {
    post = data;
    var x = data.extra || {};
    var side = KJ.SIDES[data.side];
    readMinutes = data.readMinutes || Math.max(1, Math.round(countWords(data.content) / WORDS_PER_MIN));

    var fields = {
      title: data.title,
      excerpt: data.excerpt,
      tagline: x.tagline || data.category,
      side: side.name,
      sideUrl: KJ.journalUrl({ side: data.side }),
      categoryUrl: KJ.journalUrl({ side: data.side, category: data.category }),
      essayNo: x.essayNo,
      essayLabel: x.essayNo ? "Essay #" + String(x.essayNo).padStart(2, "0") : "",
      revision: x.revision,
      date: KJ.formatDate(data.date, "short"),
      readTime: readMinutes + " min read",
      reads: KJ.formatCount(data.reads) + " reads",
      colophon: x.colophon,
      ledger: x.ledger
    };

    document.title = data.title + " · Kiên’s Journal";
    $$("[data-field]").forEach(function (el) {
      var key = el.getAttribute("data-field");
      el.textContent = fields[key] == null ? "" : fields[key];
    });
    $$("[data-href]").forEach(function (el) { el.href = fields[el.getAttribute("data-href")]; });
    $$("[data-if]").forEach(function (el) { el.hidden = !fields[el.getAttribute("data-if")]; });
    $('[data-field="date"]').setAttribute("datetime", data.date);

    $("#post-tags").innerHTML = data.tags.map(function (t) {
      return '<a class="tag" href="' + KJ.journalUrl({ side: data.side, tag: t }) + '">#' + KJ.escapeHtml(t) + "</a>";
    }).join("");

    var prose = $("#prose");
    prose.innerHTML = data.content || "<p>Bài viết chưa có nội dung.</p>";
    enhanceProse(prose);

    // backend: prev = mới hơn, next = cũ hơn → "Previous Leaf" là bài cũ hơn, "Next Leaf" là bài mới hơn
    renderLeaf($("#leaf-prev"), data.older, "Previous Leaf");
    renderLeaf($("#leaf-next"), data.newer, "Next Leaf");
    renderReactions(data.reactions);
    initNoteForm();

    $("#state").hidden = true;
    $("#article").hidden = false;
    $("#article").classList.add("is-entering");
    buildToc(prose);
    addHeadingLinks(prose);
    updateProgress();

    if (location.hash) {
      var target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (target) { target.scrollIntoView(); return; }
    }
    offerResume();
  }

  /* ---------- Đọc tiếp chỗ cũ ---------- */
  function posKey() { return "pos." + slug; }

  function offerResume() {
    var saved = store.get(posKey(), null);
    if (!saved || saved.done < 0.05 || saved.done > 0.95) return;
    toast(saved.section ? "Bạn đang đọc dở ở mục “" + saved.section + "”." : "Bạn đã đọc được " + Math.round(saved.done * 100) + "% bài này.", {
      action: "Đọc tiếp",
      duration: 8000,
      onAction: function () { scrollToProgress(saved.done); }
    });
  }

  function scrollToProgress(done) {
    var r = $(".reader__main").getBoundingClientRect();
    var total = Math.max(r.height - innerHeight / 2, 1);
    window.scrollTo({ top: scrollY + r.top - innerHeight / 2 + done * total });
  }

  var saveTimer;
  function savePosition() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      if (readDone > 0.97) store.set(posKey(), null);
      else if (readDone > 0.02) store.set(posKey(), { done: +readDone.toFixed(4), section: readingSection, at: Date.now() });
    }, 400);
  }

  /* ---------- Liên kết tới mục ---------- */
  function headingText(h) { return h.firstChild ? h.firstChild.textContent.trim() : ""; }

  function addHeadingLinks(root) {
    $$("h2[id]", root).forEach(function (h) {
      var a = document.createElement("a");
      a.className = "heading-link";
      a.href = "#" + h.id;
      a.textContent = "#";
      a.setAttribute("aria-label", "Sao chép liên kết tới mục này");
      a.title = "Sao chép liên kết tới mục này";
      a.addEventListener("click", function (e) {
        e.preventDefault();
        history.replaceState(null, "", "#" + h.id);
        copyText(location.href).then(
          function () { toast("Đã sao chép liên kết tới mục “" + headingText(h) + "”."); },
          function () { toast("Không sao chép được — bạn có thể lấy liên kết trên thanh địa chỉ.", { kind: "error" }); }
        );
      });
      h.appendChild(a);
    });
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) { /* bỏ qua */ }
      ta.remove();
      if (ok) resolve(); else reject(new Error("copy failed"));
    });
  }

  function renderLeaf(el, leaf, label) {
    el.hidden = !leaf;
    if (!leaf) return;
    el.href = KJ.articleUrl(leaf.slug);
    $('[data-leaf="label"]', el).textContent = label;
    $('[data-leaf="title"]', el).textContent = leaf.title;
    $('[data-leaf="meta"]', el).textContent = [leaf.side && KJ.SIDES[leaf.side].name, leaf.readMinutes && leaf.readMinutes + " min read"].filter(Boolean).join(" · ");
  }

  /* ---------- Nâng cấp nội dung bài ---------- */
  function enhanceProse(root) {
    $$("pre", root).forEach(function (pre) {
      var wrap = document.createElement("div");
      wrap.className = "code-block";
      var bar = document.createElement("div");
      bar.className = "code-block__bar";
      var left = document.createElement("span");
      left.className = "code-block__dots";
      left.innerHTML = "<i></i><i></i><i></i>";
      if (pre.dataset.file) {
        var file = document.createElement("span");
        file.className = "code-block__file";
        file.textContent = pre.dataset.file;
        left.appendChild(file);
      }
      var right = document.createElement("span");
      right.className = "code-block__meta";
      right.textContent = pre.dataset.meta || pre.dataset.lang || "";
      var copy = document.createElement("button");
      copy.type = "button";
      copy.className = "code-block__copy";
      copy.innerHTML = '<i class="bi bi-clipboard"></i> Copy';
      copy.addEventListener("click", function () {
        copyText(pre.innerText).then(
          function () { toast("Đã sao chép đoạn code.", { duration: 1800 }); },
          function () { toast("Không sao chép được.", { kind: "error" }); }
        );
      });
      right.appendChild(document.createTextNode(" "));
      right.appendChild(copy);
      bar.append(left, right);
      pre.parentNode.insertBefore(wrap, pre);
      wrap.append(bar, pre);
    });

    $$("img", root).forEach(function (img) {
      var fig = img.closest("figure");
      if (fig) fig.classList.add("photo");
      var frame = document.createElement("div");
      frame.className = "photo__frame";
      frame.setAttribute("data-alt", img.alt || "Không tải được ảnh");
      img.parentNode.insertBefore(frame, img);
      frame.appendChild(img);
      img.loading = "lazy";
      if (fig && fig.dataset.coords) {
        var c = document.createElement("span");
        c.className = "photo__coords";
        c.textContent = fig.dataset.coords;
        frame.appendChild(c);
      }
      img.addEventListener("error", function () {
        frame.classList.add("is-broken");
        img.remove();
      });
    });

    $$('a[href^="http"]', root).forEach(function (a) { a.target = "_blank"; a.rel = "noopener"; });
  }

  function slugify(text) {
    return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "muc";
  }

  function readingLine() {
    return (parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 0) + 40;
  }

  /* ---------- Mục lục ---------- */
  function buildToc(root) {
    var list = $("#toc-list");
    var headings = $$("h2", root);
    list.innerHTML = "";
    $("#toc").hidden = headings.length === 0;
    if (!headings.length) return;

    var words = 0;
    var used = {};
    var marks = new Map();
    Array.prototype.forEach.call(root.children, function (el) {
      if (el.tagName === "H2") marks.set(el, words);
      words += countWords(el.textContent);
    });

    var links = headings.map(function (h) {
      var id = h.id || slugify(h.textContent);
      while (used[id] || (!h.id && document.getElementById(id))) id += "-2";
      used[id] = true;
      h.id = id;

      var a = document.createElement("a");
      a.className = "toc__link";
      a.href = "#" + id;
      var text = document.createElement("span");
      text.className = "toc__text";
      text.textContent = headingText(h);
      text.title = text.textContent;
      var time = document.createElement("span");
      time.className = "toc__time";
      time.textContent = String(Math.max(1, Math.round(marks.get(h) / WORDS_PER_MIN) + 1)).padStart(2, "0") + "m";
      a.append(text, time);
      a.addEventListener("click", function (e) {
        e.preventDefault();
        h.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
        history.replaceState(null, "", "#" + id);
      });
      var li = document.createElement("li");
      li.appendChild(a);
      list.appendChild(li);
      return a;
    });

    var current = -1;
    function syncActive() {
      var line = readingLine();
      var idx = -1;
      headings.forEach(function (h, i) { if (h.getBoundingClientRect().top <= line) idx = i; });
      if (idx === current) return;
      current = idx;
      readingSection = idx >= 0 ? headingText(headings[idx]) : "";
      links.forEach(function (a, i) { a.classList.toggle("is-active", i === idx); });
      if (links[idx]) links[idx].scrollIntoView({ block: "nearest" });
    }
    onScroll(syncActive);
    syncActive();
  }

  var scrollHandlers = [];
  var ticking = false;
  function onScroll(fn) { scrollHandlers.push(fn); }
  window.addEventListener("scroll", function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      scrollHandlers.forEach(function (fn) { fn(); });
    });
  }, { passive: true });

  function updateProgress() {
    var main = $(".reader__main");
    if (!main || $("#article").hidden) return;
    var r = main.getBoundingClientRect();
    var total = r.height - innerHeight / 2;
    var done = Math.min(1, Math.max(0, (innerHeight / 2 - r.top) / Math.max(total, 1)));
    readDone = done;
    $("#progress-bar").style.height = (done * 100).toFixed(2) + "%";

    var leftText = done >= 0.98 ? "Đã đọc xong" : "Còn ~" + Math.max(1, Math.ceil(readMinutes * (1 - done))) + " phút";
    $("#time-left").textContent = leftText;
    $("#to-top-label").textContent = leftText;
    $("#to-top-ring").style.strokeDashoffset = (125.66 * (1 - done)).toFixed(2);
    $("#to-top").hidden = scrollY < innerHeight * 0.8;
    savePosition();
  }
  onScroll(updateProgress);
  window.addEventListener("resize", updateProgress);

  /* ---------- Bàn đọc: theme, cỡ chữ, phông ---------- */
  function paintTheme(name) {
    $$(".swatch").forEach(function (b) { b.setAttribute("aria-checked", String(b.dataset.themeChoice === name)); });
    $("#theme-label").textContent = THEME_LABEL[name] || THEME_LABEL.light;
  }

  function applyFontSize(size) {
    var i = FONT_STEPS.indexOf(size);
    if (i < 0) { size = 18; i = FONT_STEPS.indexOf(18); }
    fontSize = size;
    document.body.style.setProperty("--prose-size", size + "px");
    $("#font-down").disabled = i === 0;
    $("#font-up").disabled = i === FONT_STEPS.length - 1;
    store.set("fontSize", size);
  }

  function applyFontFamily(kind) {
    if (kind !== "serif") kind = "sans";
    document.body.classList.toggle("font-serif", kind === "serif");
    document.body.classList.toggle("font-sans", kind === "sans");
    $$(".segmented__btn").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.font === kind)); });
    store.set("fontFamily", kind);
  }

  function stepFont(dir) {
    var i = FONT_STEPS.indexOf(fontSize) + dir;
    if (i >= 0 && i < FONT_STEPS.length) applyFontSize(FONT_STEPS[i]);
  }

  function cycleTheme() {
    var names = Object.keys(THEME_LABEL);
    var next = names[(names.indexOf(KJ.getTheme()) + 1) % names.length];
    KJ.setTheme(next);
    toast("Nền: " + THEME_LABEL[next], { duration: 1500 });
  }

  function setFocus(on) {
    if (on === document.body.classList.contains("is-focus")) return;
    var keep = readDone; // giữ chỗ đang đọc khi layout đổi
    var apply = function () {
      document.body.classList.toggle("is-focus", on);
      $("#focus-toggle").setAttribute("aria-pressed", String(on));
      if (!$("#article").hidden) scrollToProgress(keep);
    };
    // Chuyển cảnh mượt khi ẩn/hiện header, cột công cụ (css/motion.css + View Transitions)
    if (KJ.withTransition) KJ.withTransition(apply);
    else apply();
    if (on) toast("Chế độ tập trung — nhấn Esc để thoát.", { duration: 2500 });
  }

  function onShortcut(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var t = e.target;
    if (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
    if (document.querySelector("dialog[open]")) return;
    switch (e.key) {
      case "f": case "F": setFocus(!document.body.classList.contains("is-focus")); break;
      case "Escape":
        if (!document.body.classList.contains("is-focus")) return;
        setFocus(false);
        break;
      case "+": case "=": stepFont(1); break;
      case "-": case "_": stepFont(-1); break;
      case "t": case "T": cycleTheme(); break;
      case "m": case "M": KJ.ambience.toggle(); break;
      default: return;
    }
    e.preventDefault();
  }

  function initDesk() {
    paintTheme(KJ.getTheme());
    document.addEventListener("kj:theme", function (e) { paintTheme(e.detail.theme); });
    applyFontSize(store.get("fontSize", 18));
    applyFontFamily(store.get("fontFamily", "sans"));
    $$(".swatch").forEach(function (b) { b.addEventListener("click", function () { KJ.setTheme(b.dataset.themeChoice); }); });
    $$(".segmented__btn").forEach(function (b) { b.addEventListener("click", function () { applyFontFamily(b.dataset.font); }); });
    $("#font-down").addEventListener("click", function () { stepFont(-1); });
    $("#font-up").addEventListener("click", function () { stepFont(1); });
    $("#focus-toggle").addEventListener("click", function () { setFocus(true); });
    $("#focus-exit").addEventListener("click", function () { setFocus(false); });
    $("#to-top").addEventListener("click", function () { window.scrollTo({ top: 0 }); });
    document.addEventListener("keydown", onShortcut);

    // Trình phát "Rain on Zinc Roof" dùng chung âm thanh nền với status bar
    document.addEventListener("kj:ambience", function (e) {
      var playing = e.detail.playing;
      $("#player").classList.toggle("is-playing", playing);
      $("#player .player__btn").setAttribute("aria-label", playing ? "Tạm dừng âm thanh nền" : "Phát âm thanh nền");
      $("#audio-status").textContent = "Hanoi Soundscape · " + (playing ? "Đang phát" : "Tạm dừng");
    });
  }

  /* ---------- Reaction ---------- */
  function renderReactions(counts) {
    var reacted = KJ.reacted.get(slug);
    $$(".reaction").forEach(function (btn) {
      var type = btn.dataset.reaction;
      $(".reaction__count", btn).textContent = counts[type] || 0;
      var done = !!reacted[type];
      btn.setAttribute("aria-pressed", String(done));
      btn.disabled = done;
    });
  }

  function initReactions() {
    $("#reactions").addEventListener("click", async function (e) {
      var btn = e.target.closest(".reaction");
      if (!btn || btn.disabled || !post) return;
      var type = btn.dataset.reaction;
      btn.disabled = true;
      btn.setAttribute("aria-busy", "true");
      try {
        var res = await api.react(slug, type);
        KJ.reacted.mark(slug, type);
        post.reactions[type] = res.count;
        renderReactions(post.reactions);
        btn.classList.remove("is-bump");
        void btn.offsetWidth;
        btn.classList.add("is-bump");
        toast("Cảm ơn bạn đã để lại " + btn.firstElementChild.textContent + ".", { duration: 2500 });
      } catch (err) {
        console.error(err);
        btn.disabled = false;
        toast("Chưa ghi nhận được, bạn thử lại nhé.", { kind: "error" });
      } finally {
        btn.removeAttribute("aria-busy");
      }
    });
  }

  /* ---------- Whisper Note ---------- */
  var noteFormReady = false;
  function initNoteForm() {
    if (noteFormReady) return;
    noteFormReady = true;

    var form = $("#note-form");
    var status = $("#note-status");
    var submit = $('button[type="submit"]', form);
    var counter = $("#char-count");
    var draftHint = $("#draft-hint");
    var max = form.message.maxLength;
    var draftKey = "draft." + slug;
    var draftTimer;

    function setStatus(text, kind) {
      status.textContent = text;
      status.className = "form-status" + (kind ? " form-status--" + kind : "");
    }

    function updateCount() {
      var n = form.message.value.length;
      counter.textContent = n + " / " + max;
      counter.classList.toggle("is-near", n > max * 0.9);
    }

    var draft = store.get(draftKey, null);
    if (draft) {
      form.message.value = draft.message || "";
      form.elements.name.value = draft.name || "";
      form.email.value = draft.email || "";
      draftHint.textContent = "Đã khôi phục bản nháp chưa gửi";
    }
    updateCount();

    form.addEventListener("input", function (e) {
      e.target.removeAttribute("aria-invalid");
      if (status.classList.contains("form-status--error")) setStatus("");
      updateCount();
      clearTimeout(draftTimer);
      draftTimer = setTimeout(function () {
        var d = { message: form.message.value, name: form.elements.name.value, email: form.email.value };
        var has = d.message || d.name || d.email;
        store.set(draftKey, has ? d : null);
        draftHint.textContent = has ? "Đã lưu nháp" : "";
      }, 500);
    });

    form.message.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        form.requestSubmit();
      }
    });

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      var message = form.message.value.trim();
      var name = form.elements.name.value.trim();
      var email = form.email.value.trim();

      if (!message) {
        form.message.setAttribute("aria-invalid", "true");
        form.message.focus();
        return setStatus("Bạn chưa viết gì trong lá thư.", "error");
      }
      if (email && !form.email.checkValidity()) {
        form.email.setAttribute("aria-invalid", "true");
        form.email.focus();
        return setStatus("Email chưa đúng định dạng.", "error");
      }

      submit.disabled = true;
      setStatus("Đang gửi…");
      try {
        await api.sendNote({
          message: message,
          name: name,
          email: email,
          topic: post && post.side === "A" ? "EngineeringSolitude" : "AtticMusings",
          postSlug: slug
        });
        form.reset();
        clearTimeout(draftTimer);
        store.set(draftKey, null);
        draftHint.textContent = "";
        updateCount();
        setStatus("Đã gửi! Kiên sẽ đọc lá thư của bạn vào một buổi sáng sớm.", "ok");
      } catch (err) {
        console.error(err);
        setStatus("Gửi chưa được: " + err.message, "error");
      } finally {
        submit.disabled = false;
      }
    });
  }

  initDesk();
  initReactions();
  load();
})();
