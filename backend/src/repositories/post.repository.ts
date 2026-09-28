import { Db, pool } from '../config/database';
import { escapeLike } from '../utils/pagination';

export type PostRow = {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  side: string;
  cover: string | null;
  date: string;
};
export type PostDetailRow = PostRow & { content: string };
export type PostNavRow = { slug: string; title: string };
export type PostFilter = { side?: string; tag?: string; q?: string };

const SUMMARY_COLS = 'p.id, p.slug, p.title, p.excerpt, p.side, p.cover, p.date';

function buildWhere(f: PostFilter): { clause: string; params: unknown[] } {
  const where: string[] = [];
  const params: unknown[] = [];
  if (f.side) {
    params.push(f.side);
    where.push(`p.side = $${params.length}`);
  }
  if (f.tag) {
    params.push(f.tag);
    where.push(
      `EXISTS (SELECT 1 FROM post_tags pt JOIN tags t ON t.id = pt.tag_id
               WHERE pt.post_id = p.id AND t.name = $${params.length})`,
    );
  }
  if (f.q) {
    params.push(`%${escapeLike(f.q)}%`);
    where.push(`(p.title ILIKE $${params.length} OR p.excerpt ILIKE $${params.length})`);
  }
  return { clause: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

export const postRepository = {
  async count(filter: PostFilter, db: Db = pool): Promise<number> {
    const { clause, params } = buildWhere(filter);
    const { rows } = await db.query<{ n: number }>(`SELECT COUNT(*) AS n FROM posts p ${clause}`, params);
    return rows[0].n;
  },

  async findPage(filter: PostFilter, limit: number, offset: number, db: Db = pool): Promise<PostRow[]> {
    const { clause, params } = buildWhere(filter);
    const { rows } = await db.query<PostRow>(
      `SELECT ${SUMMARY_COLS} FROM posts p ${clause}
       ORDER BY p.date DESC, p.id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    );
    return rows;
  },

  async findBySlug(slug: string, db: Db = pool): Promise<PostDetailRow | null> {
    const { rows } = await db.query<PostDetailRow>(
      `SELECT ${SUMMARY_COLS}, p.content FROM posts p WHERE p.slug = $1`,
      [slug],
    );
    return rows[0] ?? null;
  },

  async findIdBySlug(slug: string, db: Db = pool): Promise<number | null> {
    const { rows } = await db.query<{ id: number }>('SELECT id FROM posts WHERE slug = $1', [slug]);
    return rows[0]?.id ?? null;
  },

  async findNewerNeighbor(date: string, id: number, db: Db = pool): Promise<PostNavRow | null> {
    const { rows } = await db.query<PostNavRow>(
      `SELECT slug, title FROM posts
       WHERE (date, id) > ($1::date, $2)
       ORDER BY date ASC, id ASC LIMIT 1`,
      [date, id],
    );
    return rows[0] ?? null;
  },

  async findOlderNeighbor(date: string, id: number, db: Db = pool): Promise<PostNavRow | null> {
    const { rows } = await db.query<PostNavRow>(
      `SELECT slug, title FROM posts
       WHERE (date, id) < ($1::date, $2)
       ORDER BY date DESC, id DESC LIMIT 1`,
      [date, id],
    );
    return rows[0] ?? null;
  },

  async findTop(limit: number, db: Db = pool): Promise<PostRow[]> {
    const { rows } = await db.query<PostRow>(
      `SELECT ${SUMMARY_COLS}, COALESCE(SUM(r.count), 0) AS total_reactions
       FROM posts p LEFT JOIN reactions r ON r.post_id = p.id
       GROUP BY p.id
       ORDER BY total_reactions DESC, p.date DESC, p.id DESC
       LIMIT $1`,
      [limit],
    );
    return rows;
  },

  async findRecent(limit: number, db: Db = pool): Promise<PostRow[]> {
    const { rows } = await db.query<PostRow>(
      `SELECT ${SUMMARY_COLS} FROM posts p ORDER BY p.date DESC, p.id DESC LIMIT $1`,
      [limit],
    );
    return rows;
  },
};