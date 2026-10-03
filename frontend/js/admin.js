let allPosts = [];

// Hỏi server xem đã đăng nhập chưa để hiện trang quản trị hoặc hộp đăng nhập
async function checkLogin() {
    try {
        const result = await callApi("/api/admin/check");
        if (result.admin) {
            showAdminPanel();
        } else {
            showLoginBox();
        }
    } catch (err) {
        showLoginBox();
        showMessage(document.getElementById("login-status"), err.message, "error");
    }
}

// Hiện hộp đăng nhập, ẩn trang quản trị
function showLoginBox() {
    document.getElementById("login-box").hidden = false;
    document.getElementById("admin-panel").hidden = true;
}

// Hiện trang quản trị rồi tải danh sách bưu thiếp và bài viết
function showAdminPanel() {
    document.getElementById("login-box").hidden = true;
    document.getElementById("admin-panel").hidden = false;
    loadNotes();
    loadPosts();
}

// Đăng nhập bằng mật khẩu
document.getElementById("login-form").addEventListener("submit", async function (event) {
    event.preventDefault();
    const status = document.getElementById("login-status");
    const password = document.getElementById("password").value;

    try {
        await callApi("/api/login", "POST", { password: password });
        document.getElementById("password").value = "";
        showMessage(status, "");
        showAdminPanel();
    } catch (err) {
        showMessage(status, err.message, "error");
    }
});

// Đăng xuất và quay về hộp đăng nhập
document.getElementById("logout-btn").addEventListener("click", async function () {
    await callApi("/api/logout", "POST");
    showLoginBox();
});

// Tải tất cả bưu thiếp (cả chưa ghim) và vẽ ra kèm nút ghim, lưu lời đáp, xoá
async function loadNotes() {
    const box = document.getElementById("note-list");

    try {
        const notes = await callApi("/api/admin/notes");

        if (notes.length === 0) {
            box.innerHTML = `<p class="muted">No postcards yet.</p>`;
            return;
        }

        let html = "";
        for (const note of notes) {
            const isPinned = note.pinned === 1;

            let sender = escapeHtml(note.name || "Anonymous");
            if (note.email) {
                sender += " · " + escapeHtml(note.email);
            }
            if (note.location) {
                sender += " · " + escapeHtml(note.location);
            }
            if (note.post_slug) {
                sender += ` · sent from post <a class="link" href="article.html?slug=${encodeURIComponent(note.post_slug)}">${escapeHtml(note.post_slug)}</a>`;
            }

            html += `
                <div class="admin-note ${isPinned ? "" : "pending"}">
                    <div class="note-top">
                        <span>#${note.id} · ${isPinned ? "📌 Pinned" : "✉️ Not pinned"} · #${escapeHtml(note.topic)}</span>
                        <span>${formatDate(note.created_at)}</span>
                    </div>
                    <p class="note-message">${escapeHtml(note.message)}</p>
                    <p class="muted">Từ: ${sender}</p>
                    <textarea id="reply-${note.id}" rows="2" placeholder="Kiên's reply (optional)">${escapeHtml(note.reply)}</textarea>
                    <div class="button-row">
                        <button class="btn-light" onclick="saveNote(${note.id}, ${!isPinned})">${isPinned ? "Unpin" : "Pin to board"}</button>
                        <button class="btn-light" onclick="saveNote(${note.id}, ${isPinned})">Save reply</button>
                        <button class="btn-light btn-danger" onclick="deleteNote(${note.id})">Delete</button>
                    </div>
                </div>
            `;
        }
        box.innerHTML = html;
    } catch (err) {
        box.innerHTML = `<p class="message error">${escapeHtml(err.message)}</p>`;
    }
}

// Ghim / bỏ ghim bưu thiếp và lưu lời đáp, pinned = true (ghim) hoặc false (không ghim)
async function saveNote(id, pinned) {
    const reply = document.getElementById("reply-" + id).value;
    try {
        await callApi("/api/admin/notes/" + id, "PUT", { pinned: pinned, reply: reply });
        loadNotes();
    } catch (err) {
        showToast("Error: " + err.message, "error");
    }
}

// Hỏi lại rồi xoá bưu thiếp
async function deleteNote(id) {
    if (!confirm("Delete postcard #" + id + "?")) {
        return;
    }
    try {
        await callApi("/api/admin/notes/" + id, "DELETE");
        loadNotes();
    } catch (err) {
        showToast("Error: " + err.message, "error");
    }
}

// Tải tất cả bài viết và vẽ ra bảng kèm nút sửa, xoá
async function loadPosts() {
    const table = document.getElementById("post-table");

    try {
        allPosts = await callApi("/api/admin/posts");

        let html = "";
        for (const post of allPosts) {
            html += `
                <tr>
                    <td>${formatDate(post.date)}</td>
                    <td><span class="badge badge-${post.side}">${post.side}</span></td>
                    <td>
                        <a class="link" href="article.html?slug=${post.slug}">${escapeHtml(post.title)}</a>
                        ${post.featured === 1 ? "⭐" : ""}
                    </td>
                    <td>${post.reads}</td>
                    <td class="button-row">
                        <button class="btn-light" onclick="editPost(${post.id})">Edit</button>
                        <button class="btn-light btn-danger" onclick="deletePost(${post.id})">Delete</button>
                    </td>
                </tr>
            `;
        }
        table.innerHTML = html;
    } catch (err) {
        table.innerHTML = `<tr><td colspan="5" class="message error">${escapeHtml(err.message)}</td></tr>`;
    }
}

// Mở form trống để viết bài mới
function newPost() {
    const form = document.getElementById("post-form");
    form.reset();
    document.getElementById("post-id").value = "";
    document.getElementById("form-title").textContent = "New post";
    showMessage(document.getElementById("post-status"), "");
    form.hidden = false;
    document.getElementById("post-title").focus();
}

// Mở form và điền sẵn dữ liệu của bài cần sửa
function editPost(id) {
    let post = null;
    for (const item of allPosts) {
        if (item.id === id) {
            post = item;
        }
    }
    if (post === null) {
        return;
    }

    document.getElementById("post-id").value = post.id;
    document.getElementById("post-title").value = post.title;
    document.getElementById("post-slug").value = post.slug;
    document.getElementById("post-side").value = post.side;
    document.getElementById("post-category").value = post.category || "";
    document.getElementById("post-tags").value = post.tags || "";
    document.getElementById("post-date").value = post.date;
    document.getElementById("post-cover").value = post.cover || "";
    document.getElementById("post-featured").checked = post.featured === 1;
    document.getElementById("post-excerpt").value = post.excerpt || "";
    document.getElementById("post-content").value = post.content || "";

    document.getElementById("form-title").textContent = "Edit post: " + post.title;
    showMessage(document.getElementById("post-status"), "");

    const form = document.getElementById("post-form");
    form.hidden = false;
    form.scrollIntoView();
}

// Lưu bài: chưa có id thì thêm mới (POST), có id rồi thì cập nhật (PUT)
document.getElementById("post-form").addEventListener("submit", async function (event) {
    event.preventDefault();

    const id = document.getElementById("post-id").value;
    const data = {
        title: document.getElementById("post-title").value,
        slug: document.getElementById("post-slug").value,
        side: document.getElementById("post-side").value,
        category: document.getElementById("post-category").value,
        tags: document.getElementById("post-tags").value,
        date: document.getElementById("post-date").value,
        cover: document.getElementById("post-cover").value,
        featured: document.getElementById("post-featured").checked,
        excerpt: document.getElementById("post-excerpt").value,
        content: document.getElementById("post-content").value
    };

    try {
        if (id === "") {
            await callApi("/api/admin/posts", "POST", data);
        } else {
            await callApi("/api/admin/posts/" + id, "PUT", data);
        }
        document.getElementById("post-form").hidden = true;
        showMessage(document.getElementById("list-status"), "Post saved.", "success");
        loadPosts();
    } catch (err) {
        showMessage(document.getElementById("post-status"), err.message, "error");
    }
});

// Hỏi lại rồi xoá bài viết
async function deletePost(id) {
    if (!confirm("Are you sure you want to delete this post?")) {
        return;
    }
    try {
        await callApi("/api/admin/posts/" + id, "DELETE");
        showMessage(document.getElementById("list-status"), "Post deleted.", "success");
        loadPosts();
    } catch (err) {
        showToast("Error: " + err.message, "error");
    }
}

document.getElementById("new-post-btn").addEventListener("click", newPost);

// Bấm huỷ thì ẩn form bài viết
document.getElementById("cancel-btn").addEventListener("click", function () {
    document.getElementById("post-form").hidden = true;
});

checkLogin();

