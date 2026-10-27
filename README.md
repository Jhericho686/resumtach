# ResuMatch - AI-Driven Applicant Tracking System

ResuMatch is an enterprise-grade Applicant Tracking System (ATS) that utilizes Artificial Intelligence to automate resume screening, smartly rank applicants, and streamline the HR recruitment process.

## Architecture

- **Frontend**: React (Vite), TailwindCSS v3, React Router v6, Axios
- **Backend**: Node.js, Express.js
- **Database**: MySQL (compatible with XAMPP)
- **AI/NLP Engine**: Modular design supporting Ollama (Gemma/Llama) with a deterministic keyword-matching fallback.

## Prerequisites

- Node.js (v18+)
- XAMPP (or any MySQL instance running on port 3306)
- Ollama (Optional, for advanced AI scoring. If not running, the system gracefully degrades to keyword scoring).

## Setup Instructions

### 1. Database Setup
1. Start MySQL through XAMPP Control Panel.
2. Open phpMyAdmin or your MySQL client.
3. Import the database schema and sample data:
   - File: \`database/resumatch.sql\`

### 2. Backend Setup
1. Open a terminal and navigate to the \`server\` directory:
   \`\`\`bash
   cd server
   \`\`\`
2. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`
3. Start the server:
   \`\`\`bash
   npm run dev
   \`\`\`
   *(The server will run on http://localhost:5000)*

### 3. Frontend Setup
1. Open a new terminal and navigate to the \`client\` directory:
   \`\`\`bash
   cd client
   \`\`\`
2. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`
3. Start the Vite development server:
   \`\`\`bash
   npm run dev
   \`\`\`
   *(The app will be available at http://localhost:5173)*

### 4. Running Ollama (Optional)
To use Google Gemma for intelligent AI scoring:
1. Install [Ollama](https://ollama.com/)
2. Open a terminal and pull the Gemma model:
   \`\`\`bash
   ollama pull gemma
   \`\`\`
3. Ensure Ollama is running in the background.

## Sample Accounts (Passwords are all "Password123!")
- **HR Admin**: admin@reedelsevier.com
- **HR Staff**: staff@reedelsevier.com

## Key Features
- **Explainable AI**: Transparent AI scoring that shows exactly why a candidate received a specific score (strengths, weaknesses, missing skills).
- **Automated Resume Parsing**: Extracts structured data from PDF and DOCX files.
- **Gmail Compose Integration**: One-click approval/rejection opens a pre-filled Gmail window.
- **Role-Based Access Control**: Secure JWT-based authentication distinguishing Admin and Staff.
- **Modern UI**: Dark/Light mode support, responsive design, data tables, and interactive dashboards.
