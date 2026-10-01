import 'dotenv/config';
import { Pool } from 'pg';
import { REACTION_TYPES } from '../../src/config/constants';
import { loadSiteContent, SITE_CONTENT_FILE } from '../../src/utils/site-content';

/**
 * Seed dữ liệu mẫu từ ../frontend/data/site-content.js — CÙNG nguồn với chế độ
 * offline của frontend, nên dữ liệu 2 bên luôn khớp nhau.
 *   pnpm seed        → bỏ qua nếu đã có bài viết
 *   pnpm seed:reset  → xoá sạch rồi seed lại
 */
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const reset = process.argv.includes('--reset');

async function main() {
  const content = loadSiteContent();
  const client = await pool.connect();

  try {
    if (!reset) {
      const { rows } = await client.query<{ n: string }>('SELECT COUNT(*) AS n FROM posts');
      if (Number(rows[0].n) > 0) {
        console.log('Database đã có bài viết → bỏ qua seed. Dùng "pnpm seed:reset" để seed lại.');
        return;
      }
    }

    await client.query('BEGIN');

    if (reset) {
      await client.query('TRUNCATE notes, reactions, post_tags, tags, posts RESTART IDENTITY CASCADE');
    }

    // Tags
    const tagNames = [...new Set(content.posts.flatMap((p) => p.tags ?? []))].sort();
    const tagIds = new Map<string, number>();
    for (const name of tagNames) {
      const { rows } = await client.query<{ id: number }>('INSERT INTO tags (name) VALUES ($1) RETURNING id', [name]);
      tagIds.set(name, rows[0].id);
    }

    // Posts + post_tags + reactions (chèn theo đúng thứ tự trong file để id ổn định)
    const postIds = new Map<string, number>();
    for (const p of content.posts) {
      const { rows } = await client.query<{ id: number }>(
        `INSERT INTO posts (slug, title, excerpt, content, side, category, cover, date, featured, reads, extra)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id`,
        [
          p.slug,
          p.title,
          p.excerpt ?? null,
          p.content,
          p.side,
          p.category ?? null,
          p.cover ?? null,
          p.date,
          p.featured ?? false,
          p.reads ?? 0,
          JSON.stringify(p.extra ?? {}),
        ],
      );
      const postId = rows[0].id;
      postIds.set(p.slug, postId);

      for (const tag of p.tags ?? []) {
        await client.query('INSERT INTO post_tags (post_id, tag_id) VALUES ($1, $2)', [postId, tagIds.get(tag)]);
      }
      for (const type of REACTION_TYPES) {
        await client.query('INSERT INTO reactions (post_id, type, count) VALUES ($1, $2, $3)', [
          postId,
          type,
          p.reactions?.[type] ?? 0,
        ]);
      }
    }

    // Notes đã ghim (công khai trên Community Board)
    for (const n of content.notes) {
      await client.query(
        `INSERT INTO notes (message, name, role, location, topic, post_id, date, reply, reply_context, pinned)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)`,
        [
          n.message,
          n.name ?? null,
          n.role ?? null,
          n.location ?? null,
          n.topic,
          n.postSlug ? postIds.get(n.postSlug) ?? null : null,
          n.date,
          n.reply ?? null,
          n.replyContext ?? null,
        ],
      );
    }

    await client.query('COMMIT');

    console.log(`Seed thành công từ ${SITE_CONTENT_FILE}`);
    console.log(`Posts: ${content.posts.length}`);
    console.log(`Tags: ${tagNames.length}`);
    console.log(`Reactions: ${content.posts.length * REACTION_TYPES.length}`);
    console.log(`Notes: ${content.notes.length}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
