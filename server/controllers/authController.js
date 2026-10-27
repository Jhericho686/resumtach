const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const supabase = require('../config/supabase');
const { logActivity } = require('../utils/helpers');

// Login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const [users] = await pool.query('SELECT * FROM users WHERE email = ? AND is_active = true', [email]);
    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Update last login
    await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, firstName: user.first_name, lastName: user.last_name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    await logActivity(user.id, 'User Login', 'user', user.id, { method: 'email' }, req.ip);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      }
    });
  } catch (error) {
    next(error);
  }
};

// Register (Admin only creates users)
const formatName = (str) => {
  if (!str || typeof str !== 'string') return str;
  return str.trim().replace(/(^|[\s'-])(\p{L})/gu, (_, prefix, char) => prefix + char.toUpperCase());
};

exports.register = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, role } = req.body;
    const cleanFirstName = formatName(firstName);
    const cleanLastName = formatName(lastName);

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ message: 'Email already registered in system.' });
    }

    let supabaseId = null;
    if (supabase) {
      try {
        const { data: suData, error: suError } = await supabase.auth.admin.createUser({
          email: email.trim().toLowerCase(),
          password,
          email_confirm: true,
          user_metadata: {
            full_name: `${cleanFirstName} ${cleanLastName}`.trim(),
            role: role || 'staff'
          }
        });

        if (suError) {
          if (suError.message && suError.message.toLowerCase().includes('already registered')) {
            // Retrieve existing Supabase user id and update password & metadata
            const { data: listData } = await supabase.auth.admin.listUsers();
            const existingSuUser = listData?.users?.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
            if (existingSuUser) {
              supabaseId = existingSuUser.id;
              await supabase.auth.admin.updateUserById(supabaseId, {
                password,
                user_metadata: {
                  full_name: `${cleanFirstName} ${cleanLastName}`.trim(),
                  role: role || 'staff'
                }
              });
            }
          } else {
            console.warn('⚠️ Supabase admin createUser notice:', suError.message);
          }
        } else if (suData?.user) {
          supabaseId = suData.user.id;
        }
      } catch (suEx) {
        console.warn('⚠️ Failed to sync with Supabase Auth:', suEx.message);
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const [result] = await pool.query(
      'INSERT INTO users (supabase_id, first_name, last_name, email, password, role, is_active) VALUES (?, ?, ?, ?, ?, ?, true) RETURNING id',
      [supabaseId, cleanFirstName, cleanLastName, email, hashedPassword, role || 'staff']
    );

    await logActivity(req.user?.id, 'User Created', 'user', result.insertId, { email, role: role || 'staff' }, req.ip);

    res.status(201).json({
      message: 'User registered successfully',
      userId: result.insertId
    });
  } catch (error) {
    next(error);
  }
};

// Get current user profile
exports.getProfile = async (req, res, next) => {
  try {
    const [users] = await pool.query(
      'SELECT id, first_name, last_name, email, role, avatar, last_login, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const user = users[0];
    res.json({
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      lastLogin: user.last_login,
      createdAt: user.created_at
    });
  } catch (error) {
    next(error);
  }
};

// Forgot Password
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const [users] = await pool.query('SELECT id FROM users WHERE email = ? AND is_active = true', [email]);
    // Always return success to prevent email enumeration
    if (users.length === 0) {
      return res.json({ message: 'If the email exists, a reset link has been sent.' });
    }

    // Generate reset token
    const resetToken = require('crypto').randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hour

    await pool.query(
      'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
      [resetToken, expires, users[0].id]
    );

    // In production, send email. For demo, return the token.
    res.json({
      message: 'If the email exists, a reset link has been sent.',
      // Demo only - remove in production
      resetToken: process.env.NODE_ENV !== 'production' ? resetToken : undefined
    });
  } catch (error) {
    next(error);
  }
};

// Reset Password
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    const [users] = await pool.query(
      'SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > NOW()',
      [token]
    );

    if (users.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired reset token.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await pool.query(
      'UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
      [hashedPassword, users[0].id]
    );

    res.json({ message: 'Password reset successfully.' });
  } catch (error) {
    next(error);
  }
};

// Change Password
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const [users] = await pool.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
    const isMatch = await bcrypt.compare(currentPassword, users[0].password);

    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id]);

    res.json({ message: 'Password changed successfully.' });
  } catch (error) {
    next(error);
  }
};
