import { User } from "@prisma/client";
import { generateVerificationCode } from "./generateVerificationCode";
import { addMinutes } from "date-fns";
import { getResetPasswordEmail } from "@/emails/resetPasswordEmail";
import { saveResetPasswordTokenService } from "@/services/auth.service";
import { sendEmail } from "./sendEmail";
import logger from "./logger";

export const sendResetPasswordEmail = async (user: User, lang: string) => {
  const resetPasswordToken = generateVerificationCode();
  const resetPasswordExpiresAt = addMinutes(new Date(), 15);
  const html = getResetPasswordEmail(resetPasswordToken, lang);

  await saveResetPasswordTokenService({ userId: user.id, resetPasswordToken, resetPasswordExpiresAt });
  await sendEmail(user.email, 'Reset Password', html);

  logger.info('Password reset email sent', { userId: user.id, email: user.email });
};