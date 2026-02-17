import { Router } from 'express';
const router = Router();

router.get('/', (req, res) => {
  res.json({ message: 'Auth API' });
});

export default router;
