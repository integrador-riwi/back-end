import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  try {
    const res = await pool.query("SELECT table_name, column_name FROM information_schema.columns WHERE table_name IN ('rubrics', 'grades') ORDER BY table_name, column_name");
    res.rows.forEach(r => console.log(`${r.table_name}.${r.column_name}`));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

check();
