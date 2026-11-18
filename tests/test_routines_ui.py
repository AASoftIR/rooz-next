#!/usr/bin/env python3
"""Run browser integration tests using compiled source, real Chromium, no network."""
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
html='<style>'+(root/'web/style.css').read_text()+'</style><div id="app"></div>'
script=(root/'tests/browser-bundle.js').read_text()
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':438,'height':704},device_scale_factor=1)
    errors=[]
    page.on('pageerror',lambda err:errors.append(str(err)))
    page.set_content(html)
    page.evaluate("""() => {const m=new Map();Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)}})}""")
    page.add_script_tag(content=script)
    page.locator('.app-dock [data-view="routines"]').click()
    assert page.locator('.routine-card').count()==4, 'demo routines not visible'
    assert page.locator('.routines-view').is_visible()
    assert page.locator('.task-row').count()==0, 'routines accidentally shown as tasks'
    # Pure schedule calculations, including DST-resistant intervals and short months.
    assert page.evaluate("""() => {
      const r=routineDraft('2026-01-01'); r.schedule_kind='monthly';r.month_day=31;
      return occursOn(r,'2026-02-28') && occursOn(r,'2026-03-31') && !occursOn(r,'2026-02-27');
    }""")
    assert page.evaluate("""() => {
      const r=routineDraft('2026-03-07');r.schedule_kind='interval';r.interval_days=3;
      return occursOn(r,'2026-03-10') && occursOn(r,'2026-03-13') && !occursOn(r,'2026-03-11');
    }""")
    assert page.evaluate("""() => {
      const r=routineDraft('2026-01-01');r.schedule_kind='weekly';r.weekdays_mask=0b10101;
      return occursOn(r,'2026-01-05') && !occursOn(r,'2026-01-06') && occursOn(r,'2026-01-07');
    }""")
    page.screenshot(path=str(root/'preview/routines-compact.png'))
    # Search by category and create a new anytime errand.
    page.locator('#routine-search').fill('Grocer')
    assert page.locator('.routine-card').count()==1
    page.locator('#routine-search').fill('')
    page.locator('[data-action="add-routine"]').first.click()
    page.locator('#routine-form input[name="title"]').fill('Pick up a parcel')
    page.locator('#routine-form input[name="category"]').fill('Errands')
    page.locator('#routine-schedule-select').select_option('anytime')
    assert page.locator('.routine-weekdays').is_hidden()
    page.locator('#routine-form button[type="submit"]').click()
    assert page.locator('.routine-card').filter(has_text='Pick up a parcel').count()==1
    card=page.locator('.routine-card').filter(has_text='Pick up a parcel')
    card.locator('[data-action="complete-routine"]').click()
    assert card.locator('[data-action="undo-routine"]').count()==1
    assert card.locator('.routine-stats strong').last.inner_text()=='1'
    card.locator('[data-action="open-routine-history"]').click()
    assert page.locator('.routine-history-row').count()==1
    page.locator('.routine-history-row [data-action="undo-routine"]').click()
    assert page.locator('.routine-history-row').count()==0
    page.locator('.history-dialog [data-action="dismiss-modal"]').last.click()
    # Repeat weekdays: check the controlled weekday checkboxes survive form parsing.
    page.locator('[data-action="add-routine"]').first.click()
    page.locator('#routine-form input[name="title"]').fill('Every Monday and Thursday')
    page.locator('#routine-schedule-select').select_option('weekly')
    assert page.locator('.routine-weekdays').is_visible()
    page.locator('input[name="weekday_0"]').check()
    page.locator('input[name="weekday_1"]').uncheck()
    page.locator('input[name="weekday_2"]').uncheck()
    page.locator('input[name="weekday_3"]').check()
    page.locator('input[name="weekday_4"]').uncheck()
    page.locator('#routine-form button[type="submit"]').click()
    card=page.locator('.routine-card').filter(has_text='Every Monday and Thursday')
    assert card.count()==1
    card.locator('[data-action="edit-routine"]').click()
    assert page.locator('#routine-schedule-select').input_value()=='weekly'
    assert page.locator('input[name="weekday_0"]').is_checked()
    assert page.locator('input[name="weekday_3"]').is_checked()
    assert not page.locator('input[name="weekday_1"]').is_checked()
    # Pause through editor and then resume from the card.
    page.locator('#routine-form input[name="enabled"]').uncheck()
    page.locator('#routine-form button[type="submit"]').click()
    card=page.locator('.routine-card').filter(has_text='Every Monday and Thursday')
    card.locator('[data-action="resume-routine"]').click()
    # Existing today task view still intact.
    page.locator('.app-dock [data-view="today"]').click()
    assert page.locator('.task-row').count()>=3
    page.locator('.routine-portal').click()
    assert page.locator('.routines-view').is_visible()
    # RTL, expanded layout and history card.
    page.locator('[data-action="open-settings"]').click()
    page.locator('select[name="language"]').select_option('fa')
    page.locator('#settings-form button[type="submit"]').click()
    assert page.locator('.shell').get_attribute('dir')=='rtl'
    assert page.locator('.routine-heading h1').inner_text()=='برای تکرارهای خوب جا باز کن.'
    page.screenshot(path=str(root/'preview/routines-persian.png'))
    page.locator('[data-action="toggle-fullscreen"]').click()
    page.set_viewport_size({'width':1134,'height':760})
    assert page.locator('.routine-grid').evaluate('(el)=>getComputedStyle(el).gridTemplateColumns.split(" ").length')==2
    page.screenshot(path=str(root/'preview/routines-expanded.png'))
    assert not errors, errors
    print('PASS: routines UI — create, recurring schedules, check-in, undo, history, pause/resume, search, RTL, expanded, legacy tasks')
    browser.close()
