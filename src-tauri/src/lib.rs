//! Rooz native core. Uses the SAME database directory as Rooz C/GTK v0.1.
//! WebView can be hidden while this process continues to deliver reminders.
mod routines;
mod calendar;
mod ai;
mod voice_capture;
mod voice_output;
mod host_command;
use chrono::{Duration, Local, NaiveDate, NaiveDateTime, TimeZone};
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::{io::Write, path::PathBuf, process::Stdio, sync::{Mutex,atomic::{AtomicBool,Ordering}}, thread, time::Duration as Sleep};
static VOICE_PENDING:AtomicBool=AtomicBool::new(false);
// KDE can report the old fullscreen state for a short time after set_fullscreen.
// Track the intended mode instead of toggling against that asynchronous value.
static FULLSCREEN_TARGET:AtomicBool=AtomicBool::new(false);
use tauri::{Manager, LogicalSize, PhysicalPosition, Emitter};
use tauri_plugin_notification::NotificationExt;

struct Database(Mutex<Connection>);

type AppResult<T> = Result<T, String>;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default)]
struct Task {
    id: i64,
    title: String,
    details: String,
    due_date: String,
    due_time: String,
    category: String,
    done: bool,
    priority: i64,
    recurrence: String,
    remind_before: i64,
    position: i64,
    alerted_for: String,
    snooze_until: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default)]
struct Note {
    id: i64,
    title: String,
    body: String,
    body_format: String,
    category: String,
    updated_at: i64,
}

#[derive(Serialize, Deserialize, Default)]
#[serde(default)]
struct Snapshot {
    tasks: Vec<Task>,
    notes: Vec<Note>,
    routines: Vec<routines::Routine>,
    routine_completions: Vec<routines::RoutineCompletion>,
    routine_items: Vec<routines::RoutineItem>,
    routine_item_completions: Vec<routines::RoutineItemCompletion>,
    settings: std::collections::HashMap<String, String>,
}

const FIELDS: &str = "id,title,details,due_date,due_time,category,done,priority,recurrence,remind_before,position,alerted_for,snooze_until";

fn data_path() -> PathBuf {
    dirs::data_local_dir()
        .unwrap_or_else(|| std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")))
        .join("rooz").join("rooz.db")
}

fn open_db() -> Result<Connection, Box<dyn std::error::Error>> {
    let path = data_path();
    if let Some(parent) = path.parent() { std::fs::create_dir_all(parent)?; }
    let db = Connection::open(path)?;
    db.busy_timeout(Sleep::from_secs(3))?;
    db.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA synchronous=NORMAL;
        CREATE TABLE IF NOT EXISTS tasks(
          id INTEGER PRIMARY KEY, title TEXT NOT NULL, details TEXT NOT NULL DEFAULT '',
          due_date TEXT NOT NULL, due_time TEXT NOT NULL DEFAULT '', category TEXT NOT NULL DEFAULT 'Personal',
          done INTEGER NOT NULL DEFAULT 0, priority INTEGER NOT NULL DEFAULT 0,
          recurrence TEXT NOT NULL DEFAULT 'none', remind_before INTEGER NOT NULL DEFAULT 0,
          position INTEGER NOT NULL DEFAULT 0, alerted_for TEXT NOT NULL DEFAULT '',
          snooze_until INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)));
        CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(due_date,position,id);
        CREATE TABLE IF NOT EXISTS notes(
          id INTEGER PRIMARY KEY, title TEXT NOT NULL DEFAULT '', body TEXT NOT NULL DEFAULT '',
          category TEXT NOT NULL DEFAULT 'Personal', updated_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)));
        CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(updated_at DESC);
        CREATE TABLE IF NOT EXISTS completions(
          id INTEGER PRIMARY KEY,task_id INTEGER NOT NULL,finished_at INTEGER NOT NULL,date TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);")?;
    // Non-destructive upgrade from v0.1: old note bodies remain Markdown.
    let mut meta_stmt = db.prepare("PRAGMA table_info(notes)")?;
    let mut format_rows = meta_stmt.query_map([], |row| row.get::<_, String>(1))?;
    let has_format = format_rows.any(|name| name.map(|name| name == "body_format").unwrap_or(false));
    drop(format_rows);
    drop(meta_stmt);
    if !has_format {
        db.execute("ALTER TABLE notes ADD COLUMN body_format TEXT NOT NULL DEFAULT 'markdown'", [])?;
    }
    routines::init_schema(&db)?;
    ai::init_schema(&db)?;
    advance_recurring(&db)?;
    Ok(db)
}

fn task_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<Task> {
    Ok(Task {
        id: row.get(0)?, title: row.get(1)?, details: row.get(2)?,
        due_date: row.get(3)?, due_time: row.get(4)?, category: row.get(5)?,
        done: row.get::<_, i64>(6)? != 0, priority: row.get(7)?,
        recurrence: row.get(8)?, remind_before: row.get(9)?, position: row.get(10)?,
        alerted_for: row.get(11)?, snooze_until: row.get(12)?,
    })
}
fn note_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<Note> {
    Ok(Note { id: row.get(0)?, title: row.get(1)?, body: row.get(2)?,
        category: row.get(3)?, updated_at: row.get(4)?, body_format: row.get(5)? })
}
fn select_task(db: &Connection, id: i64) -> AppResult<Task> {
    db.query_row(&format!("SELECT {FIELDS} FROM tasks WHERE id=?1"), [id], task_row)
        .map_err(|e| e.to_string())
}
fn all_tasks(db: &Connection) -> AppResult<Vec<Task>> {
    let mut stmt = db.prepare(&format!("SELECT {FIELDS} FROM tasks ORDER BY due_date,done,position,id"))
        .map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], task_row).map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>,_>>().map_err(|e| e.to_string())
}
fn all_notes(db: &Connection) -> AppResult<Vec<Note>> {
    let mut stmt = db.prepare("SELECT id,title,body,category,updated_at,body_format FROM notes ORDER BY updated_at DESC")
        .map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], note_row).map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>,_>>().map_err(|e| e.to_string())
}
fn advance_recurring(db: &Connection) -> rusqlite::Result<()> {
    let today = Local::now().date_naive();
    let mut stmt = db.prepare("SELECT id,due_date,recurrence FROM tasks WHERE recurrence IN ('daily','weekly') AND due_date < ?1")?;
    let rows = stmt.query_map([today.to_string()], |r| Ok((r.get::<_,i64>(0)?, r.get::<_,String>(1)?,r.get::<_,String>(2)?)))?;
    let records: Vec<_> = rows.filter_map(Result::ok).collect();
    for (id, date, repeat) in records {
        let Some(mut due) = NaiveDate::parse_from_str(&date, "%Y-%m-%d").ok() else { continue; };
        let step = if repeat == "daily" { 1 } else { 7 };
        let elapsed = (today - due).num_days();
        let advances = (elapsed + step - 1) / step;
        due += Duration::days(advances * step);
        // Completion history is preserved, while old occurrences no longer block new ones.
        db.execute("UPDATE tasks SET due_date=?1,done=0,alerted_for='',snooze_until=0 WHERE id=?2",
            params![due.to_string(), id])?;
    }
    Ok(())
}
fn with_db<T>(db: tauri::State<'_, Database>, f: impl FnOnce(&Connection) -> AppResult<T>) -> AppResult<T> {
    let conn = db.0.lock().map_err(|_| "database lock poisoned".to_string())?;
    f(&conn)
}

#[tauri::command]
fn bootstrap(db: tauri::State<'_, Database>) -> AppResult<Snapshot> {
    with_db(db, |c| {
        advance_recurring(c).map_err(|e| e.to_string())?;
        let mut stmt = c.prepare("SELECT key,value FROM settings").map_err(|e| e.to_string())?;
        let settings = stmt.query_map([], |r| Ok((r.get::<_,String>(0)?,r.get::<_,String>(1)?)))
            .map_err(|e| e.to_string())?
            .collect::<Result<std::collections::HashMap<_,_>,_>>().map_err(|e| e.to_string())?;
        Ok(Snapshot { tasks:all_tasks(c)?, notes:all_notes(c)?, routines:routines::list(c)?, routine_completions:routines::history(c)?, routine_items:routines::items(c)?, routine_item_completions:routines::item_history(c)?, settings })
    })
}

#[tauri::command]
fn save_routine(db: tauri::State<'_, Database>, routine: routines::Routine) -> AppResult<routines::Routine> {
    with_db(db, |c| routines::save(c, routine))
}
#[tauri::command]
fn save_routine_plan(db: tauri::State<'_,Database>, routine:routines::Routine, items:Vec<routines::RoutineItem>)->AppResult<routines::PlanResult>{
    with_db(db,|c|routines::save_plan(c,routine,items))
}
#[tauri::command]
fn toggle_routine_item(db:tauri::State<'_,Database>, item_id:i64,date:String)->AppResult<routines::ItemToggleResult>{
    with_db(db,|c|routines::toggle_item(c,item_id,&date))
}
#[tauri::command]
fn set_routine_enabled(db: tauri::State<'_, Database>, id: i64, enabled: bool) -> AppResult<routines::Routine> {
    with_db(db, |c| routines::set_enabled(c, id, enabled))
}
#[tauri::command]
fn delete_routine(db: tauri::State<'_, Database>, id: i64) -> AppResult<()> {
    with_db(db, |c| routines::delete(c, id))
}
#[tauri::command]
fn complete_routine(db: tauri::State<'_, Database>, id: i64, date: String) -> AppResult<routines::RoutineCompletion> {
    with_db(db, |c| routines::complete(c, id, &date))
}
#[tauri::command]
fn undo_routine(db: tauri::State<'_, Database>, id: i64, date: String) -> AppResult<()> {
    with_db(db, |c| routines::undo(c, id, &date))
}

#[tauri::command]
fn save_task(db: tauri::State<'_, Database>, task: Task) -> AppResult<Task> {
    let title = task.title.trim();
    if title.is_empty() || title.chars().count() > 500 { return Err("Task title must be 1–500 characters".into()); }
    if NaiveDate::parse_from_str(&task.due_date, "%Y-%m-%d").is_err() { return Err("Invalid task date".into()); }
    if !task.due_time.is_empty() && NaiveDateTime::parse_from_str(&format!("{} {}",task.due_date,task.due_time), "%Y-%m-%d %H:%M").is_err() {
        return Err("Invalid task time".into());
    }
    if !["none","daily","weekly"].contains(&task.recurrence.as_str()) { return Err("Invalid recurrence".into()); }
    with_db(db, |c| {
        let id;
        if task.id > 0 {
            c.execute("UPDATE tasks SET title=?1,details=?2,due_date=?3,due_time=?4,category=?5,done=?6,priority=?7,recurrence=?8,remind_before=?9,alerted_for='',snooze_until=0 WHERE id=?10",
                params![title,task.details,task.due_date,task.due_time,task.category,task.done as i64,task.priority,task.recurrence,task.remind_before,task.id])
                .map_err(|e| e.to_string())?;
            id=task.id;
        } else {
            c.execute("INSERT INTO tasks(title,details,due_date,due_time,category,done,priority,recurrence,remind_before,position) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,COALESCE((SELECT MAX(position)+1 FROM tasks WHERE due_date=?3),0))",
                params![title,task.details,task.due_date,task.due_time,task.category,task.done as i64,task.priority,task.recurrence,task.remind_before])
                .map_err(|e| e.to_string())?;
            id=c.last_insert_rowid();
        }
        select_task(c,id)
    })
}

#[tauri::command]
fn toggle_task(db: tauri::State<'_, Database>, id: i64) -> AppResult<Task> {
    with_db(db, |c| {
        let old = select_task(c,id)?;
        c.execute("UPDATE tasks SET done=?1 WHERE id=?2",params![if old.done { 0 } else { 1 },id]).map_err(|e|e.to_string())?;
        if !old.done {
            c.execute("INSERT INTO completions(task_id,finished_at,date) VALUES(?1,CAST(strftime('%s','now') AS INTEGER),?2)",params![id,old.due_date]).map_err(|e| e.to_string())?;
        }
        select_task(c,id)
    })
}

#[tauri::command]
fn delete_task(db: tauri::State<'_, Database>, id: i64) -> AppResult<()> {
    with_db(db, |c| { c.execute("DELETE FROM tasks WHERE id=?1",[id]).map_err(|e|e.to_string())?; Ok(()) })
}
#[tauri::command]
fn reorder_tasks(db: tauri::State<'_, Database>, ids: Vec<i64>) -> AppResult<()> {
    with_db(db, |c| {
        // Only apply bounded updates for a list of IDs supplied by the UI.
        if ids.len() > 5000 { return Err("Too many tasks".into()); }
        for (position,id) in ids.iter().enumerate() {
            c.execute("UPDATE tasks SET position=?1 WHERE id=?2",params![position as i64,id]).map_err(|e|e.to_string())?;
        }
        Ok(())
    })
}

#[tauri::command]
fn save_note(db: tauri::State<'_,Database>, note: Note) -> AppResult<Note> {
    if note.body.len() > 2_000_000 { return Err("Note is too large".into()); }
    with_db(db,|c| {
        let id;
        if note.id > 0 {
            c.execute("UPDATE notes SET title=?1,body=?2,category=?3,body_format=?4,updated_at=CAST(strftime('%s','now') AS INTEGER) WHERE id=?5",
                params![note.title,note.body,note.category,note.body_format,note.id]).map_err(|e|e.to_string())?;
            id=note.id;
        } else {
            c.execute("INSERT INTO notes(title,body,category,body_format,updated_at) VALUES(?1,?2,?3,?4,CAST(strftime('%s','now') AS INTEGER))",
                params![note.title,note.body,note.category,note.body_format]).map_err(|e|e.to_string())?;
            id=c.last_insert_rowid();
        }
        c.query_row("SELECT id,title,body,category,updated_at,body_format FROM notes WHERE id=?1",[id],note_row).map_err(|e|e.to_string())
    })
}
#[tauri::command]
fn delete_note(db: tauri::State<'_, Database>, id: i64) -> AppResult<()> {
    with_db(db, |c| { c.execute("DELETE FROM notes WHERE id=?1",[id]).map_err(|e|e.to_string())?; Ok(()) })
}

/// Export to the normal Downloads folder, so AppImage/WebKit download-handler
/// differences never swallow a backup. Caller chooses only a safe basename.
#[tauri::command]
fn save_export(filename:String,content:String)->AppResult<String>{
    if filename.is_empty()||filename.len()>105||!filename.starts_with("Rooz-")||
        !filename.chars().all(|ch|ch.is_ascii_alphanumeric()||"-_.".contains(ch))||content.len()>25_000_000 {
        return Err("Invalid export name or file size".into());
    }
    let folder=dirs::download_dir().ok_or("Downloads folder unavailable")?;
    std::fs::create_dir_all(&folder).map_err(|e|e.to_string())?;
    let path=folder.join(&filename);
    // Never overwrite an older export: all exports receive a unique name.
    let mut result=path.clone();
    for i in 1..100 {
        if !result.exists(){break;}
        result=folder.join(format!("{i}-{filename}"));
    }
    if result.exists(){return Err("Too many exports with the same name".into());}
    std::fs::write(&result,content).map_err(|e|e.to_string())?;
    Ok(result.to_string_lossy().into_owned())
}

/// Unlike portable JSON, this snapshot includes legacy task completions,
/// archived/deleted RAG records, AI history and every SQLite setting.
#[tauri::command]
fn backup_database(db:tauri::State<'_,Database>)->AppResult<String>{
    let folder=dirs::download_dir().ok_or("Downloads folder unavailable")?;
    std::fs::create_dir_all(&folder).map_err(|e|e.to_string())?;
    let base=chrono::Local::now().format("Rooz-%Y%m%d-%H%M%S-complete.sqlite").to_string();
    let mut target=folder.join(&base);
    for i in 1..100 {
        if !target.exists(){break;}
        target=folder.join(format!("{i}-{base}"));
    }
    if target.exists(){return Err("Could not find a free backup filename".into());}
    with_db(db,|c|{
        c.execute("VACUUM INTO ?1",[target.to_string_lossy().as_ref()]).map_err(|e|e.to_string())?;
        Ok(target.to_string_lossy().into_owned())
    })
}

/// Merge a Rooz JSON backup atomically. Existing records are NEVER replaced.
/// All imported routine/item IDs are remapped; dated completion history and
/// linked routine template references follow the new IDs.
#[tauri::command]
fn import_backup(db:tauri::State<'_,Database>,snapshot:Snapshot)->AppResult<String>{
    if snapshot.tasks.len()>10000||snapshot.notes.len()>5000||snapshot.routines.len()>2000||
       snapshot.routine_items.len()>30000||snapshot.routine_completions.len()>30000||
       snapshot.routine_item_completions.len()>60000 {return Err("Backup exceeds import size limits".into());}
    with_db(db,|c|{
        use std::collections::HashMap;
        c.execute_batch("SAVEPOINT rooz_import_backup").map_err(|e|e.to_string())?;
        let result:AppResult<String>=(||{
            let mut task_count=0;
            for task in &snapshot.tasks {
                if task.title.trim().is_empty()||task.title.chars().count()>500||NaiveDate::parse_from_str(&task.due_date,"%Y-%m-%d").is_err()||
                    !["none","daily","weekly"].contains(&task.recurrence.as_str()) {return Err("Invalid task in backup".into());}
                c.execute("INSERT INTO tasks(title,details,due_date,due_time,category,done,priority,recurrence,remind_before,position) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)",
                    params![task.title,task.details,task.due_date,task.due_time,task.category,task.done as i64,task.priority,task.recurrence,task.remind_before,task.position]).map_err(|e|e.to_string())?;
                task_count+=1;
            }
            for note in &snapshot.notes {
                if note.body.len()>2_000_000 {return Err("Note too large in backup".into());}
                c.execute("INSERT INTO notes(title,body,category,body_format,updated_at) VALUES(?1,?2,?3,?4,?5)",
                    params![note.title,note.body,note.category,note.body_format,note.updated_at]).map_err(|e|e.to_string())?;
            }
            let mut routine_ids:HashMap<i64,i64>=HashMap::new();
            for old in &snapshot.routines {
                let mut new=old.clone();new.id=0;
                let created=routines::save(c,new)?;
                routine_ids.insert(old.id,created.id);
            }
            let mut item_ids:HashMap<i64,i64>=HashMap::new();
            for old in &snapshot.routines {
                let Some(&new_id)=routine_ids.get(&old.id) else {continue};
                let mut translated=old.clone();translated.id=new_id;
                let previous:Vec<_>=snapshot.routine_items.iter().filter(|i|i.routine_id==old.id).collect();
                let checklist=previous.iter().map(|item|{
                    let mut new=(*item).clone();new.id=0;new.routine_id=new_id;
                    new.linked_routine_id=new.linked_routine_id.and_then(|id|routine_ids.get(&id).copied());
                    new
                }).collect();
                let plan=routines::save_plan(c,translated,checklist)?;
                for (before,after) in previous.iter().zip(plan.items.iter()) {item_ids.insert(before.id,after.id);}
            }
            for completion in &snapshot.routine_completions {
                if let Some(id)=routine_ids.get(&completion.routine_id){
                    c.execute("INSERT OR IGNORE INTO routine_completions(routine_id,occurrence_date,completed_at) VALUES(?1,?2,?3)",
                        params![id,completion.occurrence_date,completion.completed_at]).map_err(|e|e.to_string())?;
                }
            }
            for completion in &snapshot.routine_item_completions {
                if let Some(id)=item_ids.get(&completion.item_id){
                    c.execute("INSERT OR IGNORE INTO routine_item_completions(item_id,occurrence_date,completed_at) VALUES(?1,?2,?3)",
                        params![id,completion.occurrence_date,completion.completed_at]).map_err(|e|e.to_string())?;
                }
            }
            Ok(format!("Merged {task_count} tasks, {} notes, {} routines with checklists and completion history",snapshot.notes.len(),snapshot.routines.len()))
        })();
        match result {
            Ok(message)=>{c.execute_batch("RELEASE SAVEPOINT rooz_import_backup").map_err(|e|e.to_string())?;Ok(message)},
            Err(error)=>{let _=c.execute_batch("ROLLBACK TO SAVEPOINT rooz_import_backup; RELEASE SAVEPOINT rooz_import_backup");Err(error)}
        }
    })
}
#[tauri::command]
fn save_setting(db: tauri::State<'_, Database>, key: String, value: String) -> AppResult<()> {
    // Settings must remain explicitly allow-listed. This list includes every
    // control emitted by the v0.4 AI and Persian calendar forms.
    if !["language","motion","voice","reminder_chime","categories","accent","onboarding",
          "calendar_system","ai_provider","ai_policy","ai_model","ai_rag_enabled",
          "ai_proxy_enabled","ai_proxy_url","ai_stt","ai_whisper_model",
          "ai_stt_language","ai_local_voice_reply",
          "ai_voice_speech"].contains(&key.as_str()) {
        return Err("Unknown setting".into());
    }
    if value.len() > 4000 { return Err("Setting too long".into()); }
    if key == "calendar_system" && !["jalali","gregorian"].contains(&value.as_str()) {return Err("Invalid calendar system".into());}
    if key == "ai_provider" && !["auto","openrouter","groq","nvidia"].contains(&value.as_str()) {return Err("Invalid AI provider".into());}
    if key == "ai_policy" && !["free","cheap","best"].contains(&value.as_str()) {return Err("Invalid AI model policy".into());}
    // Old ai_stt settings are kept for database compatibility but are ignored:
    // speech recognition now runs locally with a persistent Vosk worker.
    if key == "ai_stt" && !["groq","local"].contains(&value.as_str()) {return Err("Invalid legacy speech setting".into());}
    if key=="ai_stt_language" && !["en","fa"].contains(&value.as_str()) {return Err("Choose English or Persian for speech recognition".into());}
    if ["ai_rag_enabled","ai_proxy_enabled","ai_voice_speech","ai_local_voice_reply"].contains(&key.as_str()) && !["true","false"].contains(&value.as_str()) {return Err("Invalid boolean setting".into());}
    with_db(db, |c| { c.execute("INSERT INTO settings(key,value) VALUES(?1,?2) ON CONFLICT(key) DO UPDATE SET value=excluded.value", params![key,value])
        .map_err(|e|e.to_string())?; Ok(()) })
}
#[tauri::command]
fn snooze_task(db: tauri::State<'_,Database>, id: i64, minutes: i64) -> AppResult<()> {
    if !(1..=120).contains(&minutes) { return Err("Invalid snooze duration".into()); }
    with_db(db, |c| {
        c.execute("UPDATE tasks SET snooze_until=CAST(strftime('%s','now') AS INTEGER)+?1 WHERE id=?2",params![minutes*60,id]).map_err(|e|e.to_string())?;
        Ok(())
    })
}

fn place_bottom_right(window: &tauri::WebviewWindow) {
    // Try native positioning for X11 and XWayland. Native Wayland compositors
    // can ignore set_position: the KWin script anchors the window in that case.
    // Do not skip merely because the *session* is Wayland (XWayland is possible).
    let monitor=window.current_monitor().ok().flatten()
        .or_else(||window.primary_monitor().ok().flatten());
    if let (Some(monitor), Ok(size), Ok(scale)) = (monitor, window.outer_size(), window.scale_factor()) {
        let margin = (18.0 * scale) as i32;
        let position = monitor.position();
        let area = monitor.size();
        let x = position.x + area.width as i32 - size.width as i32 - margin;
        let y = position.y + area.height as i32 - size.height as i32 - (52.0 * scale) as i32;
        if let Err(error)=window.set_position(PhysicalPosition::new(x.max(position.x), y.max(position.y))) {
            eprintln!("Rooz native window placement unavailable: {error}. KDE KWin anchor will be used on Wayland.");
        }
    }
}
fn toggle_visibility(window: &tauri::WebviewWindow) {
    let visible = window.is_visible().unwrap_or(false);
    if visible { let _=window.hide(); }
    else { let _=window.set_always_on_top(false); let _=window.show(); let _=window.set_focus(); if !window.is_fullscreen().unwrap_or(false){place_bottom_right(window);} let _=window.emit("rooz-window-shown",true); }
}
fn ai_db()->AppResult<Connection>{
    let db=Connection::open(data_path()).map_err(|e|e.to_string())?;
    db.busy_timeout(Sleep::from_secs(4)).map_err(|e|e.to_string())?;
    Ok(db)
}
#[tauri::command]
fn ai_status()->AppResult<ai::AiStatus> {let c=ai_db()?;Ok(ai::status(&c))}
#[tauri::command]
fn take_voice_pending()->bool{VOICE_PENDING.swap(false,Ordering::Relaxed)}
#[tauri::command]
fn ai_set_key(provider:String,key:String)->AppResult<()> {ai::set_key(provider,key)}
#[tauri::command]
async fn ai_models(provider:String)->AppResult<Vec<ai::ModelInfo>>{
    tauri::async_runtime::spawn_blocking(move||{
        let c=ai_db()?;ai::models(&c,&provider)
    }).await.map_err(|e|e.to_string())?
}
#[tauri::command]
async fn ai_chat(message:String,voice:Option<bool>)->AppResult<ai::ChatResponse>{
    tauri::async_runtime::spawn_blocking(move||{
        let c=ai_db()?;ai::chat(&c,message,voice.unwrap_or(false))
    }).await.map_err(|e|e.to_string())?
}
#[tauri::command]
fn ai_history(db:tauri::State<'_,Database>)->AppResult<Vec<serde_json::Value>>{with_db(db,|c|ai::history(c))}
#[tauri::command]
fn ai_search(db:tauri::State<'_,Database>,query:String)->AppResult<Vec<ai::MemoryHit>>{with_db(db,|c|ai::search(c,&query))}
/// Keep PCM/WAV and local STT entirely inside the native Rust process.
/// The WebView receives only UTF-8 text, never audio samples.
#[tauri::command]
async fn warm_local_voice()->AppResult<()> {
    tauri::async_runtime::spawn_blocking(||{
        let c=ai_db()?;ai::warm(&c)
    }).await.map_err(|e|e.to_string())?
}
#[tauri::command]
async fn capture_local_speech()->AppResult<String> {
    tauri::async_runtime::spawn_blocking(move||{
        let wav=voice_capture::capture()?;
        if wav.is_empty(){return Ok(String::new());}
        let c=ai_db()?;
        ai::transcribe(&c,wav)
    }).await.map_err(|e|e.to_string())?
}

#[tauri::command]
fn open_external(url: String) -> AppResult<()> {
    let lower = url.to_ascii_lowercase();
    if !(lower.starts_with("https://") || lower.starts_with("http://")) || url.chars().any(|c| matches!(c, '\n' | '\r' | '\0')) || url.len() > 4096 {
        return Err("Only HTTP and HTTPS URLs are allowed".into());
    }
    host_command::command("xdg-open").arg(&url).spawn().map_err(|e|e.to_string())?;
    Ok(())
}
// There are exactly two modes: corner widget, or genuine fullscreen.
fn set_fullscreen_mode(window:&tauri::WebviewWindow,fullscreen:bool)->AppResult<()> {
    if !fullscreen {
        window.set_fullscreen(false).map_err(|e|e.to_string())?;
        let _=window.unmaximize();
        // An immediate size request is ignored by some KDE compositors while
        // the window is still finishing the fullscreen -> normal transition.
        // The compositor may complete the fullscreen transition after this call.
        // Re-anchor after its geometry has settled; KDE Wayland uses the KWin script.
        let pending=window.clone();
        thread::spawn(move||{
            for millis in [120_u64,250,450,650] {
                thread::sleep(Sleep::from_millis(millis));
                let window=pending.clone();
                let app=pending.app_handle().clone();
                let _=app.run_on_main_thread(move||{
                    if !FULLSCREEN_TARGET.load(Ordering::SeqCst) {
                        // Repeat this idempotent request; do not infer that a
                        // stale is_fullscreen() reading means the user wants to stay fullscreen.
                        let _=window.set_fullscreen(false);
                        let _=window.unmaximize();
                        let _=window.set_size(LogicalSize::new(438.0,704.0));
                        let _=window.set_always_on_top(false);
                        place_bottom_right(&window);
                    }
                });
            }
        });
    } else {
        let _=window.set_always_on_top(false);
        window.set_fullscreen(true).map_err(|e|e.to_string())?;
    }
    FULLSCREEN_TARGET.store(fullscreen,Ordering::SeqCst);
    let _=window.emit("rooz-window-mode",fullscreen);
    Ok(())
}

/// Play a locally installed Piper voice without uploading any audio or text.
/// Wait for playback so the microphone doesn't transcribe our own answer.
#[tauri::command]
async fn speak_local(text:String,language:String)->AppResult<()> {
    tauri::async_runtime::spawn_blocking(move||voice_output::speak(text,language))
        .await.map_err(|e|e.to_string())?
}

#[tauri::command]
fn stop_local_speech() {voice_output::stop();}

#[tauri::command]
fn cancel_native_voice() { voice_capture::cancel(); }

#[tauri::command]
fn window_action(window: tauri::WebviewWindow, action: String) -> AppResult<bool> {
    match action.as_str() {
        "hide" => { window.hide().map_err(|e|e.to_string())?; Ok(false) },
        "toggle" => { toggle_visibility(&window); Ok(false) },
        // Compatibility alias: v0.4.2 'expand' is now genuine fullscreen, never centered.
        "expand" => { set_fullscreen_mode(&window, true)?; Ok(true) },
        "fullscreen" => {
            let next = !FULLSCREEN_TARGET.load(Ordering::SeqCst);
            set_fullscreen_mode(&window,next)?;
            Ok(next)
        },
        "compact" => { set_fullscreen_mode(&window,false)?; Ok(false) },
        "drag" => { window.start_dragging().map_err(|e|e.to_string())?; Ok(false) },
        "quit" => { std::process::exit(0); },
        _ => Err("Unknown window action".into()),
    }
}

// One reminder per task/date/time until snoozed. The loop is Rust-native, so it
// continues when the WebView is hidden or its JS timers are suspended.
fn check_reminders(app: &tauri::AppHandle) {
    let db = app.state::<Database>();
    let now = Local::now();
    let today = now.format("%Y-%m-%d").to_string();
    let now_ts = now.timestamp();
    let mut to_notify: Vec<String> = Vec::new();
    let mut speak = false;
    let mut chime = true;
    let mut reminder_language = String::from("en");
    if let Ok(c) = db.0.lock() {
        let _ = advance_recurring(&c);
        speak = c.query_row("SELECT value FROM settings WHERE key='voice'", [], |r|r.get::<_,String>(0))
            .optional().ok().flatten().map(|v|v=="true").unwrap_or(false);
        chime=c.query_row("SELECT value FROM settings WHERE key='reminder_chime'",[],|r|r.get::<_,String>(0))
            .optional().ok().flatten().map(|v|v!="false").unwrap_or(true);
        reminder_language = c.query_row("SELECT value FROM settings WHERE key='language'", [], |r|r.get::<_,String>(0))
            .unwrap_or_else(|_|"en".into());
        if let Ok(mut stmt) = c.prepare("SELECT id,title,due_date,due_time,remind_before,alerted_for,snooze_until FROM tasks WHERE done=0 AND due_time<>'' AND (due_date=?1 OR snooze_until>0)") {
            if let Ok(rows) = stmt.query_map([today.as_str()], |r| {
                Ok((r.get::<_,i64>(0)?,r.get::<_,String>(1)?,r.get::<_,String>(2)?,r.get::<_,String>(3)?,
                    r.get::<_,i64>(4)?,r.get::<_,String>(5)?,r.get::<_,i64>(6)?))
            }) {
                for row in rows.flatten() {
                    let (id,title,date,time,early,alerted,snooze) = row;
                    let fingerprint = format!("{date}T{time}");
                    let scheduled = NaiveDateTime::parse_from_str(&format!("{date} {time}"),"%Y-%m-%d %H:%M")
                        .ok().and_then(|dt|Local.from_local_datetime(&dt).earliest()).map(|dt|dt.timestamp());
                    let due = scheduled.map(|ts|ts - early.clamp(0,1440)*60).unwrap_or(i64::MAX);
                    let fire = if snooze>0 { snooze<=now_ts } else { date==today && due<=now_ts && alerted!=fingerprint };
                    if fire {
                        if c.execute("UPDATE tasks SET alerted_for=?1,snooze_until=0 WHERE id=?2",params![fingerprint,id]).is_ok() {
                            to_notify.push(title);
                        }
                    }
                }
            }
        }
        // Reminder claims for routines are independent of task reminders. The
        // UNIQUE key prevents duplicate alerts after sleep, UI close, or restart.
        if let Ok(items) = routines::list(&c) {
            // Also consider tomorrow to honor "15 minutes before" reminders
            // for routines occurring just after midnight.
            for scheduled_date in [now.date_naive(), now.date_naive() + Duration::days(1)] {
                let date_key=scheduled_date.format("%Y-%m-%d").to_string();
                for routine in &items {
                    if !routine.enabled || routine.due_time.is_empty() ||
                        !routines::occurs_on(routine, scheduled_date) { continue; }
                    let completed: bool = c.query_row(
                        "SELECT EXISTS(SELECT 1 FROM routine_completions WHERE routine_id=?1 AND occurrence_date=?2)",
                        params![routine.id, &date_key], |row|row.get(0)).unwrap_or(false);
                    if completed {continue;}
                    let scheduled = NaiveDateTime::parse_from_str(&format!("{} {}", date_key, routine.due_time), "%Y-%m-%d %H:%M")
                        .ok().and_then(|dt|Local.from_local_datetime(&dt).earliest()).map(|dt|dt.timestamp());
                    if let Some(ts) = scheduled {
                        if ts - routine.remind_before.clamp(0,1440)*60 <= now_ts &&
                            routines::claim_alert(&c, routine.id, &date_key, &routine.due_time) {
                            to_notify.push(format!("{} · {}", routine.title, routine.category));
                        }
                    }
                }
            }
        }
    }
    for title in &to_notify {
        let _=app.notification().builder().title("Rooz · Reminder").body(title.as_str()).show();
    }
    if chime && !to_notify.is_empty() {thread::spawn(play_reminder_chime);}
    if speak && !to_notify.is_empty() && voice_output::ready(&reminder_language) {
        thread::spawn(move||{
            for title in to_notify {
                let _=voice_output::speak(title,reminder_language.clone());
            }
        });
    }
}

/// Subtle three-note offline reminder, generated in-memory. Does not depend on
/// notification theme sounds, downloaded files, a network service or TTS.
fn play_reminder_chime(){
    let rate=22050_u32;
    let mut samples=Vec::with_capacity(rate as usize*2);
    for (frequency,duration) in [(659.25,0.16),(830.61,0.16),(1046.50,0.34)] {
        let n=(rate as f64*duration) as usize;
        for i in 0..n {
            let t=i as f64/rate as f64;
            let envelope=(t/0.016).min(1.0)*((duration-t)/0.10).clamp(0.0,1.0);
            let tone=((t*frequency*std::f64::consts::TAU).sin()+0.22*(t*frequency*2.0*std::f64::consts::TAU).sin())*envelope;
            samples.extend_from_slice(&((tone*4600.0) as i16).to_le_bytes());
        }
    }
    if let Ok(mut player)=host_command::command("aplay")
        .args(["-q","-t","raw","-f","S16_LE","-c","1","-r","22050","-"])
        .stdin(Stdio::piped()).stdout(Stdio::null()).stderr(Stdio::null()).spawn(){
        if let Some(mut input)=player.stdin.take(){let _=input.write_all(&samples);}
        let _=player.wait();
    }
}

// Install a KWin 6 script scoped to Rooz for true Wayland bottom-right anchoring.
// Automatic first-launch setup and an explicit repair flag; no other window rules touched.
fn install_kde_anchor()->AppResult<()> {
    if !std::env::var("XDG_CURRENT_DESKTOP").unwrap_or_default().to_lowercase().contains("kde") {
        return Err("This installer is only for KDE Plasma 6".into());
    }
    let home=dirs::data_local_dir().ok_or("Could not locate XDG data directory")?;
    let destination=home.join("kwin/scripts/roozanchor");
    // Use KPackage to register the script, not only raw file copying. An old
    // direct-copy installation can exist but remain inactive in KWin.
    let staging=std::env::temp_dir().join(format!("rooz-kwin-install-{}",std::process::id()));
    let code=staging.join("contents/code");
    std::fs::create_dir_all(&code).map_err(|e|e.to_string())?;
    std::fs::write(staging.join("metadata.json"),include_str!("../../packaging/kwin/roozanchor/metadata.json")).map_err(|e|e.to_string())?;
    std::fs::write(code.join("main.js"),include_str!("../../packaging/kwin/roozanchor/contents/code/main.js")).map_err(|e|e.to_string())?;
    let option=if destination.is_dir(){"-u"}else{"-i"};
    let status=host_command::command("kpackagetool6")
        .args(["--type","KWin/Script",option]).arg(&staging)
        .status().map_err(|e|format!("kpackagetool6: {e}"))?;
    let installed=if status.success(){true}else{
        // v0.4.3 sometimes left an unregistered direct-copy directory.
        if destination.is_dir(){std::fs::remove_dir_all(&destination).map_err(|e|e.to_string())?;}
        host_command::command("kpackagetool6")
          .args(["--type","KWin/Script","-i"]).arg(&staging)
          .status().map_err(|e|e.to_string())?.success()
    };
    let _=std::fs::remove_dir_all(&staging);
    if !installed {return Err("kpackagetool6 could not register the Rooz KWin script".into());}
    let status=host_command::command("kwriteconfig6")
      .args(["--file","kwinrc","--group","Plugins","--key","roozanchorEnabled","true"])
      .status().map_err(|e|format!("kwriteconfig6: {e}"))?;
    if !status.success(){return Err("kwriteconfig6 failed".into());}
    let mut reloaded=false;
    for cmd in ["qdbus6","qdbus-qt6","qdbus"] {
        // Unload an old in-memory copy so KWin can re-read the new JS.
        let _=host_command::command(cmd).args(["org.kde.KWin","/Scripting",
            "org.kde.kwin.Scripting.unloadScript","roozanchor"]).output();
        if let Ok(status)=host_command::command(cmd).args(["org.kde.KWin","/KWin","reconfigure"]).status(){
            if status.success(){reloaded=true;break;}
        }
    }
    if !reloaded {eprintln!("Rooz KWin script registered. Log out and back in to activate it.");}
    Ok(())
}

pub fn run() {
    // These fast paths are intentionally available without initializing WebKit,
    // the database, or a running desktop session. They diagnose stale AppImages.
    if std::env::args().any(|arg|arg == "--version") {
        println!("Rooz {} | persistent offline Vosk STT | system-default native audio", env!("CARGO_PKG_VERSION"));
        return;
    }
    if std::env::args().any(|arg|arg == "--mic-test") {
        println!("Testing system default mic. Speak briefly; no audio is uploaded.");
        match voice_capture::capture() {
            Ok(wav) if wav.is_empty()=>println!("Microphone accessible, but speech was not detected. Check input gain and mute status."),
            Ok(wav)=>println!("Captured {} audio bytes locally; microphone is working.",wav.len()),
            Err(error)=>{eprintln!("Microphone test failed: {error}");std::process::exit(1)}
        }
        return;
    }
    if std::env::args().any(|arg|arg == "--audio-check") {
        println!("Rooz {} microphone diagnostics", env!("CARGO_PKG_VERSION"));
        for (program, args) in [
            ("pactl", &["get-default-source"][..]),
            ("pactl", &["info"][..]),
        ] {
            match host_command::command(program).args(args).output() {
                Ok(output) if output.status.success() => {
                    let result=String::from_utf8_lossy(&output.stdout);
                    if args.len() == 1 && args[0] == "info" {
                        for line in result.lines().filter(|l|l.starts_with("Default Source:") || l.starts_with("Server Name:")) {println!("{line}");}
                    } else {print!("Default microphone: {result}");}
                }
                Ok(output) => eprintln!("{program} failed: {}", String::from_utf8_lossy(&output.stderr).trim()),
                Err(error) => eprintln!("{program} unavailable: {error} (install libpulse)"),
            }
        }
        return;
    }
    if std::env::args().any(|arg|arg=="--install-kde-anchor") {
        match install_kde_anchor() {
            Ok(())=>println!("Rooz KWin anchor installed. Restart Rooz to check placement."),
            Err(error)=>{eprintln!("Could not install Rooz KWin anchor: {error}");std::process::exit(1);}
        }
        return;
    }
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app,args,_cwd| {
            if args.iter().any(|x|x=="--quit") { app.exit(0); return; }
            if let Some(w) = app.get_webview_window("main") {
                if args.iter().any(|x|x=="--hide") { let _=w.hide(); }
                else if args.iter().any(|x|x=="--toggle") { toggle_visibility(&w); }
                else { let _=w.set_always_on_top(false); let _=w.show(); let _=w.set_focus(); place_bottom_right(&w); let _=w.emit("rooz-window-shown",true); }
                if args.iter().any(|x|x=="--voice") {VOICE_PENDING.store(true,Ordering::Relaxed);let _=app.emit("rooz-navigate","voice");}
                else if args.iter().any(|x|x=="--ai") {let _=app.emit("rooz-navigate","ai");}
                else if let Some(section)=args.iter().find(|x|x.starts_with("--section=")){let _=app.emit("rooz-navigate",section.trim_start_matches("--section="));}
                if args.iter().any(|x|x=="--fullscreen") {let _=window_action(w.clone(),"fullscreen".into());}
            }
        }))
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![bootstrap,save_task,toggle_task,delete_task,reorder_tasks,save_note,delete_note,save_setting,snooze_task,save_routine,complete_routine,save_routine_plan,toggle_routine_item,set_routine_enabled,delete_routine,undo_routine,window_action,warm_local_voice,capture_local_speech,cancel_native_voice,speak_local,stop_local_speech,save_export,backup_database,import_backup,open_external,ai_status,ai_set_key,ai_models,ai_chat,ai_history,ai_search,take_voice_pending])
        .setup(|app| {
            use tauri::{menu::{Menu,MenuItem},tray::{TrayIconBuilder,TrayIconEvent,MouseButton,MouseButtonState}};
            if std::env::args().any(|a|a=="--voice") {VOICE_PENDING.store(true,Ordering::Relaxed);}
            let conn = open_db()?;
            app.manage(Database(Mutex::new(conn)));
            // KDE's compositor owns window positioning on Wayland and can
            // correct X11/XWayland placement as well. Register or upgrade the
            // script before the first show when it is absent or outdated. Do not assume "file exists" means
            // "KWin loaded it"; explicit --install-kde-anchor repairs activation.
            if std::env::var("XDG_CURRENT_DESKTOP").unwrap_or_default().to_lowercase().contains("kde") {
                let installed=dirs::data_local_dir().map(|p|
                    std::fs::read_to_string(p.join("kwin/scripts/roozanchor/contents/code/main.js"))
                    .ok().as_deref()==Some(include_str!("../../packaging/kwin/roozanchor/contents/code/main.js"))
                ).unwrap_or(false);
                if !installed {
                    if let Err(error)=install_kde_anchor(){eprintln!("Rooz KWin anchor installation failed: {error}");}
                }
            }
            // KDE StatusNotifier menus on Linux cannot reliably distinguish left/right
            // clicks in Tauri 2. Keep direct navigation in menu and provide a global
            // keyboard launcher (rooz --voice / --section=routines).
            let items:Vec<(&str,&str)> = vec![
                ("show","Open Rooz"),("today","Today"),("tomorrow","Tomorrow"),
                ("routines","Routines & plans"),("calendar","Calendar"),
                ("ai","AI assistant"),("voice","Voice assistant"),
                ("fullscreen","Toggle fullscreen"),("settings","Preferences"),("quit","Quit completely")
            ];
            let entries=items.iter().map(|(id,label)|MenuItem::with_id(app,*id,*label,true,None::<&str>)).collect::<Result<Vec<_>,_>>()?;
            let refs:Vec<&dyn tauri::menu::IsMenuItem<tauri::Wry>>=entries.iter().map(|item|item as &dyn tauri::menu::IsMenuItem<tauri::Wry>).collect();
            let menu=Menu::with_items(app,&refs)?;
            let mut tray = TrayIconBuilder::new()
                .menu(&menu)
                .show_menu_on_left_click(false)
                .tooltip("Rooz · Planner, routines & AI")
                .on_menu_event(|app,event| {
                    match event.id.as_ref() {
                        "quit"=>app.exit(0),
                        "show"=>if let Some(w)=app.get_webview_window("main") {let _=w.set_always_on_top(false);let _=w.show();let _=w.set_focus();place_bottom_right(&w);let _=w.emit("rooz-window-shown",true);},
                        "fullscreen"=>if let Some(w)=app.get_webview_window("main") {let _=w.show();let _=window_action(w,"fullscreen".into());},
                        name=>{if let Some(w)=app.get_webview_window("main") {let _=w.set_always_on_top(false);let _=w.show();let _=w.set_focus(); if !FULLSCREEN_TARGET.load(Ordering::SeqCst){place_bottom_right(&w);}let _=w.emit("rooz-window-shown",true);}let _=app.emit("rooz-navigate",name.to_owned());}
                    }
                })
                .on_tray_icon_event(|tray,event| {
                    if let TrayIconEvent::Click {button:MouseButton::Left,button_state:MouseButtonState::Up,..}=event {
                        if let Some(w)=tray.app_handle().get_webview_window("main") {toggle_visibility(&w);}
                    }
                });
            if let Some(icon)=app.default_window_icon() { tray = tray.icon(icon.clone()); }
            tray.build(app)?;
            if let Some(window)=app.get_webview_window("main") {
                if !std::env::args().any(|a|a=="--background"||a=="--hide") {
                    place_bottom_right(&window);
                    let _=window.show();
                }
            }
            let position_handle=app.handle().clone();
            thread::spawn(move||{thread::sleep(Sleep::from_millis(300));
                let second=position_handle.clone();let _=position_handle.run_on_main_thread(move||{
                    if let Some(window)=second.get_webview_window("main") {if window.is_visible().unwrap_or(false){place_bottom_right(&window);}}
                });
            });
            let handle = app.handle().clone();
            thread::spawn(move || loop { check_reminders(&handle); thread::sleep(Sleep::from_secs(20)); });
            Ok(())
        })
        .on_window_event(|window,event| {
            if let tauri::WindowEvent::CloseRequested {api,..}=event {
                api.prevent_close();
                let _=window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("Rooz could not start");
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn dates_parse() {
        assert!(NaiveDate::parse_from_str("2026-11-14","%Y-%m-%d").is_ok());
        assert!(NaiveDateTime::parse_from_str("2026-11-14 14:30","%Y-%m-%d %H:%M").is_ok());
    }
}
