import { Request, Response, NextFunction } from 'express';
import logger from '@/utils/logger';
import { asyncHandler } from '@/decorators/asyncHandler';
import { validateLanguage } from '@utils/validateLang';
import { httpError } from '@/helpers/httpError';
import { ErrorCode, SuccessCode } from '@/constants/apiCodes';
import { postServices } from '@/services/post.service';

const createPost = async (req: Request, res: Response) => {
  const post = await postServices.createPost(req.body);

  res.status(201).json({
    status: 'success',
    code: SuccessCode.POST_CREATED,
    data: { post },
  });
};

const getAllPosts = async (req: Request, res: Response, next: NextFunction) => {
  const lang = req.params.lang as string | undefined;

  if (!validateLanguage(lang, res)) {
    return next(
      httpError(400, 'Invalid language', ErrorCode.VALIDATION_ERROR)
    );
  }

  const posts = await postServices.getAllPosts(lang);

  res.status(200).json({
    status: 'success',
    code: SuccessCode.POSTS_RETRIEVED,
    count: posts.length,
    data: { posts },
  });
};

const getFilteredPosts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { title, category, fromDate, toDate } = req.query;
  const lang = req.params.lang as string | undefined;

  if (!validateLanguage(lang, res)) {
    return next(
      httpError(400, 'Invalid language', ErrorCode.VALIDATION_ERROR)
    );
  }

  const posts = await postServices.getFilteredPosts({
    title: title as string,
    category: category as string,
    fromDate: fromDate as string,
    toDate: toDate as string,
    lang: lang as string,
  });

  res.status(200).json({
    status: 'success',
    code: SuccessCode.POSTS_RETRIEVED,
    count: posts.length,
    data: { posts },
  });
};

const getPostById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const postId = Number(req.params.id);
  const lang = req.params.lang as string | undefined;

  const post = await postServices.getPostById(postId, lang);

  if (!post) {
    return next(
      httpError(404, 'Post not found', ErrorCode.POST_NOT_FOUND)
    );
  }

  res.status(200).json({
    status: 'success',
    code: SuccessCode.POST_RETRIEVED,
    data: { post },
  });
};

const updatePost = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const postId = Number(req.params.id);
  const lang = req.query.lang as string | undefined;

  const post = await postServices.getPostById(postId, lang);

  if (!post) {
    return next(
      httpError(404, 'Post not found', ErrorCode.POST_NOT_FOUND)
    );
  }

  const updatedPost = await postServices.updatePostById(postId, req.body);

  res.status(200).json({
    status: 'success',
    code: SuccessCode.POST_UPDATED,
    data: { post: updatedPost },
  });
};

const deletePost = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const postId = Number(req.params.id);
  const lang = req.query.lang as string | undefined;

  const post = await postServices.getPostById(postId, lang);

  if (!post) {
    return next(
      httpError(404, 'Post not found', ErrorCode.POST_NOT_FOUND)
    );
  }

  await postServices.deletePost(postId);

  logger.info('Post deleted', { postId });

  res.status(200).json({
    status: 'success',
    code: SuccessCode.POST_DELETED,
  });
};

export const controllers = {
  getAllPosts: asyncHandler(getAllPosts),
  getFilteredPosts: asyncHandler(getFilteredPosts),
  createPost: asyncHandler(createPost),
  getPostById: asyncHandler(getPostById),
  updatePost: asyncHandler(updatePost),
  deletePost: asyncHandler(deletePost),
};
