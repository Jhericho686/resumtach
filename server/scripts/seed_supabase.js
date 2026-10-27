require('dotenv').config();
const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');

async function seed() {
  console.log('🌱 Seeding demo accounts into Supabase Auth...');
  
  const adminPass = await bcrypt.hash('admin123', 10);
  const applicantPass = await bcrypt.hash('applicant123', 10);

  await pool.query("DELETE FROM auth.users WHERE email IN ('admin@resumatch.com', 'applicant@resumatch.com');");

  const query = `
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, 
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES 
    ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'admin@resumatch.com', $1, NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Admin Hr"}', NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'applicant@resumatch.com', $2, NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Demo Applicant"}', NOW(), NOW());
  `;

  await pool.query(query, [adminPass, applicantPass]);
  console.log('✅ Demo accounts (admin@resumatch.com / applicant@resumatch.com) seeded successfully into Supabase Auth!');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed error:', err);
  process.exit(1);
});
