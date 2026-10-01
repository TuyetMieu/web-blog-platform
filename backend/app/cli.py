"""Lệnh quản trị qua Flask CLI (click đi kèm Flask):

    flask --app app migrate            chạy migration SQLite
    flask --app app seed [--reset]     seed dữ liệu mẫu
    flask --app app notes              liệt kê bưu thiếp chưa ghim (riêng tư)
    flask --app app notes pin ID [LỜI_ĐÁP] [BỐI_CẢNH]
"""

import json
from pathlib import Path

import click
from flask import Flask, current_app
from flask.cli import AppGroup, with_appcontext

from .config import REACTION_TYPES
from .content import load_site_content
from .db import connect, get_db, migrate
from .repositories import notes as notes_repo


def load_sample_notes() -> list:
    """Đọc 4 note mẫu từ frontend/data/notes.sample.json."""
    file = (
        Path(current_app.config["FRONTEND_DIR"])
        / "data"
        / "notes.sample.json"
    )

    if not file.exists():
        return []

    try:
        data = json.loads(file.read_text(encoding="utf-8-sig"))
    except (OSError, json.JSONDecodeError):
        return []

    return data if isinstance(data, list) else []


def seed_database(conn, content: dict, reset: bool = False) -> dict | None:
    """Nạp dữ liệu mẫu."""

    if not reset and conn.execute(
        "SELECT COUNT(*) FROM posts"
    ).fetchone()[0] > 0:
        return None

    # site-content.js hiện không chứa notes ở cấp ngoài,
    # nên lấy notes từ frontend/data/notes.sample.json.
    notes = content.get("notes") or []

    if not notes:
        notes = load_sample_notes()

    with conn:
        if reset:
            for table in ("notes", "reactions", "post_tags", "tags", "posts"):
                conn.execute(f"DELETE FROM {table}")

            conn.execute("DELETE FROM sqlite_sequence")

        tag_names = sorted(
            {
                tag
                for post in content["posts"]
                for tag in post.get("tags", [])
            }
        )

        tag_ids = {
            name: conn.execute(
                "INSERT INTO tags (name) VALUES (?)",
                [name],
            ).lastrowid
            for name in tag_names
        }

        post_ids = {}

        for post in content["posts"]:
            post_id = conn.execute(
                """
                INSERT INTO posts (
                    slug,
                    title,
                    excerpt,
                    content,
                    side,
                    category,
                    cover,
                    date,
                    featured,
                    reads,
                    extra
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    post["slug"],
                    post["title"],
                    post.get("excerpt"),
                    post.get("content", ""),
                    post["side"],
                    post.get("category"),
                    post.get("cover"),
                    post["date"],
                    1 if post.get("featured") else 0,
                    post.get("reads", 0),
                    json.dumps(
                        post.get("extra") or {},
                        ensure_ascii=False,
                    ),
                ],
            ).lastrowid

            post_ids[post["slug"]] = post_id

            conn.executemany(
                """
                INSERT INTO post_tags (post_id, tag_id)
                VALUES (?, ?)
                """,
                [
                    (post_id, tag_ids[tag])
                    for tag in post.get("tags", [])
                ],
            )

            conn.executemany(
                """
                INSERT INTO reactions (post_id, type, count)
                VALUES (?, ?, ?)
                """,
                [
                    (
                        post_id,
                        reaction_type,
                        (post.get("reactions") or {}).get(
                            reaction_type,
                            0,
                        ),
                    )
                    for reaction_type in REACTION_TYPES
                ],
            )

        # Seed notes
        for note in notes:
            reply = note.get("reply")

            reply_message = None
            reply_context = None

            if isinstance(reply, dict):
                reply_message = reply.get("message")
                reply_context = reply.get("context")
            elif isinstance(reply, str):
                reply_message = reply

            conn.execute(
                """
                INSERT INTO notes (
                    message,
                    name,
                    role,
                    location,
                    topic,
                    post_id,
                    date,
                    reply,
                    reply_context,
                    pinned
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
                """,
                [
                    note["message"],
                    note.get("name"),
                    note.get("role"),
                    note.get("location"),
                    note["topic"],
                    post_ids.get(note.get("postSlug")),
                    note["date"],
                    reply_message,
                    reply_context,
                ],
            )

    return {
        "posts": len(content["posts"]),
        "tags": len(tag_names),
        "notes": len(notes),
    }


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

        click.echo(
            f"Done: {len(applied)} migration(s) applied."
            if applied
            else "Nothing to migrate."
        )

    @app.cli.command("seed")
    @click.option(
        "--reset",
        is_flag=True,
        help="Xoá dữ liệu cũ rồi seed lại.",
    )
    def seed_command(reset: bool):
        """Seed dữ liệu mẫu."""
        conn = connect(current_app.config["DATABASE"])

        try:
            migrate(conn)

            result = seed_database(
                conn,
                load_site_content(),
                reset=reset,
            )
        finally:
            conn.close()

        if result is None:
            click.echo(
                'Database đã có bài viết → bỏ qua. '
                'Dùng "flask --app app seed --reset" để seed lại.'
            )
        else:
            click.echo(
                f"Seed thành công từ "
                f"{current_app.config['SITE_CONTENT_FILE']}"
            )

            click.echo(
                f"Posts: {result['posts']} · "
                f"Tags: {result['tags']} · "
                f"Notes: {result['notes']}"
            )

    @app.cli.group(
        "notes",
        cls=AppGroup,
        invoke_without_command=True,
    )
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
    def notes_pin(
        note_id: int,
        reply: str | None,
        reply_context: str | None,
    ):
        """Ghim note."""
        ok = notes_repo.pin(
            get_db(),
            note_id,
            reply,
            reply_context,
        )

        click.echo(
            f"Đã ghim note #{note_id} lên Community Board."
            if ok
            else f"Không tìm thấy note #{note_id}."
        )


def _print_pending() -> None:
    pending = notes_repo.find_pending(get_db())

    if not pending:
        click.echo("Không có bưu thiếp nào đang chờ. ☕")
        return

    for note in pending:
        extra = (
            f" · bài: {note['post_slug']}"
            if note["post_slug"]
            else ""
        )

        click.echo(
            f"#{note['id']} · "
            f"{note['date']} · "
            f"#{note['topic']}"
            f"{extra}"
        )

        sender = note["name"] or "Anonymous"

        if note["email"]:
            sender += f" <{note['email']}>"

        if note["location"]:
            sender += f" — {note['location']}"

        click.echo(f"  Từ: {sender}")
        click.echo(f'  "{note["message"]}"\n')

    click.echo(
        f"{len(pending)} note đang chờ. "
        f"Ghim bằng: "
        f'flask --app app notes pin <id> '
        f'["lời đáp"] ["bối cảnh"]'
    )