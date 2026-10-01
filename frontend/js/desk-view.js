document.addEventListener("DOMContentLoaded", () => {
  let currentSide = null;
  let currentPage = 1;

  const filterButtons = document.querySelectorAll(".journal-filters button");
  const featuredCard = document.querySelector(".featured-journal-card");
  const journalGrid = document.querySelector(".journal-grid");
  const viewAllButton = document.querySelector(".view-all-journal button");
  const pinNotes = document.querySelectorAll(".pinboard .pin-note");

  // ================================
  // F-24 — LOAD FEATURED POST
  // ================================

  async function loadFeatured() {
    try {
      const res = await fetch("/api/posts/top?limit=1");

      if (!res.ok) {
        throw new Error("Cannot load featured post");
      }

      const data = await res.json();
      const post = Array.isArray(data) ? data[0] : data.posts?.[0];

      if (!post || !featuredCard) return;

      const title = featuredCard.querySelector("h3");
      const excerpt = featuredCard.querySelector("p");
      const side = featuredCard.querySelector(".article-side");
      const date = featuredCard.querySelector(".article-date");

      if (title) title.textContent = post.title || "";
      if (excerpt) excerpt.textContent = post.excerpt || "";
      if (side) side.textContent = post.side || "";
      if (date) date.textContent = formatDate(post.date);

      const link = featuredCard.querySelector("a");

      if (link && post.slug) {
        link.href = `#${post.slug}`;
      }
    } catch (error) {
      console.error("Featured post error:", error);
    }
  }

  // ================================
  // F-24 — LOAD POSTS
  // ================================

  async function loadPosts(side = null, append = false) {
    try {
      const params = new URLSearchParams();

      if (side) {
        params.set("side", side);
      }

      params.set("page", currentPage);
      params.set("per_page", "4");

      const res = await fetch(`/api/posts?${params.toString()}`);

      if (!res.ok) {
        throw new Error("Cannot load posts");
      }

      const result = await res.json();
      const posts = result.posts || [];

      if (!append) {
        journalGrid.innerHTML = "";
      }

      posts.forEach((post) => {
        const card = document.createElement("article");
        card.className = "journal-small-card";

        const tags = Array.isArray(post.tags)
          ? post.tags
              .map((tag) => `<span>#${escapeHtml(tag)}</span>`)
              .join("")
          : "";

        const sideClass =
          post.side === "life" ? "side-b" : "side-a";

        card.innerHTML = `
          <div class="small-card-top">
            <span class="article-side ${sideClass}">
              ${escapeHtml(post.side || "")}
            </span>

            <span>
              ${escapeHtml(formatDate(post.date || ""))}
            </span>
          </div>

          <h3>${escapeHtml(post.title || "")}</h3>

          <p>${escapeHtml(post.excerpt || "")}</p>

          <div class="small-card-footer">
            ${tags}
          </div>
        `;

        journalGrid.appendChild(card);
      });

      const totalPages = result.total_pages || 1;

      if (viewAllButton) {
        if (currentPage < totalPages) {
          viewAllButton.style.display = "inline-block";
          viewAllButton.textContent = "↓ View More";
        } else {
          viewAllButton.style.display = "none";
        }
      }
    } catch (error) {
      console.error("Load posts error:", error);
    }
  }

  // ================================
  // SIDE FILTER
  // ================================

  filterButtons.forEach((button, index) => {
    button.addEventListener("click", async () => {
      filterButtons.forEach((btn) => {
        btn.classList.remove("filter-active");
      });

      button.classList.add("filter-active");

      currentPage = 1;

      if (index === 0) {
        currentSide = null;
      } else if (index === 1) {
        currentSide = "engineering";
      } else {
        currentSide = "life";
      }

      await loadPosts(currentSide, false);
    });
  });

  // ================================
  // VIEW MORE
  // ================================

  if (viewAllButton) {
    viewAllButton.addEventListener("click", async () => {
      currentPage++;
      await loadPosts(currentSide, true);
    });
  }

  // ================================
  // F-24 — LOAD 3 LATEST NOTES
  // ================================

  async function loadLatestNotes() {
    try {
      const result = await getNotes({
        page: 1,
        pageSize: 3
      });

      const notes = result.notes || [];

      pinNotes.forEach((noteElement, index) => {
        const note = notes[index];

        if (!note) {
          noteElement.style.display = "none";
          return;
        }

        noteElement.style.display = "";

        const message = noteElement.querySelector("p");
        const author = noteElement.querySelector("small");

        if (message) {
          message.textContent = `"${note.message || ""}"`;
        }

        if (author) {
          author.textContent =
            `— ${note.name || "Anonymous"}, ${formatDate(note.date || "")}`;
        }
      });
    } catch (error) {
      console.error("Load notes error:", error);
    }
  }

  // ================================
  // START
  // ================================

  loadFeatured();
  loadPosts();
  loadLatestNotes();
});