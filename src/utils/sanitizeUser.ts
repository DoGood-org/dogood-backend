import { AuthenticatedUser, FullUser, PublicUser } from "@/types/user.types";

type SanitizeInput = FullUser | PublicUser | AuthenticatedUser | any;

export const sanitizeUser = (user: SanitizeInput) => {
  if (!user) return null;
  

  const safeUser = { ...user };

  delete safeUser.password;
  delete safeUser.emailVerificationCode;
  delete safeUser.emailVerificationExpiresAt;
  delete safeUser.resetPasswordToken;
  delete safeUser.resetPasswordExpiresAt;
  delete safeUser.refreshTokens; 


  if (user.organizations && Array.isArray(user.organizations)) {
    safeUser.organizations = user.organizations.map((entry: any) => {
      const org = entry.organization;
      if (!org) return entry; 

      return {
        id: org.id,
        name: org.name,
        avatar: org.avatar, 
        description: org.description,
        role: entry.role,
        status: entry.status,
        joinedAt: entry.createdAt,
        membersCount: org._count?.members || 0,
      };
    });
  }

  return safeUser;
};