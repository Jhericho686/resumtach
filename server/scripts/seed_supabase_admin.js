// Re-seed using Supabase Admin API (correct password hashing)
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://moiylbzxksrgosndhnmy.supabase.co';
// We need the SERVICE ROLE KEY for admin user management
// Provide it here:
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY in .env!');
  console.log('   Add it to server/.env and run again.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function seed() {
  console.log('🌱 Creating demo accounts via Supabase Admin API...\n');

  const accounts = [
    { email: 'admin@resumatch.com', password: 'admin123', full_name: 'Admin Hr' },
    { email: 'applicant@resumatch.com', password: 'applicant123', full_name: 'Demo Applicant' }
  ];

  for (const acc of accounts) {
    // Delete existing first
    const { data: existing } = await supabase.auth.admin.listUsers();
    const found = existing?.users?.find(u => u.email === acc.email);
    if (found) {
      await supabase.auth.admin.deleteUser(found.id);
      console.log(`🗑️  Deleted existing: ${acc.email}`);
    }

    // Create fresh with correct password
    const { data, error } = await supabase.auth.admin.createUser({
      email: acc.email,
      password: acc.password,
      email_confirm: true,
      user_metadata: { full_name: acc.full_name }
    });

    if (error) {
      console.error(`❌ Failed to create ${acc.email}:`, error.message);
    } else {
      console.log(`✅ Created: ${acc.email} (id: ${data.user.id})`);
    }
  }

  console.log('\n✅ Done! Demo accounts ready:');
  console.log('   👑 admin@resumatch.com     / admin123');
  console.log('   👤 applicant@resumatch.com / applicant123\n');
  process.exit(0);
}

seed().catch(err => { console.error('Fatal:', err); process.exit(1); });
