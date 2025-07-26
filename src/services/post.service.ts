import {prisma} from '@/lib/prisma';
import logger from '@/utils/logger';

import {Prisma} from "@prisma/client";
import {httpError} from '@/helpers/httpError';
import {deleteCache, getCache, setCache} from "@utils/cache";


interface createPostInput {
  title: string;
  category: string;
  content: string;
  image: string;
  tags: string[]
}

type PostFilterInput = {
  category?: string;
  title?: string;
  fromDate?: string | Date;
  toDate?: string | Date;
};

export const createPostService = async (data: createPostInput) => {
  const existingPost = await prisma.post.findFirst({
    where: { title: data.title },
  });

  if (existingPost) {
    throw httpError(400, `A post with this name already exists.`);
  }

  const post = await prisma.post.create({
    data: {
      title: data.title,
      category: data.category,
      content: data.content,
      image: data.image,
      tags: data.tags
    },
  });

  const posts = await prisma.post.findMany({
    orderBy: {createdAt: 'desc'},
  });

  await setCache('posts:all', posts);

  logger.info('✅ Post created successfully', {
    postId: post.id,
    title: post.title,
  });

  return post;
};

export const getPostByIdService = async (id: number) => {
  const cacheKey = `post:${id}`;

  try {
    const cached = await getCache<typeof post>(cacheKey);

    if (cached) return cached;

  } catch (error) {
    logger.error('❌ Failed to fetch post from cache', { error });
  }

  const post =  await prisma.post.findUnique({ where: { id } });

  if (post) {
    try {
      await setCache(cacheKey, post);

    } catch (error) {
      logger.error('❌ Failed to set post to cache', { error });
    }
  }

  return post;
};

export const updatePostByIdService = async (
    id: number,
    data: Partial<{title : string, category: string, content: string, image: string, tags: string[]}>
) => {

  const cacheKey = `post:${id}`;

  const post = await prisma.post.update({
    where: {id},
    data,
    select: {
      id: true,
      title: true,
      category: true,
      content: true,
      image: true,
      tags: true
    },
  });

  await setCache(cacheKey, post);
  const posts =  await prisma.post.findMany({
    orderBy: {createdAt: 'desc'},
  });

  await setCache('posts:all', posts);

  return post;
};

export const getAllPostsService = async () => {

  const cacheKey = 'posts:all';

  const cached = await getCache<typeof posts>(cacheKey);
  if (cached) return cached;

  const posts =  await prisma.post.findMany({
    orderBy: {createdAt: 'desc'},
  });

  await setCache(cacheKey, posts);
  return posts;
};

export const getFilteredPostsService = async (filters: PostFilterInput) => {
  const { title, category, fromDate, toDate } = filters;

  const where: Prisma.PostWhereInput = {};

  if (title) {
    where.title = {
      contains: title,
      mode: 'insensitive',
    };
  }

  if (category) {
    where.category = {
      equals: category,
      mode: 'insensitive',
    };
  }

  if (fromDate || toDate) {
    where.createdAt = {};
    if (fromDate) where.createdAt.gte = new Date(fromDate);
    if (toDate) where.createdAt.lte = new Date(toDate);
  }

  return await prisma.post.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

};

export const deletePostService = async (id: number) => {

  const deletedPost = await prisma.post.delete({
    where: { id },
  });

  await deleteCache(`post:${id}`);

  const posts =  await prisma.post.findMany({
    orderBy: {createdAt: 'desc'},
  });

  await setCache('posts:all', posts);

  logger.info('✅ Post deleted successfully', { id });

  return deletedPost;
};
