/* =========================================================
   whisper.js — Màn 4: The Whisper Box
   Chuyển từ whisper-box.js (FE4) sang api/layout dùng chung.
   - Bưu thiếp: đếm ký tự, chọn topic seal, gửi POST /api/notes.
   - Bảng ghim: chỉ hiển thị note Kiên đã ghim (công khai); lọc topic,
     tìm kiếm, "Inspect archived leaves" tải thêm trang.
   - Note bạn vừa gửi là riêng tư → chỉ hiện trên trình duyệt của bạn
     với nhãn "Chờ Kiên đọc", không lộ ra bảng công khai.
   ========================================================= */
(function () {
  "use strict";

  var KJ = window.KJ;
  var api = KJ.api;
  var esc = KJ.escapeHtml;
  var $ = KJ.$;
  var $$ = KJ.$$;

  var PAGE_SIZE = 4;
  var MESSAGE_MAX = 2000;
  var ANGLES = [-1.2, 0.8, -0.6, 1.4, -1.8, 0.5, -1, 1.1];

  var board = { topic: "", q: "", page: 1, notes: [], total: 0, totalPages: 1 };
  var boardEl = $("#board-notes");
  var myNotesEl = $("#my-notes");
  var moreBtn = $("#board-more");

  /* ---------- Thẻ note ---------- */
  function noteHtml(note, index) {
    return (
      '<article class="note-card" style="transform: rotate(' + ANGLES[index % ANGLES.length] + 'deg)">' +
        '<div class="note-card__head">' +
          '<span class="note-card__place"><i class="bi bi-geo-alt-fill"></i> ' + esc(note.location || "Somewhere quiet") + "</span>" +
          "<time datetime=\"" + esc(note.date) + "\">" + KJ.formatDate(note.date) + "</time>" +
        "</div>" +
        '<p class="note-card__body">“' + esc(note.message) + "”</p>" +
        '<div class="note-card__foot">' +
          "<span>— " + esc(note.name) + (note.role ? ", " + esc(note.role) : "") + "</span>" +
          '<span class="note-card__tag">#' + esc(note.topic) + "</span>" +
        "</div>" +
        (note.reply
          ? '<div class="note-card__reply"><strong>Kiên\'s Margin Note' + (note.replyContext ? " · " + esc(note.replyContext) : "") + "</strong><p>“" + esc(note.reply) + "”</p></div>"
          : "") +
      "</article>"
    );
  }

  function myNoteHtml(note) {
    return (
      '<article class="note-card note-card--pending">' +
        '<div class="note-card__head">' +
          '<span class="note-card__place"><i class="bi bi-hourglass-split"></i> Chờ Kiên đọc · chỉ bạn thấy</span>' +
          "<time>" + KJ.formatDate(note.date) + "</time>" +
        "</div>" +
        '<p class="note-card__body">“' + esc(note.message) + "”</p>" +
        '<div class="note-card__foot">' +
          "<span>— " + esc(note.name || "Anonymous") + "</span>" +
          '<span class="note-card__tag">#' + esc(note.topic) + "</span>" +
        "</div>" +
      "</article>"
    );
  }

  /* Note của chính mình (đã gửi, chưa ghim) — lưu trên trình duyệt, tối đa 5 cái trong 14 ngày */
  function myNotes() {
    var cutoff = Date.now() - 14 * 864e5;
    return KJ.store.get("sentNotes", []).filter(function (n) { return n.sentAt > cutoff; });
  }

  function renderMyNotes() {
    var q = board.q.toLowerCase();
    var mine = myNotes().filter(function (n) {
      if (board.topic && n.topic !== board.topic) return false;
      if (q && (n.message + " " + (n.name || "")).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
    myNotesEl.innerHTML = mine.map(myNoteHtml).join("");
  }

  /* ---------- Bảng ghim ---------- */
  var renderToken = 0;

  async function loadBoard(append) {
    var token = ++renderToken;
    if (!append) {
      board.page = 1;
      board.notes = [];
      boardEl.classList.add("is-loading");
    }
    boardEl.setAttribute("aria-busy", "true");
    moreBtn.disabled = true;
    renderMyNotes();

    try {
      var data = await api.listNotes({
        topic: board.topic || undefined,
        q: board.q || undefined,
        page: board.page,
        perPage: PAGE_SIZE
      });
      if (token !== renderToken) return; // có lần tải mới hơn
      board.notes = board.notes.concat(data.notes);
      board.total = data.total;
      board.totalPages = data.totalPages;
    } catch (err) {
      if (token !== renderToken) return;
      boardEl.classList.remove("is-loading");
      boardEl.removeAttribute("aria-busy");
      boardEl.innerHTML = '<div class="empty-state empty-state--error"><p class="empty-state__title">Không tải được bảng ghim.</p><p class="empty-state__hint">' + esc(err.message) + "</p></div>";
      return;
    }

    boardEl.classList.remove("is-loading");
    boardEl.removeAttribute("aria-busy");

    if (!board.notes.length) {
      var hint = board.q
        ? "Không có note nào khớp từ khoá. Thử xoá bớt từ khoá hoặc đổi chủ đề."
        : "Chưa có note nào được ghim cho chủ đề này. Hãy là người đầu tiên gửi một tấm bưu thiếp!";
      boardEl.innerHTML = '<div class="empty-state"><p class="empty-state__title">Bảng ghim còn trống.</p><p class="empty-state__hint">' + hint + "</p></div>";
    } else {
      boardEl.innerHTML = board.notes.map(noteHtml).join("");
    }

    $("#board-total").textContent = board.total;
    $("#board-showing").textContent = "Showing " + board.notes.length + " of " + board.total + " public keepsakes";
    moreBtn.disabled = board.page >= board.totalPages;
  }

  $$("#board-topics [data-topic]").forEach(function (pill) {
    pill.addEventListener("click", function () {
      if (board.topic === pill.dataset.topic) return;
      board.topic = pill.dataset.topic;
      $$("#board-topics [data-topic]").forEach(function (p) { p.setAttribute("aria-pressed", String(p === pill)); });
      loadBoard(false);
    });
  });

  var searchDebounce;
  $("#board-search").addEventListener("input", function (e) {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(function () {
      board.q = e.target.value.trim();
      loadBoard(false);
    }, 300);
  });

  moreBtn.addEventListener("click", function () {
    if (board.page >= board.totalPages) return;
    board.page += 1;
    loadBoard(true);
  });

  /* ---------- Bưu thiếp ---------- */
  var form = $("#postcard-form");
  var message = $("#postcard-message");
  var counter = $("#postcard-counter");
  var status = $("#postcard-status");
  var submit = $("#postcard-submit");
  var topicBtns = $$("#postcard-topics [data-topic]");
  var topic = "EngineeringSolitude";

  function setStatus(text, kind) {
    status.textContent = text;
    status.className = "form-status" + (kind ? " form-status--" + kind : "");
  }

  function updateCounter() {
    var remaining = MESSAGE_MAX - message.value.length;
    counter.textContent = Math.max(0, remaining) + " characters remaining";
  }

  topicBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      topic = btn.dataset.topic;
      topicBtns.forEach(function (b) { b.setAttribute("aria-checked", String(b === btn)); });
    });
  });

  message.addEventListener("input", function () {
    message.removeAttribute("aria-invalid");
    updateCounter();
  });

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    var text = message.value.trim();
    var name = $("#postcard-name").value.trim();
    var email = $("#postcard-email");

    if (!text) {
      message.setAttribute("aria-invalid", "true");
      message.focus();
      return setStatus("Vui lòng viết vài dòng trước khi gửi.", "error");
    }
    if (email.value.trim() && !email.checkValidity()) {
      email.setAttribute("aria-invalid", "true");
      email.focus();
      return setStatus("Email chưa đúng định dạng.", "error");
    }
    email.removeAttribute("aria-invalid");

    submit.disabled = true;
    setStatus("Đang gửi…");
    try {
      await api.sendNote({ message: text, name: name, email: email.value.trim(), topic: topic });
      var sent = myNotes();
      sent.unshift({ message: text, name: name, topic: topic, date: new Date().toISOString().slice(0, 10), sentAt: Date.now() });
      KJ.store.set("sentNotes", sent.slice(0, 5));
      form.reset();
      updateCounter();
      if (KJ.replayClass) KJ.replayClass(form, "is-stamped");
      setStatus("Đã đóng dấu thành công! Kiên sẽ đọc cùng tách trà sáng mai — những tấm đặc biệt sẽ được ghim lên bảng.", "ok");
      if (board.topic && board.topic !== topic) {
        board.topic = "";
        $$("#board-topics [data-topic]").forEach(function (p) { p.setAttribute("aria-pressed", String(p.dataset.topic === "")); });
        loadBoard(false);
      } else {
        renderMyNotes();
      }
    } catch (err) {
      setStatus("Gửi thất bại: " + err.message, "error");
    } finally {
      submit.disabled = false;
    }
  });

  updateCounter();
  loadBoard(false);
})();
