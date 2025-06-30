import {
  createPost,
  getPostById,
  getFilteredPosts,
} from '@/controllers/posts.controller';
import { validateBody, validateIdParam } from '@/middlewares';
import { validateBody, validateIdParam } from '@/middlewares';
import { schemas } from '@/schemas/post.schemas';
import { Router } from 'express';

export const postRoute = Router();

postRoute
  .route('/posts')
  .get(getFilteredPosts)
  .post(validateBody(schemas.createPostSchema), createPost);
  .post(validateBody(schemas.createPostSchema), createPost);

postRoute.route('/posts/:id').get(validateIdParam, getPostById);
