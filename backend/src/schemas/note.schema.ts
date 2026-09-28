import { z } from 'zod';
import { NOTE_TOPICS } from '../config/constants';
import { emptyToUndef } from './common';

const topic = z.enum(NOTE_TOPICS, { errorMap: () => ({ message: 'Invalid topic' }) });

export const createNoteSchema = z.object({
  message: z
    .string({ required_error: 'Message is required', invalid_type_error: 'Message is required' })
    .trim()
    .min(1, 'Message is required')
    .max(2000, 'Message is too long'),
  name: z.preprocess(emptyToUndef, z.string().trim().max(100, 'Name is too long').optional()),
  email: z.preprocess(emptyToUndef, z.string().trim().email('Invalid email').max(200).optional()),
  topic,
  post_slug: z.preprocess(emptyToUndef, z.string().trim().max(200).optional()),
});
export type CreateNoteBody = z.infer<typeof createNoteSchema>;

export const listNotesQuerySchema = z.object({
  topic: z.preprocess(emptyToUndef, topic.optional()),
  page: z.preprocess(emptyToUndef, z.coerce.number({ invalid_type_error: 'Invalid page' }).int().min(1, 'Invalid page').default(1)),
});
export type ListNotesQuery = z.infer<typeof listNotesQuerySchema>;
