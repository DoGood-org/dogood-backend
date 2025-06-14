import express, { Request, Response, NextFunction } from 'express';
import { AppError } from './types/error';
import cors from 'cors';
import { setupSwagger } from './config/swagger';
import * as apiRoutes from './routes/api';
import http from 'http';
import { Server } from 'socket.io';
import logger from './utils/logger';
import registerSocketHandlers from './sockets';


import cookieParser from "cookie-parser";

const app = express();

// Настройка Swagger
setupSwagger(app);

// Cookie парсер для авторизации итд
app.use(cookieParser());

// Middleware
app.use(express.json());
app.use(cors());
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

registerSocketHandlers(io); 
// Регистрация обработчиков сокетов

// Маршруты
Object.entries(apiRoutes).forEach(([name, router]) => {
  const prefix = '/' + name.replace('Route', '').toLowerCase();
  app.use(prefix, router);
});

// Обробка 404 (не знайдено)
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: 'Not found' });
});

// Обробка серверних помилок
app.use(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (err: AppError, req: Request, res: Response, _next: NextFunction) => {
    logger.error(`Error: ${err.message} | Status: ${err.status}`);
    res
      .status(err.status || 500)
      .json({ message: err.message || 'Server error' });
  }
);

export default { app, server, io };
