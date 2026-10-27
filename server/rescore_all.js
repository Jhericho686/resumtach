const pool = require('./config/db');
const aiEngine = require('./services/aiEngine');
const resumeParser = require('./services/resumeParser');
const path = require('path');
const fs = require('fs');

async function rescoreMissing() {
  const [applicants] = await pool.query(`
    SELECT a.*, j.title as job_title, j.department, j.required_skills, j.preferred_skills 
    FROM applicants a 
    LEFT JOIN resume_scores rs ON a.id = rs.applicant_id 
    LEFT JOIN jobs j ON a.job_id = j.id
    WHERE rs.id IS NULL OR rs.ai_model = 'Rule-Based Fallback'
  `);
  
  for (const app of applicants) {
    console.log(`Scoring applicant #${app.id} (${app.first_name})...`);
    try {
      let filePath = app.resume_file;
      if (filePath && !filePath.startsWith('http')) {
        filePath = path.resolve(__dirname, filePath);
        if (!fs.existsSync(filePath)) {
          filePath = path.resolve(__dirname, 'uploads', path.basename(filePath));
        }
      }
      
      let resumeText = app.resume_text;
      if (!resumeText && filePath && !filePath.startsWith('http')) {
        if (fs.existsSync(filePath)) {
          resumeText = await resumeParser.extractText(filePath);
        }
      }
      
      if (!resumeText) {
        resumeText = "Candidate did not provide a readable resume or left it blank.";
      }
      
      const resumeData = resumeParser.extractStructuredData(resumeText);
      const jobObj = {
        title: app.job_title,
        description: app.department || app.job_title,
        required_skills: app.required_skills,
        preferred_skills: app.preferred_skills
      };
      
      const score = await aiEngine.scoreResume(resumeText, resumeData, jobObj);
      await aiEngine.saveScore(app.id, app.job_id, score);
      console.log(`✅ Successfully scored #${app.id} (Score: ${score.overall_score})`);
    } catch (err) {
      console.error(`❌ Failed to score #${app.id}:`, err.message);
    }
  }
  
  console.log('All missing scores processed!');
  process.exit(0);
}

rescoreMissing();
