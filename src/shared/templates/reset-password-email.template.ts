/**
 * Email template для скидання паролю
 * TODO: Додати підтримку багатомовності (en, de, uk)
 */

export const getResetPasswordEmailHtml = (
  resetPasswordToken: string,
): string => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetPasswordToken}`;

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
          <h1>Reset Your Password</h1>
          <p>You have requested to reset your password. Click the button below to proceed:</p>
          
          <a href="${resetUrl}" class="button">Reset Password</a>
          
          <div class="warning">
            <strong>⚠️ Security Notice:</strong>
            <p>This password reset link will expire in <strong>15 minutes</strong>.</p>
            <p>If you didn't request this password reset, please ignore this email and your password will remain unchanged.</p>
          </div>
          
          <p>Alternatively, you can copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #3498db;">${resetUrl}</p>
          
          <div class="footer">
            <p>If you didn't request a password reset, you can safely ignore this email.</p>
            <p>This is an automated message, please do not reply.</p>
          </div>
        </div>
      </body>
    </html>
  `;
};
