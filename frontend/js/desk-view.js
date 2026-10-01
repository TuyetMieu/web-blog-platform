document.addEventListener("DOMContentLoaded", () => {
  let currentSide = null;
  let currentPage = 1;

  const filterButtons =
    document.querySelectorAll(".journal-filters button");

  const featuredCard =
    document.querySelector(".featured-journal-card");

  const journalGrid =
    document.querySelector(".journal-grid");

  const viewAllButton =
    document.querySelector(".view-all-journal button");

  const pinNotes =
    document.querySelectorAll(".pinboard .pin-note");


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
        padding: 40px 20px;
        text-align: center;
        color: #887369;
        font-size: 14px;
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
  // F-24 + F-26 — LOAD FEATURED POST
  // ============================================================

  async function loadFeatured() {
    try {
      const res =
        await fetch("/api/posts/top?limit=1");

      if (!res.ok) {
        throw new Error(
          "Cannot load featured post"
        );
      }

      const data = await res.json();

      const post =
        Array.isArray(data)
          ? data[0]
          : data.posts?.[0];


      // F-26 — NO DATA
      if (!post) {
        if (featuredCard) {
          showEmptyMessage(
            featuredCard,
            "Chưa có bài viết nổi bật."
          );
        }

        return;
      }


      if (!featuredCard) return;


      const title =
        featuredCard.querySelector("h3");

      const excerpt =
        featuredCard.querySelector("p");

      const side =
        featuredCard.querySelector(
          ".article-side"
        );

      const date =
        featuredCard.querySelector(
          ".article-date"
        );

      const link =
        featuredCard.querySelector("a");


      if (title) {
        title.textContent =
          safeText(post.title, 120);

        title.style.overflowWrap =
          "anywhere";
      }


      if (excerpt) {
        excerpt.textContent =
          safeText(post.excerpt, 260);

        excerpt.style.overflowWrap =
          "anywhere";
      }


      if (side) {
        side.textContent =
          post.side === "engineering"
            ? "Side A · Featured Essay"
            : "Side B · Featured Essay";
      }


      if (date) {
        date.textContent =
          formatDate(post.date || "");
      }


      if (link && post.slug) {
        link.href =
          `#${post.slug}`;
      }

    } catch (error) {
      console.error(
        "Featured post error:",
        error
      );

      if (featuredCard) {
        showEmptyMessage(
          featuredCard,
          "Không thể tải bài viết nổi bật."
        );
      }
    }
  }


  // ============================================================
  // F-24 + F-26 — LOAD POSTS
  // ============================================================

  async function loadPosts(
    side = null,
    append = false
  ) {
    try {
      const params =
        new URLSearchParams();

      if (side) {
        params.set("side", side);
      }

      params.set(
        "page",
        currentPage
      );

      params.set(
        "per_page",
        "4"
      );


      const res =
        await fetch(
          `/api/posts?${params.toString()}`
        );


      if (!res.ok) {
        throw new Error(
          "Cannot load posts"
        );
      }


      const result =
        await res.json();

      const posts =
        Array.isArray(result.posts)
          ? result.posts
          : [];


      // ========================================================
      // F-26 — NO DATA
      // ========================================================

      if (
        posts.length === 0 &&
        !append
      ) {
        showEmptyMessage(
          journalGrid,
          "Chưa có bài viết nào."
        );

        if (viewAllButton) {
          viewAllButton.style.display =
            "none";
        }

        return;
      }


      if (
        posts.length === 0 &&
        append
      ) {
        if (viewAllButton) {
          viewAllButton.style.display =
            "none";
        }

        return;
      }


      if (!append && journalGrid) {
        journalGrid.innerHTML = "";
      }


      posts.forEach((post) => {
        const card =
          document.createElement(
            "article"
          );

        card.className =
          "journal-small-card";


        const tags =
          Array.isArray(post.tags)
            ? post.tags
                .map(
                  (tag) =>
                    `<span>#${escapeHtml(tag)}</span>`
                )
                .join("")
            : "";


        const sideClass =
          post.side === "life"
            ? "side-b"
            : "side-a";


        card.innerHTML = `
          <div class="small-card-top">

            <span class="article-side ${sideClass}">
              ${escapeHtml(
                post.side || ""
              )}
            </span>

            <span>
              ${escapeHtml(
                formatDate(
                  post.date || ""
                )
              )}
            </span>

          </div>


          <h3>
            ${escapeHtml(
              safeText(
                post.title,
                120
              )
            )}
          </h3>


          <p>
            ${escapeHtml(
              safeText(
                post.excerpt,
                260
              )
            )}
          </p>


          <div class="small-card-footer">
            ${tags}
          </div>
        `;


        const title =
          card.querySelector("h3");

        const excerpt =
          card.querySelector("p");


        if (title) {
          title.style.overflowWrap =
            "anywhere";
        }


        if (excerpt) {
          excerpt.style.overflowWrap =
            "anywhere";
        }


        if (journalGrid) {
          journalGrid.appendChild(
            card
          );
        }
      });


      const totalPages =
        result.total_pages || 1;


      if (viewAllButton) {
        if (
          currentPage < totalPages
        ) {
          viewAllButton.style.display =
            "inline-block";

          viewAllButton.textContent =
            "↓ View More";
        } else {
          viewAllButton.style.display =
            "none";
        }
      }

    } catch (error) {
      console.error(
        "Load posts error:",
        error
      );

      if (!append) {
        showEmptyMessage(
          journalGrid,
          "Không thể tải danh sách bài viết."
        );
      }
    }
  }


  // ============================================================
  // SIDE FILTER
  // ============================================================

  filterButtons.forEach(
    (button, index) => {

      button.addEventListener(
        "click",
        async () => {

          filterButtons.forEach(
            (btn) => {
              btn.classList.remove(
                "filter-active"
              );
            }
          );


          button.classList.add(
            "filter-active"
          );


          currentPage = 1;


          if (index === 0) {
            currentSide = null;
          } else if (index === 1) {
            currentSide =
              "engineering";
          } else {
            currentSide =
              "life";
          }


          await loadPosts(
            currentSide,
            false
          );
        }
      );
    }
  );


  // ============================================================
  // VIEW MORE
  // ============================================================

  if (viewAllButton) {

    viewAllButton.addEventListener(
      "click",
      async () => {

        currentPage++;

        await loadPosts(
          currentSide,
          true
        );
      }
    );
  }


  // ============================================================
  // F-24 + F-26 — LOAD 3 LATEST NOTES
  // ============================================================

  async function loadLatestNotes() {

    try {

      const result =
        await getNotes({
          page: 1,
          pageSize: 3
        });


      const notes =
        Array.isArray(result.notes)
          ? result.notes
          : [];


      // F-26 — NO NOTES
      if (notes.length === 0) {

        pinNotes.forEach(
          (noteElement) => {
            noteElement.style.display =
              "none";
          }
        );

        return;
      }


      pinNotes.forEach(
        (noteElement, index) => {

          const note =
            notes[index];


          if (!note) {
            noteElement.style.display =
              "none";

            return;
          }


          noteElement.style.display =
            "";


          const message =
            noteElement.querySelector(
              "p"
            );

          const author =
            noteElement.querySelector(
              "small"
            );


          if (message) {

            message.textContent =
              `"${safeText(
                note.message || "",
                300
              )}"`;

            message.style.overflowWrap =
              "anywhere";
          }


          if (author) {

            author.textContent =
              `— ${
                note.name ||
                "Anonymous"
              }, ${
                formatDate(
                  note.date || ""
                )
              }`;
          }

        }
      );

    } catch (error) {

      console.error(
        "Load notes error:",
        error
      );

      pinNotes.forEach(
        (noteElement) => {
          noteElement.style.display =
            "none";
        }
      );
    }
  }


  // ============================================================
  // F-26 — BROKEN IMAGES
  // ============================================================

  setupBrokenImages();


  // ============================================================
  // START
  // ============================================================

  loadFeatured();

  loadPosts();

  loadLatestNotes();

});