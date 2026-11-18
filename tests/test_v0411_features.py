"""Regression guards for 0.4.11 migration, native window semantics and backups."""
import json
import sqlite3
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SCHEMA=(ROOT/'src-tauri/src/routines_schema.sql').read_text()


class Features0411(unittest.TestCase):
    def setUp(self):
        self.db=sqlite3.connect(':memory:')
        self.db.execute('PRAGMA foreign_keys=ON')
        self.db.executescript(SCHEMA)
        self.db.execute("INSERT INTO routines(id,title,start_date) VALUES(1,'Sport','2026-01-01')")
        self.db.execute("INSERT INTO routines(id,title,start_date) VALUES(2,'Daily plan','2026-01-01')")

    def tearDown(self):self.db.close()

    def test_nesting_and_reusable_routine_foreign_key(self):
        self.db.execute("INSERT INTO routine_items(routine_id,title,depth,linked_routine_id) VALUES(2,'Workout',1,1)")
        row=self.db.execute('SELECT depth,linked_routine_id FROM routine_items').fetchone()
        self.assertEqual(row,(1,1))
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("INSERT INTO routine_items(routine_id,title,depth) VALUES(2,'Too deep',4)")
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("INSERT INTO routine_items(routine_id,title,linked_routine_id) VALUES(2,'Missing',999)")
        self.db.execute('DELETE FROM routines WHERE id=1')
        self.assertIsNone(self.db.execute("SELECT linked_routine_id FROM routine_items WHERE title='Workout'").fetchone()[0])

    def test_old_item_columns_migrate_additively(self):
        rust=(ROOT/'src-tauri/src/routines.rs').read_text()
        self.assertIn('ALTER TABLE routine_items ADD COLUMN depth',rust)
        self.assertIn('ALTER TABLE routine_items ADD COLUMN linked_routine_id',rust)
        self.assertIn('A routine cannot include itself',rust)
        self.assertIn('Routine inclusion would create a cycle',rust)
        self.assertIn('SAVEPOINT rooz_save_plan',rust)

    def test_normal_window_does_not_obscure_other_fullscreen_apps(self):
        config=json.loads((ROOT/'src-tauri/tauri.conf.json').read_text())
        self.assertFalse(config['app']['windows'][0]['alwaysOnTop'])
        lib=(ROOT/'src-tauri/src/lib.rs').read_text()
        self.assertNotIn('set_always_on_top(true)',lib)
        kwin=(ROOT/'packaging/kwin/roozanchor/contents/code/main.js').read_text()
        self.assertNotIn('win.frameGeometryChanged.connect(',kwin)
        self.assertIn('start_dragging()',lib)

    def test_full_database_and_safe_merge(self):
        lib=(ROOT/'src-tauri/src/lib.rs').read_text()
        self.assertIn('VACUUM INTO ?1',lib)
        self.assertIn('SAVEPOINT rooz_import_backup',lib)
        self.assertIn('ROLLBACK TO SAVEPOINT rooz_import_backup',lib)
        self.assertIn('routine_item_completions',lib)
        self.assertIn('routine_completions',lib)
        self.assertIn('save_export,backup_database,import_backup',lib)


if __name__=='__main__':unittest.main(verbosity=2)
