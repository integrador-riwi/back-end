import { Pool } from 'pg';
import dotenv from 'dotenv';

// IMPORTANT: Load environment variables first
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function getUsers() {
  try {
    const result = await pool.query('SELECT * FROM users');
    return result.rows;
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
}

// Then call it when needed:
getUsers().then(users => console.log(users));

export default pool;


