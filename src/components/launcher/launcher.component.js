/**
 * Launcher Menu Component - Extensible shortcut launcher
 * Displays shortcuts in a grid layout with keyboard navigation
 */
class Launcher extends Component {
  refs = {
    overlay: '.launcher-overlay',
    grid: '.shortcuts-grid',
    shortcuts: '.shortcut-item'
  };

  currentFocusIndex = 0;
  isVisible = false;
  shortcuts = [];

  constructor() {
    super();
    this.shortcuts = [];
  }

  imports() {
    return [
      this.resources.fonts.roboto,
      this.resources.libs.awoo,
    ];
  }

  style() {
    return `
      .launcher-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(8px);
        display: none;
        z-index: 10000;
        opacity: 0;
        transition: opacity ${CONFIG.launcher?.animationDuration || 200}ms ease-out;
      }

      .launcher-overlay.visible {
        display: block;
        opacity: 1;
      }

      .launcher-container {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0.9);
        transition: transform ${CONFIG.launcher?.animationDuration || 200}ms ease-out;
        background: #32302f;
        border-radius: 12px;
        padding: 2rem;
        min-width: 400px;
        max-width: 600px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
      }

      .launcher-overlay.visible .launcher-container {
        transform: translate(-50%, -50%) scale(1);
      }

      .shortcuts-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 1rem;
        margin-top: 1.5rem;
      }

      .shortcut-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 1.5rem 1rem;
        background: rgba(212, 190, 152, 0.1);
        border: 2px solid transparent;
        border-radius: 8px;
        cursor: pointer;
        transition: all 150ms ease;
        text-align: center;
        min-height: 100px;
      }

      .shortcut-item:hover,
      .shortcut-item:focus {
        background: rgba(212, 190, 152, 0.2);
        border-color: #d4be98;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(212, 190, 152, 0.2);
      }

      .shortcut-item.active {
        background: rgba(212, 190, 152, 0.3);
        border-color: #d4be98;
      }

      .shortcut-icon {
        font-size: 2.5rem;
        margin-bottom: 0.5rem;
        display: block;
      }

      .shortcut-label {
        color: #d4be98;
        font-size: 0.9rem;
        font-weight: 500;
        margin: 0;
      }

      .shortcut-description {
        color: rgba(212, 190, 152, 0.7);
        font-size: 0.75rem;
        margin: 0.25rem 0 0 0;
        line-height: 1.2;
      }

      .launcher-header {
        text-align: center;
        margin-bottom: 1rem;
      }

      .launcher-title {
        color: #d4be98;
        font-size: 1.25rem;
        font-weight: 600;
        margin: 0;
      }

      .launcher-subtitle {
        color: rgba(212, 190, 152, 0.6);
        font-size: 0.875rem;
        margin: 0.25rem 0 0 0;
      }

      /* Accessibility */
      .shortcut-item {
        tab-index: 0;
        role: button;
        aria-label: attr(data-label);
      }

      .launcher-overlay {
        role: dialog;
        aria-modal: true;
        aria-labelledby: "launcher-title";
      }

      /* Responsive */
      @media (max-width: 480px) {
        .launcher-container {
          padding: 1.5rem;
          min-width: 300px;
        }

        .shortcuts-grid {
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
        }

        .shortcut-item {
          padding: 1rem 0.75rem;
          min-height: 80px;
        }

        .shortcut-icon {
          font-size: 2rem;
        }

        .shortcut-label {
          font-size: 0.8rem;
        }
      }
    `;
  }

  template() {
    return `
      <div class="launcher-overlay" role="dialog" aria-modal="true">
        <div class="launcher-container">
          <div class="launcher-header">
            <h2 id="launcher-title" class="launcher-title">Launcher</h2>
            <p class="launcher-subtitle">Choose an action</p>
          </div>
          <div class="shortcuts-grid" role="grid">
            ${this.renderShortcuts()}
          </div>
        </div>
      </div>
    `;
  }

  renderShortcuts() {
    if (!this.shortcuts || this.shortcuts.length === 0) {
      return '<div class="shortcut-item">No shortcuts available</div>';
    }

    return this.shortcuts.map((shortcut, index) => `
      <div class="shortcut-item"
           data-shortcut-id="${shortcut.id}"
           data-label="${shortcut.label}"
           tabindex="0"
           role="button"
           aria-label="${shortcut.label}: ${shortcut.description}"
           data-index="${index}">
        <span class="shortcut-icon">${shortcut.icon}</span>
        <div class="shortcut-label">${shortcut.label}</div>
        <div class="shortcut-description">${shortcut.description}</div>
      </div>
    `).join('');
  }

  setEvents() {
    // Keyboard navigation
    document.addEventListener('keydown', this.handleKeyDown.bind(this));

    // Click on shortcuts
    this.shadow.addEventListener('click', this.handleShortcutClick.bind(this));

    // Click outside to close
    this.refs.overlay.addEventListener('click', (e) => {
      if (e.target === this.refs.overlay) {
        this.hide();
      }
    });

    // Focus management
    this.shadow.addEventListener('focusin', this.handleFocusIn.bind(this));
  }

  handleKeyDown(event) {
    if (!this.isVisible) return;

    const { key } = event;

    switch (key) {
      case 'Escape':
        event.preventDefault();
        this.hide();
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.executeCurrentShortcut();
        break;
      case 'ArrowRight':
        event.preventDefault();
        this.moveFocus(1, 0);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        this.moveFocus(-1, 0);
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.moveFocus(0, 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.moveFocus(0, -1);
        break;
    }
  }

  moveFocus(deltaX, deltaY) {
    if (!this.shortcuts || this.shortcuts.length === 0) return;

    const gridCols = Math.floor(this.refs.grid.offsetWidth / 120); // Approximate column count
    const newIndex = this.calculateNewIndex(deltaX, deltaY, gridCols);

    if (newIndex >= 0 && newIndex < this.shortcuts.length) {
      this.setFocus(newIndex);
    }
  }

  calculateNewIndex(deltaX, deltaY, gridCols) {
    const currentRow = Math.floor(this.currentFocusIndex / gridCols);
    const currentCol = this.currentFocusIndex % gridCols;

    let newCol = currentCol + deltaX;
    let newRow = currentRow + deltaY;

    // Wrap around columns
    if (newCol < 0) {
      newCol = gridCols - 1;
      newRow -= 1;
    } else if (newCol >= gridCols) {
      newCol = 0;
      newRow += 1;
    }

    // Wrap around rows
    const maxRow = Math.ceil(this.shortcuts.length / gridCols) - 1;
    if (newRow < 0) {
      newRow = maxRow;
    } else if (newRow > maxRow) {
      newRow = 0;
    }

    const newIndex = newRow * gridCols + newCol;
    return Math.min(newIndex, this.shortcuts.length - 1);
  }

  setFocus(index) {
    this.currentFocusIndex = index;
    const shortcuts = this.shadow.querySelectorAll('.shortcut-item');

    shortcuts.forEach((item, i) => {
      if (i === index) {
        item.classList.add('active');
        item.focus();
      } else {
        item.classList.remove('active');
      }
    });
  }

  handleShortcutClick(event) {
    const shortcutItem = event.target.closest('.shortcut-item');
    if (shortcutItem) {
      const shortcutId = shortcutItem.dataset.shortcutId;
      this.executeShortcut(shortcutId);
    }
  }

  handleFocusIn(event) {
    const shortcutItem = event.target.closest('.shortcut-item');
    if (shortcutItem) {
      const index = parseInt(shortcutItem.dataset.index);
      this.setFocus(index);
    }
  }

  executeCurrentShortcut() {
    if (this.shortcuts[this.currentFocusIndex]) {
      this.executeShortcut(this.shortcuts[this.currentFocusIndex].id);
    }
  }

  async executeShortcut(shortcutId) {
    try {
      await eventBus.publish({
        type: 'launcher:execute',
        payload: { shortcutId },
        source: 'launcher-component'
      });
      this.hide();
    } catch (error) {
      console.error('Launcher: Error executing shortcut:', error);
    }
  }

  show() {
    this.shortcuts = launcherService.getEnabledShortcuts();
    this.currentFocusIndex = 0;

    // Re-render with current shortcuts
    this.render().then(() => {
      this.isVisible = true;
      const overlay = this.shadow.querySelector('.launcher-overlay');
      overlay.classList.add('visible');

      // Focus first shortcut after animation
      setTimeout(() => {
        this.setFocus(0);
      }, 100);

      // Announce to screen readers
      overlay.setAttribute('aria-hidden', 'false');
    });
  }

  hide() {
    this.isVisible = false;
    const overlay = this.shadow.querySelector('.launcher-overlay');
    overlay.classList.remove('visible');

    // Hide from screen readers
    overlay.setAttribute('aria-hidden', 'true');

    // Return focus to trigger element after animation
    setTimeout(() => {
      const triggerElement = document.querySelector('.fastlink');
      if (triggerElement) {
        triggerElement.focus();
      }
    }, CONFIG.launcher?.animationDuration || 200);
  }

  connectedCallback() {
    this.render().then(() => {
      this.setEvents();
      // Initially hidden
      this.refs.overlay.setAttribute('aria-hidden', 'true');
    });
  }
}
