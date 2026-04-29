// This is the authentication API endpoints file. It handles:

// User registration (create account)
// Login (email + password)
// Get current user profile
// Update user profile

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
