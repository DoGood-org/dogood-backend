import {
  createPost,
  getPostById,
  getFilteredPosts, updatePost, deletePost,
} from '@/controllers/posts.controller';
import { validateBody, validateIdParam } from '@/middlewares';
import { schemas } from '@/schemas/post.schemas';
import { Router } from 'express';

export const postsRoute = Router();


postsRoute
  .route('/')
  .get(getFilteredPosts)
  .post(validateBody(schemas.createPostSchema), createPost);


postsRoute
    .route('/:id')
    .get(validateIdParam, getPostById)
    .put(validateIdParam, updatePost)
    .delete(validateIdParam, deletePost)
