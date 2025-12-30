/**
 * API Client Tests
 * Tests for the unified HTTP client with error handling and retry logic
 */
import apiClient from '../../src/common/api-client.js';

describe('ApiClient', () => {
  let originalFetch;

  beforeEach(() => {
    // Mock fetch
    originalFetch = global.fetch;
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  describe('request', () => {
    test('should make successful GET request', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true, data: 'test' })
      };

      global.fetch.mockResolvedValue(mockResponse);

      const result = await apiClient.get('/test');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://192.168.1.11:3001/api/test',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );

      expect(result).toEqual({ success: true, data: 'test' });
    });

    test('should make successful POST request', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true })
      };

      global.fetch.mockResolvedValue(mockResponse);

      const data = { content: 'test content' };
      const result = await apiClient.post('/notes', data);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://192.168.1.11:3001/api/notes',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(data)
        })
      );

      expect(result).toEqual({ success: true });
    });

    test('should handle JSON response parsing', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true, data: { key: 'value' } })
      };

      global.fetch.mockResolvedValue(mockResponse);

      const result = await apiClient.get('/test');

      expect(result).toEqual({ success: true, data: { key: 'value' } });
    });

    test('should handle text response parsing', async () => {
      const mockResponse = {
        ok: true,
        headers: { get: () => null }, // No content-type header
        text: jest.fn().mockResolvedValue('plain text response')
      };

      global.fetch.mockResolvedValue(mockResponse);

      const result = await apiClient.get('/test');

      expect(result).toBe('plain text response');
    });

    test('should handle HTTP errors', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found'
      };

      global.fetch.mockResolvedValue(mockResponse);

      await expect(apiClient.get('/notfound')).rejects.toEqual({
        success: false,
        error: 'HTTP 404: Not Found',
        url: 'http://192.168.1.11:3001/api/notfound',
        method: 'GET',
        timestamp: expect.any(String),
        originalError: expect.any(Error)
      });
    });

    test('should handle network errors', async () => {
      global.fetch.mockRejectedValue(new TypeError('Network error'));

      await expect(apiClient.get('/test')).rejects.toEqual({
        success: false,
        error: 'Network error',
        url: 'http://192.168.1.11:3001/api/test',
        method: 'GET',
        timestamp: expect.any(String),
        originalError: expect.any(Error)
      });
    });

    test('should handle timeout', async () => {
      const mockResponse = new Promise(() => {}); // Never resolves
      global.fetch.mockReturnValue(mockResponse);

      const timeoutClient = new apiClient.constructor({ timeout: 100 });

      await expect(timeoutClient.get('/test')).rejects.toEqual({
        success: false,
        error: 'Network error',
        url: 'http://192.168.1.11:3001/api/test',
        method: 'GET',
        timestamp: expect.any(String),
        originalError: expect.any(Error)
      });
    });
  });

  describe('retry logic', () => {
    test('should retry on network errors', async () => {
      global.fetch
        .mockRejectedValueOnce(new TypeError('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ success: true })
        });

      const result = await apiClient.get('/test');

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ success: true });
    });

    test('should retry on 5xx server errors', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ success: true })
        });

      const result = await apiClient.get('/test');

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ success: true });
    });

    test('should not retry on 4xx client errors', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      await expect(apiClient.get('/notfound')).rejects.toBeDefined();

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    test('should respect max retry attempts', async () => {
      global.fetch.mockRejectedValue(new TypeError('Network error'));

      const retryClient = new apiClient.constructor({ retryAttempts: 2 });

      await expect(retryClient.get('/test')).rejects.toBeDefined();

      expect(global.fetch).toHaveBeenCalledTimes(3); // initial + 2 retries
    });
  });

  describe('convenience methods', () => {
    test('should have GET convenience method', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ data: 'test' })
      };

      global.fetch.mockResolvedValue(mockResponse);

      const result = await apiClient.get('/test');

      expect(result).toEqual({ data: 'test' });
    });

    test('should have POST convenience method', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true })
      };

      global.fetch.mockResolvedValue(mockResponse);

      const result = await apiClient.post('/test', { data: 'test' });

      expect(result).toEqual({ success: true });
    });

    test('should have PUT convenience method', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true })
      };

      global.fetch.mockResolvedValue(mockResponse);

      const result = await apiClient.put('/test', { data: 'test' });

      expect(result).toEqual({ success: true });
    });

    test('should have DELETE convenience method', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true })
      };

      global.fetch.mockResolvedValue(mockResponse);

      const result = await apiClient.delete('/test');

      expect(result).toEqual({ success: true });
    });
  });

  describe('URL handling', () => {
    test('should handle full URLs', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true })
      };

      global.fetch.mockResolvedValue(mockResponse);

      await apiClient.get('https://example.com/api/test');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://example.com/api/test',
        expect.any(Object)
      );
    });

    test('should prepend base URL to relative paths', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true })
      };

      global.fetch.mockResolvedValue(mockResponse);

      await apiClient.get('/test');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://192.168.1.11:3001/api/test',
        expect.any(Object)
      );
    });
  });
});
