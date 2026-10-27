require('dotenv').config();
const pool = require('../config/db');

async function initRescoreHistory() {
  console.log('🔄 Checking / Creating resume_score_history table in PostgreSQL...');

  const createTableSql = `
    CREATE TABLE IF NOT EXISTS resume_score_history (
      id SERIAL PRIMARY KEY,
      applicant_id INT NOT NULL REFERENCES applicants(id) ON DELETE CASCADE ON UPDATE CASCADE,
      job_id INT DEFAULT NULL REFERENCES jobs(id) ON DELETE CASCADE ON UPDATE CASCADE,
      overall_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
      skills_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
      experience_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
      education_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
      certification_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
      projects_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
      matched_skills JSONB DEFAULT '[]'::jsonb,
      missing_skills JSONB DEFAULT '[]'::jsonb,
      strengths JSONB DEFAULT '[]'::jsonb,
      weaknesses JSONB DEFAULT '[]'::jsonb,
      confidence_level DECIMAL(5,2) DEFAULT NULL,
      hiring_recommendation VARCHAR(50) DEFAULT 'consider',
      ai_summary TEXT DEFAULT NULL,
      ai_explanation TEXT DEFAULT NULL,
      ai_model VARCHAR(100) DEFAULT NULL,
      scored_by INT DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL,
      trigger_type VARCHAR(50) DEFAULT 'initial',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_score_history_applicant ON resume_score_history(applicant_id);
    CREATE INDEX IF NOT EXISTS idx_score_history_created_at ON resume_score_history(created_at DESC);
  `;

  await pool.query(createTableSql);
  console.log('✅ resume_score_history table created / confirmed.');

  // Backfill current scores into history if history is empty
  const [historyCount] = await pool.query('SELECT COUNT(*)::int as count FROM resume_score_history');
  const count = historyCount[0]?.count || 0;
  console.log(`Current history records: ${count}`);

  if (count === 0) {
    console.log('📦 Backfilling existing resume_scores into resume_score_history as initial baseline...');
    const [existingScores] = await pool.query('SELECT * FROM resume_scores');
    for (const s of existingScores) {
      await pool.query(`
        INSERT INTO resume_score_history (
          applicant_id, job_id, overall_score, skills_score, experience_score,
          education_score, certification_score, projects_score, matched_skills,
          missing_skills, strengths, weaknesses, confidence_level,
          hiring_recommendation, ai_summary, ai_explanation, ai_model,
          trigger_type, created_at
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?::jsonb,
          ?::jsonb, ?::jsonb, ?::jsonb, ?,
          ?, ?, ?, ?,
          'initial', ?
        )
      `, [
        s.applicant_id, s.job_id, s.overall_score, s.skills_score, s.experience_score,
        s.education_score, s.certification_score, s.projects_score,
        typeof s.matched_skills === 'string' ? s.matched_skills : JSON.stringify(s.matched_skills || []),
        typeof s.missing_skills === 'string' ? s.missing_skills : JSON.stringify(s.missing_skills || []),
        typeof s.strengths === 'string' ? s.strengths : JSON.stringify(s.strengths || []),
        typeof s.weaknesses === 'string' ? s.weaknesses : JSON.stringify(s.weaknesses || []),
        s.confidence_level, s.hiring_recommendation, s.ai_summary, s.ai_explanation, s.ai_model,
        s.scored_at || new Date()
      ]);
    }
    console.log(`✅ Backfilled ${existingScores.length} existing scores into resume_score_history.`);
  }

  process.exit(0);
}

initRescoreHistory().catch(err => {
  console.error('❌ Failed to init table:', err);
  process.exit(1);
});
