import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  try {
    await pool.query("ALTER TABLE grades ADD COLUMN IF NOT EXISTS name VARCHAR(255), ADD COLUMN IF NOT EXISTS description TEXT");
    console.log("Migration successful: added name and description to grades table");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await pool.end();
  }
}

migrate();
