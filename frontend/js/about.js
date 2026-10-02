// Lấy số bài viết và số bưu thiếp từ server rồi hiện lên trang giới thiệu
async function loadStats() {
    try {
        const stats = await callApi("/api/stats");
        document.getElementById("stat-posts").textContent = stats.posts;
        document.getElementById("stat-a").textContent = stats.side_a;
        document.getElementById("stat-b").textContent = stats.side_b;
        document.getElementById("stat-notes").textContent = stats.notes;
    } catch (err) {
        console.log("Could not load stats:", err.message);
    }
}

loadStats();
