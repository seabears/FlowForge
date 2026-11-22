from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parent.parent
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1440,'height':850});errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content('<!doctype html><html><head><meta charset="utf-8"><style>'+(root/'media/editor.css').read_text()+'</style></head><body><div id="app"></div></body></html>')
 page.evaluate('window.__messages=[];window.acquireVsCodeApi=()=>({postMessage:m=>window.__messages.push(m)});')
 for rel in ['media/model.js','core/features.js','media/editor.js']:page.add_script_tag(content=(root/rel).read_text())
 example=json.loads((root/'examples/motor-current-v2.flow.json').read_text())
 page.evaluate("d=>window.dispatchEvent(new MessageEvent('message',{data:{type:'load',document:d,filename:'test.flow.json',theme:'dark'}}))",example)
 # Select edge via its event target; drag an internal segment directly.
 link=page.locator('.link').first
 link.locator('path').nth(1).dispatch_event('pointerdown',{'button':0,'pointerId':1,'clientX':310,'clientY':300});page.locator('#canvas').dispatch_event('pointerup',{'button':0,'pointerId':1,'clientX':310,'clientY':300})
 handles=page.locator('[data-segment]')
 print('handles',handles.count(), 'errors',errors, 'selected', page.locator('.link.selected').count(), 'linkpaths', page.locator('.link').count(), 'linkHTML',page.locator('.link').first.inner_html()[:800])
 if not handles.count():raise AssertionError('selected edge has no draggable segments')
 start=handles.first.bounding_box()
 assert start
 x=start['x']+start['width']/2; y=start['y']+start['height']/2
 vertical=start['width']<start['height']; dx=44 if vertical else 0; dy=0 if vertical else 44
 page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+dx,y+dy,steps=7);page.mouse.up()
 msgs=page.evaluate('window.__messages')
 dirty=[a for a in msgs if a.get('type')=='dirty']
 assert dirty, 'edge drag did not change document'
 edited=dirty[-1]['document']
 edited_edges=[(k,v) for k,v in edited['layout']['edges'].items() if v.get('manualPath')]
 assert edited_edges, 'manualPath was not saved'
 points=edited_edges[0][1]['manualPath']
 assert len(points)>=5
 assert all(points[i]['x']==points[i+1]['x'] or points[i]['y']==points[i+1]['y'] for i in range(len(points)-1))
 assert not errors,errors
 print('PASS: selected edge segment draggable, grid-snapped orthogonal manualPath persisted',len(points),'points')
 browser.close()
