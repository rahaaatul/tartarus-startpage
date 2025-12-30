/**
 * Event Bus - Centralized component communication system
 * Provides publish/subscribe pattern for component-to-component messaging
 */
class EventBus {
  constructor() {
    this.subscribers = new Map();
    this.messageQueue = [];
    this.processing = false;
  }

  /**
   * Subscribe to a message type
   * @param {string} type - Message type to subscribe to
   * @param {Function} handler - Handler function
   * @param {Object} context - Optional context for the handler
   * @returns {Function} Unsubscribe function
   */
  subscribe(type, handler, context = null) {
    if (!this.subscribers.has(type)) {
      this.subscribers.set(type, new Set());
    }

    const subscriber = { handler, context };
    this.subscribers.get(type).add(subscriber);

    // Return unsubscribe function
    return () => {
      const subscribers = this.subscribers.get(type);
      if (subscribers) {
        subscribers.delete(subscriber);
        if (subscribers.size === 0) {
          this.subscribers.delete(type);
        }
      }
    };
  }

  /**
   * Publish a message to all subscribers
   * @param {Object} message - Message object with type, payload, source, target
   */
  async publish(message) {
    if (!message || !message.type) {
      console.warn('EventBus: Invalid message format', message);
      return;
    }

    // Add timestamp if not present
    message.timestamp = message.timestamp || new Date().toISOString();

    // Add to queue for async processing
    this.messageQueue.push(message);

    // Start processing if not already processing
    if (!this.processing) {
      await this.processQueue();
    }
  }

  /**
   * Process queued messages asynchronously
   */
  async processQueue() {
    if (this.processing || this.messageQueue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      await this.deliverMessage(message);
    }

    this.processing = false;
  }

  /**
   * Deliver message to subscribers
   * @param {Object} message - Message to deliver
   */
  async deliverMessage(message) {
    const subscribers = this.subscribers.get(message.type);

    if (!subscribers || subscribers.size === 0) {
      return;
    }

    const deliveryPromises = Array.from(subscribers).map(async (subscriber) => {
      try {
        const { handler, context } = subscriber;

        // Check if message has a target and matches the context
        if (message.target && context && context !== message.target) {
          return;
        }

        // Call handler with message
        await handler.call(context, message);
      } catch (error) {
        console.error(`EventBus: Error in message handler for ${message.type}:`, error);
      }
    });

    await Promise.allSettled(deliveryPromises);
  }

  /**
   * Get subscriber count for a message type
   * @param {string} type - Message type
   * @returns {number} Number of subscribers
   */
  getSubscriberCount(type) {
    const subscribers = this.subscribers.get(type);
    return subscribers ? subscribers.size : 0;
  }

  /**
   * Clear all subscribers (useful for testing)
   */
  clear() {
    this.subscribers.clear();
    this.messageQueue.length = 0;
    this.processing = false;
  }

  /**
   * Get all registered message types
   * @returns {Array<string>} Array of message types
   */
  getMessageTypes() {
    return Array.from(this.subscribers.keys());
  }
}

// Create singleton instance
const eventBus = new EventBus();
