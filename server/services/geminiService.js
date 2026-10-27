/**
 * Gemini AI Service - Google Gemini 2.0 Flash for resume scoring.
 * Uses the REST API directly for maximum speed.
 */
class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
    this.model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
  }

  getApiKey() {
    return (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || this.apiKey || '').trim();
  }

  async isAvailable() {
    const key = this.getApiKey();
    return Boolean(key && key.length > 0);
  }

  async generate(prompt, options = {}) {
    const res = await this.generateWithMetadata(prompt, options);
    return res.text;
  }

  async generateWithMetadata(prompt, options = {}) {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('Google Gemini API Key is not configured.');
    }

    const preferredModel = options.model || process.env.GEMINI_MODEL || this.model;
    // Strictly active Google Gemini models only (3.8-flash, 3.5-flash-lite, 3.5-flash)
    const candidateModels = [
      preferredModel,
      'gemini-3.8-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.5-flash',
      'gemini-3.1-flash-lite'
    ].filter((m, i, arr) => Boolean(m) && arr.indexOf(m) === i);

    let lastError;

    for (const model of candidateModels) {
      const url = `${this.baseUrl}/models/${model}:generateContent?key=${apiKey}`;
      const maxAttempts = 2;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          console.log(`📡 Calling Gemini model: ${model} (attempt ${attempt}/${maxAttempts})...`);
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.0,
                topP: 1.0,
                maxOutputTokens: options.maxTokens || 4096,
                responseMimeType: 'application/json'
              }
            }),
            signal: AbortSignal.timeout(60000)
          });

          if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Gemini API error (${response.status}): ${errText}`);
          }

          const data = await response.json();

          if (data.candidates && data.candidates.length > 0) {
            const content = data.candidates[0].content;
            if (content && content.parts && content.parts.length > 0) {
              return {
                text: content.parts[0].text,
                model: `Google Gemini (${model})`
              };
            }
          }

          throw new Error('Invalid response structure from Gemini API');
        } catch (error) {
          lastError = error;
          console.warn(`⚠️ Gemini (${model}) attempt ${attempt}/${maxAttempts} failed: ${error.message}`);
          if (
            error.message.includes('404') ||
            error.message.includes('NOT_FOUND') ||
            error.message.includes('no longer available')
          ) {
            break; // Try next candidate model if deprecated or not found
          }
          if (attempt < maxAttempts) {
            const delayMs = attempt * 1500;
            await new Promise(r => setTimeout(r, delayMs));
          }
        }
      }
    }

    console.error('❌ All Gemini attempts failed:', lastError?.message);
    throw lastError;
  }

  async scoreResume(resumeText, jobDescription, jobRequirements) {
    const prompt = `You are an expert HR AI assistant. Analyze the following resume against the job description and requirements. Be precise and fair in your scoring.

IMPORTANT DEGREE ACRONYM RULES — treat these as fully equivalent when scoring education:
- B.S. / BS / B.Sc. / BSc = Bachelor of Science (Bachelor's degree)
- B.A. / BA = Bachelor of Arts (Bachelor's degree)
- B.Tech / BTech / B.E. / BE = Bachelor of Technology/Engineering (Bachelor's degree)
- M.S. / MS / M.Sc. / MSc = Master of Science (Master's degree)
- M.A. / MA = Master of Arts (Master's degree)
- M.B.A. / MBA = Master of Business Administration (Master's degree)
- Ph.D. / PhD / D.Phil. = Doctorate degree
Never penalize a candidate for using abbreviations instead of the full degree name.

If the resume does NOT contain a location (city, state, or country), set the "location" field to "Not specified" and do NOT penalize the candidate for missing location.

STRICT SCORING RULES & RUBRIC:
1. ATS WEIGHTS: Overall score is weighted on Skills (40%), Experience (30%), Education (20%), and Certifications (10%). Projects are excluded from standard scoring (projects_score must be 0).
2. HIRING RECOMMENDATION TIERS:
   - "strongly_recommend": Overall match 80-100 (Exceptional candidate meeting all core and required skills).
   - "recommend": Overall match 60-79 (Solid candidate meeting required qualifications).
   - "consider": Overall match 50-59 (Borderline candidate with transferable skills or minor gaps).
   - "not_recommended": Overall match 0-49 (Unqualified candidate lacking critical core skills or domain relevance).
3. If the resume has completely irrelevant experience or skills for the specific job description, the score MUST be very low (0-30). Be ruthless.
4. If a candidate applies for a role but lacks the core required skills or required years of experience, their skills_score and experience_score should be severely penalized.
5. Only award 80+ scores to candidates who meet required skills and qualifications with strong relevance.
6. DETERMINISTIC EDUCATION SCORING:
   - Master's degree or Ph.D. / Doctorate (in a related field): 100.
   - Bachelor's degree in a directly related course (e.g. Computer Science, Information Technology, Engineering, Tech): 75.
   - Unrelated course, unrelated Bachelor's, incomplete college, or no college degree: 0.
7. RELATED SKILLS RULE:
   - If the candidate's skills are related, transferable, or partially match the job requirements, evaluate them in the 'consider' tier (skills_score 50-59%) with hiring_recommendation "consider".
   - Reserve "not_recommended" (0-49%) ONLY for candidates whose skills and background are completely unrelated to the job domain.

JOB DESCRIPTION:
${jobDescription}

JOB REQUIREMENTS:
Required Skills: ${JSON.stringify(jobRequirements.requiredSkills || [])}
Preferred Skills: ${JSON.stringify(jobRequirements.preferredSkills || [])}
Required Education: ${jobRequirements.requiredEducation || 'Not specified'}
Minimum Experience: ${jobRequirements.minExperience || 0} years
Certifications: ${JSON.stringify(jobRequirements.certifications || [])}

RESUME:
${resumeText.substring(0, 6000)}

Respond ONLY with a valid JSON object with this exact structure:
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
  "ai_summary": "<MAXIMUM 2 sentences. One sentence on overall fit, one on top strength or concern.>",
  "ai_explanation": "<MAXIMUM 4 sentences total. Cover: skills match, experience level, education/certs fit, and final recommendation. Be direct and specific.>",
  "location": "<city, state, country or 'Not specified'>"
}`;

    const response = await this.generate(prompt);

    let jsonStr = response.trim();
    // Strip markdown code fences if present
    jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    const jsonMatch = jsonStr.match(/\{[\s\S]*/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      console.warn('⚠️ Gemini JSON parse failed, attempting repair...');
      return this.repairJson(jsonStr);
    }
  }

  repairJson(jsonStr) {
    try {
      let cleaned = jsonStr.replace(/,\s*([\}\]])/g, '$1').replace(/\n/g, ' ');
      if (!cleaned.endsWith('}')) {
        cleaned = cleaned.replace(/,[^,]*$/, '');
        if (!cleaned.endsWith('}')) cleaned += '}';
      }
      return JSON.parse(cleaned);
    } catch (err) {
      console.error('❌ Gemini JSON repair failed:', err.message);
      throw err;
    }
  }
}

module.exports = new GeminiService();
