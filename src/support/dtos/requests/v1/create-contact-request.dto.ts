import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { CreateContactDataV1 } from 'src/support/interfaces/support';

const createContactRequestSchemaV1 = z.object({
  name: z.string().min(2, 'Name is required'),
  phone: z
    .string()
    .min(7, 'Phone number is too short')
    .max(15, 'Phone number is too long')
    .regex(/^\+?[0-9\s\-()]+$/, 'Invalid phone number'),
  email: z.email('Invalid email'),
  message: z.string().min(1, 'Message is required'),
});

export class CreateContactRequestDtoV1
  extends createZodDto(createContactRequestSchemaV1)
  implements CreateContactDataV1 {}
