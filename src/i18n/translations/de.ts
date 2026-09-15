import { Translations } from 'src/i18n/translations/en';

export const de: Translations = {
  email: {
    verification: {
      subject: 'Bestätigen Sie Ihre E-Mail-Adresse - DoGood',
      title: 'E-Mail-Adresse bestätigen',
      intro:
        'Vielen Dank für Ihre Registrierung! Bitte bestätigen Sie Ihre E-Mail-Adresse, um die Registrierung abzuschließen.',
      clickToVerify:
        'Sie können Ihre E-Mail-Adresse bestätigen, indem Sie auf die Schaltfläche unten klicken:',
      button: 'E-Mail bestätigen',
      orUseCode: 'Oder verwenden Sie diesen Bestätigungscode:',
      codeExpires:
        'Dieser Bestätigungscode läuft in <strong>{minutes} Minuten</strong> ab.',
      footerIgnore:
        'Wenn Sie kein Konto erstellt haben, können Sie diese E-Mail einfach ignorieren.',
      footerAutomated:
        'Dies ist eine automatische Nachricht, bitte antworten Sie nicht darauf.',
    },
    resetPassword: {
      subject: 'Passwort zurücksetzen - DoGood',
      title: 'Passwort zurücksetzen',
      intro:
        'Sie haben angefordert, Ihr Passwort zurückzusetzen. Klicken Sie auf die Schaltfläche unten, um fortzufahren:',
      button: 'Passwort zurücksetzen',
      securityNotice: '⚠️ Sicherheitshinweis:',
      linkExpires:
        'Dieser Link zum Zurücksetzen des Passworts läuft in <strong>{minutes} Minuten</strong> ab.',
      warningNotRequested:
        'Wenn Sie das Zurücksetzen des Passworts nicht angefordert haben, ignorieren Sie bitte diese E-Mail. Ihr Passwort bleibt unverändert.',
      copyLink:
        'Alternativ können Sie diesen Link kopieren und in Ihren Browser einfügen:',
      footerIgnore:
        'Wenn Sie das Zurücksetzen des Passworts nicht angefordert haben, können Sie diese E-Mail einfach ignorieren.',
      footerAutomated:
        'Dies ist eine automatische Nachricht, bitte antworten Sie nicht darauf.',
    },
  },
  notification: {
    ORG_JOIN_REQUEST_RECEIVED: {
      title: 'Neue Beitrittsanfrage',
      body: 'Benutzer {userName} möchte "{orgName}" beitreten.',
    },
    ORG_JOIN_REQUEST_ACCEPTED: {
      title: 'Anfrage angenommen 🎉',
      body: 'Willkommen! Ihre Anfrage zum Beitritt zu "{orgName}" wurde angenommen.',
    },
    ORG_JOIN_REQUEST_REJECTED: {
      title: 'Anfrage abgelehnt',
      body: 'Leider wurde Ihre Anfrage zum Beitritt zu "{orgName}" abgelehnt.',
    },
    ORG_MEMBER_REMOVED: {
      title: 'Aus Organisation entfernt',
      body: 'Sie wurden aus "{orgName}" entfernt.',
    },
    ORG_ROLE_UPDATED: {
      title: 'Rolle aktualisiert',
      body: 'Ihre Rolle in "{orgName}" wurde in {role} geändert.',
    },
    ORG_NEW_MODERATOR: {
      title: 'Neuer Moderator',
      body: '{userName} ist jetzt Moderator in "{orgName}".',
    },
    TASK_VALIDATED: {
      title: 'Aufgabe validiert',
      body: 'Die Aufgabe "{taskTitle}" wurde genehmigt.',
    },
    TASK_REJECTED: {
      title: 'Aufgabe abgelehnt',
      body: 'Die Aufgabe "{taskTitle}" erfordert Änderungen.',
    },
    TASK_STARTING_SOON: {
      title: 'Frist rückt näher',
      body: 'Die Aufgabe "{taskTitle}" beginnt bald!',
    },
    TASK_COMPLETED: {
      title: 'Aufgabe erledigt',
      body: 'Die Aufgabe "{taskTitle}" wurde als abgeschlossen markiert.',
    },
    TASK_CLOSED: {
      title: 'Aufgabe geschlossen',
      body: 'Die Aufgabe "{taskTitle}" ist nun geschlossen.',
    },
    REVIEW_RECEIVED: {
      title: 'Neue Bewertung',
      body: 'Sie haben eine neue Bewertung für "{targetName}" erhalten.',
    },
    REVIEW_APPROVED: {
      title: 'Bewertung genehmigt',
      body: 'Ihre Bewertung für "{targetName}" wurde veröffentlicht.',
    },
    REVIEW_REJECTED: {
      title: 'Bewertung abgelehnt',
      body: 'Ihre Bewertung für "{targetName}" wurde abgelehnt.',
    },
    CHAT_MESSAGE_RECEIVED: {
      title: 'Neue Nachricht von {senderName}',
      body: '{messageText}',
    },
    SERVICE_MESSAGE_RECEIVED: {
      title: 'Systembenachrichtigung',
      body: '{messageText}',
    },
  },
};
