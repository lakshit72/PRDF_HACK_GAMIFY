import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * authMiddleware
 * Verifies the Bearer JWT in the Authorization header.
 * On success, attaches the full user document to req.user.
 */
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization header missing or malformed' });
    }

    const token = authHeader.split(' ')[1];

    // Throws if expired or tampered
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch fresh user – confirms they still exist in DB
    const user = await User.findById(decoded.userId).select('-passwordHash -__v');
    if (!user) {
      return res.status(401).json({ error: 'User no longer exists' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired – please log in again' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    next(err);
  }
};

export default authMiddleware;