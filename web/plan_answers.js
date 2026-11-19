import { occursOn, shiftDay } from './routines.js';
function normalized(s) {
    return s.toLocaleLowerCase().replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/[\u200c\u064b-\u065f]/g, ' ').replace(/\s+/g, ' ').trim();
}
const isFa = (s)=>/[\u0600-\u06ff]/.test(s);
function listItems(r, snapshot, seen = new Set(), depth = 0) {
    if (seen.has(r.id) || depth > 3) return [];
    const visited = new Set(seen);
    visited.add(r.id);
    const items = snapshot.routine_items.filter((x)=>x.routine_id === r.id).sort((a, b)=>a.position - b.position);
    return items.flatMap((i)=>{
        const child = i.linked_routine_id ? snapshot.routines.find((x)=>x.id === i.linked_routine_id) : undefined;
        return [
            `${'  '.repeat(depth + i.depth)}• ${i.title}${i.details ? ` — ${i.details}` : ''}`,
            ...child ? listItems(child, snapshot, visited, depth + 1) : []
        ];
    });
}
export function localPlanAnswer(text, snapshot, day) {
    const q = normalized(text);
    const fa = isFa(text);
    const named = snapshot.routines.filter((r)=>r.title.length > 2 && q.includes(normalized(r.title)));
    if (named.length === 1 && /\b(routine|checklist|steps|details|inside|what|show|plan)\b|روتین|چک|برنامه|جزئیات|مرحله|موارد/.test(q)) {
        const r = named[0];
        const items = listItems(r, snapshot);
        return `${r.title}${r.details ? `: ${r.details}` : ''}\n${items.length ? items.join('\n') : fa ? 'هنوز چک‌لیستی ندارد.' : 'No checklist items yet.'}`;
    }
    const overdue = /\b(overdue|late tasks|missed tasks|backlog)\b|عقب افتاده|عقب‌افتاده|معوق|دیرکرد/.test(q);
    if (overdue) {
        const list = snapshot.tasks.filter((t)=>!t.done && t.recurrence === 'none' && t.due_date < day).sort((a, b)=>a.due_date.localeCompare(b.due_date));
        return list.length ? (fa ? `${list.length} کار عقب‌افتاده:\n` : `${list.length} overdue tasks:\n`) + list.slice(0, 15).map((t)=>`• ${t.title} (${t.due_date})`).join('\n') + (list.length > 15 ? fa ? '\nو موارد بیشتر…' : '\nand more…' : '') : fa ? 'هیچ کار عقب‌افتاده‌ای نداری.' : 'No overdue tasks.';
    }
    if (/\b(show|list|view|display|my|all)\s+(?:the\s+)?routines?\b|نمایش روتین|لیست روتین|روتین های من|روتین‌های من/.test(q)) {
        const routines = snapshot.routines;
        return routines.length ? (fa ? `${routines.length} روتین:\n` : `${routines.length} saved routines:\n`) + routines.slice(0, 18).map((r)=>`• ${r.title}${r.details ? ` — ${r.details.slice(0, 90)}` : ''}`).join('\n') + (routines.length > 18 ? '\n…' : '') : fa ? 'هنوز روتینی ساخته نشده.' : 'No routines saved yet.';
    }
    const todayWords = /\b(today|daily agenda|this day|todays)\b|امروز|برنامه روز/.test(q);
    const tomorrowWords = /\b(tomorrow)\b|فردا/.test(q);
    const taskWords = /\b(tasks?|todos?|to.dos?|agenda|schedule|plan|remaining|left|priorities)\b|کارها|کارهای|وظیفه|کار |برنامه|فهرست/.test(q);
    const routineWords = /\b(routines?|habits?|checklists?)\b|روتین|عادت/.test(q);
    if ((todayWords || tomorrowWords) && (taskWords || routineWords)) {
        const date = tomorrowWords ? shiftDay(day, 1) : day;
        const tasks = snapshot.tasks.filter((t)=>t.due_date === date && !t.done).sort((a, b)=>b.priority - a.priority || a.position - b.position);
        const routines = snapshot.routines.filter((r)=>r.enabled && r.schedule_kind !== 'anytime' && occursOn(r, date));
        const header = fa ? `${tomorrowWords ? 'فردا' : 'امروز'}: ${tasks.length} کار باقی‌مانده، ${routines.length} روتین.\n` : `${tomorrowWords ? 'Tomorrow' : 'Today'}: ${tasks.length} open tasks and ${routines.length} scheduled routines.\n`;
        const details = [
            ...routineWords && !taskWords ? [] : tasks.slice(0, 10).map((t)=>`• ${t.title}${t.due_time ? ` @${t.due_time}` : ''}`),
            ...taskWords && !routineWords ? [] : routines.slice(0, 10).map((r)=>`◦ ${r.title}${r.due_time ? ` @${r.due_time}` : ''}`)
        ];
        return header + (details.length ? details.join('\n') : fa ? 'موردی برای نمایش نیست.' : 'Nothing pending.');
    }
    if (/\b(this week|next seven days|week ahead|weekly workload)\b|این هفته|هفت روز آینده|هفته آینده/.test(q)) {
        const days = Array.from({
            length: 7
        }, (_, i)=>shiftDay(day, i));
        return (fa ? 'برنامهٔ هفت‌روزه:\n' : 'Next seven days:\n') + days.map((d)=>{
            const tasks = snapshot.tasks.filter((t)=>t.due_date === d && !t.done).length;
            const routines = snapshot.routines.filter((r)=>r.enabled && r.schedule_kind !== 'anytime' && occursOn(r, d)).length;
            return `${d}: ${tasks} ${fa ? 'کار' : 'tasks'}, ${routines} ${fa ? 'روتین' : 'routines'}`;
        }).join('\n');
    }
    return null;
}
