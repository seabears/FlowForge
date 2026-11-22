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
 page.locator('[data-action="settings"]').click()
 for theme in ['midnight','light','dark','vscode']:
  page.locator('#settingTheme').select_option(theme)
  res=page.evaluate('''()=>({active:document.documentElement.dataset.theme,message:window.__messages.at(-1),background:getComputedStyle(document.querySelector('#shell')).backgroundColor,node:getComputedStyle(document.querySelector('.blockbox')).fill})''')
  assert res['active']==theme and res['message']['type']=='updateThemeSetting' and res['message']['theme']==theme,res
  if theme=='light':assert res['background']=='rgb(237, 242, 249)' and res['node']=='rgb(255, 255, 255)',res
  if theme=='midnight':assert res['background']=='rgb(13, 20, 33)',res
 # incoming setting updates apply without reloading the diagram
 page.evaluate("window.dispatchEvent(new MessageEvent('message',{data:{type:'themeConfig',theme:'light'}}))")
 assert page.evaluate("document.documentElement.dataset.theme")=='light'
 # Theme must not dirty diagram or change revision
 assert not any(msg['type']=='dirty' for msg in page.evaluate('window.__messages'))
 page.screenshot(path='/mnt/data/FlowForge-v0.6.8-theme-preview.png')
 assert not errors,errors
 print('PASS: all four theme choices, color changes, message persistence, no diagram data mutations')
 browser.close()
