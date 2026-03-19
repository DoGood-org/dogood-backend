import express from 'express';
import { healthControllers } from '@/controllers/healthcheck.controller';

export const healthRoute = express.Router();

healthRoute.get('/liveness', healthControllers.liveness);
healthRoute.get('/readiness', healthControllers.readiness);