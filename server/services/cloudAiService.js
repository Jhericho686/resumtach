const pool = require('../config/db');

/**
 * Cloud AI Service - Communicates with OpenAI-compatible APIs (OpenAI, DeepInfra, Groq, etc.)
 */
class CloudAiService {
  constructor() {
    // Default to OpenAI, but can be overridden for DeepInfra, Groq, etc.
    this.baseUrl = process.env.AI_BASE_URL || 'https://api.openai.com/v1';
    this.apiKey = process.env.AI_API_KEY || '';
    this.model = process.env.AI_MODEL || 'gpt-3.5-turbo';
  }

  async setModel(model) {
    this.model = model;
  }

  async getModel() {
    return this.model;
  }

  async isAvailable() {
    // If we have an API key, assume it's available
    return this.apiKey && this.apiKey.trim().length > 0;
  }

  async generate(prompt, options = {}) {
    if (!this.apiKey) {
      throw new Error('AI API Key is not configured.');
    }

    const maxAttempts = 5;
    let lastError;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({
            model: options.model || this.model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.0,
            top_p: 1.0,
            max_tokens: options.max_tokens || 4096
          }),
          signal: AbortSignal.timeout(60000) // 60 second timeout
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Cloud AI API error (${response.status}): ${errText}`);
        }

        const data = await response.json();
        if (data.choices && data.choices.length > 0) {
          return data.choices[0].message.content;
        } else {
          throw new Error('Invalid response structure from Cloud AI');
        }
      } catch (error) {
        lastError = error;
        console.warn(`⚠️ Cloud AI attempt ${attempt}/${maxAttempts} failed: ${error.message}`);
        if (attempt < maxAttempts) {
          // Parse "Please try again in X.XXs" from Groq rate limit message
          let delayMs = attempt * 4000;
          const match = error.message.match(/Please try again in (\d+(?:\.\d+)?)s/i);
          if (match) {
            delayMs = Math.ceil(parseFloat(match[1]) * 1000) + 1500;
            console.log(`⏱️ Rate limit hit. Pausing for ${(delayMs / 1000).toFixed(1)}s before retry...`);
          }
          await new Promise(r => setTimeout(r, delayMs));
        }
      }
    }

    console.error('❌ Cloud AI generation error after retries:', lastError.message);
    throw lastError;
  }

  async scoreResume(resumeText, jobDescription, jobRequirements) {
    const prompt = `You are an expert HR AI assistant. Analyze the following resume against the job description and requirements. Be concise and direct.

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
${resumeText.substring(0, 4000)}

Respond ONLY with a valid JSON object (no markdown, no code blocks, no extra text) with this exact structure:
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
    const jsonMatch = jsonStr.match(/\{[\s\S]*/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      console.warn('⚠️ Standard JSON parse failed, attempting auto-repair...');
      return this.repairJson(jsonStr);
    }
  }

  repairJson(jsonStr) {
    try {
      let cleaned = jsonStr.replace(/,\s*([\}\]])/g, '$1').replace(/\n/g, ' ');
      // If missing closing brace, append closing brackets/braces
      if (!cleaned.endsWith('}')) {
        // Strip incomplete trailing field
        cleaned = cleaned.replace(/,[^,]*$/, '');
        if (!cleaned.endsWith('}')) cleaned += '}';
      }
      return JSON.parse(cleaned);
    } catch (err) {
      console.error('❌ JSON repair failed:', err.message);
      throw err;
    }
  }
}

module.exports = new CloudAiService();

