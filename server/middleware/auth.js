/**
 * middleware/auth.js  –  JWT authentication middleware
 *
 * Usage:
 *   const { requireAuth, optionalAuth } = require('../middleware/auth');
 *   router.get('/private', requireAuth, handler);
 *   router.get('/public',  optionalAuth, handler);
 *
 * On success, attaches `req.userId` (string) from the decoded JWT.
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'nexus_super_secret_change_me';

/**
 * requireAuth — rejects with 401 if no valid token.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * optionalAuth — attaches `req.userId` if token is present and valid,
 * but does NOT reject the request. Useful for endpoints that work
 * differently for logged-in vs anonymous users.
 */
function optionalAuth(req, _res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(header.split(' ')[1], JWT_SECRET);
      req.userId = decoded.id;
    } catch { /* ignore invalid token */ }
  }
  next();
}

module.exports = { requireAuth, optionalAuth };
