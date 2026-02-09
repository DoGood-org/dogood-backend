export const getVerificationEmailHtml = (
  code: string,
  lang: 'en' | 'de' | 'uk' = 'en'
) => {
  const locale = lang;

  const verifyUrl = `${process.env.FRONTEND_URL}/${locale}/verify/${code}`;

  if (lang === 'de') {
    return `
      <h1>Bestätigen Sie Ihre E-Mail</h1>
      <p>Klicken Sie auf den untenstehenden Link, um Ihre E-Mail-Adresse zu bestätigen:</p>
      <a href="${verifyUrl}">E-Mail bestätigen</a>
      <p>Dieser Link läuft in 15 Minuten ab.</p>
    `;
  }

  if (lang === 'en') {
    return `
      <h1>Verify your email</h1>
      <p>Click the link below to verify your email address:</p>
      <a href="${verifyUrl}">Verify Email</a>
      <p>This link will expire in 15 minutes.</p>
    `;
  }

  return `
    <h1>Verify your email</h1>
    <p>Click the link below to verify your email address:</p>
    <a href="${verifyUrl}">Verify Email</a>
    <p>This link will expire in 15 minutes.</p>
  `;
};
