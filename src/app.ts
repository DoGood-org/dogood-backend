import express from 'express';
import cors from 'cors';
import { setupSwagger } from './config/swagger';
import exampleRouter from './routes/example.route';
import authRouter from './routes/auth.route';

const app = express();

// Настройка Swagger
setupSwagger(app);

// Middleware
app.use(express.json());
app.use(cors());

// Маршруты
app.use('/api/example', exampleRouter);
app.use('/api/auth', authRouter)

export default app;
