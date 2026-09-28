import { z } from 'zod';
import { AppError } from './errors';

export function parse<T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new AppError(400, issue?.message ?? 'Invalid request');
  }
  return result.data;
}
