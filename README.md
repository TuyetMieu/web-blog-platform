# Kiên's Journal — web-blog-platform

Blog cá nhân "hai mặt": **Side A** (Craft & Systems — kỹ thuật) và **Side B** (Soul & Everyday — đời sống).

- `frontend/` — HTML, CSS, JavaScript thuần (không framework, không cần build).
- `backend/` — Python **Flask** + **SQLite**. Xem [backend/README.md](backend/README.md).
- `backend-cu/` — bản Express/PostgreSQL cũ, chỉ lưu trữ, **không sử dụng**.

## Chạy web

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Mở <http://localhost:5000>. Backend phục vụ luôn các trang trong `frontend/`, nên **phải bật backend** thì web mới có dữ liệu
(mở thẳng file HTML bằng cách nháy đúp sẽ báo "Không kết nối được server").

## Các trang

| Trang | File | Chức năng |
|---|---|---|
| Trang chủ | `index.html` | Giới thiệu, bài nổi bật, 4 bài mới (lọc Side A/B), 3 bưu thiếp đã ghim |
| Nhật ký | `journal.html` | Chọn Side A/B, lọc theo chủ đề / tag, tìm kiếm, sắp xếp, phân trang |
| Đọc bài | `article.html?slug=...` | Nội dung bài, thanh tiến độ đọc, thả reaction, gửi lời nhắn, bài trước/sau |
| Hộp thư | `whisper-box.html` | Gửi bưu thiếp, bảng ghim (lọc chủ đề, tìm kiếm, xem thêm) |
| Giới thiệu | `about.html` | Thông tin về Kiên + số liệu lấy từ database |
| Quản trị | `admin.html` | Đăng nhập, viết / sửa / xoá bài, ghim / trả lời / xoá bưu thiếp |
| 404 | `404.html` | Trang không tìm thấy |

Mọi trang đều có nút đổi giao diện sáng / tối (lưu lựa chọn trong trình duyệt) và nút bật tiếng mưa.

## Hiệu ứng

- Chuyển trang: nội dung trượt ngang như lật trang, header đứng yên; đi lùi trong menu thì trượt ngược lại (Chrome / Edge).
- Đổi sáng / tối: giao diện mới lan ra thành vòng tròn từ chỗ bấm.
- Nội dung hiện dần khi cuộn tới, ảnh hiện dần khi tải xong, khung chờ tải nhấp nháy.
- Nút: nhấc lên khi rê chuột, nhấn xuống, gợn sóng khi bấm. Menu, bộ lọc, Side A/B có nền trượt theo nút đang chọn.
- Card nhấc nhẹ, giấy note dựng thẳng khi rê chuột; header đổ bóng khi cuộn; nút lên đầu trang.
- Toast thông báo, reaction nảy lên, con tem "đóng dấu" khi gửi bưu thiếp, tiếng mưa tạo bằng Web Audio.
- Người dùng bật "giảm chuyển động" trong hệ điều hành thì tắt hết hiệu ứng.

## Cấu trúc thư mục

```
backend/
  app.py          các API + phục vụ trang web
  database.py     làm việc với SQLite
  schema.sql      tạo bảng
  seed.sql        dữ liệu mẫu
  test_app.py     kiểm thử
  blog.db         database (tự tạo khi chạy)
frontend/
  *.html          các trang
  css/style.css   giao diện (màu, bố cục)
  css/effects.css hiệu ứng chuyển động
  js/common.js    hàm dùng chung: callApi, escapeHtml, formatDate, showToast, nút sáng/tối...
  js/effects.js   hiệu ứng: chuyển trang, hiện dần, gợn sóng, nền trượt, tiếng mưa...
  js/home.js  journal.js  article.js  whisper.js  about.js  admin.js   (mỗi trang 1 file)
  assets/         ảnh, logo, favicon
```

Mỗi trang nạp `js/effects.js` trong `<head>`, rồi cuối trang nạp `js/common.js` và file JS của trang đó.

## Ghi chú

- Bưu thiếp bạn đọc gửi lên luôn **riêng tư**. Chỉ khi Kiên bấm "Ghim lên bảng" trong trang Admin thì mới hiện công khai.
- Reaction: mỗi trình duyệt chỉ thả được 1 lần cho mỗi loại (ghi nhớ bằng `localStorage`).
- Còn chờ nội dung thật: 3 ảnh "Desk Surroundings" (`frontend/assets/desk/placeholder-*.svg`), thông tin Tip Jar và link GitHub trong `about.html`.
