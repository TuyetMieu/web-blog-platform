import { NOTES_PER_PAGE } from '../config/constants';
import { noteRepository, NoteRow } from '../repositories/note.repository';
import { postRepository } from '../repositories/post.repository';
import { CreateNoteBody, ListNotesQuery } from '../schemas/note.schema';
import { AppError } from '../utils/errors';
import { offsetOf, totalPages } from '../utils/pagination';

export const noteService = {
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
      topic: body.topic,
      postId,
    });
  },

  async list(query: ListNotesQuery): Promise<{ total_pages: number; page: number; notes: NoteRow[] }> {
    const [total, notes] = await Promise.all([
      noteRepository.count(query.topic),
      noteRepository.findPage(query.topic, NOTES_PER_PAGE, offsetOf(query.page, NOTES_PER_PAGE)),
    ]);
    return { total_pages: totalPages(total, NOTES_PER_PAGE), page: query.page, notes };
  },
};
