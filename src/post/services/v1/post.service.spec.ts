import { HttpException, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { SuccessCode } from '@shared/constants/api-codes';
import { PostV1 } from 'src/post/interfaces/post';
import { PostMapperV1 } from 'src/post/mappers/v1/post.mapper';
import { PostServiceV1 } from 'src/post/services/v1/post.service';

describe('PostServiceV1', () => {
  const prisma = {
    post: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
  const service = new PostServiceV1(
    prisma as unknown as PrismaService,
    new PostMapperV1(),
  );
  const createdAt = new Date('2026-09-25T00:00:00Z');
  const row: PostV1 = {
    id: 'post-1',
    title: 'Base title',
    title_en: 'English title',
    title_de: null,
    category: 'news',
    content: 'Base content text',
    content_en: 'English content text',
    content_de: null,
    image: 'img.png',
    tags: ['a'],
    createdAt,
    updatedAt: createdAt,
  };
  const fullSelect = {
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
    createdAt: true,
    updatedAt: true,
  };
  const createData = {
    title: 'Base title',
    title_en: 'English title',
    title_de: 'Deutscher Titel',
    category: 'news',
    content: 'Base content text',
    content_en: 'English content text',
    content_de: 'Deutscher Inhalt',
    image: 'img.png',
    tags: ['a'],
  };

  const captureHttpException = async (
    promise: Promise<unknown>,
  ): Promise<HttpException> => {
    try {
      await promise;
    } catch (error) {
      if (error instanceof HttpException) {
        return error;
      }

      throw error;
    }

    throw new Error('expected an HttpException');
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('createPost', () => {
    it('should reject a duplicate exact title with a codeless 400', async () => {
      prisma.post.findFirst.mockResolvedValue({ id: 'post-0' });

      const error = await captureHttpException(service.createPost(createData));

      expect(prisma.post.findFirst).toHaveBeenCalledWith({
        where: { title: 'Base title' },
        select: { id: true },
      });
      expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(error.getResponse()).toStrictEqual({
        status: 'error',
        statusCode: HttpStatus.BAD_REQUEST,
        code: null,
        message: 'A post with this name already exists',
      });
      expect(prisma.post.create).not.toHaveBeenCalled();
    });

    it('should create and return the raw row', async () => {
      prisma.post.findFirst.mockResolvedValue(null);
      prisma.post.create.mockResolvedValue(row);

      const result = await service.createPost(createData);

      expect(prisma.post.create).toHaveBeenCalledWith({
        data: createData,
        select: fullSelect,
      });
      expect(result).toStrictEqual({
        status: 'success',
        code: SuccessCode.POST_CREATED,
        data: { post: row },
      });
    });
  });

  describe('language validation', () => {
    it.each(['fr', 'EN', 'search'])(
      'should answer the bare legacy 400 body for %p',
      async (lang: string) => {
        const allError = await captureHttpException(service.getAllPosts(lang));
        const searchError = await captureHttpException(
          service.getFilteredPosts({}, lang),
        );

        for (const error of [allError, searchError]) {
          expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
          expect(error.getResponse()).toStrictEqual({
            status: 'error',
            message: `Unsupported language: ${lang}`,
          });
        }

        expect(prisma.post.findMany).not.toHaveBeenCalled();
      },
    );
  });

  describe('getAllPosts', () => {
    it('should return every post newest first, localized', async () => {
      prisma.post.findMany.mockResolvedValue([row]);

      const result = await service.getAllPosts('en');

      expect(prisma.post.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: [
          { createdAt: Prisma.SortOrder.desc },
          { id: Prisma.SortOrder.asc },
        ],
        select: fullSelect,
      });
      expect(result.count).toBe(1);
      expect(result.data.posts[0].title).toBe('English title');
    });
  });

  describe('getFilteredPosts', () => {
    const titleFilter = {
      contains: 'garden',
      mode: Prisma.QueryMode.insensitive,
    };

    const findManyWhere = (): unknown =>
      (prisma.post.findMany.mock.calls[0] as [{ where: unknown }])[0].where;

    beforeEach(() => {
      prisma.post.findMany.mockResolvedValue([]);
    });

    it('should search only the base title for default', async () => {
      await service.getFilteredPosts({ title: '  garden ' }, 'default');

      expect(findManyWhere()).toStrictEqual({ title: titleFilter });
    });

    it('should OR the en title with the base title for en', async () => {
      await service.getFilteredPosts({ title: 'garden' }, 'en');

      expect(findManyWhere()).toStrictEqual({
        OR: [{ title_en: titleFilter }, { title: titleFilter }],
      });
    });

    it('should OR the de title with the base title for de', async () => {
      await service.getFilteredPosts({ title: 'garden' }, 'de');

      expect(findManyWhere()).toStrictEqual({
        OR: [{ title_de: titleFilter }, { title: titleFilter }],
      });
    });

    it('should match category case-insensitively and bound createdAt', async () => {
      await service.getFilteredPosts(
        { category: ' News ', fromDate: '2026-01-01', toDate: '2026-02-01' },
        'default',
      );

      expect(findManyWhere()).toStrictEqual({
        category: { equals: 'News', mode: Prisma.QueryMode.insensitive },
        createdAt: {
          gte: new Date('2026-01-01'),
          lte: new Date('2026-02-01'),
        },
      });
    });

    it('should leave the where empty without filters', async () => {
      await service.getFilteredPosts({ title: '', category: '' }, 'de');

      expect(findManyWhere()).toStrictEqual({});
    });
  });

  describe('getPostById', () => {
    it('should answer a codeless 404 with the legacy message', async () => {
      prisma.post.findUnique.mockResolvedValue(null);

      const error = await captureHttpException(
        service.getPostById('not-a-uuid', 'en'),
      );

      expect(error.getStatus()).toBe(HttpStatus.NOT_FOUND);
      expect(error.getResponse()).toStrictEqual({
        status: 'error',
        statusCode: HttpStatus.NOT_FOUND,
        code: null,
        message: 'Post with id not-a-uuid not found',
      });
    });

    it('should localize an unsupported lang as default', async () => {
      prisma.post.findUnique.mockResolvedValue(row);

      const result = await service.getPostById('post-1', 'fr');

      expect(prisma.post.findUnique).toHaveBeenCalledWith({
        where: { id: 'post-1' },
        select: fullSelect,
      });
      expect(result.code).toBe(SuccessCode.POST_RETRIEVED);
      expect(result.data.post.title).toBe('Base title');
      expect(result.data.post).not.toHaveProperty('title_en');
    });
  });

  describe('updatePost', () => {
    it('should answer 404 before writing when the post is missing', async () => {
      prisma.post.findUnique.mockResolvedValue(null);

      const error = await captureHttpException(
        service.updatePost('post-9', { title: 'x' }),
      );

      expect(error.getStatus()).toBe(HttpStatus.NOT_FOUND);
      expect(prisma.post.update).not.toHaveBeenCalled();
    });

    it('should not clear translations on null and return the legacy select', async () => {
      const { createdAt: _createdAt, updatedAt: _updatedAt, ...updated } = row;

      prisma.post.findUnique.mockResolvedValue({ id: 'post-1' });
      prisma.post.update.mockResolvedValue(updated);

      const result = await service.updatePost('post-1', {
        title: 'New title',
        title_en: null,
        content_de: null,
        tags: ['b'],
      });

      expect(prisma.post.update).toHaveBeenCalledWith({
        where: { id: 'post-1' },
        data: {
          title: 'New title',
          title_en: undefined,
          title_de: undefined,
          category: undefined,
          content: undefined,
          content_en: undefined,
          content_de: undefined,
          image: undefined,
          tags: ['b'],
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
      expect(result).toStrictEqual({
        status: 'success',
        code: SuccessCode.POST_UPDATED,
        data: { post: updated },
      });
    });
  });

  describe('deletePost', () => {
    it('should answer 404 before deleting when the post is missing', async () => {
      prisma.post.findUnique.mockResolvedValue(null);

      const error = await captureHttpException(service.deletePost('post-9'));

      expect(error.getStatus()).toBe(HttpStatus.NOT_FOUND);
      expect(prisma.post.delete).not.toHaveBeenCalled();
    });

    it('should hard delete and answer without data', async () => {
      prisma.post.findUnique.mockResolvedValue({ id: 'post-1' });
      prisma.post.delete.mockResolvedValue({ id: 'post-1' });

      const result = await service.deletePost('post-1');

      expect(prisma.post.delete).toHaveBeenCalledWith({
        where: { id: 'post-1' },
        select: { id: true },
      });
      expect(result).toStrictEqual({
        status: 'success',
        code: SuccessCode.POST_DELETED,
      });
    });
  });
});
