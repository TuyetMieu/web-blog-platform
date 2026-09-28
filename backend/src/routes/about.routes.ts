import { Router } from 'express';
import { aboutController } from '../controllers/about.controller';

const router = Router();
router.get('/', aboutController.get);

export default router;
