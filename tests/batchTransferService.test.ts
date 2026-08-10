import path from 'path';
import { spawn } from 'child_process';
import { initDb, getConnection } from '../src/db';
import { transfer } from '../src/db/batchTransferService';

/**
 * Caractérisation avant modification de `transfer()` (src/db/batchTransferService.ts).
 *
 * Confrontation carte des bugs vs code réel (étape 3 du skill tests-caracterisation) :
 * la carte des bugs (README.md, entrée #4) décrit encore un "Deadlock SQL (connexion
 * par appel, timeout court)". Or `git log -p -- src/db/batchTransferService.ts` montre
 * que ce bug a déjà été corrigé par le commit "correction bug #4" (a266d62) : le code
 * actuel n'ouvre plus de transaction avec un timeout de 100 ms suivi d'un
 * BEGIN/UPDATE/délai/UPDATE/COMMIT sans filet, mais utilise `db.transaction().immediate()`
 * avec un timeout de verrou de 5000 ms et un retry borné (backoff exponentiel + gigue).
 * L'en-tête du fichier explique même pourquoi un vrai deadlock est structurellement
 * impossible avec SQLite (verrouillage fichier global, pas de verrou par ligne).
 * => La carte est obsolète pour ce fichier ; les tests ci-dessous caractérisent le
 * comportement RÉEL (retry/backoff), pas le bug décrit par la carte.
 *
 * Non-déterminisme (étape 4 du skill) : le nombre de tentatives et le temps de backoff
 * exact dépendent du timing réel de la contention et d'une gigue aléatoire
 * (`Math.random()`). Les tests de contention ci-dessous n'assertent donc jamais sur le
 * nombre de tentatives ni sur une durée précise : ils assertent uniquement sur l'état
 * final stable (transfert appliqué avec succès, soldes exacts, aucun blocage mutuel),
 * qui est déterministe même si le chemin pour y arriver ne l'est pas.
 */

const REPO_ROOT = path.join(__dirname, '..');
const DB_PATH = path.join(REPO_ROOT, 'data.db');
const MODULE_PATH = path.join(REPO_ROOT, 'src', 'db', 'batchTransferService');

function getBalance(id: number): number {
  const db = getConnection();
  try {
    const row = db.prepare('SELECT balance FROM accounts WHERE id = ?').get(id) as
      | { balance: number }
      | undefined;
    return row ? row.balance : -1;
  } finally {
    db.close();
  }
}

/** Lance `node -e <code>` : tient un verrou d'écriture SQLite pendant `holdMs`. */
function spawnLockHolder(holdMs: number): { child: ReturnType<typeof spawn>; ready: Promise<void> } {
  const code = `
    const Database = require('better-sqlite3');
    const db = new Database(process.env.DB_PATH);
    db.prepare('BEGIN IMMEDIATE').run();
    process.stdout.write('LOCKED\\n');
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, Number(process.env.HOLD_MS));
    db.prepare('COMMIT').run();
    db.close();
  `;
  const child = spawn(process.execPath, ['-e', code], {
    cwd: REPO_ROOT,
    env: { ...process.env, DB_PATH, HOLD_MS: String(holdMs) },
  });
  const ready = new Promise<void>((resolve) => {
    child.stdout!.once('data', () => resolve());
  });
  return { child, ready };
}

/** Lance `transfer()` dans un vrai process séparé (via ts-node), pour une contention OS réelle. */
function spawnTransfer(
  fromId: number,
  toId: number,
  amount: number
): Promise<{ exitCode: number | null; stderr: string }> {
  const code = `
    const { transfer } = require(process.env.MODULE_PATH);
    try {
      transfer(Number(process.env.FROM_ID), Number(process.env.TO_ID), Number(process.env.AMOUNT));
    } catch (err) {
      console.error(err && err.message ? err.message : String(err));
      process.exit(1);
    }
  `;
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['-r', 'ts-node/register', '-e', code], {
      cwd: REPO_ROOT,
      env: {
        ...process.env,
        MODULE_PATH,
        FROM_ID: String(fromId),
        TO_ID: String(toId),
        AMOUNT: String(amount),
      },
    });
    let stderr = '';
    child.stderr!.on('data', (d) => (stderr += d.toString()));
    child.on('exit', (exitCode) => resolve({ exitCode, stderr }));
  });
}

describe('transfer - comportement nominal (caractérisation avant modification)', () => {
  beforeEach(() => {
    initDb();
  });

  it('débite le compte source et crédite le compte destination du même montant', () => {
    transfer(1, 2, 100);
    expect(getBalance(1)).toBe(900);
    expect(getBalance(2)).toBe(1100);
  });

  it('autorise un transfert qui vide exactement le solde (limite : balance === amount)', () => {
    transfer(1, 2, 1000);
    expect(getBalance(1)).toBe(0);
    expect(getBalance(2)).toBe(2000);
  });

  it("lève 'Solde insuffisant' et ne modifie aucun solde quand le montant dépasse le solde (rollback)", () => {
    expect(() => transfer(1, 2, 1001)).toThrow('Solde insuffisant');
    expect(getBalance(1)).toBe(1000);
    expect(getBalance(2)).toBe(1000);
  });

  it("lève le même message 'Solde insuffisant' pour un compte source inexistant (aucun message dédié)", () => {
    // Comportement observé, pas un bug de la carte : `from` est `undefined`, donc
    // `!from` est vrai et le code tombe dans la même branche que "solde insuffisant".
    expect(() => transfer(999, 2, 10)).toThrow('Solde insuffisant');
    expect(getBalance(2)).toBe(1000);
  });

  it('applique le débit même si le compte destination est inexistant : les fonds disparaissent sans erreur', () => {
    // Comportement observé, pas un bug de la carte : l'UPDATE sur un id inexistant
    // met à jour 0 ligne sans lever d'erreur, la transaction est tout de même commitée.
    transfer(1, 999, 100);
    expect(getBalance(1)).toBe(900);
    expect(getBalance(999)).toBe(-1); // aucune ligne pour ce compte
    expect(getBalance(1) + getBalance(2)).toBe(1900); // 100 perdus, pas conservés
  });

  it('un montant négatif inverse le sens réel du mouvement (aucune validation du montant)', () => {
    // Comportement observé, pas un bug de la carte : `from.balance < amount` est faux
    // pour un montant négatif, donc le contrôle passe, puis "débiter -100" crédite en fait la source.
    transfer(1, 2, -100);
    expect(getBalance(1)).toBe(1100);
    expect(getBalance(2)).toBe(900);
  });
});

describe('transfer - contention SQLite réelle (bug #4 de la carte : obsolète, cf. en-tête du fichier)', () => {
  beforeEach(() => {
    initDb();
  });

  it(
    "deux transferts concurrents en sens opposé (A→B et B→A) aboutissent tous les deux, sans blocage mutuel",
    async () => {
      // Réfute directement la description de la carte des bugs #4 ("deadlock SQL" pour
      // deux transferts en sens opposé) : deux vrais process concurrents, sens opposés.
      const [r1, r2] = await Promise.all([spawnTransfer(1, 2, 100), spawnTransfer(2, 1, 50)]);

      expect({ code: r1.exitCode, stderr: r1.stderr }).toEqual({ code: 0, stderr: '' });
      expect({ code: r2.exitCode, stderr: r2.stderr }).toEqual({ code: 0, stderr: '' });

      // Résultat final déterministe : l'addition étant commutative, l'ordre réel
      // d'application des deux transferts concurrents n'affecte pas le solde final.
      expect(getBalance(1)).toBe(950); // 1000 - 100 (vers Bob) + 50 (reçu de Bob)
      expect(getBalance(2)).toBe(1050); // 1000 + 100 (reçu d'Alice) - 50 (vers Alice)
    },
    30000
  );

  it(
    'sous contention prolongée (verrou tenu > 5000 ms par un tiers), transfer() retente puis aboutit',
    async () => {
      // VERROU_TIMEOUT_MS = 5000 ms dans le fichier source. On tient le verrou 6000 ms
      // (> 300 ms de contrôles métier + 5000 ms de timeout natif) pour forcer un vrai
      // SQLITE_BUSY sur la 1ère tentative, puis on le relâche pendant la fenêtre de la
      // tentative suivante. On n'asserte ni sur le nombre de tentatives ni sur le temps
      // écoulé (non déterministe) : seulement sur le résultat final stable.
      const { ready } = spawnLockHolder(6000);
      await ready;

      expect(() => transfer(1, 2, 100)).not.toThrow();

      expect(getBalance(1)).toBe(900);
      expect(getBalance(2)).toBe(1100);
    },
    20000
  );
});
