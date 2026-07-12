import { SetMetadata } from '@nestjs/common';

// For future use, we can define a type for the roles, e.g., 'admin', 'user', etc.
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
