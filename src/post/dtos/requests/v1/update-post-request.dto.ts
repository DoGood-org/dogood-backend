import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { UpdatePostDataV1 } from 'src/post/interfaces/post';

const updatePostRequestSchemaV1 = z.object({
  title: z.string().optional(),
  title_en: z.string().nullable().optional(),
  title_de: z.string().nullable().optional(),
  category: z.string().optional(),
  content: z.string().optional(),
  content_en: z.string().nullable().optional(),
  content_de: z.string().nullable().optional(),
  image: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// NOTE: swagger-only (`@ApiBody`) — legacy PATCH body is unvalidated, so this class must never become the
// `@Body()` parameter type: the global ZodValidationPipe would start rejecting bodies legacy accepted.
export class UpdatePostRequestDtoV1
  extends createZodDto(updatePostRequestSchemaV1)
  implements UpdatePostDataV1 {}
