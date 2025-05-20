import express from 'express';
import cors from 'cors';
import { setupSwagger } from './config/swagger';
import exampleRouter from './routes/api/example.route';

const app = express();

// Настройка Swagger
setupSwagger(app);

// Middleware
app.use(express.json());
app.use(cors());

// Маршруты
app.use('/api/example', exampleRouter);

export default app;
