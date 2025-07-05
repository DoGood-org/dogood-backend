import {
  createPost,
  getPostById,
  getFilteredPosts, updatePost, deletePost,
} from '@/controllers/posts.controller';
import { validateBody, validateIdParam } from '@/middlewares';
import { schemas } from '@/schemas/post.schemas';
import { Router } from 'express';

export const postRoute = Router();


/**
 * @swagger
 * components:
 *   schemas:
 *     Post:
 *       type: object
 *       required:
 *         - title
 *         - content
 *         - image
 *         - tags
 *       properties:
 *         id:
 *           type: integer
 *         title:
 *           type: string
 *         content:
 *           type: string
 *         image:
 *           type: string
 *         tags:
 *           type: array
 */

/**
 * @swagger
 * /posts:
 *   get:
 *     summary: Отримати всі пости, отримати відфільтровані пости
 *     responses:
 *       200:
 *         description: Успішно отримано список постів
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Post'
 */

postRoute.route('/posts').get(getFilteredPosts)

/**
 * @swagger
 * /posts:
 *   post:
 *     summary: Створити новий пост
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Post'
 *     responses:
 *       200:
 *         description: Пост створено
 *       400:
 *         description: Невірний запит
 */

postRoute.route('/posts').post(validateBody(schemas.createPostSchema), createPost);

/**
 * @swagger
 * /posts/{id}:
 *   get:
 *     summary: Отримати пост за ID
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID поста
 *     responses:
 *       200:
 *         description: Пост знайдено
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Post'
 *       404:
 *         description: Пост не знайдено
 */

postRoute.route('/posts/:id').get(validateIdParam, getPostById)

/**
 * @swagger
 * /posts/{id}:
 *   put:
 *     summary: Оновити пост
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID поста
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Post'
 *     responses:
 *       200:
 *         description: Пост оновлено
 *       400:
 *         description: Невірний запит
 *       404:
 *         description: Пост не знайдено
 *       500:
 *         description: Помилка серверу
 */

postRoute.route('/posts/:id').put(validateIdParam, updatePost)

/**
 * @swagger
 * /posts/{id}:
 *   put:
 *     summary: Видалити пост
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID поста
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Post'
 *     responses:
 *       200:
 *         description: Пост видалено
 *       404:
 *         description: Пост не знайдено
 *       500:
 *         description: Помилка серверу
 */

postRoute.route('/posts/:id').delete(validateIdParam, deletePost)
