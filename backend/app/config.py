"""Cấu hình đọc từ biến môi trường (không cần python-dotenv)."""
import os
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent

# Giá trị nghiệp vụ — giữ đúng contract mà frontend (js/api.js) đang dùng.
SIDES = ("engineering", "life")
REACTION_TYPES = ("tea", "insight", "calm", "resonate")
NOTE_TOPICS = ("EngineeringSolitude", "TeaAndHanoi", "AtticMusings", "BookMusings")
POST_SORTS = ("recent", "reads")

POSTS_PER_PAGE = 6
NOTES_PER_PAGE = 10
DEFAULT_TOP_LIMIT = 2
DEFAULT_RECENT_LIMIT = 4
MAX_LIMIT = 20
MAX_SLUGS_FILTER = 100
WORDS_PER_MINUTE = 220
RSS_ITEMS = 20


def _path(name: str, default: Path) -> Path:
    value = os.environ.get(name)
    return (BACKEND_DIR / value).resolve() if value else default


def load_config() -> dict:
    frontend_env = os.environ.get("FRONTEND_DIR")
    frontend_dir = None if frontend_env == "" else _path("FRONTEND_DIR", (BACKEND_DIR.parent / "frontend").resolve())

    return {
        # File SQLite; mặc định backend/instance/blog.sqlite3
        "DATABASE": str(_path("DATABASE_PATH", BACKEND_DIR / "instance" / "blog.sqlite3")),
        # Thư mục frontend được phục vụ tĩnh; FRONTEND_DIR="" để tắt
        "FRONTEND_DIR": str(frontend_dir) if frontend_dir else None,
        # Nội dung dùng chung với frontend (seed + /api/about)
        "SITE_CONTENT_FILE": str(
            _path("SITE_CONTENT_FILE", (BACKEND_DIR.parent / "frontend" / "data" / "site-content.js").resolve())
        ),
        # Origin được gọi /api khi frontend chạy ở origin khác (vd. Live Server)
        "CORS_ORIGINS": [
            o.strip()
            for o in os.environ.get("CORS_ORIGIN", "http://localhost:5500,http://127.0.0.1:5500").split(",")
            if o.strip()
        ],
        # URL công khai cho link trong RSS; mặc định lấy theo request
        "SITE_URL": os.environ.get("SITE_URL") or None,
        # Khi khởi động: tự chạy migration, và tự seed nếu database chưa có bài viết.
        # Đặt AUTO_SEED=0 để tắt tự seed (vd. production với dữ liệu thật).
        "AUTO_SEED": os.environ.get("AUTO_SEED", "1") != "0",
        "MAX_CONTENT_LENGTH": 100 * 1024,
    }
