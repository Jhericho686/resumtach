const express = require('express');
const router = express.Router();
const resumeController = require('../controllers/resumeController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const upload = require('../config/multer');

router.use(auth);

// Handle file upload manually to catch multer errors
router.post('/upload', (req, res, next) => {
  upload.single('resume')(req, res, (err) => {
    if (err) return next(err);
    next();
  });
}, resumeController.uploadResume);

router.get('/my', resumeController.getMyResume);
router.post('/', resumeController.saveResume);

// In-browser DOCX editor routes
router.get('/edit-html', resumeController.getEditableHtml);
router.post('/save-edited', resumeController.saveEditedResume);
router.get('/file', resumeController.streamResumeFile);  // streams the raw file for blob embedding

router.post('/:id/rescore', authorize('admin', 'staff'), resumeController.rescoreApplicant);
router.get('/:id/rescore-history', resumeController.getRescoreHistory);
router.get('/:id/download', resumeController.downloadResume);

// AI Configuration routes
router.get('/config', authorize('admin', 'staff'), resumeController.getAIConfig);
router.post('/config', authorize('admin', 'staff'), resumeController.updateAIConfig);

// Score a resume from Firebase Storage URL (for applicant portal submissions)
router.post('/score-url', resumeController.scoreFromUrl);

module.exports = router;
