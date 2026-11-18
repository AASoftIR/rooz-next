import { backend, newTask, newNote, offset, iso, native } from './backend.js';
import { routineDraft, occursOn, shiftDay } from './routines.js';
import { shiftCalendarMonth, solarToISO, isoToSolar } from './solar.js';
import { aiIsOpen, openAssistant, closeAssistant, initAssistant, mountAssistant } from './assistant.js';
import { render, renderRoutineResults, renderNoteCards, routineChecklistEditorItem, icon, esc, today, dayLabel } from './views.js';
import { editorView, setupEditor, leaveEditor, flushEditor, toggleMarkdown, applyLink, cancelLink, downloadNote } from './editor.js';
let snapshot = {
    tasks: [],
    notes: [],
    routines: [],
    routine_completions: [],
    routine_items: [],
    routine_item_completions: [],
    settings: {}
};
const state = {
    view: 'today',
    language: 'en',
    expanded: false,
    calendarSystem: 'gregorian',
    modal: null,
    editingTask: null,
    editingNote: null,
    editingRoutine: null,
    historyRoutineId: null,
    routineFilter: 'all',
    routineSearch: '',
    routinePlanDate: today(),
    selectedDate: today(),
    calendarMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    categoryFilter: 'All',
    noteSearch: '',
    focusDuration: 25,
    focusEnds: 0,
    focusRemaining: 25 * 60,
    focusRunning: false,
    motion: true,
    toast: null
};
const root = document.querySelector('#app');
let toastTimer = 0;
let activeDrag = 0;
let busy = false;
let commandOpen = false;
function toast(message) {
    state.toast = message;
    document.querySelector('.toast')?.remove();
    const shell = document.querySelector('.shell');
    if (shell) shell.insertAdjacentHTML('beforeend', `<div class="toast">${icon('checkCircle', 17)} ${esc(message)}</div>`);
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(()=>{
        state.toast = null;
        document.querySelector('.toast')?.remove();
    }, 2600);
}
function setExpandedMode(full) {
    if (state.expanded === full && document.body.classList.contains('expanded-preview') === full) return;
    state.expanded = full;
    renderAll();
}
function renderAll() {
    root.innerHTML = render(snapshot, state);
    const shell = root.querySelector('.shell');
    if (shell) shell.scrollLeft = 0;
    if (state.editingNote) {
        root.querySelector('.shell')?.insertAdjacentHTML('beforeend', editorView(state.editingNote, state, snapshot));
        setupEditor(snapshot, state, ()=>{});
    }
    const body = document.body;
    body.classList.toggle('expanded-preview', state.expanded);
    body.classList.toggle('reduced-motion', !state.motion);
    body.setAttribute('lang', state.language);
    if (commandOpen) showCommandPalette();
    mountAssistant(root, snapshot, state.language, async ()=>{
        snapshot = await backend.bootstrap();
        renderAll();
    }, (view)=>{
        if ([
            'today',
            'tomorrow',
            'routines',
            'calendar',
            'notes',
            'focus'
        ].includes(view)) navigate(view);
    });
    root.querySelector('[autofocus]')?.focus();
}
function navigate(view) {
    if (view === state.view && !state.modal && !state.editingNote) return;
    const hadOverlay = Boolean(state.modal || state.editingNote);
    state.view = view;
    state.modal = null;
    state.categoryFilter = 'All';
    const shell = root.querySelector('.shell');
    if (!shell || hadOverlay) {
        renderAll();
        return;
    }
    const fragment = document.createElement('div');
    fragment.innerHTML = render(snapshot, state);
    const next = fragment.querySelector('.shell');
    const workspace = next?.querySelector('.workspace');
    const dock = next?.querySelector('.app-dock');
    const oldWorkspace = shell.querySelector('.workspace');
    const oldDock = shell.querySelector('.app-dock');
    if (!workspace || !dock || !oldWorkspace || !oldDock) {
        renderAll();
        return;
    }
    oldWorkspace.replaceWith(workspace);
    oldDock.replaceWith(dock);
    shell.querySelector('.quick-add')?.remove();
    const nextQuick = next?.querySelector('.quick-add');
    if (nextQuick) dock.before(nextQuick);
    shell.dataset.view = view;
}
function appDate() {
    return state.view === 'tomorrow' ? offset(1) : state.view === 'calendar' ? state.selectedDate : today();
}
function parseCapture(raw, defaultDate) {
    const task = newTask(defaultDate);
    let title = raw;
    const time = title.match(/(?:^|\s)@([01]?\d|2[0-3]):([0-5]\d)(?=\s|$)/);
    if (time) {
        task.due_time = `${time[1].padStart(2, '0')}:${time[2]}`;
        title = title.replace(time[0], ' ');
    }
    const tomorrow = /(?:^|\s)(tomorrow|فردا)(?=\s|$)/i;
    if (tomorrow.test(title)) {
        task.due_date = offset(1);
        title = title.replace(tomorrow, ' ');
    }
    const category = title.match(/(?:^|\s)#([\p{L}\p{N}_-]+)/u);
    if (category) {
        const name = category[1].toLowerCase();
        task.category = name === 'work' ? 'Work' : name === 'study' ? 'Study' : name === 'ideas' ? 'Ideas' : name === 'personal' ? 'Personal' : category[1];
        title = title.replace(category[0], ' ');
    }
    const high = /(?:^|\s)!!(?=\s|$)/;
    if (high.test(title)) {
        task.priority = 2;
        title = title.replace(high, ' ');
    }
    const medium = /(?:^|\s)!(?=\s|$)/;
    if (medium.test(title)) {
        task.priority = 1;
        title = title.replace(medium, ' ');
    }
    task.title = title.replace(/\s+/g, ' ').trim();
    return task;
}
function setTask(task) {
    const idx = snapshot.tasks.findIndex((t)=>t.id === task.id);
    if (idx >= 0) snapshot.tasks[idx] = task;
    else snapshot.tasks.push(task);
}
async function updateTask(task) {
    try {
        const result = await backend.saveTask(task);
        setTask(result);
        state.modal = null;
        state.editingTask = null;
        renderAll();
        toast('Task saved');
    } catch (error) {
        toast('Could not save task');
        console.error(error);
    }
}
function showTask(task) {
    state.editingTask = {
        ...task
    };
    state.modal = 'task';
    renderAll();
}
function showRoutine(routine) {
    state.editingRoutine = {
        ...routine
    };
    state.modal = 'routine';
    renderAll();
    updateRoutinePreview();
}
let previewDebounce = 0;
function scheduleRoutinePreview() {
    window.clearTimeout(previewDebounce);
    previewDebounce = window.setTimeout(updateRoutinePreview, 125);
}
function updateRoutinePreview() {
    const form = document.querySelector('#routine-form');
    const container = document.querySelector('#routine-next-preview');
    if (!form || !container) return;
    const data = new FormData(form);
    const r = {
        ...state.editingRoutine || routineDraft(today())
    };
    r.schedule_kind = String(data.get('schedule_kind') || r.schedule_kind);
    r.start_date = String(data.get('start_date') || r.start_date);
    const solar = String(data.get('start_date_solar') || '').trim();
    if (state.calendarSystem === 'jalali' && solar) r.start_date = solarToISO(solar) || r.start_date;
    r.interval_days = Number(data.get('interval_days') || 3);
    r.month_day = Number(data.get('month_day') || 1);
    r.weekdays_mask = Array.from({
        length: 7
    }, (_, i)=>data.has(`weekday_${i}`) ? 1 << i : 0).reduce((a, b)=>a | b, 0);
    const list = (key)=>String(data.get(key) || '').split(/[,،\s]+/).map(Number).filter((n)=>Number.isInteger(n) && n > 0);
    const dates = (key)=>String(data.get(key) || '').split(/[,،\s]+/).map((x)=>x.trim()).filter(Boolean).map((x)=>solarToISO(x) || x);
    r.rule_json = JSON.stringify({
        calendar: String(data.get('rule_calendar') || 'gregorian'),
        parity: String(data.get('rule_parity') || 'all'),
        day_class: String(data.get('rule_day_class') || 'all'),
        weekend_days: String(data.get('rule_weekend') || '4').split(/[,،\s]+/).map(Number).filter((n)=>n >= 0 && n <= 6),
        months: list('rule_months'),
        month_days: list('rule_month_days'),
        include_dates: dates('rule_includes'),
        exclude_dates: dates('rule_excludes')
    });
    if (r.schedule_kind === 'anytime') {
        container.textContent = state.language === 'fa' ? 'بدون تاریخ مشخص' : 'No fixed schedule';
        return;
    }
    let day = today();
    const found = [];
    for(let i = 0; i < 400 && found.length < 8; i++, day = shiftDay(day, 1)){
        if (occursOn(r, day)) found.push(dayLabel(day, state.language, {
            month: 'short',
            day: 'numeric'
        }));
    }
    container.innerHTML = found.length ? found.map((x)=>`<span>${esc(x)}</span>`).join('') : `<small>${state.language === 'fa' ? 'در بازه ۴۰۰ روزه نوبتی نیست' : 'No matching occurrence in 400 days'}</small>`;
}
function replaceRoutine(routine) {
    const index = snapshot.routines.findIndex((x)=>x.id === routine.id);
    if (index >= 0) snapshot.routines[index] = routine;
    else snapshot.routines.unshift(routine);
}
async function saveRoutine(routine, items) {
    try {
        const result = await backend.saveRoutinePlan(routine, items);
        replaceRoutine(result.routine);
        snapshot.routine_items = snapshot.routine_items.filter((x)=>x.routine_id !== result.routine.id).concat(result.items);
        state.modal = null;
        state.editingRoutine = null;
        renderAll();
        toast(state.language === 'fa' ? 'روتین ذخیره شد' : 'Routine saved');
    } catch (error) {
        console.error(error);
        toast(String(error));
    }
}
async function checkIn(id, date, undo = false) {
    try {
        if (undo) {
            await backend.undoRoutine(id, date);
            const had = snapshot.routine_completions.some((c)=>c.routine_id === id && c.occurrence_date === date);
            snapshot.routine_completions = snapshot.routine_completions.filter((c)=>!(c.routine_id === id && c.occurrence_date === date));
            if (had) {
                const r = snapshot.routines.find((r)=>r.id === id);
                if (r) r.completion_count = Math.max(0, r.completion_count - 1);
            }
        } else {
            const result = await backend.completeRoutine(id, date);
            if (!snapshot.routine_completions.some((c)=>c.id === result.id)) {
                snapshot.routine_completions.unshift(result);
                {
                    const r = snapshot.routines.find((r)=>r.id === id);
                    if (r) r.completion_count++;
                }
            }
        }
        renderAll();
        toast(undo ? state.language === 'fa' ? 'ثبت انجام بازگردانده شد' : 'Check-in undone' : state.language === 'fa' ? 'انجام روتین ثبت شد ✨' : 'Routine completed ✨');
    } catch (error) {
        console.error(error);
        toast(String(error));
    }
}
async function loadNote(id) {
    const note = snapshot.notes.find((n)=>n.id === id);
    if (!note) return;
    state.editingNote = {
        ...note
    };
    renderAll();
}
async function closeNote() {
    if (busy) return;
    busy = true;
    try {
        await leaveEditor();
        state.editingNote = null;
        renderAll();
    } finally{
        busy = false;
    }
}
async function saveSettings(form) {
    const data = new FormData(form);
    const changes = {
        language: String(data.get('language') || 'en'),
        voice: String(data.get('voice') === 'on'),
        motion: String(data.get('motion') === 'on'),
        categories: String(data.get('categories') || 'Personal,Work,Study,Ideas')
    };
    try {
        for (const [key, value] of Object.entries(changes)){
            await backend.saveSetting(key, value);
            snapshot.settings[key] = value;
        }
        state.language = changes.language === 'fa' ? 'fa' : 'en';
        if (!snapshot.settings.calendar_system) state.calendarSystem = state.language === 'fa' ? 'jalali' : 'gregorian';
        state.motion = changes.motion === 'true';
        state.modal = null;
        renderAll();
        toast('Preferences saved');
    } catch (error) {
        toast('Could not save settings');
        console.error(error);
    }
}
function chooseDate(day) {
    state.selectedDate = day;
    const dt = new Date(`${day}T12:00:00`);
    state.calendarMonth = new Date(dt.getFullYear(), dt.getMonth(), 1);
    if (state.view !== 'calendar') state.view = 'calendar';
    renderAll();
}
function shiftMonth(delta) {
    state.calendarMonth = shiftCalendarMonth(state.calendarMonth, delta, state.calendarSystem === 'jalali' ? 'fa' : 'en');
    renderAll();
}
function formatTime(seconds) {
    return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}
function focusTick() {
    if (!state.focusRunning) return;
    const seconds = Math.max(0, Math.ceil((state.focusEnds - Date.now()) / 1000));
    state.focusRemaining = seconds;
    const label = document.querySelector('#focus-time');
    if (label) label.textContent = formatTime(seconds);
    const ring = document.querySelector('.focus-ring');
    if (ring) ring.style.setProperty('--progress', String(100 * (1 - seconds / (state.focusDuration * 60))));
    if (seconds === 0) {
        state.focusRunning = false;
        state.focusEnds = 0;
        renderAll();
        toast('Focus session complete ✨');
        try {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.frequency.value = 660;
            gain.gain.value = .045;
            osc.connect(gain).connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + .18);
            osc.onended = ()=>void ctx.close();
        } catch  {}
    }
}
function commandResults(query) {
    const q = query.toLocaleLowerCase();
    const entries = [
        {
            label: 'Go to Today',
            meta: 'Navigation',
            action: 'navigate-today'
        },
        {
            label: 'Tomorrow',
            meta: 'Navigation',
            action: 'navigate-tomorrow'
        },
        {
            label: 'Open Calendar',
            meta: 'Navigation',
            action: 'navigate-calendar'
        },
        {
            label: 'My Notes',
            meta: 'Navigation',
            action: 'navigate-notes'
        },
        {
            label: 'Start Focus',
            meta: 'Navigation',
            action: 'navigate-focus'
        },
        {
            label: 'Open Routines',
            meta: 'Navigation',
            action: 'navigate-routines'
        },
        {
            label: 'New Routine',
            meta: 'Create',
            action: 'add-routine'
        },
        {
            label: 'Add a task',
            meta: 'Create',
            action: 'add-task'
        },
        {
            label: 'Create a note',
            meta: 'Create',
            action: 'new-note'
        },
        ...snapshot.tasks.map((t)=>({
                label: t.title,
                meta: `Task · ${t.category}`,
                action: 'edit-task',
                id: t.id
            })),
        ...snapshot.notes.map((n)=>({
                label: n.title || 'Untitled',
                meta: `Note · ${n.category}`,
                action: 'open-note',
                id: n.id
            })),
        ...snapshot.routines.map((r)=>({
                label: r.title,
                meta: `Routine · ${r.category}`,
                action: 'edit-routine',
                id: r.id
            }))
    ];
    return entries.filter((x)=>`${x.label} ${x.meta}`.toLocaleLowerCase().includes(q)).slice(0, 9);
}
function renderPaletteResults(q) {
    return commandResults(q).map((r, i)=>`<button class="palette-result ${i === 0 ? 'picked' : ''}" data-action="${r.action}" ${r.id ? `data-id="${r.id}"` : ''}><span class="palette-result-icon">${icon(r.action.startsWith('navigate') ? 'arrow' : r.meta.startsWith('Note') ? 'notes' : r.meta.startsWith('Task') ? 'checkCircle' : r.meta.startsWith('Routine') ? 'routine' : 'plus', 17)}</span><span><strong>${esc(r.label)}</strong><small>${esc(r.meta)}</small></span><span class="palette-enter">↵</span></button>`).join('') || '<div class="palette-empty">No matches yet.</div>';
}
function showCommandPalette() {
    commandOpen = true;
    document.querySelector('#command-overlay')?.remove();
    document.querySelector('.shell')?.insertAdjacentHTML('beforeend', `<div id="command-overlay" class="command-scrim" data-action="close-palette"><div class="command-card"><label class="command-search">${icon('search', 20)}<input id="command-input" autocomplete="off" placeholder="Search tasks, notes, actions…" autofocus/><kbd>ESC</kbd></label><div id="command-results">${renderPaletteResults('')}</div><footer>ROOZ COMMAND CENTER <span>↑ ↓ TO NAVIGATE · ENTER TO OPEN</span></footer></div></div>`);
    document.querySelector('#command-input')?.focus();
}
function hidePalette() {
    commandOpen = false;
    document.querySelector('#command-overlay')?.remove();
}
async function handleAction(target) {
    const action = target.dataset.action;
    const id = Number(target.dataset.id || 0);
    if (!action) return;
    switch(action){
        case 'navigate':
            navigate(target.dataset.view);
            break;
        case 'navigate-today':
            hidePalette();
            navigate('today');
            break;
        case 'navigate-tomorrow':
            hidePalette();
            navigate('tomorrow');
            break;
        case 'navigate-calendar':
            hidePalette();
            navigate('calendar');
            break;
        case 'navigate-notes':
            hidePalette();
            navigate('notes');
            break;
        case 'navigate-focus':
            hidePalette();
            navigate('focus');
            break;
        case 'navigate-routines':
            hidePalette();
            navigate('routines');
            break;
        case 'view-tomorrow':
            navigate('tomorrow');
            break;
        case 'add-routine-item':
            {
                const list = document.querySelector('#routine-checklist-editor');
                if (list) {
                    list.insertAdjacentHTML('beforeend', routineChecklistEditorItem({
                        id: 0,
                        routine_id: state.editingRoutine?.id || 0,
                        title: '',
                        details: '',
                        required: true,
                        position: list.children.length,
                        weekdays_mask: 127
                    }, state));
                    list.querySelector('.checklist-edit-row:last-child .checklist-item-title')?.focus();
                }
                break;
            }
        case 'remove-routine-item':
            {
                target.closest('.checklist-edit-row')?.remove();
                break;
            }
        case 'toggle-routine-item':
            {
                if (busy) return;
                busy = true;
                try {
                    await backend.toggleRoutineItem(id, target.dataset.date || today());
                    const currentView = state.view;
                    snapshot = await backend.bootstrap();
                    const grid = document.querySelector('.routine-grid');
                    if (grid && currentView === 'routines') {
                        grid.innerHTML = renderRoutineResults(snapshot, state);
                    } else renderAll();
                } catch (err) {
                    toast(String(err));
                } finally{
                    busy = false;
                }
                break;
            }
        case 'add-routine':
            hidePalette();
            showRoutine(routineDraft(today()));
            break;
        case 'edit-routine':
            hidePalette();
            {
                const r = snapshot.routines.find((x)=>x.id === id);
                if (r) showRoutine(r);
                break;
            }
        case 'routine-plan-day':
            state.routinePlanDate = target.dataset.date || today();
            renderAll();
            break;
        case 'routine-filter':
            state.routineFilter = target.dataset.filter || 'all';
            renderAll();
            break;
        case 'complete-routine':
            await checkIn(id, target.dataset.date || today());
            break;
        case 'undo-routine':
            await checkIn(id, target.dataset.date || today(), true);
            break;
        case 'open-routine-history':
            state.historyRoutineId = id;
            state.modal = 'history';
            renderAll();
            break;
        case 'pause-routine':
        case 'resume-routine':
            {
                try {
                    const r = await backend.setRoutineEnabled(id, action === 'resume-routine');
                    replaceRoutine(r);
                    renderAll();
                    toast(r.enabled ? 'Routine resumed' : 'Routine paused');
                } catch (error) {
                    toast(String(error));
                }
                break;
            }
        case 'delete-routine':
            if (confirm(state.language === 'fa' ? 'این روتین و تمام سوابق آن حذف شوند؟' : 'Delete this routine and all its check-in history permanently?')) {
                try {
                    await backend.deleteRoutine(id);
                    snapshot.routines = snapshot.routines.filter((r)=>r.id !== id);
                    snapshot.routine_completions = snapshot.routine_completions.filter((c)=>c.routine_id !== id);
                    state.editingRoutine = null;
                    state.modal = null;
                    renderAll();
                    toast('Routine deleted');
                } catch (error) {
                    toast(String(error));
                }
            }
            break;
        case 'add-task':
            hidePalette();
            showTask(newTask(appDate()));
            break;
        case 'edit-task':
            hidePalette();
            {
                const t = snapshot.tasks.find((x)=>x.id === id);
                if (t) showTask(t);
                break;
            }
        case 'toggle-task':
            {
                try {
                    const saved = await backend.toggleTask(id);
                    setTask(saved);
                    renderAll();
                    if (saved.done) toast('Lovely, one less thing ✨');
                } catch (err) {
                    toast('Could not update task');
                    console.error(err);
                }
                break;
            }
        case 'snooze-task':
            try {
                await backend.snooze(id, 5);
                state.modal = null;
                renderAll();
                toast('Reminder snoozed 5 minutes');
            } catch (e) {
                toast('Could not snooze reminder');
                console.error(e);
            }
            break;
        case 'delete-task':
            if (confirm('Delete this task permanently?')) {
                await backend.deleteTask(id);
                snapshot.tasks = snapshot.tasks.filter((x)=>x.id !== id);
                state.modal = null;
                renderAll();
                toast('Task deleted');
            }
            break;
        case 'filter-category':
            state.categoryFilter = target.dataset.category || 'All';
            renderAll();
            break;
        case 'select-date':
            chooseDate(target.dataset.date || today());
            break;
        case 'toggle-calendar-system':
            {
                state.calendarSystem = state.calendarSystem === 'jalali' ? 'gregorian' : 'jalali';
                void backend.saveSetting('calendar_system', state.calendarSystem);
                renderAll();
                break;
            }
        case 'previous-month':
            shiftMonth(-1);
            break;
        case 'next-month':
            shiftMonth(1);
            break;
        case 'routine-preset':
            {
                const kind = target.dataset.preset || 'none';
                const form = document.querySelector('#routine-form');
                if (!form) return;
                const repeat = form.querySelector('[name="schedule_kind"]');
                const parity = form.querySelector('[name="rule_parity"]');
                const cl = form.querySelector('[name="rule_day_class"]');
                if (repeat) repeat.value = 'daily';
                if (parity) parity.value = kind === 'odd' || kind === 'even' ? kind : 'all';
                if (cl) cl.value = kind === 'weekend' || kind === 'workday' ? kind : 'all';
                repeat?.dispatchEvent(new Event('change', {
                    bubbles: true
                }));
                updateRoutinePreview();
                break;
            }
        case 'open-ai':
            void openAssistant();
            break;
        case 'toggle-fullscreen':
            {
                try {
                    const fullscreen = await backend.windowAction(state.expanded ? 'compact' : 'expand');
                    setExpandedMode(fullscreen);
                } catch (e) {
                    toast(String(e));
                }
                break;
            }
        case 'open-settings':
            state.modal = 'settings';
            renderAll();
            break;
        case 'dismiss-modal':
            if (target.classList.contains('modal-scrim') || target.closest('button')) {
                state.modal = null;
                state.editingTask = null;
                state.editingRoutine = null;
                renderAll();
            }
            break;
        case 'toggle-expand':
            {
                const expanded = !state.expanded;
                try {
                    const result = await backend.windowAction(expanded ? 'expand' : 'compact');
                    setExpandedMode(result);
                } catch (e) {
                    console.warn(e);
                    toast('Window resizing unavailable');
                }
                break;
            }
        case 'hide':
            if (native) {
                await backend.windowAction('hide');
            } else toast('In the desktop app this hides Rooz to its tray');
            break;
        case 'quit-native':
            if (native) {
                await backend.windowAction('quit');
            } else toast('Quit is available in the desktop app');
            break;
        case 'new-note':
            hidePalette();
            state.editingNote = newNote();
            renderAll();
            document.querySelector('#note-title')?.focus();
            break;
        case 'open-note':
            hidePalette();
            await loadNote(id);
            break;
        case 'close-note':
            await closeNote();
            break;
        case 'delete-note':
            {
                const noteId = state.editingNote?.id || 0;
                if (confirm('Delete this note permanently?')) {
                    if (noteId) await backend.deleteNote(noteId);
                    snapshot.notes = snapshot.notes.filter((n)=>n.id !== noteId);
                    state.editingNote = null;
                    renderAll();
                    toast('Note deleted');
                }
                break;
            }
        case 'toggle-markdown':
            toggleMarkdown();
            break;
        case 'export-note':
            downloadNote();
            toast('Markdown exported');
            break;
        case 'apply-link':
            applyLink();
            break;
        case 'cancel-link':
            cancelLink();
            break;
        case 'open-url':
            try {
                await backend.openExternal(target.dataset.url || '');
            } catch  {
                toast('Could not open URL');
            }
            break;
        case 'focus-duration':
            state.focusDuration = Number(target.dataset.minutes || 25);
            state.focusRemaining = state.focusDuration * 60;
            state.focusRunning = false;
            renderAll();
            break;
        case 'focus-toggle':
            if (state.focusRunning) {
                state.focusRemaining = Math.max(0, Math.ceil((state.focusEnds - Date.now()) / 1000));
                state.focusRunning = false;
            } else {
                state.focusEnds = Date.now() + state.focusRemaining * 1000;
                state.focusRunning = true;
            }
            renderAll();
            break;
        case 'focus-reset':
            state.focusRunning = false;
            state.focusRemaining = state.focusDuration * 60;
            renderAll();
            break;
        case 'close-palette':
            if (target.id === 'command-overlay') hidePalette();
            break;
    }
}
root.addEventListener('click', (event)=>{
    const target = event.target.closest('[data-action]');
    if (target?.classList.contains('modal-scrim') && event.target !== target) return;
    if (target?.classList.contains('command-scrim') && event.target !== target) return;
    if (target) void handleAction(target);
});
root.addEventListener('submit', (event)=>{
    const form = event.target;
    event.preventDefault();
    if (form.id === 'quick-form') {
        const input = form.querySelector('#quick-title');
        const item = parseCapture(input.value, form.dataset.date || today());
        if (!item.title) {
            input.focus();
            return;
        }
        void updateTask(item);
    } else if (form.id === 'task-form') {
        const data = new FormData(form);
        const task = {
            ...state.editingTask || newTask(appDate())
        };
        task.title = String(data.get('title') || '').trim();
        task.details = String(data.get('details') || '');
        task.due_date = String(data.get('due_date') || today());
        if (state.calendarSystem === 'jalali') {
            const input = String(data.get('due_date_solar') || '').trim();
            if (input) {
                const iso = solarToISO(input);
                if (!iso) {
                    toast('Invalid Shamsi date');
                    return;
                }
                task.due_date = iso;
            }
        }
        task.due_time = String(data.get('due_time') || '');
        task.category = String(data.get('category') || 'Personal');
        task.priority = Number(data.get('priority') || 0);
        task.recurrence = String(data.get('recurrence') || 'none');
        task.remind_before = Number(data.get('remind_before') || 0);
        if (task.title) void updateTask(task);
    } else if (form.id === 'routine-form') {
        const data = new FormData(form);
        const r = {
            ...state.editingRoutine || routineDraft(today())
        };
        r.title = String(data.get('title') || '').trim();
        r.details = String(data.get('details') || '');
        r.category = String(data.get('category') || 'Personal').trim();
        r.schedule_kind = String(data.get('schedule_kind') || 'anytime');
        r.weekdays_mask = Array.from({
            length: 7
        }, (_, i)=>data.has(`weekday_${i}`) ? 1 << i : 0).reduce((a, b)=>a | b, 0);
        r.interval_days = Number(data.get('interval_days') || 1);
        r.month_day = Number(data.get('month_day') || 1);
        r.start_date = String(data.get('start_date') || today());
        if (state.calendarSystem === 'jalali') {
            const input = String(data.get('start_date_solar') || '').trim();
            if (input) {
                const iso = solarToISO(input);
                if (!iso) {
                    toast('Invalid Shamsi start date');
                    return;
                }
                r.start_date = iso;
            }
        }
        r.due_time = String(data.get('due_time') || '');
        r.remind_before = Number(data.get('remind_before') || 0);
        r.enabled = data.get('enabled') === 'on';
        const nums = (name)=>String(data.get(name) || '').split(/[,،\s]+/).map((x)=>Number(x)).filter((x)=>Number.isInteger(x) && x > 0);
        const dates = (name)=>String(data.get(name) || '').split(/[,،\s]+/).map((x)=>x.trim()).filter(Boolean).map((x)=>solarToISO(x) || x);
        const rule = {
            calendar: String(data.get('rule_calendar') || 'gregorian'),
            parity: String(data.get('rule_parity') || 'all'),
            day_class: String(data.get('rule_day_class') || 'all'),
            weekend_days: String(data.get('rule_weekend') || '4').split(/[,،\s]+/).map(Number).filter((x)=>Number.isInteger(x) && x >= 0 && x <= 6),
            months: nums('rule_months'),
            month_days: nums('rule_month_days'),
            include_dates: dates('rule_includes'),
            exclude_dates: dates('rule_excludes')
        };
        if (rule.months.some((x)=>x > 12) || rule.month_days.some((x)=>x > 31) || [
            ...rule.include_dates,
            ...rule.exclude_dates
        ].some((x)=>!/^\d{4}-\d\d-\d\d$/.test(x))) {
            toast('Check calendar rule values');
            return;
        }
        r.rule_json = JSON.stringify(rule);
        if (r.schedule_kind === 'weekly' && !r.weekdays_mask) {
            toast('Choose at least one weekday');
            return;
        }
        const items = [
            ...form.querySelectorAll('.checklist-edit-row')
        ].map((row, index)=>{
            const title = row.querySelector('[name="checklist_title"]')?.value.trim() || '';
            const details = row.querySelector('[name="checklist_details"]')?.value.trim() || '';
            const mask = Array.from({
                length: 7
            }, (_, i)=>row.querySelector(`[name="item_weekday_${i}"]`)?.checked ? 1 << i : 0).reduce((a, b)=>a | b, 0);
            return {
                id: Number(row.dataset.itemId || 0),
                routine_id: r.id,
                title,
                details,
                position: index,
                required: Boolean(row.querySelector('[name="checklist_required"]')?.checked),
                weekdays_mask: mask
            };
        });
        if (items.some((x)=>!x.title || !x.weekdays_mask)) {
            toast(state.language === 'fa' ? 'عنوان و حداقل یک روز برای هر مورد لازم است' : 'Every checklist item needs text and at least one weekday');
            return;
        }
        if (r.title) void saveRoutine(r, items);
    } else if (form.id === 'settings-form') void saveSettings(form);
});
root.addEventListener('input', (event)=>{
    const input = event.target;
    if (input.closest('.routine-checklist-editor')) return;
    if (input.closest('#routine-form')) {
        if (input.name === 'start_date_solar') {
            const key = solarToISO(input.value);
            const target = document.querySelector('[name="start_date"]');
            if (key && target) target.value = key;
        }
        scheduleRoutinePreview();
        return;
    }
    if (input.closest('#task-form') && input.name === 'due_date_solar') {
        const key = solarToISO(input.value);
        const target = document.querySelector('[name="due_date"]');
        if (key && target) target.value = key;
    }
    if (input.id === 'note-search') {
        state.noteSearch = input.value;
        const grid = document.querySelector('.notes-grid');
        if (grid) grid.innerHTML = renderNoteCards(snapshot, state);
    } else if (input.id === 'routine-search') {
        state.routineSearch = input.value;
        const grid = document.querySelector('.routine-grid');
        if (grid) grid.innerHTML = renderRoutineResults(snapshot, state);
    } else if (input.id === 'command-input') {
        const results = document.querySelector('#command-results');
        if (results) results.innerHTML = renderPaletteResults(input.value);
    }
});
root.addEventListener('change', (event)=>{
    const input = event.target;
    if (input.id === 'routine-schedule-select') {
        document.querySelectorAll('[data-repeat-field]').forEach((el)=>el.hidden = el.dataset.repeatField !== input.value);
        document.querySelectorAll('[data-anytime-help]').forEach((el)=>el.hidden = input.value !== 'anytime');
        const time = document.querySelector('#routine-form input[name="due_time"]');
        if (time) time.disabled = input.value === 'anytime';
        const reminder = document.querySelector('#routine-form select[name="remind_before"]');
        if (reminder) reminder.disabled = input.value === 'anytime';
    }
    if (input.closest('#routine-form')) {
        if (input.name === 'start_date' && input.value) {
            const solar = document.querySelector('[name="start_date_solar"]');
            if (solar) solar.value = isoToSolar(input.value);
        }
        if (input.name === 'start_date_solar' && input.value) {
            const key = solarToISO(input.value);
            const gregorian = document.querySelector('[name="start_date"]');
            if (key && gregorian) gregorian.value = key;
        }
        scheduleRoutinePreview();
    }
    if (input.closest('#task-form')) {
        if (input.name === 'due_date' && input.value) {
            const solar = document.querySelector('[name="due_date_solar"]');
            if (solar) solar.value = isoToSolar(input.value);
        }
        if (input.name === 'due_date_solar' && input.value) {
            const key = solarToISO(input.value);
            const gregorian = document.querySelector('[name="due_date"]');
            if (key && gregorian) gregorian.value = key;
        }
    }
});
let activeRoutineItem = null;
let glassFrame = 0;
root.addEventListener('pointermove', (event)=>{
    if (!state.motion) return;
    const hero = event.target.closest('.progress-hero');
    if (!hero) return;
    const rect = hero.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width, y = (event.clientY - rect.top) / rect.height;
    if (glassFrame) cancelAnimationFrame(glassFrame);
    glassFrame = requestAnimationFrame(()=>{
        hero.style.setProperty('--spot-x', `${Math.round(x * 100)}%`);
        hero.style.setProperty('--spot-y', `${Math.round(y * 100)}%`);
        hero.style.setProperty('--tilt-y', `${((x - .5) * 2.6).toFixed(2)}deg`);
        hero.style.setProperty('--tilt-x', `${((.5 - y) * 2).toFixed(2)}deg`);
    });
});
root.addEventListener('pointerout', (event)=>{
    const hero = event.target.closest('.progress-hero');
    if (hero && !(event.relatedTarget instanceof Node && hero.contains(event.relatedTarget))) {
        hero.style.removeProperty('--tilt-x');
        hero.style.removeProperty('--tilt-y');
    }
});
root.addEventListener('dragstart', (event)=>{
    const grip = event.target.closest('.checklist-item-grip');
    if (grip) {
        activeRoutineItem = grip.closest('.checklist-edit-row');
        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', 'routine-checklist');
        }
        return;
    }
    const item = event.target.closest('.task-row');
    if (!item) return;
    activeDrag = Number(item.dataset.taskId || 0);
    item.classList.add('dragging');
    if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', String(activeDrag));
    }
});
root.addEventListener('dragover', (event)=>{
    if (activeRoutineItem && event.target.closest('.checklist-edit-row')) {
        event.preventDefault();
        return;
    }
    const item = event.target.closest('.task-row');
    if (item && activeDrag) {
        event.preventDefault();
        document.querySelectorAll('.drop-target').forEach((x)=>x.classList.remove('drop-target'));
        item.classList.add('drop-target');
    }
});
root.addEventListener('dragend', ()=>{
    activeRoutineItem = null;
    activeDrag = 0;
    document.querySelectorAll('.dragging,.drop-target').forEach((x)=>x.classList.remove('dragging', 'drop-target'));
});
root.addEventListener('drop', (event)=>{
    const checklistTarget = event.target.closest('.checklist-edit-row');
    if (checklistTarget && activeRoutineItem) {
        event.preventDefault();
        if (checklistTarget !== activeRoutineItem) {
            const parent = checklistTarget.parentNode;
            parent?.insertBefore(activeRoutineItem, checklistTarget);
        }
        activeRoutineItem = null;
        return;
    }
    const item = event.target.closest('.task-row');
    if (!item || !activeDrag) return;
    event.preventDefault();
    const before = Number(item.dataset.taskId || 0);
    const date = appDate();
    const subset = snapshot.tasks.filter((t)=>t.due_date === date).sort((a, b)=>a.position - b.position).map((t)=>t.id);
    const from = subset.indexOf(activeDrag), to = subset.indexOf(before);
    if (from < 0 || to < 0 || from === to) return;
    subset.splice(from, 1);
    subset.splice(to, 0, activeDrag);
    subset.forEach((id, pos)=>{
        const t = snapshot.tasks.find((t)=>t.id === id);
        if (t) t.position = pos;
    });
    void backend.reorder(subset).catch((error)=>{
        console.error(error);
        toast('Could not reorder');
    });
    activeDrag = 0;
    renderAll();
});
document.addEventListener('keydown', (event)=>{
    const target = event.target;
    const editing = target.matches('input,textarea,[contenteditable="true"]');
    if (event.key === 'Enter' && target.matches('.checklist-item-title,.checklist-item-detail')) {
        event.preventDefault();
        document.querySelector('[data-action="add-routine-item"]')?.click();
        return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's' && state.editingNote) {
        event.preventDefault();
        void flushEditor();
        toast('Note saved');
        return;
    }
    if (event.key === 'F11') {
        event.preventDefault();
        void backend.windowAction(state.expanded ? 'compact' : 'expand').then(setExpandedMode).catch((e)=>toast(String(e)));
        return;
    }
    if ((event.ctrlKey || event.metaKey) && event.altKey && event.code === 'Space') {
        event.preventDefault();
        void openAssistant(true);
        return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (state.editingNote) {
            (document.querySelector('[data-format="link"]') || null)?.click();
        } else showCommandPalette();
        return;
    }
    if (event.key === 'Escape') {
        if (aiIsOpen()) {
            closeAssistant();
            return;
        }
        if (commandOpen) {
            hidePalette();
            return;
        }
        if (state.editingNote) {
            void closeNote();
            return;
        }
        if (state.modal) {
            state.modal = null;
            renderAll();
            return;
        }
        if (native) void backend.windowAction('hide');
        return;
    }
    if (commandOpen) {
        if (event.key === 'Enter') {
            const item = document.querySelector('.palette-result.picked') || document.querySelector('.palette-result');
            if (item) {
                event.preventDefault();
                void handleAction(item);
            }
            return;
        }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            const items = [
                ...document.querySelectorAll('.palette-result')
            ];
            const i = Math.max(0, items.findIndex((x)=>x.classList.contains('picked')));
            items[i]?.classList.remove('picked');
            items[(i + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.classList.add('picked');
            event.preventDefault();
            return;
        }
        return;
    }
    if (editing || state.editingNote) return;
    if ((event.ctrlKey || event.metaKey) && /^[1-6]$/.test(event.key)) {
        event.preventDefault();
        navigate([
            'today',
            'tomorrow',
            'routines',
            'calendar',
            'notes',
            'focus'
        ][Number(event.key) - 1]);
        return;
    }
    if (event.key === '/' && !event.ctrlKey) {
        event.preventDefault();
        if (state.view === 'notes') document.querySelector('#note-search')?.focus();
        else if (state.view === 'routines') document.querySelector('#routine-search')?.focus();
        else document.querySelector('#quick-title')?.focus();
    }
    if (event.key.toLowerCase() === 'n' && !event.ctrlKey) {
        event.preventDefault();
        if (state.view === 'notes') {
            state.editingNote = newNote();
            renderAll();
        } else if (state.view === 'routines') showRoutine(routineDraft(today()));
        else showTask(newTask(appDate()));
    }
});
window.setInterval(focusTick, 260);
let lastDay = today();
window.setInterval(()=>{
    if (today() !== lastDay) {
        lastDay = today();
        void backend.bootstrap().then((data)=>{
            snapshot = data;
            renderAll();
        });
    }
}, 60_000);
async function init() {
    try {
        snapshot = await backend.bootstrap();
        state.language = snapshot.settings.language === 'fa' ? 'fa' : 'en';
        state.calendarSystem = snapshot.settings.calendar_system === 'jalali' || !snapshot.settings.calendar_system && state.language === 'fa' ? 'jalali' : 'gregorian';
        state.motion = snapshot.settings.motion !== 'false';
    } catch (error) {
        console.error(error);
        root.innerHTML = `<section class="fatal-error"><h1>Rooz could not open its database</h1><p>${esc(String(error))}</p></section>`;
        return;
    }
    document.body.classList.add('corner-arrival');
    renderAll();
    window.setTimeout(()=>document.body.classList.remove('corner-arrival'), 520);
    if (native) {
        try {
            await window.__TAURI__?.event?.listen('rooz-window-mode', (e)=>{
                setExpandedMode(Boolean(e.payload));
            });
            await window.__TAURI__?.event?.listen('rooz-window-shown', ()=>{
                document.body.classList.remove('corner-arrival');
                void document.body.offsetWidth;
                document.body.classList.add('corner-arrival');
                window.setTimeout(()=>document.body.classList.remove('corner-arrival'), 520);
            });
            await window.__TAURI__?.event?.listen('rooz-navigate', (e)=>{
                const target = String(e.payload || '');
                if (target === 'voice') void openAssistant(true);
                else if (target === 'ai') void openAssistant(false);
                else if (target === 'settings') {
                    state.modal = 'settings';
                    renderAll();
                } else if ([
                    'today',
                    'tomorrow',
                    'routines',
                    'calendar',
                    'notes',
                    'focus'
                ].includes(target)) navigate(target);
            });
            if (await backend.takeVoicePending()) await openAssistant(true);
        } catch (e) {
            console.warn('AI shortcut listener:', e);
        }
    }
}
initAssistant(root);
void init();
