CREATE TABLE notes (
  id      SERIAL PRIMARY KEY,
  message TEXT NOT NULL,
  name    TEXT,
  email   TEXT,
  topic   TEXT NOT NULL CHECK (topic IN ('general', 'question', 'feedback', 'collab')),
  post_id INTEGER REFERENCES posts(id) ON DELETE SET NULL,
  date    DATE NOT NULL DEFAULT CURRENT_DATE
);
