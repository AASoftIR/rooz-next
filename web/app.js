import { backend, newTask, newNote, offset, native } from './backend.js';
import { render, icon, esc, today } from './views.js';
import { editorView, setupEditor, leaveEditor, flushEditor, toggleMarkdown, applyLink, cancelLink, downloadNote } from './editor.js';
let snapshot = { tasks: [], notes: [], settings: {} };
const state = { view: 'today', language: 'en', expanded: false, modal: null, editingTask: null, editingNote: null, selectedDate: today(), calendarMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1), categoryFilter: 'All', noteSearch: '', focusDuration: 25, focusEnds: 0, focusRemaining: 25 * 60, focusRunning: false, motion: true, toast: null };
const root = document.querySelector('#app');
let toastTimer = 0;
let activeDrag = 0;
let busy = false;
let commandOpen = false;
function toast(message) { state.toast = message; document.querySelector('.toast')?.remove(); const shell = document.querySelector('.shell'); if (shell)
    shell.insertAdjacentHTML('beforeend', `<div class="toast">${icon('checkCircle', 17)} ${esc(message)}</div>`); window.clearTimeout(toastTimer); toastTimer = window.setTimeout(() => { state.toast = null; document.querySelector('.toast')?.remove(); }, 2600); }
function renderAll() {
    root.innerHTML = render(snapshot, state);
    if (state.editingNote) {
        root.querySelector('.shell')?.insertAdjacentHTML('beforeend', editorView(state.editingNote, state, snapshot));
        setupEditor(snapshot, state, () => { });
    }
    const body = document.body;
    body.classList.toggle('expanded-preview', state.expanded);
    body.classList.toggle('reduced-motion', !state.motion);
    body.setAttribute('lang', state.language);
    if (commandOpen)
        showCommandPalette();
    root.querySelector('[autofocus]')?.focus();
}
function navigate(view) { state.view = view; state.modal = null; state.categoryFilter = 'All'; renderAll(); }
function appDate() { return state.view === 'tomorrow' ? offset(1) : state.view === 'calendar' ? state.selectedDate : today(); }
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
    const idx = snapshot.tasks.findIndex(t => t.id === task.id);
    if (idx >= 0)
        snapshot.tasks[idx] = task;
    else
        snapshot.tasks.push(task);
}
async function updateTask(task) {
    try {
        const result = await backend.saveTask(task);
        setTask(result);
        state.modal = null;
        state.editingTask = null;
        renderAll();
        toast('Task saved');
    }
    catch (error) {
        toast('Could not save task');
        console.error(error);
    }
}
function showTask(task) { state.editingTask = { ...task }; state.modal = 'task'; renderAll(); }
async function loadNote(id) {
    const note = snapshot.notes.find(n => n.id === id);
    if (!note)
        return;
    state.editingNote = { ...note };
    renderAll();
}
async function closeNote() { if (busy)
    return; busy = true; try {
    await leaveEditor();
    state.editingNote = null;
    renderAll();
}
finally {
    busy = false;
} }
async function saveSettings(form) {
    const data = new FormData(form);
    const changes = { language: String(data.get('language') || 'en'), voice: String(data.get('voice') === 'on'), motion: String(data.get('motion') === 'on'), categories: String(data.get('categories') || 'Personal,Work,Study,Ideas') };
    try {
        for (const [key, value] of Object.entries(changes)) {
            await backend.saveSetting(key, value);
            snapshot.settings[key] = value;
        }
        state.language = changes.language === 'fa' ? 'fa' : 'en';
        state.motion = changes.motion === 'true';
        state.modal = null;
        renderAll();
        toast('Preferences saved');
    }
    catch (error) {
        toast('Could not save settings');
        console.error(error);
    }
}
function chooseDate(day) {
    state.selectedDate = day;
    const dt = new Date(`${day}T12:00:00`);
    state.calendarMonth = new Date(dt.getFullYear(), dt.getMonth(), 1);
    if (state.view !== 'calendar')
        state.view = 'calendar';
    renderAll();
}
function shiftMonth(delta) { state.calendarMonth = new Date(state.calendarMonth.getFullYear(), state.calendarMonth.getMonth() + delta, 1); renderAll(); }
function formatTime(seconds) { return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`; }
function focusTick() {
    if (!state.focusRunning)
        return;
    const seconds = Math.max(0, Math.ceil((state.focusEnds - Date.now()) / 1000));
    state.focusRemaining = seconds;
    const label = document.querySelector('#focus-time');
    if (label)
        label.textContent = formatTime(seconds);
    const ring = document.querySelector('.focus-ring');
    if (ring)
        ring.style.setProperty('--progress', String(100 * (1 - seconds / (state.focusDuration * 60))));
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
            osc.onended = () => void ctx.close();
        }
        catch { }
    }
}
function commandResults(query) {
    const q = query.toLocaleLowerCase();
    const entries = [
        { label: 'Go to Today', meta: 'Navigation', action: 'navigate-today' },
        { label: 'Tomorrow', meta: 'Navigation', action: 'navigate-tomorrow' },
        { label: 'Open Calendar', meta: 'Navigation', action: 'navigate-calendar' },
        { label: 'My Notes', meta: 'Navigation', action: 'navigate-notes' },
        { label: 'Start Focus', meta: 'Navigation', action: 'navigate-focus' },
        { label: 'Add a task', meta: 'Create', action: 'add-task' },
        { label: 'Create a note', meta: 'Create', action: 'new-note' },
        ...snapshot.tasks.map(t => ({ label: t.title, meta: `Task · ${t.category}`, action: 'edit-task', id: t.id })),
        ...snapshot.notes.map(n => ({ label: n.title || 'Untitled', meta: `Note · ${n.category}`, action: 'open-note', id: n.id }))
    ];
    return entries.filter(x => `${x.label} ${x.meta}`.toLocaleLowerCase().includes(q)).slice(0, 9);
}
function renderPaletteResults(q) { return commandResults(q).map((r, i) => `<button class="palette-result ${i === 0 ? 'picked' : ''}" data-action="${r.action}" ${r.id ? `data-id="${r.id}"` : ''}><span class="palette-result-icon">${icon(r.action.startsWith('navigate') ? 'arrow' : r.meta.startsWith('Note') ? 'notes' : r.meta.startsWith('Task') ? 'checkCircle' : 'plus', 17)}</span><span><strong>${esc(r.label)}</strong><small>${esc(r.meta)}</small></span><span class="palette-enter">↵</span></button>`).join('') || '<div class="palette-empty">No matches yet.</div>'; }
function showCommandPalette() { commandOpen = true; document.querySelector('#command-overlay')?.remove(); document.querySelector('.shell')?.insertAdjacentHTML('beforeend', `<div id="command-overlay" class="command-scrim" data-action="close-palette"><div class="command-card"><label class="command-search">${icon('search', 20)}<input id="command-input" autocomplete="off" placeholder="Search tasks, notes, actions…" autofocus/><kbd>ESC</kbd></label><div id="command-results">${renderPaletteResults('')}</div><footer>ROOZ COMMAND CENTER <span>↑ ↓ TO NAVIGATE · ENTER TO OPEN</span></footer></div></div>`); document.querySelector('#command-input')?.focus(); }
function hidePalette() { commandOpen = false; document.querySelector('#command-overlay')?.remove(); }
async function handleAction(target) {
    const action = target.dataset.action;
    const id = Number(target.dataset.id || 0);
    if (!action)
        return;
    switch (action) {
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
        case 'view-tomorrow':
            navigate('tomorrow');
            break;
        case 'add-task':
            hidePalette();
            showTask(newTask(appDate()));
            break;
        case 'edit-task':
            hidePalette();
            {
                const t = snapshot.tasks.find(x => x.id === id);
                if (t)
                    showTask(t);
                break;
            }
        case 'toggle-task': {
            try {
                const saved = await backend.toggleTask(id);
                setTask(saved);
                renderAll();
                if (saved.done)
                    toast('Lovely, one less thing ✨');
            }
            catch (err) {
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
            }
            catch (e) {
                toast('Could not snooze reminder');
                console.error(e);
            }
            break;
        case 'delete-task':
            if (confirm('Delete this task permanently?')) {
                await backend.deleteTask(id);
                snapshot.tasks = snapshot.tasks.filter(x => x.id !== id);
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
        case 'previous-month':
            shiftMonth(-1);
            break;
        case 'next-month':
            shiftMonth(1);
            break;
        case 'open-settings':
            state.modal = 'settings';
            renderAll();
            break;
        case 'dismiss-modal':
            if (target.classList.contains('modal-scrim') || target.closest('button')) {
                state.modal = null;
                state.editingTask = null;
                renderAll();
            }
            break;
        case 'toggle-expand': {
            const expanded = !state.expanded;
            try {
                await backend.windowAction(expanded ? 'expand' : 'compact');
                state.expanded = expanded;
                renderAll();
            }
            catch (e) {
                console.warn(e);
                toast('Window resizing unavailable');
            }
            break;
        }
        case 'hide':
            if (native) {
                await backend.windowAction('hide');
            }
            else
                toast('In the desktop app this hides Rooz to its tray');
            break;
        case 'quit-native':
            if (native) {
                await backend.windowAction('quit');
            }
            else
                toast('Quit is available in the desktop app');
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
        case 'delete-note': {
            const noteId = state.editingNote?.id || 0;
            if (confirm('Delete this note permanently?')) {
                if (noteId)
                    await backend.deleteNote(noteId);
                snapshot.notes = snapshot.notes.filter(n => n.id !== noteId);
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
            }
            catch {
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
            }
            else {
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
            if (target.id === 'command-overlay')
                hidePalette();
            break;
    }
}
root.addEventListener('click', event => {
    const target = event.target.closest('[data-action]');
    if (target?.classList.contains('modal-scrim') && event.target !== target)
        return;
    if (target?.classList.contains('command-scrim') && event.target !== target)
        return;
    if (target)
        void handleAction(target);
});
root.addEventListener('submit', event => {
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
    }
    else if (form.id === 'task-form') {
        const data = new FormData(form);
        const task = { ...(state.editingTask || newTask(appDate())) };
        task.title = String(data.get('title') || '').trim();
        task.details = String(data.get('details') || '');
        task.due_date = String(data.get('due_date') || today());
        task.due_time = String(data.get('due_time') || '');
        task.category = String(data.get('category') || 'Personal');
        task.priority = Number(data.get('priority') || 0);
        task.recurrence = String(data.get('recurrence') || 'none');
        task.remind_before = Number(data.get('remind_before') || 0);
        if (task.title)
            void updateTask(task);
    }
    else if (form.id === 'settings-form')
        void saveSettings(form);
});
root.addEventListener('input', event => {
    const input = event.target;
    if (input.id === 'note-search') {
        const selection = input.selectionStart || 0;
        state.noteSearch = input.value;
        renderAll();
        const replacement = document.querySelector('#note-search');
        replacement?.focus();
        replacement?.setSelectionRange(selection, selection);
    }
    else if (input.id === 'command-input') {
        const results = document.querySelector('#command-results');
        if (results)
            results.innerHTML = renderPaletteResults(input.value);
    }
});
// Interaction-driven 3D tilt, not a permanent animation loop.
let glassFrame = 0;
root.addEventListener('pointermove', event => {
    if (!state.motion)
        return;
    const hero = event.target.closest('.progress-hero');
    if (!hero)
        return;
    const rect = hero.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width, y = (event.clientY - rect.top) / rect.height;
    if (glassFrame)
        cancelAnimationFrame(glassFrame);
    glassFrame = requestAnimationFrame(() => {
        hero.style.setProperty('--spot-x', `${Math.round(x * 100)}%`);
        hero.style.setProperty('--spot-y', `${Math.round(y * 100)}%`);
        hero.style.setProperty('--tilt-y', `${((x - .5) * 2.6).toFixed(2)}deg`);
        hero.style.setProperty('--tilt-x', `${((.5 - y) * 2).toFixed(2)}deg`);
    });
});
root.addEventListener('pointerout', event => {
    const hero = event.target.closest('.progress-hero');
    if (hero && !(event.relatedTarget instanceof Node && hero.contains(event.relatedTarget))) {
        hero.style.removeProperty('--tilt-x');
        hero.style.removeProperty('--tilt-y');
    }
});
root.addEventListener('dragstart', event => {
    const item = event.target.closest('.task-row');
    if (!item)
        return;
    activeDrag = Number(item.dataset.taskId || 0);
    item.classList.add('dragging');
    if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', String(activeDrag));
    }
});
root.addEventListener('dragover', event => { const item = event.target.closest('.task-row'); if (item && activeDrag) {
    event.preventDefault();
    document.querySelectorAll('.drop-target').forEach(x => x.classList.remove('drop-target'));
    item.classList.add('drop-target');
} });
root.addEventListener('dragend', () => { activeDrag = 0; document.querySelectorAll('.dragging,.drop-target').forEach(x => x.classList.remove('dragging', 'drop-target')); });
root.addEventListener('drop', event => {
    const item = event.target.closest('.task-row');
    if (!item || !activeDrag)
        return;
    event.preventDefault();
    const before = Number(item.dataset.taskId || 0);
    const date = appDate();
    const subset = snapshot.tasks.filter(t => t.due_date === date).sort((a, b) => a.position - b.position).map(t => t.id);
    const from = subset.indexOf(activeDrag), to = subset.indexOf(before);
    if (from < 0 || to < 0 || from === to)
        return;
    subset.splice(from, 1);
    subset.splice(to, 0, activeDrag);
    subset.forEach((id, pos) => { const t = snapshot.tasks.find(t => t.id === id); if (t)
        t.position = pos; });
    void backend.reorder(subset).catch(error => { console.error(error); toast('Could not reorder'); });
    activeDrag = 0;
    renderAll();
});
document.addEventListener('keydown', event => {
    const target = event.target;
    const editing = target.matches('input,textarea,[contenteditable="true"]');
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's' && state.editingNote) {
        event.preventDefault();
        void flushEditor();
        toast('Note saved');
        return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (state.editingNote) {
            (document.querySelector('[data-format="link"]') || null)?.click();
        }
        else
            showCommandPalette();
        return;
    }
    if (event.key === 'Escape') {
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
        if (native)
            void backend.windowAction('hide');
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
            const items = [...document.querySelectorAll('.palette-result')];
            const i = Math.max(0, items.findIndex(x => x.classList.contains('picked')));
            items[i]?.classList.remove('picked');
            items[(i + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.classList.add('picked');
            event.preventDefault();
            return;
        }
        return;
    }
    if (editing || state.editingNote)
        return;
    if ((event.ctrlKey || event.metaKey) && /^[1-5]$/.test(event.key)) {
        event.preventDefault();
        navigate(['today', 'tomorrow', 'calendar', 'notes', 'focus'][Number(event.key) - 1]);
        return;
    }
    if (event.key === '/' && !event.ctrlKey) {
        event.preventDefault();
        if (state.view === 'notes')
            document.querySelector('#note-search')?.focus();
        else
            document.querySelector('#quick-title')?.focus();
    }
    if (event.key.toLowerCase() === 'n' && !event.ctrlKey) {
        event.preventDefault();
        if (state.view === 'notes') {
            state.editingNote = newNote();
            renderAll();
        }
        else
            showTask(newTask(appDate()));
    }
});
window.setInterval(focusTick, 260);
// Refresh when local calendar date changes after midnight (not every animation frame).
let lastDay = today();
window.setInterval(() => { if (today() !== lastDay) {
    lastDay = today();
    void backend.bootstrap().then(data => { snapshot = data; renderAll(); });
} }, 60_000);
async function init() {
    try {
        snapshot = await backend.bootstrap();
        state.language = snapshot.settings.language === 'fa' ? 'fa' : 'en';
        state.motion = snapshot.settings.motion !== 'false';
    }
    catch (error) {
        console.error(error);
        root.innerHTML = `<section class="fatal-error"><h1>Rooz could not open its database</h1><p>${esc(String(error))}</p></section>`;
        return;
    }
    renderAll();
}
void init();
