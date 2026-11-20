import { JsonSerialized } from '@shared/types/json-serialized';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { PostV1 } from 'src/post/interfaces/post';

export const postSchemaV1 = z.object({
  id: z.string(),
  title: z.string(),
  title_en: z.string().nullable(),
  title_de: z.string().nullable(),
  category: z.string(),
  content: z.string(),
  content_en: z.string().nullable(),
  content_de: z.string().nullable(),
  image: z.string(),
  tags: z.array(z.string()),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const localizedPostSchemaV1 = postSchemaV1.omit({
  title_en: true,
  title_de: true,
  content_en: true,
  content_de: true,
});

export const updatedPostSchemaV1 = postSchemaV1.omit({
  createdAt: true,
  updatedAt: true,
});

export class PostDtoV1
  extends createZodDto(postSchemaV1)
  implements JsonSerialized<PostV1> {}
