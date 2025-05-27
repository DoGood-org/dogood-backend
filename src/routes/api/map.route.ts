import logger from '@/utils/logger';
import { Router } from 'express';

/**
 * @swagger
 * tags:
 *   name: Map
 *   description: Map API
 */

export const mapRoute = Router();

mapRoute.get('/', (req, res) => {
  logger.info('GET /map — Map route accessed');
  res.send('Map data');
});
