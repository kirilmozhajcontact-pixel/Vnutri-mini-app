/**
 * Check-in form rendering and submission.
 */
const MoodAppCheckin = (function () {
  const { REQUIRED_QUESTIONS, getAllQuestionsForCheckin } = MoodAppConfig;

  function renderQuestionField(question, currentValue) {
    const id = question.id;
    const val = currentValue !== undefined && currentValue !== null ? currentValue : '';

    if (question.type === 'scale') {
      return renderScaleField(question, val);
    }
    if (question.type === 'number') {
      return renderNumberField(question, val);
    }
    if (question.type === 'tags') {
      return renderTagsField(question, Array.isArray(val) ? val : []);
    }
    if (question.type === 'textarea') {
      return renderTextareaField(question, val);
    }
    return '';
  }

  function renderScaleField(q, current) {
    const options = q.scaleOptions
      ? q.scaleOptions
      : Array.from({ length: q.scaleMax - q.scaleMin + 1 }, (_, i) => ({
          value: q.scaleMin + i,
          label: String(q.scaleMin + i),
        }));

    const buttons = options
      .map((opt) => {
        const selected = Number(current) === opt.value;
        return `
          <button type="button" class="scale-btn ${selected ? 'scale-btn--selected' : ''}"
            data-field="${q.id}" data-value="${opt.value}" aria-pressed="${selected}">
            <span class="scale-btn__num">${opt.value}</span>
            ${opt.label && opt.label !== String(opt.value) ? `<span class="scale-btn__label">${opt.label}</span>` : ''}
          </button>
        `;
      })
      .join('');

    const hints = q.scaleLabels
      ? `<div class="scale-hints">
          <span>${q.scaleLabels[q.scaleMin] || ''}</span>
          <span>${q.scaleLabels[Math.ceil((q.scaleMin + q.scaleMax) / 2)] || ''}</span>
          <span>${q.scaleLabels[q.scaleMax] || ''}</span>
        </div>`
      : '';

    return `
      <div class="question-block" data-question="${q.id}">
        <label class="question-label">${q.question}</label>
        <input type="hidden" name="${q.id}" value="${current !== '' ? current : ''}" required>
        <div class="scale-row">${buttons}</div>
        ${hints}
      </div>
    `;
  }

  function renderNumberField(q, current) {
    return `
      <div class="question-block" data-question="${q.id}">
        <label class="question-label">${q.question}</label>
        <div class="number-input-wrap">
          <button type="button" class="number-btn" data-number-dec="${q.id}">−</button>
          <input type="number" name="${q.id}" class="number-input"
            min="${q.numberMin}" max="${q.numberMax}" step="${q.numberStep}"
            value="${current !== '' ? current : ''}" placeholder="0">
          <button type="button" class="number-btn" data-number-inc="${q.id}">+</button>
          <span class="number-suffix">ч</span>
        </div>
      </div>
    `;
  }

  function renderTagsField(q, selected) {
    const tags = q.tags
      .map((tag) => {
        const on = selected.includes(tag);
        return `
          <button type="button" class="tag-chip ${on ? 'tag-chip--selected' : ''}"
            data-field="${q.id}" data-tag="${tag}">${tag}</button>
        `;
      })
      .join('');

    return `
      <div class="question-block" data-question="${q.id}">
        <label class="question-label">${q.question}</label>
        <input type="hidden" name="${q.id}" value='${JSON.stringify(selected)}'>
        <div class="tags-row">${tags}</div>
      </div>
    `;
  }

  function renderTextareaField(q, current) {
    return `
      <div class="question-block" data-question="${q.id}">
        <label class="question-label">${q.question}</label>
        <textarea name="${q.id}" class="textarea-input" rows="3" maxlength="500"
          placeholder="По желанию…">${current || ''}</textarea>
      </div>
    `;
  }

  function bindFormInteractions(form, onChange) {
    if (!form) return;

    form.querySelectorAll('.scale-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const field = btn.dataset.field;
        const value = btn.dataset.value;
        const block = form.querySelector(`[data-question="${field}"]`);
        const hidden = block.querySelector(`input[name="${field}"]`);
        hidden.value = value;

        block.querySelectorAll('.scale-btn').forEach((b) => {
          b.classList.toggle('scale-btn--selected', b === btn);
          b.setAttribute('aria-pressed', b === btn);
        });

        MoodAppTelegram.hapticLight();
        if (onChange) onChange(field, Number(value));
      });
    });

    form.querySelectorAll('[data-number-inc]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.numberInc;
        const input = form.querySelector(`input[name="${id}"]`);
        const q = MoodAppConfig.getQuestionById(id);
        const step = q.numberStep || 1;
        const max = q.numberMax ?? 24;
        let v = parseFloat(input.value) || 0;
        v = Math.min(max, v + step);
        input.value = v;
        if (onChange) onChange(id, v);
      });
    });

    form.querySelectorAll('[data-number-dec]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.numberDec;
        const input = form.querySelector(`input[name="${id}"]`);
        const q = MoodAppConfig.getQuestionById(id);
        const step = q.numberStep || 1;
        const min = q.numberMin ?? 0;
        let v = parseFloat(input.value) || 0;
        v = Math.max(min, v - step);
        input.value = v;
        if (onChange) onChange(id, v);
      });
    });

    form.querySelectorAll('.tag-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const field = chip.dataset.field;
        const tag = chip.dataset.tag;
        const block = form.querySelector(`[data-question="${field}"]`);
        const hidden = block.querySelector(`input[name="${field}"]`);
        let arr = [];
        try {
          arr = JSON.parse(hidden.value || '[]');
        } catch {
          arr = [];
        }

        if (arr.includes(tag)) {
          arr = arr.filter((t) => t !== tag);
          chip.classList.remove('tag-chip--selected');
        } else {
          arr.push(tag);
          chip.classList.add('tag-chip--selected');
        }
        hidden.value = JSON.stringify(arr);
        if (onChange) onChange(field, arr);
      });
    });
  }

  function collectFormData(form, questions) {
    const data = {};
    questions.forEach((q) => {
      const el = form.querySelector(`[name="${q.id}"]`);
      if (!el) return;

      if (q.type === 'tags') {
        try {
          data[q.id] = JSON.parse(el.value || '[]');
        } catch {
          data[q.id] = [];
        }
      } else if (q.type === 'textarea') {
        const text = (el.value || '').trim();
        if (text) data[q.id] = text;
      } else if (q.type === 'number') {
        const num = parseFloat(el.value);
        if (!isNaN(num)) data[q.id] = num;
      } else if (q.type === 'scale') {
        if (el.value !== '') data[q.id] = Number(el.value);
      }
    });
    return data;
  }

  function buildEntry(answers) {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const date =
      `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

    const entry = {
      id: `entry_${now.getTime()}_${Math.random().toString(36).slice(2, 8)}`,
      created_at: now.toISOString(),
      date,
      time,
    };

    Object.assign(entry, answers);
    return entry;
  }

  function renderForm(container) {
    const enabled = MoodAppStorage.getEnabledWidgets();
    const questions = getAllQuestionsForCheckin(enabled);

    const requiredIds = REQUIRED_QUESTIONS.map((q) => q.id);
    const requiredHtml = REQUIRED_QUESTIONS.map((q) =>
      renderQuestionField(q)
    ).join('');

    const optional = questions.filter((q) => !requiredIds.includes(q.id));
    const optionalHtml =
      optional.length > 0
        ? `<div class="checkin-divider"><span>Дополнительно</span></div>${optional.map((q) => renderQuestionField(q)).join('')}`
        : '';

    container.innerHTML = requiredHtml + optionalHtml;
    bindFormInteractions(container);
  }

  function validateForm(form) {
    const requiredHidden = form.querySelectorAll(
      '.question-block input[type="hidden"][required]'
    );
    for (const input of requiredHidden) {
      if (input.value === '') return false;
    }
    const requiredQuestions = REQUIRED_QUESTIONS;
    for (const q of requiredQuestions) {
      const el = form.querySelector(`[name="${q.id}"]`);
      if (el && el.value === '') return false;
    }
    return true;
  }

  function submit(form, onSuccess) {
    const enabled = MoodAppStorage.getEnabledWidgets();
    const questions = getAllQuestionsForCheckin(enabled);

    if (!validateForm(form)) {
      alert('Пожалуйста, ответь на основные вопросы');
      return false;
    }

    const data = collectFormData(form, questions);
    const entry = buildEntry(data);
    MoodAppStorage.saveEntry(entry);
    MoodAppTelegram.hapticLight();

    if (onSuccess) onSuccess(entry);
    return true;
  }

  return {
    renderQuestionField,
    bindFormInteractions,
    collectFormData,
    buildEntry,
    renderForm,
    validateForm,
    submit,
  };
})();
