import express from 'express';
import bodyParser from 'body-parser';
import { controllers } from '@/controllers/donate.controller';
import { validateBody, validateIdParam } from '@/middlewares';
import { schemas } from '../../schemas/donate.schema';

export const donateRoute = express.Router();

donateRoute.get('/:id', validateIdParam, controllers.getDonation);

donateRoute.post(
  '/create-checkout-session',
  validateBody(schemas.createDonateSchema),
  controllers.createCheckoutSession
);

donateRoute.post(
  '/webhook',
  bodyParser.raw({ type: 'application/json' }),
  controllers.stripeWebhook
);
