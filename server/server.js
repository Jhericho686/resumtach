require('dotenv').config();
// Server entry point - Groq Cloud AI Llama 3.1 8B Instant active
const app = require('./app');
const pool = require('./config/db');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Verify database connection before starting server
    const connection = await pool.pool.connect();
    connection.release();
    console.log('✅ Connected to database');

    app.listen(PORT, () => {
      console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to connect to database. Server not started.');
    console.error(error.message);
    process.exit(1);
  }
};

startServer();
