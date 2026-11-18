import {backend,newTask,newNote,offset,iso,native} from './backend.js';
import {routineDraft,occursOn,shiftDay} from './routines.js';
import {shiftCalendarMonth,solarToISO,isoToSolar} from './solar.js';
import {aiIsOpen,openAssistant,closeAssistant,initAssistant,mountAssistant} from './assistant.js';
import type {Snapshot,Task,Note,Routine,RoutineItem,ScheduleKind} from './backend.js';
import {render,renderRoutineResults,renderNoteCards,routineChecklistEditorItem,icon,esc,today,dayLabel} from './views.js';
import type {UIState,View} from './views.js';
import {editorView,setupEditor,leaveEditor,flushEditor,toggleMarkdown,applyLink,cancelLink,downloadNote} from './editor.js';
import {saveExport,mergeImport} from './transfer.js';
import type {ExportFormat} from './transfer.js';

let snapshot:Snapshot={tasks:[],notes:[],routines:[],routine_completions:[],routine_items:[],routine_item_completions:[],settings:{}};
const state:UIState={view:'today',language:'en',expanded:false,calendarSystem:'gregorian',modal:null,editingTask:null,editingNote:null,editingRoutine:null,historyRoutineId:null,routineFilter:'all',routineSearch:'',routinePlanDate:today(),selectedDate:today(),calendarMonth:new Date(new Date().getFullYear(),new Date().getMonth(),1),categoryFilter:'All',noteSearch:'',focusDuration:25,focusEnds:0,focusRemaining:25*60,focusRunning:false,motion:true,toast:null};
const root=document.querySelector<HTMLElement>('#app')!;
let toastTimer=0;let activeDrag=0;let busy=false;let commandOpen=false;

function toast(message:string):void {state.toast=message;document.querySelector('.toast')?.remove();const shell=document.querySelector('.shell');if(shell) shell.insertAdjacentHTML('beforeend',`<div class="toast">${icon('checkCircle',17)} ${esc(message)}</div>`);window.clearTimeout(toastTimer);toastTimer=window.setTimeout(()=>{state.toast=null;document.querySelector('.toast')?.remove()},2600);}
let hideTimer=0;
function hideWindowAnimated():void{
 if(!native)return;
 window.clearTimeout(hideTimer);
 document.body.classList.add('corner-departure');
 hideTimer=window.setTimeout(()=>{void backend.windowAction('hide');document.body.classList.remove('corner-departure');},state.motion?190:0);
}
function setExpandedMode(full:boolean):void {
  if(state.expanded===full&&document.body.classList.contains('expanded-preview')===full)return;
  state.expanded=full;renderAll();
}
function renderAll():void {
  const previousScroll=root.querySelector<HTMLElement>('.scroll-area')?.scrollTop||0;
  root.innerHTML=render(snapshot,state);
  const nextScroll=root.querySelector<HTMLElement>('.scroll-area');if(nextScroll)nextScroll.scrollTop=previousScroll;
  // Browser auto-scrolling a control in a wide modal can shift absolutely
  // positioned widgets. Never retain a horizontal scroll on the app shell.
  const shell=root.querySelector<HTMLElement>('.shell');if(shell) shell.scrollLeft=0;
  if(state.editingNote){root.querySelector('.shell')?.insertAdjacentHTML('beforeend',editorView(state.editingNote,state,snapshot));setupEditor(snapshot,state,()=>{});}
  const body=document.body;body.classList.toggle('expanded-preview',state.expanded);body.classList.toggle('reduced-motion',!state.motion);body.setAttribute('lang',state.language);
  if(commandOpen)showCommandPalette();
  mountAssistant(root,snapshot,state.language,async()=>{snapshot=await backend.bootstrap();renderAll();},(view)=>{if(['today','tomorrow','routines','calendar','notes','focus'].includes(view))navigate(view as View);});
  root.querySelector<HTMLInputElement>('[autofocus]')?.focus();
}
function navigate(view:View):void {
 if(view===state.view&&!state.modal&&!state.editingNote)return;
 const hadOverlay=Boolean(state.modal||state.editingNote);
 state.view=view;state.modal=null;state.categoryFilter='All';
 const shell=root.querySelector<HTMLElement>('.shell');
 if(!shell||hadOverlay){renderAll();return;}
 // Preserve the native window, assistant overlay, focus timer, and shell layers.
 // Only replace the section-specific workspace and dock: full root.innerHTML
 // teardown on each navigation caused visible delays in WebKitGTK.
 const fragment=document.createElement('div');fragment.innerHTML=render(snapshot,state);
 const next=fragment.querySelector<HTMLElement>('.shell');
 const workspace=next?.querySelector<HTMLElement>('.workspace');
 const dock=next?.querySelector<HTMLElement>('.app-dock');
 const oldWorkspace=shell.querySelector<HTMLElement>('.workspace');
 const oldDock=shell.querySelector<HTMLElement>('.app-dock');
 if(!workspace||!dock||!oldWorkspace||!oldDock){renderAll();return;}
 oldWorkspace.replaceWith(workspace);
 oldDock.replaceWith(dock);
 shell.querySelector('.quick-add')?.remove();
 const nextQuick=next?.querySelector<HTMLElement>('.quick-add');
 if(nextQuick)dock.before(nextQuick);
 shell.dataset.view=view;
}
function appDate():string{return state.view==='tomorrow'?offset(1):state.view==='calendar'?state.selectedDate:today();}
function parseCapture(raw:string,defaultDate:string):Task{
 const task=newTask(defaultDate);let title=raw;
 const time=title.match(/(?:^|\s)@([01]?\d|2[0-3]):([0-5]\d)(?=\s|$)/);
 if(time){task.due_time=`${time[1].padStart(2,'0')}:${time[2]}`;title=title.replace(time[0],' ');}
 const tomorrow=/(?:^|\s)(tomorrow|فردا)(?=\s|$)/i;
 if(tomorrow.test(title)){task.due_date=offset(1);title=title.replace(tomorrow,' ');}
 const category=title.match(/(?:^|\s)#([\p{L}\p{N}_-]+)/u);
 if(category){const name=category[1].toLowerCase();task.category=name==='work'?'Work':name==='study'?'Study':name==='ideas'?'Ideas':name==='personal'?'Personal':category[1];title=title.replace(category[0],' ');}
 const high=/(?:^|\s)!!(?=\s|$)/;if(high.test(title)){task.priority=2;title=title.replace(high,' ');}
 const medium=/(?:^|\s)!(?=\s|$)/;if(medium.test(title)){task.priority=1;title=title.replace(medium,' ');}
 task.title=title.replace(/\s+/g,' ').trim();return task;
}
function setTask(task:Task):void{
 const idx=snapshot.tasks.findIndex(t=>t.id===task.id);
 if(idx>=0)snapshot.tasks[idx]=task;else snapshot.tasks.push(task);
}
async function updateTask(task:Task):Promise<void>{
  try {const result=await backend.saveTask(task);setTask(result);state.modal=null;state.editingTask=null;renderAll();toast('Task saved');}
  catch(error){toast('Could not save task');console.error(error);}
}
function showTask(task:Task):void{state.editingTask={...task};state.modal='task';renderAll();}
function showRoutine(routine:Routine):void{state.editingRoutine={...routine};state.modal='routine';renderAll();updateRoutinePreview();}
let previewDebounce=0;
function scheduleRoutinePreview():void{window.clearTimeout(previewDebounce);previewDebounce=window.setTimeout(updateRoutinePreview,125);}
function updateRoutinePreview():void {
 const form=document.querySelector<HTMLFormElement>('#routine-form');const container=document.querySelector<HTMLElement>('#routine-next-preview');if(!form||!container)return;
 const data=new FormData(form);const r={...(state.editingRoutine||routineDraft(today()))};
 r.schedule_kind=String(data.get('schedule_kind')||r.schedule_kind) as ScheduleKind;
 r.start_date=String(data.get('start_date')||r.start_date);
 const solar=String(data.get('start_date_solar')||'').trim();if(state.calendarSystem==='jalali'&&solar)r.start_date=solarToISO(solar)||r.start_date;
 r.interval_days=Number(data.get('interval_days')||3);r.month_day=Number(data.get('month_day')||1);
 r.weekdays_mask=Array.from({length:7},(_,i)=>data.has(`weekday_${i}`)?1<<i:0).reduce((a,b)=>a|b,0);
 const list=(key:string)=>String(data.get(key)||'').split(/[,،\s]+/).map(Number).filter(n=>Number.isInteger(n)&&n>0);
 const dates=(key:string)=>String(data.get(key)||'').split(/[,،\s]+/).map(x=>x.trim()).filter(Boolean).map(x=>solarToISO(x)||x);
 r.rule_json=JSON.stringify({calendar:String(data.get('rule_calendar')||'gregorian'),parity:String(data.get('rule_parity')||'all'),day_class:String(data.get('rule_day_class')||'all'),weekend_days:String(data.get('rule_weekend')||'4').split(/[,،\s]+/).map(Number).filter(n=>n>=0&&n<=6),months:list('rule_months'),month_days:list('rule_month_days'),include_dates:dates('rule_includes'),exclude_dates:dates('rule_excludes')});
 if(r.schedule_kind==='anytime'){container.textContent=state.language==='fa'?'بدون تاریخ مشخص':'No fixed schedule';return;}
 let day=today();const found:string[]=[];
 for(let i=0;i<400&&found.length<8;i++,day=shiftDay(day,1)){if(occursOn(r,day))found.push(dayLabel(day,state.language,{month:'short',day:'numeric'}));}
 container.innerHTML=found.length?found.map(x=>`<span>${esc(x)}</span>`).join(''):`<small>${state.language==='fa'?'در بازه ۴۰۰ روزه نوبتی نیست':'No matching occurrence in 400 days'}</small>`;
}
function replaceRoutine(routine:Routine):void{const index=snapshot.routines.findIndex(x=>x.id===routine.id);if(index>=0)snapshot.routines[index]=routine;else snapshot.routines.unshift(routine);}
async function saveRoutine(routine:Routine,items:RoutineItem[]):Promise<void>{
 try{const result=await backend.saveRoutinePlan(routine,items);replaceRoutine(result.routine);
 snapshot.routine_items=snapshot.routine_items.filter(x=>x.routine_id!==result.routine.id).concat(result.items);state.modal=null;state.editingRoutine=null;renderAll();toast(state.language==='fa'?'روتین ذخیره شد':'Routine saved');}
 catch(error){console.error(error);toast(String(error));}
}
async function checkIn(id:number,date:string,undo=false):Promise<void>{
 try{
  if(undo){await backend.undoRoutine(id,date);const had=snapshot.routine_completions.some(c=>c.routine_id===id&&c.occurrence_date===date);snapshot.routine_completions=snapshot.routine_completions.filter(c=>!(c.routine_id===id&&c.occurrence_date===date));if(had){const r=snapshot.routines.find(r=>r.id===id);if(r)r.completion_count=Math.max(0,r.completion_count-1);}}
  else{const result=await backend.completeRoutine(id,date);if(!snapshot.routine_completions.some(c=>c.id===result.id)){
   snapshot.routine_completions.unshift(result);{const r=snapshot.routines.find(r=>r.id===id);if(r)r.completion_count++;}
  }}
  renderAll();toast(undo?(state.language==='fa'?'ثبت انجام بازگردانده شد':'Check-in undone'):(state.language==='fa'?'انجام روتین ثبت شد ✨':'Routine completed ✨'));
 }catch(error){console.error(error);toast(String(error));}
}

async function loadNote(id:number):Promise<void>{
 const note=snapshot.notes.find(n=>n.id===id);if(!note)return;
 state.editingNote={...note};renderAll();
}
async function closeNote():Promise<void>{if(busy)return;busy=true;try{await leaveEditor();state.editingNote=null;renderAll();}finally{busy=false;}}
async function saveSettings(form:HTMLFormElement):Promise<void>{
 const data=new FormData(form);
 const changes:Record<string,string>={language:String(data.get('language')||'en'),voice:String(data.get('voice')==='on'),reminder_chime:String(data.get('reminder_chime')==='on'),motion:String(data.get('motion')==='on'),categories:String(data.get('categories')||'Personal,Work,Study,Ideas')};
 try{for(const [key,value] of Object.entries(changes)){await backend.saveSetting(key,value);snapshot.settings[key]=value;}
  state.language=changes.language==='fa'?'fa':'en';if(!snapshot.settings.calendar_system)state.calendarSystem=state.language==='fa'?'jalali':'gregorian';state.motion=changes.motion==='true';state.modal=null;renderAll();toast('Preferences saved');
 }catch(error){toast('Could not save settings');console.error(error);}
}
function chooseDate(day:string):void{
 state.selectedDate=day;
 const dt=new Date(`${day}T12:00:00`);
 state.calendarMonth=new Date(dt.getFullYear(),dt.getMonth(),1);
 if(state.view!=='calendar')state.view='calendar';renderAll();
}
function shiftMonth(delta:number):void{state.calendarMonth=shiftCalendarMonth(state.calendarMonth,delta,state.calendarSystem==='jalali'?'fa':'en');renderAll();}
function formatTime(seconds:number):string {return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;}
function focusTick():void{
 if(!state.focusRunning)return;
 const seconds=Math.max(0,Math.ceil((state.focusEnds-Date.now())/1000));state.focusRemaining=seconds;
 const label=document.querySelector('#focus-time');if(label)label.textContent=formatTime(seconds);
 const ring=document.querySelector<HTMLElement>('.focus-ring');if(ring)ring.style.setProperty('--progress',String(100*(1-seconds/(state.focusDuration*60))));
 if(seconds===0){state.focusRunning=false;state.focusEnds=0;renderAll();toast('Focus session complete ✨');
   try{const ctx=new AudioContext();const osc=ctx.createOscillator();const gain=ctx.createGain();osc.frequency.value=660;gain.gain.value=.045;osc.connect(gain).connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+.18);osc.onended=()=>void ctx.close();}catch{}
 }
}
function commandResults(query:string):{label:string,meta:string,action:string,id?:number}[]{
 const q=query.toLocaleLowerCase();const entries=[
 {label:'Go to Today',meta:'Navigation',action:'navigate-today'},
 {label:'Tomorrow',meta:'Navigation',action:'navigate-tomorrow'},
 {label:'Open Calendar',meta:'Navigation',action:'navigate-calendar'},
 {label:'My Notes',meta:'Navigation',action:'navigate-notes'},
 {label:'Start Focus',meta:'Navigation',action:'navigate-focus'},
 {label:'Open Routines',meta:'Navigation',action:'navigate-routines'},
 {label:'New Routine',meta:'Create',action:'add-routine'},
 {label:'Add a task',meta:'Create',action:'add-task'},
 {label:'Create a note',meta:'Create',action:'new-note'},
 ...snapshot.tasks.map(t=>({label:t.title,meta:`Task · ${t.category}`,action:'edit-task',id:t.id})),
 ...snapshot.notes.map(n=>({label:n.title||'Untitled',meta:`Note · ${n.category}`,action:'open-note',id:n.id})),
 ...snapshot.routines.map(r=>({label:r.title,meta:`Routine · ${r.category}`,action:'edit-routine',id:r.id}))
 ];return entries.filter(x=>`${x.label} ${x.meta}`.toLocaleLowerCase().includes(q)).slice(0,9);
}
function renderPaletteResults(q:string):string{return commandResults(q).map((r,i)=>`<button class="palette-result ${i===0?'picked':''}" data-action="${r.action}" ${r.id?`data-id="${r.id}"`:''}><span class="palette-result-icon">${icon(r.action.startsWith('navigate')?'arrow':r.meta.startsWith('Note')?'notes':r.meta.startsWith('Task')?'checkCircle':r.meta.startsWith('Routine')?'routine':'plus',17)}</span><span><strong>${esc(r.label)}</strong><small>${esc(r.meta)}</small></span><span class="palette-enter">↵</span></button>`).join('')||'<div class="palette-empty">No matches yet.</div>';}
function showCommandPalette():void{commandOpen=true;document.querySelector('#command-overlay')?.remove();document.querySelector('.shell')?.insertAdjacentHTML('beforeend',`<div id="command-overlay" class="command-scrim" data-action="close-palette"><div class="command-card"><label class="command-search">${icon('search',20)}<input id="command-input" autocomplete="off" placeholder="Search tasks, notes, actions…" autofocus/><kbd>ESC</kbd></label><div id="command-results">${renderPaletteResults('')}</div><footer>ROOZ COMMAND CENTER <span>↑ ↓ TO NAVIGATE · ENTER TO OPEN</span></footer></div></div>`);document.querySelector<HTMLInputElement>('#command-input')?.focus();}
function hidePalette():void{commandOpen=false;document.querySelector('#command-overlay')?.remove();}
function addChecklistLine(after?:HTMLElement,depth=0,title='',linkedId:number|null=null):void{
 const list=document.querySelector<HTMLElement>('#routine-checklist-editor');if(!list)return;
 const html=routineChecklistEditorItem({id:0,routine_id:state.editingRoutine?.id||0,title,details:'',required:true,position:list.children.length,weekdays_mask:127,depth,linked_routine_id:linkedId},state,snapshot);
 if(after)after.insertAdjacentHTML('afterend',html);else list.insertAdjacentHTML('beforeend',html);
 const inserted=(after?after.nextElementSibling:list.lastElementChild) as HTMLElement|null;
 const input=inserted?.querySelector<HTMLInputElement>('.checklist-item-title');input?.focus({preventScroll:true});
 // The routine editor is scrollable: keep the new entry and keyboard caret in
 // view even with 100+ items (the previous implementation left it offscreen).
 requestAnimationFrame(()=>inserted?.scrollIntoView({block:'nearest',behavior:state.motion?'smooth':'instant'}));
}
function pasteChecklistLines(text:string,after?:HTMLElement):void{
 const lines=text.split(/\r?\n/).map(s=>s.replace(/^\s*(?:[-*•]|\d+[.)]|☐|☑)\s*/,'').trim()).filter(Boolean).slice(0,150);
 const list=document.querySelector<HTMLElement>('#routine-checklist-editor');if(!list||!lines.length)return;
 const depth=Math.max(0,Math.min(3,Number(after?.dataset.depth||0)));
 // Insert large clipboard lists as one DOM operation. Focusing and animating
 // every single line used to trigger hundreds of layouts while pasting.
 const content=lines.map((title,index)=>routineChecklistEditorItem({id:0,routine_id:state.editingRoutine?.id||0,title,details:'',required:true,position:list.children.length+index,weekdays_mask:127,depth,linked_routine_id:null},state,snapshot)).join('');
 if(after)after.insertAdjacentHTML('afterend',content);else list.insertAdjacentHTML('beforeend',content);
 const inserted=after?(Array.from(list.children).slice(Array.from(list.children).indexOf(after)+1,Array.from(list.children).indexOf(after)+1+lines.length).at(-1) as HTMLElement|undefined):(list.lastElementChild as HTMLElement|null);
 inserted?.querySelector<HTMLInputElement>('.checklist-item-title')?.focus({preventScroll:true});
 requestAnimationFrame(()=>inserted?.scrollIntoView({block:'nearest',behavior:state.motion?'smooth':'instant'}));
}
async function handleAction(target:HTMLElement):Promise<void>{
 const action=target.dataset.action;const id=Number(target.dataset.id||0);
 if(!action)return;
 switch(action){
  case 'navigate':navigate(target.dataset.view as View);break;
  case 'navigate-today':hidePalette();navigate('today');break;
  case 'navigate-tomorrow':hidePalette();navigate('tomorrow');break;
  case 'navigate-calendar':hidePalette();navigate('calendar');break;
  case 'navigate-notes':hidePalette();navigate('notes');break;
  case 'navigate-focus':hidePalette();navigate('focus');break;
  case 'navigate-routines':hidePalette();navigate('routines');break;
  case 'view-tomorrow':navigate('tomorrow');break;
  case 'add-routine-item':{
   addChecklistLine();
   break;
  }
  case 'add-routine-subitem':{const row=target.closest<HTMLElement>('.checklist-edit-row');if(row)addChecklistLine(row,Math.min(3,Number(row.dataset.depth||0)+1));break;}
  case 'indent-routine-item':case 'outdent-routine-item':{
   const row=target.closest<HTMLElement>('.checklist-edit-row');if(!row)return;
   const next=Math.max(0,Math.min(3,Number(row.dataset.depth||0)+(action==='indent-routine-item'?1:-1)));
   row.dataset.depth=String(next);row.style.setProperty('--nest',String(next));const label=row.querySelector<HTMLElement>('.checklist-nesting span');if(label)label.textContent=`${state.language==='fa'?'سطح':'Level'} ${next+1}`;break;
  }
  case 'paste-routine-items':{
   try {const text=await navigator.clipboard.readText();if(text.trim())pasteChecklistLines(text);else toast('Clipboard has no text');}
   catch {toast(state.language==='fa'?'با Ctrl+V فهرست را در عنوان مورد وارد کنید':'Paste your lines into an item title using Ctrl+V');}break;
  }
  case 'remove-routine-item':{target.closest('.checklist-edit-row')?.remove();break;}
  case 'toggle-routine-item':{
   if(busy)return;busy=true;
   try{const date=target.dataset.date||today();const result=await backend.toggleRoutineItem(id,date);
    const item=snapshot.routine_items.find(x=>x.id===id);if(!item)return;
    const idx=snapshot.routine_item_completions.findIndex(x=>x.item_id===id&&x.occurrence_date===date);
    if(result.checked&&idx<0)snapshot.routine_item_completions.push({id:-Date.now(),item_id:id,occurrence_date:date,completed_at:Date.now()/1000|0});
    if(!result.checked&&idx>=0)snapshot.routine_item_completions.splice(idx,1);
    const wholeIndex=snapshot.routine_completions.findIndex(x=>x.routine_id===item.routine_id&&x.occurrence_date===date);
    const routine=snapshot.routines.find(x=>x.id===item.routine_id);
    if(result.whole_complete&&wholeIndex<0){snapshot.routine_completions.push({id:-Date.now(),routine_id:item.routine_id,occurrence_date:date,completed_at:Date.now()/1000|0});if(routine)routine.completion_count++;}
    if(!result.whole_complete&&wholeIndex>=0){snapshot.routine_completions.splice(wholeIndex,1);if(routine)routine.completion_count=Math.max(0,routine.completion_count-1);}
    // Replace only affected routine sections; a full WebView teardown on each
    // checkbox used to reset scroll, redraw the assistant and cause lag.
    const fragment=document.createElement('div');fragment.innerHTML=render(snapshot,state);
    for(const selector of ['.daily-checklists','.routine-portal','.routine-grid','.routine-week-plan']){
     const current=root.querySelector<HTMLElement>(selector),updated=fragment.querySelector<HTMLElement>(selector);
     if(current&&updated){
      if(selector==='.daily-checklists'){
       const opened=new Set([...current.querySelectorAll<HTMLDetailsElement>('.daily-checklist-group[open]')].map(el=>el.querySelector('strong')?.textContent));
       updated.querySelectorAll<HTMLDetailsElement>('.daily-checklist-group').forEach(el=>{el.open=opened.has(el.querySelector('strong')?.textContent);});
      }
      current.replaceWith(updated);
     }
    }
   }catch(err){toast(String(err));}
   finally{busy=false;}break;
  }
  case 'add-routine':hidePalette();showRoutine(routineDraft(today()));break;
  case 'edit-routine':hidePalette();{const r=snapshot.routines.find(x=>x.id===id);if(r)showRoutine(r);break;}
  case 'routine-plan-day':state.routinePlanDate=target.dataset.date||today();renderAll();break;
  case 'routine-filter':state.routineFilter=(target.dataset.filter||'all') as typeof state.routineFilter;renderAll();break;
  case 'complete-routine':await checkIn(id,target.dataset.date||today());break;
  case 'undo-routine':await checkIn(id,target.dataset.date||today(),true);break;
  case 'open-routine-history':state.historyRoutineId=id;state.modal='history';renderAll();break;
  case 'pause-routine':case 'resume-routine':{
   try{const r=await backend.setRoutineEnabled(id,action==='resume-routine');replaceRoutine(r);renderAll();toast(r.enabled?'Routine resumed':'Routine paused');}
   catch(error){toast(String(error));}break;
  }
  case 'delete-routine':if(confirm(state.language==='fa'?'این روتین و تمام سوابق آن حذف شوند؟':'Delete this routine and all its check-in history permanently?')){
   try{await backend.deleteRoutine(id);snapshot.routines=snapshot.routines.filter(r=>r.id!==id);snapshot.routine_completions=snapshot.routine_completions.filter(c=>c.routine_id!==id);state.editingRoutine=null;state.modal=null;renderAll();toast('Routine deleted');}
   catch(error){toast(String(error));}
  }break;
  case 'add-task':hidePalette();showTask(newTask(appDate()));break;
  case 'edit-task':hidePalette();{const t=snapshot.tasks.find(x=>x.id===id);if(t)showTask(t);break;}
  case 'toggle-task':{
   try{const saved=await backend.toggleTask(id);setTask(saved);
    // Keep today's scroll and microphone panel alive while the task list and
    // progress indicator update. Most frequent interaction deserves no reload.
    const fragment=document.createElement('div');fragment.innerHTML=render(snapshot,state);
    for(const selector of ['.progress-hero','.tasks-list','.section-title-row','.category-chips']){
     const old=root.querySelector<HTMLElement>(selector),newNode=fragment.querySelector<HTMLElement>(selector);
     if(old&&newNode)old.replaceWith(newNode);
    }
    if(saved.done)toast('Lovely, one less thing ✨');}
   catch(err){toast('Could not update task');console.error(err);}break;
  }
  case 'snooze-task':try{await backend.snooze(id,5);state.modal=null;renderAll();toast('Reminder snoozed 5 minutes');}catch(e){toast('Could not snooze reminder');console.error(e);}break;
  case 'delete-task':if(confirm('Delete this task permanently?')){await backend.deleteTask(id);snapshot.tasks=snapshot.tasks.filter(x=>x.id!==id);state.modal=null;renderAll();toast('Task deleted');}break;
  case 'filter-category':state.categoryFilter=target.dataset.category||'All';renderAll();break;
  case 'select-date':chooseDate(target.dataset.date||today());break;
  case 'toggle-calendar-system':{
    state.calendarSystem=state.calendarSystem==='jalali'?'gregorian':'jalali';
    void backend.saveSetting('calendar_system',state.calendarSystem);
    renderAll();break;
  }
  case 'previous-month':shiftMonth(-1);break;
  case 'next-month':shiftMonth(1);break;
  case 'routine-preset':{
    const kind=target.dataset.preset||'none';const form=document.querySelector<HTMLFormElement>('#routine-form');if(!form)return;
    const repeat=form.querySelector<HTMLSelectElement>('[name="schedule_kind"]');const parity=form.querySelector<HTMLSelectElement>('[name="rule_parity"]');const cl=form.querySelector<HTMLSelectElement>('[name="rule_day_class"]');
    if(repeat)repeat.value='daily';if(parity)parity.value=kind==='odd'||kind==='even'?kind:'all';if(cl)cl.value=kind==='weekend'||kind==='workday'?kind:'all';
    repeat?.dispatchEvent(new Event('change',{bubbles:true}));updateRoutinePreview();break;
  }
  case 'open-ai':void openAssistant();break;
  case 'toggle-fullscreen':{
   try{const fullscreen=await backend.windowAction(state.expanded?'compact':'expand');setExpandedMode(fullscreen);}
   catch(e){toast(String(e));}break;
  }
  case 'open-settings':state.modal='settings';renderAll();break;
  case 'dismiss-modal':if(target.classList.contains('modal-scrim')||target.closest('button')){state.modal=null;state.editingTask=null;state.editingRoutine=null;renderAll();}break;
  case 'toggle-expand':{
    const expanded=!state.expanded;
    try{const result=await backend.windowAction(expanded?'expand':'compact');setExpandedMode(result);}
    catch(e){console.warn(e);toast('Window resizing unavailable');}
    break;
  }
  case 'hide':if(native)hideWindowAnimated();else toast('In the desktop app this hides Rooz to its tray');break;
  case 'export-data':{
   const kind=(document.querySelector<HTMLSelectElement>('#export-format')?.value||'sqlite') as ExportFormat|'sqlite';
   try{const path=kind==='sqlite'?await backend.backupDatabase():await saveExport(snapshot,kind);toast(`${state.language==='fa'?'ذخیره شد':'Saved'}: ${path.split('/').at(-1)}`);}catch(e){toast(String(e));}break;
  }
  case 'import-data':document.querySelector<HTMLInputElement>('#import-file')?.click();break;
  case 'quit-native':if(native){await backend.windowAction('quit');}else toast('Quit is available in the desktop app');break;
  case 'new-note':hidePalette();state.editingNote=newNote();renderAll();document.querySelector<HTMLInputElement>('#note-title')?.focus();break;
  case 'open-note':hidePalette();await loadNote(id);break;
  case 'close-note':await closeNote();break;
  case 'delete-note':{
   const noteId=state.editingNote?.id||0;if(confirm('Delete this note permanently?')){if(noteId)await backend.deleteNote(noteId);snapshot.notes=snapshot.notes.filter(n=>n.id!==noteId);state.editingNote=null;renderAll();toast('Note deleted');}break;
  }
  case 'toggle-markdown':toggleMarkdown();break;
  case 'export-note':downloadNote();toast('Markdown exported');break;
  case 'apply-link':applyLink();break;
  case 'cancel-link':cancelLink();break;
  case 'open-url':try{await backend.openExternal(target.dataset.url||'');}catch{toast('Could not open URL');}break;
  case 'focus-duration':state.focusDuration=Number(target.dataset.minutes||25);state.focusRemaining=state.focusDuration*60;state.focusRunning=false;renderAll();break;
  case 'focus-toggle':if(state.focusRunning){state.focusRemaining=Math.max(0,Math.ceil((state.focusEnds-Date.now())/1000));state.focusRunning=false;}
   else{state.focusEnds=Date.now()+state.focusRemaining*1000;state.focusRunning=true;}renderAll();break;
  case 'focus-reset':state.focusRunning=false;state.focusRemaining=state.focusDuration*60;renderAll();break;
  case 'close-palette':if(target.id==='command-overlay')hidePalette();break;
 }
}
root.addEventListener('click',event=>{
 const target=(event.target as HTMLElement).closest<HTMLElement>('[data-action]');
 if(target?.classList.contains('modal-scrim') && event.target!==target)return;
 if(target?.classList.contains('command-scrim') && event.target!==target)return;
 if(target)void handleAction(target);
});
root.addEventListener('submit',event=>{
 const form=event.target as HTMLFormElement;event.preventDefault();
 if(form.id==='quick-form'){
   const input=form.querySelector<HTMLInputElement>('#quick-title')!;const item=parseCapture(input.value,form.dataset.date||today());
   if(!item.title){input.focus();return;}void updateTask(item);
 } else if(form.id==='task-form'){
   const data=new FormData(form);const task={...(state.editingTask||newTask(appDate()))};
   task.title=String(data.get('title')||'').trim();task.details=String(data.get('details')||'');task.due_date=String(data.get('due_date')||today());
   if(state.calendarSystem==='jalali'){const input=String(data.get('due_date_solar')||'').trim();if(input){const iso=solarToISO(input);if(!iso){toast('Invalid Shamsi date');return;}task.due_date=iso;}}
   task.due_time=String(data.get('due_time')||'');task.category=String(data.get('category')||'Personal');task.priority=Number(data.get('priority')||0);task.recurrence=String(data.get('recurrence')||'none') as Task['recurrence'];task.remind_before=Number(data.get('remind_before')||0);
   if(task.title)void updateTask(task);
 } else if(form.id==='routine-form'){
   const data=new FormData(form);const r={...(state.editingRoutine||routineDraft(today()))};
   r.title=String(data.get('title')||'').trim();r.details=String(data.get('details')||'');r.category=String(data.get('category')||'Personal').trim();
   r.schedule_kind=String(data.get('schedule_kind')||'anytime') as ScheduleKind;
   r.weekdays_mask=Array.from({length:7},(_,i)=>data.has(`weekday_${i}`)?(1<<i):0).reduce((a,b)=>a|b,0);
   r.interval_days=Number(data.get('interval_days')||1);r.month_day=Number(data.get('month_day')||1);
   r.start_date=String(data.get('start_date')||today());
   if(state.calendarSystem==='jalali'){const input=String(data.get('start_date_solar')||'').trim();if(input){const iso=solarToISO(input);if(!iso){toast('Invalid Shamsi start date');return;}r.start_date=iso;}}
   r.due_time=String(data.get('due_time')||'');
   r.remind_before=Number(data.get('remind_before')||0);r.enabled=data.get('enabled')==='on';
   const nums=(name:string)=>String(data.get(name)||'').split(/[,،\s]+/).map(x=>Number(x)).filter(x=>Number.isInteger(x)&&x>0);
   const dates=(name:string)=>String(data.get(name)||'').split(/[,،\s]+/).map(x=>x.trim()).filter(Boolean).map(x=>solarToISO(x)||x);
   const rule={calendar:String(data.get('rule_calendar')||'gregorian'),parity:String(data.get('rule_parity')||'all'),day_class:String(data.get('rule_day_class')||'all'),weekend_days:String(data.get('rule_weekend')||'4').split(/[,،\s]+/).map(Number).filter(x=>Number.isInteger(x)&&x>=0&&x<=6),months:nums('rule_months'),month_days:nums('rule_month_days'),include_dates:dates('rule_includes'),exclude_dates:dates('rule_excludes')};
   if(rule.months.some(x=>x>12)||rule.month_days.some(x=>x>31)||[...rule.include_dates,...rule.exclude_dates].some(x=>!/^\d{4}-\d\d-\d\d$/.test(x))){toast('Check calendar rule values');return;}
   r.rule_json=JSON.stringify(rule);
   if(r.schedule_kind==='weekly'&&!r.weekdays_mask){toast('Choose at least one weekday');return;}
   const items=[...form.querySelectorAll<HTMLElement>('.checklist-edit-row')].map((row,index)=>{
    const title=row.querySelector<HTMLInputElement>('[name="checklist_title"]')?.value.trim()||'';
    const details=row.querySelector<HTMLInputElement>('[name="checklist_details"]')?.value.trim()||'';
    const mask=Array.from({length:7},(_,i)=>row.querySelector<HTMLInputElement>(`[name="item_weekday_${i}"]`)?.checked?1<<i:0).reduce((a,b)=>a|b,0);
    return {id:Number(row.dataset.itemId||0),routine_id:r.id,title,details,position:index,
      required:Boolean(row.querySelector<HTMLInputElement>('[name="checklist_required"]')?.checked),weekdays_mask:mask,
      depth:Number(row.dataset.depth||0),linked_routine_id:Number(row.querySelector<HTMLSelectElement>('[name="linked_routine_id"]')?.value||0)||null} as RoutineItem;
   });
   if(items.some(x=>!x.title||!x.weekdays_mask)){toast(state.language==='fa'?'عنوان و حداقل یک روز برای هر مورد لازم است':'Every checklist item needs text and at least one weekday');return;}
   if(r.title)void saveRoutine(r,items);
 } else if(form.id==='settings-form')void saveSettings(form);
});
root.addEventListener('input',event=>{
 const input=event.target as HTMLInputElement;
 if(input.closest('.routine-checklist-editor'))return;
 if(input.closest('#routine-form')){
  if(input.name==='start_date_solar'){const key=solarToISO(input.value);const target=document.querySelector<HTMLInputElement>('[name="start_date"]');if(key&&target)target.value=key;}
  scheduleRoutinePreview();return;
 }
 if(input.closest('#task-form')&&input.name==='due_date_solar'){const key=solarToISO(input.value);const target=document.querySelector<HTMLInputElement>('[name="due_date"]');if(key&&target)target.value=key;}
 if(input.id==='note-search'){
  state.noteSearch=input.value;
  const grid=document.querySelector<HTMLElement>('.notes-grid');
  if(grid)grid.innerHTML=renderNoteCards(snapshot,state);
 } else if(input.id==='routine-search'){
  state.routineSearch=input.value;
  const grid=document.querySelector<HTMLElement>('.routine-grid');if(grid)grid.innerHTML=renderRoutineResults(snapshot,state);
 } else if(input.id==='command-input'){
   const results=document.querySelector('#command-results');if(results)results.innerHTML=renderPaletteResults(input.value);
 }
});
root.addEventListener('paste',event=>{
 const field=(event.target as HTMLElement).closest<HTMLInputElement>('.checklist-item-title');
 if(!field)return;
 const pasted=event.clipboardData?.getData('text/plain')||'';
 if(!pasted.includes('\n'))return;
 event.preventDefault();
 const lines=pasted.split(/\r?\n/).map(v=>v.trim()).filter(Boolean);
 field.value=lines.shift()||field.value;
 pasteChecklistLines(lines.join('\n'),field.closest<HTMLElement>('.checklist-edit-row')||undefined);
});
root.addEventListener('change',event=>{
 const input=event.target as HTMLInputElement;
 if(input.id==='import-file'){
  const file=input.files?.[0];if(!file)return;
  if(file.size>20_000_000){toast('Backup is too large');return;}
  void file.text().then(async text=>{
   if(!confirm(state.language==='fa'?'اطلاعات این فایل بدون حذف داده‌های فعلی اضافه شوند؟ (ورود تکراری، موارد تکراری ایجاد می‌کند)':'Merge this file into Rooz? Existing data stays untouched; importing the same file twice creates duplicates.'))return;
   const result=await mergeImport(text,file.name);snapshot=await backend.bootstrap();state.modal=null;renderAll();toast(result);
  }).catch(e=>toast(String(e)));
  return;
 }
 if(input.id==='routine-schedule-select'){
  document.querySelectorAll<HTMLElement>('[data-repeat-field]').forEach(el=>el.hidden=el.dataset.repeatField!==input.value);
  document.querySelectorAll<HTMLElement>('[data-anytime-help]').forEach(el=>el.hidden=input.value!=='anytime');
  const time=document.querySelector<HTMLInputElement>('#routine-form input[name="due_time"]');if(time)time.disabled=input.value==='anytime';
  const reminder=document.querySelector<HTMLSelectElement>('#routine-form select[name="remind_before"]');if(reminder)reminder.disabled=input.value==='anytime';
 }
 if(input.closest('#routine-form')){
   if(input.name==='start_date'&&input.value){const solar=document.querySelector<HTMLInputElement>('[name="start_date_solar"]');if(solar)solar.value=isoToSolar(input.value);}
   if(input.name==='start_date_solar'&&input.value){const key=solarToISO(input.value);const gregorian=document.querySelector<HTMLInputElement>('[name="start_date"]');if(key&&gregorian)gregorian.value=key;}
   scheduleRoutinePreview();
 }
 if(input.closest('#task-form')){
   if(input.name==='due_date'&&input.value){const solar=document.querySelector<HTMLInputElement>('[name="due_date_solar"]');if(solar)solar.value=isoToSolar(input.value);}
   if(input.name==='due_date_solar'&&input.value){const key=solarToISO(input.value);const gregorian=document.querySelector<HTMLInputElement>('[name="due_date"]');if(key&&gregorian)gregorian.value=key;}
 }
});
// Interaction-driven 3D tilt, not a permanent animation loop.
let activeRoutineItem:HTMLElement|null=null;
let glassFrame=0;
root.addEventListener('pointermove',event=>{
 if(!state.motion)return;
 const hero=(event.target as HTMLElement).closest<HTMLElement>('.progress-hero');
 if(!hero)return;
 const rect=hero.getBoundingClientRect();
 const x=(event.clientX-rect.left)/rect.width, y=(event.clientY-rect.top)/rect.height;
 if(glassFrame)cancelAnimationFrame(glassFrame);
 glassFrame=requestAnimationFrame(()=>{
  hero.style.setProperty('--spot-x',`${Math.round(x*100)}%`);
  hero.style.setProperty('--spot-y',`${Math.round(y*100)}%`);
  hero.style.setProperty('--tilt-y',`${((x-.5)*2.6).toFixed(2)}deg`);
  hero.style.setProperty('--tilt-x',`${((.5-y)*2).toFixed(2)}deg`);
 });
});
root.addEventListener('pointerout',event=>{
 const hero=(event.target as HTMLElement).closest<HTMLElement>('.progress-hero');
 if(hero && !(event.relatedTarget instanceof Node && hero.contains(event.relatedTarget))){
  hero.style.removeProperty('--tilt-x');hero.style.removeProperty('--tilt-y');
 }
});
root.addEventListener('dragstart',event=>{
 const grip=(event.target as HTMLElement).closest<HTMLElement>('.checklist-item-grip');
 if(grip){activeRoutineItem=grip.closest<HTMLElement>('.checklist-edit-row');if(event.dataTransfer){event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain','routine-checklist');}return;}
 const item=(event.target as HTMLElement).closest<HTMLElement>('.task-row');if(!item)return;
 activeDrag=Number(item.dataset.taskId||0);item.classList.add('dragging');if(event.dataTransfer){event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',String(activeDrag));}
});
root.addEventListener('dragover',event=>{if(activeRoutineItem&&(event.target as HTMLElement).closest('.checklist-edit-row')){event.preventDefault();return;}const item=(event.target as HTMLElement).closest<HTMLElement>('.task-row');if(item&&activeDrag){event.preventDefault();document.querySelectorAll('.drop-target').forEach(x=>x.classList.remove('drop-target'));item.classList.add('drop-target');}});
root.addEventListener('dragend',()=>{activeRoutineItem=null;activeDrag=0;document.querySelectorAll('.dragging,.drop-target').forEach(x=>x.classList.remove('dragging','drop-target'));});
root.addEventListener('drop',event=>{
 const checklistTarget=(event.target as HTMLElement).closest<HTMLElement>('.checklist-edit-row');
 if(checklistTarget&&activeRoutineItem){event.preventDefault();
  if(checklistTarget!==activeRoutineItem){const parent=checklistTarget.parentNode;parent?.insertBefore(activeRoutineItem,checklistTarget);}
  activeRoutineItem=null;return;
 }
 const item=(event.target as HTMLElement).closest<HTMLElement>('.task-row');if(!item||!activeDrag)return;event.preventDefault();
 const before=Number(item.dataset.taskId||0);const date=appDate();const subset=snapshot.tasks.filter(t=>t.due_date===date).sort((a,b)=>a.position-b.position).map(t=>t.id);
 const from=subset.indexOf(activeDrag),to=subset.indexOf(before);if(from<0||to<0||from===to)return;
 subset.splice(from,1);subset.splice(to,0,activeDrag);subset.forEach((id,pos)=>{const t=snapshot.tasks.find(t=>t.id===id);if(t)t.position=pos;});
 void backend.reorder(subset).catch(error=>{console.error(error);toast('Could not reorder');});activeDrag=0;renderAll();
});
root.addEventListener('mousedown',event=>{
 if(event.button!==0||!native||state.expanded)return;
 const target=event.target as HTMLElement;
 // Title bar is draggable even in the voice overlay. Never steal clicks from
 // close, tabs, buttons, form fields or navigation.
 if(target.closest('button,input,select,textarea,a,[data-action],[data-ai-action]'))return;
 if(target.closest('.app-header,.ai-top'))void backend.windowAction('drag').catch(()=>{});
});
document.addEventListener('keydown',event=>{
 const target=event.target as HTMLElement;const editing=target.matches('input,textarea,[contenteditable="true"]');
 if(event.key==='Enter'&&target.matches('.checklist-item-title,.checklist-item-detail')){
  event.preventDefault();const row=target.closest<HTMLElement>('.checklist-edit-row');addChecklistLine(row||undefined,Number(row?.dataset.depth||0));return;
 }
 if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='s' && state.editingNote){event.preventDefault();void flushEditor();toast('Note saved');return;}
 if(event.key==='F11'){event.preventDefault();void backend.windowAction(state.expanded?'compact':'expand').then(setExpandedMode).catch(e=>toast(String(e)));return;}
 if((event.ctrlKey||event.metaKey)&&event.altKey&&event.code==='Space'){event.preventDefault();void openAssistant(true);return;}
 if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();if(state.editingNote){(document.querySelector<HTMLButtonElement>('[data-format="link"]')||null)?.click();}else showCommandPalette();return;}
 if(event.key==='Escape'){if(aiIsOpen()){closeAssistant();return;}if(commandOpen){hidePalette();return;}if(state.editingNote){void closeNote();return;}if(state.modal){state.modal=null;renderAll();return;}if(native)hideWindowAnimated();return;}
 if(commandOpen){if(event.key==='Enter'){
  const item=document.querySelector<HTMLElement>('.palette-result.picked')||document.querySelector<HTMLElement>('.palette-result');if(item){event.preventDefault();void handleAction(item);}return;}
  if(event.key==='ArrowDown'||event.key==='ArrowUp'){
   const items=[...document.querySelectorAll<HTMLElement>('.palette-result')];const i=Math.max(0,items.findIndex(x=>x.classList.contains('picked')));items[i]?.classList.remove('picked');items[(i+(event.key==='ArrowDown'?1:-1)+items.length)%items.length]?.classList.add('picked');event.preventDefault();return;
  }return;
 }
 if(editing||state.editingNote)return;
 if((event.ctrlKey||event.metaKey)&&/^[1-6]$/.test(event.key)){
  event.preventDefault();navigate((['today','tomorrow','routines','calendar','notes','focus'] as View[])[Number(event.key)-1]);return;
 }
 if(event.key==='/'&&!event.ctrlKey){event.preventDefault();if(state.view==='notes')document.querySelector<HTMLInputElement>('#note-search')?.focus();else if(state.view==='routines')document.querySelector<HTMLInputElement>('#routine-search')?.focus();else document.querySelector<HTMLInputElement>('#quick-title')?.focus();}
 if(event.key.toLowerCase()==='n'&&!event.ctrlKey){event.preventDefault();if(state.view==='notes'){state.editingNote=newNote();renderAll();}else if(state.view==='routines')showRoutine(routineDraft(today()));else showTask(newTask(appDate()));}
});
window.setInterval(focusTick,260);
// Refresh when local calendar date changes after midnight (not every animation frame).
let lastDay=today();window.setInterval(()=>{if(today()!==lastDay){lastDay=today();void backend.bootstrap().then(data=>{snapshot=data;renderAll();});}},60_000);
async function init(){
 try{snapshot=await backend.bootstrap();state.language=snapshot.settings.language==='fa'?'fa':'en';state.calendarSystem=snapshot.settings.calendar_system==='jalali'||(!snapshot.settings.calendar_system&&state.language==='fa')?'jalali':'gregorian';state.motion=snapshot.settings.motion!=='false';}
 catch(error){console.error(error);root.innerHTML=`<section class="fatal-error"><h1>Rooz could not open its database</h1><p>${esc(String(error))}</p></section>`;return;}
 document.body.classList.add('corner-arrival');
 renderAll();
 window.setTimeout(()=>document.body.classList.remove('corner-arrival'),520);
 if(native){
  try{
   await window.__TAURI__?.event?.listen('rooz-window-mode',e=>{
     setExpandedMode(Boolean(e.payload));
   });
   await window.__TAURI__?.event?.listen('rooz-window-shown',()=>{
     window.clearTimeout(hideTimer);document.body.classList.remove('corner-departure');
     document.body.classList.remove('corner-arrival');
     void document.body.offsetWidth;
     document.body.classList.add('corner-arrival');
     window.setTimeout(()=>document.body.classList.remove('corner-arrival'),520);
   });
   await window.__TAURI__?.event?.listen('rooz-navigate',e=>{
    const target=String(e.payload||'');
    if(target==='voice')void openAssistant(true);
    else if(target==='ai')void openAssistant(false);
    else if(target==='settings'){state.modal='settings';renderAll();}
    else if(['today','tomorrow','routines','calendar','notes','focus'].includes(target))navigate(target as View);
   });
   if(await backend.takeVoicePending())await openAssistant(true);
   // Warm Vosk once in the background; the first microphone command should
   // not wait for model initialization after recording finishes.
   window.setTimeout(()=>void backend.warmLocalVoice().catch(()=>{}),900);
  }catch(e){console.warn('AI shortcut listener:',e);}
 }
}
initAssistant(root);
void init();
