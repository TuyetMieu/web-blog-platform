"""Đọc ../frontend/data/site-content.js — nội dung dùng chung với frontend.

File đó là script trình duyệt dạng `window.KJ_CONTENT = { ...JSON... };`
nên chỉ cần tìm dòng gán rồi parse phần JSON phía sau.
"""
import json
import re
from pathlib import Path

from flask import current_app

_ASSIGN_RE = re.compile(r"^window\.KJ_CONTENT\s*=\s*", re.M)


def load_site_content(path: str | None = None) -> dict:
    file = Path(path or current_app.config["SITE_CONTENT_FILE"])
    text = file.read_text(encoding="utf-8")
    match = _ASSIGN_RE.search(text)
    if not match:
        raise ValueError(f"{file} không có dòng 'window.KJ_CONTENT = ...'")
    data, _ = json.JSONDecoder().raw_decode(text, match.end())
    if not isinstance(data, dict) or not isinstance(data.get("posts"), list):
        raise ValueError(f"{file} không chứa dữ liệu KJ_CONTENT hợp lệ")
    return data
