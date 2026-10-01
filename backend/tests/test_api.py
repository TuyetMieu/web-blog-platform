"""Kiểm thử API bằng unittest (thư viện chuẩn) + Flask test client.

    python -m unittest discover -s tests -v

Mỗi lần chạy dùng 1 file SQLite tạm, seed từ ../frontend/data/site-content.js.
"""
import shutil
import tempfile
import unittest
from pathlib import Path

from app import create_app
from app.cli import seed_database
from app.content import load_site_content
from app.db import connect, migrate


class ApiTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.mkdtemp()
        cls.app = create_app({"TESTING": True, "DATABASE": str(Path(cls.tmp) / "test.sqlite3")})
        conn = connect(cls.app.config["DATABASE"])
        migrate(conn)
        seed_database(conn, load_site_content(cls.app.config["SITE_CONTENT_FILE"]))
        conn.close()
        cls.client = cls.app.test_client()

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmp, ignore_errors=True)

    # ---------- posts ----------
    def test_list_shape(self):
        data = self.client.get("/api/posts").get_json()
        self.assertEqual(data["per_page"], 6)
        self.assertEqual(data["total"], 15)
        self.assertEqual(data["total_pages"], 3)
        post = data["posts"][0]
        for key in ("slug", "title", "excerpt", "side", "category", "tags", "cover", "date", "featured",
                    "reads", "read_minutes", "note_count", "reactions", "extra"):
            self.assertIn(key, post)
        self.assertEqual(sorted(post["reactions"]), ["calm", "insight", "resonate", "tea"])
        dates = [p["date"] for p in data["posts"]]
        self.assertEqual(dates, sorted(dates, reverse=True))

    def test_filters(self):
        data = self.client.get("/api/posts?side=engineering&category=Architecture&per_page=2").get_json()
        self.assertLessEqual(len(data["posts"]), 2)
        self.assertEqual(data["total"], 4)
        self.assertTrue(all(p["side"] == "engineering" and p["category"] == "Architecture" for p in data["posts"]))
        self.assertEqual(self.client.get("/api/posts?side=engineering&tag=Go").get_json()["total"], 3)

    def test_search_is_case_and_unicode_insensitive(self):
        data = self.client.get("/api/posts?q=TRÀNG THI").get_json()
        self.assertEqual([p["slug"] for p in data["posts"]], ["notes-from-a-dust-covered-bookstore"])
        self.assertEqual(self.client.get("/api/posts?q=50%25").get_json()["total"], 0)  # % không phải wildcard

    def test_sort_reads(self):
        reads = [p["reads"] for p in self.client.get("/api/posts?sort=reads&per_page=5").get_json()["posts"]]
        self.assertEqual(reads, sorted(reads, reverse=True))

    def test_featured_and_slugs(self):
        featured = self.client.get("/api/posts?featured=true").get_json()["posts"]
        self.assertTrue(featured and all(p["featured"] for p in featured))
        slugs = ",".join(p["slug"] for p in featured)
        self.assertEqual(self.client.get(f"/api/posts?slugs={slugs}").get_json()["total"], len(featured))

    def test_invalid_params(self):
        for url, message in [
            ("/api/posts?side=nope", "Invalid side"),
            ("/api/posts?per_page=999", "Invalid per_page"),
            ("/api/posts?page=0", "Invalid page"),
            ("/api/posts?sort=x", "Invalid sort"),
            ("/api/notes?topic=general", "Invalid topic"),
        ]:
            res = self.client.get(url)
            self.assertEqual(res.status_code, 400, url)
            self.assertEqual(res.get_json(), {"error": message})

    def test_categories(self):
        rows = self.client.get("/api/posts/categories").get_json()
        self.assertIn({"side": "life", "name": "Hanoi Essays", "count": 3}, rows)

    def test_top_and_recent(self):
        self.assertEqual(len(self.client.get("/api/posts/top").get_json()), 2)
        self.assertEqual(len(self.client.get("/api/posts/recent?limit=3").get_json()), 3)

    def test_detail_with_neighbors(self):
        listing = self.client.get("/api/posts?per_page=3").get_json()["posts"]
        data = self.client.get(f"/api/posts/{listing[1]['slug']}").get_json()
        self.assertTrue(data["content"])
        self.assertEqual(data["prev"]["slug"], listing[0]["slug"])  # mới hơn
        self.assertEqual(data["next"]["slug"], listing[2]["slug"])  # cũ hơn
        self.assertEqual(self.client.get("/api/posts/khong-ton-tai").status_code, 404)

    def test_react(self):
        slug = "raft-based-config-store-from-scratch"
        before = self.client.get(f"/api/posts/{slug}").get_json()["reactions"]["tea"]
        res = self.client.post(f"/api/posts/{slug}/react", json={"type": "tea"})
        self.assertEqual(res.get_json(), {"type": "tea", "count": before + 1})
        self.assertEqual(self.client.post(f"/api/posts/{slug}/react", json={"type": "like"}).status_code, 400)
        self.assertEqual(self.client.post("/api/posts/nope/react", json={"type": "tea"}).status_code, 404)
        bad = self.client.post(f"/api/posts/{slug}/react", data="{oops", content_type="application/json")
        self.assertEqual(bad.get_json(), {"error": "Invalid JSON body"})

    def test_read(self):
        slug = "ebpf-for-pragmatic-sres"
        before = self.client.get(f"/api/posts/{slug}").get_json()["reads"]
        self.assertEqual(self.client.post(f"/api/posts/{slug}/read").get_json(), {"reads": before + 1})

    # ---------- notes ----------
    def test_notes_public_only_without_email(self):
        data = self.client.get("/api/notes?per_page=4").get_json()
        self.assertGreaterEqual(data["total"], 8)  # 8 note seed (+ note do test ghim thêm)
        self.assertEqual(len(data["notes"]), 4)
        self.assertTrue(all("email" not in n for n in data["notes"]))
        self.assertEqual(self.client.get("/api/notes?topic=BookMusings&q=CALVINO").get_json()["total"], 1)

    def test_create_note_is_private_until_pinned(self):
        marker = "ghi-chu-rieng-tu-123"
        res = self.client.post("/api/notes", json={"message": marker, "topic": "AtticMusings",
                                                    "post_slug": "rain-and-solitude", "email": "a@b.co"})
        self.assertEqual((res.status_code, res.get_json()), (201, {"ok": True}))
        self.assertEqual(self.client.get(f"/api/notes?q={marker}").get_json()["total"], 0)

        runner = self.app.test_cli_runner()
        listing = runner.invoke(args=["notes"])
        self.assertIn(marker, listing.output)
        note_id = int(listing.output.split("#", 1)[1].split(" ", 1)[0])
        pinned = runner.invoke(args=["notes", "pin", str(note_id), "Cảm ơn!", "Over tea"])
        self.assertIn("Đã ghim", pinned.output)

        note = self.client.get(f"/api/notes?q={marker}").get_json()["notes"][0]
        self.assertEqual((note["reply"], note["reply_context"]), ("Cảm ơn!", "Over tea"))

    def test_create_note_validation(self):
        cases = [
            ({"message": "", "topic": "AtticMusings"}, "Message is required"),
            ({"message": "hi", "topic": "general"}, "Invalid topic"),
            ({"message": "x" * 2001, "topic": "AtticMusings"}, "Message is too long"),
            ({"message": "hi", "topic": "AtticMusings", "email": "nope"}, "Invalid email"),
        ]
        for body, message in cases:
            res = self.client.post("/api/notes", json=body)
            self.assertEqual((res.status_code, res.get_json()), (400, {"ok": False, "error": message}))
        missing = self.client.post("/api/notes", json={"message": "hi", "topic": "AtticMusings", "post_slug": "nope"})
        self.assertEqual(missing.get_json(), {"ok": False, "error": "Post not found"})

    # ---------- about / rss / frontend ----------
    def test_about(self):
        data = self.client.get("/api/about").get_json()
        self.assertEqual(data["name"], "Kiên")
        self.assertIn("items", data["now"])

    def test_rss(self):
        res = self.client.get("/api/rss")
        self.assertEqual(res.mimetype, "application/rss+xml")
        body = res.get_data(as_text=True)
        self.assertIn('<rss version="2.0"', body)
        self.assertIn("<pubDate>Tue, 12 Nov 2024 00:00:00 GMT</pubDate>", body)

    def _get(self, url, **kwargs):
        res = self.client.get(url, **kwargs)
        res.close()  # đóng file do send_from_directory mở
        return res

    def test_frontend_static(self):
        home = self.client.get("/")
        self.assertEqual(home.status_code, 200)
        self.assertIn("Kiên's Journal", home.get_data(as_text=True))
        home.close()
        self.assertEqual(self._get("/journal").status_code, 200)
        self.assertEqual(self._get("/css/base.css").status_code, 200)
        missing = self.client.get("/khong-co", headers={"Accept": "text/html"})
        self.assertEqual(missing.status_code, 404)
        self.assertIn("404", missing.get_data(as_text=True))
        missing.close()
        self.assertEqual(self._get("/../backend/app/config.py").status_code, 404)
        self.assertEqual(self._get("/.git/config").status_code, 404)
        api_missing = self.client.get("/api/khong-co")
        self.assertEqual((api_missing.status_code, api_missing.get_json()), (404, {"error": "Not found"}))

    def test_cors(self):
        allowed = self.client.get("/api/posts", headers={"Origin": "http://localhost:5500"})
        self.assertEqual(allowed.headers.get("Access-Control-Allow-Origin"), "http://localhost:5500")
        other = self.client.get("/api/posts", headers={"Origin": "http://evil.example"})
        self.assertIsNone(other.headers.get("Access-Control-Allow-Origin"))


if __name__ == "__main__":
    unittest.main()
