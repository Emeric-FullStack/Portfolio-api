import { Router } from 'express';
import { sendContactEmail } from '../controllers/contact.controller';

const router = Router();

router.post('/send', sendContactEmail);

export default router;
