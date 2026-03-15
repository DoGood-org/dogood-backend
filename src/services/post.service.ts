import { prisma } from '@/lib/prisma';
import logger from '@/utils/logger';
import { Prisma } from "@prisma/client";
import { httpError } from '@/helpers/httpError';
import {
  createPostInput,
  LocalizedPost,
  PostFilterInput,
  UpdatePostInput,
} from '@/types/post.types';
import { langChecker, localizePosts } from '@/utils/langChecker';
 const createPost = async (data: createPostInput) => {
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
      title_en: data.title_en,
      title_de: data.title_de,
      category: data.category,
      content: data.content,
      content_en: data.content_en,
      content_de: data.content_de,
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


/* ===================== GET BY ID ===================== */

 const getPostById = async (id: number, lang?: string) => {

  const post = await prisma.post.findUnique({ where: { id } });

  if (!post) {
    throw httpError(404, `Post with id ${id} not found`);
  }

  const localizedPost = langChecker(post, lang);


  logger.info(
    `✅ Post ${id} returned from db and cached for lang: ${lang || 'default'}`
  );

  return localizedPost;
};


/* ===================== UPDATE ===================== */

 const updatePostById = async (
  id: number,
  data: UpdatePostInput
) => {

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

  logger.info('✅ Post updated successfully');

  await refreshAllPostsCache();

  return post;
};


/* ===================== DELETE ===================== */

 const deletePost = async (id: number) => {
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

  logger.info('✅ Post deleted successfully', { id });

  await refreshAllPostsCache();

  return deletedPost;
};

 const getAllPosts = async (
  lang?: string
): Promise<LocalizedPost[]> => {

  const posts = await prisma.post.findMany({
    orderBy: { createdAt: 'desc' },
  });

  logger.info('✅ Posts returned from db');

  const localized = localizePosts(posts, lang);

  return localized;
};


 const getFilteredPosts = async (
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

  logger.info('✅ All posts were set up to cache successfully');
  return localizePosts(posts);
};

export const postServices = {
  createPost,
  getPostById,
  updatePostById,
  deletePost,
  getAllPosts,
  getFilteredPosts,
};
