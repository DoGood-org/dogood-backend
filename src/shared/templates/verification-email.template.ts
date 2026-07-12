/**
 * Email template для верифікації пошти
 * TODO: Додати підтримку багатомовності (en, de, uk)
 */

export const getVerificationEmailHtml = (code: string): string => {
  const verifyUrl = `${process.env.FRONTEND_URL}/verify/${code}`;

  return `
    <!DOCTYPE html>
    <html>
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
          <h1>Verify Your Email</h1>
          <p>Thank you for registering! Please verify your email address to complete your registration.</p>
          
          <p>You can verify your email by clicking the button below:</p>
          <a href="${verifyUrl}" class="button">Verify Email</a>
          
          <p>Or use this verification code:</p>
          <div class="code">${code}</div>
          
          <p>This verification code will expire in <strong>15 minutes</strong>.</p>
          
          <div class="footer">
            <p>If you didn't create an account, you can safely ignore this email.</p>
            <p>This is an automated message, please do not reply.</p>
          </div>
        </div>
      </body>
    </html>
  `;
};
