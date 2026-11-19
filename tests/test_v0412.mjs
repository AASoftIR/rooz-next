import assert from 'node:assert/strict';
import {localPlanAnswer} from '../web/plan_answers.js';
import {routineInsights} from '../web/insights.js';
const day='2026-11-19';
const daily={id:1,title:'Daily plan',details:'Morning',category:'Personal',schedule_kind:'daily',weekdays_mask:127,interval_days:1,month_day:1,start_date:'2026-01-01',due_time:'',remind_before:0,enabled:true,created_at:0,updated_at:0,completion_count:2,rule_json:'{}'};
const sport={...daily,id:2,title:'Sport',schedule_kind:'weekly',weekdays_mask:1,details:'Stretch and run'};
const s={tasks:[
  {id:1,title:'Old unfinished book',due_date:'2026-11-10',done:false,priority:1,recurrence:'none',position:0,due_time:''},
  {id:2,title:'Meet professor',due_date:day,done:false,priority:2,recurrence:'none',position:0,due_time:'11:30'},
  {id:3,title:'Finished',due_date:day,done:true,priority:0,recurrence:'none',position:1,due_time:''}],
 routines:[daily,sport],routine_items:[
  {id:1,routine_id:1,title:'Training',details:'',position:0,depth:0,linked_routine_id:2},
  {id:2,routine_id:2,title:'Warm up',details:'Five minutes',position:0,depth:0,linked_routine_id:null}],
 routine_completions:[],routine_item_completions:[],notes:[],settings:{}};

assert.match(localPlanAnswer('What tasks today?',s,day),/Meet professor/);
assert.doesNotMatch(localPlanAnswer('What tasks today?',s,day),/Finished/);
assert.match(localPlanAnswer('Show overdue tasks',s,day),/Old unfinished book/);
assert.match(localPlanAnswer('کارهای عقب افتاده',s,day),/Old unfinished book/);
assert.match(localPlanAnswer('Show my routines',s,day),/Daily plan/);
assert.match(localPlanAnswer('What is in Daily plan routine?',s,day),/Warm up/);
assert.match(localPlanAnswer('This week',s,day),/2026-11-19/);
assert.equal(localPlanAnswer('Explain the philosophy of time',s,day),null);

const history=[{id:1,routine_id:1,occurrence_date:'2026-11-17',completed_at:0},
 {id:2,routine_id:1,occurrence_date:'2026-11-18',completed_at:0}];
const result=routineInsights(daily,history,day);
assert.equal(result.streak,2,'today should not break yesterday\'s streak');
assert.equal(result.checkins30,2);
assert.equal(result.days.length,28);
assert.equal(result.scheduled30,30);
assert.equal(routineInsights({...daily,schedule_kind:'anytime'},history,day).percent30,null);
console.log('PASS instant English/Persian planner answers, nested descriptions, scheduled streaks');
