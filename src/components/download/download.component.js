/**
 * Download/File Browser Component
 * Provides directory browsing and file downloading functionality
 */
class DownloadComponent extends Component {
  refs = {
    modal: '.download-modal',
    overlay: '.download-overlay',
    sidebar: '.sidebar',
    content: '.content-area',
    breadcrumbs: '.breadcrumbs',
    fileList: '.file-list'
  };

  constructor() {
    super();
    this.currentPath = '';
    this.sidebarTree = {};
    this.selectedItems = new Set();
    this.viewMode = 'grid'; // 'grid' or 'list'
    this.gridMinWidth = 120; // Minimum width for grid items in pixels
    this.isResizing = false;
    this.resizeStartX = 0;
    this.resizeStartWidth = 0;
  }

  imports() {
    return [
      this.resources.fonts.roboto,
      this.resources.libs.awoo,
    ];
  }

  style() {
    return `
      .download-overlay {
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
        transition: opacity ${CONFIG.download?.animationDuration || 200}ms ease-out;
      }

      .download-overlay.visible {
        display: block;
        opacity: 1;
      }

      .download-modal {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0.9);
        transition: transform ${CONFIG.download?.animationDuration || 200}ms ease-out;
        background: #32302f;
        border-radius: 12px;
        width: 90vw;
        height: 80vh;
        max-width: 1200px;
        max-height: 800px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
        border: 1px solid rgba(212, 190, 152, 0.1);
        display: flex;
        overflow: hidden;
      }

      .download-overlay.visible .download-modal {
        transform: translate(-50%, -50%) scale(1);
      }

      .sidebar {
        width: 250px;
        min-width: 150px;
        max-width: 400px;
        background: rgba(212, 190, 152, 0.05);
        border-right: 1px solid rgba(212, 190, 152, 0.1);
        padding: 1rem;
        overflow-y: auto;
        position: relative;
      }

      .sidebar-resize-handle {
        position: absolute;
        top: 0;
        right: -5px;
        width: 10px;
        height: 100%;
        cursor: ew-resize;
        background: transparent;
        z-index: 10;
      }

      .sidebar-resize-handle:hover,
      .sidebar-resize-handle.active {
        background: rgba(212, 190, 152, 0.3);
      }

      .sidebar-resize-handle::after {
        content: '';
        position: absolute;
        left: 4px;
        top: 50%;
        transform: translateY(-50%);
        width: 2px;
        height: 20px;
        background: rgba(212, 190, 152, 0.4);
        border-radius: 1px;
      }

      .sidebar-header {
        color: #d4be98;
        font-size: 1.1rem;
        font-weight: 600;
        margin-bottom: 1rem;
        padding-bottom: 0.5rem;
        border-bottom: 1px solid rgba(212, 190, 152, 0.2);
      }

      .sidebar-tree {
        list-style: none;
        padding: 0;
        margin: 0;
      }

      .tree-item {
        margin: 2px 0;
      }

      .tree-container {
        max-height: calc(80vh - 120px);
        overflow-y: auto;
      }

      .tree-item {
        position: relative;
      }

      .tree-item-link {
        display: flex;
        align-items: center;
        padding: 4px 8px 4px 0;
        color: rgba(212, 190, 152, 0.8);
        text-decoration: none;
        border-radius: 4px;
        transition: all 200ms ease;
        font-size: 0.9rem;
        cursor: pointer;
        user-select: none;
      }

      .tree-item-link:hover,
      .tree-item-link.active {
        background: rgba(212, 190, 152, 0.1);
        color: #d4be98;
      }

      .tree-toggle {
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 4px;
        font-size: 0.8rem;
        color: rgba(212, 190, 152, 0.6);
        transition: all 200ms ease;
      }

      .tree-toggle:hover {
        color: #d4be98;
      }

      .tree-toggle.expanded {
        transform: rotate(90deg);
      }

      .tree-item-icon {
        margin-right: 6px;
        font-size: 1rem;
        min-width: 16px;
      }

      .tree-item-name {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .tree-children {
        display: none;
        padding-left: 20px;
      }

      .tree-children.expanded {
        display: block;
      }

      .tree-indent {
        padding-left: 20px;
      }

      .tree-loading {
        padding: 4px 8px;
        color: rgba(212, 190, 152, 0.6);
        font-size: 0.8rem;
        font-style: italic;
      }

      .content-area {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .content-header {
        padding: 1rem;
        border-bottom: 1px solid rgba(212, 190, 152, 0.1);
        background: rgba(212, 190, 152, 0.02);
      }

      .breadcrumbs {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 0.5rem;
      }

      .breadcrumb-item {
        color: rgba(212, 190, 152, 0.7);
        text-decoration: none;
        padding: 4px 8px;
        border-radius: 4px;
        transition: all 200ms ease;
        font-size: 0.9rem;
      }

      .breadcrumb-item:hover {
        background: rgba(212, 190, 152, 0.1);
        color: #d4be98;
      }

      .breadcrumb-separator {
        color: rgba(212, 190, 152, 0.4);
        margin: 0 4px;
      }

      .toolbar {
        display: flex;
        gap: 8px;
        align-items: center;
      }

      .toolbar-button {
        padding: 6px 12px;
        background: rgba(212, 190, 152, 0.1);
        border: 1px solid rgba(212, 190, 152, 0.2);
        border-radius: 4px;
        color: #d4be98;
        text-decoration: none;
        font-size: 0.85rem;
        transition: all 200ms ease;
        cursor: pointer;
      }

      .toolbar-button:hover {
        background: rgba(212, 190, 152, 0.2);
        border-color: #d4be98;
      }

      .toolbar-button:active {
        background: #d4be98;
        color: #32302f;
      }

      .view-controls {
        display: flex;
        align-items: center;
        gap: 4px;
        margin-left: auto;
        margin-right: 1rem;
      }

      .view-toggle.active {
        background: #d4be98;
        color: #32302f;
        border-color: #d4be98;
      }

      .grid-slider-container {
        display: flex;
        align-items: center;
        gap: 4px;
        margin-left: 8px;
      }

      .grid-slider-container input[type="range"] {
        -webkit-appearance: none;
        appearance: none;
        background: rgba(212, 190, 152, 0.2);
        height: 4px;
        border-radius: 2px;
        outline: none;
      }

      .grid-slider-container input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #d4be98;
        cursor: pointer;
      }

      .grid-slider-container input[type="range"]::-moz-range-thumb {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #d4be98;
        cursor: pointer;
        border: none;
      }

      /* List view styles */
      .file-list.list-view {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .file-list.list-view .file-item {
        display: flex;
        flex-direction: row;
        align-items: center;
        padding: 8px 12px;
        min-height: auto;
        text-align: left;
        border-radius: 0;
        border: none;
        border-bottom: 1px solid rgba(212, 190, 152, 0.05);
        margin: 0;
      }

      .file-list.list-view .file-item:hover {
        background: rgba(212, 190, 152, 0.05);
        transform: none;
        box-shadow: none;
        border-color: rgba(212, 190, 152, 0.1);
      }

      .file-list.list-view .file-item.selected {
        background: rgba(212, 190, 152, 0.1);
        border-color: rgba(212, 190, 152, 0.2);
      }

      .file-list.list-view .file-icon {
        font-size: 1.2rem;
        margin-bottom: 0;
        margin-right: 12px;
        flex-shrink: 0;
      }

      .file-list.list-view .file-name {
        flex: 1;
        font-size: 0.9rem;
        margin: 0;
        text-align: left;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .file-list.list-view .file-size {
        font-size: 0.8rem;
        margin-top: 0;
        margin-left: 12px;
        flex-shrink: 0;
      }

      .file-list-container {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 1rem;
      }

      .file-list {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
        gap: 1rem;
        list-style: none;
        padding: 0;
        margin: 0;
        width: 100%;
        box-sizing: border-box;
        min-width: 0; /* Allow grid items to shrink */
      }

      .file-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 1rem;
        background: rgba(212, 190, 152, 0.02);
        border: 1px solid rgba(212, 190, 152, 0.05);
        border-radius: 8px;
        transition: all 200ms ease;
        cursor: pointer;
        text-align: center;
        min-height: 100px;
        position: relative;
      }

      .file-item:hover {
        background: rgba(212, 190, 152, 0.1);
        border-color: rgba(212, 190, 152, 0.2);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      }

      .file-item.selected {
        background: rgba(212, 190, 152, 0.15);
        border-color: #d4be98;
      }

      .file-icon {
        font-size: 2.5rem;
        margin-bottom: 0.5rem;
        display: block;
      }

      .file-name {
        color: #d4be98;
        font-size: 0.85rem;
        font-weight: 500;
        margin: 0;
        line-height: 1.3;
      }

      /* Grid view truncation */
      .file-list:not(.list-view) .file-name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 100%;
      }

      /* List view can show full names */
      .file-list.list-view .file-name {
        white-space: nowrap;
        overflow: visible;
        text-overflow: clip;
      }

      /* Tooltip for full filename */
      .file-name[title]:hover::after {
        content: attr(title);
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        background: #32302f;
        color: #d4be98;
        padding: 6px 10px;
        border-radius: 4px;
        border: 1px solid rgba(212, 190, 152, 0.3);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        font-size: 0.8rem;
        white-space: nowrap;
        z-index: 1000;
        max-width: 300px;
        word-break: break-word;
        white-space: normal;
        line-height: 1.4;
        pointer-events: none;
      }

      .file-name[title]:hover {
        position: relative;
      }

      .file-size {
        color: rgba(212, 190, 152, 0.6);
        font-size: 0.75rem;
        margin-top: 4px;
      }

      .close-button {
        position: absolute;
        top: 10px;
        right: 10px;
        width: 30px;
        height: 30px;
        background: rgba(212, 190, 152, 0.1);
        border: 1px solid rgba(212, 190, 152, 0.2);
        border-radius: 50%;
        color: #d4be98;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.2rem;
        transition: all 200ms ease;
      }

      .close-button:hover {
        background: rgba(212, 190, 152, 0.2);
        border-color: #d4be98;
        transform: scale(1.1);
      }

      .loading {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 200px;
        color: rgba(212, 190, 152, 0.7);
        font-size: 1.1rem;
      }

      .empty {
        text-align: center;
        padding: 2rem;
        color: rgba(212, 190, 152, 0.6);
      }

      /* Context menu */
      .context-menu {
        position: absolute;
        background: #32302f;
        border: 1px solid rgba(212, 190, 152, 0.2);
        border-radius: 6px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
        z-index: 10001;
        min-width: 160px;
        padding: 4px 0;
        display: none;
      }

      .context-menu.visible {
        display: block;
      }

      .context-menu-item {
        display: flex;
        align-items: center;
        padding: 8px 16px;
        color: #d4be98;
        text-decoration: none;
        font-size: 0.9rem;
        transition: background 200ms ease;
        cursor: pointer;
      }

      .context-menu-item:hover {
        background: rgba(212, 190, 152, 0.1);
      }

      .context-menu-item-icon {
        margin-right: 8px;
        width: 16px;
        text-align: center;
      }

      .context-menu-separator {
        height: 1px;
        background: rgba(212, 190, 152, 0.2);
        margin: 4px 0;
      }

      /* Responsive */
      @media (max-width: 768px) {
        .download-modal {
          width: 95vw;
          height: 90vh;
        }

        .sidebar {
          width: 200px;
        }

        .file-list {
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 0.75rem;
        }

        .file-item {
          padding: 0.75rem;
          min-height: 80px;
        }

        .file-icon {
          font-size: 2rem;
        }
      }

      @media (max-width: 480px) {
        .sidebar {
          width: 150px;
          padding: 0.75rem;
        }

        .file-list {
          grid-template-columns: repeat(2, 1fr);
        }
      }
    `;
  }

  template() {
    return `
      <div class="download-overlay">
        <div class="download-modal">
          <div class="close-button" title="Close">&times;</div>

          <div class="sidebar">
            <div class="sidebar-resize-handle"></div>
            <div class="sidebar-header">📁 Directory Tree</div>
            <div class="tree-container">
              <ul class="sidebar-tree" id="directory-tree">
                <!-- Directory tree will be populated dynamically -->
              </ul>
            </div>
          </div>

          <div class="content-area">
            <div class="content-header">
              <div class="breadcrumbs"></div>
              <div class="toolbar">
                <button class="toolbar-button" id="back-btn" title="Go Back">⬅️ Back</button>
                <button class="toolbar-button" id="refresh-btn">🔄 Refresh</button>
                <button class="toolbar-button" id="select-all-btn">☑️ Select All</button>
                <div class="view-controls">
                  <button class="toolbar-button view-toggle ${this.viewMode === 'grid' ? 'active' : ''}" id="grid-view-btn">⊞ Grid</button>
                  <button class="toolbar-button view-toggle ${this.viewMode === 'list' ? 'active' : ''}" id="list-view-btn">☰ List</button>
                  <div class="grid-slider-container" id="grid-slider-container" style="display: ${this.viewMode === 'grid' ? 'flex' : 'none'};">
                    <label for="grid-columns-slider" style="color: rgba(212, 190, 152, 0.7); font-size: 0.8rem; margin-right: 8px;">Size:</label>
                    <input type="range" id="grid-columns-slider" min="80" max="200" value="${this.gridMinWidth}" style="width: 80px;">
                    <span id="grid-columns-value" style="color: #d4be98; font-size: 0.8rem; margin-left: 4px; width: 20px;">${this.gridMinWidth}</span>
                  </div>
                </div>
                <button class="toolbar-button" id="download-selected-btn" disabled>⬇️ Download Selected</button>
              </div>
            </div>

            <div class="file-list-container">
              <div class="loading">Loading directory contents...</div>
            </div>
          </div>
        </div>

        <!-- Context Menu -->
        <div class="context-menu" id="context-menu">
          <a href="#" class="context-menu-item" data-action="download">
            <span class="context-menu-item-icon">⬇️</span>
            Download
          </a>
          <a href="#" class="context-menu-item" data-action="open">
            <span class="context-menu-item-icon">📂</span>
            Open
          </a>
          <div class="context-menu-separator"></div>
          <a href="#" class="context-menu-item" data-action="select">
            <span class="context-menu-item-icon">☑️</span>
            Select
          </a>
        </div>
      </div>
    `;
  }

  setEvents() {
    // Close modal
    this.refs.overlay.addEventListener('click', (e) => {
      if (e.target === this.refs.overlay) {
        this.hide();
      }
    });

    this.shadow.querySelector('.close-button').addEventListener('click', () => {
      this.hide();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (!this.isVisible) return;

      if (e.key === 'Escape') {
        this.hide();
      }
    });

    // Sidebar navigation
    this.shadow.querySelectorAll('.tree-item-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const path = link.dataset.path;
        this.navigateTo(path);
      });
    });

    // Toolbar buttons
    this.shadow.querySelector('#back-btn').addEventListener('click', () => {
      this.goBack();
    });

    this.shadow.querySelector('#refresh-btn').addEventListener('click', () => {
      this.loadDirectory(this.currentPath);
    });

    this.shadow.querySelector('#select-all-btn').addEventListener('click', () => {
      this.selectAllItems();
    });

    this.shadow.querySelector('#download-selected-btn').addEventListener('click', () => {
      this.downloadSelectedItems();
    });

    // View toggle buttons
    this.shadow.querySelector('#grid-view-btn').addEventListener('click', () => {
      this.setViewMode('grid');
    });

    this.shadow.querySelector('#list-view-btn').addEventListener('click', () => {
      this.setViewMode('list');
    });

    // Grid columns slider
    this.shadow.querySelector('#grid-columns-slider').addEventListener('input', (e) => {
      this.setGridColumns(parseInt(e.target.value));
    });

    // Right-click context menu
    this.shadow.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.showContextMenu(e);
    });

    // Context menu actions
    this.shadow.querySelectorAll('.context-menu-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleContextMenuAction(item.dataset.action);
      });
    });

    // Hide context menu on click elsewhere
    this.shadow.addEventListener('click', () => {
      this.hideContextMenu();
    });

    // Sidebar resize functionality
    const resizeHandle = this.shadow.querySelector('.sidebar-resize-handle');
    resizeHandle.addEventListener('mousedown', (e) => {
      this.startResize(e);
    });

    // Prevent text selection during resize
    document.addEventListener('selectstart', (e) => {
      if (this.isResizing) {
        e.preventDefault();
      }
    });
  }

  async show() {
    this.isVisible = true;
    const overlay = this.shadow.querySelector('.download-overlay');
    overlay.classList.add('visible');

    // Load root directory
    await this.loadDirectory('');

    // Build directory tree
    await this.buildDirectoryTree();

    // Announce to screen readers
    overlay.setAttribute('aria-hidden', 'false');
  }

  hide() {
    this.isVisible = false;
    const overlay = this.shadow.querySelector('.download-overlay');
    overlay.classList.remove('visible');

    // Hide from screen readers
    overlay.setAttribute('aria-hidden', 'true');

    // Clear selections
    this.selectedItems.clear();
    this.updateToolbar();
  }

  async navigateTo(path) {
    await this.loadDirectory(path);

    // Update tree active state and expand path
    await this.updateTreeForPath(path);

    // Update breadcrumbs
    this.updateBreadcrumbs(path);
  }

  async loadDirectory(path) {
    this.currentPath = path;
    const fileListContainer = this.shadow.querySelector('.file-list-container');
    const rootPath = CONFIG.download?.rootPath || '.';

    console.log('Client: loadDirectory', { path, rootPath, CONFIG });

    // Show loading
    fileListContainer.innerHTML = '<div class="loading">Loading directory contents...</div>';

    try {
      const response = await fetch(`http://localhost:3001/browse?path=${encodeURIComponent(path)}&root=${encodeURIComponent(rootPath)}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();

      // Parse the HTML to extract file information
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const items = Array.from(doc.querySelectorAll('.item'));

      this.renderFileList(items);
      this.updateBreadcrumbs(path);

    } catch (error) {
      console.error('Error loading directory:', error);
      fileListContainer.innerHTML = '<div class="empty">Error loading directory</div>';
    }
  }

  renderFileList(items) {
    const fileListContainer = this.shadow.querySelector('.file-list-container');

    if (items.length === 0) {
      fileListContainer.innerHTML = '<div class="empty">This directory is empty</div>';
      return;
    }

    const fileItems = items.map(item => {
      const isDirectory = item.classList.contains('directory');
      const link = item.querySelector('a');
      const href = link.getAttribute('href');
      const name = link.textContent.trim();

      // Extract path from href
      const url = new URL(href, window.location.origin);
      const itemPath = url.searchParams.get('path');
      const type = url.searchParams.get('type') || (isDirectory ? 'dir' : 'file');

      return {
        name,
        path: itemPath,
        type,
        isDirectory
      };
    });

    // Apply view mode classes
    const listClass = this.viewMode === 'list' ? 'list-view' : '';
    const gridStyle = this.viewMode === 'grid' ? `grid-template-columns: repeat(auto-fill, minmax(${this.gridMinWidth}px, 1fr));` : '';

    const html = `
      <ul class="file-list ${listClass}" style="${gridStyle}">
        ${fileItems.map(item => {
          // Add title attribute for tooltip if name is long
          const titleAttr = item.name.length > 15 ? `title="${item.name}"` : '';
          return `
            <li class="file-item"
                data-path="${item.path}"
                data-type="${item.type}"
                data-name="${item.name}">
              <span class="file-icon">${this.getFileIcon(item.isDirectory, item.name)}</span>
              <div class="file-name" ${titleAttr}>${item.name}</div>
            </li>
          `;
        }).join('')}
      </ul>
    `;

    fileListContainer.innerHTML = html;

    // Add event listeners
    fileListContainer.querySelectorAll('.file-item').forEach(item => {
      item.addEventListener('click', (e) => {
        this.handleFileClick(e, item);
      });

      item.addEventListener('dblclick', (e) => {
        this.handleFileDoubleClick(e, item);
      });
    });
  }

  setViewMode(mode) {
    this.viewMode = mode;

    // Update button states
    const gridBtn = this.shadow.querySelector('#grid-view-btn');
    const listBtn = this.shadow.querySelector('#list-view-btn');
    const sliderContainer = this.shadow.querySelector('#grid-slider-container');

    gridBtn.classList.toggle('active', mode === 'grid');
    listBtn.classList.toggle('active', mode === 'list');
    sliderContainer.style.display = mode === 'grid' ? 'flex' : 'none';

    // Re-render current directory with new view mode
    this.loadDirectory(this.currentPath);
  }

  setGridColumns(minWidth) {
    this.gridMinWidth = minWidth;

    // Update slider value display
    const valueSpan = this.shadow.querySelector('#grid-columns-value');
    if (valueSpan) {
      valueSpan.textContent = minWidth;
    }

    // Update grid if in grid mode - use auto-fill with the new min width
    if (this.viewMode === 'grid') {
      const fileList = this.shadow.querySelector('.file-list');
      if (fileList) {
        fileList.style.gridTemplateColumns = `repeat(auto-fill, minmax(${minWidth}px, 1fr))`;
      }
    }
  }

  updateBreadcrumbs(path) {
    const breadcrumbs = this.shadow.querySelector('.breadcrumbs');
    const parts = path ? path.split('/').filter(p => p) : [];

    let html = '<a href="#" class="breadcrumb-item" data-path="">🏠 Root</a>';

    let currentPath = '';
    parts.forEach((part, index) => {
      currentPath += (currentPath ? '/' : '') + part;
      html += '<span class="breadcrumb-separator">/</span>';
      html += `<a href="#" class="breadcrumb-item" data-path="${currentPath}">${part}</a>`;
    });

    breadcrumbs.innerHTML = html;

    // Add event listeners
    breadcrumbs.querySelectorAll('.breadcrumb-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        this.navigateTo(item.dataset.path);
      });
    });
  }

  handleFileClick(e, item) {
    const path = item.dataset.path;
    const type = item.dataset.type;

    if (e.ctrlKey || e.metaKey) {
      // Multi-select
      this.toggleItemSelection(path);
    } else if (e.shiftKey) {
      // Range select (simplified - just toggle for now)
      this.toggleItemSelection(path);
    } else {
      // Single select
      this.selectedItems.clear();
      this.selectedItems.add(path);
      this.updateSelectionUI();
    }
  }

  handleFileDoubleClick(e, item) {
    const path = item.dataset.path;
    const type = item.dataset.type;
    const isDirectory = item.dataset.type === 'dir';

    if (isDirectory) {
      this.navigateTo(path);
    } else {
      this.downloadFile(path, type);
    }
  }

  toggleItemSelection(path) {
    if (this.selectedItems.has(path)) {
      this.selectedItems.delete(path);
    } else {
      this.selectedItems.add(path);
    }
    this.updateSelectionUI();
  }

  updateSelectionUI() {
    this.shadow.querySelectorAll('.file-item').forEach(item => {
      const path = item.dataset.path;
      item.classList.toggle('selected', this.selectedItems.has(path));
    });
    this.updateToolbar();
  }

  selectAllItems() {
    const allItems = Array.from(this.shadow.querySelectorAll('.file-item'));
    if (this.selectedItems.size === allItems.length) {
      // Deselect all
      this.selectedItems.clear();
    } else {
      // Select all
      this.selectedItems.clear();
      allItems.forEach(item => {
        this.selectedItems.add(item.dataset.path);
      });
    }
    this.updateSelectionUI();
  }

  goBack() {
    if (this.currentPath) {
      // Get parent directory path
      const pathParts = this.currentPath.split('/').filter(p => p);
      pathParts.pop(); // Remove last part
      const parentPath = pathParts.join('/');
      this.navigateTo(parentPath);
    }
  }

  updateToolbar() {
    const downloadBtn = this.shadow.querySelector('#download-selected-btn');
    downloadBtn.disabled = this.selectedItems.size === 0;
    downloadBtn.textContent = this.selectedItems.size > 0
      ? `⬇️ Download ${this.selectedItems.size} item${this.selectedItems.size > 1 ? 's' : ''}`
      : '⬇️ Download Selected';
  }

  downloadFile(path, type) {
    const rootPath = CONFIG.download?.rootPath || '.';
    const link = document.createElement('a');
    link.href = `http://localhost:3001/download?path=${encodeURIComponent(path)}&type=${type}&root=${encodeURIComponent(rootPath)}`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  downloadSelectedItems() {
    if (this.selectedItems.size === 0) return;

    if (this.selectedItems.size === 1) {
      // Single item - download directly
      const path = Array.from(this.selectedItems)[0];
      const type = path.includes('.') ? 'file' : 'dir';
      this.downloadFile(path, type);
    } else {
      // Multiple items - download as bulk ZIP
      this.downloadBulkZip();
    }
  }

  downloadBulkZip() {
    const paths = Array.from(this.selectedItems);
    const rootPath = CONFIG.download?.rootPath || '.';
    const link = document.createElement('a');
    link.href = `http://localhost:3001/download/bulk?paths=${encodeURIComponent(JSON.stringify(paths))}&root=${encodeURIComponent(rootPath)}`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  getFileIcon(isDirectory, name) {
    if (isDirectory) {
      return '📁';
    }

    const ext = name.split('.').pop().toLowerCase();
    const iconMap = {
      'txt': '📄',
      'md': '📝',
      'js': '📜',
      'json': '📋',
      'html': '🌐',
      'css': '🎨',
      'png': '🖼️',
      'jpg': '📸',
      'jpeg': '📸',
      'gif': '🎞️',
      'svg': '🎭',
      'pdf': '📕',
      'zip': '📦',
      'mp3': '🎵',
      'mp4': '🎬',
      'exe': '⚙️'
    };

    return iconMap[ext] || '📄';
  }

  showContextMenu(e) {
    const contextMenu = this.shadow.querySelector('#context-menu');
    const target = e.target.closest('.file-item');

    if (target) {
      // Context menu on file item
      this.contextMenuTarget = target;
      contextMenu.style.left = `${e.clientX}px`;
      contextMenu.style.top = `${e.clientY}px`;
      contextMenu.classList.add('visible');
    }
  }

  hideContextMenu() {
    const contextMenu = this.shadow.querySelector('#context-menu');
    contextMenu.classList.remove('visible');
  }

  handleContextMenuAction(action) {
    if (!this.contextMenuTarget) return;

    const path = this.contextMenuTarget.dataset.path;
    const type = this.contextMenuTarget.dataset.type;
    const isDirectory = type === 'dir';

    switch (action) {
      case 'download':
        this.downloadFile(path, type);
        break;
      case 'open':
        if (isDirectory) {
          this.navigateTo(path);
        } else {
          this.downloadFile(path, type); // For files, download = open
        }
        break;
      case 'select':
        this.toggleItemSelection(path);
        break;
    }

    this.hideContextMenu();
  }

  async buildDirectoryTree() {
    const treeContainer = this.shadow.querySelector('#directory-tree');
    const rootPath = CONFIG.download?.rootPath || '.';

    console.log('Building directory tree for root:', rootPath);

    try {
      // Start with root
      const rootHtml = `
        <li class="tree-item">
          <div class="tree-item-link" data-path="">
            <span class="tree-toggle">▶️</span>
            <span class="tree-item-icon">🏠</span>
            <span class="tree-item-name">Root</span>
          </div>
          <ul class="tree-children" id="root-children">
            <li class="tree-loading">Loading...</li>
          </ul>
        </li>
      `;

      treeContainer.innerHTML = rootHtml;

      // Load root directories
      await this.loadTreeLevel('', 'root-children');

      // Add event listeners for tree toggles
      this.shadow.querySelectorAll('.tree-toggle').forEach(toggle => {
        toggle.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleTreeNode(e.target);
        });
      });

      // Add event listeners for tree navigation
      this.shadow.querySelectorAll('.tree-item-link').forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const path = link.dataset.path;
          this.navigateTo(path);
        });
      });

      console.log('Directory tree built successfully');

    } catch (error) {
      console.error('Error building directory tree:', error);
      treeContainer.innerHTML = '<li class="tree-item">Error loading tree</li>';
    }
  }

  async loadTreeLevel(parentPath, containerId) {
    const container = this.shadow.querySelector(`#${containerId}`);
    const rootPath = CONFIG.download?.rootPath || '.';

    try {
      const response = await fetch(`http://localhost:3001/browse?path=${encodeURIComponent(parentPath)}&root=${encodeURIComponent(rootPath)}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const items = Array.from(doc.querySelectorAll('.item'));

      // Filter only directories
      const directories = items.filter(item => item.classList.contains('directory'));

      if (directories.length === 0) {
        container.innerHTML = '<li class="tree-item"><span class="tree-item-name" style="color: rgba(212, 190, 152, 0.5);">(empty)</span></li>';
        return;
      }

      const htmlParts = directories.map(dir => {
        const link = dir.querySelector('a');
        const href = link.getAttribute('href');
        const name = link.textContent.trim();

        // Extract path from href
        const url = new URL(href, window.location.origin);
        const dirPath = url.searchParams.get('path');

        return `
          <li class="tree-item">
            <div class="tree-item-link" data-path="${dirPath}">
              <span class="tree-toggle">▶️</span>
              <span class="tree-item-icon">📁</span>
              <span class="tree-item-name">${name}</span>
            </div>
            <ul class="tree-children" id="tree-${dirPath.replace(/[^a-zA-Z0-9]/g, '-')}">
              <!-- Lazy loaded -->
            </ul>
          </li>
        `;
      });

      container.innerHTML = htmlParts.join('');

      // Add event listeners for new toggles
      container.querySelectorAll('.tree-toggle').forEach(toggle => {
        toggle.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleTreeNode(e.target);
        });
      });

      // Add event listeners for navigation
      container.querySelectorAll('.tree-item-link').forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const path = link.dataset.path;
          this.navigateTo(path);
        });
      });

    } catch (error) {
      console.error('Error loading tree level:', error);
      container.innerHTML = '<li class="tree-item">Error loading</li>';
    }
  }

  async toggleTreeNode(toggleElement) {
    const treeItem = toggleElement.closest('.tree-item');
    const childrenContainer = treeItem.querySelector('.tree-children');
    const isExpanded = childrenContainer.classList.contains('expanded');

    if (isExpanded) {
      // Collapse
      childrenContainer.classList.remove('expanded');
      toggleElement.classList.remove('expanded');
    } else {
      // Expand
      const path = treeItem.querySelector('.tree-item-link').dataset.path;
      const containerId = childrenContainer.id;

      // Load children if not already loaded
      if (childrenContainer.children.length === 0 || childrenContainer.querySelector('.tree-loading')) {
        childrenContainer.innerHTML = '<li class="tree-loading">Loading...</li>';
        await this.loadTreeLevel(path, containerId);
      }

      childrenContainer.classList.add('expanded');
      toggleElement.classList.add('expanded');
    }
  }

  async navigateTo(path) {
    await this.loadDirectory(path);

    // Update tree active state and expand path
    await this.updateTreeForPath(path);

    // Update breadcrumbs
    this.updateBreadcrumbs(path);
  }

  async updateTreeForPath(targetPath) {
    // Clear all active states
    this.shadow.querySelectorAll('.tree-item-link').forEach(link => {
      link.classList.remove('active');
    });

    // Split path into segments
    const pathSegments = targetPath ? targetPath.split('/').filter(p => p) : [];
    let currentPath = '';

    // Expand each level of the path
    for (let i = 0; i <= pathSegments.length; i++) {
      const segmentPath = i === 0 ? '' : pathSegments.slice(0, i).join('/');

      // Find the tree item for this path
      const treeItem = this.shadow.querySelector(`.tree-item-link[data-path="${segmentPath}"]`);
      if (treeItem) {
        // Mark as active if this is the target path
        if (segmentPath === targetPath) {
          treeItem.classList.add('active');
        }

        // Expand parent if not root level
        if (i > 0) {
          const parentItem = treeItem.closest('.tree-item');
          if (parentItem) {
            const childrenContainer = parentItem.querySelector('.tree-children');
            const toggle = parentItem.querySelector('.tree-toggle');

            if (childrenContainer && toggle && !childrenContainer.classList.contains('expanded')) {
              // Load children if not already loaded
              const containerId = childrenContainer.id;
              if (childrenContainer.children.length === 0 || childrenContainer.querySelector('.tree-loading')) {
                childrenContainer.innerHTML = '<li class="tree-loading">Loading...</li>';
                const parentPath = pathSegments.slice(0, i - 1).join('/');
                await this.loadTreeLevel(parentPath, containerId);
              }

              // Expand the container
              childrenContainer.classList.add('expanded');
              toggle.classList.add('expanded');
            }
          }
        }
      }
    }
  }

  startResize(e) {
    e.preventDefault();
    this.isResizing = true;
    this.resizeStartX = e.clientX;
    const sidebar = this.shadow.querySelector('.sidebar');
    this.resizeStartWidth = sidebar.offsetWidth;

    // Add visual feedback
    const resizeHandle = this.shadow.querySelector('.sidebar-resize-handle');
    resizeHandle.classList.add('active');

    // Add global mouse events
    document.addEventListener('mousemove', this.performResize.bind(this));
    document.addEventListener('mouseup', this.stopResize.bind(this));
  }

  performResize(e) {
    if (!this.isResizing) return;

    const deltaX = e.clientX - this.resizeStartX;
    const newWidth = Math.max(150, Math.min(400, this.resizeStartWidth + deltaX));

    const sidebar = this.shadow.querySelector('.sidebar');
    sidebar.style.width = `${newWidth}px`;
  }

  stopResize() {
    if (!this.isResizing) return;

    this.isResizing = false;

    // Remove visual feedback
    const resizeHandle = this.shadow.querySelector('.sidebar-resize-handle');
    resizeHandle.classList.remove('active');

    // Remove global mouse events
    document.removeEventListener('mousemove', this.performResize.bind(this));
    document.removeEventListener('mouseup', this.stopResize.bind(this));
  }

  connectedCallback() {
    this.render().then(() => {
      this.setEvents();
    });
  }
}
