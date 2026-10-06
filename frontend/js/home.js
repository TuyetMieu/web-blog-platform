// Hiện số bài viết của từng mặt sổ
async function loadStats() {
    try {
        const stats = await callApi("/api/stats");
        document.getElementById("count-a").textContent = stats.side_a;
        document.getElementById("count-b").textContent = stats.side_b;
        document.getElementById("count-all").textContent = stats.posts;
    } catch (err) {
        console.log("Could not load stats:", err.message);
    }
}

// Hiện bài viết nổi bật (bài featured có nhiều lượt đọc nhất), có ảnh bìa thì hiện ảnh bên phải
async function loadFeatured() {
    const box = document.getElementById("featured");

    try {
        const data = await callApi("/api/posts?featured=1&sort=reads&per_page=1");
        if (data.posts.length === 0) {
            box.innerHTML = "";
            return;
        }

        const post = data.posts[0];

        let imageHtml = "";
        if (post.cover) {
            imageHtml = `<img src="${escapeHtml(post.cover)}" alt="">`;
        }

        box.innerHTML = `
            <article class="featured">
                <div>
                    <span class="badge badge-${post.side}">Side ${post.side} · Featured</span>
                    <span class="muted">${formatDate(post.date)} · ${post.read_minutes} min read</span>
                    <h3><a href="article.html?slug=${post.slug}">${escapeHtml(post.title)}</a></h3>
                    <p>${escapeHtml(post.excerpt)}</p>
                    <div class="featured-info">
                        <span class="muted"><i class="bi bi-cup-hot-fill"></i> ${post.tea} tea</span>
                        <span class="muted"><i class="bi bi-eye"></i> ${post.reads} reads</span>
                        <a href="article.html?slug=${post.slug}" class="link">Read Full Parchment →</a>
                    </div>
                </div>
                ${imageHtml}
            </article>
        `;
    } catch (err) {
        box.innerHTML = `<p class="message error">${escapeHtml(err.message)}</p>`;
    }
}

// Hiện 4 bài mới nhất, side = "" (tất cả), "A" hoặc "B"
async function loadLatestPosts(side) {
    const list = document.getElementById("post-list");
    list.innerHTML = loadingHtml(4);

    let url = "/api/posts?per_page=4";
    if (side !== "") {
        url += "&side=" + side;
    }

    try {
        const data = await callApi(url);

        if (data.posts.length === 0) {
            list.innerHTML = `<p class="empty">This page of the notebook is still empty.</p>`;
            return;
        }

        let html = "";
        for (const post of data.posts) {
            html += postCardHtml(post);
        }
        list.innerHTML = html;
    } catch (err) {
        list.innerHTML = `<p class="message error">${escapeHtml(err.message)}</p>`;
    }
}

const filterButtons = document.querySelectorAll(".filter-btn");

for (const button of filterButtons) {
    // Bấm nút lọc All / Side A / Side B: tô màu nút vừa bấm rồi tải lại danh sách bài
    button.addEventListener("click", function () {
        for (const otherButton of filterButtons) {
            otherButton.classList.remove("active");
        }
        button.classList.add("active");

        loadLatestPosts(button.dataset.side);
    });
}

// Hiện 3 bưu thiếp mới nhất đã được ghim lên bảng ghim
async function loadPinboard() {
    const board = document.getElementById("pinboard");

    try {
        const data = await callApi("/api/notes?per_page=3");

        if (data.notes.length === 0) {
            board.innerHTML = `<p class="muted">No pinned notes yet.</p>`;
            return;
        }

        let html = "";
        for (const note of data.notes) {
            html += `
                <div class="sticky-note">
                    “${escapeHtml(note.message)}”
                    <span class="muted">— ${escapeHtml(note.name || "Anonymous")}, ${formatDate(note.created_at)}</span>
                </div>
            `;
        }
        board.innerHTML = html;
    } catch (err) {
        board.innerHTML = `<p class="message error">${escapeHtml(err.message)}</p>`;
    }
}

loadStats();
loadFeatured();
loadLatestPosts("");
loadPinboard();
