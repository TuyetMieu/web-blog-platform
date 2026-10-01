CREATE INDEX idx_posts_date_id     ON posts (date DESC, id DESC);
CREATE INDEX idx_posts_side        ON posts (side);
CREATE INDEX idx_post_tags_tag     ON post_tags (tag_id);
CREATE INDEX idx_reactions_post    ON reactions (post_id);
CREATE INDEX idx_notes_topic_date  ON notes (topic, date DESC, id DESC);
