from playwright.sync_api import sync_playwright
from pathlib import Path
import json
R=Path(__file__).parent.parent
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1450,'height':850})
    errors=[]
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.set_content('<html><head><style>'+ (R/'media/editor.css').read_text() + '</style></head><body><div id="app"></div></body></html>')
    page.evaluate('window.__messages=[];window.acquireVsCodeApi=()=>({postMessage:m=>window.__messages.push(m)});')
    page.add_script_tag(content=(R/'media/model.js').read_text())
    page.add_script_tag(content=(R/'media/editor.js').read_text())
    d=json.loads((R/'examples/motor-current-v2.flow.json').read_text())
    page.evaluate("d=>window.dispatchEvent(new MessageEvent('message',{data:{type:'load',document:d,history:{past:[],future:[]},filename:'example.flow.json',gridMode:'auto',gridStyle:'dots'}}))",d)
    def state():return page.evaluate("({show:document.querySelector('#shell').classList.contains('grid-visible'),dots:document.querySelector('#shell').classList.contains('grid-dots'),pan:document.querySelector('#viewport').getAttribute('transform')})")
    assert not state()['show'],state()
    page.locator('[data-grid-mode="on"]').click();assert state()['show']
    page.locator('[data-grid-style="lines"]').click();assert not state()['dots']
    page.locator('[data-grid-mode="off"]').click();assert not state()['show']
    page.locator('[data-grid-mode="auto"]').click();assert not state()['show']
    shell=page.locator('#shell').bounding_box()
    x=shell['x']+shell['width']-160;y=shell['y']+shell['height']-160
    before=state()['pan'];page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+80,y+40,steps=6)
    # auto mode: panning does not show the grid
    assert not state()['show'];page.mouse.up();assert state()['pan']!=before
    before=state()['pan'];page.mouse.wheel(0,120);page.wait_for_timeout(60);assert state()['pan']!=before
    # shift drag remains a marquee, rather than panning
    before=state()['pan'];page.keyboard.down('Shift');page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+40,y+30,steps=4)
    assert page.locator('#selectionRect').evaluate('(e)=>e.style.display')=='block'
    assert state()['pan']==before;page.mouse.up();page.keyboard.up('Shift')
    # verify visible during node drag, and dashed border on selection
    page.locator('[data-grid-mode="on"]').click();page.locator('[data-action="fit"]').click()
    block=page.locator('.block[data-id]').first
    bb=block.locator('.blockbox').bounding_box();px=bb['x']+bb['width']*.48;py=bb['y']+bb['height']*.48
    page.mouse.click(px,py)
    assert page.locator('.block.selected .blockbox').count()>=1
    assert page.locator('.block.selected .blockbox').first.evaluate('(e)=>getComputedStyle(e).strokeDasharray')!='none'
    page.locator('[data-grid-mode="auto"]').click()
    bb=page.locator('.block.selected .blockbox').first.bounding_box();px=bb['x']+bb['width']*.45;py=bb['y']+bb['height']*.40
    page.mouse.move(px,py);page.mouse.down();page.mouse.move(px+45,py+22,steps=3)
    assert state()['show'],state();page.mouse.up();assert not state()['show']
    assert not errors,errors
    print('PASS: settings UI, auto/on/off, dots/lines, left-pan, wheel, Shift-marquee, dashed editable block, auto grid while dragging')
    browser.close()
