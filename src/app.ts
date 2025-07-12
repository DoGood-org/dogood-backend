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

const origins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://192.168.1.73:3001',
  'http://192.168.1.73:5173',
];

app.use(
  cors({
    origin: origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Requested-With',
      'X-CSRF-Token',
      'X-HTTP-Method-Override',
    ],
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
  logger.info(`Registered route: ${prefix}`);

  if (Array.isArray(router.stack)) {
    router.stack.forEach((layer: any) => {
      if (layer.route && layer.route.path && layer.route.methods) {
        const methods = Object.keys(layer.route.methods)
          .map((m) => m.toUpperCase())
          .join(', ');
        logger.info(` ↳ [${methods}] ${prefix}${layer.route.path}`);
      }
    });
  }
});

// Обробка 404 (не знайдено)
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: 'Not found' });
});

// Обробка серверних помилок
app.use((err: AppError, req: Request, res: Response, _next: NextFunction) => {
  logger.error(`Error: ${err.message} | Status: ${err.status}`);
  res
    .status(err.status || 500)
    .json({ message: err.message || 'Server error' });
});

export default { app, server, io };
