"""Đọc & kiểm tra query/body. Thông báo lỗi giữ giống bản Express cũ
để frontend hiển thị như nhau."""
import re
from typing import Any

from flask import request

from .errors import ApiError

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def _blank(value: Any) -> bool:
    return value is None or (isinstance(value, str) and value.strip() == "")


def optional_str(source: dict, key: str, max_len: int, message: str | None = None) -> str | None:
    value = source.get(key)
    if _blank(value):
        return None
    if not isinstance(value, str) or len(value.strip()) > max_len:
        raise ApiError(400, message or f"Invalid {key}")
    return value.strip()


def optional_enum(source: dict, key: str, allowed: tuple, message: str) -> str | None:
    value = source.get(key)
    if _blank(value):
        return None
    if value not in allowed:
        raise ApiError(400, message)
    return value


def int_param(source: dict, key: str, default: int, minimum: int, maximum: int | None, message: str) -> int:
    value = source.get(key)
    if _blank(value):
        return default
    try:
        number = int(str(value).strip())
    except ValueError:
        raise ApiError(400, message) from None
    if number < minimum or (maximum is not None and number > maximum):
        raise ApiError(400, message)
    return number


def bool_param(source: dict, key: str) -> bool | None:
    value = source.get(key)
    if value in ("true", "1"):
        return True
    if value in ("false", "0"):
        return False
    return None


def slug_param(slug: str) -> str:
    slug = (slug or "").strip()
    if not slug or len(slug) > 200:
        raise ApiError(400, "Invalid slug")
    return slug


def json_body() -> dict:
    """Body JSON dạng object; body rỗng coi như {}."""
    if not request.get_data(cache=True):
        return {}
    data = request.get_json(silent=True)
    if data is None:
        raise ApiError(400, "Invalid JSON body")
    if not isinstance(data, dict):
        raise ApiError(400, "Invalid request")
    return data
