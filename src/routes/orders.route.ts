import { Router } from 'express';
import { cancelOrder } from '../controllers/orders.controller';

const router = Router();

router.post('/cancel', cancelOrder);

export default router;