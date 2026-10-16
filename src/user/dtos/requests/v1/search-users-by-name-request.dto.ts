import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { SearchUsersByNameDataV1 } from 'src/user/interfaces/user';

// NOTE: legacy `getUserNameSchema`: `name` is optional here, its absence is a 400 in the service.
const searchUsersByNameRequestSchemaV1 = z.object({
  name: z
    .string('Name must be a string')
    .min(1, 'Name cannot be empty')
    .optional(),
});

export class SearchUsersByNameRequestDtoV1
  extends createZodDto(searchUsersByNameRequestSchemaV1)
  implements SearchUsersByNameDataV1 {}
