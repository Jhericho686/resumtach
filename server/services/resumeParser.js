const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const natural = require('natural');
const nlp = require('compromise');

// ─── Tokenizers & Stemmers from 'natural' ─────────────────────────────────────
const tokenizer = new natural.WordTokenizer();
const sentenceTokenizer = new natural.SentenceTokenizer();

class ResumeParser {
  // ─── Public API ──────────────────────────────────────────────────────────────

  async extractText(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const absolutePath = path.resolve(filePath);

    if (!fs.existsSync(absolutePath)) {
      throw new Error('File not found');
    }

    // Fast Local Extraction First (PDF / DOCX / TXT)
    try {
      if (ext === '.pdf') {
        const text = await this.parsePDF(absolutePath);
        if (text && text.trim().length > 50 && !text.startsWith('Error:')) {
          console.log('⚡ Text extracted instantly via local PDF parser');
          return text;
        }
      } else if (ext === '.docx' || ext === '.doc') {
        const text = await this.parseDOCX(absolutePath);
        if (text && text.trim().length > 50) {
          console.log('⚡ Text extracted instantly via local DOCX parser');
          return text;
        }
      } else if (ext === '.txt') {
        const text = fs.readFileSync(absolutePath, 'utf8');
        if (text && text.trim().length > 0) return text;
      }
    } catch (localErr) {
      console.warn('⚠️ Local parser error, trying cloud parser:', localErr.message);
    }

    // Cloud fallback (LlamaParse for scanned/image PDFs or complex docs)
    const llamaKey = process.env.LLAMA_PARSE_API_KEY;
    if (llamaKey) {
      try {
        const text = await this.parsWithLlamaParse(absolutePath, llamaKey);
        if (text && text.trim().length > 50) {
          console.log('✅ Text extracted via LlamaParse cloud fallback');
          return text;
        }
      } catch (err) {
        console.warn('⚠️ LlamaParse failed:', err.message);
      }
    }

    throw new Error('Could not extract text from document. Please ensure the file is a readable PDF, DOCX, or TXT.');
  }

  // ─── LlamaParse Cloud Extraction ─────────────────────────────────────────────
  async parsWithLlamaParse(filePath, apiKey) {
    const { Blob } = require('buffer');
    const fileName = path.basename(filePath);
    const fileBuffer = fs.readFileSync(filePath);
    const ext = path.extname(fileName).toLowerCase();
    const mimeType = ext === '.pdf' ? 'application/pdf'
      : ext === '.docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : 'application/octet-stream';

    // Use native FormData + Blob (Node 18+) — compatible with native fetch
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: mimeType });
    formData.append('file', blob, fileName);
    formData.append('language', 'en');
    formData.append('parsing_instruction', 'Extract all text content from this resume. Preserve section headers like Education, Experience, Skills, Certifications, Projects. Output clean plain text.');

    // Step 1: Upload file to LlamaParse
    const uploadRes = await fetch('https://api.cloud.llamaindex.ai/api/parsing/upload', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      body: formData,
      signal: AbortSignal.timeout(60000)
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`LlamaParse upload failed (${uploadRes.status}): ${errText}`);
    }

    const uploadData = await uploadRes.json();
    const jobId = uploadData.id;
    if (!jobId) throw new Error(`LlamaParse returned no job ID. Response: ${JSON.stringify(uploadData)}`);
    console.log(`📄 LlamaParse job started: ${jobId}`);

    // Step 2: Poll for completion (max 60s)
    for (let attempt = 0; attempt < 20; attempt++) {
      await new Promise(r => setTimeout(r, 3000));

      const statusRes = await fetch(`https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(15000)
      });

      if (!statusRes.ok) {
        throw new Error(`LlamaParse status check failed: ${statusRes.status}`);
      }

      const statusData = await statusRes.json();
      const status = statusData.status;
      console.log(`📄 LlamaParse attempt ${attempt + 1}: ${status}`);

      if (status === 'SUCCESS') {
        // Step 3: Get text result
        const resultRes = await fetch(`https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}/result/text`, {
          headers: { 'Authorization': `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(15000)
        });
        if (!resultRes.ok) throw new Error(`LlamaParse result fetch failed: ${resultRes.status}`);
        const resultData = await resultRes.json();
        // LlamaParse returns { pages: [{ text: "..." }] } or { text: "..." }
        const text = resultData.text
          || (resultData.pages && resultData.pages.map(p => p.text || '').join('\n'))
          || '';
        return text;
      }

      if (status === 'ERROR' || status === 'CANCELLED') {
        throw new Error(`LlamaParse job failed with status: ${status}`);
      }
      // PENDING or PROCESSING — keep polling
    }
    throw new Error('LlamaParse timed out after 60 seconds');
  }

  // ─── PDF Parsing (Local High-Performance) ──────────────────────────────────
  async parsePDF(filePath) {
    // 1. Try modern pdfjs-dist (handles compressed object streams & all modern PDFs in ~200ms)
    try {
      const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const buffer = fs.readFileSync(filePath);
      const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
      let text = '';
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map(it => it.str).join(' ') + '\n';
      }
      if (text && text.trim().length > 30) {
        return text;
      }
    } catch (err) {
      console.warn('pdfjs-dist error, falling back to pdf-parse:', err.message);
    }

    // 2. Fallback to pdf-parse for legacy simple PDFs
    try {
      const pdfParse = require('pdf-parse');
      const buffer = fs.readFileSync(filePath);
      const data = await pdfParse(buffer);
      if (data && data.text && data.text.trim().length > 30) {
        return data.text;
      }
    } catch (err) {
      console.warn('pdf-parse direct failed:', err.message);
    }
    return '';
  }

  async parseDOCX(filePath) {
    const buffer = fs.readFileSync(filePath);
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }


  // ─── Structured Data Extraction (NLP-powered) ────────────────────────────────
  extractStructuredData(text) {
    const cleanText = this.cleanText(text);
    const sections = this.splitIntoSections(cleanText);

    return {
      name: this.extractName(cleanText, sections),
      email: this.extractEmail(cleanText),
      phone: this.extractPhone(cleanText),
      address: this.extractAddress(cleanText),
      education: this.extractEducation(cleanText, sections),
      skills: this.extractSkills(cleanText, sections),
      certifications: this.extractCertifications(cleanText, sections),
      experience: this.extractExperience(cleanText, sections),
      projects: this.extractProjects(cleanText, sections),
      programmingLanguages: this.extractProgrammingLanguages(cleanText),
      softwareTools: this.extractSoftwareTools(cleanText),
    };
  }

  // ─── Text Cleaning ─────────────────────────────────────────────────────────
  cleanText(text) {
    let cleaned = text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');

    // In PDF text, multiple consecutive capital keywords or section headers (e.g. "ABOUT ME  EDUCATION  Master...")
    // are frequently separated by 2 or more spaces rather than newlines.
    // Insert newlines around recognized section headers so section segmentation works reliably.
    const sectionKeywords = [
      'EDUCATION', 'ACADEMIC', 'QUALIFICATIONS',
      'EXPERIENCE', 'EMPLOYMENT', 'WORK HISTORY', 'PROFESSIONAL EXPERIENCE',
      'SKILLS', 'TECHNICAL SKILLS', 'CORE COMPETENCIES', 'KEY SKILLS',
      'CERTIFICATIONS', 'CERTIFICATES', 'LICENSES',
      'PROJECTS', 'NOTABLE PROJECTS',
      'SUMMARY', 'PROFESSIONAL SUMMARY', 'ABOUT ME', 'PROFILE',
      'REFERENCES', 'AWARDS', 'ACHIEVEMENTS'
    ];

    for (const sec of sectionKeywords) {
      const re = new RegExp(`(?:\\s{2,}|^|(?<=[a-z0-9.]\\s))(${sec})\\b`, 'gi');
      cleaned = cleaned.replace(re, '\n\n$1\n\n');
    }

    // Separate words fused without spaces by PDF/Word table cells (e.g. "TechnologyWestern" -> "Technology Western")
    cleaned = cleaned.replace(/([a-z])([A-Z][a-z])/g, '$1 $2');

    return cleaned
      .replace(/[ \t]+/g, ' ')           // collapse multiple spaces
      .replace(/\n{3,}/g, '\n\n')        // collapse excessive blank lines
      .trim();
  }

  // ─── Section Splitter ─────────────────────────────────────────────────────
  // Splits resume into named sections like EDUCATION, EXPERIENCE, SKILLS, etc.
  splitIntoSections(text) {
    const sectionHeaders = [
      'education', 'academic', 'qualification',
      'experience', 'employment', 'work history', 'professional experience', 'career',
      'skills', 'technical skills', 'core competencies', 'key skills', 'expertise',
      'certifications', 'certificates', 'licenses', 'accreditations',
      'projects', 'portfolio', 'notable projects',
      'summary', 'objective', 'profile', 'about',
      'languages', 'tools', 'technologies',
      'awards', 'achievements', 'honors',
      'references', 'publications', 'activities', 'volunteer',
    ];

    const lines = text.split('\n');
    const sections = {};
    let currentSection = 'header';
    sections[currentSection] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      const lower = trimmed.toLowerCase().replace(/[^a-z ]/g, '').trim();

      const matchedSection = sectionHeaders.find(h =>
        lower === h ||
        lower.startsWith(h) ||
        (lower.length > 3 && lower.length < 40 && lower.includes(h) && trimmed.split(/\s+/).length <= 5)
      );

      if (matchedSection && trimmed.length < 60) {
        currentSection = matchedSection.split(' ')[0]; // use first word as key
        if (!sections[currentSection]) sections[currentSection] = [];
      } else {
        sections[currentSection].push(trimmed);
      }
    }

    // Flatten each section into a single string
    const result = {};
    for (const [key, lines] of Object.entries(sections)) {
      result[key] = lines.filter(Boolean).join('\n');
    }
    return result;
  }

  // ─── Name Extraction (NLP-powered) ─────────────────────────────────────────
  extractName(text, sections) {
    const header = sections.header || '';

    // Use compromise NLP to find person names in the header
    const headerLines = header.split('\n').slice(0, 6);
    for (const line of headerLines) {
      if (!line.trim()) continue;
      const doc = nlp(line.trim());
      const people = doc.people().out('array');
      if (people.length > 0 && people[0].split(' ').length >= 2) {
        return people[0];
      }
    }

    // Fallback: first non-empty line that looks like a name
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    for (const line of lines.slice(0, 5)) {
      const trimmed = line.trim();
      // 2-4 words, all start with capital, no special chars except hyphen/apostrophe
      if (/^[A-Z][a-zA-Z'-]+(?:\s+[A-Z][a-zA-Z'-]+){1,3}$/.test(trimmed) && trimmed.length < 60) {
        return trimmed;
      }
    }

    // Last resort: just return first non-empty line truncated
    return lines.length > 0 ? lines[0].trim().substring(0, 80) : 'Unknown';
  }

  // ─── Contact Info ──────────────────────────────────────────────────────────
  extractEmail(text) {
    const match = text.match(/[\w.+%-]+@[\w.-]+\.[a-zA-Z]{2,}/);
    return match ? match[0].toLowerCase() : null;
  }

  extractPhone(text) {
    const patterns = [
      /(?:\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/,
      /(?:\+?\d{1,3}[\s.-]?)?\d{10,11}/,
      /(?:\+?\d{1,4}[\s.-]?)?\d{3,4}[\s.-]?\d{3,4}[\s.-]?\d{3,4}/,
    ];
    for (const p of patterns) {
      const match = text.match(p);
      if (match) return match[0].trim();
    }
    return null;
  }

  extractAddress(text) {
    const streetMatch = text.match(
      /\d+\s+[\w\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Court|Ct|Place|Pl)\.?[\s,]+[\w\s]+,?\s*[A-Z]{2,}\s*\d{4,}/i
    );
    if (streetMatch) return streetMatch[0].trim();
    const cityMatch = text.match(/(?:^|\n)\s*[\w\s]+,\s*[\w\s]+(?:,\s*\d{4,})?\s*$/m);
    if (cityMatch) return cityMatch[0].trim();
    const labelMatch = text.match(/(?:address|location)[:\s]+(.+)/i);
    if (labelMatch) return labelMatch[1].trim().substring(0, 150);
    return null;
  }

  // ─── Education (NLP-enhanced) ──────────────────────────────────────────────
  extractEducation(text, sections) {
    const src = sections.education || sections.academic || sections.qualification || text;
    const education = [];

    // Match degree prefix: e.g. "Master of Science", "Bachelor of Science", "Ph.D.", "B.S.", "M.S."
    const degreeRegex = /\b(?:(?:Bachelor|Master|Doctor(?:ate)?|Associate|Diploma|Certificate)(?:'s)?(?:\s+(?:of|in)\s+[A-Za-z&/]+)?|B\.S\.c?\.?|B\.A\.?|M\.S\.c?\.?|M\.A\.?|M\.B\.A\.?|Ph\.D\.?|M\.D\.?|B\.E\.?|M\.E\.?|B\.Tech\.?|M\.Tech\.?|B\.F\.A\.?|M\.F\.A\.?)(?=[,\s\n\-/|:]|$)/gi;

    let match;
    while ((match = degreeRegex.exec(src)) !== null) {
      let matchedToken = match[0].trim();
      const lowerToken = matchedToken.toLowerCase();

      // Guard: Ignore false positives like "ABOUT ME", generic words ("be", "it", "as"), or tiny non-acronyms
      if (lowerToken === 'me' || lowerToken === 'be' || lowerToken === 'it' || lowerToken === 'as') continue;
      if (matchedToken.length < 3 && !matchedToken.includes('.')) continue;

      const matchStart = match.index;
      const afterDegreeText = src.substring(matchStart + matchedToken.length, matchStart + matchedToken.length + 220);
      const cleanAfter = afterDegreeText
        .replace(/^[.\s]+/, '')
        .replace(/([a-z])(Western|University|College|Institute|School|Academy|Polytechnic)/gi, '$1 $2');

      // ── Field of study: e.g. "in Information Technology" (looked up AFTER the base degree token)
      let field = '';
      const fieldMatch = cleanAfter.match(/^(?:in|of)\s+([A-Za-z\s&()/-]+?)(?=(?:\s+(?:(?:University|College|Institute|Campus|School)\b|Western|State|National|De La Salle|Ateneo|Harvard|MIT|from\b|at\b|\d{4}))|[|,\-–—\n]|$)/i);
      if (fieldMatch) {
        field = fieldMatch[1].trim().replace(/\s+/g, ' ');
        field = field.replace(/^(?:Science|Arts|Engineering)\s+in\s+/i, '');
      }

      // Format acronyms nicely (e.g. B.A. instead of B.A without trailing dot if it had one)
      if (matchedToken.includes('.') && !matchedToken.endsWith('.') && afterDegreeText.startsWith('.')) {
        matchedToken += '.';
      }

      // ── Degree title
      let degree = matchedToken;
      if (field && !degree.toLowerCase().includes(field.toLowerCase())) {
        degree = `${matchedToken} in ${field}`;
      }

      // ── Institution: Look in the text immediately AFTER the degree & field
      let institution = '';
      const afterFieldOffset = field ? cleanAfter.toLowerCase().indexOf(field.toLowerCase()) + field.length : 0;
      const institutionSearchText = cleanAfter.substring(afterFieldOffset).replace(/^[|,\s\-–—]+/, '');

      const instPatterns = [
        /\b(?:University\s+of\s+(?:the\s+)?[A-Za-z\s&'-]+?)(?=(?:\s*(?:19|20)\d{2}|[|,\-–—\n]|Bachelor|Master|Doctor|$))/i,
        /\b((?:[A-Z][a-z.'&-]+\s+){0,4}(?:University|College|Institute|Academy|Polytechnic)(?:\s+of\s+[A-Za-z\s&'-]+?)?)(?=(?:\s*(?:19|20)\d{2}|[|,\-–—\n]|Bachelor|Master|Doctor|$))/i
      ];
      for (const pat of instPatterns) {
        const im = institutionSearchText.match(pat);
        if (im) {
          let rawInst = (im[1] || im[0]).trim();
          rawInst = rawInst.replace(/^[,.\-–—\s]+/, '').replace(/[,.\-–—\s]+$/, '');
          if (rawInst.length > 3) {
            institution = rawInst;
            break;
          }
        }
      }

      // ── Year / Date Range: e.g. "2020–2022" or "2020"
      let year = '';
      const yearMatch = afterDegreeText.match(/\b((?:19|20)\d{2}(?:\s*[\-–—to]+\s*(?:(?:19|20)\d{2}|Present))?)\b/i);
      if (yearMatch) {
        year = yearMatch[1].replace(/\s+/g, ' ').trim();
      }

      if (degree.length < 3) continue;

      const entry = {
        degree: degree.replace(/\s+/g, ' '),
        field: field,
        institution: institution.replace(/\s+/g, ' '),
        year: year
      };

      // Deduplication check
      const isDup = education.some(e => {
        const sameDegree = e.degree.toLowerCase() === entry.degree.toLowerCase();
        const sameInst = e.institution.toLowerCase() === entry.institution.toLowerCase();
        const sameYear = e.year === entry.year;
        return (sameDegree && sameInst) || (sameDegree && sameYear && entry.degree.length > 10);
      });

      if (!isDup) {
        education.push(entry);
      }
    }

    return education.length > 0 ? education : null;
  }

  // ─── Skills (Comprehensive keyword + context extraction) ────────────────────
  extractSkills(text, sections) {
    const src = sections.skills || sections.competencies || sections.expertise || sections.technologies || text;

    // Master skill list (comprehensive)
    const skillKeywords = [
      // Programming Languages
      'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'C', 'Ruby', 'PHP', 'Swift',
      'Kotlin', 'Go', 'Rust', 'Scala', 'R', 'Dart', 'Perl', 'Haskell', 'Elixir', 'Clojure',
      'MATLAB', 'Objective-C', 'Assembly', 'Lua', 'Shell', 'Bash', 'PowerShell', 'VBA',
      'SQL', 'HTML', 'CSS', 'YAML', 'XML', 'JSON', 'Groovy', 'F#', 'COBOL', 'Fortran',
      // Frontend
      'React', 'Angular', 'Vue', 'Next.js', 'Nuxt.js', 'Svelte', 'Gatsby', 'Redux',
      'MobX', 'GraphQL', 'REST API', 'Apollo', 'jQuery', 'Bootstrap', 'Tailwind CSS',
      'Webpack', 'Vite', 'Babel', 'Sass', 'LESS', 'Material UI', 'Ant Design', 'Chakra UI',
      // Backend
      'Node.js', 'Express', 'Django', 'Flask', 'FastAPI', 'Spring', 'Spring Boot',
      'Laravel', 'Rails', 'ASP.NET', 'NestJS', 'Fastify', 'Gin', 'Fiber', 'Actix',
      'gRPC', 'WebSocket', 'Microservices', 'Serverless', 'GraphQL',
      // Databases
      'MongoDB', 'PostgreSQL', 'MySQL', 'SQLite', 'Redis', 'Elasticsearch',
      'Firebase', 'DynamoDB', 'Cassandra', 'Oracle', 'MariaDB', 'CouchDB', 'Neo4j',
      'InfluxDB', 'Supabase', 'PlanetScale', 'Prisma', 'Sequelize', 'TypeORM', 'Mongoose',
      // Cloud & DevOps
      'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform', 'Ansible', 'Pulumi',
      'Jenkins', 'GitHub Actions', 'CircleCI', 'Travis CI', 'ArgoCD', 'Helm',
      'Prometheus', 'Grafana', 'Datadog', 'New Relic', 'Splunk', 'ELK Stack',
      'Linux', 'Unix', 'Nginx', 'Apache', 'Cloudflare', 'Vercel', 'Netlify', 'Heroku',
      // AI/ML
      'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'Keras', 'scikit-learn',
      'NLP', 'Computer Vision', 'OpenCV', 'Pandas', 'NumPy', 'Matplotlib', 'Jupyter',
      'Hugging Face', 'LangChain', 'OpenAI API', 'Data Analysis', 'Statistics',
      // Tools
      'Git', 'GitHub', 'GitLab', 'Bitbucket', 'Jira', 'Confluence', 'Trello', 'Asana',
      'Notion', 'Slack', 'Figma', 'Adobe XD', 'Sketch', 'Postman', 'Insomnia',
      'VS Code', 'IntelliJ', 'Eclipse', 'Xcode', 'Android Studio', 'Tableau', 'Power BI',
      'Microsoft Office', 'Excel', 'Google Analytics', 'Canva', 'Photoshop', 'Illustrator',
      // Soft Skills (valuable to capture)
      'Project Management', 'Agile', 'Scrum', 'Kanban', 'Leadership', 'Communication',
      'Problem Solving', 'Teamwork', 'Critical Thinking', 'Time Management',
      'Customer Service', 'Presentation', 'Mentoring', 'Research', 'Documentation',
      // Business / Domain
      'SEO', 'Digital Marketing', 'Content Writing', 'Social Media', 'E-commerce',
      'ERP', 'SAP', 'Salesforce', 'HubSpot', 'Accounting', 'Financial Analysis',
      'Quality Assurance', 'Testing', 'QA', 'Automation Testing', 'Selenium', 'Cypress',
      'Playwright', 'Jest', 'Mocha', 'PyTest', 'JUnit',
    ];

    const found = new Set();

    // 1. Match from master list (case-insensitive word boundary)
    for (const skill of skillKeywords) {
      const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?<![\\w.])${escaped}(?![\\w.])`, 'i');
      if (regex.test(src)) {
        found.add(skill);
      }
    }

    // 2. Also extract bullet-point items from the skills section
    if (sections.skills || sections.competencies) {
      const skillSrc = sections.skills || sections.competencies;
      const bulletItems = skillSrc.split(/[\n•\-,|/\\]+/)
        .map(s => s.trim())
        .filter(s => s.length > 1 && s.length < 50 && /[a-zA-Z]/.test(s));

      for (const item of bulletItems) {
        // Only add if it looks like a skill (not a full sentence)
        if (item.split(' ').length <= 5 && !/[.!?]$/.test(item)) {
          found.add(item);
        }
      }
    }

    return found.size > 0 ? [...found] : null;
  }

  // ─── Certifications ─────────────────────────────────────────────────────────
  extractCertifications(text, sections) {
    const src = sections.certifications || sections.certificates || sections.licenses || text;
    const certs = new Set();

    const patterns = [
      // Explicit patterns
      /(?:AWS|Azure|GCP|Google Cloud|CompTIA|Cisco|Oracle|Microsoft|IBM|PMI|ISACA|ISC2|EC-Council|Salesforce|Scrum\.org|SAFe|ITIL|Prince2)[\w\s(),-]+(?:Certified|Certificate|Associate|Professional|Specialist|Expert|Practitioner|Engineer|Architect|Analyst|Developer|Administrator|Consultant|Foundation|Master)/gi,
      // "Certified X" or "X Certificate/Certification"
      /(?:Certified\s+[\w\s-]{3,50}|[\w\s-]{3,50}\s+(?:Certificate|Certification|Licence|License))/gi,
      // "Certification in X"
      /Certification\s+in\s+[\w\s-]{3,60}/gi,
      // Bullet items in cert section
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(src)) !== null) {
        const cert = match[0].trim();
        if (cert.length > 5 && cert.length < 200) {
          certs.add(cert);
        }
      }
    }

    // Also parse bullet items from cert section if available
    if (sections.certifications || sections.certificates) {
      const certSrc = sections.certifications || sections.certificates;
      const lines = certSrc.split('\n').map(l => l.replace(/^[\s•\-*]+/, '').trim()).filter(l => l.length > 5);
      for (const line of lines) {
        if (line.length < 200 && /[A-Z]/.test(line)) {
          certs.add(line);
        }
      }
    }

    return certs.size > 0 ? [...certs] : null;
  }

  // ─── Experience ─────────────────────────────────────────────────────────────
  extractExperience(text, sections) {
    const src = sections.experience || sections.employment || sections.career || text;
    const experiences = [];

    // Pattern: "Job Title at Company" with optional dates
    const expRegex = /([A-Z][\w\s/&,.-]{3,60}?)\s+(?:at|@|–|-|,)\s+([A-Z][\w\s/&,.-]{2,60}?)(?:\s*[|\n]|$|\s{2,})/gm;
    let match;
    while ((match = expRegex.exec(src)) !== null) {
      const title = match[1].trim();
      const company = match[2].trim();

      // Skip if it looks like an address or education
      if (/street|avenue|university|college|school/i.test(title)) continue;
      if (title.length > 80 || company.length > 80) continue;

      // Look for date range near the match
      const context = src.substring(Math.max(0, match.index - 30), match.index + 200);
      const dateMatch = context.match(
        /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{4})[\w\s,.-]*(?:–|-|to)\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{4}|Present|Current|Now)/i
      );

      experiences.push({
        title,
        company,
        duration: dateMatch ? dateMatch[0].trim() : '',
      });
    }

    // Pattern 2: Lines that look like job titles followed by company on next line
    if (experiences.length === 0) {
      const lines = src.split('\n').filter(l => l.trim());
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i].trim();
        const next = lines[i + 1].trim();
        const titleWords = ['Engineer', 'Developer', 'Designer', 'Analyst', 'Manager', 'Director',
          'Lead', 'Architect', 'Coordinator', 'Specialist', 'Intern', 'Consultant',
          'Officer', 'Associate', 'Assistant', 'Head', 'VP', 'CTO', 'CEO', 'Staff'];

        if (titleWords.some(t => line.includes(t)) && next.length > 2 && next.length < 80) {
          const dateMatch = (lines[i + 2] || '').match(
            /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{4})/i
          );
          experiences.push({
            title: line.substring(0, 100),
            company: next.substring(0, 100),
            duration: dateMatch ? lines[i + 2].trim() : '',
          });
          i += 1;
        }
      }
    }

    return experiences.length > 0 ? [...new Map(experiences.map(e => [`${e.title}|${e.company}`, e])).values()] : null;
  }

  // ─── Projects ───────────────────────────────────────────────────────────────
  extractProjects(text, sections) {
    const src = sections.projects || sections.portfolio || '';
    if (!src) return null;

    const projects = [];
    const lines = src.split('\n').filter(l => l.trim());
    let currentProject = null;

    for (const line of lines) {
      const trimmed = line.replace(/^[\s•\-*]+/, '').trim();
      if (!trimmed) continue;

      // New project: short line (title-like), possibly bold or all caps
      if (trimmed.length < 80 && (trimmed[0] === trimmed[0].toUpperCase()) && !currentProject) {
        currentProject = { name: trimmed, description: '' };
      } else if (currentProject) {
        if (trimmed.length > 20) {
          currentProject.description += (currentProject.description ? ' ' : '') + trimmed;
        } else {
          projects.push(currentProject);
          currentProject = { name: trimmed, description: '' };
        }
      }
    }
    if (currentProject) projects.push(currentProject);

    return projects.length > 0 ? projects : null;
  }

  // ─── Programming Languages ──────────────────────────────────────────────────
  extractProgrammingLanguages(text) {
    const languages = [
      'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'C',
      'Ruby', 'PHP', 'Swift', 'Kotlin', 'Go', 'Rust', 'Scala', 'R',
      'Dart', 'Perl', 'Haskell', 'Elixir', 'Clojure', 'MATLAB',
      'Objective-C', 'Assembly', 'Lua', 'Shell', 'Bash', 'PowerShell',
      'SQL', 'HTML', 'CSS', 'YAML', 'XML', 'Groovy', 'F#', 'VBA', 'COBOL',
    ];
    const found = [];
    for (const lang of languages) {
      const escaped = lang.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?<![\\w])${escaped}(?![\\w])`, 'i');
      if (regex.test(text)) found.push(lang);
    }
    return found.length > 0 ? found : null;
  }

  // ─── Software Tools ─────────────────────────────────────────────────────────
  extractSoftwareTools(text) {
    const tools = [
      'VS Code', 'Visual Studio', 'IntelliJ', 'Eclipse', 'PyCharm', 'WebStorm', 'Xcode', 'Android Studio',
      'Postman', 'Insomnia', 'Docker Desktop', 'GitHub Desktop', 'Git', 'GitHub', 'GitLab', 'Bitbucket',
      'Jira', 'Confluence', 'Trello', 'Asana', 'Notion', 'Slack', 'Microsoft Teams', 'Zoom',
      'Figma', 'Adobe XD', 'Sketch', 'InVision', 'Zeplin', 'Canva',
      'Photoshop', 'Illustrator', 'Premiere Pro', 'After Effects', 'Lightroom',
      'Tableau', 'Power BI', 'Google Analytics', 'Looker', 'Google Data Studio',
      'Jupyter Notebook', 'Google Colab', 'RStudio', 'SPSS', 'SAS',
      'AWS Console', 'Terraform', 'Kubernetes Dashboard', 'Grafana', 'Prometheus', 'Datadog',
      'Jenkins', 'CircleCI', 'Travis CI', 'GitHub Actions', 'ArgoCD',
      'Microsoft Office', 'Excel', 'Word', 'PowerPoint', 'Outlook', 'Access',
      'Google Sheets', 'Google Docs', 'Google Slides',
      'Mailchimp', 'HubSpot', 'Salesforce', 'Zendesk', 'Intercom', 'SAP',
    ];
    const found = [];
    for (const tool of tools) {
      const escaped = tool.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      if (regex.test(text)) found.push(tool);
    }
    return found.length > 0 ? [...new Set(found)] : null;
  }
}

module.exports = new ResumeParser();
