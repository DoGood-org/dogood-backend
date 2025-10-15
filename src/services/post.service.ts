import { prisma } from '@/lib/prisma';
import logger from '@/utils/logger';

import { Prisma, Post } from "@prisma/client";
import { httpError } from '@/helpers/httpError';
import { deleteCache, getCache, setCache } from "@utils/cache";
import { createPostInput, PostFilterInput, UpdatePostInput } from '@/types/post.types';;


export const createPostService = async (data: createPostInput) => {
  const existingPost = await prisma.post.findFirst({
    where: { title: data.title },
  });

  if (existingPost) {
    logger.info('✅ A post with this name already exists');
    throw httpError(400, `A post with this name already exists`);
  }

  const post = await prisma.post.create({
    data: {
      title: data.title,
      category: data.category,
      content: data.content,
      image: data.image,
      tags: data.tags,
    },
  });

  await refreshAllPostsCache();

  logger.info('✅ Post created successfully', {
    postId: post.id,
    title: post.title,
  });

  return post;
};

export const getPostByIdService = async (id: number, lang?: string) => {
  const cacheKey = `post:${id}:${lang || 'default'}`;

  try {
    const cached = await getCache<Post>(cacheKey);

    if (cached) {
      logger.info('✅ Post returned from cache successfully');
      return cached;
    }
  } catch (error) {
    logger.error('❌ Failed to fetch post from cache', { error });
  }

  const post = await prisma.post.findUnique({ where: { id } });

  if (!post) {
    throw httpError(404, `Post with id ${id} not found`);
  }

  const localizedPost = langChecker(post, lang);

  await setCache(cacheKey, localizedPost);

  logger.info(`✅ Post ${id} returned from db and cached for lang: ${lang || 'default'}`);

  return localizedPost;
};

export const updatePostByIdService = async (
  id: number,
  data: UpdatePostInput
) => {
  const cacheKey = `post:${id}`;

  const post = await prisma.post.update({
    where: { id },
    data: {
      title: data.title,
      title_en: data.title_en ?? undefined,
      title_de: data.title_de ?? undefined,
      category: data.category,
      content: data.content,
      content_en: data.content_en ?? undefined,
      content_de: data.content_de ?? undefined,
      image: data.image,
      tags: data.tags,
    },
    select: {
      id: true,
      title: true,
      title_en: true,
      title_de: true,
      category: true,
      content: true,
      content_en: true,
      content_de: true,
      image: true,
      tags: true,
    },
  });

  await setCache(cacheKey, post);

  logger.info('✅ Post updated successfully');

  await refreshAllPostsCache();

  return post;
};

export const deletePostService = async (id: number) => {
  const deletedPost = await prisma.post.delete({
    where: { id },
    select: {
      id: true,
      title: true,
      title_en: true,
      title_de: true,
      category: true,
      content: true,
      content_en: true,
      content_de: true,
      image: true,
      tags: true,
    },
  });

  await deleteCache(`post:${id}`);

  logger.info('✅ Post deleted successfully', { id });

  await refreshAllPostsCache();

  return deletedPost;
};

export const getAllPostsService = async (lang?: string): Promise<Post[]> => {
  const cacheKey = `posts:all:${lang || 'default'}`;

  const cached = await getCache<Post[]>(cacheKey);
  if (cached && Array.isArray(cached)) {
    logger.info(`✅ Posts returned from cache for lang=${lang || 'default'}`);
    return cached;
  }

  const posts = await prisma.post.findMany({
    orderBy: { createdAt: 'desc' },
  });

  logger.info('✅ Posts returned from db');

  const localized = localizePosts(posts, lang);
  await setCache(cacheKey, localized);

  return localized;
};


export const getFilteredPostsService = async (
    filters: PostFilterInput & { lang?: string }
) => {
  const { title, category, fromDate, toDate, lang } = filters;
  const where: Prisma.PostWhereInput = {};

  if (title) {
    const normalizedTitle = title.trim();

    if (lang === 'en') {
      where.OR = [
        { title_en: { contains: normalizedTitle, mode: 'insensitive' } },
        { title: { contains: normalizedTitle, mode: 'insensitive' } },
      ];
    } else if (lang === 'de') {
      where.OR = [
        { title_de: { contains: normalizedTitle, mode: 'insensitive' } },
        { title: { contains: normalizedTitle, mode: 'insensitive' } },
      ];
    } else {
      where.title = { contains: normalizedTitle, mode: 'insensitive' };
    }
  }

  if (category) {
    where.category = { equals: category.trim(), mode: 'insensitive' };
  }

  if (fromDate || toDate) {
    where.createdAt = {};
    if (fromDate) where.createdAt.gte = new Date(fromDate);
    if (toDate) where.createdAt.lte = new Date(toDate);
  }

  const filteredPosts = await prisma.post.findMany({
    where: Object.keys(where).length ? where : undefined,
    orderBy: { createdAt: 'desc' },
  });

  logger.info('✅ Posts were filtered successfully');

  return localizePosts(filteredPosts, lang);
};


const refreshAllPostsCache = async () => {

  const posts = await prisma.post.findMany({
    orderBy: { createdAt: 'desc' },
  });

  const supportedLangs = ['default', 'en', 'de'];

  for (const lang of supportedLangs) {
    const localized = localizePosts(posts, lang === 'default' ? undefined : lang);
    await setCache(`posts:all:${lang}`, localized);
  }

  logger.info('✅ All posts were settuped to cache successfully');
};
