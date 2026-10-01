"""Nghiệp vụ note bưu thiếp."""
from datetime import date

from ..db import get_db
from ..errors import ApiError
from ..repositories import notes as repo
from ..repositories import posts as posts_repo
from .posts import total_pages


def create(body: dict) -> None:
    """Note mới luôn riêng tư cho tới khi Kiên ghim (flask notes pin)."""
    db = get_db()
    post_id = None
    if body.get("post_slug"):
        post_id = posts_repo.find_id_by_slug(db, body["post_slug"])
        if post_id is None:
            raise ApiError(404, "Post not found")
    repo.insert(
        db,
        {
            "message": body["message"],
            "name": body.get("name"),
            "email": body.get("email"),
            "location": body.get("location"),
            "topic": body["topic"],
            "post_id": post_id,
            "date": date.today().isoformat(),
        },
    )


def list_notes(filters: dict, page: int, per_page: int) -> dict:
    db = get_db()
    total = repo.count(db, filters)
    rows = repo.find_page(db, filters, per_page, (page - 1) * per_page)
    return {
        "total": total,
        "total_pages": total_pages(total, per_page),
        "page": page,
        "notes": [dict(row) for row in rows],
    }
