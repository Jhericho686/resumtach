const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  // Supabase PgBouncer drops idle connections; these settings keep them alive
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  max: 10
});

// Prevent unhandled pool errors from crashing the server
pool.on('error', (err) => {
  console.error('⚠️ Unexpected PostgreSQL pool error (non-fatal):', err.message);
});


// Wrapper to mimic mysql2/promise behavior for destructured arrays: const [rows, fields] = await pool.query(...)
const queryWrapper = async (text, params) => {
  // Convert ? to $1, $2, etc. safely (assumes ? is only used for parameters)
  if (params && params.length > 0) {
    let i = 1;
    text = text.replace(/\?/g, () => `$${i++}`);
  }
  
  // Convert MySQL backticks to standard SQL double quotes
  text = text.replace(/`/g, '"');
  
  try {
    const result = await pool.query(text, params);
    
    // Mimic mysql2 returned structure: [rows, fields] while retaining pg object properties
    if (result.command === 'INSERT') {
        const insertId = result.rows.length > 0 ? (result.rows[0].id || null) : null;
        const resultObj = { insertId, id: insertId, affectedRows: result.rowCount, rows: result.rows };
        const retArr = [resultObj, result.fields];
        retArr.rows = result.rows;
        retArr.insertId = insertId;
        retArr.rowCount = result.rowCount;
        return retArr;
    }
    
    if (result.command === 'UPDATE' || result.command === 'DELETE') {
        const resultObj = { affectedRows: result.rowCount, rows: result.rows };
        const retArr = [resultObj, result.fields];
        retArr.rows = result.rows;
        retArr.rowCount = result.rowCount;
        return retArr;
    }
    
    const retArr = [result.rows, result.fields];
    retArr.rows = result.rows;
    retArr.rowCount = result.rowCount;
    return retArr;
  } catch (error) {
    console.error('Query Error:', text, params, error.message);
    throw error;
  }
};

module.exports = {
  query: queryWrapper,
  pool: pool // Expose raw pool just in case
};
