/**
 * LegacyRenderer — refactorisé en pattern Strategy.
 *
 * generate() délègue à la ReportStrategy correspondant au ReportType
 * (voir ./strategies/) ; le calcul de total et le formatage des lignes
 * sont partagés via ./reportCalculations. L'envoi (ex-méthode send())
 * vit désormais dans ./ReportSender.
 */

import { ReportStrategy } from './strategies/ReportStrategy';
import { DailyReportStrategy } from './strategies/DailyReportStrategy';
import { WeeklyReportStrategy } from './strategies/WeeklyReportStrategy';
import { MonthlyReportStrategy } from './strategies/MonthlyReportStrategy';
import { AnnualReportStrategy } from './strategies/AnnualReportStrategy';
import { UnknownReportTypeError } from './errors';

export type ReportType = 'daily' | 'weekly' | 'monthly' | 'annual';

export interface ReportLine {
  label: string;
  amount: number;
}

const strategies: Record<ReportType, ReportStrategy> = {
  daily: new DailyReportStrategy(),
  weekly: new WeeklyReportStrategy(),
  monthly: new MonthlyReportStrategy(),
  annual: new AnnualReportStrategy(),
};

export class LegacyRenderer {
  generate(type: ReportType, lines: ReportLine[]): string {
    const strategy = strategies[type];
    if (!strategy) {
      throw new UnknownReportTypeError(type);
    }
    return strategy.render(lines);
  }
}
