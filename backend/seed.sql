-- seed.sql: dữ liệu mẫu cho blog (15 bài viết + 10 bưu thiếp)
-- File này chỉ chạy khi bảng posts còn trống (xem hàm init_db trong database.py).
-- Muốn nạp lại từ đầu: xoá file blog.db rồi chạy lại python app.py

-- ===================== BÀI VIẾT =====================
-- side: 'A' = Craft & Systems (kỹ thuật), 'B' = Soul & Everyday (đời sống)

-- Bài 1
INSERT INTO posts (slug, title, excerpt, side, category, tags, cover, date, featured, reads, tea, insight, calm, resonate, content)
VALUES (
    'decoupling-state-in-event-streams',
    'Decoupling State in Event Streams: How We Survived 10M Msg/Sec Without Distributed Deadlocks',
    'An architectural autopsy of eliminating distributed two-phase commits in high-throughput financial telemetry. We transitioned from relational pessimistic locks to a partitioned event log backed by vectorized zero-copy memory buffers.',
    'A', 'Distributed Systems', 'Rust,DistributedSystems,Kafka,Performance', NULL, '2024-11-12',
    1, 4200, 64, 118, 12, 31,
    '<p>For two years our telemetry pipeline was held together by a relational database and a great deal of hope. Every trade event took a pessimistic row lock, touched three tables, and committed through a two-phase protocol that spanned two regions. It worked—until the night traffic tripled and the lock graph turned into a knot.</p>
<h2>1. Why Optimistic Locking Failed Under Partition</h2>
<p>Optimistic concurrency assumes conflicts are rare. Under a network partition they are not rare; they are the only thing happening. Retries amplified load on the very rows that were contended, and our p99 latency climbed from tens of milliseconds to nearly a quarter of a second.</p>
<p>We stopped asking the database to coordinate and started asking the log. Each account became a partition key. Each partition had exactly one writer. Coordination did not get faster—it disappeared.</p>
<h2>2. Deterministic Log Sequencing</h2>
<p>Once every change is an append to an ordered log, state becomes a pure function of the log prefix. Replaying from a write-ahead-log offset gives the same answer every time, which is the quiet superpower behind 99.99% idempotency: duplicates are detected by sequence number, not by luck.</p>
<pre data-file="consumer.go" data-meta="go 1.23 · idempotent"><code>func (c *Consumer) Apply(ev Event) error {
    if ev.Seq &lt;= c.lastSeq[ev.Partition] {
        return nil // already applied, safe to skip
    }
    c.state = Reduce(c.state, ev)
    c.lastSeq[ev.Partition] = ev.Seq
    return nil
}</code></pre>
<h2>3. What I Would Do Differently</h2>
<p>Start with the log. It is tempting to treat event streams as an optimization you add later, but the shape of your data decides the shape of your failures. Pick the shape whose failures you can sleep through.</p>'
);

-- Bài 2
INSERT INTO posts (slug, title, excerpt, side, category, tags, cover, date, featured, reads, tea, insight, calm, resonate, content)
VALUES (
    'single-binary-web-utilities',
    'The Lost Art of Crafting Small, Single-Binary Web Utilities',
    'In an era of bloated Docker containers and 400MB node_modules, there is immense joy in compiling a 4MB standalone binary that serves static assets with zero external dependencies forever.',
    'A', 'Software Tooling', 'Rust,CLI,Unix', NULL, '2024-10-24',
    0, 2310, 22, 41, 18, 9,
    '<p>A good command-line tool is like a well-kept pot of basil: small, specific, and quietly useful every single morning. <code>grep</code> does not want to be your friend. It wants to find the line and leave.</p>
<h2>1. A Binary You Can Forget About</h2>
<p>The little file server that hosts my photo archive is a single 4.2 MB executable. It has no runtime, no package manager, no container image. I copied it to a Raspberry Pi in 2021 and have not thought about it since, which is the highest compliment I can pay a piece of software.</p>
<pre data-file="main.rs" data-meta="rustc 1.82 · 4.2 MB"><code>fn main() -&gt; std::io::Result&lt;()&gt; {
    let root = std::env::args().nth(1).unwrap_or(".".into());
    tiny_http_serve(&amp;root, "0.0.0.0:8080")
}</code></pre>
<h2>2. Pruning, Not Replanting</h2>
<p>I have started treating my dotfiles the way I treat the balcony garden—prune a little every week, never replant everything at once. Small tools make that possible because each one can be understood, replaced, or deleted in an afternoon.</p>
<p>The comparison that made me smile: the same utility as a containerized Node service weighed 384 MB. Nothing about it was wrong. It was simply carrying furniture for a house it would never live in.</p>'
);

-- Bài 3
INSERT INTO posts (slug, title, excerpt, side, category, tags, cover, date, featured, reads, tea, insight, calm, resonate, content)
VALUES (
    'designing-idempotent-webhook-engines-go',
    'Designing Idempotent Webhook Engines in Go: Lessons from Lost Packets',
    'Handling network retries across unpredictable third-party APIs without creating duplicate billing ledger transactions. A look at redis-backed idempotency keys and exactly-once delivery semantics.',
    'A', 'Architecture', 'Go,PostgreSQL,Fintech', NULL, '2024-10-08',
    0, 1900, 14, 37, 5, 8,
    '<p>Third-party payment providers retry webhooks the way a worried parent calls: often, and without telling you whether the last call got through. If your handler is not idempotent, every retry is a chance to charge someone twice.</p>
<h2>1. The Idempotency Key Is the Contract</h2>
<p>We store every incoming event id in a unique index before doing any work. The insert either succeeds—meaning this is the first time we have seen the event—or it fails, and we return the stored response instead of recomputing it.</p>
<pre data-file="webhook.go" data-meta="go 1.23"><code>_, err := tx.Exec(ctx,
    `INSERT INTO processed_events (id) VALUES ($1)`, ev.ID)
if isUniqueViolation(err) {
    return replayStoredResponse(ctx, ev.ID)
}</code></pre>
<h2>2. Exactly-Once Is a Story We Tell Ourselves</h2>
<p>The network only offers at-least-once delivery. Exactly-once effects come from pairing that with deduplication inside the same transaction as the side effect. Anything else is a race condition waiting for a busy Friday.</p>'
);

-- Bài 4
INSERT INTO posts (slug, title, excerpt, side, category, tags, cover, date, featured, reads, tea, insight, calm, resonate, content)
VALUES (
    'backpressure-in-grpc-streaming',
    'Backpressure Strategies in gRPC Streaming Services',
    'When a slow consumer meets a fast producer over a bidirectional stream, someone has to give. A tour of credit-based flow control and why naive buffering just delays the outage.',
    'A', 'Architecture', 'Go,gRPC,Backpressure', NULL, '2024-10-02',
    0, 1420, 9, 26, 4, 6,
    '<p>Buffers are a way of postponing a decision. When the producer outpaces the consumer, a bigger buffer only changes when you run out of memory, not whether.</p>
<h2>1. Credits Instead of Queues</h2>
<p>In credit-based flow control the consumer tells the producer how many messages it is ready for. The producer never sends more than it has credits for. The stream slows down gracefully instead of falling over dramatically.</p>
<h2>2. Shed Load Early and Honestly</h2>
<p>When credits run dry for too long, reject new work at the edge with a clear status code. A fast, honest “not now” is kinder to everyone than a slow, silent timeout.</p>'
);

-- Bài 5
INSERT INTO posts (slug, title, excerpt, side, category, tags, cover, date, featured, reads, tea, insight, calm, resonate, content)
VALUES (
    'memory-reordering-cache-locality-apple-silicon',
    'Memory Reordering and Cache Locality on Apple Silicon M-Series',
    'ARM64 memory consistency models differ subtly from x86-64 TSO. We analyze low-level lockless data structure crashes under heavy multi-core contention.',
    'A', 'Architecture', 'ARM,CPlusPlus,Concurrency', NULL, '2024-09-30',
    0, 1500, 7, 33, 2, 5,
    '<p>Our lock-free ring buffer passed every test on an Intel laptop and crashed within minutes on an M2. The code had not changed. The memory model had.</p>
<h2>1. x86 Was Quietly Protecting Us</h2>
<p>x86-64 uses total store order: stores become visible in program order. ARM64 is weaker and may reorder them. Our producer published the index before the payload was visible to other cores.</p>
<pre data-file="ring.cpp" data-meta="clang 17 · arm64"><code>slots[i] = value;
head.store(i + 1, std::memory_order_release); // was relaxed</code></pre>
<h2>2. Release, Acquire, and Humility</h2>
<p>One word—<code>release</code>—fixed the crash. The lesson was larger: if a data structure is correct only on one architecture, it was never correct.</p>'
);

-- Bài 6
INSERT INTO posts (slug, title, excerpt, side, category, tags, cover, date, featured, reads, tea, insight, calm, resonate, content)
VALUES (
    'raft-based-config-store-from-scratch',
    'Building a Raft-Based Config Store from Scratch',
    'Implementing leader election and log replication for an internal feature-flag service taught me more about split-brain scenarios than any whitepaper ever did.',
    'A', 'Distributed Systems', 'Consensus,Go,DistributedSystems', NULL, '2024-09-21',
    0, 2050, 18, 44, 6, 12,
    '<p>Reading the Raft paper feels like following a recipe. Implementing it feels like cooking during an earthquake.</p>
<h2>1. Elections Are the Easy Part</h2>
<p>Randomized timeouts make leader election surprisingly robust. The hard part is everything after: a new leader must never overwrite entries that a previous leader already committed.</p>
<h2>2. Testing Split Brain on Purpose</h2>
<p>We built a tiny network simulator that drops, delays, and reorders messages. Every bug we found in production later had already appeared there first—we just had not believed it yet.</p>'
);

-- Bài 7
INSERT INTO posts (slug, title, excerpt, side, category, tags, cover, date, featured, reads, tea, insight, calm, resonate, content)
VALUES (
    'ebpf-for-pragmatic-sres',
    'eBPF for Pragmatic SREs: Tracing Linux Kernel Packet Drops',
    'Skip tcpdump overhead. How we wrote minimal eBPF probes to catch silent TCP resets during Kubernetes service mesh rollouts in staging.',
    'A', 'Distributed Systems', 'eBPF,Linux,Networking', NULL, '2024-09-18',
    0, 1100, 5, 21, 3, 4,
    '<p>Every rollout of the service mesh caused a handful of requests to fail with connection resets. Nothing in the application logs. Nothing in the proxy logs. The kernel knew, but it was not telling.</p>
<h2>1. Asking the Kernel Directly</h2>
<p>A twenty-line eBPF program attached to the <code>tcp_reset</code> tracepoint printed the exact socket, process, and stack for every reset—without the overhead of capturing every packet.</p>
<h2>2. The Culprit</h2>
<p>Draining pods closed their listening sockets before the load balancer stopped sending traffic. A three-second pre-stop sleep, deeply unglamorous, fixed it.</p>'
);

-- Bài 8
INSERT INTO posts (slug, title, excerpt, side, category, tags, cover, date, featured, reads, tea, insight, calm, resonate, content)
VALUES (
    'zero-downtime-schema-migrations-at-scale',
    'Zero-Downtime Schema Migrations at Scale',
    'Adding a NOT NULL column to a table with 400M rows without locking writers for even a second — the backfill-then-constrain dance, step by step.',
    'A', 'Architecture', 'PostgreSQL,Migrations,Reliability', NULL, '2024-09-12',
    0, 1780, 11, 39, 7, 10,
    '<p>The naive migration took an exclusive lock on a 400-million-row table. The careful one took four deploys and zero seconds of blocked writes.</p>
<h2>1. Expand</h2>
<p>Add the column as nullable with no default. Deploy code that writes it for new rows. Backfill old rows in small batches during quiet hours.</p>
<pre data-file="migration.sql" data-meta="postgres 16"><code>ALTER TABLE orders ADD COLUMN region TEXT;
ALTER TABLE orders ADD CONSTRAINT region_not_null
  CHECK (region IS NOT NULL) NOT VALID;
ALTER TABLE orders VALIDATE CONSTRAINT region_not_null;</code></pre>
<h2>2. Contract</h2>
<p>Validating a <code>NOT VALID</code> check constraint only takes a light lock. Once it is validated, Postgres can promote it to <code>NOT NULL</code> without rescanning the table.</p>'
);

-- Bài 9
INSERT INTO posts (slug, title, excerpt, side, category, tags, cover, date, featured, reads, tea, insight, calm, resonate, content)
VALUES (
    'designing-software-with-warmth',
    'Designing Software with Warmth: Why I Left Metric Obsessions to Build Slow Digital Craft',
    'Modern tools treat users as retention numbers to squeeze. What happens when we build digital spaces that honor paper textures, silence, and gentle completion instead of infinite loops? Notes on architecture, slow software, and inner peace.',
    'B', 'Tea & Solitude', 'Philosophy,HanoiMornings,SlowCraft', 'assets/featured-essay.png', '2024-10-18',
    1, 7800, 142, 89, 214, 67,
    '<p>It was three o''clock in the morning in a high-rise flat in Hanoi when I last audited a churn report. The screen glowed with that harsh, clinical blue light that strips away circadian memory. Spreadsheets of retention decay, weekly cohorts divided into percentiles, and A/B test splits measuring whether a slightly more anxious shade of crimson badge produced a 0.38% increase in notifications cleared.</p>
<p>I closed the aluminum lid of my workstation and listened to the rain tapping upon the corrugated zinc eaves below. In the silence of that room, surrounded by notebooks bound in untreated mulberry paper (Giấy Dó) and an old stoneware cup half-filled with cold tea, the absurdity laid itself bare. We had traded the warmth of physical instruments—pens that patina with our fingers, books that remember where our thumbs rested—for machines configured strictly to trap our fleeting attention.</p>
<h2>1. The Scent of Old Paper in a Digital World</h2>
<p>Paper possesses what Italian publisher Roberto Calasso referred to as an "unobtrusive finality." When you write in a journal or open a clothbound book, the object does not demand you invite four friends. It does not ping you while you reflect upon a sentence. It does not measure your pupil velocity to rearrange the remaining chapters.</p>
<p>Digital tools, conversely, have become noisy thoroughfares. They are engineered under the premise that idle time is wasted equity. But contemplation requires unoccupied space. When a tool respects a reader’s silence, it restores their agency.</p>
<figure class="quote"><blockquote>“The screen is not just a viewport for pixels; it is an extension of the human desk. When you respect the reader''s silence, you give them back their own thoughts.”</blockquote><figcaption>Marginalia from notebook #14 · Written at Yên Phụ Lake</figcaption></figure>
<p>If we model our digital interfaces after physical heirlooms—warm parchment, muted linen tones, and soft elevations rather than icy fluorescent panels—the user’s biological stress response eases. We move from a posture of vigilance to one of mindful study.</p>
<figure class="photo" data-coords="21.0285° N, 105.8542° E"><img src="assets/featured-essay.png" alt="Cuốn sổ tay buổi sáng bên tách trà" /><figcaption>My morning notebook next to a warm cup of Shan Tuyết tea, October rain in Hanoi.</figcaption></figure>
<h2>2. The Tyranny of the Engagement Loop</h2>
<p>Every metric in contemporary consumer software optimizes for the wrong end of the human experience. We celebrate "Daily Active Usage" when we should celebrate "Time to Calm Resolution." We reward algorithms that stretch a fifteen-minute inquiry into a two-hour scroll vortex.</p>
<p>When you build software around metrics of speed and volume, you inadvertently treat stillness as a bug. But stillness is where creative discernment germinates.</p>
<aside class="note"><div><strong>Visitor Note by Minh (2 days ago):</strong> “This reminds me of Christopher Alexander’s notion of the ‘Quality Without a Name’ in architecture. Good software feels like a cedar wood door that glides shut with a soft click.”</div></aside>
<h2>3. Architecture of Calm Systems</h2>
<p>How do we translate these philosophical leanings into actual system constraints? First, by declaring termination points. Every session must have a natural closing ritual. Unlike infinite social feeds, this journal page ends when the essay ends. There is no automated recommendation carousel to snatch you into another loop.</p>
<pre data-file="session_intent.rs" data-meta="rustc 1.82 · calm-protocol"><code><span class="tk-c">// Prioritize intentionality over infinite streaming</span>
<span class="tk-k">pub struct</span> <span class="tk-n">ReadingSession</span> {
    <span class="tk-p">pub tea_poured</span>: <span class="tk-t">bool</span>,
    <span class="tk-p">pub notifications_muted</span>: <span class="tk-t">bool</span>,
    <span class="tk-p">pub reading_pace_wpm</span>: <span class="tk-t">u16</span>,
    <span class="tk-p">pub exit_guarantee</span>: <span class="tk-t">Option</span>&lt;<span class="tk-g">PeaceOfMind</span>&gt;,
}

<span class="tk-k">impl</span> <span class="tk-t">ReadingSession</span> {
    <span class="tk-k">pub fn</span> <span class="tk-f">honor_human_presence</span>(&amp;<span class="tk-p">self</span>) -&gt; <span class="tk-g">Tranquility</span> {
        <span class="tk-c">// Never poll for push notifications while thought unfolds</span>
        <span class="tk-g">Tranquility</span>::<span class="tk-t">UninterruptedThought</span>
    }
}</code></pre>
<p>Notice that the program enforces boundaries rather than optimization hooks. The goal of calm engineering is not to maximize user retention minutes, but to deepen the quality of each unhurried minute spent.</p>
<h2>4. Code as Furniture: Building for Decades</h2>
<p>Consider a sturdy bamboo bench or a well-joined oak desk. It does not deprecate every sixteen months due to a framework overhaul. It withstands humidity; it gathers sunlight and darkens graciously.</p>
<p>When we craft personal websites and mindful software, we should build with semantic simplicity. Plain HTML, accessible typography, local-first archives, and enduring formats like plain text and RSS feeds guarantee that our words will still be legible fifty years from this rainy autumn dawn.</p>'
);

-- Bài 10
INSERT INTO posts (slug, title, excerpt, side, category, tags, cover, date, featured, reads, tea, insight, calm, resonate, content)
VALUES (
    'on-5am-rain-and-cold-brew',
    'On 5 AM Rain and Cold Brew: What Hanoi Taught Me About Creative Solitude',
    'Before the motorbikes engulf the boulevard, Hanoi holds a pristine stillness. Standing on a damp balcony with cold-steeped Robusta, watching the street vendors gather under streetlamps.',
    'B', 'Hanoi Essays', 'Hanoi,Solitude,Memoir', NULL, '2024-11-03',
    0, 2600, 48, 12, 77, 29,
    '<p>At five in the morning Hanoi is a different city. The motorbikes are still asleep. Street vendors unwrap sticky rice from banana leaves under the orange hum of streetlamps, and the rain washes the dust off French colonial roofs.</p>
<h2>1. The Balcony Hour</h2>
<p>I keep a jar of cold-steeped Robusta in the fridge for this hour. Standing on the damp balcony, I do not write anything. I just listen until the first bus sighs past on Phan Đình Phùng.</p>
<figure class="quote"><blockquote>“The quiet isn''t an absence of noise, but the arrival of your own voice.”</blockquote><figcaption>Scribbled on the back of a receipt · Hàng Bông</figcaption></figure>
<h2>2. Solitude Is Not Loneliness</h2>
<p>There is a shared quiet between strangers at this hour—the phở seller, the woman sweeping leaves, the man practicing tai chi by the lake. Nobody speaks, and everybody is keeping each other company.</p>'
);

-- Bài 11
INSERT INTO posts (slug, title, excerpt, side, category, tags, cover, date, featured, reads, tea, insight, calm, resonate, content)
VALUES (
    'rain-and-solitude',
    'Rain and Solitude: Why Slow Writers Cherish October Monsoons',
    'The long archive edition — twelve chapters, one pot of tea.',
    'B', 'Hanoi Essays', 'Hanoi,Writing,Archive', NULL, '2024-10-25',
    0, 1210, 30, 18, 41, 7,
    '<p>This is the long-form archive edition. It stitches several chapters together, written across three rainy evenings, so that the monsoon has time to arrive, settle in, and leave again before the last page.</p>
<h2>1. The Scent of Old Paper in a Digital World</h2>
<p>Paper possesses what Italian publisher Roberto Calasso referred to as an "unobtrusive finality." When you write in a journal or open a clothbound book, the object does not demand you invite four friends. It does not ping you while you reflect upon a sentence. It does not measure your pupil velocity to rearrange the remaining chapters.</p>
<p>Digital tools, conversely, have become noisy thoroughfares. They are engineered under the premise that idle time is wasted equity. But contemplation requires unoccupied space. When a tool respects a reader’s silence, it restores their agency.</p>
<figure class="quote"><blockquote>“The screen is not just a viewport for pixels; it is an extension of the human desk. When you respect the reader''s silence, you give them back their own thoughts.”</blockquote><figcaption>Marginalia from notebook #14 · Written at Yên Phụ Lake</figcaption></figure>
<p>If we model our digital interfaces after physical heirlooms—warm parchment, muted linen tones, and soft elevations rather than icy fluorescent panels—the user’s biological stress response eases. We move from a posture of vigilance to one of mindful study.</p>
<figure class="photo" data-coords="21.0285° N, 105.8542° E"><img src="assets/featured-essay.png" alt="Cuốn sổ tay buổi sáng bên tách trà" /><figcaption>My morning notebook next to a warm cup of Shan Tuyết tea, October rain in Hanoi.</figcaption></figure>

<h2>2. The Tyranny of the Engagement Loop</h2>
<p>Every metric in contemporary consumer software optimizes for the wrong end of the human experience. We celebrate "Daily Active Usage" when we should celebrate "Time to Calm Resolution." We reward algorithms that stretch a fifteen-minute inquiry into a two-hour scroll vortex.</p>
<p>When you build software around metrics of speed and volume, you inadvertently treat stillness as a bug. But stillness is where creative discernment germinates.</p>
<aside class="note"><div><strong>Visitor Note by Minh (2 days ago):</strong> “This reminds me of Christopher Alexander’s notion of the ‘Quality Without a Name’ in architecture. Good software feels like a cedar wood door that glides shut with a soft click.”</div></aside>

<h2>3. Architecture of Calm Systems</h2>
<p>How do we translate these philosophical leanings into actual system constraints? First, by declaring termination points. Every session must have a natural closing ritual. Unlike infinite social feeds, this journal page ends when the essay ends. There is no automated recommendation carousel to snatch you into another loop.</p>
<pre data-file="session_intent.rs" data-meta="rustc 1.82 · calm-protocol"><code><span class="tk-c">// Prioritize intentionality over infinite streaming</span>
<span class="tk-k">pub struct</span> <span class="tk-n">ReadingSession</span> {
    <span class="tk-p">pub tea_poured</span>: <span class="tk-t">bool</span>,
    <span class="tk-p">pub notifications_muted</span>: <span class="tk-t">bool</span>,
    <span class="tk-p">pub reading_pace_wpm</span>: <span class="tk-t">u16</span>,
    <span class="tk-p">pub exit_guarantee</span>: <span class="tk-t">Option</span>&lt;<span class="tk-g">PeaceOfMind</span>&gt;,
}

<span class="tk-k">impl</span> <span class="tk-t">ReadingSession</span> {
    <span class="tk-k">pub fn</span> <span class="tk-f">honor_human_presence</span>(&amp;<span class="tk-p">self</span>) -&gt; <span class="tk-g">Tranquility</span> {
        <span class="tk-c">// Never poll for push notifications while thought unfolds</span>
        <span class="tk-g">Tranquility</span>::<span class="tk-t">UninterruptedThought</span>
    }
}</code></pre>
<p>Notice that the program enforces boundaries rather than optimization hooks. The goal of calm engineering is not to maximize user retention minutes, but to deepen the quality of each unhurried minute spent.</p>

<h2>4. Code as Furniture: Building for Decades</h2>
<p>Consider a sturdy bamboo bench or a well-joined oak desk. It does not deprecate every sixteen months due to a framework overhaul. It withstands humidity; it gathers sunlight and darkens graciously.</p>
<p>When we craft personal websites and mindful software, we should build with semantic simplicity. Plain HTML, accessible typography, local-first archives, and enduring formats like plain text and RSS feeds guarantee that our words will still be legible fifty years from this rainy autumn dawn.</p>
<h2>5. The Scent of Old Paper in a Digital World</h2>
<p>Paper possesses what Italian publisher Roberto Calasso referred to as an "unobtrusive finality." When you write in a journal or open a clothbound book, the object does not demand you invite four friends. It does not ping you while you reflect upon a sentence. It does not measure your pupil velocity to rearrange the remaining chapters.</p>
<p>Digital tools, conversely, have become noisy thoroughfares. They are engineered under the premise that idle time is wasted equity. But contemplation requires unoccupied space. When a tool respects a reader’s silence, it restores their agency.</p>
<figure class="quote"><blockquote>“The screen is not just a viewport for pixels; it is an extension of the human desk. When you respect the reader''s silence, you give them back their own thoughts.”</blockquote><figcaption>Marginalia from notebook #14 · Written at Yên Phụ Lake</figcaption></figure>
<p>If we model our digital interfaces after physical heirlooms—warm parchment, muted linen tones, and soft elevations rather than icy fluorescent panels—the user’s biological stress response eases. We move from a posture of vigilance to one of mindful study.</p>
<figure class="photo" data-coords="21.0285° N, 105.8542° E"><img src="assets/featured-essay.png" alt="Cuốn sổ tay buổi sáng bên tách trà" /><figcaption>My morning notebook next to a warm cup of Shan Tuyết tea, October rain in Hanoi.</figcaption></figure>

<h2>6. The Tyranny of the Engagement Loop</h2>
<p>Every metric in contemporary consumer software optimizes for the wrong end of the human experience. We celebrate "Daily Active Usage" when we should celebrate "Time to Calm Resolution." We reward algorithms that stretch a fifteen-minute inquiry into a two-hour scroll vortex.</p>
<p>When you build software around metrics of speed and volume, you inadvertently treat stillness as a bug. But stillness is where creative discernment germinates.</p>
<aside class="note"><div><strong>Visitor Note by Minh (2 days ago):</strong> “This reminds me of Christopher Alexander’s notion of the ‘Quality Without a Name’ in architecture. Good software feels like a cedar wood door that glides shut with a soft click.”</div></aside>

<h2>7. Architecture of Calm Systems</h2>
<p>How do we translate these philosophical leanings into actual system constraints? First, by declaring termination points. Every session must have a natural closing ritual. Unlike infinite social feeds, this journal page ends when the essay ends. There is no automated recommendation carousel to snatch you into another loop.</p>
<pre data-file="session_intent.rs" data-meta="rustc 1.82 · calm-protocol"><code><span class="tk-c">// Prioritize intentionality over infinite streaming</span>
<span class="tk-k">pub struct</span> <span class="tk-n">ReadingSession</span> {
    <span class="tk-p">pub tea_poured</span>: <span class="tk-t">bool</span>,
    <span class="tk-p">pub notifications_muted</span>: <span class="tk-t">bool</span>,
    <span class="tk-p">pub reading_pace_wpm</span>: <span class="tk-t">u16</span>,
    <span class="tk-p">pub exit_guarantee</span>: <span class="tk-t">Option</span>&lt;<span class="tk-g">PeaceOfMind</span>&gt;,
}

<span class="tk-k">impl</span> <span class="tk-t">ReadingSession</span> {
    <span class="tk-k">pub fn</span> <span class="tk-f">honor_human_presence</span>(&amp;<span class="tk-p">self</span>) -&gt; <span class="tk-g">Tranquility</span> {
        <span class="tk-c">// Never poll for push notifications while thought unfolds</span>
        <span class="tk-g">Tranquility</span>::<span class="tk-t">UninterruptedThought</span>
    }
}</code></pre>
<p>Notice that the program enforces boundaries rather than optimization hooks. The goal of calm engineering is not to maximize user retention minutes, but to deepen the quality of each unhurried minute spent.</p>

<h2>8. Code as Furniture: Building for Decades</h2>
<p>Consider a sturdy bamboo bench or a well-joined oak desk. It does not deprecate every sixteen months due to a framework overhaul. It withstands humidity; it gathers sunlight and darkens graciously.</p>
<p>When we craft personal websites and mindful software, we should build with semantic simplicity. Plain HTML, accessible typography, local-first archives, and enduring formats like plain text and RSS feeds guarantee that our words will still be legible fifty years from this rainy autumn dawn.</p>
<h2>9. The Scent of Old Paper in a Digital World</h2>
<p>Paper possesses what Italian publisher Roberto Calasso referred to as an "unobtrusive finality." When you write in a journal or open a clothbound book, the object does not demand you invite four friends. It does not ping you while you reflect upon a sentence. It does not measure your pupil velocity to rearrange the remaining chapters.</p>
<p>Digital tools, conversely, have become noisy thoroughfares. They are engineered under the premise that idle time is wasted equity. But contemplation requires unoccupied space. When a tool respects a reader’s silence, it restores their agency.</p>
<figure class="quote"><blockquote>“The screen is not just a viewport for pixels; it is an extension of the human desk. When you respect the reader''s silence, you give them back their own thoughts.”</blockquote><figcaption>Marginalia from notebook #14 · Written at Yên Phụ Lake</figcaption></figure>
<p>If we model our digital interfaces after physical heirlooms—warm parchment, muted linen tones, and soft elevations rather than icy fluorescent panels—the user’s biological stress response eases. We move from a posture of vigilance to one of mindful study.</p>
<figure class="photo" data-coords="21.0285° N, 105.8542° E"><img src="assets/featured-essay.png" alt="Cuốn sổ tay buổi sáng bên tách trà" /><figcaption>My morning notebook next to a warm cup of Shan Tuyết tea, October rain in Hanoi.</figcaption></figure>

<h2>10. The Tyranny of the Engagement Loop</h2>
<p>Every metric in contemporary consumer software optimizes for the wrong end of the human experience. We celebrate "Daily Active Usage" when we should celebrate "Time to Calm Resolution." We reward algorithms that stretch a fifteen-minute inquiry into a two-hour scroll vortex.</p>
<p>When you build software around metrics of speed and volume, you inadvertently treat stillness as a bug. But stillness is where creative discernment germinates.</p>
<aside class="note"><div><strong>Visitor Note by Minh (2 days ago):</strong> “This reminds me of Christopher Alexander’s notion of the ‘Quality Without a Name’ in architecture. Good software feels like a cedar wood door that glides shut with a soft click.”</div></aside>

<h2>11. Architecture of Calm Systems</h2>
<p>How do we translate these philosophical leanings into actual system constraints? First, by declaring termination points. Every session must have a natural closing ritual. Unlike infinite social feeds, this journal page ends when the essay ends. There is no automated recommendation carousel to snatch you into another loop.</p>
<pre data-file="session_intent.rs" data-meta="rustc 1.82 · calm-protocol"><code><span class="tk-c">// Prioritize intentionality over infinite streaming</span>
<span class="tk-k">pub struct</span> <span class="tk-n">ReadingSession</span> {
    <span class="tk-p">pub tea_poured</span>: <span class="tk-t">bool</span>,
    <span class="tk-p">pub notifications_muted</span>: <span class="tk-t">bool</span>,
    <span class="tk-p">pub reading_pace_wpm</span>: <span class="tk-t">u16</span>,
    <span class="tk-p">pub exit_guarantee</span>: <span class="tk-t">Option</span>&lt;<span class="tk-g">PeaceOfMind</span>&gt;,
}

<span class="tk-k">impl</span> <span class="tk-t">ReadingSession</span> {
    <span class="tk-k">pub fn</span> <span class="tk-f">honor_human_presence</span>(&amp;<span class="tk-p">self</span>) -&gt; <span class="tk-g">Tranquility</span> {
        <span class="tk-c">// Never poll for push notifications while thought unfolds</span>
        <span class="tk-g">Tranquility</span>::<span class="tk-t">UninterruptedThought</span>
    }
}</code></pre>
<p>Notice that the program enforces boundaries rather than optimization hooks. The goal of calm engineering is not to maximize user retention minutes, but to deepen the quality of each unhurried minute spent.</p>

<h2>12. Code as Furniture: Building for Decades</h2>
<p>Consider a sturdy bamboo bench or a well-joined oak desk. It does not deprecate every sixteen months due to a framework overhaul. It withstands humidity; it gathers sunlight and darkens graciously.</p>
<p>When we craft personal websites and mindful software, we should build with semantic simplicity. Plain HTML, accessible typography, local-first archives, and enduring formats like plain text and RSS feeds guarantee that our words will still be legible fifty years from this rainy autumn dawn.</p>'
);

-- Bài 12
INSERT INTO posts (slug, title, excerpt, side, category, tags, cover, date, featured, reads, tea, insight, calm, resonate, content)
VALUES (
    'notes-from-a-dust-covered-bookstore',
    'Notes from a Dust-Covered Bookstore on Tràng Thi Street',
    'Unearthing a 1982 French-Vietnamese translation of Saint-Exupéry with pencil marginalia by a former geography teacher. What physical marginalia tells us about reader companionship across time.',
    'B', 'Book Marginalia', 'OldBooks,Marginalia,TrangThi', NULL, '2024-09-15',
    0, 1300, 26, 15, 31, 22,
    '<p>The bookstore on Tràng Thi has no sign, only a stack of paperbacks leaning against the doorframe like a tired guard. Inside, dust hangs in the light the way it does in old churches.</p>
<h2>1. A Stranger in the Margins</h2>
<p>I found a 1982 translation of <em>Le Petit Prince</em> with pencil notes on almost every page. The handwriting belonged to a geography teacher—her name was inside the cover, next to a school stamp from Nam Định.</p>
<figure class="quote"><blockquote>“Trang 48: Nỗi buồn này không còn là của riêng ta.”</blockquote><figcaption>Pencil marginalia, page 48</figcaption></figure>
<h2>2. Reader Companionship</h2>
<p>Marginalia is a conversation with no reply expected. Forty years later I answered anyway, in a notebook of my own, and felt less alone than I have in any comment section.</p>'
);

-- Bài 13
INSERT INTO posts (slug, title, excerpt, side, category, tags, cover, date, featured, reads, tea, insight, calm, resonate, content)
VALUES (
    'motorbike-horns-at-midnight',
    'Motorbike Horns at Midnight: A Love Letter to Old Quarter Traffic',
    'There''s a rhythm to the honking after 11 PM that outsiders mistake for chaos. Three years in, I''ve started to miss it on the one night a month it goes quiet.',
    'B', 'Hanoi Essays', 'Hanoi,NightLife', NULL, '2024-10-05',
    0, 980, 12, 6, 9, 19,
    '<p>Visitors hear noise. After a while you start to hear grammar: a short tap means “I am here,” two taps mean “I am passing,” and a long one means someone''s uncle is late for dinner.</p>
<h2>1. The Night It Went Quiet</h2>
<p>During the Lunar New Year the Old Quarter empties. The silence was so complete that I could hear the refrigerator from the bedroom. I did not sleep well at all.</p>
<h2>2. Chaos With Manners</h2>
<p>The traffic here is a distributed system without a coordinator, and somehow it converges. I think about that more than I should when designing consensus protocols.</p>'
);

-- Bài 14
INSERT INTO posts (slug, title, excerpt, side, category, tags, cover, date, featured, reads, tea, insight, calm, resonate, content)
VALUES (
    'balcony-ferns-and-rain',
    'Balcony Ferns & Rain: An Autumn Snapshot from Hoàng Hoa Thám Street',
    'The morning quiet before the city revs its motorbikes on Hoàng Hoa Thám street — a small photo journal of the balcony ferns that survived the autumn rain.',
    'B', 'Photo Journals', 'Hanoi,Photography,FilmRolls', 'assets/snapshot-desk.png', '2024-09-28',
    0, 640, 9, 2, 24, 6,
    '<p>One roll of Portra 400, one Rollei 35, and a balcony that faces the wrong way for sunlight. The ferns do not seem to mind.</p>
<figure class="photo" data-coords="21.0452° N, 105.8188° E"><img src="assets/snapshot-desk.png" alt="Autumn desk and ferns still life" /><figcaption>Autumn Desk &amp; Ferns · 2024</figcaption></figure>
<h2>1. Shooting Slowly</h2>
<p>Film forces patience. Thirty-six frames means thinking before pressing, and waiting a week for the lab means forgetting what you shot—so every scan feels like a letter from a past self.</p>
<h2>2. What Survived</h2>
<p>Two of the four ferns made it through the September storms. I kept the brown fronds in the photos too. Survival is more honest with the damage included.</p>'
);

-- Bài 15
INSERT INTO posts (slug, title, excerpt, side, category, tags, cover, date, featured, reads, tea, insight, calm, resonate, content)
VALUES (
    'reheating-yesterdays-oolong',
    'The Ritual of Reheating Yesterday''s Oolong',
    'A half-full cup left overnight isn''t waste — it''s tomorrow''s five-minute meditation, if you let the kettle do the rest.',
    'B', 'Tea & Solitude', 'Tea,SlowMornings', NULL, '2024-09-25',
    0, 860, 37, 4, 28, 11,
    '<p>Tea purists will tell you never to reheat tea. They are right about the taste and wrong about the point.</p>
<h2>1. Five Minutes That Belong to No One</h2>
<p>Pouring yesterday''s oolong back into the small clay pot, waiting for the kettle, warming my hands on the cup—those five minutes are not productive. That is exactly why I protect them.</p>
<h2>2. Leaving Things Unfinished</h2>
<p>A half-full cup is a promise that tomorrow will come and that I will be there to finish what I started. Some mornings that is enough of a plan.</p>'
);

-- ===================== BƯU THIẾP =====================
-- pinned = 1: đã ghim lên Community Board (ai cũng thấy)
-- pinned = 0: riêng tư, chờ Kiên đọc trong trang Admin

INSERT INTO notes (message, name, role, location, topic, post_slug, reply, pinned, created_at) VALUES
    ('Your article on slow engineering cured my burnout this week. Reading about intentional systems from a quiet Tokyo cafe made me breathe again. Cảm ơn Kiên!', 'Maya S.', 'Distributed Systems Engineer', 'Tokyo, Japan', 'EngineeringSolitude', 'designing-software-with-warmth', 'Maya, that means the world. Keep building gently; distributed systems are just human agreements written in silicon.', 1, '2024-11-10'),
    ('Visited Hanoi last month because of your tea shop recommendations on Hoàn Kiếm. The misty morning at 6:00 AM with the hot cup of lotus tea was pure cinema. Sending warmth from Lyon!', 'Lucas B.', 'Architect & Wandering Drinker', 'Lyon, France', 'TeaAndHanoi', NULL, NULL, 1, '2024-11-08'),
    ('Just wanted to say this corner of the internet feels like opening an attic window on a rainy afternoon. Keep the slow craft alive. It reminds us why we fell in love with coding in the first place.', 'A fellow night owl coder', NULL, 'Melbourne, Australia', 'AtticMusings', NULL, NULL, 1, '2024-11-04'),
    ('Your reading list led me to Calvino''s Invisible Cities. Now my software architecture diagrams resemble Venetian water palaces. Thank you for the poetic lens.', 'Anja V.', NULL, 'Berlin, Germany', 'BookMusings', NULL, NULL, 1, '2024-10-24'),
    ('Đọc bài về trà ô long hâm lại mà nhớ bà nội. Bà cũng không bao giờ đổ trà thừa, sáng nào cũng hâm lại trong ấm đất nhỏ.', 'Thảo N.', 'Illustrator', 'Đà Nẵng, Việt Nam', 'TeaAndHanoi', NULL, 'Cảm ơn Thảo. Có lẽ bà nội bạn và mình đã học cùng một bài học từ những chiếc ấm đất.', 1, '2024-10-19'),
    ('The eBPF write-up saved our Friday. The three-second pre-stop sleep is now a comment in our Helm chart with a link to your post.', 'Kenji O.', 'SRE', 'Osaka, Japan', 'EngineeringSolitude', 'ebpf-for-pragmatic-sres', NULL, 1, '2024-10-12'),
    ('I collect marginalia too! A 1960s copy of Siddhartha in our library has a whole love story written in the margins, one page at a time.', 'Priya R.', 'Librarian', 'Bangalore, India', 'BookMusings', 'notes-from-a-dust-covered-bookstore', NULL, 1, '2024-10-02'),
    ('Found your journal at 2 AM looking for Raft explanations and stayed for the tea essays. A strange and lovely combination.', 'Tomás L.', NULL, 'Lisbon, Portugal', 'AtticMusings', NULL, NULL, 1, '2024-09-27'),
    ('Đây là bưu thiếp mẫu chưa được ghim. Vào trang Admin để ghim nó lên bảng hoặc xoá đi.', 'Bạn đọc mẫu', NULL, 'Hà Nội, Việt Nam', 'TeaAndHanoi', NULL, NULL, 0, '2024-11-11'),
    ('Bài về Raft rất dễ hiểu. Bạn có thể viết thêm về cách chọn leader khi mạng chập chờn không?', 'Minh', NULL, 'TP. Hồ Chí Minh', 'EngineeringSolitude', 'raft-based-config-store-from-scratch', NULL, 0, '2024-11-12');
