const els = {
  courseTitle: document.getElementById('courseTitle'),
  courseSubtitle: document.getElementById('courseSubtitle'),
  heroMeta: document.getElementById('heroMeta'),
  statsGrid: document.getElementById('statsGrid'),
  groupTabs: document.getElementById('groupTabs'),
  groupSummary: document.getElementById('groupSummary'),
  searchInput: document.getElementById('searchInput'),
  sortSelect: document.getElementById('sortSelect'),
  journalTitle: document.getElementById('journalTitle'),
  tableHeadRow: document.getElementById('tableHeadRow'),
  journalBody: document.getElementById('journalBody'),
  emptyState: document.getElementById('emptyState')
};

const state = {
  course: window.COURSE_DATA || null,
  groups: window.STUDENTS_DATA?.groups || [],
  currentGroupIndex: 0,
  search: '',
  sort: 'rating'
};

init();

function init() {
  if (!state.course || !Array.isArray(state.groups)) {
    renderError();
    return;
  }

  bindEvents();
  render();
}

function renderError() {
  document.body.innerHTML = `
    <main style="min-height:100vh;display:grid;place-items:center;padding:24px;color:#fff;font-family:Inter,system-ui,sans-serif;">
      <div style="max-width:720px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16);padding:28px;border-radius:24px;backdrop-filter:blur(12px);">
        <h1 style="margin-top:0;">Не удалось загрузить данные</h1>
        <p>Проверь файлы <code>data/course.js</code> и <code>data/students.js</code>.</p>
      </div>
    </main>
  `;
}

function bindEvents() {
  els.searchInput.addEventListener('input', (event) => {
    state.search = event.target.value.trim().toLowerCase();
    renderJournal();
  });

  els.sortSelect.addEventListener('change', (event) => {
    state.sort = event.target.value;
    renderJournal();
  });
}

function render() {
  renderHeader();
  renderStats();
  renderGroupTabs();
  renderGroupSummary();
  renderJournalHead();
  renderJournal();
}

function getMaxScore() {
  return 100;
}

function getCompletedCount(student) {
  return (student.labs ?? []).filter(score => Number(score) > 0).length;
}

function getTotal(student) {
  return (student.labs ?? []).reduce((sum, score) => sum + Number(score || 0), 0);
}

function getPercent(student) {
  return Math.round((getTotal(student) / getMaxScore()) * 100);
}

function hasAllLabs(student) {
  return (student.labs ?? []).length >= state.course.labCount && student.labs.slice(0, state.course.labCount).every(score => Number(score) > 0);
}

function getStatus(student) {
  const total = getTotal(student);
  const allDone = hasAllLabs(student);

  if (total >= state.course.autopassScore && allDone) {
    return { label: 'автозачёт', tone: 'good' };
  }

  if (total >= state.course.minimumPassScore) {
    return { label: 'допуск', tone: 'mid' };
  }

  return { label: 'риск', tone: 'bad' };
}

function getScoreTone(score) {
  if (score >= state.course.pointsPerLab) return 'full';
  if (score >= Math.ceil(state.course.pointsPerLab * 0.7)) return 'mid';
  if (score > 0) return 'low';
  return 'zero';
}

function getFillColor(percent) {
  if (percent >= 80) return 'linear-gradient(90deg, #16a34a, #22c55e)';
  if (percent >= 50) return 'linear-gradient(90deg, #d97706, #f59e0b)';
  return 'linear-gradient(90deg, #dc2626, #ef4444)';
}

function renderHeader() {
  els.courseTitle.textContent = state.course.title;
  els.courseSubtitle.textContent = state.course.subtitle;
  els.heroMeta.innerHTML = [
    `${state.course.labCount} лабораторных`,
    `до ${getMaxScore()} баллов`,
    `автозачёт от ${state.course.autopassScore}`
  ].map(text => `<span class="hero-pill">${text}</span>`).join('');
}

function renderStats() {
  const allStudents = state.groups.flatMap(group => group.students || []);
  const totals = allStudents.map(getTotal);
  const averageScore = totals.length ? Math.round(totals.reduce((sum, value) => sum + value, 0) / totals.length) : 0;
  const autopassCount = allStudents.filter(student => getStatus(student).tone === 'good').length;
  const riskCount = allStudents.filter(student => getStatus(student).tone === 'bad').length;

  const stats = [
    {
      label: 'Всего студентов',
      value: allStudents.length,
      hint: `${state.groups.length} групп в журнале.`
    },
    {
      label: 'Лабораторных работ',
      value: state.course.labCount,
      hint: ``
    },
    {
      label: 'Средний балл',
      value: `${averageScore} / ${getMaxScore()}`,
      hint: 'Средний результат по всему журналу.'
    },
    {
      label: 'Статусы',
      value: `${autopassCount} / ${riskCount}`,
      hint: 'Автозачёт / риск по всему потоку.'
    }
  ];

  els.statsGrid.innerHTML = stats.map(stat => `
    <article class="stat-card glass">
      <span class="stat-card__label">${stat.label}</span>
      <div class="stat-card__value">${stat.value}</div>
      <div class="stat-card__hint">${stat.hint}</div>
    </article>
  `).join('');
}

function renderGroupTabs() {
  els.groupTabs.innerHTML = '';

  state.groups.forEach((group, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `tab-button ${index === state.currentGroupIndex ? 'is-active' : ''}`;
    button.textContent = group.name;
    button.addEventListener('click', () => {
      state.currentGroupIndex = index;
      renderGroupTabs();
      renderGroupSummary();
      renderJournal();
    });
    els.groupTabs.appendChild(button);
  });
}

function renderGroupSummary() {
  const group = state.groups[state.currentGroupIndex];
  const students = group?.students ?? [];
  const totals = students.map(getTotal);
  const average = totals.length ? Math.round(totals.reduce((sum, value) => sum + value, 0) / totals.length) : 0;
  const best = totals.length ? Math.max(...totals) : 0;
  const autopass = students.filter(student => getStatus(student).tone === 'good').length;
  const completedAll = students.filter(hasAllLabs).length;

  const cards = [
    { label: 'Группа', value: group?.name ?? '—' },
    { label: 'Студентов', value: students.length },
    { label: 'Средний балл', value: `${average} / ${getMaxScore()}` },
    { label: 'Лучший / автозачёт', value: `${best} / ${autopass}` },
    { label: 'Сдали все 8', value: completedAll }
  ];

  els.groupSummary.innerHTML = cards.map(card => `
    <article class="summary-card">
      <div class="summary-card__label">${card.label}</div>
      <div class="summary-card__value">${card.value}</div>
    </article>
  `).join('');
}

function renderJournalHead() {
  const labHeaders = Array.from({ length: state.course.labCount }, (_, index) => `<th>ЛР ${index + 1}</th>`).join('');
  els.tableHeadRow.innerHTML = `
    <th>№</th>
    <th>Студент</th>
    ${labHeaders}
    <th>Итог</th>
    <th>Статус</th>
  `;
}

function getSortedFilteredStudents() {
  const group = state.groups[state.currentGroupIndex];
  const students = [...(group?.students ?? [])];

  const filtered = students.filter(student => student.name.toLowerCase().includes(state.search));

  filtered.sort((a, b) => {
    if (state.sort === 'name') {
      return a.name.localeCompare(b.name, 'ru');
    }

    if (state.sort === 'progress') {
      return getCompletedCount(b) - getCompletedCount(a) || getTotal(b) - getTotal(a);
    }

    return getTotal(b) - getTotal(a) || a.name.localeCompare(b.name, 'ru');
  });

  return filtered;
}

function renderJournal() {
  const group = state.groups[state.currentGroupIndex];
  const students = getSortedFilteredStudents();
  els.journalTitle.textContent = `Группа ${group?.name ?? ''}`;
  els.journalBody.innerHTML = '';

  if (!students.length) {
    els.emptyState.classList.remove('hidden');
    return;
  }

  els.emptyState.classList.add('hidden');

  students.forEach((student, index) => {
    const total = getTotal(student);
    const percent = getPercent(student);
    const status = getStatus(student);
    const completed = getCompletedCount(student);

    const row = document.createElement('tr');
    const labs = Array.from({ length: state.course.labCount }, (_, labIndex) => Number(student.labs?.[labIndex] || 0));

    row.innerHTML = `
      <td>${index + 1}</td>
      <td>
        <div class="name-cell">
          <span class="name-cell__main">${student.name}</span>
          <span class="name-cell__sub">Сдано: ${completed} из ${state.course.labCount}</span>
        </div>
      </td>
      ${labs.map(score => `
        <td>
          <span class="score-pill score-pill--${getScoreTone(score)}">${score}</span>
        </td>
      `).join('')}
      <td>
        <div class="total-box">
          <span class="total-box__value">${total} / ${getMaxScore()}</span>
          <div class="total-box__bar">
            <div class="total-box__fill" style="width:${percent}%;background:${getFillColor(percent)}"></div>
          </div>
          <span class="total-box__percent">${percent}%</span>
        </div>
      </td>
      <td>
        <span class="status-badge status-badge--${status.tone}">${status.label}</span>
      </td>
    `;

    els.journalBody.appendChild(row);
  });
}
