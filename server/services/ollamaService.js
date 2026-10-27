const pool = require('../config/db');

/**
 * Ollama Service - Communicates with Ollama API for AI-powered resume scoring.
 * Supports Google Gemma (primary) and Meta Llama (fallback).
 */
class OllamaService {
  constructor() {
    this.baseUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL || 'gemma';
  }

  async setModel(model) {
    this.model = model;
  }

  async getModel() {
    return this.model;
  }

  async isAvailable() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, { 
        method: 'GET',
        signal: AbortSignal.timeout(5000) 
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async generate(prompt, options = {}) {
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: options.model || this.model,
          prompt,
          stream: false,
          options: {
            temperature: options.temperature !== undefined ? options.temperature : 0.0,
            top_p: options.top_p || 0.9,
            seed: 42,
            num_predict: options.max_tokens || 2048
          }
        }),
        signal: AbortSignal.timeout(10000) // 10 second max timeout for fast response
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('Ollama generation error:', error.message);
      throw error;
    }
  }

  async scoreResume(resumeText, jobDescription, jobRequirements) {
    const prompt = `You are an expert HR AI assistant. Analyze the following resume against the job description and requirements. Provide a detailed scoring assessment.

IMPORTANT DEGREE ACRONYM RULES — treat these as fully equivalent when scoring education:
- B.S. / BS / B.Sc. / BSc = Bachelor of Science (Bachelor's degree)
- B.A. / BA = Bachelor of Arts (Bachelor's degree)
- B.Tech / BTech / B.E. / BE = Bachelor of Technology/Engineering (Bachelor's degree)
- M.S. / MS / M.Sc. / MSc = Master of Science (Master's degree)
- M.A. / MA = Master of Arts (Master's degree)
- M.B.A. / MBA = Master of Business Administration (Master's degree)
- Ph.D. / PhD / D.Phil. = Doctorate degree
Never penalize a candidate for using abbreviations instead of the full degree name.

STRICT ATS SCORING WEIGHTS & RECOMMENDATION TIERS:
- Skills weight: 40% (Primary factor), Experience: 30%, Education: 20%, Certifications: 10%. Projects are excluded (projects_score must be 0).
- "strongly_recommend": Overall 80-100 (Top-tier match meeting all criteria and skills)
- "recommend": Overall 60-79 (Solid match meeting required qualifications)
- "consider": Overall 50-59 (Borderline match with minor skill gaps)
- "not_recommended": Overall 0-49 (Unqualified candidate lacking core stack)
- EDUCATION SCORING BENCHMARKS:
  * Master's degree or Ph.D. / Doctorate (in a related field): 100.
  * Bachelor's degree in a directly related course (e.g. Computer Science, Information Technology, Engineering, Tech): 75.
  * Unrelated course, unrelated Bachelor's, incomplete college, or no college degree: 0.
7. RELATED SKILLS RULE:
  * If the candidate's skills are related, transferable, or partially match the job requirements, evaluate them in the 'consider' tier (skills_score 50-59%) with hiring_recommendation "consider".
  * Reserve "not_recommended" (0-49%) ONLY for candidates whose skills and background are completely unrelated to the job domain.

JOB DESCRIPTION:
${jobDescription}

JOB REQUIREMENTS:
Required Skills: ${JSON.stringify(jobRequirements.requiredSkills || [])}
Preferred Skills: ${JSON.stringify(jobRequirements.preferredSkills || [])}
Required Education: ${jobRequirements.requiredEducation || 'Not specified'}
Minimum Experience: ${jobRequirements.minExperience || 0} years
Certifications: ${JSON.stringify(jobRequirements.certifications || [])}

RESUME:
${resumeText.substring(0, 4000)}

Respond ONLY with a valid JSON object (no markdown, no code blocks, no extra text) with this exact structure:
{
  "skills_score": <number 0-100>,
  "experience_score": <number 0-100>,
  "education_score": <number 0-100>,
  "certification_score": <number 0-100>,
  "projects_score": 0,
  "matched_skills": [<list of matched skills>],
  "missing_skills": [<list of missing required/preferred skills>],
  "strengths": [<list of 3-5 key strengths>],
  "weaknesses": [<list of 2-4 areas of concern>],
  "confidence_level": <number 0-100>,
  "hiring_recommendation": "<one of: strongly_recommend, recommend, consider, not_recommended>",
  "ai_summary": "<2-3 sentence summary of the candidate's fit>",
  "ai_explanation": "<detailed paragraph explaining scores with specific evidence from the resume>"
}`;

    const response = await this.generate(prompt);
    
    // Parse JSON from response - handle potential markdown wrapping
    let jsonStr = response.trim();
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }
    
    return JSON.parse(jsonStr);
  }
}

module.exports = new OllamaService();
