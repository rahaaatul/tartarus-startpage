/**
 * Notes Service Tests
 * Tests for the notes business logic layer
 */
import notesService from '../../src/services/notes.service.js';
import apiClient from '../../src/common/api-client.js';
import stateManager from '../../src/common/state-manager.js';
import eventBus from '../../src/common/event-bus.js';

describe('NotesService', () => {
  let originalFetch;

  beforeEach(() => {
    // Clear state and cache
    stateManager.clear();
    notesService.clearCache();

    // Mock fetch
    originalFetch = global.fetch;
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  describe('load', () => {
    test('should load notes successfully', async () => {
      const mockNotesData = {
        content: 'Test notes content',
        timestamp: '2025-01-01T00:00:00.000Z',
        version: 1
      };

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: mockNotesData
        })
      };

      global.fetch.mockResolvedValue(mockResponse);

      const result = await notesService.load();

      expect(result).toEqual(mockNotesData);
      expect(stateManager.get('notes_content')).toBe('Test notes content');
      expect(stateManager.get('notes_version')).toBe(1);
    });

    test('should handle API errors', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      };

      global.fetch.mockResolvedValue(mockResponse);

      await expect(notesService.load()).rejects.toThrow();

      expect(stateManager.get('notes_loading')).toBe(false);
      expect(stateManager.get('notes_error')).toBeDefined();
    });

    test('should validate notes content', () => {
      expect(() => {
        notesService.validateNotesContent('valid content');
      }).not.toThrow();

      expect(() => {
        notesService.validateNotesContent(123); // Invalid type
      }).toThrow();

      expect(() => {
        const longContent = 'a'.repeat(100001); // Too long
        notesService.validateNotesContent(longContent);
      }).toThrow();
    });
  });

  describe('save', () => {
    test('should save notes successfully', async () => {
      const content = 'New notes content';

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: {
            version: 2,
            timestamp: '2025-01-01T01:00:00.000Z'
          }
        })
      };

      global.fetch.mockResolvedValue(mockResponse);

      const result = await notesService.save(content);

      expect(result.success).toBe(true);
      expect(result.version).toBe(2);
      expect(stateManager.get('notes_content')).toBe(content);
      expect(stateManager.get('notes_version')).toBe(2);
    });

    test('should handle save conflicts', async () => {
      // First load - server has version 1
      const loadResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: {
            content: 'Server content',
            version: 1,
            timestamp: '2025-01-01T00:00:00.000Z'
          }
        })
      };

      // Conflict check - server now has version 2
      const conflictResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: {
            content: 'Updated server content',
            version: 2,
            timestamp: '2025-01-01T01:00:00.000Z'
          }
        })
      };

      global.fetch
        .mockResolvedValueOnce(loadResponse) // Initial load
        .mockResolvedValueOnce(conflictResponse); // Conflict check

      // Load initial data
      await notesService.load();

      // Try to save with conflict detection
      await expect(notesService.save('New content', { checkConflicts: true }))
        .rejects.toThrow('Conflict detected');
    });

    test('should validate content before saving', async () => {
      const longContent = 'a'.repeat(100001); // Too long

      await expect(notesService.save(longContent)).rejects.toThrow('Validation failed');
    });
  });

  describe('caching', () => {
    test('should use cached data when available', async () => {
      const mockNotesData = {
        content: 'Cached content',
        timestamp: '2025-01-01T00:00:00.000Z',
        version: 1
      };

      // First call - should make API request
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: mockNotesData
        })
      };

      global.fetch.mockResolvedValue(mockResponse);

      await notesService.load();
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      await notesService.load();
      expect(global.fetch).toHaveBeenCalledTimes(1); // Still 1 call
    });

    test('should clear cache', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: {
            content: 'Test',
            timestamp: '2025-01-01T00:00:00.000Z',
            version: 1
          }
        })
      };

      global.fetch.mockResolvedValue(mockResponse);

      await notesService.load();
      expect(global.fetch).toHaveBeenCalledTimes(1);

      notesService.clearCache();

      await notesService.load();
      expect(global.fetch).toHaveBeenCalledTimes(2); // Cache cleared, new request
    });
  });

  describe('state management', () => {
    test('should initialize state correctly', () => {
      expect(stateManager.get('notes_content')).toBe('');
      expect(stateManager.get('notes_timestamp')).toBe(null);
      expect(stateManager.get('notes_version')).toBe(0);
      expect(stateManager.get('notes_loading')).toBe(false);
      expect(stateManager.get('notes_error')).toBe(null);
    });

    test('should provide state subscription', () => {
      const callback = jest.fn();
      const unsubscribe = notesService.subscribeToState(callback);

      stateManager.set('notes_content', 'New content');

      expect(callback).toHaveBeenCalled();

      unsubscribe();
    });
  });

  describe('event publishing', () => {
    test('should publish events on operations', async () => {
      const eventSpy = jest.spyOn(eventBus, 'publish');

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: {
            content: 'Test content',
            timestamp: '2025-01-01T00:00:00.000Z',
            version: 1
          }
        })
      };

      global.fetch.mockResolvedValue(mockResponse);

      await notesService.load();

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'notes:loaded',
          payload: expect.any(Object),
          source: 'notes-service'
        })
      );
    });
  });
});
