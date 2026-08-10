import { OrderQueue, Order } from '../src/async/jobQueue';

describe('OrderQueue.processAll - compteur processedCount sous traitement parallèle', () => {
  it('compte correctement toutes les commandes traitées, sur plusieurs exécutions successives', async () => {
    const runs = 20;
    const ordersPerRun = 5;
    const failures: number[] = [];

    for (let i = 0; i < runs; i++) {
      const queue = new OrderQueue();
      const orders: Order[] = Array.from({ length: ordersPerRun }, (_, j) => ({
        id: `ORD-${i}-${j}`,
        amount: j,
      }));

      await queue.processAll(orders);

      if (queue.getProcessedCount() !== ordersPerRun) {
        failures.push(i);
      }
    }

    expect(failures).toEqual([]);
  });
});
