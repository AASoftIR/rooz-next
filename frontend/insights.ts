/** Schedule-aware routine analytics. Counts planned occurrences rather than
 * indiscriminately counting consecutive calendar days. No data leaves Rooz. */
import type {Routine,RoutineCompletion} from './backend.js';
import {occursOn,shiftDay} from './routines.js';

export type RoutineInsight={streak:number;completed30:number;scheduled30:number;percent30:number|null;checkins30:number;days:{date:string;due:boolean;done:boolean}[]};
export function routineInsights(r:Routine,history:RoutineCompletion[],day:string):RoutineInsight{
 const completed=new Set(history.filter(c=>c.routine_id===r.id).map(c=>c.occurrence_date));
 const days=Array.from({length:28},(_,i)=>{
   const date=shiftDay(day,i-27);return {date,due:r.schedule_kind!=='anytime'&&occursOn(r,date),done:completed.has(date)};
 });
 let scheduled30=0,completed30=0,checkins30=0;
 for(let i=0;i<30;i++){
   const date=shiftDay(day,-i);
   const done=completed.has(date),due=r.schedule_kind!=='anytime'&&occursOn(r,date);
   if(done)checkins30++;
   if(due){scheduled30++;if(done)completed30++;}
 }
 let streak=0;
 if(r.schedule_kind!=='anytime'){
   let started=false;
   for(let i=0;i<366;i++){
     const date=shiftDay(day,-i);
     if(date<r.start_date)break;
     if(!occursOn(r,date))continue;
     if(!started&&date===day&&!completed.has(date))continue; // today is not over yet
     started=true;
     if(!completed.has(date))break;
     streak++;
   }
 }
 return {streak,completed30,scheduled30,percent30:scheduled30?Math.round(completed30/scheduled30*100):null,checkins30,days};
}
