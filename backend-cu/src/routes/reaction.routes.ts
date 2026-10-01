import { Router } from 'express';
import { reactionController } from '../controllers/reaction.controller';

const router = Router();
router.post('/:slug/react', reactionController.react);

export default router;
