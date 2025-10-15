import { Post } from '@prisma/client';

type LocalizedPost = Omit<
    Post,
    'title_en' | 'title_de' | 'content_en' | 'content_de'
    >;

export const langChecker = (post: Post | null, lang?: string): LocalizedPost | null => {
  if (!post) return null;

  const { title, title_en, title_de, content, content_en, content_de, ...rest } = post;

  let localizedTitle = title;
  let localizedContent = content;

  if (lang === 'en') {
    localizedTitle = title_en || title;
    localizedContent = content_en || content;
  } else if (lang === 'de') {
    localizedTitle = title_de || title;
    localizedContent = content_de || content;
  }

  // Формуємо об'єкт без _en /_de
  return {
    ...rest,
    title: localizedTitle,
    content: localizedContent,
  };
};

export const localizePosts = (posts: Post[], lang?: string): LocalizedPost[] => {
  return posts
      .map((post) => langChecker(post, lang))
      .filter((p): p is LocalizedPost => p !== null);
};
