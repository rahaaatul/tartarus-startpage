class Notes extends Component {
  refs = {
    popup: '.notes-popup',
    textarea: '.notes-textarea',
    closeBtn: '.notes-close',
    status: '.notes-status'
  };

  constructor() {
    super();
    this.isVisible = false;
    this.currentNotes = '';
    this.refreshInterval = null;
    this.isSaving = false;
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
        justify-content: flex-end;
        gap: 10px;
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

      .notes-save:hover {
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
        margin-top: 10px;
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
        <div class="notes-status">Auto-saving...</div>
      </div>
    `;
  }

  async showNotesPopup() {
    if (this.isVisible) return;

    // Load existing notes
    try {
      const notes = await notesStorage.loadNotes();
      this.currentNotes = notes.content || '';
      this.refs.textarea.value = this.currentNotes;
      this.updateStatus('saved');
    } catch (error) {
      console.error('Failed to load notes:', error);
      this.currentNotes = '';
      this.refs.textarea.value = '';
      this.updateStatus('error');
    }

    // Show popup
    this.refs.popup.classList.add('visible');
    this.shadow.querySelector('.notes-overlay').classList.add('visible');
    this.isVisible = true;

    // Start real-time refresh for other users' changes
    this.startRealtimeRefresh();

    // Focus textarea
    setTimeout(() => {
      this.refs.textarea.focus();
      this.refs.textarea.setSelectionRange(this.currentNotes.length, this.currentNotes.length);
    }, 100);
  }

  hideNotesPopup() {
    if (!this.isVisible) return;

    // Stop real-time refresh
    this.stopRealtimeRefresh();

    this.refs.popup.classList.remove('visible');
    this.shadow.querySelector('.notes-overlay').classList.remove('visible');
    this.isVisible = false;
  }

  updateStatus(status) {
    const statusElement = this.refs.status;
    statusElement.classList.remove('saving', 'saved', 'error');

    switch (status) {
      case 'saving':
        statusElement.textContent = 'Saving...';
        statusElement.classList.add('saving');
        break;
      case 'saved':
        statusElement.textContent = 'All changes saved';
        statusElement.classList.add('saved');
        break;
      case 'error':
        statusElement.textContent = 'Connection error - changes not saved';
        statusElement.classList.add('error');
        break;
      default:
        statusElement.textContent = 'Auto-saving...';
    }
  }

  async saveNotes(content) {
    if (this.isSaving) return;

    this.isSaving = true;
    this.updateStatus('saving');

    try {
      const success = await notesStorage.saveNotes(content);
      if (success) {
        this.currentNotes = content;
        this.updateStatus('saved');
      } else {
        throw new Error('Save failed');
      }
    } catch (error) {
      console.error('Failed to save notes:', error);
      this.updateStatus('error');
    } finally {
      this.isSaving = false;
    }
  }

  async refreshNotesFromServer() {
    try {
      const notes = await notesStorage.loadNotes();
      const serverContent = notes.content || '';

      // Only update if the content is different and we're not currently saving
      if (serverContent !== this.currentNotes && !this.isSaving) {
        const cursorPos = this.refs.textarea.selectionStart;
        this.currentNotes = serverContent;
        this.refs.textarea.value = serverContent;

        // Try to restore cursor position
        if (cursorPos <= serverContent.length) {
          this.refs.textarea.setSelectionRange(cursorPos, cursorPos);
        }
      }
    } catch (error) {
      console.error('Failed to refresh notes:', error);
    }
  }

  startRealtimeRefresh() {
    // Refresh every 200ms for near real-time sync with other users
    this.refreshInterval = setInterval(() => {
      this.refreshNotesFromServer();
    }, 200);
  }

  stopRealtimeRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  setEvents() {
    // Close button
    this.refs.closeBtn.onclick = () => this.hideNotesPopup();

    // Overlay click to close
    this.shadow.querySelector('.notes-overlay').onclick = () => this.hideNotesPopup();

    // ESC key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hideNotesPopup();
      }
    });

    // Immediate auto-save on every change
    this.refs.textarea.oninput = () => {
      const content = this.refs.textarea.value;
      // Save immediately on every keystroke
      this.saveNotes(content);
    };
  }

  connectedCallback() {
    console.log('Notes component connected');
    this.render().then(() => {
      console.log('Notes component rendered');
      this.setEvents();
    });
  }
}
