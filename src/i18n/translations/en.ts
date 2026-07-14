export const en = {
  email: {
    verification: {
      subject: 'Verify Your Email - DoGood',
      title: 'Verify Your Email',
      intro:
        'Thank you for registering! Please verify your email address to complete your registration.',
      clickToVerify: 'You can verify your email by clicking the button below:',
      button: 'Verify Email',
      orUseCode: 'Or use this verification code:',
      codeExpires:
        'This verification code will expire in <strong>{minutes} minutes</strong>.',
      footerIgnore:
        "If you didn't create an account, you can safely ignore this email.",
      footerAutomated: 'This is an automated message, please do not reply.',
    },
    resetPassword: {
      subject: 'Reset Your Password - DoGood',
      title: 'Reset Your Password',
      intro:
        'You have requested to reset your password. Click the button below to proceed:',
      button: 'Reset Password',
      securityNotice: '⚠️ Security Notice:',
      linkExpires:
        'This password reset link will expire in <strong>{minutes} minutes</strong>.',
      warningNotRequested:
        "If you didn't request this password reset, please ignore this email and your password will remain unchanged.",
      copyLink:
        'Alternatively, you can copy and paste this link into your browser:',
      footerIgnore:
        "If you didn't request a password reset, you can safely ignore this email.",
      footerAutomated: 'This is an automated message, please do not reply.',
    },
  },
};

export type Translations = typeof en;
