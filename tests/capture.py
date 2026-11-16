"""Generate verified UI screenshots using locally compiled frontend, no network required."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw, ImageFont, ImageFilter
r=Path(__file__).resolve().parents[1]
html='<style>'+ (r/'web/style.css').read_text() +'</style><div id="app"></div>'
script=(r/'tests/browser-bundle.js').read_text()
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':438,'height':704},device_scale_factor=2)
 page.set_content(html)
 page.evaluate("""() => {const m=new Map();Object.defineProperty(window,'localStorage',{value:{getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)}})}""")
 page.add_script_tag(content=script)
 page.wait_for_timeout(850)
 page.screenshot(path=str(r/'preview/compact.png'))
 page.locator('.app-dock [data-view="notes"]').click()
 page.wait_for_timeout(670)
 page.screenshot(path=str(r/'preview/notes.png'))
 page.locator('.notes-grid [data-action="open-note"]').first.click()
 page.wait_for_timeout(480)
 page.screenshot(path=str(r/'preview/editor.png'))
 page.locator('[data-action="close-note"]').click()
 page.wait_for_timeout(350)
 page.locator('.app-dock [data-view="today"]').click()
 page.locator('[data-action="toggle-fullscreen"]').click()
 page.set_viewport_size({'width':1134,'height':760})
 page.wait_for_timeout(700)
 page.screenshot(path=str(r/'preview/expanded.png'))
 page.locator('[data-action="open-settings"]').click()
 page.locator('select[name="language"]').select_option('fa')
 page.locator('#settings-form button[type="submit"]').click()
 page.wait_for_timeout(660)
 page.screenshot(path=str(r/'preview/persian.png'))
 browser.close()
print('Captured all 5 UI previews.')
# 2x screenshots combined into one 16:9 review image. Do not fabricate a native Tauri screenshot.
compact=Image.open(r/'preview/compact.png').convert('RGBA')
expanded=Image.open(r/'preview/expanded.png').convert('RGBA')
notes=Image.open(r/'preview/notes.png').convert('RGBA')
w,h=1900,1100
canvas=Image.new('RGBA',(w,h),(10,13,24,255))
orn=Image.new('RGBA',(w,h),(0,0,0,0));od=ImageDraw.Draw(orn)
od.ellipse((-230,-400,850,660),fill=(112,83,179,55))
od.ellipse((1300,350,2250,1300),fill=(62,139,155,50))
orn=orn.filter(ImageFilter.GaussianBlur(150));canvas=Image.alpha_composite(canvas,orn)
base=ImageDraw.Draw(canvas)
font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
if not Path(font).exists():font='/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf'
try:
 head=ImageFont.truetype(font,49);sub=ImageFont.truetype(font,20);tag=ImageFont.truetype(font,19)
except:head=sub=tag=ImageFont.load_default()
base.text((87,64),'Rooz  /  A calmer way to plan',font=head,fill=(246,241,255,255))
base.text((90,139),'Tauri 2  ·  Rust + SQLite  ·  Dependency-free TypeScript  ·  Spectral glass interface',font=sub,fill=(163,167,199,255))
def thumb(image,x,y,height):
 ratio=height/image.height
 width=int(image.width*ratio)
 render=image.resize((width,height),Image.Resampling.LANCZOS)
 shadow=Image.new('RGBA',(width+48,height+48),(0,0,0,0));sd=ImageDraw.Draw(shadow);sd.rounded_rectangle((24,24,24+width,24+height),radius=28,fill=(0,0,0,130));shadow=shadow.filter(ImageFilter.GaussianBlur(20));canvas.alpha_composite(shadow,(x-24,y-24))
 canvas.alpha_composite(render,(x,y));return width
thumb(expanded,82,235,670)
thumb(compact,1183,225,750)
thumb(notes,1540,330,590)
base=ImageDraw.Draw(canvas)
base.text((90,955),'FULL WORKSPACE',font=tag,fill=(172,159,241,255))
base.text((1185,1000),'COMPACT WIDGET + NOTES',font=tag,fill=(172,159,241,255))
canvas.convert('RGB').save(r/'preview/showcase.png',quality=94)
print('Created showcase.png')
