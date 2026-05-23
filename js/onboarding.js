/**
 * Onboarding flow (5 steps).
 */
const MoodAppOnboarding = (function () {
  const { TRACKING_GOALS, DEFAULT_ENABLED_WIDGETS, OPTIONAL_WIDGETS } =
    MoodAppConfig;

  let container = null;
  let step = 0;
  let state = {
    goals: [],
    answers: {},
    enabledWidgets: { ...DEFAULT_ENABLED_WIDGETS },
  };
  let onComplete = null;

  const STEPS = ['welcome', 'goals', 'survey', 'widgets', 'done'];

  function mount(el, completeCallback) {
    container = el;
    onComplete = completeCallback;
    step = 0;
    state = {
      goals: [],
      answers: {},
      enabledWidgets: { ...MoodAppStorage.getEnabledWidgets() },
    };
    container.hidden = false;
    render();
  }

  function unmount() {
    if (container) container.hidden = true;
  }

  function next() {
    if (step < STEPS.length - 1) {
      step += 1;
      render();
    }
  }

  function render() {
    const name = STEPS[step];
    container.innerHTML = '';
    container.className = 'onboarding';

    switch (name) {
      case 'welcome':
        renderWelcome();
        break;
      case 'goals':
        renderGoals();
        break;
      case 'survey':
        renderSurvey();
        break;
      case 'widgets':
        renderWidgets();
        break;
      case 'done':
        renderDone();
        break;
    }
  }

  function renderWelcome() {
    container.innerHTML = `
      <div class="onboarding-step onboarding-step--welcome fade-in">
        <div class="blob blob--yellow onboarding-blob" aria-hidden="true"></div>
        <div class="mascot" aria-hidden="true">🌿</div>
        <h1 class="onboarding-title">Добро пожаловать</h1>
        <p class="onboarding-text">Это пространство, где можно мягко наблюдать за собой.</p>
        <div class="onboarding-dots">
          ${dotsHtml(0)}
        </div>
        <button type="button" class="btn btn--primary btn--large" id="onb-next">Начать</button>
      </div>
    `;
    bindNext('onb-next', () => next());
  }

  function renderGoals() {
    const chips = TRACKING_GOALS.map(
      (g) => `
      <button type="button" class="chip ${state.goals.includes(g.id) ? 'chip--selected' : ''}" data-goal="${g.id}">
        ${g.label}
      </button>
    `
    ).join('');

    container.innerHTML = `
      <div class="onboarding-step fade-in">
        <h2 class="onboarding-title">Что ты хочешь отслеживать?</h2>
        <p class="onboarding-text muted">Можно выбрать несколько</p>
        <div class="chips-grid">${chips}</div>
        <div class="onboarding-dots">${dotsHtml(1)}</div>
        <button type="button" class="btn btn--primary btn--large" id="onb-next">Дальше</button>
      </div>
    `;

    container.querySelectorAll('[data-goal]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.goal;
        if (state.goals.includes(id)) {
          state.goals = state.goals.filter((g) => g !== id);
        } else {
          state.goals.push(id);
        }
        renderGoals();
      });
    });

    bindNext('onb-next', () => next());
  }

  function renderSurvey() {
    const questions = MoodAppConfig.REQUIRED_QUESTIONS;
    const fields = questions
      .map((q) => MoodAppCheckin.renderQuestionField(q, state.answers[q.id]))
      .join('');

    container.innerHTML = `
      <div class="onboarding-step onboarding-step--scroll fade-in">
        <h2 class="onboarding-title">Базовый опрос</h2>
        <p class="onboarding-text muted">Отметь, как ты себя чувствуешь сейчас</p>
        <form id="onb-survey-form" class="checkin-form">${fields}</form>
        <div class="onboarding-dots">${dotsHtml(2)}</div>
        <button type="submit" form="onb-survey-form" class="btn btn--primary btn--large">Дальше</button>
      </div>
    `;

    MoodAppCheckin.bindFormInteractions(
      container.querySelector('#onb-survey-form'),
      (id, value) => {
        state.answers[id] = value;
      }
    );

    container.querySelector('#onb-survey-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const form = e.target;
      const data = MoodAppCheckin.collectFormData(form, questions);
      Object.assign(state.answers, data);
      next();
    });
  }

  function renderWidgets() {
    const cards = OPTIONAL_WIDGETS.map((w) => {
      const on = state.enabledWidgets[w.id];
      return `
        <div class="widget-card widget-card--compact ${on ? 'widget-card--on' : ''}">
          <span class="widget-card__icon">${w.icon}</span>
          <div class="widget-card__body">
            <strong>${w.title}</strong>
            <span class="muted small">${w.description}</span>
          </div>
          <button type="button" class="btn btn--small ${on ? 'btn--ghost' : 'btn--secondary'}" data-toggle="${w.id}">
            ${on ? 'Убрать' : 'Добавить'}
          </button>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="onboarding-step onboarding-step--scroll fade-in">
        <h2 class="onboarding-title">Персонализация</h2>
        <p class="onboarding-text muted">Выбери дополнительные опросники</p>
        <div class="widgets-list">${cards}</div>
        <div class="onboarding-dots">${dotsHtml(3)}</div>
        <button type="button" class="btn btn--primary btn--large" id="onb-next">Дальше</button>
      </div>
    `;

    container.querySelectorAll('[data-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.toggle;
        state.enabledWidgets[id] = !state.enabledWidgets[id];
        renderWidgets();
      });
    });

    bindNext('onb-next', () => next());
  }

  function renderDone() {
    container.innerHTML = `
      <div class="onboarding-step onboarding-step--welcome fade-in">
        <div class="mascot mascot--big" aria-hidden="true">✨</div>
        <h1 class="onboarding-title">Готово</h1>
        <p class="onboarding-text">Готово. Твой трекер настроен.</p>
        <div class="onboarding-dots">${dotsHtml(4)}</div>
        <button type="button" class="btn btn--primary btn--large" id="onb-finish">Перейти к приложению</button>
      </div>
    `;

    bindNext('onb-finish', () => finish());
  }

  function finish() {
    const tgUser = MoodAppTelegram.getUser();
    const profile = {
      telegram_user_id: tgUser ? tgUser.id : null,
      onboarding_completed: true,
      created_at: new Date().toISOString(),
      tracking_goals: state.goals,
      checkin_frequency: 'manual',
    };

    MoodAppStorage.saveUserProfile(profile);
    MoodAppStorage.saveEnabledWidgets(state.enabledWidgets);

    if (Object.keys(state.answers).length > 0) {
      const entry = MoodAppCheckin.buildEntry(state.answers);
      MoodAppStorage.saveEntry(entry);
    }

    unmount();
    if (onComplete) onComplete();
  }

  function dotsHtml(active) {
    return STEPS.map((_, i) =>
      `<span class="dot ${i === active ? 'dot--active' : ''}"></span>`
    ).join('');
  }

  function bindNext(id, handler) {
    const btn = container.querySelector(`#${id}`);
    if (btn) btn.addEventListener('click', handler);
  }

  return { mount, unmount };
})();
