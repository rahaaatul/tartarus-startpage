/**
 * State Manager - Centralized reactive state management
 * Provides reactive state updates and persistence across components
 */
class StateManager {
  constructor(storageKey = 'app_state') {
    this.storageKey = storageKey;
    this.state = {};
    this.listeners = new Map();
    this.persistenceEnabled = true;

    // Load persisted state
    this.loadPersistedState();
  }

  /**
   * Set a state value and notify listeners
   * @param {string} key - State key
   * @param {any} value - State value
   */
  set(key, value) {
    const oldValue = this.state[key];
    this.state[key] = value;

    // Persist if enabled
    if (this.persistenceEnabled) {
      this.persistState();
    }

    // Notify listeners
    this.notifyListeners(key, value, oldValue);
  }

  /**
   * Get a state value
   * @param {string} key - State key
   * @param {any} defaultValue - Default value if key doesn't exist
   * @returns {any} State value
   */
  get(key, defaultValue = null) {
    return this.state[key] !== undefined ? this.state[key] : defaultValue;
  }

  /**
   * Subscribe to state changes
   * @param {string} key - State key to watch
   * @param {Function} callback - Callback function (newValue, oldValue, key)
   * @param {Object} context - Optional context for the callback
   * @returns {Function} Unsubscribe function
   */
  subscribe(key, callback, context = null) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }

    const listener = { callback, context };
    this.listeners.get(key).add(listener);

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(key);
      if (listeners) {
        listeners.delete(listener);
        if (listeners.size === 0) {
          this.listeners.delete(key);
        }
      }
    };
  }

  /**
   * Subscribe to multiple keys
   * @param {Array<string>} keys - Array of state keys
   * @param {Function} callback - Callback function (changes)
   * @param {Object} context - Optional context
   * @returns {Function} Unsubscribe function
   */
  subscribeMultiple(keys, callback, context = null) {
    const unsubscribes = keys.map(key =>
      this.subscribe(key, (newValue, oldValue, changedKey) => {
        callback({ [changedKey]: { newValue, oldValue } });
      }, context)
    );

    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }

  /**
   * Notify listeners of state changes
   * @param {string} key - Changed key
   * @param {any} newValue - New value
   * @param {any} oldValue - Old value
   */
  notifyListeners(key, newValue, oldValue) {
    const listeners = this.listeners.get(key);

    if (!listeners || listeners.size === 0) {
      return;
    }

    // Notify all listeners asynchronously
    setTimeout(() => {
      listeners.forEach(listener => {
        try {
          listener.callback.call(listener.context, newValue, oldValue, key);
        } catch (error) {
          console.error(`StateManager: Error in listener for ${key}:`, error);
        }
      });
    }, 0);
  }

  /**
   * Update multiple state values atomically
   * @param {Object} updates - Object with key-value pairs to update
   */
  update(updates) {
    const changedKeys = Object.keys(updates);
    const oldValues = {};

    // Store old values
    changedKeys.forEach(key => {
      oldValues[key] = this.state[key];
    });

    // Apply updates
    Object.assign(this.state, updates);

    // Persist if enabled
    if (this.persistenceEnabled) {
      this.persistState();
    }

    // Notify listeners for each changed key
    changedKeys.forEach(key => {
      this.notifyListeners(key, this.state[key], oldValues[key]);
    });
  }

  /**
   * Remove a state key
   * @param {string} key - State key to remove
   */
  remove(key) {
    const oldValue = this.state[key];
    delete this.state[key];

    if (this.persistenceEnabled) {
      this.persistState();
    }

    this.notifyListeners(key, undefined, oldValue);
  }

  /**
   * Check if a key exists
   * @param {string} key - State key
   * @returns {boolean} Whether the key exists
   */
  has(key) {
    return key in this.state;
  }

  /**
   * Get all state keys
   * @returns {Array<string>} Array of state keys
   */
  keys() {
    return Object.keys(this.state);
  }

  /**
   * Get the entire state object
   * @returns {Object} State object
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Clear all state
   */
  clear() {
    const oldState = { ...this.state };
    this.state = {};

    if (this.persistenceEnabled) {
      this.persistState();
    }

    // Notify listeners for all keys
    Object.keys(oldState).forEach(key => {
      this.notifyListeners(key, undefined, oldState[key]);
    });
  }

  /**
   * Enable or disable persistence
   * @param {boolean} enabled - Whether to enable persistence
   */
  setPersistence(enabled) {
    this.persistenceEnabled = enabled;

    if (enabled) {
      this.persistState();
    } else {
      this.clearPersistedState();
    }
  }

  /**
   * Load state from localStorage
   */
  loadPersistedState() {
    try {
      const persisted = localStorage.getItem(this.storageKey);
      if (persisted) {
        const parsed = JSON.parse(persisted);
        this.state = { ...this.state, ...parsed };
      }
    } catch (error) {
      console.warn('StateManager: Failed to load persisted state:', error);
    }
  }

  /**
   * Save state to localStorage
   */
  persistState() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.state));
    } catch (error) {
      console.warn('StateManager: Failed to persist state:', error);
    }
  }

  /**
   * Clear persisted state
   */
  clearPersistedState() {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.warn('StateManager: Failed to clear persisted state:', error);
    }
  }

  /**
   * Get listener count for a key
   * @param {string} key - State key
   * @returns {number} Number of listeners
   */
  getListenerCount(key) {
    const listeners = this.listeners.get(key);
    return listeners ? listeners.size : 0;
  }
}

// Create singleton instance
const stateManager = new StateManager('notes_app_state');
