import { Router } from 'express';
import {controllers} from "@/controllers/reviews.controller";
import {validateIdParam} from "@/middlewares";

export const reviewsRoute = Router();

reviewsRoute
    .route('/')
    .post(controllers.createReview);

reviewsRoute.get(
    '/:id',
    controllers.getReviewById
);

reviewsRoute.get(
    '/by-user/:id',
    validateIdParam,
    controllers.getUserReviews
);

reviewsRoute.delete(
    '/:id',
    controllers.deleteReview
);
