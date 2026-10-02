// journal.js - Trang nhật ký (journal.html)
// Xem bài theo Side A / Side B, lọc theo chủ đề, tag, tìm kiếm, sắp xếp và phân trang.


// ===== Trạng thái bộ lọc hiện tại =====
// Đọc giá trị ban đầu từ URL, vd: journal.html?side=B&category=Hanoi%20Essays
const urlParams = new URLSearchParams(window.location.search);

// Side: "A", "B", hoặc "" (cả 2 side - dùng khi tìm kiếm từ nút kính lúp trên header)
let currentSide = "A";
if (urlParams.get("side") === "B") {
    currentSide = "B";
} else if (urlParams.get("side") === null && urlParams.get("q")) {
    currentSide = "";
}
let currentCategory = urlParams.get("category") || "";
let currentTag = urlParams.get("tag") || "";
let currentKeyword = urlParams.get("q") || "";
let currentSort = "recent";
let currentPage = 1;
let totalPages = 1;

const POSTS_PER_PAGE = 6;

// Danh sách chủ đề lấy từ API (chỉ lấy 1 lần)
let allCategories = [];


// ===== Tải danh sách bài viết theo bộ lọc =====
async function loadPosts() {
    const list = document.getElementById("post-list");
    list.innerHTML = loadingHtml(4); // khung chờ tải

    // Tạo chuỗi tham số cho URL, vd: side=A&page=1&per_page=6&sort=recent
    const query = new URLSearchParams();
    if (currentSide !== "") {
        query.set("side", currentSide);
    }
    query.set("page", currentPage);
    query.set("per_page", POSTS_PER_PAGE);
    query.set("sort", currentSort);
    if (currentCategory !== "") {
        query.set("category", currentCategory);
    }
    if (currentTag !== "") {
        query.set("tag", currentTag);
    }
    if (currentKeyword !== "") {
        query.set("q", currentKeyword);
    }

    try {
        const data = await callApi("/api/posts?" + query.toString());
        totalPages = data.total_pages;

        if (data.posts.length === 0) {
            list.innerHTML = `<p class="empty">No matching entries. Try the other side or clear some filters.</p>`;
        } else {
            let html = "";
            for (const post of data.posts) {
                html += postCardHtml(post);
            }
            list.innerHTML = html;
        }

        // Cập nhật phân trang
        document.getElementById("page-info").textContent =
            "Page " + currentPage + " of " + totalPages + " · " + data.total + " entries";
        document.getElementById("prev-btn").disabled = currentPage <= 1;
        document.getElementById("next-btn").disabled = currentPage >= totalPages;
    } catch (err) {
        list.innerHTML = `<p class="message error">${escapeHtml(err.message)}</p>`;
    }
}


// ===== Tải danh sách chủ đề (1 lần lúc mở trang) =====
async function loadCategories() {
    try {
        allCategories = await callApi("/api/categories");

        // Tổng số bài = cộng số bài của mọi chủ đề
        let total = 0;
        for (const item of allCategories) {
            total += item.count;
        }
        document.getElementById("total-posts").textContent = total;

        showCategories();
    } catch (err) {
        console.log("Could not load categories:", err.message);
    }
}


// ===== Vẽ các nút chủ đề của Side đang chọn =====
function showCategories() {
    const box = document.getElementById("category-list");

    // Nút "Tất cả" luôn đứng đầu
    let activeClass = currentCategory === "" ? "active" : "";
    let html = `<button class="seal ${activeClass}" data-category="">All Entries</button>`;

    for (const item of allCategories) {
        if (currentSide !== "" && item.side !== currentSide) {
            continue; // bỏ qua chủ đề của side kia
        }
        activeClass = item.category === currentCategory ? "active" : "";
        html += `<button class="seal ${activeClass}" data-category="${escapeHtml(item.category)}">
                    ${escapeHtml(item.category)} (${item.count})
                 </button>`;
    }
    box.innerHTML = html;
}


// ===== Tô màu nút Side đang chọn + hiện tag đang lọc =====
function showFilters() {
    const sideButtons = document.querySelectorAll(".side-btn");
    for (const button of sideButtons) {
        if (button.dataset.side === currentSide) {
            button.classList.add("active");
        } else {
            button.classList.remove("active");
        }
    }

    document.getElementById("tag-filter").hidden = currentTag === "";
    document.getElementById("tag-name").textContent = "#" + currentTag;
    document.getElementById("search-input").value = currentKeyword;
}


// ===== CÁC SỰ KIỆN =====

// Bấm Side A / Side B
const sideButtons = document.querySelectorAll(".side-btn");
for (const button of sideButtons) {
    button.addEventListener("click", function () {
        currentSide = button.dataset.side;
        currentCategory = "";
        currentTag = "";
        currentPage = 1;
        showFilters();
        showCategories();
        loadPosts();
    });
}

// Bấm 1 chủ đề. Các nút được tạo bằng JS nên bắt sự kiện ở khung bao ngoài.
document.getElementById("category-list").addEventListener("click", function (event) {
    const button = event.target.closest("button");
    if (!button) {
        return;
    }
    currentCategory = button.dataset.category;
    currentPage = 1;
    showCategories();
    loadPosts();
});

// Bỏ lọc tag
document.getElementById("clear-tag").addEventListener("click", function () {
    currentTag = "";
    currentPage = 1;
    showFilters();
    loadPosts();
});

// Tìm kiếm (bấm nút Tìm hoặc Enter)
document.getElementById("search-form").addEventListener("submit", function (event) {
    event.preventDefault(); // không cho form tải lại trang
    currentKeyword = document.getElementById("search-input").value.trim();
    currentPage = 1;
    loadPosts();
});

// Đổi cách sắp xếp
document.getElementById("sort-select").addEventListener("change", function () {
    currentSort = this.value;
    currentPage = 1;
    loadPosts();
});

// Trang trước / trang sau
document.getElementById("prev-btn").addEventListener("click", function () {
    if (currentPage > 1) {
        currentPage = currentPage - 1;
        loadPosts();
        window.scrollTo(0, 0);
    }
});

document.getElementById("next-btn").addEventListener("click", function () {
    if (currentPage < totalPages) {
        currentPage = currentPage + 1;
        loadPosts();
        window.scrollTo(0, 0);
    }
});


// Chạy khi mở trang
showFilters();
loadCategories();
loadPosts();
