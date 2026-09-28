/**
 * whisper-box.js — wires the static Màn 4 (Whisper Box) markup to real
 * data via api.js (getNotes / sendNote). Depends on api.js being loaded
 * first.
 */
(function () {
  const boardState = { topic: "", search: "", visibleCount: 4 };
  const PAGE_STEP = 4;
  let selectedPostcardTopic = "EngineeringSolitude";

  const boardNotesEl = document.getElementById("board-notes");
  const boardShowingEl = document.getElementById("board-showing-count");
  const boardTotalEl = document.getElementById("board-total-count");
  const boardLoadMoreBtn = document.getElementById("board-load-more");
  const boardPills = Array.from(document.querySelectorAll("#board-topic-pills button"));
  const headerSearchInput = document.getElementById("header-search-input");

  const postcardForm = document.getElementById("postcard-form");
  const postcardMessage = document.getElementById("postcard-message");
  const postcardCounter = document.getElementById("postcard-counter");
  const postcardName = document.getElementById("postcard-name");
  const postcardEmail = document.getElementById("postcard-email");
  const postcardTopics = Array.from(document.querySelectorAll("#postcard-topics button"));
  const postcardSubmit = document.getElementById("postcard-submit");
  const postcardStatus = document.getElementById("postcard-status");
  const MESSAGE_MAX = 2000;

  // escapeHtml() and formatDate() are defined once in api.js (loaded before
  // this file) and used here as globals.

  function rotationFor(index) {
    const angles = [-1.2, 0.8, -0.6, 1.4, -1.8, 0.5, -1, 1.1];
    return angles[index % angles.length];
  }

  function noteCardHtml(note, index) {
    return `
      <div class="kj-note-card" style="transform: rotate(${rotationFor(index)}deg);">
        <div class="kj-note-head">
          <span>📍 ${escapeHtml(note.location || "Unknown")}</span>
          <span>${formatDate(note.date)}</span>
        </div>
        <div class="kj-note-body">&quot;${escapeHtml(note.message)}&quot;</div>
        <div class="kj-note-foot">
          <span class="kj-note-author">— ${escapeHtml(note.name)}${note.role ? ", " + escapeHtml(note.role) : ""}</span>
          <span class="kj-note-tag">#${escapeHtml(note.topic)}</span>
        </div>
        ${note.reply ? `
        <div class="kj-note-reply">
          <strong>${escapeHtml(note.reply.author)} · ${escapeHtml(note.reply.context)}</strong>
          &quot;${escapeHtml(note.reply.message)}&quot;
        </div>` : ""}
        ${note.pendingSync ? '<div class="kj-note-pending">⏳ Đã lưu tạm trên trình duyệt này — sẽ đồng bộ khi có server thật.</div>' : ""}
      </div>`;
  }

  function setBoardPillActive() {
    boardPills.forEach((pill) => {
      const isActive = pill.dataset.topic === boardState.topic;
      const label = pill.querySelector("div");
      if (pill.dataset.topic === "") {
        pill.className = isActive ? "button4" : "button5";
      } else {
        pill.className = isActive ? "button4" : (pill.dataset.baseClass || (pill.dataset.baseClass = pill.className));
      }
      if (label) label.className = isActive ? "text15" : "text16";
    });
  }

  // Bumped on every renderBoard() call so a slower, older request (search
  // debounce + a quick topic click right after, say) can't clobber a
  // newer one's already-rendered result — same guard as js/journal-feed.js.
  let renderToken = 0;

  async function renderBoard() {
    const token = ++renderToken;
    boardNotesEl.setAttribute("aria-busy", "true");
    let data;
    try {
      data = await getNotes({
        topic: boardState.topic || undefined,
        search: boardState.search || undefined,
        page: 1,
        pageSize: boardState.visibleCount,
      });
    } catch (err) {
      if (token !== renderToken) return;
      boardNotesEl.innerHTML = `<p style="color:#954413;">Lỗi khi tải note: ${escapeHtml(err.message)}</p>`;
      boardNotesEl.removeAttribute("aria-busy");
      return;
    }
    if (token !== renderToken) return;

    const { notes, total, totalPages } = data;

    if (notes.length === 0) {
      const hint = boardState.search
        ? "Không có note nào khớp từ khóa tìm kiếm. Thử xóa bớt từ khóa hoặc đổi chủ đề."
        : "Chưa có note nào cho chủ đề này. Hãy là người đầu tiên gửi một tấm bưu thiếp!";
      boardNotesEl.innerHTML = `
        <div style="text-align:center;padding:32px 16px;">
          <p style="font-family:'Geist-Regular',sans-serif;color:#887369;">${hint}</p>
        </div>`;
    } else {
      boardNotesEl.innerHTML = notes.map(noteCardHtml).join("");
    }

    boardShowingEl.textContent = `Showing ${notes.length} of ${total} public keepsakes`;
    boardTotalEl.innerHTML = `${total}<br>Pinned`;
    boardLoadMoreBtn.disabled = boardState.visibleCount >= total;
    boardLoadMoreBtn.style.opacity = boardLoadMoreBtn.disabled ? "0.5" : "1";
    boardNotesEl.removeAttribute("aria-busy");
  }

  // Header's own search box (top-right, shared across pages) filters the
  // corkboard by name/message/location — see getNotes() in api.js.
  let boardSearchDebounce;
  if (headerSearchInput) {
    headerSearchInput.addEventListener("input", () => {
      clearTimeout(boardSearchDebounce);
      boardSearchDebounce = setTimeout(() => {
        boardState.search = headerSearchInput.value.trim();
        boardState.visibleCount = PAGE_STEP;
        renderBoard();
      }, 300);
    });
  }

  boardPills.forEach((pill) => {
    pill.addEventListener("click", () => {
      if (boardState.topic === pill.dataset.topic) return;
      boardState.topic = pill.dataset.topic;
      boardState.visibleCount = PAGE_STEP;
      setBoardPillActive();
      renderBoard();
    });
  });

  boardLoadMoreBtn.addEventListener("click", () => {
    boardState.visibleCount += PAGE_STEP;
    renderBoard();
  });

  // --- Postcard form ---
  function setPostcardTopicActive() {
    postcardTopics.forEach((btn) => {
      const isActive = btn.dataset.topic === selectedPostcardTopic;
      btn.className = isActive ? "button" : "button2";
      const label = btn.querySelector("div");
      if (label) label.className = isActive ? "text15" : "text16";
    });
  }

  postcardTopics.forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedPostcardTopic = btn.dataset.topic;
      setPostcardTopicActive();
    });
  });

  function updatePostcardCounter() {
    const remaining = MESSAGE_MAX - postcardMessage.value.length;
    postcardCounter.textContent = `${Math.max(0, remaining)} characters remaining`;
  }
  postcardMessage.addEventListener("input", updatePostcardCounter);

  postcardForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const message = postcardMessage.value.trim();
    if (!message) {
      postcardStatus.textContent = "Vui lòng viết vài dòng trước khi gửi.";
      postcardStatus.className = "is-error";
      postcardMessage.focus();
      return;
    }

    postcardSubmit.disabled = true;
    postcardStatus.className = "";
    postcardStatus.textContent = "Đang gửi…";

    try {
      await sendNote({
        name: postcardName.value.trim(),
        email: postcardEmail.value.trim(),
        topic: selectedPostcardTopic,
        message,
      });

      postcardStatus.textContent = "Đã stamp thành công! Kiên sẽ đọc cùng tách trà sáng mai.";
      postcardStatus.className = "is-success";
      postcardForm.reset();
      updatePostcardCounter();

      // Show the new note immediately: reset any topic filter that would hide it.
      if (boardState.topic && boardState.topic !== selectedPostcardTopic) {
        boardState.topic = "";
        setBoardPillActive();
      }
      boardState.visibleCount = Math.max(boardState.visibleCount, PAGE_STEP);
      renderBoard();
    } catch (err) {
      postcardStatus.textContent = `Gửi thất bại: ${err.message}`;
      postcardStatus.className = "is-error";
    } finally {
      postcardSubmit.disabled = false;
    }
  });

  setBoardPillActive();
  setPostcardTopicActive();
  updatePostcardCounter();
  renderBoard();
})();
