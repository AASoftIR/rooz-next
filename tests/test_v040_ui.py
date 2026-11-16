#!/usr/bin/env python3
"""End-to-end offline browser checks for advanced schedules, Solar calendar, AI controls."""
from pathlib import Path
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parents[1]
html='<style>'+(root/'web/style.css').read_text()+'</style><div id="app"></div>'
bundle=(root/'tests/browser-bundle.js').read_text()
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':450,'height':760},device_scale_factor=1)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html)
 page.evaluate("""() => {const m=new Map();Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)}})}""")
 page.add_script_tag(content=bundle);page.wait_for_timeout(250)
 assert page.evaluate('isoToSolar("2026-11-15")')=='1405/08/24'
 assert page.evaluate("parseVoiceRoutine('Read books every Friday').schedule_kind")=='weekly'
 assert page.evaluate("parseVoiceRoutine('Read books every Friday').weekdays_mask")==(1<<4)
 assert page.evaluate("parseVoiceRoutine('Clean room on weekends').schedule_kind")=='daily'
 assert page.evaluate("JSON.parse(parseVoiceRoutine('Clean room on weekends').rule_json).day_class")=='weekend'

 assert page.evaluate('solarToISO("۱۴۰۵/۰۸/۲۴")')=='2026-11-15'
 assert page.evaluate('solarToISO("1405/13/01")')==None
 assert page.evaluate('solarToISO("1405/12/30")')==None
 assert page.evaluate('shiftCalendarMonth(new Date("2026-11-15T12:00:00"),1,"fa").getUTCMonth()') in (10,11)
 assert page.evaluate('''() => {
 const r=routineDraft('2026-11-01');r.schedule_kind='daily';
 r.rule_json=JSON.stringify({calendar:'jalali',parity:'even',day_class:'all'});
 return occursOn(r,'2026-11-15') && !occursOn(r,'2026-11-16');
 }''')
 assert page.evaluate('''() => {
 const r=routineDraft('2026-11-01');r.schedule_kind='daily';
 r.rule_json=JSON.stringify({calendar:'gregorian',day_class:'weekend',weekend_days:[4]});
 return occursOn(r,'2026-11-13') && !occursOn(r,'2026-11-14');
 }''')
 assert page.evaluate('''() => {
 const r=routineDraft('2026-11-01');r.schedule_kind='daily';
 r.rule_json=JSON.stringify({calendar:'gregorian',parity:'even',include_dates:['2026-11-15'],exclude_dates:['2026-11-16']});
 return occursOn(r,'2026-11-15') && !occursOn(r,'2026-11-16');
 }''')
 page.locator('.app-dock [data-view="calendar"]').click()
 assert page.locator('.calendar-switch').is_visible()
 before=page.locator('[data-action="toggle-calendar-system"]').inner_text()
 page.locator('[data-action="toggle-calendar-system"]').click()
 after=page.locator('[data-action="toggle-calendar-system"]').inner_text()
 assert before!=after
 page.screenshot(path=str(root/'preview/v040-shamsi-calendar.png'),full_page=True)
 page.locator('[data-action="next-month"]').first.click()
 assert page.locator('.calendar-day').count()>27
 page.locator('.app-dock [data-view="routines"]').click()
 assert page.locator('.routine-week-plan').is_visible()
 assert page.locator('.routine-week-day').count()==7
 page.locator('[data-action="add-routine"]').first.click()
 assert page.locator('#routine-form').is_visible()
 page.locator('#routine-form input[name="title"]').fill('Alternating Persian dates')
 page.locator('[data-preset="odd"]').click()
 assert page.locator('#routine-schedule-select').input_value()=='daily'
 assert page.locator('select[name="rule_parity"]').input_value()=='odd'
 page.locator('select[name="rule_calendar"]').select_option('jalali')
 assert page.locator('#routine-next-preview span').count()>=1
 page.locator('#routine-form button[type="submit"]').click()
 assert page.locator('.routine-card').filter(has_text='Alternating Persian dates').count()==1
 card=page.locator('.routine-card').filter(has_text='Alternating Persian dates')
 card.locator('[data-action="edit-routine"]').click()
 assert page.locator('select[name="rule_parity"]').input_value()=='odd'
 assert page.locator('select[name="rule_calendar"]').input_value()=='jalali'
 page.wait_for_timeout(320);page.screenshot(path=str(root/'preview/v040-advanced-rules.png'),full_page=True)
 page.locator('#routine-form [data-action="dismiss-modal"]').click()
 page.locator('[data-action="open-ai"]').first.click()
 assert page.locator('.ai-overlay').is_visible()
 assert page.locator('.ai-chat-form').is_visible()
 page.locator('[data-ai-action="settings"]').click()
 assert page.locator('select[name="ai_provider"]').input_value()=='openrouter'
 assert page.locator('input[name="ai_proxy_enabled"]').count()==1
 assert page.locator('input[name="ai_rag_enabled"]').count()==1
 page.wait_for_timeout(320);page.screenshot(path=str(root/'preview/v040-ai-settings.png'),full_page=True)
 page.locator('[data-ai-action="voice"]').click()
 assert page.locator('.ai-voice-stage').is_visible()
 assert 'help' in page.locator('.ai-voice-commands').inner_text()
 page.wait_for_timeout(320);page.screenshot(path=str(root/'preview/v040-voice.png'),full_page=True)
 assert not errors,errors
 print('PASS: v0.4 UI — Persian dates, advanced weekday/parity/exceptions, seven-day plan, routine persistence, AI settings, voice surface')
 browser.close()
