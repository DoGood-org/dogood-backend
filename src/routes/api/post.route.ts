import { controllers } from '@/controllers/posts.controller';
import { validateBody, validateIdParam} from '@/middlewares';
import { schemas } from '@/schemas/post.schemas';
import { Router } from 'express';

export const postsRoute = Router();


postsRoute
  .route('/')
  .get(controllers.getAllPosts)
  .post(validateBody(schemas.createPostSchema), controllers.createPost);


postsRoute
    .route('/search')
    .get(controllers.getFilteredPosts)


postsRoute.patch(
    '/:id',
    validateIdParam,
    controllers.updatePost
);

postsRoute.get(
    '/:id',
    validateIdParam,
    controllers.getPostById
);

postsRoute.delete(
    '/:id',
    validateIdParam,
    controllers.deletePost
);
