/**
 * LegacyRenderer — module legacy à refactorer (module de refactoring dédié).
 *
 * Code smells volontaires :
 *  - God Class : une seule classe gère génération, formatage ET envoi.
 *  - Switch géant sur le type de rapport (violation OCP : ajouter un
 *    nouveau type de rapport impose de modifier cette classe).
 *  - Logique dupliquée entre les branches (le calcul du total est
 *    recopié quasi à l'identique dans chaque case).
 *
 * Piste de refactoring attendue : pattern Strategy (une classe par type
 * de rapport, une interface commune), extraction du calcul de total.
 */

import { calculateTotal } from './reportCalculations';

export type ReportType = 'daily' | 'weekly' | 'monthly' | 'annual';

export interface ReportLine {
  label: string;
  amount: number;
}

export class LegacyRenderer {
  generate(type: ReportType, lines: ReportLine[]): string {
    switch (type) {
      case 'daily': {
        const total = calculateTotal(lines);
        return (
          `=== RAPPORT JOURNALIER ===\n` +
          lines.map((l) => `${l.label}: ${l.amount.toFixed(2)} €`).join('\n') +
          `\nTOTAL: ${total.toFixed(2)} €`
        );
      }
      case 'weekly': {
        const total = calculateTotal(lines);
        return (
          `=== RAPPORT HEBDOMADAIRE ===\n` +
          lines.map((l) => `${l.label}: ${l.amount.toFixed(2)} €`).join('\n') +
          `\nTOTAL SEMAINE: ${total.toFixed(2)} €`
        );
      }
      case 'monthly': {
        const total = calculateTotal(lines);
        const avg = lines.length ? total / lines.length : 0;
        return (
          `=== RAPPORT MENSUEL ===\n` +
          lines.map((l) => `${l.label}: ${l.amount.toFixed(2)} €`).join('\n') +
          `\nTOTAL: ${total.toFixed(2)} € (moyenne: ${avg.toFixed(2)} €)`
        );
      }
      case 'annual': {
        const total = calculateTotal(lines);
        return (
          `=== RAPPORT ANNUEL ===\n` +
          lines.map((l) => `${l.label}: ${l.amount.toFixed(2)} €`).join('\n') +
          `\nTOTAL ANNÉE: ${total.toFixed(2)} €`
        );
      }
      default:
        throw new Error(`Type de rapport inconnu: ${type}`);
    }
  }

  send(type: ReportType, content: string, recipient: string): void {
    // Simule un envoi (log) — dans un vrai système : SMTP, API, file d'attente...
    // eslint-disable-next-line no-console
    console.log(`[LegacyRenderer] Envoi du rapport ${type} à ${recipient}`);
    // eslint-disable-next-line no-console
    console.log(content);
  }
}
