import type { ReportLine } from '../LegacyRenderer';
import { calculateTotal, formatLines } from '../reportCalculations';
import { ReportStrategy } from './ReportStrategy';

export class AnnualReportStrategy implements ReportStrategy {
  render(lines: ReportLine[]): string {
    const total = calculateTotal(lines);
    return (
      `=== RAPPORT ANNUEL ===\n` + formatLines(lines) + `\nTOTAL ANNÉE: ${total.toFixed(2)} €`
    );
  }
}
