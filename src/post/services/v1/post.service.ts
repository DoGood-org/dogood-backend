import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { ErrorCode, SuccessCode } from '@shared/constants/api-codes';
import { V1ApiException } from '@shared/exceptions/v1-api.exception';
import {
  CreatePostDataV1,
  LocalizedPostV1,
  PostDeletedResponseV1,
  PostLanguageV1,
  PostListResponseV1,
  PostResponseV1,
  PostSearchParamsV1,
  PostV1,
  UpdatedPostV1,
  UpdatePostDataV1,
} from 'src/post/interfaces/post';
import { PostMapperV1 } from 'src/post/mappers/v1/post.mapper';

const SUPPORTED_POST_LANGUAGES: string[] = Object.values(PostLanguageV1);

const isPostLanguage = (lang: string): lang is PostLanguageV1 =>
  SUPPORTED_POST_LANGUAGES.includes(lang);

// NOTE: legacy `httpError` without a third argument answers with no machine-readable code.
const codelessV1Exception = (
  statusCode: HttpStatus,
  message: string,
): V1ApiException =>
  new V1ApiException(statusCode, message, ErrorCode.VALIDATION_ERROR, {
    status: 'error',
    statusCode,
    code: null,
    message,
  });

@Injectable()
export class PostServiceV1 {
  constructor(
    private readonly prisma: PrismaService,
    private readonly postMapper: PostMapperV1,
  ) {}

  async createPost(data: CreatePostDataV1): Promise<PostResponseV1<PostV1>> {
    const {
      title,
      title_en,
      title_de,
      category,
      content,
      content_en,
      content_de,
      image,
      tags,
    } = data;
    const existingPost = await this.prisma.post.findFirst({
      where: { title },
      select: { id: true },
    });

    if (existingPost) {
      throw codelessV1Exception(
        HttpStatus.BAD_REQUEST,
        'A post with this name already exists',
      );
    }

    const post = await this.prisma.post.create({
      data: {
        title,
        title_en,
        title_de,
        category,
        content,
        content_en,
        content_de,
        image,
        tags,
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
        createdAt: true,
        updatedAt: true,
      },
    });

    return this.postMapper.toPostResponse(post, SuccessCode.POST_CREATED);
  }

  async getAllPosts(lang: string): Promise<PostListResponseV1> {
    const postLanguage = this.parseSupportedPostLanguage(lang);

    return await this.findLocalizedPosts({}, postLanguage);
  }

  async getFilteredPosts(
    params: PostSearchParamsV1,
    lang: string,
  ): Promise<PostListResponseV1> {
    const { title, category, fromDate, toDate } = params;

    const postLanguage = this.parseSupportedPostLanguage(lang);
    const where: Prisma.PostWhereInput = {};

    if (title) {
      const titleFilter: Prisma.StringFilter = {
        contains: title.trim(),
        mode: Prisma.QueryMode.insensitive,
      };

      if (postLanguage === PostLanguageV1.EN) {
        where.OR = [{ title_en: titleFilter }, { title: titleFilter }];
      } else if (postLanguage === PostLanguageV1.DE) {
        where.OR = [{ title_de: titleFilter }, { title: titleFilter }];
      } else {
        where.title = titleFilter;
      }
    }

    if (category) {
      where.category = {
        equals: category.trim(),
        mode: Prisma.QueryMode.insensitive,
      };
    }

    if (fromDate || toDate) {
      where.createdAt = {
        gte: fromDate ? new Date(fromDate) : undefined,
        lte: toDate ? new Date(toDate) : undefined,
      };
    }

    return await this.findLocalizedPosts(where, postLanguage);
  }

  // NOTE: legacy never validates lang here — anything unsupported localizes as default.
  async getPostById(
    id: string,
    lang: string,
  ): Promise<PostResponseV1<LocalizedPostV1>> {
    const postLanguage = isPostLanguage(lang) ? lang : PostLanguageV1.DEFAULT;
    const post = await this.prisma.post.findUnique({
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
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!post) {
      throw this.postNotFoundException(id);
    }

    return this.postMapper.toPostResponse(
      this.postMapper.toLocalizedPost(post, postLanguage),
      SuccessCode.POST_RETRIEVED,
    );
  }

  async updatePost(
    id: string,
    data: UpdatePostDataV1,
  ): Promise<PostResponseV1<UpdatedPostV1>> {
    const {
      title,
      title_en,
      title_de,
      category,
      content,
      content_en,
      content_de,
      image,
      tags,
    } = data;

    await this.assertPostExists(id);

    const post = await this.prisma.post.update({
      where: { id },
      data: {
        title,
        title_en: title_en ?? undefined,
        title_de: title_de ?? undefined,
        category,
        content,
        content_en: content_en ?? undefined,
        content_de: content_de ?? undefined,
        image,
        tags,
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

    return this.postMapper.toPostResponse(post, SuccessCode.POST_UPDATED);
  }

  async deletePost(id: string): Promise<PostDeletedResponseV1> {
    await this.assertPostExists(id);
    await this.prisma.post.delete({ where: { id }, select: { id: true } });

    return this.postMapper.toPostDeletedResponse();
  }

  private async findLocalizedPosts(
    where: Prisma.PostWhereInput,
    lang: PostLanguageV1,
  ): Promise<PostListResponseV1> {
    const posts = await this.prisma.post.findMany({
      where,
      orderBy: [
        { createdAt: Prisma.SortOrder.desc },
        { id: Prisma.SortOrder.asc },
      ],
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
        createdAt: true,
        updatedAt: true,
      },
    });

    return this.postMapper.toPostListResponse(posts, lang);
  }

  // NOTE: a pre-read, not P2025 — a wrong-shaped PATCH body fails Prisma validation before the query, and legacy
  // answers 404 for a missing post regardless of the body.
  private async assertPostExists(id: string): Promise<void> {
    const post = await this.prisma.post.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!post) {
      throw this.postNotFoundException(id);
    }
  }

  private postNotFoundException(id: string): V1ApiException {
    return codelessV1Exception(
      HttpStatus.NOT_FOUND,
      `Post with id ${id} not found`,
    );
  }

  // NOTE: legacy validateLanguage writes this body itself — no statusCode, no code.
  private parseSupportedPostLanguage(lang: string): PostLanguageV1 {
    if (!isPostLanguage(lang)) {
      throw new V1ApiException(
        HttpStatus.BAD_REQUEST,
        `Unsupported language: ${lang}`,
        ErrorCode.VALIDATION_ERROR,
        { status: 'error', message: `Unsupported language: ${lang}` },
      );
    }

    return lang;
  }
}
