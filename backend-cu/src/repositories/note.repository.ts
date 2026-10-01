import { Db, pool } from '../config/database';
import { escapeLike } from '../utils/pagination';

export type NoteRow = {
  id: number;
  message: string;
  name: string | null;
  role: string | null;
  location: string | null;
  topic: string;
  date: string;
  reply: string | null;
  reply_context: string | null;
};
export type NewNote = {
  message: string;
  name: string | null;
  email: string | null;
  location: string | null;
  topic: string;
  postId: number | null;
};
export type NoteFilter = { topic?: string; q?: string };
export type PendingNoteRow = NoteRow & { email: string | null; post_slug: string | null };

const PUBLIC_COLS = 'id, message, name, role, location, topic, date, reply, reply_context';

// Chỉ note Kiên đã ghim mới công khai trên Community Board.
function buildWhere(f: NoteFilter): { clause: string; params: unknown[] } {
  const where = ['pinned = true'];
  const params: unknown[] = [];
  if (f.topic) {
    params.push(f.topic);
    where.push(`topic = $${params.length}`);
  }
  if (f.q) {
    params.push(`%${escapeLike(f.q)}%`);
    const i = params.length;
    where.push(`(message ILIKE $${i} OR name ILIKE $${i} OR location ILIKE $${i})`);
  }
  return { clause: `WHERE ${where.join(' AND ')}`, params };
}

export const noteRepository = {
  async insert(n: NewNote, db: Db = pool): Promise<void> {
    await db.query(
      `INSERT INTO notes (message, name, email, location, topic, post_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [n.message, n.name, n.email, n.location, n.topic, n.postId],
    );
  },

  async count(filter: NoteFilter, db: Db = pool): Promise<number> {
    const { clause, params } = buildWhere(filter);
    const { rows } = await db.query<{ n: number }>(`SELECT COUNT(*) AS n FROM notes ${clause}`, params);
    return rows[0].n;
  },

  async findPage(filter: NoteFilter, limit: number, offset: number, db: Db = pool): Promise<NoteRow[]> {
    const { clause, params } = buildWhere(filter);
    const { rows } = await db.query<NoteRow>(
      `SELECT ${PUBLIC_COLS} FROM notes ${clause}
       ORDER BY date DESC, id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    );
    return rows;
  },

  // Dùng cho script quản trị database/notes.ts (không mở ra HTTP).
  async findPending(db: Db = pool): Promise<PendingNoteRow[]> {
    const { rows } = await db.query<PendingNoteRow>(
      `SELECT n.id, n.message, n.name, n.role, n.location, n.topic, n.date, n.reply, n.reply_context,
              n.email, p.slug AS post_slug
       FROM notes n LEFT JOIN posts p ON p.id = n.post_id
       WHERE n.pinned = false
       ORDER BY n.date DESC, n.id DESC`,
    );
    return rows;
  },

  async pin(id: number, reply: string | null, replyContext: string | null, db: Db = pool): Promise<boolean> {
    const { rowCount } = await db.query(
      `UPDATE notes SET pinned = true,
         reply = COALESCE($2, reply),
         reply_context = COALESCE($3, reply_context)
       WHERE id = $1`,
      [id, reply, replyContext],
    );
    return (rowCount ?? 0) > 0;
  },
};
