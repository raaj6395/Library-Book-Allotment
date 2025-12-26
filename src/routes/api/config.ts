import express from 'express';
import { MAX_BOOK_PREFERENCES } from '../../config/constants';
const router = express.Router();

router.get('/', (_req, res) => {
  res.json({ maxBookPreferences: MAX_BOOK_PREFERENCES });
});

export default router;
