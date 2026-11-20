import { JsonSerialized } from '@shared/types/json-serialized';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { HealthReadinessResultV1 } from 'src/health/interfaces/health';

const healthReadinessResponseSchemaV1 = z.object({
  status: z.literal('ready'),
  timestamp: z.iso.datetime(),
  services: z.object({ database: z.literal('up') }),
});

export class HealthReadinessResponseDtoV1
  extends createZodDto(healthReadinessResponseSchemaV1)
  implements JsonSerialized<HealthReadinessResultV1> {}
