import {occursOn} from './routines.js';
export type Recurrence = 'none' | 'daily' | 'weekly';
export type Task = {
  id:number; title:string; details:string; due_date:string; due_time:string;
  category:string; done:boolean; priority:number; recurrence:Recurrence;
  remind_before:number; position:number; alerted_for:string; snooze_until:number;
};
export type Note = {id:number;title:string;body:string;body_format:'html'|'markdown';category:string;updated_at:number};
export type AiModel={id:string;name:string;input_price:number|null;output_price:number|null;free:boolean;context:number|null};
export type AiStatus={has_keys:Record<string,boolean>;has_whisper:boolean;has_vosk:boolean;local_stt_ready:boolean;stt_model_path:string|null;local_tts_ready:boolean;local_tts_en_ready:boolean;local_tts_fa_ready:boolean;tts_model_path:string};
export type MemoryHit={kind:string;title:string;excerpt:string;archived:boolean};
export type AiReply={answer:string;provider:string;model:string;context:MemoryHit[];usage:Record<string,unknown>|null};
export type AiMessage={role:'user'|'assistant';body:string;created_at:number};
export type ScheduleKind = 'anytime'|'daily'|'weekly'|'interval'|'monthly';
export type Routine = {
  id:number;title:string;details:string;category:string;schedule_kind:ScheduleKind;
  weekdays_mask:number;interval_days:number;month_day:number;start_date:string;
  due_time:string;remind_before:number;enabled:boolean;created_at:number;updated_at:number;completion_count:number;rule_json:string;
};
export type RoutineCompletion = {id:number;routine_id:number;occurrence_date:string;completed_at:number};
export type RoutineItem = {id:number;routine_id:number;title:string;details:string;position:number;required:boolean;weekdays_mask:number;depth:number;linked_routine_id:number|null};
export type RoutineItemCompletion = {id:number;item_id:number;occurrence_date:string;completed_at:number};
export type Snapshot = {tasks:Task[];notes:Note[];routines:Routine[];routine_completions:RoutineCompletion[];routine_items:RoutineItem[];routine_item_completions:RoutineItemCompletion[];settings:Record<string,string>};
type Invoke = <T>(cmd:string,args?:Record<string,unknown>)=>Promise<T>;
declare global { interface Window { __TAURI__?: {core:{invoke:Invoke};event?:{listen:(name:string,cb:(e:{payload:unknown})=>void)=>Promise<()=>void>}} } }
export const native = Boolean(window.__TAURI__?.core?.invoke);
const KEY='rooz-next-preview-v2';
let previewFullscreen=false;
const iso = (d:Date):string => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const offset=(days:number):string=>{const d=new Date();d.setDate(d.getDate()+days);return iso(d)};
let fallback:Snapshot;
function demo():Snapshot {
  return {
    tasks: [
      {id:1,title:'Plan the week ahead',details:'A little clarity makes the rest feel lighter.',due_date:offset(0),due_time:'09:30',category:'Personal',done:true,priority:1,recurrence:'none',remind_before:0,position:0,alerted_for:'',snooze_until:0},
      {id:2,title:'Build something beautiful',details:'One meaningful hour of deep work.',due_date:offset(0),due_time:'11:00',category:'Work',done:false,priority:2,recurrence:'none',remind_before:15,position:1,alerted_for:'',snooze_until:0},
      {id:3,title:'Read 20 pages',details:'Keep the streak going.',due_date:offset(0),due_time:'17:30',category:'Personal',done:false,priority:0,recurrence:'daily',remind_before:5,position:2,alerted_for:'',snooze_until:0},
      {id:4,title:'Evening reflection',details:'Capture a small win from today.',due_date:offset(0),due_time:'21:00',category:'Study',done:false,priority:0,recurrence:'none',remind_before:0,position:3,alerted_for:'',snooze_until:0},
      {id:5,title:'Sketch new interface concepts',details:'Experiment with the details.',due_date:offset(1),due_time:'10:00',category:'Work',done:false,priority:1,recurrence:'none',remind_before:10,position:0,alerted_for:'',snooze_until:0},
      {id:6,title:'A little time outdoors',details:'Get some fresh air.',due_date:offset(1),due_time:'18:00',category:'Personal',done:false,priority:0,recurrence:'none',remind_before:0,position:1,alerted_for:'',snooze_until:0},
    ],
    notes: [
      {id:1,title:'Ideas worth keeping',body:'<h2>Small sparks, big possibilities ✨</h2><p>Build a <strong>calmer daily rhythm</strong> — one that leaves room for curiosity.</p><ul><li>Make the ordinary feel wonderful.</li><li>Keep it simple, keep it moving.</li></ul>',body_format:'html',category:'Ideas',updated_at:Math.floor(Date.now()/1000)},
      {id:2,title:'This week’s intentions',body:'<p>More focus. Fewer tabs. Better breaks.</p>',body_format:'html',category:'Personal',updated_at:Math.floor(Date.now()/1000)-6000},
      {id:3,title:'A note to future me',body:'<p>Progress does not need to be loud.</p>',body_format:'html',category:'Study',updated_at:Math.floor(Date.now()/1000)-9000}
    ],
    routines:[
      {id:1,title:'Morning movement',details:'A relaxed start to the day',category:'Health',schedule_kind:'daily',weekdays_mask:127,interval_days:1,month_day:1,start_date:offset(-9),due_time:'08:15',remind_before:5,enabled:true,created_at:0,updated_at:0,completion_count:0,rule_json:'{}'},
      {id:2,title:'Grocery run',details:'Keep a reusable list of things to buy',category:'Errands',schedule_kind:'anytime',weekdays_mask:127,interval_days:1,month_day:1,start_date:offset(-4),due_time:'',remind_before:0,enabled:true,created_at:0,updated_at:0,completion_count:0,rule_json:'{}'},
      {id:3,title:'Review the weekly plan',details:'Clear inbox and prepare next steps',category:'Personal',schedule_kind:'weekly',weekdays_mask:1,interval_days:1,month_day:1,start_date:offset(-20),due_time:'18:00',remind_before:15,enabled:true,created_at:0,updated_at:0,completion_count:0,rule_json:'{}'},
      {id:4,title:'Deep clean the desk',details:'Refresh the workspace',category:'Home',schedule_kind:'interval',weekdays_mask:127,interval_days:3,month_day:1,start_date:offset(-5),due_time:'',remind_before:0,enabled:true,created_at:0,updated_at:0,completion_count:0,rule_json:'{}'},
    ],
    routine_completions:[],routine_items:[],routine_item_completions:[],
    settings:{language:'en',motion:'true',voice:'false',accent:'violet',categories:'Personal,Work,Study,Ideas'}
  };
}
try {
 const raw=localStorage.getItem(KEY);fallback=raw?JSON.parse(raw) as Snapshot:demo();
 fallback.routines??=[];fallback.routine_completions??=[];fallback.routine_items??=[];fallback.routine_item_completions??=[];
 fallback.routines.forEach(r=>{r.rule_json??='{}';r.completion_count??=fallback.routine_completions.filter(c=>c.routine_id===r.id).length;});
} catch {fallback=demo();}
function persist() {localStorage.setItem(KEY,JSON.stringify(fallback));}
function nextId<T extends {id:number}>(items:T[]):number{return Math.max(0,...items.map(x=>x.id))+1;}
function wrap<T>(fn:()=>T):Promise<T>{const value=fn();persist();return Promise.resolve(structuredClone(value));}
function invoke<T>(cmd:string,args:Record<string,unknown>={}):Promise<T>{return window.__TAURI__!.core.invoke<T>(cmd,args);}

export const backend={
  bootstrap:():Promise<Snapshot>=>native?invoke('bootstrap'):Promise.resolve(structuredClone(fallback)),
  saveTask:(task:Task):Promise<Task>=>native?invoke('save_task',{task}):wrap(()=>{
    let x={...task};if(x.id){fallback.tasks=fallback.tasks.map(t=>t.id===x.id?x:t);}
    else{x.id=nextId(fallback.tasks);x.position=fallback.tasks.filter(t=>t.due_date===x.due_date).length;fallback.tasks.push(x);}
    return x;
  }),
  toggleTask:(id:number):Promise<Task>=>native?invoke('toggle_task',{id}):wrap(()=>{const t=fallback.tasks.find(t=>t.id===id)!;t.done=!t.done;return t}),
  carryOverdue:():Promise<Task[]>=>native?invoke('carry_overdue'):wrap(()=>{
    const today=offset(0);const changed=fallback.tasks.filter(t=>!t.done&&t.recurrence==='none'&&t.due_date<today)
      .sort((a,b)=>a.due_date.localeCompare(b.due_date)||a.position-b.position).slice(0,2000);
    let pos=Math.max(-1,...fallback.tasks.filter(t=>t.due_date===today).map(t=>t.position))+1;
    for(const task of changed){task.due_date=today;task.position=pos++;task.alerted_for='';task.snooze_until=0;}
    return changed;
  }),
  deleteTask:(id:number):Promise<void>=>native?invoke('delete_task',{id}):wrap(()=>{fallback.tasks=fallback.tasks.filter(t=>t.id!==id)}),
  reorder:(ids:number[]):Promise<void>=>native?invoke('reorder_tasks',{ids}):wrap(()=>{ids.forEach((id,i)=>{const t=fallback.tasks.find(t=>t.id===id);if(t)t.position=i;})}),
  saveNote:(note:Note):Promise<Note>=>native?invoke('save_note',{note}):wrap(()=>{
    let n={...note,updated_at:Math.floor(Date.now()/1000)};
    if(n.id){fallback.notes=fallback.notes.map(x=>x.id===n.id?n:x);}
    else{n.id=nextId(fallback.notes);fallback.notes.unshift(n);}
    return n;
  }),
  deleteNote:(id:number):Promise<void>=>native?invoke('delete_note',{id}):wrap(()=>{fallback.notes=fallback.notes.filter(n=>n.id!==id)}),
  saveRoutine:(routine:Routine):Promise<Routine>=>native?invoke('save_routine',{routine}):wrap(()=>{
    if(!routine.title.trim())throw Error('A routine needs a title');
    const r={...routine,updated_at:Math.floor(Date.now()/1000)};
    if(r.id){const i=fallback.routines.findIndex(x=>x.id===r.id);if(i<0)throw Error('Routine missing');fallback.routines[i]=r;}
    else{r.id=nextId(fallback.routines);r.created_at=r.updated_at;fallback.routines.unshift(r);}
    return r;
  }),
  saveRoutinePlan:(routine:Routine,items:RoutineItem[]):Promise<{routine:Routine;items:RoutineItem[]}>=>native?invoke('save_routine_plan',{routine,items}):wrap(()=>{
    if(!routine.title.trim())throw Error('Routine needs a title');
    const r={...routine,updated_at:Math.floor(Date.now()/1000)};
    if(r.id&&!fallback.routines.some(x=>x.id===r.id))throw Error('Routine missing');
    if(!r.id){r.id=nextId(fallback.routines);r.created_at=r.updated_at;}
    const seen=new Set<number>();
    let maxId=Math.max(0,...fallback.routine_items.map(x=>x.id));
    const next=items.map((item,i)=>{const x={...item,id:item.id||++maxId,routine_id:r.id,position:i};seen.add(x.id);return x;});
    if(next.some(item=>item.linked_routine_id===r.id))throw Error('A routine cannot include itself');
    if(next.some(item=>item.id>0&&fallback.routine_items.some(old=>old.id===item.id&&old.routine_id!==r.id)))throw Error('Checklist item belongs to another routine');
    const graph=[...fallback.routine_items.filter(x=>x.routine_id!==r.id),...next];
    for(const link of next.filter(x=>x.linked_routine_id!=null)){
      if(!fallback.routines.some(x=>x.id===link.linked_routine_id))throw Error('Linked routine does not exist');
      const pending=[link.linked_routine_id!],visited=new Set<number>();
      while(pending.length){const current=pending.pop()!;if(current===r.id)throw Error('Routine inclusion would create a cycle');
        if(visited.has(current))continue;visited.add(current);
        for(const child of graph.filter(x=>x.routine_id===current&&x.linked_routine_id!=null))pending.push(child.linked_routine_id!);
      }
    }
    if(routine.id){fallback.routines=fallback.routines.map(x=>x.id===r.id?r:x);}
    else fallback.routines.unshift(r);
    fallback.routine_items=fallback.routine_items.filter(x=>x.routine_id!==r.id||seen.has(x.id));
    for(const item of next){const index=fallback.routine_items.findIndex(x=>x.id===item.id);if(index>=0)fallback.routine_items[index]=item;else fallback.routine_items.push(item);}
    return {routine:r,items:next};
  }),
  toggleRoutineItem:(itemId:number,date:string):Promise<{checked:boolean;whole_complete:boolean;affected_items:[number,boolean][];affected_routines:[number,boolean][]}>=>native?invoke('toggle_routine_item',{itemId,date}):wrap(()=>{
    const item=fallback.routine_items.find(x=>x.id===itemId);if(!item)throw Error('Item not found');
    const existing=fallback.routine_item_completions.findIndex(x=>x.item_id===itemId&&x.occurrence_date===date);
    const checked=existing<0;
    if(checked)fallback.routine_item_completions.push({id:nextId(fallback.routine_item_completions),item_id:itemId,occurrence_date:date,completed_at:Date.now()/1000|0});
    else fallback.routine_item_completions.splice(existing,1);
    const weekday=(new Date(date+'T12:00:00Z').getUTCDay()+6)%7;
    const bit=1<<weekday;
    const dueOrEmbedded=(id:number,seen=new Set<number>()):boolean=>{
      if(seen.has(id))return false;seen.add(id);
      const routine=fallback.routines.find(r=>r.id===id);
      if(routine?.enabled&&(routine.schedule_kind==='anytime'&&routine.start_date<=date||occursOn(routine,date)))return true;
      return fallback.routine_items.some(i=>i.linked_routine_id===id&&(i.weekdays_mask&bit)!==0&&dueOrEmbedded(i.routine_id,new Set(seen)));
    };
    const affected_items:[number,boolean][]=[[itemId,checked]],affected_routines:[number,boolean][]=[];
    const queue=[item.routine_id];let visited=0;
    while(queue.length){const current=queue.shift()!;if(++visited>10000)throw Error('Routine inclusion depth exceeded safe limit');
      const needed=fallback.routine_items.filter(x=>x.routine_id===current&&x.required&&(x.weekdays_mask&bit)!==0);
      const whole=needed.length>0&&needed.every(x=>fallback.routine_item_completions.some(c=>c.item_id===x.id&&c.occurrence_date===date));
      const existingWhole=fallback.routine_completions.findIndex(c=>c.routine_id===current&&c.occurrence_date===date);
      if(whole&&existingWhole<0){fallback.routine_completions.push({id:nextId(fallback.routine_completions),routine_id:current,occurrence_date:date,completed_at:Date.now()/1000|0});const r=fallback.routines.find(x=>x.id===current);if(r)r.completion_count++;}
      else if(!whole&&existingWhole>=0){fallback.routine_completions.splice(existingWhole,1);const r=fallback.routines.find(x=>x.id===current);if(r)r.completion_count=Math.max(0,r.completion_count-1);}
      affected_routines.push([current,whole]);
      for(const link of fallback.routine_items.filter(x=>x.linked_routine_id===current&&(x.weekdays_mask&bit)!==0&&dueOrEmbedded(x.routine_id))){
        const old=fallback.routine_item_completions.findIndex(c=>c.item_id===link.id&&c.occurrence_date===date);
        if(whole&&old<0)fallback.routine_item_completions.push({id:nextId(fallback.routine_item_completions),item_id:link.id,occurrence_date:date,completed_at:Date.now()/1000|0});
        if(!whole&&old>=0)fallback.routine_item_completions.splice(old,1);
        affected_items.push([link.id,whole]);queue.push(link.routine_id);
      }
    }
    return {checked,whole_complete:affected_routines[0]?.[1]||false,affected_items,affected_routines};
  }),
  setRoutineEnabled:(id:number,enabled:boolean):Promise<Routine>=>native?invoke('set_routine_enabled',{id,enabled}):wrap(()=>{
    const r=fallback.routines.find(x=>x.id===id);if(!r)throw Error('Routine missing');r.enabled=enabled;return r;
  }),
  deleteRoutine:(id:number):Promise<void>=>native?invoke('delete_routine',{id}):wrap(()=>{
    fallback.routines=fallback.routines.filter(r=>r.id!==id);
    fallback.routine_completions=fallback.routine_completions.filter(c=>c.routine_id!==id);
    const gone=fallback.routine_items.filter(x=>x.routine_id===id).map(x=>x.id);
    fallback.routine_item_completions=fallback.routine_item_completions.filter(x=>!gone.includes(x.item_id));
    fallback.routine_items=fallback.routine_items.filter(x=>x.routine_id!==id);
  }),
  completeRoutine:(id:number,date:string):Promise<RoutineCompletion>=>native?invoke('complete_routine',{id,date}):wrap(()=>{
    const exists=fallback.routine_completions.find(c=>c.routine_id===id&&c.occurrence_date===date);if(exists)return exists;
    const c={id:nextId(fallback.routine_completions),routine_id:id,occurrence_date:date,completed_at:Math.floor(Date.now()/1000)};
    fallback.routine_completions.unshift(c);const r=fallback.routines.find(r=>r.id===id);if(r)r.completion_count++;return c;
  }),
  undoRoutine:(id:number,date:string):Promise<void>=>native?invoke('undo_routine',{id,date}):wrap(()=>{
    const had=fallback.routine_completions.some(c=>c.routine_id===id&&c.occurrence_date===date);
    fallback.routine_completions=fallback.routine_completions.filter(c=>!(c.routine_id===id&&c.occurrence_date===date));
    const r=fallback.routines.find(r=>r.id===id);if(r&&had)r.completion_count=Math.max(0,r.completion_count-1);
  }),
  saveSetting:(key:string,value:string):Promise<void>=>native?invoke('save_setting',{key,value}):wrap(()=>{fallback.settings[key]=value}),
  snooze:(id:number,minutes:number):Promise<void>=>native?invoke('snooze_task',{id,minutes}):wrap(()=>{const t=fallback.tasks.find(t=>t.id===id);if(t)t.snooze_until=Math.floor(Date.now()/1000)+minutes*60}),
  windowAction:(action:string):Promise<boolean>=>native?invoke('window_action',{action}):Promise.resolve((()=>{
    if(action==='expand')previewFullscreen=true;
    else if(action==='fullscreen')previewFullscreen=!previewFullscreen;
    else if(action==='compact')previewFullscreen=false;
    return previewFullscreen;
  })()),
  aiStatus:():Promise<AiStatus>=>native?invoke('ai_status'):Promise.resolve({has_keys:{openrouter:false,groq:false,nvidia:false},has_whisper:false,has_vosk:false,local_stt_ready:false,stt_model_path:null,local_tts_ready:false,local_tts_en_ready:false,local_tts_fa_ready:false,tts_model_path:''}),
  aiSetKey:(provider:string,key:string):Promise<void>=>native?invoke('ai_set_key',{provider,key}):Promise.reject(Error('API keys can only be stored in the installed desktop app')),
  aiModels:(provider:string):Promise<AiModel[]>=>native?invoke('ai_models',{provider}):Promise.reject(Error('Connect in installed desktop app')),
  aiChat:(message:string,voice=false):Promise<AiReply>=>native?invoke('ai_chat',{message,voice}):Promise.reject(Error('AI requests require the desktop backend and a provider API key')),
  aiHistory:():Promise<AiMessage[]>=>native?invoke('ai_history'):Promise.resolve([]),
  aiSearch:(query:string):Promise<MemoryHit[]>=>native?invoke('ai_search',{query}):Promise.resolve([]),
  warmLocalVoice:():Promise<void>=>native?invoke('warm_local_voice'):Promise.resolve(),
  captureLocalSpeech:():Promise<string>=>native?invoke('capture_local_speech'):Promise.reject(Error('Offline voice capture requires the installed Rooz AppImage')),
  speakLocal:(text:string,language:string):Promise<void>=>native?invoke('speak_local',{text,language}):Promise.resolve(),
  stopLocalSpeech:():Promise<void>=>native?invoke('stop_local_speech'):Promise.resolve(),
  cancelNativeVoice:():Promise<void>=>native?invoke('cancel_native_voice'):Promise.resolve(),
  takeVoicePending:():Promise<boolean>=>native?invoke('take_voice_pending'):Promise.resolve(false),
  openExternal:(url:string):Promise<void>=>native?invoke('open_external',{url}):Promise.resolve((window.open(url,'_blank','noopener,noreferrer'),undefined)),
  saveExport:(filename:string,content:string):Promise<string>=>native?invoke('save_export',{filename,content}):Promise.reject(Error('Native export unavailable')),
  importBackup:(snapshot:Snapshot):Promise<string>=>native?invoke('import_backup',{snapshot}):Promise.reject(Error('Import requires Rooz desktop')),
  backupDatabase:():Promise<string>=>native?invoke('backup_database'):Promise.reject(Error('Complete SQLite backup requires Rooz desktop')),
};
export function newTask(date=offset(0)):Task{return {id:0,title:'',details:'',due_date:date,due_time:'',category:'Personal',done:false,priority:0,recurrence:'none',remind_before:0,position:0,alerted_for:'',snooze_until:0};}
export function newNote():Note{return {id:0,title:'',body:'',body_format:'html',category:'Personal',updated_at:0};}
export {iso,offset};
