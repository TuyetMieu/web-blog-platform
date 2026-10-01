"""Lỗi nghiệp vụ và định dạng response lỗi.

Lỗi thông thường: {"error": "..."}.
POST /api/notes giữ format riêng cho frontend: {"ok": false, "error": "..."}.
"""
from flask import Flask, current_app, jsonify, request, send_from_directory
from werkzeug.exceptions import HTTPException


class ApiError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status
        self.message = message


def _is_note_create() -> bool:
    return request.method == "POST" and request.path.rstrip("/") == "/api/notes"


def error_response(status: int, message: str):
    body = {"ok": False, "error": message} if _is_note_create() else {"error": message}
    return jsonify(body), status


def register_error_handlers(app: Flask) -> None:
    @app.errorhandler(ApiError)
    def handle_api_error(err: ApiError):
        return error_response(err.status, err.message)

    @app.errorhandler(HTTPException)
    def handle_http_error(err: HTTPException):
        status = err.code or 500
        if status == 404 and not request.path.startswith("/api"):
            return not_found_page()
        messages = {404: "Not found", 405: "Method not allowed", 413: "Payload too large"}
        return error_response(status, messages.get(status, err.description or "Request error"))

    @app.errorhandler(Exception)
    def handle_unexpected(err: Exception):
        current_app.logger.exception(err)
        return error_response(500, "Internal server error")


def not_found_page():
    """Trang 404.html của frontend cho trình duyệt, JSON cho client khác."""
    frontend = current_app.config.get("FRONTEND_DIR")
    wants_html = request.accept_mimetypes.accept_html and not request.path.startswith("/api")
    if frontend and wants_html:
        response = send_from_directory(frontend, "404.html")
        response.status_code = 404
        return response
    return jsonify({"error": "Not found"}), 404
