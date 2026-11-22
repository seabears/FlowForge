from pathlib import Path
from playwright.sync_api import sync_playwright
import json
R=Path(__file__).parent.parent
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1600,'height':960})
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content('<!doctype html><html><head><meta charset="utf-8"><style>'+(R/'media/editor.css').read_text()+'</style></head><body><div id="app"></div></body></html>')
 page.evaluate('window.__messages=[];window.acquireVsCodeApi=()=>({postMessage:m=>window.__messages.push(m)});')
 for filename in ['media/model.js','core/features.js','media/editor.js']:page.add_script_tag(content=(R/filename).read_text())
 doc=json.loads((R/'examples/motor-current-v2.flow.json').read_text())
 page.evaluate("d=>window.dispatchEvent(new MessageEvent('message',{data:{type:'load',document:d,filename:'test.flow.json'}}))",doc)
 page.locator('button[data-action="tests"]').click()
 assert page.locator('#testJSON').is_visible()
 page.locator('#testJSON').fill('[{"name":"check","inputs":{},"expected":{}}]')
 page.locator('[data-feature="saveTests"]').click()
 page.locator('[data-feature="runTests"]').click()
 assert page.locator('#testResults').inner_text().startswith(('PASS','ERROR'))
 page.locator('[data-feature="close"]').click()
 page.locator('.block').first.click()
 assert page.locator('[data-action="toggleCompact"]').count()>=1
 page.locator('[data-action="toggleCompact"]').click()
 assert page.locator('.block').first.get_attribute('class')
 page.locator('button[data-action="optimize"]').click()
 page.screenshot(path='/mnt/data/FlowForge-v0.6.5-preview.png')
 print('UI nodes',page.locator('.block').count(),'errors',errors)
 assert not errors,errors
 browser.close()
