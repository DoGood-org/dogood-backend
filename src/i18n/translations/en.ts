import { NotificationType } from '@prisma/client';

interface NotificationText {
  title: string;
  body: string;
}

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
  notification: {
    ORG_JOIN_REQUEST_RECEIVED: {
      title: 'New Join Request',
      body: 'User {userName} wants to join "{orgName}".',
    },
    ORG_JOIN_REQUEST_ACCEPTED: {
      title: 'Request Accepted 🎉',
      body: 'Welcome! Your request to join "{orgName}" was accepted.',
    },
    ORG_JOIN_REQUEST_REJECTED: {
      title: 'Request Rejected',
      body: 'Unfortunately, your request to join "{orgName}" was declined.',
    },
    ORG_MEMBER_REMOVED: {
      title: 'Removed from Organization',
      body: 'You have been removed from "{orgName}".',
    },
    ORG_ROLE_UPDATED: {
      title: 'Role Updated',
      body: 'Your role in "{orgName}" has been changed to {role}.',
    },
    ORG_NEW_MODERATOR: {
      title: 'New Moderator',
      body: '{userName} is now a moderator in "{orgName}".',
    },
    TASK_VALIDATED: {
      title: 'Task Validated',
      body: 'Task "{taskTitle}" has been approved.',
    },
    TASK_REJECTED: {
      title: 'Task Rejected',
      body: 'Task "{taskTitle}" needs changes.',
    },
    TASK_STARTING_SOON: {
      title: 'Deadline Approaching',
      body: 'Task "{taskTitle}" starts soon!',
    },
    TASK_COMPLETED: {
      title: 'Task Completed',
      body: 'Task "{taskTitle}" is marked as finished.',
    },
    TASK_CLOSED: {
      title: 'Task Closed',
      body: 'Task "{taskTitle}" is now closed.',
    },
    REVIEW_RECEIVED: {
      title: 'New Review',
      body: 'You received a new review for "{targetName}".',
    },
    REVIEW_APPROVED: {
      title: 'Review Approved',
      body: 'Your review for "{targetName}" was published.',
    },
    REVIEW_REJECTED: {
      title: 'Review Rejected',
      body: 'Your review for "{targetName}" was declined.',
    },
    CHAT_MESSAGE_RECEIVED: {
      title: 'New message from {senderName}',
      body: '{messageText}',
    },
    SERVICE_MESSAGE_RECEIVED: {
      title: 'System Notification',
      body: '{messageText}',
    },
  } satisfies Record<NotificationType, NotificationText>,
};

export type Translations = typeof en;
