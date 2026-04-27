export interface AuthenticatedUser {
  id: string;
  email: string;
  isEmailVerified: boolean;
  name?: string; 
  siteRole?: string;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthenticatedUser;
  }
}
