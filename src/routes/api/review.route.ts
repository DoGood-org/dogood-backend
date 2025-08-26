import { Router } from 'express';
import { controllers } from '@/controllers/reviews.controller';
import { authenticateUser, validateBody, validateIdParam } from '@/middlewares';
import { schemas } from '@/schemas/review.schema';
import { validateQuery } from '@/middlewares/chat.middleware';
import { rateLimitMiddleware } from '@/middlewares/rateLimitMiddleware';

export const reviewsRoute = Router();

reviewsRoute.post(
  '/',
  rateLimitMiddleware({
    keyPrefix: 'createReview',
    windowSeconds: 60,
    maxRequests: 3,
  }),
  authenticateUser,
  validateBody(schemas.createReviewSchema),
  controllers.createReview
);

reviewsRoute.get('/:id', controllers.getReviewById);

reviewsRoute.get('/by-user/:id', validateIdParam, controllers.getUserReviews);

reviewsRoute.delete('/:id', authenticateUser, controllers.deleteReview);

reviewsRoute.get(
  '/all',
  validateQuery(schemas.getReviewsSchema),
  controllers.getReviews
);
