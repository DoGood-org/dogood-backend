import { Pool } from 'pg';
import logger from '../utils/logger';
import { POSTGRES_URI } from '../config/env';

const pool = new Pool({
  connectionString:
    POSTGRES_URI || 'postgresql://user:password@localhost:5432/mydatabase',
  // ssl: {
  //   rejectUnauthorized: false, // обязательно для Render
  // },
  ssl: false,
});

const connectDB = async (): Promise<void> => {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    logger.info('✅ PostgreSQL connected');
  } catch (error) {
    logger.error(`❌ PostgreSQL Connection Error: ${error}`);
    throw new Error('DB connection failed');
  }
};

export { connectDB, pool };
