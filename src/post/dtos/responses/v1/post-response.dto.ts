import { SuccessCode } from '@shared/constants/api-codes';
import { JsonSerialized } from '@shared/types/json-serialized';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  localizedPostSchemaV1,
  postSchemaV1,
  updatedPostSchemaV1,
} from 'src/post/dtos/generic/v1/post.dto';
import {
  LocalizedPostV1,
  PostResponseV1,
  PostV1,
  UpdatedPostV1,
} from 'src/post/interfaces/post';

const createPostResponseSchemaV1 = z.object({
  status: z.literal('success'),
  code: z.literal(SuccessCode.POST_CREATED),
  data: z.object({ post: postSchemaV1 }),
});

const getPostResponseSchemaV1 = z.object({
  status: z.literal('success'),
  code: z.literal(SuccessCode.POST_RETRIEVED),
  data: z.object({ post: localizedPostSchemaV1 }),
});

const updatePostResponseSchemaV1 = z.object({
  status: z.literal('success'),
  code: z.literal(SuccessCode.POST_UPDATED),
  data: z.object({ post: updatedPostSchemaV1 }),
});

export class CreatePostResponseDtoV1
  extends createZodDto(createPostResponseSchemaV1)
  implements JsonSerialized<PostResponseV1<PostV1>> {}

export class GetPostResponseDtoV1
  extends createZodDto(getPostResponseSchemaV1)
  implements JsonSerialized<PostResponseV1<LocalizedPostV1>> {}

export class UpdatePostResponseDtoV1
  extends createZodDto(updatePostResponseSchemaV1)
  implements JsonSerialized<PostResponseV1<UpdatedPostV1>> {}
