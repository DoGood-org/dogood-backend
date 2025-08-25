import {prisma} from '@/lib/prisma';
import logger from '@/utils/logger';

import {Prisma, Post} from "@prisma/client";
import {httpError} from '@/helpers/httpError';
import {deleteCache, getCache, setCache} from "@utils/cache";
import {createPostInput, PostFilterInput, UpdatePostInput} from '@/types/post.types';;


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

  await refreshAllPostsCache();

  logger.info('✅ Post created successfully', {
    postId: post.id,
    title: post.title,
  });

  return post;
};

export const getPostByIdService = async (id: number) => {
  const cacheKey = `post:${id}`;

  try {
    const cached = await getCache<Post>(cacheKey);

    if (cached) {
      logger.info('✅ Post returned from cache successfully');
      return cached;
    }

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

export const updatePostByIdService = async (id: number, data: UpdatePostInput) => {

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

  await refreshAllPostsCache();

  return post;
};

export const getAllPostsService = async () => {

  const cacheKey = 'posts:all';

  const cached = await getCache<Post>(cacheKey);
  if (cached) {
    logger.info('✅ Posts returned from cache successfully');
    return cached;
  }

  const posts =  await prisma.post.findMany({
    orderBy: {createdAt: 'desc'},
  });

  await refreshAllPostsCache();

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

  await refreshAllPostsCache();

  logger.info('✅ Post deleted successfully', { id });

  return deletedPost;
};

const refreshAllPostsCache = async () => {

  const posts = await prisma.post.findMany({
    orderBy: {createdAt: 'desc'},
  });

  await setCache('posts:all', posts);
  logger.info('✅ All posts were settuped to cache successfully');
};

