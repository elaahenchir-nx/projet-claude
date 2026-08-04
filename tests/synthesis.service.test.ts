import { generateSynthesis, SynthesisLine } from '../src/services/synthesis.service';

describe('generateSynthesis', () => {
  it('génère le texte de synthèse pour plusieurs lignes', () => {
    const lines: SynthesisLine[] = [
      { label: 'Ventes', amount: 1200.5 },
      { label: 'Services', amount: 340.0 },
    ];

    const expected = [
      '=== SYNTHÈSE ===',
      'Ventes: 1200.50 €',
      'Services: 340.00 €',
      '---',
      'Nombre de lignes: 2',
      'Total: 1540.50 €',
      'Moyenne: 770.25 €',
    ].join('\n');

    expect(generateSynthesis(lines)).toBe(expected);
  });

  it('ne lève pas d\'exception pour une liste vide', () => {
    const expected = [
      '=== SYNTHÈSE ===',
      '---',
      'Nombre de lignes: 0',
      'Total: 0.00 €',
      'Moyenne: 0.00 €',
    ].join('\n');

    expect(generateSynthesis([])).toBe(expected);
  });

  it('utilise le titre personnalisé fourni en option', () => {
    const lines: SynthesisLine[] = [{ label: 'Ventes', amount: 100 }];

    const result = generateSynthesis(lines, { title: 'RAPPORT TEST' });

    expect(result.startsWith('=== RAPPORT TEST ===')).toBe(true);
  });
});
