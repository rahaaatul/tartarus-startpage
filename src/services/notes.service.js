/**
 * Notes Service - Business logic layer for notes operations
 * Handles data transformation, validation, and coordination with API and state
 */

class NotesService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.maxRetries = 3;
    this.retryDelay = 1000;

    // State keys
    this.STATE_KEYS = {
      NOTES_CONTENT: 'notes_content',
      NOTES_TIMESTAMP: 'notes_timestamp',
      NOTES_VERSION: 'notes_version',
      NOTES_LOADING: 'notes_loading',
      NOTES_ERROR: 'notes_error'
    };

    // Initialize state
    this.initializeState();
  }

  /**
   * Initialize default state values
   */
  initializeState() {
    if (!stateManager.has(this.STATE_KEYS.NOTES_CONTENT)) {
      stateManager.set(this.STATE_KEYS.NOTES_CONTENT, '');
    }
    if (!stateManager.has(this.STATE_KEYS.NOTES_TIMESTAMP)) {
      stateManager.set(this.STATE_KEYS.NOTES_TIMESTAMP, null);
    }
    if (!stateManager.has(this.STATE_KEYS.NOTES_VERSION)) {
      stateManager.set(this.STATE_KEYS.NOTES_VERSION, 0);
    }
    if (!stateManager.has(this.STATE_KEYS.NOTES_LOADING)) {
      stateManager.set(this.STATE_KEYS.NOTES_LOADING, false);
    }
    if (!stateManager.has(this.STATE_KEYS.NOTES_ERROR)) {
      stateManager.set(this.STATE_KEYS.NOTES_ERROR, null);
    }
  }

  /**
   * Load notes from API with caching and error handling
   * @returns {Promise<Object>} Notes data
   */
  async load() {
    try {
      // Check cache first
      const cached = this.getCachedNotes();
      if (cached) {
        return cached;
      }

      // Set loading state
      stateManager.set(this.STATE_KEYS.NOTES_LOADING, true);
      stateManager.set(this.STATE_KEYS.NOTES_ERROR, null);

      // Publish loading event
      eventBus.publish({
        type: 'notes:loading',
        payload: { action: 'load' },
        source: 'notes-service'
      });

      // Load from API
      const response = await this.loadWithRetry();

      if (response.success) {
        const notesData = this.transformNotesData(response.notes);

        // Update state
        stateManager.update({
          [this.STATE_KEYS.NOTES_CONTENT]: notesData.content,
          [this.STATE_KEYS.NOTES_TIMESTAMP]: notesData.timestamp,
          [this.STATE_KEYS.NOTES_VERSION]: notesData.version,
          [this.STATE_KEYS.NOTES_LOADING]: false
        });

        // Cache the result
        this.setCachedNotes(notesData);

        // Publish success event
        eventBus.publish({
          type: 'notes:loaded',
          payload: notesData,
          source: 'notes-service'
        });

        return notesData;
      } else {
        throw new Error(response.error || 'Failed to load notes');
      }
    } catch (error) {
      console.error('NotesService: Failed to load notes:', error);

      // Update error state
      stateManager.update({
        [this.STATE_KEYS.NOTES_LOADING]: false,
        [this.STATE_KEYS.NOTES_ERROR]: error.message
      });

      // Publish error event
      eventBus.publish({
        type: 'notes:error',
        payload: {
          action: 'load',
          error: error.message,
          originalError: error
        },
        source: 'notes-service'
      });

      throw error;
    }
  }

  /**
   * Save notes with validation and conflict resolution
   * @param {string} content - Notes content
   * @param {Object} options - Save options
   * @returns {Promise<Object>} Save result
   */
  async save(content, options = {}) {
    try {
      // Validate input
      const validation = this.validateNotesContent(content);
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Check for conflicts if version checking is enabled
      if (options.checkConflicts) {
        await this.checkForConflicts();
      }

      // Set loading state
      stateManager.set(this.STATE_KEYS.NOTES_LOADING, true);
      stateManager.set(this.STATE_KEYS.NOTES_ERROR, null);

      // Publish saving event
      eventBus.publish({
        type: 'notes:saving',
        payload: { content: content.substring(0, 50) + '...' },
        source: 'notes-service'
      });

      // Prepare notes data
      const notesData = {
        content: content,
        timestamp: new Date().toISOString(),
        version: (stateManager.get(this.STATE_KEYS.NOTES_VERSION, 0) + 1)
      };

      // Save via API
      const response = await this.saveWithRetry(notesData);

      if (response.success) {
        // Update state
        stateManager.update({
          [this.STATE_KEYS.NOTES_CONTENT]: content,
          [this.STATE_KEYS.NOTES_TIMESTAMP]: notesData.timestamp,
          [this.STATE_KEYS.NOTES_VERSION]: notesData.version,
          [this.STATE_KEYS.NOTES_LOADING]: false
        });

        // Update cache
        this.setCachedNotes(notesData);

        // Publish success event
        eventBus.publish({
          type: 'notes:saved',
          payload: {
            content: content,
            timestamp: notesData.timestamp,
            version: notesData.version
          },
          source: 'notes-service'
        });

        return {
          success: true,
          timestamp: notesData.timestamp,
          version: notesData.version
        };
      } else {
        throw new Error(response.error || 'Failed to save notes');
      }
    } catch (error) {
      console.error('NotesService: Failed to save notes:', error);

      // Update error state
      stateManager.update({
        [this.STATE_KEYS.NOTES_LOADING]: false,
        [this.STATE_KEYS.NOTES_ERROR]: error.message
      });

      // Publish error event
      eventBus.publish({
        type: 'notes:error',
        payload: {
          action: 'save',
          error: error.message,
          originalError: error
        },
        source: 'notes-service'
      });

      throw error;
    }
  }

  /**
   * Load notes with retry logic
   * @returns {Promise<Object>} API response
   */
  async loadWithRetry() {
    let lastError;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await apiClient.get('/notes');
        return response;
      } catch (error) {
        lastError = error;
        console.warn(`NotesService: Load attempt ${attempt} failed:`, error.message);

        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelay * attempt);
        }
      }
    }

    throw lastError;
  }

  /**
   * Save notes with retry logic
   * @param {Object} notesData - Notes data to save
   * @returns {Promise<Object>} API response
   */
  async saveWithRetry(notesData) {
    let lastError;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await apiClient.post('/notes', notesData);
        return response;
      } catch (error) {
        lastError = error;
        console.warn(`NotesService: Save attempt ${attempt} failed:`, error.message);

        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelay * attempt);
        }
      }
    }

    throw lastError;
  }

  /**
   * Check for conflicts before saving
   */
  async checkForConflicts() {
    try {
      const serverNotes = await this.loadWithRetry();
      const localVersion = stateManager.get(this.STATE_KEYS.NOTES_VERSION, 0);
      const serverVersion = serverNotes.notes?.version || 0;

      if (serverVersion > localVersion) {
        // Conflict detected
        eventBus.publish({
          type: 'notes:conflict',
          payload: {
            localVersion,
            serverVersion,
            serverContent: serverNotes.notes?.content || ''
          },
          source: 'notes-service'
        });

        throw new Error('Conflict detected: Server has newer version');
      }
    } catch (error) {
      // If conflict check fails, continue with save
      console.warn('NotesService: Conflict check failed:', error.message);
    }
  }

  /**
   * Validate notes content
   * @param {string} content - Content to validate
   * @returns {Object} Validation result
   */
  validateNotesContent(content) {
    const errors = [];

    if (typeof content !== 'string') {
      errors.push('Content must be a string');
    }

    if (content.length > 100000) { // 100KB limit
      errors.push('Content exceeds maximum length (100KB)');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Transform notes data from API format
   * @param {Object} apiData - Data from API
   * @returns {Object} Transformed data
   */
  transformNotesData(apiData) {
    return {
      content: apiData.content || '',
      timestamp: apiData.timestamp || new Date().toISOString(),
      version: apiData.version || 1
    };
  }

  /**
   * Get cached notes if valid
   * @returns {Object|null} Cached notes or null
   */
  getCachedNotes() {
    const cacheKey = 'notes_data';
    const cached = this.cache.get(cacheKey);

    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }

    return null;
  }

  /**
   * Set cached notes
   * @param {Object} data - Notes data to cache
   */
  setCachedNotes(data) {
    const cacheKey = 'notes_data';
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get current notes state
   * @returns {Object} Current state
   */
  getCurrentState() {
    return {
      content: stateManager.get(this.STATE_KEYS.NOTES_CONTENT, ''),
      timestamp: stateManager.get(this.STATE_KEYS.NOTES_TIMESTAMP),
      version: stateManager.get(this.STATE_KEYS.NOTES_VERSION, 0),
      loading: stateManager.get(this.STATE_KEYS.NOTES_LOADING, false),
      error: stateManager.get(this.STATE_KEYS.NOTES_ERROR)
    };
  }

  /**
   * Subscribe to state changes
   * @param {Function} callback - State change callback
   * @returns {Function} Unsubscribe function
   */
  subscribeToState(callback) {
    return stateManager.subscribeMultiple(
      Object.values(this.STATE_KEYS),
      callback,
      this
    );
  }

  /**
   * Utility method for delays
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Delay promise
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Create singleton instance
const notesService = new NotesService();
