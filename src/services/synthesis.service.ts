/**
 * Service de génération de rapport de synthèse en texte brut.
 *
 * Fonction pure et réutilisable : à partir d'une liste de lignes
 * { label, amount }, produit un texte récapitulatif (détail des lignes,
 * total, moyenne). Ne dépend d'aucun framework HTTP ni du module
 * LegacyRenderer (en attente de refactoring).
 */

export interface SynthesisLine {
  label: string;
  amount: number;
}

export interface SynthesisOptions {
  title?: string;
}

const DEFAULT_TITLE = 'SYNTHÈSE';

export function generateSynthesis(lines: SynthesisLine[], options?: SynthesisOptions): string {
  const title = options?.title ?? DEFAULT_TITLE;
  const total = lines.reduce((sum, line) => sum + line.amount, 0);
  const average = lines.length === 0 ? 0 : total / lines.length;

  const output: string[] = [`=== ${title} ===`];

  for (const line of lines) {
    output.push(`${line.label}: ${line.amount.toFixed(2)} €`);
  }

  output.push('---');
  output.push(`Nombre de lignes: ${lines.length}`);
  output.push(`Total: ${total.toFixed(2)} €`);
  output.push(`Moyenne: ${average.toFixed(2)} €`);

  return output.join('\n');
}
