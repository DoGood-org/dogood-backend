import { z } from 'zod';
import { JSONSchema } from 'zod/v4/core';

// NOTE: zod cannot represent some types (e.g. Date) in JSON Schema and nestjs-zod gives toJSONSchema no
// `override`, so Swagger generation throws on them. This replaces only the documented shape — parsing is untouched.
// NOTE: pass a schema without a zod `parent` (a wrapper like `.optional()`, not the result of `.refine()`/`.describe()`):
// zod 4.6 skips parent processing on an override but its finalize step still walks the parent and crashes.
export function withJsonSchema<T extends z.ZodType>(
  schema: T,
  jsonSchema: JSONSchema.BaseSchema,
): T {
  schema._zod.toJSONSchema = (): JSONSchema.BaseSchema => jsonSchema;

  return schema;
}
