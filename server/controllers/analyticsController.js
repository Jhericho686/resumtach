const pool = require('../config/db');

exports.getDashboardStats = async (req, res, next) => {
  try {
    const stats = {
      totalApplicants: 0,
      pendingApplicants: 0,
      underReview: 0,
      approved: 0,
      rejected: 0,
      activeJobs: 0,
      averageAiScore: 0
    };

    // Applicants count by status
    const [applicantRows] = await pool.query('SELECT status, COUNT(*)::int as count FROM applicants GROUP BY status');
    let pendingCount = 0;
    let underReviewCount = 0;
    applicantRows.forEach(row => {
      const count = parseInt(row.count) || 0;
      stats.totalApplicants += count;
      if (row.status === 'pending') pendingCount = count;
      else if (row.status === 'under_review') underReviewCount = count;
      else if (row.status === 'approved') stats.approved = count;
      else if (row.status === 'rejected') stats.rejected = count;
    });
    stats.underReview = underReviewCount;
    stats.pendingApplicants = pendingCount + underReviewCount;

    // Active jobs count
    const [jobsRows] = await pool.query("SELECT COUNT(*)::int as count FROM jobs WHERE status = 'active'");
    if (jobsRows.length > 0) stats.activeJobs = parseInt(jobsRows[0].count) || 0;

    // Average AI score
    const [avgRows] = await pool.query('SELECT AVG(overall_score) as avg_score FROM resume_scores');
    if (avgRows.length > 0 && avgRows[0].avg_score !== null) {
      stats.averageAiScore = parseFloat(avgRows[0].avg_score).toFixed(1);
    }

    res.json(stats);
  } catch (error) {
    next(error);
  }
};


exports.getApplicantsPerMonth = async (req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        TO_CHAR(created_at, 'Mon YYYY') as month,
        COUNT(*) as count
      FROM applicants
      WHERE created_at >= NOW() - INTERVAL '11 months'
      GROUP BY TO_CHAR(created_at, 'Mon YYYY'), EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at)
      ORDER BY EXTRACT(YEAR FROM created_at) ASC, EXTRACT(MONTH FROM created_at) ASC
    `);
    res.json(rows);
  } catch (error) {
    next(error);
  }
};

exports.getScoreDistribution = async (req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT range_label, count FROM (
        SELECT 
          CASE
            WHEN overall_score >= 90 THEN '90-100'
            WHEN overall_score >= 80 THEN '80-89'
            WHEN overall_score >= 70 THEN '70-79'
            WHEN overall_score >= 60 THEN '60-69'
            ELSE 'Below 60'
          END as range_label,
          COUNT(*)::int as count
        FROM resume_scores
        GROUP BY 
          CASE
            WHEN overall_score >= 90 THEN '90-100'
            WHEN overall_score >= 80 THEN '80-89'
            WHEN overall_score >= 70 THEN '70-79'
            WHEN overall_score >= 60 THEN '60-69'
            ELSE 'Below 60'
          END
      ) sub
      ORDER BY 
        CASE range_label
          WHEN '90-100' THEN 1
          WHEN '80-89' THEN 2
          WHEN '70-79' THEN 3
          WHEN '60-69' THEN 4
          ELSE 5
        END
    `);
    res.json(rows);
  } catch (error) {
    next(error);
  }
};

exports.getApplicantsPerJob = async (req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT j.title, COUNT(a.id)::int as count
      FROM jobs j
      LEFT JOIN applicants a ON j.id = a.job_id
      WHERE j.status = 'active'
      GROUP BY j.id, j.title
      ORDER BY count DESC
      LIMIT 10
    `);
    res.json(rows);
  } catch (error) {
    next(error);
  }
};
