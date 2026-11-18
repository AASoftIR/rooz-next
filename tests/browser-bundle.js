const __mods = Object.create(null);
(() => {

const native = Boolean(window.__TAURI__?.core?.invoke);
const KEY = 'rooz-next-preview-v2';
let previewFullscreen = false;
const iso = (d)=>`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const offset = (days)=>{
    const d = new Date();
    d.setDate(d.getDate() + days);
    return iso(d);
};
let fallback;
function demo() {
    return {
        tasks: [
            {
                id: 1,
                title: 'Plan the week ahead',
                details: 'A little clarity makes the rest feel lighter.',
                due_date: offset(0),
                due_time: '09:30',
                category: 'Personal',
                done: true,
                priority: 1,
                recurrence: 'none',
                remind_before: 0,
                position: 0,
                alerted_for: '',
                snooze_until: 0
            },
            {
                id: 2,
                title: 'Build something beautiful',
                details: 'One meaningful hour of deep work.',
                due_date: offset(0),
                due_time: '11:00',
                category: 'Work',
                done: false,
                priority: 2,
                recurrence: 'none',
                remind_before: 15,
                position: 1,
                alerted_for: '',
                snooze_until: 0
            },
            {
                id: 3,
                title: 'Read 20 pages',
                details: 'Keep the streak going.',
                due_date: offset(0),
                due_time: '17:30',
                category: 'Personal',
                done: false,
                priority: 0,
                recurrence: 'daily',
                remind_before: 5,
                position: 2,
                alerted_for: '',
                snooze_until: 0
            },
            {
                id: 4,
                title: 'Evening reflection',
                details: 'Capture a small win from today.',
                due_date: offset(0),
                due_time: '21:00',
                category: 'Study',
                done: false,
                priority: 0,
                recurrence: 'none',
                remind_before: 0,
                position: 3,
                alerted_for: '',
                snooze_until: 0
            },
            {
                id: 5,
                title: 'Sketch new interface concepts',
                details: 'Experiment with the details.',
                due_date: offset(1),
                due_time: '10:00',
                category: 'Work',
                done: false,
                priority: 1,
                recurrence: 'none',
                remind_before: 10,
                position: 0,
                alerted_for: '',
                snooze_until: 0
            },
            {
                id: 6,
                title: 'A little time outdoors',
                details: 'Get some fresh air.',
                due_date: offset(1),
                due_time: '18:00',
                category: 'Personal',
                done: false,
                priority: 0,
                recurrence: 'none',
                remind_before: 0,
                position: 1,
                alerted_for: '',
                snooze_until: 0
            }
        ],
        notes: [
            {
                id: 1,
                title: 'Ideas worth keeping',
                body: '<h2>Small sparks, big possibilities ✨</h2><p>Build a <strong>calmer daily rhythm</strong> — one that leaves room for curiosity.</p><ul><li>Make the ordinary feel wonderful.</li><li>Keep it simple, keep it moving.</li></ul>',
                body_format: 'html',
                category: 'Ideas',
                updated_at: Math.floor(Date.now() / 1000)
            },
            {
                id: 2,
                title: 'This week’s intentions',
                body: '<p>More focus. Fewer tabs. Better breaks.</p>',
                body_format: 'html',
                category: 'Personal',
                updated_at: Math.floor(Date.now() / 1000) - 6000
            },
            {
                id: 3,
                title: 'A note to future me',
                body: '<p>Progress does not need to be loud.</p>',
                body_format: 'html',
                category: 'Study',
                updated_at: Math.floor(Date.now() / 1000) - 9000
            }
        ],
        routines: [
            {
                id: 1,
                title: 'Morning movement',
                details: 'A relaxed start to the day',
                category: 'Health',
                schedule_kind: 'daily',
                weekdays_mask: 127,
                interval_days: 1,
                month_day: 1,
                start_date: offset(-9),
                due_time: '08:15',
                remind_before: 5,
                enabled: true,
                created_at: 0,
                updated_at: 0,
                completion_count: 0,
                rule_json: '{}'
            },
            {
                id: 2,
                title: 'Grocery run',
                details: 'Keep a reusable list of things to buy',
                category: 'Errands',
                schedule_kind: 'anytime',
                weekdays_mask: 127,
                interval_days: 1,
                month_day: 1,
                start_date: offset(-4),
                due_time: '',
                remind_before: 0,
                enabled: true,
                created_at: 0,
                updated_at: 0,
                completion_count: 0,
                rule_json: '{}'
            },
            {
                id: 3,
                title: 'Review the weekly plan',
                details: 'Clear inbox and prepare next steps',
                category: 'Personal',
                schedule_kind: 'weekly',
                weekdays_mask: 1,
                interval_days: 1,
                month_day: 1,
                start_date: offset(-20),
                due_time: '18:00',
                remind_before: 15,
                enabled: true,
                created_at: 0,
                updated_at: 0,
                completion_count: 0,
                rule_json: '{}'
            },
            {
                id: 4,
                title: 'Deep clean the desk',
                details: 'Refresh the workspace',
                category: 'Home',
                schedule_kind: 'interval',
                weekdays_mask: 127,
                interval_days: 3,
                month_day: 1,
                start_date: offset(-5),
                due_time: '',
                remind_before: 0,
                enabled: true,
                created_at: 0,
                updated_at: 0,
                completion_count: 0,
                rule_json: '{}'
            }
        ],
        routine_completions: [],
        routine_items: [],
        routine_item_completions: [],
        settings: {
            language: 'en',
            motion: 'true',
            voice: 'false',
            accent: 'violet',
            categories: 'Personal,Work,Study,Ideas'
        }
    };
}
try {
    const raw = localStorage.getItem(KEY);
    fallback = raw ? JSON.parse(raw) : demo();
    fallback.routines ??= [];
    fallback.routine_completions ??= [];
    fallback.routine_items ??= [];
    fallback.routine_item_completions ??= [];
    fallback.routines.forEach((r)=>{
        r.rule_json ??= '{}';
        r.completion_count ??= fallback.routine_completions.filter((c)=>c.routine_id === r.id).length;
    });
} catch  {
    fallback = demo();
}
function persist() {
    localStorage.setItem(KEY, JSON.stringify(fallback));
}
function nextId(items) {
    return Math.max(0, ...items.map((x)=>x.id)) + 1;
}
function wrap(fn) {
    const value = fn();
    persist();
    return Promise.resolve(structuredClone(value));
}
function invoke(cmd, args = {}) {
    return window.__TAURI__.core.invoke(cmd, args);
}
const backend = {
    bootstrap: ()=>native ? invoke('bootstrap') : Promise.resolve(structuredClone(fallback)),
    saveTask: (task)=>native ? invoke('save_task', {
            task
        }) : wrap(()=>{
            let x = {
                ...task
            };
            if (x.id) {
                fallback.tasks = fallback.tasks.map((t)=>t.id === x.id ? x : t);
            } else {
                x.id = nextId(fallback.tasks);
                x.position = fallback.tasks.filter((t)=>t.due_date === x.due_date).length;
                fallback.tasks.push(x);
            }
            return x;
        }),
    toggleTask: (id)=>native ? invoke('toggle_task', {
            id
        }) : wrap(()=>{
            const t = fallback.tasks.find((t)=>t.id === id);
            t.done = !t.done;
            return t;
        }),
    deleteTask: (id)=>native ? invoke('delete_task', {
            id
        }) : wrap(()=>{
            fallback.tasks = fallback.tasks.filter((t)=>t.id !== id);
        }),
    reorder: (ids)=>native ? invoke('reorder_tasks', {
            ids
        }) : wrap(()=>{
            ids.forEach((id, i)=>{
                const t = fallback.tasks.find((t)=>t.id === id);
                if (t) t.position = i;
            });
        }),
    saveNote: (note)=>native ? invoke('save_note', {
            note
        }) : wrap(()=>{
            let n = {
                ...note,
                updated_at: Math.floor(Date.now() / 1000)
            };
            if (n.id) {
                fallback.notes = fallback.notes.map((x)=>x.id === n.id ? n : x);
            } else {
                n.id = nextId(fallback.notes);
                fallback.notes.unshift(n);
            }
            return n;
        }),
    deleteNote: (id)=>native ? invoke('delete_note', {
            id
        }) : wrap(()=>{
            fallback.notes = fallback.notes.filter((n)=>n.id !== id);
        }),
    saveRoutine: (routine)=>native ? invoke('save_routine', {
            routine
        }) : wrap(()=>{
            if (!routine.title.trim()) throw Error('A routine needs a title');
            const r = {
                ...routine,
                updated_at: Math.floor(Date.now() / 1000)
            };
            if (r.id) {
                const i = fallback.routines.findIndex((x)=>x.id === r.id);
                if (i < 0) throw Error('Routine missing');
                fallback.routines[i] = r;
            } else {
                r.id = nextId(fallback.routines);
                r.created_at = r.updated_at;
                fallback.routines.unshift(r);
            }
            return r;
        }),
    saveRoutinePlan: (routine, items)=>native ? invoke('save_routine_plan', {
            routine,
            items
        }) : wrap(()=>{
            if (!routine.title.trim()) throw Error('Routine needs a title');
            const r = {
                ...routine,
                updated_at: Math.floor(Date.now() / 1000)
            };
            if (r.id) {
                const idx = fallback.routines.findIndex((x)=>x.id === r.id);
                if (idx < 0) throw Error('Routine missing');
                fallback.routines[idx] = r;
            } else {
                r.id = nextId(fallback.routines);
                r.created_at = r.updated_at;
                fallback.routines.unshift(r);
            }
            const seen = new Set();
            let maxId = Math.max(0, ...fallback.routine_items.map((x)=>x.id));
            const next = items.map((item, i)=>{
                const x = {
                    ...item,
                    id: item.id || ++maxId,
                    routine_id: r.id,
                    position: i
                };
                seen.add(x.id);
                return x;
            });
            fallback.routine_items = fallback.routine_items.filter((x)=>x.routine_id !== r.id || seen.has(x.id));
            for (const item of next){
                const index = fallback.routine_items.findIndex((x)=>x.id === item.id);
                if (index >= 0) fallback.routine_items[index] = item;
                else fallback.routine_items.push(item);
            }
            return {
                routine: r,
                items: next
            };
        }),
    toggleRoutineItem: (itemId, date)=>native ? invoke('toggle_routine_item', {
            itemId,
            date
        }) : wrap(()=>{
            const item = fallback.routine_items.find((x)=>x.id === itemId);
            if (!item) throw Error('Item not found');
            const existing = fallback.routine_item_completions.findIndex((x)=>x.item_id === itemId && x.occurrence_date === date);
            const checked = existing < 0;
            if (checked) fallback.routine_item_completions.push({
                id: nextId(fallback.routine_item_completions),
                item_id: itemId,
                occurrence_date: date,
                completed_at: Date.now() / 1000 | 0
            });
            else fallback.routine_item_completions.splice(existing, 1);
            const weekday = (new Date(date + 'T12:00:00Z').getUTCDay() + 6) % 7;
            const needed = fallback.routine_items.filter((x)=>x.routine_id === item.routine_id && x.required && x.weekdays_mask & 1 << weekday);
            const whole_complete = needed.length > 0 && needed.every((x)=>fallback.routine_item_completions.some((c)=>c.item_id === x.id && c.occurrence_date === date));
            const existingWhole = fallback.routine_completions.findIndex((c)=>c.routine_id === item.routine_id && c.occurrence_date === date);
            if (whole_complete && existingWhole < 0) {
                fallback.routine_completions.push({
                    id: nextId(fallback.routine_completions),
                    routine_id: item.routine_id,
                    occurrence_date: date,
                    completed_at: Date.now() / 1000 | 0
                });
                const r = fallback.routines.find((x)=>x.id === item.routine_id);
                if (r) r.completion_count++;
            } else if (!whole_complete && existingWhole >= 0) {
                fallback.routine_completions.splice(existingWhole, 1);
                const r = fallback.routines.find((x)=>x.id === item.routine_id);
                if (r) r.completion_count = Math.max(0, r.completion_count - 1);
            }
            return {
                checked,
                whole_complete
            };
        }),
    setRoutineEnabled: (id, enabled)=>native ? invoke('set_routine_enabled', {
            id,
            enabled
        }) : wrap(()=>{
            const r = fallback.routines.find((x)=>x.id === id);
            if (!r) throw Error('Routine missing');
            r.enabled = enabled;
            return r;
        }),
    deleteRoutine: (id)=>native ? invoke('delete_routine', {
            id
        }) : wrap(()=>{
            fallback.routines = fallback.routines.filter((r)=>r.id !== id);
            fallback.routine_completions = fallback.routine_completions.filter((c)=>c.routine_id !== id);
            const gone = fallback.routine_items.filter((x)=>x.routine_id === id).map((x)=>x.id);
            fallback.routine_item_completions = fallback.routine_item_completions.filter((x)=>!gone.includes(x.item_id));
            fallback.routine_items = fallback.routine_items.filter((x)=>x.routine_id !== id);
        }),
    completeRoutine: (id, date)=>native ? invoke('complete_routine', {
            id,
            date
        }) : wrap(()=>{
            const exists = fallback.routine_completions.find((c)=>c.routine_id === id && c.occurrence_date === date);
            if (exists) return exists;
            const c = {
                id: nextId(fallback.routine_completions),
                routine_id: id,
                occurrence_date: date,
                completed_at: Math.floor(Date.now() / 1000)
            };
            fallback.routine_completions.unshift(c);
            const r = fallback.routines.find((r)=>r.id === id);
            if (r) r.completion_count++;
            return c;
        }),
    undoRoutine: (id, date)=>native ? invoke('undo_routine', {
            id,
            date
        }) : wrap(()=>{
            const had = fallback.routine_completions.some((c)=>c.routine_id === id && c.occurrence_date === date);
            fallback.routine_completions = fallback.routine_completions.filter((c)=>!(c.routine_id === id && c.occurrence_date === date));
            const r = fallback.routines.find((r)=>r.id === id);
            if (r && had) r.completion_count = Math.max(0, r.completion_count - 1);
        }),
    saveSetting: (key, value)=>native ? invoke('save_setting', {
            key,
            value
        }) : wrap(()=>{
            fallback.settings[key] = value;
        }),
    snooze: (id, minutes)=>native ? invoke('snooze_task', {
            id,
            minutes
        }) : wrap(()=>{
            const t = fallback.tasks.find((t)=>t.id === id);
            if (t) t.snooze_until = Math.floor(Date.now() / 1000) + minutes * 60;
        }),
    windowAction: (action)=>native ? invoke('window_action', {
            action
        }) : Promise.resolve((()=>{
            if (action === 'expand') previewFullscreen = true;
            else if (action === 'fullscreen') previewFullscreen = !previewFullscreen;
            else if (action === 'compact') previewFullscreen = false;
            return previewFullscreen;
        })()),
    aiStatus: ()=>native ? invoke('ai_status') : Promise.resolve({
            has_keys: {
                openrouter: false,
                groq: false,
                nvidia: false
            },
            has_whisper: false,
            has_vosk: false,
            local_stt_ready: false,
            stt_model_path: null,
            local_tts_ready: false,
            local_tts_en_ready: false,
            local_tts_fa_ready: false,
            tts_model_path: ''
        }),
    aiSetKey: (provider, key)=>native ? invoke('ai_set_key', {
            provider,
            key
        }) : Promise.reject(Error('API keys can only be stored in the installed desktop app')),
    aiModels: (provider)=>native ? invoke('ai_models', {
            provider
        }) : Promise.reject(Error('Connect in installed desktop app')),
    aiChat: (message, voice = false)=>native ? invoke('ai_chat', {
            message,
            voice
        }) : Promise.reject(Error('AI requests require the desktop backend and a provider API key')),
    aiHistory: ()=>native ? invoke('ai_history') : Promise.resolve([]),
    aiSearch: (query)=>native ? invoke('ai_search', {
            query
        }) : Promise.resolve([]),
    warmLocalVoice: ()=>native ? invoke('warm_local_voice') : Promise.resolve(),
    captureLocalSpeech: ()=>native ? invoke('capture_local_speech') : Promise.reject(Error('Offline voice capture requires the installed Rooz AppImage')),
    speakLocal: (text, language)=>native ? invoke('speak_local', {
            text,
            language
        }) : Promise.resolve(),
    stopLocalSpeech: ()=>native ? invoke('stop_local_speech') : Promise.resolve(),
    cancelNativeVoice: ()=>native ? invoke('cancel_native_voice') : Promise.resolve(),
    takeVoicePending: ()=>native ? invoke('take_voice_pending') : Promise.resolve(false),
    openExternal: (url)=>native ? invoke('open_external', {
            url
        }) : Promise.resolve((window.open(url, '_blank', 'noopener,noreferrer'), undefined))
};
function newTask(date = offset(0)) {
    return {
        id: 0,
        title: '',
        details: '',
        due_date: date,
        due_time: '',
        category: 'Personal',
        done: false,
        priority: 0,
        recurrence: 'none',
        remind_before: 0,
        position: 0,
        alerted_for: '',
        snooze_until: 0
    };
}
function newNote() {
    return {
        id: 0,
        title: '',
        body: '',
        body_format: 'html',
        category: 'Personal',
        updated_at: 0
    };
}


__mods.backend = {native,backend,newTask,newNote,iso,offset};
})();
(() => {

const persianParts = new Intl.DateTimeFormat('fa-IR-u-ca-persian-nu-latn', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    timeZone: 'UTC'
});
const persianName = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
});
const cache = new Map();
function solarParts(day) {
    let item = cache.get(day);
    if (item) return item;
    const parts = persianParts.formatToParts(new Date(day + 'T12:00:00Z'));
    const get = (name)=>Number(parts.find((p)=>p.type === name)?.value || 0);
    item = {
        year: get('year'),
        month: get('month'),
        day: get('day')
    };
    if (cache.size > 1500) cache.clear();
    cache.set(day, item);
    return item;
}
function currentMonthStart(anchor, lang) {
    const d = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate(), 12);
    if (lang === 'en') return new Date(d.getFullYear(), d.getMonth(), 1, 12);
    for(let n = 0; n < 32; n++){
        const key = toISO(d);
        if (solarParts(key).day === 1) return d;
        d.setDate(d.getDate() - 1);
    }
    return d;
}
function toISO(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function shiftCalendarMonth(anchor, delta, lang) {
    if (lang === 'en') return new Date(anchor.getFullYear(), anchor.getMonth() + delta, 1, 12);
    let d = currentMonthStart(anchor, 'fa');
    for(let i = 0; i < Math.abs(delta); i++){
        if (delta > 0) {
            d.setDate(d.getDate() + 33);
            d = currentMonthStart(d, 'fa');
        } else {
            d.setDate(d.getDate() - 1);
            d = currentMonthStart(d, 'fa');
        }
    }
    return d;
}
function dateDisplay(date, lang, options) {
    return new Intl.DateTimeFormat(lang === 'fa' ? 'fa-IR-u-ca-persian' : 'en-US', options).format(new Date(date + 'T12:00:00'));
}
function solarToISO(value) {
    const m = value.trim().replace(/[۰-۹]/g, (c)=>String(c.charCodeAt(0) - 1776)).replace(/[٠-٩]/g, (c)=>String(c.charCodeAt(0) - 1632)).match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
    if (!m) return null;
    const year = Number(m[1]), month = Number(m[2]), day = Number(m[3]);
    if (year < 1200 || year > 1500 || month < 1 || month > 12 || day < 1 || day > 31) return null;
    const start = new Date(year + 621, 2, 15, 12);
    for(let i = 0; i < 380; i++){
        const key = toISO(start), p = solarParts(key);
        if (p.year === year && p.month === month && p.day === day) return key;
        start.setDate(start.getDate() + 1);
    }
    return null;
}
function isoToSolar(day) {
    if (!/^\d{4}-\d\d-\d\d$/.test(day)) return '';
    const p = solarParts(day);
    return `${p.year}/${String(p.month).padStart(2, '0')}/${String(p.day).padStart(2, '0')}`;
}

__mods.solar = {persianName,solarParts,currentMonthStart,toISO,shiftCalendarMonth,dateDisplay,solarToISO,isoToSolar};
})();
(() => {
const {solarParts} = __mods.solar;

const defaultRule = ()=>({
        calendar: 'gregorian',
        parity: 'all',
        day_class: 'all',
        weekend_days: [
            4
        ],
        months: [],
        month_days: [],
        include_dates: [],
        exclude_dates: []
    });
const ruleCache = new WeakMap();
function getRule(r) {
    const existing = ruleCache.get(r);
    if (existing) return existing;
    let parsed;
    try {
        const obj = JSON.parse(r.rule_json || '{}');
        parsed = {
            ...defaultRule(),
            ...obj
        };
    } catch  {
        parsed = defaultRule();
    }
    ruleCache.set(r, parsed);
    return parsed;
}
function ruleMatches(r, day) {
    const rule = getRule(r), weekday = (asDate(day).getUTCDay() + 6) % 7;
    if (rule.exclude_dates?.includes(day)) return false;
    if (rule.include_dates?.includes(day)) return true;
    const parts = rule.calendar === 'jalali' ? solarParts(day) : {
        month: asDate(day).getUTCMonth() + 1,
        day: asDate(day).getUTCDate()
    };
    if (rule.months?.length && !rule.months.includes(parts.month)) return false;
    if (rule.month_days?.length && !rule.month_days.includes(parts.day)) return false;
    if (rule.parity === 'odd' && parts.day % 2 !== 1) return false;
    if (rule.parity === 'even' && parts.day % 2 !== 0) return false;
    const weekend = (rule.weekend_days?.length ? rule.weekend_days : [
        4
    ]).includes(weekday);
    if (rule.day_class === 'weekend' && !weekend) return false;
    if (rule.day_class === 'workday' && weekend) return false;
    return true;
}
function asDate(day) {
    return new Date(`${day}T12:00:00Z`);
}
function dayKey(date) {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}
function shiftDay(day, step) {
    const d = asDate(day);
    d.setUTCDate(d.getUTCDate() + step);
    return dayKey(d);
}
function validDay(day) {
    return /^\d{4}-\d\d-\d\d$/.test(day) && dayKey(asDate(day)) === day;
}
const recurrenceCache = new WeakMap();
function occursOn(r, day) {
    let cache = recurrenceCache.get(r);
    if (cache?.has(day)) return cache.get(day);
    const result = computeOccurrence(r, day);
    if (!cache) {
        cache = new Map();
        recurrenceCache.set(r, cache);
    }
    if (cache.size > 500) cache.clear();
    cache.set(day, result);
    return result;
}
function computeOccurrence(r, day) {
    if (!validDay(day) || !validDay(r.start_date) || day < r.start_date) return false;
    if (getRule(r).exclude_dates.includes(day)) return false;
    if (getRule(r).include_dates.includes(day)) return true;
    if (!ruleMatches(r, day)) return false;
    const d = asDate(day), start = asDate(r.start_date);
    switch(r.schedule_kind){
        case 'daily':
            return true;
        case 'weekly':
            {
                const mondayIndex = (d.getUTCDay() + 6) % 7;
                return (r.weekdays_mask & 1 << mondayIndex) !== 0;
            }
        case 'interval':
            {
                const distance = Math.round((d.getTime() - start.getTime()) / 86400000);
                return distance % Math.max(1, r.interval_days) === 0;
            }
        case 'monthly':
            {
                if (getRule(r).calendar === 'jalali') {
                    const current = solarParts(day);
                    const next = solarParts(shiftDay(day, 1));
                    return current.day === r.month_day || next.month !== current.month && next.day === 1 && current.day < r.month_day;
                }
                const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
                return d.getUTCDate() === Math.min(r.month_day, last);
            }
        default:
            return false;
    }
}
function nextOccurrence(r, from) {
    if (r.schedule_kind === 'anytime') return null;
    let d = from > r.start_date ? from : r.start_date;
    for(let i = 0; i < 370; i++, d = shiftDay(d, 1)){
        if (occursOn(r, d)) return d;
    }
    return null;
}
function completedOn(history, id, date) {
    return history.some((x)=>x.routine_id === id && x.occurrence_date === date);
}
function routineNext(r, history, today) {
    if (!r.enabled) return null;
    return nextOccurrence(r, completedOn(history, r.id, today) ? shiftDay(today, 1) : today);
}
function scheduleLabel(r, lang) {
    const fa = lang === 'fa';
    switch(r.schedule_kind){
        case 'anytime':
            return fa ? 'هر زمان که لازم شد' : 'Whenever needed';
        case 'daily':
            {
                const rules = getRule(r);
                if (rules.parity !== 'all') return rules.parity === 'odd' ? fa ? 'روزهای فرد' : 'Odd dates' : fa ? 'روزهای زوج' : 'Even dates';
                if (rules.day_class !== 'all') return rules.day_class === 'weekend' ? fa ? 'آخر هفته' : 'Weekends' : fa ? 'روزهای کاری' : 'Workdays';
                return fa ? 'هر روز' : 'Every day';
            }
        case 'weekly':
            {
                const labels = fa ? [
                    'د',
                    'س',
                    'چ',
                    'پ',
                    'ج',
                    'ش',
                    'ی'
                ] : [
                    'Mon',
                    'Tue',
                    'Wed',
                    'Thu',
                    'Fri',
                    'Sat',
                    'Sun'
                ];
                return labels.filter((_, i)=>r.weekdays_mask & 1 << i).join(' · ') || (fa ? 'هفتگی' : 'Weekly');
            }
        case 'interval':
            return fa ? `هر ${r.interval_days} روز` : `Every ${r.interval_days} days`;
        case 'monthly':
            return fa ? `روز ${r.month_day} هر ماه` : `Day ${r.month_day} each month`;
    }
}
function routineDraft(today) {
    return {
        id: 0,
        title: '',
        details: '',
        category: 'Personal',
        schedule_kind: 'weekly',
        weekdays_mask: 31,
        interval_days: 3,
        month_day: 1,
        start_date: today,
        due_time: '',
        remind_before: 0,
        enabled: true,
        created_at: 0,
        updated_at: 0,
        completion_count: 0,
        rule_json: '{}'
    };
}

__mods.routines = {defaultRule,getRule,ruleMatches,asDate,dayKey,shiftDay,validDay,occursOn,nextOccurrence,completedOn,routineNext,scheduleLabel,routineDraft};
})();
(() => {
const {routineNext, completedOn, scheduleLabel, occursOn, getRule, shiftDay} = __mods.routines;
const {solarParts, persianName, currentMonthStart, toISO, isoToSolar} = __mods.solar;
const {iso, offset} = __mods.backend;



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
function icon(name, size = 19, cls = '') {
    return `<svg class="icon ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.sparkles}</svg>`;
}
function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c)=>({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        })[c]);
}
function strip(s) {
    return s.replace(/<[^>]*>/g, ' ').replace(/[#*`_]/g, ' ').replace(/\s+/g, ' ').trim();
}
function categories(snapshot) {
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
function t(k, s) {
    return words[k]?.[s.language === 'fa' ? 1 : 0] || k;
}
const today = ()=>iso(new Date());
function dayLabel(d, language, opts = {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
}) {
    const date = new Date(d + 'T12:00:00');
    return new Intl.DateTimeFormat(language === 'fa' ? 'fa-IR-u-ca-persian' : 'en-US', opts).format(date);
}
function greeting(s) {
    const hour = new Date().getHours();
    return s.language === 'fa' ? hour < 12 ? 'صبح بخیر' : hour < 18 ? 'عصر بخیر' : 'شب بخیر' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
}
function categoryIcon(category) {
    return category.toLowerCase() === 'work' ? 'zap' : category.toLowerCase() === 'study' ? 'notes' : category.toLowerCase() === 'ideas' ? 'sparkles' : 'flower';
}
function taskCard(task, s, draggable = true) {
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
function miniCalendar(snapshot, s, month = s.calendarMonth, small = false) {
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
function renderNoteCards(snapshot, s) {
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
function routineChecklistEditorItem(item, s) {
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
    return `<div class="checklist-edit-row" data-item-id="${item.id}"><div class="checklist-main-line">
 <span class="checklist-item-grip" draggable="true" title="Drag to reorder">${icon('grip', 15)}</span>
 <input class="checklist-item-title" name="checklist_title" maxlength="250" placeholder="${fa ? 'مورد جدید...' : 'Checklist item…'}" value="${esc(item.title)}" aria-label="${fa ? 'عنوان مورد' : 'Item title'}"/>
 <label class="checklist-required" title="${fa ? 'لازم برای تکمیل خودکار' : 'Required to finish routine'}"><input type="checkbox" name="checklist_required" ${item.required ? 'checked' : ''}/><span>${fa ? 'ضروری' : 'Required'}</span></label>
 <button type="button" class="checklist-remove" data-action="remove-routine-item" title="${fa ? 'حذف مورد' : 'Remove item'}">${icon('x', 15)}</button></div>
 <input class="checklist-item-detail" name="checklist_details" maxlength="2000" placeholder="${fa ? 'جزئیات، لینک یا راهنما (اختیاری)' : 'Optional instructions, notes or link'}" value="${esc(item.details || '')}"/>
 <details class="checklist-item-days"><summary>${fa ? 'روزهای این مورد' : 'Days for this item'} · ${item.weekdays_mask === 127 ? fa ? 'همه' : 'All' : dayLabels.filter((_, i)=>item.weekdays_mask & 1 << i).join(' · ')}</summary>
 <div class="weekday-picks">${dayLabels.map((label, i)=>`<label class="weekday-pick"><input type="checkbox" name="item_weekday_${i}" ${item.weekdays_mask & 1 << i ? 'checked' : ''}/><span>${label}</span></label>`).join('')}</div></details></div>`;
}
function itemChecklist(r, s, snapshot, date, due) {
    const weekday = (new Date(date + 'T12:00:00Z').getUTCDay() + 6) % 7;
    const list = snapshot.routine_items.filter((x)=>x.routine_id === r.id && !!(x.weekdays_mask & 1 << weekday)).sort((a, b)=>a.position - b.position);
    if (!list.length) return '';
    const done = new Set(snapshot.routine_item_completions.filter((x)=>x.occurrence_date === date).map((x)=>x.item_id));
    const finished = list.filter((x)=>done.has(x.id)).length;
    return `<div class="routine-checklist"><div class="routine-checklist-heading"><span>${s.language === 'fa' ? 'چک‌لیست' : 'Checklist'} · ${finished}/${list.length}</span><div class="mini-progress"><i style="width:${Math.round(finished / list.length * 100)}%"></i></div></div>
 ${list.map((x)=>`<button type="button" class="routine-checklist-row ${done.has(x.id) ? 'is-done' : ''}" data-action="toggle-routine-item" data-id="${x.id}" data-date="${date}" ${!due ? 'disabled' : ''} aria-pressed="${done.has(x.id)}"><span class="routine-item-box">${done.has(x.id) ? icon('check', 14) : ''}</span><span class="routine-item-content"><strong>${esc(x.title)}</strong>${x.details ? `<small>${esc(x.details)}</small>` : ''}</span>${!x.required ? `<small>${s.language === 'fa' ? 'اختیاری' : 'Optional'}</small>` : ''}</button>`).join('')}</div>`;
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
function renderRoutineResults(snapshot, s, date = today()) {
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
  <section class="routine-checklist-editor"><div class="checklist-editor-head"><div><strong>${icon('list', 18)} ${fa ? 'چک‌لیست این برنامه' : 'Routine checklist'}</strong><small>${fa ? 'هر مورد جداگانه قابل تکمیل است؛ می‌توانید روزهای متفاوت تعیین کنید.' : 'Each item is independently checkable; choose its weekdays.'}</small></div><button type="button" class="checklist-add" data-action="add-routine-item">${icon('plus', 16)} ${fa ? 'مورد جدید' : 'Add item'}</button></div>
  <div id="routine-checklist-editor" class="checklist-editor-items">${snapshot.routine_items.filter((item)=>item.routine_id === r.id).sort((a, b)=>a.position - b.position).map((item)=>routineChecklistEditorItem(item, s)).join('')}</div>
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
 <div class="setting-item"><span class="setting-icon">${icon('volume', 19)}</span><div><strong>${t('voice', s)}</strong><small>Uses spd-say on Linux</small></div><label class="switch"><input type="checkbox" name="voice" ${snapshot.settings.voice === 'true' ? 'checked' : ''}/><span></span></label></div>
 <div class="setting-item"><span class="setting-icon">${icon('sparkles', 19)}</span><div><strong>${t('motion', s)}</strong><small>Respect reduced motion</small></div><label class="switch"><input type="checkbox" name="motion" ${s.motion ? 'checked' : ''}/><span></span></label></div>
 <label class="field categories-field"><span>${t('categories', s)}</span><small>${t('categoriesHint', s)}</small><input name="categories" maxlength="500" value="${esc(snapshot.settings.categories || 'Personal,Work,Study,Ideas')}"/></label>
 <div class="setting-tip">${icon('info', 18)} <span>Everything stays on this computer. Existing Rooz v0.1 notes and tasks remain in the same SQLite database when launched natively.</span></div>
 <div class="setting-tip">${icon('keyboard', 18)}<span>${t('shortcuts', s)}</span></div>
 <div class="dialog-actions"><button type="button" class="subtle-danger" data-action="quit-native">${icon('x', 16)} Quit entirely</button><button class="primary-button" type="submit">${icon('check', 17)} ${t('save', s)}</button></div></form></div>`;
}
function render(snapshot, s) {
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

__mods.views = {icon,esc,strip,categories,t,today,dayLabel,greeting,taskCard,miniCalendar,renderNoteCards,routineChecklistEditorItem,renderRoutineResults,render};
})();
(() => {
const {backend} = __mods.backend;
const {icon, esc, categories, t} = __mods.views;


const safeUrl = (x)=>{
    try {
        const u = new URL(x);
        return [
            'https:',
            'http:'
        ].includes(u.protocol) ? u.toString() : '';
    } catch  {
        return '';
    }
};
function sanitizedHTML(raw) {
    const root = document.createElement('div');
    root.innerHTML = raw;
    const allowed = new Set([
        'P',
        'BR',
        'STRONG',
        'B',
        'EM',
        'I',
        'U',
        'S',
        'MARK',
        'H1',
        'H2',
        'H3',
        'UL',
        'OL',
        'LI',
        'BLOCKQUOTE',
        'PRE',
        'CODE',
        'A',
        'DIV',
        'SPAN',
        'HR'
    ]);
    const blocked = new Set([
        'SCRIPT',
        'STYLE',
        'IFRAME',
        'OBJECT',
        'EMBED',
        'SVG',
        'FORM',
        'VIDEO',
        'AUDIO',
        'IMG',
        'META',
        'LINK'
    ]);
    function walk(parent) {
        for (const child of Array.from(parent.children)){
            if (blocked.has(child.tagName)) {
                child.remove();
                continue;
            }
            if (!allowed.has(child.tagName)) {
                child.replaceWith(document.createTextNode(child.textContent || ''));
                continue;
            }
            for (const a of Array.from(child.attributes)){
                if (a.name === 'href' && child.tagName === 'A') {
                    const ok = safeUrl(a.value);
                    if (ok) {
                        child.setAttribute('href', ok);
                        child.setAttribute('rel', 'noreferrer noopener');
                    } else {
                        child.removeAttribute('href');
                    }
                } else if (a.name === 'style' && child.tagName === 'SPAN') {
                    const value = a.value;
                    if (/^\s*background-color:\s*(#[\da-fA-F]{3,8}|rgb\([\d\s,.%]+\))\s*;?\s*$/.test(value)) {} else child.removeAttribute('style');
                } else child.removeAttribute(a.name);
            }
            walk(child);
        }
    }
    walk(root);
    return root.innerHTML;
}
function inlineMd(s) {
    return esc(s).replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_match, name, url)=>`<a href="${esc(url)}" target="_blank" rel="noreferrer noopener">${name}</a>`).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>').replace(/`([^`]+)`/g, '<code>$1</code>');
}
function fromMarkdown(source) {
    const lines = source.split(/\r?\n/);
    let html = '';
    let list = '';
    function close() {
        if (list) {
            html += `</${list}>`;
            list = '';
        }
    }
    for (const line of lines){
        if (/^\s*[-*] /.test(line)) {
            if (list !== 'ul') {
                close();
                html += '<ul>';
                list = 'ul';
            }
            html += `<li>${inlineMd(line.replace(/^\s*[-*] /, ''))}</li>`;
            continue;
        }
        if (/^\s*\d+\. /.test(line)) {
            if (list !== 'ol') {
                close();
                html += '<ol>';
                list = 'ol';
            }
            html += `<li>${inlineMd(line.replace(/^\s*\d+\. /, ''))}</li>`;
            continue;
        }
        close();
        if (/^### /.test(line)) html += `<h3>${inlineMd(line.slice(4))}</h3>`;
        else if (/^## /.test(line)) html += `<h2>${inlineMd(line.slice(3))}</h2>`;
        else if (/^# /.test(line)) html += `<h1>${inlineMd(line.slice(2))}</h1>`;
        else if (/^> /.test(line)) html += `<blockquote>${inlineMd(line.slice(2))}</blockquote>`;
        else if (line.trim()) html += `<p>${inlineMd(line)}</p>`;
        else html += '<p><br></p>';
    }
    close();
    return sanitizedHTML(html);
}
function toMarkdown(html) {
    const root = document.createElement('div');
    root.innerHTML = sanitizedHTML(html);
    function translate(node) {
        if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
        if (!(node instanceof HTMLElement)) return '';
        const content = Array.from(node.childNodes).map(translate).join('');
        switch(node.tagName){
            case 'H1':
                return '# ' + content + '\n\n';
            case 'H2':
                return '## ' + content + '\n\n';
            case 'H3':
                return '### ' + content + '\n\n';
            case 'P':
            case 'DIV':
                return content + '\n\n';
            case 'BR':
                return '\n';
            case 'B':
            case 'STRONG':
                return `**${content}**`;
            case 'EM':
            case 'I':
                return `*${content}*`;
            case 'CODE':
                return '`' + content + '`';
            case 'A':
                return `[${content}](${node.getAttribute('href') || ''})`;
            case 'LI':
                return '- ' + content + '\n';
            case 'UL':
            case 'OL':
                return content + '\n';
            case 'BLOCKQUOTE':
                return '> ' + content + '\n\n';
            default:
                return content;
        }
    }
    return Array.from(root.childNodes).map(translate).join('').replace(/\n{3,}/g, '\n\n').trim();
}
function editorView(note, s, snapshot) {
    return `<section class="editor-screen" id="note-editor" aria-label="Note editor">
   <div class="editor-header"><button class="icon-button editor-back" data-action="close-note" title="Back">${icon('chevronLeft', 20)}</button><div class="editor-head-center"><span class="eyebrow">YOUR THOUGHTS, SAFE HERE</span><strong>Editor</strong></div><div class="editor-actions"><span class="save-indicator" id="editor-save-indicator">Saved</span><button class="icon-button" data-action="export-note" title="Export Markdown">${icon('download', 19)}</button><button class="icon-button" data-action="delete-note" title="Delete note">${icon('trash', 18)}</button></div></div>
   <div class="editor-properties"><div class="property-tag">${icon('notes', 16)} <select id="note-category">${categories(snapshot).map((c)=>`<option ${note.category === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div><button class="editor-mode-toggle" data-action="toggle-markdown" id="markdown-toggle">${icon('command', 15)} Markdown</button></div>
   <input id="note-title" class="note-title-input" placeholder="${t('title', s)}…" maxlength="250" value="${esc(note.title)}"/>
   <div class="editor-tool-strip"><button class="format-button" data-format="bold" title="Bold (Ctrl+B)">${icon('bold', 18)}</button><button class="format-button" data-format="italic" title="Italic (Ctrl+I)">${icon('italic', 18)}</button><button class="format-button" data-format="underline" title="Underline">${icon('underline', 17)}</button><span class="strip-divider"></span><button class="format-button" data-format="formatBlock" data-value="h2" title="Heading">${icon('heading', 18)}</button><button class="format-button" data-format="insertUnorderedList" title="List">${icon('list', 18)}</button><button class="format-button" data-format="hiliteColor" data-value="#ad9cff" title="Highlight">${icon('highlight', 18)}</button><button class="format-button" data-format="link" title="Link (Ctrl+K)">${icon('link', 18)}</button></div>
   <div class="editor-body-scroll" dir="auto"><div class="editor-prose" id="rich-editor" contenteditable="true" spellcheck="true" data-placeholder="${esc(t('editorPlaceholder', s))}"></div><textarea class="markdown-source hidden" id="markdown-editor" spellcheck="false" placeholder="# Markdown"></textarea><div class="note-links" id="note-links"></div></div>
   <div class="selection-bubble" id="selection-bubble" hidden><button class="format-button" data-format="bold">${icon('bold', 15)}</button><button class="format-button" data-format="italic">${icon('italic', 15)}</button><button class="format-button" data-format="hiliteColor" data-value="#ad9cff">${icon('highlight', 15)}</button><button class="format-button" data-format="link">${icon('link', 15)}</button></div>
   <div class="link-flyout hidden" id="link-flyout"><span>Add a URL</span><input id="link-input" type="url" placeholder="https://example.com"/><button data-action="apply-link" class="primary-button">${icon('check', 16)}</button><button data-action="cancel-link" class="icon-button">${icon('x', 16)}</button></div>
   <div class="editor-footer"><span>${icon('sparkles', 16)} Every thought deserves a place.</span><span><kbd>Ctrl</kbd> + <kbd>S</kbd> to save</span></div>
 </section>`;
}
let sourceMode = false;
let pending;
let savedRange = null;
let currentNote = null;
let parentSnapshot = null;
let onChange = ()=>{};
function setupEditor(snapshot, s, changed) {
    const note = s.editingNote;
    currentNote = {
        ...note
    };
    parentSnapshot = snapshot;
    onChange = changed;
    sourceMode = false;
    const content = document.querySelector('#rich-editor');
    const source = document.querySelector('#markdown-editor');
    content.innerHTML = note.body_format === 'markdown' ? fromMarkdown(note.body) : sanitizedHTML(note.body);
    source.value = toMarkdown(content.innerHTML);
    refreshLinks();
    const title = document.querySelector('#note-title');
    const cat = document.querySelector('#note-category');
    const schedule = ()=>{
        const badge = document.querySelector('#editor-save-indicator');
        if (badge) badge.textContent = 'Editing…';
        window.clearTimeout(pending);
        pending = window.setTimeout(()=>{
            void flushEditor();
        }, 650);
    };
    content.addEventListener('input', schedule);
    source.addEventListener('input', schedule);
    title.addEventListener('input', schedule);
    cat.addEventListener('change', schedule);
    content.addEventListener('paste', (event)=>{
        event.preventDefault();
        const plain = event.clipboardData?.getData('text/plain') || '';
        document.execCommand('insertText', false, plain);
    });
    const showBubble = ()=>{
        const bubble = document.querySelector('#selection-bubble');
        if (sourceMode) {
            bubble.hidden = true;
            return;
        }
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || !content.contains(sel.anchorNode)) {
            bubble.hidden = true;
            return;
        }
        const rect = sel.getRangeAt(0).getBoundingClientRect();
        const host = document.querySelector('#note-editor');
        const bounds = host.getBoundingClientRect();
        bubble.hidden = false;
        bubble.style.left = Math.max(15, Math.min(bounds.width - 180, rect.left - bounds.left + rect.width / 2 - 88)) + 'px';
        bubble.style.top = Math.max(55, rect.top - bounds.top - 48) + 'px';
    };
    content.addEventListener('mouseup', ()=>window.setTimeout(showBubble, 10));
    content.addEventListener('keyup', ()=>window.setTimeout(showBubble, 10));
    document.querySelectorAll('[data-format]').forEach((button)=>{
        button.addEventListener('mousedown', (e)=>e.preventDefault());
        button.addEventListener('click', ()=>{
            if (sourceMode) return;
            const fmt = button.dataset.format || 'bold';
            if (fmt === 'link') {
                const selection = window.getSelection();
                if (selection && !selection.isCollapsed) savedRange = selection.getRangeAt(0).cloneRange();
                document.querySelector('#link-flyout')?.classList.remove('hidden');
                document.querySelector('#link-input')?.focus();
                return;
            }
            content.focus();
            document.execCommand(fmt, false, button.dataset.value || undefined);
            schedule();
            document.querySelector('#selection-bubble').hidden = true;
        });
    });
    const flyout = document.querySelector('#link-input');
    flyout?.addEventListener('keydown', (e)=>{
        if (e.key === 'Enter') {
            e.preventDefault();
            applyLink();
        }
    });
}
function refreshLinks() {
    const links = document.querySelector('#note-links');
    if (!links) return;
    const text = document.querySelector('#rich-editor')?.textContent || '';
    const matches = Array.from(new Set(text.match(/https?:\/\/[^\s<>()]+/gi) || [])).slice(0, 5);
    if (!matches.length) {
        links.innerHTML = '';
        return;
    }
    links.innerHTML = `<div class="link-previews-header">${icon('link', 15)} LINKS IN THIS NOTE</div>${matches.map((x)=>{
        const safe = safeUrl(x);
        if (!safe) return '';
        const host = new URL(safe).hostname;
        return `<button class="link-preview-card" data-action="open-url" data-url="${esc(safe)}"><span class="link-favicon">${icon('globe', 18)}</span><span><strong>${esc(host)}</strong><small>${esc(safe).slice(0, 95)}</small></span>${icon('external', 16)}</button>`;
    }).join('')}`;
}
async function flushEditor() {
    window.clearTimeout(pending);
    if (!currentNote || !parentSnapshot) return;
    const root = document.querySelector('#note-editor');
    if (!root) return;
    const rich = document.querySelector('#rich-editor');
    const source = document.querySelector('#markdown-editor');
    currentNote = {
        ...currentNote,
        title: document.querySelector('#note-title').value,
        category: document.querySelector('#note-category').value,
        body: sourceMode ? source.value : sanitizedHTML(rich.innerHTML),
        body_format: sourceMode ? 'markdown' : 'html'
    };
    try {
        const saved = await backend.saveNote(currentNote);
        if (!document.querySelector('#note-editor')) return;
        currentNote = saved;
        parentSnapshot.notes = parentSnapshot.notes.filter((n)=>n.id !== saved.id);
        parentSnapshot.notes.unshift(saved);
        onChange();
        refreshLinks();
        const badge = document.querySelector('#editor-save-indicator');
        if (badge) badge.textContent = 'Saved ✓';
    } catch (err) {
        const badge = document.querySelector('#editor-save-indicator');
        if (badge) badge.textContent = `Save failed`;
        console.error(err);
    }
}
async function leaveEditor() {
    await flushEditor();
    currentNote = null;
    parentSnapshot = null;
}
function toggleMarkdown() {
    const rich = document.querySelector('#rich-editor');
    const source = document.querySelector('#markdown-editor');
    if (sourceMode) {
        rich.innerHTML = fromMarkdown(source.value);
        rich.classList.remove('hidden');
        source.classList.add('hidden');
        sourceMode = false;
    } else {
        source.value = toMarkdown(rich.innerHTML);
        rich.classList.add('hidden');
        source.classList.remove('hidden');
        sourceMode = true;
    }
    document.querySelector('#markdown-toggle')?.classList.toggle('is-active', sourceMode);
    window.clearTimeout(pending);
    pending = window.setTimeout(()=>void flushEditor(), 400);
}
function applyLink() {
    const url = safeUrl(document.querySelector('#link-input').value.trim());
    if (!url) return;
    const rich = document.querySelector('#rich-editor');
    rich.focus();
    if (savedRange) {
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(savedRange);
    }
    document.execCommand('createLink', false, url);
    document.querySelector('#link-flyout')?.classList.add('hidden');
    savedRange = null;
    window.clearTimeout(pending);
    pending = window.setTimeout(()=>void flushEditor(), 400);
}
function cancelLink() {
    document.querySelector('#link-flyout')?.classList.add('hidden');
    savedRange = null;
}
function downloadNote() {
    const title = document.querySelector('#note-title')?.value || 'Untitled';
    const body = sourceMode ? document.querySelector('#markdown-editor').value : toMarkdown(document.querySelector('#rich-editor').innerHTML);
    const blob = new Blob([
        `# ${title}\n\n${body}\n`
    ], {
        type: 'text/markdown;charset=utf-8'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (title.trim() || 'note').replace(/[\\/:*?"<>|]/g, '_').slice(0, 90) + '.md';
    a.click();
    window.setTimeout(()=>URL.revokeObjectURL(url), 2000);
}

__mods.editor = {sanitizedHTML,fromMarkdown,toMarkdown,editorView,setupEditor,flushEditor,leaveEditor,toggleMarkdown,applyLink,cancelLink,downloadNote};
})();
(() => {
const {backend, newTask, native} = __mods.backend;
const {esc, icon} = __mods.views;
const {routineDraft} = __mods.routines;



let root;
let open = false;
let mode = 'chat';
let lang = 'en';
let data;
let onDataUpdate = async ()=>{};
let onNavigate = ()=>{};
let messages = [];
let aiStatus = {
    has_keys: {},
    has_whisper: false,
    has_vosk: false,
    local_stt_ready: false,
    stt_model_path: null,
    local_tts_ready: false,
    local_tts_en_ready: false,
    local_tts_fa_ready: false,
    tts_model_path: ''
};
let models = [];
let busy = false;
let showModels = false;
let error = '';
let info = '';
let flow = 'idle';
let draft = [];
let candidate = null;
let routineCandidate = null;
let draftKind = 'task';
let recording = false;
let level = 0;
let runID = 0;
let lastAsk = 0;
let captureErrors = 0;
let speechWarned = false;
const t = (en, fa)=>lang === 'fa' ? fa : en;
const setting = (key, def = '')=>data?.settings?.[key] ?? def;
function row(role, text) {
    messages.push({
        role,
        text
    });
    if (messages.length > 60) messages.splice(0, messages.length - 60);
}
function aiIsOpen() {
    return open;
}
function mountAssistant(container, snapshot, language, refresh, navigate) {
    root = container;
    data = snapshot;
    lang = language;
    onDataUpdate = refresh;
    onNavigate = navigate;
    if (open) {
        render();
    }
}
function markdown(text) {
    return esc(text).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\n/g, '<br>');
}
function button(name, title, body, selected = false) {
    return `<button type="button" data-ai-action="${name}" class="ai-tab ${selected ? 'selected' : ''}" aria-label="${title}">${body}</button>`;
}
function voiceStatus() {
    return recording ? t('Listening naturally…', 'در حال شنیدن…') : busy ? t('Processing speech…', 'در حال پردازش گفتار…') : flow === 'wake' ? t('Say “help” to activate', 'برای شروع «help» بگویید') : flow === 'collect' ? t('Describe the task, then say “finish”', 'کار را توضیح دهید و سپس بگویید «finish»') : flow === 'confirm_add' || flow === 'confirm_add_routine' || flow === 'confirm_delete' || flow === 'confirm_complete' ? t('Say “OK”, “wrong”, or “stop”', 'بگویید «تأیید»، «اشتباه» یا «توقف»') : t('Ready to start', 'آماده برای شروع');
}
function notices() {
    return `${error ? `<div class="ai-error" role="alert">${esc(error)}</div>` : ''}${info ? `<div class="ai-info">${esc(info)}</div>` : ''}`;
}
function render(force = false) {
    if (!open) return;
    const existing = root.querySelector('.ai-overlay');
    if (existing && !force && existing.dataset.mode === mode) {
        const notice = existing.querySelector('.ai-notices');
        if (notice) {
            const markup = notices();
            if (notice.innerHTML !== markup) notice.innerHTML = markup;
        }
        if (mode === 'voice') {
            const heading = existing.querySelector('.ai-voice-stage h2');
            if (heading) heading.textContent = voiceStatus();
            const mic = existing.querySelector('.ai-mic-disc');
            mic?.classList.toggle('active', recording);
            mic?.style.setProperty('--mic-level', `${Math.round(level * 100)}%`);
            const control = existing.querySelector('.ai-voice-start');
            if (control) {
                const isRunning = recording || flow !== 'idle';
                const action = isRunning ? 'stop-voice' : 'start-voice';
                const label = isRunning ? t('Stop session', 'پایان گفتگو') : t('Start voice assistant', 'شروع دستیار صوتی');
                if (control.dataset.aiAction !== action) {
                    control.dataset.aiAction = action;
                    control.innerHTML = `${icon(isRunning ? 'x' : 'play', 17)} ${label}`;
                }
            }
            const recent = existing.querySelector('.ai-voice-recent');
            const markup = messages.slice(-3).map((m)=>`<p class="${m.role}">${markdown(m.text)}</p>`).join('');
            if (recent && recent.innerHTML !== markup) recent.innerHTML = markup;
        } else if (mode === 'chat') {
            const msgs = existing.querySelector('.ai-messages');
            const markup = messages.length ? messages.map((m)=>`<div class="ai-bubble ${m.role}">${m.role === 'assistant' ? icon('sparkles', 15) : ''}<div>${markdown(m.text)}</div></div>`).join('') : '';
            if (msgs && markup && msgs.innerHTML !== markup) {
                msgs.innerHTML = markup;
                msgs.scrollTop = msgs.scrollHeight;
            }
            const input = existing.querySelector('#ai-chat-form textarea');
            const send = existing.querySelector('.ai-send');
            if (input) input.disabled = busy;
            if (send) {
                send.disabled = busy;
                send.innerHTML = busy ? '<span class="ai-spinner"></span>' : icon('arrow', 20);
            }
        }
        return;
    }
    existing?.remove();
    let content = '';
    if (mode === 'settings') content = renderSettings();
    else if (mode === 'voice') content = renderVoice();
    else content = renderChat();
    const shell = root.querySelector('.shell');
    if (shell) shell.scrollLeft = 0;
    root.querySelector('.shell')?.insertAdjacentHTML('beforeend', `<section class="ai-overlay" data-mode="${mode}" aria-label="Rooz AI Assistant"><div class="ai-panel">
  <header class="ai-top"><div class="ai-symbol">${icon('sparkles', 22)}</div><span><strong>Rooz <em>Intelligence</em></strong><small>${t('Local context · Your choice of AI', 'اطلاعات محلی · انتخاب هوش مصنوعی با شما')} · v0.4.10</small></span><button type="button" class="icon-button" data-ai-action="close" title="Close">${icon('x', 19)}</button></header>
  <div class="ai-tabs">${button('chat', 'Chat', icon('notes', 15) + ' ' + t('Chat', 'گفتگو'), mode === 'chat')}${button('voice', 'Voice', icon('volume', 15) + ' ' + t('Voice', 'صدا'), mode === 'voice')}${button('settings', 'Settings', icon('settings', 15) + ' ' + t('Settings', 'تنظیمات'), mode === 'settings')}</div>
  ${content}
  <div class="ai-notices">${notices()}</div>
 </div></section>`);
    const transcript = root.querySelector('.ai-messages');
    if (transcript) transcript.scrollTop = transcript.scrollHeight;
}
function renderChat() {
    return `<div class="ai-intro"><span class="eyebrow">${t('ASK • PLAN • REFLECT', 'پرسش • برنامه‌ریزی • مرور')}</span><h2>${t('Think with your day.', 'همراه هوشمند روزت.')}</h2><p>${t('Ask about your schedule or brainstorm using your notes. Your private context is sent only if you enable RAG.', 'از برنامه‌ها و یادداشت‌ها بپرسید. اطلاعات خصوصی فقط در صورت فعال کردن RAG ارسال می‌شود.')}</p></div>
 <div class="ai-messages" aria-live="polite">${messages.length ? messages.map((m)=>`<div class="ai-bubble ${m.role}">${m.role === 'assistant' ? icon('sparkles', 15) : ''}<div>${markdown(m.text)}</div></div>`).join('') : `<div class="ai-empty">${icon('flower', 28)}<strong>${t('What shall we tackle?', 'از کجا شروع کنیم؟')}</strong><small>${t('Try “What should I prioritize today?” or open Voice.', 'مثلاً «امروز روی چه چیزی تمرکز کنم؟»')}</small></div>`}</div>
 <form id="ai-chat-form" class="ai-chat-form"><textarea name="message" rows="2" maxlength="3000" placeholder="${t('Ask Rooz…', 'از روز بپرس…')}" required ${busy ? 'disabled' : ''}></textarea><button class="ai-send" type="submit" ${busy ? 'disabled' : ''}>${busy ? '<span class="ai-spinner"></span>' : icon('arrow', 20)}</button></form>
 <footer class="ai-footer">${icon('info', 13)} ${t('Check AI answers before acting. Nothing is edited by chat replies.', 'پاسخ هوش مصنوعی را بررسی کنید؛ گفتگو چیزی را بدون تأیید تغییر نمی‌دهد.')}</footer>`;
}
function renderVoice() {
    const status = voiceStatus();
    return `<div class="ai-voice-stage"><div class="ai-orbit orbit-a"></div><div class="ai-orbit orbit-b"></div><div class="ai-mic-disc ${recording ? 'active' : ''}" style="--mic-level:${Math.round(level * 100)}%">${icon('mic', 34)}</div>
 <span class="ai-voice-label">${t('VOICE COMPANION', 'همراه صوتی')}</span><h2>${status}</h2><p>${t('Fast local recognition · Offline spoken replies', 'تشخیص سریع گفتار محلی · پاسخ صوتی آفلاین')}</p>
 <button class="primary-wide ai-voice-start" type="button" data-ai-action="${recording || flow !== 'idle' ? 'stop-voice' : 'start-voice'}">${recording || flow !== 'idle' ? icon('x', 16) + t('Stop session', 'پایان گفتگو') : icon('play', 17) + t('Start voice assistant', 'شروع دستیار صوتی')}</button>
 <div class="ai-voice-commands"><strong>${t('Speak commands naturally', 'فرمان‌های گفتاری')}</strong><span>“help” · “add time” · “finish” · “OK” · “wrong” · “stop”</span><span>${t('“Add routine”, “delete task”, “complete task”, “show routines”', '«حذف کار»، «انجام کار»، «نمایش روتین‌ها»، «برنامه امروز»')}</span></div>
 </div><div class="ai-voice-recent">${messages.slice(-3).map((m)=>`<p class="${m.role}">${markdown(m.text)}</p>`).join('')}</div>`;
}
function renderSettings() {
    const provider = setting('ai_provider', 'openrouter');
    const policy = setting('ai_policy', 'free');
    const selected = setting('ai_model', 'auto');
    const select = (name, opts, value)=>`<select name="${name}">${opts.map(([v, label])=>`<option value="${esc(v)}" ${v === value ? 'selected' : ''}>${esc(label)}</option>`).join('')}</select>`;
    return `<form id="ai-settings-form" class="ai-settings-form"><div class="ai-settings-scroll">
 <div class="ai-setting-title">${icon('sparkles', 17)} <strong>${t('Model routing', 'انتخاب هوشمند مدل')}</strong></div>
 <div class="ai-setting-row"><label>${t('Provider', 'سرویس‌دهنده')}${select('ai_provider', [
        [
            'auto',
            'Auto · available key'
        ],
        [
            'openrouter',
            'OpenRouter'
        ],
        [
            'groq',
            'Groq'
        ],
        [
            'nvidia',
            'NVIDIA NIM'
        ]
    ], provider)}</label><label>${t('Model policy', 'روش انتخاب')}${select('ai_policy', [
        [
            'free',
            'Verified free only'
        ],
        [
            'cheap',
            'Lowest published cost'
        ],
        [
            'best',
            'Largest known context'
        ]
    ], policy)}</label></div>
 <div class="ai-setting-row"><label>${t('Model ID', 'مدل')}${select('ai_model', [
        [
            'auto',
            'Auto select'
        ],
        ...models.map((m)=>[
                m.id,
                `${m.name.slice(0, 30)} ${m.free ? '· FREE' : m.output_price != null ? `· $${(m.output_price * 1e6).toFixed(3)}/1M` : '· price unknown'}`
            ])
    ], selected)}</label><button type="button" class="ai-discover" data-ai-action="models">${icon('search', 15)} ${t('Discover', 'جست‌وجوی مدل‌ها')}</button></div>
 <div class="ai-keys"><strong>${t('Provider API keys', 'کلیدهای API')}</strong><small>${t('Stored outside SQLite in a local 0600 file. Leave blank to keep existing key; clear with the remove control.', 'کلیدها در فایل محلی با دسترسی محدود نگهداری می‌شوند.')}</small>
 ${[
        'openrouter',
        'groq',
        'nvidia'
    ].map((p)=>`<label>${p.toUpperCase()} <span class="ai-key-status ${aiStatus.has_keys[p] ? 'ok' : ''}">${aiStatus.has_keys[p] ? t('Connected', 'متصل') : t('Not configured', 'تنظیم نشده')}</span><input type="password" autocomplete="off" name="key_${p}" placeholder="${t('Enter a new key', 'کلید جدید را وارد کنید')}"/><button type="button" class="ai-remove-key" data-ai-action="remove-key" data-provider="${p}" title="Remove saved key">${icon('x', 14)}</button></label>`).join('')}</div>
 <div class="ai-setting-title">${icon('globe', 17)} <strong>${t('Connection · V2Ray', 'اتصال · وی‌توری')}</strong></div>
 <label class="ai-checkbox"><input type="checkbox" name="ai_proxy_enabled" ${setting('ai_proxy_enabled') === 'true' ? 'checked' : ''}/> ${t('Use proxy for text-only AI requests', 'استفاده از پروکسی فقط برای درخواست‌های متنی هوش مصنوعی')}</label>
 <label class="ai-wide-field">${t('Proxy URL', 'نشانی پروکسی')}<input name="ai_proxy_url" value="${esc(setting('ai_proxy_url', 'socks5h://127.0.0.1:10808'))}" placeholder="socks5h://127.0.0.1:10808"/></label>
 <small class="ai-hint">${t('V2Ray common defaults: SOCKS 10808, HTTP 10809. Verify your local client ports.', 'پورت‌های رایج وی‌توری: SOCKS 10808 و HTTP 10809. پورت واقعی خود را بررسی کنید.')}</small>
 <div class="ai-setting-title">${icon('mic', 17)} <strong>${t('Fast offline speech · Vosk', 'تشخیص گفتار سریع و آفلاین · Vosk')}</strong></div>
 <small class="ai-hint">${aiStatus.local_stt_ready ? t('Vosk ready · Microphone audio stays local', 'ووسک آماده است · صدا فقط در رایانه پردازش می‌شود') : t('Run: bash scripts/setup-local-voice.sh english (or persian)', 'دستور نصب: bash scripts/setup-local-voice.sh english یا persian')}</small>
 <label class="ai-wide-field">${t('Recognition language (no automatic guessing)', 'زبان تشخیص گفتار؛ بدون تشخیص حدسی')}${select('ai_stt_language', [
        [
            'en',
            'English (fast, dedicated model)'
        ],
        [
            'fa',
            'فارسی (مدل مخصوص فارسی)'
        ]
    ], setting('ai_stt_language', 'en'))}</label>
 <label class="ai-checkbox"><input type="checkbox" name="ai_local_voice_reply" ${setting('ai_local_voice_reply', 'true') === 'true' ? 'checked' : ''}/> ${t('Read answers aloud using natural offline Piper voice', 'خواندن پاسخ‌ها با صدای طبیعی آفلاین پایپر')}</label>
 <small class="ai-hint">${t('Available voices', 'صداهای نصب‌شده')}: EN ${aiStatus.local_tts_en_ready ? '✓' : '—'} · FA ${aiStatus.local_tts_fa_ready ? '✓' : '—'}. ${t('Install: bash scripts/setup-local-voice.sh speaker-english (or speaker-persian)', 'نصب: bash scripts/setup-local-voice.sh speaker-english یا speaker-persian')}</small>
 <label class="ai-checkbox"><input type="checkbox" name="ai_rag_enabled" ${setting('ai_rag_enabled') === 'true' ? 'checked' : ''}/> ${t('Include relevant local data in AI requests (opt in)', 'ارسال اطلاعات مرتبط محلی به سرویس‌دهنده (با اجازه)')}</label>
 <small class="ai-hint">${t('Local full-text retrieval covers tasks, notes, routines and deletes recorded after this update. No semantic embeddings. Data is sent to the selected remote provider only when RAG is enabled.', 'جست‌وجوی متن محلی شامل کارها، یادداشت‌ها، روتین‌ها و حذف‌های بعد از این نسخه است. جست‌وجوی برداری نیست و تنها در صورت فعال بودن RAG داده ارسال می‌شود.')}</small>
 </div><div class="ai-settings-actions"><button class="primary-button" type="submit">${icon('check', 16)} ${t('Save AI preferences', 'ذخیره تنظیمات')}</button></div></form>`;
}
async function openAssistant(voice = false) {
    if (!root) return;
    open = true;
    mode = voice ? 'voice' : 'chat';
    error = '';
    info = '';
    try {
        aiStatus = await backend.aiStatus();
        if (!messages.length) {
            const history = await backend.aiHistory();
            messages = history.map((m)=>({
                    role: m.role,
                    text: m.body
                }));
        }
    } catch (e) {
        error = String(e);
    }
    render();
    if (voice) await startVoice();
}
function closeAssistant() {
    runID++;
    void backend.cancelNativeVoice();
    void backend.stopLocalSpeech();
    endCapture();
    flow = 'idle';
    open = false;
    root.querySelector('.ai-overlay')?.remove();
}
function setError(e) {
    error = String(e instanceof Error ? e.message : e);
    info = '';
    render();
}
async function saveSettings(form) {
    const fd = new FormData(form);
    busy = true;
    error = '';
    render();
    try {
        for (const key of [
            'ai_provider',
            'ai_policy',
            'ai_model',
            'ai_proxy_url',
            'ai_stt_language'
        ]){
            const val = String(fd.get(key) || '');
            await backend.saveSetting(key, val);
            data.settings[key] = val;
        }
        for (const key of [
            'ai_proxy_enabled',
            'ai_rag_enabled',
            'ai_local_voice_reply'
        ]){
            const value = String(fd.get(key) === 'on');
            await backend.saveSetting(key, value);
            data.settings[key] = value;
        }
        for (const provider of [
            'openrouter',
            'groq',
            'nvidia'
        ]){
            const key = String(fd.get('key_' + provider) || '').trim();
            if (key) await backend.aiSetKey(provider, key);
        }
        aiStatus = await backend.aiStatus();
        speechWarned = false;
        info = t('Settings saved.', 'تنظیمات ذخیره شد.');
    } catch (e) {
        error = String(e);
    } finally{
        busy = false;
        render(true);
    }
}
async function discover() {
    const selected = root.querySelector('#ai-settings-form select[name="ai_provider"]')?.value || setting('ai_provider', 'openrouter');
    if (selected === 'auto') {
        setError(t('Select a specific provider to list models.', 'برای نمایش مدل‌ها یک سرویس‌دهنده انتخاب کنید.'));
        return;
    }
    busy = true;
    info = '';
    error = '';
    render();
    try {
        models = await backend.aiModels(selected);
        info = `${models.length} ${t('text models found · prices shown when published', 'مدل متنی یافت شد')}`;
    } catch (e) {
        error = String(e);
    } finally{
        busy = false;
        render(true);
    }
}
async function chat(text) {
    if (busy) return;
    busy = true;
    error = '';
    row('user', text);
    render();
    try {
        const answer = await backend.aiChat(text);
        row('assistant', answer.answer);
        info = `${answer.provider} / ${answer.model} · ${answer.context.length} ${t('retrieved items', 'نتیجه بازیابی')}`;
    } catch (e) {
        error = String(e);
    } finally{
        busy = false;
        render();
    }
}
async function voiceResponse(text) {
    if (!native || !open || mode !== 'voice' || setting('ai_local_voice_reply', 'true') === 'false') return;
    const spoken = text.replace(/\[[^\]]+\]\([^)]*\)/g, '').replace(/[*_`#]/g, '').replace(/\s+/g, ' ').trim().slice(0, 240);
    const speechLanguage = /[\u0600-\u06ff]/.test(spoken) ? 'fa' : 'en';
    if (!(speechLanguage === 'fa' ? aiStatus.local_tts_fa_ready : aiStatus.local_tts_en_ready)) {
        if (!speechWarned) {
            speechWarned = true;
            info = t('Natural voice not installed. Run the speaker setup command in AI Settings.', 'صدای طبیعی نصب نیست؛ دستور نصب را در تنظیمات هوش مصنوعی ببینید.');
            render();
        }
        return;
    }
    let timeout = 0;
    try {
        const outcome = await Promise.race([
            backend.speakLocal(spoken, speechLanguage).then(()=>({
                    completed: true
                })),
            new Promise((resolve)=>{
                timeout = window.setTimeout(()=>resolve({
                        completed: false
                    }), 11000);
            })
        ]);
        if (!outcome.completed) {
            await backend.stopLocalSpeech();
            info = t('Speaker was too slow; listening again.', 'پخش صدا بیش از حد طول کشید؛ دوباره گوش می‌دهم.');
            render();
        }
    } catch (e) {
        if (!speechWarned) {
            speechWarned = true;
            info = t('Offline speech output unavailable: ', 'گفتار طبیعی آماده نیست: ') + String(e);
            render();
        }
    } finally{
        window.clearTimeout(timeout);
    }
}
async function say(text) {
    row('assistant', text);
    render();
    await voiceResponse(text);
}
async function startVoice() {
    if (!open) return;
    if (flow !== 'idle') return;
    try {
        if (!aiStatus.local_stt_ready) aiStatus = await backend.aiStatus();
    } catch (e) {
        setError(e);
        return;
    }
    if (native && !aiStatus.local_stt_ready) {
        setError(t('Local Vosk is not ready. Run bash scripts/setup-local-voice.sh english (or persian), then reopen Voice.', 'مدل محلی Vosk آماده نیست. اسکریپت setup-local-voice.sh را اجرا کنید.'));
        return;
    }
    runID++;
    captureErrors = 0;
    flow = 'wake';
    draft = [];
    candidate = null;
    routineCandidate = null;
    draftKind = 'task';
    error = '';
    info = t('Say “help” to wake Rooz.', 'برای شروع «help» بگویید.');
    render();
    void backend.warmLocalVoice().catch(()=>{});
    await beginCapture(runID);
}
function endCapture() {
    recording = false;
    level = 0;
}
async function beginCapture(id) {
    if (id !== runID || !open || mode !== 'voice') return;
    if (!native) {
        setError(t('Voice capture needs the installed desktop app.', 'برای ضبط صدا نسخه نصب‌شده برنامه را اجرا کنید.'));
        flow = 'idle';
        return;
    }
    recording = true;
    busy = false;
    render();
    let watchdog = 0;
    try {
        const recognition = (async ()=>await backend.captureLocalSpeech())();
        const raw = await Promise.race([
            recognition,
            new Promise((_, reject)=>{
                watchdog = window.setTimeout(()=>reject(Error('Microphone recognition timed out')), 33000);
            })
        ]);
        const spoken = raw.replace(/\s+/g, ' ').trim().replace(/\[(?:blank[_ ]audio|music|noise|silence)\]/gi, '').trim();
        if (id !== runID || !open || mode !== 'voice') return;
        captureErrors = 0;
        recording = false;
        busy = true;
        render();
        if (spoken) await handleSpoken(spoken, id);
        else info = t('Listening for “help”…', 'منتظر «help» هستم…');
    } catch (e) {
        if (id === runID) {
            void backend.cancelNativeVoice();
            captureErrors++;
            if (captureErrors < 2) {
                info = t('Microphone interrupted. Reconnecting…', 'میکروفون قطع شد؛ در حال تلاش دوباره…');
                render();
            } else {
                setError(t('Local microphone or speech recognition failed: ', 'خطا در ضبط یا تبدیل گفتار محلی: ') + String(e));
                flow = 'idle';
            }
        }
    } finally{
        window.clearTimeout(watchdog);
        if (id === runID) {
            recording = false;
            busy = false;
            render();
        }
        if (id === runID && open && mode === 'voice' && flow !== 'idle') {
            window.setTimeout(()=>{
                void beginCapture(id);
            }, 120);
        }
    }
}
function wordsLike(text, re) {
    return re.test(text.toLowerCase());
}
async function handleSpoken(text, id) {
    if (id !== runID) return;
    const clean = text.toLocaleLowerCase().replace(/[.!?،؛]/g, '').trim();
    row('user', text);
    render();
    if (wordsLike(clean, /^(stop|cancel|توقف|لغو|بس|بسه)\b|^(توقف|لغو)$/i)) {
        await say(t('Stopped.', 'متوقف شد.'));
        flow = 'idle';
        return;
    }
    if (flow === 'wake') {
        if (!wordsLike(clean, /(^|\s)(help|hey rooz|hi rooz|کمک|سلام روز)(\s|$)/i)) {
            info = t('Please say “help” to begin.', 'برای شروع «help» بگویید.');
            return;
        }
        flow = 'listening';
        const remainder = clean.replace(/(^|\s)(help|hey rooz|hi rooz|کمک|سلام روز)(\s|$)/i, ' ').trim();
        if (!remainder) {
            await say(t('I’m listening. What can I do?', 'گوش می‌دهم. چه کمکی می‌توانم بکنم؟'));
            return;
        }
        await processIntent(remainder);
        return;
    }
    if (flow === 'collect') {
        const finished = wordsLike(clean, /(\bfinish\b|پایان|تمام شد|تموم شد)/i);
        const fragment = text.replace(/\bfinish\b|پایان|تمام شد|تموم شد/gi, '').trim();
        if (fragment) draft.push(fragment);
        if (finished) {
            const title = draft.join(' ').trim();
            if (!title) {
                await say(t('I did not hear the task. Please describe it again.', 'عنوان کار را نشنیدم. دوباره بگویید.'));
                return;
            }
            if (draftKind === 'routine') {
                routineCandidate = parseRoutine(title);
                flow = 'confirm_add_routine';
                await say(t(`Create routine “${routineCandidate.title}” (${routineCandidate.schedule_kind})? Say OK, wrong, or stop.`, `روتین «${routineCandidate.title}» ساخته شود؟ تأیید، اشتباه یا توقف.`));
            } else {
                candidate = parseTask(title);
                flow = 'confirm_add';
                await say(t(`Add “${candidate.title}”? Say OK, wrong or stop.`, `کار «${candidate.title}» اضافه شود؟ بگویید تأیید، اشتباه یا توقف.`));
            }
        } else {
            info = t('Got it. Keep talking; say “finish” when done.', 'ثبت شد؛ ادامه دهید و در پایان finish بگویید.');
            render();
        }
        return;
    }
    if (flow === 'confirm_add' || flow === 'confirm_add_routine' || flow === 'confirm_delete' || flow === 'confirm_complete') {
        if (wordsLike(clean, /(^(ok|okay|yes|confirm|correct|sure|done)$|تأیید|بله|درسته|اوکی)/i)) {
            if (flow === 'confirm_add_routine' && routineCandidate) {
                try {
                    await backend.saveRoutine(routineCandidate);
                    await onDataUpdate();
                    await say(t('Routine saved.', 'روتین ثبت شد.'));
                } catch (e) {
                    await say(t('Could not save routine: ', 'ذخیره روتین موفق نشد: ') + String(e));
                }
            } else if (candidate) {
                try {
                    if (flow === 'confirm_add') {
                        await backend.saveTask(candidate);
                        await onDataUpdate();
                        await say(t('Task added successfully.', 'کار با موفقیت اضافه شد.'));
                    } else if (flow === 'confirm_delete') {
                        await backend.deleteTask(candidate.id);
                        await onDataUpdate();
                        await say(t('Task deleted.', 'کار حذف شد.'));
                    } else {
                        await backend.toggleTask(candidate.id);
                        await onDataUpdate();
                        await say(t('Marked complete.', 'انجام کار ثبت شد.'));
                    }
                } catch (e) {
                    await say(t('The action failed: ', 'عملیات موفق نبود: ') + String(e));
                }
            }
            candidate = null;
            routineCandidate = null;
            flow = 'listening';
            return;
        }
        if (wordsLike(clean, /(wrong|no|change|incorrect|اشتباه|نه|غلط|دوباره)/i)) {
            if (flow === 'confirm_add' || flow === 'confirm_add_routine') {
                draft = [];
                candidate = null;
                routineCandidate = null;
                flow = 'collect';
                await say(t('Okay, tell me the task again. Say finish when done.', 'دوباره کار را بگویید و در پایان finish بگویید.'));
            } else {
                candidate = null;
                flow = 'listening';
                await say(t('Cancelled. What next?', 'لغو شد. کار بعدی؟'));
            }
            return;
        }
        await say(t('Please say OK, wrong, or stop.', 'لطفاً بگویید تأیید، اشتباه یا توقف.'));
        return;
    }
    if (flow === 'delete_title' || flow === 'complete_title') {
        const found = chooseTask(clean);
        if (!found) {
            await say(t('I could not identify an exact task. Say the full title or stop.', 'کار مشخص نشد. عنوان دقیق را بگویید یا توقف را انتخاب کنید.'));
            return;
        }
        candidate = found;
        flow = flow === 'delete_title' ? 'confirm_delete' : 'confirm_complete';
        await say(t(`${flow === 'confirm_delete' ? 'Delete' : 'Complete'} “${found.title}”? Say OK to confirm.`, `کار «${found.title}» ${flow === 'confirm_delete' ? 'حذف' : 'انجام شده'} شود؟ برای تأیید بگویید اوکی.`));
        return;
    }
    await processIntent(clean);
}
function parseTask(title) {
    const task = newTask();
    task.title = title.trim();
    const when = task.title.match(/@([01]?\d|2[0-3]):([0-5]\d)/);
    if (when) {
        task.due_time = `${when[1].padStart(2, '0')}:${when[2]}`;
        task.title = task.title.replace(when[0], '').trim();
    }
    if (/\btomorrow\b|فردا/i.test(task.title)) {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        task.due_date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        task.title = task.title.replace(/\btomorrow\b|فردا/ig, '').trim();
    }
    return task;
}
function parseRoutine(description) {
    const base = routineDraft(newTask().due_date);
    let title = description.trim();
    base.schedule_kind = 'anytime';
    base.weekdays_mask = 127;
    if (/\b(every day|daily)\b|هر روز|روزانه/i.test(title)) {
        base.schedule_kind = 'daily';
        title = title.replace(/\b(every day|daily)\b|هر روز|روزانه/ig, '').trim();
    }
    if (/\b(weekends?)\b|آخر هفته/i.test(title)) {
        base.schedule_kind = 'daily';
        base.rule_json = JSON.stringify({
            day_class: 'weekend',
            weekend_days: [
                4
            ],
            calendar: 'jalali'
        });
        title = title.replace(/\b(weekends?)\b|آخر هفته/ig, '').trim();
    }
    const dayNames = [
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
        'sunday'
    ];
    const bits = dayNames.flatMap((name, i)=>new RegExp(`\\b${name}\\b`, 'i').test(title) ? [
            i
        ] : []);
    if (bits.length) {
        base.schedule_kind = 'weekly';
        base.weekdays_mask = bits.reduce((m, i)=>m | 1 << i, 0);
        title = title.replace(/\b(on|every)\b|\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/ig, '').trim();
    }
    if (/\b(every month|monthly)\b|ماهانه/i.test(title)) {
        base.schedule_kind = 'monthly';
        base.month_day = 1;
        title = title.replace(/\b(every month|monthly)\b|ماهانه/ig, '').trim();
    }
    base.title = title || description.trim();
    return base;
}
function chooseTask(name) {
    const openTasks = data.tasks.filter((x)=>!x.done);
    let list = openTasks.filter((x)=>x.title.toLowerCase() === name.toLowerCase());
    if (list.length === 1) return list[0];
    list = openTasks.filter((x)=>x.title.toLowerCase().includes(name.toLowerCase()));
    return list.length === 1 ? list[0] : null;
}
async function processIntent(text) {
    const clean = text.toLocaleLowerCase();
    if (/\b(add routine|create routine|new routine)\b|روتین جدید|افزودن روتین|اضافه کردن روتین/.test(clean)) {
        draftKind = 'routine';
        flow = 'collect';
        draft = [];
        candidate = null;
        routineCandidate = null;
        await say(t('Describe the routine and its schedule. Say finish when done.', 'عنوان و زمان‌بندی روتین را بگویید و سپس finish بگویید.'));
        return;
    }
    if (/\b(add time|add task|new task|create task)\b|کار جدید|افزودن کار|اضافه کردن کار/.test(clean)) {
        draftKind = 'task';
        flow = 'collect';
        draft = [];
        candidate = null;
        routineCandidate = null;
        await say(t('What task shall I add? Speak freely, and say finish when done.', 'چه کاری اضافه کنم؟ توضیح دهید و در پایان finish بگویید.'));
        return;
    }
    if (/\b(delete task|remove task)\b|حذف کار/.test(clean)) {
        flow = 'delete_title';
        await say(t('Say the exact title of the task to delete.', 'عنوان دقیق کاری که می‌خواهید حذف شود را بگویید.'));
        return;
    }
    if (/\b(complete task|finish task|mark task)\b|انجام کار|تکمیل کار/.test(clean)) {
        flow = 'complete_title';
        await say(t('Tell me which task you completed.', 'بگویید کدام کار را انجام داده‌اید.'));
        return;
    }
    const sections = [
        [
            /\b(show|open|list|display|view|see|go to|bring up)(?: (?:me|my|the|all|our))* routines?\b|^routines?$|\b(my|today'?s) routines?\b|روتین‌ها را نشان بده|روتین ها را نشان بده|نمایش روتین|روتین(‌ها| ها)?/,
            'routines'
        ],
        [
            /\b(show|open|view|go to) (?:the |my )?calendar\b|نمایش تقویم/,
            'calendar'
        ],
        [
            /\b(show today|today view|open today)\b|نمایش امروز/,
            'today'
        ],
        [
            /\b(show|open|view) (?:the |my )?notes\b|یادداشت‌ها/,
            'notes'
        ]
    ];
    for (const [regex, view] of sections){
        if (regex.test(clean)) {
            onNavigate(view);
            const summary = data.routines.slice(0, 5).map((r)=>r.title).join(', ');
            await say(view === 'routines' ? t(data.routines.length ? `Showing ${data.routines.length} routines: ${summary}.` : 'You do not have any routines yet.', data.routines.length ? `${data.routines.length} روتین: ${summary}` : 'هنوز روتینی ندارید.') : t(`Opening ${view}.`, `بخش ${view} باز شد.`));
            return;
        }
    }
    if (/\b(what.*today|today.*tasks|daily agenda)\b|کارهای امروز|برنامه امروز/.test(clean)) {
        const date = newTask().due_date;
        const tasks = data.tasks.filter((x)=>x.due_date === date && !x.done);
        await say(tasks.length ? t(`You have ${tasks.length} remaining tasks: `, `${tasks.length} کار باقی مانده: `) + tasks.slice(0, 6).map((x)=>x.title).join('، ') : t('Your task list is clear today.', 'فهرست کارهای امروز خالی است.'));
        return;
    }
    if (/\b(what can you do|your commands|voice commands|how do i use you)\b|راهنما|چه کارهایی بلدی/.test(clean)) {
        await say(t('I can show routines, list today’s tasks, create routines, add tasks and complete tasks. Say a command to begin.', 'می‌توانم روتین‌ها را نمایش دهم، کارهای امروز را بگویم و روتین یا کار جدید ثبت کنم. دستور خود را بگویید.'));
        return;
    }
    if (clean.split(/\s+/).length <= 2 && !/[؟?]/.test(clean)) {
        await say(t('I am not sure what you mean. Try “show routines”, “add task”, or ask a full question.', 'منظورتان روشن نیست. مثلاً «نمایش روتین‌ها» بگویید یا سؤال کامل بپرسید.'));
        return;
    }
    flow = 'listening';
    busy = true;
    render();
    try {
        const reply = await backend.aiChat(text, true);
        row('assistant', reply.answer);
        render();
        await voiceResponse(reply.answer);
    } catch (e) {
        await say(t('That did not work. Check AI settings or rephrase your request.', 'پاسخ دریافت نشد. تنظیمات را بررسی کنید یا سؤال را واضح‌تر بگویید.'));
        error = String(e);
    } finally{
        busy = false;
    }
}
function initAssistant(container) {
    root = container;
    container.addEventListener('click', (event)=>{
        const target = event.target.closest('[data-ai-action]');
        if (!target) return;
        const action = target.dataset.aiAction;
        if (action === 'close') {
            closeAssistant();
            return;
        }
        if (action === 'chat' || action === 'voice' || action === 'settings') {
            if (action !== 'voice' && flow !== 'idle') {
                runID++;
                void backend.cancelNativeVoice();
                void backend.stopLocalSpeech();
                endCapture();
                flow = 'idle';
            }
            mode = action;
            error = '';
            info = '';
            render();
            return;
        }
        if (action === 'start-voice') {
            void startVoice();
            return;
        }
        if (action === 'stop-voice') {
            runID++;
            void backend.cancelNativeVoice();
            void backend.stopLocalSpeech();
            endCapture();
            flow = 'idle';
            info = t('Voice session stopped.', 'گفتگوی صوتی پایان یافت.');
            render();
            return;
        }
        if (action === 'models') {
            void discover();
            return;
        }
        if (action === 'remove-key') {
            const provider = target.dataset.provider || '';
            if (confirm(t(`Remove ${provider} API key from this computer?`, `کلید ${provider} حذف شود؟`))) {
                void backend.aiSetKey(provider, '').then(async ()=>{
                    aiStatus = await backend.aiStatus();
                    render(true);
                }).catch(setError);
            }
            return;
        }
    });
    container.addEventListener('submit', (event)=>{
        const form = event.target;
        if (form.id === 'ai-chat-form') {
            event.preventDefault();
            const input = form.querySelector('textarea[name="message"]');
            const text = input.value.trim();
            if (text) {
                input.value = '';
                void chat(text);
            }
        }
        if (form.id === 'ai-settings-form') {
            event.preventDefault();
            void saveSettings(form);
        }
    });
    container.addEventListener('keydown', (event)=>{
        const target = event.target;
        if (target.closest('#ai-chat-form') && event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            target.closest('form')?.requestSubmit();
        }
    });
}

__mods.assistant = {aiIsOpen,mountAssistant,openAssistant,closeAssistant,parseRoutine,initAssistant};
})();
(() => {
const {backend, newTask, newNote, offset, iso, native} = __mods.backend;
const {routineDraft, occursOn, shiftDay} = __mods.routines;
const {shiftCalendarMonth, solarToISO, isoToSolar} = __mods.solar;
const {aiIsOpen, openAssistant, closeAssistant, initAssistant, mountAssistant} = __mods.assistant;
const {render, renderRoutineResults, renderNoteCards, routineChecklistEditorItem, icon, esc, today, dayLabel} = __mods.views;
const {editorView, setupEditor, leaveEditor, flushEditor, toggleMarkdown, applyLink, cancelLink, downloadNote} = __mods.editor;






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

__mods.app = {};
})();
Object.assign(window,__mods.routines,__mods.solar,{parseVoiceRoutine:__mods.assistant.parseRoutine});