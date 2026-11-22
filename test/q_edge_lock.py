from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parent.parent
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':850})
    errors=[]
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.set_content('<!doctype html><html><head><meta charset="utf-8"><style>'+ (root/'media/editor.css').read_text() +'</style></head><body><div id="app"></div></body></html>')
    page.evaluate('window.__messages=[];window.acquireVsCodeApi=()=>({postMessage:m=>window.__messages.push(m)})')
    for rel in ['media/model.js','core/features.js','media/editor.js']:
        page.add_script_tag(content=(root/rel).read_text())
    doc=json.loads((root/'examples/motor-current-v2.flow.json').read_text())
    page.evaluate("d=>window.dispatchEvent(new MessageEvent('message',{data:{type:'load',document:d,filename:'q-test.flow.json',theme:'dark'}}))", doc)
    # Select edge through its SVG group, then invoke the exact VSCode command message used by the extension.
    edge=page.locator('.link').first
    edge.locator('path').nth(1).dispatch_event('pointerdown', {'button':0,'pointerId':1,'clientX':300,'clientY':250})
    page.locator('#canvas').dispatch_event('pointerup', {'button':0,'pointerId':1,'clientX':300,'clientY':250})
    page.evaluate("window.dispatchEvent(new MessageEvent('message',{data:{type:'canvasCommand',command:'toggleLock'}}))")
    state=page.evaluate("()=>({selected:document.querySelector('.link.selected')?.getAttribute('class'),dash:document.querySelector('.link.selected path')?.getAttribute('stroke-dasharray'),dirty:window.__messages.filter(x=>x.type==='dirty').at(-1)?.document})")
    assert 'locked' in state['selected'], state
    assert state['dash']=='none', state
    assert state['dirty']['edges'][0]['locked'] is True, state
    page.evaluate("window.dispatchEvent(new MessageEvent('message',{data:{type:'canvasCommand',command:'toggleLock'}}))")
    state=page.evaluate("()=>({selected:document.querySelector('.link.selected')?.getAttribute('class'),dash:document.querySelector('.link.selected path')?.getAttribute('stroke-dasharray'),dirty:window.__messages.filter(x=>x.type==='dirty').at(-1)?.document})")
    assert 'editable' in state['selected'] and state['dash']=='6 4', state
    assert state['dirty']['edges'][0]['locked'] is False, state
    assert not errors, errors
    print('PASS: Q command toggles selected edge lock/unlock; solid/dashed style and document state update')
    browser.close()
