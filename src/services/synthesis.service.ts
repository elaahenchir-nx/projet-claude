/**
 * Service de génération de rapport de synthèse en texte brut.
 *
 * Fonction pure et réutilisable : à partir d'une liste de lignes
 * { label, amount }, produit un texte récapitulatif (détail des lignes,
 * total, moyenne). Ne dépend d'aucun framework HTTP ni du module
 * LegacyRenderer (en attente de refactoring).
 *
 * Cohérence du total : le rapport doit « boucler », c'est-à-dire que le total
 * affiché doit être exactement égal à la somme des lignes affichées. Cela
 * impose de n'arrondir qu'UNE seule fois, au centime, au niveau de la ligne,
 * puis de cumuler ces entiers. Cumuler les montants bruts avant d'arrondir
 * (`Σ montant` puis `.toFixed(2)`) fait apparaître un écart de quelques
 * centimes dès que les montants d'entrée ont une précision sous-centime :
 * chaque ligne affichée est décalée d'un demi-centime au plus, et ces écarts
 * s'accumulent sur un grand nombre de lignes.
 */

export interface SynthesisLine {
  label: string;
  amount: number;
}

export interface SynthesisOptions {
  title?: string;
}

const DEFAULT_TITLE = 'SYNTHÈSE';

/**
 * Convertit un montant en euros en un nombre entier de centimes.
 *
 * Unique point d'arrondi du service : lignes, total et moyenne sont tous
 * dérivés de cette valeur. Même convention que `calculateTTC`
 * (`invoice.service.ts`) pour rester homogène dans le dépôt.
 */
function versCentimes(montant: number): number {
  return Math.round(montant * 100);
}

/**
 * Formate un nombre entier de centimes en euros. Le calcul se fait sur des
 * entiers, sans repasser par un flottant, donc sans nouvel arrondi possible.
 */
function formaterCentimes(centimes: number): string {
  // Entrées dégénérées (NaN, Infinity) : on conserve le rendu d'origine.
  if (!Number.isFinite(centimes)) return (centimes / 100).toFixed(2);

  const signe = centimes < 0 ? '-' : '';
  const absolu = Math.abs(centimes);
  return `${signe}${Math.floor(absolu / 100)}.${String(absolu % 100).padStart(2, '0')}`;
}

export function generateSynthesis(lines: SynthesisLine[], options?: SynthesisOptions): string {
  const title = options?.title ?? DEFAULT_TITLE;

  // Arrondi au centime une fois par ligne, puis cumul sur des entiers :
  // ni écart entre le total et les lignes, ni dérive d'accumulation IEEE 754.
  const centimesParLigne = lines.map((line) => versCentimes(line.amount));
  const totalCentimes = centimesParLigne.reduce((sum, centimes) => sum + centimes, 0);
  const moyenneCentimes = lines.length === 0 ? 0 : Math.round(totalCentimes / lines.length);

  const output: string[] = [`=== ${title} ===`];

  lines.forEach((line, index) => {
    output.push(`${line.label}: ${formaterCentimes(centimesParLigne[index])} €`);
  });

  output.push('---');
  output.push(`Nombre de lignes: ${lines.length}`);
  output.push(`Total: ${formaterCentimes(totalCentimes)} €`);
  // La moyenne est un indicateur dérivé, pas un terme de la somme : elle est
  // arrondie au centime et ne vérifie donc pas `moyenne × n = total`
  // (1.00 / 3 → 0.33, et 3 × 0.33 = 0.99). C'est arithmétiquement inévitable.
  output.push(`Moyenne: ${formaterCentimes(moyenneCentimes)} €`);

  return output.join('\n');
}
