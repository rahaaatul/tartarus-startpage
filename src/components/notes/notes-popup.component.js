/**
 * Notes Popup Component - Dedicated popup component for notes editing
 * Uses event-driven architecture with centralized state management
 */

class NotesPopup extends Component {
  refs = {
    popup: '.notes-popup',
    textarea: '.notes-textarea',
    closeBtn: '.notes-close',
    saveBtn: '.notes-save',
    status: '.notes-status',
    overlay: '.notes-overlay'
  };

  constructor() {
    super();
    this.isVisible = false;
    this.currentContent = '';
    this.saveTimeout = null;
    this.stateSubscriptions = [];
  }

  imports() {
    return [
      this.resources.fonts.roboto,
      this.resources.libs.awoo
    ];
  }

  style() {
    return `
      .notes-popup {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(40, 40, 40, 0.95);
        border: 1px solid #d4be98;
        border-radius: 8px;
        padding: 20px;
        width: 500px;
        max-width: 90vw;
        max-height: 80vh;
        z-index: 10000;
        display: none;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(10px);
      }

      .notes-popup.visible {
        display: block;
      }

      .notes-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
        border-bottom: 1px solid rgba(212, 190, 152, 0.3);
        padding-bottom: 10px;
      }

      .notes-title {
        color: #d4be98;
        font: 600 16px 'Roboto', sans-serif;
        margin: 0;
      }

      .notes-close {
        background: none;
        border: none;
        color: #ea6962;
        font-size: 20px;
        cursor: pointer;
        padding: 5px;
        border-radius: 3px;
        transition: background-color 0.2s;
      }

      .notes-close:hover {
        background-color: rgba(234, 105, 98, 0.1);
      }

      .notes-textarea {
        width: 100%;
        height: 300px;
        background: rgba(30, 30, 30, 0.8);
        border: 1px solid rgba(212, 190, 152, 0.3);
        border-radius: 4px;
        color: #d4be98;
        font-family: 'Roboto', monospace;
        font-size: 14px;
        padding: 12px;
        resize: vertical;
        outline: none;
        line-height: 1.4;
      }

      .notes-textarea:focus {
        border-color: #d4be98;
        box-shadow: 0 0 0 2px rgba(212, 190, 152, 0.2);
      }

      .notes-textarea::placeholder {
        color: rgba(212, 190, 152, 0.5);
      }

      .notes-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 15px;
      }

      .notes-save {
        background: #7daea3;
        color: #32302f;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font: 500 14px 'Roboto', sans-serif;
        transition: background-color 0.2s;
      }

      .notes-save:hover:not(:disabled) {
        background: #89b482;
      }

      .notes-save:disabled {
        background: rgba(125, 174, 163, 0.5);
        cursor: not-allowed;
      }

      .notes-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.5);
        z-index: 9999;
        display: none;
      }

      .notes-overlay.visible {
        display: block;
      }

      .notes-status {
        font-size: 12px;
        color: rgba(212, 190, 152, 0.7);
        text-align: center;
        font-style: italic;
      }

      .notes-status.saving {
        color: #ea6962;
      }

      .notes-status.saved {
        color: #7daea3;
      }

      .notes-status.error {
        color: #ea6962;
      }

      .notes-status.loading {
        color: #d4be98;
      }
    `;
  }

  template() {
    return `
      <div class="notes-overlay"></div>
      <div class="notes-popup">
        <div class="notes-header">
          <h3 class="notes-title">Notes</h3>
          <button class="notes-close" title="Close">&times;</button>
        </div>
        <textarea class="notes-textarea" placeholder="Write your notes here..."></textarea>
        <div class="notes-actions">
          <div class="notes-status">Ready</div>
          <button class="notes-save">Save</button>
        </div>
      </div>
    `;
  }

  async show() {
    if (this.isVisible) return;

    try {
      // Load notes content
      const notesData = await notesService.load();
      this.currentContent = notesData.content || '';
      this.refs.textarea.value = this.currentContent;

      this.updateStatus('loaded');
    } catch (error) {
      console.error('NotesPopup: Failed to load notes:', error);
      this.currentContent = '';
      this.refs.textarea.value = '';
      this.updateStatus('error');
    }

    // Show popup
    this.refs.popup.classList.add('visible');
    this.refs.overlay.classList.add('visible');
    this.isVisible = true;

    // Focus textarea
    setTimeout(() => {
      this.refs.textarea.focus();
      this.refs.textarea.setSelectionRange(this.currentContent.length, this.currentContent.length);
    }, 100);

    // Publish event
    eventBus.publish({
      type: 'notes:popup:opened',
      payload: { content: this.currentContent },
      source: 'notes-popup'
    });
  }

  hide() {
    if (!this.isVisible) return;

    // Cancel any pending saves
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }

    this.refs.popup.classList.remove('visible');
    this.refs.overlay.classList.remove('visible');
    this.isVisible = false;

    // Publish event
    eventBus.publish({
      type: 'notes:popup:closed',
      payload: {},
      source: 'notes-popup'
    });
  }

  updateStatus(status, message = null) {
    const statusElement = this.refs.status;
    statusElement.classList.remove('saving', 'saved', 'error', 'loading');

    switch (status) {
      case 'loading':
        statusElement.textContent = 'Loading...';
        statusElement.classList.add('loading');
        break;
      case 'loaded':
        statusElement.textContent = 'All changes saved';
        statusElement.classList.add('saved');
        break;
      case 'saving':
        statusElement.textContent = 'Saving...';
        statusElement.classList.add('saving');
        break;
      case 'saved':
        statusElement.textContent = 'All changes saved';
        statusElement.classList.add('saved');
        break;
      case 'error':
        statusElement.textContent = message || 'Connection error';
        statusElement.classList.add('error');
        break;
      default:
        statusElement.textContent = message || 'Ready';
    }
  }

  async saveNotes(immediate = false) {
    const content = this.refs.textarea.value;

    // No change, skip save
    if (content === this.currentContent && !immediate) {
      return;
    }

    // Cancel pending save
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }

    // Immediate save or schedule delayed save
    if (immediate) {
      await this.performSave(content);
    } else {
      this.saveTimeout = setTimeout(() => {
        this.performSave(content);
      }, 1000); // 1 second delay
    }
  }

  async performSave(content) {
    try {
      this.updateStatus('saving');
      await notesService.save(content);
      this.currentContent = content;
      this.updateStatus('saved');
    } catch (error) {
      console.error('NotesPopup: Failed to save notes:', error);
      this.updateStatus('error', error.message);
    }
  }

  handleTextareaInput() {
    this.saveNotes(false); // Delayed save
  }

  handleSaveClick() {
    this.saveNotes(true); // Immediate save
  }

  handleCloseClick() {
    this.hide();
  }

  handleOverlayClick() {
    this.hide();
  }

  handleKeyDown(event) {
    if (event.key === 'Escape' && this.isVisible) {
      this.hide();
    } else if (event.ctrlKey && event.key === 's') {
      event.preventDefault();
      this.saveNotes(true);
    }
  }

  setupEventListeners() {
    // DOM events
    this.refs.closeBtn.onclick = () => this.handleCloseClick();
    this.refs.saveBtn.onclick = () => this.handleSaveClick();
    this.refs.overlay.onclick = () => this.handleOverlayClick();
    this.refs.textarea.oninput = () => this.handleTextareaInput();

    // Global keyboard events
    document.addEventListener('keydown', this.handleKeyDown.bind(this));

    // Event bus subscriptions
    this.stateSubscriptions.push(
      eventBus.subscribe('notes:loading', (message) => {
        if (this.isVisible) {
          this.updateStatus('loading');
        }
      }, this),

      eventBus.subscribe('notes:saved', (message) => {
        if (this.isVisible) {
          this.updateStatus('saved');
          this.currentContent = message.payload.content;
        }
      }, this),

      eventBus.subscribe('notes:error', (message) => {
        if (this.isVisible && message.payload.action === 'save') {
          this.updateStatus('error', message.payload.error);
        }
      }, this),

      eventBus.subscribe('notes:conflict', (message) => {
        if (this.isVisible) {
          this.handleConflict(message.payload);
        }
      }, this)
    );
  }

  handleConflict(conflictData) {
    const shouldReload = confirm(
      'Your notes have been modified on another device. Reload the latest version? ' +
      'Your current changes will be lost.'
    );

    if (shouldReload) {
      this.refs.textarea.value = conflictData.serverContent;
      this.currentContent = conflictData.serverContent;
      this.updateStatus('loaded');
    }
  }

  connectedCallback() {
    this.render().then(() => {
      console.log('NotesPopup component rendered');
      this.setupEventListeners();
    });
  }

  disconnectedCallback() {
    // Cleanup event listeners
    this.stateSubscriptions.forEach(unsubscribe => unsubscribe());
    this.stateSubscriptions = [];

    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
  }
}
