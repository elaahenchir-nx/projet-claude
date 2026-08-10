import type { ReportType } from './LegacyRenderer';

export class UnknownReportTypeError extends Error {
  constructor(type: ReportType) {
    super(`Type de rapport inconnu: ${type}`);
    this.name = 'UnknownReportTypeError';
  }
}
