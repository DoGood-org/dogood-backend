import { Post } from '@prisma/client';

export const langChecker = (post: Post | null, lang?: string) => {
  if (!post) return post;

  let localizedPost = { ...post };

  if (lang === 'en') {
    localizedPost.title = post?.title_en || post?.title;
    localizedPost.title = post?.content_en || post?.content;
  } else if (lang === 'de') {
    localizedPost.title = post?.title_de || post?.title;
    localizedPost.title = post?.content_de || post?.content;
  }

  return localizedPost;
};

export const localizePosts = (posts: Post[], lang?: string): Post[] => {
  return posts.map((post) => langChecker(post, lang) as Post);
};
