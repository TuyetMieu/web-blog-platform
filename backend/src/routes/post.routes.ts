import { Router } from 'express';
import { postController } from '../controllers/post.controller';

const router = Router();
router.get('/', postController.list);
router.get('/top', postController.top);
router.get('/recent', postController.recent);
router.get('/:slug', postController.detail);

export default router;
