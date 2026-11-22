from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parent.parent
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1440,'height':850}); errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content('<!doctype html><html><head><meta charset="utf-8"><style>'+(root/'media/editor.css').read_text()+'</style></head><body><div id="app"></div></body></html>')
 page.evaluate('window.__messages=[];window.acquireVsCodeApi=()=>({postMessage:m=>window.__messages.push(m)});')
 for rel in ['media/model.js','core/features.js','media/editor.js']:page.add_script_tag(content=(root/rel).read_text())
 example=json.loads((root/'examples/motor-current-v2.flow.json').read_text())
 page.evaluate("d=>window.dispatchEvent(new MessageEvent('message',{data:{type:'load',document:d,filename:'test.flow.json',theme:'dark'}}))",example)
 def select_first_edge():
  page.locator('.link').first.locator('path').nth(1).dispatch_event('pointerdown',{'button':0,'pointerId':1,'clientX':300,'clientY':250})
  page.locator('#canvas').dispatch_event('pointerup',{'button':0,'pointerId':1,'clientX':300,'clientY':250})
 def last_doc():return page.evaluate("()=>window.__messages.filter(x=>x.type==='dirty').at(-1)?.document")
 def current_segment_info():return page.evaluate('''()=>{const p=document.querySelector('.link.selected path');return {d:p?.getAttribute('d'),strokeDash:p?.getAttribute('stroke-dasharray'),handles:document.querySelectorAll('[data-segment]').length}}''')
 select_first_edge();assert current_segment_info()['strokeDash']=='6 4'
 handle=page.locator('[data-segment]').first
 box=handle.bounding_box();x=box['x']+box['width']/2;y=box['y']+box['height']/2
 dx=44 if box['width']<box['height'] else 0;dy=0 if dx else 44
 page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+dx,y+dy,steps=5);page.mouse.up()
 d=last_doc();assert d,'drag did not save';edgeid=d['edges'][0]['id']; path=d['layout']['edges'][edgeid]['manualPath']
 assert all(a['x']==b['x'] or a['y']==b['y'] for a,b in zip(path,path[1:])),path
 visible=current_segment_info()['d']; assert visible.startswith('M') and 'L' in visible
 # reconstruct from visible SVG path and ensure no diagonal and endpoint preservation
 import re
 pts=[tuple(map(int,x)) for x in re.findall(r'(\d+) (\d+)',visible)]
 assert all(a[0]==b[0] or a[1]==b[1] for a,b in zip(pts,pts[1:])),pts
 assert (path[0]['x']*22,path[0]['y']*22)==pts[0] and (path[-1]['x']*22,path[-1]['y']*22)==pts[-1]
 page.locator('[data-action="toggleEdgeLock"]').click()
 state=current_segment_info();assert state['strokeDash']=='none' and state['handles']==0,state
 locked=last_doc();assert locked['edges'][0].get('locked') is True
 assert page.locator('[data-edge-label]').is_disabled()
 assert page.locator('[data-action="waypoint"]').is_disabled()
 assert page.locator('#inspector [data-action="delete"]').is_disabled()
 # reload saved document, ensure persistence
 page.evaluate("d=>window.dispatchEvent(new MessageEvent('message',{data:{type:'load',document:d,filename:'test.flow.json',theme:'dark'}}))",locked)
 select_first_edge();assert current_segment_info()['strokeDash']=='none'
 page.locator('[data-action="toggleEdgeLock"]').click()
 assert current_segment_info()['strokeDash']=='6 4' and current_segment_info()['handles']>0
 assert last_doc()['edges'][0]['locked'] is False
 assert not errors,errors
 print('PASS: continuous orthogonal edge after drag, port endpoints unchanged, editable dashed, locked solid, editing controls disabled, persisted reload and unlock')
 browser.close()
