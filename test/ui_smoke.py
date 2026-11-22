from playwright.sync_api import sync_playwright
from pathlib import Path
import json
R=Path(__file__).parent.parent
html=R/'test'/'smoke.html'
html.write_text(f'''<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="file://{R}/media/editor.css"></head><body><div id="app"></div><script src="file://{R}/media/model.js"></script><script src="file://{R}/media/editor.js"></script></body></html>''')
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--allow-file-access-from-files'])
  page=browser.new_page(viewport={'width':1400,'height':900})
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.add_init_script("window.__messages=[];window.acquireVsCodeApi=()=>({postMessage:m=>window.__messages.push(m)});")
  page.set_content('<!doctype html><html><head><meta charset="utf-8"><style>'+ (R/'media/editor.css').read_text() +'</style></head><body><div id="app"></div></body></html>');page.evaluate("window.__messages=[];window.acquireVsCodeApi=()=>({postMessage:m=>window.__messages.push(m)});");page.add_script_tag(content=(R/'media/model.js').read_text());page.add_script_tag(content=(R/'media/editor.js').read_text())
  print('messages',page.evaluate('window.__messages'))
  doc={'schemaVersion':2,'documentId':'test','revision':0,'name':'Test','variables':[],'nodes':[{'id':'a','type':'start','title':'Start','description':'','expression':'','ports':[{'id':'next','kind':'flow','direction':'output'}]},{'id':'b','type':'process','title':'Process','description':'','expression':'x = 1','ports':[{'id':'in','kind':'flow','direction':'input'},{'id':'next','kind':'flow','direction':'output'}]}], 'edges':[{'id':'e','kind':'flow','source':{'nodeId':'a','portId':'next'},'target':{'nodeId':'b','portId':'in'}}],'layout':{'gridSize':22,'nodes':{'a':{'x':3,'y':3,'w':6,'h':4,'portPositions':{'next':{'side':'bottom','offset':3}}},'b':{'x':3,'y':12,'w':8,'h':4,'portPositions':{'in':{'side':'top','offset':4},'next':{'side':'bottom','offset':4}}}},'edges':{},'groups':[]},'bindings':{},'extensions':{}}
  page.evaluate("d=>window.dispatchEvent(new MessageEvent('message',{data:{type:'load',document:d,history:{past:[],future:[]},filename:'test.flow.json'}}))",doc)
  print('node count',page.locator('.block').count(),'links',page.locator('.link').count())
  page.locator('button[data-action="validate"]').click()
  print('validate request',page.evaluate('window.__messages.slice(-1)'))
  page.locator('button[data-action="simulate"]').click()
  print('sim visible',page.locator('#simPanel').is_visible())
  page.locator('#simPanel [data-sim="close"]').click()
  page.locator('.block[data-id="b"] .block-title').click(position={'x':50,'y':20})
  print('selected',page.locator('.block.selected').count())
  page.keyboard.press('Control+d')
  print('after duplicate nodes',page.locator('.block').count())
  page.screenshot(path='/mnt/data/FlowForge-ui-smoke.png')
  print('JS errors',errors)
  browser.close()
  if errors: raise RuntimeError(str(errors))
finally:
 html.unlink(missing_ok=True)
