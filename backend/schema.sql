-- schema.sql: tạo các bảng cho blog
-- File này được chạy mỗi lần khởi động app (hàm init_db trong database.py).
-- Dùng "IF NOT EXISTS" nên chạy nhiều lần cũng không sao, dữ liệu cũ vẫn giữ nguyên.

-- Bảng bài viết
CREATE TABLE IF NOT EXISTS posts (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    slug      TEXT NOT NULL UNIQUE,                        -- đường dẫn của bài, vd: rain-and-solitude
    title     TEXT NOT NULL,                               -- tiêu đề
    excerpt   TEXT,                                        -- đoạn tóm tắt ngắn
    content   TEXT,                                        -- nội dung bài (viết bằng HTML)
    side      TEXT NOT NULL CHECK (side IN ('A', 'B')),    -- 'A' = kỹ thuật, 'B' = đời sống
    category  TEXT,                                        -- chủ đề, vd: Architecture
    tags      TEXT,                                        -- các tag cách nhau bởi dấu phẩy, vd: Rust,Go
    cover     TEXT,                                        -- đường dẫn ảnh bìa (có thể để trống)
    date      TEXT NOT NULL,                               -- ngày đăng, dạng YYYY-MM-DD
    featured  INTEGER DEFAULT 0,                           -- 1 = bài nổi bật, 0 = bài thường
    reads     INTEGER DEFAULT 0,                           -- số lượt đọc
    tea       INTEGER DEFAULT 0,                           -- số lượt thả 🍵
    insight   INTEGER DEFAULT 0,                           -- số lượt thả 💡
    calm      INTEGER DEFAULT 0,                           -- số lượt thả 🌿
    resonate  INTEGER DEFAULT 0                            -- số lượt thả 🤝
);

-- Bảng bưu thiếp (lời nhắn bạn đọc gửi cho Kiên)
CREATE TABLE IF NOT EXISTS notes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    message     TEXT NOT NULL,                             -- nội dung lời nhắn
    name        TEXT,                                      -- tên người gửi (không bắt buộc)
    email       TEXT,                                      -- email để Kiên trả lời riêng (không bắt buộc)
    role        TEXT,                                      -- nghề nghiệp, vd: SRE
    location    TEXT,                                      -- nơi gửi, vd: Tokyo, Japan
    topic       TEXT NOT NULL,                             -- EngineeringSolitude, TeaAndHanoi, AtticMusings, BookMusings
    post_slug   TEXT,                                      -- gửi từ bài viết nào (nếu có)
    reply       TEXT,                                      -- lời đáp của Kiên
    pinned      INTEGER DEFAULT 0,                         -- 0 = riêng tư, 1 = đã ghim lên bảng (ai cũng thấy)
    created_at  TEXT DEFAULT (date('now'))                 -- ngày gửi, dạng YYYY-MM-DD
);
