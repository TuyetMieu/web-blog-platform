import { aboutService } from '../services/about.service';
import { asyncHandler } from '../utils/async-handler';

export const aboutController = {
  get: asyncHandler(async (_req, res) => {
    res.json(await aboutService.get());
  }),
};
