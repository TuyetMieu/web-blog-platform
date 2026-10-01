CREATE TABLE posts (
  id      SERIAL PRIMARY KEY,
  slug    TEXT NOT NULL UNIQUE,
  title   TEXT NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL DEFAULT '',
  side    TEXT NOT NULL CHECK (side IN ('engineering', 'life')),
  cover   TEXT,
  date    DATE NOT NULL DEFAULT CURRENT_DATE
);
