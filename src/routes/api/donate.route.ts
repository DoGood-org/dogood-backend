import express from 'express';
import bodyParser from 'body-parser';
import { controllers } from '@/controllers/donate.controller';

export const donateRoute = express.Router();

donateRoute.get('/:id', controllers.getDonation);

donateRoute.post('/create-checkout-session', controllers.createCheckoutSession);

donateRoute.post(
  '/webhook',
  bodyParser.raw({ type: 'application/json' }),
  controllers.stripeWebhook
);
