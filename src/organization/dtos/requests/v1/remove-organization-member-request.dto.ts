import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const removeOrganizationMemberRequestSchemaV1 = z.object({
  userId: z.string(),
  organizationId: z.string(),
});

// NOTE: swagger-only (`@ApiBody`) — legacy reads this body unvalidated, so this class must never become the
// `@Body()` parameter type: the global ZodValidationPipe would replace the legacy 400 envelope and code.
export class RemoveOrganizationMemberRequestDtoV1 extends createZodDto(
  removeOrganizationMemberRequestSchemaV1,
) {}
