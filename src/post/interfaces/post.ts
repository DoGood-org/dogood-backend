import { SuccessCode } from '@shared/constants/api-codes';

// NOTE: the post module's own list, not the app-wide SUPPORTED_LANGUAGES — legacy SUPPORTED_LANG_VALUES.
export enum PostLanguageV1 {
  DEFAULT = 'default',
  EN = 'en',
  DE = 'de',
}

export interface CreatePostDataV1 {
  title: string;
  title_en: string;
  title_de: string;
  category: string;
  content: string;
  content_en: string;
  content_de: string;
  image: string;
  tags: string[];
}

// NOTE: legacy PATCH body is unvalidated — this type describes intent, not a guarantee.
export interface UpdatePostDataV1 {
  title?: string;
  title_en?: string | null;
  title_de?: string | null;
  category?: string;
  content?: string;
  content_en?: string | null;
  content_de?: string | null;
  image?: string;
  tags?: string[];
}

export interface PostSearchParamsV1 {
  title?: string;
  category?: string;
  fromDate?: string;
  toDate?: string;
}

export interface PostV1 {
  id: string;
  title: string;
  title_en: string | null;
  title_de: string | null;
  category: string;
  content: string;
  content_en: string | null;
  content_de: string | null;
  image: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type UpdatedPostV1 = Omit<PostV1, 'createdAt' | 'updatedAt'>;

export type LocalizedPostV1 = Omit<
  PostV1,
  'title_en' | 'title_de' | 'content_en' | 'content_de'
>;

export interface PostResponseV1<T> {
  status: 'success';
  code: SuccessCode;
  data: { post: T };
}

export interface PostListResponseV1 {
  status: 'success';
  code: SuccessCode;
  count: number;
  data: { posts: LocalizedPostV1[] };
}

export interface PostDeletedResponseV1 {
  status: 'success';
  code: SuccessCode;
}
