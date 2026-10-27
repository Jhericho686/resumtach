const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const jobController = require('../controllers/jobController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');

// Public routes (anyone can browse and view jobs)
router.get('/', jobController.getJobs);
router.get('/departments', jobController.getDepartments);
router.get('/:id', jobController.getJob);

const jobValidation = [
  body('title').notEmpty().withMessage('Job title is required'),
  body('department').notEmpty().withMessage('Department is required'),
  body('description').notEmpty().withMessage('Description is required'),
  validate
];

// Protected mutation routes (require auth)
router.use(auth);
router.post('/', authorize('admin', 'staff'), jobValidation, jobController.createJob);
router.put('/:id', authorize('admin', 'staff'), jobValidation, jobController.updateJob);
router.delete('/:id', authorize('admin', 'staff'), jobController.deleteJob);
router.patch('/:id/archive', authorize('admin', 'staff'), jobController.archiveJob);

module.exports = router;
