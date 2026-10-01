import json
import re
from pathlib import Path

from flask import current_app


ASSIGN_RE = re.compile(r"window\.KJ_CONTENT\s*=\s*", re.M)


def load_site_content(path: str | None = None) -> dict:
    file = Path(path or current_app.config["SITE_CONTENT_FILE"])

    text = file.read_text(encoding="utf-8-sig")

    match = ASSIGN_RE.search(text)

    if not match:
        raise ValueError(
            f"{file} không có dòng 'window.KJ_CONTENT = ...'"
        )

    try:
        data, _ = json.JSONDecoder().raw_decode(
            text[match.end():].lstrip()
        )
    except json.JSONDecodeError as exc:
        raise ValueError(
            f"{file} có window.KJ_CONTENT nhưng JSON không hợp lệ: {exc}"
        ) from exc

    if not isinstance(data, dict):
        raise ValueError(
            f"{file} phải chứa một object JSON"
        )

    if not isinstance(data.get("posts"), list):
        raise ValueError(
            f"{file} không có 'posts' dạng list"
        )

    return data