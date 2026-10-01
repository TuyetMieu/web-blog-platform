"""/api/posts — danh sách, chi tiết, chủ đề, reaction, lượt đọc."""
from flask import Blueprint, jsonify, request

from ..config import (
    DEFAULT_RECENT_LIMIT,
    DEFAULT_TOP_LIMIT,
    MAX_LIMIT,
    MAX_SLUGS_FILTER,
    POST_SORTS,
    POSTS_PER_PAGE,
    REACTION_TYPES,
    SIDES,
)
from ..errors import ApiError
from ..services import posts as service
from ..validation import bool_param, int_param, json_body, optional_enum, optional_str, slug_param

bp = Blueprint("posts", __name__, url_prefix="/api/posts")


def _slugs_param(args) -> list[str] | None:
    raw = args.get("slugs", "")
    slugs = [s.strip() for s in raw.split(",") if s.strip()]
    if not slugs:
        return None
    if len(slugs) > MAX_SLUGS_FILTER:
        raise ApiError(400, "Too many slugs")
    if any(len(s) > 200 for s in slugs):
        raise ApiError(400, "Invalid slugs")
    return slugs


@bp.get("", strict_slashes=False)
def list_posts():
    args = request.args
    filters = {
        "side": optional_enum(args, "side", SIDES, "Invalid side"),
        "category": optional_str(args, "category", 80),
        "tag": optional_str(args, "tag", 50),
        "q": optional_str(args, "q", 100),
        "slugs": _slugs_param(args),
        "featured": bool_param(args, "featured"),
    }
    sort = optional_enum(args, "sort", POST_SORTS, "Invalid sort") or "recent"
    page = int_param(args, "page", 1, 1, None, "Invalid page")
    per_page = int_param(args, "per_page", POSTS_PER_PAGE, 1, MAX_LIMIT, "Invalid per_page")
    return jsonify(service.list_posts(filters, sort, page, per_page))


@bp.get("/top")
def top():
    limit = int_param(request.args, "limit", DEFAULT_TOP_LIMIT, 1, MAX_LIMIT, "Invalid limit")
    return jsonify(service.top_posts(limit))


@bp.get("/recent")
def recent():
    limit = int_param(request.args, "limit", DEFAULT_RECENT_LIMIT, 1, MAX_LIMIT, "Invalid limit")
    return jsonify(service.recent_posts(limit))


@bp.get("/categories")
def categories():
    return jsonify(service.categories())


@bp.get("/<slug>")
def detail(slug: str):
    return jsonify(service.get_post(slug_param(slug)))


@bp.post("/<slug>/react")
def react(slug: str):
    body = json_body()
    reaction_type = body.get("type")
    if reaction_type not in REACTION_TYPES:
        raise ApiError(400, "Invalid reaction type")
    return jsonify(service.react(slug_param(slug), reaction_type))


@bp.post("/<slug>/read")
def read(slug: str):
    return jsonify(service.mark_read(slug_param(slug)))
