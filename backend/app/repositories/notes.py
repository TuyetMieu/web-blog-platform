"""Truy vấn note bưu thiếp. Chỉ note đã ghim (pinned = 1) mới công khai."""
import sqlite3

PUBLIC_COLS = "id, message, name, role, location, topic, date, reply, reply_context"


def _where(f: dict) -> tuple[str, list]:
    where, params = ["pinned = 1"], []
    if f.get("topic"):
        where.append("topic = ?")
        params.append(f["topic"])
    if f.get("q"):
        where.append(
            "(instr(lower_u(message), ?) > 0 OR instr(lower_u(COALESCE(name, '')), ?) > 0"
            " OR instr(lower_u(COALESCE(location, '')), ?) > 0)"
        )
        q = f["q"].lower()
        params += [q, q, q]
    return "WHERE " + " AND ".join(where), params


def insert(db: sqlite3.Connection, note: dict) -> None:
    db.execute(
        """INSERT INTO notes (message, name, email, location, topic, post_id, date)
           VALUES (:message, :name, :email, :location, :topic, :post_id, :date)""",
        note,
    )
    db.commit()


def count(db: sqlite3.Connection, f: dict) -> int:
    clause, params = _where(f)
    return db.execute(f"SELECT COUNT(*) FROM notes {clause}", params).fetchone()[0]


def find_page(db: sqlite3.Connection, f: dict, limit: int, offset: int) -> list[sqlite3.Row]:
    clause, params = _where(f)
    return db.execute(
        f"SELECT {PUBLIC_COLS} FROM notes {clause} ORDER BY date DESC, id DESC LIMIT ? OFFSET ?",
        [*params, limit, offset],
    ).fetchall()


# ----- Dùng cho lệnh CLI "flask notes" (không mở ra HTTP) -----

def find_pending(db: sqlite3.Connection) -> list[sqlite3.Row]:
    return db.execute(
        """SELECT n.id, n.message, n.name, n.email, n.location, n.topic, n.date, p.slug AS post_slug
           FROM notes n LEFT JOIN posts p ON p.id = n.post_id
           WHERE n.pinned = 0
           ORDER BY n.date DESC, n.id DESC"""
    ).fetchall()


def pin(db: sqlite3.Connection, note_id: int, reply: str | None, reply_context: str | None) -> bool:
    cur = db.execute(
        """UPDATE notes SET pinned = 1,
             reply = COALESCE(?, reply),
             reply_context = COALESCE(?, reply_context)
           WHERE id = ?""",
        [reply, reply_context, note_id],
    )
    db.commit()
    return cur.rowcount > 0
