const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const applicantController = require('../controllers/applicantController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(auth);

router.get('/my', applicantController.getMyApplications);
router.get('/', applicantController.getApplicants);
router.post('/', applicantController.createApplicant);
router.get('/:id', applicantController.getApplicant);

router.patch('/:id/status', [
  body('status').isIn(['pending', 'under_review', 'approved', 'rejected']).withMessage('Invalid status'),
  validate
], applicantController.updateStatus);

router.post('/:id/notes', [
  body('note').notEmpty().withMessage('Note content is required'),
  validate
], applicantController.addNote);

router.delete('/:id/notes/:noteId', applicantController.deleteNote);

router.post('/:id/override-score', applicantController.overrideScore);
router.delete('/:id/override-score', applicantController.resetScoreOverride);

module.exports = router;
