"""Kiên's Journal — backend Flask thuần (Flask + sqlite3 của thư viện chuẩn).

Kiến trúc: route (Blueprint) → service → repository (SQL) → SQLite.
Chạy:  flask --app app run --port 3000 --debug
"""
from flask import Flask, request
from flask.json.provider import DefaultJSONProvider

from .cli import register_cli, seed_database
from .config import load_config
from .content import load_site_content
from .db import close_db, connect, migrate
from .errors import register_error_handlers
from .routes import notes, posts, site


class JournalJSONProvider(DefaultJSONProvider):
    ensure_ascii = False  # giữ nguyên tiếng Việt trong JSON
    sort_keys = False     # giữ thứ tự field như khi dựng response


def prepare_database(app: Flask) -> None:
    """Tạo bảng (migration) mỗi lần khởi động, và seed dữ liệu mẫu nếu database còn trống —
    để "flask run" chạy được ngay cả khi chưa gọi "flask migrate" / "flask seed"."""
    conn = connect(app.config["DATABASE"])
    try:
        for name in migrate(conn):
            app.logger.info("applied migration %s", name)
        if app.config["AUTO_SEED"] and seed_database(conn, load_site_content(app.config["SITE_CONTENT_FILE"])):
            app.logger.info("database trống → đã seed dữ liệu mẫu từ %s", app.config["SITE_CONTENT_FILE"])
    finally:
        conn.close()


def create_app(test_config: dict | None = None) -> Flask:
    app = Flask(__name__, static_folder=None)  # frontend được phục vụ bởi routes/site.py
    app.config.from_mapping(load_config())
    if test_config:
        app.config.update(test_config)

    app.json = JournalJSONProvider(app)

    app.teardown_appcontext(close_db)
    register_error_handlers(app)
    register_cli(app)

    app.register_blueprint(posts.bp)
    app.register_blueprint(notes.bp)
    app.register_blueprint(site.bp)

    prepare_database(app)

    @app.after_request
    def cors(response):
        """CORS tự viết (không dùng flask-cors) — chỉ cho /api và origin trong CORS_ORIGIN."""
        origin = request.headers.get("Origin")
        if request.path.startswith("/api") and origin in app.config["CORS_ORIGINS"]:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Methods"] = "GET, POST"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type"
            response.headers.add("Vary", "Origin")
        return response

    return app
