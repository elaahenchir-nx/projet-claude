import { Worker } from 'worker_threads';
import path from 'path';
import { initDb } from '../src/db';

// Repro du Bug #4 (verrou mutuel SQL) : deux transferts opposés (Alice->Bob
// et Bob->Alice) lancés dans deux threads séparés, pour obtenir une vraie
// concurrence face à la fonction transfer() qui est synchrone.
initDb();

function runTransfer(fromId: number, toId: number, amount: number): Promise<void> {
  return new Promise((resolve) => {
    const worker = new Worker(path.join(__dirname, 'transferWorker.ts'), {
      workerData: { fromId, toId, amount },
      execArgv: ['-r', 'ts-node/register'],
    });
    worker.on('message', (msg) => {
      if (msg.ok) {
        console.log(`OK   : transfert ${msg.fromId} -> ${msg.toId}`);
      } else {
        console.log(`ECHEC: transfert ${msg.fromId} -> ${msg.toId} : ${msg.error}`);
      }
    });
    worker.on('exit', () => resolve());
  });
}

async function main() {
  await Promise.all([runTransfer(1, 2, 50), runTransfer(2, 1, 50)]);
}

main();
