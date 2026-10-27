const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const supabase = require('../config/supabase');
const { logActivity, paginate } = require('../utils/helpers');

// Get all users
exports.getUsers = async (req, res, next) => {
  try {
    const { search, role, staffOnly, page, limit } = req.query;
    const { page: p, limit: l, offset } = paginate(page, limit);

    let query = 'SELECT id, first_name, last_name, email, role, is_active, last_login, created_at FROM users WHERE 1=1';
    let countQuery = 'SELECT COUNT(*)::int as total FROM users WHERE 1=1';
    const params = [];
    const countParams = [];

    if (search) {
      const s = `%${search}%`;
      const searchClause = ' AND (first_name ILIKE ? OR last_name ILIKE ? OR email ILIKE ?)';
      query += searchClause;
      params.push(s, s, s);
      countQuery += searchClause;
      countParams.push(s, s, s);
    }

    if (role) {
      query += ' AND role = ?';
      params.push(role);
      countQuery += ' AND role = ?';
      countParams.push(role);
    } else if (staffOnly === 'true' || staffOnly === true) {
      query += ' AND role IN (\'staff\', \'admin\')';
      countQuery += ' AND role IN (\'staff\', \'admin\')';
    }

    const [countResult] = await pool.query(countQuery, countParams);
    const total = (countResult && countResult[0]) ? parseInt(countResult[0].total) || 0 : 0;

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(l, offset);

    const [users] = await pool.query(query, params);

    res.json({
      users: users.map(u => ({
        id: u.id,
        firstName: u.first_name,
        lastName: u.last_name,
        email: u.email,
        role: u.role,
        isActive: u.is_active,
        lastLogin: u.last_login,
        createdAt: u.created_at
      })),
      pagination: { page: p, limit: l, total, totalPages: Math.ceil(total / l) }
    });
  } catch (error) {
    next(error);
  }
};

// Get single user
const isUUID = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

exports.getUser = async (req, res, next) => {
  try {
    const isIdUuid = isUUID(req.params.id);
    const queryCol = isIdUuid ? 'supabase_id' : 'id';
    
    let [users] = await pool.query(
      `SELECT id, first_name, last_name, email, role, is_active, last_login, created_at, phone, location, title, summary, skills, supabase_id FROM users WHERE ${queryCol} = ?`,
      [req.params.id]
    );

    // Fallback: check by authenticated user's ID or email if UUID not directly found
    if (users.length === 0 && req.user && (req.user.supabase_id === req.params.id || String(req.user.id) === String(req.params.id))) {
      [users] = await pool.query(
        `SELECT id, first_name, last_name, email, role, is_active, last_login, created_at, phone, location, title, summary, skills, supabase_id FROM users WHERE id = ? OR email = ?`,
        [req.user.id, req.user.email || '']
      );
    }

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }
    const u = users[0];

    let parsedSkills = [];
    if (Array.isArray(u.skills)) {
      parsedSkills = u.skills;
    } else if (typeof u.skills === 'string') {
      try {
        parsedSkills = JSON.parse(u.skills);
      } catch (_) {
        parsedSkills = u.skills ? [u.skills] : [];
      }
    }

    res.json({
      id: u.id,
      firstName: u.first_name,
      lastName: u.last_name,
      email: u.email,
      role: u.role,
      isActive: u.is_active,
      lastLogin: u.last_login,
      createdAt: u.created_at,
      phone: u.phone,
      location: u.location,
      title: u.title,
      summary: u.summary,
      skills: parsedSkills,
      supabaseId: u.supabase_id
    });
  } catch (error) {
    next(error);
  }
};

// Update user
exports.updateUser = async (req, res, next) => {
  try {
    const updates = req.body;
    const isIdUuid = isUUID(req.params.id);
    const queryCol = isIdUuid ? 'supabase_id' : 'id';
    
    let [existingUsers] = await pool.query(`SELECT * FROM users WHERE ${queryCol} = ?`, [req.params.id]);
    
    // If not found by queryCol, fallback to req.user context
    if (existingUsers.length === 0 && req.user) {
      [existingUsers] = await pool.query(
        `SELECT * FROM users WHERE id = ? OR (email = ? AND email != '')`,
        [req.user.id, req.user.email || '']
      );
    }

    // If still not found and is UUID, auto-provision
    if (existingUsers.length === 0 && isIdUuid) {
      const email = updates.email || req.user?.email || `${req.params.id}@supabase.user`;
      const firstName = updates.firstName || req.user?.firstName || 'Applicant';
      const lastName = updates.lastName || req.user?.lastName || '';
      await pool.query(
        'INSERT INTO users (supabase_id, first_name, last_name, email, password, role) VALUES (?, ?, ?, ?, ?, ?)',
        [req.params.id, firstName, lastName, email, 'auth_managed', 'applicant']
      );
      [existingUsers] = await pool.query(`SELECT * FROM users WHERE supabase_id = ?`, [req.params.id]);
    } else if (existingUsers.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }
    
    const existing = existingUsers[0];

    // Check email uniqueness if email is being updated and not current user's email
    if (updates.email && updates.email !== existing.email) {
      const [emailCheck] = await pool.query(`SELECT id FROM users WHERE email = ? AND id != ?`, [updates.email, existing.id]);
      if (emailCheck.length > 0) {
        return res.status(409).json({ message: 'Email already in use.' });
      }
    }

    const firstName = updates.firstName !== undefined ? updates.firstName : existing.first_name;
    const lastName = updates.lastName !== undefined ? updates.lastName : existing.last_name;
    const email = updates.email !== undefined ? updates.email : existing.email;
    const role = (req.user && req.user.role === 'admin' && updates.role !== undefined) ? updates.role : existing.role;
    const isActive = (req.user && req.user.role === 'admin' && updates.isActive !== undefined) ? (updates.isActive ? true : false) : existing.is_active;
    const phone = updates.phone !== undefined ? updates.phone : existing.phone;
    const location = updates.location !== undefined ? updates.location : existing.location;
    const title = updates.title !== undefined ? updates.title : existing.title;
    const summary = updates.summary !== undefined ? updates.summary : existing.summary;

    let skillsJson = '[]';
    const rawSkills = updates.skills !== undefined ? updates.skills : existing.skills;
    if (rawSkills) {
      if (typeof rawSkills === 'string') {
        try {
          JSON.parse(rawSkills);
          skillsJson = rawSkills;
        } catch (_) {
          skillsJson = JSON.stringify([rawSkills]);
        }
      } else {
        skillsJson = JSON.stringify(rawSkills);
      }
    }

    const supabaseId = existing.supabase_id || (isIdUuid ? req.params.id : req.user?.supabase_id) || null;

    await pool.query(
      `UPDATE users SET first_name=?, last_name=?, email=?, role=?, is_active=?, phone=?, location=?, title=?, summary=?, skills=?::jsonb, supabase_id=? WHERE id=?`,
      [firstName, lastName, email, role, isActive, phone, location, title, summary, skillsJson, supabaseId, existing.id]
    );

    if (req.user && req.user.id) {
       await logActivity(req.user.id, 'User Updated', 'user', existing.id, { email: email }, req.ip).catch(() => {});
    }
    res.json({ message: 'User updated successfully' });
  } catch (error) {
    next(error);
  }
};

// Delete user
exports.deleteUser = async (req, res, next) => {
  try {
    if (parseInt(req.params.id) === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete your own account.' });
    }

    const [existing] = await pool.query('SELECT email, supabase_id FROM users WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Delete from Supabase Auth if linked
    if (supabase && existing[0].supabase_id) {
      try {
        await supabase.auth.admin.deleteUser(existing[0].supabase_id);
      } catch (delErr) {
        console.warn('⚠️ Could not delete user from Supabase Auth:', delErr.message);
      }
    }

    // Reassign this user's jobs to the admin doing the deletion (created_by is NOT NULL)
    await pool.query('UPDATE jobs SET created_by = ? WHERE created_by = ?', [req.user.id, req.params.id]);

    // Nullify activity log references where column allows NULL
    await pool.query('UPDATE activity_logs SET user_id = NULL WHERE user_id = ?', [req.params.id]).catch(() => {});

    await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    await logActivity(req.user.id, 'User Deleted', 'user', parseInt(req.params.id), { email: existing[0].email }, req.ip);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Reset user password (admin)
exports.resetUserPassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;

    const [existing] = await pool.query('SELECT id, supabase_id FROM users WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Update in Supabase Auth if linked
    if (supabase && existing[0].supabase_id) {
      try {
        await supabase.auth.admin.updateUserById(existing[0].supabase_id, { password: newPassword });
      } catch (updErr) {
        console.warn('⚠️ Could not update user password in Supabase Auth:', updErr.message);
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.params.id]);
    await logActivity(req.user.id, 'Password Reset', 'user', parseInt(req.params.id), {}, req.ip);

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    next(error);
  }
};
