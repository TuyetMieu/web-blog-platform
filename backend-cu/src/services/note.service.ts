import { noteRepository, NoteRow } from '../repositories/note.repository';
import { postRepository } from '../repositories/post.repository';
import { CreateNoteBody, ListNotesQuery } from '../schemas/note.schema';
import { AppError } from '../utils/errors';
import { offsetOf, totalPages } from '../utils/pagination';

export const noteService = {
  // Note mới luôn ở trạng thái riêng tư (pinned = false) cho tới khi Kiên ghim.
  async create(body: CreateNoteBody): Promise<void> {
    let postId: number | null = null;
    if (body.post_slug) {
      postId = await postRepository.findIdBySlug(body.post_slug);
      if (postId === null) throw new AppError(404, 'Post not found');
    }
    await noteRepository.insert({
      message: body.message,
      name: body.name ?? null,
      email: body.email ?? null,
      location: body.location ?? null,
      topic: body.topic,
      postId,
    });
  },

  async list(query: ListNotesQuery): Promise<{ total: number; total_pages: number; page: number; notes: NoteRow[] }> {
    const filter = { topic: query.topic, q: query.q };
    const [total, notes] = await Promise.all([
      noteRepository.count(filter),
      noteRepository.findPage(filter, query.per_page, offsetOf(query.page, query.per_page)),
    ]);
    return { total, total_pages: totalPages(total, query.per_page), page: query.page, notes };
  },
};
