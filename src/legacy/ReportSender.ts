import type { ReportType } from './LegacyRenderer';

export function sendReport(type: ReportType, content: string, recipient: string): void {
  // Simule un envoi (log) — dans un vrai système : SMTP, API, file d'attente...
  // eslint-disable-next-line no-console
  console.log(`[ReportSender] Envoi du rapport ${type} à ${recipient}`);
  // eslint-disable-next-line no-console
  console.log(content);
}
