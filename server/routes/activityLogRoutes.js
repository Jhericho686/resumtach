const express = require('express');
const router = express.Router();
const activityLogController = require('../controllers/activityLogController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

router.use(auth);
router.use(authorize('admin', 'staff'));

router.get('/', activityLogController.getLogs);
router.get('/recent', activityLogController.getRecentActivity);

module.exports = router;
