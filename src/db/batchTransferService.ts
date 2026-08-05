import { getConnection } from '../db';

/**
 * Transfert de fonds entre deux comptes.
 *
 * SQLite sérialise les écrivains au niveau du fichier de base : `BEGIN
 * IMMEDIATE` prend un verrou RESERVED global avant même de lire une ligne, et
 * il n'existe pas de verrouillage par ligne. Deux transferts concurrents ne
 * peuvent donc jamais s'interbloquer — le second attend, et lève SQLITE_BUSY
 * si son `busy_timeout` expire avant que le premier ait commité. Le sens des
 * transferts n'y joue aucun rôle : deux transferts de même sens échouent
 * exactement pareil.
 *
 * D'où les trois règles tenues ici :
 *   1. tout travail long reste HORS de la transaction ;
 *   2. le timeout d'attente de verrou couvre largement la section critique ;
 *   3. un retry borné absorbe la contention résiduelle.
 */

/** Tentatives maximum en cas de SQLITE_BUSY. */
const MAX_TENTATIVES = 5;
/** Attente de base entre deux tentatives (backoff exponentiel + gigue). */
const ATTENTE_BASE_MS = 20;
/** Attente d'un verrou : doit couvrir la plus longue section critique. */
const VERROU_TIMEOUT_MS = 5000;

/**
 * Contrôles métier (frais, anti-fraude, ...). Volontairement exécutés avant
 * l'ouverture de la transaction : tant qu'ils tournent, aucun verrou n'est
 * détenu et les autres transferts progressent.
 */
function executerControlesMetier(fromId: number, toId: number, amount: number): void {
  const busyUntil = Date.now() + 300;
  while (Date.now() < busyUntil) {
    /* travail simulé */
  }
}

/** Vrai si l'erreur est un conflit de verrou, donc justiciable d'un retry. */
function estVerrouOccupe(err: unknown): boolean {
  const code = (err as { code?: string } | null)?.code;
  return code === 'SQLITE_BUSY' || code === 'SQLITE_BUSY_SNAPSHOT' || code === 'SQLITE_LOCKED';
}

/** Pause synchrone : `transfer()` est appelé depuis un worker synchrone. */
function attendre(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

export function transfer(fromId: number, toId: number, amount: number): void {
  // 1. Le travail long a lieu AVANT d'ouvrir la transaction.
  executerControlesMetier(fromId, toId, amount);

  const db = getConnection(VERROU_TIMEOUT_MS);
  try {
    // 2. Section critique réduite à lecture-vérification-écriture.
    //    db.transaction() gère lui-même BEGIN / COMMIT / ROLLBACK.
    const appliquer = db.transaction(() => {
      const from = db.prepare('SELECT balance FROM accounts WHERE id = ?').get(fromId) as
        | { balance: number }
        | undefined;
      if (!from || from.balance < amount) {
        throw new Error('Solde insuffisant');
      }
      db.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?').run(amount, fromId);
      db.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?').run(amount, toId);
    });

    // 3. Retry borné. `immediate()` échoue au BEGIN plutôt qu'en cours de route.
    for (let tentative = 1; ; tentative++) {
      try {
        appliquer.immediate();
        return;
      } catch (err) {
        if (!estVerrouOccupe(err) || tentative === MAX_TENTATIVES) throw err;
        attendre(ATTENTE_BASE_MS * 2 ** (tentative - 1) + Math.floor(Math.random() * 10));
      }
    }
  } finally {
    db.close();
  }
}
