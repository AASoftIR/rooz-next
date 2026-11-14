from playwright.sync_api import sync_playwright
import os
from pathlib import Path
root=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':438,'height':704},device_scale_factor=1)
 errors=[]
 page.on('pageerror',lambda err:errors.append(str(err)))
 page.set_content('<style>'+ (root/'web/style.css').read_text() +'</style><div id="app"></div>')
 page.evaluate("""() => { const store=new Map(); Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)}}); }""")
 page.add_script_tag(content=(root/'tests/browser-bundle.js').read_text())
 page.wait_for_timeout(400)
 page.screenshot(path=str(root/'preview/compact.png'))
 assert page.locator('.task-row').count()>=3, 'today tasks not shown'
 # task CRUD quick add
 page.locator('#quick-title').fill('Write tests @14:30 #work !!')
 page.locator('#quick-title').press('Enter')
 page.wait_for_timeout(250)
 assert page.get_by_text('Write tests',exact=True).count()>=1,'quick add failed'
 card=page.locator('.task-row').filter(has_text='Write tests')
 card.locator('[data-action="edit-task"]').click()
 assert page.locator('input[name="due_time"]').input_value()=='14:30'
 assert page.locator('select[name="category"]').input_value()=='Work'
 assert page.locator('select[name="priority"]').input_value()=='2'
 page.locator('button[data-action="dismiss-modal"]').click()
 card=page.locator('.task-row').filter(has_text='Write tests')
 card.locator('[data-action="toggle-task"]').click()
 page.wait_for_timeout(100)
 assert page.locator('.task-row.is-done').count()>=2
 # calendar
 page.locator('[data-action="navigate"][data-view="calendar"]').click()
 assert page.locator('.month-widget:not(.small-calendar) .calendar-day').count()==42
 page.locator('.month-widget:not(.small-calendar) [data-action="next-month"]').click()
 # notes
 page.locator('[data-action="navigate"][data-view="notes"]').click()
 page.screenshot(path=str(root/'preview/notes.png'))
 page.locator('[data-action="new-note"]').first.click()
 assert page.locator('#rich-editor').count()==1
 page.locator('#note-title').fill('A wonderful note')
 page.locator('#rich-editor').fill('An important idea')
 page.wait_for_timeout(1000)
 page.screenshot(path=str(root/'preview/editor.png'))
 page.locator('[data-action="close-note"]').click()
 page.wait_for_timeout(300)
 assert page.get_by_text('A wonderful note').count()>=1,'note autosave failed'
 # markdown toggle
 page.locator('.notes-grid').get_by_text('A wonderful note',exact=True).click()
 page.locator('#markdown-toggle').click()
 assert page.locator('#markdown-editor').is_visible()
 page.locator('#markdown-editor').fill('## Heading\n\n**Strong** words')
 page.locator('#markdown-toggle').click()
 assert page.locator('#rich-editor h2').count()>=1
 page.locator('[data-action="close-note"]').click()
 # RTL
 page.locator('[data-action="open-settings"]').click()
 page.locator('select[name="language"]').select_option('fa')
 page.locator('#settings-form button[type="submit"]').click()
 page.wait_for_function("document.querySelector('.shell')?.getAttribute('dir') === 'rtl'", timeout=3000)
 page.screenshot(path=str(root/'preview/persian.png'))
 # focus
 page.locator('[data-action="navigate"][data-view="focus"]').click()
 page.locator('[data-action="focus-duration"][data-minutes="15"]').click()
 assert page.locator('#focus-time').inner_text()=='15:00'
 page.locator('[data-action="focus-toggle"]').click()
 page.wait_for_timeout(500)
 assert page.locator('[data-action="focus-toggle"]').count()==1
 # expanded
 page.locator('[data-action="toggle-expand"]').click()
 page.set_viewport_size({'width':1134,'height':760})
 page.locator('.app-dock [data-view="today"]').click()
 page.screenshot(path=str(root/'preview/expanded.png'))
 assert page.locator('.insight-rail').is_visible()
 # Command search
 page.keyboard.press('Control+k')
 assert page.locator('#command-input').count()==1
 page.locator('#command-input').fill('Write tests')
 assert page.locator('.palette-result').count()>=1
 page.keyboard.press('Escape')
 assert page.locator('#command-input').count()==0
 assert not errors, errors
 print('PASS: frontend smoke — task CRUD, typed quick-add, editor persistence, markdown, RTL, focus, calendar, expanded view, command palette')
 browser.close()
