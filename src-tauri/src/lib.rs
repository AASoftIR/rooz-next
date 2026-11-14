//! Rooz native core. Uses the SAME database directory as Rooz C/GTK v0.1.
//! WebView can be hidden while this process continues to deliver reminders.
use chrono::{Duration, Local, NaiveDate, NaiveDateTime, TimeZone};
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::{path::PathBuf, process::Command, sync::Mutex, thread, time::Duration as Sleep};
use tauri::{Manager, LogicalSize, PhysicalPosition};
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

#[derive(Serialize)]
struct Snapshot {
    tasks: Vec<Task>,
    notes: Vec<Note>,
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
          snooze_until INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL DEFAULT (unixepoch()));
        CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(due_date,position,id);
        CREATE TABLE IF NOT EXISTS notes(
          id INTEGER PRIMARY KEY, title TEXT NOT NULL DEFAULT '', body TEXT NOT NULL DEFAULT '',
          category TEXT NOT NULL DEFAULT 'Personal', updated_at INTEGER NOT NULL DEFAULT (unixepoch()));
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
        Ok(Snapshot { tasks:all_tasks(c)?, notes:all_notes(c)?, settings })
    })
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
            c.execute("INSERT INTO completions(task_id,finished_at,date) VALUES(?1,unixepoch(),?2)",params![id,old.due_date]).map_err(|e| e.to_string())?;
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
            c.execute("UPDATE notes SET title=?1,body=?2,category=?3,body_format=?4,updated_at=unixepoch() WHERE id=?5",
                params![note.title,note.body,note.category,note.body_format,note.id]).map_err(|e|e.to_string())?;
            id=note.id;
        } else {
            c.execute("INSERT INTO notes(title,body,category,body_format,updated_at) VALUES(?1,?2,?3,?4,unixepoch())",
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
#[tauri::command]
fn save_setting(db: tauri::State<'_, Database>, key: String, value: String) -> AppResult<()> {
    if !["language","motion","voice","categories","accent","onboarding"].contains(&key.as_str()) { return Err("Unknown setting".into()); }
    if value.len() > 4000 { return Err("Setting too long".into()); }
    with_db(db, |c| { c.execute("INSERT INTO settings(key,value) VALUES(?1,?2) ON CONFLICT(key) DO UPDATE SET value=excluded.value", params![key,value])
        .map_err(|e|e.to_string())?; Ok(()) })
}
#[tauri::command]
fn snooze_task(db: tauri::State<'_,Database>, id: i64, minutes: i64) -> AppResult<()> {
    if !(1..=120).contains(&minutes) { return Err("Invalid snooze duration".into()); }
    with_db(db, |c| {
        c.execute("UPDATE tasks SET snooze_until=unixepoch()+?1 WHERE id=?2",params![minutes*60,id]).map_err(|e|e.to_string())?;
        Ok(())
    })
}

fn place_bottom_right(window: &tauri::WebviewWindow) {
    // Wayland intentionally disallows arbitrary app positioning. KDE window rules
    // handle that case. On X11 this places the widget deterministically.
    if std::env::var_os("WAYLAND_DISPLAY").is_some() { return; }
    if let (Ok(Some(monitor)), Ok(size), Ok(scale)) = (window.current_monitor(), window.outer_size(), window.scale_factor()) {
        let margin = (18.0 * scale) as i32;
        let position = monitor.position();
        let area = monitor.size();
        let x = position.x + area.width as i32 - size.width as i32 - margin;
        let y = position.y + area.height as i32 - size.height as i32 - (52.0 * scale) as i32;
        let _ = window.set_position(PhysicalPosition::new(x.max(position.x), y.max(position.y)));
    }
}
fn toggle_visibility(window: &tauri::WebviewWindow) {
    let visible = window.is_visible().unwrap_or(false);
    if visible { let _=window.hide(); }
    else { let _=window.show(); let _=window.set_focus(); place_bottom_right(window); }
}
#[tauri::command]
fn open_external(url: String) -> AppResult<()> {
    let lower = url.to_ascii_lowercase();
    if !(lower.starts_with("https://") || lower.starts_with("http://")) || url.chars().any(|c| matches!(c, '\n' | '\r' | '\0')) || url.len() > 4096 {
        return Err("Only HTTP and HTTPS URLs are allowed".into());
    }
    Command::new("xdg-open").arg(&url).spawn().map_err(|e|e.to_string())?;
    Ok(())
}
#[tauri::command]
fn window_action(window: tauri::WebviewWindow, action: String) -> AppResult<bool> {
    match action.as_str() {
        "hide" => { window.hide().map_err(|e|e.to_string())?; Ok(false) },
        "toggle" => { toggle_visibility(&window); Ok(false) },
        "expand" => {
            window.set_size(LogicalSize::new(1134.0, 760.0)).map_err(|e|e.to_string())?;
            let _=window.set_always_on_top(false);
            let _=window.center();
            Ok(true)
        },
        "compact" => {
            window.set_size(LogicalSize::new(438.0,704.0)).map_err(|e|e.to_string())?;
            let _=window.set_always_on_top(true);
            place_bottom_right(&window);
            Ok(false)
        },
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
    if let Ok(c) = db.0.lock() {
        let _ = advance_recurring(&c);
        speak = c.query_row("SELECT value FROM settings WHERE key='voice'", [], |r|r.get::<_,String>(0))
            .optional().ok().flatten().map(|v|v=="true").unwrap_or(false);
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
    }
    for title in to_notify {
        let _=app.notification().builder().title("Rooz · Reminder").body(&title).show();
        if speak { let _=Command::new("spd-say").arg(&title).spawn(); }
    }
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app,args,_cwd| {
            if args.iter().any(|x|x=="--quit") { app.exit(0); return; }
            if let Some(w) = app.get_webview_window("main") {
                if args.iter().any(|x|x=="--hide") { let _=w.hide(); }
                else if args.iter().any(|x|x=="--toggle") { toggle_visibility(&w); }
                else { let _=w.show(); let _=w.set_focus(); }
            }
        }))
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![bootstrap,save_task,toggle_task,delete_task,reorder_tasks,save_note,delete_note,save_setting,snooze_task,window_action,open_external])
        .setup(|app| {
            use tauri::{menu::{Menu,MenuItem},tray::{TrayIconBuilder,TrayIconEvent,MouseButton,MouseButtonState}};
            let conn = open_db()?;
            app.manage(Database(Mutex::new(conn)));
            let show = MenuItem::with_id(app,"show","Show / hide Rooz",true,None::<&str>)?;
            let quit = MenuItem::with_id(app,"quit","Quit completely",true,None::<&str>)?;
            let menu = Menu::with_items(app,&[&show,&quit])?;
            let mut tray = TrayIconBuilder::new()
                .menu(&menu)
                .show_menu_on_left_click(false)
                .tooltip("Rooz · Your daily companion")
                .on_menu_event(|app,event| {
                    match event.id.as_ref() {
                        "quit" => app.exit(0),
                        "show" => if let Some(w)=app.get_webview_window("main") { toggle_visibility(&w); },
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray,event| {
                    if let TrayIconEvent::Click {button:MouseButton::Left,button_state:MouseButtonState::Up,..}=event {
                        if let Some(w)=tray.app_handle().get_webview_window("main") { toggle_visibility(&w); }
                    }
                });
            if let Some(icon)=app.default_window_icon() { tray = tray.icon(icon.clone()); }
            tray.build(app)?;
            if let Some(window)=app.get_webview_window("main") {
                if std::env::args().any(|a|a=="--background"||a=="--hide") { let _=window.hide(); }
                else { place_bottom_right(&window); }
            }
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
