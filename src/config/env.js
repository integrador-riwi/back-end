import 'dotenv/config';

const isProduction = process.env.NODE_ENV === 'production';

const requiredEnvVars = isProduction 
  ? ['JWT_SECRET']
  : ['DB_PASSWORD', 'JWT_SECRET'];

const missing = requiredEnvVars.filter(key => !process.env[key]);
if (missing.length > 0 && process.env.NODE_ENV !== 'test') {
  console.warn(`⚠️  Missing environment variables: ${missing.join(', ')}`);
}

export const config = {
  port: parseInt(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
  },
  
  db: {
    connectionString: process.env.DATABASE_URL || null,
    host: process.env.DB_HOST || 'db.yushxqtjeqlaphtqheai.supabase.co',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    ssl: process.env.DATABASE_URL 
      ? { rejectUnauthorized: false }
      : process.env.DB_SSL === 'true' || false,
    max: parseInt(process.env.DB_POOL_MAX) || 20,
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 2000
  },
  
  n8n: {
    webhookUrl: process.env.N8N_WEBHOOK_URL || ''
  },
  
  github: {
    token: process.env.GITHUB_TOKEN || '',
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET || ''
  },
  
  moodle: {
    url: process.env.MOODLE_URL || '',
    token: process.env.MOODLE_TOKEN || ''
  },
  
  client: {
    url: process.env.CLIENT_URL || 'http://localhost:5173'
  }
};

export default config;
