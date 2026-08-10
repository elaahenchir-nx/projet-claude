import { groupByDay, Transaction } from '../src/services/report.service';

describe('groupByDay - regroupement en UTC (indépendant du fuseau serveur)', () => {
  const originalTZ = process.env.TZ;

  beforeEach(() => {
    // Fuseau fixe UTC+1 sans heure d'été, pour reproduire un serveur
    // en avance sur UTC (cas Tunisie/Europe évoqué dans le symptôme).
    process.env.TZ = 'Africa/Tunis';
  });

  afterEach(() => {
    process.env.TZ = originalTZ;
  });

  it('classe une transaction de dimanche 23h30 UTC dans le dimanche, pas le lundi', () => {
    const transactions: Transaction[] = [
      { timestampUTC: '2026-07-19T23:30:00Z', amount: 100 }, // dimanche, tard en UTC
    ];

    const groups = groupByDay(transactions);

    expect(groups['19/07/2026']).toBeDefined();
    expect(groups['19/07/2026']).toHaveLength(1);
    expect(groups['20/07/2026']).toBeUndefined();
  });
});
