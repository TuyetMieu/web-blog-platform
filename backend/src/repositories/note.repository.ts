import { Db, pool } from '../config/database';

export type NoteRow = { message: string; name: string | null; topic: string; date: string };
export type NewNote = {
  message: string;
  name: string | null;
  email: string | null;
  topic: string;
  postId: number | null;
};

export const noteRepository = {
  async insert(n: NewNote, db: Db = pool): Promise<void> {
    await db.query(
      'INSERT INTO notes (message, name, email, topic, post_id) VALUES ($1, $2, $3, $4, $5)',
      [n.message, n.name, n.email, n.topic, n.postId],
    );
  },

  async count(topic: string | undefined, db: Db = pool): Promise<number> {
    const { rows } = topic
      ? await db.query<{ n: number }>('SELECT COUNT(*) AS n FROM notes WHERE topic = $1', [topic])
      : await db.query<{ n: number }>('SELECT COUNT(*) AS n FROM notes');
    return rows[0].n;
  },

  async findPage(topic: string | undefined, limit: number, offset: number, db: Db = pool): Promise<NoteRow[]> {
    const { rows } = topic
      ? await db.query<NoteRow>(
          `SELECT message, name, topic, date FROM notes WHERE topic = $1
           ORDER BY date DESC, id DESC LIMIT $2 OFFSET $3`,
          [topic, limit, offset],
        )
      : await db.query<NoteRow>(
          `SELECT message, name, topic, date FROM notes
           ORDER BY date DESC, id DESC LIMIT $1 OFFSET $2`,
          [limit, offset],
        );
    return rows;
  },
};
