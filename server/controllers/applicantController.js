const path = require('path');
const fs = require('fs');
const pool = require('../config/db');
const resumeParser = require('../services/resumeParser');
const aiEngine = require('../services/aiEngine');
const { logActivity, createNotification, paginate } = require('../utils/helpers');

// Get all applicants with filters
exports.getApplicants = async (req, res, next) => {
  try {
    const { status, jobId, search, minScore, maxScore, sortBy, sortOrder, page, limit } = req.query;
    const { page: p, limit: l, offset } = paginate(page, limit);

    let query = `
      SELECT a.*, j.title as job_title, j.department,
      rs.overall_score, rs.skills_score, rs.experience_score, 
      rs.education_score, rs.certification_score, rs.hiring_recommendation,
      rs.is_overridden, rs.manual_score, rs.manual_recommendation
      FROM applicants a 
      LEFT JOIN jobs j ON a.job_id = j.id 
      LEFT JOIN resume_scores rs ON a.id = rs.applicant_id
      WHERE 1=1`;
    const params = [];

    if (status) {
      if (status === 'pending' || status === 'under_review') {
        query += " AND a.status IN ('pending', 'under_review')";
      } else {
        query += ' AND a.status = ?';
        params.push(status);
      }
    }
    if (jobId) {
      query += ' AND a.job_id = ?';
      params.push(jobId);
    }
    if (search) {
      query += ' AND (a.first_name ILIKE ? OR a.last_name ILIKE ? OR a.email ILIKE ? OR j.title ILIKE ? OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(a.skills) as skill WHERE skill ILIKE ?))';
      const s = `%${search}%`;
      params.push(s, s, s, s, `%${search}%`);
    }
    if (minScore) {
      query += ' AND rs.overall_score >= ?';
      params.push(parseFloat(minScore));
    }
    if (maxScore) {
      query += ' AND rs.overall_score <= ?';
      params.push(parseFloat(maxScore));
    }

    // Count total - build a dedicated count query
    let countQuery = `SELECT COUNT(*)::int as total FROM applicants a 
      LEFT JOIN jobs j ON a.job_id = j.id 
      LEFT JOIN resume_scores rs ON a.id = rs.applicant_id
      WHERE 1=1`;
    // Rebuild the WHERE conditions
    const countParams = [];
    if (status) {
      if (status === 'pending' || status === 'under_review') {
        countQuery += " AND a.status IN ('pending', 'under_review')";
      } else {
        countQuery += ' AND a.status = ?';
        countParams.push(status);
      }
    }
    if (jobId) { countQuery += ' AND a.job_id = ?'; countParams.push(jobId); }
    if (search) {
      countQuery += ' AND (a.first_name ILIKE ? OR a.last_name ILIKE ? OR a.email ILIKE ? OR j.title ILIKE ? OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(a.skills) as skill WHERE skill ILIKE ?))';
      const s = `%${search}%`;
      countParams.push(s, s, s, s, `%${search}%`);
    }
    if (minScore) { countQuery += ' AND rs.overall_score >= ?'; countParams.push(parseFloat(minScore)); }
    if (maxScore) { countQuery += ' AND rs.overall_score <= ?'; countParams.push(parseFloat(maxScore)); }
    
    const [countResult] = await pool.query(countQuery, countParams);
    const total = (countResult && countResult[0]) ? parseInt(countResult[0].total) || 0 : 0;

    // Sorting
    const validSortColumns = {
      score: 'rs.overall_score',
      name: 'a.first_name',
      date: 'a.created_at',
      status: 'a.status'
    };
    const sortCol = validSortColumns[sortBy] || 'a.created_at';
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sortCol} ${order} LIMIT ? OFFSET ?`;
    params.push(l, offset);

    const [applicants] = await pool.query(query, params);

    res.json({
      applicants: applicants.map(a => ({
        id: a.id,
        firstName: a.first_name,
        lastName: a.last_name,
        email: a.email,
        phone: a.phone,
        jobId: a.job_id,
        jobTitle: a.job_title,
        department: a.department,
        status: a.status,
        overallScore: a.is_overridden && a.manual_score != null ? parseFloat(a.manual_score) : a.overall_score,
        isOverridden: Boolean(a.is_overridden),
        manualScore: a.manual_score != null ? parseFloat(a.manual_score) : null,
        skillsScore: a.skills_score,
        experienceScore: a.experience_score,
        educationScore: a.education_score,
        certificationScore: a.certification_score,
        hiringRecommendation: a.is_overridden && a.manual_recommendation ? a.manual_recommendation : a.hiring_recommendation,
        resumeFile: a.resume_file,
        createdAt: a.created_at
      })),
      pagination: { page: p, limit: l, total, totalPages: Math.ceil(total / l) }
    });
  } catch (error) {
    next(error);
  }
};

// Get applications for the logged-in applicant
exports.getMyApplications = async (req, res, next) => {
  try {
    const [applications] = await pool.query(
      `SELECT a.*, j.title as job_title, j.department, j.location,
              rs.overall_score, rs.hiring_recommendation
       FROM applicants a
       LEFT JOIN jobs j ON a.job_id = j.id
       LEFT JOIN resume_scores rs ON a.id = rs.applicant_id
       WHERE a.uploaded_by = ? OR (a.email IS NOT NULL AND a.email != '' AND a.email = ?)
       ORDER BY a.created_at DESC`,
      [req.user.id, req.user.email || '']
    );

    res.json({
      applications: applications.map(a => ({
        id: a.id,
        jobId: a.job_id,
        jobTitle: a.job_title || 'Position',
        department: a.department,
        company: a.department || 'ResuMatch Enterprise',
        location: a.location,
        status: a.status,
        overallScore: a.overall_score,
        hiringRecommendation: a.hiring_recommendation,
        resumeName: a.resume_file ? a.resume_file.split('/').pop().split('\\').pop() : 'resume.pdf',
        resumeFile: a.resume_file,
        createdAt: a.created_at
      }))
    });
  } catch (error) {
    next(error);
  }
};

// Create a new applicant (Applicant Portal)
exports.createApplicant = async (req, res, next) => {
  try {
    let { 
      jobId, firstName, lastName, email, phone, 
      address, resumeFile, skills 
    } = req.body;

    // Synchronize with applicant's saved profile in users table
    if (req.user && req.user.id) {
      const [dbUsers] = await pool.query(
        'SELECT first_name, last_name, email, phone, location, skills FROM users WHERE id = ?',
        [req.user.id]
      );
      if (dbUsers.length > 0) {
        const u = dbUsers[0];
        firstName = firstName || u.first_name;
        lastName = lastName || u.last_name;
        email = email || u.email || req.user.email;
        phone = phone || u.phone;
        address = address || u.location;
        if (!skills && u.skills) {
          skills = u.skills;
        }
      } else if (req.user.email) {
        email = email || req.user.email;
      }
    } else if (req.user && req.user.email) {
      email = email || req.user.email;
    }

    // If still no resumeFile, check resumes table
    if (!resumeFile && req.user && req.user.id) {
      const [dbResumes] = await pool.query(
        'SELECT file_path, storage_url FROM resumes WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
        [req.user.id]
      );
      if (dbResumes.length > 0) {
        resumeFile = dbResumes[0].storage_url || dbResumes[0].file_path;
      }
    }

    if (!jobId) {
      return res.status(400).json({ message: 'Job ID is required.' });
    }
    if (!resumeFile) {
      return res.status(400).json({ message: 'A resume is required to apply.' });
    }

    // Format resumeFile path consistently
    let cleanResumeFile = resumeFile;
    if (!cleanResumeFile.startsWith('http') && !cleanResumeFile.startsWith('uploads/')) {
      cleanResumeFile = `uploads/${cleanResumeFile}`;
    }

    let skillsJson = '[]';
    if (skills) {
      skillsJson = typeof skills === 'string' ? skills : JSON.stringify(skills);
    }

    const [result] = await pool.query(
      `INSERT INTO applicants (
        job_id, first_name, last_name, email, phone, address, 
        resume_file, skills, status, uploaded_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?::jsonb, 'pending', ?) RETURNING id`,
      [
        jobId, firstName || null, lastName || null, email || null, phone || null, address || null,
        cleanResumeFile, skillsJson, req.user ? req.user.id : null
      ]
    );

    const newId = result.insertId || (result.rows && result.rows[0] ? result.rows[0].id : null);

    // Automatically trigger AI scoring on backend immediately in background
    if (newId && cleanResumeFile) {
      (async () => {
        try {
          const filePath = path.isAbsolute(cleanResumeFile) 
            ? cleanResumeFile 
            : path.join(__dirname, '..', cleanResumeFile);
          if (fs.existsSync(filePath)) {
            const [jobs] = await pool.query('SELECT * FROM jobs WHERE id = ?', [jobId]);
            if (jobs.length > 0) {
              const resumeText = await resumeParser.extractText(filePath);
              const resumeData = resumeParser.extractStructuredData(resumeText);
              const scoreData = await aiEngine.scoreResume(resumeText, resumeData, jobs[0]);
              await aiEngine.saveScore(newId, jobId, scoreData);
              console.log(`✅ Auto-scored new applicant #${newId}`);
            }
          }
        } catch (err) {
          console.error(`Auto-score on creation error for applicant #${newId}:`, err.message);
        }
      })();
    }

    res.status(201).json({ 
      message: 'Application submitted successfully',
      id: newId
    });
  } catch (error) {
    next(error);
  }
};

// Get single applicant with full details
exports.getApplicant = async (req, res, next) => {
  try {
    const [applicants] = await pool.query(
      `SELECT a.*, j.title as job_title, j.department, j.required_skills as job_required_skills,
       j.preferred_skills as job_preferred_skills
       FROM applicants a 
       LEFT JOIN jobs j ON a.job_id = j.id 
       WHERE a.id = ?`,
      [req.params.id]
    );

    if (applicants.length === 0) {
      return res.status(404).json({ message: 'Applicant not found.' });
    }

    const applicant = applicants[0];

    // Get AI scores
    let [scores] = await pool.query('SELECT * FROM resume_scores WHERE applicant_id = ?', [req.params.id]);

    // If applicant has no score yet, auto-score on the fly so they are never NOT SCORED
    if (scores.length === 0 && applicant.resume_file) {
      try {
        const filePath = path.isAbsolute(applicant.resume_file) 
          ? applicant.resume_file 
          : path.join(__dirname, '..', applicant.resume_file);
        if (fs.existsSync(filePath)) {
          console.log(`🤖 Auto-scoring applicant #${applicant.id} on demand...`);
          const resumeText = applicant.resume_text || await resumeParser.extractText(filePath);
          const resumeData = resumeParser.extractStructuredData(resumeText);
          const [jobs] = await pool.query('SELECT * FROM jobs WHERE id = ?', [applicant.job_id]);
          const jobObj = jobs.length > 0 ? jobs[0] : {
            title: applicant.job_title || 'Position',
            description: applicant.department || applicant.job_title || '',
            required_skills: applicant.job_required_skills,
            preferred_skills: applicant.job_preferred_skills
          };
          const scoreData = await aiEngine.scoreResume(resumeText, resumeData, jobObj);
          await aiEngine.saveScore(applicant.id, applicant.job_id, scoreData);
          [scores] = await pool.query('SELECT * FROM resume_scores WHERE applicant_id = ?', [req.params.id]);
        }
      } catch (scoreErr) {
        console.error(`Auto-scoring on getApplicant #${applicant.id} failed:`, scoreErr.message);
      }
    }

    // Get HR notes
    const [notes] = await pool.query(
      `SELECT n.*, u.first_name, u.last_name FROM hr_notes n 
       LEFT JOIN users u ON n.user_id = u.id 
       WHERE n.applicant_id = ? ORDER BY n.created_at DESC`,
      [req.params.id]
    );

    const parseJSON = (val) => {
      if (!val) return null;
      if (typeof val === 'string') {
        try { return JSON.parse(val); } catch { return val; }
      }
      return val;
    };

    // Get Rescore History
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

    const rescoreHistory = historyRows.map(h => {
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
        matchedSkills: parseJSON(h.matched_skills) || [],
        missingSkills: parseJSON(h.missing_skills) || [],
        strengths: parseJSON(h.strengths) || [],
        weaknesses: parseJSON(h.weaknesses) || [],
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

    res.json({
      id: applicant.id,
      firstName: applicant.first_name,
      lastName: applicant.last_name,
      email: applicant.email,
      phone: applicant.phone,
      address: applicant.address,
      education: parseJSON(applicant.education),
      skills: parseJSON(applicant.skills),
      certifications: parseJSON(applicant.certifications),
      experience: parseJSON(applicant.experience),
      projects: parseJSON(applicant.projects),
      programmingLanguages: parseJSON(applicant.programming_languages),
      softwareTools: parseJSON(applicant.software_tools),
      resumeFile: applicant.resume_file,
      resumeUrl: applicant.resume_file,
      storageUrl: applicant.resume_file,
      fileUrl: applicant.resume_file,
      resume_file: applicant.resume_file,
      resumeText: applicant.resume_text,
      status: applicant.status,
      jobId: applicant.job_id,
      jobTitle: applicant.job_title,
      department: applicant.department,
      jobRequiredSkills: parseJSON(applicant.job_required_skills),
      jobPreferredSkills: parseJSON(applicant.job_preferred_skills),
      createdAt: applicant.created_at,
      score: scores.length > 0 ? {
        overallScore: scores[0].is_overridden && scores[0].manual_score != null ? parseFloat(scores[0].manual_score) : scores[0].overall_score,
        aiScore: scores[0].overall_score,
        manualScore: scores[0].manual_score != null ? parseFloat(scores[0].manual_score) : null,
        isOverridden: Boolean(scores[0].is_overridden),
        overrideReason: scores[0].override_reason,
        overriddenBy: scores[0].overridden_by,
        overriddenAt: scores[0].overridden_at,
        hiringRecommendation: scores[0].is_overridden && scores[0].manual_recommendation ? scores[0].manual_recommendation : scores[0].hiring_recommendation,
        aiRecommendation: scores[0].hiring_recommendation,
        skillsScore: scores[0].skills_score,
        experienceScore: scores[0].experience_score,
        educationScore: scores[0].education_score,
        certificationScore: scores[0].certification_score,
        projectsScore: scores[0].projects_score,
        matchedSkills: parseJSON(scores[0].matched_skills),
        missingSkills: parseJSON(scores[0].missing_skills),
        strengths: parseJSON(scores[0].strengths),
        weaknesses: parseJSON(scores[0].weaknesses),
        confidenceLevel: scores[0].confidence_level,
        aiSummary: scores[0].ai_summary,
        aiExplanation: scores[0].ai_explanation,
        aiModel: scores[0].ai_model,
        scoredAt: scores[0].scored_at
      } : null,
      rescoreHistory,
      notes: notes.map(n => ({
        id: n.id,
        note: n.note,
        createdBy: `${n.first_name} ${n.last_name}`,
        userId: n.user_id,
        createdAt: n.created_at
      }))
    });
  } catch (error) {
    next(error);
  }
};

// Update applicant status
exports.updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'under_review', 'approved', 'rejected'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status.' });
    }

    const [applicants] = await pool.query(
      'SELECT a.first_name, a.last_name, j.title FROM applicants a LEFT JOIN jobs j ON a.job_id = j.id WHERE a.id = ?',
      [req.params.id]
    );

    if (applicants.length === 0) {
      return res.status(404).json({ message: 'Applicant not found.' });
    }

    await pool.query('UPDATE applicants SET status = ? WHERE id = ?', [status, req.params.id]);

    const name = `${applicants[0].first_name} ${applicants[0].last_name}`;
    const actionMap = {
      'approved': 'Applicant Approved',
      'rejected': 'Applicant Rejected',
      'under_review': 'Applicant Under Review',
      'pending': 'Applicant Status Reset'
    };

    await logActivity(req.user.id, actionMap[status], 'applicant', parseInt(req.params.id), { name }, req.ip);
    await createNotification(
      null,
      actionMap[status],
      `${name} — ${applicants[0].title || 'Job Application'}`,
      status === 'approved' ? 'success' : status === 'rejected' ? 'warning' : 'info',
      `/admin/applicants/${req.params.id}`
    );

    res.json({ message: `Applicant status updated to ${status}` });
  } catch (error) {
    next(error);
  }
};


// Add HR note
exports.addNote = async (req, res, next) => {
  try {
    const { note } = req.body;

    const [applicants] = await pool.query('SELECT id FROM applicants WHERE id = ?', [req.params.id]);
    if (applicants.length === 0) {
      return res.status(404).json({ message: 'Applicant not found.' });
    }

    const [result] = await pool.query(
      'INSERT INTO hr_notes (applicant_id, user_id, note) VALUES (?, ?, ?) RETURNING id',
      [req.params.id, req.user.id, note]
    );

    res.status(201).json({
      message: 'Note added successfully',
      note: {
        id: result.insertId,
        note,
        createdBy: `${req.user.firstName} ${req.user.lastName}`,
        userId: req.user.id,
        createdAt: new Date()
      }
    });
  } catch (error) {
    next(error);
  }
};

// Delete HR note
exports.deleteNote = async (req, res, next) => {
  try {
    const { noteId } = req.params;
    const [notes] = await pool.query('SELECT user_id FROM hr_notes WHERE id = ?', [noteId]);
    
    if (notes.length === 0) {
      return res.status(404).json({ message: 'Note not found.' });
    }

    // Only author or admin can delete
    if (notes[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this note.' });
    }

    await pool.query('DELETE FROM hr_notes WHERE id = ?', [noteId]);
    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Override applicant score manually
exports.overrideScore = async (req, res, next) => {
  try {
    const { manualScore, manualRecommendation, reason } = req.body;
    const applicantId = req.params.id;

    if (manualScore == null || isNaN(manualScore) || manualScore < 0 || manualScore > 100) {
      return res.status(400).json({ message: 'Manual score must be a number between 0 and 100.' });
    }

    const [applicants] = await pool.query('SELECT id, job_id, first_name, last_name FROM applicants WHERE id = ?', [applicantId]);
    if (applicants.length === 0) {
      return res.status(404).json({ message: 'Applicant not found.' });
    }

    const userName = req.user ? `${req.user.firstName || req.user.first_name || 'HR'} ${req.user.lastName || req.user.last_name || 'Admin'}`.trim() : 'HR Admin';

    // Check if score record exists
    const [scores] = await pool.query('SELECT id, overall_score FROM resume_scores WHERE applicant_id = ?', [applicantId]);

    if (scores.length > 0) {
      await pool.query(`
        UPDATE resume_scores SET 
          manual_score = ?,
          manual_recommendation = ?,
          override_reason = ?,
          is_overridden = TRUE,
          overridden_by = ?,
          overridden_at = CURRENT_TIMESTAMP
        WHERE applicant_id = ?
      `, [manualScore, manualRecommendation || null, reason || '', userName, applicantId]);
    } else {
      await pool.query(`
        INSERT INTO resume_scores (
          applicant_id, job_id, overall_score, manual_score, manual_recommendation,
          override_reason, is_overridden, overridden_by, overridden_at, ai_model
        ) VALUES (?, ?, ?, ?, ?, ?, TRUE, ?, CURRENT_TIMESTAMP, 'Manual Override')
      `, [applicantId, applicants[0].job_id, manualScore, manualScore, manualRecommendation || null, reason || '', userName]);
    }

    // Automatically add note to hr_notes for audit trail
    if (reason) {
      try {
        const parsedUserId = parseInt(req.user?.id, 10);
        await pool.query(
          'INSERT INTO hr_notes (applicant_id, user_id, note) VALUES (?, ?, ?)',
          [applicantId, !isNaN(parsedUserId) ? parsedUserId : null, `[Manual Rating Override]: Set score to ${manualScore}% (${manualRecommendation || 'custom'}). Reason: ${reason}`]
        );
      } catch (noteErr) {
        console.warn('Failed to insert audit note for override:', noteErr.message);
      }
    }

    res.json({
      message: 'Applicant score manually overridden successfully',
      manualScore,
      manualRecommendation,
      isOverridden: true
    });
  } catch (error) {
    next(error);
  }
};

// Reset manual override back to AI score
exports.resetScoreOverride = async (req, res, next) => {
  try {
    const applicantId = req.params.id;
    await pool.query(`
      UPDATE resume_scores SET 
        is_overridden = FALSE,
        manual_score = NULL,
        manual_recommendation = NULL,
        override_reason = NULL,
        overridden_by = NULL,
        overridden_at = NULL
      WHERE applicant_id = ?
    `, [applicantId]);

    res.json({ message: 'Manual override removed. Reverted to AI score.' });
  } catch (error) {
    next(error);
  }
};
