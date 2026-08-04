import http from 'http';
import { createApp } from '../src/app';

describe('GET /api/invoices/overdue', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll((done) => {
    server = http.createServer(createApp()).listen(0, () => {
      const address = server.address();
      const port = typeof address === 'object' && address !== null ? address.port : 0;
      baseUrl = `http://localhost:${port}`;
      done();
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  it('répond 200 avec un content-type JSON', async () => {
    const response = await fetch(`${baseUrl}/api/invoices/overdue`);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
  });

  it('inclut INV-001 et INV-003, exclut INV-002', async () => {
    const response = await fetch(`${baseUrl}/api/invoices/overdue`);
    const body = (await response.json()) as { invoices: Array<{ id: string }> };
    const ids = body.invoices.map((invoice) => invoice.id);
    expect(ids).toEqual(['INV-001', 'INV-003']);
  });

  it('ajoute un champ ttc correct en plus des champs d\'origine', async () => {
    const response = await fetch(`${baseUrl}/api/invoices/overdue`);
    const body = (await response.json()) as { invoices: Array<{ id: string }> };
    const invoice001 = body.invoices.find((invoice) => invoice.id === 'INV-001');
    expect(invoice001).toEqual({
      id: 'INV-001',
      amountHT: 1000,
      vatRate: 0.2,
      status: 'sent',
      dueDate: new Date('2026-06-01').toISOString(),
      ttc: 1200,
    });
  });

  it('retourne exactement le nombre de factures en retard attendu', async () => {
    const response = await fetch(`${baseUrl}/api/invoices/overdue`);
    const body = (await response.json()) as { invoices: unknown[] };
    expect(body.invoices).toHaveLength(2);
  });
});
