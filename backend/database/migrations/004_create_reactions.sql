CREATE TABLE reactions (
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  type    TEXT    NOT NULL CHECK (type IN ('like', 'love', 'funny', 'useful')),
  count   INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
  PRIMARY KEY (post_id, type)
);
