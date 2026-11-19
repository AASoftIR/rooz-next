"""v0.4.12 regressions: reuse, overdue work, AI connection reuse, task undo."""
import sqlite3
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LIB = (ROOT / 'src-tauri/src/lib.rs').read_text()
AI = (ROOT / 'src-tauri/src/ai.rs').read_text()
RUST = (ROOT / 'src-tauri/src/routines.rs').read_text()
SCHEMA = (ROOT / 'src-tauri/src/routines_schema.sql').read_text()
FRONTEND = (ROOT / 'frontend/app.ts').read_text()
ASSISTANT = (ROOT / 'frontend/assistant.ts').read_text()


class Core0412(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(':memory:')
        self.db.execute('PRAGMA foreign_keys=ON')
        self.db.executescript(SCHEMA)

    def tearDown(self):
        self.db.close()

    def test_embedded_routine_has_parent_in_recursive_schedule(self):
        for id, title, schedule in [(1, 'Sport', 'weekly'), (2, 'Daily', 'daily'), (3, 'Master', 'daily')]:
            self.db.execute('INSERT INTO routines(id,title,start_date,schedule_kind) VALUES(?,?,?,?)',
                            (id, title, '2026-01-01', schedule))
        self.db.execute("INSERT INTO routine_items(routine_id,title,linked_routine_id) VALUES(2,'Sport component',1)")
        self.db.execute("INSERT INTO routine_items(routine_id,title,linked_routine_id) VALUES(3,'Daily component',2)")
        parents=self.db.execute('''WITH RECURSIVE parents(id) AS (
            SELECT routine_id FROM routine_items WHERE active=1 AND linked_routine_id=?1 AND (weekdays_mask & ?2)<>0
            UNION SELECT i.routine_id FROM routine_items i JOIN parents p ON i.linked_routine_id=p.id
            WHERE i.active=1 AND (i.weekdays_mask & ?2)<>0
        ) SELECT id FROM parents LIMIT 500''',(1,8)).fetchall()
        self.assertEqual(set(parents), {(2,), (3,)})
        self.assertIn('due_or_embedded',RUST)
        self.assertIn('cascade_composed_completion',RUST)
        self.assertIn('SAVEPOINT rooz_item_toggle',RUST)
        self.assertIn('affected_routines',RUST)

    def test_task_undo_reverses_only_current_occurrence_history(self):
        self.db.executescript('''CREATE TABLE completions(id INTEGER PRIMARY KEY, task_id INTEGER, date TEXT);
        INSERT INTO completions(task_id,date) VALUES(10,'2026-11-18');
        INSERT INTO completions(task_id,date) VALUES(10,'2026-11-19');''')
        self.db.execute('''DELETE FROM completions WHERE id=(SELECT id FROM completions
            WHERE task_id=?1 AND date=?2 ORDER BY id DESC LIMIT 1)''',(10,'2026-11-19'))
        self.assertEqual(self.db.execute('SELECT date FROM completions').fetchall(),[('2026-11-18',)])
        self.assertIn('SAVEPOINT rooz_task_toggle',LIB)

    def test_missed_tasks_can_be_moved_atomically(self):
        self.assertIn('fn carry_overdue(',LIB)
        self.assertIn("AND recurrence='none'",LIB)
        self.assertIn('ROLLBACK TO SAVEPOINT rooz_carry_overdue',LIB)
        self.assertIn('toggle_task,carry_overdue,delete_task',LIB)

    def test_provider_metadata_and_http_are_cached(self):
        self.assertIn('static MODEL_CACHE:',AI)
        self.assertIn('Duration::from_secs(900)',AI)
        self.assertIn('static HTTP_CLIENTS:',AI)
        self.assertIn('request=request.timeout(Duration::from_secs(seconds))',AI)
        self.assertIn('client.clone()',AI)
        self.assertIn('api_request_with_timeout(db,provider,"/models",None,10)',AI)
        self.assertIn('entries.clear()',AI)

    def test_ui_rebuild_keeps_live_assistant_and_typed_capture(self):
        self.assertIn("const assistant=root.querySelector<HTMLElement>('.ai-overlay')",FRONTEND)
        self.assertIn('if(assistant&&shell&&aiIsOpen())shell.appendChild(assistant)',FRONTEND)
        self.assertIn('quickInput.value=pendingTitle',FRONTEND)
        self.assertIn('const weekOpen=',FRONTEND)
        self.assertIn('render();\n const expectedMode=mode;',ASSISTANT)
        self.assertIn('await backend.cancelNativeVoice()',ASSISTANT)


if __name__ == '__main__':
    unittest.main(verbosity=2)
