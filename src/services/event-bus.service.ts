import { CancellationEvent, CancellationEventType, EventSubscriber } from '../types/webhook.types';

/**
 * Event Bus Service implementing Observer Pattern
 * Manages event subscriptions and publishing for cancellation events
 */
export class EventBusService {
  private subscribers: Map<CancellationEventType, EventSubscriber[]> = new Map();
  private static instance: EventBusService;

  private constructor() {
    // Initialize subscribers map for all event types
    Object.values(CancellationEventType).forEach(eventType => {
      this.subscribers.set(eventType, []);
    });
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): EventBusService {
    if (!EventBusService.instance) {
      EventBusService.instance = new EventBusService();
    }
    return EventBusService.instance;
  }

  /**
   * Subscribe to an event type
   */
  public subscribe(eventType: CancellationEventType, handler: EventSubscriber): void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }
    
    const handlers = this.subscribers.get(eventType)!;
    if (!handlers.includes(handler)) {
      handlers.push(handler);
    }
  }

  /**
   * Unsubscribe from an event type
   */
  public unsubscribe(eventType: CancellationEventType, handler: EventSubscriber): void {
    const handlers = this.subscribers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Publish an event to all subscribers
   */
  public async publish(event: CancellationEvent): Promise<void> {
    const handlers = this.subscribers.get(event.type) || [];
    
    if (handlers.length === 0) {
      console.log(`No subscribers for event type: ${event.type}`);
      return;
    }

    console.log(`Publishing event ${event.type} to ${handlers.length} subscribers`);

    // Execute all handlers concurrently
    const promises = handlers.map(async (handler) => {
      try {
        await handler(event);
      } catch (error) {
        console.error(`Error in event handler for ${event.type}:`, error);
        // Don't throw - let other handlers continue
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Get subscriber count for an event type
   */
  public getSubscriberCount(eventType: CancellationEventType): number {
    return this.subscribers.get(eventType)?.length || 0;
  }

  /**
   * Get all subscribed event types
   */
  public getSubscribedEvents(): CancellationEventType[] {
    return Array.from(this.subscribers.keys()).filter(
      eventType => this.subscribers.get(eventType)!.length > 0
    );
  }

  /**
   * Clear all subscribers (useful for testing)
   */
  public clearSubscribers(): void {
    this.subscribers.clear();
    // Reinitialize for all event types
    Object.values(CancellationEventType).forEach(eventType => {
      this.subscribers.set(eventType, []);
    });
  }

  /**
   * Get subscriber info for debugging
   */
  public getSubscriberInfo(): Record<string, number> {
    const info: Record<string, number> = {};
    this.subscribers.forEach((handlers, eventType) => {
      info[eventType] = handlers.length;
    });
    return info;
  }
} 