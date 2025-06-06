import { Request, Response, NextFunction } from 'express';
import {
  createPostService,
  getPostByIdService,
  getFilteredPostsService,
} from '@/services/post.service';
import { httpError } from '@/helpers/httpError';
import logger from '@/utils/logger';

export const createPost = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const post = await createPostService(req.body);
    res.status(201).json(post);
  } catch (error) {
    logger.error('❌ Failed to create post in controller', { error });
    next(httpError(500, 'Failed to create post'));
  }
};

export const getFilteredPosts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { title, category, fromDate, toDate } = req.query;

    const posts = await getFilteredPostsService({
      title: title as string,
      category: category as string,
      fromDate: fromDate as string,
      toDate: toDate as string,
    });

    logger.info(`✅ Post was created`);

    res.status(200).json({
      status: 'success',
      count: posts.length,
      data: {
        posts,
      },
    });
  } catch (error) {
    logger.error('❌ Failed to fetch posts', { error });
    next(httpError(500, 'Failed to fetch posts'));
  }
};

export const getPostById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const postId = Number(req.params.id);

  try {
    const existingPost = await getPostByIdService(postId);

    if (!existingPost) {
      return next(httpError(404, `Post with id ${postId} not found`));
    }

    logger.info(`✅ Post with id ${postId} found`);

    res.status(200).json({
      status: 'success',
      data: {
        post: existingPost,
      },
    });
  } catch (error) {
    logger.error('❌ Internal server error', { error });
    next(httpError(500, 'Internal server error'));
  }
};
