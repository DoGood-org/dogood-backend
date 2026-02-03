import { authServices } from "@/services/auth.service";


type ExtendedUser = Awaited<ReturnType<typeof authServices.findUserById>>;

export const sanitizeUser = (user: ExtendedUser) => {
  if (!user) return null;
  
  const safeUser = { ...user } as any;


  delete safeUser.password;
  delete safeUser.emailVerificationCode;
  
  delete safeUser.emailVerificationExpiresAt;
  delete safeUser.resetPasswordToken;
  delete safeUser.resetPasswordExpiresAt;

  if (user.organizations && Array.isArray(user.organizations)) {
    safeUser.organizations = user.organizations.map((entry) => ({
      id: entry.organization.id,
      name: entry.organization.name,
      avatar: entry.organization.avatar, 
      description: entry.organization.description,
      role: entry.role,
      status: entry.status,
      joinedAt: entry.createdAt,
      
      membersCount: entry.organization._count?.members || 0,
    }));
  } else {
    safeUser.organizations = [];
  }

  return safeUser;
};
