import { routineNext, completedOn, scheduleLabel, occursOn, getRule, shiftDay } from './routines.js';
import { solarParts, persianName, currentMonthStart, toISO, isoToSolar } from './solar.js';
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
    routine: '<path d="M12 3a9 9 0 1 0 9 9"/><path d="M21 3v6h-6"/><path d="m21 9-4-4"/><path d="m9 12 2 2 4-4"/>',
    archive: '<rect x="3" y="5" width="18" height="4" rx="1"/><path d="M5 9v11h14V9m-10 5h6"/>',
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
    mic: '<rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5m-4 0h8"/>',
    volume: '<path d="M3 9v6h4l5 4V5L7 9H3Zm13-1a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
    flower: '<circle cx="12" cy="12" r="2"/><path d="M12 3c3 0 3 6 0 7-3-1-3-7 0-7Zm9 9c0 3-6 3-7 0 1-3 7-3 7 0Zm-9 9c-3 0-3-6 0-7 3 1 3 7 0 7Zm-9-9c0-3 6-3 7 0-1 3-7 3-7 0Z"/>',
    sidebar: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 3v18"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
    keyboard: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10"/>',
    pin: '<path d="M16 3 21 8l-3 1-3 5 1 3-2 2-3-4-6 6m5-18 10 10"/>'
};
export function icon(name, size = 19, cls = '') {
    return `<svg class="icon ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.sparkles}</svg>`;
}
export function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c)=>({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        })[c]);
}
export function strip(s) {
    return s.replace(/<[^>]*>/g, ' ').replace(/[#*`_]/g, ' ').replace(/\s+/g, ' ').trim();
}
export function categories(snapshot) {
    const set = new Set([
        'Personal',
        'Work',
        'Study',
        'Ideas',
        ...(snapshot.settings.categories || '').split(',').map((x)=>x.trim()),
        ...snapshot.tasks.map((t)=>t.category),
        ...snapshot.notes.map((n)=>n.category),
        ...snapshot.routines.map((r)=>r.category)
    ]);
    return [
        ...set
    ].filter(Boolean);
}
const words = {
    today: [
        'Today',
        'امروز'
    ],
    tomorrow: [
        'Tomorrow',
        'فردا'
    ],
    calendar: [
        'Calendar',
        'تقویم'
    ],
    notes: [
        'Notes',
        'یادداشت‌ها'
    ],
    focus: [
        'Focus',
        'تمرکز'
    ],
    routines: [
        'Routines',
        'روتین‌ها'
    ],
    todayHead: [
        'Own your day.',
        'روزت را بساز.'
    ],
    tomorrowHead: [
        'A peek ahead.',
        'نگاهی به فردا.'
    ],
    todaySub: [
        'One thing at a time. You’ve got this.',
        'قدم‌به‌قدم، با آرامش.'
    ],
    tomorrowSub: [
        'Make tomorrow feel lighter.',
        'فردا را سبک‌تر شروع کن.'
    ],
    yourFlow: [
        'Your daily flow',
        'جریان امروزت'
    ],
    onTrack: [
        'A little progress goes a long way.',
        'هر قدم کوچکی ارزشمند است.'
    ],
    accomplished: [
        'Completed',
        'انجام شده'
    ],
    left: [
        'To go',
        'باقی‌مانده'
    ],
    tasks: [
        'Your priorities',
        'کارهای مهم'
    ],
    all: [
        'All',
        'همه'
    ],
    capture: [
        'Add a task…  try “Read @18:00”',
        'کاری اضافه کن… مثال: مطالعه @18:00'
    ],
    add: [
        'Add task',
        'افزودن کار'
    ],
    noTasks: [
        'A fresh page. Add your first task.',
        'امروز خالی است. اولین کارت را اضافه کن.'
    ],
    upcoming: [
        'Coming up',
        'پیش رو'
    ],
    clear: [
        'All clear',
        'همه‌چیز مرتب است'
    ],
    noteTitle: [
        'Thoughts, beautifully kept.',
        'فکرها، به زیباترین شکل.'
    ],
    noteSub: [
        'A home for the ideas you don’t want to lose.',
        'خانه‌ای برای ایده‌هایی که نمی‌خواهی گم شوند.'
    ],
    newNote: [
        'New note',
        'یادداشت جدید'
    ],
    search: [
        'Search your notes…',
        'جست‌وجو در یادداشت‌ها…'
    ],
    month: [
        'A wider view.',
        'نمایی از روزهای پیش رو.'
    ],
    monthSub: [
        'Make space for what matters.',
        'برای چیزهای مهم جا باز کن.'
    ],
    selectedDay: [
        'On this day',
        'در این روز'
    ],
    noEvents: [
        'Nothing planned yet.',
        'هنوز برنامه‌ای نیست.'
    ],
    focusHead: [
        'Find your flow.',
        'روی جریان تمرکز کن.'
    ],
    focusSub: [
        'One quiet interval at a time.',
        'هر بار یک بازه آرام.'
    ],
    start: [
        'Start focus',
        'شروع تمرکز'
    ],
    pause: [
        'Pause',
        'مکث'
    ],
    resume: [
        'Resume',
        'ادامه'
    ],
    reset: [
        'Reset',
        'شروع دوباره'
    ],
    settings: [
        'Preferences',
        'تنظیمات'
    ],
    language: [
        'Language / زبان',
        'زبان / Language'
    ],
    voice: [
        'Spoken reminders',
        'یادآور صوتی'
    ],
    motion: [
        'Soft motion & effects',
        'حرکت‌ها و جلوه‌ها'
    ],
    categories: [
        'Categories',
        'دسته‌بندی‌ها'
    ],
    categoriesHint: [
        'Comma separated',
        'با ویرگول جدا کن'
    ],
    close: [
        'Close',
        'بستن'
    ],
    save: [
        'Save changes',
        'ذخیره تغییرات'
    ],
    delete: [
        'Delete',
        'حذف'
    ],
    title: [
        'Title',
        'عنوان'
    ],
    details: [
        'Description',
        'توضیحات'
    ],
    date: [
        'Date',
        'تاریخ'
    ],
    time: [
        'Time',
        'زمان'
    ],
    priority: [
        'Priority',
        'اولویت'
    ],
    repeat: [
        'Repeat',
        'تکرار'
    ],
    remind: [
        'Remind me',
        'یادآوری'
    ],
    none: [
        'None',
        'بدون'
    ],
    low: [
        'Low',
        'کم'
    ],
    medium: [
        'Medium',
        'متوسط'
    ],
    high: [
        'High',
        'زیاد'
    ],
    daily: [
        'Daily',
        'روزانه'
    ],
    weekly: [
        'Weekly',
        'هفتگی'
    ],
    rightHere: [
        'Everything in its place.',
        'همه‌چیز سر جای خودش.'
    ],
    editorPlaceholder: [
        'Start writing something wonderful…',
        'چیزی بنویس که ارزش ماندن دارد…'
    ],
    linkPreview: [
        'Link preview',
        'پیش‌نمایش لینک'
    ],
    shortcuts: [
        'Ctrl+K search · Ctrl+1 Today',
        'Ctrl+K جست‌وجو · Ctrl+1 امروز'
    ],
    new: [
        'New',
        'جدید'
    ],
    done: [
        'Done',
        'انجام شد'
    ],
    openEditor: [
        'Open editor',
        'باز کردن ویرایشگر'
    ],
    routineHead: [
        'Make room for rhythm.',
        'برای تکرارهای خوب جا باز کن.'
    ],
    routineSub: [
        'Rituals, recurring errands and plans beyond your daily list.',
        'عادت‌ها، کارهای دوره‌ای و برنامه‌ها؛ مستقل از فهرست روزانه.'
    ],
    newRoutine: [
        'New routine',
        'روتین جدید'
    ],
    routineToday: [
        'Due today',
        'نوبت امروز'
    ],
    routineAnytime: [
        'Anytime',
        'هر زمان'
    ],
    routineScheduled: [
        'Upcoming',
        'در راه'
    ],
    routinePaused: [
        'Paused',
        'متوقف'
    ],
    routineAll: [
        'All routines',
        'همه روتین‌ها'
    ],
    checkIn: [
        'Mark complete',
        'ثبت انجام'
    ],
    checkedIn: [
        'Completed today',
        'امروز انجام شد'
    ],
    undo: [
        'Undo',
        'بازگردانی'
    ],
    history: [
        'History',
        'سوابق'
    ],
    paused: [
        'Paused',
        'متوقف'
    ],
    resumeRoutine: [
        'Resume',
        'فعال‌سازی'
    ],
    pauseRoutine: [
        'Pause',
        'توقف موقت'
    ],
    schedule: [
        'Schedule',
        'زمان‌بندی'
    ],
    everyday: [
        'Every day',
        'هر روز'
    ],
    weekdays: [
        'Selected weekdays',
        'روزهای انتخابی'
    ],
    interval: [
        'Every N days',
        'هر چند روز'
    ],
    monthly: [
        'Monthly',
        'ماهانه'
    ],
    whenever: [
        'Whenever needed',
        'هر زمان لازم شد'
    ],
    startDate: [
        'Starts on',
        'شروع از'
    ],
    monthDay: [
        'Day of month',
        'روز ماه'
    ],
    intervalDays: [
        'Repeat every (days)',
        'تکرار هر چند روز'
    ],
    routineEmpty: [
        'Make a ritual that works for you.',
        'یک روتین متناسب با خودت بساز.'
    ],
    routineSearch: [
        'Search routines…',
        'جست‌وجوی روتین‌ها…'
    ],
    routineHelp: [
        'Choose a repeat pattern, or use Anytime for errands without deadlines.',
        'الگوی تکرار را انتخاب کن؛ برای کارهای بدون موعد، «هر زمان» را بزن.'
    ],
    checkIns: [
        'Check-ins',
        'دفعات انجام'
    ],
    nextDue: [
        'Next',
        'بعدی'
    ],
    inactive: [
        'Not scheduled',
        'بدون نوبت'
    ]
};
export function t(k, s) {
    return words[k]?.[s.language === 'fa' ? 1 : 0] || k;
}
export const today = ()=>iso(new Date());
export function dayLabel(d, language, opts = {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
}) {
    const date = new Date(d + 'T12:00:00');
    return new Intl.DateTimeFormat(language === 'fa' ? 'fa-IR-u-ca-persian' : 'en-US', opts).format(date);
}
export function greeting(s) {
    const hour = new Date().getHours();
    return s.language === 'fa' ? hour < 12 ? 'صبح بخیر' : hour < 18 ? 'عصر بخیر' : 'شب بخیر' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
}
function categoryIcon(category) {
    return category.toLowerCase() === 'work' ? 'zap' : category.toLowerCase() === 'study' ? 'notes' : category.toLowerCase() === 'ideas' ? 'sparkles' : 'flower';
}
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
function taskList(tasks, s) {
    return tasks.length ? tasks.map((t)=>taskCard(t, s)).join('') : `<div class="empty-state">${icon('sparkles', 25)}<p>${t('noTasks', s)}</p></div>`;
}
function taskProgress(tasks) {
    const done = tasks.filter((t)=>t.done).length;
    return {
        done,
        total: tasks.length,
        percent: tasks.length ? Math.round(done / tasks.length * 100) : 0
    };
}
export function miniCalendar(snapshot, s, month = s.calendarMonth, small = false) {
    const fa = s.calendarSystem === 'jalali';
    const first = currentMonthStart(month, fa ? 'fa' : 'en');
    const keyStart = toISO(first);
    const activeSolar = fa ? solarParts(keyStart) : null;
    const dayOfWeek = first.getDay();
    const start = fa ? (dayOfWeek + 1) % 7 : (dayOfWeek + 6) % 7;
    const weekdays = fa ? [
        'ش',
        'ی',
        'د',
        'س',
        'چ',
        'پ',
        'ج'
    ] : [
        'M',
        'T',
        'W',
        'T',
        'F',
        'S',
        'S'
    ];
    let cells = '';
    const day = new Date(first);
    day.setDate(day.getDate() - start);
    for(let i = 0; i < 42; i++){
        const key = toISO(day), parts = fa ? solarParts(key) : null;
        const inMonth = fa ? parts.year === activeSolar.year && parts.month === activeSolar.month : day.getMonth() === first.getMonth();
        const count = snapshot.tasks.filter((t)=>t.due_date === key).length + snapshot.routines.filter((r)=>r.enabled && occursOn(r, key)).length;
        const label = fa ? new Intl.NumberFormat('fa-IR').format(parts.day) : String(day.getDate());
        cells += `<button class="calendar-day ${inMonth ? '' : 'muted'} ${key === today() ? 'is-today' : ''} ${key === s.selectedDate ? 'selected' : ''}" data-action="select-date" data-date="${key}" title="${count} planned"><span>${label}</span>${count ? '<i class="event-dot"></i>' : ''}</button>`;
        day.setDate(day.getDate() + 1);
    }
    const name = fa ? persianName.format(new Date(keyStart + 'T12:00:00Z')) : new Intl.DateTimeFormat('en-US', {
        month: 'long',
        year: 'numeric'
    }).format(first);
    return `<section class="month-widget ${small ? 'small-calendar' : ''}">
  <div class="month-header"><div><span class="eyebrow">${small ? t('calendar', s) : t('month', s)}</span><h3>${esc(name)}</h3><small class="dual-date">${fa ? 'تقویم هجری شمسی · Gregorian storage' : 'Gregorian · تقویم میلادی'}</small></div>
    <div class="month-arrows"><button class="icon-button soft" data-action="previous-month" aria-label="Previous month">${icon('chevronLeft', 16)}</button><button class="icon-button soft" data-action="next-month" aria-label="Next month">${icon('chevronRight', 16)}</button></div></div>
  <div class="calendar-grid">${weekdays.map((d)=>`<span class="weekday">${d}</span>`).join('')}${cells}</div>
 </section>`;
}
function quickAdd(date, s) {
    return `<form id="quick-form" class="quick-add" data-date="${date}"><div class="capture-icon">${icon('plus', 18)}</div><input id="quick-title" autocomplete="off" maxlength="500" placeholder="${esc(t('capture', s))}" aria-label="New task"/><button type="submit" class="capture-enter" aria-label="Add task">${icon('arrow', 18)}</button></form>`;
}
function dailyView(snapshot, s, date) {
    const tasks = snapshot.tasks.filter((x)=>x.due_date === date).sort((a, b)=>Number(a.done) - Number(b.done) || a.position - b.position);
    const displayTasks = tasks.filter((x)=>s.categoryFilter === 'All' || x.category === s.categoryFilter);
    const p = taskProgress(tasks);
    const isToday = date === today();
    const dateString = dayLabel(date, s.language, {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
    });
    return `<div class="view-panel enter-view">
    <div class="greeting-area">
      <div class="date-line"><span class="date-mini-dot"></span>${esc(dateString)}<span class="live-pill">${icon('sparkles', 12)} ${isToday ? 'LIVE' : 'NEXT'}</span></div>
      <h1>${t(isToday ? 'todayHead' : 'tomorrowHead', s)}</h1><p class="subtext">${t(isToday ? 'todaySub' : 'tomorrowSub', s)}</p>
    </div>
    ${isToday ? dailyRoutineChecklist(snapshot, s, date) : ''}
    <div class="progress-hero liquid-surface">
      <div class="hero-shimmer"></div><div class="hero-copy"><span class="hero-kicker">${icon('sparkles', 15)} ${t('yourFlow', s)}</span>
      <strong>${p.total === 0 ? 'A fresh start' : p.percent === 100 ? 'Beautifully done.' : p.done === 0 ? 'Start somewhere.' : `${p.done} of ${p.total} complete`}</strong>
      <span class="hero-foot">${t('onTrack', s)}</span></div>
      <div class="progress-ring" style="--percentage:${p.percent}"><svg viewBox="0 0 116 116"><circle class="track" cx="58" cy="58" r="47"/><circle class="bar" cx="58" cy="58" r="47"/></svg><div class="ring-number">${p.percent}<small>%</small></div></div>
    </div>
    <div class="section-title-row"><div><span class="eyebrow">${isToday ? 'THE PLAN' : 'ON THE HORIZON'}</span><h2>${t('tasks', s)} <span class="count-pill">${tasks.length}</span></h2></div><button class="icon-button add-small" data-action="add-task" aria-label="New task">${icon('plus', 19)}</button></div>
    <div class="category-chips" role="group" aria-label="Task categories">${[
        'All',
        ...categories(snapshot).filter((x)=>tasks.some((z)=>z.category === x))
    ].map((c)=>`<button class="chip ${s.categoryFilter === c ? 'active' : ''}" data-action="filter-category" data-category="${esc(c)}">${c === 'All' ? t('all', s) : esc(c)}</button>`).join('')}</div>
    <div class="tasks-list" id="tasks-list">${taskList(displayTasks, s)}</div>
    ${isToday ? `<button class="routine-portal" data-action="navigate" data-view="routines"><span class="routine-portal-icon">${icon('routine', 18)}</span><span><strong>${t('routines', s)}</strong><small>${snapshot.routines.filter((r)=>r.enabled && r.schedule_kind !== 'anytime' && occursOn(r, date) && !completedOn(snapshot.routine_completions, r.id, date)).length} ${t('routineToday', s).toLowerCase()}</small></span>${icon('arrow', 17)}</button>` : ''}
    ${isToday ? `<button class="tomorrow-strip" data-action="view-tomorrow"><span class="tomorrow-glow">${icon('moon', 17)}</span><span><strong>${t('tomorrow', s)}</strong><small>${snapshot.tasks.filter((x)=>x.due_date === offset(1) && !x.done).length} ${t('upcoming', s).toLowerCase()}</small></span>${icon('arrow', 17)}</button>` : ''}
  </div>`;
}
function calendarView(snapshot, s) {
    const tasks = snapshot.tasks.filter((t)=>t.due_date === s.selectedDate).sort((a, b)=>a.position - b.position);
    return `<div class="view-panel enter-view"><div class="greeting-area"><div class="eyebrow spaced">THE BIG PICTURE</div><h1>${t('month', s)}</h1><p class="subtext">${t('monthSub', s)}</p></div>
   <div class="calendar-switch"><span>${s.language === 'fa' ? 'نوع تقویم' : 'Calendar type'}</span><button data-action="toggle-calendar-system" class="chip ${s.calendarSystem === 'jalali' ? 'active' : ''}">${s.calendarSystem === 'jalali' ? 'شمسی · Jalali' : 'Gregorian · میلادی'} ${icon('repeat', 14)}</button></div>
   ${miniCalendar(snapshot, s)}
   <div class="section-title-row day-list-title"><div><span class="eyebrow">${t('selectedDay', s)}</span><h2>${esc(dayLabel(s.selectedDate, s.language, {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
    }))}</h2></div><button class="icon-button add-small" data-action="add-task" title="Add to selected date">${icon('plus', 18)}</button></div>
   <div class="tasks-list">${taskList(tasks, s)}</div>
   <div class="calendar-routine-panel"><strong>${icon('routine', 17)} ${t('routines', s)}</strong>${snapshot.routines.filter((r)=>r.enabled && occursOn(r, s.selectedDate)).map((r)=>`<button type="button" data-action="edit-routine" data-id="${r.id}"><span>${esc(r.title)}</span><small>${esc(r.due_time || scheduleLabel(r, s.language))}</small></button>`).join('') || `<p>${s.language === 'fa' ? 'روتینی برای این تاریخ نیست' : 'No routines scheduled'}</p>`}</div>
   </div>`;
}
export function renderNoteCards(snapshot, s) {
    const notes = [
        ...snapshot.notes
    ].sort((a, b)=>b.updated_at - a.updated_at).filter((n)=>`${n.title} ${strip(n.body)} ${n.category}`.toLocaleLowerCase().includes(s.noteSearch.toLocaleLowerCase()));
    const colors = [
        'lilac',
        'peach',
        'aqua',
        'gold'
    ];
    return `${notes.map((n, i)=>`<button class="note-card ${colors[i % 4]}" data-action="open-note" data-id="${n.id}"><span class="note-card-top"><span class="note-mark">${icon(categoryIcon(n.category), 16)}</span><span>${esc(n.category)}</span></span><strong>${esc(n.title || 'Untitled note')}</strong><p>${esc(strip(n.body)).slice(0, 165)}</p><span class="note-card-bottom"><span>${new Intl.DateTimeFormat(s.language === 'fa' ? 'fa-IR' : 'en', {
            month: 'short',
            day: 'numeric'
        }).format(n.updated_at * 1000)}</span>${icon('arrowUp', 17)}</span></button>`).join('')}
   <button class="note-card new-note-card" data-action="new-note"><span>${icon('plus', 25)}</span><strong>${t('newNote', s)}</strong><small>Capture the next big idea</small></button>`;
}
function notesView(snapshot, s) {
    return `<div class="view-panel enter-view notes-view"><div class="greeting-area"><div class="eyebrow spaced">COLLECT YOUR THOUGHTS</div><h1>${t('noteTitle', s)}</h1><p class="subtext">${t('noteSub', s)}</p></div>
   <div class="notes-tools"><label class="search-box">${icon('search', 17)}<input id="note-search" placeholder="${esc(t('search', s))}" value="${esc(s.noteSearch)}"/></label><button class="primary-square" data-action="new-note" title="New note">${icon('plus', 19)}</button></div>
   <div class="notes-grid">${renderNoteCards(snapshot, s)}</div></div>`;
}
export function routineChecklistEditorItem(item, s, snapshot) {
    const fa = s.language === 'fa';
    const dayLabels = fa ? [
        'د',
        'س',
        'چ',
        'پ',
        'ج',
        'ش',
        'ی'
    ] : [
        'M',
        'T',
        'W',
        'T',
        'F',
        'S',
        'S'
    ];
    const depth = Math.min(3, Math.max(0, item.depth || 0));
    const choices = (snapshot?.routines || []).filter((r)=>r.id !== s.editingRoutine?.id);
    return `<div class="checklist-edit-row" data-item-id="${item.id}" data-depth="${depth}" style="--nest:${depth}"><div class="checklist-main-line">
 <span class="checklist-item-grip" draggable="true" title="Drag to reorder">${icon('grip', 15)}</span>
 <input class="checklist-item-title" name="checklist_title" maxlength="250" placeholder="${fa ? 'مورد جدید...' : 'Checklist item…'}" value="${esc(item.title)}" aria-label="${fa ? 'عنوان مورد' : 'Item title'}"/>
 <label class="checklist-required" title="${fa ? 'لازم برای تکمیل خودکار' : 'Required to finish routine'}"><input type="checkbox" name="checklist_required" ${item.required ? 'checked' : ''}/><span>${fa ? 'ضروری' : 'Required'}</span></label>
 <button type="button" class="checklist-remove" data-action="remove-routine-item" title="${fa ? 'حذف مورد' : 'Remove item'}">${icon('x', 15)}</button></div>
 <div class="checklist-nesting"><button type="button" data-action="outdent-routine-item" title="Outdent" aria-label="Outdent">←</button><span>${fa ? 'سطح' : 'Level'} ${depth + 1}</span><button type="button" data-action="indent-routine-item" title="Indent" aria-label="Indent">→</button><button type="button" data-action="add-routine-subitem">${icon('plus', 13)} ${fa ? 'زیرمورد' : 'Sub-item'}</button></div>
 ${choices.length ? `<label class="linked-routine-select">${fa ? 'روتین قابل‌استفاده‌مجدد' : 'Include saved routine'} <select name="linked_routine_id"><option value="">${fa ? 'فقط یک مورد معمولی' : 'Regular checklist item'}</option>${choices.map((r)=>`<option value="${r.id}" ${item.linked_routine_id === r.id ? 'selected' : ''}>${esc(r.title)}</option>`).join('')}</select></label>` : ''}
 <input class="checklist-item-detail" name="checklist_details" maxlength="2000" placeholder="${fa ? 'جزئیات، لینک یا راهنما (اختیاری)' : 'Optional instructions, notes or link'}" value="${esc(item.details || '')}"/>
 <details class="checklist-item-days"><summary>${fa ? 'روزهای این مورد' : 'Days for this item'} · ${item.weekdays_mask === 127 ? fa ? 'همه' : 'All' : dayLabels.filter((_, i)=>item.weekdays_mask & 1 << i).join(' · ')}</summary>
 <div class="weekday-picks">${dayLabels.map((label, i)=>`<label class="weekday-pick"><input type="checkbox" name="item_weekday_${i}" ${item.weekdays_mask & 1 << i ? 'checked' : ''}/><span>${label}</span></label>`).join('')}</div></details></div>`;
}
function itemChecklist(r, s, snapshot, date, due, visited = new Set(), level = 0) {
    if (visited.has(r.id) || level > 3) return '';
    const ancestors = new Set(visited);
    ancestors.add(r.id);
    const weekday = (new Date(date + 'T12:00:00Z').getUTCDay() + 6) % 7;
    const list = snapshot.routine_items.filter((x)=>x.routine_id === r.id && !!(x.weekdays_mask & 1 << weekday)).sort((a, b)=>a.position - b.position);
    if (!list.length) return '';
    const done = new Set(snapshot.routine_item_completions.filter((x)=>x.occurrence_date === date).map((x)=>x.item_id));
    const finished = list.filter((x)=>done.has(x.id)).length;
    return `<div class="routine-checklist"><div class="routine-checklist-heading"><span>${s.language === 'fa' ? 'چک‌لیست' : 'Checklist'} · ${finished}/${list.length}</span><div class="mini-progress"><i style="width:${Math.round(finished / list.length * 100)}%"></i></div></div>
 ${list.map((x)=>{
        const child = x.linked_routine_id ? snapshot.routines.find((y)=>y.id === x.linked_routine_id) : null;
        const childDue = !!child && child.enabled && child.start_date <= date && (child.schedule_kind === 'anytime' || occursOn(child, date));
        return `<div class="routine-checklist-unit" style="--nest:${Math.min(3, Math.max(0, x.depth || 0))}"><button type="button" class="routine-checklist-row ${done.has(x.id) ? 'is-done' : ''}" data-action="toggle-routine-item" data-id="${x.id}" data-date="${date}" ${!due ? 'disabled' : ''} aria-pressed="${done.has(x.id)}" aria-label="${esc(x.title)}"><span class="routine-item-box">${done.has(x.id) ? icon('check', 14) : ''}</span><span class="routine-item-content"><strong>${esc(x.title)}</strong>${x.details ? `<small>${esc(x.details)}</small>` : ''}${child ? `<small>↳ ${esc(child.title)} · ${s.language === 'fa' ? 'روتین پیوندی' : 'linked routine'}</small>` : ''}</span>${!x.required ? `<small>${s.language === 'fa' ? 'اختیاری' : 'Optional'}</small>` : ''}</button>${child && !ancestors.has(child.id) ? `<div class="embedded-routine"><div class="embedded-routine-head"><span>${icon('routine', 14)} ${esc(child.title)}</span><button type="button" data-action="edit-routine" data-id="${child.id}">${s.language === 'fa' ? 'ویرایش' : 'Edit'}</button></div>${itemChecklist(child, s, snapshot, date, childDue, ancestors, level + 1)}</div>` : ''}</div>`;
    }).join('')}</div>`;
}
function dailyRoutineChecklist(snapshot, s, date) {
    const due = snapshot.routines.filter((r)=>r.enabled && r.schedule_kind !== 'anytime' && r.start_date <= date && occursOn(r, date) && snapshot.routine_items.some((i)=>i.routine_id === r.id));
    if (!due.length) return '';
    const fa = s.language === 'fa';
    const done = new Set(snapshot.routine_completions.filter((c)=>c.occurrence_date === date).map((c)=>c.routine_id));
    return `<section class="daily-checklists" aria-label="${fa ? 'چک‌لیست‌های امروز' : 'Today routine checklists'}"><div class="daily-checklist-head"><div><strong>${icon('routine', 19)} ${fa ? 'چک‌لیست‌های امروز' : 'Today’s checklists'}</strong><small>${due.filter((r)=>done.has(r.id)).length}/${due.length} ${fa ? 'روتین انجام شده' : 'routines complete'}</small></div><button type="button" data-action="navigate" data-view="routines">${fa ? 'همه روتین‌ها' : 'All routines'} →</button></div>${due.map((r, i)=>`<details class="daily-checklist-group" ${i === 0 ? 'open' : ''}><summary><span class="daily-group-check">${done.has(r.id) ? icon('check', 14) : icon('routine', 14)}</span><strong>${esc(r.title)}</strong><small>${snapshot.routine_items.filter((x)=>x.routine_id === r.id).length} ${fa ? 'مورد' : 'items'}</small></summary>${itemChecklist(r, s, snapshot, date, true)}</details>`).join('')}</section>`;
}
function routineCard(r, s, snapshot, date) {
    const completions = snapshot.routine_completions.filter((x)=>x.routine_id === r.id);
    const todayDone = completedOn(completions, r.id, date);
    const due = r.enabled && r.start_date <= date && (r.schedule_kind === 'anytime' || occursOn(r, date));
    const next = routineNext(r, snapshot.routine_completions, date);
    const nextLabel = !r.enabled ? t('routinePaused', s) : r.schedule_kind === 'anytime' ? t('routineAnytime', s) : next ? dayLabel(next, s.language, {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    }) : '—';
    const isFa = s.language === 'fa';
    const category = esc(r.category);
    return `<article class="routine-card liquid-surface ${r.enabled ? '' : 'routine-disabled'} ${todayDone ? 'routine-checked' : ''}" data-routine-id="${r.id}">
   <div class="routine-card-top"><span class="routine-kind"><span class="routine-kind-dot"></span>${category}</span><button class="routine-dots" data-action="edit-routine" data-id="${r.id}" title="${esc(t('openEditor', s))}">${icon('dots', 19)}</button></div>
   <div class="routine-card-main"><div class="routine-emblem">${icon(r.schedule_kind === 'anytime' ? 'sparkles' : r.schedule_kind === 'monthly' ? 'calendar' : r.schedule_kind === 'interval' ? 'clock' : 'routine', 23)}</div><div class="routine-card-copy"><h3>${esc(r.title)}</h3><p>${esc(r.details || scheduleLabel(r, s.language))}</p></div></div>
   <div class="routine-schedule">${icon('repeat', 14)} <span>${esc(scheduleLabel(r, s.language))}</span>${r.due_time ? `<span class="routine-time">${icon('clock', 12)} ${esc(r.due_time)}</span>` : ''}</div>
   ${itemChecklist(r, s, snapshot, date, due)}
   <div class="routine-stats"><span><small>${t('nextDue', s)}</small><strong>${esc(nextLabel)}</strong></span><span><small>${t('checkIns', s)}</small><strong>${new Intl.NumberFormat(isFa ? 'fa-IR' : 'en').format(r.completion_count)}</strong></span></div>
   <div class="routine-actions">
     ${r.enabled && due ? `<button class="routine-check ${todayDone ? 'checked' : ''}" data-action="${todayDone ? 'undo-routine' : 'complete-routine'}" data-id="${r.id}" data-date="${date}">${icon(todayDone ? 'checkCircle' : 'plus', 16)} ${t(todayDone ? 'checkedIn' : 'checkIn', s)}</button>` : `<button class="routine-check secondary" data-action="${r.enabled ? 'open-routine-history' : 'resume-routine'}" data-id="${r.id}">${icon(r.enabled ? 'clock' : 'play', 16)} ${r.enabled ? t('routineScheduled', s) : t('resumeRoutine', s)}</button>`}
     <button class="routine-history-btn" data-action="open-routine-history" data-id="${r.id}" title="${esc(t('history', s))}">${icon('clock', 16)}</button>
   </div>
 </article>`;
}
export function renderRoutineResults(snapshot, s, date = today()) {
    const f = s.routineFilter;
    const checklistSearch = new Map();
    for (const item of snapshot.routine_items){
        let names = checklistSearch.get(item.routine_id);
        if (!names) {
            names = [];
            checklistSearch.set(item.routine_id, names);
        }
        names.push(item.title, item.details || '');
    }
    const query = s.routineSearch.toLocaleLowerCase();
    const routines = snapshot.routines.filter((r)=>{
        if (f === 'today' && (!r.enabled || r.schedule_kind === 'anytime' || !occursOn(r, date))) return false;
        if (f === 'anytime' && (!r.enabled || r.schedule_kind !== 'anytime')) return false;
        if (f === 'paused' && r.enabled) return false;
        const itemNames = checklistSearch.get(r.id)?.join(' ') || '';
        return `${r.title} ${r.details} ${r.category} ${itemNames}`.toLocaleLowerCase().includes(query);
    }).sort((a, b)=>Number(b.enabled) - Number(a.enabled) || Number(occursOn(b, date)) - Number(occursOn(a, date)) || b.updated_at - a.updated_at || b.id - a.id);
    return routines.length ? routines.map((r)=>routineCard(r, s, snapshot, date)).join('') : `<div class="routine-empty">${icon('sparkles', 25)}<strong>${t('routineEmpty', s)}</strong><button data-action="add-routine" class="primary-button">${icon('plus', 16)} ${t('newRoutine', s)}</button></div>`;
}
function routinesView(snapshot, s) {
    const date = today();
    const active = snapshot.routines.filter((r)=>r.enabled);
    const due = active.filter((r)=>r.schedule_kind !== 'anytime' && occursOn(r, date));
    const done = due.filter((r)=>completedOn(snapshot.routine_completions, r.id, date));
    const anytime = active.filter((r)=>r.schedule_kind === 'anytime').length;
    const f = s.routineFilter;
    return `<div class="view-panel enter-view routines-view">
  <div class="greeting-area routine-heading"><div class="eyebrow spaced">${icon('sparkles', 13)} THE RHYTHM STUDIO</div><h1>${t('routineHead', s)}</h1><p class="subtext">${t('routineSub', s)}</p></div>
  <div class="routine-hero liquid-surface"><div class="routine-hero-orbit orbit-one"></div><div class="routine-hero-orbit orbit-two"></div><div class="routine-hero-content"><span class="hero-kicker">${icon('routine', 16)} ${t('routines', s).toUpperCase()}</span><strong>${done.length}<span>/ ${due.length}</span></strong><small>${t('routineToday', s)}</small></div><div class="routine-hero-side"><strong>${anytime}</strong><small>${t('routineAnytime', s)}</small><div class="routine-mini-dots">${[
        0,
        1,
        2,
        3,
        4
    ].map((_, i)=>`<i class="${i < Math.min(5, due.length ? Math.round(done.length / due.length * 5) : 0) ? 'lit' : ''}"></i>`).join('')}</div></div></div>
  <div class="section-title-row routine-toolbar"><div><span class="eyebrow">BUILD BETTER DAYS</span><h2>${t('routines', s)} <span class="count-pill">${snapshot.routines.length}</span></h2></div><button class="routine-create" data-action="add-routine">${icon('plus', 17)}<span>${t('new', s)}</span></button></div>
  <div class="routine-week-plan"><div class="routine-plan-title"><span>${icon('calendar', 16)} ${s.language === 'fa' ? 'برنامه هفتگی' : 'Your 7-day rhythm'}</span><small>${s.language === 'fa' ? 'برای مشاهده جزئیات روی یک روز بزنید' : 'Select a day for scheduled details'}</small></div>
   <div class="routine-week-strip">${Array.from({
        length: 7
    }, (_, i)=>{
        const day = shiftDay(today(), i), scheduled = active.filter((r)=>r.schedule_kind !== 'anytime' && occursOn(r, day)), doneCount = scheduled.filter((r)=>completedOn(snapshot.routine_completions, r.id, day)).length;
        return `<button type="button" data-action="routine-plan-day" data-date="${day}" class="routine-week-day ${s.routinePlanDate === day ? 'active' : ''}"><span>${esc(dayLabel(day, s.language, {
            weekday: 'short'
        }))}</span><strong>${esc(dayLabel(day, s.language, {
            day: 'numeric'
        }))}</strong><small>${scheduled.length} ${s.language === 'fa' ? 'روتین' : 'routines'}</small><i style="--done:${scheduled.length ? doneCount / scheduled.length : 0}"></i></button>`;
    }).join('')}</div>
   <div class="routine-day-preview"><strong>${esc(dayLabel(s.routinePlanDate, s.language, {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
    }))}</strong>
   <div>${active.filter((r)=>r.schedule_kind !== 'anytime' && occursOn(r, s.routinePlanDate)).map((r)=>`<div class="routine-planned-card"><button type="button" data-action="edit-routine" data-id="${r.id}"><span class="${completedOn(snapshot.routine_completions, r.id, s.routinePlanDate) ? 'planned-done' : ''}">${icon('routine', 13)} ${esc(r.title)}</span>${r.due_time ? `<small>${esc(r.due_time)}</small>` : ''}</button>${itemChecklist(r, s, snapshot, s.routinePlanDate, s.routinePlanDate <= today())}</div>`).join('') || `<small>${s.language === 'fa' ? 'روتینی برای این روز ثبت نشده' : 'No routines scheduled for this day'}</small>`}</div></div>
  </div>
  <label class="search-box routine-search">${icon('search', 16)}<input id="routine-search" value="${esc(s.routineSearch)}" placeholder="${t('routineSearch', s)}"/></label>
  <div class="routine-tabs">${[
        [
            'all',
            'routineAll'
        ],
        [
            'today',
            'routineToday'
        ],
        [
            'anytime',
            'routineAnytime'
        ],
        [
            'paused',
            'routinePaused'
        ]
    ].map(([key, label])=>`<button class="routine-tab ${f === key ? 'active' : ''}" data-action="routine-filter" data-filter="${key}">${t(label, s)}</button>`).join('')}</div>
  <div class="routine-grid">${renderRoutineResults(snapshot, s, date)}</div>
  </div>`;
}
function routineModal(snapshot, s) {
    const r = s.editingRoutine;
    const fa = s.language === 'fa';
    const rule = getRule(r);
    return `<div class="modal-scrim" data-action="dismiss-modal"><form class="dialog-card routine-dialog" id="routine-form" aria-label="Routine details">
  <div class="dialog-head"><div><span class="eyebrow">BUILD A BETTER RHYTHM</span><h2>${r.id ? fa ? 'ویرایش روتین' : 'Edit routine' : t('newRoutine', s)}</h2></div><button type="button" class="icon-button" data-action="dismiss-modal">${icon('x', 19)}</button></div>
  <p class="routine-form-tip">${t('routineHelp', s)}</p>
  <label class="field"><span>${t('title', s)}</span><input name="title" required autofocus maxlength="250" value="${esc(r.title)}" placeholder="${fa ? 'مثلاً خرید هفتگی' : 'e.g. Grocery shopping'}"/></label>
  <label class="field"><span>${t('details', s)}</span><textarea name="details" rows="2" maxlength="16000" placeholder="${fa ? 'توضیحات، راهنما یا لینک اختیاری' : 'Optional background or instructions'}">${esc(r.details)}</textarea></label>
  <div class="field-row"><label class="field"><span>${t('categories', s)}</span><input name="category" list="routine-categories" maxlength="100" value="${esc(r.category)}"/><datalist id="routine-categories">${[
        ...new Set([
            ...categories(snapshot),
            'Errands',
            'Health',
            'Home'
        ])
    ].map((c)=>`<option value="${esc(c)}"></option>`).join('')}</datalist></label>
  <label class="field"><span>${t('schedule', s)}</span><select name="schedule_kind" id="routine-schedule-select"><option value="anytime" ${r.schedule_kind === 'anytime' ? 'selected' : ''}>${t('whenever', s)}</option><option value="daily" ${r.schedule_kind === 'daily' ? 'selected' : ''}>${t('everyday', s)}</option><option value="weekly" ${r.schedule_kind === 'weekly' ? 'selected' : ''}>${t('weekdays', s)}</option><option value="interval" ${r.schedule_kind === 'interval' ? 'selected' : ''}>${t('interval', s)}</option><option value="monthly" ${r.schedule_kind === 'monthly' ? 'selected' : ''}>${t('monthly', s)}</option></select></label></div>
  <fieldset class="routine-weekdays" data-repeat-field="weekly" ${r.schedule_kind === 'weekly' ? '' : 'hidden'}><legend>${t('weekdays', s)}</legend><div class="weekday-picks">${(fa ? [
        'د',
        'س',
        'چ',
        'پ',
        'ج',
        'ش',
        'ی'
    ] : [
        'M',
        'T',
        'W',
        'T',
        'F',
        'S',
        'S'
    ]).map((label, i)=>`<label class="weekday-pick"><input type="checkbox" name="weekday_${i}" ${r.weekdays_mask & 1 << i ? 'checked' : ''}/><span>${label}</span></label>`).join('')}</div></fieldset>
  <div class="field-row" data-repeat-field="interval" ${r.schedule_kind === 'interval' ? '' : 'hidden'}><label class="field"><span>${t('intervalDays', s)}</span><input type="number" name="interval_days" min="1" max="365" value="${r.interval_days}"/></label></div>
  <div class="field-row" data-repeat-field="monthly" ${r.schedule_kind === 'monthly' ? '' : 'hidden'}><label class="field"><span>${t('monthDay', s)}</span><input type="number" name="month_day" min="1" max="31" value="${r.month_day}"/></label></div>
  <section class="routine-checklist-editor"><div class="checklist-editor-head"><div><strong>${icon('list', 18)} ${fa ? 'چک‌لیست این برنامه' : 'Routine checklist'}</strong><small>${fa ? 'زیرمورد اضافه کنید یا یک روتین ذخیره‌شده را به این برنامه پیوند دهید.' : 'Add sub-items or reuse an existing routine as part of this plan.'}</small></div><button type="button" class="checklist-add" data-action="add-routine-item">${icon('plus', 16)} ${fa ? 'مورد جدید' : 'Add item'}</button></div>
  <div class="checklist-editor-tools"><button type="button" data-action="paste-routine-items">${icon('notes', 15)} ${fa ? 'چسباندن چند مورد' : 'Paste list'}</button><span>${fa ? 'هر خط = یک مورد جدید؛ کلید Enter هم مورد بعدی را می‌سازد' : 'One line = one new item · Enter adds the next'}</span></div>
  <div id="routine-checklist-editor" class="checklist-editor-items">${snapshot.routine_items.filter((item)=>item.routine_id === r.id).sort((a, b)=>a.position - b.position).map((item)=>routineChecklistEditorItem(item, s, snapshot)).join('')}</div>
  <div class="checklist-editor-note">${fa ? 'همه موارد ضروری که انجام شوند، روتین خودکار کامل می‌شود. سوابق هر مورد برای هر تاریخ نگه‌داری می‌شود.' : 'When all required items are checked, the routine finishes automatically. Item history is saved for each date.'}</div></section>
  <details class="advanced-rules" ${r.id ? '' : 'open'}><summary>${icon('calendar', 17)} ${fa ? 'قانون‌های پیشرفته زمان‌بندی' : 'Advanced calendar and exception rules'}</summary><div class="advanced-heading">${icon('calendar', 17)} <strong>${fa ? 'برنامه‌ریزی هوشمند و پیشرفته' : 'Advanced schedule rules'}</strong><small>${fa ? 'قانون‌های زیر با نوع تکرار ترکیب می‌شوند.' : 'Combine these with the base repeat mode.'}</small></div>
  <div class="schedule-presets">${[
        [
            'none',
            fa ? 'عادی' : 'Normal'
        ],
        [
            'weekend',
            fa ? 'آخر هفته' : 'Weekend'
        ],
        [
            'workday',
            fa ? 'روز کاری' : 'Workday'
        ],
        [
            'odd',
            fa ? 'روزهای فرد' : 'Odd dates'
        ],
        [
            'even',
            fa ? 'روزهای زوج' : 'Even dates'
        ]
    ].map(([kind, label])=>`<button type="button" class="preset-chip" data-action="routine-preset" data-preset="${kind}">${label}</button>`).join('')}</div>
  <div class="field-row"><label class="field"><span>${fa ? 'مبنای تقویم' : 'Calendar basis'}</span><select name="rule_calendar"><option value="gregorian" ${rule.calendar === 'gregorian' ? 'selected' : ''}>Gregorian</option><option value="jalali" ${rule.calendar === 'jalali' ? 'selected' : ''}>شمسی · Jalali</option></select></label>
  <label class="field"><span>${fa ? 'زوج و فرد' : 'Date parity'}</span><select name="rule_parity"><option value="all" ${rule.parity === 'all' ? 'selected' : ''}>${fa ? 'همه' : 'All dates'}</option><option value="odd" ${rule.parity === 'odd' ? 'selected' : ''}>${fa ? 'فرد' : 'Odd'}</option><option value="even" ${rule.parity === 'even' ? 'selected' : ''}>${fa ? 'زوج' : 'Even'}</option></select></label></div>
  <div class="field-row"><label class="field"><span>${fa ? 'نوع روز' : 'Day class'}</span><select name="rule_day_class"><option value="all" ${rule.day_class === 'all' ? 'selected' : ''}>${fa ? 'همه روزها' : 'Any day'}</option><option value="weekend" ${rule.day_class === 'weekend' ? 'selected' : ''}>${fa ? 'تعطیل هفتگی' : 'Weekend'}</option><option value="workday" ${rule.day_class === 'workday' ? 'selected' : ''}>${fa ? 'غیرتعطیل هفتگی' : 'Workday'}</option></select></label>
  <label class="field"><span>${fa ? 'روزهای آخر هفته (میلادی: 0=دوشنبه)' : 'Weekend weekday numbers (Mon=0)'}</span><input name="rule_weekend" value="${esc((rule.weekend_days || [
        4
    ]).join(','))}" placeholder="4 or 5,6"/></label></div>
  <div class="field-row"><label class="field"><span>${fa ? 'شماره ماه‌ها (اختیاری)' : 'Months (optional)'}</span><input name="rule_months" value="${esc((rule.months || []).join(','))}" placeholder="1,2,3"/></label><label class="field"><span>${fa ? 'روزهای ماه (اختیاری)' : 'Month dates (optional)'}</span><input name="rule_month_days" value="${esc((rule.month_days || []).join(','))}" placeholder="1,15,30"/></label></div>
  <label class="field"><span>${fa ? 'تاریخ‌های خاص (میلادی، جداشده با ویرگول)' : 'Special dates to add (ISO, comma separated)'}</span><input name="rule_includes" value="${esc((rule.include_dates || []).join(', '))}" placeholder="2026-11-24, 2026-12-02"/></label>
  <label class="field"><span>${fa ? 'تاریخ‌های استثنا (میلادی)' : 'Skip exceptions (ISO dates)'}</span><input name="rule_excludes" value="${esc((rule.exclude_dates || []).join(', '))}" placeholder="2026-11-30"/></label>
  <div class="routine-next-preview"><strong>${fa ? 'پیش‌نمایش نوبت‌های بعدی' : 'Upcoming occurrence preview'}</strong><div id="routine-next-preview" class="next-preview-dates">${fa ? 'با تغییر برنامه، تاریخ‌ها به‌روزرسانی می‌شوند.' : 'Dates update as you edit the rule.'}</div></div>
  <small class="rule-help">${fa ? 'تاریخ شروع و استثناها در پایگاه داده میلادی‌اند؛ زوج/فرد، ماه و روز ماه با تقویم انتخابی محاسبه می‌شوند.' : 'Start/exception dates use ISO Gregorian. Parity, months and month-days use the chosen calendar.'}</small>
  </details>
  <div class="field-row"><label class="field"><span>${t('startDate', s)}</span><input type="date" name="start_date" required value="${esc(r.start_date)}"/></label><label class="field"><span>${t('time', s)}</span><input type="time" name="due_time" value="${esc(r.due_time)}" ${r.schedule_kind === 'anytime' ? 'disabled' : ''}/></label></div>
  <label class="field solar-date-field" ${s.calendarSystem === 'jalali' ? '' : 'hidden'}><span>${fa ? 'تاریخ شروع شمسی' : 'Start in Persian calendar'}</span><input name="start_date_solar" dir="ltr" value="${esc(isoToSolar(r.start_date))}" placeholder="1405/08/24"/></label>
  <div class="field-row"><label class="field"><span>${t('remind', s)}</span><select name="remind_before" ${r.schedule_kind === 'anytime' ? 'disabled' : ''}><option value="0" ${r.remind_before === 0 ? 'selected' : ''}>${fa ? 'در زمان مقرر' : 'At time'}</option>${[
        5,
        10,
        15,
        30,
        60
    ].map((n)=>`<option value="${n}" ${r.remind_before === n ? 'selected' : ''}>${n} ${fa ? 'دقیقه زودتر' : 'minutes before'}</option>`).join('')}</select></label><label class="field routine-enabled-field"><span>${fa ? 'وضعیت' : 'Status'}</span><span class="switch-text"><input name="enabled" type="checkbox" ${r.enabled ? 'checked' : ''}/> ${fa ? 'فعال' : 'Active'}</span></label></div>
  <small class="routine-form-help" data-anytime-help ${r.schedule_kind === 'anytime' ? '' : 'hidden'}>${fa ? 'روتین‌های بدون برنامه، یادآوری ساعتی ندارند.' : 'Anytime errands have no automatic time reminders.'}</small>
  <div class="dialog-actions">${r.id ? `<button type="button" class="subtle-danger" data-action="delete-routine" data-id="${r.id}">${icon('trash', 16)} ${t('delete', s)}</button>` : '<span></span>'}<button class="primary-button" type="submit">${icon('check', 17)} ${t('save', s)}</button></div>
 </form></div>`;
}
function routineHistoryModal(snapshot, s) {
    const r = snapshot.routines.find((r)=>r.id === s.historyRoutineId);
    if (!r) return '';
    const history = snapshot.routine_completions.filter((x)=>x.routine_id === r.id).sort((a, b)=>b.completed_at - a.completed_at || b.id - a.id).slice(0, 40);
    return `<div class="modal-scrim" data-action="dismiss-modal"><div class="dialog-card routine-dialog history-dialog"><div class="dialog-head"><div><span class="eyebrow">YOUR PROGRESS, SAVED</span><h2>${t('history', s)} · ${esc(r.title)}</h2></div><button class="icon-button" data-action="dismiss-modal">${icon('x', 19)}</button></div>
 <div class="history-summary"><span>${icon('checkCircle', 20)}</span><strong>${r.completion_count}</strong><small>${t('checkIns', s)}</small></div>
 <div class="routine-history-list">${history.length ? history.map((h)=>`<div class="routine-history-row"><span class="history-check">${icon('check', 15)}</span><span class="history-date">${esc(dayLabel(h.occurrence_date, s.language, {
            weekday: 'short',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        }))}<small>${esc(new Intl.DateTimeFormat(s.language === 'fa' ? 'fa-IR' : 'en-US', {
            hour: '2-digit',
            minute: '2-digit'
        }).format(h.completed_at * 1000))}</small></span><button data-action="undo-routine" data-id="${r.id}" data-date="${h.occurrence_date}">${t('undo', s)}</button></div>`).join('') : `<p class="rail-muted">${s.language === 'fa' ? 'هنوز سابقه‌ای ثبت نشده.' : 'No check-ins recorded yet.'}</p>`}</div>
 <div class="dialog-actions"><button class="primary-button" data-action="dismiss-modal">${t('close', s)}</button></div></div></div>`;
}
function focusView(s) {
    const whole = s.focusDuration * 60, remaining = s.focusRemaining, progress = whole ? Math.max(0, Math.min(100, (1 - remaining / whole) * 100)) : 0;
    const display = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(Math.floor(remaining % 60)).padStart(2, '0')}`;
    return `<div class="view-panel enter-view focus-view"><div class="greeting-area"><div class="eyebrow spaced">DEEP WORK MODE</div><h1>${t('focusHead', s)}</h1><p class="subtext">${t('focusSub', s)}</p></div>
 <div class="focus-stage"><div class="focus-aura"></div><div class="focus-ring" style="--progress:${progress}"><svg viewBox="0 0 280 280"><circle class="focus-track" cx="140" cy="140" r="113"/><circle class="focus-value" cx="140" cy="140" r="113"/></svg><div class="focus-face"><span class="focus-icon">${icon('flower', 22)}</span><strong id="focus-time">${display}</strong><small>LET YOUR MIND SETTLE</small></div></div></div>
 <div class="focus-pills">${[
        15,
        25,
        45,
        60
    ].map((x)=>`<button class="chip ${s.focusDuration === x ? 'active' : ''}" data-action="focus-duration" data-minutes="${x}">${x} min</button>`).join('')}</div>
 <div class="focus-controls"><button class="primary-wide" data-action="focus-toggle">${icon(s.focusRunning ? 'pause' : 'play', 19)} ${t(s.focusRunning ? 'pause' : s.focusRemaining === s.focusDuration * 60 ? 'start' : 'resume', s)}</button><button class="icon-button reset-focus" data-action="focus-reset" title="Reset">${icon('reset', 20)}</button></div>
 <div class="focus-hint">${icon('sparkles', 17)}<p>Protect this moment. Close extra tabs, silence the noise, and make something wonderful.</p></div>
 </div>`;
}
function rightRail(snapshot, s) {
    const coming = [
        ...snapshot.tasks
    ].filter((t)=>!t.done && t.due_date >= today()).sort((a, b)=>a.due_date.localeCompare(b.due_date) || a.due_time.localeCompare(b.due_time)).slice(0, 3);
    const recent = [
        ...snapshot.notes
    ].sort((a, b)=>b.updated_at - a.updated_at)[0];
    return `<aside class="insight-rail"><div class="rail-intro"><span class="eyebrow">YOUR SPACE</span><strong>Keep the good days close.</strong><p>A little structure, a lot more freedom.</p></div>
  ${miniCalendar(snapshot, s, s.calendarMonth, true)}
  <div class="rail-card"><div class="rail-card-head"><h3>${t('upcoming', s)}</h3>${icon('arrowUp', 18)}</div>${coming.length ? coming.map((t)=>`<button class="rail-task" data-action="edit-task" data-id="${t.id}"><span class="rail-time">${esc(t.due_time || 'All day')}</span><span><strong>${esc(t.title)}</strong><small>${esc(dayLabel(t.due_date, s.language, {
            month: 'short',
            day: 'numeric'
        }))} · ${esc(t.category)}</small></span></button>`).join('') : '<p class="rail-muted">Nothing urgent on the horizon.</p>'}</div>
  ${recent ? `<button class="rail-quote" data-action="open-note" data-id="${recent.id}"><span>${icon('notes', 16)} FROM YOUR NOTES</span><strong>${esc(recent.title || 'Untitled')}</strong><small>${esc(strip(recent.body)).slice(0, 100)}</small></button>` : ''}
  </aside>`;
}
function nav(s) {
    const items = [
        [
            'today',
            'sun',
            'today'
        ],
        [
            'tomorrow',
            'moon',
            'tomorrow'
        ],
        [
            'routines',
            'routine',
            'routines'
        ],
        [
            'calendar',
            'calendar',
            'calendar'
        ],
        [
            'notes',
            'notes',
            'notes'
        ],
        [
            'focus',
            'focus',
            'focus'
        ]
    ];
    return `<nav class="app-dock" aria-label="Main navigation">${items.map(([view, ic, label])=>`<button class="dock-button ${s.view === view ? 'selected' : ''}" data-action="navigate" data-view="${view}" title="${t(label, s)}">${icon(ic, 20)}<span>${t(label, s)}</span></button>`).join('')}</nav>`;
}
function taskModal(snapshot, s) {
    const x = s.editingTask;
    return `<div class="modal-scrim" data-action="dismiss-modal"><form class="dialog-card task-dialog" id="task-form" aria-label="Task details"><div class="dialog-head"><div><span class="eyebrow">MAKE IT HAPPEN</span><h2>${x.id ? 'Edit task' : 'New task'}</h2></div><button type="button" class="icon-button" data-action="dismiss-modal">${icon('x', 19)}</button></div>
 <label class="field"><span>${t('title', s)}</span><input name="title" maxlength="500" required autofocus value="${esc(x.title)}" placeholder="What matters right now?"/></label>
 <label class="field"><span>${t('details', s)}</span><textarea name="details" rows="3" placeholder="Optional details…">${esc(x.details)}</textarea></label>
 <div class="field-row"><label class="field"><span>${t('date', s)}</span><input type="date" name="due_date" required value="${esc(x.due_date)}"/></label><label class="field"><span>${t('time', s)}</span><input type="time" name="due_time" value="${esc(x.due_time)}"/></label></div>
 <label class="field solar-date-field" ${s.calendarSystem === 'jalali' ? '' : 'hidden'}><span>تاریخ شمسی (۱۴۰۵/۰۸/۲۴)</span><input name="due_date_solar" dir="ltr" value="${isoToSolar(x.due_date)}" placeholder="1405/08/24"/></label>
 <div class="field-row"><label class="field"><span>${t('categories', s)}</span><select name="category">${categories(snapshot).map((c)=>`<option ${x.category === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label><label class="field"><span>${t('priority', s)}</span><select name="priority"><option value="0" ${x.priority === 0 ? 'selected' : ''}>${t('low', s)}</option><option value="1" ${x.priority === 1 ? 'selected' : ''}>${t('medium', s)}</option><option value="2" ${x.priority === 2 ? 'selected' : ''}>${t('high', s)}</option></select></label></div>
 <div class="field-row"><label class="field"><span>${t('repeat', s)}</span><select name="recurrence">${[
        'none',
        'daily',
        'weekly'
    ].map((v)=>`<option value="${v}" ${x.recurrence === v ? 'selected' : ''}>${t(v, s)}</option>`).join('')}</select></label><label class="field"><span>${t('remind', s)}</span><select name="remind_before"><option value="0" ${x.remind_before === 0 ? 'selected' : ''}>At time</option>${[
        5,
        10,
        15,
        30,
        60
    ].map((v)=>`<option value="${v}" ${x.remind_before === v ? 'selected' : ''}>${v} min before</option>`).join('')}</select></label></div>
 ${x.id && x.due_time && x.alerted_for ? `<button type="button" class="snooze-button" data-action="snooze-task" data-id="${x.id}">${icon('bell', 16)} Snooze reminder for 5 minutes</button>` : ''}
 <div class="dialog-actions">${x.id ? `<button type="button" class="subtle-danger" data-action="delete-task" data-id="${x.id}">${icon('trash', 17)} ${t('delete', s)}</button>` : '<span></span>'}<button type="submit" class="primary-button">${icon('check', 17)} ${t('save', s)}</button></div></form></div>`;
}
function settingsModal(snapshot, s) {
    return `<div class="modal-scrim" data-action="dismiss-modal"><form class="dialog-card settings-dialog" id="settings-form" aria-label="Settings"><div class="dialog-head"><div><span class="eyebrow">MAKE IT YOURS</span><h2>${t('settings', s)}</h2></div><button type="button" class="icon-button" data-action="dismiss-modal">${icon('x', 19)}</button></div>
 <div class="setting-item"><span class="setting-icon">${icon('globe', 19)}</span><div><strong>${t('language', s)}</strong><small>Choose your reading direction</small></div><select name="language"><option value="en" ${s.language === 'en' ? 'selected' : ''}>English</option><option value="fa" ${s.language === 'fa' ? 'selected' : ''}>فارسی</option></select></div>
 <div class="setting-item"><span class="setting-icon">${icon('volume', 19)}</span><div><strong>${t('voice', s)}</strong><small>${s.language === 'fa' ? 'خواندن یادآوری با صدای محلی Piper (در صورت نصب)' : 'Read reminders with locally installed Piper neural voice'}</small></div><label class="switch"><input type="checkbox" name="voice" ${snapshot.settings.voice === 'true' ? 'checked' : ''}/><span></span></label></div>
 <div class="setting-item"><span class="setting-icon">${icon('bell', 19)}</span><div><strong>${s.language === 'fa' ? 'زنگ یادآوری' : 'Reminder chime'}</strong><small>${s.language === 'fa' ? 'سه نت ملایم و آفلاین' : 'Gentle offline three-note ring'}</small></div><label class="switch"><input type="checkbox" name="reminder_chime" ${snapshot.settings.reminder_chime !== 'false' ? 'checked' : ''}/><span></span></label></div>
 <div class="setting-item"><span class="setting-icon">${icon('sparkles', 19)}</span><div><strong>${t('motion', s)}</strong><small>Respect reduced motion</small></div><label class="switch"><input type="checkbox" name="motion" ${s.motion ? 'checked' : ''}/><span></span></label></div>
 <label class="field categories-field"><span>${t('categories', s)}</span><small>${t('categoriesHint', s)}</small><input name="categories" maxlength="500" value="${esc(snapshot.settings.categories || 'Personal,Work,Study,Ideas')}"/></label>
 <div class="data-transfer"><strong>${icon('download', 18)} ${s.language === 'fa' ? 'پشتیبان‌گیری و انتقال داده' : 'Backups & data transfer'}</strong><p>${s.language === 'fa' ? 'JSON شامل روتین‌ها، زیرموردها و تاریخچه انجام است؛ ورود اطلاعات با حفظ موارد فعلی انجام می‌شود.' : 'Portable JSON includes nested routines and check-in history. Import merges without deleting current data.'}</p><div class="transfer-controls"><select id="export-format" aria-label="Export format"><option value="sqlite">SQLite · ${s.language === 'fa' ? 'پشتیبان کامل دیتابیس' : 'Complete database backup'}</option><option value="json">JSON · ${s.language === 'fa' ? 'انتقال برنامه‌ها' : 'Portable planner backup'}</option><option value="tasks-csv">CSV · ${s.language === 'fa' ? 'کارها' : 'Tasks'}</option><option value="routines-csv">CSV · ${s.language === 'fa' ? 'روتین‌ها' : 'Routines'}</option><option value="markdown">Markdown · ${s.language === 'fa' ? 'گزارش' : 'Report'}</option><option value="ics">ICS · ${s.language === 'fa' ? 'تقویم ۹۰ روز' : '90-day calendar'}</option></select><button type="button" data-action="export-data">${icon('download', 15)} ${s.language === 'fa' ? 'خروجی' : 'Export'}</button><button type="button" data-action="import-data">${icon('archive', 15)} ${s.language === 'fa' ? 'ورود' : 'Import'}</button></div><input id="import-file" type="file" accept=".json,.csv,application/json,text/csv" hidden/><small>${s.language === 'fa' ? 'فایل خروجی در Downloads ذخیره می‌شود؛ پشتیبان SQLite شامل تاریخچهٔ حذف‌های دیتابیس است اما کلیدهای API ذخیره نمی‌شوند.' : 'Saved in Downloads · SQLite backup includes archived/deleted data, but never API keys. Import supports JSON and task CSV.'}</small></div>
 <div class="setting-tip">${icon('info', 18)} <span>Everything stays on this computer. Existing Rooz v0.1 notes and tasks remain in the same SQLite database when launched natively.</span></div>
 <div class="setting-tip">${icon('keyboard', 18)}<span>${t('shortcuts', s)}</span></div>
 <div class="dialog-actions"><button type="button" class="subtle-danger" data-action="quit-native">${icon('x', 16)} Quit entirely</button><button class="primary-button" type="submit">${icon('check', 17)} ${t('save', s)}</button></div></form></div>`;
}
export function render(snapshot, s) {
    const fa = s.language === 'fa';
    const todayTasks = snapshot.tasks.filter((t)=>t.due_date === today() && !t.done).length;
    let body = s.view === 'today' ? dailyView(snapshot, s, today()) : s.view === 'tomorrow' ? dailyView(snapshot, s, offset(1)) : s.view === 'calendar' ? calendarView(snapshot, s) : s.view === 'notes' ? notesView(snapshot, s) : s.view === 'routines' ? routinesView(snapshot, s) : focusView(s);
    return `<main class="shell ${s.expanded ? 'is-expanded' : ''}" dir="${fa ? 'rtl' : 'ltr'}" data-view="${s.view}">
   <div class="ambient a-one"></div><div class="ambient a-two"></div><div class="fine-noise"></div>
   <header class="app-header"><div class="brand-lockup" data-action="navigate" data-view="today"><span class="brand-mark">${icon('flower', 23)}</span><div class="brand-words"><strong>rooz<span class="brand-dot">.</span></strong><small>YOUR DAILY SPACE</small></div></div>
      <div class="header-actions"><span class="header-date">${esc(new Intl.DateTimeFormat(fa ? 'fa-IR-u-ca-persian' : 'en-US', {
        month: 'short',
        day: 'numeric'
    }).format(new Date()))}</span><button class="icon-button" data-action="open-settings" title="Settings">${icon('settings', 18)}</button><button class="icon-button" data-action="open-ai" title="AI assistant / Voice (Ctrl+Alt+Space)">${icon('sparkles', 18)}</button><button class="icon-button" data-action="toggle-fullscreen" title="${s.expanded ? 'Exit fullscreen' : 'Fullscreen (F11)'}">${icon(s.expanded ? 'shrink' : 'expand', 18)}</button><button class="icon-button close-app" data-action="hide" title="Hide (reminders continue)">${icon('x', 19)}</button></div>
   </header>
   <div class="workspace"><div class="scroll-area"><div class="main-view">${body}</div></div>${rightRail(snapshot, s)}</div>
   ${[
        'today',
        'tomorrow',
        'calendar'
    ].includes(s.view) ? quickAdd(s.view === 'today' ? today() : s.view === 'tomorrow' ? offset(1) : s.selectedDate, s) : ''}
   ${nav(s)}
   ${s.modal === 'task' ? taskModal(snapshot, s) : s.modal === 'settings' ? settingsModal(snapshot, s) : s.modal === 'routine' ? routineModal(snapshot, s) : s.modal === 'history' ? routineHistoryModal(snapshot, s) : ''}
   ${s.toast ? `<div class="toast">${icon('checkCircle', 18)} ${esc(s.toast)}</div>` : ''}
   ${todayTasks === 0 ? '' : `<span class="sr-only">${todayTasks} tasks remaining today</span>`}
 </main>`;
}
