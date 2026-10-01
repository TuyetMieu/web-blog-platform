-- Đồng bộ schema với thiết kế Figma và frontend (Màn 1–6).

-- Bài viết: chủ đề, bài nổi bật, lượt đọc, dữ liệu trình bày phụ (code panel, takeaways, essay no...)
ALTER TABLE posts
  ADD COLUMN category TEXT,
  ADD COLUMN featured BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN reads    INTEGER NOT NULL DEFAULT 0 CHECK (reads >= 0),
  ADD COLUMN extra    JSONB   NOT NULL DEFAULT '{}'::jsonb;

-- Reaction theo thiết kế Màn 3: Sip Tea / Insightful / Calming / Resonate
ALTER TABLE reactions DROP CONSTRAINT reactions_type_check;
UPDATE reactions SET type = CASE type
  WHEN 'like'   THEN 'tea'
  WHEN 'useful' THEN 'insight'
  WHEN 'love'   THEN 'calm'
  WHEN 'funny'  THEN 'resonate'
  ELSE type END;
ALTER TABLE reactions ADD CONSTRAINT reactions_type_check
  CHECK (type IN ('tea', 'insight', 'calm', 'resonate'));

-- Topic seal theo thiết kế Màn 4
ALTER TABLE notes DROP CONSTRAINT notes_topic_check;
UPDATE notes SET topic = CASE topic
  WHEN 'general'  THEN 'AtticMusings'
  WHEN 'question' THEN 'EngineeringSolitude'
  WHEN 'feedback' THEN 'BookMusings'
  WHEN 'collab'   THEN 'TeaAndHanoi'
  ELSE topic END;
ALTER TABLE notes ADD CONSTRAINT notes_topic_check
  CHECK (topic IN ('EngineeringSolitude', 'TeaAndHanoi', 'AtticMusings', 'BookMusings'));

-- Note: nơi gửi, vai trò, lời đáp của Kiên, và cờ "đã ghim" (chỉ note đã ghim mới công khai).
ALTER TABLE notes
  ADD COLUMN location      TEXT,
  ADD COLUMN role          TEXT,
  ADD COLUMN reply         TEXT,
  ADD COLUMN reply_context TEXT,
  ADD COLUMN pinned        BOOLEAN NOT NULL DEFAULT false;

-- Note có sẵn trước migration này vốn đã công khai → giữ nguyên hành vi.
UPDATE notes SET pinned = true;

CREATE INDEX idx_posts_category    ON posts (side, category);
CREATE INDEX idx_posts_reads       ON posts (reads DESC);
CREATE INDEX idx_notes_pinned_date ON notes (pinned, date DESC, id DESC);
