const urlParams = new URLSearchParams(window.location.search);
let slug = urlParams.get("slug");

let currentPost = null;

// Tải bài viết theo slug trên URL (không có slug thì lấy bài mới nhất) rồi báo server tăng lượt đọc
async function loadArticle() {
    try {
        if (!slug) {
            const latest = await callApi("/api/posts?per_page=1");
            if (latest.posts.length === 0) {
                document.getElementById("loading").textContent = "There are no posts yet.";
                return;
            }
            slug = latest.posts[0].slug;
        }

        const post = await callApi("/api/posts/" + encodeURIComponent(slug));
        currentPost = post;
        showArticle(post);

        callApi("/api/posts/" + encodeURIComponent(slug) + "/read", "POST").catch(function (err) {
            console.log("Could not count the read:", err.message);
        });
    } catch (err) {
        document.getElementById("loading").innerHTML =
            escapeHtml(err.message) + ` <a class="link" href="journal.html">Back to The Dual Journal</a>`;
    }
}

// Hiển thị bài viết lên trang: tiêu đề, tag, ảnh bìa, nội dung, reaction và link bài cũ hơn / mới hơn
function showArticle(post) {
    document.title = post.title + " — Kiên's Journal";

    const sideLink = document.getElementById("side-link");
    sideLink.href = "journal.html?side=" + post.side;
    if (post.side === "A") {
        sideLink.textContent = "Side A: Craft & Systems";
    } else {
        sideLink.textContent = "Side B: Soul & Everyday";
    }

    document.getElementById("title").textContent = post.title;
    document.getElementById("excerpt").textContent = post.excerpt;
    document.getElementById("date").textContent = formatDate(post.date);
    document.getElementById("read-minutes").textContent = post.read_minutes;
    document.getElementById("reads").textContent = post.reads;

    let tagsHtml = "";
    for (const tag of post.tags) {
        tagsHtml += `<a class="tag" href="journal.html?side=${post.side}&tag=${encodeURIComponent(tag)}">#${escapeHtml(tag)}</a>`;
    }
    document.getElementById("tags").innerHTML = tagsHtml;

    const cover = document.getElementById("cover");
    if (post.cover) {
        cover.src = post.cover;
        cover.hidden = false;
    }

    document.getElementById("content").innerHTML = post.content;

    const reactionButtons = document.querySelectorAll(".reaction-btn");
    for (const button of reactionButtons) {
        const type = button.dataset.type;
        document.getElementById("count-" + type).textContent = post[type];
        if (localStorage.getItem("reacted-" + slug + "-" + type) === "yes") {
            button.disabled = true;
        }
    }

    if (post.older) {
        document.getElementById("older-link").href = "article.html?slug=" + post.older.slug;
        document.getElementById("older-title").textContent = post.older.title;
        document.getElementById("older-link").hidden = false;
    }
    if (post.newer) {
        document.getElementById("newer-link").href = "article.html?slug=" + post.newer.slug;
        document.getElementById("newer-title").textContent = post.newer.title;
        document.getElementById("newer-link").hidden = false;
    }

    document.getElementById("loading").hidden = true;
    document.getElementById("article").hidden = false;
}

const reactionButtons = document.querySelectorAll(".reaction-btn");

for (const button of reactionButtons) {
    // Thả reaction: gửi lên server, khoá nút và ghi nhớ trong trình duyệt để không thả lại lần nữa
    button.addEventListener("click", async function () {
        const type = button.dataset.type;
        button.disabled = true;

        try {
            const result = await callApi("/api/posts/" + encodeURIComponent(slug) + "/react", "POST", { type: type });
            document.getElementById("count-" + type).textContent = result.count;

            localStorage.setItem("reacted-" + slug + "-" + type, "yes");

            button.classList.add("pop");
            showToast("Thank you for the " + button.textContent.split(" ")[0] + "!");
        } catch (err) {
            button.disabled = false;
            showToast("Could not save your reaction: " + err.message, "error");
        }
    });
}

// Gửi lời nhắn cho bài viết, chủ đề lời nhắn chọn theo Side của bài
document.getElementById("note-form").addEventListener("submit", async function (event) {
    event.preventDefault();

    const status = document.getElementById("note-status");
    const message = document.getElementById("note-message").value.trim();
    const name = document.getElementById("note-name").value.trim();
    const email = document.getElementById("note-email").value.trim();

    if (message === "") {
        showMessage(status, "You have not written anything yet.", "error");
        return;
    }

    let topic = "AtticMusings";
    if (currentPost && currentPost.side === "A") {
        topic = "EngineeringSolitude";
    }

    showMessage(status, "Sending...");
    try {
        await callApi("/api/notes", "POST", {
            message: message,
            name: name,
            email: email,
            topic: topic,
            post_slug: slug
        });
        document.getElementById("note-form").reset();
        showMessage(status, "Sent! Kiên will read your note one quiet morning.", "success");
    } catch (err) {
        showMessage(status, "Could not send: " + err.message, "error");
    }
});

// Cập nhật thanh tiến độ đọc theo phần trăm trang đã cuộn
window.addEventListener("scroll", function () {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    let percent = 0;
    if (maxScroll > 0) {
        percent = (window.scrollY / maxScroll) * 100;
    }
    document.getElementById("progress-bar").style.width = percent + "%";
});

loadArticle();
