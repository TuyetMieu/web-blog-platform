import { Router } from 'express';
import { noteController } from '../controllers/note.controller';

const router = Router();
router.post('/', noteController.create);
router.get('/', noteController.list);

export default router;
