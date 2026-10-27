require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const seedAdmin = async () => {
  try {
    const email = 'admin@gmail.com';
    const password = 'admin1234567';
    const firstName = 'Admin';
    const lastName = 'User';
    const role = 'admin';

    // Check if admin already exists
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      console.log('⚠️  Admin user already exists!');
      await pool.end();
      return;
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert admin user
    const result = await pool.query(
      `INSERT INTO users (first_name, last_name, email, password, role, is_active)
       VALUES ($1, $2, $3, $4, $5, true) RETURNING id`,
      [firstName, lastName, email, hashedPassword, role]
    );

    console.log('✅ Admin user created successfully!');
    console.log(`   ID:       ${result.rows[0].id}`);
    console.log(`   Email:    ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Role:     ${role}`);
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
  } finally {
    await pool.end();
  }
};

seedAdmin();
