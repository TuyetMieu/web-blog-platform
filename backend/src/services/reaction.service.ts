import { postRepository } from '../repositories/post.repository';
import { reactionRepository } from '../repositories/reaction.repository';
import { AppError } from '../utils/errors';

export const reactionService = {
  async react(slug: string, type: string): Promise<{ type: string; count: number }> {
    const postId = await postRepository.findIdBySlug(slug);
    if (postId === null) throw new AppError(404, 'Post not found');
    const count = await reactionRepository.increment(postId, type);
    return { type, count };
  },
};
