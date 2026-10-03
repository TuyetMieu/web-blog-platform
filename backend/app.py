import math
import os
import re
import unicodedata
from datetime import date, datetime
from html import escape

from flask import Flask, jsonify, redirect, request, send_from_directory, session

from database import execute, init_db, query_all, query_one


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "frontend"))

app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path="")

app.secret_key = os.environ.get("SECRET_KEY", "kien-journal-secret-key")

app.config["SESSION_COOKIE_SAMESITE"] = "Lax"

ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")

app.json.ensure_ascii = False

SIDES = ["A", "B"]
REACTIONS = ["tea", "insight", "calm", "resonate"]
TOPICS = ["EngineeringSolitude", "TeaAndHanoi", "AtticMusings", "BookMusings"]


# Đổi chuỗi sang số nguyên, không đổi được thì dùng giá trị mặc định
def to_int(value, default):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


# Ước lượng số phút đọc: bỏ thẻ HTML, đếm số từ, chia cho 220 từ/phút
def read_minutes(content):
    text = re.sub(r"<[^>]+>", " ", content or "")
    words = len(text.split())
    minutes = round(words / 220)
    if minutes < 1:
        minutes = 1
    return minutes


# Tạo slug từ tiêu đề, vd: 'Mưa Hà Nội' -> 'mua-ha-noi'
def make_slug(text):
    text = text.lower().replace("đ", "d")
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")


# Chỉnh lại 1 bài viết lấy từ database cho frontend dễ dùng (tags thành list, thêm số phút đọc)
def format_post(post, with_content=False):
    if post["tags"]:
        post["tags"] = post["tags"].split(",")
    else:
        post["tags"] = []

    post["featured"] = post["featured"] == 1

    post["read_minutes"] = read_minutes(post["content"])

    if not with_content:
        del post["content"]
    return post


# Tính số trang, ít nhất là 1 trang
def count_pages(total, per_page):
    pages = math.ceil(total / per_page)
    if pages < 1:
        pages = 1
    return pages


# Trả về lỗi dạng JSON: {"error": "..."}
def error(message, status=400):
    return jsonify({"error": message}), status


# Trang chủ: trả về file index.html
@app.route("/")
def home_page():
    return send_from_directory(FRONTEND_DIR, "index.html")


# Link cũ journal-feed.html thì chuyển sang trang nhật ký mới
@app.route("/journal-feed.html")
def old_journal_page():
    return redirect("/journal.html")


# Gọi API sai thì trả lỗi JSON, còn mở trang không có thì hiện 404.html
@app.errorhandler(404)
def not_found(e):
    if request.path.startswith("/api/"):
        return error("Not found", 404)
    return send_from_directory(FRONTEND_DIR, "404.html"), 404


# API danh sách bài viết: lọc theo side, chủ đề, tag, từ khoá, featured; sắp xếp và phân trang
@app.route("/api/posts")
def get_posts():
    side = request.args.get("side", "")
    category = request.args.get("category", "")
    tag = request.args.get("tag", "")
    keyword = request.args.get("q", "").strip()
    featured = request.args.get("featured", "")
    sort = request.args.get("sort", "recent")
    page = to_int(request.args.get("page"), 1)
    per_page = to_int(request.args.get("per_page"), 6)

    if page < 1:
        page = 1
    if per_page < 1:
        per_page = 1
    if per_page > 50:
        per_page = 50

    where = " WHERE 1 = 1"
    params = []

    if side != "":
        where += " AND side = ?"
        params.append(side)

    if category != "":
        where += " AND category = ?"
        params.append(category)

    if tag != "":
        where += " AND (',' || tags || ',') LIKE ?"
        params.append("%," + tag + ",%")

    if keyword != "":
        where += " AND (title LIKE ? OR excerpt LIKE ?)"
        params.append("%" + keyword + "%")
        params.append("%" + keyword + "%")

    if featured == "1":
        where += " AND featured = 1"

    total = query_one("SELECT COUNT(*) AS total FROM posts" + where, params)["total"]

    if sort == "reads":
        order = " ORDER BY reads DESC, date DESC"
    else:
        order = " ORDER BY date DESC, id DESC"

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


# API 1 bài viết theo slug, kèm bài mới hơn và bài cũ hơn
@app.route("/api/posts/<slug>")
def get_post(slug):
    row = query_one("SELECT * FROM posts WHERE slug = ?", [slug])
    if row is None:
        return error("Post not found", 404)

    post = format_post(row, with_content=True)

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


# API thả reaction cho bài viết, trả về số lượt mới
@app.route("/api/posts/<slug>/react", methods=["POST"])
def react_post(slug):
    data = request.get_json(silent=True) or {}
    reaction = data.get("type")
    if reaction not in REACTIONS:
        return error("Invalid reaction type")

    post = query_one("SELECT id FROM posts WHERE slug = ?", [slug])
    if post is None:
        return error("Post not found", 404)

    execute(f"UPDATE posts SET {reaction} = {reaction} + 1 WHERE id = ?", [post["id"]])
    updated = query_one(f"SELECT {reaction} AS count FROM posts WHERE id = ?", [post["id"]])

    return jsonify({"type": reaction, "count": updated["count"]})


# API tăng lượt đọc của bài viết
@app.route("/api/posts/<slug>/read", methods=["POST"])
def read_post(slug):
    post = query_one("SELECT id FROM posts WHERE slug = ?", [slug])
    if post is None:
        return error("Post not found", 404)

    execute("UPDATE posts SET reads = reads + 1 WHERE id = ?", [post["id"]])
    return jsonify({"ok": True})


# API đếm số bài của từng chủ đề, chia theo side
@app.route("/api/categories")
def get_categories():
    rows = query_all(
        "SELECT side, category, COUNT(*) AS count FROM posts"
        " WHERE category IS NOT NULL AND category != ''"
        " GROUP BY side, category"
        " ORDER BY side, category"
    )
    return jsonify(rows)


# API vài con số thống kê cho trang chủ và trang About
@app.route("/api/stats")
def get_stats():
    total = query_one("SELECT COUNT(*) AS n FROM posts")["n"]
    side_a = query_one("SELECT COUNT(*) AS n FROM posts WHERE side = 'A'")["n"]
    side_b = query_one("SELECT COUNT(*) AS n FROM posts WHERE side = 'B'")["n"]
    notes = query_one("SELECT COUNT(*) AS n FROM notes WHERE pinned = 1")["n"]

    return jsonify({"posts": total, "side_a": side_a, "side_b": side_b, "notes": notes})


# API danh sách bưu thiếp đã ghim (không trả email): lọc theo chủ đề, từ khoá và phân trang
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


# API gửi bưu thiếp mới: kiểm tra dữ liệu rồi lưu ở trạng thái chưa ghim
@app.route("/api/notes", methods=["POST"])
def create_note():
    data = request.get_json(silent=True) or {}

    message = str(data.get("message") or "").strip()
    name = str(data.get("name") or "").strip()
    email = str(data.get("email") or "").strip()
    location = str(data.get("location") or "").strip()
    topic = data.get("topic")
    post_slug = str(data.get("post_slug") or "").strip()

    if message == "":
        return error("Message is required")
    if len(message) > 2000:
        return error("Message is too long (max 2000 characters)")
    if len(name) > 100 or len(location) > 100 or len(email) > 200:
        return error("Name, location or email is too long")
    if email != "" and "@" not in email:
        return error("Invalid email")
    if topic not in TOPICS:
        return error("Invalid topic")
    if post_slug != "" and query_one("SELECT id FROM posts WHERE slug = ?", [post_slug]) is None:
        return error("Post not found", 404)

    execute(
        "INSERT INTO notes (message, name, email, location, topic, post_slug, pinned) VALUES (?, ?, ?, ?, ?, ?, 0)",
        [message, name, email, location, topic, post_slug],
    )
    return jsonify({"ok": True}), 201


# RSS feed 20 bài viết mới nhất
@app.route("/api/rss")
def rss_feed():
    posts = query_all("SELECT slug, title, excerpt, date FROM posts ORDER BY date DESC, id DESC LIMIT 20")
    site_url = request.host_url

    xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml += '<rss version="2.0">\n<channel>\n'
    xml += "<title>Kiên's Journal</title>\n"
    xml += "<link>" + escape(site_url) + "</link>\n"
    xml += "<description>Slow essays on distributed systems, Hanoi mornings, tea and old books.</description>\n"

    for post in posts:
        link = site_url + "article.html?slug=" + post["slug"]
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


# Kiểm tra đã đăng nhập Admin chưa (lưu trong session)
def is_admin():
    return session.get("admin") is True


# Trả lỗi 401 khi chưa đăng nhập Admin
def need_login():
    return error("Please log in to the admin page", 401)


# API đăng nhập Admin bằng mật khẩu
@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    if data.get("password") != ADMIN_PASSWORD:
        return error("Wrong password", 401)

    session["admin"] = True
    return jsonify({"ok": True})


# API đăng xuất Admin
@app.route("/api/logout", methods=["POST"])
def logout():
    session.pop("admin", None)
    return jsonify({"ok": True})


# API cho biết đã đăng nhập Admin chưa
@app.route("/api/admin/check")
def admin_check():
    return jsonify({"admin": is_admin()})


# Đọc và kiểm tra dữ liệu bài viết admin gửi lên, trả về (post, lỗi); có lỗi thì post là None
def read_post_from_request():
    data = request.get_json(silent=True) or {}

    title = str(data.get("title") or "").strip()
    slug = make_slug(str(data.get("slug") or ""))
    side = data.get("side")
    post_date = str(data.get("date") or "").strip()

    if title == "":
        return None, "Title is required"
    if side not in SIDES:
        return None, "Side must be A or B"

    if slug == "":
        slug = make_slug(title)
    if slug == "":
        return None, "Could not create a slug, please type one using a-z and 0-9"

    if post_date == "":
        post_date = date.today().isoformat()
    try:
        datetime.strptime(post_date, "%Y-%m-%d")
    except ValueError:
        return None, "Date must look like YYYY-MM-DD"

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


# API Admin: lấy tất cả bài viết
@app.route("/api/admin/posts")
def admin_get_posts():
    if not is_admin():
        return need_login()

    posts = query_all("SELECT * FROM posts ORDER BY date DESC, id DESC")
    return jsonify(posts)


# API Admin: thêm bài viết mới (slug không được trùng)
@app.route("/api/admin/posts", methods=["POST"])
def admin_create_post():
    if not is_admin():
        return need_login()

    post, message = read_post_from_request()
    if message:
        return error(message)

    if query_one("SELECT id FROM posts WHERE slug = ?", [post["slug"]]):
        return error("This slug is already used by another post")

    new_id = execute(
        "INSERT INTO posts (title, slug, excerpt, content, side, category, tags, cover, date, featured)"
        " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [post["title"], post["slug"], post["excerpt"], post["content"], post["side"],
         post["category"], post["tags"], post["cover"], post["date"], post["featured"]],
    )
    return jsonify({"ok": True, "id": new_id, "slug": post["slug"]}), 201


# API Admin: sửa bài viết (slug không được trùng với bài khác)
@app.route("/api/admin/posts/<int:post_id>", methods=["PUT"])
def admin_update_post(post_id):
    if not is_admin():
        return need_login()

    if query_one("SELECT id FROM posts WHERE id = ?", [post_id]) is None:
        return error("Post not found", 404)

    post, message = read_post_from_request()
    if message:
        return error(message)

    if query_one("SELECT id FROM posts WHERE slug = ? AND id != ?", [post["slug"], post_id]):
        return error("This slug is already used by another post")

    execute(
        "UPDATE posts SET title = ?, slug = ?, excerpt = ?, content = ?, side = ?,"
        " category = ?, tags = ?, cover = ?, date = ?, featured = ? WHERE id = ?",
        [post["title"], post["slug"], post["excerpt"], post["content"], post["side"],
         post["category"], post["tags"], post["cover"], post["date"], post["featured"], post_id],
    )
    return jsonify({"ok": True, "slug": post["slug"]})


# API Admin: xoá bài viết
@app.route("/api/admin/posts/<int:post_id>", methods=["DELETE"])
def admin_delete_post(post_id):
    if not is_admin():
        return need_login()

    execute("DELETE FROM posts WHERE id = ?", [post_id])
    return jsonify({"ok": True})


# API Admin: lấy tất cả bưu thiếp, chưa ghim xếp lên trước
@app.route("/api/admin/notes")
def admin_get_notes():
    if not is_admin():
        return need_login()

    notes = query_all("SELECT * FROM notes ORDER BY pinned ASC, id DESC")
    return jsonify(notes)


# API Admin: ghim / bỏ ghim bưu thiếp và lưu lời đáp
@app.route("/api/admin/notes/<int:note_id>", methods=["PUT"])
def admin_update_note(note_id):
    if not is_admin():
        return need_login()

    if query_one("SELECT id FROM notes WHERE id = ?", [note_id]) is None:
        return error("Postcard not found", 404)

    data = request.get_json(silent=True) or {}
    pinned = 1 if data.get("pinned") else 0
    reply = str(data.get("reply") or "").strip()

    execute("UPDATE notes SET pinned = ?, reply = ? WHERE id = ?", [pinned, reply, note_id])
    return jsonify({"ok": True})


# API Admin: xoá bưu thiếp
@app.route("/api/admin/notes/<int:note_id>", methods=["DELETE"])
def admin_delete_note(note_id):
    if not is_admin():
        return need_login()

    execute("DELETE FROM notes WHERE id = ?", [note_id])
    return jsonify({"ok": True})


if __name__ == "__main__":
    init_db()
    app.run(debug=True, port=5000)
