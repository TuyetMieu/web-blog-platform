import { REACTION_TYPES, POSTS_PER_PAGE } from '../config/constants';
import { PostDetailDTO, PostListDTO, PostListItemDTO, ReactionsDTO } from '../dto/post.dto';
import { postRepository, PostRow } from '../repositories/post.repository';
import { reactionRepository } from '../repositories/reaction.repository';
import { tagRepository } from '../repositories/tag.repository';
import { ListPostsQuery } from '../schemas/post.schema';
import { AppError } from '../utils/errors';
import { offsetOf, totalPages } from '../utils/pagination';

function buildReactions(fromDb?: Record<string, number>): ReactionsDTO {
  const base: ReactionsDTO = Object.fromEntries(REACTION_TYPES.map((t) => [t, 0]));
  return { ...base, ...(fromDb ?? {}) };
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
    tags: tags.get(r.id) ?? [],
    cover: r.cover,
    date: r.date,
    reactions: buildReactions(reactions.get(r.id)),
  }));
}

export const postService = {
  async getPosts(query: ListPostsQuery): Promise<PostListDTO> {
    const filter = { side: query.side, tag: query.tag, q: query.q };
    const [total, rows] = await Promise.all([
      postRepository.count(filter),
      postRepository.findPage(filter, POSTS_PER_PAGE, offsetOf(query.page, POSTS_PER_PAGE)),
    ]);
    return {
      total_pages: totalPages(total, POSTS_PER_PAGE),
      page: query.page,
      posts: await toListItems(rows),
    };
  },

  async getPostBySlug(slug: string): Promise<PostDetailDTO> {
    const post = await postRepository.findBySlug(slug);
    if (!post) throw new AppError(404, 'Post not found');

    const [tags, reactions, prev, next] = await Promise.all([
      tagRepository.findByPostIds([post.id]),
      reactionRepository.findByPostIds([post.id]),
      postRepository.findNewerNeighbor(post.date, post.id),
      postRepository.findOlderNeighbor(post.date, post.id),
    ]);

    return {
      slug: post.slug,
      title: post.title,
      content: post.content,
      tags: tags.get(post.id) ?? [],
      date: post.date,
      cover: post.cover,
      reactions: buildReactions(reactions.get(post.id)),
      prev: prev ? { slug: prev.slug, title: prev.title } : null,
      next: next ? { slug: next.slug, title: next.title } : null,
    };
  },

  async getTopPosts(limit: number): Promise<PostListItemDTO[]> {
    return toListItems(await postRepository.findTop(limit));
  },

  async getRecentPosts(limit: number): Promise<PostListItemDTO[]> {
    return toListItems(await postRepository.findRecent(limit));
  },
};