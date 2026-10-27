require('dotenv').config();
const { pool } = require('../config/db');

async function run() {
  console.log('🌱 Seeding demo accounts with correct identities...\n');

  // Delete existing
  await pool.query("DELETE FROM auth.identities WHERE provider = 'email' AND email IN ('admin@resumatch.com', 'applicant@resumatch.com')");
  await pool.query("DELETE FROM auth.users WHERE email IN ('admin@resumatch.com', 'applicant@resumatch.com')");
  console.log('Deleted old users and identities');

  const accounts = [
    { email: 'admin@resumatch.com', password: 'admin123', name: 'Admin Hr' },
    { email: 'applicant@resumatch.com', password: 'applicant123', name: 'Demo Applicant' }
  ];

  for (const acc of accounts) {
    // Insert user with correct password hash
    const userResult = await pool.query(`
      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
      ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(), 'authenticated', 'authenticated',
        $1,
        crypt($2, gen_salt('bf')),
        NOW(),
        '{"provider":"email","providers":["email"]}',
        $3,
        NOW(), NOW()
      ) RETURNING id, email
    `, [acc.email, acc.password, JSON.stringify({ full_name: acc.name })]);

    const userId = userResult.rows[0].id;
    console.log(`Created user: ${acc.email} (id: ${userId})`);

    // CRITICAL: Insert matching identity row (email is a generated column, don't insert it)
    await pool.query(`
      INSERT INTO auth.identities (
        provider_id, user_id, provider, identity_data, last_sign_in_at, created_at, updated_at
      ) VALUES (
        $1,
        $2,
        'email',
        $3,
        NOW(), NOW(), NOW()
      )
    `, [userId, userId, JSON.stringify({ sub: userId, email: acc.email })]);

    console.log(`Created identity for: ${acc.email}`);
  }

  // Verify
  const users = await pool.query('SELECT email FROM auth.users');
  const identities = await pool.query('SELECT email FROM auth.identities');
  console.log('\n✅ Users:', users.rows.map(r => r.email));
  console.log('✅ Identities:', identities.rows.map(r => r.email));
  console.log('\n🎉 Ready to log in:');
  console.log('   admin@resumatch.com / admin123');
  console.log('   applicant@resumatch.com / applicant123');
  process.exit(0);
}

run().catch(e => { console.error('Error:', e.message); process.exit(1); });
