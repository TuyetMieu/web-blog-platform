# Kiên's Journal — Article (FE2)

Trang đọc bài viết (Màn 3 · Article) của Kiên's Journal: đọc bài, đổi theme / cỡ chữ, mục lục, thả reaction và gửi "Whisper Note".

## Cấu trúc thư mục

```
.
├── index.html          # Chuyển hướng sang article.html (giữ nguyên ?query và #hash)
├── article.html        # Trang bài viết
├── assets/             # Icon SVG, logo, ảnh đại diện (PNG)
├── css/
│   └── article.css     # Toàn bộ style của trang (3 theme: cream, parchment, charcoal)
├── data/
│   └── mock-posts.js   # Dữ liệu mẫu khi chưa có backend
└── js/
    └── article.js      # Logic trang: tải bài, render, reaction, gửi note, tuỳ chỉnh đọc
```

> Đường dẫn ảnh trong `css/article.css` dùng `../assets/...`; trong HTML và dữ liệu dùng `assets/...` (tính từ thư mục gốc).

## Chạy thử

Không cần build. Mở trực tiếp `index.html` / `article.html` trên trình duyệt, hoặc chạy một static server:

```bash
npx serve .
# hoặc
python -m http.server 8000
```

Chọn bài qua query `slug`, ví dụ:

```
article.html?slug=designing-software-with-warmth
article.html?slug=small-unix-utilities
article.html?slug=rain-and-solitude
```

Không truyền `slug` thì dùng bài mặc định (`window.MOCK_DEFAULT_SLUG`).

## Dữ liệu mẫu và API

Trong `js/article.js`, cờ `USE_API = false` → luôn dùng dữ liệu từ `data/mock-posts.js`. Trang cũng tự dùng dữ liệu mẫu khi mở bằng `file://` hoặc khi có `?mock=1`.

Khi có backend, đổi `USE_API = true`. Các endpoint (gốc `API_BASE = '/api'`):

| Method | Endpoint                        | Body                          | Trả về                                   |
| ------ | ------------------------------- | ----------------------------- | ---------------------------------------- |
| GET    | `/api/posts/<slug>`             | —                             | Bài viết (cấu trúc như `mock-posts.js`)  |
| POST   | `/api/posts/<slug>/reactions`   | `{ type }`                    | `{ reactions }`                          |
| POST   | `/api/posts/<slug>/notes`       | `{ message, name, email }`    | 2xx nếu thành công                       |

## Lưu trữ phía trình duyệt

Các tuỳ chọn của người đọc (theme, cỡ chữ, …) lưu trong `localStorage` với tiền tố `kj.`.
