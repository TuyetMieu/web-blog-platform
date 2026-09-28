import { Db, pool } from '../config/database';

export const tagRepository = {
  async findByPostIds(postIds: number[], db: Db = pool): Promise<Map<number, string[]>> {
    const map = new Map<number, string[]>();
    if (!postIds.length) return map;
    const { rows } = await db.query<{ post_id: number; name: string }>(
      `SELECT pt.post_id, t.name FROM post_tags pt JOIN tags t ON t.id = pt.tag_id
       WHERE pt.post_id = ANY($1::bigint[]) ORDER BY t.name`,
      [postIds],
    );
    for (const r of rows) {
      const arr = map.get(r.post_id) ?? [];
      arr.push(r.name);
      map.set(r.post_id, arr);
    }
    return map;
  },
};
