import express, { Request, Response, NextFunction } from 'express';
import { AppError } from './types/error';
import cors from 'cors';
import { setupSwagger } from './config/swaggerConfig';
import * as apiRoutes from './routes/api';
import http from 'http';
import { Server } from 'socket.io';
import logger from './utils/logger';
import registerSocketHandlers from './sockets';
import cookieParser from 'cookie-parser';
import { setIO } from './utils/socketHandler';

const app = express();

// Настройка Swagger
setupSwagger(app);

// Cookie парсер для авторизации итд
app.use(cookieParser());

// Middleware
app.use(express.json());

app.use(
  cors({
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Requested-With',
      'X-CSRF-Token',
      'X-HTTP-Method-Override',
      'X-Token',
    ],
    exposedHeaders: ['X-Token'],
  })
);

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Регистрация обработчиков сокетов
setIO(io);
registerSocketHandlers(io);

// Маршрути
Object.entries(apiRoutes).forEach(([name, router]) => {
  const prefix = '/' + name.replace('Route', '').toLowerCase();
  app.use(prefix, router);
});

// Обробка 404 (не знайдено)
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: 'Not found' });
});

// Обробка серверних помилок
app.use((err: AppError, req: Request, res: Response, _next: NextFunction) => {
  const statusCode = err.status && Number.isInteger(err.status) ? err.status : 500;

  const message = err.message || 'Server error';
  const code = err.code || null;
  const details = err.details ?? null;

  logger.error(`Error: ${message} | Status: ${statusCode}`, {
    code,
    details,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(statusCode).json({
    status: 'error',
    statusCode,
    code,
    message,
    details,
  });
});

export default { app, server, io };
