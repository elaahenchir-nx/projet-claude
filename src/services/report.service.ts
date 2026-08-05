/**
 * Regroupement de transactions par jour (en UTC, indépendamment du
 * fuseau horaire du serveur).
 */

export interface Transaction {
  timestampUTC: string; // ISO 8601 en UTC, ex: "2026-07-19T23:30:00Z"
  amount: number;
}

export function groupByDay(transactions: Transaction[]): Record<string, Transaction[]> {
  const groups: Record<string, Transaction[]> = {};
  for (const tx of transactions) {
    const date = new Date(tx.timestampUTC);
    const key = date.toLocaleDateString('fr-FR', { timeZone: 'UTC' });
    if (!groups[key]) groups[key] = [];
    groups[key].push(tx);
  }
  return groups;
}

export function totalForDay(transactions: Transaction[], dayKey: string): number {
  const groups = groupByDay(transactions);
  const dayTx = groups[dayKey] || [];
  return dayTx.reduce((sum, tx) => sum + tx.amount, 0);
}
