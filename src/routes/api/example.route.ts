import express from 'express';
import { getExample } from '../../controllers/example.controller';

/**
 * @swagger
 * tags:
 *   name: Example
 *   description: Example API
 */

const router = express.Router();

router.get('/', getExample);

export default router;
