-- ============================================================
-- ResuMatch — AI-Driven Applicant Tracking System
-- Database Schema for PostgreSQL (Supabase Compatible)
-- ============================================================

-- ============================================================
-- TABLE: users
-- ============================================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
    avatar VARCHAR(500) DEFAULT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login TIMESTAMP DEFAULT NULL,
    reset_token VARCHAR(255) DEFAULT NULL,
    reset_token_expires TIMESTAMP DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);

-- ============================================================
-- TABLE: jobs
-- ============================================================
CREATE TABLE jobs (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    department VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    required_skills JSONB DEFAULT NULL,
    preferred_skills JSONB DEFAULT NULL,
    required_education VARCHAR(255) DEFAULT NULL,
    min_experience INT DEFAULT 0,
    max_experience INT DEFAULT NULL,
    certifications JSONB DEFAULT NULL,
    employment_type VARCHAR(50) NOT NULL DEFAULT 'full-time' CHECK (employment_type IN ('full-time', 'part-time', 'contract', 'internship', 'temporary')),
    location VARCHAR(255) DEFAULT NULL,
    salary_min DECIMAL(12,2) DEFAULT NULL,
    salary_max DECIMAL(12,2) DEFAULT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'archived', 'draft')),
    created_by INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_department ON jobs(department);
CREATE INDEX idx_jobs_created_by ON jobs(created_by);

-- ============================================================
-- TABLE: resumes
-- ============================================================
CREATE TABLE resumes (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    storage_url TEXT DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_resumes_user ON resumes(user_id);

-- ============================================================
-- TABLE: applicants
-- ============================================================
CREATE TABLE applicants (
    id SERIAL PRIMARY KEY,
    job_id INT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE ON UPDATE CASCADE,
    first_name VARCHAR(100) DEFAULT NULL,
    last_name VARCHAR(100) DEFAULT NULL,
    email VARCHAR(255) DEFAULT NULL,
    phone VARCHAR(50) DEFAULT NULL,
    address TEXT DEFAULT NULL,
    education JSONB DEFAULT NULL,
    skills JSONB DEFAULT NULL,
    certifications JSONB DEFAULT NULL,
    experience JSONB DEFAULT NULL,
    projects JSONB DEFAULT NULL,
    programming_languages JSONB DEFAULT NULL,
    software_tools JSONB DEFAULT NULL,
    resume_file VARCHAR(500) NOT NULL,
    resume_text TEXT DEFAULT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected')),
    uploaded_by INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_applicants_job_id ON applicants(job_id);
CREATE INDEX idx_applicants_status ON applicants(status);
CREATE INDEX idx_applicants_email ON applicants(email);
CREATE INDEX idx_applicants_uploaded_by ON applicants(uploaded_by);

-- ============================================================
-- TABLE: resume_scores
-- ============================================================
CREATE TABLE resume_scores (
    id SERIAL PRIMARY KEY,
    applicant_id INT NOT NULL REFERENCES applicants(id) ON DELETE CASCADE ON UPDATE CASCADE,
    job_id INT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE ON UPDATE CASCADE,
    overall_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    skills_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    experience_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    education_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    certification_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    projects_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    matched_skills JSONB DEFAULT NULL,
    missing_skills JSONB DEFAULT NULL,
    strengths JSONB DEFAULT NULL,
    weaknesses JSONB DEFAULT NULL,
    confidence_level DECIMAL(5,2) DEFAULT NULL,
    hiring_recommendation VARCHAR(50) DEFAULT 'consider' CHECK (hiring_recommendation IN ('strongly_recommend', 'recommend', 'consider', 'not_recommended')),
    ai_summary TEXT DEFAULT NULL,
    ai_explanation TEXT DEFAULT NULL,
    ai_model VARCHAR(100) DEFAULT NULL,
    scored_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_scores_applicant ON resume_scores(applicant_id);
CREATE INDEX idx_scores_job ON resume_scores(job_id);
CREATE INDEX idx_scores_overall ON resume_scores(overall_score);

-- ============================================================
-- TABLE: hr_notes
-- ============================================================
CREATE TABLE hr_notes (
    id SERIAL PRIMARY KEY,
    applicant_id INT NOT NULL REFERENCES applicants(id) ON DELETE CASCADE ON UPDATE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    note TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notes_applicant ON hr_notes(applicant_id);
CREATE INDEX idx_notes_user ON hr_notes(user_id);

-- ============================================================
-- TABLE: activity_logs
-- ============================================================
CREATE TABLE activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INT DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(50) DEFAULT NULL,
    entity_id INT DEFAULT NULL,
    details JSONB DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_logs_user ON activity_logs(user_id);
CREATE INDEX idx_logs_action ON activity_logs(action);
CREATE INDEX idx_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_logs_created ON activity_logs(created_at);

-- ============================================================
-- TABLE: notifications
-- ============================================================
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INT DEFAULT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    link VARCHAR(500) DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at);

-- ============================================================
-- TABLE: ai_config
-- ============================================================
CREATE TABLE ai_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT NOT NULL,
    description VARCHAR(500) DEFAULT NULL,
    updated_by INT DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Note: We also need a trigger for updated_at if we want the equivalent of ON UPDATE CURRENT_TIMESTAMP
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_modtime BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_jobs_modtime BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_applicants_modtime BEFORE UPDATE ON applicants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_hr_notes_modtime BEFORE UPDATE ON hr_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_config_modtime BEFORE UPDATE ON ai_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- SAMPLE DATA (Simplified)
-- Users (passwords are bcrypt hashed: "Password123!")
-- ============================================================
INSERT INTO users (first_name, last_name, email, password, role, is_active) VALUES
('Sarah', 'Mitchell', 'admin@reedelsevier.com', '$2b$10$8K1p/a0dR1xqM8KJmLyKCOYzGT/SbR0bPgNJKP8sF/tQ2x5Ij1XPi', 'admin', TRUE),
('James', 'Rodriguez', 'staff@reedelsevier.com', '$2b$10$8K1p/a0dR1xqM8KJmLyKCOYzGT/SbR0bPgNJKP8sF/tQ2x5Ij1XPi', 'staff', TRUE),
('Emily', 'Chen', 'emily.chen@reedelsevier.com', '$2b$10$8K1p/a0dR1xqM8KJmLyKCOYzGT/SbR0bPgNJKP8sF/tQ2x5Ij1XPi', 'staff', TRUE);

-- We'll insert a few jobs just for testing.
INSERT INTO jobs (title, department, description, required_skills, preferred_skills, required_education, employment_type, location, status, created_by) VALUES
('Senior Software Engineer', 'Engineering', 'Sample desc', '["JavaScript", "React"]', '["AWS"]', 'Bachelor''s', 'full-time', 'New York, NY', 'active', 1);

INSERT INTO ai_config (config_key, config_value, description, updated_by) VALUES
('ai_model', 'gemma', 'Primary AI model for resume scoring', 1),
('ollama_url', 'http://localhost:11434', 'Ollama API endpoint URL', 1),
('min_score_threshold', '50', 'Minimum score threshold', 1);
