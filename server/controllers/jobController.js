const pool = require('../config/db');
const { logActivity, createNotification, paginate } = require('../utils/helpers');

// Get all jobs
exports.getJobs = async (req, res, next) => {
  try {
    const { status, department, employmentType, type, location, search, page, limit } = req.query;
    const { page: p, limit: l, offset } = paginate(page, limit);
    
    let query = 'SELECT j.*, u.first_name as creator_first_name, u.last_name as creator_last_name, (SELECT COUNT(*) FROM applicants WHERE job_id = j.id) as applicant_count FROM jobs j LEFT JOIN users u ON j.created_by = u.id WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND j.status = ?';
      params.push(status);
    }
    if (department) {
      query += ' AND LOWER(TRIM(j.department)) = LOWER(TRIM(?))';
      params.push(department);
    }
    const empType = employmentType || type;
    if (empType) {
      const normalized = empType.trim().toLowerCase().replace(/[\s_]+/g, '-');
      query += ' AND (REPLACE(LOWER(j.employment_type), \' \', \'-\') = ? OR LOWER(j.employment_type) = ?)';
      params.push(normalized, empType.trim().toLowerCase());
    }
    if (location) {
      query += ' AND j.location ILIKE ?';
      params.push(`%${location}%`);
    }
    if (search) {
      query += ' AND (j.title ILIKE ? OR j.department ILIKE ? OR j.description ILIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    let countQuery = 'SELECT COUNT(*) as total FROM jobs j WHERE 1=1';
    const countParams = [];

    if (status) {
      countQuery += ' AND j.status = ?';
      countParams.push(status);
    }
    if (department) {
      countQuery += ' AND LOWER(TRIM(j.department)) = LOWER(TRIM(?))';
      countParams.push(department);
    }
    if (empType) {
      const normalized = empType.trim().toLowerCase().replace(/[\s_]+/g, '-');
      countQuery += ' AND (REPLACE(LOWER(j.employment_type), \' \', \'-\') = ? OR LOWER(j.employment_type) = ?)';
      countParams.push(normalized, empType.trim().toLowerCase());
    }
    if (location) {
      countQuery += ' AND j.location ILIKE ?';
      countParams.push(`%${location}%`);
    }
    if (search) {
      countQuery += ' AND (j.title ILIKE ? OR j.department ILIKE ? OR j.description ILIKE ?)';
      const s = `%${search}%`;
      countParams.push(s, s, s);
    }

    const [countResult] = await pool.query(countQuery, countParams);
    const total = countResult[0].total;

    query += ' ORDER BY j.created_at DESC LIMIT ? OFFSET ?';
    params.push(l, offset);

    const [jobs] = await pool.query(query, params);

    res.json({
      jobs: jobs.map(job => ({
        ...job,
        employmentType: job.employment_type || job.employmentType,
        salaryMin: job.salary_min || job.salaryMin,
        salaryMax: job.salary_max || job.salaryMax,
        requiredEducation: job.required_education || job.requiredEducation,
        minExperience: job.min_experience ?? job.minExperience,
        maxExperience: job.max_experience ?? job.maxExperience,
        requiredSkills: typeof job.required_skills === 'string' ? JSON.parse(job.required_skills) : job.required_skills,
        preferredSkills: typeof job.preferred_skills === 'string' ? JSON.parse(job.preferred_skills) : job.preferred_skills,
        certifications: typeof job.certifications === 'string' ? JSON.parse(job.certifications) : job.certifications
      })),
      pagination: { page: p, limit: l, total, totalPages: Math.ceil(total / l) }
    });
  } catch (error) {
    next(error);
  }
};

// Get single job
exports.getJob = async (req, res, next) => {
  try {
    const [jobs] = await pool.query(
      `SELECT j.*, u.first_name as creator_first_name, u.last_name as creator_last_name,
       (SELECT COUNT(*) FROM applicants WHERE job_id = j.id) as applicant_count
       FROM jobs j LEFT JOIN users u ON j.created_by = u.id WHERE j.id = ?`,
      [req.params.id]
    );

    if (jobs.length === 0) {
      return res.status(404).json({ message: 'Job not found.' });
    }

    const job = jobs[0];
    res.json({
      ...job,
      createdAt: job.created_at || job.createdAt,
      employmentType: job.employment_type || job.employmentType,
      salaryMin: job.salary_min || job.salaryMin,
      salaryMax: job.salary_max || job.salaryMax,
      requiredEducation: job.required_education || job.requiredEducation,
      minExperience: job.min_experience ?? job.minExperience,
      maxExperience: job.max_experience ?? job.maxExperience,
      requiredSkills: typeof job.required_skills === 'string' ? JSON.parse(job.required_skills) : job.required_skills,
      preferredSkills: typeof job.preferred_skills === 'string' ? JSON.parse(job.preferred_skills) : job.preferred_skills,
      certifications: typeof job.certifications === 'string' ? JSON.parse(job.certifications) : job.certifications
    });
  } catch (error) {
    next(error);
  }
};

// Create job
exports.createJob = async (req, res, next) => {
  try {
    const {
      title, department, description, requiredSkills, preferredSkills,
      requiredEducation, minExperience, maxExperience, certifications,
      employmentType, location, salaryMin, salaryMax
    } = req.body;

    const [result] = await pool.query(
      `INSERT INTO jobs (title, department, description, required_skills, preferred_skills, 
       required_education, min_experience, max_experience, certifications, employment_type, 
       location, salary_min, salary_max, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [
        title, department, description,
        JSON.stringify(requiredSkills || []),
        JSON.stringify(preferredSkills || []),
        requiredEducation, minExperience || 0, maxExperience,
        JSON.stringify(certifications || []),
        employmentType || 'full-time', location,
        salaryMin, salaryMax, req.user.id
      ]
    );

    await logActivity(req.user.id, 'Job Created', 'job', result.insertId, { title }, req.ip);
    await createNotification(null, 'New Job Posted', `New position: ${title} in ${department}`, 'info', `/admin/jobs/${result.insertId}`);

    res.status(201).json({ message: 'Job created successfully', jobId: result.insertId });
  } catch (error) {
    next(error);
  }
};

// Update job
exports.updateJob = async (req, res, next) => {
  try {
    const {
      title, department, description, requiredSkills, preferredSkills,
      requiredEducation, minExperience, maxExperience, certifications,
      employmentType, location, salaryMin, salaryMax, status
    } = req.body;

    const [existing] = await pool.query('SELECT id FROM jobs WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Job not found.' });
    }

    await pool.query(
      `UPDATE jobs SET title=?, department=?, description=?, required_skills=?, preferred_skills=?,
       required_education=?, min_experience=?, max_experience=?, certifications=?, employment_type=?,
       location=?, salary_min=?, salary_max=?, status=? WHERE id=?`,
      [
        title, department, description,
        JSON.stringify(requiredSkills || []),
        JSON.stringify(preferredSkills || []),
        requiredEducation, minExperience || 0, maxExperience,
        JSON.stringify(certifications || []),
        employmentType || 'full-time', location,
        salaryMin, salaryMax, status || 'active',
        req.params.id
      ]
    );

    await logActivity(req.user.id, 'Job Updated', 'job', parseInt(req.params.id), { title }, req.ip);

    res.json({ message: 'Job updated successfully' });
  } catch (error) {
    next(error);
  }
};

// Delete job
exports.deleteJob = async (req, res, next) => {
  try {
    const [existing] = await pool.query('SELECT title FROM jobs WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Job not found.' });
    }

    await pool.query('DELETE FROM jobs WHERE id = ?', [req.params.id]);
    await logActivity(req.user.id, 'Job Deleted', 'job', parseInt(req.params.id), { title: existing[0].title }, req.ip);

    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Archive job
exports.archiveJob = async (req, res, next) => {
  try {
    const [existing] = await pool.query('SELECT title FROM jobs WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Job not found.' });
    }

    await pool.query("UPDATE jobs SET status = 'archived' WHERE id = ?", [req.params.id]);
    await logActivity(req.user.id, 'Job Archived', 'job', parseInt(req.params.id), { title: existing[0].title }, req.ip);

    res.json({ message: 'Job archived successfully' });
  } catch (error) {
    next(error);
  }
};

// Get departments list
exports.getDepartments = async (req, res, next) => {
  try {
    const [departments] = await pool.query(
      "SELECT DISTINCT TRIM(department) as department FROM jobs WHERE status = 'active' AND department IS NOT NULL AND TRIM(department) != '' ORDER BY department ASC"
    );
    res.json(departments.map(d => d.department));
  } catch (error) {
    next(error);
  }
};
