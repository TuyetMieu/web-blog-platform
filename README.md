# Kiên's Journal — web-blog-platform

Tài liệu tổng hợp phần việc FE4 (Nguyễn Phương Nam): `js/api.js`, Màn 5 — Journal Feed, Màn 4 — The Whisper Box. Gộp lại từ `BAOCAO.md` + `CODE_NOTES.md` (đã xóa 2 file đó) thành 1 nguồn duy nhất.

## 1. Tổng quan

- **Phạm vi đã hoàn thành**: toàn bộ 8 dòng việc trong sheet phân công của FE4 (file `api.js`; thanh lọc + danh sách bài Màn 5; form bưu thiếp + bảng ghim Màn 4; nối API cho cả 2 màn; sửa lỗi lọc kết hợp/note dài) — cộng thêm nhiều việc phát sinh khi rà soát kỹ hơn theo yêu cầu (xem mục 9).
- **Chỉ có 2 trang thật tồn tại trong dự án**: `journal-feed.html` (Màn 5) và `whisper-box.html` (Màn 4). `about.html` (Màn 6) đã bị xóa khỏi dự án theo yêu cầu (không thuộc phạm vi FE4). Không có trang "Home / Desk View" hay "Article Reading" nào được xây (thuộc phạm vi FE khác, chưa làm).
- **Không cần cài thêm gì** — không dùng npm package/framework nào, chỉ HTML/CSS/JS thuần + `fetch`.

## 2. Cấu trúc thư mục

```
web-blog-platform/
├─ journal-feed.html        Trang Journal Feed (Màn 5 — tìm kiếm/lọc/phân trang)
├─ whisper-box.html         Trang The Whisper Box (Màn 4)
├─ css/
│  ├─ reset.css              Reset mặc định trình duyệt (dùng chung cả 2 trang)
│  ├─ fonts.css               @font-face thật cho các tên font mà export yêu cầu (mục 4)
│  ├─ vars.css                File biến CSS xuất từ Figma — hiện RỖNG (mục 6)
│  ├─ journal-feed.css        CSS riêng cho journal-feed.html (~2150 dòng, export gốc, KHÔNG sửa tay)
│  ├─ journal-feed-fixes.css  Rule ghi đè nhỏ, sửa lỗi của export (mục 5)
│  ├─ whisper-box.css         CSS riêng cho whisper-box.html (~2270 dòng, export gốc, KHÔNG sửa tay)
│  ├─ whisper-box-fixes.css   Rule ghi đè nhỏ, sửa lỗi của export (mục 5)
│  └─ header.css              Hover/click animation + reset ô search cho header dùng chung (mục 8)
├─ assets/
│  ├─ shared/                 Ảnh/icon giống hệt nhau ở cả 2 trang (so khớp bằng checksum)
│  ├─ journal-feed/           Ảnh/icon chỉ dùng riêng trong journal-feed.html
│  └─ whisper-box/            Ảnh/icon chỉ dùng riêng trong whisper-box.html
├─ data/
│  ├─ posts.sample.json       Dữ liệu bài viết mẫu — 13 bài (mục 6, mục 9)
│  └─ notes.sample.json       Dữ liệu note mẫu — 4 note (mục 6)
└─ js/
   ├─ api.js                  Lớp dữ liệu dùng chung: getPosts, getPost, getNotes, sendNote, sendReaction, escapeHtml, formatDate (mục 6)
   ├─ header.js                Wiring cho header dùng chung: nav/logo/avatar/toggle/search (mục 8)
   ├─ journal-feed.js          Nối journal-feed.html với api.js (mục 7)
   └─ whisper-box.js           Nối whisper-box.html với api.js (mục 7)
```

Mỗi trang HTML nạp CSS/JS theo đúng thứ tự:

```html
<link rel="stylesheet" href="css/reset.css">
<link rel="stylesheet" href="css/fonts.css">
<link rel="stylesheet" href="css/vars.css">
<link rel="stylesheet" href="css/journal-feed.css">        <!-- hoặc css/whisper-box.css -->
<link rel="stylesheet" href="css/journal-feed-fixes.css">  <!-- hoặc css/whisper-box-fixes.css -->
<link rel="stylesheet" href="css/header.css">
...
<script src="js/api.js"></script>
<script src="js/header.js"></script>
<script src="js/journal-feed.js"></script>  <!-- hoặc js/whisper-box.js -->
```

`reset` dọn style mặc định trước; `fonts` phải nạp trước khi CSS riêng dùng tới tên font đó; `vars` chứa biến dùng chung; CSS riêng của từng trang override lên trên; `header.css` nạp cuối vì chỉ cộng thêm hover/animation, không cần override gì trước đó. Tương tự, `api.js` phải nạp trước `header.js`/`journal-feed.js`/`whisper-box.js` vì các file sau gọi hàm global do `api.js` định nghĩa (`getPosts`, `escapeHtml`, ...).

## 3. Cách chạy để test

Trang gọi `fetch()` tới file JSON tương đối (`data/posts.sample.json`...) — **mở trực tiếp file `.html` bằng double-click sẽ KHÔNG chạy được** (trình duyệt chặn `fetch` trên `file://`). Bắt buộc chạy qua static server:

```bash
cd web-blog-platform
python -m http.server 8000
# hoặc: npx serve .
```

Rồi mở `http://localhost:8000/journal-feed.html` và `http://localhost:8000/whisper-box.html`. (Dùng VS Code Live Server thì bấm "Go Live" như bình thường, không cần lệnh trên.)

**Double-check nhanh không cần bấm UI** — mở Console (F12), gõ trực tiếp:

```js
// Journal Feed
await getPosts({ side: "b", category: "Hanoi Essays" })
await getPosts({ search: "rain" })

// Whisper Box
await getNotes({ topic: "TeaAndHanoi" })
await getNotes({ search: "tokyo" })
await sendNote({ name: "Test", topic: "BookMusings", message: "Hello!" })
```

Nếu chạy không lỗi và trả về object có `posts`/`notes` — tầng dữ liệu đúng, vấn đề còn lại (nếu có) chỉ ở hiển thị/CSS.

## 4. Nguồn gốc code & quy ước quan trọng

Cả 2 trang được xuất tự động từ Figma (công cụ auto-html) từ 2 export riêng biệt — **không phải viết tay**, và **`journal-feed.css`/`whisper-box.css` không bao giờ được sửa trực tiếp** (mọi override nằm ở 2 file `*-fixes.css` để giữ export gốc nguyên vẹn, dễ đối chiếu).

- **Class name tự sinh, rất dài, mô tả layout** (vd `.section-interactive-dual-perspective-notebook-switcher-atmospheric-header`), không theo BEM. Khi sửa CSS: tìm đúng class trong HTML rồi tìm y chang trong `.css` tương ứng, đừng đoán tên.
- **Cùng 1 class name có thể mang ý nghĩa khác nhau ở 2 file export** (vd `.container52`, `.container14`, `.text38` mỗi file định nghĩa khác nhau) — luôn kiểm tra đúng file CSS đang xét trước khi sửa hoặc coi 2 trang "giống hệt nhau".
- **Cả 2 trang ĐÃ CÓ SẴN 1 header dùng chung thật** (topbar thời tiết + logo + nav 5 mục + search + toggle theme + avatar) — nằm ở **cuối** file HTML (`<div class="header">`, ngay trước `</body>`), dùng `position:absolute` đè lên đầu trang. **Đừng tự thêm header mới** (từng có 1 lần hiểu nhầm và tự dựng thêm — xem mục 9.2). `.main` ngay sau `.header` có sẵn `padding-top` để không bị header che — không được xóa.
- Layout dùng `display:flex` + pixel cố định, không có `@media` — **chỉ tối ưu cho desktop ~1280px**. Muốn responsive mobile cần tự thêm `@media`.
- `vars.css` sinh sẵn nhưng **rỗng** — mọi màu/font-size viết cứng trực tiếp trong `journal-feed.css`/`whisper-box.css`. Muốn đổi màu chủ đạo đồng loạt phải tìm–thay trong từng file, hoặc refactor sang biến CSS thật.
- **Ảnh dùng chung** (`assets/shared/`): gộp theo nội dung byte giống hệt (kiểm tra bằng checksum, không chỉ tên file) — `brand-logo.png`, `profile.png`, `icon0.svg`, `glyph-1..5.svg`.
- **3 ảnh còn thiếu** ở `whisper-box.html` ("Daily Brew", "Tactile Correspondence", "Quiet Code" — link ảnh gốc từ Figma bị hỏng ngay từ lúc export) đang dùng placeholder SVG (`assets/whisper-box/placeholder-*.svg`) — thay bằng ảnh thật khi có, giữ nguyên tên file hoặc sửa `src`.
- **Font "NimbusSans"** chỉ là thay thế gần đúng bằng `local("Arial")` (không có trên Google Fonts) — không ảnh hưởng chức năng, chỉ ảnh hưởng độ chính xác pixel tuyệt đối.

## 5. Các bug của export gốc đã sửa (qua `*-fixes.css` / `fonts.css`)

1. **Lệch/đè chữ ở mọi phần tử `position:absolute`** (tem thư, sticky note, tiêu đề...) — do CSS export gọi tên font (`EbGaramond-*`, `Geist-Regular`, `NimbusSans-*`...) nhưng không có file font thật đi kèm, trình duyệt fallback sang font khác kích thước khác → lệch tọa độ tuyệt đối. **Đã sửa** bằng `css/fonts.css`: khai báo `@font-face` thật (EB Garamond/Geist từ Google Fonts, NimbusSans → `local("Arial")`, IpaGothic/LiberationMono → alias `MS Gothic`/`Consolas`).
2. **2 header chồng nhau ở whisper-box.html** — từng hiểu nhầm là thiếu header nên tự thêm 1 bộ viết tay (`.kj-topbar`/`.kj-header` + `css/site-header.css`), đồng thời xóa nhầm `padding-top` gốc của `.main`. Đã dọn lại hoàn toàn: xóa markup/file viết tay, khôi phục `.main` nguyên trạng — chỉ còn đúng 1 header thật của export.
3. **Khoảng cách trước footer (whisper-box) bị cộng dồn 3 lần** (~120px) — `.container` (40px) + gap root (40px) + `.container50` trong `.footer` (40px). Đã sửa: đặt `gap:0` cho root `.ki-n-s-journal-the-whisper-box-corkboard`, giữ nguyên 2 lớp padding còn lại.
4. **Nội dung lệch trái thay vì căn giữa ở CẢ 2 TRANG** trên màn hình > ~1280-1296px — nhiều wrapper trải full-width chứa khối con `max-width:1200px` nhưng dùng `align-items:flex-start` thay vì `center`. Đã sửa (`*-fixes.css`, và `.footer` giờ nằm trong `css/header.css` dùng chung — xem mục 8): `journal-feed.html` — `.footer` + 3 section wrapper nội dung chính; `whisper-box.html` — `.footer` + `.subtle-ambient-glow-backdrop` (toàn bộ nội dung chính).
5. **Card phụ Journal Feed tràn ngang cả trang** (thanh cuộn ngang, chữ cắt ở mép) — export gốc ngắt dòng bằng `<br>` đo sẵn cho câu cụ thể; JS render text bất kỳ thành 1 dòng liền, card `flex-shrink:0` không giới hạn chiều rộng nên không tự xuống dòng. Đã sửa (`journal-feed-fixes.css`): `flex-wrap:wrap` cho grid, `min-width:0` + `flex:1 1 320px` cho card, `overflow-wrap:break-word` cho vùng chữ.
6. **Div mô tả bài nổi bật lỡ trùng `class="container"`** với wrapper gốc toàn trang — đổi tên riêng `.kj-card-excerpt`.
7. **4 template note gốc (note-1..4) dùng `position:absolute` + chiều cao cố định** — vỡ layout với note dài/ngắn khác mẫu. Viết lại template mới `.kj-note-card` (flow-based, tự giãn theo nội dung) + xoay nghiêng nhẹ ngẫu nhiên. Đánh đổi: mất 4 kiểu trang trí ghim riêng (pushpin/kẹp gỗ/washi tape/bookmark), đổi lấy hoạt động đúng mọi độ dài.
8. **Thiếu 1 thẻ `</div>` đóng `.ink-ruled-writing-slate-form`** khi chỉnh form bưu thiếp thành `<form>` thật — làm lệch cấu trúc phía sau. Phát hiện bằng đếm thẻ mở/đóng, đã sửa.

## 6. `js/api.js` — lớp dữ liệu dùng chung

Viết theo đúng 4 hàm được giao (`getPosts`, `getPost`, `sendNote`, `sendReaction`) + `getNotes` (Whisper Box cần fetch danh sách, không chỉ gửi) + `escapeHtml`/`formatDate` (2 helper hiển thị dùng chung, gộp về đây sau đợt dọn code — mục 10). Là các hàm **global** (không module) — chỉ cần `<script src="js/api.js">` trước script riêng từng trang.

Mỗi hàm thử gọi backend Flask thật ở `/api/...` trước; lỗi (BE chưa chạy, hoặc endpoint chưa code) thì tự rơi xuống đọc `data/*.sample.json` và tự lọc/phân trang phía client — **cùng 1 shape trả về** dù có BE hay không, nên khi BE xong không cần sửa code gọi hàm ở FE.

- `getPosts({ side, category, tag, search, page, pageSize, sort })` → `{ posts, total, page, pageSize, totalPages }`. `search` so khớp `title + excerpt`.
- `getPost(slug)` → 1 bài viết hoặc `null`.
- `getNotes({ topic, search, page, pageSize })` → `{ notes, total, page, pageSize, totalPages }`. `search` so khớp `name + message + location`. Note gửi lúc offline (qua `sendNote`) lưu tạm `localStorage`, tự trộn vào đầu danh sách.
- `sendNote({ name, email, topic, message })` → note vừa tạo. Offline: chỉ lưu `localStorage` trình duyệt hiện tại (không chia sẻ cho người khác tới khi có BE thật).
- `sendReaction(slug, type)` → `{ slug, type, count }`. Offline: cộng dồn trong `localStorage`, cộng thêm số gốc trong sample JSON.
- `escapeHtml(str)` — escape `& < > "` an toàn cho cả nội dung text lẫn thuộc tính HTML trong ngoặc kép (vd `data-slug="${escapeHtml(slug)}"`).
- `formatDate(iso)` — định dạng hiển thị (vd "Oct 14, 2024"), fallback về chuỗi gốc nếu không parse được.

**Bộ chủ đề (topic) đã chốt dùng chung** cho cả form Whisper Box lẫn corkboard lọc: `EngineeringSolitude`, `TeaAndHanoi`, `AtticMusings`, `BookMusings` (theo đúng 4 tag corkboard vốn có note mẫu thật — form gốc từng dùng bộ khác `#SlowCode #TeaAndQuiet #HanoiNotes`, đã sửa khớp lại, thêm nút lọc "Attic Musings" còn thiếu vào corkboard).

**13 bài mẫu** trong `posts.sample.json` (Side A: 7, Side B: 6 — ban đầu chỉ 8 bài, thêm 5 bài để phân trang thật sự có 2 trang, xem mục 9.4) và **4 note mẫu** trong `notes.sample.json`.

## 7. Đã nối JS thật cho 2 trang

### Journal Feed (`journal-feed.html` + `js/journal-feed.js`)

- Side A/B, 7 tag lọc, ô tìm kiếm (debounce 300ms, đồng bộ 2 chiều với ô search header — mục 8), Sort, Previous/Next — tất cả gọi lại `getPosts()` với state hiện tại.
- Featured card (bài `featured:true`, kèm code block) + lưới bài phụ dựng lại hoàn toàn bằng JS mỗi lần state đổi.
- "Page X of Y" / "Showing entries A–B of N" cập nhật theo dữ liệu thật; Previous/Next tự `disabled` 2 đầu; đổi Side/tag/search luôn quay về trang 1.
- Không có kết quả → "Không tìm thấy bài viết phù hợp." (nội dung gợi ý khác nhau tùy có đang lọc bookmark hay không).
- **Bookmark-filter** (`#feed-bookmarks-toggle`, cạnh nút Sort): bấm icon 🔖 trên 1 card để lưu/bỏ lưu (localStorage, riêng trình duyệt); bấm nút cạnh Sort để chỉ xem bài đã lưu — vì "đã lưu" API không biết, FE tự lấy hết kết quả khớp bộ lọc hiện tại rồi lọc + phân trang lại phía client qua `_paginate()`.
- Cmd/Ctrl+K focus vào ô tìm kiếm.
- "N FRAGMENTS WRITTEN" + số đếm mỗi tag lọc tự tính thật qua `loadCounts()` (chạy 1 lần khi tải trang, `Promise.all` song song, `_loadPostsSample()` tự cache nên không tốn thêm network call).
- **Chống race condition**: `getPosts()` luôn thử `/api/posts` thật trước — nếu request cũ phản hồi chậm hơn request mới hơn (gõ search liên tục, đổi Side nhanh...), kết quả cũ có thể về sau và ghi đè nhầm. Đã có `renderToken` tăng dần trong `render()`, tự bỏ qua phản hồi đã lỗi thời.
- **Trạng thái loading**: `aria-busy` + class `feed-results-loading` (làm mờ nhẹ) — chỉ bật sau 200ms chưa có phản hồi, tránh nhấp nháy vô nghĩa với dữ liệu mẫu tức thì.
- **Accessibility**: `aria-live="polite"` trên `#feed-results`; `aria-pressed` cho Side A/B, từng tag lọc, bookmark-filter, bookmark từng bài; `alt=""` cho icon trang trí.
- Đã bỏ khối "Timeline: 2024/2023/..." (chưa có logic lọc theo năm, không có trong yêu cầu) — tránh 1 nút không làm gì khi demo.

### Whisper Box (`whisper-box.html` + `js/whisper-box.js`)

- Form bưu thiếp: `<textarea>`/`<input>` thật, đếm ký tự còn lại (2000 ký tự, tự tính đúng ngay từ lúc tải trang), chọn 1 trong 4 chủ đề, submit gọi `sendNote()`, validate rỗng + trạng thái Đang gửi/Thành công/Lỗi.
- Corkboard: 5 nút lọc chủ đề (kể cả "All Notes") + **ô search header** (mới, mục 8) gọi lại `getNotes({ topic, search })` — **2 điều kiện kết hợp cùng lúc**; nút "Inspect archived leaves" kiểu "tải thêm" (tăng dần số note hiển thị).
- Note dựng bằng template `.kj-note-card` (flow-based, xem mục 5.7). Note gửi lúc chưa có BE hiện dòng "⏳ Đã lưu tạm trên trình duyệt này...".
- Thông báo rỗng đổi nội dung tùy ngữ cảnh: có search → gợi ý xóa bớt từ khóa/đổi chủ đề; không search → gợi ý gửi note đầu tiên.
- Cùng cơ chế chống race-condition (`renderToken`) như Journal Feed, vì `renderBoard()` có thể bị gọi chồng chéo bởi search debounce + đổi topic liên tiếp.

## 8. Header dùng chung (`js/header.js`, `css/header.css`)

Header bị lặp y hệt trong cả 2 file HTML (không có include/partial, đây là export tĩnh) — 2 file `header.js`/`header.css` viết dùng chung thay vì lặp lại trong từng trang.

- **"The Dual Journal"** / **"The Whisper Box"** trong nav: `<a href="journal-feed.html">` / `<a href="whisper-box.html">` thật — chuyển trang thật, không cần JS. Mục đang active vẫn link về chính nó (như bấm "Home" khi đang ở trang chủ), giữ nguyên pill xanh `.link5` export gốc đã tô sẵn.
- **"Home / Desk View", "Article Reading", "About & Now"** (không có trang đích thật) + **avatar** + **nút toggle sáng/tối**: `<button data-header-toast="...">` — bấm hiện 1 toast nhỏ ở đáy màn hình (`.kj-header-toast`, tự ẩn ~2.2s) thay vì im lặng không làm gì, KHÔNG giả vờ điều hướng hay bật dark mode giả. `header.js` chỉ cần 1 vòng `querySelectorAll("[data-header-toast]")`.
- **Logo** → `<a href="journal-feed.html">` (quy ước bấm logo về trang chính).
- **Ô search trong header** (`#header-search-input`, dùng chung 1 id ở cả 2 trang): ở `journal-feed.html` dùng thẳng cơ chế search Màn 5 (đồng bộ 2 chiều với ô search trong thanh lọc); ở `whisper-box.html` lọc corkboard theo `name + message + location` (mục 6, mục 7). Icon kính lúp (`#header-search-icon`, cũng 1 id chung) bấm vào để focus ô search.
- **Hover/click animation**: pill nav đổi màu nhạt + co nhẹ khi bấm; logo/avatar/toggle mờ nhẹ khi hover + co khi bấm; icon toggle xoay nhẹ khi hover. `reset.css` đã tự xóa border/background mặc định của `<a>`/`<button>` toàn dự án nên không cần reset thêm.
- **`.footer` căn giữa** (mục 5.4) cũng nằm trong `header.css` vì cùng bug/cùng fix ở cả 2 trang.

## 9. Nhật ký các lần rà soát/sửa lỗi phát sinh (theo yêu cầu kiểm tra kỹ hơn)

1. **Nút bookmark-filter bị bỏ sót lần làm đầu** — chỉ là `<div>` trang trí. Phát hiện khi rà lại toàn bộ, đã wire thành bộ lọc thật (mục 7).
2. **Số liệu ảo từ mock Figma** ("124 FRAGMENTS WRITTEN", đếm tag `(38)`...) không khớp dữ liệu mẫu thật — thay bằng số tính thật qua `loadCounts()`.
3. **Bộ đếm ký tự form bưu thiếp sai lúc mới tải** (hiện "500" trong khi giới hạn thật 2000) — sửa để JS tự tính đúng ngay từ đầu.
4. **Thêm 5 bài mẫu để phân trang Journal Feed thật sự bấm được** — ban đầu đúng 4 bài/side với `pageSize` 4 nên `totalPages` luôn = 1, nút Next/Previous trông như "chết" dù code đúng logic. Thêm 3 bài Side A + 2 bài Side B (8→13 bài; Side A 4→7, Side B 4→6) — không sửa code, chỉ thêm dữ liệu, giờ cả 2 Side đều tự nhiên có 2 trang thật.
5. **Rà lại kỹ danh sách bài (`cardHtml()`) tìm thêm lỗi thật**: thiếu escape HTML ở tag và `slug` trong thuộc tính `data-slug="..."` (title/excerpt/category đã escape đúng từ trước) — lỗ hổng XSS/attribute-injection tiềm ẩn nếu dữ liệu tới từ BE/người dùng nhập. Đã sửa + nâng `escapeHtml()` escape luôn dấu `"`.
6. **Xác minh lại việc "Nối API Màn 5/Màn 4"** bằng test gọi thẳng `/api/posts`/`/api/notes` thật (không qua fallback) — xác nhận đổi Side/search/tag/trang và chủ đề đều gửi đúng query param, giữ nguyên bộ lọc kết hợp, hiện đúng thông báo rỗng. Phát hiện thêm 1 lỗi nhỏ: `loadCounts()` thiếu `try/catch` quanh `Promise.all` — nếu CẢ backend thật lẫn sample data cùng lỗi sẽ tạo unhandled rejection (dòng đỏ Console). Đã bọc `try/catch`.
7. **Thêm thanh tìm kiếm header cho Whisper Box** — trước đó chỉ có ở Journal Feed; mở rộng `getNotes()` thêm tham số `search`, wire ô search header thật cho Whisper Box, kết hợp với bộ lọc topic.

## 10. Dọn code trùng lặp/thừa (`/simplify`)

Rà soát bằng 4 agent song song (reuse / simplification / efficiency / altitude) trên toàn bộ file tự viết (không đụng CSS export gốc). Đã sửa:

- **`escapeHtml()`/`formatDate()` từng định nghĩa riêng ở `journal-feed.js` và `whisper-box.js`, đã lệch nhau** (1 bên escape thêm `"`, 1 bên có guard `isNaN`) — gộp thành 1 bản duy nhất (đầy đủ nhất) trong `api.js` (mục 6), xóa 2 bản riêng.
- **`render()` (nhánh lọc bookmark) tự viết lại logic phân trang** mà `_paginate()` trong `api.js` đã có — thay bằng gọi thẳng `_paginate()`.
- **CSS `.footer{align-items:center}` lặp y hệt** ở 2 file `*-fixes.css` — dời vào `header.css` dùng chung (mục 8).
- **`header.js` hard-code 2 class riêng từng trang** để tìm icon search — đổi sang 1 `id="header-search-icon"` chung ở cả 2 trang, thật sự tổng quát.
- **CSS chết** `.kj-note-reply-toggle` (không phần tử nào khớp) — xóa.
- **2 `id` đặt trong HTML nhưng không nơi nào đọc** (`feed-cat-all-label`, `board-all-count`) — xóa (đã grep xác nhận không CSS/JS nào dùng).
- **`data-sort` ghi nhưng không ai đọc**, **`nextBtn` handler thừa `async`** — xóa.

Đã cân nhắc nhưng **không sửa** (đổi hành vi, không phải dọn code thừa): `renderBoard()` (Whisper Box) thiếu trạng thái loading như Journal Feed; `loadCounts()`/`isBookmarked()` gọi lặp nhưng ở quy mô demo là không đáng kể.

**Sự cố nhỏ trong lúc rà soát**: 1 agent review (chỉ giao đọc/phân tích) vô tình xóa mất đoạn comment đầu file `api.js` — phát hiện qua timestamp bất thường, đã khôi phục nguyên văn (bổ sung thêm dòng nhắc `escapeHtml`/`formatDate`). Đã kiểm tra toàn bộ file còn lại, không thấy sửa ngoài ý muốn nào khác.

## 11. Đã tự kiểm tra bằng test tự động (không chỉ nhìn bằng mắt)

Trong suốt quá trình làm, đã viết nhiều bộ test Node (`jsdom` + server tĩnh thật, hoặc gọi thẳng `api.js` với dữ liệu mẫu thật) chạy trên **file thật** thay vì chỉ đọc code — toàn bộ đều PASS trước khi báo hoàn thành, bao gồm:

- Test logic `api.js` gốc (đúng shape trả về, lọc kết hợp side+category+search, note dài không bị cắt).
- Test header (link nav đúng href, toast đúng nội dung, icon search focus đúng ô) — 25/25.
- Test danh sách bài + escape XSS + race condition + loading state + accessibility — 17/17.
- Test thêm bài mẫu/phân trang thật — 16/16.
- Test xác minh lại API Màn 5 (`/api/posts`) — 7/7. API Màn 4 (`/api/notes`) — 10/10.
- Test thanh tìm kiếm Whisper Box (offline + real API + kết hợp topic) — 14/14.
- Test hồi quy sau đợt dọn code — 22/22.

Cũng đã: dựng static server thật, load cả 2 trang qua HTTP (200 OK), verify mọi `id`/`querySelector` khớp đúng HTML, verify HTML/CSS cân bằng thẻ mở-đóng, và **tự chụp màn hình bằng Microsoft Edge headless** (`msedge --headless --screenshot=...`) nhiều lần trong quá trình làm để nhìn bằng mắt thay vì chỉ đoán qua code — cách này phát hiện ra lỗi tràn ngang ở card phụ Journal Feed (mục 5.5) và xác nhận layout/footer không vỡ sau mỗi lần sửa CSS.

Khuyến khích tự chạy checklist thủ công thêm 1 lần cho các thao tác cần click chuột thật (đổi Side, lọc chủ đề, phân trang...), vì công cụ chụp màn hình tự động chỉ chụp được trạng thái tĩnh, chưa mô phỏng click qua dòng lệnh.

## 12. Lỗi/giới hạn đã biết (chưa sửa — cần cả nhóm quyết định hoặc chờ BE)

- **Chưa có backend Flask thật** — mọi thao tác gửi/phản hồi hiện chỉ lưu tạm `localStorage` trình duyệt hiện tại. Người khác mở trang sẽ không thấy note/bookmark bạn gửi cho tới khi có BE thật trả đúng response shape mà `api.js` đã định nghĩa (mục 6) — khi đó không cần sửa `journal-feed.js`/`whisper-box.js`.
- **`sendReaction` kiểu "endorse"** (nút "Read Field Report") không có phản hồi hình ảnh — sheet không mô tả rõ UI phần này, tạm để chạy ngầm. Riêng kiểu "save"/bookmark đã có phản hồi hình ảnh đầy đủ.
- **Bookmark chỉ lưu trên trình duyệt hiện tại** — không đồng bộ đa thiết bị tới khi có BE thật.
- **3 ảnh "Desk Surroundings" ở whisper-box.html** vẫn là placeholder (mục 4), chờ ảnh thật.
- **Nav "Home/Desk View", "Article Reading", "About & Now"** chưa có trang đích thật (mục 8) — ngoài phạm vi FE4.

## 13. Checklist test tay nhanh

**Journal Feed**: tải trang thấy featured card + 3 card nhỏ → đổi Side A/B → gõ search "hanoi" (debounce ~0.3s) → bấm tag "Architecture" → lọc kết hợp Side B + "Tea & Solitude" + search 1 từ trong bài "Designing Software with Warmth" ra đúng 1 kết quả → lọc ra rỗng (Side A + "Hanoi Essays") hiện đúng thông báo → phân trang "Page 1 of 2" bấm Next/Previous chuyển trang thật → bookmark 1 bài rồi bật bookmark-filter → Ctrl/Cmd+K focus search → số liệu đầu trang đúng 13 bài → Console không dòng đỏ.

**Whisper Box**: tải trang thấy 4 note mẫu → lọc theo chủ đề → gửi note ~2000 ký tự giữ nguyên vẹn → gửi note rỗng bị chặn → bộ đếm ký tự đúng ngay từ đầu → gõ "tokyo"/"calvino" vào ô search header lọc đúng note → Console không dòng đỏ.
