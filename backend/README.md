# Backend (Flask)

Backend của Kiên's Journal viết bằng **Flask thuần**: thư viện ngoài duy nhất là Flask, database là **SQLite** qua module `sqlite3` có sẵn của Python. Không ORM, không flask-cors, không dotenv. Backend phục vụ API ở `/api` và phục vụ luôn frontend tĩnh trong `../frontend`.

Bản cũ (Express + TypeScript + PostgreSQL) vẫn giữ nguyên trong `../backend-cu`, cùng contract API.

```text
Route (Blueprint) -> Service -> Repository (SQL tham số hoá) -> SQLite
```

## Cấu trúc

```text
app/
  __init__.py        create_app(): cấu hình, Blueprint, CORS, xử lý lỗi, CLI
  config.py          biến môi trường + hằng số nghiệp vụ (sides, reactions, topics, phân trang)
  db.py              kết nối SQLite theo request, hàm word_count/lower_u, chạy migration
  errors.py          ApiError + định dạng lỗi JSON, trang 404 của frontend
  validation.py      đọc/kiểm tra query & body
  content.py         đọc ../frontend/data/site-content.js (seed + /api/about)
  cli.py             lệnh flask migrate / seed / notes
  routes/            posts.py, notes.py, site.py (about, rss, frontend tĩnh)
  services/          posts.py, notes.py, feed.py
  repositories/      posts.py, notes.py
migrations/001_init.sql
tests/test_api.py    unittest + Flask test client
```

## Chạy local

Cần Python 3.10+ (SQLite ≥ 3.35, có sẵn trong các bản Python hiện nay).

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate            # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt

flask --app app run --port 3000 --debug
```

Khi khởi động, app **tự tạo bảng** (migration) và **tự nạp dữ liệu mẫu nếu database còn trống**, nên không cần chạy lệnh nào khác. Đặt `AUTO_SEED=0` để tắt tự seed (vd. khi đã có dữ liệu thật). Các lệnh `flask --app app migrate` / `seed` vẫn dùng được khi cần chạy tay.

Mở `http://localhost:3000/` (site) hoặc `http://localhost:3000/api/posts` (API).

`flask --app app seed` bỏ qua nếu đã có bài viết; `flask --app app seed --reset` xoá và seed lại. Dữ liệu mẫu lấy từ `../frontend/data/site-content.js`, cùng file mà frontend dùng ở chế độ offline, nên hai bên luôn khớp.

Chạy production: dùng một WSGI server bất kỳ trỏ tới factory `app:create_app()`, ví dụ `waitress-serve --call app:create_app` (cần cài thêm waitress).

## Biến môi trường

| Tên | Mặc định | Mô tả |
|---|---|---|
| `DATABASE_PATH` | `instance/blog.sqlite3` | File SQLite (đường dẫn tương đối tính từ `backend/`) |
| `FRONTEND_DIR` | `../frontend` | Thư mục frontend phục vụ tĩnh; đặt rỗng để tắt |
| `SITE_CONTENT_FILE` | `../frontend/data/site-content.js` | File nội dung cho seed và `/api/about` |
| `CORS_ORIGIN` | `http://localhost:5500,http://127.0.0.1:5500` | Origin được gọi `/api` khi frontend chạy ở origin khác |
| `SITE_URL` | theo request | URL công khai dùng cho link trong RSS |
| `AUTO_SEED` | `1` | Tự seed dữ liệu mẫu khi database chưa có bài viết (`0` để tắt) |

## API

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/posts` | Danh sách bài. Query: `side`, `category`, `tag`, `q`, `slugs` (a,b,c), `featured`, `sort` (`recent`\|`reads`), `page`, `per_page` (≤ 20, mặc định 6) |
| GET | `/api/posts/categories` | Số bài theo `side` + `category` |
| GET | `/api/posts/top` | Bài có tổng reaction cao nhất, hỗ trợ `limit` |
| GET | `/api/posts/recent` | Bài mới nhất, hỗ trợ `limit` |
| GET | `/api/posts/<slug>` | Chi tiết bài + `prev` (mới hơn) / `next` (cũ hơn) |
| POST | `/api/posts/<slug>/react` | Tăng reaction, body `{"type": "tea"}` |
| POST | `/api/posts/<slug>/read` | Tăng lượt đọc, trả `{"reads": n}` |
| POST | `/api/notes` | Tạo note riêng tư: `message`, `topic`, tuỳ chọn `name`, `email`, `location`, `post_slug` |
| GET | `/api/notes` | Note **đã ghim**. Query: `topic`, `q`, `page`, `per_page` (≤ 20, mặc định 10) |
| GET | `/api/about` | Khối `about` trong `site-content.js` |
| GET | `/api/rss` | RSS 2.0 của 20 bài mới nhất |

Giá trị hợp lệ:

- `side`: `engineering`, `life`
- reaction: `tea`, `insight`, `calm`, `resonate`
- `topic`: `EngineeringSolitude`, `TeaAndHanoi`, `AtticMusings`, `BookMusings`

Lỗi thông thường có dạng `{"error": "..."}`. `POST /api/notes` dùng `{"ok": false, "error": "..."}` và trả `{"ok": true}` (201) khi thành công. Tìm kiếm `q` không phân biệt hoa thường, kể cả chữ có dấu tiếng Việt.

## Đọc và ghim note

Bưu thiếp gửi lên luôn riêng tư. Kiên đọc và ghim bằng CLI:

```bash
flask --app app notes                                        # liệt kê note chưa ghim
flask --app app notes pin 12                                 # ghim lên Community Board
flask --app app notes pin 12 "Cảm ơn bạn!" "Over morning Oolong"   # ghim kèm margin note trả lời
```

## Kiểm thử

```bash
python -m unittest discover -s tests -v
```

Mỗi lần chạy tạo một file SQLite tạm, seed dữ liệu mẫu rồi kiểm tra toàn bộ endpoint, CLI ghim note, CORS và phục vụ frontend.

## Ghi chú kỹ thuật

- `word_count()` và `lower_u()` là hàm Python đăng ký vào SQLite: tính thời gian đọc từ nội dung HTML, và so khớp không phân biệt hoa thường với Unicode (LOWER của SQLite chỉ xử lý ASCII).
- Reaction tăng bằng một câu `INSERT … ON CONFLICT DO UPDATE … RETURNING` nên không mất lượt khi có request đồng thời; SQLite chạy ở chế độ WAL.
- Thêm thay đổi schema: tạo file `migrations/00N_*.sql` mới rồi chạy `flask --app app migrate`. Không sửa migration đã chạy.
