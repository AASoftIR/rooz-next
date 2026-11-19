import { backend, native, newTask } from './backend.js';
import { occursOn, shiftDay } from './routines.js';
const quoted = (value)=>`"${String(value ?? '').replace(/"/g, '""')}"`;
const csv = (rows)=>rows.map((row)=>row.map(quoted).join(',')).join('\r\n') + '\r\n';
const ical = (text)=>text.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
const stamp = ()=>new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
export function serializeExport(data, kind) {
    const prefix = `Rooz-${stamp()}`;
    if (kind === 'json') return {
        name: `${prefix}-backup.json`,
        mime: 'application/json',
        content: JSON.stringify({
            rooz_format: 'rooz-next',
            format_version: 1,
            exported_at: new Date().toISOString(),
            snapshot: data
        }, null, 2)
    };
    if (kind === 'tasks-csv') return {
        name: `${prefix}-tasks.csv`,
        mime: 'text/csv',
        content: csv([
            [
                'title',
                'details',
                'due_date',
                'due_time',
                'category',
                'done',
                'priority',
                'recurrence',
                'remind_before'
            ],
            ...data.tasks.map((t)=>[
                    t.title,
                    t.details,
                    t.due_date,
                    t.due_time,
                    t.category,
                    t.done,
                    t.priority,
                    t.recurrence,
                    t.remind_before
                ])
        ])
    };
    if (kind === 'routines-csv') return {
        name: `${prefix}-routines.csv`,
        mime: 'text/csv',
        content: csv([
            [
                'title',
                'details',
                'category',
                'schedule_kind',
                'start_date',
                'time',
                'checklist'
            ],
            ...data.routines.map((r)=>[
                    r.title,
                    r.details,
                    r.category,
                    r.schedule_kind,
                    r.start_date,
                    r.due_time,
                    data.routine_items.filter((x)=>x.routine_id === r.id).map((x)=>'  '.repeat(Math.max(0, x.depth || 0)) + x.title).join(' | ')
                ])
        ])
    };
    if (kind === 'markdown') return {
        name: `${prefix}-planner.md`,
        mime: 'text/markdown',
        content: [
            '# Rooz planner',
            '## Tasks',
            ...data.tasks.map((x)=>`- [${x.done ? 'x' : ' '}] ${x.title} (${x.due_date}${x.due_time ? ' ' + x.due_time : ''})${x.details ? ' — ' + x.details : ''}`),
            '## Routines',
            ...data.routines.flatMap((r)=>[
                    `### ${r.title}`,
                    r.details,
                    `Schedule: ${r.schedule_kind} · ${r.start_date}`,
                    ...data.routine_items.filter((x)=>x.routine_id === r.id).map((i)=>`${'  '.repeat(Math.max(0, i.depth || 0))}- [ ] ${i.title}${i.details ? ' — ' + i.details : ''}`)
                ]),
            '## Notes',
            ...data.notes.map((n)=>`### ${n.title}\n\n${n.body_format === 'markdown' ? n.body : n.body.replace(/<[^>]*>/g, ' ')}`)
        ].join('\n\n') + '\n'
    };
    const start = new Date();
    start.setHours(12, 0, 0, 0);
    const startDay = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
    const dt = (date)=>date.replace(/-/g, '');
    let events = [];
    for (const task of data.tasks){
        events.push(`BEGIN:VEVENT\r\nUID:rooz-task-${task.id}@local\r\nDTSTART;VALUE=DATE:${dt(task.due_date)}\r\nSUMMARY:${ical(task.title)}\r\nDESCRIPTION:${ical(task.details)}\r\nEND:VEVENT`);
    }
    for (const r of data.routines.filter((r)=>r.enabled && r.schedule_kind !== 'anytime')){
        let day = startDay;
        for(let i = 0; i < 90; i++, day = shiftDay(day, 1)){
            if (occursOn(r, day)) {
                events.push(`BEGIN:VEVENT\r\nUID:rooz-routine-${r.id}-${dt(day)}@local\r\nDTSTART;VALUE=DATE:${dt(day)}\r\nSUMMARY:${ical(r.title)}\r\nDESCRIPTION:${ical([
                    r.details,
                    ...data.routine_items.filter((x)=>x.routine_id === r.id).map((x)=>x.title)
                ].join('\n'))}\r\nEND:VEVENT`);
            }
        }
    }
    return {
        name: `${prefix}-90days.ics`,
        mime: 'text/calendar',
        content: `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Rooz//Planner//EN\r\n${events.join('\r\n')}\r\nEND:VCALENDAR\r\n`
    };
}
export async function saveExport(data, kind) {
    const { name, content, mime } = serializeExport(data, kind);
    if (native) return backend.saveExport(name, content);
    const url = URL.createObjectURL(new Blob([
        content
    ], {
        type: mime + ';charset=utf-8'
    }));
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
    return name;
}
function parseCsv(text) {
    const rows = [];
    let field = '', row = [], inside = false;
    for(let i = 0; i < text.length; i++){
        const ch = text[i];
        if (ch === '"') {
            if (inside && text[i + 1] === '"') {
                field += '"';
                i++;
            } else inside = !inside;
        } else if (ch === ',' && !inside) {
            row.push(field);
            field = '';
        } else if ((ch === '\r' || ch === '\n') && !inside) {
            if (ch === '\r' && text[i + 1] === '\n') i++;
            row.push(field);
            if (row.some(Boolean)) rows.push(row);
            row = [];
            field = '';
        } else field += ch;
    }
    if (inside) throw Error('Unclosed CSV quote');
    row.push(field);
    if (row.some(Boolean)) rows.push(row);
    return rows;
}
export function parseImport(text, filename) {
    if (text.length > 20_000_000) throw Error('Import is too large (20 MB maximum)');
    if (filename.toLowerCase().endsWith('.json')) {
        const parsed = JSON.parse(text);
        const data = parsed.snapshot || parsed;
        if (!Array.isArray(data.tasks) || !Array.isArray(data.routines) || !Array.isArray(data.notes)) throw Error('Not a Rooz JSON backup');
        return {
            tasks: data.tasks,
            notes: data.notes,
            routines: data.routines,
            routine_items: data.routine_items || [],
            routine_completions: data.routine_completions || [],
            routine_item_completions: data.routine_item_completions || [],
            settings: {}
        };
    }
    if (filename.toLowerCase().endsWith('.csv')) {
        const rows = parseCsv(text.replace(/^\uFEFF/, ''));
        const header = rows.shift()?.map((h)=>h.trim().toLowerCase());
        if (!header?.includes('title') || !header?.includes('due_date')) throw Error('CSV import requires title and due_date columns (use Tasks CSV export)');
        const tasks = rows.map((row)=>{
            const get = (key)=>row[header.indexOf(key)] || '';
            return {
                ...newTask(),
                title: get('title').trim(),
                details: get('details'),
                due_date: get('due_date'),
                due_time: get('due_time'),
                category: get('category') || 'Personal',
                done: [
                    '1',
                    'true',
                    'yes'
                ].includes(get('done').toLowerCase()),
                priority: Number(get('priority') || 0),
                recurrence: [
                    'daily',
                    'weekly'
                ].includes(get('recurrence')) ? get('recurrence') : 'none',
                remind_before: Number(get('remind_before') || 0)
            };
        }).filter((x)=>x.title);
        return {
            tasks,
            notes: [],
            routines: [],
            routine_items: [],
            routine_completions: [],
            routine_item_completions: [],
            settings: {}
        };
    }
    throw Error('Import .json Rooz backups or .csv task files');
}
export async function mergeImport(text, name) {
    const data = parseImport(text, name);
    if (!native) throw Error('Import requires the native Rooz desktop app');
    return backend.importBackup(data);
}
