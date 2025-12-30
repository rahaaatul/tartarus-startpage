class NotesWidget extends Component {
  refs = {
    icon: '.notes-icon'
  };

  constructor() {
    super();
  }

  imports() {
    return [
      this.resources.icons.iconify
    ];
  }

  style() {
    return `
      .notes-icon {
        color: #a9b665;
        font-size: 14pt;
        cursor: pointer;
        transition: color 0.2s;
      }

      .notes-icon:hover {
        color: #b8bb26;
      }
    `;
  }

  template() {
    return `
      <iconify-icon class="notes-icon" icon="tabler:notebook" title="Notes"></iconify-icon>
    `;
  }

  setEvents() {
    this.refs.icon.onclick = () => {
      // Find the notes component and show popup
      const notesComponent = document.querySelector('notes-popup');
      if (notesComponent) {
        notesComponent.showNotesPopup();
      }
    };
  }

  connectedCallback() {
    this.render().then(() => {
      this.setEvents();
    });
  }
}
