import { z } from 'zod';
import { MAX_LIMIT, SIDES } from '../config/constants';
import { emptyToUndef } from './common';

export const listPostsQuerySchema = z.object({
  side: z.preprocess(emptyToUndef, z.enum(SIDES, { errorMap: () => ({ message: 'Invalid side' }) }).optional()),
  tag: z.preprocess(emptyToUndef, z.string().trim().max(50).optional()),
  q: z.preprocess(emptyToUndef, z.string().trim().max(100).optional()),
  page: z.preprocess(emptyToUndef, z.coerce.number({ invalid_type_error: 'Invalid page' }).int().min(1, 'Invalid page').default(1)),
});
export type ListPostsQuery = z.infer<typeof listPostsQuerySchema>;

export const limitQuerySchema = (defaultLimit: number) =>
  z.object({
    limit: z.preprocess(
      emptyToUndef,
      z.coerce.number({ invalid_type_error: 'Invalid limit' }).int().min(1, 'Invalid limit').max(MAX_LIMIT).default(defaultLimit),
    ),
  });

export const slugParamSchema = z.object({ slug: z.string().trim().min(1).max(200) });
