-- Rooz 0.3: additive migration; pre-existing tasks, notes and completions remain untouched.
CREATE TABLE IF NOT EXISTS routines (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Personal',
  schedule_kind TEXT NOT NULL DEFAULT 'anytime'
    CHECK (schedule_kind IN ('anytime','daily','weekly','interval','monthly')),
  weekdays_mask INTEGER NOT NULL DEFAULT 31 CHECK (weekdays_mask BETWEEN 0 AND 127),
  interval_days INTEGER NOT NULL DEFAULT 1 CHECK (interval_days BETWEEN 1 AND 365),
  month_day INTEGER NOT NULL DEFAULT 1 CHECK (month_day BETWEEN 1 AND 31),
  start_date TEXT NOT NULL,
  due_time TEXT NOT NULL DEFAULT '',
  remind_before INTEGER NOT NULL DEFAULT 0 CHECK (remind_before BETWEEN 0 AND 1440),
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0,1)),
  rule_json TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
  updated_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER))
);
CREATE TABLE IF NOT EXISTS routine_completions (
  id INTEGER PRIMARY KEY,
  routine_id INTEGER NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  occurrence_date TEXT NOT NULL,
  completed_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
  UNIQUE (routine_id, occurrence_date)
);
CREATE INDEX IF NOT EXISTS idx_routine_completions_history
  ON routine_completions (routine_id, occurrence_date DESC);
CREATE TABLE IF NOT EXISTS routine_alerts (
  routine_id INTEGER NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  occurrence_date TEXT NOT NULL,
  due_time TEXT NOT NULL,
  alerted_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
  PRIMARY KEY (routine_id, occurrence_date, due_time)
);

-- v0.4.7: reusable checklist template items, date-scoped item check-ins.
-- Soft deletion retains item history when a plan is edited.
CREATE TABLE IF NOT EXISTS routine_items (
 id INTEGER PRIMARY KEY,
 routine_id INTEGER NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
 title TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 250),
 details TEXT NOT NULL DEFAULT '' CHECK(length(details) <= 2000),
 position INTEGER NOT NULL DEFAULT 0,
 required INTEGER NOT NULL DEFAULT 1 CHECK(required IN (0,1)),
 weekdays_mask INTEGER NOT NULL DEFAULT 127 CHECK(weekdays_mask BETWEEN 1 AND 127),
 active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1))
);
CREATE INDEX IF NOT EXISTS idx_routine_items_order ON routine_items(routine_id,active,position,id);
CREATE TABLE IF NOT EXISTS routine_item_completions (
 id INTEGER PRIMARY KEY,
 item_id INTEGER NOT NULL REFERENCES routine_items(id) ON DELETE CASCADE,
 occurrence_date TEXT NOT NULL,
 completed_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
 UNIQUE(item_id,occurrence_date)
);
CREATE INDEX IF NOT EXISTS idx_routine_item_history ON routine_item_completions(item_id,occurrence_date DESC);
