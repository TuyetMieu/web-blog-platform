"""/api/notes — gửi bưu thiếp (riêng tư) và đọc note đã ghim."""
from flask import Blueprint, jsonify, request

from ..config import MAX_LIMIT, NOTE_TOPICS, NOTES_PER_PAGE
from ..errors import ApiError
from ..services import notes as service
from ..validation import EMAIL_RE, int_param, json_body, optional_enum, optional_str

bp = Blueprint("notes", __name__, url_prefix="/api/notes")


@bp.post("", strict_slashes=False)
def create():
    body = json_body()

    message = body.get("message")
    if not isinstance(message, str) or not message.strip():
        raise ApiError(400, "Message is required")
    message = message.strip()
    if len(message) > 2000:
        raise ApiError(400, "Message is too long")

    email = optional_str(body, "email", 200, "Invalid email")
    if email and not EMAIL_RE.match(email):
        raise ApiError(400, "Invalid email")

    topic = body.get("topic")
    if topic not in NOTE_TOPICS:
        raise ApiError(400, "Invalid topic")

    service.create(
        {
            "message": message,
            "name": optional_str(body, "name", 100, "Name is too long"),
            "email": email,
            "location": optional_str(body, "location", 100, "Location is too long"),
            "topic": topic,
            "post_slug": optional_str(body, "post_slug", 200, "Invalid post_slug"),
        }
    )
    return jsonify({"ok": True}), 201


@bp.get("", strict_slashes=False)
def list_notes():
    args = request.args
    filters = {
        "topic": optional_enum(args, "topic", NOTE_TOPICS, "Invalid topic"),
        "q": optional_str(args, "q", 100),
    }
    page = int_param(args, "page", 1, 1, None, "Invalid page")
    per_page = int_param(args, "per_page", NOTES_PER_PAGE, 1, MAX_LIMIT, "Invalid per_page")
    return jsonify(service.list_notes(filters, page, per_page))
