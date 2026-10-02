# database.py
# Các hàm làm việc với database SQLite.
# Dùng thư viện sqlite3 có sẵn trong Python, không cần cài thêm gì.

import os
import sqlite3

# Thư mục chứa file này (chính là thư mục backend)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Đường dẫn tới file database. Nếu chưa có, sqlite3 sẽ tự tạo file mới.
DB_PATH = os.path.join(BASE_DIR, "blog.db")


def get_connection():
    """Mở kết nối tới file SQLite."""
    conn = sqlite3.connect(DB_PATH)
    # Dòng này giúp lấy dữ liệu theo tên cột: row["title"] thay vì row[2]
    conn.row_factory = sqlite3.Row
    return conn


def query_all(sql, params=()):
    """Chạy câu SELECT và trả về danh sách các dòng (mỗi dòng là 1 dict)."""
    conn = get_connection()
    rows = conn.execute(sql, params).fetchall()
    conn.close()

    result = []
    for row in rows:
        result.append(dict(row))
    return result


def query_one(sql, params=()):
    """Chạy câu SELECT và trả về 1 dòng (dict), hoặc None nếu không tìm thấy."""
    conn = get_connection()
    row = conn.execute(sql, params).fetchone()
    conn.close()

    if row is None:
        return None
    return dict(row)


def execute(sql, params=()):
    """Chạy câu INSERT / UPDATE / DELETE rồi lưu lại (commit).
    Trả về id của dòng vừa thêm (chỉ có ý nghĩa với INSERT)."""
    conn = get_connection()
    cursor = conn.execute(sql, params)
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()
    return new_id


def run_sql_file(conn, file_name):
    """Đọc 1 file .sql trong thư mục backend và chạy toàn bộ câu lệnh trong đó."""
    path = os.path.join(BASE_DIR, file_name)
    with open(path, encoding="utf-8") as f:
        conn.executescript(f.read())


def init_db():
    """Tạo bảng (nếu chưa có) và nạp dữ liệu mẫu (nếu bảng posts còn trống)."""
    conn = get_connection()

    # Bước 1: tạo bảng
    run_sql_file(conn, "schema.sql")

    # Bước 2: nếu chưa có bài viết nào thì nạp dữ liệu mẫu
    count = conn.execute("SELECT COUNT(*) FROM posts").fetchone()[0]
    if count == 0:
        run_sql_file(conn, "seed.sql")
        print("Da nap du lieu mau tu seed.sql")

    conn.commit()
    conn.close()


# Chạy riêng file này (python database.py) để tạo database mà không cần bật web.
# (print viết không dấu để không lỗi font trên cửa sổ CMD của Windows)
if __name__ == "__main__":
    init_db()
    print("Database da san sang:", DB_PATH)
