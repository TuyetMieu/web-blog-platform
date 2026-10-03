import os
import sqlite3

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DB_PATH = os.path.join(BASE_DIR, "blog.db")


# Mở kết nối tới file SQLite, lấy dữ liệu theo tên cột (row["title"])
def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


# Chạy câu SELECT và trả về danh sách các dòng (mỗi dòng là 1 dict)
def query_all(sql, params=()):
    conn = get_connection()
    rows = conn.execute(sql, params).fetchall()
    conn.close()

    result = []
    for row in rows:
        result.append(dict(row))
    return result


# Chạy câu SELECT và trả về 1 dòng (dict), hoặc None nếu không tìm thấy
def query_one(sql, params=()):
    conn = get_connection()
    row = conn.execute(sql, params).fetchone()
    conn.close()

    if row is None:
        return None
    return dict(row)


# Chạy câu INSERT / UPDATE / DELETE, lưu lại và trả về id của dòng vừa thêm
def execute(sql, params=()):
    conn = get_connection()
    cursor = conn.execute(sql, params)
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()
    return new_id


# Đọc 1 file .sql trong thư mục backend và chạy toàn bộ câu lệnh trong đó
def run_sql_file(conn, file_name):
    path = os.path.join(BASE_DIR, file_name)
    with open(path, encoding="utf-8") as f:
        conn.executescript(f.read())


# Tạo bảng (nếu chưa có) và nạp dữ liệu mẫu (nếu bảng posts còn trống)
def init_db():
    conn = get_connection()

    run_sql_file(conn, "schema.sql")

    count = conn.execute("SELECT COUNT(*) FROM posts").fetchone()[0]
    if count == 0:
        run_sql_file(conn, "seed.sql")
        print("Da nap du lieu mau tu seed.sql")

    conn.commit()
    conn.close()


if __name__ == "__main__":
    init_db()
    print("Database da san sang:", DB_PATH)
