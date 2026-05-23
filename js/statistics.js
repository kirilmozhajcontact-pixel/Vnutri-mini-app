/**
 * Statistics: daily time charts, weekly averages, history.
 */
const MoodAppStatistics = (function () {
  const DAY_METRICS = [
    { id: 'mood', label: 'Настроение', color: '#7FA7F2', max: 5 },
    { id: 'stress', label: 'Стресс', color: '#CDBBFF', max: 5 },
    { id: 'anxiety', label: 'Тревога', color: '#CDBBFF', max: 5 },
    { id: 'energy', label: 'Энергия', color: '#FFE26A', max: 5 },
  ];

  const WEEK_METRICS = DAY_METRICS;

  function getTodayDateStr() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }

  function getEntriesForDate(dateStr) {
    return MoodAppStorage.getEntries()
      .filter((e) => e.date === dateStr)
      .sort((a, b) => a.time.localeCompare(b.time));
  }

  function getLast7Days() {
    const days = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const pad = (n) => String(n).padStart(2, '0');
      days.push({
        date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
        label: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'][d.getDay()],
        short: `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`,
      });
    }
    return days;
  }

  function average(entries, field) {
    const vals = entries
      .map((e) => e[field])
      .filter((v) => typeof v === 'number' && !isNaN(v));
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }

  function renderTimeChart(entries, metric) {
    const data = entries
      .filter((e) => typeof e[metric.id] === 'number')
      .map((e) => ({ time: e.time, value: e[metric.id] }));

    if (!data.length) {
      return `<p class="chart-empty muted small">Нет данных за сегодня</p>`;
    }

    const maxVal = metric.max;
    const bars = data
      .map((d) => {
        const pct = Math.round((d.value / maxVal) * 100);
        return `
          <div class="chart-bar-wrap" title="${d.time} — ${d.value}">
            <div class="chart-bar" style="height: ${pct}%; background: ${metric.color}" data-value="${d.value}"></div>
            <span class="chart-bar__time">${d.time}</span>
            <span class="chart-bar__val">${d.value}</span>
          </div>
        `;
      })
      .join('');

    return `
      <div class="chart chart--time">
        <div class="chart-bars">${bars}</div>
      </div>
    `;
  }

  function renderWeekChart(days, metric) {
    const allEntries = MoodAppStorage.getEntries();
    const bars = days
      .map((day) => {
        const dayEntries = allEntries.filter((e) => e.date === day.date);
        const avg = average(dayEntries, metric.id);
        const pct = avg !== null ? Math.round((avg / metric.max) * 100) : 4;
        const display = avg !== null ? avg.toFixed(1) : '—';
        return `
          <div class="chart-bar-wrap chart-bar-wrap--week" title="${day.date}">
            <div class="chart-bar ${avg === null ? 'chart-bar--empty' : ''}"
              style="height: ${pct}%; background: ${metric.color}"></div>
            <span class="chart-bar__time">${day.label}</span>
            <span class="chart-bar__val">${display}</span>
          </div>
        `;
      })
      .join('');

    return `<div class="chart chart--week"><div class="chart-bars">${bars}</div></div>`;
  }

  function renderDayPanel(container) {
    const today = getTodayDateStr();
    const entries = getEntriesForDate(today);

    const charts = DAY_METRICS.map(
      (m) => `
      <div class="card chart-card fade-in">
        <div class="chart-card__header">
          <span class="chart-dot" style="background:${m.color}"></span>
          <h3>${m.label}</h3>
          ${entries.length ? `<span class="muted small">ср. ${formatAvg(average(entries, m.id))}</span>` : ''}
        </div>
        ${renderTimeChart(entries, m)}
      </div>
    `
    ).join('');

    container.innerHTML = `
      <p class="stats-date muted">Сегодня, ${formatDisplayDate(today)}</p>
      <p class="muted small stats-count">${entries.length} ${pluralEntries(entries.length)} за день</p>
      ${charts || '<p class="empty-state">Сделай первую запись в опросе</p>'}
    `;

    requestAnimationFrame(() => animateBars(container));
  }

  function renderWeekPanel(container) {
    const days = getLast7Days();

    const charts = WEEK_METRICS.map(
      (m) => `
      <div class="card chart-card fade-in">
        <div class="chart-card__header">
          <span class="chart-dot" style="background:${m.color}"></span>
          <h3>${m.label}</h3>
          <span class="muted small">среднее за 7 дней</span>
        </div>
        ${renderWeekChart(days, m)}
      </div>
    `
    ).join('');

    container.innerHTML = charts;
    requestAnimationFrame(() => animateBars(container));
  }

  function renderHistory(listEl, emptyEl, onDelete) {
    const entries = MoodAppStorage.getEntries().slice(0, 20);

    if (!entries.length) {
      listEl.innerHTML = '';
      emptyEl.hidden = false;
      return;
    }

    emptyEl.hidden = true;
    listEl.innerHTML = entries
      .map(
        (e) => `
      <li class="history-item fade-in">
        <div class="history-item__main">
          <span class="history-item__datetime">${formatHistoryDate(e)}</span>
          <div class="history-item__metrics">
            <span title="Настроение">😊 ${e.mood ?? '—'}</span>
            <span title="Стресс">😮‍💨 ${e.stress ?? '—'}</span>
            <span title="Тревога">🌫 ${e.anxiety ?? '—'}</span>
            <span title="Энергия">⚡ ${e.energy ?? '—'}</span>
          </div>
          ${e.note ? `<p class="history-item__note">"${escapeHtml(e.note)}"</p>` : ''}
        </div>
        <button type="button" class="btn-icon btn-icon--danger" data-delete="${e.id}" aria-label="Удалить">×</button>
      </li>
    `
      )
      .join('');

    listEl.querySelectorAll('[data-delete]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (confirm('Удалить эту запись?')) {
          MoodAppStorage.deleteEntry(btn.dataset.delete);
          if (onDelete) onDelete();
        }
      });
    });
  }

  function animateBars(container) {
    container.querySelectorAll('.chart-bar').forEach((bar) => {
      const h = bar.style.height;
      bar.style.height = '0%';
      requestAnimationFrame(() => {
        bar.style.height = h;
      });
    });
  }

  function formatAvg(val) {
    if (val === null) return '—';
    return val.toFixed(1);
  }

  function formatDisplayDate(dateStr) {
    const [y, m, d] = dateStr.split('-');
    const months = [
      'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
      'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
    ];
    return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]}`;
  }

  function formatHistoryDate(entry) {
    const isToday = entry.date === getTodayDateStr();
    const dayLabel = isToday ? 'сегодня' : entry.date.split('-').reverse().join('.');
    return `${dayLabel}, ${entry.time}`;
  }

  function pluralEntries(n) {
    if (n % 10 === 1 && n % 100 !== 11) return 'запись';
    if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20))
      return 'записи';
    return 'записей';
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function updateEntriesCount(el) {
    el.textContent = `Записей: ${MoodAppStorage.getEntriesCount()}`;
  }

  return {
    renderDayPanel,
    renderWeekPanel,
    renderHistory,
    updateEntriesCount,
    getTodayDateStr,
    average,
    getEntriesForDate,
  };
})();
