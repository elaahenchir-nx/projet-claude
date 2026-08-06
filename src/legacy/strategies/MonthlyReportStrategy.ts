import type { ReportLine } from '../LegacyRenderer';
import { calculateTotal, formatLines } from '../reportCalculations';
import { ReportStrategy } from './ReportStrategy';

export class MonthlyReportStrategy implements ReportStrategy {
  render(lines: ReportLine[]): string {
    const total = calculateTotal(lines);
    const avg = lines.length ? total / lines.length : 0;
    return (
      `=== RAPPORT MENSUEL ===\n` +
      formatLines(lines) +
      `\nTOTAL: ${total.toFixed(2)} € (moyenne: ${avg.toFixed(2)} €)`
    );
  }
}
