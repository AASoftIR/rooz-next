import { solarParts } from './solar.js';
export const defaultRule = () => ({ calendar: 'gregorian', parity: 'all', day_class: 'all', weekend_days: [4], months: [], month_days: [], include_dates: [], exclude_dates: [] });
export function getRule(r) { try {
    const obj = JSON.parse(r.rule_json || '{}');
    return { ...defaultRule(), ...obj };
}
catch {
    return defaultRule();
} }
export function ruleMatches(r, day) {
    const rule = getRule(r), weekday = (asDate(day).getUTCDay() + 6) % 7;
    if (rule.exclude_dates?.includes(day))
        return false;
    if (rule.include_dates?.includes(day))
        return true;
    const parts = rule.calendar === 'jalali' ? solarParts(day) : { month: asDate(day).getUTCMonth() + 1, day: asDate(day).getUTCDate() };
    if (rule.months?.length && !rule.months.includes(parts.month))
        return false;
    if (rule.month_days?.length && !rule.month_days.includes(parts.day))
        return false;
    if (rule.parity === 'odd' && parts.day % 2 !== 1)
        return false;
    if (rule.parity === 'even' && parts.day % 2 !== 0)
        return false;
    const weekend = (rule.weekend_days?.length ? rule.weekend_days : [4]).includes(weekday);
    if (rule.day_class === 'weekend' && !weekend)
        return false;
    if (rule.day_class === 'workday' && weekend)
        return false;
    return true;
}
// Dates are ISO local-calendar days. UTC arithmetic prevents DST from shifting recurrence dates.
export function asDate(day) { return new Date(`${day}T12:00:00Z`); }
export function dayKey(date) { return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`; }
export function shiftDay(day, step) { const d = asDate(day); d.setUTCDate(d.getUTCDate() + step); return dayKey(d); }
export function validDay(day) { return /^\d{4}-\d\d-\d\d$/.test(day) && dayKey(asDate(day)) === day; }
export function occursOn(r, day) {
    if (!validDay(day) || !validDay(r.start_date) || day < r.start_date)
        return false;
    if (getRule(r).exclude_dates.includes(day))
        return false;
    if (getRule(r).include_dates.includes(day))
        return true;
    if (!ruleMatches(r, day))
        return false;
    const d = asDate(day), start = asDate(r.start_date);
    switch (r.schedule_kind) {
        case 'daily': return true;
        case 'weekly': {
            const mondayIndex = (d.getUTCDay() + 6) % 7;
            return (r.weekdays_mask & (1 << mondayIndex)) !== 0;
        }
        case 'interval': {
            const distance = Math.round((d.getTime() - start.getTime()) / 86400000);
            return distance % Math.max(1, r.interval_days) === 0;
        }
        case 'monthly': {
            if (getRule(r).calendar === 'jalali') {
                const current = solarParts(day);
                const next = solarParts(shiftDay(day, 1));
                return current.day === r.month_day || (next.month !== current.month && next.day === 1 && current.day < r.month_day);
            }
            const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
            return d.getUTCDate() === Math.min(r.month_day, last);
        }
        default: return false;
    }
}
export function nextOccurrence(r, from) {
    if (r.schedule_kind === 'anytime')
        return null;
    let d = from > r.start_date ? from : r.start_date;
    for (let i = 0; i < 370; i++, d = shiftDay(d, 1)) {
        if (occursOn(r, d))
            return d;
    }
    return null;
}
export function completedOn(history, id, date) { return history.some(x => x.routine_id === id && x.occurrence_date === date); }
export function routineNext(r, history, today) {
    if (!r.enabled)
        return null;
    return nextOccurrence(r, completedOn(history, r.id, today) ? shiftDay(today, 1) : today);
}
export function scheduleLabel(r, lang) {
    const fa = lang === 'fa';
    switch (r.schedule_kind) {
        case 'anytime': return fa ? 'هر زمان که لازم شد' : 'Whenever needed';
        case 'daily': {
            const rules = getRule(r);
            if (rules.parity !== 'all')
                return rules.parity === 'odd' ? (fa ? 'روزهای فرد' : 'Odd dates') : (fa ? 'روزهای زوج' : 'Even dates');
            if (rules.day_class !== 'all')
                return rules.day_class === 'weekend' ? (fa ? 'آخر هفته' : 'Weekends') : (fa ? 'روزهای کاری' : 'Workdays');
            return fa ? 'هر روز' : 'Every day';
        }
        case 'weekly': {
            const labels = fa ? ['د', 'س', 'چ', 'پ', 'ج', 'ش', 'ی'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            return labels.filter((_, i) => r.weekdays_mask & (1 << i)).join(' · ') || (fa ? 'هفتگی' : 'Weekly');
        }
        case 'interval': return fa ? `هر ${r.interval_days} روز` : `Every ${r.interval_days} days`;
        case 'monthly': return fa ? `روز ${r.month_day} هر ماه` : `Day ${r.month_day} each month`;
    }
}
export function routineDraft(today) {
    return { id: 0, title: '', details: '', category: 'Personal', schedule_kind: 'weekly', weekdays_mask: 31, interval_days: 3, month_day: 1, start_date: today, due_time: '', remind_before: 0, enabled: true, created_at: 0, updated_at: 0, completion_count: 0, rule_json: '{}' };
}
