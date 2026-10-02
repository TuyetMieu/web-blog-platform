// Gọi API tới backend Flask, gửi kèm dữ liệu JSON (nếu có) và trả về kết quả JSON
async function callApi(url, method = "GET", data = null) {
    const options = {
        method: method,
        headers: {}
    };

    if (data !== null) {
        options.headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(data);
    }

    let response;
    try {
        response = await fetch(url, options);
    } catch (err) {
        throw new Error("Cannot reach the server. Did you run python app.py?");
    }

    let result;
    try {
        result = await response.json();
    } catch (err) {
        throw new Error("Server error (code " + response.status + ")");
    }

    if (!response.ok) {
        throw new Error(result.error || "Something went wrong");
    }
    return result;
}

// Đổi các ký tự đặc biệt của HTML thành dạng an toàn để chống chèn mã độc (XSS)
function escapeHtml(text) {
    if (text === null || text === undefined) {
        return "";
    }
    return String(text)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Đổi ngày "2024-11-12" thành "Nov 12, 2024"
function formatDate(dateText) {
    if (!dateText) {
        return "";
    }
    const parts = dateText.split("-");
    const month = MONTHS[Number(parts[1]) - 1];
    const day = Number(parts[2]);
    return month + " " + day + ", " + parts[0];
}

// Tạo HTML cho 1 card bài viết (dùng ở trang chủ và trang nhật ký)
function postCardHtml(post) {
    let tagsHtml = "";
    for (const tag of post.tags) {
        tagsHtml += `<a class="tag" href="journal.html?side=${post.side}&tag=${encodeURIComponent(tag)}">#${escapeHtml(tag)}</a>`;
    }

    let category = "";
    if (post.category) {
        category = " · " + escapeHtml(post.category);
    }

    return `
        <article class="card">
            <div class="card-top">
                <span class="badge badge-${post.side}">Side ${post.side}${category}</span>
                <span class="muted">${formatDate(post.date)}</span>
            </div>
            <h3><a href="article.html?slug=${post.slug}">${escapeHtml(post.title)}</a></h3>
            <p>${escapeHtml(post.excerpt)}</p>
            <div class="card-bottom">
                <div>${tagsHtml}</div>
                <span class="muted">${post.read_minutes} min read</span>
            </div>
        </article>
    `;
}

// Tạo HTML cho 1 bưu thiếp đã ghim, kèm lời đáp của Kiên nếu có (dùng ở trang hộp thư)
function noteCardHtml(note) {
    let author = note.name || "Anonymous";
    if (note.role) {
        author += ", " + note.role;
    }

    let replyHtml = "";
    if (note.reply) {
        replyHtml = `<div class="note-reply"><b>Kiên's margin note:</b> “${escapeHtml(note.reply)}”</div>`;
    }

    return `
        <div class="note-card">
            <div class="note-top">
                <span><i class="bi bi-geo-alt-fill"></i> ${escapeHtml(note.location || "Somewhere quiet")}</span>
                <span>${formatDate(note.created_at)}</span>
            </div>
            <p class="note-message">“${escapeHtml(note.message)}”</p>
            <div class="note-bottom">
                <span>— ${escapeHtml(author)}</span>
                <span>#${escapeHtml(note.topic)}</span>
            </div>
            ${replyHtml}
        </div>
    `;
}

// Hiện dòng thông báo dưới form, type là "" (bình thường), "error" (đỏ) hoặc "success" (xanh)
function showMessage(element, text, type = "") {
    element.textContent = text;
    element.className = "message " + type;
}

// Hiện thông báo nhỏ ở dưới màn hình rồi tự mờ dần và biến mất sau 2.5 giây
function showToast(text, type = "") {
    const toast = document.createElement("div");
    toast.className = "toast " + type;
    toast.textContent = text;
    document.body.appendChild(toast);

    setTimeout(function () {
        toast.classList.add("hide");
        setTimeout(function () {
            toast.remove();
        }, 300);
    }, 2500);
}

// Trả về HTML của vài card xám nhấp nháy để hiện trong lúc chờ tải
function loadingHtml(count) {
    let html = "";
    for (let i = 0; i < count; i++) {
        html += `<div class="skeleton"><span></span><span></span><span></span><span></span></div>`;
    }
    return html;
}

// Mở hộp tìm kiếm (tạo hộp ở lần mở đầu tiên), nhấn Enter thì sang trang nhật ký với từ khoá
function openSearch() {
    let dialog = document.getElementById("search-dialog");

    if (!dialog) {
        dialog = document.createElement("dialog");
        dialog.id = "search-dialog";
        dialog.className = "search-dialog";
        dialog.innerHTML = `
            <form id="search-dialog-form" class="search-dialog-form">
                <i class="bi bi-search"></i>
                <input type="search" id="search-dialog-input" placeholder="Search through thoughts, code fragments, or quiet stories..." autocomplete="off">
                <kbd>Esc</kbd>
            </form>
            <p class="muted">Press Enter to search both sides of the journal.</p>
        `;
        document.body.appendChild(dialog);

        dialog.querySelector("form").addEventListener("submit", function (event) {
            event.preventDefault();
            const keyword = document.getElementById("search-dialog-input").value.trim();
            if (keyword !== "") {
                window.location.href = "/journal.html?q=" + encodeURIComponent(keyword);
            }
        });

        dialog.addEventListener("click", function (event) {
            if (event.target === dialog) {
                dialog.close();
            }
        });
    }

    dialog.showModal();
    document.getElementById("search-dialog-input").focus();
}

const searchButton = document.getElementById("search-btn");
if (searchButton) {
    searchButton.addEventListener("click", openSearch);
}

// Phím tắt Ctrl + K (trên Mac là Cmd + K) để mở hộp tìm kiếm
document.addEventListener("keydown", function (event) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openSearch();
    }
});

if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark");
}

const themeButton = document.getElementById("theme-btn");

// Giao diện sáng thì hiện icon mặt trăng, giao diện tối thì hiện icon mặt trời
function updateThemeIcon() {
    if (!themeButton) {
        return;
    }
    const icon = themeButton.querySelector("i");
    if (document.body.classList.contains("dark")) {
        icon.className = "bi bi-sun";
    } else {
        icon.className = "bi bi-moon";
    }
}
updateThemeIcon();

// Đổi giao diện sáng / tối và lưu lựa chọn vào trình duyệt để lần sau mở lại vẫn giữ
function toggleTheme() {
    document.body.classList.toggle("dark");
    if (document.body.classList.contains("dark")) {
        localStorage.setItem("theme", "dark");
    } else {
        localStorage.setItem("theme", "light");
    }
    updateThemeIcon();
}

if (themeButton) {
    // Bấm nút sáng / tối: icon xoay 1 vòng, giao diện mới lan ra thành vòng tròn từ chỗ bấm chuột
    themeButton.addEventListener("click", function (event) {
        themeButton.classList.add("spin");
        setTimeout(function () {
            themeButton.classList.remove("spin");
        }, 600);

        if (!document.startViewTransition) {
            document.body.classList.add("theme-fade");
            toggleTheme();
            setTimeout(function () {
                document.body.classList.remove("theme-fade");
            }, 400);
            return;
        }

        const x = event.clientX;
        const y = event.clientY;
        const radius = Math.hypot(window.innerWidth, window.innerHeight);

        document.documentElement.classList.add("theme-change");
        const transition = document.startViewTransition(toggleTheme);

        transition.ready.then(function () {
            document.documentElement.animate(
                {
                    clipPath: [
                        "circle(0px at " + x + "px " + y + "px)",
                        "circle(" + radius + "px at " + x + "px " + y + "px)"
                    ]
                },
                {
                    duration: 600,
                    easing: "ease-in-out",
                    pseudoElement: "::view-transition-new(root)"
                }
            );
        });

        transition.finished.then(function () {
            document.documentElement.classList.remove("theme-change");
        });
    });
}
