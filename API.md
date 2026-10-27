# ResuMatch API Documentation

## Authentication Endpoints

### \`POST /api/auth/login\`
Logs in a user.
- **Body**: \`{ email, password }\`
- **Response**: \`{ token, user: { id, firstName, lastName, email, role } }\`

### \`GET /api/auth/profile\`
Gets the current user's profile.
- **Headers**: \`Authorization: Bearer <token>\`
- **Response**: \`{ id, firstName, lastName, email, role, ... }\`

---

## Jobs Endpoints

### \`GET /api/jobs\`
Retrieves a paginated list of jobs.
- **Query Params**: \`page, limit, status, search, department\`

### \`POST /api/jobs\` (Admin Only)
Creates a new job.
- **Body**: \`{ title, department, description, requiredSkills, ... }\`

---

## Applicants Endpoints

### \`GET /api/applicants\`
Retrieves a list of applicants.
- **Query Params**: \`page, limit, jobId, status, minScore, search\`

### \`GET /api/applicants/:id\`
Retrieves full details of an applicant including parsed resume data and AI scores.

### \`PATCH /api/applicants/:id/status\`
Updates the applicant status.
- **Body**: \`{ status: 'pending' | 'under_review' | 'approved' | 'rejected' }\`

---

## Resumes Endpoints

### \`POST /api/resumes/upload\`
Uploads a resume file (PDF/DOCX), parses it, and triggers AI scoring.
- **Form Data**: \`resume\` (file), \`jobId\`

### \`POST /api/resumes/:id/rescore\` (Admin Only)
Re-triggers the AI scoring for an existing applicant.

---

## Users Endpoints (Admin Only)

### \`GET /api/users\`
Retrieves all HR users.

### \`POST /api/auth/register\` (Admin Only)
Creates a new HR user account.
- **Body**: \`{ firstName, lastName, email, password, role }\`

---

## Reports & Analytics

### \`GET /api/analytics/dashboard-stats\`
Retrieves high-level counts for the dashboard.

### \`POST /api/reports/generate\`
Generates a downloadable report.
- **Body**: \`{ type: 'applicants', format: 'pdf' | 'excel' | 'csv' }\`
- **Response**: File buffer download.
