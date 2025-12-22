import User from '../models/User.js';

export const authenticate = async (req, res, next) => {
  try {
    const email = req.headers['x-user-email'];
    const password = req.headers['x-user-password'];

    if (!email || !password) {
      return res.status(401).json({ error: 'Email and password required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role
    };
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

export const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

