from playwright.sync_api import sync_playwright
from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1400,'height':900});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content('<html><head><style>'+ (root/'media/editor.css').read_text()+'</style></head><body><div id="app"></div></body></html>')
 page.evaluate('window.__messages=[];window.acquireVsCodeApi=()=>({postMessage:m=>window.__messages.push(m)});')
 page.add_script_tag(content=(root/'media/model.js').read_text());page.add_script_tag(content=(root/'media/editor.js').read_text())
 d=json.loads((root/'examples/motor-current-v2.flow.json').read_text())
 page.evaluate("d=>window.dispatchEvent(new MessageEvent('message',{data:{type:'load',document:d,history:{past:[],future:[]},filename:'test.flow.json'}}))",d)
 page.locator('#shell').focus()
 assert page.evaluate("window.__messages.some(m=>m.type==='canvasFocus'&&m.focused===true)")
 count=page.locator('.block').count();assert count>0
 page.evaluate("window.dispatchEvent(new MessageEvent('message',{data:{type:'canvasCommand',command:'selectAll'}}))")
 assert page.locator('.block.selected').count()==count
 page.locator('#blockSearch').focus()
 assert page.evaluate("window.__messages.filter(m=>m.type==='canvasFocus').slice(-1)[0].focused") is False
 page.evaluate("window.dispatchEvent(new MessageEvent('message',{data:{type:'canvasCommand',command:'delete'}}))")
 assert page.locator('.block').count()==count
 page.locator('#shell').focus()
 block=page.locator('.block').first
 block.click(button='right',force=True)
 assert page.locator('#nodeContext').is_visible()
 assert page.locator('#nodeContext [data-context-command="openSource"]').count()==1
 assert page.locator('#nodeContext .context-submenu').count()==2
 page.locator('.submenu-trigger').first.click()
 assert page.locator('#nodeContext .context-submenu.expanded').count()==1
 assert page.locator('#nodeContext [data-context-command="validate"]').is_visible()
 # Space should not open quick search or move the canvas.
 page.locator('#shell').focus();page.keyboard.press('Space');assert not page.locator('#quick').is_visible()
 assert not errors,errors
 browser.close()
print('Canvas focus / command guard / context submenu smoke tests passed')
