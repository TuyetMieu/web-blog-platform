import { Db, pool } from '../config/database';

export const reactionRepository = {
  async findByPostIds(postIds: number[], db: Db = pool): Promise<Map<number, Record<string, number>>> {
    const map = new Map<number, Record<string, number>>();
    if (!postIds.length) return map;
    const { rows } = await db.query<{ post_id: number; type: string; count: number }>(
      'SELECT post_id, type, count FROM reactions WHERE post_id = ANY($1::bigint[])',
      [postIds],
    );
    for (const r of rows) {
      const obj = map.get(r.post_id) ?? {};
      obj[r.type] = r.count;
      map.set(r.post_id, obj);
    }
    return map;
  },

  async increment(postId: number, type: string, db: Db = pool): Promise<number> {
    const { rows } = await db.query<{ count: number }>(
      `INSERT INTO reactions (post_id, type, count) VALUES ($1, $2, 1)
       ON CONFLICT (post_id, type) DO UPDATE SET count = reactions.count + 1
       RETURNING count`,
      [postId, type],
    );
    return rows[0].count;
  },
};