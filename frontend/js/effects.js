const PAGE_ORDER = ["index.html", "journal.html", "article.html", "whisper-box.html", "about.html"];

// Lấy tên file của 1 đường dẫn, vd: "/journal.html?side=A" -> "journal.html"
function getPageName(url) {
    const path = new URL(url, window.location.href).pathname;
    let name = path.split("/").pop();
    if (name === "") {
        name = "index.html";
    }
    return name;
}

if (sessionStorage.getItem("go-back") === "yes") {
    document.documentElement.classList.add("go-back");
}
sessionStorage.removeItem("go-back");

// Khi trang tải xong: bật tất cả hiệu ứng, và cho nội dung thêm vào sau cũng hiện dần
document.addEventListener("DOMContentLoaded", function () {
    setupLinkClick();
    setupReveal();
    setupRipple();
    setupSliders();
    setupHeaderShadow();
    setupToTop();

    const watcher = new MutationObserver(function () {
        setupReveal();
    });
    watcher.observe(document.body, { childList: true, subtree: true });
});

// Khi bấm 1 link: ghi lại chiều đi (tiến / lùi) và mục menu đang chọn để trang sau đọc
function setupLinkClick() {
    document.addEventListener("click", function (event) {
        const link = event.target.closest("a");
        if (!link || !link.href || link.target === "_blank") {
            return;
        }

        const fromIndex = PAGE_ORDER.indexOf(getPageName(window.location.href));
        const toIndex = PAGE_ORDER.indexOf(getPageName(link.href));
        if (fromIndex !== -1 && toIndex !== -1 && toIndex < fromIndex) {
            sessionStorage.setItem("go-back", "yes");
        }

        const activeMenu = document.querySelector(".menu a.active");
        if (activeMenu) {
            sessionStorage.setItem("last-menu", activeMenu.getAttribute("href"));
        }
    });
}

const REVEAL_LIST = ".hero-top, .bento-card, .featured, .card, .sticky-note, .section-head, .journal-head, "
    + ".filter-panel, .article-header, .content, .reactions, .postcard, .post-nav a, .solitude-box, "
    + ".board-head, .note-card, .artifact, .about-hero > *, .stat, .now-card, .gear-list li, .timeline li, "
    + ".gallery > div, .lost > *, .admin-note";

const IMAGE_LIST = ".polaroid img, .featured img, .article-cover, .gallery img, .artifact img, .about-hero img";

// Khi phần tử lọt vào màn hình thì cho hiện ra, các phần tử cùng lúc hiện so le nhau 80ms
const revealObserver = new IntersectionObserver(function (entries) {
    let count = 0;
    for (const entry of entries) {
        if (entry.isIntersecting) {
            const element = entry.target;
            const delay = count * 80;
            element.style.transitionDelay = delay + "ms";
            element.classList.add("show");

            setTimeout(function () {
                element.style.transitionDelay = "";
            }, delay + 700);

            revealObserver.unobserve(entry.target);
            count = count + 1;
        }
    }
});

// Gắn hiệu ứng hiện dần cho các phần tử và ảnh chưa được gắn
function setupReveal() {
    const elements = document.querySelectorAll(REVEAL_LIST);
    for (const element of elements) {
        if (!element.classList.contains("reveal")) {
            element.classList.add("reveal");
            revealObserver.observe(element);
        }
    }

    const images = document.querySelectorAll(IMAGE_LIST);
    for (const image of images) {
        if (!image.classList.contains("img-fade")) {
            image.classList.add("img-fade");
            if (image.complete) {
                image.classList.add("loaded");
            } else {
                image.addEventListener("load", function () {
                    image.classList.add("loaded");
                });
                image.addEventListener("error", function () {
                    image.classList.add("loaded");
                });
            }
        }
    }
}

// Tạo hiệu ứng gợn sóng tại chỗ bấm trên các nút
function setupRipple() {
    document.addEventListener("pointerdown", function (event) {
        const button = event.target.closest(".btn, .btn-light, .seal, .reaction-btn, .side-btn");
        if (!button || button.disabled) {
            return;
        }

        const rect = button.getBoundingClientRect();
        const ripple = document.createElement("span");
        ripple.className = "ripple";
        ripple.style.left = (event.clientX - rect.left) + "px";
        ripple.style.top = (event.clientY - rect.top) + "px";

        button.classList.add("has-ripple");
        button.appendChild(ripple);

        ripple.addEventListener("animationend", function () {
            ripple.remove();
        });
    });
}

// Đặt viên thuốc (pill) của 1 nhóm nút vào đúng vị trí và kích thước của nút đang chọn
function movePill(group, button, animate) {
    const pill = group.querySelector(".slider-pill");
    if (!button) {
        pill.hidden = true;
        return;
    }
    pill.hidden = false;

    if (animate) {
        pill.classList.remove("no-move");
    } else {
        pill.classList.add("no-move");
    }

    pill.style.width = button.offsetWidth + "px";
    pill.style.height = button.offsetHeight + "px";
    pill.style.transform = "translate(" + button.offsetLeft + "px, " + button.offsetTop + "px)";
}

// Tạo nền trượt cho các nhóm nút class "slider"; menu thì trượt từ mục trang cũ sang mục trang mới
function setupSliders() {
    const groups = document.querySelectorAll(".slider");

    for (const group of groups) {
        const pill = document.createElement("span");
        pill.className = "slider-pill";
        group.prepend(pill);

        const lastMenu = sessionStorage.getItem("last-menu");
        const oldLink = group.classList.contains("menu") && lastMenu
            ? group.querySelector('a[href="' + lastMenu + '"]')
            : null;

        const newLink = group.querySelector(".active");
        movePill(group, newLink, false);

        if (oldLink && newLink && oldLink !== newLink) {
            pill.animate(
                [
                    {
                        transform: "translate(" + oldLink.offsetLeft + "px, " + oldLink.offsetTop + "px)",
                        width: oldLink.offsetWidth + "px"
                    },
                    {
                        transform: "translate(" + newLink.offsetLeft + "px, " + newLink.offsetTop + "px)",
                        width: newLink.offsetWidth + "px"
                    }
                ],
                {
                    duration: 700,
                    delay: 150,
                    easing: "cubic-bezier(0.34, 1.56, 0.64, 1)",
                    fill: "backwards"
                }
            );
        }

        group.addEventListener("click", function () {
            setTimeout(function () {
                movePill(group, group.querySelector(".active"), true);
            }, 0);
        });
    }
    sessionStorage.removeItem("last-menu");

    // Đặt lại tất cả viên thuốc khi kích thước nút thay đổi
    function placeAllPills() {
        for (const group of groups) {
            movePill(group, group.querySelector(".active"), false);
        }
    }
    window.addEventListener("resize", placeAllPills);
    document.fonts.ready.then(placeAllPills);
}

// Cho header đổ bóng khi cuộn trang xuống
function setupHeaderShadow() {
    const header = document.querySelector(".header");
    if (!header) {
        return;
    }
    window.addEventListener("scroll", function () {
        if (window.scrollY > 8) {
            header.classList.add("scrolled");
        } else {
            header.classList.remove("scrolled");
        }
    });
}

// Tạo nút lên đầu trang, chỉ hiện khi đã cuộn xuống quá 1 màn hình
function setupToTop() {
    const button = document.createElement("button");
    button.className = "to-top hide";
    button.title = "Back to top";
    button.innerHTML = '<i class="bi bi-arrow-up"></i>';
    document.body.appendChild(button);

    button.addEventListener("click", function () {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });

    window.addEventListener("scroll", function () {
        if (window.scrollY > window.innerHeight) {
            button.classList.remove("hide");
        } else {
            button.classList.add("hide");
        }
    });
}
