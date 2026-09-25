import { PostLanguageV1, PostV1 } from 'src/post/interfaces/post';
import { PostMapperV1 } from 'src/post/mappers/v1/post.mapper';

describe('PostMapperV1', () => {
  const mapper = new PostMapperV1();
  const createdAt = new Date('2026-09-25T00:00:00Z');
  const post: PostV1 = {
    id: 'post-1',
    title: 'Base title',
    title_en: 'English title',
    title_de: 'Deutscher Titel',
    category: 'news',
    content: 'Base content text',
    content_en: 'English content text',
    content_de: 'Deutscher Inhalt',
    image: 'img.png',
    tags: ['a'],
    createdAt,
    updatedAt: createdAt,
  };
  const rest = {
    id: 'post-1',
    category: 'news',
    image: 'img.png',
    tags: ['a'],
    createdAt,
    updatedAt: createdAt,
  };

  describe('toLocalizedPost', () => {
    it('should pick the en fields and strip the _en/_de keys', () => {
      const result = mapper.toLocalizedPost(post, PostLanguageV1.EN);

      expect(result).toStrictEqual({
        ...rest,
        title: 'English title',
        content: 'English content text',
      });
    });

    it('should pick the de fields', () => {
      const result = mapper.toLocalizedPost(post, PostLanguageV1.DE);

      expect(result).toStrictEqual({
        ...rest,
        title: 'Deutscher Titel',
        content: 'Deutscher Inhalt',
      });
    });

    it('should keep the base fields for default', () => {
      const result = mapper.toLocalizedPost(post, PostLanguageV1.DEFAULT);

      expect(result).toStrictEqual({
        ...rest,
        title: 'Base title',
        content: 'Base content text',
      });
    });

    it.each([null, ''])(
      'should fall back to the base fields when the translation is %p',
      (translation: string | null) => {
        const result = mapper.toLocalizedPost(
          { ...post, title_de: translation, content_de: translation },
          PostLanguageV1.DE,
        );

        expect(result).toStrictEqual({
          ...rest,
          title: 'Base title',
          content: 'Base content text',
        });
      },
    );
  });

  describe('toPostListResponse', () => {
    it('should return count outside data and localized posts', () => {
      const result = mapper.toPostListResponse([post], PostLanguageV1.EN);

      expect(result).toStrictEqual({
        status: 'success',
        code: 'POSTS_RETRIEVED',
        count: 1,
        data: {
          posts: [
            {
              ...rest,
              title: 'English title',
              content: 'English content text',
            },
          ],
        },
      });
    });
  });
});
