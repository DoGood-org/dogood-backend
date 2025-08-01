import { Request, Response } from 'express';
import { asyncHandler } from '@/decorators/asyncHandler';
import {
    createReviewService,
    deleteReviewsService,
    getReviewByIdService,
    getUserReviewsService, updateReviewService
} from "@/services/review.service";


const createReview = async (req: Request, res: Response) => {

    const review = await createReviewService(req.body);

    res.status(201).json({
        status: 'success',
        message: 'New review was created',
        data: { review }
    });
};

const getReviewById = async (req: Request, res: Response) => {
    const reviewId = req.params.id;

    const foundReview = await getReviewByIdService(reviewId);

    if (!foundReview) {
        return res.status(404).json({
            status: 'error',
            message: 'Review not found',
        });
    }

    res.status(200).json({
        status: 'success',
        data: {
            reviews: foundReview,
        }
    });
};

const  getUserReviews = async (req: Request, res: Response) => {
    const userId = +req.params.id;

    const reviews = await getUserReviewsService(userId);

    if (!reviews) {
        return res.status(404).json({
            status: 'error',
            message: 'Reviews not found',
        });
    }


    res.status(200).json({
        status: 'success',
        data: {
            reviews: reviews
        },
    });
}

const updateReview = async (req: Request, res: Response) => {
    const reviewId = req.params.id;

    const foundReview = await getReviewByIdService(reviewId);

    if (!foundReview) {
        return res.status(404).json({
            status: 'error',
            message: `Review with id ${reviewId} not found`,
        });
    }

    const updatedReview = await updateReviewService(reviewId, req.body);

    res.status(200).json({
        status: 'success',
        message: 'Review was updated successfully',
        data: {
            review: updatedReview,
        }
    });
};

const deleteReview = async (req: Request, res: Response) => {
    const reviewId = req.params.id;

    const foundReview = await deleteReviewsService(reviewId);

    if (!foundReview) {
        return res.status(404).json({
            status: 'error',
            message: 'Review not found',
        });
    }

    res.status(200).json({
        status: 'success',
        message: 'Review was deleted successfully',
    });
};


export const controllers = {
    createReview: asyncHandler(createReview),
    getReviewById: asyncHandler(getReviewById),
    getUserReviews: asyncHandler(getUserReviews),
    deleteReview: asyncHandler(deleteReview),
    updateReview: asyncHandler(updateReview)
};

