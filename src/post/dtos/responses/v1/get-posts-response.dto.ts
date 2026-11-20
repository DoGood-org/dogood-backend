import { SuccessCode } from '@shared/constants/api-codes';
import { JsonSerialized } from '@shared/types/json-serialized';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { localizedPostSchemaV1 } from 'src/post/dtos/generic/v1/post.dto';
import { PostListResponseV1 } from 'src/post/interfaces/post';

const getPostsResponseSchemaV1 = z.object({
  status: z.literal('success'),
  code: z.literal(SuccessCode.POSTS_RETRIEVED),
  count: z.number().int(),
  data: z.object({ posts: z.array(localizedPostSchemaV1) }),
});

export class GetPostsResponseDtoV1
  extends createZodDto(getPostsResponseSchemaV1)
  implements JsonSerialized<PostListResponseV1> {}
