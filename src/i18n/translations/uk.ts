import { Translations } from 'src/i18n/translations/en';

export const uk: Translations = {
  email: {
    verification: {
      subject: 'Підтвердіть вашу електронну пошту - DoGood',
      title: 'Підтвердіть вашу електронну пошту',
      intro:
        'Дякуємо за реєстрацію! Будь ласка, підтвердіть свою електронну адресу, щоб завершити реєстрацію.',
      clickToVerify:
        'Ви можете підтвердити свою електронну адресу, натиснувши кнопку нижче:',
      button: 'Підтвердити пошту',
      orUseCode: 'Або скористайтеся цим кодом підтвердження:',
      codeExpires:
        'Цей код підтвердження діє протягом <strong>{minutes} хвилин</strong>.',
      footerIgnore:
        'Якщо ви не створювали обліковий запис, просто проігноруйте цей лист.',
      footerAutomated:
        'Це автоматичне повідомлення, будь ласка, не відповідайте на нього.',
    },
    resetPassword: {
      subject: 'Скидання паролю - DoGood',
      title: 'Скидання паролю',
      intro:
        'Ви надіслали запит на скидання паролю. Натисніть кнопку нижче, щоб продовжити:',
      button: 'Скинути пароль',
      securityNotice: '⚠️ Попередження безпеки:',
      linkExpires:
        'Це посилання для скидання паролю діє протягом <strong>{minutes} хвилин</strong>.',
      warningNotRequested:
        'Якщо ви не надсилали запит на скидання паролю, проігноруйте цей лист — ваш пароль залишиться незмінним.',
      copyLink:
        'Також ви можете скопіювати це посилання та вставити його у браузер:',
      footerIgnore:
        'Якщо ви не надсилали запит на скидання паролю, просто проігноруйте цей лист.',
      footerAutomated:
        'Це автоматичне повідомлення, будь ласка, не відповідайте на нього.',
    },
  },
  notification: {
    ORG_JOIN_REQUEST_RECEIVED: {
      title: 'Новий запит на вступ',
      body: 'Користувач {userName} хоче приєднатися до "{orgName}".',
    },
    ORG_JOIN_REQUEST_ACCEPTED: {
      title: 'Запит прийнято 🎉',
      body: 'Вітаємо! Ваш запит на вступ до "{orgName}" прийнято.',
    },
    ORG_JOIN_REQUEST_REJECTED: {
      title: 'Запит відхилено',
      body: 'На жаль, ваш запит на вступ до "{orgName}" відхилено.',
    },
    ORG_MEMBER_REMOVED: {
      title: 'Вилучено з організації',
      body: 'Вас вилучено з "{orgName}".',
    },
    ORG_ROLE_UPDATED: {
      title: 'Роль оновлено',
      body: 'Вашу роль в "{orgName}" змінено на {role}.',
    },
    ORG_NEW_MODERATOR: {
      title: 'Новий модератор',
      body: '{userName} тепер модератор в "{orgName}".',
    },
    TASK_VALIDATED: {
      title: 'Завдання підтверджено',
      body: 'Завдання "{taskTitle}" схвалено.',
    },
    TASK_REJECTED: {
      title: 'Завдання відхилено',
      body: 'Завдання "{taskTitle}" потребує змін.',
    },
    TASK_STARTING_SOON: {
      title: 'Наближається термін',
      body: 'Завдання "{taskTitle}" скоро розпочнеться!',
    },
    TASK_COMPLETED: {
      title: 'Завдання виконано',
      body: 'Завдання "{taskTitle}" позначено як завершене.',
    },
    TASK_CLOSED: {
      title: 'Завдання закрито',
      body: 'Завдання "{taskTitle}" закрито.',
    },
    REVIEW_RECEIVED: {
      title: 'Новий відгук',
      body: 'Ви отримали новий відгук щодо "{targetName}".',
    },
    REVIEW_APPROVED: {
      title: 'Відгук схвалено',
      body: 'Ваш відгук щодо "{targetName}" опубліковано.',
    },
    REVIEW_REJECTED: {
      title: 'Відгук відхилено',
      body: 'Ваш відгук щодо "{targetName}" відхилено.',
    },
    CHAT_MESSAGE_RECEIVED: {
      title: 'Нове повідомлення від {senderName}',
      body: '{messageText}',
    },
    SERVICE_MESSAGE_RECEIVED: {
      title: 'Системне сповіщення',
      body: '{messageText}',
    },
  },
};
