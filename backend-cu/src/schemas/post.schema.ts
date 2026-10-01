import { z } from 'zod';
import { MAX_LIMIT, MAX_SLUGS_FILTER, POST_SORTS, SIDES } from '../config/constants';
import { emptyToUndef } from './common';

const pageField = z.preprocess(
  emptyToUndef,
  z.coerce.number({ invalid_type_error: 'Invalid page' }).int().min(1, 'Invalid page').default(1),
);

export const perPageField = (defaultValue: number) =>
  z.preprocess(
    emptyToUndef,
    z.coerce
      .number({ invalid_type_error: 'Invalid per_page' })
      .int()
      .min(1, 'Invalid per_page')
      .max(MAX_LIMIT, 'Invalid per_page')
      .default(defaultValue),
  );

export const listPostsQuerySchema = (defaultPerPage: number) =>
  z.object({
    side: z.preprocess(emptyToUndef, z.enum(SIDES, { errorMap: () => ({ message: 'Invalid side' }) }).optional()),
    category: z.preprocess(emptyToUndef, z.string().trim().max(80).optional()),
    tag: z.preprocess(emptyToUndef, z.string().trim().max(50).optional()),
    q: z.preprocess(emptyToUndef, z.string().trim().max(100).optional()),
    slugs: z.preprocess(
      (v) => (typeof v === 'string' && v.trim() ? v.split(',').map((s) => s.trim()).filter(Boolean) : undefined),
      z.array(z.string().max(200)).max(MAX_SLUGS_FILTER, 'Too many slugs').optional(),
    ),
    featured: z.preprocess(
      (v) => (v === 'true' || v === '1' ? true : v === 'false' || v === '0' ? false : undefined),
      z.boolean().optional(),
    ),
    sort: z.preprocess(emptyToUndef, z.enum(POST_SORTS, { errorMap: () => ({ message: 'Invalid sort' }) }).default('recent')),
    page: pageField,
    per_page: perPageField(defaultPerPage),
  });
export type ListPostsQuery = z.infer<ReturnType<typeof listPostsQuerySchema>>;

export const limitQuerySchema = (defaultLimit: number) =>
  z.object({
    limit: z.preprocess(
      emptyToUndef,
      z.coerce.number({ invalid_type_error: 'Invalid limit' }).int().min(1, 'Invalid limit').max(MAX_LIMIT).default(defaultLimit),
    ),
  });

export const slugParamSchema = z.object({ slug: z.string().trim().min(1).max(200) });
