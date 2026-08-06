import {
  calculateTTC,
  isOverdue,
  applyLatePenalty,
  canBeCancelled,
  nextStatus,
  Invoice,
} from '../src/services/invoice.service';

function buildInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: 'INV-1',
    amountHT: 100,
    vatRate: 0.2,
    status: 'sent',
    dueDate: new Date('2026-12-01'),
    ...overrides,
  };
}

describe('calculateTTC', () => {
  it('calcule le TTC avec un taux de TVA standard', () => {
    expect(calculateTTC(buildInvoice({ amountHT: 100, vatRate: 0.2 }))).toBe(120);
  });

  it('renvoie le montant HT tel quel pour un taux de TVA nul (limite)', () => {
    expect(calculateTTC(buildInvoice({ amountHT: 50, vatRate: 0 }))).toBe(50);
  });

  it('renvoie 0 pour un montant HT nul (limite)', () => {
    expect(calculateTTC(buildInvoice({ amountHT: 0, vatRate: 0.2 }))).toBe(0);
  });

  it('arrondit correctement au centime le plus proche', () => {
    expect(calculateTTC(buildInvoice({ amountHT: 19.99, vatRate: 0.2 }))).toBe(23.99);
  });

  it("ne lève pas d'exception pour un montant HT négatif (aucune validation en entrée)", () => {
    expect(calculateTTC(buildInvoice({ amountHT: -100, vatRate: 0.2 }))).toBe(-120);
  });

  it('lève une erreur pour un montant HT invalide (NaN) au lieu de le propager silencieusement', () => {
    const invoice = buildInvoice({ amountHT: NaN, vatRate: 0.2 });
    expect(() => calculateTTC(invoice)).toThrow(TypeError);
  });
});

describe('isOverdue', () => {
  it("renvoie true quand la date d'échéance est dépassée", () => {
    const invoice = buildInvoice({ status: 'sent', dueDate: new Date('2026-01-01') });
    expect(isOverdue(invoice, new Date('2026-02-01'))).toBe(true);
  });

  it("renvoie false quand la date d'échéance n'est pas encore atteinte", () => {
    const invoice = buildInvoice({ status: 'sent', dueDate: new Date('2026-03-01') });
    expect(isOverdue(invoice, new Date('2026-02-01'))).toBe(false);
  });

  it("renvoie false à l'instant exact de l'échéance (limite)", () => {
    const dueDate = new Date('2026-02-01T00:00:00.000Z');
    const invoice = buildInvoice({ status: 'sent', dueDate });
    expect(isOverdue(invoice, new Date(dueDate.getTime()))).toBe(false);
  });

  it.each<[string, Invoice['status']]>([
    ['payée', 'paid'],
    ['annulée', 'cancelled'],
  ])('renvoie false pour une facture %s même en retard', (_label, status) => {
    const invoice = buildInvoice({ status, dueDate: new Date('2026-01-01') });
    expect(isOverdue(invoice, new Date('2026-02-01'))).toBe(false);
  });

  it("utilise la date du jour par défaut quand aucune date de référence n'est fournie", () => {
    const invoice = buildInvoice({ status: 'sent', dueDate: new Date('2000-01-01') });
    expect(isOverdue(invoice)).toBe(true);
  });

  it("lève une erreur pour une date d'échéance invalide plutôt que de la traiter silencieusement comme non échue", () => {
    const invoice = buildInvoice({ status: 'sent', dueDate: new Date('date-invalide') });
    expect(() => isOverdue(invoice, new Date('2026-02-01'))).toThrow(TypeError);
  });
});

describe('applyLatePenalty', () => {
  it("ne modifie pas le montant si la facture n'est pas en retard", () => {
    const invoice = buildInvoice({ amountHT: 100, vatRate: 0.2, status: 'sent', dueDate: new Date('2026-03-01') });
    expect(applyLatePenalty(invoice, new Date('2026-02-01'))).toBe(120);
  });

  it('applique le taux de 1% jusqu\'à 10 jours de retard inclus (limite)', () => {
    const invoice = buildInvoice({ amountHT: 100, vatRate: 0.2, status: 'sent', dueDate: new Date('2026-01-01') });
    expect(applyLatePenalty(invoice, new Date('2026-01-11'))).toBe(121.2);
  });

  it('applique le taux de 5% dès 11 jours de retard (limite)', () => {
    const invoice = buildInvoice({ amountHT: 100, vatRate: 0.2, status: 'sent', dueDate: new Date('2026-01-01') });
    expect(applyLatePenalty(invoice, new Date('2026-01-12'))).toBe(126);
  });

  it('applique le taux de 5% jusqu\'à 30 jours de retard inclus (limite)', () => {
    const invoice = buildInvoice({ amountHT: 100, vatRate: 0.2, status: 'sent', dueDate: new Date('2026-01-01') });
    expect(applyLatePenalty(invoice, new Date('2026-01-31'))).toBe(126);
  });

  it('applique le taux de 10% dès 31 jours de retard (limite)', () => {
    const invoice = buildInvoice({ amountHT: 100, vatRate: 0.2, status: 'sent', dueDate: new Date('2026-01-01') });
    expect(applyLatePenalty(invoice, new Date('2026-02-01'))).toBe(132);
  });

  it.each<[string, Invoice['status']]>([
    ['payée', 'paid'],
    ['annulée', 'cancelled'],
  ])('ne pénalise jamais une facture %s', (_label, status) => {
    const invoice = buildInvoice({ amountHT: 100, vatRate: 0.2, status, dueDate: new Date('2026-01-01') });
    expect(applyLatePenalty(invoice, new Date('2026-06-01'))).toBe(120);
  });

  it("utilise la date du jour par défaut quand aucune date de référence n'est fournie", () => {
    const invoice = buildInvoice({ amountHT: 100, vatRate: 0.2, status: 'sent', dueDate: new Date('2000-01-01') });
    expect(applyLatePenalty(invoice)).toBe(132);
  });
});

describe('canBeCancelled', () => {
  it.each<[boolean, string, Invoice['status']]>([
    [true, 'en brouillon', 'draft'],
    [true, 'envoyée', 'sent'],
    [false, 'payée (limite)', 'paid'],
    [false, 'déjà annulée (limite)', 'cancelled'],
  ])('renvoie %s pour une facture %s', (expected, _label, status) => {
    expect(canBeCancelled(buildInvoice({ status }))).toBe(expected);
  });
});

describe('nextStatus', () => {
  it('fait passer un brouillon à envoyée', () => {
    expect(nextStatus(buildInvoice({ status: 'draft' }))).toBe('sent');
  });

  it('fait passer une facture envoyée à payée', () => {
    expect(nextStatus(buildInvoice({ status: 'sent' }))).toBe('paid');
  });

  it('laisse une facture payée inchangée (état terminal, limite)', () => {
    expect(nextStatus(buildInvoice({ status: 'paid' }))).toBe('paid');
  });

  it('laisse une facture annulée inchangée (état terminal, limite)', () => {
    expect(nextStatus(buildInvoice({ status: 'cancelled' }))).toBe('cancelled');
  });
});
