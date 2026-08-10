import type { ReportLine } from '../LegacyRenderer';
import { calculateTotal, formatLines } from '../reportCalculations';
import { ReportStrategy } from './ReportStrategy';

export class WeeklyReportStrategy implements ReportStrategy {
  render(lines: ReportLine[]): string {
    const total = calculateTotal(lines);
    return (
      `=== RAPPORT HEBDOMADAIRE ===\n` +
      formatLines(lines) +
      `\nTOTAL SEMAINE: ${total.toFixed(2)} €`
    );
  }
}
