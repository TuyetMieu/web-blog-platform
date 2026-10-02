// article.js - Trang đọc bài (article.html)
// Mở bài theo ?slug=... trên URL. Nếu không có slug thì mở bài mới nhất.


// Lấy slug trên URL, vd: article.html?slug=rain-and-solitude -> "rain-and-solitude"
const urlParams = new URLSearchParams(window.location.search);
let slug = urlParams.get("slug");

// Bài viết đang xem (dùng lại khi gửi lời nhắn)
let currentPost = null;


// ===== Tải bài viết =====
async function loadArticle() {
    try {
        // Không có slug (bấm "Article Reading" trên menu) -> lấy bài mới nhất
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

        // Báo cho server tăng lượt đọc (không cần chờ kết quả)
        callApi("/api/posts/" + encodeURIComponent(slug) + "/read", "POST").catch(function (err) {
            console.log("Could not count the read:", err.message);
        });
    } catch (err) {
        document.getElementById("loading").innerHTML =
            escapeHtml(err.message) + ` <a class="link" href="journal.html">Back to The Dual Journal</a>`;
    }
}


// ===== Hiển thị bài viết lên trang =====
function showArticle(post) {
    document.title = post.title + " — Kiên's Journal";

    // Link về danh sách bài cùng side
    const sideLink = document.getElementById("side-link");
    sideLink.href = "journal.html?side=" + post.side;
    if (post.side === "A") {
        sideLink.textContent = "Side A: Craft & Systems";
    } else {
        sideLink.textContent = "Side B: Soul & Everyday";
    }

    // Dùng textContent cho chữ thường để không bị chèn mã HTML
    document.getElementById("title").textContent = post.title;
    document.getElementById("excerpt").textContent = post.excerpt;
    document.getElementById("date").textContent = formatDate(post.date);
    document.getElementById("read-minutes").textContent = post.read_minutes;
    document.getElementById("reads").textContent = post.reads;

    // Tag
    let tagsHtml = "";
    for (const tag of post.tags) {
        tagsHtml += `<a class="tag" href="journal.html?side=${post.side}&tag=${encodeURIComponent(tag)}">#${escapeHtml(tag)}</a>`;
    }
    document.getElementById("tags").innerHTML = tagsHtml;

    // Ảnh bìa (nếu có)
    const cover = document.getElementById("cover");
    if (post.cover) {
        cover.src = post.cover;
        cover.hidden = false;
    }

    // Nội dung bài là HTML do Kiên viết trong trang Admin nên được phép dùng innerHTML
    document.getElementById("content").innerHTML = post.content;

    // Số lượt reaction. Reaction nào đã thả rồi (lưu trong trình duyệt) thì khoá nút lại.
    const reactionButtons = document.querySelectorAll(".reaction-btn");
    for (const button of reactionButtons) {
        const type = button.dataset.type;
        document.getElementById("count-" + type).textContent = post[type];
        if (localStorage.getItem("reacted-" + slug + "-" + type) === "yes") {
            button.disabled = true;
        }
    }

    // Bài cũ hơn / mới hơn
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

    // Ẩn chữ "đang tải", hiện bài viết
    document.getElementById("loading").hidden = true;
    document.getElementById("article").hidden = false;
}


// ===== Thả reaction =====
const reactionButtons = document.querySelectorAll(".reaction-btn");

for (const button of reactionButtons) {
    button.addEventListener("click", async function () {
        const type = button.dataset.type;
        button.disabled = true; // khoá nút ngay để không bấm 2 lần

        try {
            const result = await callApi("/api/posts/" + encodeURIComponent(slug) + "/react", "POST", { type: type });
            document.getElementById("count-" + type).textContent = result.count;

            // Ghi nhớ trong trình duyệt là đã thả reaction này rồi
            localStorage.setItem("reacted-" + slug + "-" + type, "yes");

            // Hiệu ứng: nút nảy lên + hiện lời cảm ơn
            button.classList.add("pop");
            showToast("Thank you for the " + button.textContent.split(" ")[0] + "!");
        } catch (err) {
            button.disabled = false;
            showToast("Could not save your reaction: " + err.message, "error");
        }
    });
}


// ===== Gửi lời nhắn cho bài viết =====
document.getElementById("note-form").addEventListener("submit", async function (event) {
    event.preventDefault(); // không cho form tải lại trang

    const status = document.getElementById("note-status");
    const message = document.getElementById("note-message").value.trim();
    const name = document.getElementById("note-name").value.trim();
    const email = document.getElementById("note-email").value.trim();

    if (message === "") {
        showMessage(status, "You have not written anything yet.", "error");
        return;
    }

    // Bài Side A thì gắn chủ đề kỹ thuật, Side B thì gắn chủ đề đời sống
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


// ===== Thanh tiến độ đọc =====
window.addEventListener("scroll", function () {
    // Quãng đường có thể cuộn = chiều cao cả trang - chiều cao màn hình
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    let percent = 0;
    if (maxScroll > 0) {
        percent = (window.scrollY / maxScroll) * 100;
    }
    document.getElementById("progress-bar").style.width = percent + "%";
});


// Chạy khi mở trang
loadArticle();
