import { ExecutionContext } from '@nestjs/common';
import { VersionValue } from '@nestjs/common/interfaces';
import { VERSION_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';

export const API_VERSION_V1 = '1';

/**
 * NOTE: reads the version Nest itself stores for the route (`@Controller({ version })`
 * or `@Version()`), so guards split by version without parsing the URL.
 */
export function isVersionV1Route(
  reflector: Reflector,
  context: ExecutionContext,
): boolean {
  const version = reflector.getAllAndOverride<VersionValue | undefined>(
    VERSION_METADATA,
    [context.getHandler(), context.getClass()],
  );

  if (Array.isArray(version)) {
    return version.includes(API_VERSION_V1);
  }

  return version === API_VERSION_V1;
}
