"""Truy vấn bài viết, tag, reaction — SQL tham số hoá, không ORM."""
import sqlite3

SUMMARY_COLS = """p.id, p.slug, p.title, p.excerpt, p.side, p.category, p.cover, p.date,
  p.featured, p.reads, p.extra,
  word_count(p.content) AS word_count,
  (SELECT COUNT(*) FROM notes n WHERE n.post_id = p.id) AS note_count"""

ORDER_BY = {
    "recent": "p.date DESC, p.id DESC",
    "reads": "p.reads DESC, p.date DESC, p.id DESC",
}


def _where(f: dict) -> tuple[str, list]:
    where, params = [], []
    if f.get("side"):
        where.append("p.side = ?")
        params.append(f["side"])
    if f.get("category"):
        where.append("p.category = ?")
        params.append(f["category"])
    if f.get("tag"):
        where.append(
            """EXISTS (SELECT 1 FROM post_tags pt JOIN tags t ON t.id = pt.tag_id
                       WHERE pt.post_id = p.id AND t.name = ?)"""
        )
        params.append(f["tag"])
    if f.get("q"):
        # So khớp chuỗi con, không phân biệt hoa thường (kể cả tiếng Việt)
        where.append("(instr(lower_u(p.title), ?) > 0 OR instr(lower_u(COALESCE(p.excerpt, '')), ?) > 0)")
        q = f["q"].lower()
        params += [q, q]
    if f.get("slugs"):
        where.append(f"p.slug IN ({', '.join('?' * len(f['slugs']))})")
        params += f["slugs"]
    if f.get("featured") is not None:
        where.append("p.featured = ?")
        params.append(1 if f["featured"] else 0)
    return ("WHERE " + " AND ".join(where)) if where else "", params


def count(db: sqlite3.Connection, f: dict) -> int:
    clause, params = _where(f)
    return db.execute(f"SELECT COUNT(*) FROM posts p {clause}", params).fetchone()[0]


def find_page(db: sqlite3.Connection, f: dict, sort: str, limit: int, offset: int) -> list[sqlite3.Row]:
    clause, params = _where(f)
    return db.execute(
        f"SELECT {SUMMARY_COLS} FROM posts p {clause} ORDER BY {ORDER_BY[sort]} LIMIT ? OFFSET ?",
        [*params, limit, offset],
    ).fetchall()


def find_by_slug(db: sqlite3.Connection, slug: str) -> sqlite3.Row | None:
    return db.execute(f"SELECT {SUMMARY_COLS}, p.content FROM posts p WHERE p.slug = ?", [slug]).fetchone()


def find_id_by_slug(db: sqlite3.Connection, slug: str) -> int | None:
    row = db.execute("SELECT id FROM posts WHERE slug = ?", [slug]).fetchone()
    return row["id"] if row else None


def find_newer_neighbor(db: sqlite3.Connection, date: str, post_id: int) -> sqlite3.Row | None:
    return db.execute(
        """SELECT p.slug, p.title, p.side, word_count(p.content) AS word_count FROM posts p
           WHERE (p.date, p.id) > (?, ?) ORDER BY p.date ASC, p.id ASC LIMIT 1""",
        [date, post_id],
    ).fetchone()


def find_older_neighbor(db: sqlite3.Connection, date: str, post_id: int) -> sqlite3.Row | None:
    return db.execute(
        """SELECT p.slug, p.title, p.side, word_count(p.content) AS word_count FROM posts p
           WHERE (p.date, p.id) < (?, ?) ORDER BY p.date DESC, p.id DESC LIMIT 1""",
        [date, post_id],
    ).fetchone()


def find_top(db: sqlite3.Connection, limit: int) -> list[sqlite3.Row]:
    return db.execute(
        f"""SELECT {SUMMARY_COLS}, COALESCE(SUM(r.count), 0) AS total_reactions
            FROM posts p LEFT JOIN reactions r ON r.post_id = p.id
            GROUP BY p.id
            ORDER BY total_reactions DESC, p.date DESC, p.id DESC
            LIMIT ?""",
        [limit],
    ).fetchall()


def find_recent(db: sqlite3.Connection, limit: int, with_content: bool = False) -> list[sqlite3.Row]:
    cols = SUMMARY_COLS + (", p.content" if with_content else "")
    return db.execute(f"SELECT {cols} FROM posts p ORDER BY p.date DESC, p.id DESC LIMIT ?", [limit]).fetchall()


def count_by_category(db: sqlite3.Connection) -> list[sqlite3.Row]:
    return db.execute(
        """SELECT side, category AS name, COUNT(*) AS count FROM posts
           WHERE category IS NOT NULL
           GROUP BY side, category
           ORDER BY side, category"""
    ).fetchall()


def increment_reads(db: sqlite3.Connection, slug: str) -> int | None:
    row = db.execute("UPDATE posts SET reads = reads + 1 WHERE slug = ? RETURNING reads", [slug]).fetchone()
    db.commit()
    return row["reads"] if row else None


def tags_by_post_ids(db: sqlite3.Connection, ids: list[int]) -> dict[int, list[str]]:
    result: dict[int, list[str]] = {}
    if not ids:
        return result
    rows = db.execute(
        f"""SELECT pt.post_id, t.name FROM post_tags pt JOIN tags t ON t.id = pt.tag_id
            WHERE pt.post_id IN ({', '.join('?' * len(ids))}) ORDER BY t.name""",
        ids,
    )
    for row in rows:
        result.setdefault(row["post_id"], []).append(row["name"])
    return result


def reactions_by_post_ids(db: sqlite3.Connection, ids: list[int]) -> dict[int, dict[str, int]]:
    result: dict[int, dict[str, int]] = {}
    if not ids:
        return result
    rows = db.execute(
        f"SELECT post_id, type, count FROM reactions WHERE post_id IN ({', '.join('?' * len(ids))})",
        ids,
    )
    for row in rows:
        result.setdefault(row["post_id"], {})[row["type"]] = row["count"]
    return result


def increment_reaction(db: sqlite3.Connection, post_id: int, reaction_type: str) -> int:
    # Upsert trong 1 câu SQL → không mất lượt khi có request đồng thời
    row = db.execute(
        """INSERT INTO reactions (post_id, type, count) VALUES (?, ?, 1)
           ON CONFLICT (post_id, type) DO UPDATE SET count = count + 1
           RETURNING count""",
        [post_id, reaction_type],
    ).fetchone()
    db.commit()
    return row["count"]
