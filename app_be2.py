from datetime import datetime
import json
import math
import os
import re
import sqlite3
from flask import Flask, jsonify, request

app = Flask(__name__)
DB_NAME = "database.db"
EMAIL_REGEX = r"^[\w\.-]+@[\w\.-]+\.\w+$"


def get_db():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return response


# =====================================================================
# NHIỆM VỤ B-12: API Reaction
# POST /api/posts/<slug>/react {type} -> {type, count}
# =====================================================================
@app.post("/api/posts/<slug>/react")
def react_to_post(slug):
    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"ok": False, "error": "Body không phải JSON hợp lệ"}), 400

    react_type = (data.get("type") or "").strip()
    if not react_type:
        return jsonify({"ok": False, "error": "Thiếu trường type"}), 400

    conn = get_db()
    cur = conn.cursor()

    cur.execute("SELECT id FROM posts WHERE slug = ?", (slug,))
    post = cur.fetchone()
    if post is None:
        conn.close()
        return jsonify({"ok": False, "error": "Không tìm thấy bài viết"}), 404

    post_id = post["id"]

    cur.execute(
        "SELECT count FROM reactions WHERE post_id = ? AND type = ?",
        (post_id, react_type),
    )
    row = cur.fetchone()

    if row is not None:
        new_count = row["count"] + 1
        cur.execute(
            "UPDATE reactions SET count = ? WHERE post_id = ? AND type = ?",
            (new_count, post_id, react_type),
        )
    else:
        new_count = 1
        cur.execute(
            "INSERT INTO reactions (post_id, type, count) VALUES (?, ?, 1)",
            (post_id, react_type),
        )

    conn.commit()
    conn.close()
    return jsonify({"type": react_type, "count": new_count}), 200


# =====================================================================
# NHIỆM VỤ B-13: API gửi Note
# POST /api/notes {message, name?, email?, topic, post_slug?}
# Trả về: {ok:true} hoặc {ok:false, error:'...'}
# =====================================================================
@app.post("/api/notes")
def create_note():
    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"ok": False, "error": "Dữ liệu gửi lên phải là JSON"}), 400

    message = (data.get("message") or "").strip()
    name = (data.get("name") or "").strip() or None
    email = (data.get("email") or "").strip() or None
    topic = (data.get("topic") or "").strip()
    post_slug = (data.get("post_slug") or "").strip()

    if not message:
        return jsonify({"ok": False, "error": "Nội dung ghi chú không được để trống"}), 400

    if not topic:
        return jsonify({"ok": False, "error": "Vui lòng chọn chủ đề (topic)"}), 400

    if email and not re.match(EMAIL_REGEX, email):
        return jsonify({"ok": False, "error": "Email không đúng định dạng"}), 400

    conn = get_db()
    cur = conn.cursor()

    post_id = None
    if post_slug:
        cur.execute("SELECT id FROM posts WHERE slug = ?", (post_slug,))
        post = cur.fetchone()
        if post is not None:
            post_id = post["id"]

    today_str = datetime.now().strftime("%Y-%m-%d")

    cur.execute(
        """
        INSERT INTO notes (message, name, email, topic, post_id, date)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (message, name, email, topic, post_id, today_str),
    )
    conn.commit()
    conn.close()

    return jsonify({"ok": True}), 201


# =====================================================================
# NHIỆM VỤ B-14: API xem Note
# GET /api/notes?topic=...&page=...
# Trả về: {total_pages, notes:[{message, name, topic, date}]}
# =====================================================================
@app.get("/api/notes")
def get_notes():
    topic = request.args.get("topic", "").strip()
    try:
        page = int(request.args.get("page", 1))
        if page < 1:
            page = 1
    except ValueError:
        page = 1

    per_page = 5
    offset = (page - 1) * per_page

    conn = get_db()
    cur = conn.cursor()

    if topic and topic != "all":
        cur.execute("SELECT COUNT(*) FROM notes WHERE topic = ?", (topic,))
        total_notes = cur.fetchone()[0]

        cur.execute(
            """
            SELECT message, COALESCE(name, 'Ẩn danh') AS name, topic, date
            FROM notes
            WHERE topic = ?
            ORDER BY date DESC, id DESC
            LIMIT ? OFFSET ?
            """,
            (topic, per_page, offset),
        )
    else:
        cur.execute("SELECT COUNT(*) FROM notes")
        total_notes = cur.fetchone()[0]

        cur.execute(
            """
            SELECT message, COALESCE(name, 'Ẩn danh') AS name, topic, date
            FROM notes
            ORDER BY date DESC, id DESC
            LIMIT ? OFFSET ?
            """,
            (per_page, offset),
        )

    rows = [dict(row) for row in cur.fetchall()]
    conn.close()

    total_pages = max(math.ceil(total_notes / per_page), 1)

    return jsonify({
        "total_pages": total_pages,
        "notes": rows
    }), 200


# =====================================================================
# NHIỆM VỤ B-15: API About
# GET /api/about -> Đọc file data/about.json trả về
# =====================================================================
@app.get("/api/about")
def get_about():
    # Xác định đường dẫn tới file data/about.json
    about_path = os.path.join(os.path.dirname(__file__), "data", "about.json")

    if not os.path.exists(about_path):
        return jsonify({"ok": False, "error": "Không tìm thấy file data/about.json"}), 404

    # Mở file với bảng mã UTF-8 để giữ nguyên dấu tiếng Việt
    with open(about_path, "r", encoding="utf-8") as f:
        about_data = json.load(f)

    return jsonify(about_data), 200


if __name__ == "__main__":
    app.run(port=3000, debug=True)