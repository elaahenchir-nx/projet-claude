import { workerData, parentPort } from 'worker_threads';
import { transfer } from '../src/db/batchTransferService';

const { fromId, toId, amount } = workerData as { fromId: number; toId: number; amount: number };

try {
  transfer(fromId, toId, amount);
  parentPort?.postMessage({ ok: true, fromId, toId });
} catch (err) {
  parentPort?.postMessage({ ok: false, fromId, toId, error: (err as Error).message });
}
