import { authServices } from "@/services/auth.service";


type ExtendedUser = Awaited<ReturnType<typeof authServices.findUserById>>;

export const sanitizeUser = (user: ExtendedUser) => {
  if (!user) return null;
  
  // Робимо копію об'єкта, щоб не мутувати оригінал, який прийшов із сервісу
  const safeUser = { ...user } as any;

  // Видаляємо конфіденційні поля через delete
  delete safeUser.password;
  delete safeUser.emailVerificationCode;
  delete safeUser.emailVerificationExpiresAt;
  delete safeUser.resetPasswordToken;
  delete safeUser.resetPasswordExpiresAt;

  // Трансформуємо масив організацій, якщо він існує
  if (user.organizations && Array.isArray(user.organizations)) {
    safeUser.organizations = user.organizations.map((entry) => ({
      id: entry.organization.id,
      name: entry.organization.name,
      role: entry.role,
      status: entry.status,
      joinedAt: entry.createdAt,
    }));
  } else {
    safeUser.organizations = [];
  }

  return safeUser;
};
