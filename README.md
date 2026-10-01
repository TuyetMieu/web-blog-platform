# Kiên's Journal — Home & Desk View (FE3)

Trang Home & Desk View (Màn 2) của Kiên's Journal: hiển thị không gian làm việc, bài viết nổi bật, các bài viết gần đây và khu vực gửi Quick Note.

Phụ trách: Nguyễn Đinh Huyền Mai (FE3)

---

## 1. Tổng quan

FE3 phụ trách phần Màn 2 — Home & Desk View, bao gồm giao diện, hiển thị dữ liệu từ API và xử lý các trạng thái khi dữ liệu không đầy đủ hoặc không hợp lệ.

### Phạm vi đã thực hiện

- Khối A Quiet Desk, A Living System
  - Laptop
  - Cốc trà
  - Ảnh
  - Currently Reading
  - From the Mailbox
- Khối Hall of Fame
  - Hiển thị 2 bài viết nổi bật
- Khối Recent Leaves
  - Hiển thị 4 bài viết mới nhất
- Khối Quick Note
  - Liên kết tới Whisper Box để gửi note nhanh

---

## 2. Cấu trúc thư mục

frontend/
├── desk-home.html
├── css/
│   └── desk-home.css
└── js/
    └── desk-home.js

### Các file FE3

| File | Chức năng |
|------|-----------|
| frontend/desk-home.html | Cấu trúc giao diện Home & Desk View |
| frontend/css/desk-home.css | Style và layout riêng của Màn 2 |
| frontend/js/desk-home.js | Logic hiển thị dữ liệu và kết nối API |

Các file backend và các màn hình của FE khác thuộc phạm vi chung của project và được giữ nguyên.

---

## 3. Cách chạy để test

FE3 sử dụng backend Flask của project.

Mở Terminal tại thư mục project:

cd backend
python -m flask --app app run --port 3000

Sau khi server chạy, mở trình duyệt:

http://127.0.0.1:3000/desk-home.html

---

## 4. Kết nối API

Màn 2 sử dụng API của project để lấy dữ liệu bài viết.

### Hall of Fame

GET /api/posts/top?limit=2

Dùng để lấy tối đa 2 bài viết nổi bật.

### Recent Leaves

GET /api/posts/recent?limit=4

Dùng để lấy tối đa 4 bài viết mới nhất.

### Quick Note

Quick Note trên Home & Desk View dẫn tới:

whisper-box.html

để người dùng gửi note thông qua Whisper Box.

---

## 5. Hiển thị dữ liệu

### Hall of Fame

Khi API trả về dữ liệu:

- Hiển thị tối đa 2 bài viết.
- Hiển thị thông tin bài viết theo dữ liệu nhận được.
- Nội dung dài được xử lý để không làm vỡ layout.

Khi không có dữ liệu:

- Hiển thị trạng thái không có bài viết nổi bật.

Khi API xảy ra lỗi:

- Hiển thị trạng thái lỗi thay vì để khu vực bị trống.

### Recent Leaves

Khi API trả về dữ liệu:

- Hiển thị tối đa 4 bài viết mới nhất.
- Hiển thị thông tin bài viết theo dữ liệu nhận được.
- Nội dung dài được xử lý để giữ layout ổn định.

Khi không có dữ liệu:

- Hiển thị trạng thái không có bài viết gần đây.

Khi API xảy ra lỗi:

- Hiển thị trạng thái lỗi thay vì để khu vực bị trống.

---

## 6. Xử lý các trường hợp đặc biệt

FE3 có xử lý các trường hợp dữ liệu không đầy đủ hoặc không hợp lệ:

- Không có dữ liệu từ API.
- API trả về ít dữ liệu hơn số lượng mong muốn.
- API xảy ra lỗi.
- Nội dung text quá dài.
- Hình ảnh bị lỗi hoặc không tải được.

Mục tiêu là khi dữ liệu không đúng hoặc không đầy đủ, giao diện vẫn giữ được cấu trúc và không bị vỡ layout.

---

## 7. Quick Note

Khu vực Quick Note trên Home & Desk View cung cấp đường dẫn:

Leave a Quick Note →

Khi người dùng nhấn vào, trang sẽ chuyển tới:

whisper-box.html

Whisper Box là màn hình phụ trách việc nhập và gửi note.

---

## 8. Kiểm tra thủ công

Các chức năng chính cần kiểm tra:

### Home & Desk View

- Trang tải thành công.
- Laptop, cốc trà và ảnh hiển thị đúng.
- Currently Reading hiển thị đúng.
- From the Mailbox hiển thị đúng.
- Hall of Fame hiển thị tối đa 2 bài.
- Recent Leaves hiển thị tối đa 4 bài.
- Quick Note có thể chuyển tới Whisper Box.

### Trường hợp dữ liệu

- Không có bài viết.
- Có ít bài viết hơn số lượng yêu cầu.
- Nội dung bài viết dài.
- API không phản hồi.
- Hình ảnh bị lỗi.

---

## 9. Phạm vi của FE3

FE3 tập trung vào:

Màn 2 — Home & Desk View

Các màn hình khác và phần backend là thành phần dùng chung của project/team, không thuộc phạm vi chỉnh sửa của FE3.