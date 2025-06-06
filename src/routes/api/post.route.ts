import {
  createPost,
  getPostById,
  getFilteredPosts,
} from '@/controllers/posts.controller';
import { validateBodyMiddleware, validateIdParam } from '@/middlewares';
import { schemas } from '@/schemas/post.schemas';
import { Router } from 'express';

export const postRoute = Router();

postRoute
  .route('/posts')
  .get(getFilteredPosts)
  .post(validateBodyMiddleware(schemas.createPostSchema), createPost);

postRoute.route('/posts/:id').get(validateIdParam, getPostById);
