import { sendReport } from '../src/legacy/ReportSender';

describe('sendReport', () => {
  it('logue l\'annonce d\'envoi puis le contenu', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    sendReport('daily', 'CONTENU', 'alice@example.com');

    expect(logSpy).toHaveBeenNthCalledWith(
      1,
      '[ReportSender] Envoi du rapport daily à alice@example.com'
    );
    expect(logSpy).toHaveBeenNthCalledWith(2, 'CONTENU');

    logSpy.mockRestore();
  });
});
