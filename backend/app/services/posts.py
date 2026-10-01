"""Nghiệp vụ bài viết: dựng response đúng shape mà frontend (js/api.js) dùng."""
import json
import math

from ..config import REACTION_TYPES, WORDS_PER_MINUTE
from ..db import get_db
from ..errors import ApiError
from ..repositories import posts as repo


def read_minutes(word_count: int) -> int:
    # Làm tròn .5 lên như Math.round của JS (round() của Python làm tròn về số chẵn)
    return max(1, math.floor(word_count / WORDS_PER_MINUTE + 0.5))


def total_pages(total: int, per_page: int) -> int:
    return max(1, math.ceil(total / per_page))


def _nav(row) -> dict | None:
    if row is None:
        return None
    return {"slug": row["slug"], "title": row["title"], "side": row["side"], "read_minutes": read_minutes(row["word_count"])}


def to_list_items(rows) -> list[dict]:
    db = get_db()
    ids = [row["id"] for row in rows]
    tags = repo.tags_by_post_ids(db, ids)
    reactions = repo.reactions_by_post_ids(db, ids)
    items = []
    for row in rows:
        counts = reactions.get(row["id"], {})
        items.append(
            {
                "slug": row["slug"],
                "title": row["title"],
                "excerpt": row["excerpt"],
                "side": row["side"],
                "category": row["category"],
                "tags": tags.get(row["id"], []),
                "cover": row["cover"],
                "date": row["date"],
                "featured": bool(row["featured"]),
                "reads": row["reads"],
                "read_minutes": read_minutes(row["word_count"]),
                "note_count": row["note_count"],
                "reactions": {t: counts.get(t, 0) for t in REACTION_TYPES},
                "extra": json.loads(row["extra"] or "{}"),
            }
        )
    return items


def list_posts(filters: dict, sort: str, page: int, per_page: int) -> dict:
    db = get_db()
    total = repo.count(db, filters)
    rows = repo.find_page(db, filters, sort, per_page, (page - 1) * per_page)
    return {
        "total": total,
        "total_pages": total_pages(total, per_page),
        "page": page,
        "per_page": per_page,
        "posts": to_list_items(rows),
    }


def get_post(slug: str) -> dict:
    db = get_db()
    row = repo.find_by_slug(db, slug)
    if row is None:
        raise ApiError(404, "Post not found")
    item = to_list_items([row])[0]
    item["content"] = row["content"]
    item["prev"] = _nav(repo.find_newer_neighbor(db, row["date"], row["id"]))  # bài mới hơn
    item["next"] = _nav(repo.find_older_neighbor(db, row["date"], row["id"]))  # bài cũ hơn
    return item


def top_posts(limit: int) -> list[dict]:
    return to_list_items(repo.find_top(get_db(), limit))


def recent_posts(limit: int) -> list[dict]:
    return to_list_items(repo.find_recent(get_db(), limit))


def categories() -> list[dict]:
    return [{"side": r["side"], "name": r["name"], "count": r["count"]} for r in repo.count_by_category(get_db())]


def react(slug: str, reaction_type: str) -> dict:
    db = get_db()
    post_id = repo.find_id_by_slug(db, slug)
    if post_id is None:
        raise ApiError(404, "Post not found")
    return {"type": reaction_type, "count": repo.increment_reaction(db, post_id, reaction_type)}


def mark_read(slug: str) -> dict:
    reads = repo.increment_reads(get_db(), slug)
    if reads is None:
        raise ApiError(404, "Post not found")
    return {"reads": reads}
