import { prisma } from '@/lib/prisma';
import logger from '@/utils/logger';
import { Prisma } from "@prisma/client";
import { httpError } from '@/helpers/httpError';

interface createPostInput {
  title: string;
  category: string;
  content: string;
  image: string;
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
    },
  });

  logger.info('✅ Post created successfully', {
    postId: post.id,
    title: post.title,
  });

  return post;
};

export const getPostByIdService = async (id: number) => {
  return await prisma.post.findUnique({
    where: { id },
  });
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
