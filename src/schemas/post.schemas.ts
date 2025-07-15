import { z } from 'zod';

const createPostSchema = z.object({
  title: z.string().min(2, { message: 'Title is required' }),
  category: z.string().min(2, { message: 'Category is required' }),
  content: z.string().min(10, { message: 'Content is required' }),
  image: z.string({ message: 'Image is required' }),
  tags: z
      .array(z.string().min(1, 'Tag cannot be empty'))
      .min(1, { message: 'At least one tag is required' })
});

export const schemas = { createPostSchema };
