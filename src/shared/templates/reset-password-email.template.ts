import { TemplateTranslateFn } from 'src/shared/templates/template.types';

/**
 * Email template для скидання паролю (en, de, uk — через i18n)
 */

export const getResetPasswordEmailHtml = (
  resetPasswordToken: string,
  t: TemplateTranslateFn,
  lang = 'en',
): string => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetPasswordToken}`;

  return `
    <!DOCTYPE html>
    <html lang="${lang}">
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #f9f9f9;
            border-radius: 10px;
            padding: 30px;
            margin: 20px 0;
          }
          h1 {
            color: #2c3e50;
            margin-bottom: 20px;
          }
          .button {
            display: inline-block;
            padding: 12px 30px;
            background-color: #e74c3c;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
          }
          .button:hover {
            background-color: #c0392b;
          }
          .warning {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
          }
          .footer {
            margin-top: 30px;
            font-size: 12px;
            color: #7f8c8d;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>${t('email.resetPassword.title')}</h1>
          <p>${t('email.resetPassword.intro')}</p>

          <a href="${resetUrl}" class="button">${t('email.resetPassword.button')}</a>

          <div class="warning">
            <strong>${t('email.resetPassword.securityNotice')}</strong>
            <p>${t('email.resetPassword.linkExpires', { minutes: 15 })}</p>
            <p>${t('email.resetPassword.warningNotRequested')}</p>
          </div>

          <p>${t('email.resetPassword.copyLink')}</p>
          <p style="word-break: break-all; color: #3498db;">${resetUrl}</p>

          <div class="footer">
            <p>${t('email.resetPassword.footerIgnore')}</p>
            <p>${t('email.resetPassword.footerAutomated')}</p>
          </div>
        </div>
      </body>
    </html>
  `;
};
