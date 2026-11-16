"""Screenshots of the actual locally rendered UI; no native claims."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image,ImageDraw,ImageFont,ImageFilter
r=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1134,'height':760},device_scale_factor=1)
 page.set_content('<style>'+(r/'web/style.css').read_text()+'</style><div id="app"></div>')
 page.add_script_tag(content=(r/'tests/browser-bundle.js').read_text())
 page.locator('.app-dock [data-view="routines"]').click()
 page.locator('[data-action="toggle-fullscreen"]').click()
 page.wait_for_timeout(460)
 page.screenshot(path=str(r/'preview/routines-expanded-en.png'))
 b.close()
# Show real screenshots framed together, without inventing visual output.
compact=Image.open(r/'preview/routines-compact.png').convert('RGB')
expanded=Image.open(r/'preview/routines-expanded-en.png').convert('RGB')
w,h=1900,1130
back=Image.new('RGB',(w,h),'#0e1120');overlay=Image.new('RGBA',(w,h));d=ImageDraw.Draw(overlay)
d.ellipse((-250,-370,820,520),fill=(135,100,220,60))
d.ellipse((1050,540,2200,1500),fill=(79,118,191,60))
overlay=overlay.filter(ImageFilter.GaussianBlur(125));back=Image.alpha_composite(back.convert('RGBA'),overlay)
try:
 ft=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',46)
 sub=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',20)
except:ft=sub=ImageFont.load_default()
d=ImageDraw.Draw(back)
d.text((100,65),'Rooz 0.3  /  The Rhythm Studio',font=ft,fill='#f3efff')
d.text((102,135),'Routines  ·  Flexible schedules  ·  Persistent check-ins  ·  Native SQLite',font=sub,fill='#aeb6d4')
def put(img,xy,target_w):
 factor=target_w/img.width
 render=img.resize((target_w,int(img.height*factor)),Image.Resampling.LANCZOS)
 w,h=render.size;x,y=xy
 shadow=Image.new('RGBA',(w+45,h+45),(0,0,0,0))
 ImageDraw.Draw(shadow).rounded_rectangle((20,20,w+20,h+20),radius=25,fill=(0,0,0,130))
 shadow=shadow.filter(ImageFilter.GaussianBlur(18));back.alpha_composite(shadow,(x-18,y-18))
 back.alpha_composite(render.convert('RGBA'),(x,y))
 return h
put(expanded,(98,259),1250)
put(compact,(1395,228),375)
d=ImageDraw.Draw(back)
d.text((102,1014),'EXPANDED WORKSPACE',font=sub,fill='#c9beed')
d.text((1395,916),'COMPACT DESKTOP WIDGET',font=sub,fill='#c9beed')
back.convert('RGB').save(r/'preview/routines-showcase.png',quality=93)
print('Generated real UI preview: routines-showcase.png')
