// src/services/env.ts

import dotenv from 'dotenv';
dotenv.config();

export const POSTGRES_URI = process.env.POSTGRES_URI;
export const NODE_ENV = process.env.NODE_ENV;
export const PORT = process.env.PORT;
export const LOG_LEVEL = process.env.LOG_LEVEL;
