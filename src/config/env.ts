import { config } from 'dotenv';

config({ path: `.env.${process.env.NODE_ENV || 'development'}.local` });

export const { PORT, NODE_ENV, DATABASE_URL, LOG_LEVEL, JWT_SECRET, JWT_EXPIRATION, JWT_REFRESH_SECRET, JWT_REFRESH_EXPIRATION, BASE_URL, DOGOOD_EMAIL, DOGOOD_PASSWORD } = process.env;
