const path = require('path');
const fs = require('fs');
const os = require('os');
const pool = require('../config/db');
const mammoth = require('mammoth');
const resumeParser = require('../services/resumeParser');
const aiEngine = require('../services/aiEngine');
const { logActivity, createNotification } = require('../utils/helpers');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/supabase');

// Security: Whitelist allowed file extensions and prevent path traversal / sensitive file disclosure
const ALLOWED_RESUME_EXTENSIONS = ['.pdf', '.docx', '.doc'];

const sanitizeResumePath = (inputPath) => {
  if (!inputPath || typeof inputPath !== 'string') return null;

  // Remote URLs (e.g. Supabase storage public URLs)
  if (inputPath.startsWith('http://') || inputPath.startsWith('https://')) {
    return { isRemote: true, url: inputPath };
  }

  // Strip path traversal sequences and grab just the filename
  const baseName = path.basename(inputPath.replace(/\\/g, '/'));
  const ext = path.extname(baseName).toLowerCase();

  // Strictly reject sensitive file types (.env, .json, .js, .sql, .key, etc.)
  if (!ALLOWED_RESUME_EXTENSIONS.includes(ext)) {
    return null;
  }

  const uploadsDir = path.resolve(__dirname, '..', 'uploads');
  const resolvedPath = path.resolve(uploadsDir, baseName);

  // Guarantee the path cannot escape the uploads directory
  if (!resolvedPath.startsWith(uploadsDir)) {
    return null;
  }

  return { isRemote: false, absPath: resolvedPath, baseName, ext };
};

// Upload and process resume
exports.uploadResume = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    const { jobId } = req.body;
    if (!jobId) {
      return res.status(400).json({ message: 'Job ID is required.' });
    }

    // Verify job exists if it's not a profile upload
    let job = null;
    if (jobId !== 'profile') {
      const [jobs] = await pool.query("SELECT * FROM jobs WHERE id = ? AND status = 'active'", [jobId]);
      if (jobs.length === 0) {
        return res.status(404).json({ message: 'Job not found or not active.' });
      }
      job = jobs[0];
    }

    // Parse resume text using memory buffer via temp file
    const ext = path.extname(req.file.originalname).toLowerCase() || '.pdf';
    const tempFilePath = path.join(os.tmpdir(), `${uuidv4()}${ext}`);
    fs.writeFileSync(tempFilePath, req.file.buffer);
    
    console.log("Starting text extraction...");
    const resumeText = await resumeParser.extractText(tempFilePath);
    console.log("Text extraction done, extracting structured data...");
    const resumeData = resumeParser.extractStructuredData(resumeText);
    console.log("Structured data extracted.");
    
    try { fs.unlinkSync(tempFilePath); } catch(e) {}

    // Upload to Supabase Storage
    const fileName = `${uuidv4()}${ext}`;
    console.log("Uploading to Supabase...");
    
    // Quick fix: convert buffer to Uint8Array for Supabase Node fetch compatibility
    const fileData = new Uint8Array(req.file.buffer);
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('resumes')
      .upload(fileName, fileData, {
        contentType: req.file.mimetype,
        upsert: false
      });
      
    console.log("Supabase upload result:", { uploadData, uploadError });
    
    if (uploadError) {
      throw new Error(`Cloud storage upload failed: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabase.storage
      .from('resumes')
      .getPublicUrl(fileName);
      
    const finalFileUrl = publicUrlData.publicUrl;

    // If this is a profile upload, update the user profile instead of creating an applicant
    if (jobId === 'profile') {
      const isIdUuid = isNaN(req.user.id) && String(req.user.id).includes('-');
      const queryCol = isIdUuid ? 'supabase_id' : 'id';
      
      let internalUserId = req.user.id;
      if (isIdUuid) {
        const [users] = await pool.query(
          'SELECT id FROM users WHERE supabase_id = ? OR (email = ? AND email != \'\')', 
          [req.user.id, req.user.email || '']
        );
        if (users.length > 0) {
          internalUserId = users[0].id;
        }
      }

      // Fallback: If internalUserId is still non-numeric, attempt lookup by user email
      if (isNaN(internalUserId) && req.user.email) {
        const [u] = await pool.query('SELECT id FROM users WHERE email = ?', [req.user.email]);
        if (u.length > 0) {
          internalUserId = u[0].id;
        }
      }

      // Create resumes entry
      if (!isNaN(internalUserId)) {
        await pool.query(
          'INSERT INTO resumes (user_id, file_name, file_path) VALUES (?, ?, ?)',
          [internalUserId, req.file.originalname, finalFileUrl]
        );
      }
      
      try {
        await pool.query(
          `UPDATE users SET skills = ?::jsonb, location = ?, summary = ? WHERE ${queryCol} = ?`,
          [
            JSON.stringify(resumeData.skills || []),
            resumeData.address || '',
            resumeData.summary || '',
            req.user.id
          ]
        );
      } catch (updErr) {
        console.warn('Could not update users profile metadata:', updErr.message);
      }
      
      return res.status(201).json({
        message: 'Resume uploaded to profile successfully',
        applicant: {
          resume_file: finalFileUrl,
          name: resumeData.name,
          skills: resumeData.skills
        }
      });
    }

    // Otherwise, Save applicant to database for the specific job
    const [result] = await pool.query(
      `INSERT INTO applicants (job_id, first_name, last_name, email, phone, address, 
       education, skills, certifications, experience, projects, programming_languages, 
       software_tools, resume_file, resume_text, status, uploaded_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?) RETURNING id`,
      [
        jobId,
        resumeData.name ? resumeData.name.split(' ')[0] : 'Unknown',
        resumeData.name ? resumeData.name.split(' ').slice(1).join(' ') : 'Applicant',
        resumeData.email,
        resumeData.phone,
        resumeData.address,
        JSON.stringify(resumeData.education),
        JSON.stringify(resumeData.skills),
        JSON.stringify(resumeData.certifications),
        JSON.stringify(resumeData.experience),
        JSON.stringify(resumeData.projects),
        JSON.stringify(resumeData.programmingLanguages),
        JSON.stringify(resumeData.softwareTools),
        finalFileUrl,
        resumeText,
        req.user.id
      ]
    );

    const applicantId = result.insertId || result.rows[0].id;

    // AI scoring
    let scoreData;
    try {
      scoreData = await aiEngine.scoreResume(resumeText, resumeData, job);
      await aiEngine.saveScore(applicantId, jobId, scoreData);
    } catch (scoreError) {
      console.error('AI scoring error:', scoreError.message);
      // Continue without scoring - can be re-triggered later
    }

    await logActivity(req.user.id, 'Resume Uploaded', 'applicant', applicantId, {
      name: resumeData.name || 'Unknown',
      job: job.title
    }, req.ip);

    await createNotification(null, 'New Applicant',
      `${resumeData.name || 'New applicant'} applied for ${job.title}`,
      'info', `/admin/applicants/${applicantId}`
    );

    if (scoreData && scoreData.overall_score >= 75) {
      await createNotification(null, 'High Match Score',
        `${resumeData.name || 'Applicant'} scored ${scoreData.overall_score}% for ${job.title}`,
        'success', `/admin/applicants/${applicantId}`
      );
    }

    res.status(201).json({
      message: 'Resume uploaded and processed successfully',
      applicant: {
        id: applicantId,
        name: resumeData.name,
        email: resumeData.email,
        phone: resumeData.phone,
        skills: resumeData.skills,
        score: scoreData ? scoreData.overall_score : null
      }
    });
  } catch (error) {
  }
};

exports.getMyResume = async (req, res, next) => {
  try {
    const isIdUuid = isNaN(req.user.id) && String(req.user.id).includes('-');
    let internalUserId = req.user.id;
    if (isIdUuid) {
      const [users] = await pool.query('SELECT id FROM users WHERE supabase_id = ?', [req.user.id]);
      if (users.length > 0) {
        internalUserId = users[0].id;
      }
    }

    const [resumes] = await pool.query('SELECT * FROM resumes WHERE user_id = ? ORDER BY created_at DESC LIMIT 1', [internalUserId]);
    
    if (resumes.length === 0) {
      return res.status(404).json({ message: 'No resume found.' });
    }
    
    const r = resumes[0];
    const resolvedPath = r.storage_url || r.file_path || '';
    res.json({
      id: r.id,
      userId: r.user_id,
      fileName: r.file_name,
      filePath: r.file_path,
      storageUrl: resolvedPath,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      file_name: r.file_name,
      file_path: r.file_path,
      storage_url: resolvedPath
    });
  } catch (error) {
    next(error);
  }
};

exports.saveResume = async (req, res, next) => {
  try {
    const fileName = req.body.file_name || req.body.fileName || 'resume.pdf';
    const filePath = req.body.file_path || req.body.storagePath || req.body.filePath || 'uploads/resume.pdf';
    const storageUrl = req.body.storage_url || req.body.storageUrl || filePath;
    await pool.query(
      'INSERT INTO resumes (user_id, file_name, file_path, storage_url) VALUES (?, ?, ?, ?)',
      [req.user.id, fileName, filePath, storageUrl]
    );
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// Helper to safely parse array/object JSON fields from PostgreSQL or MySQL
const safeJsonParse = (val, fallback = []) => {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch (e) {
    return fallback;
  }
};

// Re-score an applicant
exports.rescoreApplicant = async (req, res, next) => {
  let tempFilePath = null;
  try {
    const [applicants] = await pool.query(
      `SELECT a.*, a.id as applicant_id, 
              j.title, j.department, j.description, j.required_skills, 
              j.preferred_skills, j.required_education, j.min_experience, 
              j.max_experience, j.employment_type, j.location as job_location 
       FROM applicants a 
       JOIN jobs j ON a.job_id = j.id 
       WHERE a.id = ?`,
      [req.params.id]
    );

    if (applicants.length === 0) {
      return res.status(404).json({ message: 'Applicant not found.' });
    }

    const applicant = applicants[0];
    const applicantId = applicant.applicant_id || applicant.id;
    applicant.id = applicantId;
    
    let resumeFile = applicant.resume_file;
    if (!resumeFile) {
      return res.status(404).json({ message: 'No resume file associated with this applicant.' });
    }

    let localPath = null;

    if (resumeFile.startsWith('http://') || resumeFile.startsWith('https://')) {
      console.log('📥 Downloading resume from URL for rescoring...');
      const response = await fetch(resumeFile, { signal: AbortSignal.timeout(15000) });
      if (!response.ok) {
        throw new Error(`Failed to download resume: HTTP ${response.status}`);
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      const ext = path.extname(resumeFile.split('?')[0]).toLowerCase() || '.pdf';
      tempFilePath = path.join(os.tmpdir(), `rescore_${Date.now()}${ext}`);
      fs.writeFileSync(tempFilePath, buffer);
      localPath = tempFilePath;
    } else {
      localPath = path.isAbsolute(resumeFile) ? resumeFile : path.resolve(__dirname, '..', resumeFile);
      if (!fs.existsSync(localPath)) {
         localPath = path.resolve(__dirname, '..', 'uploads', path.basename(resumeFile));
      }
      // If still not found locally, try downloading from Supabase Storage
      if (!fs.existsSync(localPath)) {
        try {
          const fileName = path.basename(resumeFile);
          console.log(`Searching Supabase Storage for ${fileName}...`);
          const { data: fileData, error: downloadError } = await supabase.storage
            .from('resumes')
            .download(fileName);
          
          if (!downloadError && fileData) {
            const buffer = Buffer.from(await fileData.arrayBuffer());
            const ext = path.extname(fileName).toLowerCase() || '.pdf';
            tempFilePath = path.join(os.tmpdir(), `rescore_${Date.now()}${ext}`);
            fs.writeFileSync(tempFilePath, buffer);
            localPath = tempFilePath;
          }
        } catch (supabaseErr) {
          console.warn('Supabase storage fallback error:', supabaseErr.message);
        }
      }
      if (!fs.existsSync(localPath)) {
        return res.status(404).json({ message: 'Resume file not found on server or storage. Cannot rescore.' });
      }
    }
    
    const resumeText = await resumeParser.extractText(localPath);
    
    if (tempFilePath) {
      try { fs.unlinkSync(tempFilePath); } catch (e) {}
      tempFilePath = null;
    }

    const resumeData = {
      skills: safeJsonParse(applicant.skills),
      experience: safeJsonParse(applicant.experience),
      education: safeJsonParse(applicant.education),
      certifications: safeJsonParse(applicant.certifications),
      projects: safeJsonParse(applicant.projects)
    };

    const scoreData = await aiEngine.scoreResume(resumeText, resumeData, applicant);
    await aiEngine.saveScore(applicantId, applicant.job_id, scoreData, 'rescore', req.user?.id);

    // Fetch updated rescore history
    const [historyRows] = await pool.query(
      `SELECT rsh.*, u.first_name as scorer_first_name, u.last_name as scorer_last_name 
       FROM resume_score_history rsh
       LEFT JOIN users u ON rsh.scored_by = u.id
       WHERE rsh.applicant_id = ?
       ORDER BY rsh.created_at DESC`,
      [applicantId]
    );

    const rescoreHistory = historyRows.map(h => ({
      id: h.id,
      applicantId: h.applicant_id,
      jobId: h.job_id,
      overallScore: parseFloat(h.overall_score),
      skillsScore: parseFloat(h.skills_score),
      experienceScore: parseFloat(h.experience_score),
      educationScore: parseFloat(h.education_score),
      certificationScore: parseFloat(h.certification_score),
      projectsScore: parseFloat(h.projects_score),
      matchedSkills: typeof h.matched_skills === 'string' ? JSON.parse(h.matched_skills || '[]') : (h.matched_skills || []),
      missingSkills: typeof h.missing_skills === 'string' ? JSON.parse(h.missing_skills || '[]') : (h.missing_skills || []),
      strengths: typeof h.strengths === 'string' ? JSON.parse(h.strengths || '[]') : (h.strengths || []),
      weaknesses: typeof h.weaknesses === 'string' ? JSON.parse(h.weaknesses || '[]') : (h.weaknesses || []),
      confidenceLevel: h.confidence_level ? parseFloat(h.confidence_level) : null,
      hiringRecommendation: h.hiring_recommendation,
      aiSummary: h.ai_summary,
      aiExplanation: h.ai_explanation,
      aiModel: h.ai_model,
      triggerType: h.trigger_type,
      scoredBy: h.scored_by,
      scorerName: h.scorer_first_name ? `${h.scorer_first_name} ${h.scorer_last_name || ''}`.trim() : (req.user?.firstName ? `${req.user.firstName} ${req.user.lastName || ''}`.trim() : 'Admin HR'),
      createdAt: h.created_at
    }));

    const formattedScore = {
      overallScore: scoreData.overall_score,
      skillsScore: scoreData.skills_score,
      experienceScore: scoreData.experience_score,
      educationScore: scoreData.education_score,
      certificationScore: scoreData.certification_score,
      projectsScore: scoreData.projects_score,
      matchedSkills: scoreData.matched_skills,
      missingSkills: scoreData.missing_skills,
      strengths: scoreData.strengths,
      weaknesses: scoreData.weaknesses,
      confidenceLevel: scoreData.confidence_level,
      hiringRecommendation: scoreData.hiring_recommendation,
      aiSummary: scoreData.ai_summary,
      aiExplanation: scoreData.ai_explanation,
      aiModel: scoreData.ai_model,
      tailoredQuestions: scoreData.tailored_questions,
      ...scoreData
    };

    if (req.user?.id) {
      await logActivity(
        req.user.id,
        'Applicant Rescored',
        'applicant',
        parseInt(applicantId),
        { name: `${applicant.first_name} ${applicant.last_name}`, score: scoreData.overall_score },
        req.ip
      ).catch(() => {});
    }

    res.json({
      message: 'Applicant re-scored successfully',
      score: formattedScore,
      rescoreHistory
    });
  } catch (error) {
    if (tempFilePath) {
      try { fs.unlinkSync(tempFilePath); } catch (e) {}
    }
    next(error);
  }
};

// Get rescore history for an applicant
exports.getRescoreHistory = async (req, res, next) => {
  try {
    const [historyRows] = await pool.query(
      `SELECT rsh.*, 
              u.first_name as scorer_first_name, u.last_name as scorer_last_name,
              up.first_name as uploader_first_name, up.last_name as uploader_last_name
       FROM resume_score_history rsh
       LEFT JOIN users u ON rsh.scored_by = u.id
       LEFT JOIN applicants a ON rsh.applicant_id = a.id
       LEFT JOIN users up ON a.uploaded_by = up.id
       WHERE rsh.applicant_id = ?
       ORDER BY rsh.created_at DESC`,
      [req.params.id]
    );

    const history = historyRows.map(h => {
      const rawName = h.scorer_first_name 
        ? `${h.scorer_first_name} ${h.scorer_last_name || ''}`.trim()
        : (h.uploader_first_name ? `${h.uploader_first_name} ${h.uploader_last_name || ''}`.trim() : 'Admin HR');

      return {
        id: h.id,
        applicantId: h.applicant_id,
        jobId: h.job_id,
        overallScore: parseFloat(h.overall_score),
        skillsScore: parseFloat(h.skills_score),
        experienceScore: parseFloat(h.experience_score),
        educationScore: parseFloat(h.education_score),
        certificationScore: parseFloat(h.certification_score),
        projectsScore: parseFloat(h.projects_score),
        matchedSkills: typeof h.matched_skills === 'string' ? JSON.parse(h.matched_skills || '[]') : (h.matched_skills || []),
        missingSkills: typeof h.missing_skills === 'string' ? JSON.parse(h.missing_skills || '[]') : (h.missing_skills || []),
        strengths: typeof h.strengths === 'string' ? JSON.parse(h.strengths || '[]') : (h.strengths || []),
        weaknesses: typeof h.weaknesses === 'string' ? JSON.parse(h.weaknesses || '[]') : (h.weaknesses || []),
        confidenceLevel: h.confidence_level ? parseFloat(h.confidence_level) : null,
        hiringRecommendation: h.hiring_recommendation,
        aiSummary: h.ai_summary,
        aiExplanation: h.ai_explanation,
        aiModel: h.ai_model,
        triggerType: h.trigger_type,
        scoredBy: h.scored_by,
        scorerName: rawName || 'Admin HR',
        createdAt: h.created_at
      };
    });

    res.json(history);
  } catch (error) {
    next(error);
  }
};

// Download resume
exports.downloadResume = async (req, res, next) => {
  try {
    const [applicants] = await pool.query('SELECT resume_file, first_name, last_name FROM applicants WHERE id = ?', [req.params.id]);
    
    if (applicants.length === 0) {
      return res.status(404).json({ message: 'Applicant not found.' });
    }

    const applicant = applicants[0];
    if (!applicant.resume_file) {
      return res.status(404).json({ message: 'Resume file not found.' });
    }

    const sanitized = sanitizeResumePath(applicant.resume_file);
    if (!sanitized) {
      return res.status(400).json({ message: 'Invalid or restricted resume file.' });
    }

    if (sanitized.isRemote) {
      return res.redirect(sanitized.url);
    }

    let filePath = sanitized.absPath;
    if (!fs.existsSync(filePath)) {
      const { data } = supabase.storage.from('resumes').getPublicUrl(sanitized.baseName);
      if (data?.publicUrl) {
        return res.redirect(data.publicUrl);
      }
      return res.status(404).json({ message: 'Resume file not found.' });
    }

    const fileName = `${applicant.first_name}_${applicant.last_name}_resume${path.extname(applicant.resume_file)}`;
    res.download(filePath, fileName);
  } catch (error) {
    next(error);
  }
};

// Get AI configuration
exports.getAIConfig = async (req, res, next) => {
  try {
    const config = await aiEngine.getConfig();
    const models = await aiEngine.getAvailableModels();
    res.json({ config, availableModels: models });
  } catch (error) {
    next(error);
  }
};

// Update AI configuration
exports.updateAIConfig = async (req, res, next) => {
  try {
    const { key, value } = req.body;
    await aiEngine.updateConfig(key, value, req.user.id);
    
    if (key === 'ai_model') {
      await aiEngine.setModel(value);
    }

    await logActivity(req.user.id, 'AI Config Updated', 'config', null, { key, value }, req.ip);
    res.json({ message: 'Configuration updated successfully' });
  } catch (error) {
    next(error);
  }
};

// Score a resume from a Firebase Storage URL (for Firestore-based applicants)
exports.scoreFromUrl = async (req, res, next) => {
  let tempFilePath = null;
  try {
    const { resumeUrl, resumeFileName, jobDescription, jobTitle, requiredSkills, preferredSkills, requiredEducation, minExperience, maxExperience, certifications } = req.body;

    if (!resumeUrl) {
      return res.status(400).json({ message: 'resumeUrl is required.' });
    }
    if (!jobDescription && !jobTitle) {
      return res.status(400).json({ message: 'Job description or title is required.' });
    }

    // 1. Obtain resume buffer (handles local uploads and remote HTTP URLs)
    let buffer;
    if (resumeUrl.startsWith('http://') || resumeUrl.startsWith('https://')) {
      console.log('📥 Downloading resume from URL for AI scoring...');
      const response = await fetch(resumeUrl, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) {
        throw new Error(`Failed to download resume: HTTP ${response.status}`);
      }
      buffer = Buffer.from(await response.arrayBuffer());
    } else {
      // Local file path relative to server (e.g. 'uploads/filename.pdf')
      const localPath = path.isAbsolute(resumeUrl) ? resumeUrl : path.resolve(__dirname, '..', resumeUrl);
      if (!fs.existsSync(localPath)) {
        throw new Error(`Resume file not found at: ${resumeUrl}`);
      }
      buffer = fs.readFileSync(localPath);
    }

    const ext = path.extname(resumeFileName || resumeUrl || 'resume.pdf').toLowerCase() || '.pdf';
    tempFilePath = path.join(os.tmpdir(), `resumatch_score_${Date.now()}${ext}`);
    fs.writeFileSync(tempFilePath, buffer);

    // 2. Extract text from the resume
    const resumeText = await resumeParser.extractText(tempFilePath);
    if (!resumeText || resumeText.trim().length < 30) {
      throw new Error('Could not extract meaningful text from the resume.');
    }

    // 3. Build job data object matching what aiEngine.scoreResume expects
    const jobData = {
      description: jobDescription || `${jobTitle} position`,
      title: jobTitle || 'Position',
      required_skills: JSON.stringify(requiredSkills || []),
      preferred_skills: JSON.stringify(preferredSkills || []),
      required_education: requiredEducation || 'Not specified',
      min_experience: minExperience || 0,
      max_experience: maxExperience || null,
      certifications: JSON.stringify(certifications || [])
    };

    // 4. Run AI scoring
    const scoreData = await aiEngine.scoreResume(resumeText, {}, jobData);

    // If applicantId is provided, save score in database
    if (req.body.applicantId) {
      try {
        await aiEngine.saveScore(req.body.applicantId, null, scoreData);
      } catch (saveErr) {
        console.warn('⚠️ Could not save score to applicant:', saveErr.message);
      }
    }

    // 5. Cleanup temp file
    try { fs.unlinkSync(tempFilePath); } catch (e) { /* ignore */ }
    tempFilePath = null;

    // 6. Return scores
    res.json({
      success: true,
      scores: {
        overallScore: scoreData.overall_score,
        skillsScore: scoreData.skills_score,
        experienceScore: scoreData.experience_score,
        educationScore: scoreData.education_score,
        certificationScore: scoreData.certification_score,
        projectsScore: scoreData.projects_score,
        matchedSkills: scoreData.matched_skills || [],
        missingSkills: scoreData.missing_skills || [],
        strengths: scoreData.strengths || [],
        weaknesses: scoreData.weaknesses || [],
        confidenceLevel: scoreData.confidence_level,
        hiringRecommendation: scoreData.hiring_recommendation,
        aiSummary: scoreData.ai_summary,
        aiExplanation: scoreData.ai_explanation,
        aiModel: scoreData.ai_model
      }
    });
  } catch (error) {
    // Cleanup temp file on error
    if (tempFilePath) {
      try { fs.unlinkSync(tempFilePath); } catch (e) { /* ignore */ }
    }
    console.error('❌ scoreFromUrl error:', error.message);
    res.status(500).json({ message: `AI scoring failed: ${error.message}` });
  }
};// ─────────────────────────────────────────────────────────────────────────────
// GET /api/resumes/edit-html  — convert user's resume DOCX → HTML for editing
// ─────────────────────────────────────────────────────────────────────────────
exports.getEditableHtml = async (req, res, next) => {
  try {
    const isUuid = isNaN(req.user.id) && String(req.user.id).includes('-');
    const col = isUuid ? 'supabase_id' : 'id';

    let filePath = null;
    let fileName = 'resume';

    // 1. Check if explicit filePath or url was passed
    if (req.query.filePath || req.query.url) {
      filePath = req.query.filePath || req.query.url;
      if (req.query.fileName) fileName = req.query.fileName;
    }
    // 2. Check if an applicantId was specified (e.g., admin editing a specific applicant's resume)
    else if (req.query.applicantId) {
      const [appRows] = await pool.query('SELECT resume_file, first_name, last_name FROM applicants WHERE id = ?', [req.query.applicantId]);
      if (appRows.length > 0 && appRows[0].resume_file) {
        filePath = appRows[0].resume_file;
        fileName = `${appRows[0].first_name || 'Candidate'}_${appRows[0].last_name || 'Resume'}.docx`;
      }
    }

    // 3. Otherwise find user's latest resume record
    if (!filePath) {
      const [resumes] = await pool.query(
        'SELECT file_path, file_name FROM resumes WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
        [req.user.id]
      );

      if (resumes.length > 0 && resumes[0].file_path) {
        filePath = resumes[0].file_path;
        fileName = resumes[0].file_name || 'resume';
      } else {
        const [users] = await pool.query(`SELECT resume_file, first_name, last_name FROM users WHERE ${col} = ?`, [req.user.id]);
        if (users.length > 0 && users[0].resume_file) {
          filePath = users[0].resume_file;
          fileName = `${users[0].first_name || 'My'}_${users[0].last_name || 'Resume'}`;
        }
      }
    }

    if (!filePath) {
      return res.status(404).json({ message: 'No resume found. Please upload one first.' });
    }

    const sanitized = sanitizeResumePath(filePath);
    if (!sanitized) {
      return res.status(403).json({ message: 'Access denied: invalid or restricted file path.' });
    }

    let absPath = sanitized.absPath;
    let baseName = sanitized.baseName;
    let ext = sanitized.ext;

    // If remote URL (e.g. Supabase storage public URL), download to local uploads cache
    if (sanitized.isRemote) {
      try {
        const urlObj = new URL(sanitized.url);
        baseName = path.basename(urlObj.pathname);
        ext = path.extname(baseName).toLowerCase();
        const uploadsDir = path.resolve(__dirname, '..', 'uploads');
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
        absPath = path.join(uploadsDir, baseName);

        if (!fs.existsSync(absPath)) {
          const resp = await fetch(sanitized.url);
          if (resp.ok) {
            const buf = Buffer.from(await resp.arrayBuffer());
            fs.writeFileSync(absPath, buf);
          }
        }
      } catch (dlErr) {
        console.warn('Could not download remote resume for editing:', dlErr.message);
      }
    }

    // If file missing on local disk, pull from Supabase Storage
    if (!fs.existsSync(absPath) && baseName) {
      try {
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('resumes')
          .download(baseName);
        if (!downloadError && fileData) {
          const uploadsDir = path.resolve(__dirname, '..', 'uploads');
          if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
          absPath = path.join(uploadsDir, baseName);
          const arrayBuffer = await fileData.arrayBuffer();
          fs.writeFileSync(absPath, Buffer.from(arrayBuffer));
        }
      } catch (err) {
        console.warn('Could not fetch resume from Supabase for editing:', err.message);
      }
    }

    if (!fs.existsSync(absPath)) {
      return res.status(404).json({ message: 'Resume file not found on server.' });
    }

    const fileUrl = sanitized.isRemote ? sanitized.url : filePath.replace(/\\/g, '/').replace(/^\//, '');

    let html = '';
    let canEdit = false;
    let convertedFromPdf = false;

    if (ext === '.docx') {
      // Use mammoth to convert DOCX → HTML with rich style mapping
      const result = await mammoth.convertToHtml({ path: absPath }, {
        styleMap: [
          "p[style-name='Heading 1'] => h1",
          "p[style-name='Heading 2'] => h2",
          "p[style-name='Heading 3'] => h3",
          "p[style-name='Title'] => h1",
          "p[style-name='Subtitle'] => h2",
          "b => strong",
          "i => em",
          "u => u",
          "strike => s",
        ]
      });
      html = result.value;
      canEdit = true;
    } else if (ext === '.pdf') {
      try {
        console.log(`📄 Converting PDF resume to editable Word HTML: ${absPath}`);
        const text = await resumeParser.extractText(absPath);
        if (text && text.trim().length > 30) {
          const geminiService = require('../services/geminiService');
          if (await geminiService.isAvailable()) {
            const prompt = `You are an expert resume document converter. Convert the following extracted resume text into clean, high-fidelity semantic HTML suitable for an MS Word-style document editor.

Guidelines:
- Candidate Name in <h1>
- Contact info (email, phone, location, links) in <p> with <strong> labels
- Major section headings (Professional Summary, Experience, Education, Skills, Projects, Certifications) in <h2>
- Job Titles / Roles / Degree names in <h3>
- Responsibilities, key achievements, and bullet points in <ul><li>
- Bold keywords, dates, companies, and locations with <strong>
- Preserve 100% of the candidate's original content, bullet points, and facts
- Return ONLY the clean HTML tags without any markdown fences (do NOT include \`\`\`html or \`\`\`).

Resume text:
${text}
`;
            let rawHtml = await geminiService.generate(prompt);
            rawHtml = rawHtml.replace(/```html/gi, '').replace(/```json/gi, '').replace(/```/g, '').trim();

            // 1. If Gemini returned a JSON object e.g. { "html": "..." }, extract the html value
            try {
              const parsed = JSON.parse(rawHtml);
              if (parsed && typeof parsed === 'object') {
                rawHtml = parsed.html || parsed.resume_html || parsed.content || Object.values(parsed)[0] || rawHtml;
              }
            } catch (jsonErr) {
              // Check if wrapped in partial JSON { "html": "..." }
              const match = rawHtml.match(/["']?html["']?\s*:\s*["']([\s\S]+?)["']\s*\}?$/);
              if (match) {
                rawHtml = match[1];
              }
            }

            // 2. Unescape and strip any literal backslash-n so \n is NEVER rendered in the document
            if (typeof rawHtml === 'string') {
              rawHtml = rawHtml
                .replaceAll(String.fromCharCode(92) + 'n', '')
                .replaceAll(String.fromCharCode(92) + 'r', '')
                .replaceAll(String.fromCharCode(92) + 't', ' ')
                .replaceAll(String.fromCharCode(92) + '"', '"')
                .replace(/<p>\s*<\/p>/gi, '')
                .replace(/<p>\s*<br\s*\/?>\s*<\/p>/gi, '')
                .replace(/^\{\s*["']?html["']?\s*:\s*["']?/, '')
                .replace(/["']?\s*\}$/, '')
                .trim();
            }

            if (rawHtml.length > 50) {
              html = rawHtml;
              canEdit = true;
              convertedFromPdf = true;
            }
          }

          // Rule-based fallback if AI returns empty
          if (!html) {
            const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
            const title = lines[0] || 'Resume';
            const rest = lines.slice(1).map(l => {
              if (l.length < 35 && /^[A-Z\s]{3,}$/.test(l)) {
                return `<h2>${l}</h2>`;
              }
              if (/^[•\-\*]/.test(l)) {
                return `<ul><li>${l.replace(/^[•\-\*]\s*/, '')}</li></ul>`;
              }
              return `<p>${l}</p>`;
            }).join('');
            html = `<h1>${title}</h1>${rest}`;
            canEdit = true;
            convertedFromPdf = true;
          }
        }
      } catch (pdfErr) {
        console.warn('PDF conversion to editable HTML warning:', pdfErr.message);
      }
    }

    res.json({
      html,
      fileName,
      ext,
      canEdit: canEdit || ext === '.docx',
      convertedFromPdf,
      fileUrl
    });
  } catch (error) {
    next(error);
  }
};


// ─────────────────────────────────────────────────────────────────────────────
// POST /api/resumes/save-edited  — save edited HTML back as a new DOCX
// ─────────────────────────────────────────────────────────────────────────────
exports.saveEditedResume = async (req, res, next) => {
  try {
    const { html, applicantId } = req.body;
    if (!html || !html.trim()) {
      return res.status(400).json({ message: 'No content provided.' });
    }

    let HTMLtoDOCX;
    try {
      HTMLtoDOCX = require('html-to-docx');
    } catch (e) {
      return res.status(500).json({ message: 'DOCX conversion module not available.' });
    }

    const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${html}</body></html>`;

    const docxBuffer = await HTMLtoDOCX(fullHtml, null, {
      table: { row: { cantSplit: true } },
      footer: false,
      pageNumber: false,
    });

    const isUuid = isNaN(req.user.id) && String(req.user.id).includes('-');
    const col = isUuid ? 'supabase_id' : 'id';

    const timestamp = Date.now();
    const newFilename = `edited_resume_${req.user.id}_${timestamp}.docx`;
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

    const newFilePath = path.join(uploadsDir, newFilename);
    fs.writeFileSync(newFilePath, docxBuffer);

    const dbPath = `uploads/${newFilename}`;

    // Sync to Supabase Storage if configured
    try {
      await supabase.storage
        .from('resumes')
        .upload(newFilename, new Uint8Array(docxBuffer), {
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          upsert: true
        });
    } catch (sbErr) {
      console.warn('Could not sync edited DOCX to Supabase:', sbErr.message);
    }

    // Upsert into resumes table
    const [existing] = await pool.query(
      'SELECT id FROM resumes WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      [req.user.id]
    );

    if (existing.length > 0) {
      await pool.query(
        'UPDATE resumes SET file_name = ?, file_path = ?, storage_url = ?, updated_at = NOW() WHERE id = ?',
        [`edited_resume_${timestamp}.docx`, dbPath, dbPath, existing[0].id]
      );
    } else {
      await pool.query(
        'INSERT INTO resumes (user_id, file_name, file_path, storage_url) VALUES (?, ?, ?, ?)',
        [req.user.id, `edited_resume_${timestamp}.docx`, dbPath, dbPath]
      );
    }

    // Update applicants table if an applicant record exists for this user or applicantId
    if (applicantId) {
      await pool.query(
        'UPDATE applicants SET resume_file = ? WHERE id = ?',
        [dbPath, applicantId]
      );
    } else {
      try {
        const [appRows] = await pool.query(
          'SELECT id FROM applicants WHERE uploaded_by = ? OR (email IS NOT NULL AND email != \'\' AND email = ?) ORDER BY created_at DESC LIMIT 1',
          [req.user.id, req.user.email || '']
        );
        if (appRows.length > 0) {
          await pool.query('UPDATE applicants SET resume_file = ? WHERE id = ?', [dbPath, appRows[0].id]);
        }
      } catch (appErr) {
        console.warn('Could not update applicant resume_file:', appErr.message);
      }
    }

    res.json({ message: 'Resume saved successfully.', filePath: dbPath, fileName: newFilename });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/resumes/file  — stream raw resume file for same-origin blob URL
// ─────────────────────────────────────────────────────────────────────────────
exports.streamResumeFile = async (req, res, next) => {
  try {
    const isUuid = isNaN(req.user.id) && String(req.user.id).includes('-');
    const col = isUuid ? 'supabase_id' : 'id';
    let filePath = null;
    if (req.query.applicantId) {
      const [appRows] = await pool.query('SELECT resume_file FROM applicants WHERE id = ?', [req.query.applicantId]);
      if (appRows.length > 0 && appRows[0].resume_file) filePath = appRows[0].resume_file;
    } else if (req.query.filePath || req.query.url) {
      filePath = req.query.filePath || req.query.url;
    }

    if (!filePath) {
      const [resumes] = await pool.query(
        'SELECT file_path FROM resumes WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
        [req.user.id]
      );
      if (resumes.length > 0 && resumes[0].file_path) {
        filePath = resumes[0].file_path;
      } else {
        const [users] = await pool.query('SELECT resume_file FROM users WHERE ' + col + ' = ?', [req.user.id]);
        if (users.length > 0 && users[0].resume_file) filePath = users[0].resume_file;
      }
    }
    if (!filePath) return res.status(404).json({ message: 'No resume found.' });

    const sanitized = sanitizeResumePath(filePath);
    if (!sanitized) {
      return res.status(403).json({ message: 'Access denied: invalid or restricted file path.' });
    }

    // Handle remote URL redirection
    if (sanitized.isRemote) {
      return res.redirect(sanitized.url);
    }
    const absPath = sanitized.absPath;
    if (!fs.existsSync(absPath)) return res.status(404).json({ message: 'File not found on server.' });
    const ext = sanitized.ext;
    const MIME = {
      '.pdf':  'application/pdf',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.doc':  'application/msword',
    };
    res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    fs.createReadStream(absPath).pipe(res);
  } catch (error) {
    next(error);
  }
};
