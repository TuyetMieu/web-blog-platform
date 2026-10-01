import { Router } from 'express';
import { env } from '../config/env';
import { feedService } from '../services/feed.service';
import { asyncHandler } from '../utils/async-handler';

const router = Router();
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const siteUrl = env.siteUrl ?? `${req.protocol}://${req.get('host')}`;
    res.type('application/rss+xml; charset=utf-8').send(await feedService.rss(siteUrl));
  }),
);

export default router;
