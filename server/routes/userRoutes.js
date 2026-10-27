const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');

// All user management routes require auth
router.use(auth);

const authorizeSelfOrAdmin = (req, res, next) => {
  const isSelf = String(req.user.id) === String(req.params.id) ||
                 (req.user.supabase_id && String(req.user.supabase_id) === String(req.params.id)) ||
                 (req.user.email && req.user.email === req.params.id);
  if (req.user.role === 'admin' || isSelf) {
    return next();
  }
  return res.status(403).json({ message: 'Access denied.' });
};

const authorizeSelfOrStaffOrAdmin = (req, res, next) => {
  const isSelf = String(req.user.id) === String(req.params.id) ||
                 (req.user.supabase_id && String(req.user.supabase_id) === String(req.params.id)) ||
                 (req.user.email && req.user.email === req.params.id);
  if (req.user.role === 'admin' || req.user.role === 'staff' || isSelf) {
    return next();
  }
  return res.status(403).json({ message: 'Access denied.' });
};

router.get('/', authorize('admin'), userController.getUsers);
router.get('/:id', authorizeSelfOrStaffOrAdmin, userController.getUser);

router.put('/:id', [
  authorizeSelfOrAdmin,
  body('firstName').optional(),
  body('lastName').optional(),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('role').optional().isIn(['admin', 'staff', 'applicant']).withMessage('Invalid role'),
  validate
], userController.updateUser);

router.delete('/:id', authorize('admin'), userController.deleteUser);

router.post('/:id/reset-password', [
  authorize('admin'),
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  validate
], userController.resetUserPassword);

module.exports = router;
