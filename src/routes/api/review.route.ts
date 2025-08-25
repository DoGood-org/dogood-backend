import { Router } from 'express';
import { controllers } from '@/controllers/reviews.controller';
import { authenticateUser, validateBody, validateIdParam } from '@/middlewares';
import { schemas } from '@/schemas/review.schema';
import { validateQuery } from '@/middlewares/chat.middleware';

export const reviewsRoute = Router();

reviewsRoute.post(
  '/',
  validateBody(schemas.createReviewSchema),
  authenticateUser,
  controllers.createReview
);

reviewsRoute.get('/:id', controllers.getReviewById);

reviewsRoute.get('/by-user/:id', validateIdParam, controllers.getUserReviews);

reviewsRoute.delete('/:id', authenticateUser, controllers.deleteReview);

reviewsRoute.get(
  '/all',
  authenticateUser,
  validateQuery(schemas.getReviewsSchema),
  controllers.getReviews
);
