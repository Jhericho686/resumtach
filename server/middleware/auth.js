const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// In-memory cache for validated Supabase tokens (5 min TTL) to minimize latency
const tokenCache = new Map();

const attachInternalId = async (user) => {
  const isUuid = isNaN(user.id) && String(user.id).includes('-');
  if (isUuid) {
    user.supabase_id = user.id;
    try {
      let [dbUsers] = await pool.query(
        'SELECT id, role, email, supabase_id, first_name, last_name FROM users WHERE supabase_id = ? OR (email = ? AND email != \'\')',
        [user.id, user.email || '']
      );
      if (dbUsers.length > 0) {
        user.id = dbUsers[0].id;
        user.role = dbUsers[0].role;
        // Keep supabase_id updated if it was previously null
        if (!dbUsers[0].supabase_id) {
          await pool.query('UPDATE users SET supabase_id = ? WHERE id = ?', [user.supabase_id, user.id]);
        }
        // Keep email updated if it was previously empty
        if ((!dbUsers[0].email || dbUsers[0].email === '') && user.email) {
          await pool.query('UPDATE users SET email = ? WHERE id = ?', [user.email, user.id]);
          dbUsers[0].email = user.email;
        }
        // If first_name was saved as an email address and we now have a real name, update it
        if (user.name && !user.name.includes('@') && dbUsers[0].first_name && dbUsers[0].first_name.includes('@')) {
          const parts = user.name.trim().split(' ');
          const fn = parts[0] || 'User';
          const ln = parts.slice(1).join(' ') || '';
          await pool.query('UPDATE users SET first_name = ?, last_name = ? WHERE id = ?', [fn, ln, user.id]);
        }
        user.email = user.email || dbUsers[0].email;
      } else {
        // Auto-provision user in PostgreSQL so foreign keys (resumes, applicants) ALWAYS succeed
        const emailLower = (user.email || '').toLowerCase();
        const role = (emailLower.includes('admin') || emailLower.includes('staff')) ? 'admin' : 'applicant';
        let firstName = 'User';
        let lastName = '';
        if (user.name && !user.name.includes('@')) {
          const nameParts = user.name.trim().split(' ');
          firstName = nameParts[0] || 'User';
          lastName = nameParts.slice(1).join(' ') || '';
        } else if (user.email) {
          const namePrefix = user.email.split('@')[0];
          firstName = namePrefix.charAt(0).toUpperCase() + namePrefix.slice(1);
        }
        const [insertResult] = await pool.query(
          `INSERT INTO users (supabase_id, email, first_name, last_name, password, role, is_active)
           VALUES (?, ?, ?, ?, 'supabase_managed', ?, true) RETURNING id`,
          [user.supabase_id, user.email || `${user.id}@supabase.user`, firstName, lastName, role]
        );
        user.id = insertResult.insertId;
        user.role = role;
      }
    } catch (e) {
      console.error('DB lookup/provisioning for user failed in auth middleware:', e.message);
    }
  }
  return user;
};

const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];

    // Check fast token cache
    const cached = tokenCache.get(token);
    if (cached && cached.expiresAt > Date.now()) {
      req.user = cached.user;
      return next();
    }

    // 1. Try Supabase JWT Secret if configured
    if (process.env.SUPABASE_JWT_SECRET) {
      try {
        const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
        const user = await attachInternalId({
          id: decoded.sub || decoded.id,
          role: decoded.role || decoded.app_metadata?.role || 'applicant',
          email: decoded.email,
          name: decoded.user_metadata?.full_name || decoded.user_metadata?.name || decoded.name || ''
        });
        tokenCache.set(token, { user, expiresAt: Date.now() + 5 * 60 * 1000 });
        req.user = user;
        return next();
      } catch (e) { /* fall through */ }
    }

    // 2. Verify Supabase token by calling Supabase's API
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY
          }
        });

        if (response.ok) {
          const userData = await response.json();
          const emailLower = (userData.email || '').toLowerCase();
          const defaultRole = (emailLower.includes('admin') || emailLower.includes('staff')) ? 'admin' : 'applicant';

          const user = await attachInternalId({
            id: userData.id,
            email: userData.email,
            role: userData.app_metadata?.role || defaultRole,
            name: userData.user_metadata?.full_name || userData.user_metadata?.name || ''
          });
          tokenCache.set(token, { user, expiresAt: Date.now() + 5 * 60 * 1000 });
          req.user = user;
          return next();
        }
      } catch (e) { /* fall through */ }
    }

    // 3. Fallback: standard JWT secret
    if (process.env.JWT_SECRET) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await attachInternalId({
          ...decoded,
          name: decoded.name || decoded.user_metadata?.full_name || ''
        });
        tokenCache.set(token, { user, expiresAt: Date.now() + 5 * 60 * 1000 });
        req.user = user;
        return next();
      } catch (e) { /* fall through */ }
    }

    return res.status(401).json({ message: 'Invalid or expired token.' });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired. Please login again.' });
    }
    return res.status(401).json({ message: 'Invalid token.' });
  }
};

module.exports = auth;
