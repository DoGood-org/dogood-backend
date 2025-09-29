export const getVerificationEmailHtml = (code: string, lang: string) => {
  if (lang === 'en') {
    return `
      <h1>Verify your email</h1>
      <p>Click the link below to verify your email address:</p>
      <a href="${process.env.FRONTEND_URL}/verify/${code}">Verify Email</a>
      <p>This link will expire in 15 minutes.</p>
    `;
  } else if (lang === 'de') {
    return `
      <h1>Bestätigen Sie Ihre E-Mail</h1>
      <p>Klicken Sie auf den untenstehenden Link, um Ihre E-Mail-Adresse zu bestätigen:</p>
      <a href="${process.env.FRONTEND_URL}/verify/${code}">E-Mail bestätigen</a>
      <p>Dieser Link läuft in 15 Minuten ab.</p>
    `;
  }

  return `
    <h1>Verify your email</h1>
    <p>Click the link below to verify your email address:</p>
    <a href="${process.env.FRONTEND_URL}/verify/${code}">Verify Email</a>
    <p>This link will expire in 15 minutes.</p>
  `;
};
