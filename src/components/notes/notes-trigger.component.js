/**
 * Notes Trigger Component - Statusbar trigger for opening notes popup
 * Provides a button in the statusbar to open the notes interface
 */

class NotesTrigger extends Component {
  refs = {
    button: '.notes-trigger-btn',
    indicator: '.notes-indicator'
  };

  constructor() {
    super();
    this.stateSubscriptions = [];
    this.hasUnsavedChanges = false;
  }

  imports() {
    return [
      this.resources.fonts.roboto,
      this.resources.libs.awoo
    ];
  }

  style() {
    return `
      .notes-trigger {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 4px;
        transition: background-color 0.2s;
        font-size: 14px;
        color: #d4be98;
        position: relative;
      }

      .notes-trigger:hover {
        background-color: rgba(212, 190, 152, 0.1);
      }

      .notes-trigger-btn {
        background: none;
        border: none;
        color: #d4be98;
        cursor: pointer;
        font: 400 14px 'Roboto', sans-serif;
        padding: 2px 4px;
        border-radius: 3px;
        transition: background-color 0.2s;
        display: flex;
        align-items: center;
        gap: 5px;
      }

      .notes-trigger-btn:hover {
        background-color: rgba(212, 190, 152, 0.1);
      }

      .notes-icon {
        font-size: 16px;
        opacity: 0.8;
      }

      .notes-indicator {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background-color: #7daea3;
        opacity: 0;
        transition: opacity 0.3s;
        position: absolute;
        top: 2px;
        right: 2px;
      }

      .notes-indicator.visible {
        opacity: 1;
      }

      .notes-indicator.unsaved {
        background-color: #ea6962;
        animation: pulse 2s infinite;
      }

      .notes-indicator.error {
        background-color: #ea6962;
      }

      .notes-indicator.loading {
        background-color: #d4be98;
        animation: spin 1s linear infinite;
      }

      @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.5; }
        100% { opacity: 1; }
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
  }

  template() {
    return `
      <div class="notes-trigger">
        <button class="notes-trigger-btn" title="Open Notes (Ctrl+N)">
          <span class="notes-icon">📝</span>
          Notes
        </button>
        <div class="notes-indicator"></div>
      </div>
    `;
  }

  handleClick() {
    // Publish event to open notes popup
    eventBus.publish({
      type: 'notes:trigger:clicked',
      payload: {},
      source: 'notes-trigger'
    });
  }

  handleKeyDown(event) {
    // Ctrl+N to open notes
    if (event.ctrlKey && event.key === 'n') {
      event.preventDefault();
      this.handleClick();
    }
  }

  updateIndicator(state) {
    const indicator = this.refs.indicator;
    indicator.classList.remove('visible', 'unsaved', 'error', 'loading');

    if (state.loading) {
      indicator.classList.add('visible', 'loading');
    } else if (state.error) {
      indicator.classList.add('visible', 'error');
    } else if (this.hasUnsavedChanges) {
      indicator.classList.add('visible', 'unsaved');
    } else if (state.content && state.content.trim().length > 0) {
      indicator.classList.add('visible');
    }
  }

  setupEventListeners() {
    // DOM events
    this.refs.button.onclick = () => this.handleClick();

    // Global keyboard events
    document.addEventListener('keydown', this.handleKeyDown.bind(this));

    // Event bus subscriptions
    this.stateSubscriptions.push(
      // Listen to notes state changes
      eventBus.subscribe('notes:loaded', (message) => {
        const state = stateManager.get('notes_content', '');
        this.hasUnsavedChanges = false;
        this.updateIndicator({ content: state });
      }, this),

      eventBus.subscribe('notes:saved', (message) => {
        this.hasUnsavedChanges = false;
        this.updateIndicator({ content: message.payload.content });
      }, this),

      eventBus.subscribe('notes:error', (message) => {
        this.updateIndicator({ error: true });
      }, this),

      eventBus.subscribe('notes:loading', (message) => {
        this.updateIndicator({ loading: true });
      }, this),

      // Listen to popup events
      eventBus.subscribe('notes:popup:opened', (message) => {
        // Could update trigger appearance when popup is open
      }, this),

      eventBus.subscribe('notes:popup:closed', (message) => {
        // Could update trigger appearance when popup is closed
      }, this)
    );

    // State manager subscriptions for reactive updates
    this.stateSubscriptions.push(
      stateManager.subscribe('notes_content', (newContent, oldContent) => {
        if (newContent !== oldContent) {
          this.hasUnsavedChanges = true;
          this.updateIndicator({ content: newContent });
        }
      }, this),

      stateManager.subscribe('notes_loading', (isLoading) => {
        this.updateIndicator({ loading: isLoading });
      }, this),

      stateManager.subscribe('notes_error', (error) => {
        this.updateIndicator({ error: !!error });
      }, this)
    );
  }

  connectedCallback() {
    this.render().then(() => {
      console.log('NotesTrigger component rendered');
      this.setupEventListeners();

      // Initialize indicator state
      const currentState = {
        content: stateManager.get('notes_content', ''),
        loading: stateManager.get('notes_loading', false),
        error: stateManager.get('notes_error', null)
      };
      this.updateIndicator(currentState);
    });
  }

  disconnectedCallback() {
    // Cleanup event listeners
    this.stateSubscriptions.forEach(unsubscribe => unsubscribe());
    this.stateSubscriptions = [];
  }
}
