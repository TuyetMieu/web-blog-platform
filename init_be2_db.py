import sqlite3

DB_NAME = "database.db"


def init_db():
    conn = sqlite3.connect(DB_NAME)
    cur = conn.cursor()

    # Tạo bảng posts (nếu BE1 chưa tạo) theo đúng sheet Data model
    cur.execute("""
        CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            slug TEXT UNIQUE NOT NULL,
            title TEXT,
            excerpt TEXT,
            content TEXT,
            side TEXT,
            cover TEXT,
            date TEXT
        );
    """)

    # Tạo bảng reactions của BE2 (Mỗi bài 4 dòng ứng với 4 loại reaction)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS reactions (
            post_id INTEGER NOT NULL,
            type TEXT NOT NULL,
            count INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (post_id, type),
            FOREIGN KEY (post_id) REFERENCES posts(id)
        );
    """)

    # Tạo bảng notes của BE2
    cur.execute("""
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
    """)

    # Thêm 1 bài viết mẫu (id=1, slug='bai-viet-1') để test API reaction
    cur.execute("""
        INSERT OR IGNORE INTO posts (id, slug, title, side, date)
        VALUES (1, 'bai-viet-1', 'Bài viết mẫu số 1', 'engineering', '2026-09-27');
    """)

    # Khởi tạo 4 dòng ứng với 4 loại reaction cho bài viết số 1
    for react_type in ["like", "love", "fire", "bulb"]:
        cur.execute(
            """
            INSERT OR IGNORE INTO reactions (post_id, type, count)
            VALUES (1, ?, 0);
        """,
            (react_type,),
        )

    conn.commit()
    conn.close()
    print(
        "Đã chuẩn bị xong database.db kèm bài viết mẫu 'bai-viet-1' để test B-12!"
    )


if __name__ == "__main__":
    init_db()