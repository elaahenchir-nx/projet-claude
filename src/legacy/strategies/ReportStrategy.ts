import type { ReportLine } from '../LegacyRenderer';

export interface ReportStrategy {
  render(lines: ReportLine[]): string;
}
