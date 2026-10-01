import { Db, pool } from '../config/database';
import { escapeLike } from '../utils/pagination';

export type PostRow = {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  side: string;
  category: string | null;
  cover: string | null;
  date: string;
  featured: boolean;
  reads: number;
  extra: Record<string, unknown>;
  word_count: number;
  note_count: number;
};
export type PostDetailRow = PostRow & { content: string };
export type PostNavRow = { slug: string; title: string; side: string; word_count: number };
export type PostFilter = {
  side?: string;
  category?: string;
  tag?: string;
  q?: string;
  slugs?: string[];
  featured?: boolean;
};
export type PostSort = 'recent' | 'reads';

// Số từ của nội dung (bỏ thẻ HTML) để tính thời gian đọc.
const WORD_COUNT = `COALESCE(array_length(regexp_split_to_array(btrim(regexp_replace(p.content, '<[^>]+>', ' ', 'g')), '\\s+'), 1), 0)`;

const SUMMARY_COLS = `p.id, p.slug, p.title, p.excerpt, p.side, p.category, p.cover, p.date,
  p.featured, p.reads, p.extra,
  ${WORD_COUNT} AS word_count,
  (SELECT COUNT(*) FROM notes n WHERE n.post_id = p.id) AS note_count`;

const ORDER_BY: Record<PostSort, string> = {
  recent: 'p.date DESC, p.id DESC',
  reads: 'p.reads DESC, p.date DESC, p.id DESC',
};

function buildWhere(f: PostFilter): { clause: string; params: unknown[] } {
  const where: string[] = [];
  const params: unknown[] = [];
  if (f.side) {
    params.push(f.side);
    where.push(`p.side = $${params.length}`);
  }
  if (f.category) {
    params.push(f.category);
    where.push(`p.category = $${params.length}`);
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
  if (f.slugs) {
    params.push(f.slugs);
    where.push(`p.slug = ANY($${params.length}::text[])`);
  }
  if (f.featured !== undefined) {
    params.push(f.featured);
    where.push(`p.featured = $${params.length}`);
  }
  return { clause: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

export const postRepository = {
  async count(filter: PostFilter, db: Db = pool): Promise<number> {
    const { clause, params } = buildWhere(filter);
    const { rows } = await db.query<{ n: number }>(`SELECT COUNT(*) AS n FROM posts p ${clause}`, params);
    return rows[0].n;
  },

  async findPage(
    filter: PostFilter,
    sort: PostSort,
    limit: number,
    offset: number,
    db: Db = pool,
  ): Promise<PostRow[]> {
    const { clause, params } = buildWhere(filter);
    const { rows } = await db.query<PostRow>(
      `SELECT ${SUMMARY_COLS} FROM posts p ${clause}
       ORDER BY ${ORDER_BY[sort]}
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
      `SELECT p.slug, p.title, p.side, ${WORD_COUNT} AS word_count FROM posts p
       WHERE (p.date, p.id) > ($1::date, $2)
       ORDER BY p.date ASC, p.id ASC LIMIT 1`,
      [date, id],
    );
    return rows[0] ?? null;
  },

  async findOlderNeighbor(date: string, id: number, db: Db = pool): Promise<PostNavRow | null> {
    const { rows } = await db.query<PostNavRow>(
      `SELECT p.slug, p.title, p.side, ${WORD_COUNT} AS word_count FROM posts p
       WHERE (p.date, p.id) < ($1::date, $2)
       ORDER BY p.date DESC, p.id DESC LIMIT 1`,
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

  async findRecentWithContent(limit: number, db: Db = pool): Promise<PostDetailRow[]> {
    const { rows } = await db.query<PostDetailRow>(
      `SELECT ${SUMMARY_COLS}, p.content FROM posts p ORDER BY p.date DESC, p.id DESC LIMIT $1`,
      [limit],
    );
    return rows;
  },

  async countByCategory(db: Db = pool): Promise<{ side: string; name: string; count: number }[]> {
    const { rows } = await db.query<{ side: string; name: string; count: number }>(
      `SELECT side, category AS name, COUNT(*) AS count FROM posts
       WHERE category IS NOT NULL
       GROUP BY side, category
       ORDER BY side, category`,
    );
    return rows;
  },

  async incrementReads(slug: string, db: Db = pool): Promise<number | null> {
    const { rows } = await db.query<{ reads: number }>(
      'UPDATE posts SET reads = reads + 1 WHERE slug = $1 RETURNING reads',
      [slug],
    );
    return rows[0]?.reads ?? null;
  },
};
