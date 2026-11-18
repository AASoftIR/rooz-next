#!/usr/bin/env python3
"""Validate backward-compatible SQLite routine checklist migration."""
import sqlite3, unittest
from pathlib import Path
SCHEMA=(Path(__file__).resolve().parents[1]/'src-tauri/src/routines_schema.sql').read_text()
class ChecklistStorageTests(unittest.TestCase):
 def setUp(self):
  self.db=sqlite3.connect(':memory:')
  self.db.execute('PRAGMA foreign_keys=ON')
  self.db.executescript(SCHEMA)
  self.db.execute("INSERT INTO routines(id,title,category,schedule_kind,start_date) VALUES(17,'Groceries','Errands','anytime','2025-01-01')")
 def tearDown(self):self.db.close()
 def test_additive_migration_preserves_old_templates(self):
  self.db.executescript(SCHEMA)
  self.assertEqual(self.db.execute('SELECT title FROM routines WHERE id=17').fetchone()[0],'Groceries')
  self.assertEqual(self.db.execute('SELECT count(*) FROM routine_items').fetchone()[0],0)
 def test_checklist_can_be_checked_per_occurrence(self):
  self.db.execute("INSERT INTO routine_items(id,routine_id,title,position,required,weekdays_mask) VALUES(1,17,'Milk',0,1,127)")
  self.db.execute("INSERT INTO routine_items(id,routine_id,title,position,required,weekdays_mask) VALUES(2,17,'Bread',1,1,31)")
  self.db.execute("INSERT INTO routine_item_completions(item_id,occurrence_date) VALUES(1,'2026-11-16')")
  self.db.execute("INSERT INTO routine_item_completions(item_id,occurrence_date) VALUES(1,'2026-11-17')")
  self.assertEqual(self.db.execute('SELECT count(*) FROM routine_item_completions').fetchone()[0],2)
  with self.assertRaises(sqlite3.IntegrityError):self.db.execute("INSERT INTO routine_item_completions(item_id,occurrence_date) VALUES(1,'2026-11-16')")
 def test_item_instructions_are_persistent_and_backward_compatible(self):
  self.db.execute("INSERT INTO routine_items(routine_id,title,details) VALUES(17,'Call bank','Reference number and link')")
  self.assertEqual(self.db.execute("SELECT details FROM routine_items WHERE title='Call bank'").fetchone()[0],'Reference number and link')
  self.db.execute("INSERT INTO routine_items(routine_id,title) VALUES(17,'Old template item')")
  self.assertEqual(self.db.execute("SELECT details FROM routine_items WHERE title='Old template item'").fetchone()[0],'')
 def test_soft_delete_preserves_history(self):
  self.db.execute("INSERT INTO routine_items(id,routine_id,title) VALUES(1,17,'Laundry')")
  self.db.execute("INSERT INTO routine_item_completions(item_id,occurrence_date) VALUES(1,'2026-11-16')")
  self.db.execute('UPDATE routine_items SET active=0 WHERE id=1')
  self.assertEqual(self.db.execute('SELECT count(*) FROM routine_items WHERE active=1').fetchone()[0],0)
  self.assertEqual(self.db.execute('SELECT count(*) FROM routine_item_completions').fetchone()[0],1)
 def test_fk_integrity_and_cascade(self):
  with self.assertRaises(sqlite3.IntegrityError):self.db.execute("INSERT INTO routine_items(routine_id,title) VALUES(999,'Invalid')")
  self.db.execute("INSERT INTO routine_items(id,routine_id,title) VALUES(1,17,'Milk')")
  self.db.execute("INSERT INTO routine_item_completions(item_id,occurrence_date) VALUES(1,'2026-11-16')")
  self.db.execute('DELETE FROM routines WHERE id=17')
  self.assertEqual(self.db.execute('SELECT count(*) FROM routine_item_completions').fetchone()[0],0)
if __name__=='__main__':unittest.main(verbosity=2)
