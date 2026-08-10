import type { ReportLine } from '../LegacyRenderer';
import { calculateTotal, formatLines } from '../reportCalculations';
import { ReportStrategy } from './ReportStrategy';

export class DailyReportStrategy implements ReportStrategy {
  render(lines: ReportLine[]): string {
    const total = calculateTotal(lines);
    return (
      `=== RAPPORT JOURNALIER ===\n` + formatLines(lines) + `\nTOTAL: ${total.toFixed(2)} €`
    );
  }
}
