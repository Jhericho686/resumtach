const pool = require('../config/db');
const { paginate } = require('../utils/helpers');

exports.getLogs = async (req, res, next) => {
  try {
    const { action, entityType, userId, role, search, page, limit } = req.query;
    const { page: p, limit: l, offset } = paginate(page, limit);

    let whereClause = "WHERE (u.role IN ('admin', 'staff') OR al.user_id IS NULL)";
    const params = [];

    if (role) {
      whereClause = 'WHERE u.role = ?';
      params.push(role);
    }
    if (action) {
      whereClause += ' AND al.action = ?';
      params.push(action);
    }
    if (entityType) {
      whereClause += ' AND al.entity_type = ?';
      params.push(entityType);
    }
    if (userId) {
      whereClause += ' AND al.user_id = ?';
      params.push(userId);
    }
    if (search) {
      whereClause += ' AND (u.first_name ILIKE ? OR u.last_name ILIKE ? OR u.role ILIKE ? OR al.action ILIKE ? OR al.details::text ILIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s, s);
    }

    // Dedicated, bulletproof count query
    const countQuery = `
      SELECT COUNT(*)::int as total 
      FROM activity_logs al 
      LEFT JOIN users u ON al.user_id = u.id 
      ${whereClause}
    `;
    const [countResult] = await pool.query(countQuery, params);
    const total = (countResult && countResult[0]) ? (parseInt(countResult[0].total) || 0) : 0;

    // Fetch paginated logs
    const selectQuery = `
      SELECT al.*, u.first_name, u.last_name, u.role
      FROM activity_logs al 
      LEFT JOIN users u ON al.user_id = u.id 
      ${whereClause}
      ORDER BY al.created_at DESC 
      LIMIT ? OFFSET ?
    `;
    const selectParams = [...params, l, offset];
    const [logs] = await pool.query(selectQuery, selectParams);

    res.json({
      logs: (logs || []).map(log => {
        let parsedDetails = log.details;
        if (typeof log.details === 'string') {
          try {
            parsedDetails = JSON.parse(log.details);
          } catch (_) {
            parsedDetails = log.details;
          }
        }
        return {
          id: log.id,
          userId: log.user_id,
          user: log.user_id ? `${log.first_name || ''} ${log.last_name || ''}`.trim() || 'User' : 'System',
          userRole: log.role || (log.user_id ? 'staff' : 'system'),
          action: log.action,
          entityType: log.entity_type,
          entityId: log.entity_id,
          details: parsedDetails,
          ipAddress: log.ip_address,
          createdAt: log.created_at
        };
      }),
      pagination: { page: p, limit: l, total, totalPages: Math.ceil(total / l) }
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    next(error);
  }
};

exports.getRecentActivity = async (req, res, next) => {
  try {
    const [logs] = await pool.query(`
      SELECT al.*, u.first_name, u.last_name, u.avatar, u.role 
      FROM activity_logs al 
      LEFT JOIN users u ON al.user_id = u.id 
      WHERE (u.role IN ('admin', 'staff') OR al.user_id IS NULL)
      ORDER BY al.created_at DESC LIMIT 10
    `);
    
    res.json(logs.map(log => ({
      id: log.id,
      user: log.user_id ? `${log.first_name || ''} ${log.last_name || ''}`.trim() || 'User' : 'System',
      userRole: log.role || (log.user_id ? 'staff' : 'system'),
      avatar: log.avatar,
      action: log.action,
      entityType: log.entity_type,
      entityId: log.entity_id,
      details: typeof log.details === 'string' ? JSON.parse(log.details) : log.details,
      createdAt: log.created_at
    })));
  } catch (error) {
    next(error);
  }
};
