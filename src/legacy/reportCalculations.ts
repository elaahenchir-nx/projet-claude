import { ReportLine } from './LegacyRenderer';

export function calculateTotal(lines: ReportLine[]): number {
  let total = 0;
  for (const l of lines) total += l.amount;
  return total;
}
