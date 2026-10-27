const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const reportController = require('../controllers/reportController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');

router.use(auth);
router.use(authorize('admin', 'staff'));

router.post('/generate', [
  body('type').isIn(['applicants', 'jobs']).withMessage('Invalid report type'),
  body('format').isIn(['pdf', 'excel', 'csv']).withMessage('Invalid report format'),
  validate
], reportController.generateReport);

module.exports = router;
