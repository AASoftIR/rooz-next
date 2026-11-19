//! Persistent reusable routine templates, idempotent occurrence check-ins, and
//! on-demand recurrence calculation. No changes to the legacy task schema.
use chrono::{Datelike, Duration, NaiveDate, NaiveDateTime};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::collections::VecDeque;

pub(crate) type Result<T> = std::result::Result<T, String>;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default)]
pub(crate) struct Routine {
    pub id: i64,
    pub title: String,
    pub details: String,
    pub category: String,
    pub schedule_kind: String,
    pub weekdays_mask: i64,
    pub interval_days: i64,
    pub month_day: i64,
    pub start_date: String,
    pub due_time: String,
    pub remind_before: i64,
    pub enabled: bool,
    pub created_at: i64,
    pub updated_at: i64,
    pub completion_count: i64,
    pub rule_json: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub(crate) struct RoutineCompletion {
    pub id: i64,
    pub routine_id: i64,
    pub occurrence_date: String,
    pub completed_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default)]
pub(crate) struct RoutineItem {
    pub id:i64, pub routine_id:i64, pub title:String, pub details:String, pub position:i64,
    pub required:bool, pub weekdays_mask:i64, pub depth:i64, pub linked_routine_id:Option<i64>,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub(crate) struct RoutineItemCompletion {
    pub id:i64, pub item_id:i64, pub occurrence_date:String, pub completed_at:i64,
}
#[derive(Serialize)]
pub(crate) struct PlanResult { pub routine:Routine, pub items:Vec<RoutineItem> }
#[derive(Serialize)]
pub(crate) struct ItemToggleResult {
    pub checked:bool,pub whole_complete:bool,
    // Complete, date-scoped deltas for nested links. No extra bootstrap/DB
    // query is needed just to repaint a checkbox.
    pub affected_items:Vec<(i64,bool)>,
    pub affected_routines:Vec<(i64,bool)>,
}

fn item_row(row:&rusqlite::Row<'_>)->rusqlite::Result<RoutineItem>{
    Ok(RoutineItem{id:row.get(0)?,routine_id:row.get(1)?,title:row.get(2)?,details:row.get(3)?,position:row.get(4)?,required:row.get::<_,i64>(5)?!=0,weekdays_mask:row.get(6)?,depth:row.get(7)?,linked_routine_id:row.get(8)?})
}
pub(crate) fn items(db:&Connection)->Result<Vec<RoutineItem>>{
    let mut stmt=db.prepare("SELECT id,routine_id,title,details,position,required,weekdays_mask,depth,linked_routine_id FROM routine_items WHERE active=1 ORDER BY routine_id,position,id").map_err(|e|e.to_string())?;
    let rows=stmt.query_map([],item_row).map_err(|e|e.to_string())?;
    rows.collect::<rusqlite::Result<Vec<_>>>().map_err(|e|e.to_string())
}
pub(crate) fn item_history(db:&Connection)->Result<Vec<RoutineItemCompletion>>{
    let mut stmt=db.prepare("SELECT id,item_id,occurrence_date,completed_at FROM routine_item_completions ORDER BY completed_at DESC,id DESC LIMIT 12000").map_err(|e|e.to_string())?;
    let rows=stmt.query_map([],|r|Ok(RoutineItemCompletion{id:r.get(0)?,item_id:r.get(1)?,occurrence_date:r.get(2)?,completed_at:r.get(3)?})).map_err(|e|e.to_string())?;
    rows.collect::<rusqlite::Result<Vec<_>>>().map_err(|e|e.to_string())
}
// SAVEPOINT ensures a routine template and its checklist are changed as one unit.
pub(crate) fn save_plan(db:&Connection,r:Routine,checklist:Vec<RoutineItem>)->Result<PlanResult>{
    if checklist.len()>150{return Err("Too many checklist items (maximum 150)".into());}
    for item in &checklist {
        if item.title.trim().is_empty()||item.title.chars().count()>250||item.details.len()>2000||!(1..=127).contains(&item.weekdays_mask)||!(0..=3).contains(&item.depth){return Err("Invalid checklist item, nesting depth or weekdays".into());}
    }
    db.execute_batch("SAVEPOINT rooz_save_plan").map_err(|e|e.to_string())?;
    let result:Result<PlanResult>=(||{
        let saved=save(db,r)?;
        // Reusable routine references may not form cycles, including indirect
        // A -> B -> C -> A links; prevent recursion in today's checklist.
        for item in &checklist {
            if let Some(child)=item.linked_routine_id {
                if child==saved.id{return Err("A routine cannot include itself".into());}
                let cycles:i64=db.query_row("WITH RECURSIVE chain(id) AS (SELECT ?1 UNION SELECT ri.linked_routine_id FROM routine_items ri JOIN chain c ON c.id=ri.routine_id WHERE ri.active=1 AND ri.linked_routine_id IS NOT NULL) SELECT EXISTS(SELECT 1 FROM chain WHERE id=?2)",params![child,saved.id],|r|r.get(0)).map_err(|e|e.to_string())?;
                if cycles!=0{return Err("Routine inclusion would create a cycle".into());}
            }
        }
        let mut ids=Vec::new();
        for (order,item) in checklist.iter().enumerate(){
            let id=if item.id>0 {
                // Cannot modify an item belonging to another template.
                let count=db.execute("UPDATE routine_items SET title=?1,details=?2,position=?3,required=?4,weekdays_mask=?5,active=1,depth=?8,linked_routine_id=?9 WHERE id=?6 AND routine_id=?7",
                    params![item.title.trim(),item.details,order as i64,item.required as i64,item.weekdays_mask,item.id,saved.id,item.depth,item.linked_routine_id]).map_err(|e|e.to_string())?;
                if count==0{return Err("Checklist item is not part of this routine".into());}
                item.id
            }else{
                db.execute("INSERT INTO routine_items(routine_id,title,details,position,required,weekdays_mask,depth,linked_routine_id) VALUES(?1,?2,?3,?4,?5,?6,?7,?8)",
                    params![saved.id,item.title.trim(),item.details,order as i64,item.required as i64,item.weekdays_mask,item.depth,item.linked_routine_id]).map_err(|e|e.to_string())?;
                db.last_insert_rowid()
            };
            ids.push(id);
        }
        // Soft delete removed items: historical check-ins remain queryable.
        let mut stmt=db.prepare("SELECT id FROM routine_items WHERE routine_id=?1 AND active=1").map_err(|e|e.to_string())?;
        let existing=stmt.query_map([saved.id],|r|r.get::<_,i64>(0)).map_err(|e|e.to_string())?
            .collect::<rusqlite::Result<Vec<_>>>().map_err(|e|e.to_string())?;
        for id in existing{if !ids.contains(&id){db.execute("UPDATE routine_items SET active=0 WHERE id=?1",[id]).map_err(|e|e.to_string())?;}}
        let saved_items=items(db)?.into_iter().filter(|x|x.routine_id==saved.id).collect();
        Ok(PlanResult{routine:saved,items:saved_items})
    })();
    match result {
        Ok(value)=>{db.execute_batch("RELEASE SAVEPOINT rooz_save_plan").map_err(|e|e.to_string())?;Ok(value)},
        Err(error)=>{let _=db.execute_batch("ROLLBACK TO SAVEPOINT rooz_save_plan; RELEASE SAVEPOINT rooz_save_plan");Err(error)},
    }
}
fn due_or_embedded(db:&Connection,id:i64,date:&str,on:NaiveDate,weekday_bit:i64)->Result<bool>{
    let is_due=|r:&Routine|r.enabled&&date>=r.start_date.as_str()&&(r.schedule_kind=="anytime"||occurs_on(r,on));
    if is_due(&get(db,id)?){return Ok(true);}
    // A saved template can run inside another schedule. E.g. a weekly Sport
    // template embedded in Daily Plan should still work on Tuesday.
    let mut stmt=db.prepare("WITH RECURSIVE parents(id) AS (
      SELECT routine_id FROM routine_items WHERE active=1 AND linked_routine_id=?1 AND (weekdays_mask & ?2)<>0
      UNION SELECT i.routine_id FROM routine_items i JOIN parents p ON i.linked_routine_id=p.id
      WHERE i.active=1 AND (i.weekdays_mask & ?2)<>0
    ) SELECT id FROM parents LIMIT 500").map_err(|e|e.to_string())?;
    let parent_ids=stmt.query_map(params![id,weekday_bit],|r|r.get::<_,i64>(0)).map_err(|e|e.to_string())?
        .collect::<rusqlite::Result<Vec<_>>>().map_err(|e|e.to_string())?;
    for parent_id in parent_ids{if is_due(&get(db,parent_id)?){return Ok(true);}}
    Ok(false)
}
fn recompute_item_routine(db:&Connection,id:i64,date:&str,weekday_bit:i64)->Result<bool>{
    let (total,done):(i64,i64)=db.query_row("SELECT COUNT(*),COALESCE(SUM(EXISTS(SELECT 1 FROM routine_item_completions c WHERE c.item_id=i.id AND c.occurrence_date=?2)),0) FROM routine_items i WHERE i.routine_id=?1 AND i.active=1 AND i.required=1 AND (i.weekdays_mask & ?3)<>0",
        params![id,date,weekday_bit],|r|Ok((r.get(0)?,r.get(1)?))).map_err(|e|e.to_string())?;
    let finished=total>0&&done==total;
    if finished {db.execute("INSERT OR IGNORE INTO routine_completions(routine_id,occurrence_date) VALUES(?1,?2)",params![id,date]).map_err(|e|e.to_string())?;}
    else {db.execute("DELETE FROM routine_completions WHERE routine_id=?1 AND occurrence_date=?2",params![id,date]).map_err(|e|e.to_string())?;}
    Ok(finished)
}
/// Sync the checkboxes representing reusable child routines in each parent.
/// The graph is validated as acyclic at save time. A bounded queue still
/// defends against corrupt legacy cycles. A node can be processed twice when
/// two paths converge on it, so final completion always reflects both paths.
fn cascade_composed_completion(db:&Connection,changed_id:i64,date:&str,on:NaiveDate,weekday_bit:i64,forced:Option<bool>)
  ->Result<(Vec<(i64,bool)>,Vec<(i64,bool)>)>{
    let mut queue=VecDeque::from([changed_id]);
    let mut processed=0usize;
    let mut items=Vec::new();
    let mut routines=Vec::new();
    while let Some(routine_id)=queue.pop_front(){
        processed+=1;
        if processed>10000{return Err("Routine inclusion cycle or excessive nesting detected".into());}
        let finished=if routine_id==changed_id {match forced {Some(done)=>done,None=>recompute_item_routine(db,routine_id,date,weekday_bit)?}}
            else{recompute_item_routine(db,routine_id,date,weekday_bit)?};
        routines.push((routine_id,finished));
        let mut stmt=db.prepare("SELECT id,routine_id FROM routine_items WHERE active=1 AND linked_routine_id=?1 AND (weekdays_mask & ?2)<>0").map_err(|e|e.to_string())?;
        let links=stmt.query_map(params![routine_id,weekday_bit],|r|Ok((r.get::<_,i64>(0)?,r.get::<_,i64>(1)?))).map_err(|e|e.to_string())?
            .collect::<rusqlite::Result<Vec<_>>>().map_err(|e|e.to_string())?;
        for (link_id,parent_id) in links{
            if !due_or_embedded(db,parent_id,date,on,weekday_bit)?{continue;}
            if finished{
                db.execute("INSERT OR IGNORE INTO routine_item_completions(item_id,occurrence_date) VALUES(?1,?2)",params![link_id,date]).map_err(|e|e.to_string())?;
            }else{
                db.execute("DELETE FROM routine_item_completions WHERE item_id=?1 AND occurrence_date=?2",params![link_id,date]).map_err(|e|e.to_string())?;
            }
            items.push((link_id,finished));
            queue.push_back(parent_id);
        }
    }
    Ok((items,routines))
}
pub(crate) fn toggle_item(db:&Connection,item_id:i64,date:&str)->Result<ItemToggleResult>{
    let on=NaiveDate::parse_from_str(date,"%Y-%m-%d").map_err(|_|"Invalid occurrence date".to_string())?;
    if on>chrono::Local::now().date_naive(){return Err("Cannot check a future date".into());}
    let (routine_id,mask):(i64,i64)=db.query_row("SELECT routine_id,weekdays_mask FROM routine_items WHERE id=?1 AND active=1",[item_id],|r|Ok((r.get(0)?,r.get(1)?))).map_err(|_|"Checklist item not found".to_string())?;
    let weekday_bit=1_i64<<on.weekday().num_days_from_monday();
    if !due_or_embedded(db,routine_id,date,on,weekday_bit)?{return Err("Routine is not due or included by another plan on this date".into());}
    if mask&weekday_bit==0{return Err("Checklist item is not due this weekday".into());}
    db.execute_batch("SAVEPOINT rooz_item_toggle").map_err(|e|e.to_string())?;
    let result:Result<ItemToggleResult>=(||{
        let deleted=db.execute("DELETE FROM routine_item_completions WHERE item_id=?1 AND occurrence_date=?2",params![item_id,date]).map_err(|e|e.to_string())?;
        let checked=deleted==0;
        if checked { db.execute("INSERT INTO routine_item_completions(item_id,occurrence_date) VALUES(?1,?2)",params![item_id,date]).map_err(|e|e.to_string())?; }
        let (mut affected_items,affected_routines)=cascade_composed_completion(db,routine_id,date,on,weekday_bit,None)?;
        affected_items.insert(0,(item_id,checked));
        let whole_complete=affected_routines.first().map(|x|x.1).unwrap_or(false);
        Ok(ItemToggleResult{checked,whole_complete,affected_items,affected_routines})
    })();
    match result {
       Ok(value)=>{db.execute_batch("RELEASE SAVEPOINT rooz_item_toggle").map_err(|e|e.to_string())?;Ok(value)},
       Err(error)=>{let _=db.execute_batch("ROLLBACK TO SAVEPOINT rooz_item_toggle; RELEASE SAVEPOINT rooz_item_toggle");Err(error)},
    }
}

const ROUTINE_COLUMNS: &str = "r.id,r.title,r.details,r.category,r.schedule_kind,r.weekdays_mask,r.interval_days,r.month_day,r.start_date,r.due_time,r.remind_before,r.enabled,r.created_at,r.updated_at,(SELECT COUNT(*) FROM routine_completions rc WHERE rc.routine_id=r.id),r.rule_json";

pub(crate) fn init_schema(db: &Connection) -> rusqlite::Result<()> {
    db.execute_batch(include_str!("routines_schema.sql"))?;
    let exists = db.prepare("PRAGMA table_info(routines)")?.query_map([], |row|row.get::<_, String>(1))?
        .collect::<rusqlite::Result<Vec<_>>>()?.contains(&"rule_json".to_string());
    if !exists { db.execute("ALTER TABLE routines ADD COLUMN rule_json TEXT NOT NULL DEFAULT '{}'", [])?; }
    let columns=db.prepare("PRAGMA table_info(routine_items)")?.query_map([],|row|row.get::<_,String>(1))?.collect::<rusqlite::Result<Vec<_>>>()?;
    if !columns.iter().any(|c|c=="depth") {db.execute("ALTER TABLE routine_items ADD COLUMN depth INTEGER NOT NULL DEFAULT 0 CHECK(depth BETWEEN 0 AND 3)",[])?;}
    if !columns.iter().any(|c|c=="linked_routine_id") {db.execute("ALTER TABLE routine_items ADD COLUMN linked_routine_id INTEGER REFERENCES routines(id) ON DELETE SET NULL",[])?;}
    Ok(())
}

fn routine_from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<Routine> {
    Ok(Routine {
        id: row.get(0)?, title: row.get(1)?, details: row.get(2)?,
        category: row.get(3)?, schedule_kind: row.get(4)?, weekdays_mask: row.get(5)?,
        interval_days: row.get(6)?, month_day: row.get(7)?, start_date: row.get(8)?,
        due_time: row.get(9)?, remind_before: row.get(10)?,
        enabled: row.get::<_,i64>(11)? != 0, created_at: row.get(12)?, updated_at: row.get(13)?, completion_count: row.get(14)?, rule_json: row.get(15)?,
    })
}

pub(crate) fn get(db: &Connection, id: i64) -> Result<Routine> {
    db.query_row(&format!("SELECT {ROUTINE_COLUMNS} FROM routines r WHERE r.id=?1"), [id], routine_from_row)
        .map_err(|e| e.to_string())
}

pub(crate) fn list(db: &Connection) -> Result<Vec<Routine>> {
    let mut stmt = db.prepare(&format!("SELECT {ROUTINE_COLUMNS} FROM routines r ORDER BY r.enabled DESC, r.updated_at DESC, r.id DESC"))
        .map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], routine_from_row).map_err(|e| e.to_string())?;
    rows.collect::<std::result::Result<Vec<_>,_>>().map_err(|e| e.to_string())
}

pub(crate) fn history(db: &Connection) -> Result<Vec<RoutineCompletion>> {
    let mut stmt = db.prepare("SELECT id,routine_id,occurrence_date,completed_at FROM routine_completions ORDER BY completed_at DESC, id DESC LIMIT 2000")
        .map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |r| Ok(RoutineCompletion {
        id:r.get(0)?, routine_id:r.get(1)?, occurrence_date:r.get(2)?, completed_at:r.get(3)?
    })).map_err(|e| e.to_string())?;
    rows.collect::<std::result::Result<Vec<_>,_>>().map_err(|e| e.to_string())
}

pub(crate) fn validate(r: &Routine) -> Result<()> {
    if r.title.trim().is_empty() || r.title.chars().count() > 250 {return Err("Routine title must have 1–250 characters".into());}
    if r.details.len() > 16000 || r.category.trim().is_empty() || r.category.chars().count() > 100 {
        return Err("Invalid details or category".into());
    }
    if !["anytime","daily","weekly","interval","monthly"].contains(&r.schedule_kind.as_str()) {return Err("Invalid repeat mode".into());}
    if !(0..=127).contains(&r.weekdays_mask) || (r.schedule_kind == "weekly" && r.weekdays_mask == 0) {return Err("Select at least one weekday".into());}
    if !(1..=365).contains(&r.interval_days) || !(1..=31).contains(&r.month_day) {return Err("Invalid repeat interval or day of month".into());}
    if !(0..=1440).contains(&r.remind_before) {return Err("Invalid reminder offset".into());}
    if NaiveDate::parse_from_str(&r.start_date,"%Y-%m-%d").is_err() {return Err("Invalid starting date".into());}
    if !r.due_time.is_empty() && NaiveDateTime::parse_from_str(&format!("{} {}",r.start_date,r.due_time),"%Y-%m-%d %H:%M").is_err() {
        return Err("Invalid reminder time".into());
    }
    let rules=Rules::read(&r.rule_json)?;
    if rules.months.iter().any(|x| ! (1..=12).contains(x)) ||
       rules.month_days.iter().any(|x| ! (1..=31).contains(x)) ||
       rules.include_dates.iter().chain(rules.exclude_dates.iter()).any(|x| NaiveDate::parse_from_str(x,"%Y-%m-%d").is_err()) ||
       !["all","odd","even"].contains(&rules.parity.as_str()) ||
       !["all","weekend","workday"].contains(&rules.day_class.as_str()) ||
       !["gregorian","jalali"].contains(&rules.calendar.as_str()) ||
       rules.include_dates.len()>250 || rules.exclude_dates.len()>250 {return Err("Invalid advanced scheduling rule".into());}
    Ok(())
}

#[derive(Debug,serde::Deserialize)]
#[serde(default)]
struct Rules {calendar:String, parity:String,day_class:String,months:Vec<u32>,month_days:Vec<u32>,include_dates:Vec<String>,exclude_dates:Vec<String>,weekend_days:Vec<u32>}
impl Default for Rules {
 fn default()->Self {Self{calendar:"gregorian".into(),parity:"all".into(),day_class:"all".into(),months:vec![],month_days:vec![],include_dates:vec![],exclude_dates:vec![],weekend_days:vec![4]}}
}
impl Rules {
 fn read(s:&str)->Result<Self>{ if s.is_empty(){return Ok(Self::default());} serde_json::from_str(s).map_err(|_|"Invalid schedule rule JSON".to_string()) }
 fn allows(&self,date:NaiveDate)->bool{
  let key=date.format("%Y-%m-%d").to_string();
  if self.exclude_dates.contains(&key){return false;}
  if self.include_dates.contains(&key){return true;}
  let (month,day)=if self.calendar=="jalali"{let (_,m,d)=crate::calendar::to_jalali(date);(m,d)} else {(date.month(),date.day())};
  if !self.months.is_empty() && !self.months.contains(&month){return false;}
  if !self.month_days.is_empty() && !self.month_days.contains(&day){return false;}
  if self.parity=="odd" && day%2!=1{return false;}
  if self.parity=="even" && day%2!=0{return false;}
  let weekday=date.weekday().num_days_from_monday();
  let weekend=if self.weekend_days.is_empty(){ vec![4_u32] } else {self.weekend_days.clone()};
  if self.day_class=="weekend" && !weekend.contains(&weekday){return false;}
  if self.day_class=="workday" && weekend.contains(&weekday){return false;}
  true
 }
}

pub(crate) fn occurs_on(r: &Routine, date: NaiveDate) -> bool {
    let Ok(start) = NaiveDate::parse_from_str(&r.start_date,"%Y-%m-%d") else {return false};
    if date < start {return false;}
    let rule=match Rules::read(&r.rule_json){Ok(rule)=>rule,Err(_)=>return false};
    if rule.exclude_dates.iter().any(|x|x==&date.format("%Y-%m-%d").to_string()){return false;}
    if rule.include_dates.iter().any(|x|x==&date.format("%Y-%m-%d").to_string()){return true;}
    let base=match r.schedule_kind.as_str() {
        "daily" => true,
        "weekly" => r.weekdays_mask & (1_i64 << date.weekday().num_days_from_monday()) != 0,
        "interval" => (date - start).num_days() % r.interval_days.max(1) == 0,
        "monthly" => {
            if rule.calendar=="jalali" {
                let (_, month, day)=crate::calendar::to_jalali(date);
                let (_, next_m, next_d)=crate::calendar::to_jalali(date+Duration::days(1));
                day==(r.month_day as u32) || (next_m!=month && next_d==1 && day < (r.month_day as u32))
            } else {
                let last_day = last_day_of_month(date.year(), date.month());
                date.day() == (r.month_day as u32).min(last_day)
            }
        }
        _ => false,
    };
    base && rule.allows(date)
}

fn last_day_of_month(year:i32, month:u32) -> u32 {
    let next = if month==12 {NaiveDate::from_ymd_opt(year+1,1,1)} else {NaiveDate::from_ymd_opt(year,month+1,1)};
    next.map(|d|(d-Duration::days(1)).day()).unwrap_or(28)
}

pub(crate) fn save(db:&Connection,r:Routine) -> Result<Routine> {
    validate(&r)?;
    let id=if r.id > 0 {
        let changed=db.execute("UPDATE routines SET title=?1,details=?2,category=?3,schedule_kind=?4,weekdays_mask=?5,interval_days=?6,month_day=?7,start_date=?8,due_time=?9,remind_before=?10,enabled=?11,rule_json=?13,updated_at=CAST(strftime('%s','now') AS INTEGER) WHERE id=?12",
            params![r.title.trim(),r.details,r.category,r.schedule_kind,r.weekdays_mask,r.interval_days,r.month_day,r.start_date,r.due_time,r.remind_before,r.enabled as i64,r.id,r.rule_json]).map_err(|e|e.to_string())?;
        if changed == 0 {return Err("Routine not found".into());}
        r.id
    } else {
        db.execute("INSERT INTO routines(title,details,category,schedule_kind,weekdays_mask,interval_days,month_day,start_date,due_time,remind_before,enabled,rule_json) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12)",
            params![r.title.trim(),r.details,r.category,r.schedule_kind,r.weekdays_mask,r.interval_days,r.month_day,r.start_date,r.due_time,r.remind_before,r.enabled as i64,r.rule_json]).map_err(|e|e.to_string())?;
        db.last_insert_rowid()
    };
    get(db,id)
}

pub(crate) fn set_enabled(db:&Connection,id:i64,enabled:bool) -> Result<Routine> {
    let changed=db.execute("UPDATE routines SET enabled=?1,updated_at=CAST(strftime('%s','now') AS INTEGER) WHERE id=?2",params![enabled as i64,id]).map_err(|e|e.to_string())?;
    if changed == 0 {return Err("Routine not found".into());}
    get(db,id)
}

pub(crate) fn delete(db:&Connection,id:i64) -> Result<()> {
    db.execute("DELETE FROM routines WHERE id=?1",[id]).map_err(|e|e.to_string())?;
    Ok(())
}

pub(crate) fn complete(db:&Connection,id:i64,date:&str) -> Result<RoutineCompletion> {
    let r=get(db,id)?;
    if !r.enabled {return Err("Resume the routine before checking in".into());}
    let on=NaiveDate::parse_from_str(date,"%Y-%m-%d").map_err(|_|"Invalid occurrence date".to_string())?;
    let now=chrono::Local::now().date_naive();
    if on > now {return Err("Future occurrences cannot be completed".into());}
    if date < r.start_date.as_str() {return Err("Routine has not started yet".into());}
    if r.schedule_kind != "anytime" && !occurs_on(&r,on) {return Err("Not a scheduled day for this routine".into());}
    db.execute_batch("SAVEPOINT rooz_complete_routine").map_err(|e|e.to_string())?;
    let result:Result<RoutineCompletion>=(||{
        db.execute("INSERT INTO routine_completions(routine_id,occurrence_date) VALUES(?1,?2) ON CONFLICT(routine_id,occurrence_date) DO NOTHING",params![id,date]).map_err(|e|e.to_string())?;
        cascade_composed_completion(db,id,date,on,1_i64<<on.weekday().num_days_from_monday(),Some(true))?;
        db.query_row("SELECT id,routine_id,occurrence_date,completed_at FROM routine_completions WHERE routine_id=?1 AND occurrence_date=?2",params![id,date],|row|{
            Ok(RoutineCompletion{id:row.get(0)?,routine_id:row.get(1)?,occurrence_date:row.get(2)?,completed_at:row.get(3)?})
        }).map_err(|e|e.to_string())
    })();
    match result{
        Ok(value)=>{db.execute_batch("RELEASE SAVEPOINT rooz_complete_routine").map_err(|e|e.to_string())?;Ok(value)},
        Err(error)=>{let _=db.execute_batch("ROLLBACK TO SAVEPOINT rooz_complete_routine; RELEASE SAVEPOINT rooz_complete_routine");Err(error)}
    }
}

pub(crate) fn undo(db:&Connection,id:i64,date:&str) -> Result<()> {
    let on=NaiveDate::parse_from_str(date,"%Y-%m-%d").map_err(|_|"Invalid occurrence date".to_string())?;
    db.execute_batch("SAVEPOINT rooz_undo_routine").map_err(|e|e.to_string())?;
    let result:Result<()>=(||{
        db.execute("DELETE FROM routine_completions WHERE routine_id=?1 AND occurrence_date=?2",params![id,date]).map_err(|e|e.to_string())?;
        cascade_composed_completion(db,id,date,on,1_i64<<on.weekday().num_days_from_monday(),Some(false))?;
        Ok(())
    })();
    match result{
        Ok(())=>{db.execute_batch("RELEASE SAVEPOINT rooz_undo_routine").map_err(|e|e.to_string())?;Ok(())},
        Err(error)=>{let _=db.execute_batch("ROLLBACK TO SAVEPOINT rooz_undo_routine; RELEASE SAVEPOINT rooz_undo_routine");Err(error)}
    }
}

/// Atomically claim a given occurrence notification once, independently of the legacy task alerts.
pub(crate) fn claim_alert(db:&Connection,id:i64,date:&str,time:&str) -> bool {
    db.execute("INSERT OR IGNORE INTO routine_alerts(routine_id,occurrence_date,due_time) VALUES(?1,?2,?3)",params![id,date,time])
        .map(|n|n==1).unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::*;
    fn sample(kind:&str)->Routine {
        // The test fixture must satisfy the same validation contract as real UI data.
        // Default::default() leaves category empty and enabled=false, making save()
        // fail validation and subsequent complete() calls reject the check-in.
        Routine {
            title: "Practice".into(),
            category: "Personal".into(),
            enabled: true,
            schedule_kind: kind.into(),
            start_date: "2026-01-01".into(),
            interval_days: 3,
            month_day: 31,
            weekdays_mask: 0b0010101,
            rule_json: "{}".into(),
            ..Default::default()
        }
    }
    #[test] fn sample_satisfies_validation_and_is_enabled() {
        for kind in ["anytime", "daily", "weekly", "interval", "monthly"] {
            let r = sample(kind);
            validate(&r).unwrap();
            assert!(r.enabled, "sample for {kind} must be active");
        }
    }
    #[test] fn calculations() {
        let d=|x| NaiveDate::parse_from_str(x,"%Y-%m-%d").unwrap();
        assert!(occurs_on(&sample("daily"),d("2026-02-14")));
        assert!(!occurs_on(&sample("daily"),d("2025-12-31")));
        assert!(occurs_on(&sample("interval"),d("2026-01-07")));
        assert!(!occurs_on(&sample("interval"),d("2026-01-08")));
        assert!(occurs_on(&sample("monthly"),d("2026-02-28")));
        assert!(occurs_on(&sample("monthly"),d("2026-03-31")));
        assert!(!occurs_on(&sample("monthly"),d("2026-02-27")));
        assert!(occurs_on(&sample("weekly"),d("2026-01-05"))); // Monday
        assert!(!occurs_on(&sample("anytime"),d("2026-01-05")));
    }
    #[test] fn independent_history_and_cascade() {
        let db=Connection::open_in_memory().unwrap();
        db.execute_batch("PRAGMA foreign_keys=ON;").unwrap();
        init_schema(&db).unwrap();
        let r=save(&db,sample("anytime")).unwrap();
        let date="2026-02-01";
        assert_eq!(complete(&db,r.id,date).unwrap().id,complete(&db,r.id,date).unwrap().id);
        assert_eq!(history(&db).unwrap().len(),1);
        assert_eq!(get(&db,r.id).unwrap().completion_count,1);
        assert!(claim_alert(&db,r.id,date,"10:15"));
        assert!(!claim_alert(&db,r.id,date,"10:15"));
        assert!(claim_alert(&db,r.id,"2026-02-02","10:15"));
        undo(&db,r.id,date).unwrap();
        assert!(history(&db).unwrap().is_empty());
        complete(&db,r.id,date).unwrap();
        delete(&db,r.id).unwrap();
        assert!(history(&db).unwrap().is_empty());
    }
}

#[cfg(test)]
mod advanced_tests {
 use super::*;
 fn r(rule:&str)->Routine{Routine{title:"a".into(),category:"Personal".into(),enabled:true,start_date:"2024-01-01".into(),schedule_kind:"daily".into(),rule_json:rule.into(),interval_days:1,month_day:1,..Default::default()}}
 fn day(s:&str)->NaiveDate{NaiveDate::parse_from_str(s,"%Y-%m-%d").unwrap()}
 #[test] fn solar_parity_and_weekend(){
  let even=r(r#"{"calendar":"jalali","parity":"even"}"#);
  assert!(!occurs_on(&even,day("2024-03-20"))); // 1403/01/01
  assert!(occurs_on(&even,day("2024-03-21"))); // 1403/01/02
  let weekend=r(r#"{"day_class":"weekend","weekend_days":[4]}"#);
  assert!(occurs_on(&weekend,day("2026-11-13"))); // Friday
  assert!(!occurs_on(&weekend,day("2026-11-14")));
 }
 #[test] fn exceptional_dates_override_filters(){
  let rule=r(r#"{"parity":"odd","include_dates":["2026-11-16"],"exclude_dates":["2026-11-15"]}"#);
  assert!(occurs_on(&rule,day("2026-11-16")));
  assert!(!occurs_on(&rule,day("2026-11-15")));
 }
}

#[cfg(test)]
mod checklist_tests {
    use super::*;
    #[test]
    fn item_checkins_are_independent_and_preserved_when_removed() {
        let db=Connection::open_in_memory().unwrap();
        db.execute_batch("PRAGMA foreign_keys=ON").unwrap();
        init_schema(&db).unwrap();
        let r=Routine{title:"Weekly errands".into(),category:"Errands".into(),
          schedule_kind:"anytime".into(),weekdays_mask:127,interval_days:1,month_day:1,
          start_date:"2020-01-01".into(),enabled:true,rule_json:"{}".into(),..Default::default()};
        let item=|title:&str|RoutineItem{id:0,routine_id:0,title:title.into(),details:String::new(),position:0,required:true,weekdays_mask:127,depth:0,linked_routine_id:None};
        let result=save_plan(&db,r,vec![item("Milk"),item("Bread")]).unwrap();
        assert_eq!(result.items.len(),2);
        let day=chrono::Local::now().format("%Y-%m-%d").to_string();
        let first=result.items[0].id;
        let second=result.items[1].id;
        assert!(toggle_item(&db,first,&day).unwrap().checked);
        assert!(history(&db).unwrap().is_empty());
        assert!(toggle_item(&db,second,&day).unwrap().whole_complete);
        assert_eq!(history(&db).unwrap().len(),1);
        let changed=toggle_item(&db,first,&day).unwrap();
        assert!(!changed.checked);
        assert!(!changed.whole_complete);
        assert!(history(&db).unwrap().is_empty());
        let mut older=result.routine;
        older.details="New description".into();
        let updated=save_plan(&db,older,vec![RoutineItem{title:"Wholegrain bread".into(),..result.items[1].clone()}]).unwrap();
        assert_eq!(updated.items.len(),1);
        assert_eq!(updated.items[0].id,second);
        assert!(item_history(&db).unwrap().iter().any(|x|x.item_id==second));
        assert_eq!(db.query_row("SELECT active FROM routine_items WHERE id=?1",[first],|r|r.get::<_,i64>(0)).unwrap(),0);
    }
    #[test]
    fn malformed_checklist_rolls_back_without_changing_the_template() {
        let db=Connection::open_in_memory().unwrap();
        db.execute_batch("PRAGMA foreign_keys=ON").unwrap();init_schema(&db).unwrap();
        let r=Routine{title:"Morning".into(),category:"Personal".into(),schedule_kind:"anytime".into(),
            start_date:"2020-01-01".into(),interval_days:1,month_day:1,weekdays_mask:127,enabled:true,rule_json:"{}".into(),..Default::default()};
        let saved=save_plan(&db,r,vec![]).unwrap().routine;
        let mut modified=saved.clone();modified.title="Changed".into();
        let malicious=RoutineItem{id:12345,title:"Wrong owner".into(),weekdays_mask:127,required:true,..Default::default()};
        assert!(save_plan(&db,modified,vec![malicious]).is_err());
        assert_eq!(get(&db,saved.id).unwrap().title,"Morning");
    }

    #[test]
    fn saved_routines_can_be_embedded_but_cannot_cycle() {
        let db=Connection::open_in_memory().unwrap();
        db.execute_batch("PRAGMA foreign_keys=ON").unwrap();init_schema(&db).unwrap();
        let base=|title:&str|Routine{title:title.into(),category:"Personal".into(),schedule_kind:"daily".into(),
            start_date:"2026-01-01".into(),weekdays_mask:127,interval_days:1,month_day:1,enabled:true,rule_json:"{}".into(),..Default::default()};
        let sport=save_plan(&db,base("Sport"),vec![RoutineItem{title:"Stretch".into(),required:true,weekdays_mask:127,..Default::default()}]).unwrap().routine;
        let daily=save_plan(&db,base("Daily"),vec![RoutineItem{title:"Morning exercise".into(),depth:1,linked_routine_id:Some(sport.id),required:true,weekdays_mask:127,..Default::default()}]).unwrap();
        assert_eq!(daily.items[0].depth,1);
        assert_eq!(daily.items[0].linked_routine_id,Some(sport.id));
        let error=save_plan(&db,sport,vec![RoutineItem{title:"Include Daily".into(),linked_routine_id:Some(daily.routine.id),weekdays_mask:127,required:true,..Default::default()}]).err().unwrap();
        assert!(error.contains("cycle"));
        assert_eq!(items(&db).unwrap().len(),2);
    }

    #[test]
    fn nested_checkins_follow_parent_schedule_and_propagate_both_ways() {
        let db=Connection::open_in_memory().unwrap();
        db.execute_batch("PRAGMA foreign_keys=ON").unwrap();
        init_schema(&db).unwrap();
        let template=|title:&str,kind:&str,mask:i64|Routine{
            title:title.into(),category:"Personal".into(),schedule_kind:kind.into(),
            start_date:"2020-01-01".into(),weekdays_mask:mask,interval_days:1,
            month_day:1,enabled:true,rule_json:"{}".into(),..Default::default()
        };
        let child=save_plan(&db,template("Sport","weekly",1),vec![
            RoutineItem{title:"Stretch".into(),required:true,weekdays_mask:127,..Default::default()}
        ]).unwrap();
        let parent=save_plan(&db,template("Daily","daily",127),vec![
            RoutineItem{title:"Do sport".into(),required:true,weekdays_mask:127,
                linked_routine_id:Some(child.routine.id),..Default::default()}
        ]).unwrap();
        // Tuesday: Sport alone is scheduled for Mondays, but the Daily plan
        // includes it, so its checklist item is still usable on Tuesday.
        let day="2026-11-17";
        let done=toggle_item(&db,child.items[0].id,day).unwrap();
        assert!(done.checked && done.whole_complete);
        assert!(done.affected_items.contains(&(parent.items[0].id,true)));
        assert!(done.affected_routines.contains(&(parent.routine.id,true)));
        assert_eq!(item_history(&db).unwrap().len(),2);
        let undone=toggle_item(&db,child.items[0].id,day).unwrap();
        assert!(!undone.checked);
        assert!(undone.affected_items.contains(&(parent.items[0].id,false)));
        assert!(history(&db).unwrap().is_empty());
        assert!(item_history(&db).unwrap().is_empty());
    }

    #[test]
    fn old_checklist_schema_receives_additive_columns() {
        let db=Connection::open_in_memory().unwrap();
        db.execute_batch("CREATE TABLE routine_items(id INTEGER PRIMARY KEY,routine_id INTEGER,title TEXT,details TEXT,position INTEGER,required INTEGER,weekdays_mask INTEGER,active INTEGER);").unwrap();
        init_schema(&db).unwrap();
        let cols=db.prepare("PRAGMA table_info(routine_items)").unwrap().query_map([],|row|row.get::<_,String>(1)).unwrap().collect::<rusqlite::Result<Vec<_>>>().unwrap();
        assert!(cols.contains(&"depth".to_string()));
        assert!(cols.contains(&"linked_routine_id".to_string()));
    }
}
