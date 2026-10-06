const urlParams = new URLSearchParams(window.location.search);

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

let allCategories = [];

// Tải danh sách bài viết theo bộ lọc hiện tại (side, chủ đề, tag, từ khoá, sắp xếp, trang) và cập nhật phân trang
async function loadPosts() {
    const list = document.getElementById("post-list");
    list.innerHTML = loadingHtml(4);

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

        document.getElementById("page-info").textContent =
            "Page " + currentPage + " of " + totalPages + " · " + data.total + " entries";
        document.getElementById("prev-btn").disabled = currentPage <= 1;
        document.getElementById("next-btn").disabled = currentPage >= totalPages;
    } catch (err) {
        list.innerHTML = `<p class="message error">${escapeHtml(err.message)}</p>`;
    }
}

// Tải danh sách chủ đề 1 lần lúc mở trang và hiện tổng số bài
async function loadCategories() {
    try {
        allCategories = await callApi("/api/categories");

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

// Vẽ các nút chủ đề của Side đang chọn, nút "All Entries" luôn đứng đầu
function showCategories() {
    const box = document.getElementById("category-list");

    let activeClass = currentCategory === "" ? "active" : "";
    let html = `<button class="seal ${activeClass}" data-category="">All Entries</button>`;

    for (const item of allCategories) {
        if (currentSide !== "" && item.side !== currentSide) {
            continue;
        }
        activeClass = item.category === currentCategory ? "active" : "";
        html += `<button class="seal ${activeClass}" data-category="${escapeHtml(item.category)}">
                    ${escapeHtml(item.category)} (${item.count})
                 </button>`;
    }
    box.innerHTML = html;
}

// Tô màu nút Side đang chọn, hiện tag đang lọc và từ khoá đang tìm
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

const sideButtons = document.querySelectorAll(".side-btn");
for (const button of sideButtons) {
    // Bấm Side A / Side B: đổi side, bỏ lọc chủ đề và tag rồi tải lại bài
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

// Bấm 1 nút chủ đề thì lọc bài theo chủ đề đó
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

// Tìm kiếm bài viết theo từ khoá
document.getElementById("search-form").addEventListener("submit", function (event) {
    event.preventDefault();
    currentKeyword = document.getElementById("search-input").value.trim();
    currentPage = 1;
    loadPosts();
});

// Đổi cách sắp xếp bài viết
document.getElementById("sort-select").addEventListener("change", function () {
    currentSort = this.value;
    currentPage = 1;
    loadPosts();
});

// Sang trang trước
document.getElementById("prev-btn").addEventListener("click", function () {
    if (currentPage > 1) {
        currentPage = currentPage - 1;
        loadPosts();
        window.scrollTo(0, 0);
    }
});

// Sang trang sau
document.getElementById("next-btn").addEventListener("click", function () {
    if (currentPage < totalPages) {
        currentPage = currentPage + 1;
        loadPosts();
        window.scrollTo(0, 0);
    }
});

showFilters();
loadCategories();
loadPosts();
