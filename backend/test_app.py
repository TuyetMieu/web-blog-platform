# test_app.py
# Kiểm thử các API bằng unittest (có sẵn trong Python).
# Chạy:  python test_app.py

import os
import shutil
import tempfile
import unittest

import database
from app import app


class BlogTest(unittest.TestCase):

    def setUp(self):
        # Mỗi test dùng 1 file database tạm riêng, không đụng vào blog.db thật
        self.temp_dir = tempfile.mkdtemp()
        database.DB_PATH = os.path.join(self.temp_dir, "test.db")
        database.init_db()
        self.client = app.test_client()

    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def login(self):
        return self.client.post("/api/login", json={"password": "admin123"})

    # ---------- Bài viết ----------

    def test_list_posts(self):
        data = self.client.get("/api/posts").get_json()
        self.assertEqual(data["total"], 15)
        self.assertEqual(len(data["posts"]), 6)
        self.assertEqual(data["total_pages"], 3)
        # Bài mới nhất phải đứng đầu
        dates = [p["date"] for p in data["posts"]]
        self.assertEqual(dates, sorted(dates, reverse=True))
        # Danh sách không gửi kèm nội dung bài
        self.assertNotIn("content", data["posts"][0])

    def test_filter_posts(self):
        data = self.client.get("/api/posts?side=A&category=Architecture").get_json()
        self.assertEqual(data["total"], 4)
        data = self.client.get("/api/posts?side=A&tag=Go").get_json()
        self.assertEqual(data["total"], 3)
        data = self.client.get("/api/posts?q=bookstore").get_json()
        self.assertEqual(data["posts"][0]["slug"], "notes-from-a-dust-covered-bookstore")
        data = self.client.get("/api/posts?featured=1").get_json()
        self.assertTrue(all(p["featured"] for p in data["posts"]))

    def test_sort_by_reads(self):
        data = self.client.get("/api/posts?sort=reads").get_json()
        reads = [p["reads"] for p in data["posts"]]
        self.assertEqual(reads, sorted(reads, reverse=True))

    def test_get_one_post(self):
        post = self.client.get("/api/posts/rain-and-solitude").get_json()
        self.assertIn("<p>", post["content"])
        self.assertIsNotNone(post["newer"])
        self.assertIsNotNone(post["older"])

        response = self.client.get("/api/posts/khong-co-bai-nay")
        self.assertEqual(response.status_code, 404)

    def test_react_and_read(self):
        before = self.client.get("/api/posts/rain-and-solitude").get_json()
        result = self.client.post("/api/posts/rain-and-solitude/react", json={"type": "tea"}).get_json()
        self.assertEqual(result["count"], before["tea"] + 1)

        response = self.client.post("/api/posts/rain-and-solitude/react", json={"type": "abc"})
        self.assertEqual(response.status_code, 400)

        self.client.post("/api/posts/rain-and-solitude/read")
        after = self.client.get("/api/posts/rain-and-solitude").get_json()
        self.assertEqual(after["reads"], before["reads"] + 1)

    def test_categories_and_stats(self):
        categories = self.client.get("/api/categories").get_json()
        self.assertTrue(len(categories) > 0)
        stats = self.client.get("/api/stats").get_json()
        self.assertEqual(stats["posts"], 15)
        self.assertEqual(stats["side_a"] + stats["side_b"], 15)
        self.assertEqual(stats["notes"], 8)

    # ---------- Bưu thiếp ----------

    def test_new_note_is_private(self):
        response = self.client.post("/api/notes", json={"message": "Xin chào Kiên", "topic": "TeaAndHanoi"})
        self.assertEqual(response.status_code, 201)
        # Bưu thiếp mới chưa được ghim nên không hiện ra ngoài
        data = self.client.get("/api/notes?q=Xin chào Kiên").get_json()
        self.assertEqual(data["total"], 0)
        # Danh sách công khai không lộ email
        data = self.client.get("/api/notes").get_json()
        self.assertNotIn("email", data["notes"][0])

    def test_note_validation(self):
        response = self.client.post("/api/notes", json={"message": "", "topic": "TeaAndHanoi"})
        self.assertEqual(response.status_code, 400)
        response = self.client.post("/api/notes", json={"message": "Hi", "topic": "Sai"})
        self.assertEqual(response.status_code, 400)
        response = self.client.post("/api/notes", json={"message": "Hi", "topic": "TeaAndHanoi", "email": "abc"})
        self.assertEqual(response.status_code, 400)

    # ---------- Admin ----------

    def test_admin_needs_login(self):
        self.assertEqual(self.client.get("/api/admin/posts").status_code, 401)
        self.assertEqual(self.client.post("/api/login", json={"password": "sai"}).status_code, 401)
        self.assertEqual(self.login().status_code, 200)
        self.assertEqual(self.client.get("/api/admin/posts").status_code, 200)

    def test_admin_create_edit_delete_post(self):
        self.login()
        response = self.client.post("/api/admin/posts", json={
            "title": "Mưa Hà Nội tháng Mười",
            "side": "B",
            "tags": "Hanoi, Rain",
            "content": "<p>Trời mưa.</p>",
        })
        self.assertEqual(response.status_code, 201)
        new_post = response.get_json()
        self.assertEqual(new_post["slug"], "mua-ha-noi-thang-muoi")

        post = self.client.get("/api/posts/mua-ha-noi-thang-muoi").get_json()
        self.assertEqual(post["tags"], ["Hanoi", "Rain"])

        response = self.client.put("/api/admin/posts/" + str(new_post["id"]), json={
            "title": "Tiêu đề mới", "slug": "mua-ha-noi-thang-muoi", "side": "B",
        })
        self.assertEqual(response.status_code, 200)
        post = self.client.get("/api/posts/mua-ha-noi-thang-muoi").get_json()
        self.assertEqual(post["title"], "Tiêu đề mới")

        self.client.delete("/api/admin/posts/" + str(new_post["id"]))
        self.assertEqual(self.client.get("/api/posts/mua-ha-noi-thang-muoi").status_code, 404)

    def test_admin_pin_note(self):
        self.client.post("/api/notes", json={"message": "Ghim mình nhé", "topic": "BookMusings"})
        self.login()
        notes = self.client.get("/api/admin/notes").get_json()
        note = notes[0]  # chưa ghim nên đứng đầu
        self.assertEqual(note["message"], "Ghim mình nhé")

        self.client.put("/api/admin/notes/" + str(note["id"]), json={"pinned": True, "reply": "Đã đọc!"})
        data = self.client.get("/api/notes?q=Ghim mình").get_json()
        self.assertEqual(data["total"], 1)
        self.assertEqual(data["notes"][0]["reply"], "Đã đọc!")

    # ---------- Trang web ----------

    def test_pages(self):
        # (đường dẫn, mã trạng thái mong muốn)
        cases = [
            ("/", 200),
            ("/journal.html", 200),
            ("/admin.html", 200),
            ("/css/style.css", 200),
            ("/trang-khong-co", 404),
            ("/api/khong-co", 404),
        ]
        for url, status in cases:
            response = self.client.get(url)
            self.assertEqual(response.status_code, status, url)
            response.close()  # đóng file mà Flask đã mở để gửi đi

    def test_rss(self):
        response = self.client.get("/api/rss")
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"<rss", response.data)


if __name__ == "__main__":
    unittest.main()
