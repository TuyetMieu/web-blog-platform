"""Kết nối SQLite (thư viện chuẩn sqlite3) và chạy migration."""
import re
import sqlite3
from pathlib import Path

from flask import current_app, g

MIGRATIONS_DIR = Path(__file__).resolve().parent.parent / "migrations"
_TAG_RE = re.compile(r"<[^>]+>")


def _word_count(html):
    """Số từ của nội dung sau khi bỏ thẻ HTML — dùng để tính thời gian đọc."""
    if not html:
        return 0
    return len(_TAG_RE.sub(" ", html).split())


def _lower(value):
    """lower() hỗ trợ Unicode (LOWER của SQLite chỉ xử lý ASCII, sai với tiếng Việt)."""
    return value.lower() if isinstance(value, str) else value


def connect(path: str) -> sqlite3.Connection:
    if path != ":memory:":
        Path(path).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA busy_timeout = 5000")
    if path != ":memory:":
        conn.execute("PRAGMA journal_mode = WAL")
    conn.create_function("word_count", 1, _word_count, deterministic=True)
    conn.create_function("lower_u", 1, _lower, deterministic=True)
    return conn


def get_db() -> sqlite3.Connection:
    """Một kết nối cho mỗi request, tự đóng khi request kết thúc."""
    if "db" not in g:
        g.db = connect(current_app.config["DATABASE"])
    return g.db


def close_db(_exc=None) -> None:
    db = g.pop("db", None)
    if db is not None:
        db.close()


def migrate(conn: sqlite3.Connection) -> list[str]:
    """Chạy các file migrations/*.sql chưa áp dụng, mỗi file trong 1 transaction."""
    conn.execute(
        """CREATE TABLE IF NOT EXISTS schema_migrations (
             version    TEXT PRIMARY KEY,
             applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
           )"""
    )
    conn.commit()
    done = {row[0] for row in conn.execute("SELECT version FROM schema_migrations")}
    applied = []
    for file in sorted(MIGRATIONS_DIR.glob("*.sql")):
        if file.name in done:
            continue
        sql = file.read_text(encoding="utf-8")
        try:
            conn.executescript(f"BEGIN;\n{sql}\nINSERT INTO schema_migrations (version) VALUES ('{file.name}');\nCOMMIT;")
        except Exception:
            if conn.in_transaction:
                conn.execute("ROLLBACK")
            raise
        applied.append(file.name)
    return applied
