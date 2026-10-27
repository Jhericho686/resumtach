const pool = require('../config/db');
const reportGenerator = require('../services/reportGenerator');

exports.generateReport = async (req, res, next) => {
  try {
    const { type, format, jobId, status, startDate, endDate } = req.body;

    let data;
    let filename = `${type}_report_${new Date().toISOString().split('T')[0]}`;

    if (type === 'applicants') {
      let query = `
        SELECT a.first_name, a.last_name, a.email, a.status, j.title as job_title, 
        rs.overall_score, a.created_at
        FROM applicants a
        LEFT JOIN jobs j ON a.job_id = j.id
        LEFT JOIN resume_scores rs ON a.id = rs.applicant_id
        WHERE 1=1
      `;
      const params = [];

      if (jobId) {
        query += ' AND a.job_id = ?';
        params.push(jobId);
      }
      if (status) {
        query += ' AND a.status = ?';
        params.push(status);
      }
      if (startDate) {
        query += ' AND a.created_at >= ?';
        params.push(startDate);
      }
      if (endDate) {
        query += ' AND a.created_at <= ?';
        params.push(endDate);
      }

      query += ' ORDER BY rs.overall_score DESC, a.created_at DESC';

      const [results] = await pool.query(query, params);
      data = results;
    } else if (type === 'jobs') {
      const [results] = await pool.query(`
        SELECT j.title, j.department, j.status, j.created_at,
        COUNT(a.id) as total_applicants,
        SUM(CASE WHEN a.status = 'approved' THEN 1 ELSE 0 END) as approved_applicants
        FROM jobs j
        LEFT JOIN applicants a ON j.id = a.job_id
        GROUP BY j.id
        ORDER BY j.created_at DESC
      `);
      data = results;
    } else {
      return res.status(400).json({ message: 'Invalid report type' });
    }

    if (format === 'csv') {
      const csv = await reportGenerator.generateCSV(data);
      res.header('Content-Type', 'text/csv');
      res.attachment(`${filename}.csv`);
      return res.send(csv);
    } else if (format === 'excel') {
      const buffer = await reportGenerator.generateExcel(data, type);
      res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.attachment(`${filename}.xlsx`);
      return res.send(buffer);
    } else if (format === 'pdf') {
      res.header('Content-Type', 'application/pdf');
      res.attachment(`${filename}.pdf`);
      reportGenerator.generatePDF(data, type, res);
      return; // Streamed directly to response
    }

    return res.status(400).json({ message: 'Invalid format requested' });
  } catch (error) {
    next(error);
  }
};
