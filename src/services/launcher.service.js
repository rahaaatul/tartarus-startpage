/**
 * Launcher Service - Manages shortcuts and launcher functionality
 * Provides centralized management for launcher shortcuts and actions
 */
class LauncherService {
  constructor() {
    this.shortcuts = new Map();
    this.initialized = false;

    // Initialize when CONFIG is available (lazy initialization)
    this.initWhenReady();
  }

  /**
   * Initialize when CONFIG is ready
   */
  initWhenReady() {
    if (typeof CONFIG !== 'undefined') {
      this.init();
    } else {
      // Wait for CONFIG to be defined
      const checkConfig = () => {
        if (typeof CONFIG !== 'undefined') {
          this.init();
        } else {
          setTimeout(checkConfig, 10);
        }
      };
      checkConfig();
    }
  }

  /**
   * Initialize the launcher service
   */
  init() {
    if (this.initialized) return;

    this.loadShortcutsFromConfig();
    this.setupEventListeners();
    this.initialized = true;
  }

  /**
   * Load shortcuts from configuration
   */
  loadShortcutsFromConfig() {
    const launcherConfig = CONFIG.launcher || {};
    const defaultShortcuts = this.getDefaultShortcuts();

    // Merge config shortcuts with defaults
    const configuredShortcuts = { ...defaultShortcuts, ...launcherConfig.shortcuts };

    // Filter enabled shortcuts
    Object.entries(configuredShortcuts).forEach(([id, shortcut]) => {
      if (shortcut.enabled !== false) { // Default to enabled if not specified
        this.registerShortcut(id, shortcut);
      }
    });
  }

  /**
   * Get default shortcuts
   * @returns {Object} Default shortcut definitions
   */
  getDefaultShortcuts() {
    return {
      notes: {
        id: 'notes',
        label: 'Notes',
        icon: '📝',
        action: 'notes:open',
        description: 'Open notes popup',
        enabled: true,
        order: 1
      },
      fileBrowser: {
        id: 'fileBrowser',
        label: 'File Browser',
        icon: '📁',
        action: 'filebrowser:open',
        description: 'Browse files',
        enabled: false,
        order: 2
      },
      downloads: {
        id: 'downloads',
        label: 'Downloads',
        icon: '⬇️',
        action: 'downloads:open',
        description: 'Manage downloads',
        enabled: false,
        order: 3
      },
      fileShare: {
        id: 'fileShare',
        label: 'File Share',
        icon: '📤',
        action: 'fileshare:open',
        description: 'Share files',
        enabled: false,
        order: 4
      }
    };
  }

  /**
   * Register a new shortcut
   * @param {string} id - Unique shortcut identifier
   * @param {Object} shortcut - Shortcut configuration
   */
  registerShortcut(id, shortcut) {
    if (!shortcut.id) shortcut.id = id;
    if (!shortcut.enabled) shortcut.enabled = true;

    this.shortcuts.set(id, shortcut);
  }

  /**
   * Unregister a shortcut
   * @param {string} id - Shortcut identifier
   */
  unregisterShortcut(id) {
    this.shortcuts.delete(id);
  }

  /**
   * Get all enabled shortcuts sorted by order
   * @returns {Array} Array of shortcut objects
   */
  getEnabledShortcuts() {
    return Array.from(this.shortcuts.values())
      .filter(shortcut => shortcut.enabled)
      .sort((a, b) => (a.order || 999) - (b.order || 999));
  }

  /**
   * Execute a shortcut action
   * @param {string} shortcutId - ID of the shortcut to execute
   */
  async executeShortcut(shortcutId) {
    const shortcut = this.shortcuts.get(shortcutId);
    if (!shortcut) {
      console.warn(`Launcher: Shortcut '${shortcutId}' not found`);
      return;
    }

    try {
      // Publish event for the action
      await eventBus.publish({
        type: shortcut.action,
        payload: { shortcutId, shortcut },
        source: 'launcher'
      });
    } catch (error) {
      console.error(`Launcher: Error executing shortcut '${shortcutId}':`, error);
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen for launcher show requests
    eventBus.subscribe('launcher:show', () => {
      this.showLauncher();
    });

    // Listen for launcher hide requests
    eventBus.subscribe('launcher:hide', () => {
      this.hideLauncher();
    });

    // Listen for shortcut execution requests
    eventBus.subscribe('launcher:execute', (message) => {
      if (message.payload?.shortcutId) {
        this.executeShortcut(message.payload.shortcutId);
      }
    });

    // Handle default shortcut actions
    this.setupDefaultShortcutHandlers();
  }

  /**
   * Setup handlers for default shortcut actions
   */
  setupDefaultShortcutHandlers() {
    // Handle notes:open action - Updated for new notes system
    eventBus.subscribe('notes:open', () => {
      this.openNotesApp();
    });

    // Handle other future shortcuts
    eventBus.subscribe('filebrowser:open', () => {
      console.log('File browser shortcut executed - feature not implemented yet');
      // TODO: Implement file browser
    });

    eventBus.subscribe('downloads:open', () => {
      console.log('Downloads shortcut executed - feature not implemented yet');
      // TODO: Implement downloads manager
    });

    eventBus.subscribe('fileshare:open', () => {
      console.log('File share shortcut executed - feature not implemented yet');
      // TODO: Implement file sharing
    });
  }

  /**
   * Open the notes application
   */
  async openNotesApp() {
    try {
      console.log('Launcher: Opening notes application...');
      // Use the same event as the notes trigger component
      await eventBus.publish({
        type: 'notes:trigger:clicked',
        payload: {},
        source: 'launcher'
      });
      console.log('Launcher: Notes trigger event published');
      // Hide launcher after opening notes
      this.hideLauncher();
    } catch (error) {
      console.error('Launcher: Failed to open notes app:', error);
    }
  }

  /**
   * Show the launcher
   */
  showLauncher() {
    const launcher = document.querySelector('launcher-menu');
    if (launcher && typeof launcher.show === 'function') {
      launcher.show();
    } else {
      console.warn('Launcher: Launcher component not found');
    }
  }

  /**
   * Hide the launcher
   */
  hideLauncher() {
    const launcher = document.querySelector('launcher-menu');
    if (launcher && typeof launcher.hide === 'function') {
      launcher.hide();
    }
  }

  /**
   * Get shortcut by ID
   * @param {string} id - Shortcut ID
   * @returns {Object|null} Shortcut object or null
   */
  getShortcut(id) {
    return this.shortcuts.get(id) || null;
  }

  /**
   * Update shortcut configuration
   * @param {string} id - Shortcut ID
   * @param {Object} updates - Updates to apply
   */
  updateShortcut(id, updates) {
    const shortcut = this.shortcuts.get(id);
    if (shortcut) {
      Object.assign(shortcut, updates);
      // Re-register to update
      this.registerShortcut(id, shortcut);
    }
  }

  /**
   * Get service status for debugging
   * @returns {Object} Service status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      shortcutsCount: this.shortcuts.size,
      enabledShortcuts: this.getEnabledShortcuts().length
    };
  }
}

// Create singleton instance
const launcherService = new LauncherService();

// Make it globally available
window.launcherService = launcherService;
