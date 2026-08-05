/**
 * File de traitement de commandes en parallèle.
 */

export interface Order {
  id: string;
  amount: number;
}

export class OrderQueue {
  private processedCount = 0;
  private processedOrders: Order[] = [];

  async processOrder(order: Order): Promise<void> {
    // Simule un traitement asynchrone (appel API, écriture DB...)
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 15));

    this.processedCount += 1;
    this.processedOrders.push(order);
  }

  async processAll(orders: Order[]): Promise<void> {
    await Promise.all(orders.map((o) => this.processOrder(o)));
  }

  getProcessedCount(): number {
    return this.processedCount;
  }

  getProcessedOrders(): Order[] {
    return this.processedOrders;
  }
}
