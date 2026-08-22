import { Prisma } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  GetUserProfilesV2,
  UserSortField,
} from 'src/user/interfaces/v2/get-user-profiles';

/** Усі поля опційні — дефолти лежать у UserV2Service.getUserProfiles. */
export const getUserProfilesSchema = z.object({
  search: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[^\0]*$/, 'NUL bytes are not allowed')
    .optional(),
  sort: z.enum(UserSortField).optional(),
  sortDirection: z.enum(Prisma.SortOrder).optional(),
  skip: z.coerce.number().int().min(0).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export class GetUserProfilesRequestV2Dto
  extends createZodDto(getUserProfilesSchema)
  implements GetUserProfilesV2 {}
