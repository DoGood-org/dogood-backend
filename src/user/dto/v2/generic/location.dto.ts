import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { UserLocationV2 } from 'src/user/interfaces/v2/user-profile';

export const locationSchema = z.object({
  id: z.string(),
  country: z.string().nullable(),
  region: z.string().nullable(),
  city: z.string().nullable(),
});

export class LocationV2Dto
  extends createZodDto(locationSchema)
  implements UserLocationV2 {}
