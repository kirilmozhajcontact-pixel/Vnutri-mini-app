/**
 * Main application: navigation, home screen, init.
 */
const MoodApp = (function () {
  let currentScreen = 'home';

  function init() {
    MoodAppTelegram.init();
    bindNavigation();
    bindHomeActions();
    bindCheckin();
    bindStatisticsService();
    bindWidgetsBack();

    MoodAppWidgets.init(
      document.getElementById('widgets-active'),
      document.getElementById('widgets-available')
    );

    if (!MoodAppStorage.isOnboardingCompleted()) {
      startOnboarding();
    } else {
      showApp();
    }
  }

  function startOnboarding() {
    document.getElementById('bottom-nav').hidden = true;
    document.getElementById('main-content').hidden = true;

    MoodAppOnboarding.mount(
      document.getElementById('onboarding'),
      () => {
        showApp();
      }
    );
  }

  function showApp() {
    document.getElementById('onboarding').hidden = true;
    document.getElementById('main-content').hidden = false;
    document.getElementById('bottom-nav').hidden = false;

    syncTelegramUser();
    renderHome();
    renderCheckinForm();
    refreshStatistics();
    MoodAppWidgets.render();

    navigateTo('home');
  }

  function syncTelegramUser() {
    const profile = MoodAppStorage.getUserProfile();
    const tgId = MoodAppTelegram.getUserId();
    if (profile && tgId && !profile.telegram_user_id) {
      profile.telegram_user_id = tgId;
      MoodAppStorage.saveUserProfile(profile);
    }
  }

  function bindNavigation() {
    document.querySelectorAll('.nav-item[data-nav]').forEach((btn) => {
      btn.addEventListener('click', () => {
        navigateTo(btn.dataset.nav);
        MoodAppTelegram.hapticLight();
      });
    });
  }

  function navigateTo(screen) {
    currentScreen = screen;

    document.querySelectorAll('.screen').forEach((el) => {
      el.classList.toggle('screen--active', el.dataset.screen === screen);
    });

    document.querySelectorAll('.nav-item[data-nav]').forEach((btn) => {
      const isHome = btn.dataset.nav === 'home';
      btn.classList.toggle('nav-item--active', btn.dataset.nav === screen);
      if (isHome) {
        btn.classList.toggle('nav-item--center', true);
      }
    });

    if (screen === 'home') renderHome();
    if (screen === 'checkin') renderCheckinForm();
    if (screen === 'statistics') refreshStatistics();
    if (screen === 'widgets') MoodAppWidgets.render();
  }

  function bindHomeActions() {
    document.getElementById('btn-add-checkin').addEventListener('click', () => {
      navigateTo('checkin');
    });

    document.getElementById('btn-widget-settings').addEventListener('click', () => {
      navigateTo('widgets');
    });
  }

  function bindWidgetsBack() {
    document.getElementById('btn-widgets-back').addEventListener('click', () => {
      navigateTo('home');
    });
  }

  function bindCheckin() {
    const form = document.getElementById('checkin-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const ok = MoodAppCheckin.submit(form, () => {
        showToast();
        form.reset();
        renderCheckinForm();
        renderHome();
        refreshStatistics();
        setTimeout(() => navigateTo('home'), 1200);
      });
      if (!ok) return;
    });
  }

  function showToast() {
    const toast = document.getElementById('checkin-toast');
    toast.hidden = false;
    toast.classList.add('toast--visible');
    setTimeout(() => {
      toast.classList.remove('toast--visible');
      setTimeout(() => {
        toast.hidden = true;
      }, 300);
    }, 2000);
  }

  function bindStatisticsService() {
    document.getElementById('btn-clear-data').addEventListener('click', () => {
      if (
        confirm(
          'Удалить все данные? Это действие нельзя отменить.'
        )
      ) {
        MoodAppStorage.clearAllData();
        location.reload();
      }
    });

    document.getElementById('btn-reset-onboarding').addEventListener('click', () => {
      if (confirm('Сбросить onboarding? Приложение перезагрузится.')) {
        MoodAppStorage.resetOnboarding();
        location.reload();
      }
    });

    document.querySelectorAll('.stats-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.stats-tab').forEach((t) =>
          t.classList.toggle('stats-tab--active', t === tab)
        );
        const isDay = tab.dataset.statsTab === 'day';
        document.getElementById('stats-day').hidden = !isDay;
        document.getElementById('stats-day').classList.toggle('stats-panel--active', isDay);
        document.getElementById('stats-week').hidden = isDay;
        document.getElementById('stats-week').classList.toggle('stats-panel--active', !isDay);
        MoodAppTelegram.hapticLight();
      });
    });
  }

  function renderCheckinForm() {
    const form = document.getElementById('checkin-form');
    MoodAppCheckin.renderForm(form);
  }

  function renderHome() {
    setGreeting();
    setDate();
    renderLastEntry();
    renderPillars();
    renderTodayStats();
  }

  function setGreeting() {
    const el = document.getElementById('home-greeting');
    const profile = MoodAppStorage.getUserProfile();
    const tgUser = MoodAppTelegram.getUser();
    const hour = new Date().getHours();

    let timeGreet = 'Привет';
    if (hour < 12) timeGreet = 'Доброе утро';
    else if (hour < 18) timeGreet = 'Добрый день';
    else timeGreet = 'Добрый вечер';

    if (tgUser && tgUser.first_name) {
      el.textContent = `${timeGreet}, ${tgUser.first_name}`;
    } else {
      el.textContent = timeGreet;
    }
  }

  function setDate() {
    const el = document.getElementById('home-date');
    const now = new Date();
    const options = { weekday: 'long', day: 'numeric', month: 'long' };
    el.textContent = now.toLocaleDateString('ru-RU', options);
  }

  function renderLastEntry() {
    const entries = MoodAppStorage.getEntries();
    const el = document.getElementById('last-entry-text');

    if (!entries.length) {
      el.textContent = 'Пока нет записей — начни с опроса';
      return;
    }

    const last = entries[0];
    const isToday = last.date === MoodAppStatistics.getTodayDateStr();
    const dayPart = isToday ? 'сегодня' : last.date.split('-').reverse().join('.');
    el.textContent = `${dayPart} в ${last.time}`;
  }

  function renderPillars() {
    const grid = document.getElementById('pillars-grid');
    const entries = MoodAppStatistics.getEntriesForDate(
      MoodAppStatistics.getTodayDateStr()
    );
    const { PILLARS } = MoodAppConfig;

    grid.innerHTML = PILLARS.map((pillar) => {
      const value = getPillarDisplayValue(pillar, entries);
      const miniChart = renderMiniChart(pillar, entries);

      return `
        <article class="pillar-card fade-in" style="--pillar-color: ${pillar.color}; --pillar-bg: ${pillar.bg}">
          <div class="pillar-card__blob" aria-hidden="true"></div>
          <span class="pillar-card__icon">${pillar.icon}</span>
          <h3>${pillar.title}</h3>
          <p class="pillar-card__value">${value}</p>
          <div class="pillar-card__chart">${miniChart}</div>
        </article>
      `;
    }).join('');
  }

  function getPillarDisplayValue(pillar, entries) {
    if (!entries.length) return '—';

    const nums = [];
    pillar.fields.forEach((field) => {
      entries.forEach((e) => {
        if (typeof e[field] === 'number') nums.push(e[field]);
      });
    });

    if (!nums.length) return '—';
    const avg = nums.reduce((a, b) => a + b, 0) / nums.length;

    if (pillar.id === 'sleep') {
      const hours = entries.filter((e) => e.sleep_hours).map((e) => e.sleep_hours);
      if (hours.length) {
        const hAvg = hours.reduce((a, b) => a + b, 0) / hours.length;
        return `${hAvg.toFixed(1)} ч`;
      }
    }

    if (pillar.id === 'activity') {
      const act = entries.filter((e) => typeof e.physical_activity === 'number');
      if (act.length) {
        const labels = ['нет', 'лёгкая', 'средняя', 'интенсивная'];
        const last = act[act.length - 1].physical_activity;
        return labels[last] || avg.toFixed(1);
      }
    }

    return avg.toFixed(1);
  }

  function renderMiniChart(pillar, entries) {
    const values = [];
    entries.forEach((e) => {
      pillar.fields.forEach((f) => {
        if (typeof e[f] === 'number' && f !== 'sleep_hours') {
          values.push({ time: e.time, value: e[f], max: f === 'physical_activity' ? 3 : 5 });
        }
      });
    });

    if (!values.length) {
      return '<div class="mini-chart mini-chart--empty"><span></span><span></span><span></span></div>';
    }

    const lastFew = values.slice(-5);
    return `<div class="mini-chart">${lastFew
      .map((v) => {
        const pct = Math.round((v.value / v.max) * 100);
        return `<span class="mini-bar" style="height:${Math.max(pct, 12)}%"></span>`;
      })
      .join('')}</div>`;
  }

  function renderTodayStats() {
    const grid = document.getElementById('today-stats-grid');
    const entries = MoodAppStatistics.getEntriesForDate(
      MoodAppStatistics.getTodayDateStr()
    );

    const moodAvg = MoodAppStatistics.average(entries, 'mood');
    const stressAvg = MoodAppStatistics.average(entries, 'stress');
    const count = entries.length;

    grid.innerHTML = `
      <div class="stat-chip">
        <span class="stat-chip__label">Настроение</span>
        <span class="stat-chip__value">${moodAvg !== null ? moodAvg.toFixed(1) : '—'}</span>
      </div>
      <div class="stat-chip">
        <span class="stat-chip__label">Стресс</span>
        <span class="stat-chip__value">${stressAvg !== null ? stressAvg.toFixed(1) : '—'}</span>
      </div>
      <div class="stat-chip">
        <span class="stat-chip__label">Записей</span>
        <span class="stat-chip__value">${count}</span>
      </div>
    `;
  }

  function refreshStatistics() {
    MoodAppStatistics.renderDayPanel(document.getElementById('stats-day'));
    MoodAppStatistics.renderWeekPanel(document.getElementById('stats-week'));
    MoodAppStatistics.renderHistory(
      document.getElementById('history-list'),
      document.getElementById('history-empty'),
      () => {
        refreshStatistics();
        renderHome();
      }
    );
    MoodAppStatistics.updateEntriesCount(
      document.getElementById('entries-count')
    );
  }

  document.addEventListener('DOMContentLoaded', init);

  return { navigateTo, renderHome, refreshStatistics };
})();
