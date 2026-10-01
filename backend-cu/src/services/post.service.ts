import { REACTION_TYPES, WORDS_PER_MINUTE } from '../config/constants';
import { CategoryDTO, PostDetailDTO, PostListDTO, PostListItemDTO, PostNavDTO, ReactionsDTO } from '../dto/post.dto';
import { postRepository, PostNavRow, PostRow } from '../repositories/post.repository';
import { reactionRepository } from '../repositories/reaction.repository';
import { tagRepository } from '../repositories/tag.repository';
import { ListPostsQuery } from '../schemas/post.schema';
import { AppError } from '../utils/errors';
import { offsetOf, totalPages } from '../utils/pagination';

function buildReactions(fromDb?: Record<string, number>): ReactionsDTO {
  const base: ReactionsDTO = Object.fromEntries(REACTION_TYPES.map((t) => [t, 0]));
  return { ...base, ...(fromDb ?? {}) };
}

export const readMinutes = (wordCount: number): number => Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE));

function toNav(row: PostNavRow | null): PostNavDTO {
  return row ? { slug: row.slug, title: row.title, side: row.side, read_minutes: readMinutes(row.word_count) } : null;
}

async function toListItems(rows: PostRow[]): Promise<PostListItemDTO[]> {
  const ids = rows.map((r) => r.id);
  const [tags, reactions] = await Promise.all([
    tagRepository.findByPostIds(ids),
    reactionRepository.findByPostIds(ids),
  ]);
  return rows.map((r) => ({
    slug: r.slug,
    title: r.title,
    excerpt: r.excerpt,
    side: r.side,
    category: r.category,
    tags: tags.get(r.id) ?? [],
    cover: r.cover,
    date: r.date,
    featured: r.featured,
    reads: r.reads,
    read_minutes: readMinutes(r.word_count),
    note_count: r.note_count,
    reactions: buildReactions(reactions.get(r.id)),
    extra: r.extra ?? {},
  }));
}

export const postService = {
  async getPosts(query: ListPostsQuery): Promise<PostListDTO> {
    const filter = {
      side: query.side,
      category: query.category,
      tag: query.tag,
      q: query.q,
      slugs: query.slugs,
      featured: query.featured,
    };
    const [total, rows] = await Promise.all([
      postRepository.count(filter),
      postRepository.findPage(filter, query.sort, query.per_page, offsetOf(query.page, query.per_page)),
    ]);
    return {
      total,
      total_pages: totalPages(total, query.per_page),
      page: query.page,
      per_page: query.per_page,
      posts: await toListItems(rows),
    };
  },

  async getPostBySlug(slug: string): Promise<PostDetailDTO> {
    const post = await postRepository.findBySlug(slug);
    if (!post) throw new AppError(404, 'Post not found');

    const [[item], prev, next] = await Promise.all([
      toListItems([post]),
      postRepository.findNewerNeighbor(post.date, post.id),
      postRepository.findOlderNeighbor(post.date, post.id),
    ]);

    return { ...item, content: post.content, prev: toNav(prev), next: toNav(next) };
  },

  async getTopPosts(limit: number): Promise<PostListItemDTO[]> {
    return toListItems(await postRepository.findTop(limit));
  },

  async getRecentPosts(limit: number): Promise<PostListItemDTO[]> {
    return toListItems(await postRepository.findRecent(limit));
  },

  async getCategories(): Promise<CategoryDTO[]> {
    return postRepository.countByCategory();
  },

  async markRead(slug: string): Promise<{ reads: number }> {
    const reads = await postRepository.incrementReads(slug);
    if (reads === null) throw new AppError(404, 'Post not found');
    return { reads };
  },
};
