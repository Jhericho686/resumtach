const pool = require('../config/db');
const ollamaService = require('./ollamaService');
const cloudAiService = require('./cloudAiService');
const geminiService = require('./geminiService');

class AIEngine {
  constructor() {
    this.models = {
      gemini: { name: 'gemini', displayName: 'Google Gemini', type: 'gemini' },
      cloud: { name: 'cloud', displayName: 'Cloud AI', type: 'cloud' },
      gemma: { name: 'gemma', displayName: 'Ollama Gemma', type: 'ollama' },
    };
  }

  parseJSON(val) {
    if (!val) return [];
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch { return val.split(',').map(s => s.trim()).filter(Boolean); }
    }
    return Array.isArray(val) ? val : [val];
  }

  async getWeights() {
    try {
      const [configs] = await pool.query("SELECT config_key, config_value FROM ai_config WHERE config_key LIKE '%_weight'");
      const weights = {};
      for (const c of configs) weights[c.config_key] = parseFloat(c.config_value);
      return {
        skills: weights.skills_weight ?? 0.40,
        experience: weights.experience_weight ?? 0.30,
        education: weights.education_weight ?? 0.20,
        certification: weights.certification_weight ?? 0.10,
        projects: weights.projects_weight ?? 0.00
      };
    } catch {
      return { skills: 0.40, experience: 0.30, education: 0.20, certification: 0.10, projects: 0.00 };
    }
  }

  _buildPrompt(resumeText, jobData, jobRequirements) {
    return `You are an expert Enterprise ATS (Applicant Tracking System) Evaluation AI.
Analyze the candidate's resume strictly against the specified job requirements and technical domain.

STRICT ATS SCORING WEIGHTS & CRITERIA:
- The overall score is weighted on: Skills (40%), Experience (30%), Education (20%), and Certifications (10%).
- Projects are NOT part of the job requirements standard (projects_score must be 0).
- Skills alignment is the single most critical factor.

1. SKILLS SCORE (0-100) — HEAVIEST FACTOR (40% WEIGHT):
   - Measure actual overlap of candidate's verified skills against required and preferred skills.
   - If candidate is missing mandatory core technical requirements (e.g. JavaScript, React for frontend software engineering), skills_score MUST NOT exceed 25.
   - 0-25: Missing critical core requirements.
   - 26-49: Possesses some secondary skills or general tech knowledge, but lacks core primary tools.
   - 50-59: Borderline skills match with noticeable gaps in core requirements.
   - 60-79: Possesses all required core skills with minor gaps in secondary/preferred skills.
   - 80-100: Exceptional match possessing 100% of required and multiple preferred skills.

2. EXPERIENCE SCORE (0-100) (30% WEIGHT):
   - CRITICAL DOMAIN RULE: Experience score measures RELEVANT experience in the target role's domain and stack, NOT raw irrelevant career years.
   - If candidate's background is in a completely different domain (e.g. Network Infrastructure, Cisco, Sysadmin applying for a Software/Web Developer role), their experience_score MUST be penalized heavily (10-35 max), regardless of how many total years they have worked.
   - If candidate possesses required years of experience in the EXACT relevant stack: 75-85.
   - If candidate significantly exceeds required years in the exact relevant stack: 86-100.

3. EDUCATION SCORE (0-100) (20% WEIGHT):
   - Compare candidate's degree and course against Required Education: "${jobRequirements.requiredEducation || 'Not specified'}".
   - Note degree equivalencies: B.S. / BS / B.Sc. / B.Tech / B.E. = Bachelor of Science (Bachelor's degree).
   - M.S. / MS / MBA = Master's degree. Ph.D. / PhD = Doctorate.
   - DETERMINISTIC EDUCATION BENCHMARKS:
     * Master's degree or Ph.D. / Doctorate (in a related field): 100.
     * Bachelor's degree in a directly related course (e.g. Computer Science, Information Technology, Engineering, Tech): 75.
     * Unrelated course, unrelated Bachelor's, incomplete college, or no college degree: 0.

4. CERTIFICATION SCORE (0-100) (10% WEIGHT):
   - Certifications relevant to this job role: 80-100.
   - Non-requested or general IT certifications: 40-60.
   - No certifications or completely unrelated: 0-25.

5. HIRING RECOMMENDATION TIERS (STRICT ATS THRESHOLDS):
   - "strongly_recommend": Overall ATS score 80-100. Exceptional match meeting required qualifications and skills.
   - "recommend": Overall ATS score 60-79. Solid candidate meeting all core requirements.
   - "consider": Overall ATS score 50-59. Borderline candidate with transferable skills or minor gaps.
   - "not_recommended": Overall ATS score 0-49. Unqualified candidate lacking mandatory stack or domain relevance.

JOB TITLE: ${jobData.title || 'Position'}
DEPARTMENT: ${jobData.department || 'General'}

JOB DESCRIPTION:
${jobData.description}

JOB REQUIREMENTS:
Required Skills: ${JSON.stringify(jobRequirements.requiredSkills || [])}
Preferred Skills: ${JSON.stringify(jobRequirements.preferredSkills || [])}
Required Education: ${jobRequirements.requiredEducation || 'Not specified'}
Minimum Experience: ${jobRequirements.minExperience || 0} years
Certifications: ${JSON.stringify(jobRequirements.certifications || [])}

RESUME:
${resumeText.substring(0, 5000)}

Respond ONLY with a valid JSON object matching this exact structure:
{
  "skills_score": <number 0-100>,
  "experience_score": <number 0-100>,
  "education_score": <number 0-100>,
  "certification_score": <number 0-100>,
  "projects_score": 0,
  "matched_skills": [<list of max 15 key matched skills>],
  "missing_skills": [<list of max 10 key missing skills>],
  "strengths": [<list of 3-5 key strengths as short phrases>],
  "weaknesses": [<list of 2-4 areas of concern as short phrases>],
  "confidence_level": <number 0-100>,
  "hiring_recommendation": "<one of: strongly_recommend, recommend, consider, not_recommended>",
  "ai_summary": "<MAXIMUM 2 sentences. Direct assessment of overall fit.>",
  "ai_explanation": "<MAXIMUM 4 sentences. Explicitly explain skills match, domain relevance of experience, and final hiring conclusion.>",
  "location": "<city, state, country or 'Not specified'>"
}`;
  }

  _parseAndRepairJson(jsonStr) {
    let str = jsonStr.trim();
    str = str.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    const jsonMatch = str.match(/\{[\s\S]*/);
    if (jsonMatch) str = jsonMatch[0];

    try {
      return JSON.parse(str);
    } catch (e) {
      console.warn('⚠️ JSON parse failed, attempting repair...');
      let cleaned = str.replace(/,\s*([\}\]])/g, '$1').replace(/\n/g, ' ');
      if (!cleaned.endsWith('}')) {
        cleaned = cleaned.replace(/,[^,]*$/, '');
        if (!cleaned.endsWith('}')) cleaned += '}';
      }
      try {
        return JSON.parse(cleaned);
      } catch (err) {
        throw new Error('Could not parse AI response as JSON');
      }
    }
  }

  async scoreResume(resumeText, resumeData, jobData) {
    const weights = await this.getWeights();
    const jobRequirements = {
      requiredSkills: this.parseJSON(jobData.required_skills),
      preferredSkills: this.parseJSON(jobData.preferred_skills),
      requiredEducation: jobData.required_education,
      minExperience: jobData.min_experience,
      maxExperience: jobData.max_experience,
      certifications: this.parseJSON(jobData.certifications)
    };

    const prompt = this._buildPrompt(resumeText, jobData, jobRequirements);
    
    console.log('🚀 Scoring exclusively with Google Gemini...');
    if (!await geminiService.isAvailable()) {
      throw new Error('Google Gemini API Key is not configured.');
    }

    const { text: rawResponse, model: modelUsed } = await geminiService.generateWithMetadata(prompt);

    if (!rawResponse) {
      throw new Error('Google Gemini failed to generate a score response.');
    }

    try {
      const parsed = this._parseAndRepairJson(rawResponse);
      
      parsed.projects_score = 0;

      // Exclude projects from weaknesses (not part of job standards)
      if (Array.isArray(parsed.weaknesses)) {
        parsed.weaknesses = parsed.weaknesses.filter(w => !w.toLowerCase().includes('project'));
      }

      // Enforce Deterministic 3-Tier Education Score:
      // - 100%: Master's degree or Ph.D.
      // - 75%: Bachelor's degree (related course)
      // - 0%: Unrelated course, incomplete, or no degree
      let edu = Number(parsed.education_score) || 0;
      if (edu >= 85) {
        parsed.education_score = 100;
      } else if (edu >= 30) {
        parsed.education_score = 75;
      } else {
        parsed.education_score = 0;
      }

      let overallScore = (
        (parsed.skills_score || 0) * weights.skills +
        (parsed.experience_score || 0) * weights.experience +
        (parsed.education_score || 0) * weights.education +
        (parsed.certification_score || 0) * weights.certification
      );

      // Enterprise ATS Domain & Skills Consistency Guardrail:
      // 1. If candidate's skills are related (skills_score >= 50), they qualify for the 'consider' tier (minimum 50%).
      // 2. If candidate lacks core skills (skills_score < 30) or is totally unrelated, cap below passing range (< 50%).
      if (parsed.skills_score >= 50 && overallScore < 50) {
        overallScore = 50; // Floor at 'consider' tier if skills are related
      } else if (parsed.skills_score < 30 || parsed.hiring_recommendation === 'not_recommended') {
        overallScore = Math.min(overallScore, 49);
      }

      parsed.overall_score = Math.round(overallScore * 100) / 100;

      // Strictly harmonize hiring_recommendation with the ATS score rubric:
      // 80 - 100: strongly_recommend
      // 60 - 79:  recommend
      // 50 - 59:  consider (also applied if skills are related)
      //  0 - 49:  not_recommended
      if (parsed.overall_score >= 80) {
        parsed.hiring_recommendation = 'strongly_recommend';
      } else if (parsed.overall_score >= 60) {
        parsed.hiring_recommendation = 'recommend';
      } else if (parsed.overall_score >= 50 || parsed.skills_score >= 50) {
        parsed.hiring_recommendation = 'consider';
        if (parsed.overall_score < 50) parsed.overall_score = 50;
      } else {
        parsed.hiring_recommendation = 'not_recommended';
      }

      parsed.ai_model = modelUsed;
      
      return parsed;
    } catch (parseError) {
      console.error('❌ Failed to parse AI output:', parseError.message);
      throw new Error('Failed to parse AI output into JSON format.');
    }
  }

  // ─── Score Persistence ────────────────────────────────────
  async saveScore(applicantId, jobId, scoreData, triggerType = 'initial', scoredBy = null) {
    if (!applicantId) return;
    if (!jobId) {
      try {
        const [appRows] = await pool.query('SELECT job_id FROM applicants WHERE id = ?', [applicantId]);
        if (appRows.length > 0 && appRows[0].job_id) jobId = appRows[0].job_id;
      } catch (e) {
        console.warn('⚠️ Failed to resolve job_id for applicant:', e.message);
      }
    }
    if (!jobId) return;

    const [existing] = await pool.query('SELECT id FROM resume_scores WHERE applicant_id = ?', [applicantId]);

    const params = [
      scoreData.overall_score || 0, scoreData.skills_score || 0, scoreData.experience_score || 0,
      scoreData.education_score || 0, scoreData.certification_score || 0, scoreData.projects_score || 0,
      JSON.stringify(scoreData.matched_skills || []), JSON.stringify(scoreData.missing_skills || []),
      JSON.stringify(scoreData.strengths || []), JSON.stringify(scoreData.weaknesses || []),
      scoreData.confidence_level || 0,
      scoreData.hiring_recommendation || 'consider', scoreData.ai_summary || '',
      scoreData.ai_explanation || '', scoreData.ai_model || 'Unknown',
      jobId, applicantId
    ];

    if (existing.length > 0) {
      await pool.query(`
        UPDATE resume_scores SET 
          overall_score=?, skills_score=?, experience_score=?, education_score=?, certification_score=?, 
          projects_score=?, matched_skills=?::jsonb, missing_skills=?::jsonb, strengths=?::jsonb, weaknesses=?::jsonb, 
          confidence_level=?, hiring_recommendation=?, ai_summary=?, 
          ai_explanation=?, ai_model=?, job_id=?, scored_at=CURRENT_TIMESTAMP
        WHERE applicant_id=?
      `, params);
    } else {
      await pool.query(`
        INSERT INTO resume_scores (
          overall_score, skills_score, experience_score, education_score, certification_score, projects_score,
          matched_skills, missing_skills, strengths, weaknesses,
          confidence_level, hiring_recommendation, ai_summary, ai_explanation, ai_model, job_id, applicant_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?::jsonb, ?::jsonb, ?::jsonb, ?::jsonb, ?, ?, ?, ?, ?, ?, ?)
      `, params);
    }
    await pool.query('UPDATE applicants SET status = ? WHERE id = ?', ['under_review', applicantId]);

    // Record into audit history table
    try {
      await pool.query(`
        INSERT INTO resume_score_history (
          applicant_id, job_id, overall_score, skills_score, experience_score,
          education_score, certification_score, projects_score, matched_skills,
          missing_skills, strengths, weaknesses, confidence_level,
          hiring_recommendation, ai_summary, ai_explanation, ai_model,
          scored_by, trigger_type, created_at
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?::jsonb,
          ?::jsonb, ?::jsonb, ?::jsonb, ?,
          ?, ?, ?, ?,
          ?, ?, CURRENT_TIMESTAMP
        )
      `, [
        applicantId, jobId, scoreData.overall_score || 0, scoreData.skills_score || 0, scoreData.experience_score || 0,
        scoreData.education_score || 0, scoreData.certification_score || 0, scoreData.projects_score || 0,
        JSON.stringify(scoreData.matched_skills || []), JSON.stringify(scoreData.missing_skills || []),
        JSON.stringify(scoreData.strengths || []), JSON.stringify(scoreData.weaknesses || []),
        scoreData.confidence_level || null, scoreData.hiring_recommendation || 'consider',
        scoreData.ai_summary || '', scoreData.ai_explanation || '', scoreData.ai_model || 'Unknown',
        scoredBy || null, triggerType || 'initial'
      ]);
    } catch (histErr) {
      console.warn('⚠️ Could not log to resume_score_history:', histErr.message);
    }
  }

  // ─── ATS Rule-Based Heuristic Scorer ──────────────────────
  _scoreHeuristic(resumeText, resumeData, jobRequirements, weights) {
    const textLower = resumeText.toLowerCase();
    const candidateSkills = (resumeData.skills || []).map(s => s.toLowerCase().trim());
    
    // Discover common tech skills if empty
    const commonTech = ['javascript','python','java','c++','react','node.js','sql','aws','docker','kubernetes','git','agile','linux','html','css','typescript'];
    const discoveredSkills = commonTech.filter(s => textLower.includes(s));
    
    if (candidateSkills.length === 0) {
      candidateSkills.push(...discoveredSkills);
    }

    const isSkillPresent = (skill) => {
      const s = skill.toLowerCase().trim();
      if (!s) return false;
      if (candidateSkills.includes(s) || textLower.includes(s)) return true;
      const cleanRegex = new RegExp(`\\b${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      return cleanRegex.test(textLower);
    };

    const reqSkills = Array.isArray(jobRequirements.requiredSkills) ? jobRequirements.requiredSkills : [];
    const prefSkills = Array.isArray(jobRequirements.preferredSkills) ? jobRequirements.preferredSkills : [];
    
    const matchedSkills = [];
    const missingSkills = [];

    reqSkills.forEach(skill => {
      if (isSkillPresent(skill)) matchedSkills.push(skill);
      else missingSkills.push(skill);
    });

    prefSkills.forEach(skill => {
      if (isSkillPresent(skill) && !matchedSkills.includes(skill)) matchedSkills.push(skill);
    });

    let skillsScore = 75;
    if (reqSkills.length > 0) {
      const reqRatio = reqSkills.filter(isSkillPresent).length / reqSkills.length;
      const prefRatio = prefSkills.length > 0 ? (prefSkills.filter(isSkillPresent).length / prefSkills.length) : 1;
      skillsScore = reqRatio === 1 ? Math.round(88 + prefRatio * 10) : 
                    reqRatio >= 0.5 ? Math.round(72 + (reqRatio - 0.5) * 30 + prefRatio * 10) : 
                    Math.round(25 + prefRatio * 15);
    }

    const experienceScore = 75; // Default heuristic
    const educationScore = 75;
    const certificationScore = 75;
    const projectsScore = 75;

    const overallScore = (
      skillsScore * weights.skills + experienceScore * weights.experience +
      educationScore * weights.education + certificationScore * weights.certification +
      projectsScore * weights.projects
    );

    return {
      overall_score: Math.round(overallScore * 100) / 100,
      skills_score: skillsScore,
      experience_score: experienceScore,
      education_score: educationScore,
      certification_score: certificationScore,
      projects_score: projectsScore,
      matched_skills: matchedSkills,
      missing_skills: missingSkills,
      strengths: ['Heuristic Evaluation Complete'],
      weaknesses: ['AI Scoring Unavailable - using basic keyword matching'],
      tailored_questions: [],
      confidence_level: 50,
      hiring_recommendation: 'consider',
      ai_summary: 'This is a rule-based evaluation. The AI model was unreachable.',
      ai_explanation: 'Heuristic fallback activated. Scores are based purely on keyword existence rather than contextual AI understanding.',
      ai_model: 'Rule-Based Fallback'
    };
  }
}

module.exports = new AIEngine();
