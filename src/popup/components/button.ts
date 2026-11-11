export interface TabButtonConfig {
  id: string;
  label: string;
  icon: string;
  onClick: () => void;
}

export class TabButton {
  static create(config: TabButtonConfig): HTMLElement {
    const btn = document.createElement('button');
    btn.className = 'tab-btn';
    btn.id = `tab-${config.id}`;
    btn.innerHTML = `<span class="tab-icon">${config.icon}</span><span class="tab-label">${config.label}</span>`;
    btn.addEventListener('click', config.onClick);
    return btn;
  }
}
