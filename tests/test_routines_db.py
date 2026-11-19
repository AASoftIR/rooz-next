#!/usr/bin/env python3
"""Exercise the additive v0.3 SQLite schema on a v0.2.1-compatible DB.
No compiled Rust required. Rust has its own recurrence tests for native CI.
"""
import sqlite3
import tempfile
from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[1]
SQL=(ROOT/'src-tauri/src/routines_schema.sql').read_text()
class RoutineDatabaseTests(unittest.TestCase):
    def test_v021_db_survives_additive_routine_migration(self):
        with tempfile.TemporaryDirectory() as temp:
            db=sqlite3.connect(Path(temp)/'rooz.db')
            db.execute('PRAGMA foreign_keys=ON')
            # Representative historical schema and records, including tasks and markdown notes.
            db.executescript("""
              CREATE TABLE tasks(id INTEGER PRIMARY KEY,title TEXT NOT NULL,due_date TEXT NOT NULL);
              CREATE TABLE notes(id INTEGER PRIMARY KEY,title TEXT,body TEXT,body_format TEXT);
              CREATE TABLE completions(id INTEGER PRIMARY KEY,task_id INTEGER NOT NULL,finished_at INTEGER NOT NULL,date TEXT NOT NULL);
              CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
              INSERT INTO tasks VALUES(42,'Old todo','2026-11-14');
              INSERT INTO notes VALUES(9,'Old note','# Important','markdown');
              INSERT INTO completions VALUES(2,42,1500000000,'2026-11-14');
              INSERT INTO settings VALUES('language','fa');
            """)
            db.executescript(SQL)
            db.executescript(SQL) # idempotent startup
            self.assertEqual(db.execute('SELECT title FROM tasks WHERE id=42').fetchone()[0],'Old todo')
            self.assertEqual(db.execute('SELECT body FROM notes WHERE id=9').fetchone()[0],'# Important')
            self.assertEqual(db.execute('SELECT count(*) FROM completions').fetchone()[0],1)
            self.assertEqual(db.execute("SELECT value FROM settings WHERE key='language'").fetchone()[0],'fa')
            db.execute("""INSERT INTO routines(title,category,schedule_kind,start_date)
                          VALUES('Weekly groceries','Errands','weekly','2026-11-14')""")
            rid=db.execute('SELECT id FROM routines').fetchone()[0]
            db.execute('INSERT INTO routine_completions(routine_id,occurrence_date) VALUES(?,?)',(rid,'2026-11-14'))
            db.execute('INSERT OR IGNORE INTO routine_completions(routine_id,occurrence_date) VALUES(?,?)',(rid,'2026-11-14'))
            self.assertEqual(db.execute('SELECT count(*) FROM routine_completions').fetchone()[0],1)
            db.execute("INSERT OR IGNORE INTO routine_alerts(routine_id,occurrence_date,due_time) VALUES(?,?,'10:00')",(rid,'2026-11-14'))
            db.execute("INSERT OR IGNORE INTO routine_alerts(routine_id,occurrence_date,due_time) VALUES(?,?,'10:00')",(rid,'2026-11-14'))
            self.assertEqual(db.execute('SELECT count(*) FROM routine_alerts').fetchone()[0],1)
            # Verify the exact SELECT used by Rust (including aggregate totals),
            # so accidental SQL alias changes fail offline before CI's Rust build.
            import re
            rust=(ROOT/'src-tauri/src/routines.rs').read_text()
            fields=re.search(r'const ROUTINE_COLUMNS: &str = "([^"]+)";',rust).group(1)
            query=f'SELECT {fields} FROM routines r WHERE r.id=?1'
            row=db.execute(query,(rid,)).fetchone()
            self.assertEqual(row[0],rid)
            self.assertEqual(row[-2],1)  # Completion count precedes rule_json
            self.assertEqual(row[-1],'{}')
            self.assertIn('DELETE FROM routines WHERE id=?1',rust)
            db.execute('DELETE FROM routines WHERE id=?',(rid,))
            self.assertEqual(db.execute('SELECT count(*) FROM routine_completions').fetchone()[0],0)
            self.assertEqual(db.execute('SELECT count(*) FROM routine_alerts').fetchone()[0],0)
            self.assertEqual(db.execute('SELECT count(*) FROM tasks').fetchone()[0],1)
    def test_advanced_rules_additive_migration_schema(self):
        """Existing v0.3.2 rows are retained and receive an empty rule JSON."""
        db=sqlite3.connect(':memory:')
        db.executescript(SQL.replace("  rule_json TEXT NOT NULL DEFAULT '{}',\n", ''))
        db.execute("INSERT INTO routines(title,category,start_date) VALUES('Legacy','Personal','2026-01-01')")
        # Same additive change performed by routines::init_schema() at startup.
        if not any(r[1]=='rule_json' for r in db.execute('PRAGMA table_info(routines)')):
            db.execute("ALTER TABLE routines ADD COLUMN rule_json TEXT NOT NULL DEFAULT '{}'")
        self.assertEqual(db.execute('SELECT title,rule_json FROM routines').fetchone(),('Legacy','{}'))
        db.close()

    def test_works_without_sqlite_unixepoch_function(self):
        """Simulate SQLite <=3.37, as provided by some CI Python runtimes.

        Modern SQLite has unixepoch(), so overriding it with a function that
        raises is essential: otherwise this test would pass locally while
        failing on an older GitHub runner.
        """
        import time
        db = sqlite3.connect(':memory:')
        db.execute('PRAGMA foreign_keys=ON')
        def forbid_unixepoch():
            raise sqlite3.OperationalError('unixepoch() is not available')
        db.create_function('unixepoch', 0, forbid_unixepoch)
        db.executescript(SQL)
        db.executescript(SQL)
        db.execute("""INSERT INTO routines(title,schedule_kind,start_date)
                      VALUES('Water plants','weekly','2026-01-01')""")
        rid, created, updated = db.execute(
            'SELECT id,created_at,updated_at FROM routines'
        ).fetchone()
        for ts in (created, updated):
            self.assertIsInstance(ts, int)
            self.assertLess(abs(ts - int(time.time())), 20)
        db.execute('INSERT INTO routine_completions(routine_id,occurrence_date) VALUES(?,?)', (rid,'2026-01-02'))
        db.execute("INSERT INTO routine_alerts(routine_id,occurrence_date,due_time) VALUES(?,?,'09:00')", (rid,'2026-01-02'))
        for table, column in [('routine_completions','completed_at'),('routine_alerts','alerted_at')]:
            ts = db.execute(f'SELECT {column} FROM {table}').fetchone()[0]
            self.assertIsInstance(ts, int)
            self.assertLess(abs(ts - int(time.time())), 20)
        db.execute('DELETE FROM routines WHERE id=?', (rid,))
        self.assertEqual(db.execute('SELECT count(*) FROM routine_completions').fetchone()[0],0)
        self.assertEqual(db.execute('SELECT count(*) FROM routine_alerts').fetchone()[0],0)
        db.close()

    def test_native_sql_avoids_sqlite_338_only_unixepoch(self):
        import re
        for relative in ('src-tauri/src/lib.rs','src-tauri/src/routines.rs','src-tauri/src/routines_schema.sql'):
            source = (ROOT/relative).read_text()
            self.assertIsNone(re.search(r'\bunixepoch\s*\(', source, re.IGNORECASE), relative)
        self.assertIn("CAST(strftime('%s','now') AS INTEGER)", SQL)

    def test_rust_fixture_matches_required_routine_fields(self):
        """Guard against the CI regression where Default::default() produced
        an empty category and a paused routine in the Rust test fixture.
        """
        source = (ROOT / 'src-tauri/src/routines.rs').read_text()
        fixture = source.split('fn sample(kind:&str)->Routine {', 1)[1].split('    #[test]', 1)[0]
        self.assertIn('category: "Personal".into()', fixture)
        self.assertIn('enabled: true', fixture)
        self.assertIn('validate(&r).unwrap()', source)
        db = sqlite3.connect(':memory:')
        db.execute('PRAGMA foreign_keys=ON')
        db.executescript(SQL)
        db.execute("""INSERT INTO routines(title,category,schedule_kind,start_date,enabled)
                      VALUES('Practice','Personal','anytime','2026-01-01',1)""")
        self.assertEqual(db.execute('SELECT enabled FROM routines').fetchone()[0], 1)
        db.close()

    def test_schema_enforces_valid_schedules_and_foreign_keys(self):
        db=sqlite3.connect(':memory:')
        db.execute('PRAGMA foreign_keys=ON')
        db.executescript(SQL)
        with self.assertRaises(sqlite3.IntegrityError):
            db.execute("INSERT INTO routines(title,schedule_kind,start_date) VALUES('Oops','nonsense','2026-01-01')")
        with self.assertRaises(sqlite3.IntegrityError):
            db.execute("INSERT INTO routines(title,interval_days,start_date) VALUES('Oops',0,'2026-01-01')")
        with self.assertRaises(sqlite3.IntegrityError):
            db.execute("INSERT INTO routine_completions(routine_id,occurrence_date) VALUES(12345,'2026-01-01')")
if __name__=='__main__':unittest.main(verbosity=2)
