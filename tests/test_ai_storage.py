#!/usr/bin/env python3
"""Offline native schema verification; independent from provider credentials and networks."""
from pathlib import Path
import re,sqlite3,unittest
root=Path(__file__).resolve().parents[1]
rust=(root/'src-tauri/src/ai.rs').read_text()
lib=(root/'src-tauri/src/lib.rs').read_text()
schema=re.search(r'db\.execute_batch\(r#"(.*?)"#\)\?;',rust,re.S).group(1)

class AIStorageTests(unittest.TestCase):
 def setUp(self):
  self.db=sqlite3.connect(':memory:');self.db.execute('PRAGMA foreign_keys=ON')
  self.db.executescript('''CREATE TABLE tasks(id INTEGER PRIMARY KEY,title TEXT,details TEXT);
      CREATE TABLE notes(id INTEGER PRIMARY KEY,title TEXT,body TEXT);
      CREATE TABLE routines(id INTEGER PRIMARY KEY,title TEXT,details TEXT);
      CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);''')
  self.db.executescript(schema)
  self.db.executescript("""INSERT INTO rooz_search(kind,source_id,title,body) SELECT 'task',id,title,details FROM tasks;
     INSERT INTO rooz_search(kind,source_id,title,body) SELECT 'note',id,title,body FROM notes;
     INSERT INTO rooz_search(kind,source_id,title,body) SELECT 'routine',id,title,details FROM routines;""")
 def test_task_note_and_routine_archives_survive_delete(self):
  for table in ('tasks','notes','routines'):
   self.db.execute(f"INSERT INTO {table}(title,{ 'body' if table=='notes' else 'details'}) VALUES(?,?)",(table,'Useful saved context'))
   self.db.execute(f"DELETE FROM {table}")
  assert self.db.execute('SELECT COUNT(*) FROM rooz_archive').fetchone()[0]==3
  assert self.db.execute('SELECT COUNT(*) FROM rooz_search WHERE kind="archive"').fetchone()[0]==3
  assert len(self.db.execute('SELECT title FROM rooz_search WHERE rooz_search MATCH ?',(r'"Useful"*',)).fetchall())==3
 def test_reindex_does_not_duplicate_entries(self):
  self.db.execute("INSERT INTO tasks(title,details) VALUES('Read Persian history','5 pages')")
  assert self.db.execute("SELECT COUNT(*) FROM rooz_search WHERE kind='task'").fetchone()[0]==1
  self.db.execute("UPDATE tasks SET details='10 pages' WHERE id=1")
  assert self.db.execute("SELECT COUNT(*) FROM rooz_search WHERE kind='task'").fetchone()[0]==1
  self.db.execute("DELETE FROM tasks WHERE id=1")
  assert self.db.execute("SELECT COUNT(*) FROM rooz_search WHERE kind='task'").fetchone()[0]==0
  assert self.db.execute("SELECT COUNT(*) FROM rooz_search WHERE kind='archive'").fetchone()[0]==1
 def test_native_settings_are_all_allowed(self):
  keys=['calendar_system','ai_provider','ai_policy','ai_model','ai_rag_enabled','ai_proxy_enabled','ai_proxy_url','ai_stt','ai_whisper_model','ai_voice_speech','ai_stt_language','ai_local_voice_reply']
  for key in keys:self.assertIn('"'+key+'"',lib, f'Native backend must allow {key}')
 def tearDown(self):self.db.close()
if __name__=='__main__':unittest.main(verbosity=2)
