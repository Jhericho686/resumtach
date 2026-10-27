-- ============================================================
-- ResuMatch — AI-Driven Applicant Tracking System
-- Database Schema for MySQL (XAMPP Compatible)
-- Version: 1.0.0
-- ============================================================

-- Drop database if exists and create fresh
DROP DATABASE IF EXISTS resumatch;
CREATE DATABASE resumatch CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE resumatch;

-- ============================================================
-- TABLE: users
-- Stores HR Administrator and HR Staff accounts
-- ============================================================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'staff') NOT NULL DEFAULT 'staff',
    avatar VARCHAR(500) DEFAULT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    last_login DATETIME DEFAULT NULL,
    reset_token VARCHAR(255) DEFAULT NULL,
    reset_token_expires DATETIME DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_email (email),
    INDEX idx_users_role (role),
    INDEX idx_users_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: jobs
-- Stores job openings created by HR
-- ============================================================
CREATE TABLE jobs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    department VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    required_skills JSON DEFAULT NULL,
    preferred_skills JSON DEFAULT NULL,
    required_education VARCHAR(255) DEFAULT NULL,
    min_experience INT DEFAULT 0,
    max_experience INT DEFAULT NULL,
    certifications JSON DEFAULT NULL,
    employment_type ENUM('full-time', 'part-time', 'contract', 'internship', 'temporary') NOT NULL DEFAULT 'full-time',
    location VARCHAR(255) DEFAULT NULL,
    salary_min DECIMAL(12,2) DEFAULT NULL,
    salary_max DECIMAL(12,2) DEFAULT NULL,
    status ENUM('active', 'closed', 'archived', 'draft') NOT NULL DEFAULT 'active',
    created_by INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_jobs_status (status),
    INDEX idx_jobs_department (department),
    INDEX idx_jobs_created_by (created_by),
    CONSTRAINT fk_jobs_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: applicants
-- Stores applicant information and parsed resume data
-- ============================================================
CREATE TABLE applicants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    job_id INT NOT NULL,
    first_name VARCHAR(100) DEFAULT NULL,
    last_name VARCHAR(100) DEFAULT NULL,
    email VARCHAR(255) DEFAULT NULL,
    phone VARCHAR(50) DEFAULT NULL,
    address TEXT DEFAULT NULL,
    education JSON DEFAULT NULL,
    skills JSON DEFAULT NULL,
    certifications JSON DEFAULT NULL,
    experience JSON DEFAULT NULL,
    projects JSON DEFAULT NULL,
    programming_languages JSON DEFAULT NULL,
    software_tools JSON DEFAULT NULL,
    resume_file VARCHAR(500) NOT NULL,
    resume_text LONGTEXT DEFAULT NULL,
    status ENUM('pending', 'under_review', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    uploaded_by INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_applicants_job_id (job_id),
    INDEX idx_applicants_status (status),
    INDEX idx_applicants_email (email),
    INDEX idx_applicants_uploaded_by (uploaded_by),
    CONSTRAINT fk_applicants_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_applicants_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: resume_scores
-- Stores AI-generated match scores and explanations
-- ============================================================
CREATE TABLE resume_scores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    applicant_id INT NOT NULL,
    job_id INT NOT NULL,
    overall_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    skills_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    experience_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    education_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    certification_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    projects_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    matched_skills JSON DEFAULT NULL,
    missing_skills JSON DEFAULT NULL,
    strengths JSON DEFAULT NULL,
    weaknesses JSON DEFAULT NULL,
    confidence_level DECIMAL(5,2) DEFAULT NULL,
    hiring_recommendation ENUM('strongly_recommend', 'recommend', 'consider', 'not_recommended') DEFAULT 'consider',
    ai_summary TEXT DEFAULT NULL,
    ai_explanation TEXT DEFAULT NULL,
    ai_model VARCHAR(100) DEFAULT NULL,
    scored_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_scores_applicant (applicant_id),
    INDEX idx_scores_job (job_id),
    INDEX idx_scores_overall (overall_score),
    CONSTRAINT fk_scores_applicant FOREIGN KEY (applicant_id) REFERENCES applicants(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_scores_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: hr_notes
-- Stores HR notes and comments on applicants
-- ============================================================
CREATE TABLE hr_notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    applicant_id INT NOT NULL,
    user_id INT NOT NULL,
    note TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_notes_applicant (applicant_id),
    INDEX idx_notes_user (user_id),
    CONSTRAINT fk_notes_applicant FOREIGN KEY (applicant_id) REFERENCES applicants(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_notes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: activity_logs
-- Records all important system actions
-- ============================================================
CREATE TABLE activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT DEFAULT NULL,
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(50) DEFAULT NULL,
    entity_id INT DEFAULT NULL,
    details JSON DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_logs_user (user_id),
    INDEX idx_logs_action (action),
    INDEX idx_logs_entity (entity_type, entity_id),
    INDEX idx_logs_created (created_at),
    CONSTRAINT fk_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: notifications
-- Stores system notifications for HR users
-- ============================================================
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT DEFAULT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('info', 'success', 'warning', 'error') NOT NULL DEFAULT 'info',
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    link VARCHAR(500) DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_notifications_user (user_id),
    INDEX idx_notifications_read (is_read),
    INDEX idx_notifications_created (created_at),
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: ai_config
-- Stores AI engine configuration
-- ============================================================
CREATE TABLE ai_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT NOT NULL,
    description VARCHAR(500) DEFAULT NULL,
    updated_by INT DEFAULT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_aiconfig_user FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- SAMPLE DATA
-- ============================================================

-- -----------------------------------------------------------
-- Users (passwords are bcrypt hashed: "Password123!")
-- -----------------------------------------------------------
INSERT INTO users (first_name, last_name, email, password, role, is_active) VALUES
('Sarah', 'Mitchell', 'admin@reedelsevier.com', '$2b$10$8K1p/a0dR1xqM8KJmLyKCOYzGT/SbR0bPgNJKP8sF/tQ2x5Ij1XPi', 'admin', 1),
('James', 'Rodriguez', 'staff@reedelsevier.com', '$2b$10$8K1p/a0dR1xqM8KJmLyKCOYzGT/SbR0bPgNJKP8sF/tQ2x5Ij1XPi', 'staff', 1),
('Emily', 'Chen', 'emily.chen@reedelsevier.com', '$2b$10$8K1p/a0dR1xqM8KJmLyKCOYzGT/SbR0bPgNJKP8sF/tQ2x5Ij1XPi', 'staff', 1);

-- -----------------------------------------------------------
-- Jobs
-- -----------------------------------------------------------
INSERT INTO jobs (title, department, description, required_skills, preferred_skills, required_education, min_experience, max_experience, certifications, employment_type, location, salary_min, salary_max, status, created_by) VALUES
(
    'Senior Software Engineer',
    'Engineering',
    'We are seeking a highly skilled Senior Software Engineer to join our Engineering team. The ideal candidate will design, develop, and maintain scalable software solutions. You will collaborate with cross-functional teams to deliver high-quality products that meet business requirements.',
    '["JavaScript", "TypeScript", "React", "Node.js", "SQL", "Git", "REST APIs", "System Design"]',
    '["AWS", "Docker", "Kubernetes", "GraphQL", "MongoDB", "CI/CD", "Agile"]',
    'Bachelor''s degree in Computer Science or related field',
    5, 10,
    '["AWS Certified Developer", "Certified Scrum Master"]',
    'full-time', 'New York, NY', 120000.00, 180000.00, 'active', 1
),
(
    'Data Analyst',
    'Business Intelligence',
    'Looking for a Data Analyst to transform raw data into actionable insights. You will work closely with stakeholders to understand data needs, build dashboards, and support data-driven decision making across the organization.',
    '["Python", "SQL", "Excel", "Tableau", "Data Visualization", "Statistical Analysis"]',
    '["Power BI", "R", "Machine Learning", "ETL", "Hadoop"]',
    'Bachelor''s degree in Statistics, Mathematics, or related field',
    2, 5,
    '["Google Data Analytics Certificate", "Tableau Certified"]',
    'full-time', 'London, UK', 65000.00, 95000.00, 'active', 1
),
(
    'UX/UI Designer',
    'Product Design',
    'Join our Product Design team as a UX/UI Designer. You will create intuitive and visually compelling user interfaces for our digital products. Collaborate with product managers and engineers to translate user needs into elegant design solutions.',
    '["Figma", "Adobe XD", "User Research", "Wireframing", "Prototyping", "Design Systems"]',
    '["HTML/CSS", "Sketch", "Illustration", "Motion Design", "A/B Testing"]',
    'Bachelor''s degree in Design, HCI, or related field',
    3, 7,
    NULL,
    'full-time', 'San Francisco, CA', 95000.00, 140000.00, 'active', 1
),
(
    'DevOps Engineer',
    'Infrastructure',
    'We need a DevOps Engineer to manage and optimize our cloud infrastructure. You will implement CI/CD pipelines, manage containerized deployments, and ensure system reliability and scalability.',
    '["AWS", "Docker", "Kubernetes", "Linux", "CI/CD", "Terraform", "Python", "Bash"]',
    '["Azure", "GCP", "Ansible", "Jenkins", "Prometheus", "Grafana"]',
    'Bachelor''s degree in Computer Science or related field',
    4, 8,
    '["AWS Solutions Architect", "CKA", "HashiCorp Terraform Associate"]',
    'full-time', 'Remote', 110000.00, 165000.00, 'active', 1
),
(
    'Marketing Intern',
    'Marketing',
    'Exciting internship opportunity in our Marketing department. Assist with social media management, content creation, market research, and campaign analytics. Great opportunity to learn and grow in a professional environment.',
    '["Social Media", "Content Writing", "Microsoft Office", "Communication Skills"]',
    '["Adobe Creative Suite", "Google Analytics", "SEO", "Canva"]',
    'Currently pursuing Bachelor''s degree in Marketing or related field',
    0, 1,
    NULL,
    'internship', 'New York, NY', 20000.00, 30000.00, 'active', 2
);

-- -----------------------------------------------------------
-- Applicants
-- -----------------------------------------------------------
INSERT INTO applicants (job_id, first_name, last_name, email, phone, address, education, skills, certifications, experience, projects, programming_languages, software_tools, resume_file, status, uploaded_by) VALUES
(1, 'Michael', 'Thompson', 'michael.thompson@email.com', '+1-555-0101', '123 Tech Ave, New York, NY 10001',
 '[{"degree": "M.S. Computer Science", "institution": "MIT", "year": 2018}, {"degree": "B.S. Computer Science", "institution": "Stanford University", "year": 2016}]',
 '["JavaScript", "TypeScript", "React", "Node.js", "Python", "SQL", "MongoDB", "AWS", "Docker", "Git", "REST APIs", "System Design", "Agile"]',
 '["AWS Certified Developer Associate", "Certified Scrum Master"]',
 '[{"title": "Senior Software Engineer", "company": "Google", "duration": "3 years"}, {"title": "Software Engineer", "company": "Meta", "duration": "2 years"}]',
 '[{"name": "E-Commerce Platform", "description": "Built a scalable e-commerce platform handling 1M+ transactions/month"}]',
 '["JavaScript", "TypeScript", "Python", "Java", "Go"]',
 '["VS Code", "Docker Desktop", "Postman", "Jira", "GitHub"]',
 'resumes/michael_thompson_resume.pdf', 'approved', 2),

(1, 'Jessica', 'Williams', 'jessica.williams@email.com', '+1-555-0102', '456 Code St, San Francisco, CA 94102',
 '[{"degree": "B.S. Software Engineering", "institution": "UC Berkeley", "year": 2019}]',
 '["JavaScript", "React", "Node.js", "SQL", "Git", "REST APIs", "HTML/CSS"]',
 NULL,
 '[{"title": "Software Engineer", "company": "Salesforce", "duration": "3 years"}, {"title": "Junior Developer", "company": "Startup Inc", "duration": "1 year"}]',
 '[{"name": "Task Management App", "description": "Full-stack task management application with real-time updates"}]',
 '["JavaScript", "Python", "Java"]',
 '["VS Code", "Postman", "Git", "Slack"]',
 'resumes/jessica_williams_resume.pdf', 'under_review', 2),

(1, 'David', 'Kim', 'david.kim@email.com', '+1-555-0103', '789 Dev Blvd, Seattle, WA 98101',
 '[{"degree": "B.S. Computer Science", "institution": "University of Washington", "year": 2020}]',
 '["JavaScript", "React", "Python", "SQL", "Git"]',
 NULL,
 '[{"title": "Junior Developer", "company": "Amazon", "duration": "2 years"}]',
 NULL,
 '["JavaScript", "Python"]',
 '["VS Code", "Git"]',
 'resumes/david_kim_resume.pdf', 'pending', 2),

(2, 'Amanda', 'Foster', 'amanda.foster@email.com', '+1-555-0201', '321 Data Dr, London, UK',
 '[{"degree": "M.S. Statistics", "institution": "Oxford University", "year": 2019}, {"degree": "B.S. Mathematics", "institution": "Cambridge University", "year": 2017}]',
 '["Python", "SQL", "R", "Tableau", "Power BI", "Excel", "Statistical Analysis", "Data Visualization", "Machine Learning"]',
 '["Google Data Analytics Professional Certificate", "Tableau Desktop Specialist"]',
 '[{"title": "Data Analyst", "company": "Deloitte", "duration": "3 years"}, {"title": "Junior Analyst", "company": "KPMG", "duration": "2 years"}]',
 '[{"name": "Customer Segmentation Model", "description": "Built ML model for customer segmentation improving targeting by 35%"}]',
 '["Python", "R", "SQL"]',
 '["Tableau", "Power BI", "Excel", "Jupyter Notebook"]',
 'resumes/amanda_foster_resume.pdf', 'approved', 1),

(2, 'Robert', 'Chang', 'robert.chang@email.com', '+1-555-0202', '654 Analytics Ln, Chicago, IL 60601',
 '[{"degree": "B.S. Data Science", "institution": "University of Michigan", "year": 2021}]',
 '["Python", "SQL", "Excel", "Tableau", "Data Visualization"]',
 '["Google Data Analytics Certificate"]',
 '[{"title": "Data Analyst Intern", "company": "IBM", "duration": "1 year"}]',
 NULL,
 '["Python", "SQL"]',
 '["Tableau", "Excel", "Google Sheets"]',
 'resumes/robert_chang_resume.pdf', 'under_review', 1),

(3, 'Sophia', 'Martinez', 'sophia.martinez@email.com', '+1-555-0301', '987 Design Way, San Francisco, CA 94103',
 '[{"degree": "M.F.A. Interaction Design", "institution": "RISD", "year": 2018}, {"degree": "B.A. Graphic Design", "institution": "Parsons School of Design", "year": 2016}]',
 '["Figma", "Adobe XD", "Sketch", "User Research", "Wireframing", "Prototyping", "Design Systems", "HTML/CSS", "Illustration"]',
 NULL,
 '[{"title": "Senior UX Designer", "company": "Apple", "duration": "3 years"}, {"title": "UX Designer", "company": "Airbnb", "duration": "2 years"}]',
 '[{"name": "Design System Library", "description": "Created comprehensive design system used across 5 product teams"}]',
 '["HTML", "CSS", "JavaScript"]',
 '["Figma", "Adobe XD", "Sketch", "InVision", "Zeplin"]',
 'resumes/sophia_martinez_resume.pdf', 'approved', 1),

(4, 'Alex', 'Petrov', 'alex.petrov@email.com', '+1-555-0401', '147 Cloud Ave, Austin, TX 73301',
 '[{"degree": "B.S. Computer Engineering", "institution": "Georgia Tech", "year": 2017}]',
 '["AWS", "Docker", "Kubernetes", "Linux", "Terraform", "CI/CD", "Python", "Bash", "Jenkins", "Ansible", "Prometheus"]',
 '["AWS Solutions Architect Associate", "CKA - Certified Kubernetes Administrator"]',
 '[{"title": "DevOps Engineer", "company": "Netflix", "duration": "3 years"}, {"title": "Systems Engineer", "company": "Spotify", "duration": "2 years"}]',
 '[{"name": "Auto-scaling Infrastructure", "description": "Designed auto-scaling infrastructure reducing costs by 40%"}]',
 '["Python", "Bash", "Go", "YAML"]',
 '["AWS Console", "Terraform", "Docker Desktop", "Kubernetes Dashboard", "Grafana"]',
 'resumes/alex_petrov_resume.pdf', 'approved', 2),

(4, 'Nina', 'Blackwell', 'nina.blackwell@email.com', '+1-555-0402', '258 Server Rd, Denver, CO 80201',
 '[{"degree": "B.S. Information Technology", "institution": "Colorado State University", "year": 2020}]',
 '["AWS", "Docker", "Linux", "CI/CD", "Python", "Bash"]',
 '["AWS Cloud Practitioner"]',
 '[{"title": "Junior DevOps Engineer", "company": "Oracle", "duration": "2 years"}]',
 NULL,
 '["Python", "Bash"]',
 '["AWS Console", "Docker Desktop", "Jenkins"]',
 'resumes/nina_blackwell_resume.pdf', 'pending', 2),

(5, 'Tyler', 'Brooks', 'tyler.brooks@email.com', '+1-555-0501', '369 Campus Rd, New York, NY 10003',
 '[{"degree": "B.A. Marketing (In Progress)", "institution": "NYU", "year": 2025}]',
 '["Social Media", "Content Writing", "Microsoft Office", "Canva", "Google Analytics", "Communication Skills"]',
 NULL,
 '[{"title": "Social Media Coordinator", "company": "Campus Marketing Club", "duration": "1 year"}]',
 '[{"name": "Brand Awareness Campaign", "description": "Increased club social media following by 200% in 6 months"}]',
 NULL,
 '["Canva", "Microsoft Office", "Google Analytics", "Hootsuite"]',
 'resumes/tyler_brooks_resume.pdf', 'under_review', 2),

(5, 'Mia', 'Johnson', 'mia.johnson@email.com', '+1-555-0502', '741 University Blvd, Boston, MA 02101',
 '[{"degree": "B.S. Communications (In Progress)", "institution": "Boston University", "year": 2025}]',
 '["Social Media", "Content Writing", "Microsoft Office", "Communication Skills", "Adobe Creative Suite"]',
 NULL,
 NULL,
 '[{"name": "University Newsletter", "description": "Editor of weekly university newsletter reaching 5000+ students"}]',
 NULL,
 '["Microsoft Office", "Canva", "Adobe Photoshop"]',
 'resumes/mia_johnson_resume.pdf', 'pending', 1);

-- -----------------------------------------------------------
-- Resume Scores (AI-generated sample scores)
-- -----------------------------------------------------------
INSERT INTO resume_scores (applicant_id, job_id, overall_score, skills_score, experience_score, education_score, certification_score, projects_score, matched_skills, missing_skills, strengths, weaknesses, confidence_level, hiring_recommendation, ai_summary, ai_explanation, ai_model) VALUES
(1, 1, 94.50, 95.00, 95.00, 98.00, 100.00, 85.00,
 '["JavaScript", "TypeScript", "React", "Node.js", "SQL", "Git", "REST APIs", "System Design", "AWS", "Docker", "Agile"]',
 '["Kubernetes", "GraphQL"]',
 '["Extensive full-stack experience with top tech companies", "Strong alignment with required tech stack", "Advanced degree from top-tier university", "All required certifications obtained"]',
 '["Limited Kubernetes experience", "No GraphQL exposure mentioned"]',
 96.00, 'strongly_recommend',
 'Michael Thompson is an exceptional candidate for the Senior Software Engineer position. With 5+ years at Google and Meta, an M.S. from MIT, and strong alignment with the required tech stack, he exceeds expectations across nearly all evaluation criteria.',
 'Skills Match (95/100): Matches 11 out of 15 required and preferred skills including all core requirements (JavaScript, TypeScript, React, Node.js, SQL, Git, REST APIs, System Design). Missing only Kubernetes and GraphQL from preferred skills.\n\nExperience (95/100): 5 years of experience at top-tier companies (Google, Meta) directly aligns with the 5-10 year requirement. Demonstrated ability to build scalable systems.\n\nEducation (98/100): M.S. Computer Science from MIT and B.S. from Stanford significantly exceeds the bachelor''s degree requirement.\n\nCertifications (100/100): Holds both listed certifications (AWS Certified Developer, Certified Scrum Master).\n\nProjects (85/100): E-commerce platform project demonstrates scalability skills, though more project examples would strengthen this area.',
 'gemma'),

(2, 1, 68.50, 70.00, 65.00, 75.00, 0.00, 70.00,
 '["JavaScript", "React", "Node.js", "SQL", "Git", "REST APIs"]',
 '["TypeScript", "System Design", "AWS", "Docker", "Kubernetes", "GraphQL"]',
 '["Solid core JavaScript and React experience", "Relevant industry experience at Salesforce"]',
 '["Missing TypeScript - a required skill", "No system design experience mentioned", "No cloud platform certifications", "Below the minimum 5-year experience requirement"]',
 72.00, 'consider',
 'Jessica Williams shows solid foundational skills but falls short of the senior-level requirements. With 4 years of experience and missing critical skills like TypeScript and System Design, she would be better suited for a mid-level role.',
 'Skills Match (70/100): Matches 6 out of 8 required skills but critically missing TypeScript and System Design which are core requirements.\n\nExperience (65/100): 4 years total experience is slightly below the 5-year minimum. Role at Salesforce is relevant but tenure is moderate.\n\nEducation (75/100): B.S. in Software Engineering from UC Berkeley meets the education requirement.\n\nCertifications (0/100): No certifications listed.\n\nProjects (70/100): Task management project shows full-stack capability but lacks scale.',
 'gemma'),

(3, 1, 42.00, 45.00, 30.00, 65.00, 0.00, 40.00,
 '["JavaScript", "React", "Python", "SQL", "Git"]',
 '["TypeScript", "Node.js", "REST APIs", "System Design", "AWS", "Docker"]',
 '["Amazon work experience", "Strong fundamentals in JavaScript and Python"]',
 '["Only 2 years of experience - well below 5-year minimum", "Missing critical required skills", "No certifications", "No significant project portfolio"]',
 55.00, 'not_recommended',
 'David Kim lacks the seniority and breadth of skills needed for this Senior Software Engineer role. With only 2 years of experience and missing several required technologies, he is not recommended for this position at this time.',
 'Skills Match (45/100): Matches 5 out of 8 required skills. Missing critical requirements: TypeScript, Node.js, REST APIs, System Design.\n\nExperience (30/100): Only 2 years - significantly below the 5-year minimum requirement.\n\nEducation (65/100): B.S. from University of Washington meets basic requirement.\n\nCertifications (0/100): No certifications.\n\nProjects (40/100): No notable projects listed.',
 'gemma'),

(4, 2, 92.00, 90.00, 95.00, 95.00, 100.00, 80.00,
 '["Python", "SQL", "R", "Tableau", "Power BI", "Excel", "Statistical Analysis", "Data Visualization", "Machine Learning"]',
 '["Hadoop", "ETL"]',
 '["Advanced degree in Statistics from Oxford", "Strong analytical background at Big 4 firms", "Both required certifications obtained", "Machine learning expertise is a bonus"]',
 '["No Hadoop experience", "No ETL pipeline experience mentioned"]',
 94.00, 'strongly_recommend',
 'Amanda Foster is an outstanding candidate for the Data Analyst position. Her advanced Statistics degree from Oxford, 5 years at top consulting firms, and comprehensive skill set make her ideal for this role.',
 'Skills Match (90/100): Matches 9 out of 11 required and preferred skills. Exceeds requirements with Machine Learning knowledge.\n\nExperience (95/100): 5 years at Deloitte and KPMG - premier analytics experience.\n\nEducation (95/100): M.S. Statistics from Oxford far exceeds requirements.\n\nCertifications (100/100): Holds both listed certifications.\n\nProjects (80/100): Customer segmentation project shows practical ML application.',
 'gemma'),

(5, 2, 55.00, 55.00, 40.00, 70.00, 60.00, 30.00,
 '["Python", "SQL", "Excel", "Tableau", "Data Visualization"]',
 '["R", "Machine Learning", "Power BI", "ETL", "Hadoop", "Statistical Analysis"]',
 '["Core Python and SQL skills present", "Tableau experience", "Relevant internship at IBM"]',
 '["Only 1 year of experience", "Missing advanced statistical skills", "Limited project portfolio", "No R programming experience"]',
 60.00, 'consider',
 'Robert Chang meets basic requirements but lacks the depth of experience and advanced skills needed. Could grow into the role with mentoring.',
 'Skills Match (55/100): Matches 5 out of 6 required skills but missing Statistical Analysis.\n\nExperience (40/100): Only 1 year as intern - below 2-year minimum.\n\nEducation (70/100): B.S. Data Science meets requirement.\n\nCertifications (60/100): Has one of two preferred certifications.\n\nProjects (30/100): No notable projects listed.',
 'gemma'),

(6, 3, 96.00, 98.00, 95.00, 95.00, 0.00, 90.00,
 '["Figma", "Adobe XD", "Sketch", "User Research", "Wireframing", "Prototyping", "Design Systems", "HTML/CSS", "Illustration"]',
 '["Motion Design", "A/B Testing"]',
 '["Exceptional design portfolio at Apple and Airbnb", "Advanced degree from RISD", "Complete coverage of required skills", "Proven design system creation ability"]',
 '["No motion design experience mentioned", "No A/B testing experience listed"]',
 97.00, 'strongly_recommend',
 'Sophia Martinez is an exceptional UX/UI Designer candidate. Her experience at Apple and Airbnb, combined with an MFA from RISD and mastery of all required tools, makes her a top-tier candidate.',
 'Skills Match (98/100): Matches all 6 required skills plus 3 preferred skills.\n\nExperience (95/100): 5 years at Apple and Airbnb - world-class design experience.\n\nEducation (95/100): MFA from RISD is premier design education.\n\nCertifications (N/A): No certifications required for this role. Score normalized.\n\nProjects (90/100): Design system creation demonstrates leadership and scalable thinking.',
 'gemma'),

(7, 4, 89.00, 92.00, 85.00, 75.00, 90.00, 85.00,
 '["AWS", "Docker", "Kubernetes", "Linux", "Terraform", "CI/CD", "Python", "Bash", "Jenkins", "Ansible", "Prometheus"]',
 '["Azure", "GCP", "Grafana"]',
 '["Comprehensive DevOps toolkit", "Experience at Netflix and Spotify", "Two key certifications", "Strong automation background"]',
 '["No multi-cloud experience (Azure, GCP)", "No Grafana experience mentioned"]',
 90.00, 'strongly_recommend',
 'Alex Petrov is a strong DevOps candidate with excellent experience at Netflix and Spotify. His comprehensive skill set and relevant certifications make him well-qualified.',
 'Skills Match (92/100): Matches all 8 required skills plus 3 preferred skills.\n\nExperience (85/100): 5 years of relevant experience at top tech companies.\n\nEducation (75/100): B.S. Computer Engineering meets requirement.\n\nCertifications (90/100): Holds 2 of 3 listed certifications.\n\nProjects (85/100): Auto-scaling project demonstrates cost optimization skills.',
 'gemma'),

(8, 4, 48.00, 50.00, 35.00, 60.00, 30.00, 20.00,
 '["AWS", "Docker", "Linux", "CI/CD", "Python", "Bash"]',
 '["Kubernetes", "Terraform", "Ansible", "Jenkins", "Prometheus", "Grafana", "Azure", "GCP"]',
 '["Core AWS and Docker skills present", "Linux fundamentals"]',
 '["Missing Kubernetes and Terraform - critical required skills", "Only 2 years experience - below 4-year minimum", "Basic AWS certification only", "No notable projects"]',
 55.00, 'not_recommended',
 'Nina Blackwell has foundational DevOps skills but significantly lacks the required experience and advanced tooling expertise needed for this role.',
 'Skills Match (50/100): Matches 6 of 8 required skills but missing critical Kubernetes and Terraform.\n\nExperience (35/100): 2 years - well below 4-year minimum.\n\nEducation (60/100): B.S. IT is acceptable but not ideal.\n\nCertifications (30/100): Only AWS Cloud Practitioner - entry-level cert.\n\nProjects (20/100): No notable projects.',
 'gemma'),

(9, 5, 78.00, 80.00, 60.00, 70.00, 0.00, 85.00,
 '["Social Media", "Content Writing", "Microsoft Office", "Canva", "Google Analytics", "Communication Skills"]',
 '["Adobe Creative Suite", "SEO"]',
 '["Strong social media skills", "Google Analytics experience", "Impressive project results (200% growth)"]',
 '["No Adobe Creative Suite experience", "No SEO knowledge", "Limited formal experience"]',
 75.00, 'recommend',
 'Tyler Brooks is a strong intern candidate with demonstrated social media success and relevant tool proficiency. His campus marketing results are impressive.',
 'Skills Match (80/100): Matches all 4 required skills plus 2 preferred.\n\nExperience (60/100): 1 year campus experience - appropriate for internship.\n\nEducation (70/100): Marketing degree in progress at NYU.\n\nCertifications (N/A): Not required for internship.\n\nProjects (85/100): 200% social media growth demonstrates real impact.',
 'gemma'),

(10, 5, 62.00, 65.00, 20.00, 65.00, 0.00, 70.00,
 '["Social Media", "Content Writing", "Microsoft Office", "Communication Skills", "Adobe Creative Suite"]',
 '["Google Analytics", "SEO", "Canva"]',
 '["Adobe Creative Suite is a strong plus", "Good communication foundation"]',
 '["No professional experience", "No Google Analytics knowledge", "Missing Canva experience"]',
 58.00, 'consider',
 'Mia Johnson has the core communication skills but lacks practical experience and some technical tools. She shows potential but is behind other candidates.',
 'Skills Match (65/100): Matches 4 of 4 required skills plus Adobe Creative Suite.\n\nExperience (20/100): No professional or extracurricular experience.\n\nEducation (65/100): Communications degree in progress.\n\nCertifications (N/A): Not required.\n\nProjects (70/100): Newsletter editing shows writing capability.',
 'gemma');

-- -----------------------------------------------------------
-- HR Notes
-- -----------------------------------------------------------
INSERT INTO hr_notes (applicant_id, user_id, note) VALUES
(1, 1, 'Excellent candidate. Schedule for final interview with Engineering Director.'),
(1, 2, 'Technical screening passed with flying colors. Strong system design skills.'),
(2, 2, 'Good potential but may need TypeScript training. Consider for mid-level role.'),
(4, 1, 'Outstanding data analytics background. Fast-track for onboarding.'),
(6, 1, 'Portfolio is exceptional. Best UX candidate we''ve seen this quarter.'),
(7, 2, 'Strong DevOps background. Check availability for start date.'),
(9, 2, 'Impressive social media results for a student. Good culture fit.');

-- -----------------------------------------------------------
-- Activity Logs
-- -----------------------------------------------------------
INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES
(1, 'User Login', 'user', 1, '{"method": "email"}'),
(1, 'Job Created', 'job', 1, '{"title": "Senior Software Engineer"}'),
(1, 'Job Created', 'job', 2, '{"title": "Data Analyst"}'),
(1, 'Job Created', 'job', 3, '{"title": "UX/UI Designer"}'),
(1, 'Job Created', 'job', 4, '{"title": "DevOps Engineer"}'),
(2, 'Job Created', 'job', 5, '{"title": "Marketing Intern"}'),
(2, 'Resume Uploaded', 'applicant', 1, '{"name": "Michael Thompson", "job": "Senior Software Engineer"}'),
(2, 'Resume Uploaded', 'applicant', 2, '{"name": "Jessica Williams", "job": "Senior Software Engineer"}'),
(2, 'Resume Uploaded', 'applicant', 3, '{"name": "David Kim", "job": "Senior Software Engineer"}'),
(1, 'Resume Uploaded', 'applicant', 4, '{"name": "Amanda Foster", "job": "Data Analyst"}'),
(1, 'Resume Uploaded', 'applicant', 5, '{"name": "Robert Chang", "job": "Data Analyst"}'),
(1, 'Resume Uploaded', 'applicant', 6, '{"name": "Sophia Martinez", "job": "UX/UI Designer"}'),
(2, 'Resume Uploaded', 'applicant', 7, '{"name": "Alex Petrov", "job": "DevOps Engineer"}'),
(2, 'Resume Uploaded', 'applicant', 8, '{"name": "Nina Blackwell", "job": "DevOps Engineer"}'),
(2, 'Resume Uploaded', 'applicant', 9, '{"name": "Tyler Brooks", "job": "Marketing Intern"}'),
(1, 'Resume Uploaded', 'applicant', 10, '{"name": "Mia Johnson", "job": "Marketing Intern"}'),
(1, 'Applicant Approved', 'applicant', 1, '{"name": "Michael Thompson"}'),
(1, 'Applicant Approved', 'applicant', 4, '{"name": "Amanda Foster"}'),
(1, 'Applicant Approved', 'applicant', 6, '{"name": "Sophia Martinez"}'),
(2, 'Applicant Approved', 'applicant', 7, '{"name": "Alex Petrov"}');

-- -----------------------------------------------------------
-- Notifications
-- -----------------------------------------------------------
INSERT INTO notifications (user_id, title, message, type, is_read, link) VALUES
(1, 'New Applicant', 'Michael Thompson applied for Senior Software Engineer', 'info', 1, '/applicants/1'),
(1, 'New Applicant', 'Amanda Foster applied for Data Analyst', 'info', 1, '/applicants/4'),
(1, 'New Applicant', 'Sophia Martinez applied for UX/UI Designer', 'info', 1, '/applicants/6'),
(1, 'High Match Score', 'Sophia Martinez scored 96% for UX/UI Designer', 'success', 0, '/applicants/6'),
(1, 'New Applicant', 'Mia Johnson applied for Marketing Intern', 'info', 0, '/applicants/10'),
(2, 'Applicant Approved', 'Michael Thompson has been approved for Senior Software Engineer', 'success', 1, '/applicants/1'),
(2, 'New Applicant', 'David Kim applied for Senior Software Engineer', 'info', 0, '/applicants/3'),
(2, 'New Applicant', 'Nina Blackwell applied for DevOps Engineer', 'info', 0, '/applicants/8'),
(2, 'New Applicant', 'Tyler Brooks applied for Marketing Intern', 'info', 1, '/applicants/9');

-- -----------------------------------------------------------
-- AI Configuration
-- -----------------------------------------------------------
INSERT INTO ai_config (config_key, config_value, description, updated_by) VALUES
('ai_model', 'gemma', 'Primary AI model for resume scoring (gemma, llama3, fallback)', 1),
('ollama_url', 'http://localhost:11434', 'Ollama API endpoint URL', 1),
('skills_weight', '0.40', 'Weight for skills match in scoring formula', 1),
('experience_weight', '0.30', 'Weight for experience match in scoring formula', 1),
('education_weight', '0.15', 'Weight for education match in scoring formula', 1),
('certification_weight', '0.10', 'Weight for certification match in scoring formula', 1),
('projects_weight', '0.05', 'Weight for projects match in scoring formula', 1),
('min_score_threshold', '50', 'Minimum score threshold for recommendations', 1);

-- ============================================================
-- END OF SCHEMA
-- ============================================================
