# Blog Backend

Backend cho nền tảng blog, xây dựng bằng Express, TypeScript và PostgreSQL. API phục vụ bài viết, tag, reaction, note liên hệ và thông tin giới thiệu.

Kiến trúc chính:

```text
Route -> Controller -> Service -> Repository -> PostgreSQL
```

Project không dùng ORM. Query SQL được đặt trong repository và dùng parameterized query.

## Yêu cầu

- Node.js 20+
- pnpm hoặc npm
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

API mặc định chạy tại `http://localhost:3000/api`.

`pnpm seed` bỏ qua nếu database đã có bài viết. Dùng lệnh sau để xóa dữ liệu và tạo lại dữ liệu mẫu:

```bash
pnpm seed:reset
```

Build và chạy production:

```bash
pnpm build
pnpm start
```

## Biến môi trường

| Tên | Mặc định | Mô tả |
|---|---|---|
| `DATABASE_URL` | `postgres://blog:blog@localhost:5432/blog` | Chuỗi kết nối PostgreSQL |
| `PORT` | `3000` | Port của HTTP server |
| `CORS_ORIGIN` | `http://localhost:5173` | Origin được phép gọi API |

## API

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/posts` | Danh sách bài, hỗ trợ `side`, `tag`, `q`, `page` |
| GET | `/api/posts/top` | Bài có tổng reaction cao nhất, hỗ trợ `limit` |
| GET | `/api/posts/recent` | Bài mới nhất, hỗ trợ `limit` |
| GET | `/api/posts/:slug` | Chi tiết bài và bài trước/sau |
| POST | `/api/posts/:slug/react` | Tăng reaction với body `{ "type": "like" }` |
| POST | `/api/notes` | Tạo note với `message`, `topic` và các trường tùy chọn |
| GET | `/api/notes` | Danh sách note, hỗ trợ `topic`, `page` |
| GET | `/api/about` | Đọc nội dung từ `data/about.json` |

Các giá trị hợp lệ:

- `side`: `engineering`, `life`
- reaction: `like`, `love`, `funny`, `useful`
- `topic`: `general`, `question`, `feedback`, `collab`

Danh sách bài có 6 item/trang, danh sách note có 10 item/trang. `limit` của endpoint top/recent tối đa là 20.

Lỗi thông thường có dạng `{ "error": "..." }`. `POST /api/notes` dùng dạng `{ "ok": false, "error": "..." }`.

## Database

Migration được chạy theo thứ tự trong `database/migrations`. Bảng `schema_migrations` lưu version đã chạy, nên có thể chạy lại lệnh migrate an toàn.

Seed tạo tags, posts, liên kết post-tag, reactions và notes mẫu.

## Kiểm tra

```bash
pnpm typecheck
pnpm test:api
```

`pnpm test:api` cần server đang chạy và mặc định gọi `http://localhost:3000`. Nên chạy `pnpm seed:reset` trước smoke test để dữ liệu khớp kỳ vọng.

Tài liệu kiến trúc và hướng dẫn cho thành viên mới nằm ở [docs/PROJECT_GUIDE.md](docs/PROJECT_GUIDE.md).