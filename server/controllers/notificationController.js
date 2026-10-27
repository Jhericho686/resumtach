const pool = require('../config/db');

exports.getNotifications = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM notifications 
       WHERE user_id = ? OR user_id IS NULL 
       ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json(rows || []);
  } catch (error) {
    next(error);
  }
};

exports.getUnreadCount = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT COUNT(*)::int as count FROM notifications WHERE (user_id = ? OR user_id IS NULL) AND is_read = false',
      [req.user.id]
    );
    res.json({ count: rows && rows[0] ? parseInt(rows[0].count, 10) : 0 });
  } catch (error) {
    next(error);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = true WHERE id = ? AND (user_id = ? OR user_id IS NULL)',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    next(error);
  }
};

exports.markAllAsRead = async (req, res, next) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = true WHERE (user_id = ? OR user_id IS NULL) AND is_read = false',
      [req.user.id]
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};

// Internal helper — called by other controllers to create notifications
exports.createNotification = async ({ userId, title, message, type = 'info', link = null }) => {
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type, link) VALUES ($1, $2, $3, $4, $5)`,
      [userId || null, title, message, type, link]
    );
  } catch (err) {
    console.error('Failed to create notification:', err.message);
  }
};
