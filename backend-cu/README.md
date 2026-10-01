# Blog Backend

Backend cho Kiên's Journal, xây dựng bằng Express, TypeScript và PostgreSQL. API phục vụ bài viết, tag, reaction, lượt đọc, note bưu thiếp, RSS và thông tin giới thiệu; đồng thời phục vụ frontend tĩnh ở `../frontend`.

Kiến trúc chính:

```text
Route -> Controller -> Service -> Repository -> PostgreSQL
```

Project không dùng ORM. Query SQL được đặt trong repository và dùng parameterized query.

## Yêu cầu

- Node.js 20+
- pnpm 10+ (hoặc `npx pnpm@10`)
- PostgreSQL 16, có thể chạy bằng Docker

## Cài đặt và chạy local

```bash
cp .env.example .env
pnpm install
docker compose up -d
pnpm migrate
pnpm seed
pnpm dev
```

- Site: `http://localhost:3000/` (frontend trong `../frontend`)
- API: `http://localhost:3000/api`

Dữ liệu mẫu lấy từ `../frontend/data/site-content.js` — cùng file mà frontend dùng ở chế độ offline, nên hai bên luôn khớp. `pnpm seed` bỏ qua nếu database đã có bài viết; `pnpm seed:reset` xoá dữ liệu và seed lại.

Build và chạy production:

```bash
pnpm build
pnpm start
```

## Biến môi trường

| Tên | Mặc định | Mô tả |
|---|---|---|
| `DATABASE_URL` | — (bắt buộc) | Chuỗi kết nối PostgreSQL |
| `PORT` | `3000` | Port của HTTP server |
| `CORS_ORIGIN` | `http://localhost:5173` | Origin được phép gọi `/api` khi frontend chạy ở origin khác (phân tách bằng dấu phẩy) |
| `FRONTEND_DIR` | `../frontend` | Thư mục frontend được phục vụ tĩnh; đặt rỗng để tắt |
| `SITE_URL` | theo request | URL công khai dùng trong link RSS |
| `SITE_CONTENT_FILE` | `../frontend/data/site-content.js` | File nội dung dùng cho seed và `/api/about` |

## API

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/posts` | Danh sách bài. Query: `side`, `category`, `tag`, `q`, `slugs` (a,b,c), `featured`, `sort` (`recent`\|`reads`), `page`, `per_page` (≤ 20, mặc định 6) |
| GET | `/api/posts/categories` | Số bài theo `side` + `category` |
| GET | `/api/posts/top` | Bài có tổng reaction cao nhất, hỗ trợ `limit` |
| GET | `/api/posts/recent` | Bài mới nhất, hỗ trợ `limit` |
| GET | `/api/posts/:slug` | Chi tiết bài + `prev` (mới hơn) / `next` (cũ hơn) |
| POST | `/api/posts/:slug/react` | Tăng reaction, body `{ "type": "tea" }` |
| POST | `/api/posts/:slug/read` | Tăng lượt đọc, trả `{ reads }` |
| POST | `/api/notes` | Tạo note (riêng tư): `message`, `topic`, tuỳ chọn `name`, `email`, `location`, `post_slug` |
| GET | `/api/notes` | Note **đã ghim**. Query: `topic`, `q`, `page`, `per_page` (≤ 20, mặc định 10) |
| GET | `/api/about` | Khối `about` trong `../frontend/data/site-content.js` |
| GET | `/api/rss` | RSS 2.0 của 20 bài mới nhất |

Các giá trị hợp lệ:

- `side`: `engineering`, `life`
- reaction: `tea`, `insight`, `calm`, `resonate`
- `topic`: `EngineeringSolitude`, `TeaAndHanoi`, `AtticMusings`, `BookMusings`

Mỗi item bài viết có: `slug, title, excerpt, side, category, tags, cover, date, featured, reads, read_minutes, note_count, reactions, extra`. Danh sách trả thêm `total, total_pages, page, per_page`.

Lỗi thông thường có dạng `{ "error": "..." }`. `POST /api/notes` dùng dạng `{ "ok": false, "error": "..." }` và trả `{ "ok": true }` (201) khi thành công.

## Đọc và ghim note

Bưu thiếp gửi lên luôn ở trạng thái riêng tư. Kiên đọc và ghim bằng CLI (không có trang admin công khai):

```bash
pnpm notes                                         # liệt kê note chưa ghim
pnpm notes pin 12                                  # ghim lên Community Board
pnpm notes pin 12 "Cảm ơn bạn!" "Over morning Oolong"   # ghim kèm margin note trả lời
```

## Database

Migration được chạy theo thứ tự trong `database/migrations`. Bảng `schema_migrations` lưu version đã chạy, nên có thể chạy lại lệnh migrate an toàn. Migration `007_align_with_design.sql` nâng cấp database cũ: đổi reaction `like/useful/love/funny` → `tea/insight/calm/resonate`, topic `general/question/feedback/collab` → 4 topic seal, thêm cột mới và giữ note cũ ở trạng thái công khai.

## Kiểm tra

```bash
pnpm typecheck
pnpm test:api
```

`pnpm test:api` cần server đang chạy và mặc định gọi `http://localhost:3000` (đổi bằng `API_URL`). Chạy `pnpm seed:reset` trước để dữ liệu khớp kỳ vọng.

Tài liệu kiến trúc và hướng dẫn cho thành viên mới nằm ở [docs/PROJECT_GUIDE.md](docs/PROJECT_GUIDE.md).
