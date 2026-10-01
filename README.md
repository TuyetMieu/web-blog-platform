# Kiên's Journal — web-blog-platform

Blog cá nhân "hai mặt" theo thiết kế Figma **WEB_project**: Side A (Craft & Systems) và Side B (Soul & Everyday).
Repo gồm:

- `frontend/` — HTML/CSS/JS thuần, viết tay, không cần build.
- `backend/` — **Flask thuần** + SQLite (thư viện `sqlite3` có sẵn của Python). Xem [backend/README.md](backend/README.md).
- `backend-cu/` — bản Express/PostgreSQL cũ, chỉ lưu trữ, **không sử dụng**.

## Các màn hình

| Màn | Trang | Nguồn gộp | Tính năng chính |
|---|---|---|---|
| 1 · Home / Desk View | `index.html` | nhánh của Kiên | Bento, bài nổi bật (Pour Tea, bookmark), lọc Side A/B, bưu thiếp nhanh, Desk Pinboard |
| 3 · Article Reading | `article.html?slug=…` | FE2 | Mục lục, tiến độ đọc, đọc tiếp chỗ cũ, focus mode, cỡ chữ/phông, 3 nền, reaction, Whisper Note (lưu nháp), bài trước/sau, copy code |
| 4 · The Whisper Box | `whisper-box.html` | FE4 | Bưu thiếp + topic seal, Community Board (lọc topic, tìm kiếm, tải thêm), note riêng tư chờ ghim |
| 5 · The Dual Journal | `journal.html` | FE4 | Side A/B, chủ đề + tag, tìm kiếm, sort Most Read, bookmark, phân trang, URL chia sẻ được |
| 6 · About & Now | `about.html` | **mới** | Giới thiệu, /now, bộ đồ nghề, dòng thời gian, ảnh, Colophon, Tip Jar, số liệu |
| — | `404.html` | **mới** | Trang không tìm thấy |

Dùng chung mọi trang: header (đồng hồ Hà Nội, âm thanh mưa + quán cà phê tổng hợp bằng Web Audio, theme **Warm Cream / Parchment / Dusk**), tìm kiếm **⌘K / Ctrl+K**, RSS, footer, toast.

## Cấu trúc

```
frontend/
  index.html  journal.html  article.html  whisper-box.html  about.html  404.html
  css/
    base.css      token màu + 3 theme, reset, header/footer, component dùng chung
    home.css  journal.css  article.css  whisper.css  about.css
  js/
    api.js        lớp dữ liệu KJ.api — gọi /api, tự rơi về dữ liệu mẫu khi không có backend
    layout.js     header/footer, theme, âm thanh nền, ⌘K, toast, helper (KJ.*)
    home.js  journal.js  article.js  whisper.js  about.js
  data/
    site-content.js   NỘI DUNG DUY NHẤT: bài viết, note đã ghim, About — FE offline + seed backend + /api/about
  assets/             ảnh, logo, favicon, assets/desk/* (ảnh placeholder "Desk Surroundings")
backend/              Flask: route (Blueprint) → service → repository → SQLite
  app/                create_app, routes/, services/, repositories/, cli.py (migrate, seed, notes)
  migrations/         001_init.sql
  tests/              unittest + Flask test client
backend-cu/           lưu trữ bản cũ — không sử dụng
```

Thứ tự nạp script ở mỗi trang: `js/api.js` → `js/layout.js` → script của trang.

## Chạy

**Đầy đủ (khuyến nghị)** — backend phục vụ luôn thư mục `frontend/` cùng origin:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate                     # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
flask --app app run --port 3000 --debug   # tự tạo bảng + seed lần đầu; mở http://localhost:3000
```

**Chỉ frontend** — mở thẳng `frontend/index.html` (file://) hoặc chạy server tĩnh trong `frontend/` (`cd frontend && python -m http.server`, Live Server…).
`js/api.js` phát hiện không có API và dùng `data/site-content.js`; status bar hiện nhãn *Offline · dữ liệu mẫu*.
Reaction, lượt đọc, note gửi lúc offline chỉ lưu trong `localStorage` của trình duyệt đó. Thêm `?mock=1` để ép chế độ offline.

## Quy ước dữ liệu

- `side`: API dùng `engineering` / `life`, giao diện hiển thị Side A / Side B.
- Reaction (Màn 3): `tea`, `insight`, `calm`, `resonate`.
- Topic seal (Màn 4): `EngineeringSolitude`, `TeaAndHanoi`, `AtticMusings`, `BookMusings`.
- Note gửi lên luôn **riêng tư**; chỉ note Kiên ghim (`flask --app app notes pin <id>`) mới hiện trên Community Board / Pinboard.
- Backend trả `prev` = bài mới hơn, `next` = bài cũ hơn; `api.js` đổi tên thành `newer` / `older`.
- `localStorage` dùng tiền tố `kj.` (theme, bookmarks, reaction đã thả, nháp note, vị trí đọc…).

## Kiểm thử

```bash
cd backend
python -m unittest discover -s tests -v   # API, CLI ghim note, CORS, phục vụ frontend
```

## Còn chờ nội dung thật

- 3 ảnh "Desk Surroundings" (`frontend/assets/desk/placeholder-*.svg`) vẫn là placeholder từ FE4.
- Thông tin Tip Jar và link GitHub trong `frontend/data/site-content.js` (khối `about`) đang để trống/placeholder.
