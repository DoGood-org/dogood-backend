import { TemplateTranslateFn } from 'src/shared/templates/template.types';

/**
 * Email template для верифікації пошти (en, de, uk — через i18n)
 */

export const getVerificationEmailHtml = (
  code: string,
  t: TemplateTranslateFn,
  lang = 'en',
): string => {
  const verifyUrl = `${process.env.FRONTEND_URL}/verify/${code}`;

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
            background-color: #3498db;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
          }
          .button:hover {
            background-color: #2980b9;
          }
          .code {
            font-size: 24px;
            font-weight: bold;
            letter-spacing: 5px;
            color: #2c3e50;
            background-color: #ecf0f1;
            padding: 15px;
            border-radius: 5px;
            text-align: center;
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
          <h1>${t('email.verification.title')}</h1>
          <p>${t('email.verification.intro')}</p>

          <p>${t('email.verification.clickToVerify')}</p>
          <a href="${verifyUrl}" class="button">${t('email.verification.button')}</a>

          <p>${t('email.verification.orUseCode')}</p>
          <div class="code">${code}</div>

          <p>${t('email.verification.codeExpires', { minutes: 15 })}</p>

          <div class="footer">
            <p>${t('email.verification.footerIgnore')}</p>
            <p>${t('email.verification.footerAutomated')}</p>
          </div>
        </div>
      </body>
    </html>
  `;
};
