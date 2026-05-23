/**
 * Widget settings screen (iOS-style).
 */
const MoodAppWidgets = (function () {
  const { OPTIONAL_WIDGETS } = MoodAppConfig;

  let activeEl = null;
  let availableEl = null;

  function init(activeContainer, availableContainer) {
    activeEl = activeContainer;
    availableEl = availableContainer;
  }

  function render() {
    if (!activeEl || !availableEl) return;

    const enabled = MoodAppStorage.getEnabledWidgets();
    const active = OPTIONAL_WIDGETS.filter((w) => enabled[w.id]);
    const available = OPTIONAL_WIDGETS.filter((w) => !enabled[w.id]);

    activeEl.innerHTML = active.length
      ? active.map((w) => cardHtml(w, true)).join('')
      : '<p class="empty-state muted">Нет активных виджетов</p>';

    availableEl.innerHTML = available.length
      ? available.map((w) => cardHtml(w, false)).join('')
      : '<p class="empty-state muted">Все виджеты уже добавлены</p>';

    bindToggle(activeEl, true);
    bindToggle(availableEl, false);
  }

  function cardHtml(widget, isActive) {
    return `
      <article class="widget-card fade-in" style="--widget-color: ${widget.color}">
        <div class="widget-card__accent" aria-hidden="true"></div>
        <span class="widget-card__icon">${widget.icon}</span>
        <div class="widget-card__body">
          <h3>${widget.title}</h3>
          <p class="muted small">${widget.description}</p>
        </div>
        <button type="button" class="btn btn--small ${isActive ? 'btn--ghost' : 'btn--secondary'}"
          data-widget-id="${widget.id}" data-action="${isActive ? 'remove' : 'add'}">
          ${isActive ? 'Убрать' : 'Добавить'}
        </button>
      </article>
    `;
  }

  function bindToggle(container, _) {
    container.querySelectorAll('[data-widget-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.widgetId;
        const action = btn.dataset.action;
        const widgets = MoodAppStorage.getEnabledWidgets();
        widgets[id] = action === 'add';
        MoodAppStorage.saveEnabledWidgets(widgets);
        MoodAppTelegram.hapticLight();
        render();

        const checkinForm = document.getElementById('checkin-form');
        if (checkinForm) {
          MoodAppCheckin.renderForm(checkinForm);
        }
      });
    });
  }

  return { init, render };
})();
