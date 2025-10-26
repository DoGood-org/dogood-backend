import { Request, Response } from 'express';
import {
  createPostService,
  getPostByIdService,
  getFilteredPostsService,
  updatePostByIdService,
  deletePostService,
  getAllPostsService,
} from '@/services/post.service';
import logger from '@/utils/logger';
import { asyncHandler } from '@/decorators/asyncHandler';
import {validateLanguage} from "@utils/validateLang";

const createPost = async (req: Request, res: Response) => {

  const post = await createPostService(req.body);

  res.status(201).json({
    status: 'success',
    message: 'New post was created',
    data: { post },
  });
};

const getAllPosts = async (req: Request, res: Response) => {
  const lang = req.params.lang as string | undefined;

  if (!validateLanguage(lang, res)) return;

  const posts = await getAllPostsService(lang);

  res.status(200).json({
    status: 'success',
    count: posts.length,
    data: {
      posts,
    },
  });
};

const getFilteredPosts = async (req: Request, res: Response) => {
  const { title, category, fromDate, toDate } = req.query;
  const lang = req.params.lang as string | undefined;

  if (!validateLanguage(lang, res)) return;

  const posts = await getFilteredPostsService({
    title: title as string,
    category: category as string,
    fromDate: fromDate as string,
    toDate: toDate as string,
    lang: lang as string,
  });

  res.status(200).json({
    status: 'success',
    count: posts.length,
    data: {
      posts,
    },
  });
};

const getPostById = async (req: Request, res: Response) => {
  const postId = +req.params.id;
  const lang = req.params.lang as string | undefined;

  const foundPost = await getPostByIdService(postId, lang);

  if (!foundPost) {
    return res.status(404).json({
      status: 'error',
      message: `Post with id ${postId} not found`,
    });
  }

  res.status(200).json({
    status: 'success',
    data: {
      post: foundPost,
    },
  });
};

const updatePost = async (req: Request, res: Response) => {
  const postId = +req.params.id;
  const lang = req.query.lang as string | undefined;

  const foundPost = await getPostByIdService(postId, lang);

  if (!foundPost) {
    return res.status(404).json({
      status: 'error',
      message: `Post with id ${postId} not found`,
    });
  }

  const updatedPost = await updatePostByIdService(postId, req.body);

  res.status(200).json({
    status: 'success',
    message: 'Post was updated successfully',
    data: {
      post: updatedPost,
    },
  });
};

const deletePost = async (req: Request, res: Response) => {
  const postId = +req.params.id;
  const lang = req.query.lang as string | undefined;

  const foundPost = await getPostByIdService(postId, lang);

  if (!foundPost) {
    return res.status(404).json({
      status: 'error',
      message: `Post with id ${postId} not found`,
    });
  }

  await deletePostService(postId);

  logger.info('Post deleted', { postId });

  return res.status(200).json({
    status: 'success',
    message: `Post was deleted successfully`,
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
