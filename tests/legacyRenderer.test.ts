import { LegacyRenderer, ReportLine, ReportType } from '../src/legacy/LegacyRenderer';
import { UnknownReportTypeError } from '../src/legacy/errors';

describe('LegacyRenderer.generate - caractérisation avant refactoring', () => {
  const renderer = new LegacyRenderer();
  const lines: ReportLine[] = [
    { label: 'Ventes', amount: 1200.5 },
    { label: 'Services', amount: 340.0 },
  ];

  it('génère le rapport journalier', () => {
    expect(renderer.generate('daily', lines)).toBe(
      '=== RAPPORT JOURNALIER ===\n' +
        'Ventes: 1200.50 €\n' +
        'Services: 340.00 €\n' +
        'TOTAL: 1540.50 €'
    );
  });

  it('génère le rapport hebdomadaire', () => {
    expect(renderer.generate('weekly', lines)).toBe(
      '=== RAPPORT HEBDOMADAIRE ===\n' +
        'Ventes: 1200.50 €\n' +
        'Services: 340.00 €\n' +
        'TOTAL SEMAINE: 1540.50 €'
    );
  });

  it('génère le rapport mensuel avec la moyenne', () => {
    expect(renderer.generate('monthly', lines)).toBe(
      '=== RAPPORT MENSUEL ===\n' +
        'Ventes: 1200.50 €\n' +
        'Services: 340.00 €\n' +
        'TOTAL: 1540.50 € (moyenne: 770.25 €)'
    );
  });

  it('génère le rapport annuel', () => {
    expect(renderer.generate('annual', lines)).toBe(
      '=== RAPPORT ANNUEL ===\n' +
        'Ventes: 1200.50 €\n' +
        'Services: 340.00 €\n' +
        'TOTAL ANNÉE: 1540.50 €'
    );
  });

  it('lève une UnknownReportTypeError pour un type de rapport inconnu', () => {
    expect(() => renderer.generate('bogus' as ReportType, lines)).toThrow(
      UnknownReportTypeError
    );
    expect(() => renderer.generate('bogus' as ReportType, lines)).toThrow(
      'Type de rapport inconnu: bogus'
    );
  });
});

describe('LegacyRenderer.send - caractérisation avant refactoring', () => {
  it('logue l\'annonce d\'envoi puis le contenu', () => {
    const renderer = new LegacyRenderer();
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    renderer.send('daily', 'CONTENU', 'alice@example.com');

    expect(logSpy).toHaveBeenNthCalledWith(
      1,
      '[LegacyRenderer] Envoi du rapport daily à alice@example.com'
    );
    expect(logSpy).toHaveBeenNthCalledWith(2, 'CONTENU');

    logSpy.mockRestore();
  });
});
