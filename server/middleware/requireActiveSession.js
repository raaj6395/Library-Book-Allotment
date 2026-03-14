import Session from '../models/Session.model.js';

export const requireActiveSession = async (req, res, next) => {
  try {
    const session = await Session.findOne({ status: 'ACTIVE' });
    if (!session) {
      return res.status(400).json({
        error: 'No active session. Create one via POST /api/admin/session',
      });
    }
    req.activeSession = session;
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Failed to verify active session' });
  }
};
