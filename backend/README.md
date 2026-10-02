# Backend — Flask + SQLite

Backend của Kiên's Journal. Chỉ dùng **Flask** và **SQLite** (thư viện `sqlite3` có sẵn trong Python).

## Các file

| File | Làm gì |
|---|---|
| `app.py` | Toàn bộ API và phục vụ các trang HTML trong `../frontend` |
| `database.py` | Kết nối SQLite + các hàm `query_all`, `query_one`, `execute`, `init_db` |
| `schema.sql` | Câu lệnh tạo 2 bảng `posts` và `notes` |
| `seed.sql` | Dữ liệu mẫu: 15 bài viết, 10 bưu thiếp |
| `test_app.py` | Kiểm thử các API |
| `blog.db` | File database, **tự tạo** khi chạy lần đầu (không đưa lên git) |

## Cách chạy

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Mở trình duyệt: <http://localhost:5000>

Lần chạy đầu tiên, `init_db()` sẽ tạo file `blog.db`, tạo bảng từ `schema.sql` và nạp dữ liệu mẫu từ `seed.sql`.
Muốn làm lại database từ đầu: tắt server, **xoá file `blog.db`** rồi chạy lại `python app.py`.

Muốn xem dữ liệu trong database: mở file `blog.db` bằng phần mềm [DB Browser for SQLite](https://sqlitebrowser.org/).

## Database

**Bảng `posts`** (bài viết): `id, slug, title, excerpt, content, side, category, tags, cover, date, featured, reads, tea, insight, calm, resonate`

- `side`: `A` = Craft & Systems (kỹ thuật), `B` = Soul & Everyday (đời sống)
- `tags`: lưu chung 1 cột, cách nhau bởi dấu phẩy, vd `Rust,Go`
- `tea, insight, calm, resonate`: số lượt thả từng loại reaction

**Bảng `notes`** (bưu thiếp): `id, message, name, email, role, location, topic, post_slug, reply, pinned, created_at`

- `pinned = 0`: riêng tư, chỉ Admin thấy. `pinned = 1`: đã ghim, ai cũng thấy trên Community Board.

## API

| Method | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/api/posts` | Danh sách bài. Tham số: `side`, `category`, `tag`, `q`, `featured=1`, `sort=reads`, `page`, `per_page` |
| GET | `/api/posts/<slug>` | 1 bài viết đầy đủ + `newer` / `older` (bài mới hơn / cũ hơn) |
| POST | `/api/posts/<slug>/react` | Thả reaction, gửi `{"type": "tea"}` |
| POST | `/api/posts/<slug>/read` | Tăng lượt đọc |
| GET | `/api/categories` | Số bài của từng chủ đề |
| GET | `/api/stats` | Tổng số bài, số bài Side A / B, số bưu thiếp đã ghim |
| GET | `/api/notes` | Bưu thiếp đã ghim. Tham số: `topic`, `q`, `page`, `per_page` |
| POST | `/api/notes` | Gửi bưu thiếp: `message`, `topic`, (không bắt buộc) `name`, `email`, `location`, `post_slug` |
| GET | `/api/rss` | RSS của 20 bài mới nhất |

**API cho Admin** (phải đăng nhập trước):

| Method | Đường dẫn | Mô tả |
|---|---|---|
| POST | `/api/login` | Đăng nhập, gửi `{"password": "..."}` |
| POST | `/api/logout` | Đăng xuất |
| GET | `/api/admin/check` | Đã đăng nhập chưa |
| GET / POST | `/api/admin/posts` | Xem tất cả bài / thêm bài mới |
| PUT / DELETE | `/api/admin/posts/<id>` | Sửa / xoá bài |
| GET | `/api/admin/notes` | Xem tất cả bưu thiếp (cả chưa ghim) |
| PUT / DELETE | `/api/admin/notes/<id>` | Ghim + trả lời (`{"pinned": true, "reply": "..."}`) / xoá |

Khi có lỗi, API trả về dạng `{"error": "nội dung lỗi"}`.

## Trang Admin

Mở <http://localhost:5000/admin.html>, mật khẩu mặc định là **`admin123`**.

Khi đưa web lên mạng, nhớ đổi mật khẩu và khoá bí mật bằng biến môi trường:

```bash
set ADMIN_PASSWORD=mat-khau-moi        # macOS/Linux: export ADMIN_PASSWORD=mat-khau-moi
set SECRET_KEY=mot-chuoi-ngau-nhien-dai
python app.py
```

## Kiểm thử

```bash
cd backend
python test_app.py
```

Mỗi test dùng 1 file database tạm riêng, không ảnh hưởng tới `blog.db`.
