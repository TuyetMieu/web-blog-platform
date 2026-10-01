/* =========================================================
   boot.js — chạy sớm trong <head>, TRƯỚC khi trang hiển thị lần đầu
   - Áp theme đã lưu (tránh nháy màu).
   - Đánh dấu trình duyệt có View Transitions giữa các trang (html.vt / html.no-vt).
   - Chọn chiều trượt khi chuyển trang: tiến (sang phải trong menu) hay lùi.
     Thứ tự theo menu: Home → Journal → Article → Whisper Box → About.
   ========================================================= */
(function () {
  "use strict";

  var root = document.documentElement;
  var ORDER = ["index", "journal", "article", "whisper-box", "about"];

  try {
    var theme = JSON.parse(localStorage.getItem("kj.theme"));
    if (theme) root.dataset.theme = theme;
  } catch (e) { /* bỏ qua */ }

  root.classList.add("CSSViewTransitionRule" in window ? "vt" : "no-vt");

  function pageIndex(url) {
    var name = new URL(url, location.href).pathname.split("/").pop().replace(/\.html$/, "") || "index";
    return ORDER.indexOf(name);
  }

  // Gợi ý chiều do motion.js ghi lại khi bấm link (vd. "Previous Leaf" = lùi)
  function takeHint() {
    try {
      var hint = JSON.parse(sessionStorage.getItem("kj.navdir"));
      sessionStorage.removeItem("kj.navdir");
      if (hint && Date.now() - hint.at < 5000 && hint.to === location.pathname + location.search) return hint.dir;
    } catch (e) { /* bỏ qua */ }
    return null;
  }

  function resolveDirection() {
    var dir = takeHint();
    if (dir) return dir;
    // Không bấm link (nút Back/Forward, gõ URL...) → so vị trí trang cũ/mới trong menu
    var activation = window.navigation && window.navigation.activation;
    var from = activation && activation.from && activation.from.url;
    if (from) {
      var a = pageIndex(from);
      var b = pageIndex(location.href);
      if (a !== -1 && b !== -1 && a !== b) return b > a ? "forward" : "back";
      if (activation.navigationType === "traverse" && activation.from.index > activation.entry.index) return "back";
    }
    return "forward";
  }

  if (resolveDirection() === "back") root.classList.add("nav-back");

  // Trang cũ vẫn trong bfcache khi bấm Back → không còn "đang rời"
  window.addEventListener("pageshow", function (e) {
    if (e.persisted) root.classList.remove("is-leaving");
  });
})();
