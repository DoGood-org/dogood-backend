import { SuccessCode } from '@shared/constants/api-codes';
import { JsonSerialized } from '@shared/types/json-serialized';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ContactCreatedResponseV1 } from 'src/support/interfaces/support';

const createContactResponseSchemaV1 = z.object({
  status: z.literal('success'),
  code: z.literal(SuccessCode.CONTACT_CREATED),
  message: z.string(),
  data: z.object({
    id: z.string(),
    name: z.string(),
    phone: z.string().nullable(),
    email: z.string(),
    message: z.string(),
    createdAt: z.iso.datetime(),
  }),
});

export class CreateContactResponseDtoV1
  extends createZodDto(createContactResponseSchemaV1)
  implements JsonSerialized<ContactCreatedResponseV1> {}
