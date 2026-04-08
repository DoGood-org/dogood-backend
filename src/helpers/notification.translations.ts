// src/helpers/notification.translations.ts
import { NotificationType } from '@prisma/client';

type NotificationContent = { title: string; body: string };
type TranslationFn = (data: any) => NotificationContent;

type Translations = {
  [key in 'en' | 'de']: {
    [key in NotificationType]: TranslationFn;
  };
};

export const translations: Translations = {
  en: {
    // --- Organizations ---
    ORG_JOIN_REQUEST_RECEIVED: (data) => ({
      title: 'New Join Request',
      body: `User ${data.userName} wants to join "${data.orgName}".`
    }),
    ORG_JOIN_REQUEST_ACCEPTED: (data) => ({
      title: 'Request Accepted 🎉',
      body: `Welcome! Your request to join "${data.orgName}" was accepted.`
    }),
    ORG_JOIN_REQUEST_REJECTED: (data) => ({
      title: 'Request Rejected',
      body: `Unfortunately, your request to join "${data.orgName}" was declined.`
    }),
    ORG_MEMBER_REMOVED: (data) => ({
      title: 'Removed from Organization',
      body: `You have been removed from "${data.orgName}".`
    }),
    ORG_ROLE_UPDATED: (data) => ({
      title: 'Role Updated',
      body: `Your role in "${data.orgName}" has been changed to ${data.role}.`
    }),
    ORG_NEW_MODERATOR: (data) => ({
      title: 'New Moderator',
      body: `${data.userName} is now a moderator in "${data.orgName}".`
    }),

    // --- Tasks ---
    TASK_VALIDATED: (data) => ({
      title: 'Task Validated',
      body: `Task "${data.taskTitle}" has been approved.`
    }),
    TASK_REJECTED: (data) => ({
      title: 'Task Rejected',
      body: `Task "${data.taskTitle}" needs changes.`
    }),
    TASK_STARTING_SOON: (data) => ({
      title: 'Deadline Approaching',
      body: `Task "${data.taskTitle}" starts soon!`
    }),
    TASK_COMPLETED: (data) => ({
      title: 'Task Completed',
      body: `Task "${data.taskTitle}" is marked as finished.`
    }),
    TASK_CLOSED: (data) => ({
      title: 'Task Closed',
      body: `Task "${data.taskTitle}" is now closed.`
    }),

    // --- Reviews ---
    REVIEW_RECEIVED: (data) => ({
      title: 'New Review',
      body: `You received a new review for "${data.targetName}".`
    }),
    REVIEW_APPROVED: (data) => ({
      title: 'Review Approved',
      body: `Your review for "${data.targetName}" was published.`
    }),
    REVIEW_REJECTED: (data) => ({
      title: 'Review Rejected',
      body: `Your review for "${data.targetName}" was declined.`
    }),

    // --- Chat & Service ---
    CHAT_MESSAGE_RECEIVED: (data) => ({
      title: `New message from ${data.senderName}`,
      body: data.messageText.length > 60 ? `${data.messageText.substring(0, 60)}...` : data.messageText
    }),
    SERVICE_MESSAGE_RECEIVED: (data) => ({
      title: 'System Notification',
      body: data.messageText
    }),
  },
  
  de: {
    // --- Organisationen ---
    ORG_JOIN_REQUEST_RECEIVED: (data) => ({
      title: 'Neue Beitrittsanfrage',
      body: `Benutzer ${data.userName} möchte "${data.orgName}" beitreten.`
    }),
    ORG_JOIN_REQUEST_ACCEPTED: (data) => ({
      title: 'Anfrage angenommen 🎉',
      body: `Willkommen! Ihre Anfrage zum Beitritt zu "${data.orgName}" wurde angenommen.`
    }),
    ORG_JOIN_REQUEST_REJECTED: (data) => ({
      title: 'Anfrage abgelehnt',
      body: `Leider wurde Ihre Anfrage zum Beitritt zu "${data.orgName}" abgelehnt.`
    }),
    ORG_MEMBER_REMOVED: (data) => ({
      title: 'Aus Organisation entfernt',
      body: `Sie wurden aus "${data.orgName}" entfernt.`
    }),
    ORG_ROLE_UPDATED: (data) => ({
      title: 'Rolle aktualisiert',
      body: `Ihre Rolle in "${data.orgName}" wurde in ${data.role} geändert.`
    }),
    ORG_NEW_MODERATOR: (data) => ({
      title: 'Neuer Moderator',
      body: `${data.userName} ist jetzt Moderator in "${data.orgName}".`
    }),

    // --- Aufgaben (Tasks) ---
    TASK_VALIDATED: (data) => ({
      title: 'Aufgabe validiert',
      body: `Die Aufgabe "${data.taskTitle}" wurde genehmigt.`
    }),
    TASK_REJECTED: (data) => ({
      title: 'Aufgabe abgelehnt',
      body: `Die Aufgabe "${data.taskTitle}" erfordert Änderungen.`
    }),
    TASK_STARTING_SOON: (data) => ({
      title: 'Frist rückt näher',
      body: `Die Aufgabe "${data.taskTitle}" beginnt bald!`
    }),
    TASK_COMPLETED: (data) => ({
      title: 'Aufgabe erledigt',
      body: `Die Aufgabe "${data.taskTitle}" wurde als abgeschlossen markiert.`
    }),
    TASK_CLOSED: (data) => ({
      title: 'Aufgabe geschlossen',
      body: `Die Aufgabe "${data.taskTitle}" ist nun geschlossen.`
    }),

    // --- Bewertungen (Reviews) ---
    REVIEW_RECEIVED: (data) => ({
      title: 'Neue Bewertung',
      body: `Sie haben eine neue Bewertung für "${data.targetName}" erhalten.`
    }),
    REVIEW_APPROVED: (data) => ({
      title: 'Bewertung genehmigt',
      body: `Ihre Bewertung für "${data.targetName}" wurde veröffentlicht.`
    }),
    REVIEW_REJECTED: (data) => ({
      title: 'Bewertung abgelehnt',
      body: `Ihre Bewertung für "${data.targetName}" wurde abgelehnt.`
    }),

    // --- Chat & Service ---
    CHAT_MESSAGE_RECEIVED: (data) => ({
      title: `Neue Nachricht von ${data.senderName}`,
      body: data.messageText.length > 60 ? `${data.messageText.substring(0, 60)}...` : data.messageText
    }),
    SERVICE_MESSAGE_RECEIVED: (data) => ({
      title: 'Systembenachrichtigung',
      body: data.messageText
    }),
  }
};