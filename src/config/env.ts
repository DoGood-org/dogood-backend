import { config } from 'dotenv';

config({ path: `.env.${process.env.NODE_ENV || 'development'}.local` });

export const {
  PORT,
  NODE_ENV,
  DATABASE_URL,
  LOG_LEVEL,
  JWT_SECRET,
  JWT_EXPIRATION,
  JWT_REFRESH_SECRET,
  JWT_REFRESH_EXPIRATION,
  BASE_URL,
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  OPENAI_API_KEY,
  REDIS_HOST,
  REDIS_PORT,
  REDIS_PASSWORD,
  REDIS_USE_TLS,
} = process.env;
