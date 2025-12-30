/**
 * API Client - Unified HTTP client with error handling and retry logic
 * Provides consistent API request handling across the application
 */
class ApiClient {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'http://192.168.1.11:3001/api';
    this.timeout = options.timeout || 10000; // 10 seconds
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 1000; // 1 second
    this.requestQueue = [];
    this.processing = false;
  }

  /**
   * Make an HTTP request with retry logic and error handling
   * @param {string} endpoint - API endpoint (relative to baseUrl)
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response data
   */
  async request(endpoint, options = {}) {
    const requestId = this.generateRequestId();
    const fullUrl = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;

    const requestOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      timeout: options.timeout || this.timeout,
      ...options
    };

    // Add to queue for processing
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        id: requestId,
        url: fullUrl,
        options: requestOptions,
        resolve,
        reject,
        attempt: 0
      });

      this.processQueue();
    });
  }

  /**
   * Process queued requests
   */
  async processQueue() {
    if (this.processing || this.requestQueue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      await this.executeRequest(request);
    }

    this.processing = false;
  }

  /**
   * Execute a single request with retry logic
   * @param {Object} request - Request object
   */
  async executeRequest(request) {
    const { id, url, options, resolve, reject, attempt } = request;

    try {
      const response = await this.makeHttpRequest(url, options);

      if (response.ok) {
        const data = await this.parseResponse(response);
        resolve(data);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.warn(`ApiClient: Request ${id} failed (attempt ${attempt + 1}):`, error.message);

      if (this.shouldRetry(error, attempt)) {
        // Schedule retry
        setTimeout(() => {
          this.requestQueue.unshift({
            ...request,
            attempt: attempt + 1
          });
          this.processQueue();
        }, this.retryDelay * Math.pow(2, attempt)); // Exponential backoff
      } else {
        // Max retries reached or non-retryable error
        const apiError = this.createApiError(error, url, options);
        reject(apiError);
      }
    }
  }

  /**
   * Make the actual HTTP request
   * @param {string} url - Full URL
   * @param {Object} options - Request options
   * @returns {Promise<Response>} Fetch response
   */
  async makeHttpRequest(url, options) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Parse response based on content type
   * @param {Response} response - Fetch response
   * @returns {Promise<Object>} Parsed data
   */
  async parseResponse(response) {
    const contentType = response.headers.get('content-type');

    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    } else {
      return await response.text();
    }
  }

  /**
   * Determine if a request should be retried
   * @param {Error} error - The error that occurred
   * @param {number} attempt - Current attempt number
   * @returns {boolean} Whether to retry
   */
  shouldRetry(error, attempt) {
    if (attempt >= this.retryAttempts) {
      return false;
    }

    // Retry on network errors, timeouts, and 5xx server errors
    if (error.name === 'AbortError' || error.name === 'TypeError') {
      return true; // Network or timeout errors
    }

    // Don't retry on client errors (4xx)
    if (error.message.startsWith('HTTP 4')) {
      return false;
    }

    // Retry on server errors (5xx)
    if (error.message.startsWith('HTTP 5')) {
      return true;
    }

    return false;
  }

  /**
   * Create a standardized API error
   * @param {Error} error - Original error
   * @param {string} url - Request URL
   * @param {Object} options - Request options
   * @returns {Object} Standardized error object
   */
  createApiError(error, url, options) {
    return {
      success: false,
      error: error.message,
      url: url,
      method: options.method,
      timestamp: new Date().toISOString(),
      originalError: error
    };
  }

  /**
   * Generate a unique request ID
   * @returns {string} Request ID
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * GET request convenience method
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response data
   */
  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST request convenience method
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request data
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response data
   */
  post(endpoint, data = {}, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * PUT request convenience method
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request data
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response data
   */
  put(endpoint, data = {}, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  /**
   * DELETE request convenience method
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response data
   */
  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

// Create singleton instance
const apiClient = new ApiClient();
