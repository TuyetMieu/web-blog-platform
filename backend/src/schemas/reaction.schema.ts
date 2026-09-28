import { z } from 'zod';
import { REACTION_TYPES } from '../config/constants';

export const reactBodySchema = z.object({
  type: z.enum(REACTION_TYPES, { errorMap: () => ({ message: 'Invalid reaction type' }) }),
});
