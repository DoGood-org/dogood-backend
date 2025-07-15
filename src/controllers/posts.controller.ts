import { Request, Response, NextFunction } from 'express';
import {
  createPostService,
  getPostByIdService,
  getFilteredPostsService, updatePostByIdService, deletePostService,
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
  const postId = +req.params.id;

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

export const updatePost = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
  const postId = +req.params.id;

  try {
    const updatedPost = await updatePostByIdService(postId, req.body);

    if (!updatedPost) {
      return next(httpError(404, `Post with id ${postId} not found`));
    }

    res.status(200).json({
      status: 'success',
      data: {
        post: updatedPost,
      },
    });
  } catch (error) {
    logger.error('❌ Failed to update post', { error });
    next(httpError(500, 'Failed to update post'));
  }
};


export const deletePost = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
  const postId = +req.params.id;

  try {
    const existingPost = await getPostByIdService(postId);

    if (!existingPost) {
      return next(httpError(404, `Post with id ${postId} not found`));
    }

    await deletePostService(postId);

    logger.info(`✅ post with id ${postId} deleted successfully`);

    res.status(200).json({
      message: 'Post deleted successfully'
    });
  } catch (error) {
    logger.error('❌ Failed to delete post', { error });
    next(httpError(500, 'Failed to delete post'));
  }
};

