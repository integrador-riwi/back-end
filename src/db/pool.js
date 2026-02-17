import { Pool } from 'pg';
import dotenv from 'dotenv';

// IMPORTANT: Load environment variables first
dotenv.config();

console.log('Password loaded:', process.env.DB_PASSWORD ? 'YES ✓' : 'NO ✗');
console.log('Password length:', process.env.DB_PASSWORD?.length);

const pool = new Pool({
  host: 'db.yushxqtjeqlaphtqheai.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: process.env.DB_PASSWORD,
  ssl: false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
pool.query('SELECT * FROM users', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err);
  } else {
    console.log('✅ Database connected successfully at:', res);
  }
});

export default pool;
