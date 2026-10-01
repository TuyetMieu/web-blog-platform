document.addEventListener("DOMContentLoaded", () => {
  // ================================
  // F-25 + F-26 — MÀN 2
  // ================================


  // ============================================================
  // F-26 — HELPERS
  // ============================================================

  function safeText(value, maxLength = 180) {
    const text = String(value || "").trim();

    if (text.length <= maxLength) {
      return text;
    }

    return text.slice(0, maxLength).trimEnd() + "...";
  }


  function showEmptyMessage(container, message) {
    if (!container) return;

    container.innerHTML = `
      <div style="
        padding: 28px 20px;
        text-align: center;
        color: #887369;
        font-size: 13px;
      ">
        ${message}
      </div>
    `;
  }


  function setupBrokenImages() {
    const images = document.querySelectorAll("img");

    images.forEach((img) => {
      img.addEventListener("error", () => {
        img.style.display = "none";
      });
    });
  }


  // ============================================================
  // HALL OF FAME — GET TOP 2
  // ============================================================

  async function loadHallOfFame() {
    const hallCards =
      document.querySelectorAll(".hall-card");

    if (!hallCards.length) return;

    try {
      const res = await fetch(
        "/api/posts/top?limit=2"
      );

      if (!res.ok) {
        throw new Error(
          "Cannot load Hall of Fame"
        );
      }

      const data = await res.json();

      const posts = Array.isArray(data)
        ? data
        : data.posts || [];


      // F-26 — NO DATA
      if (posts.length === 0) {
        hallCards.forEach((card) => {
          card.style.display = "";
          showEmptyMessage(
            card,
            "Chưa có bài viết nổi bật."
          );
        });

        return;
      }


      hallCards.forEach((card, index) => {
        const post = posts[index];

        // F-26 — NOT ENOUGH DATA
        if (!post) {
          card.style.display = "none";
          return;
        }

        card.style.display = "";

        const side =
          card.querySelector(
            ".hall-content > span"
          );

        const title =
          card.querySelector("h3");

        const excerpt =
          card.querySelector("p");

        const link =
          card.querySelector("a");


        if (side) {
          side.textContent =
            post.side === "engineering"
              ? "SIDE A · ENGINEERING"
              : "SIDE B · LIFE";
        }


        if (title) {
          title.textContent =
            safeText(
              post.title,
              90
            );

          title.style.overflowWrap =
            "anywhere";
        }


        if (excerpt) {
          excerpt.textContent =
            safeText(
              post.excerpt,
              220
            );

          excerpt.style.overflowWrap =
            "anywhere";
        }


        if (link && post.slug) {
          link.href =
            `#${post.slug}`;
        }
      });

    } catch (error) {
      console.error(
        "Hall of Fame error:",
        error
      );

      hallCards.forEach((card) => {
        card.style.display = "";

        showEmptyMessage(
          card,
          "Không thể tải bài viết nổi bật."
        );
      });
    }
  }


  // ============================================================
  // RECENT LEAVES — GET 4
  // ============================================================

  async function loadRecentLeaves() {
    const leafCards =
      document.querySelectorAll(".leaf-card");

    if (!leafCards.length) return;

    try {
      const res = await fetch(
        "/api/posts/recent?limit=4"
      );

      if (!res.ok) {
        throw new Error(
          "Cannot load recent posts"
        );
      }

      const data = await res.json();

      const posts = Array.isArray(data)
        ? data
        : data.posts || [];


      // F-26 — NO DATA
      if (posts.length === 0) {
        leafCards.forEach((card) => {
          card.style.display = "";
          showEmptyMessage(
            card,
            "Chưa có bài viết gần đây."
          );
        });

        return;
      }


      leafCards.forEach((card, index) => {
        const post = posts[index];

        // F-26 — NOT ENOUGH DATA
        if (!post) {
          card.style.display = "none";
          return;
        }

        card.style.display = "";


        const side =
          card.querySelector("span");

        const title =
          card.querySelector("h3");

        const excerpt =
          card.querySelector("p");

        const readTime =
          card.querySelector("small");


        if (side) {
          side.textContent =
            post.side === "engineering"
              ? "Side A · Engineering"
              : "Side B · Life";
        }


        if (title) {
          title.textContent =
            safeText(
              post.title,
              100
            );

          title.style.overflowWrap =
            "anywhere";
        }


        if (excerpt) {
          excerpt.textContent =
            safeText(
              post.excerpt,
              240
            );

          excerpt.style.overflowWrap =
            "anywhere";
        }


        if (readTime) {
          readTime.textContent =
            post.read_minutes
              ? `${post.read_minutes} min read`
              : "";
        }
      });

    } catch (error) {
      console.error(
        "Recent Leaves error:",
        error
      );

      leafCards.forEach((card) => {
        card.style.display = "";

        showEmptyMessage(
          card,
          "Không thể tải bài viết gần đây."
        );
      });
    }
  }


  // ============================================================
  // QUICK NOTE — POST /api/notes
  // ============================================================

  function setupQuickNote() {
    const form =
      document.querySelector("#quick-note-form");

    if (!form) return;

    const nameInput =
      document.querySelector("#quick-note-name");

    const messageInput =
      document.querySelector("#quick-note-message");

    const submitButton =
      form.querySelector("button");

    const status =
      document.querySelector("#quick-note-status");


    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const name =
        nameInput
          ? nameInput.value.trim()
          : "";

      const message =
        messageInput
          ? messageInput.value.trim()
          : "";


      if (!message) {
        if (status) {
          status.textContent =
            "Please write a note first.";
        }

        return;
      }


      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Sending...";
      }


      if (status) {
        status.textContent = "";
      }


      try {
        const result = await sendNote({
          name: name || "Anonymous",
          email: null,
          topic: "quick-note",
          message
        });


        if (status) {
          status.textContent =
            result && result.pendingSync
              ? "Your note was saved locally."
              : "Your note was sent.";
        }


        form.reset();

      } catch (error) {
        console.error(
          "Quick Note error:",
          error
        );

        if (status) {
          status.textContent =
            "Could not send your note.";
        }

      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent =
            "Leave a Quick Note →";
        }
      }
    });
  }


  // ============================================================
  // F-26 — BROKEN IMAGES
  // ============================================================

  setupBrokenImages();


  // ============================================================
  // START
  // ============================================================

  loadHallOfFame();

  loadRecentLeaves();

  setupQuickNote();
});