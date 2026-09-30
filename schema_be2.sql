-- Bảng 1 của BE2: reactions (Mỗi bài 4 dòng ứng với 4 loại reaction)
CREATE TABLE IF NOT EXISTS reactions (
    post_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (post_id, type),
    FOREIGN KEY (post_id) REFERENCES posts(id)
);

-- Bảng 2 của BE2: notes (Ghi chú của độc giả)
CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message TEXT NOT NULL,
    name TEXT,
    email TEXT,
    topic TEXT NOT NULL,
    post_id INTEGER,
    date TEXT NOT NULL,
    FOREIGN KEY (post_id) REFERENCES posts(id)
);