# Project Guide

Tài liệu này giải thích cách backend blog được tổ chức và cách thành viên mới làm việc với project.

## 1. Mục tiêu của backend

Backend cung cấp HTTP API cho frontend blog. Các nhóm chức năng hiện có:

- Đọc danh sách bài viết theo trang.
- Lọc bài theo `side`, tag hoặc từ khóa.
- Xem bài viết chi tiết và điều hướng bài trước/sau.
- Xếp hạng bài theo tổng reaction / lượt đọc và lấy bài mới nhất.
- Tăng reaction và lượt đọc cho bài viết.
- Nhận note bưu thiếp (riêng tư) và liệt kê note đã được ghim.
- Cung cấp dữ liệu giới thiệu và RSS.
- Phục vụ frontend tĩnh ở `../frontend`.

## 2. Cấu trúc thư mục

```text
src/
  app.ts                 Khởi tạo Express, middleware và route
  server.ts              Đọc config và mở HTTP server
  config/                Environment, constant và kết nối database
  controllers/           Nhận request, validate input và trả response
  dto/                   Kiểu dữ liệu response dùng cho API
  middleware/            Xử lý lỗi và route không tồn tại
  repositories/          Query PostgreSQL
  routes/                Khai báo endpoint
  schemas/               Schema validation bằng Zod
  services/              Business logic
  utils/                 Helper dùng chung

database/
  migrations/             Migration SQL theo thứ tự version
  migrate.ts              Chạy migration chưa áp dụng
  seed/seed.ts            Tạo dữ liệu mẫu từ ../frontend/data/site-content.js
  notes.ts                CLI đọc/ghim note (pnpm notes)
test/api.smoke.ts         Smoke test API

../frontend/data/site-content.js   Nội dung dùng chung với frontend (seed + /api/about)
```

## 3. Luồng xử lý request

Một request nên đi qua các lớp theo thứ tự sau:

1. **Route** ánh xạ HTTP method và path tới controller.
2. **Controller** đọc `params`, `query` hoặc `body`, sau đó validate bằng schema.
3. **Service** xử lý quy tắc nghiệp vụ và phối hợp nhiều repository nếu cần.
4. **Repository** thực hiện SQL parameterized query.
5. **Controller** trả DTO hoặc lỗi cho client.

Ví dụ với `GET /api/posts/:slug`:

```text
post.routes
  -> postController.detail
  -> slugParamSchema
  -> postService.getPostBySlug
  -> postRepository + tagRepository + reactionRepository
  -> JSON response
```

Không đặt SQL trong controller hoặc service. Không đưa quy tắc nghiệp vụ phức tạp vào route.

## 4. Database và migration

Các bảng chính:

- `posts`: nội dung bài viết và metadata.
- `tags`: danh sách tag.
- `post_tags`: quan hệ nhiều-nhiều giữa bài viết và tag.
- `reactions`: số lượng reaction theo bài và loại reaction.
- `notes`: note liên hệ, có thể gắn với một bài viết.
- `schema_migrations`: version migration đã chạy.

Khi thay đổi schema:

1. Tạo file migration mới với số thứ tự tiếp theo trong `database/migrations`.
2. Viết SQL có thể chạy trên database hiện tại.
3. Chạy `pnpm migrate`.
4. Cập nhật repository và schema liên quan.
5. Chạy typecheck và smoke test.

Không sửa migration đã chạy trên môi trường dùng chung. Nếu cần thay đổi, tạo migration mới.

## 5. Validation và response

Schema Zod nằm trong `src/schemas`. Mọi dữ liệu từ client cần được validate trước khi truyền vào service.

Giá trị nghiệp vụ tập trung ở `src/config/constants.ts`:

- `SIDES`: `engineering`, `life`.
- `REACTION_TYPES`: `tea`, `insight`, `calm`, `resonate`.
- `NOTE_TOPICS`: `EngineeringSolitude`, `TeaAndHanoi`, `AtticMusings`, `BookMusings`.
- `POST_SORTS`: `recent`, `reads`.
- Pagination: mặc định 6 posts/trang và 10 notes/trang, client chỉnh bằng `per_page` (tối đa 20).

Response lỗi thông thường:

```json
{ "error": "Post not found" }
```

`POST /api/notes` giữ format riêng để frontend dễ xử lý:

```json
{ "ok": false, "error": "Message is required" }
```

Endpoint này trả `{ "ok": true }` với status `201` khi tạo thành công.

## 6. Quy tắc dữ liệu quan trọng

### Bài viết

Danh sách bài được sắp xếp theo `date DESC, id DESC`. `prev` là bài mới hơn và `next` là bài cũ hơn theo cùng thứ tự.

### Tìm kiếm

Tham số `q` của bài viết tìm trong `title` và `excerpt`; của note tìm trong `message`, `name`, `location` — đều bằng `ILIKE`. Ký tự đặc biệt của pattern được escape trong `src/utils/pagination.ts`.

### Reaction

Reaction được cập nhật bằng PostgreSQL upsert. Constraint duy nhất trên cặp `(post_id, type)` bảo đảm mỗi loại reaction chỉ có một dòng cho một bài. Phần tăng count nằm trong một câu SQL để tránh lost update khi có request đồng thời.

### Note

`email` và `post_id` được lưu nội bộ nhưng không trả ra từ endpoint `GET /api/notes`. Nếu note có `post_slug`, service phải xác nhận bài viết tồn tại trước khi insert.

Note mới luôn có `pinned = false` (riêng tư). `GET /api/notes` chỉ trả note `pinned = true`; ghim bằng `pnpm notes pin <id>`.

## 7. Quy trình phát triển

```bash
pnpm install
cp .env.example .env
pnpm migrate
pnpm seed
pnpm dev
```

Trong một terminal khác:

```bash
pnpm typecheck
pnpm test:api
```

Khi debug một endpoint, kiểm tra theo thứ tự:

1. Route có mount đúng prefix trong `src/app.ts` không.
2. Schema có nhận đúng input không.
3. Service có xử lý đúng quy tắc nghiệp vụ không.
4. Repository có query đúng và parameterized không.
5. Database đã chạy đủ migration và có dữ liệu cần thiết chưa.

## 8. Thêm endpoint mới

1. Tạo hoặc cập nhật schema trong `src/schemas`.
2. Thêm query vào repository phù hợp.
3. Thêm business logic vào service.
4. Thêm controller bọc bằng `asyncHandler`.
5. Đăng ký route.
6. Cập nhật README và tài liệu API nếu contract thay đổi.
7. Bổ sung smoke test hoặc test tương ứng.

Giữ public response ổn định. Nếu phải đổi field hoặc status code, cần thống nhất với frontend trước.

## 9. Quy ước code

- Dùng TypeScript strict theo `tsconfig.json`.
- Dùng parameterized query, không nối input người dùng trực tiếp vào SQL.
- Giữ controller mỏng và service dễ kiểm thử.
- Dùng tên biến mô tả rõ ý nghĩa, tránh viết tắt không cần thiết.
- Không commit file `.env` hoặc secret.
- Không sửa migration cũ đã được áp dụng trên môi trường chung.
- Sau mỗi thay đổi chạy tối thiểu `pnpm typecheck`; thay đổi API hoặc database cần chạy thêm smoke test.
