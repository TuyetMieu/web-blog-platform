-- Schema SQLite cho Kiên's Journal (tương đương migration 001–007 của backend-cu/PostgreSQL).

CREATE TABLE posts (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  slug     TEXT    NOT NULL UNIQUE,
  title    TEXT    NOT NULL,
  excerpt  TEXT,
  content  TEXT    NOT NULL DEFAULT '',
  side     TEXT    NOT NULL CHECK (side IN ('engineering', 'life')),
  category TEXT,
  cover    TEXT,
  date     TEXT    NOT NULL DEFAULT (date('now')),          -- YYYY-MM-DD
  featured INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0, 1)),
  reads    INTEGER NOT NULL DEFAULT 0 CHECK (reads >= 0),
  extra    TEXT    NOT NULL DEFAULT '{}' CHECK (json_valid(extra))
);

CREATE TABLE tags (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE post_tags (
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tag_id  INTEGER NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

CREATE TABLE reactions (
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  type    TEXT    NOT NULL CHECK (type IN ('tea', 'insight', 'calm', 'resonate')),
  count   INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
  PRIMARY KEY (post_id, type)
);

-- Note bưu thiếp: luôn riêng tư (pinned = 0) cho tới khi Kiên ghim.
CREATE TABLE notes (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  message       TEXT    NOT NULL,
  name          TEXT,
  email         TEXT,
  role          TEXT,
  location      TEXT,
  topic         TEXT    NOT NULL CHECK (topic IN ('EngineeringSolitude', 'TeaAndHanoi', 'AtticMusings', 'BookMusings')),
  post_id       INTEGER REFERENCES posts(id) ON DELETE SET NULL,
  date          TEXT    NOT NULL DEFAULT (date('now')),
  reply         TEXT,
  reply_context TEXT,
  pinned        INTEGER NOT NULL DEFAULT 0 CHECK (pinned IN (0, 1))
);

CREATE INDEX idx_posts_date_id      ON posts (date DESC, id DESC);
CREATE INDEX idx_posts_side         ON posts (side, category);
CREATE INDEX idx_posts_reads        ON posts (reads DESC);
CREATE INDEX idx_post_tags_tag      ON post_tags (tag_id);
CREATE INDEX idx_notes_post         ON notes (post_id);
CREATE INDEX idx_notes_pinned_date  ON notes (pinned, topic, date DESC, id DESC);
