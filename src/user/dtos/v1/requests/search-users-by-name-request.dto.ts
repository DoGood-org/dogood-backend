import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { SearchUsersByNameV1 } from 'src/user/interfaces/v1/user';

/**
 * NOTE: one-to-one port of develop:src/schemas/user.schema.ts:59 `getUserNameSchema`, where
 * `name` is optional. An empty body therefore passes validation and is rejected further down,
 * by the service, with the legacy `VALIDATION_ERROR` code — that order is legacy behaviour.
 */
export const searchUsersByNameRequestSchemaV1 = z.object({
  name: z
    .string({ error: 'Name must be a string' })
    .min(1, 'Name cannot be empty')
    .optional(),
});

export class SearchUsersByNameRequestDtoV1
  extends createZodDto(searchUsersByNameRequestSchemaV1)
  implements SearchUsersByNameV1 {}
