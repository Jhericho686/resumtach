const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

router.use(auth);
router.use(authorize('admin', 'staff'));

router.get('/dashboard-stats', analyticsController.getDashboardStats);
router.get('/applicants-per-month', analyticsController.getApplicantsPerMonth);
router.get('/score-distribution', analyticsController.getScoreDistribution);
router.get('/applicants-per-job', analyticsController.getApplicantsPerJob);

module.exports = router;
