/**
 * Service de gestion des factures.
 * Couverture initiale volontairement faible (< 20%) — seule `calculateTTC`
 * est testée (voir tests/invoice.service.test.ts). Objectif du module de revue de code & tests dédié :
 * générer les tests manquants et dépasser 70% de couverture.
 */

export interface Invoice {
  id: string;
  amountHT: number;
  vatRate: number; // ex: 0.20 pour 20%
  status: 'draft' | 'sent' | 'paid' | 'cancelled';
  dueDate: Date;
}

export function calculateTTC(invoice: Invoice): number {
  if (!Number.isFinite(invoice.amountHT) || !Number.isFinite(invoice.vatRate)) {
    throw new TypeError(`Montant HT ou taux de TVA invalide pour la facture ${invoice.id}`);
  }
  return Math.round(invoice.amountHT * (1 + invoice.vatRate) * 100) / 100;
}

export function isOverdue(invoice: Invoice, today: Date = new Date()): boolean {
  if (invoice.status === 'paid' || invoice.status === 'cancelled') return false;
  if (Number.isNaN(invoice.dueDate.getTime())) {
    throw new TypeError(`Date d'échéance invalide pour la facture ${invoice.id}`);
  }
  return invoice.dueDate.getTime() < today.getTime();
}

export function applyLatePenalty(invoice: Invoice, today: Date = new Date()): number {
  const ttc = calculateTTC(invoice);
  if (!isOverdue(invoice, today)) return ttc;
  const daysLate = Math.floor((today.getTime() - invoice.dueDate.getTime()) / 86_400_000);
  const penaltyRate = daysLate > 30 ? 0.1 : daysLate > 10 ? 0.05 : 0.01;
  return Math.round(ttc * (1 + penaltyRate) * 100) / 100;
}

export function canBeCancelled(invoice: Invoice): boolean {
  return invoice.status === 'draft' || invoice.status === 'sent';
}

export function nextStatus(invoice: Invoice): Invoice['status'] {
  switch (invoice.status) {
    case 'draft':
      return 'sent';
    case 'sent':
      return 'paid';
    case 'paid':
      return 'paid';
    case 'cancelled':
      return 'cancelled';
  }
}
