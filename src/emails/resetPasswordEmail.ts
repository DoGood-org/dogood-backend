export const getResetPasswordEmail = (resetPasswordToken: string, lang: string) => {
  if (lang === 'en') {
    return `
      <h1>Reset Your Password</h1>
      <p>Click the link below to reset your password:</p>
      <a href="${process.env.FRONTEND_URL}/reset-password/${resetPasswordToken}">Reset Password</a>
      <p>This link will expire in 15 minutes.</p>
    `;
  } else if (lang === 'de') {
    return `
      <h1>Setzen Sie Ihr Passwort zurück</h1>
      <p>Klicken Sie auf den untenstehenden Link, um Ihr Passwort zurückzusetzen:</p>
      <a href="${process.env.FRONTEND_URL}/reset-password/${resetPasswordToken}">Passwort zurücksetzen</a>
      <p>Dieser Link läuft in 15 Minuten ab.</p>
    `;
  }

  return `
    <h1>Reset Your Password</h1>
    <p>Click the link below to reset your password:</p>
    <a href="${process.env.FRONTEND_URL}/reset-password/${resetPasswordToken}">Reset Password</a>
    <p>This link will expire in 15 minutes.</p>
  `;
};
