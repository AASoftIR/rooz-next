/** Exercising the browser fallback as well as native migrations matters:
 * users preview routine composition before installing the AppImage. */
import assert from 'node:assert/strict';

const values=new Map();
globalThis.localStorage={
  getItem:key=>values.get(key)??null,
  setItem:(key,value)=>values.set(key,value)
};
globalThis.window={};
const {backend}=await import('../web/backend.js');

const routine=(title,kind='daily',mask=127)=>({
  id:0,title,details:'',category:'Personal',schedule_kind:kind,
  weekdays_mask:mask,interval_days:1,month_day:1,start_date:'2020-01-01',
  due_time:'',remind_before:0,enabled:true,created_at:0,
  updated_at:0,completion_count:0,rule_json:'{}'
});
const item=(title,linked_routine_id=null)=>({
  id:0,routine_id:0,title,details:'',position:0,required:true,
  weekdays_mask:127,depth:0,linked_routine_id
});

const sport=await backend.saveRoutinePlan(routine('Sport','weekly',1),[item('Stretch')]);
const daily=await backend.saveRoutinePlan(routine('Daily'),[item('Do sport',sport.routine.id)]);
const date='2026-11-17'; // Tuesday, but Sport is independently Monday-only.

const checked=await backend.toggleRoutineItem(sport.items[0].id,date);
assert.equal(checked.checked,true);
assert.deepEqual(checked.affected_items.at(-1),[daily.items[0].id,true]);
assert.equal((await backend.bootstrap()).routine_completions.some(c=>c.routine_id===daily.routine.id&&c.occurrence_date===date),true);

const unchecked=await backend.toggleRoutineItem(sport.items[0].id,date);
assert.equal(unchecked.checked,false);
assert.deepEqual(unchecked.affected_items.at(-1),[daily.items[0].id,false]);
assert.equal((await backend.bootstrap()).routine_completions.some(c=>c.routine_id===daily.routine.id&&c.occurrence_date===date),false);

assert.throws(()=>backend.saveRoutinePlan(sport.routine,[item('Loop to Daily',daily.routine.id)]),/cycle/i);
assert.equal((await backend.bootstrap()).routine_items.filter(x=>x.routine_id===sport.routine.id).length,1);

console.log('PASS preview linked routine propagation, rollback and cycle checks');
