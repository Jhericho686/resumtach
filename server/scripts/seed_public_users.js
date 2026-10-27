require('dotenv').config();
const { pool } = require('../config/db');

async function setup() {
  // Delete existing demo users from public table
  await pool.query("DELETE FROM users WHERE email = 'admin@resumatch.com'");
  await pool.query("DELETE FROM users WHERE email = 'applicant@resumatch.com'");
  console.log('Cleared old demo users');

  // Insert admin
  await pool.query(
    "INSERT INTO users (first_name, last_name, email, password, role, is_active, created_at, updated_at) VALUES ('Admin', 'Hr', 'admin@resumatch.com', 'supabase-auth', 'admin', true, NOW(), NOW())"
  );
  console.log('Inserted admin@resumatch.com with role=admin');

  // Insert applicant
  await pool.query(
    "INSERT INTO users (first_name, last_name, email, password, role, is_active, created_at, updated_at) VALUES ('Demo', 'Applicant', 'applicant@resumatch.com', 'supabase-auth', 'staff', true, NOW(), NOW())"
  );
  console.log('Inserted applicant@resumatch.com with role=staff');

  const r = await pool.query("SELECT id, email, role FROM users WHERE email = 'admin@resumatch.com' OR email = 'applicant@resumatch.com'");
  console.log('\nPublic users:', r.rows);
  process.exit(0);
}

setup().catch(e => { console.error('Error:', e.message); process.exit(1); });
