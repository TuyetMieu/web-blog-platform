# app.py
# Backend của blog "Kiên's Journal", viết bằng Flask + SQLite.
#
# Cách chạy:
#     pip install -r requirements.txt
#     python app.py
# Sau đó mở trình duyệt: http://localhost:5000

import math
import os
import re
import unicodedata
from datetime import date, datetime
from html import escape

from flask import Flask, jsonify, request, send_from_directory, session

from database import execute, init_db, query_all, query_one

# ================== CẤU HÌNH ==================

# Thư mục frontend (chứa HTML, CSS, JS) nằm cạnh thư mục backend
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "frontend"))

# static_url_path="" nghĩa là: /css/style.css sẽ lấy file frontend/css/style.css
app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path="")

# Khoá bí mật để Flask ký cookie đăng nhập (session). Khi đưa lên mạng nhớ đổi.
app.secret_key = os.environ.get("SECRET_KEY", "kien-journal-secret-key")

# Cookie chỉ được gửi kèm request từ chính trang web này (chống web lạ gửi request giả)
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"

# Mật khẩu vào trang Admin. Khi đưa lên mạng nhớ đổi.
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")

# Giữ nguyên chữ tiếng Việt trong JSON (không bị đổi thành à...)
app.json.ensure_ascii = False

# Các giá trị hợp lệ
SIDES = ["A", "B"]                                   # A = kỹ thuật, B = đời sống
REACTIONS = ["tea", "insight", "calm", "resonate"]  # trùng tên cột trong bảng posts
TOPICS = ["EngineeringSolitude", "TeaAndHanoi", "AtticMusings", "BookMusings"]


# ================== HÀM TIỆN ÍCH ==================

def to_int(value, default):
    """Đổi chuỗi sang số nguyên. Nếu không đổi được thì dùng giá trị mặc định."""
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def read_minutes(content):
    """Ước lượng số phút đọc: bỏ thẻ HTML, đếm số từ, chia cho 220 từ/phút."""
    text = re.sub(r"<[^>]+>", " ", content or "")
    words = len(text.split())
    minutes = round(words / 220)
    if minutes < 1:
        minutes = 1
    return minutes


def make_slug(text):
    """Tạo slug từ tiêu đề, vd: 'Mưa Hà Nội' -> 'mua-ha-noi'."""
    text = text.lower().replace("đ", "d")
    # Tách chữ có dấu thành chữ + dấu, rồi bỏ phần dấu đi
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    # Ký tự nào không phải chữ cái / chữ số thì thay bằng dấu gạch ngang
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")


def format_post(post, with_content=False):
    """Chỉnh lại 1 bài viết lấy từ database cho frontend dễ dùng."""
    # "Rust,Go" -> ["Rust", "Go"]
    if post["tags"]:
        post["tags"] = post["tags"].split(",")
    else:
        post["tags"] = []

    # 1 / 0 -> True / False
    post["featured"] = post["featured"] == 1

    post["read_minutes"] = read_minutes(post["content"])

    # Danh sách bài thì không cần gửi nội dung đầy đủ (cho nhẹ)
    if not with_content:
        del post["content"]
    return post


def count_pages(total, per_page):
    """Tính số trang. Ít nhất là 1 trang."""
    pages = math.ceil(total / per_page)
    if pages < 1:
        pages = 1
    return pages


def error(message, status=400):
    """Trả về lỗi dạng JSON: {"error": "..."}"""
    return jsonify({"error": message}), status


# ================== TRANG WEB (HTML) ==================

@app.route("/")
def home_page():
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.errorhandler(404)
def not_found(e):
    # Gọi API sai thì trả JSON, còn mở trang không có thì hiện 404.html
    if request.path.startswith("/api/"):
        return error("Không tìm thấy", 404)
    return send_from_directory(FRONTEND_DIR, "404.html"), 404


# ================== API BÀI VIẾT ==================

@app.route("/api/posts")
def get_posts():
    # Đọc bộ lọc trên URL, vd: /api/posts?side=A&category=Architecture&page=2
    side = request.args.get("side", "")
    category = request.args.get("category", "")
    tag = request.args.get("tag", "")
    keyword = request.args.get("q", "").strip()
    featured = request.args.get("featured", "")
    sort = request.args.get("sort", "recent")
    page = to_int(request.args.get("page"), 1)
    per_page = to_int(request.args.get("per_page"), 6)

    # Giữ page và per_page trong giới hạn hợp lý
    if page < 1:
        page = 1
    if per_page < 1:
        per_page = 1
    if per_page > 50:
        per_page = 50

    # Ghép câu WHERE theo từng bộ lọc.
    # "1 = 1" luôn đúng, viết vậy để phía sau chỉ việc nối thêm "AND ..."
    where = " WHERE 1 = 1"
    params = []

    if side != "":
        where += " AND side = ?"
        params.append(side)

    if category != "":
        where += " AND category = ?"
        params.append(category)

    if tag != "":
        # tags lưu dạng "Rust,Go,Kafka". Thêm dấu phẩy vào 2 đầu thành ",Rust,Go,Kafka,"
        # rồi tìm ",Go," để không bị nhầm "Go" với "Google".
        where += " AND (',' || tags || ',') LIKE ?"
        params.append("%," + tag + ",%")

    if keyword != "":
        where += " AND (title LIKE ? OR excerpt LIKE ?)"
        params.append("%" + keyword + "%")
        params.append("%" + keyword + "%")

    if featured == "1":
        where += " AND featured = 1"

    # Đếm tổng số bài khớp bộ lọc (để tính số trang)
    total = query_one("SELECT COUNT(*) AS total FROM posts" + where, params)["total"]

    # Sắp xếp: mới nhất trước, hoặc đọc nhiều nhất trước
    if sort == "reads":
        order = " ORDER BY reads DESC, date DESC"
    else:
        order = " ORDER BY date DESC, id DESC"

    # Phân trang: trang 1 bỏ qua 0 bài, trang 2 bỏ qua per_page bài...
    offset = (page - 1) * per_page
    rows = query_all(
        "SELECT * FROM posts" + where + order + " LIMIT ? OFFSET ?",
        params + [per_page, offset],
    )

    posts = []
    for row in rows:
        posts.append(format_post(row))

    return jsonify({
        "posts": posts,
        "total": total,
        "page": page,
        "total_pages": count_pages(total, per_page),
    })


@app.route("/api/posts/<slug>")
def get_post(slug):
    row = query_one("SELECT * FROM posts WHERE slug = ?", [slug])
    if row is None:
        return error("Không tìm thấy bài viết", 404)

    post = format_post(row, with_content=True)

    # Tìm bài mới hơn và bài cũ hơn để làm nút "bài trước / bài sau"
    post["newer"] = None
    post["older"] = None
    all_posts = query_all("SELECT slug, title FROM posts ORDER BY date DESC, id DESC")
    for i in range(len(all_posts)):
        if all_posts[i]["slug"] == slug:
            if i > 0:
                post["newer"] = all_posts[i - 1]
            if i < len(all_posts) - 1:
                post["older"] = all_posts[i + 1]

    return jsonify(post)


@app.route("/api/posts/<slug>/react", methods=["POST"])
def react_post(slug):
    data = request.get_json(silent=True) or {}
    reaction = data.get("type")
    if reaction not in REACTIONS:
        return error("Reaction không hợp lệ")

    post = query_one("SELECT id FROM posts WHERE slug = ?", [slug])
    if post is None:
        return error("Không tìm thấy bài viết", 404)

    # reaction chắc chắn là 1 trong 4 tên cột trong REACTIONS (đã kiểm tra ở trên),
    # nên ghép thẳng tên cột vào câu SQL là an toàn.
    execute(f"UPDATE posts SET {reaction} = {reaction} + 1 WHERE id = ?", [post["id"]])
    updated = query_one(f"SELECT {reaction} AS count FROM posts WHERE id = ?", [post["id"]])

    return jsonify({"type": reaction, "count": updated["count"]})


@app.route("/api/posts/<slug>/read", methods=["POST"])
def read_post(slug):
    post = query_one("SELECT id FROM posts WHERE slug = ?", [slug])
    if post is None:
        return error("Không tìm thấy bài viết", 404)

    execute("UPDATE posts SET reads = reads + 1 WHERE id = ?", [post["id"]])
    return jsonify({"ok": True})


@app.route("/api/categories")
def get_categories():
    # Đếm số bài của từng chủ đề, chia theo side
    rows = query_all(
        "SELECT side, category, COUNT(*) AS count FROM posts"
        " WHERE category IS NOT NULL AND category != ''"
        " GROUP BY side, category"
        " ORDER BY side, category"
    )
    return jsonify(rows)


@app.route("/api/stats")
def get_stats():
    # Vài con số cho trang chủ và trang About
    total = query_one("SELECT COUNT(*) AS n FROM posts")["n"]
    side_a = query_one("SELECT COUNT(*) AS n FROM posts WHERE side = 'A'")["n"]
    side_b = query_one("SELECT COUNT(*) AS n FROM posts WHERE side = 'B'")["n"]
    notes = query_one("SELECT COUNT(*) AS n FROM notes WHERE pinned = 1")["n"]

    return jsonify({"posts": total, "side_a": side_a, "side_b": side_b, "notes": notes})


# ================== API BƯU THIẾP ==================

@app.route("/api/notes")
def get_notes():
    topic = request.args.get("topic", "")
    keyword = request.args.get("q", "").strip()
    page = to_int(request.args.get("page"), 1)
    per_page = to_int(request.args.get("per_page"), 10)

    if page < 1:
        page = 1
    if per_page < 1:
        per_page = 1
    if per_page > 50:
        per_page = 50

    # Chỉ lấy bưu thiếp đã ghim. Bưu thiếp chưa ghim là riêng tư.
    where = " WHERE pinned = 1"
    params = []

    if topic != "":
        where += " AND topic = ?"
        params.append(topic)

    if keyword != "":
        where += " AND (message LIKE ? OR name LIKE ? OR location LIKE ?)"
        params.append("%" + keyword + "%")
        params.append("%" + keyword + "%")
        params.append("%" + keyword + "%")

    total = query_one("SELECT COUNT(*) AS total FROM notes" + where, params)["total"]

    # Không lấy cột email: email là thông tin riêng của người gửi
    offset = (page - 1) * per_page
    notes = query_all(
        "SELECT id, message, name, role, location, topic, reply, created_at FROM notes"
        + where + " ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?",
        params + [per_page, offset],
    )

    return jsonify({
        "notes": notes,
        "total": total,
        "page": page,
        "total_pages": count_pages(total, per_page),
    })


@app.route("/api/notes", methods=["POST"])
def create_note():
    data = request.get_json(silent=True) or {}

    message = str(data.get("message") or "").strip()
    name = str(data.get("name") or "").strip()
    email = str(data.get("email") or "").strip()
    location = str(data.get("location") or "").strip()
    topic = data.get("topic")
    post_slug = str(data.get("post_slug") or "").strip()

    # Kiểm tra dữ liệu
    if message == "":
        return error("Bạn chưa viết lời nhắn")
    if len(message) > 2000:
        return error("Lời nhắn dài quá (tối đa 2000 ký tự)")
    if len(name) > 100 or len(location) > 100 or len(email) > 200:
        return error("Tên, nơi ở hoặc email dài quá")
    if email != "" and "@" not in email:
        return error("Email không hợp lệ")
    if topic not in TOPICS:
        return error("Chủ đề không hợp lệ")
    if post_slug != "" and query_one("SELECT id FROM posts WHERE slug = ?", [post_slug]) is None:
        return error("Không tìm thấy bài viết", 404)

    # Bưu thiếp mới luôn là riêng tư (pinned = 0), chờ Kiên đọc trong trang Admin
    execute(
        "INSERT INTO notes (message, name, email, location, topic, post_slug, pinned) VALUES (?, ?, ?, ?, ?, ?, 0)",
        [message, name, email, location, topic, post_slug],
    )
    return jsonify({"ok": True}), 201


# ================== RSS ==================

@app.route("/api/rss")
def rss_feed():
    posts = query_all("SELECT slug, title, excerpt, date FROM posts ORDER BY date DESC, id DESC LIMIT 20")
    site_url = request.host_url  # vd: http://localhost:5000/

    xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml += '<rss version="2.0">\n<channel>\n'
    xml += "<title>Kiên's Journal</title>\n"
    xml += "<link>" + escape(site_url) + "</link>\n"
    xml += "<description>Slow essays on distributed systems, Hanoi mornings, tea and old books.</description>\n"

    for post in posts:
        link = site_url + "article.html?slug=" + post["slug"]
        # RSS cần ngày dạng: Tue, 12 Nov 2024 07:00:00 +0700
        pub_date = datetime.strptime(post["date"], "%Y-%m-%d").strftime("%a, %d %b %Y 07:00:00 +0700")

        xml += "<item>\n"
        xml += "  <title>" + escape(post["title"]) + "</title>\n"
        xml += "  <link>" + escape(link) + "</link>\n"
        xml += "  <guid>" + escape(link) + "</guid>\n"
        xml += "  <pubDate>" + pub_date + "</pubDate>\n"
        xml += "  <description>" + escape(post["excerpt"] or "") + "</description>\n"
        xml += "</item>\n"

    xml += "</channel>\n</rss>\n"
    return xml, 200, {"Content-Type": "application/rss+xml; charset=utf-8"}


# ================== ĐĂNG NHẬP ADMIN ==================

def is_admin():
    """Đã đăng nhập Admin chưa? (thông tin lưu trong session/cookie)"""
    return session.get("admin") is True


def need_login():
    return error("Bạn cần đăng nhập trang Admin", 401)


@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    if data.get("password") != ADMIN_PASSWORD:
        return error("Sai mật khẩu", 401)

    session["admin"] = True
    return jsonify({"ok": True})


@app.route("/api/logout", methods=["POST"])
def logout():
    session.pop("admin", None)
    return jsonify({"ok": True})


@app.route("/api/admin/check")
def admin_check():
    return jsonify({"admin": is_admin()})


# ================== ADMIN: QUẢN LÝ BÀI VIẾT ==================

def read_post_from_request():
    """Đọc dữ liệu bài viết admin gửi lên.
    Trả về 2 giá trị: (post, lỗi). Có lỗi thì post là None."""
    data = request.get_json(silent=True) or {}

    title = str(data.get("title") or "").strip()
    slug = make_slug(str(data.get("slug") or ""))
    side = data.get("side")
    post_date = str(data.get("date") or "").strip()

    if title == "":
        return None, "Tiêu đề không được để trống"
    if side not in SIDES:
        return None, "Side phải là A hoặc B"

    # Không nhập slug thì tự tạo từ tiêu đề
    if slug == "":
        slug = make_slug(title)
    if slug == "":
        return None, "Không tạo được slug, hãy nhập slug bằng chữ không dấu"

    # Không nhập ngày thì lấy ngày hôm nay
    if post_date == "":
        post_date = date.today().isoformat()
    try:
        datetime.strptime(post_date, "%Y-%m-%d")
    except ValueError:
        return None, "Ngày phải có dạng YYYY-MM-DD"

    # "Rust, Go , " -> "Rust,Go"
    tags = []
    for tag in str(data.get("tags") or "").split(","):
        tag = tag.strip()
        if tag != "":
            tags.append(tag)

    post = {
        "title": title,
        "slug": slug,
        "excerpt": str(data.get("excerpt") or "").strip(),
        "content": str(data.get("content") or ""),
        "side": side,
        "category": str(data.get("category") or "").strip(),
        "tags": ",".join(tags),
        "cover": str(data.get("cover") or "").strip(),
        "date": post_date,
        "featured": 1 if data.get("featured") else 0,
    }
    return post, None


@app.route("/api/admin/posts")
def admin_get_posts():
    if not is_admin():
        return need_login()

    posts = query_all("SELECT * FROM posts ORDER BY date DESC, id DESC")
    return jsonify(posts)


@app.route("/api/admin/posts", methods=["POST"])
def admin_create_post():
    if not is_admin():
        return need_login()

    post, message = read_post_from_request()
    if message:
        return error(message)

    if query_one("SELECT id FROM posts WHERE slug = ?", [post["slug"]]):
        return error("Slug này đã có bài khác dùng, hãy đổi slug")

    new_id = execute(
        "INSERT INTO posts (title, slug, excerpt, content, side, category, tags, cover, date, featured)"
        " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [post["title"], post["slug"], post["excerpt"], post["content"], post["side"],
         post["category"], post["tags"], post["cover"], post["date"], post["featured"]],
    )
    return jsonify({"ok": True, "id": new_id, "slug": post["slug"]}), 201


@app.route("/api/admin/posts/<int:post_id>", methods=["PUT"])
def admin_update_post(post_id):
    if not is_admin():
        return need_login()

    if query_one("SELECT id FROM posts WHERE id = ?", [post_id]) is None:
        return error("Không tìm thấy bài viết", 404)

    post, message = read_post_from_request()
    if message:
        return error(message)

    # Slug không được trùng với bài KHÁC
    if query_one("SELECT id FROM posts WHERE slug = ? AND id != ?", [post["slug"], post_id]):
        return error("Slug này đã có bài khác dùng, hãy đổi slug")

    execute(
        "UPDATE posts SET title = ?, slug = ?, excerpt = ?, content = ?, side = ?,"
        " category = ?, tags = ?, cover = ?, date = ?, featured = ? WHERE id = ?",
        [post["title"], post["slug"], post["excerpt"], post["content"], post["side"],
         post["category"], post["tags"], post["cover"], post["date"], post["featured"], post_id],
    )
    return jsonify({"ok": True, "slug": post["slug"]})


@app.route("/api/admin/posts/<int:post_id>", methods=["DELETE"])
def admin_delete_post(post_id):
    if not is_admin():
        return need_login()

    execute("DELETE FROM posts WHERE id = ?", [post_id])
    return jsonify({"ok": True})


# ================== ADMIN: QUẢN LÝ BƯU THIẾP ==================

@app.route("/api/admin/notes")
def admin_get_notes():
    if not is_admin():
        return need_login()

    # Bưu thiếp chưa ghim (pinned = 0) xếp lên trước để Kiên đọc
    notes = query_all("SELECT * FROM notes ORDER BY pinned ASC, id DESC")
    return jsonify(notes)


@app.route("/api/admin/notes/<int:note_id>", methods=["PUT"])
def admin_update_note(note_id):
    if not is_admin():
        return need_login()

    if query_one("SELECT id FROM notes WHERE id = ?", [note_id]) is None:
        return error("Không tìm thấy bưu thiếp", 404)

    data = request.get_json(silent=True) or {}
    pinned = 1 if data.get("pinned") else 0
    reply = str(data.get("reply") or "").strip()

    execute("UPDATE notes SET pinned = ?, reply = ? WHERE id = ?", [pinned, reply, note_id])
    return jsonify({"ok": True})


@app.route("/api/admin/notes/<int:note_id>", methods=["DELETE"])
def admin_delete_note(note_id):
    if not is_admin():
        return need_login()

    execute("DELETE FROM notes WHERE id = ?", [note_id])
    return jsonify({"ok": True})


# ================== CHẠY APP ==================

if __name__ == "__main__":
    init_db()  # tạo bảng + dữ liệu mẫu nếu chưa có
    app.run(debug=True, port=5000)
