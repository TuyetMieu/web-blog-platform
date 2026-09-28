/* Dữ liệu mẫu cho lúc chưa có backend (mở bằng file:// hoặc thêm ?mock=1).
   Cấu trúc giống JSON mà GET /api/posts/<slug> cần trả về. */
(function () {
  var calmContent = [
    '<p>It was three o\'clock in the morning in a high-rise flat in Hanoi when I last audited a churn report. The screen glowed with that harsh, clinical blue light that strips away circadian memory. Spreadsheets of retention decay, weekly cohorts divided into percentiles, and A/B test splits measuring whether a slightly more anxious shade of crimson badge produced a 0.38% increase in notifications cleared.</p>',
    '<p>I closed the aluminum lid of my workstation and listened to the rain tapping upon the corrugated zinc eaves below. In the silence of that room, surrounded by notebooks bound in untreated mulberry paper (Giấy Dó) and an old stoneware cup half-filled with cold tea, the absurdity laid itself bare. We had traded the warmth of physical instruments—pens that patina with our fingers, books that remember where our thumbs rested—for machines configured strictly to trap our fleeting attention.</p>',

    '<h2>1. The Scent of Old Paper in a Digital World</h2>',
    '<p>Paper possesses what Italian publisher Roberto Calasso referred to as an "unobtrusive finality." When you write in a journal or open a clothbound book, the object does not demand you invite four friends. It does not ping you while you reflect upon a sentence. It does not measure your pupil velocity to rearrange the remaining chapters.</p>',
    '<p>Digital tools, conversely, have become noisy thoroughfares. They are engineered under the premise that idle time is wasted equity. But contemplation requires unoccupied space. When a tool respects a reader’s silence, it restores their agency.</p>',
    '<figure class="quote"><blockquote>“The screen is not just a viewport for pixels; it is an extension of the human desk. When you respect the reader\'s silence, you give them back their own thoughts.”</blockquote><figcaption>Marginalia from notebook #14 · Written at Yên Phụ Lake</figcaption></figure>',
    '<p>If we model our digital interfaces after physical heirlooms—warm parchment, muted linen tones, and soft elevations rather than icy fluorescent panels—the user’s biological stress response eases. We move from a posture of vigilance to one of mindful study.</p>',
    '<figure class="photo" data-coords="21.0285° N, 105.8542° E"><img src="https://images.unsplash.com/photo-1455390582262-044cdead277a?w=1024&q=70" alt="Cuốn sổ tay buổi sáng bên tách trà" /><figcaption>My morning notebook next to a warm cup of Shan Tuyết tea, October rain in Hanoi.</figcaption></figure>',

    '<h2>2. The Tyranny of the Engagement Loop</h2>',
    '<p>Every metric in contemporary consumer software optimizes for the wrong end of the human experience. We celebrate "Daily Active Usage" when we should celebrate "Time to Calm Resolution." We reward algorithms that stretch a fifteen-minute inquiry into a two-hour scroll vortex.</p>',
    '<p>When you build software around metrics of speed and volume, you inadvertently treat stillness as a bug. But stillness is where creative discernment germinates.</p>',
    '<aside class="note"><div><strong>Visitor Note by Minh (2 days ago):</strong> “This reminds me of Christopher Alexander’s notion of the ‘Quality Without a Name’ in architecture. Good software feels like a cedar wood door that glides shut with a soft click.”</div></aside>',

    '<h2>3. Architecture of Calm Systems</h2>',
    '<p>How do we translate these philosophical leanings into actual system constraints? First, by declaring termination points. Every session must have a natural closing ritual. Unlike infinite social feeds, this journal page ends when the essay ends. There is no automated recommendation carousel to snatch you into another loop.</p>',
    '<pre data-file="session_intent.rs" data-meta="rustc 1.82 · calm-protocol"><code>' +
      '<span class="tk-c">// Prioritize intentionality over infinite streaming</span>\n' +
      '<span class="tk-k">pub struct</span> <span class="tk-n">ReadingSession</span> {\n' +
      '    <span class="tk-p">pub tea_poured</span>: <span class="tk-t">bool</span>,\n' +
      '    <span class="tk-p">pub notifications_muted</span>: <span class="tk-t">bool</span>,\n' +
      '    <span class="tk-p">pub reading_pace_wpm</span>: <span class="tk-t">u16</span>,\n' +
      '    <span class="tk-p">pub exit_guarantee</span>: <span class="tk-t">Option</span>&lt;<span class="tk-g">PeaceOfMind</span>&gt;,\n' +
      '}\n\n' +
      '<span class="tk-k">impl</span> <span class="tk-t">ReadingSession</span> {\n' +
      '    <span class="tk-k">pub fn</span> <span class="tk-f">honor_human_presence</span>(&amp;<span class="tk-p">self</span>) -&gt; <span class="tk-g">Tranquility</span> {\n' +
      '        <span class="tk-c">// Never poll for push notifications while thought unfolds</span>\n' +
      '        <span class="tk-g">Tranquility</span>::<span class="tk-t">UninterruptedThought</span>\n' +
      '    }\n' +
      '}</code></pre>',
    '<p>Notice that the program enforces boundaries rather than optimization hooks. The goal of calm engineering is not to maximize user retention minutes, but to deepen the quality of each unhurried minute spent.</p>',

    '<h2>4. Code as Furniture: Building for Decades</h2>',
    '<p>Consider a sturdy bamboo bench or a well-joined oak desk. It does not deprecate every sixteen months due to a framework overhaul. It withstands humidity; it gathers sunlight and darkens graciously.</p>',
    '<p>When we craft personal websites and mindful software, we should build with semantic simplicity. Plain HTML, accessible typography, local-first archives, and enduring formats like plain text and RSS feeds guarantee that our words will still be legible fifty years from this rainy autumn dawn.</p>'
  ].join('\n');

  // Bài dài: lặp lại các mục để thử mục lục dài + cột sticky
  var longSections = calmContent.split('<h2>').slice(1);
  var longContent = '<p>This is the long-form archive edition. It stitches several chapters together so the table of contents, the sticky desk column and the reading progress spine can be tested on a truly long page.</p>';
  for (var round = 1; round <= 3; round++) {
    longSections.forEach(function (sec, i) {
      longContent += '<h2>' + sec.replace(/^\d+\./, (round - 1) * 4 + i + 1 + '.');
    });
  }

  window.MOCK_POSTS = {
    'designing-software-with-warmth': {
      slug: 'designing-software-with-warmth',
      title: 'Designing Software with Warmth: Why I Left Metric Obsessions to Build Slow Digital Craft',
      excerpt: 'Modern tools treat users as retention numbers to squeeze. What happens when we build digital spaces that honor paper textures, silence, and gentle completion instead of infinite loops?',
      tag: 'Reflections on Calm Computing',
      side: 'Side B: Everyday & Soul',
      essayNo: 9,
      revision: 'Living Document (v1.3 · 4 annotations)',
      author: { name: 'Kiên', avatar: 'assets/ki-n-author-avatar0.png' },
      publishedAt: '2024-10-18T07:30:00+07:00',
      updatedAt: new Date(Date.now() - 2 * 864e5).toISOString(),
      colophon: 'Finished on an antique mahogany table at Cà phê Yên, Quán Thánh.',
      ledger: 'This entry forms the 9th chapter of the "Slow Computation Manifestos" series. Next edition focuses on single-file hypertexts and garden wikis.',
      content: calmContent,
      reactions: { tea: 142, insight: 89, calm: 214, resonate: 67 },
      prev: { slug: 'small-unix-utilities', title: 'The Lost Art of Small Unix Utilities & Personal Gardening', side: 'Side A: Systems', essayNo: 8, readMinutes: 6 },
      next: { slug: 'rain-and-solitude', title: 'Rain and Solitude: Why Slow Writers Cherish October Monsoons', side: 'Side B: Everyday', essayNo: 10, readMinutes: 5 }
    },

    // Bài ngắn, không ảnh, không tiêu đề mục, không bài trước
    'small-unix-utilities': {
      slug: 'small-unix-utilities',
      title: 'The Lost Art of Small Unix Utilities & Personal Gardening',
      excerpt: 'A short note on tools that do one thing, and plants that ask for nothing but patience.',
      tag: 'Systems',
      side: 'Side A: Systems',
      essayNo: 8,
      author: { name: 'Kiên', avatar: 'assets/ki-n-author-avatar0.png' },
      publishedAt: '2024-10-02T06:00:00+07:00',
      content: '<p>A good command-line tool is like a well-kept pot of basil: small, specific, and quietly useful every single morning. <code>grep</code> does not want to be your friend. It wants to find the line and leave.</p><p>I have started treating my dotfiles the way I treat the balcony garden—prune a little every week, never replant everything at once.</p>',
      reactions: { tea: 12, insight: 4, calm: 9, resonate: 2 },
      prev: null,
      next: { slug: 'designing-software-with-warmth', title: 'Designing Software with Warmth', side: 'Side B: Everyday & Soul', essayNo: 9, readMinutes: 8 }
    },

    // Bài rất dài, không bài sau
    'rain-and-solitude': {
      slug: 'rain-and-solitude',
      title: 'Rain and Solitude: Why Slow Writers Cherish October Monsoons',
      excerpt: 'The long archive edition — twelve chapters, one pot of tea.',
      tag: 'Archive Edition',
      side: 'Side B: Everyday',
      essayNo: 10,
      author: { name: 'Kiên', avatar: 'assets/ki-n-author-avatar0.png' },
      publishedAt: '2024-10-25T05:45:00+07:00',
      colophon: 'Written across three rainy evenings on Phan Đình Phùng street.',
      content: longContent,
      reactions: { tea: 30, insight: 18, calm: 41, resonate: 7 },
      prev: { slug: 'designing-software-with-warmth', title: 'Designing Software with Warmth', side: 'Side B: Everyday & Soul', essayNo: 9, readMinutes: 8 },
      next: null
    }
  };
  window.MOCK_DEFAULT_SLUG = 'designing-software-with-warmth';
})();
