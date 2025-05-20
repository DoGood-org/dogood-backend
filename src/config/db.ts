import { Pool } from 'pg';
import logger from '../utils/logger';
import { POSTGRES_URI } from './env.js';

const pool = new Pool({
  connectionString:
    POSTGRES_URI || 'postgresql://user:password@localhost:5432/mydatabase',
  ssl: {
    rejectUnauthorized: false, // обязательно для Render
  },
});

const connectDB = async (): Promise<void> => {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    logger.info('✅ PostgreSQL connected');
  } catch (error) {
    logger.error(`❌ PostgreSQL Connection Error: ${error}`);
    process.exit(1);
  }
};

export { connectDB, pool };
