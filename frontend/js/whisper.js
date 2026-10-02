const messageInput = document.getElementById("message");
const charCount = document.getElementById("char-count");

// Đếm số ký tự của lời nhắn mỗi khi gõ
messageInput.addEventListener("input", function () {
    charCount.textContent = messageInput.value.length + " / 2000";
});

// Gửi bưu thiếp: kiểm tra dữ liệu, gửi lên server rồi chạy hiệu ứng đóng dấu
document.getElementById("postcard-form").addEventListener("submit", async function (event) {
    event.preventDefault();

    const status = document.getElementById("form-status");
    const message = messageInput.value.trim();
    const name = document.getElementById("name").value.trim();
    const place = document.getElementById("location").value.trim();
    const email = document.getElementById("email").value.trim();
    const topic = document.querySelector('input[name="topic"]:checked').value;

    if (message.length < 10) {
        showMessage(status, "Your message needs at least 10 characters.", "error");
        return;
    }
    if (email !== "" && !email.includes("@")) {
        showMessage(status, "Please enter a valid email, e.g. you@domain.com", "error");
        return;
    }

    showMessage(status, "Sending...");
    try {
        await callApi("/api/notes", "POST", {
            message: message,
            name: name,
            location: place,
            email: email,
            topic: topic
        });
        document.getElementById("postcard-form").reset();
        charCount.textContent = "0 / 2000";
        showMessage(status, "Sealed and delivered! Kiên will read it with tomorrow's morning tea.", "success");

        const form = document.getElementById("postcard-form");
        form.classList.add("stamped");
        setTimeout(function () {
            form.classList.remove("stamped");
        }, 1000);
    } catch (err) {
        showMessage(status, "Could not send: " + err.message, "error");
    }
});

let boardTopic = "";
let boardKeyword = "";
let boardPage = 1;
const NOTES_PER_PAGE = 4;

// Tải bưu thiếp lên bảng ghim theo chủ đề và từ khoá; append = true là "Xem thêm", false là tải lại từ đầu
async function loadNotes(append) {
    const board = document.getElementById("board");
    const moreButton = document.getElementById("more-btn");

    if (!append) {
        boardPage = 1;
        board.innerHTML = loadingHtml(2);
    }

    const query = new URLSearchParams();
    query.set("page", boardPage);
    query.set("per_page", NOTES_PER_PAGE);
    if (boardTopic !== "") {
        query.set("topic", boardTopic);
    }
    if (boardKeyword !== "") {
        query.set("q", boardKeyword);
    }

    try {
        const data = await callApi("/api/notes?" + query.toString());

        let html = "";
        for (const note of data.notes) {
            html += noteCardHtml(note);
        }

        if (append) {
            board.innerHTML += html;
        } else if (data.notes.length === 0) {
            board.innerHTML = `<p class="empty">The board is still empty.</p>`;
        } else {
            board.innerHTML = html;
        }

        document.getElementById("board-total").textContent = data.total;
        moreButton.hidden = boardPage >= data.total_pages;
    } catch (err) {
        board.innerHTML = `<p class="message error">${escapeHtml(err.message)}</p>`;
    }
}

const topicButtons = document.querySelectorAll(".topic-btn");
for (const button of topicButtons) {
    // Bấm nút lọc chủ đề: tô màu nút vừa bấm rồi tải lại bảng ghim
    button.addEventListener("click", function () {
        for (const otherButton of topicButtons) {
            otherButton.classList.remove("active");
        }
        button.classList.add("active");

        boardTopic = button.dataset.topic;
        loadNotes(false);
    });
}

// Tìm kiếm bưu thiếp trong bảng ghim theo từ khoá
document.getElementById("board-search").addEventListener("submit", function (event) {
    event.preventDefault();
    boardKeyword = document.getElementById("board-keyword").value.trim();
    loadNotes(false);
});

// Bấm "Xem thêm" thì tải trang tiếp theo và nối vào cuối bảng ghim
document.getElementById("more-btn").addEventListener("click", function () {
    boardPage = boardPage + 1;
    loadNotes(true);
});

loadNotes(false);
