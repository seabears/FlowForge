from pathlib import Path
from playwright.sync_api import sync_playwright
import json
R=Path(__file__).resolve().parent.parent
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1500,'height':900})
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content('<!doctype html><html><head><meta charset="utf-8"><style>'+(R/'media/editor.css').read_text()+'</style></head><body><div id="app"></div></body></html>')
 page.evaluate('window.__messages=[];window.acquireVsCodeApi=()=>({postMessage:m=>window.__messages.push(m)});')
 for f in ['media/model.js','core/features.js','media/editor.js']:
  content=(R/f).read_text()
  if f=='media/editor.js':content=content.replace('})();','window.__testRoutes=()=>doc.edges.map(e=>{const n=node(e.target.nodeId),p=n.ports.find(p=>p.id===e.target.portId),pos=position(n,p),pts=linkPath(e),last=pts[pts.length-1],prev=pts[pts.length-2],side=L(n).portPositions[p.id].side;return {side,pts,perp:side==="top"?prev.x===last.x&&prev.y<last.y:side==="bottom"?prev.x===last.x&&prev.y>last.y:side==="left"?prev.y===last.y&&prev.x<last.x:prev.y===last.y&&prev.x>last.x,center:last.x===pos.x&&last.y===pos.y}});\n})();')
  page.add_script_tag(content=content)
 doc=json.loads((R/'examples/motor-current-v2.flow.json').read_text())
 page.evaluate("d=>window.dispatchEvent(new MessageEvent('message',{data:{type:'load',document:d,filename:'test.flow.json'}}))",doc)
 page.locator('[data-action="settings"]').click()
 assert page.locator('#settingsPage').is_visible()
 assert page.locator('#settingsGeneral').is_visible()
 page.locator('#settingGridMode').select_option('on')
 assert page.evaluate('window.__messages.at(-1).type')=='updateGridSettings'
 page.locator('[data-settings-tab="shortcuts"]').click()
 assert page.locator('#settingsShortcuts').is_visible()
 assert page.locator('#shortcutTable').inner_text().find('잠금 / 잠금 해제')>=0
 page.locator('[data-action="openKeybindings"]').click()
 assert page.evaluate('window.__messages.at(-1).type')=='openKeybindings'
 page.screenshot(path='/mnt/data/FlowForge-v0.6.7-settings-preview.png')
 page.locator('[data-action="closeSettings"]').click()
 assert not page.locator('#settingsPage').is_visible()
 # Every edge endpoint should be approached with a perpendicular segment.
 results=page.evaluate('window.__testRoutes()')
 assert results and all(r['perp'] and r['center'] for r in results),results
 print('tested edges',len(results),'settings displayed','errors',errors)
 assert not errors,errors
 browser.close()
