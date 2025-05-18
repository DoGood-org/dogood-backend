import express from 'express';
import exampleRouter from './routes/api/example.route';
import { setupSwagger } from './config/swagger';
import cors from 'cors';

const app = express();

setupSwagger(app);

app.use(express.json());
app.use(cors());

app.use('/api/example', exampleRouter);

export default app;
