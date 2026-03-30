import { Router } from 'express';
import { controllers } from '@/controllers/reviews.controller';
import { authenticateUser, validateBody, validateIdParam, validateQuery } from '@/middlewares';
import { schemas } from '@/schemas/review.schema';
import { rateLimitMiddleware } from '@/middlewares/rateLimit.middleware';

export const reviewsRoute = Router();


reviewsRoute.get('/users/:id', validateIdParam, controllers.getUserReviews);

reviewsRoute.get('/organizations/:id', validateIdParam, controllers.getOrgReviews);

reviewsRoute.get('/platform', controllers.getPlatformReviews);

reviewsRoute.get(
  '/admin/all', 
  authenticateUser, 
  validateQuery(schemas.getReviewsSchema),
  controllers.getAllReviewsForAdmin 
);

reviewsRoute.post(
  '/users',
  rateLimitMiddleware({
    keyPrefix: 'createUserReview',
    windowSeconds: 60,
    maxRequests: 3,
  }),
  authenticateUser,
  validateBody(schemas.userReviewSchema),
  controllers.createUserToUserReviewController
);

reviewsRoute.post(
  '/organizations',
  rateLimitMiddleware({
    keyPrefix: 'createOrgReview',
    windowSeconds: 60,
    maxRequests: 3,
  }),
  authenticateUser,
  validateBody(schemas.orgReviewSchema),
  controllers.createUserToOrganizationReviewController
);

reviewsRoute.post(
  '/platform',
  rateLimitMiddleware({
    keyPrefix: 'createPlatformReview',
    windowSeconds: 60,
    maxRequests: 1,
  }),
  authenticateUser,
  validateBody(schemas.platformReviewSchema),
  controllers.createUserToPlatformReviewController
);

reviewsRoute.post(
  '/:taskId/users',
  authenticateUser,
  validateBody(schemas.userReviewSchema),
  controllers.createTaskUserReviewController
);

reviewsRoute.patch(
  '/:id',
  authenticateUser,
  validateBody(schemas.updateReviewSchema),
  controllers.updateReview
);

reviewsRoute.delete('/:id', authenticateUser, controllers.deleteReview);

reviewsRoute.patch('/reviews/admin/{id}/status', authenticateUser, validateBody(schemas.moderateReviewSchema), controllers.moderateReview);

