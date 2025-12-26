import express from 'express';
import User from '../../models/User';

const router = express.Router();

router.post('/', async (req, res) => {
  const { name, email, registrationNumber, course, batch, specialization, cpi } = req.body;
  if (cpi === undefined || cpi === null) {
    return res.status(400).json({ message: 'CPI is required for new users' });
  }
  const cpiNum = Number(cpi);
  if (Number.isNaN(cpiNum) || cpiNum < 0 || cpiNum > 10) {
    return res.status(400).json({ message: 'CPI must be a number between 0 and 10' });
  }

  try {
    const user = await User.create({ name, email, registrationNumber, course, batch, specialization, cpi: cpiNum });
    return res.status(201).json(user);
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;