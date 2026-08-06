/**
 * LegacyRenderer — module legacy à refactorer (module de refactoring dédié).
 *
 * Code smells volontaires :
 *  - God Class : une seule classe gère génération, formatage ET envoi.
 *  - Switch géant sur le type de rapport (violation OCP : ajouter un
 *    nouveau type de rapport impose de modifier cette classe).
 *  - Logique dupliquée entre les branches (le calcul du total est
 *    recopié quasi à l'identique dans chaque case).
 *
 * Piste de refactoring attendue : pattern Strategy (une classe par type
 * de rapport, une interface commune), extraction du calcul de total.
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
