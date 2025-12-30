/**
 * Event Bus Tests
 * Tests for the centralized component communication system
 */
import eventBus from '../../src/common/event-bus.js';

describe('EventBus', () => {
  beforeEach(() => {
    // Clear all subscribers before each test
    eventBus.clear();
  });

  afterEach(() => {
    // Clean up after each test
    eventBus.clear();
  });

  describe('subscribe', () => {
    test('should subscribe to an event type', () => {
      const handler = jest.fn();
      const unsubscribe = eventBus.subscribe('test:event', handler);

      expect(typeof unsubscribe).toBe('function');
      expect(eventBus.getSubscriberCount('test:event')).toBe(1);
    });

    test('should handle multiple subscribers for the same event', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      eventBus.subscribe('test:event', handler1);
      eventBus.subscribe('test:event', handler2);

      expect(eventBus.getSubscriberCount('test:event')).toBe(2);
    });

    test('should call handler with correct arguments', async () => {
      const handler = jest.fn();
      eventBus.subscribe('test:event', handler);

      const message = {
        type: 'test:event',
        payload: { data: 'test' },
        source: 'test-source'
      };

      await eventBus.publish(message);

      expect(handler).toHaveBeenCalledWith(message);
    });

    test('should support context binding', async () => {
      const context = { value: 'test' };
      const handler = jest.fn(function() {
        expect(this).toBe(context);
      });

      eventBus.subscribe('test:event', handler, context);

      await eventBus.publish({ type: 'test:event' });

      expect(handler).toHaveBeenCalled();
    });

    test('should unsubscribe correctly', () => {
      const handler = jest.fn();
      const unsubscribe = eventBus.subscribe('test:event', handler);

      expect(eventBus.getSubscriberCount('test:event')).toBe(1);

      unsubscribe();

      expect(eventBus.getSubscriberCount('test:event')).toBe(0);
    });
  });

  describe('publish', () => {
    test('should publish messages to subscribers', async () => {
      const handler = jest.fn();
      eventBus.subscribe('test:event', handler);

      const message = {
        type: 'test:event',
        payload: { data: 'test' }
      };

      await eventBus.publish(message);

      expect(handler).toHaveBeenCalledWith(message);
    });

    test('should add timestamp to messages', async () => {
      const handler = jest.fn();
      eventBus.subscribe('test:event', handler);

      await eventBus.publish({ type: 'test:event' });

      const callArgs = handler.mock.calls[0][0];
      expect(callArgs.timestamp).toBeDefined();
      expect(typeof callArgs.timestamp).toBe('string');
    });

    test('should handle invalid messages gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      await eventBus.publish(null);
      await eventBus.publish({});
      await eventBus.publish({ type: undefined });

      expect(consoleSpy).toHaveBeenCalledTimes(3);
      consoleSpy.mockRestore();
    });

    test('should process messages asynchronously', async () => {
      const handler = jest.fn();
      eventBus.subscribe('test:event', handler);

      await eventBus.publish({ type: 'test:event' });

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('message targeting', () => {
    test('should deliver messages to targeted subscribers', async () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      const context1 = { id: 'component1' };
      const context2 = { id: 'component2' };

      eventBus.subscribe('test:event', handler1, context1);
      eventBus.subscribe('test:event', handler2, context2);

      await eventBus.publish({
        type: 'test:event',
        target: context1
      });

      expect(handler1).toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    test('should handle handler errors gracefully', async () => {
      const errorHandler = jest.fn(() => {
        throw new Error('Handler error');
      });
      const successHandler = jest.fn();

      eventBus.subscribe('test:event', errorHandler);
      eventBus.subscribe('test:event', successHandler);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await eventBus.publish({ type: 'test:event' });

      expect(errorHandler).toHaveBeenCalled();
      expect(successHandler).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('utility methods', () => {
    test('should return correct subscriber count', () => {
      expect(eventBus.getSubscriberCount('nonexistent')).toBe(0);

      eventBus.subscribe('test:event', () => {});
      expect(eventBus.getSubscriberCount('test:event')).toBe(1);

      eventBus.subscribe('test:event', () => {});
      expect(eventBus.getSubscriberCount('test:event')).toBe(2);
    });

    test('should return registered message types', () => {
      expect(eventBus.getMessageTypes()).toEqual([]);

      eventBus.subscribe('event1', () => {});
      eventBus.subscribe('event2', () => {});
      eventBus.subscribe('event1', () => {});

      const types = eventBus.getMessageTypes();
      expect(types).toContain('event1');
      expect(types).toContain('event2');
      expect(types).toHaveLength(2);
    });

    test('should clear all subscribers', () => {
      eventBus.subscribe('event1', () => {});
      eventBus.subscribe('event2', () => {});

      expect(eventBus.getMessageTypes()).toHaveLength(2);

      eventBus.clear();

      expect(eventBus.getMessageTypes()).toEqual([]);
    });
  });
});
