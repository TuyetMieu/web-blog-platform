/* =========================================================
   about.js — Màn 6: About & Now
   Dữ liệu từ GET /api/about (backend) hoặc data/site-content.js (offline).
   ========================================================= */
(function () {
  "use strict";

  var KJ = window.KJ;
  var api = KJ.api;
  var esc = KJ.escapeHtml;
  var $ = KJ.$;

  function slot(name) { return $('[data-about="' + name + '"]'); }

  function asList(value) { return Array.isArray(value) ? value : value ? [value] : []; }

  function render(about) {
    document.title = "About & Now — " + (about.name || "Kiên") + "'s Journal";
    if (about.portrait) slot("portrait").src = about.portrait;
    slot("name").textContent = about.name || "Kiên";
    slot("role").textContent = about.role || "";
    slot("location").textContent = about.location || "";
    slot("intro").textContent = about.intro || "";
    slot("bio").innerHTML = asList(about.bio).map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("");

    slot("links").innerHTML = asList(about.links).map(function (l) {
      var external = /^https?:/.test(l.href);
      var rss = l.href === "/api/rss";
      return '<a class="pill-btn" href="' + esc(l.href) + '"' + (external ? ' target="_blank" rel="noopener"' : "") + (rss ? " data-rss-link" : "") + ">" +
        (l.icon ? '<i class="bi ' + esc(l.icon) + '"></i>' : "") + esc(l.label) + "</a>";
    }).join("");

    // /now — hỗ trợ cả dạng cũ của backend (mảng chuỗi) lẫn dạng mới { updated, items[] }
    var now = Array.isArray(about.now) ? { items: about.now } : about.now || { items: [] };
    slot("nowUpdated").textContent = now.updated ? "Cập nhật " + KJ.formatDate(now.updated, "vi") : "";
    slot("now").innerHTML = asList(now.items).map(function (item) {
      if (typeof item === "string") item = { icon: "bi-dot", label: "Now", text: item };
      return '<article class="now-card">' +
        '<span class="now-card__label"><i class="bi ' + esc(item.icon || "bi-dot") + '"></i>' + esc(item.label) + "</span>" +
        '<p class="now-card__text">' + esc(item.text) + "</p>" +
      "</article>";
    }).join("");

    slot("gear").innerHTML = asList(about.gear).map(function (g) {
      return '<li class="gear"><i class="bi ' + esc(g.icon || "bi-tools") + '"></i><div>' +
        '<p class="gear__name">' + esc(g.name) + "</p>" +
        '<p class="gear__detail">' + esc(g.detail) + "</p></div></li>";
    }).join("");

    slot("timeline").innerHTML = asList(about.timeline).map(function (t) {
      return '<li class="timeline__item">' +
        '<p class="timeline__year">' + esc(t.year) + "</p>" +
        '<p class="timeline__title">' + esc(t.title) + "</p>" +
        '<p class="timeline__text">' + esc(t.text) + "</p></li>";
    }).join("");
    slot("timeline").closest(".about-timeline").hidden = !asList(about.timeline).length;

    slot("gallery").innerHTML = asList(about.gallery).map(function (g) {
      if (typeof g === "string") g = { src: g, caption: "" };
      return '<figure class="gallery__item"><img src="' + esc(g.src) + '" alt="' + esc(g.caption) + '" loading="lazy">' +
        (g.caption ? "<figcaption>" + esc(g.caption) + "</figcaption>" : "") + "</figure>";
    }).join("");
    slot("gallery").closest(".about-gallery").hidden = !asList(about.gallery).length;

    slot("colophon").innerHTML = asList(about.colophon).map(function (c) {
      return '<div class="colophon__row"><dt>' + esc(c.label) + "</dt><dd>" + esc(c.value) + "</dd></div>";
    }).join("");

    var tip = about.tipJar || {};
    slot("tipText").textContent = tip.text || "Nếu một bài viết từng ở bên bạn, bạn có thể mời Kiên một tách cà phê.";
    slot("tipMethods").innerHTML = asList(tip.methods).map(function (m) {
      return '<li class="tip-jar__method"><span>' + esc(m.label) + "</span><span>" + esc(m.value) + "</span></li>";
    }).join("");

    // Nhảy tới #colophon / #tip-jar sau khi nội dung đã có chiều cao thật
    if (location.hash) {
      var target = document.getElementById(location.hash.slice(1));
      if (target) target.scrollIntoView();
    }
  }

  async function loadStats() {
    try {
      var results = await Promise.all([api.categories(), api.listNotes({ perPage: 1 })]);
      var totals = { A: 0, B: 0 };
      results[0].forEach(function (c) { totals[c.side] += c.count; });
      $('[data-stat="posts"]').textContent = totals.A + totals.B;
      $('[data-stat="sideA"]').textContent = totals.A;
      $('[data-stat="sideB"]').textContent = totals.B;
      $('[data-stat="notes"]').textContent = results[1].total;
    } catch (err) {
      console.warn("[about] Không tải được số liệu:", err);
    }
  }

  (async function init() {
    var root = $("#about-root");
    try {
      render(await api.about());
    } catch (err) {
      slot("bio").innerHTML = '<p class="form-status form-status--error">Không tải được phần giới thiệu: ' + esc(err.message) + "</p>";
    } finally {
      root.removeAttribute("aria-busy");
    }
    loadStats();
  })();
})();
