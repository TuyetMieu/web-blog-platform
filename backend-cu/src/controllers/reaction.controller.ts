import { reactBodySchema } from '../schemas/reaction.schema';
import { slugParamSchema } from '../schemas/post.schema';
import { reactionService } from '../services/reaction.service';
import { asyncHandler } from '../utils/async-handler';
import { parse } from '../utils/validate';

export const reactionController = {
  react: asyncHandler(async (req, res) => {
    const { slug } = parse(slugParamSchema, req.params);
    const { type } = parse(reactBodySchema, req.body ?? {});
    res.json(await reactionService.react(slug, type));
  }),
};
