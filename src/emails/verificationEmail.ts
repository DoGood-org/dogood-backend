export const getVerificationEmailHtml = (code: string) => `
  <h1>Verify your email</h1>
  <p>Click the link below to verify your email address:</p>
  <a href="${process.env.FRONTEND_URL}/verify/${code}">Verify Email</a>
  <p>This link will expire in 10 minutes.</p>
`;
