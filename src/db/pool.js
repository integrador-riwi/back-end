import { Pool } from 'pg';
import config from '../config/env.js';

const poolConfig = config.db.connectionString
  ? {
      connectionString: config.db.connectionString,
      ssl: { rejectUnauthorized: false },
      max: config.db.max,
      idleTimeoutMillis: config.db.idleTimeoutMillis,
      connectionTimeoutMillis: config.db.connectionTimeoutMillis
    }
  : {
      host: config.db.host,
      port: config.db.port,
      database: config.db.database,
      user: config.db.user,
      password: config.db.password,
      ssl: config.db.ssl ? { rejectUnauthorized: false } : false,
      max: config.db.max,
      idleTimeoutMillis: config.db.idleTimeoutMillis,
      connectionTimeoutMillis: config.db.connectionTimeoutMillis
    };

const pool = new Pool(poolConfig);

pool.on('connect', () => {
  console.log('✅ Database connection established');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
});

const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Database connected successfully');
    client.release();
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
  }
};

testConnection();

export const ensureRuntimeSchema = async () => {
  try {
    await pool.query(`
      ALTER TABLE teams
      ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NULL
    `);

    await pool.query(`
      COMMENT ON COLUMN teams.closed_at IS
      'Timestamp when a team was closed to new invitations and join requests. NULL means open.'
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_individual_project_results_project_user
      ON individual_project_results(project_id, user_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_individual_area_results_project_user
      ON individual_area_results(project_id, user_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_evaluations_project_area
      ON evaluations(project_id, area)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_evaluations_event_project_area
      ON evaluations(event_id, project_id, area)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_rubrics_event_active_area
      ON rubrics(id_event, active, area)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_team_coders_team_user
      ON team_coders(id_team, id_user)
    `);

    console.log('✅ Runtime schema checked');
  } catch (err) {
    console.warn('⚠️ Runtime schema check skipped:', err.message);
  }
};

export default pool;
