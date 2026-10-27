require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const runMigration = async () => {
  console.log('Connecting to Supabase...');
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected! Reading schema.sql...');
    
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Executing schema.sql...');
    await client.query(schemaSql);
    
    console.log('✅ Schema migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await client.end();
  }
};

runMigration();
