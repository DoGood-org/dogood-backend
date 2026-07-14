import { Translations } from './en';

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
};
