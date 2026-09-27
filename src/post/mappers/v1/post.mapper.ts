import { Injectable } from '@nestjs/common';
import { SuccessCode } from '@shared/constants/api-codes';
import {
  LocalizedPostV1,
  PostDeletedResponseV1,
  PostLanguageV1,
  PostListResponseV1,
  PostResponseV1,
  PostV1,
} from 'src/post/interfaces/post';

@Injectable()
export class PostMapperV1 {
  // NOTE: `||` on purpose — legacy falls back to the base field on an empty string too.
  toLocalizedPost(post: PostV1, lang: PostLanguageV1): LocalizedPostV1 {
    const {
      title,
      title_en,
      title_de,
      content,
      content_en,
      content_de,
      ...rest
    } = post;

    switch (lang) {
      case PostLanguageV1.EN:
        return {
          ...rest,
          title: title_en || title,
          content: content_en || content,
        };
      case PostLanguageV1.DE:
        return {
          ...rest,
          title: title_de || title,
          content: content_de || content,
        };
      case PostLanguageV1.DEFAULT:
        return { ...rest, title, content };
    }
  }

  toPostResponse<T>(post: T, code: SuccessCode): PostResponseV1<T> {
    return { status: 'success', code, data: { post } };
  }

  toPostListResponse(
    posts: PostV1[],
    lang: PostLanguageV1,
  ): PostListResponseV1 {
    const localizedPosts = posts.map((post) =>
      this.toLocalizedPost(post, lang),
    );

    return {
      status: 'success',
      code: SuccessCode.POSTS_RETRIEVED,
      count: localizedPosts.length,
      data: { posts: localizedPosts },
    };
  }

  toPostDeletedResponse(): PostDeletedResponseV1 {
    return { status: 'success', code: SuccessCode.POST_DELETED };
  }
}
