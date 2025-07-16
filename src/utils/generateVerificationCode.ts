import crypto from 'crypto';

export const generateVerificationCode = () => {
  return crypto.randomBytes(32).toString('hex');
};
