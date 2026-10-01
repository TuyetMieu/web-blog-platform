import { Router } from 'express';
import { postController } from '../controllers/post.controller';

const router = Router();
router.get('/', postController.list);
router.get('/top', postController.top);
router.get('/recent', postController.recent);
router.get('/categories', postController.categories);
router.get('/:slug', postController.detail);
router.post('/:slug/read', postController.read);

export default router;
