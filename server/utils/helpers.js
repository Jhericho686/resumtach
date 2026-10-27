const pool = require('../config/db');

const sanitizeDetails = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  const clone = Array.isArray(obj) ? [...obj] : { ...obj };
  for (const key of Object.keys(clone)) {
    if (/pass(word)?|token|secret|key|authorization|credential/i.test(key)) {
      clone[key] = '[REDACTED]';
    } else if (typeof clone[key] === 'object' && clone[key] !== null) {
      clone[key] = sanitizeDetails(clone[key]);
    }
  }
  return clone;
};

const logActivity = async (userId, action, entityType = null, entityId = null, details = null, ipAddress = null) => {
  try {
    // Audit logs are strictly reserved for Admin and Staff actions
    if (userId) {
      const [u] = await pool.query('SELECT role FROM users WHERE id = ?', [userId]);
      if (u.length > 0 && u[0].role !== 'admin' && u[0].role !== 'staff') {
        return; // Do not record applicant activities
      }
    }
    const cleanDetails = details ? sanitizeDetails(details) : null;
    await pool.query(
      'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
      [userId, action, entityType, entityId, cleanDetails ? JSON.stringify(cleanDetails) : null, ipAddress]
    );
  } catch (error) {
    console.error('Failed to log activity:', error.message);
  }
};

const createNotification = async (userId, title, message, type = 'info', link = null) => {
  try {
    await pool.query(
      'INSERT INTO notifications (user_id, title, message, type, link) VALUES ($1, $2, $3, $4, $5)',
      [userId, title, message, type, link]
    );
  } catch (error) {
    console.error('Failed to create notification:', error.message);
  }
};

const paginate = (page = 1, limit = 1000) => {
  const p = Math.max(1, parseInt(page));
  const l = Math.min(1000, Math.max(1, parseInt(limit)));
  const offset = (p - 1) * l;
  return { page: p, limit: l, offset };
};

module.exports = { logActivity, createNotification, paginate };
