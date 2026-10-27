// ============================================================
// server/scripts/seed_firestore.js
// Seeds initial standard jobs and applicants into Firestore
// Run with: node scripts/seed_firestore.js (from server directory)
// ============================================================

require('dotenv').config();
const { adminDb } = require('../config/firebaseAdmin');
const { FieldValue } = require('firebase-admin/firestore');

const JOBS = [
  {
    title: 'Senior Software Engineer',
    department: 'Engineering',
    description: 'We are seeking a highly skilled Senior Software Engineer to join our Engineering team. The ideal candidate will design, develop, and maintain scalable software solutions. You will collaborate with cross-functional teams to deliver high-quality products that meet business requirements.',
    requiredSkills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'SQL', 'Git', 'REST APIs', 'System Design'],
    preferredSkills: ['AWS', 'Docker', 'Kubernetes', 'GraphQL', 'MongoDB', 'CI/CD', 'Agile'],
    requiredEducation: "Bachelor's degree in Computer Science or related field",
    minExperience: 5,
    maxExperience: 10,
    certifications: ['AWS Certified Developer', 'Certified Scrum Master'],
    employmentType: 'full-time',
    location: 'New York, NY',
    salaryMin: 120000,
    salaryMax: 180000,
    status: 'active',
    applicantCount: 3,
  },
  {
    title: 'Data Analyst',
    department: 'Engineering',
    description: 'Looking for a Data Analyst to transform raw data into actionable insights. You will work closely with stakeholders to understand data needs, build dashboards, and support data-driven decision making across the organization.',
    requiredSkills: ['Python', 'SQL', 'Excel', 'Tableau', 'Data Visualization', 'Statistical Analysis'],
    preferredSkills: ['Power BI', 'R', 'Machine Learning', 'ETL', 'Hadoop'],
    requiredEducation: "Bachelor's degree in Statistics, Mathematics, or related field",
    minExperience: 2,
    maxExperience: 5,
    certifications: ['Google Data Analytics Certificate', 'Tableau Certified'],
    employmentType: 'full-time',
    location: 'London, UK',
    salaryMin: 65000,
    salaryMax: 95000,
    status: 'active',
    applicantCount: 1,
  },
  {
    title: 'UX/UI Designer',
    department: 'Design',
    description: 'Join our Product Design team as a UX/UI Designer. You will create intuitive and visually compelling user interfaces for our digital products. Collaborate with product managers and engineers to translate user needs into elegant design solutions.',
    requiredSkills: ['Figma', 'Adobe XD', 'User Research', 'Wireframing', 'Prototyping', 'Design Systems'],
    preferredSkills: ['HTML/CSS', 'Sketch', 'Illustration', 'Motion Design', 'A/B Testing'],
    requiredEducation: "Bachelor's degree in Design, HCI, or related field",
    minExperience: 3,
    maxExperience: 7,
    certifications: [],
    employmentType: 'full-time',
    location: 'San Francisco, CA',
    salaryMin: 95000,
    salaryMax: 140000,
    status: 'active',
    applicantCount: 0,
  },
  {
    title: 'DevOps Engineer',
    department: 'Engineering',
    description: 'We need a DevOps Engineer to manage and optimize our cloud infrastructure. You will implement CI/CD pipelines, manage containerized deployments, and ensure system reliability and scalability.',
    requiredSkills: ['AWS', 'Docker', 'Kubernetes', 'Linux', 'CI/CD', 'Terraform', 'Python', 'Bash'],
    preferredSkills: ['Azure', 'GCP', 'Ansible', 'Jenkins', 'Prometheus', 'Grafana'],
    requiredEducation: "Bachelor's degree in Computer Science or related field",
    minExperience: 4,
    maxExperience: 8,
    certifications: ['AWS Solutions Architect', 'CKA', 'HashiCorp Terraform Associate'],
    employmentType: 'full-time',
    location: 'Remote',
    salaryMin: 110000,
    salaryMax: 165000,
    status: 'active',
    applicantCount: 0,
  },
  {
    title: 'Marketing Intern',
    department: 'Marketing',
    description: 'Exciting internship opportunity in our Marketing department. Assist with social media management, content creation, market research, and campaign analytics. Great opportunity to learn and grow in a professional environment.',
    requiredSkills: ['Social Media', 'Content Writing', 'Microsoft Office', 'Communication Skills'],
    preferredSkills: ['Adobe Creative Suite', 'Google Analytics', 'SEO', 'Canva'],
    requiredEducation: "Currently pursuing Bachelor's degree in Marketing or related field",
    minExperience: 0,
    maxExperience: 1,
    certifications: [],
    employmentType: 'internship',
    location: 'New York, NY',
    salaryMin: 20000,
    salaryMax: 30000,
    status: 'active',
    applicantCount: 0,
  }
];

async function seed() {
  console.log('\n🚀 Seeding Firestore with standard jobs and data...\n');

  const jobsColl = adminDb.collection('jobs');
  
  // Clear existing jobs if any
  const existingJobs = await jobsColl.get();
  for (const doc of existingJobs.docs) {
    await doc.ref.delete();
  }

  for (const job of JOBS) {
    const docRef = await jobsColl.add({
      ...job,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
    console.log(`✅ Added Job: "${job.title}" (ID: ${docRef.id})`);
  }

  console.log('\n✅ Firestore successfully seeded with standard jobs!\n');
  process.exit(0);
}

seed().catch(err => {
  console.error('Fatal seeding error:', err);
  process.exit(1);
});
