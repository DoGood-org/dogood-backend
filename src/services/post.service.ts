import {prisma} from '@/lib/prisma';
import logger from '@/utils/logger';

import {Prisma} from "@prisma/client";
import {httpError} from '@/helpers/httpError';
import { getCache, setCache, deleteCache} from "@utils/cache";

const POST_CACHE_TTL = 600;


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

    if (cached) {
      return cached;
    }
  } catch (error) {
    logger.error('❌ Failed to fetch post from cache', { error });
  }

  const post =  await prisma.post.findUnique({ where: { id } });

  if (post) {
    try {
      await setCache(cacheKey, post, POST_CACHE_TTL);
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

  await deleteCache(`post:${id}`);

  return post;
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

export const deletePostService = async (postId: number) => {
  const deletedPost = await prisma.post.delete({
    where: { id: postId },
  });

  logger.info('✅ Post deleted successfully', { postId });

  return deletedPost;
};
