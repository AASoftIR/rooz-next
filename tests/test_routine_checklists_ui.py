#!/usr/bin/env python3
"""Browser interaction test for reusable checklist templates and persistent check-ins."""
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
html='<style>'+(root/'web/style.css').read_text()+'</style><div id="app"></div>'
bundle=(root/'tests/browser-bundle.js').read_text()
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':454,'height':740},device_scale_factor=1)
 errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
 page.set_content(html)
 page.evaluate("""() => { const m=new Map();Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,String(v))}})}""")
 page.add_script_tag(content=bundle);page.wait_for_timeout(180)
 page.locator('.app-dock [data-view="routines"]').click()
 page.locator('[data-action="add-routine"]').first.click()
 page.locator('#routine-form input[name="title"]').fill('Weekly errands checklist')
 page.locator('#routine-schedule-select').select_option('anytime')
 page.locator('[data-action="add-routine-item"]').click()
 rows=page.locator('.checklist-edit-row')
 assert rows.count()==1
 rows.nth(0).locator('[name="checklist_title"]').fill('Buy milk')
 rows.nth(0).locator('[name="checklist_details"]').fill('Check best-before date')
 page.locator('[data-action="add-routine-item"]').click()
 rows.nth(1).locator('[name="checklist_title"]').fill('Buy bread')
 assert rows.count()==2
 page.locator('#routine-form button[type="submit"]').click()
 card=page.locator('.routine-card').filter(has_text='Weekly errands checklist')
 assert card.count()==1
 assert card.locator('[data-action="toggle-routine-item"]').count()==2
 assert card.get_by_text('Check best-before date').count()==1
 assert card.locator('.routine-checklist-heading').inner_text().strip().endswith('0/2')
 card.locator('[data-action="toggle-routine-item"]').nth(0).click()
 card=page.locator('.routine-card').filter(has_text='Weekly errands checklist')
 assert card.locator('.routine-checklist-heading').inner_text().strip().endswith('1/2')
 assert card.locator('.routine-checklist-row.is-done').count()==1
 card.locator('[data-action="toggle-routine-item"]').nth(1).click()
 card=page.locator('.routine-card').filter(has_text='Weekly errands checklist')
 assert card.locator('.routine-checklist-heading').inner_text().strip().endswith('2/2')
 assert card.locator('[data-action="undo-routine"]').count()==1
 # Switching sections keeps the shell/AI overlay mounted; only the view changes.
 page.evaluate("() => {window.__roozShell=document.querySelector('.shell')}")
 # Check-in state remains after navigation changes and new render.
 page.locator('.app-dock [data-view="notes"]').click()
 page.locator('.app-dock [data-view="routines"]').click()
 assert page.evaluate("() => window.__roozShell===document.querySelector('.shell')")
 card=page.locator('.routine-card').filter(has_text='Weekly errands checklist')
 assert card.locator('.routine-checklist-row.is-done').count()==2
 card.locator('[data-action="toggle-routine-item"]').nth(0).click()
 card=page.locator('.routine-card').filter(has_text='Weekly errands checklist')
 assert card.locator('.routine-checklist-row.is-done').count()==1
 assert card.locator('[data-action="complete-routine"]').count()==1
 card.locator('[data-action="edit-routine"]').click()
 assert page.locator('.checklist-edit-row').count()==2
 assert page.locator('.checklist-edit-row').nth(0).locator('[name="checklist_details"]').input_value()=='Check best-before date'
 # Edit an item without losing its record.
 page.locator('.checklist-edit-row').nth(1).locator('[name="checklist_title"]').fill('Buy wholegrain bread')
 # Reorder checklist rows via the actual delegated HTML drag events.
 page.evaluate("""() => { const rows=[...document.querySelectorAll('.checklist-edit-row')];const grip=rows[1].querySelector('.checklist-item-grip');const transfer=new DataTransfer();grip.dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer:transfer}));rows[0].dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:transfer}));rows[0].dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:transfer}));grip.dispatchEvent(new DragEvent('dragend',{bubbles:true,dataTransfer:transfer}));}""")
 assert page.locator('.checklist-edit-row').first.locator('[name="checklist_title"]').input_value()=='Buy wholegrain bread'
 page.locator('#routine-form button[type="submit"]').click()
 card=page.locator('.routine-card').filter(has_text='Weekly errands checklist')
 assert card.locator('.routine-checklist-row').filter(has_text='Buy wholegrain bread').count()==1
 # Ensure no UI error occurred or lost text focus during routine search.
 search=page.locator('#routine-search');search.fill('wholegrain');assert page.locator('.routine-card').count()==1
 assert search.evaluate('(el) => document.activeElement===el')
 page.screenshot(path=str(root/'preview/v047-routine-checklists.png'),full_page=True)
 assert not errors,errors
 print('PASS checklist UI: add/edit, independent click-to-complete, auto completion, undo, persistence, search and focus')
 browser.close()
