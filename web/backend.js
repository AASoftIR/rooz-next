export const native = Boolean(window.__TAURI__?.core?.invoke);
const KEY = 'rooz-next-preview-v2';
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const offset = (days) => { const d = new Date(); d.setDate(d.getDate() + days); return iso(d); };
let fallback;
function demo() {
    return {
        tasks: [
            { id: 1, title: 'Plan the week ahead', details: 'A little clarity makes the rest feel lighter.', due_date: offset(0), due_time: '09:30', category: 'Personal', done: true, priority: 1, recurrence: 'none', remind_before: 0, position: 0, alerted_for: '', snooze_until: 0 },
            { id: 2, title: 'Build something beautiful', details: 'One meaningful hour of deep work.', due_date: offset(0), due_time: '11:00', category: 'Work', done: false, priority: 2, recurrence: 'none', remind_before: 15, position: 1, alerted_for: '', snooze_until: 0 },
            { id: 3, title: 'Read 20 pages', details: 'Keep the streak going.', due_date: offset(0), due_time: '17:30', category: 'Personal', done: false, priority: 0, recurrence: 'daily', remind_before: 5, position: 2, alerted_for: '', snooze_until: 0 },
            { id: 4, title: 'Evening reflection', details: 'Capture a small win from today.', due_date: offset(0), due_time: '21:00', category: 'Study', done: false, priority: 0, recurrence: 'none', remind_before: 0, position: 3, alerted_for: '', snooze_until: 0 },
            { id: 5, title: 'Sketch new interface concepts', details: 'Experiment with the details.', due_date: offset(1), due_time: '10:00', category: 'Work', done: false, priority: 1, recurrence: 'none', remind_before: 10, position: 0, alerted_for: '', snooze_until: 0 },
            { id: 6, title: 'A little time outdoors', details: 'Get some fresh air.', due_date: offset(1), due_time: '18:00', category: 'Personal', done: false, priority: 0, recurrence: 'none', remind_before: 0, position: 1, alerted_for: '', snooze_until: 0 },
        ],
        notes: [
            { id: 1, title: 'Ideas worth keeping', body: '<h2>Small sparks, big possibilities ✨</h2><p>Build a <strong>calmer daily rhythm</strong> — one that leaves room for curiosity.</p><ul><li>Make the ordinary feel wonderful.</li><li>Keep it simple, keep it moving.</li></ul>', body_format: 'html', category: 'Ideas', updated_at: Math.floor(Date.now() / 1000) },
            { id: 2, title: 'This week’s intentions', body: '<p>More focus. Fewer tabs. Better breaks.</p>', body_format: 'html', category: 'Personal', updated_at: Math.floor(Date.now() / 1000) - 6000 },
            { id: 3, title: 'A note to future me', body: '<p>Progress does not need to be loud.</p>', body_format: 'html', category: 'Study', updated_at: Math.floor(Date.now() / 1000) - 9000 }
        ],
        settings: { language: 'en', motion: 'true', voice: 'false', accent: 'violet', categories: 'Personal,Work,Study,Ideas' }
    };
}
try {
    const raw = localStorage.getItem(KEY);
    fallback = raw ? JSON.parse(raw) : demo();
}
catch {
    fallback = demo();
}
function persist() { localStorage.setItem(KEY, JSON.stringify(fallback)); }
function nextId(items) { return Math.max(0, ...items.map(x => x.id)) + 1; }
function wrap(fn) { const value = fn(); persist(); return Promise.resolve(structuredClone(value)); }
function invoke(cmd, args = {}) { return window.__TAURI__.core.invoke(cmd, args); }
export const backend = {
    bootstrap: () => native ? invoke('bootstrap') : Promise.resolve(structuredClone(fallback)),
    saveTask: (task) => native ? invoke('save_task', { task }) : wrap(() => {
        let x = { ...task };
        if (x.id) {
            fallback.tasks = fallback.tasks.map(t => t.id === x.id ? x : t);
        }
        else {
            x.id = nextId(fallback.tasks);
            x.position = fallback.tasks.filter(t => t.due_date === x.due_date).length;
            fallback.tasks.push(x);
        }
        return x;
    }),
    toggleTask: (id) => native ? invoke('toggle_task', { id }) : wrap(() => { const t = fallback.tasks.find(t => t.id === id); t.done = !t.done; return t; }),
    deleteTask: (id) => native ? invoke('delete_task', { id }) : wrap(() => { fallback.tasks = fallback.tasks.filter(t => t.id !== id); }),
    reorder: (ids) => native ? invoke('reorder_tasks', { ids }) : wrap(() => { ids.forEach((id, i) => { const t = fallback.tasks.find(t => t.id === id); if (t)
        t.position = i; }); }),
    saveNote: (note) => native ? invoke('save_note', { note }) : wrap(() => {
        let n = { ...note, updated_at: Math.floor(Date.now() / 1000) };
        if (n.id) {
            fallback.notes = fallback.notes.map(x => x.id === n.id ? n : x);
        }
        else {
            n.id = nextId(fallback.notes);
            fallback.notes.unshift(n);
        }
        return n;
    }),
    deleteNote: (id) => native ? invoke('delete_note', { id }) : wrap(() => { fallback.notes = fallback.notes.filter(n => n.id !== id); }),
    saveSetting: (key, value) => native ? invoke('save_setting', { key, value }) : wrap(() => { fallback.settings[key] = value; }),
    snooze: (id, minutes) => native ? invoke('snooze_task', { id, minutes }) : wrap(() => { const t = fallback.tasks.find(t => t.id === id); if (t)
        t.snooze_until = Math.floor(Date.now() / 1000) + minutes * 60; }),
    windowAction: (action) => native ? invoke('window_action', { action }) : Promise.resolve(action === 'expand'),
    openExternal: (url) => native ? invoke('open_external', { url }) : Promise.resolve((window.open(url, '_blank', 'noopener,noreferrer'), undefined)),
};
export function newTask(date = offset(0)) { return { id: 0, title: '', details: '', due_date: date, due_time: '', category: 'Personal', done: false, priority: 0, recurrence: 'none', remind_before: 0, position: 0, alerted_for: '', snooze_until: 0 }; }
export function newNote() { return { id: 0, title: '', body: '', body_format: 'html', category: 'Personal', updated_at: 0 }; }
export { iso, offset };
