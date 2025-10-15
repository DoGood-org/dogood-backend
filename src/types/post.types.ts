import {Post} from "@prisma/client";

export interface createPostInput {
  title: string;
  title_en?: string;
  title_de?: string;
  category: string;
  content: string;
  content_en?: string;
  content_de?: string;
  image: string;
  tags: string[];
}

export type PostFilterInput = {
  category?: string;
  title?: string;
  fromDate?: string | Date;
  toDate?: string | Date;
};

export type UpdatePostInput = Partial<Omit<createPostInput, 'id'>>;

export type LocalizedPost = Omit<
    Post,
    'title_en' | 'title_de' | 'content_en' | 'content_de'
    >;
