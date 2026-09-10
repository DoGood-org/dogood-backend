import { Prisma } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { GetUserProfilesV2, UserSortField } from 'src/user/interfaces/v2/user';

/**
 * NOTE: validation only — the defaults (`sort`, `sortDirection`, `skip`, `limit`) live in the
 * service destructure so they exist in one place. Query values arrive as strings, hence the
 * coercion on the two numbers.
 */
export const getUserProfilesRequestSchemaV2 = z.object({
  search: z.string().min(1).optional(),
  sort: z.enum(UserSortField).optional(),
  sortDirection: z.enum(Prisma.SortOrder).optional(),
  skip: z.coerce.number().int().min(0).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export class GetUserProfilesRequestDtoV2
  extends createZodDto(getUserProfilesRequestSchemaV2)
  implements GetUserProfilesV2 {}
