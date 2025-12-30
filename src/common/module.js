const components = {
  'search-bar': Search,
  'config-tab': ConfigTab,
  'status-bar': Statusbar,
  'current-time': Clock,
  'weather-forecast': Weather,
  'tabs-list': Tabs,
  'notes-popup': Notes,
  'notes-trigger': NotesTrigger,
  'launcher-menu': Launcher,
};

Object.keys(components).forEach(componentName => {
  if (!CONFIG.disabled.includes(componentName))
    customElements.define(componentName, components[componentName]);
});
