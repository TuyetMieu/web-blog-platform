// effects.js - Các hiệu ứng chuyển động của website (đi cùng css/effects.css)
//
// File này được nạp trong thẻ <head> để kịp chọn chiều trượt TRƯỚC khi trang hiện ra.
// Các hiệu ứng cần tới nội dung trang thì đợi trang tải xong (DOMContentLoaded) mới chạy.


// ================== 1. CHIỀU TRƯỢT KHI CHUYỂN TRANG ==================

// Thứ tự các trang trên menu. Đi từ trái sang phải là "tiến", ngược lại là "lùi".
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

// Trang trước đã ghi lại là mình đang "lùi" -> gắn class để CSS trượt ngược lại
if (sessionStorage.getItem("go-back") === "yes") {
    document.documentElement.classList.add("go-back");
}
sessionStorage.removeItem("go-back");


// Mọi phần bên dưới cần trang tải xong mới chạy được
document.addEventListener("DOMContentLoaded", function () {
    setupLinkClick();
    setupReveal();
    setupRipple();
    setupSliders();
    setupHeaderShadow();
    setupToTop();
    setupRainSound();

    // Danh sách bài, bưu thiếp... được JS thêm vào sau (khi API trả về).
    // MutationObserver báo mỗi khi trang có thêm nội dung mới -> cho nội dung đó hiện dần.
    const watcher = new MutationObserver(function () {
        setupReveal();
    });
    watcher.observe(document.body, { childList: true, subtree: true });
});


// Khi bấm 1 link: ghi lại chiều đi (tiến / lùi) và mục menu đang chọn, để trang sau đọc
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

        // Ghi lại mục menu của trang này, để viên thuốc trên menu trang sau trượt từ đây sang
        const activeMenu = document.querySelector(".menu a.active");
        if (activeMenu) {
            sessionStorage.setItem("last-menu", activeMenu.getAttribute("href"));
        }
    });
}


// ================== 2. HIỆN DẦN KHI CUỘN TỚI ==================

// Những phần tử sẽ hiện dần
const REVEAL_LIST = ".hero-top, .bento-card, .featured, .card, .sticky-note, .section-head, .journal-head, "
    + ".filter-panel, .article-header, .content, .reactions, .postcard, .post-nav a, .solitude-box, "
    + ".board-head, .note-card, .artifact, .about-hero > *, .stat, .now-card, .gear-list li, .timeline li, "
    + ".gallery > div, .lost > *, .admin-note";

// Những ảnh sẽ hiện dần khi tải xong
const IMAGE_LIST = ".polaroid img, .featured img, .article-cover, .gallery img, .artifact img, .about-hero img";

// IntersectionObserver báo cho mình biết khi 1 phần tử lọt vào màn hình
const revealObserver = new IntersectionObserver(function (entries) {
    let count = 0;
    for (const entry of entries) {
        if (entry.isIntersecting) {
            // Các phần tử hiện cùng lúc thì cái sau chậm hơn cái trước 80ms (hiện so le)
            const element = entry.target;
            const delay = count * 80;
            element.style.transitionDelay = delay + "ms";
            element.classList.add("show");

            // Hiện xong thì bỏ độ trễ, để hiệu ứng rê chuột không bị chậm theo
            setTimeout(function () {
                element.style.transitionDelay = "";
            }, delay + 700);

            revealObserver.unobserve(entry.target); // hiện rồi thì thôi theo dõi
            count = count + 1;
        }
    }
});

function setupReveal() {
    // Phần tử nào chưa có class "reveal" thì thêm vào và bắt đầu theo dõi
    const elements = document.querySelectorAll(REVEAL_LIST);
    for (const element of elements) {
        if (!element.classList.contains("reveal")) {
            element.classList.add("reveal");
            revealObserver.observe(element);
        }
    }

    // Ảnh: mờ lúc đầu, tải xong thì hiện ra
    const images = document.querySelectorAll(IMAGE_LIST);
    for (const image of images) {
        if (!image.classList.contains("img-fade")) {
            image.classList.add("img-fade");
            if (image.complete) {
                image.classList.add("loaded"); // ảnh đã có sẵn trong bộ nhớ đệm
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


// ================== 3. GỢN SÓNG KHI BẤM NÚT ==================

function setupRipple() {
    document.addEventListener("pointerdown", function (event) {
        const button = event.target.closest(".btn, .btn-light, .seal, .reaction-btn, .side-btn");
        if (!button || button.disabled) {
            return;
        }

        // Tạo 1 vòng tròn nhỏ ngay chỗ bấm, CSS sẽ phóng to và làm mờ nó
        const rect = button.getBoundingClientRect();
        const ripple = document.createElement("span");
        ripple.className = "ripple";
        ripple.style.left = (event.clientX - rect.left) + "px";
        ripple.style.top = (event.clientY - rect.top) + "px";

        button.classList.add("has-ripple");
        button.appendChild(ripple);

        // Chạy xong hiệu ứng thì xoá vòng tròn đi
        ripple.addEventListener("animationend", function () {
            ripple.remove();
        });
    });
}


// ================== 4. THANH CHỌN CÓ NỀN TRƯỢT ==================

// Đặt viên thuốc (pill) của 1 nhóm vào đúng vị trí nút đang chọn
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

    // Viên thuốc to bằng nút và nằm đúng chỗ của nút
    pill.style.width = button.offsetWidth + "px";
    pill.style.height = button.offsetHeight + "px";
    pill.style.transform = "translate(" + button.offsetLeft + "px, " + button.offsetTop + "px)";
}

function setupSliders() {
    // Các nhóm nút có class "slider" trong HTML: menu, bộ lọc trang chủ, Side A/B, chủ đề bảng ghim
    const groups = document.querySelectorAll(".slider");

    for (const group of groups) {
        // Chèn viên thuốc vào đầu nhóm
        const pill = document.createElement("span");
        pill.className = "slider-pill";
        group.prepend(pill);

        // Menu: viên thuốc trượt từ mục của trang vừa rời đi sang mục của trang hiện tại
        const lastMenu = sessionStorage.getItem("last-menu");
        const oldLink = group.classList.contains("menu") && lastMenu
            ? group.querySelector('a[href="' + lastMenu + '"]')
            : null;

        const newLink = group.querySelector(".active");
        movePill(group, newLink, false); // đặt viên thuốc ngay vào mục của trang hiện tại

        if (oldLink && newLink && oldLink !== newLink) {
            // Chạy hiệu ứng: viên thuốc đi từ mục cũ sang mục mới.
            // Hàm animate() nhận 2 khung hình: [lúc bắt đầu, lúc kết thúc]
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
                    delay: 150,                                  // đợi trang mới hiện ra một chút rồi mới trượt
                    easing: "cubic-bezier(0.34, 1.56, 0.64, 1)", // trượt quá đà rồi nảy lại
                    fill: "backwards"                            // trong lúc đợi thì đứng ở mục cũ
                }
            );
        }

        // Bấm nút khác trong nhóm -> trượt theo.
        // (setTimeout 0 để đợi file JS của trang đổi class "active" xong)
        group.addEventListener("click", function () {
            setTimeout(function () {
                movePill(group, group.querySelector(".active"), true);
            }, 0);
        });
    }
    sessionStorage.removeItem("last-menu");

    // Đổi kích thước cửa sổ hoặc font chữ tải xong thì nút đổi kích thước -> đặt lại viên thuốc
    function placeAllPills() {
        for (const group of groups) {
            movePill(group, group.querySelector(".active"), false);
        }
    }
    window.addEventListener("resize", placeAllPills);
    document.fonts.ready.then(placeAllPills);
}


// ================== 5. HEADER ĐỔ BÓNG KHI CUỘN ==================

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


// ================== 6. NÚT LÊN ĐẦU TRANG ==================

function setupToTop() {
    // Tạo nút bằng JS để không phải thêm vào từng file HTML
    const button = document.createElement("button");
    button.className = "to-top hide";
    button.title = "Back to top";
    button.innerHTML = '<i class="bi bi-arrow-up"></i>';
    document.body.appendChild(button);

    button.addEventListener("click", function () {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });

    // Cuộn xuống quá 1 màn hình thì hiện nút
    window.addEventListener("scroll", function () {
        if (window.scrollY > window.innerHeight) {
            button.classList.remove("hide");
        } else {
            button.classList.add("hide");
        }
    });
}


// ================== 7. ÂM THANH MƯA ==================
// Tự tạo tiếng mưa bằng Web Audio (không cần file mp3):
// tạo tiếng ồn ngẫu nhiên rồi lọc bớt âm cao cho giống tiếng mưa rơi xa.

let audioContext = null;
let rainVolume = null;
let rainPlaying = false;

function createRain() {
    audioContext = new AudioContext();

    // 1. Tạo 3 giây tiếng ồn. Mỗi mẫu âm thanh = mẫu trước + 1 chút ngẫu nhiên
    //    (gọi là "brown noise", nghe trầm và êm như mưa)
    const length = audioContext.sampleRate * 3;
    const buffer = audioContext.createBuffer(1, length, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
        const random = Math.random() * 2 - 1; // số ngẫu nhiên từ -1 đến 1
        last = (last + 0.02 * random) / 1.02;
        data[i] = last * 3.5;
    }

    // 2. Phát lặp đi lặp lại
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    // 3. Bộ lọc: chỉ giữ âm thấp hơn 1200Hz
    const filter = audioContext.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1200;

    // 4. Núm âm lượng, lúc đầu để 0 (im lặng)
    rainVolume = audioContext.createGain();
    rainVolume.gain.value = 0;

    // Nối: tiếng ồn -> bộ lọc -> âm lượng -> loa
    source.connect(filter);
    filter.connect(rainVolume);
    rainVolume.connect(audioContext.destination);
    source.start();
}

function setupRainSound() {
    const button = document.getElementById("rain-btn");
    if (!button) {
        return;
    }

    button.addEventListener("click", function () {
        if (audioContext === null) {
            createRain(); // lần bấm đầu tiên mới tạo âm thanh
        }

        if (rainPlaying) {
            // Nhỏ dần về 0 trong khoảng nửa giây rồi tạm dừng
            rainVolume.gain.setTargetAtTime(0, audioContext.currentTime, 0.2);
            rainPlaying = false;
            button.classList.remove("playing");
            button.querySelector("i").className = "bi bi-cloud-rain";
            showToast("Rain sound off");
        } else {
            audioContext.resume();
            // To dần lên cho êm tai
            rainVolume.gain.setTargetAtTime(0.35, audioContext.currentTime, 0.5);
            rainPlaying = true;
            button.classList.add("playing");
            button.querySelector("i").className = "bi bi-cloud-rain-heavy-fill";
            showToast("🌧 Rain on a tin roof is playing");
        }
    });
}
