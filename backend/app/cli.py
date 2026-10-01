"""Lệnh quản trị qua Flask CLI (click đi kèm Flask):

    flask --app app migrate            chạy migration SQLite
    flask --app app seed [--reset]     seed từ ../frontend/data/site-content.js
    flask --app app notes              liệt kê bưu thiếp chưa ghim (riêng tư)
    flask --app app notes pin ID [LỜI_ĐÁP] [BỐI_CẢNH]
"""
import json

import click
from flask import Flask, current_app
from flask.cli import AppGroup, with_appcontext

from .config import REACTION_TYPES
from .content import load_site_content
from .db import connect, get_db, migrate
from .repositories import notes as notes_repo


def seed_database(conn, content: dict, reset: bool = False) -> dict | None:
    """Nạp dữ liệu mẫu; trả None nếu đã có bài viết và không reset."""
    if not reset and conn.execute("SELECT COUNT(*) FROM posts").fetchone()[0] > 0:
        return None
    with conn:  # 1 transaction: lỗi giữa chừng thì không để lại dữ liệu dở
        if reset:
            for table in ("notes", "reactions", "post_tags", "tags", "posts"):
                conn.execute(f"DELETE FROM {table}")
            conn.execute("DELETE FROM sqlite_sequence")

        tag_names = sorted({t for p in content["posts"] for t in p.get("tags", [])})
        tag_ids = {name: conn.execute("INSERT INTO tags (name) VALUES (?)", [name]).lastrowid for name in tag_names}

        post_ids = {}
        for p in content["posts"]:
            post_id = conn.execute(
                """INSERT INTO posts (slug, title, excerpt, content, side, category, cover, date, featured, reads, extra)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                [
                    p["slug"], p["title"], p.get("excerpt"), p.get("content", ""), p["side"],
                    p.get("category"), p.get("cover"), p["date"], 1 if p.get("featured") else 0,
                    p.get("reads", 0), json.dumps(p.get("extra") or {}, ensure_ascii=False),
                ],
            ).lastrowid
            post_ids[p["slug"]] = post_id
            conn.executemany(
                "INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?)",
                [(post_id, tag_ids[t]) for t in p.get("tags", [])],
            )
            conn.executemany(
                "INSERT INTO reactions (post_id, type, count) VALUES (?, ?, ?)",
                [(post_id, t, (p.get("reactions") or {}).get(t, 0)) for t in REACTION_TYPES],
            )

        for n in content.get("notes", []):
            conn.execute(
                """INSERT INTO notes (message, name, role, location, topic, post_id, date, reply, reply_context, pinned)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)""",
                [
                    n["message"], n.get("name"), n.get("role"), n.get("location"), n["topic"],
                    post_ids.get(n.get("postSlug")), n["date"], n.get("reply"), n.get("replyContext"),
                ],
            )
    return {"posts": len(content["posts"]), "tags": len(tag_names), "notes": len(content.get("notes", []))}


def register_cli(app: Flask) -> None:
    @app.cli.command("migrate")
    def migrate_command():
        """Chạy migration SQLite chưa áp dụng."""
        conn = connect(current_app.config["DATABASE"])
        try:
            applied = migrate(conn)
        finally:
            conn.close()
        for name in applied:
            click.echo(f"applied {name}")
        click.echo(f"Done: {len(applied)} migration(s) applied." if applied else "Nothing to migrate.")

    @app.cli.command("seed")
    @click.option("--reset", is_flag=True, help="Xoá dữ liệu cũ rồi seed lại.")
    def seed_command(reset: bool):
        """Seed dữ liệu mẫu từ frontend/data/site-content.js."""
        conn = connect(current_app.config["DATABASE"])
        try:
            migrate(conn)
            result = seed_database(conn, load_site_content(), reset=reset)
        finally:
            conn.close()
        if result is None:
            click.echo('Database đã có bài viết → bỏ qua. Dùng "flask --app app seed --reset" để seed lại.')
        else:
            click.echo(f"Seed thành công từ {current_app.config['SITE_CONTENT_FILE']}")
            click.echo(f"Posts: {result['posts']} · Tags: {result['tags']} · Notes: {result['notes']}")

    @app.cli.group("notes", cls=AppGroup, invoke_without_command=True)
    @click.pass_context
    @with_appcontext
    def notes_group(ctx: click.Context):
        """Đọc và ghim bưu thiếp lên Community Board."""
        if ctx.invoked_subcommand is None:
            _print_pending()

    @notes_group.command("list")
    def notes_list():
        """Liệt kê note chưa ghim."""
        _print_pending()

    @notes_group.command("pin")
    @click.argument("note_id", type=int)
    @click.argument("reply", required=False)
    @click.argument("reply_context", required=False)
    def notes_pin(note_id: int, reply: str | None, reply_context: str | None):
        """Ghim note (tuỳ chọn kèm margin note trả lời)."""
        ok = notes_repo.pin(get_db(), note_id, reply, reply_context)
        click.echo(f"Đã ghim note #{note_id} lên Community Board." if ok else f"Không tìm thấy note #{note_id}.")


def _print_pending() -> None:
    pending = notes_repo.find_pending(get_db())
    if not pending:
        click.echo("Không có bưu thiếp nào đang chờ. ☕")
        return
    for n in pending:
        extra = f" · bài: {n['post_slug']}" if n["post_slug"] else ""
        click.echo(f"#{n['id']} · {n['date']} · #{n['topic']}{extra}")
        sender = n["name"] or "Anonymous"
        if n["email"]:
            sender += f" <{n['email']}>"
        if n["location"]:
            sender += f" — {n['location']}"
        click.echo(f"  Từ: {sender}")
        click.echo(f'  "{n["message"]}"\n')
    click.echo(f"{len(pending)} note đang chờ. Ghim bằng: flask --app app notes pin <id> [\"lời đáp\"] [\"bối cảnh\"]")
