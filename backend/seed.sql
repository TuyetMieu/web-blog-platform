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
    '<p>For two years our telemetry pipeline was held together by a relational database and a great deal of hope. Every trade event took a pessimistic row lock, touched three tables, and committed through a two-phase protocol that spanned two regions. It worked, until the night traffic tripled and the lock graph turned into a knot that no on-call engineer could untie before sunrise.</p>
<p>This is the story of how we stopped coordinating and started appending, and why the most important change was not a technology but a shape.</p>
<h2>1. Why Optimistic Locking Failed Under Partition</h2>
<p>Optimistic concurrency assumes conflicts are rare. Under a network partition they are not rare; they are the only thing happening. Every retry amplified load on the very rows that were contended, and our p99 latency climbed from tens of milliseconds to nearly a quarter of a second. Worse, the database spent more time detecting deadlocks than doing useful work.</p>
<p>We tried the usual medicine first: shorter transactions, smarter indexes, a bigger instance. Each helped for a week. The real problem was that thousands of writers were asking one shared structure for permission at the same time.</p>
<h2>2. One Writer per Partition</h2>
<p>So we stopped asking the database to coordinate and started asking the log. Each account became a partition key. Each partition had exactly one writer. Coordination did not get faster; it disappeared. Two events for the same account always land in the same partition, in order, so there is nothing left to lock.</p>
<aside class="note">The trick is choosing a partition key that matches how your data is actually contended. For us it was the account id. For a chat app it might be the conversation id.</aside>
<h2>3. Deterministic Log Sequencing</h2>
<p>Once every change is an append to an ordered log, state becomes a pure function of the log prefix. Replaying from a write-ahead-log offset gives the same answer every time, which is the quiet superpower behind 99.99% idempotency: duplicates are detected by sequence number, not by luck.</p>
<pre data-file="consumer.go"><code>func (c *Consumer) Apply(ev Event) error {
    // Already seen this event? Skip it safely.
    if ev.Seq &lt;= c.lastSeq[ev.Partition] {
        return nil
    }
    c.state = Reduce(c.state, ev)
    c.lastSeq[ev.Partition] = ev.Seq
    return nil
}</code></pre>
<p>The consumer above is the whole idea in eight lines. It does not care how many times an event is delivered. It only cares about the order inside one partition.</p>
<h2>4. The Numbers After the Migration</h2>
<p>Tail latency dropped from 240ms to a little over 4ms. Throughput passed ten million messages per second on hardware we already owned. Most importantly, the pager went quiet. Removing global coordination did not just make the system faster; it made it boring, which is the highest compliment an on-call engineer can give.</p>
<h2>5. What I Would Do Differently</h2>
<p>Start with the log. It is tempting to treat event streams as an optimization you add later, but the shape of your data decides the shape of your failures. Pick the shape whose failures you can sleep through, and write that decision down before the first table is created.</p>'
);

-- Bài 2
INSERT INTO posts (slug, title, excerpt, side, category, tags, cover, date, featured, reads, tea, insight, calm, resonate, content)
VALUES (
    'single-binary-web-utilities',
    'The Lost Art of Crafting Small, Single-Binary Web Utilities',
    'In an era of bloated Docker containers and 400MB node_modules, there is immense joy in compiling a 4MB standalone binary that serves static assets with zero external dependencies forever.',
    'A', 'Software Tooling', 'Rust,CLI,Unix', NULL, '2024-10-24',
    0, 2310, 22, 41, 18, 9,
    '<p>A good command-line tool is like a well-kept pot of basil: small, specific, and quietly useful every single morning. <code>grep</code> does not want to be your friend. It wants to find the line and leave. I have come to love software with that kind of manners.</p>
<h2>1. A Binary You Can Forget About</h2>
<p>The little file server that hosts my photo archive is a single 4.2 MB executable. It has no runtime, no package manager, no container image. I copied it to a Raspberry Pi in 2021 and have not thought about it since, which is the highest compliment I can pay a piece of software.</p>
<pre data-file="main.rs"><code>fn main() -&gt; std::io::Result&lt;()&gt; {
    // Serve the folder given on the command line, or the current folder.
    let root = std::env::args().nth(1).unwrap_or(".".into());
    tiny_http_serve(&amp;root, "0.0.0.0:8080")
}</code></pre>
<p>That is nearly the entire program. Everything else is error messages written in plain language, because the person reading them will usually be me, tired, at midnight.</p>
<h2>2. What "No Dependencies" Really Buys You</h2>
<p>People usually talk about single binaries in terms of size. Size is nice, but the real gift is time. A program with no runtime cannot break when the runtime updates. A program with no package manager cannot be poisoned through a package. A program that is one file can be backed up, copied, and understood without a diagram.</p>
<ul>
<li>Deploying is copying one file.</li>
<li>Rolling back is copying the old file.</li>
<li>Auditing is reading one repository, start to finish, in an afternoon.</li>
</ul>
<h2>3. Pruning, Not Replanting</h2>
<p>I treat my dotfiles the way I treat the balcony garden: prune a little every week, never replant everything at once. Small tools make that possible because each one can be understood, replaced, or deleted in an afternoon. Big frameworks are more like trees. Beautiful, but you do not move them on a Sunday.</p>
<h2>4. The Comparison That Made Me Smile</h2>
<p>For fun I rebuilt the same utility as a containerized Node service. It weighed 384 MB. Nothing about it was wrong. It was simply carrying furniture for a house it would never live in: a full operating system layer, a JavaScript engine, hundreds of transitive packages, each with its own changelog.</p>
<h2>5. When Not to Do This</h2>
<p>Single binaries are not a religion. If your service needs plugins, hot reloading, or a team of twenty people shipping daily, a bigger platform earns its weight. But for the small, personal tools that run your life, ask one question before you start: could this be one file that I never have to think about again?</p>'
);

-- Bài 3
INSERT INTO posts (slug, title, excerpt, side, category, tags, cover, date, featured, reads, tea, insight, calm, resonate, content)
VALUES (
    'designing-idempotent-webhook-engines-go',
    'Designing Idempotent Webhook Engines in Go: Lessons from Lost Packets',
    'Handling network retries across unpredictable third-party APIs without creating duplicate billing ledger transactions. A look at redis-backed idempotency keys and exactly-once delivery semantics.',
    'A', 'Architecture', 'Go,PostgreSQL,Fintech', NULL, '2024-10-08',
    0, 1900, 14, 37, 5, 8,
    '<p>Third-party payment providers retry webhooks the way a worried parent calls: often, and without telling you whether the last call got through. If your handler is not idempotent, every retry is a chance to charge someone twice, and nothing erodes trust faster than a double charge on a Friday night.</p>
<h2>1. Why Retries Are Guaranteed</h2>
<p>Networks drop packets. Load balancers time out. Your own server restarts in the middle of a request. From the provider''s point of view, all of these look the same: no 200 response arrived. So they send the event again, sometimes minutes later, sometimes five times in a row. You cannot prevent duplicates. You can only make them harmless.</p>
<h2>2. The Idempotency Key Is the Contract</h2>
<p>Every webhook carries an event id. We store that id in a table with a unique index before doing any work. The insert either succeeds, meaning this is the first time we have seen the event, or it fails, and we return the stored response instead of recomputing it.</p>
<pre data-file="webhook.go"><code>_, err := tx.Exec(ctx,
    `INSERT INTO processed_events (id) VALUES ($1)`, ev.ID)
if isUniqueViolation(err) {
    // We have handled this event before: answer the same way again.
    return replayStoredResponse(ctx, ev.ID)
}
// First time: do the real work inside the same transaction.
if err := applyCharge(ctx, tx, ev); err != nil {
    return err
}
return tx.Commit(ctx)</code></pre>
<h2>3. Same Transaction, or It Does Not Count</h2>
<p>The most common bug I see is recording the event id in one place and applying the side effect somewhere else. If the server crashes between the two, you either lose the charge or apply it twice. The id and the side effect must commit together, in one database transaction, or the whole design is just a hopeful comment.</p>
<aside class="note">If the side effect lives outside your database, for example calling another API, store an "intent" row in the transaction and let a separate worker perform and confirm it.</aside>
<h2>4. Exactly-Once Is a Story We Tell Ourselves</h2>
<p>The network only offers at-least-once delivery. Exactly-once effects come from pairing that with deduplication inside the same transaction as the side effect. Anything else is a race condition waiting for a busy Friday.</p>
<h2>5. A Small Checklist</h2>
<ul>
<li>Return 200 quickly; do heavy work after the event is safely recorded.</li>
<li>Keep processed ids for longer than the provider''s retry window.</li>
<li>Log the event id on every line, so one search shows the whole story.</li>
<li>Test by sending the same webhook twice in a row. Then ten times.</li>
</ul>
<p>None of this is clever. That is the point. Payment code should be the most boring code you own.</p>'
);

-- Bài 4
INSERT INTO posts (slug, title, excerpt, side, category, tags, cover, date, featured, reads, tea, insight, calm, resonate, content)
VALUES (
    'backpressure-in-grpc-streaming',
    'Backpressure Strategies in gRPC Streaming Services',
    'When a slow consumer meets a fast producer over a bidirectional stream, someone has to give. A tour of credit-based flow control and why naive buffering just delays the outage.',
    'A', 'Architecture', 'Go,gRPC,Backpressure', NULL, '2024-10-02',
    0, 1420, 9, 26, 4, 6,
    '<p>When a slow consumer meets a fast producer over a bidirectional stream, someone has to give. If nobody decides who, the operating system decides for you, usually by running out of memory at three in the morning.</p>
<h2>1. The Symptom: Memory That Only Grows</h2>
<p>Our analytics service received a stream of events from hundreds of edge nodes. On a normal day it kept up. On a busy day the edge nodes kept sending, the service kept accepting, and the messages piled up in an in-memory buffer. Memory climbed in a straight line until the process was killed and restarted, losing everything in the buffer.</p>
<h2>2. Why Bigger Buffers Do Not Help</h2>
<p>The first instinct is to make the buffer larger. That only delays the outage and makes it more expensive when it arrives. A buffer is useful for smoothing short bursts. It is useless against a producer that is simply faster than the consumer for an hour.</p>
<h2>3. Credit-Based Flow Control</h2>
<p>gRPC already runs on HTTP/2, which has flow-control windows built in. We added a simple layer on top: the consumer gives the producer a number of credits. Each message costs one credit. When credits run out, the producer waits.</p>
<pre data-file="credits.go"><code>func (s *Sender) Send(msg *Event) error {
    // Wait until the receiver has given us at least one credit.
    for s.credits == 0 {
        grant, err := s.stream.Recv()
        if err != nil {
            return err
        }
        s.credits += grant.Credits
    }
    s.credits--
    return s.stream.Send(msg)
}</code></pre>
<p>The receiver grants new credits only after it has finished processing messages. The speed of the whole pipeline now follows the slowest honest participant, which is exactly what you want.</p>
<h2>4. Choosing What to Drop</h2>
<p>Sometimes waiting is not acceptable either. For metrics that are summarized anyway, we chose to drop the oldest samples and keep a counter of how many were dropped. For billing events, we never drop; we slow the producer down instead. Deciding this per message type, out loud, in a design document, was the real fix.</p>
<h2>5. Lessons</h2>
<ul>
<li>Every queue needs a maximum size and a plan for when it is full.</li>
<li>Make the plan visible in metrics: credits, waits, and drops.</li>
<li>Test with a consumer that is artificially slow before production does it for you.</li>
</ul>'
);

-- Bài 5
INSERT INTO posts (slug, title, excerpt, side, category, tags, cover, date, featured, reads, tea, insight, calm, resonate, content)
VALUES (
    'memory-reordering-cache-locality-apple-silicon',
    'Memory Reordering and Cache Locality on Apple Silicon M-Series',
    'ARM64 memory consistency models differ subtly from x86-64 TSO. We analyze low-level lockless data structure crashes under heavy multi-core contention.',
    'A', 'Architecture', 'ARM,CPlusPlus,Concurrency', NULL, '2024-09-30',
    0, 1500, 7, 33, 2, 5,
    '<p>Code that runs perfectly on an x86 laptop can fail on an ARM machine, and it usually fails in the most frustrating way possible: rarely, under load, and never while you are watching. This post is about one such bug in a lock-free queue, and what it taught me about memory ordering.</p>
<h2>1. Two Different Promises</h2>
<p>x86 processors follow a fairly strict memory model called TSO. In simple terms, other cores see your writes in the order you made them. ARM64, which powers Apple''s M-series chips, makes a weaker promise. To go faster, it is allowed to make writes visible to other cores in a different order, unless you explicitly ask it not to.</p>
<h2>2. The Bug</h2>
<p>Our single-producer queue wrote a value into a slot and then increased a tail counter. On x86 the consumer always saw the value before it saw the new tail. On ARM the consumer could see the new tail first, read the slot, and get old garbage. It happened about once in ten million messages.</p>
<pre data-file="ring.cpp"><code>// Producer
buffer[tail % SIZE] = value;
// "release": everything above must be visible before this write
tail_.store(tail + 1, std::memory_order_release);

// Consumer
// "acquire": pairs with the release above
size_t t = tail_.load(std::memory_order_acquire);
if (head &lt; t) {
    value = buffer[head % SIZE];
}</code></pre>
<p>The fix was two words: <code>memory_order_release</code> on the producer and <code>memory_order_acquire</code> on the consumer. Together they guarantee that if the consumer sees the new tail, it also sees the value written before it.</p>
<h2>3. Cache Lines Matter Too</h2>
<p>While profiling, we noticed the head and tail counters lived in the same 128-byte cache line on M-series chips. Every update by one core forced the other core to reload the line. Padding the two counters onto separate cache lines improved throughput by almost 40% with no change in logic.</p>
<aside class="note">Apple Silicon uses 128-byte cache lines, twice the 64 bytes common on x86. Padding written for one platform may not be enough for the other.</aside>
<h2>4. How to Find These Bugs</h2>
<ul>
<li>Run your concurrency tests on ARM hardware, not only on x86.</li>
<li>Use ThreadSanitizer; it reports many missing orderings.</li>
<li>Prefer well-tested libraries over hand-written lock-free structures unless you truly need them.</li>
</ul>
<h2>5. The Humbling Part</h2>
<p>The original code had been in production for two years. It was not wrong on the hardware it was written for. It was wrong in a way that only appeared when the world changed underneath it. That is worth remembering every time we say "it works on my machine."</p>'
);

-- Bài 6
INSERT INTO posts (slug, title, excerpt, side, category, tags, cover, date, featured, reads, tea, insight, calm, resonate, content)
VALUES (
    'raft-based-config-store-from-scratch',
    'Building a Raft-Based Config Store from Scratch',
    'Implementing leader election and log replication for an internal feature-flag service taught me more about split-brain scenarios than any whitepaper ever did.',
    'A', 'Distributed Systems', 'Consensus,Go,DistributedSystems', NULL, '2024-09-21',
    0, 2050, 18, 44, 6, 12,
    '<p>Implementing leader election and log replication for an internal feature-flag service taught me more about split-brain scenarios than any whitepaper ever did. Here is what I built, what broke, and what I would tell my past self.</p>
<h2>1. Why Build It at All</h2>
<p>We needed a tiny, highly available store for feature flags: a few hundred keys, read thousands of times per second, written a few times per day. Off-the-shelf systems were heavier than the problem. And honestly, I wanted to understand Raft by building it, not just by reading about it.</p>
<h2>2. Raft in One Paragraph</h2>
<p>A Raft cluster has one leader and several followers. All writes go to the leader, which appends them to its log and copies them to followers. Once a majority has a copy, the entry is committed and can be applied. If the leader disappears, followers wait a random timeout, then one of them asks for votes and becomes the new leader. Each leadership period is called a term.</p>
<h2>3. The Heart of Leader Election</h2>
<pre data-file="vote.go"><code>func (n *Node) HandleVote(req VoteRequest) bool {
    if req.Term &lt; n.currentTerm {
        return false // old candidate, ignore
    }
    if req.Term &gt; n.currentTerm {
        n.currentTerm = req.Term
        n.votedFor = ""
    }
    // Vote only once per term, and only for an up-to-date log.
    if n.votedFor == "" &amp;&amp; req.LastLogIndex &gt;= n.lastIndex() {
        n.votedFor = req.CandidateID
        return true
    }
    return false
}</code></pre>
<h2>4. What Broke</h2>
<p>The first version forgot to save <code>currentTerm</code> and <code>votedFor</code> to disk before replying. After a crash, a node could vote twice in the same term, and two leaders could exist at once. Our test cluster happily accepted conflicting writes until I added a single <code>fsync</code>. Raft''s safety depends on a few pieces of state surviving restarts. Skip that, and the algorithm is just theatre.</p>
<p>The second surprise was the random election timeout. With timeouts that were too similar, nodes kept starting elections at the same moment and splitting the vote. Widening the random range from 150–200ms to 150–300ms made elections settle almost instantly.</p>
<h2>5. Testing with Chaos</h2>
<ul>
<li>Kill the leader every few seconds.</li>
<li>Drop or delay random messages between nodes.</li>
<li>Check after every step that no two nodes have different committed entries.</li>
</ul>
<p>The service has now run for over a year. It is small, a little boring, and completely understood by the team. For infrastructure, that is a happy ending.</p>'
);

-- Bài 7
INSERT INTO posts (slug, title, excerpt, side, category, tags, cover, date, featured, reads, tea, insight, calm, resonate, content)
VALUES (
    'ebpf-for-pragmatic-sres',
    'eBPF for Pragmatic SREs: Tracing Linux Kernel Packet Drops',
    'Skip tcpdump overhead. How we wrote minimal eBPF probes to catch silent TCP resets during Kubernetes service mesh rollouts in staging.',
    'A', 'Distributed Systems', 'eBPF,Linux,Networking', NULL, '2024-09-18',
    0, 1100, 5, 21, 3, 4,
    '<p>For weeks, a small percentage of requests between two Kubernetes services failed with connection resets. No errors in application logs, nothing obvious in metrics, and tcpdump on a busy node produced gigabytes of noise. eBPF let us ask the kernel one precise question instead.</p>
<h2>1. What eBPF Is, Simply</h2>
<p>eBPF lets you run tiny, safe programs inside the Linux kernel when certain events happen, such as a packet being dropped or a function being called. The kernel checks each program before running it, so a mistake cannot crash the machine. For an SRE, it is like adding a print statement to the kernel without rebuilding it.</p>
<h2>2. The Probe</h2>
<p>We attached a program to the kernel''s <code>tcp_send_reset</code> event and printed the addresses and ports involved. That is the whole tool: a few lines of bpftrace.</p>
<pre data-file="resets.bt"><code>tracepoint:tcp:tcp_send_reset
{
    printf("%s RST %s:%d -&gt; %s:%d\n",
        strftime("%H:%M:%S", nsecs),
        ntop(args-&gt;saddr), args-&gt;sport,
        ntop(args-&gt;daddr), args-&gt;dport);
}</code></pre>
<h2>3. What We Found</h2>
<p>Every reset came from a pod that was shutting down. During a rolling deploy, Kubernetes removed the pod from service endpoints and sent it a stop signal at almost the same time. Some nodes had not yet updated their routing rules, so a few new connections still arrived at a pod that was already closing its sockets.</p>
<h2>4. The Boring Fix</h2>
<p>We added a pre-stop hook that sleeps for three seconds before the application begins shutting down. That gives every node time to stop sending traffic to the pod. The resets disappeared completely. The fix took one line of YAML; finding it took three weeks without eBPF and one afternoon with it.</p>
<aside class="note">The sleep is now a comment in our Helm chart with a link to the investigation, so nobody "cleans it up" later.</aside>
<h2>5. Tips for Getting Started</h2>
<ul>
<li>Start with bpftrace one-liners before writing full programs.</li>
<li>Trace a single event and a single question at a time.</li>
<li>Run probes for minutes, not days; they are a flashlight, not a security camera.</li>
</ul>'
);

-- Bài 8
INSERT INTO posts (slug, title, excerpt, side, category, tags, cover, date, featured, reads, tea, insight, calm, resonate, content)
VALUES (
    'zero-downtime-schema-migrations-at-scale',
    'Zero-Downtime Schema Migrations at Scale',
    'Adding a NOT NULL column to a table with 400M rows without locking writers for even a second — the backfill-then-constrain dance, step by step.',
    'A', 'Architecture', 'PostgreSQL,Migrations,Reliability', NULL, '2024-09-12',
    0, 1780, 11, 39, 7, 10,
    '<p>Adding a NOT NULL column to a table with 400 million rows sounds like a one-line change. Run it naively and you lock writers for minutes while customers stare at spinners. Here is the pattern we use to change big tables while the application keeps running.</p>
<h2>1. Why the Naive Way Hurts</h2>
<p>Many databases rewrite or scan the whole table when you add a column with a default value or a NOT NULL constraint. During that time, writes to the table wait. On a small table you never notice. On a table that receives thousands of writes per second, the queue of waiting requests becomes an outage.</p>
<h2>2. Expand, Migrate, Contract</h2>
<p>We split every risky change into small steps that are each safe on their own:</p>
<ol>
<li><strong>Expand:</strong> add the new column as nullable, with no default. This is instant.</li>
<li><strong>Dual write:</strong> deploy code that writes both the old and new columns.</li>
<li><strong>Backfill:</strong> fill old rows in small batches in the background.</li>
<li><strong>Verify:</strong> check that no row is missing a value.</li>
<li><strong>Contract:</strong> add the constraint, switch reads, remove the old column later.</li>
</ol>
<h2>3. Backfilling in Small Batches</h2>
<pre data-file="backfill.sql"><code>-- Run repeatedly until it updates 0 rows.
UPDATE orders
SET currency = ''USD''
WHERE id IN (
    SELECT id FROM orders
    WHERE currency IS NULL
    LIMIT 5000
);</code></pre>
<p>Each batch touches only five thousand rows, so locks are short and replicas keep up. We sleep briefly between batches and watch replication lag. If lag grows, the script slows down by itself.</p>
<h2>4. Adding the Constraint Without a Long Lock</h2>
<p>In PostgreSQL, you can add a check constraint as <code>NOT VALID</code>, which is instant, and then run <code>VALIDATE CONSTRAINT</code>, which scans the table without blocking writes. Only after that do we mark the column NOT NULL, and the database can trust the already validated constraint.</p>
<h2>5. The Human Part</h2>
<p>The technique is not hard. The discipline is. Every step gets its own deploy, its own review, and its own way to roll back. It feels slow. It is much faster than writing an incident report.</p>'
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
<p>I closed the aluminum lid of my workstation and listened to the rain tapping upon the corrugated zinc eaves below. In the silence of that room, surrounded by notebooks bound in untreated mulberry paper (called giay do in Vietnamese) and an old stoneware cup half-filled with cold tea, the absurdity laid itself bare. We had traded the warmth of physical instruments—pens that patina with our fingers, books that remember where our thumbs rested—for machines configured strictly to trap our fleeting attention.</p>
<h2>1. The Scent of Old Paper in a Digital World</h2>
<p>Paper possesses what Italian publisher Roberto Calasso referred to as an "unobtrusive finality." When you write in a journal or open a clothbound book, the object does not demand you invite four friends. It does not ping you while you reflect upon a sentence. It does not measure your pupil velocity to rearrange the remaining chapters.</p>
<p>Digital tools, conversely, have become noisy thoroughfares. They are engineered under the premise that idle time is wasted equity. But contemplation requires unoccupied space. When a tool respects a reader’s silence, it restores their agency.</p>
<figure class="quote"><blockquote>“The screen is not just a viewport for pixels; it is an extension of the human desk. When you respect the reader''s silence, you give them back their own thoughts.”</blockquote><figcaption>Marginalia from notebook #14 · Written at Yen Phu Lake</figcaption></figure>
<p>If we model our digital interfaces after physical heirlooms—warm parchment, muted linen tones, and soft elevations rather than icy fluorescent panels—the user’s biological stress response eases. We move from a posture of vigilance to one of mindful study.</p>
<figure class="photo" data-coords="21.0285° N, 105.8542° E"><img src="assets/featured-essay.png" alt="A morning notebook next to a cup of tea" /><figcaption>My morning notebook next to a warm cup of Shan Tuyet tea, October rain in Hanoi.</figcaption></figure>
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
    '<p>Before the motorbikes engulf the boulevard, Hanoi holds a pristine stillness. I have started waking up for it, not because I am disciplined, but because I am greedy for the only hour of the day when the city seems to be listening instead of talking.</p>
<h2>1. The Balcony at Five</h2>
<p>At five in the morning the street below my balcony is wet and almost empty. A street sweeper moves leaves into small piles with a broom made of twigs. Somewhere a radio plays the news very quietly. I stand there with a glass of cold-brewed Robusta that I made the night before, and for once I do not reach for my phone.</p>
<h2>2. Why Cold Brew</h2>
<p>Hot coffee demands attention: water at the right temperature, a timer, a filter. Cold brew is a promise I make to my future self. Before bed, I pour coarse grounds and cold water into a jar and leave it on the counter. In the morning it is simply ready, dark and gentle, like a letter waiting under the door.</p>
<figure class="quote"><blockquote>Creative work does not need more time. It needs a few minutes that nobody else has claimed.</blockquote><figcaption>Scribbled on the back of a receipt · Hang Bong street</figcaption></figure>
<h2>3. The Shared Quiet</h2>
<p>There is a shared quiet between strangers at this hour: the noodle-soup seller lighting her stove, the woman sweeping leaves, the old man practicing tai chi beside the lake. Nobody speaks, but everyone nods. It feels like belonging to a small secret club whose only rule is to be gentle with the morning.</p>
<h2>4. What I Do With the Hour</h2>
<p>Nothing impressive. I write three pages by hand without deciding what they are about. Sometimes they become essays. Usually they become nothing, and that is fine. The point is not output. The point is to start the day by making something before the world asks me to react to something.</p>
<h2>5. When the City Wakes</h2>
<p>Around six, the first bus sighs past on Phan Dinh Phung street, and the motorbikes arrive in waves. The spell breaks, but gently. I rinse the glass, close the notebook, and carry a little of that stillness into the noisy day, like a warm stone in my pocket.</p>'
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
<figure class="quote"><blockquote>“The screen is not just a viewport for pixels; it is an extension of the human desk. When you respect the reader''s silence, you give them back their own thoughts.”</blockquote><figcaption>Marginalia from notebook #14 · Written at Yen Phu Lake</figcaption></figure>
<p>If we model our digital interfaces after physical heirlooms—warm parchment, muted linen tones, and soft elevations rather than icy fluorescent panels—the user’s biological stress response eases. We move from a posture of vigilance to one of mindful study.</p>
<figure class="photo" data-coords="21.0285° N, 105.8542° E"><img src="assets/featured-essay.png" alt="A morning notebook next to a cup of tea" /><figcaption>My morning notebook next to a warm cup of Shan Tuyet tea, October rain in Hanoi.</figcaption></figure>

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
<figure class="quote"><blockquote>“The screen is not just a viewport for pixels; it is an extension of the human desk. When you respect the reader''s silence, you give them back their own thoughts.”</blockquote><figcaption>Marginalia from notebook #14 · Written at Yen Phu Lake</figcaption></figure>
<p>If we model our digital interfaces after physical heirlooms—warm parchment, muted linen tones, and soft elevations rather than icy fluorescent panels—the user’s biological stress response eases. We move from a posture of vigilance to one of mindful study.</p>
<figure class="photo" data-coords="21.0285° N, 105.8542° E"><img src="assets/featured-essay.png" alt="A morning notebook next to a cup of tea" /><figcaption>My morning notebook next to a warm cup of Shan Tuyet tea, October rain in Hanoi.</figcaption></figure>

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
<figure class="quote"><blockquote>“The screen is not just a viewport for pixels; it is an extension of the human desk. When you respect the reader''s silence, you give them back their own thoughts.”</blockquote><figcaption>Marginalia from notebook #14 · Written at Yen Phu Lake</figcaption></figure>
<p>If we model our digital interfaces after physical heirlooms—warm parchment, muted linen tones, and soft elevations rather than icy fluorescent panels—the user’s biological stress response eases. We move from a posture of vigilance to one of mindful study.</p>
<figure class="photo" data-coords="21.0285° N, 105.8542° E"><img src="assets/featured-essay.png" alt="A morning notebook next to a cup of tea" /><figcaption>My morning notebook next to a warm cup of Shan Tuyet tea, October rain in Hanoi.</figcaption></figure>

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
    'Notes from a Dust-Covered Bookstore on Trang Thi Street',
    'Unearthing a 1982 French-Vietnamese translation of Saint-Exupéry with pencil marginalia by a former geography teacher. What physical marginalia tells us about reader companionship across time.',
    'B', 'Book Marginalia', 'OldBooks,Marginalia,TrangThi', NULL, '2024-09-15',
    0, 1300, 26, 15, 31, 22,
    '<p>The bookstore on Trang Thi street has no sign, only a stack of paperbacks leaning against the doorframe and an old man reading a newspaper on a plastic stool. I have walked past it for years. Last month, sheltering from a sudden rain, I finally went in.</p>
<h2>1. A Room Made of Paper</h2>
<p>Inside, books rise from the floor in towers that seem to hold up the ceiling. There are no categories, no prices written anywhere, and a smell of dust, glue, and rain that I wish I could bottle. The owner looked up once, decided I was harmless, and went back to his newspaper.</p>
<h2>2. The Little Prince, 1982</h2>
<p>Near the bottom of a tower I found a 1982 French-Vietnamese edition of Saint-Exupéry''s <em>The Little Prince</em>. Its cover was soft as cloth. Inside, next to a school stamp from Nam Dinh province, someone had written a name in careful pencil: a geography teacher, according to a note on the first page.</p>
<h2>3. A Conversation in the Margins</h2>
<p>The teacher had filled the margins with small notes. Some were translations of difficult French words. Some were maps: the Little Prince''s tiny planet drawn next to the Red River delta, as if the two were neighbours. And on page 48, beside the fox''s famous lines about taming, a single sentence:</p>
<figure class="quote"><blockquote>"This sadness is no longer mine alone."</blockquote><figcaption>Pencil note on page 48 · translated from Vietnamese</figcaption></figure>
<p>I do not know who wrote it, or what sadness they meant. But reading it forty years later, in a rainy shop, I felt answered. Marginalia is a letter addressed to whoever comes next.</p>
<h2>4. Why I Still Buy Used Books</h2>
<p>A new book is a conversation between you and the author. A used book is a conversation with everyone who held it before you: their underlines, their coffee stains, the bus ticket they used as a bookmark. It turns reading from a private act into a slow, shared one.</p>
<h2>5. What I Left Behind</h2>
<p>I paid the owner, who named a price that felt like a gift. Then I did something I have never done before: I wrote a small note of my own on the last page, with the date and the weather. Someday someone else will find it, and the conversation will continue.</p>'
);

-- Bài 13
INSERT INTO posts (slug, title, excerpt, side, category, tags, cover, date, featured, reads, tea, insight, calm, resonate, content)
VALUES (
    'motorbike-horns-at-midnight',
    'Motorbike Horns at Midnight: A Love Letter to Old Quarter Traffic',
    'There''s a rhythm to the honking after 11 PM that outsiders mistake for chaos. Three years in, I''ve started to miss it on the one night a month it goes quiet.',
    'B', 'Hanoi Essays', 'Hanoi,NightLife', NULL, '2024-10-05',
    0, 980, 12, 6, 9, 19,
    '<p>There is a rhythm to the honking after 11 PM that outsiders mistake for chaos. Three years in, I have started to hear it as music: short notes, long notes, polite questions and impatient answers, all improvised by strangers who will never meet.</p>
<h2>1. Learning the Vocabulary</h2>
<p>In the Old Quarter, a horn is rarely angry. One short beep means "I am here, behind you." Two quick beeps mean "I am passing now." A long press is the only rude word, and you hear it less often than you would think. Once you learn the vocabulary, the noise becomes a conversation about space and trust.</p>
<h2>2. A River That Never Collides</h2>
<p>From my window the intersection looks like a river with no banks. Motorbikes flow from four directions, carrying families, mattresses, birdcages, and once a full-size refrigerator. There are no traffic lights, yet nobody stops and nobody crashes. Everyone moves slowly and predictably, adjusting by a few centimetres at a time.</p>
<aside class="note">The first rule for crossing the street as a pedestrian: walk at a steady speed and never run. The traffic will flow around you, because it can predict you.</aside>
<h2>3. What Software Could Learn</h2>
<p>I think about this intersection when I design distributed systems. There is no central controller here, only many small agents following simple local rules and signalling their intentions clearly. The system works not because anyone is in charge, but because everyone is readable.</p>
<h2>4. The Midnight Concert</h2>
<p>After midnight the traffic thins and the horns become rarer, almost tender. A delivery driver taps twice to greet a friend. A late noodle cart clatters past. Someone laughs at a corner, and the sound carries all the way up to my balcony.</p>
<h2>5. A Love Letter</h2>
<p>People who visit Hanoi often ask me how I sleep with all the noise. The honest answer is that when I travel to quiet places, I sleep worse. The horns have become a lullaby: proof that the city is awake, negotiating, and taking care of itself while I rest.</p>'
);

-- Bài 14
INSERT INTO posts (slug, title, excerpt, side, category, tags, cover, date, featured, reads, tea, insight, calm, resonate, content)
VALUES (
    'balcony-ferns-and-rain',
    'Balcony Ferns & Rain: An Autumn Snapshot from Hoang Hoa Tham Street',
    'The morning quiet before the city revs its motorbikes on Hoang Hoa Tham street — a small photo journal of the balcony ferns that survived the autumn rain.',
    'B', 'Photo Journals', 'Hanoi,Photography,FilmRolls', 'assets/snapshot-desk.png', '2024-09-28',
    0, 640, 9, 2, 24, 6,
    '<p>The morning quiet before the city revs its motorbikes on Hoang Hoa Tham street is my favourite light for photographs. This is a small photo journal of one autumn morning: ferns, rain, an unfinished cup of tea, and a camera older than I am.</p>
<figure class="photo"><img src="assets/snapshot-desk.png" alt="Autumn desk with ferns and a notebook"><figcaption>Autumn desk and ferns, shot on Kodak Portra 400 with a Rollei 35</figcaption></figure>
<h2>1. The Camera</h2>
<p>My Rollei 35 is a tiny metal camera from the 1970s. It has no autofocus and no screen. You guess the distance, set the exposure with a little dial, and hope. Because every roll has only thirty-six frames, I take fewer pictures and look much longer before each one.</p>
<h2>2. The Ferns</h2>
<p>The ferns on my balcony arrived as a single sad pot from a street vendor. Two years and a lot of rain later, they spill over the railing like green waterfalls. In the morning their leaves hold drops of water that catch the light for exactly a few minutes before the sun climbs too high.</p>
<h2>3. Waiting for the Light</h2>
<p>Film teaches patience. I made tea, sat down, and waited for a cloud to soften the light. When it came, I took three frames of the desk: notebook open, pen uncapped, cup half full. I will not see the results for two weeks, until the lab on the corner develops the roll.</p>
<h2>4. Why Film, Still</h2>
<p>Digital photos are perfect and endless. Film photos are slightly imperfect and very limited, and that is why I remember them. The waiting turns each picture into a small surprise, a letter from my past self that arrives two weeks late.</p>
<h2>5. What the Photo Does Not Show</h2>
<p>It does not show the neighbour''s rooster, the smell of wet concrete, or the sound of rain sliding off the tin roof next door. But when I look at the print, I hear all of it. That is what a good photograph does: it holds the door open for everything that could not fit inside the frame.</p>'
);

-- Bài 15
INSERT INTO posts (slug, title, excerpt, side, category, tags, cover, date, featured, reads, tea, insight, calm, resonate, content)
VALUES (
    'reheating-yesterdays-oolong',
    'The Ritual of Reheating Yesterday''s Oolong',
    'A half-full cup left overnight isn''t waste — it''s tomorrow''s five-minute meditation, if you let the kettle do the rest.',
    'B', 'Tea & Solitude', 'Tea,SlowMornings', NULL, '2024-09-25',
    0, 860, 37, 4, 28, 11,
    '<p>A half-full cup left overnight is not waste. It is tomorrow''s five-minute meditation, if you let the kettle do the work. This small ritual has quietly become the most important part of my morning.</p>
<h2>1. How It Started</h2>
<p>I used to pour away the leftover tea every morning and start fresh. Then a friend from Thai Nguyen, the tea region in the north, laughed at me. Good oolong, she said, can be steeped many times, and yesterday''s tea has a softer, rounder taste that new tea cannot give you.</p>
<h2>2. The Ritual</h2>
<ol>
<li>Pour yesterday''s tea back into the small clay pot.</li>
<li>Heat a little fresh water until it just starts to whisper, not boil.</li>
<li>Add it to the pot, wait one slow breath, then pour.</li>
<li>Hold the warm cup with both hands before drinking.</li>
</ol>
<p>It takes five minutes. There is nothing to optimise, nothing to measure, and nothing to improve. That is exactly why it works.</p>
<h2>3. Doing Nothing on Purpose</h2>
<p>Those five minutes are not productive. I do not read, plan, or check messages. I watch the steam and listen to the kettle. In a life full of tools designed to save time, it feels radical to spend a few minutes on something whose only purpose is itself.</p>
<figure class="quote"><blockquote>Some mornings, finishing yesterday''s tea is the only plan I need.</blockquote><figcaption>From the margin of notebook #9</figcaption></figure>
<h2>4. Leaving Things Unfinished</h2>
<p>A half-full cup is a promise that tomorrow will come and that I will be there to finish what I started. I have started treating some of my work the same way: ending the day in the middle of a sentence, so that the next morning begins with something already warm.</p>
<h2>5. An Invitation</h2>
<p>Tonight, leave a little tea in the pot on purpose. Tomorrow, before you open your laptop, warm it up and drink it slowly. Notice how the day feels when it begins with care instead of urgency.</p>'
);

-- ===================== BƯU THIẾP =====================
-- pinned = 1: đã ghim lên Community Board (ai cũng thấy)
-- pinned = 0: riêng tư, chờ Kiên đọc trong trang Admin

INSERT INTO notes (message, name, role, location, topic, post_slug, reply, pinned, created_at) VALUES
    ('Your article on slow engineering cured my burnout this week. Reading about intentional systems from a quiet Tokyo cafe made me breathe again. Thank you, Kiên!', 'Maya S.', 'Distributed Systems Engineer', 'Tokyo, Japan', 'EngineeringSolitude', 'designing-software-with-warmth', 'Maya, that means the world. Keep building gently; distributed systems are just human agreements written in silicon.', 1, '2024-11-10'),
    ('Visited Hanoi last month because of your tea shop recommendations near Hoan Kiem Lake. The misty morning at 6:00 AM with a hot cup of lotus tea was pure cinema. Sending warmth from Lyon!', 'Lucas B.', 'Architect & Wandering Drinker', 'Lyon, France', 'TeaAndHanoi', NULL, NULL, 1, '2024-11-08'),
    ('Just wanted to say this corner of the internet feels like opening an attic window on a rainy afternoon. Keep the slow craft alive. It reminds us why we fell in love with coding in the first place.', 'A fellow night owl coder', NULL, 'Melbourne, Australia', 'AtticMusings', NULL, NULL, 1, '2024-11-04'),
    ('Your reading list led me to Calvino''s Invisible Cities. Now my software architecture diagrams resemble Venetian water palaces. Thank you for the poetic lens.', 'Anja V.', NULL, 'Berlin, Germany', 'BookMusings', NULL, NULL, 1, '2024-10-24'),
    ('Reading your essay about reheating oolong made me miss my grandmother. She never threw away leftover tea either; every morning she warmed it again in a small clay pot.', 'Thao N.', 'Illustrator', 'Da Nang, Vietnam', 'TeaAndHanoi', 'reheating-yesterdays-oolong', 'Thank you, Thao. Perhaps your grandmother and I learned the same lesson from those little clay pots.', 1, '2024-10-19'),
    ('The eBPF write-up saved our Friday. The three-second pre-stop sleep is now a comment in our Helm chart with a link to your post.', 'Kenji O.', 'SRE', 'Osaka, Japan', 'EngineeringSolitude', 'ebpf-for-pragmatic-sres', NULL, 1, '2024-10-12'),
    ('I collect marginalia too! A 1960s copy of Siddhartha in our library has a whole love story written in the margins, one page at a time.', 'Priya R.', 'Librarian', 'Bangalore, India', 'BookMusings', 'notes-from-a-dust-covered-bookstore', NULL, 1, '2024-10-02'),
    ('Found your journal at 2 AM looking for Raft explanations and stayed for the tea essays. A strange and lovely combination.', 'Tomás L.', NULL, 'Lisbon, Portugal', 'AtticMusings', NULL, NULL, 1, '2024-09-27'),
    ('This is a sample postcard that is not pinned yet. Open the Admin page to pin it to the board or delete it.', 'Sample Reader', NULL, 'Hanoi, Vietnam', 'TeaAndHanoi', NULL, NULL, 0, '2024-11-11'),
    ('Your Raft post was very clear. Could you write more about leader election when the network is unstable?', 'Minh', NULL, 'Ho Chi Minh City, Vietnam', 'EngineeringSolitude', 'raft-based-config-store-from-scratch', NULL, 0, '2024-11-12');
