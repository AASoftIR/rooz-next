import { iso, offset } from './backend.js';
const paths = {
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/>',
    moon: '<path d="M20.8 13.2A9 9 0 0 1 10.8 3.2 9 9 0 1 0 20.8 13.2Z"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    notes: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6m-6 4h6m-6 4h4"/>',
    focus: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 3v2m0 14v2M3 12h2m14 0h2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    expand: '<path d="M8 3H5a2 2 0 0 0-2 2v3m13-5h3a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h3m13-5v3a2 2 0 0 1-2 2h-3"/>',
    shrink: '<path d="M3 9h5V4m13 5h-5V4M3 15h5v5m13-5h-5v5"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.7 2-.2-.1a1.7 1.7 0 0 0-1.9.1 1.7 1.7 0 0 0-.9 1.5V21h-2.7v-.2a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.8.2l-.2.1-1.8-1.9.1-.2a1.7 1.7 0 0 0 .1-1.8 1.7 1.7 0 0 0-1.5-1H6v-2.7h.2a1.7 1.7 0 0 0 1.6-.9 1.7 1.7 0 0 0-.2-1.9l-.1-.2 1.8-1.8.2.1a1.7 1.7 0 0 0 1.8.2 1.7 1.7 0 0 0 1-1.6V4h2.7v.2a1.7 1.7 0 0 0 .9 1.5 1.7 1.7 0 0 0 1.9-.1l.2-.1 1.7 1.9-.1.2a1.7 1.7 0 0 0-.2 1.8 1.7 1.7 0 0 0 1.6.9h.2V13h-.2a1.7 1.7 0 0 0-1.6 1Z" transform="translate(-1 -1)"/>',
    chevronLeft: '<path d="m15 18-6-6 6-6"/>',
    chevronRight: '<path d="m9 18 6-6-6-6"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
    repeat: '<path d="m17 2 4 4-4 4M3 11V8a2 2 0 0 1 2-2h16M7 22l-4-4 4-4m14-1v3a2 2 0 0 1-2 2H3"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    sparkles: '<path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3ZM19 17l.7 1.4L21 19l-1.3.6L19 21l-.7-1.4L17 19l1.3-.6L19 17Z"/>',
    command: '<path d="M9 7V5a2 2 0 1 0-2 2h10a2 2 0 1 0-2-2v14a2 2 0 1 0 2-2H7a2 2 0 1 0 2 2V7Z"/>',
    arrow: '<path d="M5 12h14m-7-7 7 7-7 7"/>',
    arrowUp: '<path d="M7 17 17 7M8 7h9v9"/>',
    play: '<path d="m8 5 11 7-11 7V5Z"/>',
    pause: '<path d="M8 5v14m8-14v14"/>',
    reset: '<path d="M3 11a9 9 0 1 1 3 7m-3-7V4m0 7h7"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
    download: '<path d="M12 3v12m-4-4 4 4 4-4M4 18v3h16v-3"/>',
    link: '<path d="M10 13a5 5 0 0 0 7 .4l3-3a5 5 0 0 0-7-7l-1.7 1.7m2.7 5.9a5 5 0 0 0-7-.4l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    bold: '<path d="M7 4h6a4 4 0 0 1 0 8H7V4Zm0 8h7a4 4 0 0 1 0 8H7v-8Z"/>',
    italic: '<path d="M14 4h6M4 20h6M15 4 9 20"/>',
    underline: '<path d="M6 4v7a6 6 0 0 0 12 0V4M4 21h16"/>',
    list: '<path d="M9 6h12M9 12h12M9 18h12M3 6h.01M3 12h.01M3 18h.01"/>',
    heading: '<path d="M4 5v14m10-14v14M4 12h10m4-7h3m-3 14h3"/>',
    highlight: '<path d="m12 4 7 7-7 7-7-7 7-7ZM4 21h16"/>',
    external: '<path d="M14 3h7v7m0-7-10 10M19 14v6H4V5h6"/>',
    dots: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    grip: '<circle cx="9" cy="5" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="19" r="1"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z"/>',
    zap: '<path d="M13 2 4 13h7l-1 9 10-12h-7l0-8Z"/>',
    volume: '<path d="M3 9v6h4l5 4V5L7 9H3Zm13-1a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
    flower: '<circle cx="12" cy="12" r="2"/><path d="M12 3c3 0 3 6 0 7-3-1-3-7 0-7Zm9 9c0 3-6 3-7 0 1-3 7-3 7 0Zm-9 9c-3 0-3-6 0-7 3 1 3 7 0 7Zm-9-9c0-3 6-3 7 0-1 3-7 3-7 0Z"/>',
    sidebar: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 3v18"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
    keyboard: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10"/>',
    pin: '<path d="M16 3 21 8l-3 1-3 5 1 3-2 2-3-4-6 6m5-18 10 10"/>',
};
export function icon(name, size = 19, cls = '') { return `<svg class="icon ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.sparkles}</svg>`; }
export function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
export function strip(s) { return s.replace(/<[^>]*>/g, ' ').replace(/[#*`_]/g, ' ').replace(/\s+/g, ' ').trim(); }
export function categories(snapshot) { const set = new Set(['Personal', 'Work', 'Study', 'Ideas', ...(snapshot.settings.categories || '').split(',').map(x => x.trim()), ...snapshot.tasks.map(t => t.category), ...snapshot.notes.map(n => n.category)]); return [...set].filter(Boolean); }
const words = {
    today: ['Today', 'امروز'], tomorrow: ['Tomorrow', 'فردا'], calendar: ['Calendar', 'تقویم'], notes: ['Notes', 'یادداشت‌ها'], focus: ['Focus', 'تمرکز'],
    todayHead: ['Own your day.', 'روزت را بساز.'], tomorrowHead: ['A peek ahead.', 'نگاهی به فردا.'],
    todaySub: ['One thing at a time. You’ve got this.', 'قدم‌به‌قدم، با آرامش.'], tomorrowSub: ['Make tomorrow feel lighter.', 'فردا را سبک‌تر شروع کن.'],
    yourFlow: ['Your daily flow', 'جریان امروزت'], onTrack: ['A little progress goes a long way.', 'هر قدم کوچکی ارزشمند است.'],
    accomplished: ['Completed', 'انجام شده'], left: ['To go', 'باقی‌مانده'],
    tasks: ['Your priorities', 'کارهای مهم'], all: ['All', 'همه'], capture: ['Add a task…  try “Read @18:00”', 'کاری اضافه کن… مثال: مطالعه @18:00'],
    add: ['Add task', 'افزودن کار'], noTasks: ['A fresh page. Add your first task.', 'امروز خالی است. اولین کارت را اضافه کن.'],
    upcoming: ['Coming up', 'پیش رو'], clear: ['All clear', 'همه‌چیز مرتب است'],
    noteTitle: ['Thoughts, beautifully kept.', 'فکرها، به زیباترین شکل.'], noteSub: ['A home for the ideas you don’t want to lose.', 'خانه‌ای برای ایده‌هایی که نمی‌خواهی گم شوند.'],
    newNote: ['New note', 'یادداشت جدید'], search: ['Search your notes…', 'جست‌وجو در یادداشت‌ها…'],
    month: ['A wider view.', 'نمایی از روزهای پیش رو.'], monthSub: ['Make space for what matters.', 'برای چیزهای مهم جا باز کن.'],
    selectedDay: ['On this day', 'در این روز'], noEvents: ['Nothing planned yet.', 'هنوز برنامه‌ای نیست.'],
    focusHead: ['Find your flow.', 'روی جریان تمرکز کن.'], focusSub: ['One quiet interval at a time.', 'هر بار یک بازه آرام.'],
    start: ['Start focus', 'شروع تمرکز'], pause: ['Pause', 'مکث'], resume: ['Resume', 'ادامه'], reset: ['Reset', 'شروع دوباره'],
    settings: ['Preferences', 'تنظیمات'], language: ['Language / زبان', 'زبان / Language'], voice: ['Spoken reminders', 'یادآور صوتی'], motion: ['Soft motion & effects', 'حرکت‌ها و جلوه‌ها'],
    categories: ['Categories', 'دسته‌بندی‌ها'], categoriesHint: ['Comma separated', 'با ویرگول جدا کن'],
    close: ['Close', 'بستن'], save: ['Save changes', 'ذخیره تغییرات'], delete: ['Delete', 'حذف'],
    title: ['Title', 'عنوان'], details: ['Description', 'توضیحات'], date: ['Date', 'تاریخ'], time: ['Time', 'زمان'],
    priority: ['Priority', 'اولویت'], repeat: ['Repeat', 'تکرار'], remind: ['Remind me', 'یادآوری'], none: ['None', 'بدون'],
    low: ['Low', 'کم'], medium: ['Medium', 'متوسط'], high: ['High', 'زیاد'], daily: ['Daily', 'روزانه'], weekly: ['Weekly', 'هفتگی'],
    rightHere: ['Everything in its place.', 'همه‌چیز سر جای خودش.'],
    editorPlaceholder: ['Start writing something wonderful…', 'چیزی بنویس که ارزش ماندن دارد…'],
    linkPreview: ['Link preview', 'پیش‌نمایش لینک'],
    shortcuts: ['Ctrl+K search · Ctrl+1 Today', 'Ctrl+K جست‌وجو · Ctrl+1 امروز'],
    new: ['New', 'جدید'], done: ['Done', 'انجام شد'],
    openEditor: ['Open editor', 'باز کردن ویرایشگر'],
};
export function t(k, s) { return words[k]?.[s.language === 'fa' ? 1 : 0] || k; }
export const today = () => iso(new Date());
export function dayLabel(d, language, opts = { weekday: 'long', month: 'long', day: 'numeric' }) {
    const date = new Date(d + 'T12:00:00');
    return new Intl.DateTimeFormat(language === 'fa' ? 'fa-IR-u-ca-persian' : 'en-US', opts).format(date);
}
export function greeting(s) {
    const hour = new Date().getHours();
    return s.language === 'fa' ? (hour < 12 ? 'صبح بخیر' : hour < 18 ? 'عصر بخیر' : 'شب بخیر') : (hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening');
}
function categoryIcon(category) { return category.toLowerCase() === 'work' ? 'zap' : category.toLowerCase() === 'study' ? 'notes' : category.toLowerCase() === 'ideas' ? 'sparkles' : 'flower'; }
export function taskCard(task, s, draggable = true) {
    const priority = task.priority >= 2 ? 'urgent' : task.priority === 1 ? 'medium' : '';
    return `<article class="task-row ${task.done ? 'is-done' : ''} ${priority}" data-task-id="${task.id}" ${draggable ? 'draggable="true"' : ''}>
    <button class="task-check ${task.done ? 'checked' : ''}" data-action="toggle-task" data-id="${task.id}" aria-label="${task.done ? 'Mark incomplete' : 'Complete task'}">${task.done ? icon('check', 15) : ''}</button>
    <button class="task-copy" data-action="edit-task" data-id="${task.id}" title="${esc(task.title)}">
      <span class="task-title">${esc(task.title)}</span>
      <span class="task-meta"><span class="meta-category"><span class="tiny-dot ${esc(task.category.toLowerCase())}"></span>${esc(task.category)}</span>${task.due_time ? `<span class="meta-time">${icon('clock', 12)}${esc(task.due_time)}</span>` : ''}${task.recurrence !== 'none' ? `<span title="Recurring">${icon('repeat', 12)}</span>` : ''}</span>
    </button>
    <span class="task-drag" title="Drag to reorder">${icon('grip', 16)}</span>
  </article>`;
}
function taskList(tasks, s) { return tasks.length ? tasks.map(t => taskCard(t, s)).join('') : `<div class="empty-state">${icon('sparkles', 25)}<p>${t('noTasks', s)}</p></div>`; }
function taskProgress(tasks) { const done = tasks.filter(t => t.done).length; return { done, total: tasks.length, percent: tasks.length ? Math.round(done / tasks.length * 100) : 0 }; }
export function miniCalendar(snapshot, s, month = s.calendarMonth, small = false) {
    const y = month.getFullYear(), m = month.getMonth();
    const first = new Date(y, m, 1);
    const start = (first.getDay() + 6) % 7;
    const days = new Date(y, m + 1, 0).getDate();
    const weekdays = s.language === 'fa' ? ['د', 'س', 'چ', 'پ', 'ج', 'ش', 'ی'] : ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    let cells = '';
    for (let i = 0; i < 42; i++) {
        const day = i - start + 1;
        const date = new Date(y, m, day);
        const key = iso(date);
        const currentMonth = date.getMonth() === m;
        const count = snapshot.tasks.filter(t => t.due_date === key).length;
        const label = s.language === 'fa' ? new Intl.NumberFormat('fa-IR').format(date.getDate()) : String(date.getDate());
        cells += `<button class="calendar-day ${currentMonth ? '' : 'muted'} ${key === today() ? 'is-today' : ''} ${key === s.selectedDate ? 'selected' : ''}" data-action="select-date" data-date="${key}" title="${count} tasks"><span>${label}</span>${count ? '<i class="event-dot"></i>' : ''}</button>`;
    }
    return `<section class="month-widget ${small ? 'small-calendar' : ''}">
    <div class="month-header"><div><span class="eyebrow">${small ? t('calendar', s) : t('month', s)}</span><h3>${new Intl.DateTimeFormat(s.language === 'fa' ? 'fa-IR-u-ca-gregory' : 'en-US', { month: 'long', year: 'numeric' }).format(first)}</h3></div>
      <div class="month-arrows"><button class="icon-button soft" data-action="previous-month" aria-label="Previous month">${icon('chevronLeft', 16)}</button><button class="icon-button soft" data-action="next-month" aria-label="Next month">${icon('chevronRight', 16)}</button></div></div>
    <div class="calendar-grid">${weekdays.map(d => `<span class="weekday">${d}</span>`).join('')}${cells}</div>
  </section>`;
}
function quickAdd(date, s) { return `<form id="quick-form" class="quick-add" data-date="${date}"><div class="capture-icon">${icon('plus', 18)}</div><input id="quick-title" autocomplete="off" maxlength="500" placeholder="${esc(t('capture', s))}" aria-label="New task"/><button type="submit" class="capture-enter" aria-label="Add task">${icon('arrow', 18)}</button></form>`; }
function dailyView(snapshot, s, date) {
    const tasks = snapshot.tasks.filter(x => x.due_date === date).sort((a, b) => Number(a.done) - Number(b.done) || a.position - b.position);
    const displayTasks = tasks.filter(x => s.categoryFilter === 'All' || x.category === s.categoryFilter);
    const p = taskProgress(tasks);
    const isToday = date === today();
    const dateString = dayLabel(date, s.language, { weekday: 'long', month: 'long', day: 'numeric' });
    return `<div class="view-panel enter-view">
    <div class="greeting-area">
      <div class="date-line"><span class="date-mini-dot"></span>${esc(dateString)}<span class="live-pill">${icon('sparkles', 12)} ${isToday ? 'LIVE' : 'NEXT'}</span></div>
      <h1>${t(isToday ? 'todayHead' : 'tomorrowHead', s)}</h1><p class="subtext">${t(isToday ? 'todaySub' : 'tomorrowSub', s)}</p>
    </div>
    <div class="progress-hero liquid-surface">
      <div class="hero-shimmer"></div><div class="hero-copy"><span class="hero-kicker">${icon('sparkles', 15)} ${t('yourFlow', s)}</span>
      <strong>${p.total === 0 ? 'A fresh start' : p.percent === 100 ? 'Beautifully done.' : p.done === 0 ? 'Start somewhere.' : `${p.done} of ${p.total} complete`}</strong>
      <span class="hero-foot">${t('onTrack', s)}</span></div>
      <div class="progress-ring" style="--percentage:${p.percent}"><svg viewBox="0 0 116 116"><circle class="track" cx="58" cy="58" r="47"/><circle class="bar" cx="58" cy="58" r="47"/></svg><div class="ring-number">${p.percent}<small>%</small></div></div>
    </div>
    <div class="section-title-row"><div><span class="eyebrow">${isToday ? 'THE PLAN' : 'ON THE HORIZON'}</span><h2>${t('tasks', s)} <span class="count-pill">${tasks.length}</span></h2></div><button class="icon-button add-small" data-action="add-task" aria-label="New task">${icon('plus', 19)}</button></div>
    <div class="category-chips" role="group" aria-label="Task categories">${['All', ...categories(snapshot).filter(x => tasks.some(z => z.category === x))].map(c => `<button class="chip ${s.categoryFilter === c ? 'active' : ''}" data-action="filter-category" data-category="${esc(c)}">${c === 'All' ? t('all', s) : esc(c)}</button>`).join('')}</div>
    <div class="tasks-list" id="tasks-list">${taskList(displayTasks, s)}</div>
    ${isToday ? `<button class="tomorrow-strip" data-action="view-tomorrow"><span class="tomorrow-glow">${icon('moon', 17)}</span><span><strong>${t('tomorrow', s)}</strong><small>${snapshot.tasks.filter(x => x.due_date === offset(1) && !x.done).length} ${t('upcoming', s).toLowerCase()}</small></span>${icon('arrow', 17)}</button>` : ''}
  </div>`;
}
function calendarView(snapshot, s) {
    const tasks = snapshot.tasks.filter(t => t.due_date === s.selectedDate).sort((a, b) => a.position - b.position);
    return `<div class="view-panel enter-view"><div class="greeting-area"><div class="eyebrow spaced">THE BIG PICTURE</div><h1>${t('month', s)}</h1><p class="subtext">${t('monthSub', s)}</p></div>
   ${miniCalendar(snapshot, s)}
   <div class="section-title-row day-list-title"><div><span class="eyebrow">${t('selectedDay', s)}</span><h2>${esc(dayLabel(s.selectedDate, s.language, { weekday: 'long', month: 'short', day: 'numeric' }))}</h2></div><button class="icon-button add-small" data-action="add-task" title="Add to selected date">${icon('plus', 18)}</button></div>
   <div class="tasks-list">${taskList(tasks, s)}</div></div>`;
}
function notesView(snapshot, s) {
    const notes = [...snapshot.notes].sort((a, b) => b.updated_at - a.updated_at).filter(n => `${n.title} ${strip(n.body)} ${n.category}`.toLocaleLowerCase().includes(s.noteSearch.toLocaleLowerCase()));
    const colors = ['lilac', 'peach', 'aqua', 'gold'];
    return `<div class="view-panel enter-view notes-view"><div class="greeting-area"><div class="eyebrow spaced">COLLECT YOUR THOUGHTS</div><h1>${t('noteTitle', s)}</h1><p class="subtext">${t('noteSub', s)}</p></div>
   <div class="notes-tools"><label class="search-box">${icon('search', 17)}<input id="note-search" placeholder="${esc(t('search', s))}" value="${esc(s.noteSearch)}"/></label><button class="primary-square" data-action="new-note" title="New note">${icon('plus', 19)}</button></div>
   <div class="notes-grid">${notes.map((n, i) => `<button class="note-card ${colors[i % 4]}" data-action="open-note" data-id="${n.id}"><span class="note-card-top"><span class="note-mark">${icon(categoryIcon(n.category), 16)}</span><span>${esc(n.category)}</span></span><strong>${esc(n.title || 'Untitled note')}</strong><p>${esc(strip(n.body)).slice(0, 165)}</p><span class="note-card-bottom"><span>${new Intl.DateTimeFormat(s.language === 'fa' ? 'fa-IR' : 'en', { month: 'short', day: 'numeric' }).format(n.updated_at * 1000)}</span>${icon('arrowUp', 17)}</span></button>`).join('')}
   <button class="note-card new-note-card" data-action="new-note"><span>${icon('plus', 25)}</span><strong>${t('newNote', s)}</strong><small>Capture the next big idea</small></button></div></div>`;
}
function focusView(s) {
    const whole = s.focusDuration * 60, remaining = s.focusRemaining, progress = whole ? Math.max(0, Math.min(100, (1 - remaining / whole) * 100)) : 0;
    const display = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(Math.floor(remaining % 60)).padStart(2, '0')}`;
    return `<div class="view-panel enter-view focus-view"><div class="greeting-area"><div class="eyebrow spaced">DEEP WORK MODE</div><h1>${t('focusHead', s)}</h1><p class="subtext">${t('focusSub', s)}</p></div>
 <div class="focus-stage"><div class="focus-aura"></div><div class="focus-ring" style="--progress:${progress}"><svg viewBox="0 0 280 280"><circle class="focus-track" cx="140" cy="140" r="113"/><circle class="focus-value" cx="140" cy="140" r="113"/></svg><div class="focus-face"><span class="focus-icon">${icon('flower', 22)}</span><strong id="focus-time">${display}</strong><small>LET YOUR MIND SETTLE</small></div></div></div>
 <div class="focus-pills">${[15, 25, 45, 60].map(x => `<button class="chip ${s.focusDuration === x ? 'active' : ''}" data-action="focus-duration" data-minutes="${x}">${x} min</button>`).join('')}</div>
 <div class="focus-controls"><button class="primary-wide" data-action="focus-toggle">${icon(s.focusRunning ? 'pause' : 'play', 19)} ${t(s.focusRunning ? 'pause' : s.focusRemaining === s.focusDuration * 60 ? 'start' : 'resume', s)}</button><button class="icon-button reset-focus" data-action="focus-reset" title="Reset">${icon('reset', 20)}</button></div>
 <div class="focus-hint">${icon('sparkles', 17)}<p>Protect this moment. Close extra tabs, silence the noise, and make something wonderful.</p></div>
 </div>`;
}
function rightRail(snapshot, s) {
    const coming = [...snapshot.tasks].filter(t => !t.done && t.due_date >= today()).sort((a, b) => a.due_date.localeCompare(b.due_date) || a.due_time.localeCompare(b.due_time)).slice(0, 3);
    const recent = [...snapshot.notes].sort((a, b) => b.updated_at - a.updated_at)[0];
    return `<aside class="insight-rail"><div class="rail-intro"><span class="eyebrow">YOUR SPACE</span><strong>Keep the good days close.</strong><p>A little structure, a lot more freedom.</p></div>
  ${miniCalendar(snapshot, s, s.calendarMonth, true)}
  <div class="rail-card"><div class="rail-card-head"><h3>${t('upcoming', s)}</h3>${icon('arrowUp', 18)}</div>${coming.length ? coming.map(t => `<button class="rail-task" data-action="edit-task" data-id="${t.id}"><span class="rail-time">${esc(t.due_time || 'All day')}</span><span><strong>${esc(t.title)}</strong><small>${esc(dayLabel(t.due_date, s.language, { month: 'short', day: 'numeric' }))} · ${esc(t.category)}</small></span></button>`).join('') : '<p class="rail-muted">Nothing urgent on the horizon.</p>'}</div>
  ${recent ? `<button class="rail-quote" data-action="open-note" data-id="${recent.id}"><span>${icon('notes', 16)} FROM YOUR NOTES</span><strong>${esc(recent.title || 'Untitled')}</strong><small>${esc(strip(recent.body)).slice(0, 100)}</small></button>` : ''}
  </aside>`;
}
function nav(s) { const items = [['today', 'sun', 'today'], ['tomorrow', 'moon', 'tomorrow'], ['calendar', 'calendar', 'calendar'], ['notes', 'notes', 'notes'], ['focus', 'focus', 'focus']]; return `<nav class="app-dock" aria-label="Main navigation">${items.map(([view, ic, label]) => `<button class="dock-button ${s.view === view ? 'selected' : ''}" data-action="navigate" data-view="${view}" title="${t(label, s)}">${icon(ic, 20)}<span>${t(label, s)}</span></button>`).join('')}</nav>`; }
function taskModal(snapshot, s) {
    const x = s.editingTask;
    return `<div class="modal-scrim" data-action="dismiss-modal"><form class="dialog-card task-dialog" id="task-form" aria-label="Task details"><div class="dialog-head"><div><span class="eyebrow">MAKE IT HAPPEN</span><h2>${x.id ? 'Edit task' : 'New task'}</h2></div><button type="button" class="icon-button" data-action="dismiss-modal">${icon('x', 19)}</button></div>
 <label class="field"><span>${t('title', s)}</span><input name="title" maxlength="500" required autofocus value="${esc(x.title)}" placeholder="What matters right now?"/></label>
 <label class="field"><span>${t('details', s)}</span><textarea name="details" rows="3" placeholder="Optional details…">${esc(x.details)}</textarea></label>
 <div class="field-row"><label class="field"><span>${t('date', s)}</span><input type="date" name="due_date" required value="${esc(x.due_date)}"/></label><label class="field"><span>${t('time', s)}</span><input type="time" name="due_time" value="${esc(x.due_time)}"/></label></div>
 <div class="field-row"><label class="field"><span>${t('categories', s)}</span><select name="category">${categories(snapshot).map(c => `<option ${x.category === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label><label class="field"><span>${t('priority', s)}</span><select name="priority"><option value="0" ${x.priority === 0 ? 'selected' : ''}>${t('low', s)}</option><option value="1" ${x.priority === 1 ? 'selected' : ''}>${t('medium', s)}</option><option value="2" ${x.priority === 2 ? 'selected' : ''}>${t('high', s)}</option></select></label></div>
 <div class="field-row"><label class="field"><span>${t('repeat', s)}</span><select name="recurrence">${['none', 'daily', 'weekly'].map(v => `<option value="${v}" ${x.recurrence === v ? 'selected' : ''}>${t(v, s)}</option>`).join('')}</select></label><label class="field"><span>${t('remind', s)}</span><select name="remind_before"><option value="0" ${x.remind_before === 0 ? 'selected' : ''}>At time</option>${[5, 10, 15, 30, 60].map(v => `<option value="${v}" ${x.remind_before === v ? 'selected' : ''}>${v} min before</option>`).join('')}</select></label></div>
 ${x.id && x.due_time && x.alerted_for ? `<button type="button" class="snooze-button" data-action="snooze-task" data-id="${x.id}">${icon('bell', 16)} Snooze reminder for 5 minutes</button>` : ''}
 <div class="dialog-actions">${x.id ? `<button type="button" class="subtle-danger" data-action="delete-task" data-id="${x.id}">${icon('trash', 17)} ${t('delete', s)}</button>` : '<span></span>'}<button type="submit" class="primary-button">${icon('check', 17)} ${t('save', s)}</button></div></form></div>`;
}
function settingsModal(snapshot, s) {
    return `<div class="modal-scrim" data-action="dismiss-modal"><form class="dialog-card settings-dialog" id="settings-form" aria-label="Settings"><div class="dialog-head"><div><span class="eyebrow">MAKE IT YOURS</span><h2>${t('settings', s)}</h2></div><button type="button" class="icon-button" data-action="dismiss-modal">${icon('x', 19)}</button></div>
 <div class="setting-item"><span class="setting-icon">${icon('globe', 19)}</span><div><strong>${t('language', s)}</strong><small>Choose your reading direction</small></div><select name="language"><option value="en" ${s.language === 'en' ? 'selected' : ''}>English</option><option value="fa" ${s.language === 'fa' ? 'selected' : ''}>فارسی</option></select></div>
 <div class="setting-item"><span class="setting-icon">${icon('volume', 19)}</span><div><strong>${t('voice', s)}</strong><small>Uses spd-say on Linux</small></div><label class="switch"><input type="checkbox" name="voice" ${snapshot.settings.voice === 'true' ? 'checked' : ''}/><span></span></label></div>
 <div class="setting-item"><span class="setting-icon">${icon('sparkles', 19)}</span><div><strong>${t('motion', s)}</strong><small>Respect reduced motion</small></div><label class="switch"><input type="checkbox" name="motion" ${s.motion ? 'checked' : ''}/><span></span></label></div>
 <label class="field categories-field"><span>${t('categories', s)}</span><small>${t('categoriesHint', s)}</small><input name="categories" maxlength="500" value="${esc(snapshot.settings.categories || 'Personal,Work,Study,Ideas')}"/></label>
 <div class="setting-tip">${icon('info', 18)} <span>Everything stays on this computer. Existing Rooz v0.1 notes and tasks remain in the same SQLite database when launched natively.</span></div>
 <div class="setting-tip">${icon('keyboard', 18)}<span>${t('shortcuts', s)}</span></div>
 <div class="dialog-actions"><button type="button" class="subtle-danger" data-action="quit-native">${icon('x', 16)} Quit entirely</button><button class="primary-button" type="submit">${icon('check', 17)} ${t('save', s)}</button></div></form></div>`;
}
export function render(snapshot, s) {
    const fa = s.language === 'fa';
    const todayTasks = snapshot.tasks.filter(t => t.due_date === today() && !t.done).length;
    let body = s.view === 'today' ? dailyView(snapshot, s, today()) : s.view === 'tomorrow' ? dailyView(snapshot, s, offset(1)) : s.view === 'calendar' ? calendarView(snapshot, s) : s.view === 'notes' ? notesView(snapshot, s) : focusView(s);
    return `<main class="shell ${s.expanded ? 'is-expanded' : ''}" dir="${fa ? 'rtl' : 'ltr'}" data-view="${s.view}">
   <div class="ambient a-one"></div><div class="ambient a-two"></div><div class="fine-noise"></div>
   <header class="app-header"><div class="brand-lockup" data-action="navigate" data-view="today"><span class="brand-mark">${icon('flower', 23)}</span><div class="brand-words"><strong>rooz<span class="brand-dot">.</span></strong><small>YOUR DAILY SPACE</small></div></div>
      <div class="header-actions"><span class="header-date">${esc(new Intl.DateTimeFormat(fa ? 'fa-IR-u-ca-persian' : 'en-US', { month: 'short', day: 'numeric' }).format(new Date()))}</span><button class="icon-button" data-action="open-settings" title="Settings">${icon('settings', 18)}</button><button class="icon-button" data-action="toggle-expand" title="${s.expanded ? 'Compact view' : 'Expand workspace'}">${icon(s.expanded ? 'shrink' : 'expand', 18)}</button><button class="icon-button close-app" data-action="hide" title="Hide (reminders continue)">${icon('x', 19)}</button></div>
   </header>
   <div class="workspace"><div class="scroll-area"><div class="main-view">${body}</div></div>${rightRail(snapshot, s)}</div>
   ${['today', 'tomorrow', 'calendar'].includes(s.view) ? quickAdd(s.view === 'today' ? today() : s.view === 'tomorrow' ? offset(1) : s.selectedDate, s) : ''}
   ${nav(s)}
   ${s.modal === 'task' ? taskModal(snapshot, s) : s.modal === 'settings' ? settingsModal(snapshot, s) : ''}
   ${s.toast ? `<div class="toast">${icon('checkCircle', 18)} ${esc(s.toast)}</div>` : ''}
   ${todayTasks === 0 ? '' : `<span class="sr-only">${todayTasks} tasks remaining today</span>`}
 </main>`;
}
