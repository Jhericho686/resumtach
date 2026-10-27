require('dotenv').config();
const { pool } = require('../config/db');

async function run() {
  // Delete the old wrongly-hashed users
  await pool.query("DELETE FROM auth.users WHERE email IN ('admin@resumatch.com', 'applicant@resumatch.com')");
  console.log('Deleted old users');
  
  // Insert admin with Supabase native bcrypt (crypt() + gen_salt())
  await pool.query(`
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(), 'authenticated', 'authenticated',
      'admin@resumatch.com',
      crypt('admin123', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Admin Hr"}',
      NOW(), NOW()
    )
  `);
  console.log('Created admin@resumatch.com / admin123');
  
  // Insert applicant
  await pool.query(`
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(), 'authenticated', 'authenticated',
      'applicant@resumatch.com',
      crypt('applicant123', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Demo Applicant"}',
      NOW(), NOW()
    )
  `);
  console.log('Created applicant@resumatch.com / applicant123');
  
  // Verify
  const r = await pool.query('SELECT id, email, email_confirmed_at FROM auth.users');
  console.log('\nUsers in DB:');
  r.rows.forEach(u => console.log(' -', u.email, '| confirmed:', !!u.email_confirmed_at));
  
  process.exit(0);
}

run().catch(e => { console.error('Error:', e.message); process.exit(1); });
