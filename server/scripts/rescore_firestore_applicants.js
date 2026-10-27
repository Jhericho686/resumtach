const { adminDb: db } = require('../config/firebaseAdmin');
const path = require('path');
const os = require('os');
const fs = require('fs');
const fetch = require('node-fetch');
const resumeParser = require('../services/resumeParser');
const aiEngine = require('../services/aiEngine');

async function rescoreApplicants() {
  console.log('Fetching unscored applicants from Firestore...');
  const snapshot = await db.collection('applications').get();
  
  const applicants = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    if (!data.overallScore && !data.aiScore) {
      applicants.push({ id: doc.id, ...data });
    }
  });

  console.log(`Found ${applicants.length} unscored applicants.`);

  for (const app of applicants) {
    console.log(`\nScoring applicant ${app.applicantName} for ${app.jobTitle}...`);
    
    // Fetch job details
    const jobDoc = await db.collection('jobs').doc(app.jobId).get();
    const jobData = jobDoc.exists ? jobDoc.data() : {};

    let tempFilePath = null;
    try {
      const resumeUrl = app.resumeUrl || app.storageUrl;
      const storagePath = app.storagePath || app.resumeName || 'resume.pdf';
      const ext = path.extname(storagePath).toLowerCase() || '.pdf';
      tempFilePath = path.join(os.tmpdir(), `rescore_${Date.now()}${ext}`);
      
      try {
        if (resumeUrl && resumeUrl.startsWith('data:')) {
          // Handle data URL (base64)
          const base64Data = resumeUrl.split(',')[1];
          fs.writeFileSync(tempFilePath, base64Data, 'base64');
        } else if (resumeUrl && resumeUrl.startsWith('http')) {
          // Download via HTTP
          const response = await fetch(resumeUrl);
          if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
          const buffer = Buffer.from(await response.arrayBuffer());
          fs.writeFileSync(tempFilePath, buffer);
        } else {
          throw new Error('resumeUrl is missing or not HTTP/HTTPS/data: ' + String(resumeUrl).substring(0, 50));
        }
      } catch (dlErr) {
        throw new Error(`Failed to download resume: ${dlErr.message}`);
      }

      // 2. Parse
      const resumeText = await resumeParser.extractText(tempFilePath);
      
      // 3. Score
      const aiJobData = {
        description: jobData.description || '',
        title: jobData.title || app.jobTitle,
        required_skills: JSON.stringify(jobData.requiredSkills || []),
        preferred_skills: JSON.stringify(jobData.preferredSkills || []),
        required_education: jobData.requiredEducation || '',
        min_experience: jobData.minExperience || 0,
        max_experience: jobData.maxExperience || null,
        certifications: JSON.stringify(jobData.certifications || [])
      };
      
      const scores = await aiEngine.scoreResume(resumeText, {}, aiJobData);

      // 4. Save
      await db.collection('applications').doc(app.id).update({
        overallScore: scores.overall_score,
        aiScore: scores.overall_score,
        skillsScore: scores.skills_score,
        experienceScore: scores.experience_score,
        educationScore: scores.education_score,
        certificationScore: scores.certification_score,
        projectsScore: scores.projects_score,
        matchedSkills: scores.matched_skills || [],
        missingSkills: scores.missing_skills || [],
        strengths: scores.strengths || [],
        weaknesses: scores.weaknesses || [],
        confidenceLevel: scores.confidence_level,
        hiringRecommendation: scores.hiring_recommendation,
        aiSummary: scores.ai_summary,
        aiExplanation: scores.ai_explanation,
        aiModel: scores.ai_model,
        aiScoredAt: new Date().toISOString()
      });
      console.log(`✅ Successfully scored: ${scores.overall_score}`);
    } catch (err) {
      console.error(`❌ Error scoring: ${err.message}`);
    } finally {
      if (tempFilePath) {
        try { fs.unlinkSync(tempFilePath); } catch(e) {}
      }
    }
    
    await new Promise(r => setTimeout(r, 2000));
  }
  console.log('\nFinished rescoring applicants.');
  process.exit(0);
}

rescoreApplicants();
