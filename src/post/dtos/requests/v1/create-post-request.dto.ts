import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { CreatePostDataV1 } from 'src/post/interfaces/post';

const createPostRequestSchemaV1 = z.object({
  title: z.string().min(2, { message: 'Title is required' }),
  title_en: z.string().min(2, { message: 'Title_en is required' }),
  title_de: z.string().min(2, { message: 'Title_de is required' }),
  category: z.string().min(3, { message: 'Category is required' }),
  content: z.string().min(10, { message: 'Content is required' }),
  content_en: z.string().min(10, { message: 'Content_en is required' }),
  content_de: z.string().min(10, { message: 'Content_de is required' }),
  image: z.string({ message: 'Image is required' }),
  tags: z
    .array(z.string().min(1, 'Tag cannot be empty'))
    .min(1, { message: 'At least one tag is required' }),
});

export class CreatePostRequestDtoV1
  extends createZodDto(createPostRequestSchemaV1)
  implements CreatePostDataV1 {}
