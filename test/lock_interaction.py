from playwright.sync_api import sync_playwright
from pathlib import Path
import json
R=Path(__file__).resolve().parent.parent
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1450,'height':900})
    errors=[]
    page.on('pageerror',lambda err:errors.append(str(err)))
    page.set_content('<html><head><style>'+ (R/'media/editor.css').read_text() + '</style></head><body><div id="app"></div></body></html>')
    page.evaluate('window.__messages=[];window.acquireVsCodeApi=()=>({postMessage:m=>window.__messages.push(m)});')
    page.add_script_tag(content=(R/'media/model.js').read_text())
    page.add_script_tag(content=(R/'media/editor.js').read_text())
    d=json.loads((R/'examples/motor-current-v2.flow.json').read_text())
    page.evaluate("d=>window.dispatchEvent(new MessageEvent('message',{data:{type:'load',document:d,history:{past:[],future:[]},filename:'lock.flow.json'}}))",d)
    page.locator('[data-action="fit"]').click()
    first=page.locator('.block[data-id]').first
    id=first.get_attribute('data-id')
    def current():
        return page.evaluate("id=>window.__messages.filter(m=>m.type==='dirty').at(-1)?.document?.nodes.find(n=>n.id===id)",id)
    # right-click -> lock; persisted in serialized dirty document
    first.click(button='right')
    assert page.get_by_role('menuitem',name='선택 블록 잠금').is_visible()
    page.get_by_role('menuitem',name='선택 블록 잠금').click()
    assert current()['locked'] is True
    assert page.locator(f'.block[data-id="{id}"]').get_attribute('class').find('locked')>=0
    rect=page.locator(f'.block[data-id="{id}"] .blockbox')
    assert rect.get_attribute('stroke-dasharray')=='none'
    assert page.locator(f'.block[data-id="{id}"] .resize').count()==0
    before=rect.bounding_box();page.mouse.move(before['x']+20,before['y']+20);page.mouse.down();page.mouse.move(before['x']+70,before['y']+60,steps=4);page.mouse.up()
    after=page.locator(f'.block[data-id="{id}"] .blockbox').bounding_box()
    assert abs(before['x']-after['x'])<1 and abs(before['y']-after['y'])<1
    page.keyboard.press('Delete')
    assert page.locator(f'.block[data-id="{id}"]').count()==1
    assert page.locator('#inspector [data-field="title"]').count()==0
    # Locked block can still use its ports for connections.
    assert page.locator(f'.block[data-id="{id}"] [data-port]').count()>0
    page.locator(f'.block[data-id="{id}"]').click(button='right')
    page.get_by_role('menuitem',name='선택 블록 잠금 해제').click()
    assert current()['locked'] is False
    assert page.locator(f'.block[data-id="{id}"] .blockbox').get_attribute('stroke-dasharray')!='none'
    assert page.locator(f'.block[data-id="{id}"] .resize').count()==1
    # multi selection lock via Ctrl+click, one transaction
    blocks=page.locator('.block[data-id]')
    ids=[blocks.nth(0).get_attribute('data-id'),blocks.nth(1).get_attribute('data-id')]
    blocks.nth(0).click()
    blocks.nth(1).click(modifiers=['Control'])
    assert page.locator('.block.selected').count()==2
    page.locator('.block.selected').first.click(button='right')
    page.get_by_role('menuitem',name='선택 블록 잠금').click()
    result=page.evaluate("ids=>{const d=window.__messages.filter(m=>m.type==='dirty').at(-1).document;return ids.map(id=>d.nodes.find(n=>n.id===id).locked)}",ids)
    assert result==[True,True],result
    assert not errors,errors
    print('PASS lock/unlock, persistence, movement, resizing, deletion, editor read-only, dashed vs solid, port existence, batch lock')
    browser.close()
