"""/api/about, /api/rss và phục vụ frontend tĩnh (../frontend)."""
from pathlib import Path

from flask import Blueprint, Response, abort, current_app, jsonify, request, send_from_directory

from ..content import load_site_content
from ..errors import ApiError, not_found_page
from ..services import feed

bp = Blueprint("site", __name__)


@bp.get("/api/about")
def about():
    # Đọc lại mỗi request: sửa site-content.js là thấy ngay, không cần restart
    try:
        return jsonify(load_site_content()["about"])
    except Exception as err:  # noqa: BLE001 — trả lỗi gọn cho client, log chi tiết
        current_app.logger.exception(err)
        raise ApiError(500, "Cannot read about data") from None


@bp.get("/api/rss")
def rss():
    site_url = current_app.config["SITE_URL"] or request.host_url
    return Response(feed.rss(site_url), mimetype="application/rss+xml")


@bp.get("/", defaults={"path": "index.html"})
@bp.get("/<path:path>")
def frontend(path: str):
    """index.html, journal.html, css/…, js/…, assets/…; /journal → journal.html."""
    root = current_app.config.get("FRONTEND_DIR")
    if not root or path.startswith("api/"):
        abort(404)
    if any(part.startswith(".") for part in Path(path).parts):
        return not_found_page()  # không phục vụ file/thư mục ẩn
    base = Path(root)
    for candidate in (path, f"{path}.html"):
        file = (base / candidate).resolve()
        if file.is_file() and base.resolve() in file.parents:
            return send_from_directory(root, candidate)
    return not_found_page()
