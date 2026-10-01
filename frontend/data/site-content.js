/* =========================================================
   data/site-content.js — Nội dung của Kiên's Journal (NGUỒN DUY NHẤT)
   - Frontend: js/api.js dùng làm dữ liệu khi chưa có backend
     (mở bằng file://, server tĩnh, hoặc thêm ?mock=1).
   - Backend Flask (../backend): lệnh "flask seed" đọc file này để seed
     SQLite, và GET /api/about trả về khối "about".

   ĐỊNH DẠNG: phần sau "window.KJ_CONTENT =" phải là JSON hợp lệ
   (key/chuỗi trong dấu nháy kép, không comment, không dấu phẩy thừa)
   để Python đọc được bằng json. Nội dung bài viết là HTML trong chuỗi.

     posts: slug, title, excerpt, side ("engineering" | "life"), category,
            tags[], cover, date (YYYY-MM-DD), featured, reads,
            reactions { tea, insight, calm, resonate }, extra {...}, content (HTML)
     notes: name, role, location, topic, message, date, reply, replyContext,
            postSlug (tuỳ chọn) — đây là các note đã được Kiên "ghim".
     about: nội dung trang About & Now (Màn 6).
   ========================================================= */
window.KJ_CONTENT = {
  "posts": [
    {
      "slug": "decoupling-state-in-event-streams",
      "title": "Decoupling State in Event Streams: How We Survived 10M Msg/Sec Without Distributed Deadlocks",
      "excerpt": "An architectural autopsy of eliminating distributed two-phase commits in high-throughput financial telemetry. We transitioned from relational pessimistic locks to a partitioned event log backed by vectorized zero-copy memory buffers.",
      "side": "engineering",
      "category": "Distributed Systems",
      "tags": [
        "Rust",
        "DistributedSystems",
        "Kafka",
        "Performance"
      ],
      "cover": null,
      "date": "2024-11-12",
      "featured": true,
      "reads": 4200,
      "reactions": {
        "tea": 64,
        "insight": 118,
        "calm": 12,
        "resonate": 31
      },
      "extra": {
        "refCode": "DIST-001",
        "level": "Intermediate / Systems",
        "snippet": "$ raft.AppendEntries(term=14, prevIndex=82910) // ok",
        "takeaways": [
          "Elimination of global coordination reduced p99 tail latency from 240ms to 4.2ms.",
          "State machines constructed as deterministic pure functions replayable from WAL offsets.",
          "Zero JVM garbage collection jitter achieved by pinning critical threads to NUMA nodes."
        ],
        "code": {
          "filename": "ring_buffer_core.rs",
          "meta": "p99: 4.18ms",
          "footer": "Throughput: 10,480,210 ops/sec",
          "badge": "SIMD Vectorized",
          "content": "pub struct EventStream<T: Batchable> {\n    ring: Arc<Disruptor<T>>,\n    wal_cursor: AtomicU64,\n}\n\nimpl<T> EventStream<T> {\n    #[inline(always)]\n    pub fn append_batch(&self, batch: &[T]) -> Result<u64> {\n        // Zero-allocation memory fence\n        let seq = self.ring.claim(batch.len())?;\n        self.wal_cursor.store(seq, Ordering::Release);\n        Ok(seq)\n    }\n}"
        },
        "ledger": "Part of the \"Quiet Throughput\" series on systems that stay calm under load."
      },
      "content": "<p>For two years our telemetry pipeline was held together by a relational database and a great deal of hope. Every trade event took a pessimistic row lock, touched three tables, and committed through a two-phase protocol that spanned two regions. It worked—until the night traffic tripled and the lock graph turned into a knot.</p>\n<h2>1. Why Optimistic Locking Failed Under Partition</h2>\n<p>Optimistic concurrency assumes conflicts are rare. Under a network partition they are not rare; they are the only thing happening. Retries amplified load on the very rows that were contended, and our p99 latency climbed from tens of milliseconds to nearly a quarter of a second.</p>\n<p>We stopped asking the database to coordinate and started asking the log. Each account became a partition key. Each partition had exactly one writer. Coordination did not get faster—it disappeared.</p>\n<h2>2. Deterministic Log Sequencing</h2>\n<p>Once every change is an append to an ordered log, state becomes a pure function of the log prefix. Replaying from a write-ahead-log offset gives the same answer every time, which is the quiet superpower behind 99.99% idempotency: duplicates are detected by sequence number, not by luck.</p>\n<pre data-file=\"consumer.go\" data-meta=\"go 1.23 · idempotent\"><code>func (c *Consumer) Apply(ev Event) error {\n    if ev.Seq &lt;= c.lastSeq[ev.Partition] {\n        return nil // already applied, safe to skip\n    }\n    c.state = Reduce(c.state, ev)\n    c.lastSeq[ev.Partition] = ev.Seq\n    return nil\n}</code></pre>\n<h2>3. What I Would Do Differently</h2>\n<p>Start with the log. It is tempting to treat event streams as an optimization you add later, but the shape of your data decides the shape of your failures. Pick the shape whose failures you can sleep through.</p>"
    },
    {
      "slug": "single-binary-web-utilities",
      "title": "The Lost Art of Crafting Small, Single-Binary Web Utilities",
      "excerpt": "In an era of bloated Docker containers and 400MB node_modules, there is immense joy in compiling a 4MB standalone binary that serves static assets with zero external dependencies forever.",
      "side": "engineering",
      "category": "Software Tooling",
      "tags": [
        "Rust",
        "CLI",
        "Unix"
      ],
      "cover": null,
      "date": "2024-10-24",
      "featured": false,
      "reads": 2310,
      "reactions": {
        "tea": 22,
        "insight": 41,
        "calm": 18,
        "resonate": 9
      },
      "extra": {
        "refCode": "TOOL-008",
        "metric": {
          "label": "Binary Footprint Comparison",
          "value": "4.2 MB vs 384 MB (98.9% smaller)",
          "chart": "assets/chart-binary.svg"
        }
      },
      "content": "<p>A good command-line tool is like a well-kept pot of basil: small, specific, and quietly useful every single morning. <code>grep</code> does not want to be your friend. It wants to find the line and leave.</p>\n<h2>1. A Binary You Can Forget About</h2>\n<p>The little file server that hosts my photo archive is a single 4.2 MB executable. It has no runtime, no package manager, no container image. I copied it to a Raspberry Pi in 2021 and have not thought about it since, which is the highest compliment I can pay a piece of software.</p>\n<pre data-file=\"main.rs\" data-meta=\"rustc 1.82 · 4.2 MB\"><code>fn main() -&gt; std::io::Result&lt;()&gt; {\n    let root = std::env::args().nth(1).unwrap_or(\".\".into());\n    tiny_http_serve(&amp;root, \"0.0.0.0:8080\")\n}</code></pre>\n<h2>2. Pruning, Not Replanting</h2>\n<p>I have started treating my dotfiles the way I treat the balcony garden—prune a little every week, never replant everything at once. Small tools make that possible because each one can be understood, replaced, or deleted in an afternoon.</p>\n<p>The comparison that made me smile: the same utility as a containerized Node service weighed 384 MB. Nothing about it was wrong. It was simply carrying furniture for a house it would never live in.</p>"
    },
    {
      "slug": "designing-idempotent-webhook-engines-go",
      "title": "Designing Idempotent Webhook Engines in Go: Lessons from Lost Packets",
      "excerpt": "Handling network retries across unpredictable third-party APIs without creating duplicate billing ledger transactions. A look at redis-backed idempotency keys and exactly-once delivery semantics.",
      "side": "engineering",
      "category": "Architecture",
      "tags": [
        "Go",
        "PostgreSQL",
        "Fintech"
      ],
      "cover": null,
      "date": "2024-10-08",
      "featured": false,
      "reads": 1900,
      "reactions": {
        "tea": 14,
        "insight": 37,
        "calm": 5,
        "resonate": 8
      },
      "extra": {
        "refCode": "ARCH-092"
      },
      "content": "<p>Third-party payment providers retry webhooks the way a worried parent calls: often, and without telling you whether the last call got through. If your handler is not idempotent, every retry is a chance to charge someone twice.</p>\n<h2>1. The Idempotency Key Is the Contract</h2>\n<p>We store every incoming event id in a unique index before doing any work. The insert either succeeds—meaning this is the first time we have seen the event—or it fails, and we return the stored response instead of recomputing it.</p>\n<pre data-file=\"webhook.go\" data-meta=\"go 1.23\"><code>_, err := tx.Exec(ctx,\n    `INSERT INTO processed_events (id) VALUES ($1)`, ev.ID)\nif isUniqueViolation(err) {\n    return replayStoredResponse(ctx, ev.ID)\n}</code></pre>\n<h2>2. Exactly-Once Is a Story We Tell Ourselves</h2>\n<p>The network only offers at-least-once delivery. Exactly-once effects come from pairing that with deduplication inside the same transaction as the side effect. Anything else is a race condition waiting for a busy Friday.</p>"
    },
    {
      "slug": "backpressure-in-grpc-streaming",
      "title": "Backpressure Strategies in gRPC Streaming Services",
      "excerpt": "When a slow consumer meets a fast producer over a bidirectional stream, someone has to give. A tour of credit-based flow control and why naive buffering just delays the outage.",
      "side": "engineering",
      "category": "Architecture",
      "tags": [
        "Go",
        "gRPC",
        "Backpressure"
      ],
      "cover": null,
      "date": "2024-10-02",
      "featured": false,
      "reads": 1420,
      "reactions": {
        "tea": 9,
        "insight": 26,
        "calm": 4,
        "resonate": 6
      },
      "extra": {
        "refCode": "ARCH-104"
      },
      "content": "<p>Buffers are a way of postponing a decision. When the producer outpaces the consumer, a bigger buffer only changes when you run out of memory, not whether.</p>\n<h2>1. Credits Instead of Queues</h2>\n<p>In credit-based flow control the consumer tells the producer how many messages it is ready for. The producer never sends more than it has credits for. The stream slows down gracefully instead of falling over dramatically.</p>\n<h2>2. Shed Load Early and Honestly</h2>\n<p>When credits run dry for too long, reject new work at the edge with a clear status code. A fast, honest “not now” is kinder to everyone than a slow, silent timeout.</p>"
    },
    {
      "slug": "memory-reordering-cache-locality-apple-silicon",
      "title": "Memory Reordering and Cache Locality on Apple Silicon M-Series",
      "excerpt": "ARM64 memory consistency models differ subtly from x86-64 TSO. We analyze low-level lockless data structure crashes under heavy multi-core contention.",
      "side": "engineering",
      "category": "Architecture",
      "tags": [
        "ARM",
        "CPlusPlus",
        "Concurrency"
      ],
      "cover": null,
      "date": "2024-09-30",
      "featured": false,
      "reads": 1500,
      "reactions": {
        "tea": 7,
        "insight": 33,
        "calm": 2,
        "resonate": 5
      },
      "extra": {
        "refCode": "SYS-041"
      },
      "content": "<p>Our lock-free ring buffer passed every test on an Intel laptop and crashed within minutes on an M2. The code had not changed. The memory model had.</p>\n<h2>1. x86 Was Quietly Protecting Us</h2>\n<p>x86-64 uses total store order: stores become visible in program order. ARM64 is weaker and may reorder them. Our producer published the index before the payload was visible to other cores.</p>\n<pre data-file=\"ring.cpp\" data-meta=\"clang 17 · arm64\"><code>slots[i] = value;\nhead.store(i + 1, std::memory_order_release); // was relaxed</code></pre>\n<h2>2. Release, Acquire, and Humility</h2>\n<p>One word—<code>release</code>—fixed the crash. The lesson was larger: if a data structure is correct only on one architecture, it was never correct.</p>"
    },
    {
      "slug": "raft-based-config-store-from-scratch",
      "title": "Building a Raft-Based Config Store from Scratch",
      "excerpt": "Implementing leader election and log replication for an internal feature-flag service taught me more about split-brain scenarios than any whitepaper ever did.",
      "side": "engineering",
      "category": "Distributed Systems",
      "tags": [
        "Consensus",
        "Go",
        "DistributedSystems"
      ],
      "cover": null,
      "date": "2024-09-21",
      "featured": false,
      "reads": 2050,
      "reactions": {
        "tea": 18,
        "insight": 44,
        "calm": 6,
        "resonate": 12
      },
      "extra": {
        "refCode": "DIST-063"
      },
      "content": "<p>Reading the Raft paper feels like following a recipe. Implementing it feels like cooking during an earthquake.</p>\n<h2>1. Elections Are the Easy Part</h2>\n<p>Randomized timeouts make leader election surprisingly robust. The hard part is everything after: a new leader must never overwrite entries that a previous leader already committed.</p>\n<h2>2. Testing Split Brain on Purpose</h2>\n<p>We built a tiny network simulator that drops, delays, and reorders messages. Every bug we found in production later had already appeared there first—we just had not believed it yet.</p>"
    },
    {
      "slug": "ebpf-for-pragmatic-sres",
      "title": "eBPF for Pragmatic SREs: Tracing Linux Kernel Packet Drops",
      "excerpt": "Skip tcpdump overhead. How we wrote minimal eBPF probes to catch silent TCP resets during Kubernetes service mesh rollouts in staging.",
      "side": "engineering",
      "category": "Distributed Systems",
      "tags": [
        "eBPF",
        "Linux",
        "Networking"
      ],
      "cover": null,
      "date": "2024-09-18",
      "featured": false,
      "reads": 1100,
      "reactions": {
        "tea": 5,
        "insight": 21,
        "calm": 3,
        "resonate": 4
      },
      "extra": {
        "refCode": "NET-018"
      },
      "content": "<p>Every rollout of the service mesh caused a handful of requests to fail with connection resets. Nothing in the application logs. Nothing in the proxy logs. The kernel knew, but it was not telling.</p>\n<h2>1. Asking the Kernel Directly</h2>\n<p>A twenty-line eBPF program attached to the <code>tcp_reset</code> tracepoint printed the exact socket, process, and stack for every reset—without the overhead of capturing every packet.</p>\n<h2>2. The Culprit</h2>\n<p>Draining pods closed their listening sockets before the load balancer stopped sending traffic. A three-second pre-stop sleep, deeply unglamorous, fixed it.</p>"
    },
    {
      "slug": "zero-downtime-schema-migrations-at-scale",
      "title": "Zero-Downtime Schema Migrations at Scale",
      "excerpt": "Adding a NOT NULL column to a table with 400M rows without locking writers for even a second — the backfill-then-constrain dance, step by step.",
      "side": "engineering",
      "category": "Architecture",
      "tags": [
        "PostgreSQL",
        "Migrations",
        "Reliability"
      ],
      "cover": null,
      "date": "2024-09-12",
      "featured": false,
      "reads": 1780,
      "reactions": {
        "tea": 11,
        "insight": 39,
        "calm": 7,
        "resonate": 10
      },
      "extra": {
        "refCode": "ARCH-127"
      },
      "content": "<p>The naive migration took an exclusive lock on a 400-million-row table. The careful one took four deploys and zero seconds of blocked writes.</p>\n<h2>1. Expand</h2>\n<p>Add the column as nullable with no default. Deploy code that writes it for new rows. Backfill old rows in small batches during quiet hours.</p>\n<pre data-file=\"migration.sql\" data-meta=\"postgres 16\"><code>ALTER TABLE orders ADD COLUMN region TEXT;\nALTER TABLE orders ADD CONSTRAINT region_not_null\n  CHECK (region IS NOT NULL) NOT VALID;\nALTER TABLE orders VALIDATE CONSTRAINT region_not_null;</code></pre>\n<h2>2. Contract</h2>\n<p>Validating a <code>NOT VALID</code> check constraint only takes a light lock. Once it is validated, Postgres can promote it to <code>NOT NULL</code> without rescanning the table.</p>"
    },
    {
      "slug": "designing-software-with-warmth",
      "title": "Designing Software with Warmth: Why I Left Metric Obsessions to Build Slow Digital Craft",
      "excerpt": "Modern tools treat users as retention numbers to squeeze. What happens when we build digital spaces that honor paper textures, silence, and gentle completion instead of infinite loops? Notes on architecture, slow software, and inner peace.",
      "side": "life",
      "category": "Tea & Solitude",
      "tags": [
        "Philosophy",
        "HanoiMornings",
        "SlowCraft"
      ],
      "cover": "assets/featured-essay.png",
      "date": "2024-10-18",
      "featured": true,
      "reads": 7800,
      "reactions": {
        "tea": 142,
        "insight": 89,
        "calm": 214,
        "resonate": 67
      },
      "extra": {
        "refCode": "ESSAY-09",
        "essayNo": 9,
        "tagline": "Reflections on Calm Computing",
        "revision": "Living Document (v1.3 · 4 annotations)",
        "coverCaption": "Archival Essay #09",
        "colophon": "Finished on an antique mahogany table at Cà phê Yên, Quán Thánh.",
        "ledger": "This entry forms the 9th chapter of the \"Slow Computation Manifestos\" series. Next edition focuses on single-file hypertexts and garden wikis."
      },
      "content": "<p>It was three o'clock in the morning in a high-rise flat in Hanoi when I last audited a churn report. The screen glowed with that harsh, clinical blue light that strips away circadian memory. Spreadsheets of retention decay, weekly cohorts divided into percentiles, and A/B test splits measuring whether a slightly more anxious shade of crimson badge produced a 0.38% increase in notifications cleared.</p>\n<p>I closed the aluminum lid of my workstation and listened to the rain tapping upon the corrugated zinc eaves below. In the silence of that room, surrounded by notebooks bound in untreated mulberry paper (Giấy Dó) and an old stoneware cup half-filled with cold tea, the absurdity laid itself bare. We had traded the warmth of physical instruments—pens that patina with our fingers, books that remember where our thumbs rested—for machines configured strictly to trap our fleeting attention.</p>\n<h2>1. The Scent of Old Paper in a Digital World</h2>\n<p>Paper possesses what Italian publisher Roberto Calasso referred to as an \"unobtrusive finality.\" When you write in a journal or open a clothbound book, the object does not demand you invite four friends. It does not ping you while you reflect upon a sentence. It does not measure your pupil velocity to rearrange the remaining chapters.</p>\n<p>Digital tools, conversely, have become noisy thoroughfares. They are engineered under the premise that idle time is wasted equity. But contemplation requires unoccupied space. When a tool respects a reader’s silence, it restores their agency.</p>\n<figure class=\"quote\"><blockquote>“The screen is not just a viewport for pixels; it is an extension of the human desk. When you respect the reader's silence, you give them back their own thoughts.”</blockquote><figcaption>Marginalia from notebook #14 · Written at Yên Phụ Lake</figcaption></figure>\n<p>If we model our digital interfaces after physical heirlooms—warm parchment, muted linen tones, and soft elevations rather than icy fluorescent panels—the user’s biological stress response eases. We move from a posture of vigilance to one of mindful study.</p>\n<figure class=\"photo\" data-coords=\"21.0285° N, 105.8542° E\"><img src=\"assets/featured-essay.png\" alt=\"Cuốn sổ tay buổi sáng bên tách trà\" /><figcaption>My morning notebook next to a warm cup of Shan Tuyết tea, October rain in Hanoi.</figcaption></figure>\n<h2>2. The Tyranny of the Engagement Loop</h2>\n<p>Every metric in contemporary consumer software optimizes for the wrong end of the human experience. We celebrate \"Daily Active Usage\" when we should celebrate \"Time to Calm Resolution.\" We reward algorithms that stretch a fifteen-minute inquiry into a two-hour scroll vortex.</p>\n<p>When you build software around metrics of speed and volume, you inadvertently treat stillness as a bug. But stillness is where creative discernment germinates.</p>\n<aside class=\"note\"><div><strong>Visitor Note by Minh (2 days ago):</strong> “This reminds me of Christopher Alexander’s notion of the ‘Quality Without a Name’ in architecture. Good software feels like a cedar wood door that glides shut with a soft click.”</div></aside>\n<h2>3. Architecture of Calm Systems</h2>\n<p>How do we translate these philosophical leanings into actual system constraints? First, by declaring termination points. Every session must have a natural closing ritual. Unlike infinite social feeds, this journal page ends when the essay ends. There is no automated recommendation carousel to snatch you into another loop.</p>\n<pre data-file=\"session_intent.rs\" data-meta=\"rustc 1.82 · calm-protocol\"><code><span class=\"tk-c\">// Prioritize intentionality over infinite streaming</span>\n<span class=\"tk-k\">pub struct</span> <span class=\"tk-n\">ReadingSession</span> {\n    <span class=\"tk-p\">pub tea_poured</span>: <span class=\"tk-t\">bool</span>,\n    <span class=\"tk-p\">pub notifications_muted</span>: <span class=\"tk-t\">bool</span>,\n    <span class=\"tk-p\">pub reading_pace_wpm</span>: <span class=\"tk-t\">u16</span>,\n    <span class=\"tk-p\">pub exit_guarantee</span>: <span class=\"tk-t\">Option</span>&lt;<span class=\"tk-g\">PeaceOfMind</span>&gt;,\n}\n\n<span class=\"tk-k\">impl</span> <span class=\"tk-t\">ReadingSession</span> {\n    <span class=\"tk-k\">pub fn</span> <span class=\"tk-f\">honor_human_presence</span>(&amp;<span class=\"tk-p\">self</span>) -&gt; <span class=\"tk-g\">Tranquility</span> {\n        <span class=\"tk-c\">// Never poll for push notifications while thought unfolds</span>\n        <span class=\"tk-g\">Tranquility</span>::<span class=\"tk-t\">UninterruptedThought</span>\n    }\n}</code></pre>\n<p>Notice that the program enforces boundaries rather than optimization hooks. The goal of calm engineering is not to maximize user retention minutes, but to deepen the quality of each unhurried minute spent.</p>\n<h2>4. Code as Furniture: Building for Decades</h2>\n<p>Consider a sturdy bamboo bench or a well-joined oak desk. It does not deprecate every sixteen months due to a framework overhaul. It withstands humidity; it gathers sunlight and darkens graciously.</p>\n<p>When we craft personal websites and mindful software, we should build with semantic simplicity. Plain HTML, accessible typography, local-first archives, and enduring formats like plain text and RSS feeds guarantee that our words will still be legible fifty years from this rainy autumn dawn.</p>"
    },
    {
      "slug": "on-5am-rain-and-cold-brew",
      "title": "On 5 AM Rain and Cold Brew: What Hanoi Taught Me About Creative Solitude",
      "excerpt": "Before the motorbikes engulf the boulevard, Hanoi holds a pristine stillness. Standing on a damp balcony with cold-steeped Robusta, watching the street vendors gather under streetlamps.",
      "side": "life",
      "category": "Hanoi Essays",
      "tags": [
        "Hanoi",
        "Solitude",
        "Memoir"
      ],
      "cover": null,
      "date": "2024-11-03",
      "featured": false,
      "reads": 2600,
      "reactions": {
        "tea": 48,
        "insight": 12,
        "calm": 77,
        "resonate": 29
      },
      "extra": {
        "essayNo": 11,
        "quote": "The quiet isn't an absence of noise, but the arrival of your own voice."
      },
      "content": "<p>At five in the morning Hanoi is a different city. The motorbikes are still asleep. Street vendors unwrap sticky rice from banana leaves under the orange hum of streetlamps, and the rain washes the dust off French colonial roofs.</p>\n<h2>1. The Balcony Hour</h2>\n<p>I keep a jar of cold-steeped Robusta in the fridge for this hour. Standing on the damp balcony, I do not write anything. I just listen until the first bus sighs past on Phan Đình Phùng.</p>\n<figure class=\"quote\"><blockquote>“The quiet isn't an absence of noise, but the arrival of your own voice.”</blockquote><figcaption>Scribbled on the back of a receipt · Hàng Bông</figcaption></figure>\n<h2>2. Solitude Is Not Loneliness</h2>\n<p>There is a shared quiet between strangers at this hour—the phở seller, the woman sweeping leaves, the man practicing tai chi by the lake. Nobody speaks, and everybody is keeping each other company.</p>"
    },
    {
      "slug": "rain-and-solitude",
      "title": "Rain and Solitude: Why Slow Writers Cherish October Monsoons",
      "excerpt": "The long archive edition — twelve chapters, one pot of tea.",
      "side": "life",
      "category": "Hanoi Essays",
      "tags": [
        "Hanoi",
        "Writing",
        "Archive"
      ],
      "cover": null,
      "date": "2024-10-25",
      "featured": false,
      "reads": 1210,
      "reactions": {
        "tea": 30,
        "insight": 18,
        "calm": 41,
        "resonate": 7
      },
      "extra": {
        "essayNo": 10,
        "tagline": "Archive Edition",
        "colophon": "Written across three rainy evenings on Phan Đình Phùng street."
      },
      "content": "<p>This is the long-form archive edition. It stitches several chapters together, written across three rainy evenings, so that the monsoon has time to arrive, settle in, and leave again before the last page.</p>\n<h2>1. The Scent of Old Paper in a Digital World</h2>\n<p>Paper possesses what Italian publisher Roberto Calasso referred to as an \"unobtrusive finality.\" When you write in a journal or open a clothbound book, the object does not demand you invite four friends. It does not ping you while you reflect upon a sentence. It does not measure your pupil velocity to rearrange the remaining chapters.</p>\n<p>Digital tools, conversely, have become noisy thoroughfares. They are engineered under the premise that idle time is wasted equity. But contemplation requires unoccupied space. When a tool respects a reader’s silence, it restores their agency.</p>\n<figure class=\"quote\"><blockquote>“The screen is not just a viewport for pixels; it is an extension of the human desk. When you respect the reader's silence, you give them back their own thoughts.”</blockquote><figcaption>Marginalia from notebook #14 · Written at Yên Phụ Lake</figcaption></figure>\n<p>If we model our digital interfaces after physical heirlooms—warm parchment, muted linen tones, and soft elevations rather than icy fluorescent panels—the user’s biological stress response eases. We move from a posture of vigilance to one of mindful study.</p>\n<figure class=\"photo\" data-coords=\"21.0285° N, 105.8542° E\"><img src=\"assets/featured-essay.png\" alt=\"Cuốn sổ tay buổi sáng bên tách trà\" /><figcaption>My morning notebook next to a warm cup of Shan Tuyết tea, October rain in Hanoi.</figcaption></figure>\n\n<h2>2. The Tyranny of the Engagement Loop</h2>\n<p>Every metric in contemporary consumer software optimizes for the wrong end of the human experience. We celebrate \"Daily Active Usage\" when we should celebrate \"Time to Calm Resolution.\" We reward algorithms that stretch a fifteen-minute inquiry into a two-hour scroll vortex.</p>\n<p>When you build software around metrics of speed and volume, you inadvertently treat stillness as a bug. But stillness is where creative discernment germinates.</p>\n<aside class=\"note\"><div><strong>Visitor Note by Minh (2 days ago):</strong> “This reminds me of Christopher Alexander’s notion of the ‘Quality Without a Name’ in architecture. Good software feels like a cedar wood door that glides shut with a soft click.”</div></aside>\n\n<h2>3. Architecture of Calm Systems</h2>\n<p>How do we translate these philosophical leanings into actual system constraints? First, by declaring termination points. Every session must have a natural closing ritual. Unlike infinite social feeds, this journal page ends when the essay ends. There is no automated recommendation carousel to snatch you into another loop.</p>\n<pre data-file=\"session_intent.rs\" data-meta=\"rustc 1.82 · calm-protocol\"><code><span class=\"tk-c\">// Prioritize intentionality over infinite streaming</span>\n<span class=\"tk-k\">pub struct</span> <span class=\"tk-n\">ReadingSession</span> {\n    <span class=\"tk-p\">pub tea_poured</span>: <span class=\"tk-t\">bool</span>,\n    <span class=\"tk-p\">pub notifications_muted</span>: <span class=\"tk-t\">bool</span>,\n    <span class=\"tk-p\">pub reading_pace_wpm</span>: <span class=\"tk-t\">u16</span>,\n    <span class=\"tk-p\">pub exit_guarantee</span>: <span class=\"tk-t\">Option</span>&lt;<span class=\"tk-g\">PeaceOfMind</span>&gt;,\n}\n\n<span class=\"tk-k\">impl</span> <span class=\"tk-t\">ReadingSession</span> {\n    <span class=\"tk-k\">pub fn</span> <span class=\"tk-f\">honor_human_presence</span>(&amp;<span class=\"tk-p\">self</span>) -&gt; <span class=\"tk-g\">Tranquility</span> {\n        <span class=\"tk-c\">// Never poll for push notifications while thought unfolds</span>\n        <span class=\"tk-g\">Tranquility</span>::<span class=\"tk-t\">UninterruptedThought</span>\n    }\n}</code></pre>\n<p>Notice that the program enforces boundaries rather than optimization hooks. The goal of calm engineering is not to maximize user retention minutes, but to deepen the quality of each unhurried minute spent.</p>\n\n<h2>4. Code as Furniture: Building for Decades</h2>\n<p>Consider a sturdy bamboo bench or a well-joined oak desk. It does not deprecate every sixteen months due to a framework overhaul. It withstands humidity; it gathers sunlight and darkens graciously.</p>\n<p>When we craft personal websites and mindful software, we should build with semantic simplicity. Plain HTML, accessible typography, local-first archives, and enduring formats like plain text and RSS feeds guarantee that our words will still be legible fifty years from this rainy autumn dawn.</p>\n<h2>5. The Scent of Old Paper in a Digital World</h2>\n<p>Paper possesses what Italian publisher Roberto Calasso referred to as an \"unobtrusive finality.\" When you write in a journal or open a clothbound book, the object does not demand you invite four friends. It does not ping you while you reflect upon a sentence. It does not measure your pupil velocity to rearrange the remaining chapters.</p>\n<p>Digital tools, conversely, have become noisy thoroughfares. They are engineered under the premise that idle time is wasted equity. But contemplation requires unoccupied space. When a tool respects a reader’s silence, it restores their agency.</p>\n<figure class=\"quote\"><blockquote>“The screen is not just a viewport for pixels; it is an extension of the human desk. When you respect the reader's silence, you give them back their own thoughts.”</blockquote><figcaption>Marginalia from notebook #14 · Written at Yên Phụ Lake</figcaption></figure>\n<p>If we model our digital interfaces after physical heirlooms—warm parchment, muted linen tones, and soft elevations rather than icy fluorescent panels—the user’s biological stress response eases. We move from a posture of vigilance to one of mindful study.</p>\n<figure class=\"photo\" data-coords=\"21.0285° N, 105.8542° E\"><img src=\"assets/featured-essay.png\" alt=\"Cuốn sổ tay buổi sáng bên tách trà\" /><figcaption>My morning notebook next to a warm cup of Shan Tuyết tea, October rain in Hanoi.</figcaption></figure>\n\n<h2>6. The Tyranny of the Engagement Loop</h2>\n<p>Every metric in contemporary consumer software optimizes for the wrong end of the human experience. We celebrate \"Daily Active Usage\" when we should celebrate \"Time to Calm Resolution.\" We reward algorithms that stretch a fifteen-minute inquiry into a two-hour scroll vortex.</p>\n<p>When you build software around metrics of speed and volume, you inadvertently treat stillness as a bug. But stillness is where creative discernment germinates.</p>\n<aside class=\"note\"><div><strong>Visitor Note by Minh (2 days ago):</strong> “This reminds me of Christopher Alexander’s notion of the ‘Quality Without a Name’ in architecture. Good software feels like a cedar wood door that glides shut with a soft click.”</div></aside>\n\n<h2>7. Architecture of Calm Systems</h2>\n<p>How do we translate these philosophical leanings into actual system constraints? First, by declaring termination points. Every session must have a natural closing ritual. Unlike infinite social feeds, this journal page ends when the essay ends. There is no automated recommendation carousel to snatch you into another loop.</p>\n<pre data-file=\"session_intent.rs\" data-meta=\"rustc 1.82 · calm-protocol\"><code><span class=\"tk-c\">// Prioritize intentionality over infinite streaming</span>\n<span class=\"tk-k\">pub struct</span> <span class=\"tk-n\">ReadingSession</span> {\n    <span class=\"tk-p\">pub tea_poured</span>: <span class=\"tk-t\">bool</span>,\n    <span class=\"tk-p\">pub notifications_muted</span>: <span class=\"tk-t\">bool</span>,\n    <span class=\"tk-p\">pub reading_pace_wpm</span>: <span class=\"tk-t\">u16</span>,\n    <span class=\"tk-p\">pub exit_guarantee</span>: <span class=\"tk-t\">Option</span>&lt;<span class=\"tk-g\">PeaceOfMind</span>&gt;,\n}\n\n<span class=\"tk-k\">impl</span> <span class=\"tk-t\">ReadingSession</span> {\n    <span class=\"tk-k\">pub fn</span> <span class=\"tk-f\">honor_human_presence</span>(&amp;<span class=\"tk-p\">self</span>) -&gt; <span class=\"tk-g\">Tranquility</span> {\n        <span class=\"tk-c\">// Never poll for push notifications while thought unfolds</span>\n        <span class=\"tk-g\">Tranquility</span>::<span class=\"tk-t\">UninterruptedThought</span>\n    }\n}</code></pre>\n<p>Notice that the program enforces boundaries rather than optimization hooks. The goal of calm engineering is not to maximize user retention minutes, but to deepen the quality of each unhurried minute spent.</p>\n\n<h2>8. Code as Furniture: Building for Decades</h2>\n<p>Consider a sturdy bamboo bench or a well-joined oak desk. It does not deprecate every sixteen months due to a framework overhaul. It withstands humidity; it gathers sunlight and darkens graciously.</p>\n<p>When we craft personal websites and mindful software, we should build with semantic simplicity. Plain HTML, accessible typography, local-first archives, and enduring formats like plain text and RSS feeds guarantee that our words will still be legible fifty years from this rainy autumn dawn.</p>\n<h2>9. The Scent of Old Paper in a Digital World</h2>\n<p>Paper possesses what Italian publisher Roberto Calasso referred to as an \"unobtrusive finality.\" When you write in a journal or open a clothbound book, the object does not demand you invite four friends. It does not ping you while you reflect upon a sentence. It does not measure your pupil velocity to rearrange the remaining chapters.</p>\n<p>Digital tools, conversely, have become noisy thoroughfares. They are engineered under the premise that idle time is wasted equity. But contemplation requires unoccupied space. When a tool respects a reader’s silence, it restores their agency.</p>\n<figure class=\"quote\"><blockquote>“The screen is not just a viewport for pixels; it is an extension of the human desk. When you respect the reader's silence, you give them back their own thoughts.”</blockquote><figcaption>Marginalia from notebook #14 · Written at Yên Phụ Lake</figcaption></figure>\n<p>If we model our digital interfaces after physical heirlooms—warm parchment, muted linen tones, and soft elevations rather than icy fluorescent panels—the user’s biological stress response eases. We move from a posture of vigilance to one of mindful study.</p>\n<figure class=\"photo\" data-coords=\"21.0285° N, 105.8542° E\"><img src=\"assets/featured-essay.png\" alt=\"Cuốn sổ tay buổi sáng bên tách trà\" /><figcaption>My morning notebook next to a warm cup of Shan Tuyết tea, October rain in Hanoi.</figcaption></figure>\n\n<h2>10. The Tyranny of the Engagement Loop</h2>\n<p>Every metric in contemporary consumer software optimizes for the wrong end of the human experience. We celebrate \"Daily Active Usage\" when we should celebrate \"Time to Calm Resolution.\" We reward algorithms that stretch a fifteen-minute inquiry into a two-hour scroll vortex.</p>\n<p>When you build software around metrics of speed and volume, you inadvertently treat stillness as a bug. But stillness is where creative discernment germinates.</p>\n<aside class=\"note\"><div><strong>Visitor Note by Minh (2 days ago):</strong> “This reminds me of Christopher Alexander’s notion of the ‘Quality Without a Name’ in architecture. Good software feels like a cedar wood door that glides shut with a soft click.”</div></aside>\n\n<h2>11. Architecture of Calm Systems</h2>\n<p>How do we translate these philosophical leanings into actual system constraints? First, by declaring termination points. Every session must have a natural closing ritual. Unlike infinite social feeds, this journal page ends when the essay ends. There is no automated recommendation carousel to snatch you into another loop.</p>\n<pre data-file=\"session_intent.rs\" data-meta=\"rustc 1.82 · calm-protocol\"><code><span class=\"tk-c\">// Prioritize intentionality over infinite streaming</span>\n<span class=\"tk-k\">pub struct</span> <span class=\"tk-n\">ReadingSession</span> {\n    <span class=\"tk-p\">pub tea_poured</span>: <span class=\"tk-t\">bool</span>,\n    <span class=\"tk-p\">pub notifications_muted</span>: <span class=\"tk-t\">bool</span>,\n    <span class=\"tk-p\">pub reading_pace_wpm</span>: <span class=\"tk-t\">u16</span>,\n    <span class=\"tk-p\">pub exit_guarantee</span>: <span class=\"tk-t\">Option</span>&lt;<span class=\"tk-g\">PeaceOfMind</span>&gt;,\n}\n\n<span class=\"tk-k\">impl</span> <span class=\"tk-t\">ReadingSession</span> {\n    <span class=\"tk-k\">pub fn</span> <span class=\"tk-f\">honor_human_presence</span>(&amp;<span class=\"tk-p\">self</span>) -&gt; <span class=\"tk-g\">Tranquility</span> {\n        <span class=\"tk-c\">// Never poll for push notifications while thought unfolds</span>\n        <span class=\"tk-g\">Tranquility</span>::<span class=\"tk-t\">UninterruptedThought</span>\n    }\n}</code></pre>\n<p>Notice that the program enforces boundaries rather than optimization hooks. The goal of calm engineering is not to maximize user retention minutes, but to deepen the quality of each unhurried minute spent.</p>\n\n<h2>12. Code as Furniture: Building for Decades</h2>\n<p>Consider a sturdy bamboo bench or a well-joined oak desk. It does not deprecate every sixteen months due to a framework overhaul. It withstands humidity; it gathers sunlight and darkens graciously.</p>\n<p>When we craft personal websites and mindful software, we should build with semantic simplicity. Plain HTML, accessible typography, local-first archives, and enduring formats like plain text and RSS feeds guarantee that our words will still be legible fifty years from this rainy autumn dawn.</p>"
    },
    {
      "slug": "notes-from-a-dust-covered-bookstore",
      "title": "Notes from a Dust-Covered Bookstore on Tràng Thi Street",
      "excerpt": "Unearthing a 1982 French-Vietnamese translation of Saint-Exupéry with pencil marginalia by a former geography teacher. What physical marginalia tells us about reader companionship across time.",
      "side": "life",
      "category": "Book Marginalia",
      "tags": [
        "OldBooks",
        "Marginalia",
        "TrangThi"
      ],
      "cover": null,
      "date": "2024-09-15",
      "featured": false,
      "reads": 1300,
      "reactions": {
        "tea": 26,
        "insight": 15,
        "calm": 31,
        "resonate": 22
      },
      "extra": {
        "essayNo": 7,
        "pullQuote": "\"Trang 48: Nỗi buồn này không còn là của riêng ta.\""
      },
      "content": "<p>The bookstore on Tràng Thi has no sign, only a stack of paperbacks leaning against the doorframe like a tired guard. Inside, dust hangs in the light the way it does in old churches.</p>\n<h2>1. A Stranger in the Margins</h2>\n<p>I found a 1982 translation of <em>Le Petit Prince</em> with pencil notes on almost every page. The handwriting belonged to a geography teacher—her name was inside the cover, next to a school stamp from Nam Định.</p>\n<figure class=\"quote\"><blockquote>“Trang 48: Nỗi buồn này không còn là của riêng ta.”</blockquote><figcaption>Pencil marginalia, page 48</figcaption></figure>\n<h2>2. Reader Companionship</h2>\n<p>Marginalia is a conversation with no reply expected. Forty years later I answered anyway, in a notebook of my own, and felt less alone than I have in any comment section.</p>"
    },
    {
      "slug": "motorbike-horns-at-midnight",
      "title": "Motorbike Horns at Midnight: A Love Letter to Old Quarter Traffic",
      "excerpt": "There's a rhythm to the honking after 11 PM that outsiders mistake for chaos. Three years in, I've started to miss it on the one night a month it goes quiet.",
      "side": "life",
      "category": "Hanoi Essays",
      "tags": [
        "Hanoi",
        "NightLife"
      ],
      "cover": null,
      "date": "2024-10-05",
      "featured": false,
      "reads": 980,
      "reactions": {
        "tea": 12,
        "insight": 6,
        "calm": 9,
        "resonate": 19
      },
      "extra": {},
      "content": "<p>Visitors hear noise. After a while you start to hear grammar: a short tap means “I am here,” two taps mean “I am passing,” and a long one means someone's uncle is late for dinner.</p>\n<h2>1. The Night It Went Quiet</h2>\n<p>During the Lunar New Year the Old Quarter empties. The silence was so complete that I could hear the refrigerator from the bedroom. I did not sleep well at all.</p>\n<h2>2. Chaos With Manners</h2>\n<p>The traffic here is a distributed system without a coordinator, and somehow it converges. I think about that more than I should when designing consensus protocols.</p>"
    },
    {
      "slug": "balcony-ferns-and-rain",
      "title": "Balcony Ferns & Rain: An Autumn Snapshot from Hoàng Hoa Thám Street",
      "excerpt": "The morning quiet before the city revs its motorbikes on Hoàng Hoa Thám street — a small photo journal of the balcony ferns that survived the autumn rain.",
      "side": "life",
      "category": "Photo Journals",
      "tags": [
        "Hanoi",
        "Photography",
        "FilmRolls"
      ],
      "cover": "assets/snapshot-desk.png",
      "date": "2024-09-28",
      "featured": false,
      "reads": 640,
      "reactions": {
        "tea": 9,
        "insight": 2,
        "calm": 24,
        "resonate": 6
      },
      "extra": {
        "camera": "Rollei 35 · Portra 400"
      },
      "content": "<p>One roll of Portra 400, one Rollei 35, and a balcony that faces the wrong way for sunlight. The ferns do not seem to mind.</p>\n<figure class=\"photo\" data-coords=\"21.0452° N, 105.8188° E\"><img src=\"assets/snapshot-desk.png\" alt=\"Autumn desk and ferns still life\" /><figcaption>Autumn Desk &amp; Ferns · 2024</figcaption></figure>\n<h2>1. Shooting Slowly</h2>\n<p>Film forces patience. Thirty-six frames means thinking before pressing, and waiting a week for the lab means forgetting what you shot—so every scan feels like a letter from a past self.</p>\n<h2>2. What Survived</h2>\n<p>Two of the four ferns made it through the September storms. I kept the brown fronds in the photos too. Survival is more honest with the damage included.</p>"
    },
    {
      "slug": "reheating-yesterdays-oolong",
      "title": "The Ritual of Reheating Yesterday's Oolong",
      "excerpt": "A half-full cup left overnight isn't waste — it's tomorrow's five-minute meditation, if you let the kettle do the rest.",
      "side": "life",
      "category": "Tea & Solitude",
      "tags": [
        "Tea",
        "SlowMornings"
      ],
      "cover": null,
      "date": "2024-09-25",
      "featured": false,
      "reads": 860,
      "reactions": {
        "tea": 37,
        "insight": 4,
        "calm": 28,
        "resonate": 11
      },
      "extra": {},
      "content": "<p>Tea purists will tell you never to reheat tea. They are right about the taste and wrong about the point.</p>\n<h2>1. Five Minutes That Belong to No One</h2>\n<p>Pouring yesterday's oolong back into the small clay pot, waiting for the kettle, warming my hands on the cup—those five minutes are not productive. That is exactly why I protect them.</p>\n<h2>2. Leaving Things Unfinished</h2>\n<p>A half-full cup is a promise that tomorrow will come and that I will be there to finish what I started. Some mornings that is enough of a plan.</p>"
    }
  ],
  "notes": [
    {
      "name": "Maya S.",
      "role": "Distributed Systems Engineer",
      "location": "Tokyo, Japan",
      "topic": "EngineeringSolitude",
      "message": "Your article on slow engineering cured my burnout this week. Reading about intentional systems from a quiet Tokyo cafe made me breathe again. Cảm ơn Kiên!",
      "date": "2024-11-10",
      "reply": "Maya, that means the world. Keep building gently; distributed systems are just human agreements written in silicon.",
      "replyContext": "Over morning Oolong",
      "postSlug": "designing-software-with-warmth"
    },
    {
      "name": "Lucas B.",
      "role": "Architect & Wandering Drinker",
      "location": "Lyon, France",
      "topic": "TeaAndHanoi",
      "message": "Visited Hanoi last month because of your tea shop recommendations on Hoàn Kiếm. The misty morning at 6:00 AM with the hot cup of lotus tea was pure cinema. Sending warmth from Lyon!",
      "date": "2024-11-08"
    },
    {
      "name": "A fellow night owl coder",
      "role": null,
      "location": "Melbourne, Australia",
      "topic": "AtticMusings",
      "message": "Just wanted to say this corner of the internet feels like opening an attic window on a rainy afternoon. Keep the slow craft alive. It reminds us why we fell in love with coding in the first place.",
      "date": "2024-11-04"
    },
    {
      "name": "Anja V.",
      "role": null,
      "location": "Berlin, Germany",
      "topic": "BookMusings",
      "message": "Your reading list led me to Calvino's Invisible Cities. Now my software architecture diagrams resemble Venetian water palaces. Thank you for the poetic lens.",
      "date": "2024-10-24"
    },
    {
      "name": "Thảo N.",
      "role": "Illustrator",
      "location": "Đà Nẵng, Việt Nam",
      "topic": "TeaAndHanoi",
      "message": "Đọc bài về trà ô long hâm lại mà nhớ bà nội. Bà cũng không bao giờ đổ trà thừa, sáng nào cũng hâm lại trong ấm đất nhỏ.",
      "date": "2024-10-19",
      "reply": "Cảm ơn Thảo. Có lẽ bà nội bạn và mình đã học cùng một bài học từ những chiếc ấm đất.",
      "replyContext": "Written at Cà phê Yên"
    },
    {
      "name": "Kenji O.",
      "role": "SRE",
      "location": "Osaka, Japan",
      "topic": "EngineeringSolitude",
      "message": "The eBPF write-up saved our Friday. The three-second pre-stop sleep is now a comment in our Helm chart with a link to your post.",
      "date": "2024-10-12",
      "postSlug": "ebpf-for-pragmatic-sres"
    },
    {
      "name": "Priya R.",
      "role": "Librarian",
      "location": "Bangalore, India",
      "topic": "BookMusings",
      "message": "I collect marginalia too! A 1960s copy of Siddhartha in our library has a whole love story written in the margins, one page at a time.",
      "date": "2024-10-02",
      "postSlug": "notes-from-a-dust-covered-bookstore"
    },
    {
      "name": "Tomás L.",
      "role": null,
      "location": "Lisbon, Portugal",
      "topic": "AtticMusings",
      "message": "Found your journal at 2 AM looking for Raft explanations and stayed for the tea essays. A strange and lovely combination.",
      "date": "2024-09-27"
    }
  ],
  "about": {
    "name": "Kiên",
    "role": "Software Artisan & Essayist",
    "location": "Hà Nội, Việt Nam",
    "portrait": "assets/profile.png",
    "intro": "I build calm distributed systems by day and write slow essays about Hanoi, tea, and old books by lamplight.",
    "bio": [
      "Chào bạn, mình là Kiên. I have spent the last eight years designing event pipelines, payment ledgers, and the unglamorous plumbing that keeps software honest under load.",
      "This journal is my attempt to keep both halves of my life on the same desk: Side A for systems and code, Side B for the rain, the tea, and the people I meet in the margins of books. It has no analytics, no pop-ups, and no infinite scroll—only pages that end."
    ],
    "now": {
      "updated": "2024-11-10",
      "items": [
        {
          "icon": "bi-code-slash",
          "label": "Building",
          "text": "A tiny single-binary RSS reader in Rust that fits on a floppy disk."
        },
        {
          "icon": "bi-book-half",
          "label": "Reading",
          "text": "Ted Chiang's Exhalation & Christopher Alexander's The Timeless Way of Building."
        },
        {
          "icon": "bi-music-note-beamed",
          "label": "Listening",
          "text": "Rainy Kyoto lofi, looping on a second-hand vinyl player."
        },
        {
          "icon": "bi-cup-hot",
          "label": "Brewing",
          "text": "Wild Shan Tuyết oolong from Hà Giang, three infusions per morning."
        },
        {
          "icon": "bi-geo-alt",
          "label": "Wandering",
          "text": "Early walks around Trúc Bạch lake before the motorbikes wake up."
        }
      ]
    },
    "gear": [
      {
        "icon": "bi-laptop",
        "name": "ThinkPad X1 Carbon",
        "detail": "Arch Linux, Neovim, 16GB RAM"
      },
      {
        "icon": "bi-keyboard",
        "name": "Mechanical keyboard",
        "detail": "Heavy keycaps, tactile switches"
      },
      {
        "icon": "bi-pen",
        "name": "Lamy 2000",
        "detail": "Fine nib, Iroshizuku Yama-guri ink"
      },
      {
        "icon": "bi-camera",
        "name": "Rollei 35",
        "detail": "Kodak Portra 400, one roll a month"
      },
      {
        "icon": "bi-cup-straw",
        "name": "Yixing clay pot",
        "detail": "Seasoned by six years of oolong"
      },
      {
        "icon": "bi-journal-bookmark",
        "name": "Giấy Dó notebooks",
        "detail": "Hand-bound mulberry paper"
      }
    ],
    "timeline": [
      {
        "year": "2016",
        "title": "First production outage",
        "text": "Learned that every system is a promise to someone asleep."
      },
      {
        "year": "2019",
        "title": "Started the journal",
        "text": "A single HTML file and an RSS feed. Still the best decision."
      },
      {
        "year": "2022",
        "title": "Moved back to Hà Nội",
        "text": "Swapped a glass office for a balcony desk above Phan Đình Phùng."
      },
      {
        "year": "2024",
        "title": "Volume IV",
        "text": "Two sides of one notebook: craft & systems, soul & everyday."
      }
    ],
    "gallery": [
      {
        "src": "assets/snapshot-desk.png",
        "caption": "Autumn Desk & Ferns · 2024"
      },
      {
        "src": "assets/featured-essay.png",
        "caption": "Morning notebook · Shan Tuyết tea"
      },
      {
        "src": "assets/desk/placeholder-daily-brew.svg",
        "caption": "Daily Brew"
      }
    ],
    "colophon": [
      {
        "label": "Typefaces",
        "value": "EB Garamond for reading, Geist for interface, JetBrains Mono for code."
      },
      {
        "label": "Frontend",
        "value": "Hand-written HTML, CSS & vanilla JavaScript. No framework, no tracker."
      },
      {
        "label": "Backend",
        "value": "Flask + SQLite, parameterized SQL, no ORM."
      },
      {
        "label": "Hosting",
        "value": "A small VPS in Singapore, rebuilt by hand once a year."
      }
    ],
    "tipJar": {
      "text": "If an essay kept you company, you can buy me a cup of cà phê trứng. It goes straight into the tea fund.",
      "methods": [
        {
          "label": "Momo",
          "value": "Sắp cập nhật"
        },
        {
          "label": "Ko-fi",
          "value": "Sắp cập nhật"
        }
      ]
    },
    "links": [
      {
        "icon": "bi-github",
        "label": "GitHub",
        "href": "https://github.com/"
      },
      {
        "icon": "bi-rss",
        "label": "RSS Feed",
        "href": "/api/rss"
      },
      {
        "icon": "bi-envelope-paper",
        "label": "Whisper Box",
        "href": "whisper-box.html"
      }
    ]
  }
};
