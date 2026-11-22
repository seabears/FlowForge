(()=>{'use strict';
const api=acquireVsCodeApi(),M=window.FlowModel,F=window.FlowFeatures,G=22,$=q=>document.querySelector(q),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let subflows={},sourceStates={},doc=M.empty(),selected=new Set(),selectedEdge=null,selectedEdges=new Set(),zoom=1,pan={x:140,y:65},drag=null,ready=false,past=[],future=[],base=null,saved=true,filename='',conflict=null,issues=[],simulation=null,simState=null,clipboard=null,hotEdge=null,editField=null,guideLines=[],gridMode='auto',gridStyle='dots',theme='dark',gridCustom=false,paletteDragging=false;
const node=id=>doc.nodes.find(n=>n.id===id),L=n=>doc.layout.nodes[n.id],cl=M.clone,pt=(x,y)=>({x:Math.round(x),y:Math.round(y)}),send=(type,fields={})=>api.postMessage({type,...fields});
const styles={start:'#79c7ac',end:'#df929f',process:'#84adf6',condition:'#83c7ac',io:'#bd9df3',function:'#a8b6f7',loop:'#e4bd84',subflow:'#93b2ef',conversion:'#b7a0ef'};
const titles={start:'시작',end:'종료',process:'처리',condition:'조건',io:'입출력',function:'함수 호출',loop:'반복',subflow:'하위 차트',conversion:'자료형 변환'};
$('#app').innerHTML=`<div class="root"><header><b class="brand">◇ FlowForge</b><span id="filename" class="muted"></span><div class="spacer"></div><button type="button" data-action="settings" title="FlowForge 설정">⚙ 설정</button><button id="leftToggle" title="라이브러리 열기/닫기">▤</button><button id="rightToggle" title="속성 열기/닫기">☷</button><button data-action="undo">↶</button><button data-action="redo">↷</button><button data-action="fit">맞춤</button><button data-action="validate">검증</button><button data-action="simulate">시뮬레이션</button><button data-action="tests">테스트</button><button data-action="compare">비교</button><button data-action="optimize">경로 최적화</button><button data-action="text">JSON</button><button class="primary" data-action="save">저장</button></header><div class="work"><aside id="library"><div class="side-panel-heading"><h3>BLOCK LIBRARY</h3><button class="side-collapse" type="button" data-panel-toggle="library" aria-label="블록 라이브러리 접기" title="왼쪽으로 접기">‹</button></div><input id="blockSearch" placeholder="블록 검색..."/><div id="palette"></div><div class="hint">블록을 드래그하거나 캔버스를 더블클릭해 추가하세요.<br>단축키 설명과 변경: 상단 ⚙ 설정 → 단축키</div></aside><button id="libraryRail" class="panel-rail left" type="button" data-panel-toggle="library" aria-label="블록 라이브러리 펼치기" title="블록 라이브러리 펼치기">›</button><main id="shell" tabindex="0"><svg id="canvas"><g id="viewport"><g id="groups"></g><g id="links"></g><g id="blocks"></g><g id="guides"></g><g id="optimizationPreview"></g><path id="preview" stroke="#a2c4fa" stroke-dasharray="6 5" stroke-width="2" fill="none"/></g><rect id="selectionRect" fill="#5c9dfc22" stroke="#8ab9ff" stroke-dasharray="5 5" style="display:none"/></svg><div class="floating"><button data-action="zoomout">−</button><span id="zoomLabel">100%</span><button data-action="zoomin">+</button></div><div id="nodeContext" class="node-context hidden" role="menu" aria-label="블록 작업 메뉴"></div><div id="quick" class="popup hidden"><input id="quickSearch" placeholder="블록 종류 검색"/><div id="quickResults"></div></div><div id="diffPanel" class="popup hidden"></div><div id="featurePanel" class="popup hidden"></div><div id="simPanel" class="popup hidden"></div><div id="toast" class="toast hidden"></div></main><button id="propsRail" class="panel-rail right" type="button" data-panel-toggle="props" aria-label="속성 패널 펼치기" title="속성 패널 펼치기">‹</button><aside id="props"><div class="side-panel-heading"><h3>PROPERTIES</h3><button class="side-collapse" type="button" data-panel-toggle="props" aria-label="속성 패널 접기" title="오른쪽으로 접기">›</button></div><div id="inspector"></div></aside></div><section id="settingsPage" class="settings-page hidden" aria-label="FlowForge 설정"><div class="settings-wrap"><div class="settings-heading"><div><div class="settings-kicker">FLOWFORGE</div><h1>설정</h1><p class="muted">편집기 환경과 키보드 조작을 관리합니다.</p></div><button type="button" data-action="closeSettings" aria-label="설정 닫기">✕ 닫기</button></div><nav class="settings-nav" aria-label="설정 항목"><button data-settings-tab="general" class="active">일반 설정</button><button data-settings-tab="shortcuts">단축키</button></nav><div id="settingsGeneral" class="settings-section"><h2>화면 테마</h2><div class="settings-field"><label for="settingTheme">테마 선택</label><p>FlowForge의 배경, 패널, 블록 및 글자 색상을 변경합니다. 변경 즉시 적용되며 VSCode 사용자 설정으로 저장됩니다.</p><select id="settingTheme"><option value="dark">다크 — 기본</option><option value="midnight">미드나이트 — 더 어둡게</option><option value="light">라이트 — 밝게</option><option value="vscode">VSCode 테마 따르기</option></select><div class="theme-previews" aria-hidden="true"><div class="theme-swatch swatch-dark"><b>Dark</b><span>◆ Flow</span></div><div class="theme-swatch swatch-midnight"><b>Midnight</b><span>◆ Flow</span></div><div class="theme-swatch swatch-light"><b>Light</b><span>◆ Flow</span></div></div></div><h2>캔버스 및 격자</h2><div class="settings-field"><label for="settingGridMode">격자 표시</label><p>격자 표시는 배경에만 적용됩니다. 22px 위치 스냅은 항상 유지됩니다.</p><select id="settingGridMode"><option value="auto">자동 — 이동·연결 중에만 표시</option><option value="on">항상 표시</option><option value="off">숨기기</option></select></div><div class="settings-field"><label for="settingGridStyle">격자 형태</label><p>점 격자 또는 선 격자를 선택합니다.</p><select id="settingGridStyle"><option value="dots">점</option><option value="lines">선</option></select></div><p class="settings-note">설정값은 VSCode의 FlowForge 사용자 설정에 저장됩니다. 블록·연결선 데이터는 변경하지 않습니다.</p><button type="button" data-action="openVSCodeSettings">VSCode 전체 FlowForge 설정 열기</button></div><div id="settingsShortcuts" class="settings-section hidden"><h2>단축키</h2><p class="muted">캔버스에 포커스가 있을 때만 실행되며, 텍스트 입력 중에는 동작하지 않습니다. Space에는 기능이 없습니다.</p><div id="shortcutTable"></div><button type="button" data-action="openKeybindings">VSCode에서 단축키 변경 / 해제</button><p class="settings-note">실제 단축키는 VSCode 키보드 단축키 설정을 따릅니다. 변경한 단축키는 VSCode에서 확인하세요.</p></div></div></section><footer><span id="status">준비 중</span><span id="count"></span><span id="gridStatus">GRID 자동 · 점 · 22px</span></footer></div>`;
function notice(msg){const t=$('#toast');t.textContent=msg;t.classList.remove('hidden');clearTimeout(notice.timer);notice.timer=setTimeout(()=>t.classList.add('hidden'),3500)}
let saveLater=null;function changed(){clearTimeout(saveLater);saveLater=setTimeout(()=>{if(!conflict&&!saved)save()},2400);saved=false;doc.revision=(doc.revision||0)+1;$('#status').textContent='● 미저장';send('dirty',{dirty:true,document:doc,history:{past:past.slice(-90),future:future.slice(-90)}})}
function transaction(fn){past.push(cl(doc));if(past.length>90)past.shift();future=[];fn();changed();render()}
function undo(){if(!past.length)return;future.push(cl(doc));doc=past.pop();changed();render()}
function redo(){if(!future.length)return;past.push(cl(doc));doc=future.pop();changed();render()}
function save(){send('save',{document:doc,history:{past,future}})}
function add(type,x,y){let added;transaction(()=>{added=M.addNode(doc,type,x,y);if(overlap(added.id,L(added))){doc.nodes.pop();delete doc.layout.nodes[added.id];added=null;return}selected=new Set([added.id]);selectedEdge=null});if(added&&type==='subflow')notice('속성에서 하위 차트를 생성하거나 연결하세요.');return added}
function isLocked(id){return node(id)?.locked===true}
function hasLocked(ids){return [...ids].some(isLocked)}
function edgeLocked(id){return doc.edges.find(e=>e.id===id)?.locked===true}
function toggleEdgeLock(id){const e=doc.edges.find(e=>e.id===id);if(!e)return;transaction(()=>{e.locked=!e.locked});notice(e.locked?'연결선 잠금 · 실선':'연결선 잠금 해제 · 점선')}
function toggleLock(ids){const targets=[...ids].filter(id=>node(id));if(!targets.length)return;const lock=targets.some(id=>!isLocked(id));transaction(()=>{for(const id of targets)node(id).locked=lock});notice(lock?`${targets.length}개 블록 잠금`:`${targets.length}개 블록 잠금 해제`)}
function overlap(id,rect,ids=[id]){return doc.nodes.some(n=>!ids.includes(n.id)&&(()=>{const o=L(n);return rect.x<o.x+o.w&&rect.x+rect.w>o.x&&rect.y<o.y+o.h&&rect.y+rect.h>o.y})())}
function world(e){const r=$('#shell').getBoundingClientRect();return {x:(e.clientX-r.left-pan.x)/zoom/G,y:(e.clientY-r.top-pan.y)/zoom/G}}
function screen(w){return {x:w.x*G*zoom+pan.x,y:w.y*G*zoom+pan.y}}
const shortcutRows=[['Q','선택한 블록 / 연결선 잠금·해제','toggleLock'],['Ctrl+Z','실행 취소','undo'],['Ctrl+Y','다시 실행','redo'],['Ctrl+A','전체 블록 선택','selectAll'],['Ctrl+C','블록 복사','copy'],['Ctrl+V','블록 붙여넣기','paste'],['Ctrl+D','블록 복제','duplicate'],['Ctrl+G','블록 그룹 만들기','group'],['Ctrl+Shift+G','그룹 해제','ungroup'],['Delete','선택 블록 삭제','delete'],['Ctrl+S','다이어그램 저장','save'],['F','화면에 전체 맞춤','fit'],['Esc','팝업 닫기 / 선택 해제','escape']];
function showSettings(tab='general'){const page=$('#settingsPage');page.classList.remove('hidden');setSettingsTab(tab);$('#settingsGeneral').querySelector('#settingGridMode').value=gridMode;$('#settingGridStyle').value=gridStyle;$('#settingTheme').value=theme;closeNodeContext();$('#quick').classList.add('hidden');page.querySelector('button').focus();syncCanvasFocus()}
function setSettingsTab(tab){document.querySelectorAll('[data-settings-tab]').forEach(b=>b.classList.toggle('active',b.dataset.settingsTab===tab));$('#settingsGeneral').classList.toggle('hidden',tab!=='general');$('#settingsShortcuts').classList.toggle('hidden',tab!=='shortcuts')}
function closeSettings(){const page=$('#settingsPage');page.classList.add('hidden');$('#shell').focus();syncCanvasFocus()}
$('#shortcutTable').innerHTML=shortcutRows.map(([key,description,command])=>`<div class="shortcut-row"><span>${esc(description)}</span><kbd>${esc(key)}</kbd></div>`).join('');
document.querySelectorAll('[data-settings-tab]').forEach(b=>b.addEventListener('click',()=>setSettingsTab(b.dataset.settingsTab)));
function applyTheme(value){theme=['dark','midnight','light','vscode'].includes(value)?value:'dark';document.documentElement.dataset.theme=theme;document.documentElement.dataset.vscodeLight=String(document.body.classList.contains('vscode-light')||document.body.classList.contains('vscode-high-contrast-light'));const picker=$('#settingTheme');if(picker)picker.value=theme;render()}
$('#settingTheme').addEventListener('change',e=>{applyTheme(e.target.value);send('updateThemeSetting',{theme});});
$('#settingGridMode').addEventListener('change',e=>{gridMode=e.target.value;gridCustom=false;updateGrid();send('updateGridSettings',{mode:gridMode,style:gridStyle})});
$('#settingGridStyle').addEventListener('change',e=>{gridStyle=e.target.value;gridCustom=false;updateGrid();send('updateGridSettings',{mode:gridMode,style:gridStyle})});
function position(n,p){const l=L(n),spec=l.portPositions?.[p.id];if(!spec)return {x:l.x+l.w/2,y:l.y+l.h};return {x:l.x+(spec.side==='left'?0:spec.side==='right'?l.w:spec.offset),y:l.y+(spec.side==='top'?0:spec.side==='bottom'?l.h:spec.offset)}}
function blocked(cell,a,b){return doc.nodes.some(n=>!collapsedGroup(n.id)&&(()=>{const l=L(n);return cell.x>=l.x&&cell.x<=l.x+l.w&&cell.y>=l.y&&cell.y<=l.y+l.h})())}
// A route must meet its port perpendicularly. Its first/last unit is reserved
// for a visible centered connector, never for traversing the node outline.
function portNormal(n,p){const spec=L(n)?.portPositions?.[p.id],side=spec?.side||'bottom';return side==='top'?{x:0,y:-1}:side==='bottom'?{x:0,y:1}:side==='left'?{x:-1,y:0}:{x:1,y:0}}
function offsetPoint(p,n,steps=1){return {x:p.x+n.x*steps,y:p.y+n.y*steps}}
function routeEndpointStops(a,b,e){const src=node(e.source.nodeId),dst=node(e.target.nodeId),pa=src?.ports.find(p=>p.id===e.source.portId),pb=dst?.ports.find(p=>p.id===e.target.portId);const sa=src&&pa&&!collapsedGroup(src.id)?offsetPoint(a,portNormal(src,pa)):a,sb=dst&&pb&&!collapsedGroup(dst.id)?offsetPoint(b,portNormal(dst,pb)):b;return {sa,sb}}

function manualPathIsUsable(points){
 if(!Array.isArray(points)||points.length<4||points.some(p=>!Number.isInteger(p.x)||!Number.isInteger(p.y)))return false;
 const pts=normalizeOrthogonal(points);if(pts.length<4)return false;
 // Reject diagonals, zero-length segments, immediate reversals and self-crossing
 // paths. A corrupt manual route must never be rendered as if it were valid.
 const dirs=[];
 for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1];if(a.x!==b.x&&a.y!==b.y)return false;if(a.x===b.x&&a.y===b.y)return false;dirs.push({x:Math.sign(b.x-a.x),y:Math.sign(b.y-a.y)});}
 for(let i=1;i<dirs.length;i++)if(dirs[i].x===-dirs[i-1].x&&dirs[i].y===-dirs[i-1].y)return false;
 for(let i=0;i<pts.length-1;i++)for(let j=i+2;j<pts.length-1;j++){
  const a=pts[i],b=pts[i+1],c=pts[j],d=pts[j+1];
  const h1=a.y===b.y,v2=c.x===d.x,h2=c.y===d.y,v1=a.x===b.x;
  if(h1&&v2&&Math.min(a.x,b.x)<c.x&&c.x<Math.max(a.x,b.x)&&Math.min(c.y,d.y)<a.y&&a.y<Math.max(c.y,d.y))return false;
  if(v1&&h2&&Math.min(a.y,b.y)<c.y&&c.y<Math.max(a.y,b.y)&&Math.min(c.x,d.x)<a.x&&a.x<Math.max(c.x,d.x))return false;
 }
 return true;
}
function route(a,b,e){
 const custom=doc.layout.edges?.[e.id]?.manualPath;
 if(manualPathIsUsable(custom)){
  const pts=cl(custom),{sa,sb}=routeEndpointStops(a,b,e);
  // Stored manual paths include endpoint + reserved port stubs. Keep only
  // interior bends and rebuild both stubs from the current port geometry.
  const middle=pts.slice(2,-2),out=[a,sa];
  const append=(p)=>{const prev=out.at(-1);if(prev.x!==p.x&&prev.y!==p.y)out.push({x:p.x,y:prev.y});if(prev.x!==p.x||prev.y!==p.y)out.push(p)};
  for(const p of middle)append(p);
  append(sb);if(out.at(-1).x!==b.x||out.at(-1).y!==b.y)out.push(b);
  const normalized=normalizeOrthogonal(out);
  if(validOrthogonalPath(normalized))return normalized;
 }
 const wp=doc.layout.edges?.[e.id]?.waypoints||[],{sa,sb}=routeEndpointStops(a,b,e),stops=[sa,...wp,sb],result=[];
 for(let j=0;j<stops.length-1;j++){const from=stops[j],to=stops[j+1],leg=routeLeg(from,to,e.source.nodeId,e.target.nodeId);result.push(...(j?leg.slice(1):leg))}
 // The visible endpoint always touches the exact center of its port.
 return [a,...result,b].filter((p,i,arr)=>i===0||p.x!==arr[i-1].x||p.y!==arr[i-1].y)}
function routeLeg(a,b,from,to){const key=(x,y)=>x+','+y,dirs=[[0,1],[1,0],[0,-1],[-1,0]],open=[{x:a.x,y:a.y,d:-1,c:0}],score=new Map([[`${a.x},${a.y},-1`,0]]),parent=new Map(),h=(x,y)=>Math.abs(x-b.x)+Math.abs(y-b.y);let found=null,limit=0;
 const pack=n=>`${n.x},${n.y},${n.d}`;while(open.length&&limit++<4500){open.sort((u,v)=>(u.c+h(u.x,u.y))-(v.c+h(v.x,v.y)));const cur=open.shift(),ck=pack(cur);if(cur.c!==score.get(ck))continue;if(cur.x===b.x&&cur.y===b.y){found=ck;break}for(let d=0;d<4;d++){const nx=cur.x+dirs[d][0],ny=cur.y+dirs[d][1];if(Math.abs(nx-a.x)>110||Math.abs(ny-a.y)>110)continue;if(blocked({x:nx,y:ny},from,to)&&!(nx===b.x&&ny===b.y))continue;const cost=cur.c+1+(cur.d!==-1&&cur.d!==d?.45:0),nk=`${nx},${ny},${d}`;if(cost>=(score.get(nk)??Infinity))continue;score.set(nk,cost);parent.set(nk,ck);open.push({x:nx,y:ny,d,c:cost})}}
 if(!found)return [a,{x:a.x,y:b.y},b];const out=[];while(found){const [x,y]=found.split(',').map(Number);out.push({x,y});found=parent.get(found)}return out.reverse().filter((p,i,arr)=>i===0||i===arr.length-1||!(arr[i-1].x===p.x&&p.x===arr[i+1].x||arr[i-1].y===p.y&&p.y===arr[i+1].y))}
function groupBounds(group){const members=group.nodeIds.map(id=>doc.layout.nodes[id]).filter(Boolean);if(!members.length)return null;const minX=Math.min(...members.map(p=>p.x)),minY=Math.min(...members.map(p=>p.y)),maxX=Math.max(...members.map(p=>p.x+p.w)),maxY=Math.max(...members.map(p=>p.y+p.h));return group.collapsed?{x:minX-1,y:minY-1,w:10,h:4}:{x:minX-1,y:minY-2,w:maxX-minX+2,h:maxY-minY+3}}
function collapsedGroup(nodeId){return doc.layout.groups.find(g=>g.collapsed&&g.nodeIds.includes(nodeId))}
function groupShapes(){return doc.layout.groups.map(g=>{const l=groupBounds(g);if(!l)return '';const x=l.x*G,y=l.y*G,w=l.w*G,h=l.h*G;return `<g data-group-id="${esc(g.id)}" class="group ${g.collapsed?'collapsed':''}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" fill="${g.collapsed?'#2e425b':'#5386c211'}" stroke="#6c94c8" stroke-dasharray="${g.collapsed?'none':'6 5'}"/><rect x="${x}" y="${y}" width="${Math.min(w,160)}" height="${G}" fill="#314864" rx="4"/><text x="${x+8}" y="${y+15}" font-size="11" fill="#dbe9fa">${g.collapsed?'▸':'▾'} ${esc(g.name)} (${g.nodeIds.length})</text></g>`}).join('')}
function groupAnchor(group,other){const l=groupBounds(group),o=L(other);if(!l||!o)return {x:0,y:0};const centerX=l.x+Math.round(l.w/2),centerY=l.y+Math.round(l.h/2);const ox=o.x+o.w/2,oy=o.y+o.h/2;if(Math.abs(ox-centerX)>Math.abs(oy-centerY))return {x:ox>centerX?l.x+l.w:l.x,y:centerY};return {x:centerX,y:oy>centerY?l.y+l.h:l.y}}
function linkPath(e){const a=node(e.source.nodeId),b=node(e.target.nodeId);if(!a||!b)return [];const ga=collapsedGroup(a.id),gb=collapsedGroup(b.id);if(ga&&gb&&ga.id===gb.id)return [];const pa=a.ports.find(p=>p.id===e.source.portId),pb=b.ports.find(p=>p.id===e.target.portId);if(!pa||!pb)return [];const start=ga?groupAnchor(ga,b):position(a,pa),end=gb?groupAnchor(gb,a):position(b,pb);return route(start,end,e)}
function pathD(points){return points.map((p,i)=>`${i?'L':'M'}${p.x*G} ${p.y*G}`).join(' ')}
function editableSegments(points,e){
 const {sa,sb}=routeEndpointStops(points[0],points.at(-1),e);
 return points.slice(0,-1).map((p,i)=>({p,q:points[i+1],i})).filter(({p,q,i})=>i>0&&i<points.length-2&&(p.x===q.x||p.y===q.y)&&Math.abs(p.x-q.x)+Math.abs(p.y-q.y)>=1&&!(p.x===sa.x&&p.y===sa.y&&q.x===sb.x&&q.y===sb.y));
}
function normalizeOrthogonal(points){
 const out=[];
 for(const p of points){const point={x:Math.round(p.x),y:Math.round(p.y)};if(!out.length||out.at(-1).x!==point.x||out.at(-1).y!==point.y)out.push(point)}
 for(let i=1;i<out.length-1;){const a=out[i-1],b=out[i],c=out[i+1];if((a.x===b.x&&b.x===c.x)||(a.y===b.y&&b.y===c.y)){out.splice(i,1)}else i++}
 return out;
}
function validOrthogonalPath(points){
 if(points.length<2||points.some(p=>!Number.isInteger(p.x)||!Number.isInteger(p.y)))return false;
 for(let i=0;i<points.length-1;i++){
  const a=points[i],b=points[i+1];if(a.x!==b.x&&a.y!==b.y)return false;
  for(const n of doc.nodes){if(collapsedGroup(n.id))continue;const l=L(n);
   if(a.x===b.x&&a.x>l.x&&a.x<l.x+l.w&&Math.max(a.y,b.y)>l.y&&Math.min(a.y,b.y)<l.y+l.h)return false;
   if(a.y===b.y&&a.y>l.y&&a.y<l.y+l.h&&Math.max(a.x,b.x)>l.x&&Math.min(a.x,b.x)<l.x+l.w)return false;
  }
 }
 return true;
}
function moveSegmentPath(original,index,coord){
 // The first and last segments are fixed port stubs. Every segment between
 // them can be translated perpendicular to its direction.
 if(index<1||index>=original.length-2)return null;
 const p=original[index],q=original[index+1],horizontal=p.y===q.y,vertical=p.x===q.x;
 if(!horizontal&&!vertical)return null;
 const current=horizontal?p.y:p.x;
 if(current===coord)return null;
 const candidate=cl(original);
 candidate[index]=horizontal?{x:p.x,y:coord}:{x:coord,y:p.y};
 candidate[index+1]=horizontal?{x:q.x,y:coord}:{x:coord,y:q.y};
 const normalized=normalizeOrthogonal(candidate);
 if(normalized.length<4||!manualPathIsUsable(normalized)||!validOrthogonalPath(normalized))return null;
 return normalized;
}
function shape(n){const l=L(n),x=l.x*G,y=l.y*G,w=l.w*G,h=l.h*G,c=styles[n.type]||'#8da3bd',sel=selected.has(n.id),invalid=issues.some(i=>i.severity==='error'&&i.nodeId===n.id),active=simState?.nodeId===n.id;const color=invalid?'#ed7e84':active?'#7bd2b0':sel?'#8cbdff':c;
 const ports=(n.ports||[]).map(p=>{const pos=position(n,p),kindColor=p.kind==='data'?'#c5a5f5':p.direction==='input'?'var(--port-input)':'#88b9fa';return `<circle class="port-hit" cx="${pos.x*G}" cy="${pos.y*G}" r="13" data-node="${esc(n.id)}" data-port="${esc(p.id)}" fill="transparent" pointer-events="all"/><circle class="port ${p.direction} ${p.kind}" cx="${pos.x*G}" cy="${pos.y*G}" r="6" data-node="${esc(n.id)}" data-port="${esc(p.id)}" fill="${kindColor}" stroke="${c}" stroke-width="2"><title>${esc(p.id)} · ${esc(p.kind)} · ${esc(p.direction)}</title></circle>`}).join('');
 const expression=(n.expression||'').replace(/\s+/g,' ').slice(0,33);const icon=n.type==='condition'?'◇':n.type==='loop'?'↻':n.type==='subflow'?'↳':n.type==='function'?'ƒ':n.type==='start'?'▶':n.type==='end'?'■':'▤';
 return `<g class="block ${sel?'selected':''} ${n.locked?'locked':''}" data-id="${esc(n.id)}"><rect class="block-hitbox" x="${x}" y="${y}" width="${w}" height="${h}" fill="transparent"/><rect class="blockbox" x="${x}" y="${y}" width="${w}" height="${n.compact?G*1.55:h}" rx="7" fill="var(--node-bg)" stroke="${n.locked&&!invalid&&!active?'#7e8b9d':color}" stroke-dasharray="${n.locked?'none':'5 4'}" stroke-width="${sel||invalid||active?2.4:1.3}"/>${n.compact?'':`<line x1="${x}" x2="${x+w}" y1="${y+G*1.5}" y2="${y+G*1.5}" stroke="var(--node-line)"/>`}<text x="${x+12}" y="${y+G}" fill="${c}" font-size="12">${icon}</text><text class="block-title" x="${x+29}" y="${y+G}" font-size="12" fill="var(--node-title)" font-weight="600">${esc(n.title.slice(0,23))}</text>${n.compact?'':`<text x="${x+w/2}" y="${y+G*2.8}" font-size="11" text-anchor="middle" fill="var(--node-description)">${esc(expression||n.description?.slice(0,29)||'')}</text>`}${sourceStates[n.id]&&sourceStates[n.id]!=='linked'?`<text x="${x+w-13}" y="${y+G}" fill="${sourceStates[n.id]==='missing'?'#ed7e84':'#e7b878'}" font-size="13">⚠</text>`:''}${ports}${n.locked?'':`<rect class="resize" data-resize="${esc(n.id)}" x="${x+w-9}" y="${y+h-9}" width="12" height="12" rx="2" fill="#92bfff"/>`}<title>${esc(n.id)}</title></g>`}
function edgesHtml(){return doc.edges.map(e=>{const points=linkPath(e);if(!points.length)return '';const d=pathD(points),middle=points[Math.floor(points.length/2)],sel=selectedEdge===e.id||selectedEdges.has(e.id),locked=e.locked===true;return `<g class="link ${locked?'locked':'editable'} ${sel?'selected':''}" data-edge="${esc(e.id)}"><path d="${d}" fill="none" stroke="${e.kind==='data'?'#ba9df2':sel?'#b7d3ff':'#83a5d4'}" stroke-width="2" stroke-dasharray="${locked?'none':'6 4'}"/><path d="${d}" fill="none" stroke="transparent" stroke-width="15" pointer-events="stroke"/><circle class="add-edge" data-edgeadd="${esc(e.id)}" cx="${middle.x*G}" cy="${middle.y*G}" r="10" fill="#4184cf"/><text class="add-edge" data-edgeadd="${esc(e.id)}" x="${middle.x*G}" y="${middle.y*G+4}" text-anchor="middle" font-size="14" fill="white">+</text>${e.label?`<text class="edge-label" x="${middle.x*G}" y="${middle.y*G-13}" text-anchor="middle" fill="var(--edge-label)" stroke="var(--edge-outline)" stroke-width="4" paint-order="stroke" font-size="11">${esc(e.label)}</text>`:''}${sel&&!locked?editableSegments(points,e).map(({p,q,i})=>`<line class="segment-drag-handle" data-segment="${esc(e.id)}:${i}" x1="${p.x*G}" y1="${p.y*G}" x2="${q.x*G}" y2="${q.y*G}" stroke="transparent" stroke-width="15" pointer-events="stroke" style="cursor:${p.y===q.y?'ns-resize':'ew-resize'}"/>`).join(''):''}${sel&&!locked?(doc.layout.edges?.[e.id]?.waypoints||[]).map((p,i)=>`<rect data-waypoint="${e.id}:${i}" x="${p.x*G-6}" y="${p.y*G-6}" width="12" height="12" rx="2" fill="#bce0ff"/>`).join(''):''}</g>`}).join('')}
function isGridVisible(){return gridMode==='on'||(gridMode==='auto'&&(paletteDragging||!!drag&&['move','connect','resize','waypoint','segment'].includes(drag.type)))}
function updateGrid(){const shell=$('#shell');if(!shell)return;const visible=isGridVisible();shell.classList.toggle('grid-visible',visible);shell.classList.toggle('grid-lines',gridStyle==='lines');shell.classList.toggle('grid-dots',gridStyle==='dots');document.querySelectorAll('[data-grid-mode]').forEach(b=>{const active=b.dataset.gridMode===gridMode;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});document.querySelectorAll('[data-grid-style]').forEach(b=>{const active=b.dataset.gridStyle===gridStyle;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});$('#gridStatus').textContent=`GRID ${gridMode==='auto'?'자동':gridMode==='on'?'ON':'OFF'} · ${gridStyle==='dots'?'점':'선'} · 22px`;}
function render(){if(!ready)return;const shell=$('#shell');shell.style.backgroundSize=`${G*zoom}px ${G*zoom}px`;shell.style.backgroundPosition=`${pan.x}px ${pan.y}px`;updateGrid();$('#viewport').setAttribute('transform',`translate(${pan.x} ${pan.y}) scale(${zoom})`);$('#groups').innerHTML=groupShapes();$('#links').innerHTML=edgesHtml();$('#guides').innerHTML=guideLines.map(g=>`<line x1="${g.x1*G}" y1="${g.y1*G}" x2="${g.x2*G}" y2="${g.y2*G}" stroke="#f5ba67" stroke-width="1" stroke-dasharray="4 3" pointer-events="none"/>`).join('');$('#blocks').innerHTML=doc.nodes.filter(n=>!collapsedGroup(n.id)).map(shape).join('');$('#filename').textContent=filename;$('#zoomLabel').textContent=Math.round(zoom*100)+'%';$('#count').textContent=`${doc.nodes.length} nodes · ${doc.edges.length} edges · ${selected.size} selected`;inspector()}
function inspector(){const el=$('#inspector'),n=selected.size===1?node([...selected][0]):null,e=selectedEdge?doc.edges.find(x=>x.id===selectedEdge):null;if(!n&&!e){if(selected.size>1||selectedEdges.size>1){const ids=[...selected],locked=ids.filter(isLocked).length;el.innerHTML=`<p>${ids.length}개 블록 · 연결선 ${selectedEdges.size}개 선택 · 잠금 블록 ${locked}개</p><button data-action="bulkEdit" ${locked?'disabled':''}>일괄 속성 수정</button><button data-action="toggleCompact">접기 / 펼치기</button><button data-action="lockSelection">${locked===ids.length?'선택 블록 잠금 해제':'선택 블록 모두 잠금'}</button>`;return}el.innerHTML=`<p class="muted">블록을 선택하면 상세 속성이 표시됩니다.</p><label>문서 이름</label><input data-doc="name" value="${esc(doc.name)}"/>${groupsHtml()}`;return}
 if(e){const locked=e.locked===true;el.innerHTML=`<p>연결 <code>${esc(e.id)}</code></p><button data-action="toggleEdgeLock">${locked?'연결선 잠금 해제 (실선)':'연결선 잠금 (점선)'}</button><p class="tiny muted">${locked?'잠금: 경로·라벨·삭제 불가':'편집 가능: 구간 드래그로 경로 수정'}</p><label>종류</label><div>${esc(e.kind)}</div><button data-action="waypoint" ${locked?'disabled':''}>중간 경유점 추가</button><label>연결선 라벨</label><input data-edge-label="${esc(e.id)}" value="${esc(e.label||'')}" placeholder="True / False / Error" ${locked?'disabled':''}/><button data-action="delete" ${locked?'disabled':''}>연결 삭제</button>`;return}
 const l=L(n),binding=doc.bindings[n.id],source=binding?.file||'',group=doc.layout.groups.find(g=>g.nodeIds.includes(n.id));const lockButton=`<button data-action="toggleCompact">${n.compact?'블록 펼치기':'블록 접기'}</button><button data-action="lockSelection">${n.locked?'잠금 해제':'블록 잠금'}</button>`;if(n.locked){el.innerHTML=`<div class="tag">${esc(titles[n.type]||n.type)} · 잠금</div><p class="muted">내용 편집·이동·크기 변경·삭제가 제한됩니다. 연결선 편집은 가능합니다.</p>${lockButton}<label>제목</label><div>${esc(n.title)}</div><label>실행 표현식</label><div class="tiny">${esc(n.expression||'')}</div><label>소스 연결</label><div class="tiny">${esc(source||'연결 없음')}</div><button data-action="openSource" ${source?'':'disabled'}>코드로 이동</button><div class="tiny muted">ID: ${esc(n.id)}</div>`;return}el.innerHTML=`${lockButton}<div class="tag">${esc(titles[n.type]||n.type)}</div><label>제목</label><input data-field="title" value="${esc(n.title)}"/><label>설명</label><textarea data-field="description">${esc(n.description||'')}</textarea><label>실행 표현식</label><textarea data-field="expression">${esc(n.expression||'')}</textarea><label>크기 (격자 칸)</label><div class="sizeRow"><input type="number" data-size="w" min="4" value="${l.w}"/><input type="number" data-size="h" min="3" value="${l.h}"/></div><label>Data 포트</label><div>${(n.ports||[]).filter(p=>p.kind==='data').map(p=>`<div class="tiny">${esc(p.direction)} ${esc(p.id)}: ${esc(p.dataType)}</div>`).join('')||'<small>없음</small>'}</div><button data-action="addData">Data 포트 추가</button>${n.type==='subflow'?`<label>하위 차트 (.flow.json)</label><input data-field="subflow" value="${esc(n.subflow||'')}"/><button data-action="createSubflow">새 하위 차트 생성</button><button data-action="openSubflow">하위 차트 열기</button>`:''}<label>소스코드 연결</label><div class="tiny">${esc(source||'연결 없음')} ${esc(sourceStates[n.id]&&sourceStates[n.id]!=='linked'?' · '+(sourceStates[n.id]==='missing'?'연결 끊김':'변경 감지'):'')}</div><button data-action="linkSource">현재 소스 선택 연결</button><button data-action="breakpoint">${n.breakpoint?'중단점 해제':'중단점 설정'}</button><button data-action="openSource" ${source?'':'disabled'}>옆 편집기에서 열기</button>${group?`<div class="tiny">그룹: ${esc(group.name)}</div>`:''}<button class="danger" data-action="delete">블록 삭제</button><div class="tiny muted">ID: ${esc(n.id)}</div>`}
function groupsHtml(){return `<label>그룹</label>${doc.layout.groups.map(g=>`<div class="groupRow"><span>${esc(g.name)} (${g.nodeIds.length})</span><button data-group="${esc(g.id)}">${g.collapsed?'펼치기':'접기'}</button></div>`).join('')}`}
function populatePalette(){const term=$('#blockSearch').value.toLowerCase();$('#palette').innerHTML=Object.keys(M.TYPES).filter(t=>t.includes(term)||(titles[t]||'').includes(term)).map(t=>`<button draggable="true" data-tool="${t}" class="tool"><span style="color:${styles[t]}">◆</span>${titles[t]}</button>`).join('')}
function quick(at,edge=null){hotEdge=edge;const pop=$('#quick');pop.classList.remove('hidden');pop.style.left=Math.min($('#shell').clientWidth-210,Math.max(5,at.x))+'px';pop.style.top=Math.min($('#shell').clientHeight-250,Math.max(5,at.y))+'px';$('#quickSearch').value='';fillQuick();$('#quickSearch').focus();quick.at=at}
function fillQuick(){const filter=$('#quickSearch').value.toLowerCase();$('#quickResults').innerHTML=Object.keys(M.TYPES).filter(t=>t.includes(filter)||titles[t].includes(filter)).map(t=>`<button data-quick="${t}">${titles[t]}</button>`).join('')}
function insertEdge(type){const e=doc.edges.find(x=>x.id===hotEdge);if(!e)return;const before=node(e.source.nodeId),after=node(e.target.nodeId),l1=L(before),l2=L(after),x=Math.round((l1.x+l2.x)/2),y=Math.round((l1.y+l2.y)/2);const n=add(type,x,y);if(!n)return notice('블록 삽입 위치가 충돌합니다. 빈 공간을 확보해 주세요.');transaction(()=>{doc.edges=doc.edges.filter(x=>x.id!==e.id);delete doc.layout.edges[e.id];const output=n.ports.find(p=>p.kind==='flow'&&p.direction==='output');const input=n.ports.find(p=>p.kind==='flow'&&p.direction==='input');if(output&&input)doc.edges.push({id:M.uid('e'),kind:'flow',source:e.source,target:{nodeId:n.id,portId:input.id}},{id:M.uid('e'),kind:'flow',source:{nodeId:n.id,portId:output.id},target:e.target});});if(type==='condition'||type==='loop')notice('삽입된 분기 블록의 나머지 출력을 연결하세요.')}
function copy(){const ids=[...selected],nodes=doc.nodes.filter(n=>ids.includes(n.id));clipboard={nodes:cl(nodes),layout:cl(Object.fromEntries(nodes.map(n=>[n.id,L(n)]))),edges:cl(doc.edges.filter(e=>ids.includes(e.source.nodeId)&&ids.includes(e.target.nodeId)))};notice(`${nodes.length}개 블록 복사`)}
function paste(){if(!clipboard)return;transaction(()=>{const map={},copies=cl(clipboard.nodes);for(const n of copies){const original=n.id;n.id=M.uid('n');n.locked=false;map[original]=n.id;const l=cl(clipboard.layout[original]);l.x+=2;l.y+=2;let tries=0;while(overlap(n.id,l)&&tries++<40){l.x+=2;l.y+=2}doc.layout.nodes[n.id]=l;doc.nodes.push(n)}for(const e of clipboard.edges){e.id=M.uid('e');e.source.nodeId=map[e.source.nodeId];e.target.nodeId=map[e.target.nodeId];doc.edges.push(e)}selected=new Set(copies.map(n=>n.id));selectedEdge=null})}
function group(){if(selected.size<2)return notice('두 블록 이상 선택하세요');transaction(()=>doc.layout.groups.push({id:M.uid('g'),name:'새 그룹',nodeIds:[...selected],collapsed:false}))}
function erase(){if(!selected.size&&!selectedEdge)return;if(selectedEdge&&edgeLocked(selectedEdge)){notice('잠긴 연결선은 삭제할 수 없습니다.');return}if(doc.edges.some(e=>e.locked&&(selected.has(e.source.nodeId)||selected.has(e.target.nodeId)))){notice('잠긴 연결선이 연결된 블록은 삭제할 수 없습니다. 연결선 잠금을 먼저 해제하세요.');return}if(hasLocked(selected)){notice('잠긴 블록이 포함되어 삭제할 수 없습니다. 먼저 잠금을 해제하세요.');return}transaction(()=>{const ids=selected;doc.nodes=doc.nodes.filter(n=>!ids.has(n.id));doc.edges=doc.edges.filter(e=>!ids.has(e.source.nodeId)&&!ids.has(e.target.nodeId)&&e.id!==selectedEdge);for(const id of ids)delete doc.layout.nodes[id];for(const g of doc.layout.groups)g.nodeIds=g.nodeIds.filter(id=>!ids.has(id));selected.clear();selectedEdge=null})}
function fit(){if(!doc.nodes.length)return;const l=doc.nodes.map(L),minX=Math.min(...l.map(x=>x.x)),minY=Math.min(...l.map(x=>x.y)),maxX=Math.max(...l.map(x=>x.x+x.w)),maxY=Math.max(...l.map(x=>x.y+x.h)),s=$('#shell');zoom=Math.max(.25,Math.min(1.6,Math.min((s.clientWidth-100)/((maxX-minX)*G),(s.clientHeight-100)/((maxY-minY)*G))));pan={x:(s.clientWidth-(minX+maxX)*G*zoom)/2,y:(s.clientHeight-(minY+maxY)*G*zoom)/2};render()}
function zoomAt(f,e){const r=$('#shell').getBoundingClientRect(),sx=e?.clientX-r.left||r.width/2,sy=e?.clientY-r.top||r.height/2,n=Math.max(.25,Math.min(2.5,zoom*f));pan={x:sx-(sx-pan.x)*n/zoom,y:sy-(sy-pan.y)*n/zoom};zoom=n;render()}
function setPanel(which){
 const el=$(which), rail=$(which==='#library'?'#libraryRail':'#propsRail');
 const closed=el.classList.toggle('closed');
 el.classList.toggle('opened',!closed);
 rail.classList.toggle('visible',closed);
 const topButton=$(which==='#library'?'#leftToggle':'#rightToggle');
 topButton.setAttribute('aria-expanded',String(!closed));
 topButton.setAttribute('title',which==='#library'?(closed?'블록 라이브러리 펼치기':'블록 라이브러리 접기'):(closed?'속성 패널 펼치기':'속성 패널 접기'));
 send('updatePanelSettings',{panel:which==='#library'?'library':'props',closed});
}
function initializePanels(){
 for(const id of ['library','props']){
  let closed=false;try{const key='flowforge.panel.'+id,legacy=localStorage.getItem(key);if(legacy!==null){closed=legacy==='closed';send('updatePanelSettings',{panel:id,closed});localStorage.removeItem(key)}}catch{}
  if(closed){const el=$('#'+id);el.classList.add('closed');$('#'+id+'Rail').classList.add('visible')}
  $('#'+(id==='library'?'leftToggle':'rightToggle')).setAttribute('aria-expanded',String(!closed));
 }
}
function action(a){const single=selected.size===1?node([...selected][0]):null;if(a==='undo')undo();if(a==='redo')redo();if(a==='fit')fit();if(a==='save')save();if(a==='settings')showSettings();if(a==='closeSettings')closeSettings();if(a==='openVSCodeSettings')send('openVSCodeSettings');if(a==='openKeybindings')send('openKeybindings');if(a==='text')send('showText');if(a==='validate')send('validate',{document:doc});if(a==='simulate'){try{simulation=M.simulator(doc,{subflows});simState=null;simUI()}catch(e){notice(e.message)}}if(a==='zoomout')zoomAt(.85);if(a==='zoomin')zoomAt(1.15);if(a==='delete')erase();if(a==='toggleEdgeLock'&&selectedEdge)toggleEdgeLock(selectedEdge);if(a==='lockSelection')toggleLock(selected);if(a==='toggleCompact'&&selected.size)transaction(()=>{const target=[...selected].some(id=>!node(id)?.compact);for(const id of selected)node(id).compact=target});if(a==='bulkEdit')bulkEdit();if(a==='tests')openTests();if(a==='compare')send('comparePick');if(a==='optimize')manualOptimize();if(a==='addData'&&single&&!single.locked){const pName=prompt('포트 이름 (고유)', 'value'),direction=prompt('input 또는 output','input'),dataType=prompt('bool / i32 / u32 / f32 / f64 / string','f32');if(pName&&['input','output'].includes(direction)&&['bool','i32','u32','f32','f64','string'].includes(dataType)&&!single.ports.some(p=>p.id===pName))transaction(()=>{single.ports.push({id:pName,kind:'data',direction,dataType});L(single).portPositions=M.portPositions(single.ports,L(single).w,L(single).h)})}if(a==='waypoint'&&selectedEdge&&!edgeLocked(selectedEdge)){const e=doc.edges.find(x=>x.id===selectedEdge),p=linkPath(e)[Math.floor(linkPath(e).length/2)];if(p)transaction(()=>{doc.layout.edges[e.id]??={routingMode:'hybrid',waypoints:[]};doc.layout.edges[e.id].waypoints.push(p)})}if(a==='breakpoint'&&single&&!single.locked)transaction(()=>single.breakpoint=!single.breakpoint);if(a==='linkSource'&&single&&!single.locked)send('linkSource',{nodeId:single.id});if(a==='openSource'&&single)send('openSource',{binding:doc.bindings[single.id]});if(a==='openSubflow'&&single)send('openSubflow',{file:single.subflow});if(a==='createSubflow'&&single&&!single.locked){const file=prompt('새 하위 차트 파일명','subflow.flow.json');if(file)send('createSubflow',{nodeId:single.id,file})}}
function bulkEdit(){
 if(selected.size<2)return notice('둘 이상의 블록을 선택하세요.');
 if(hasLocked(selected))return notice('잠긴 블록이 포함되어 전체 변경을 취소했습니다.');
 const targets=[...selected].map(node);const fields=['title','description','expression'];
 const input=prompt('일괄 변경할 속성: title / description / expression', 'description');
 if(input===null)return;if(!fields.includes(input))return notice('지원하지 않는 속성입니다.');
 const values=targets.map(n=>n[input]||'');const initial=values.every(x=>x===values[0])?values[0]:'';
 const value=prompt(values.every(x=>x===values[0])?'공통 값 수정':'Mixed (다른 값) · 새 값을 입력하면 모두 변경',initial);
 if(value===null)return;
 transaction(()=>{for(const n of targets)n[input]=value});notice(targets.length+'개 블록의 '+input+' 속성을 변경했습니다.');
}
function featurePanel(title,body){const p=$('#featurePanel');p.classList.remove('hidden');p.innerHTML=`<div class="panelhead"><b>${esc(title)}</b><button data-feature="close">×</button></div>${body}`;return p;}
function tests(){return doc.extensions?.flowforgeTests||[];}
function openTests(){
 const p=featurePanel('로직 테스트 케이스',`<p class="tiny">문서에 저장되는 테스트 목록입니다. 자동 실행하지 않습니다.</p><textarea id="testJSON" style="height:180px">${esc(JSON.stringify(tests(),null,2))}</textarea><div class="buttonRow"><button data-feature="saveTests">테스트 저장</button><button data-feature="runTests">테스트 실행</button></div><pre id="testResults">입력 형식: [{"name":"case","inputs":{"x":3},"expected":{"y":4},"maxSteps":100}]</pre>`);
}
function parseTests(){const cases=JSON.parse($('#testJSON').value);if(!Array.isArray(cases)||cases.some(c=>!c||typeof c!=='object'||!c.name||!c.inputs||!c.expected))throw Error('name, inputs, expected를 가진 배열이 필요합니다.');return cases;}
function showCompare(message){
 const result=F.compare(message.left,message.right);
 const rows=result.map(x=>`<div class="diffRow">${x.status==='added'?'+':x.status==='removed'?'-':'~'} ${esc(x.kind)} · ${esc(x.id)} (${esc(x.status)})</div>`).join('');
 featurePanel('로직 비교 · 읽기 전용',`<p class="tiny">${esc(message.source)} · 변경 ${result.length}건</p>${rows||'<p>차이가 없습니다.</p>'}`);
}
function segmentCross(a,b,c,d){
 const horizontal=(p,q)=>p.y===q.y,vertical=(p,q)=>p.x===q.x;
 if(horizontal(a,b)&&vertical(c,d))return c.x>Math.min(a.x,b.x)&&c.x<Math.max(a.x,b.x)&&a.y>Math.min(c.y,d.y)&&a.y<Math.max(c.y,d.y);
 if(vertical(a,b)&&horizontal(c,d))return a.x>Math.min(c.x,d.x)&&a.x<Math.max(c.x,d.x)&&c.y>Math.min(a.y,b.y)&&c.y<Math.max(a.y,b.y);
 return false;
}
function crosses(pathA,pathB){let sum=0;for(let i=1;i<pathA.length;i++)for(let j=1;j<pathB.length;j++)if(segmentCross(pathA[i-1],pathA[i],pathB[j-1],pathB[j]))sum++;return sum}
function manualOptimize(){
 const paths=new Map(doc.edges.map(e=>[e.id,linkPath(e)]));const proposals=[];
 for(const edge of doc.edges){
  const layout=doc.layout.edges?.[edge.id];if(edge.locked||layout?.waypoints?.length||layout?.manualPath?.length||layout?.routingMode==='manual')continue;
  const original=paths.get(edge.id);if(original.length<2)continue;
  const baseline=doc.edges.filter(e=>e.id!==edge.id).reduce((sum,e)=>sum+crosses(original,paths.get(e.id)),0);
  let best=null,bestCost=baseline;
  const a=original[0],b=original[original.length-1];
  for(const offset of [-8,-5,-3,3,5,8])for(const axis of ['x','y']){
   const midpoint={x:Math.round((a.x+b.x)/2),y:Math.round((a.y+b.y)/2)};midpoint[axis]+=offset;
   if(blocked(midpoint,edge.source.nodeId,edge.target.nodeId))continue;
   doc.layout.edges.__proposal={waypoints:[midpoint]};
   const candidate=route(a,b,{...edge,id:'__proposal'});
   delete doc.layout.edges.__proposal;
   const collisions=doc.edges.filter(e=>e.id!==edge.id).reduce((sum,e)=>sum+crosses(candidate,paths.get(e.id)),0);
   if(collisions<bestCost){bestCost=collisions;best={edgeId:edge.id,waypoints:[midpoint],before:baseline,after:collisions,beforePath:original,afterPath:candidate};}
  }
  if(best){proposals.push(best);paths.set(edge.id,best.afterPath);}
 }
 if(!proposals.length)return notice('교차를 줄이는 변경안을 찾지 못했습니다. 기존 경로를 유지합니다.');
 $('#optimizationPreview').innerHTML=proposals.map(p=>`<path d="${pathD(p.beforePath)}" fill="none" stroke="#ee7777" stroke-width="3" stroke-dasharray="6 5" opacity=".65"/><path d="${pathD(p.afterPath)}" fill="none" stroke="#80dbb1" stroke-width="3" stroke-dasharray="5 4" opacity=".9"/>`).join('');
 featurePanel('연결선 최적화 · 승인 필요',`<p>총 ${proposals.length}개 연결선 경로 변경을 제안합니다.</p><p class="tiny">캔버스 미리보기: 빨간 점선 = 기존, 초록 점선 = 변경안</p><p class="tiny">수동 경유점·잠금 블록·블록 위치는 변경하지 않습니다. 승인 전에는 적용되지 않습니다.</p>${proposals.map(p=>`<div class="diffRow">${esc(p.edgeId)} · 교차 ${p.before} → ${p.after}</div>`).join('')}<div class="buttonRow"><button data-feature="cancelOptimize">취소</button><button class="primary" data-feature="applyOptimize">미리보기 확인 및 적용</button></div>`);
 manualOptimize.proposals=proposals;
}
$('#featurePanel').addEventListener('click',event=>{
 const command=event.target.dataset.feature;if(!command)return;
 if(command==='close'||command==='cancelOptimize'){$('#optimizationPreview').innerHTML='';$('#featurePanel').classList.add('hidden');return;}
 try{
  if(command==='saveTests'){const cases=parseTests();transaction(()=>{doc.extensions??={};doc.extensions.flowforgeTests=cases});notice(cases.length+'개 테스트 케이스 저장');}
  if(command==='runTests'){const cases=parseTests();const results=F.executeTests(doc,cases,M,subflows);$('#testResults').textContent=results.map(r=>`${r.status} ${r.name}${r.reason?' · '+r.reason:''}`).join('\n')||'테스트가 없습니다.';}
  if(command==='applyOptimize'){const proposals=manualOptimize.proposals||[];transaction(()=>{for(const candidate of proposals){doc.layout.edges[candidate.edgeId]??={};doc.layout.edges[candidate.edgeId].waypoints=cl(candidate.waypoints);doc.layout.edges[candidate.edgeId].routingMode='hybrid';}});$('#optimizationPreview').innerHTML='';$('#featurePanel').classList.add('hidden');notice('연결선 최적화 적용 · Undo로 복원 가능');}
 }catch(e){notice(e.message||String(e));}
});
function simUI(){const panel=$('#simPanel');panel.classList.remove('hidden');const state=simulation?.getState()||{},show=simState||state;panel.innerHTML=`<div class="panelhead"><b>Logic Simulator</b><button data-sim="close">×</button></div><div class="tiny">다음 노드: ${esc(show.current||'완료')}</div><div class="tiny">Trace: ${esc((show.trace||[]).join(' → '))}</div><pre>${esc(JSON.stringify(show.vars||{},null,2))}</pre><div class="buttonRow"><button data-sim="back">◀</button><button data-sim="step">Step Into ▶</button><button data-sim="over">Step Over</button><button data-sim="run">Run ▶▶</button></div>`;render()}
function closeNodeContext(){const menu=$('#nodeContext');menu.classList.add('hidden');menu.replaceChildren()}
function showNodeContext(event,id){
 const n=node(id);if(!n)return;
 if(!selected.has(id))selected=new Set([id]);selectedEdge=null;render();
 const binding=doc.bindings?.[id],menu=$('#nodeContext');
 menu.innerHTML=`<div class="node-context-title">${esc(n.title)}${selected.size>1?' 외 '+(selected.size-1)+'개':''}</div>
 <button type="button" role="menuitem" data-context-command="openSource" ${selected.size===1&&binding?.file?'':'disabled title="연결된 소스코드가 없습니다"'}>↗ 코드로 이동</button>
 <button type="button" role="menuitem" data-context-command="copy">복사</button>
 <button type="button" role="menuitem" data-context-command="duplicate">복제</button>
 <button type="button" role="menuitem" data-context-command="lockSelection">${[...selected].every(isLocked)?'선택 블록 잠금 해제':'선택 블록 잠금'}</button>
 <button type="button" role="menuitem" data-context-command="delete">삭제</button>
 <div class="context-divider"></div>
 <div class="context-submenu"><button type="button" class="submenu-trigger" aria-haspopup="true" aria-expanded="false">분석 <span>▸</span></button><div class="submenu-content" role="menu"><button role="menuitem" data-context-command="validate">로직 검증</button><button role="menuitem" data-context-command="simulate">시뮬레이션</button><button role="menuitem" data-context-command="tests">로직 테스트</button><button role="menuitem" data-context-command="compare">로직 비교</button></div></div>
 <div class="context-submenu"><button type="button" class="submenu-trigger" aria-haspopup="true" aria-expanded="false">고급 기능 <span>▸</span></button><div class="submenu-content" role="menu"><button role="menuitem" data-context-command="linkSource" ${selected.size===1&&!n.locked?'':'disabled'}>소스코드 연결</button><button role="menuitem" data-context-command="addData" ${selected.size===1&&!n.locked?'':'disabled'}>Data 포트 추가</button><button role="menuitem" data-context-command="toggleCompact">블록 접기/펼치기</button><button role="menuitem" data-context-command="bulkEdit" ${selected.size>1&&!hasLocked(selected)?'':'disabled'}>일괄 속성 수정</button><button role="menuitem" data-context-command="optimize">연결선 최적화</button><button role="menuitem" data-context-command="breakpoint" ${selected.size===1&&!n.locked?'':'disabled'}>중단점 전환</button><button role="menuitem" data-context-command="createSubflow" ${selected.size===1&&n.type==='subflow'&&!n.locked?'':'disabled'}>하위 차트 생성</button></div></div>`;
 menu.classList.remove('hidden');
 const rect=$('#shell').getBoundingClientRect();
 menu.style.left=`${Math.max(8,Math.min(event.clientX-rect.left,rect.width-menu.offsetWidth-8))}px`;
 menu.style.top=`${Math.max(8,Math.min(event.clientY-rect.top,rect.height-menu.offsetHeight-8))}px`;
}
function showEdgeContext(event,id){
 const edge=doc.edges.find(e=>e.id===id);if(!edge)return;
 selectedEdge=id;selected.clear();render();const menu=$('#nodeContext');
 menu.innerHTML=`<div class="node-context-title">연결선 ${esc(edge.label||id)}</div><button type="button" role="menuitem" data-context-command="toggleEdgeLock">${edge.locked?'연결선 잠금 해제':'연결선 잠금'}</button><button type="button" role="menuitem" data-context-command="waypoint" ${edge.locked?'disabled':''}>경유점 추가</button><button type="button" role="menuitem" data-context-command="delete" ${edge.locked?'disabled':''}>삭제</button>`;
 menu.classList.remove('hidden');const rect=$('#shell').getBoundingClientRect();menu.style.left=`${Math.max(8,Math.min(event.clientX-rect.left,rect.width-menu.offsetWidth-8))}px`;menu.style.top=`${Math.max(8,Math.min(event.clientY-rect.top,rect.height-menu.offsetHeight-8))}px`;
}
let suppressRightContextMenu=false,rightClickBlock=null,rightClickEdge=null;
$('#canvas').addEventListener('contextmenu',event=>{event.preventDefault();if(suppressRightContextMenu)return;const block=event.target.closest('.block[data-id]');const blockId=block?.dataset.id||rightClickBlock,edgeId=event.target.closest('[data-edge]')?.dataset.edge||rightClickEdge;rightClickBlock=null;rightClickEdge=null;if(!blockId){if(edgeId)showEdgeContext(event,edgeId);else closeNodeContext();return}showNodeContext(event,blockId)});
$('#nodeContext').addEventListener('click',event=>{const trigger=event.target.closest('.submenu-trigger');if(trigger){const parent=trigger.closest('.context-submenu'),open=!parent.classList.contains('expanded');$('#nodeContext').querySelectorAll('.context-submenu').forEach(x=>{x.classList.remove('expanded');x.querySelector('.submenu-trigger').setAttribute('aria-expanded','false')});parent.classList.toggle('expanded',open);trigger.setAttribute('aria-expanded',String(open));return}const btn=event.target.closest('[data-context-command]');if(!btn||btn.disabled)return;const actionName=btn.dataset.contextCommand;closeNodeContext();if(actionName==='copy')copy();else if(actionName==='duplicate'){copy();paste()}else action(actionName)});
document.addEventListener('pointerdown',event=>{if(!event.target.closest('#nodeContext'))closeNodeContext()});
function connectionFailureReason(sourceNodeId,sourcePortId,targetNodeId,targetPortId){
 const sn=node(sourceNodeId),tn=node(targetNodeId);
 const sp=sn?.ports.find(p=>p.id===sourcePortId),tp=tn?.ports.find(p=>p.id===targetPortId);
 if(!sp)return '시작 포트를 찾을 수 없습니다. 블록의 출력 포트를 다시 선택하세요.';
 if(!tp)return '대상 포트를 찾을 수 없습니다. 표시된 포트 위에 놓아주세요.';
 if(sourceNodeId===targetNodeId)return '같은 블록의 포트끼리는 직접 연결할 수 없습니다.';
 if(sp.direction!=='output'&&tp.direction!=='input')return '입력 포트끼리는 연결할 수 없습니다. 출력 포트에서 입력 포트로 연결하세요.';
 if(sp.direction!=='output')return '연결 시작점은 출력 포트여야 합니다. 출력 포트에서 드래그하세요.';
 if(tp.direction!=='input')return '연결 대상은 입력 포트여야 합니다. 입력 포트 위에서 놓으세요.';
 if(sp.kind!==tp.kind)return '포트 종류가 다릅니다. Flow 포트끼리 또는 Data 포트끼리 연결하세요.';
 if(sp.kind==='data'&&sp.dataType!==tp.dataType)return `자료형이 일치하지 않습니다 (${sp.dataType||'미지정'} → ${tp.dataType||'미지정'}). 자료형 변환 블록을 사용하세요.`;
 if(doc.edges.some(e=>e.source.nodeId===sourceNodeId&&e.source.portId===sourcePortId&&e.target.nodeId===targetNodeId&&e.target.portId===targetPortId))return '이미 연결된 포트입니다.';
 return '';
}
function canConnectPorts(sourceNodeId,sourcePortId,targetNodeId,targetPortId){
 return connectionFailureReason(sourceNodeId,sourcePortId,targetNodeId,targetPortId)==='';
}
function updateConnectionTargets(clientX,clientY){
 const actual=document.elementFromPoint(clientX,clientY),target=actual?.closest('[data-port]'),canvas=$('#canvas');
 canvas.querySelectorAll('.port').forEach(p=>{p.classList.remove('valid-target','invalid-target');p.removeAttribute('data-connect-reason')});
 if(!target||!drag||drag.type!=='connect')return;
 const reason=connectionFailureReason(drag.from,drag.port,target.dataset.node,target.dataset.port),ok=!reason;
 const targetCircle=canvas.querySelector(`.port[data-node="${CSS.escape(target.dataset.node)}"][data-port="${CSS.escape(target.dataset.port)}"]`);
 targetCircle?.classList.add(ok?'valid-target':'invalid-target');
 if(reason)targetCircle?.setAttribute('data-connect-reason',reason);
 if(reason&&drag.lastDiagnosticTarget!==`${target.dataset.node}:${target.dataset.port}:${reason}`){
  drag.lastDiagnosticTarget=`${target.dataset.node}:${target.dataset.port}:${reason}`;
  notice(reason);
 }
}
function nodeHit(e){return e.target.closest('[data-id]')?.dataset.id}
$('#canvas').addEventListener('pointerdown',e=>{if(e.button!==0&&e.button!==1&&e.button!==2)return; if(e.button===2){suppressRightContextMenu=false;rightClickBlock=e.target.closest('.block[data-id]')?.dataset.id||null;rightClickEdge=e.target.closest('[data-edge]')?.dataset.edge||null;closeNodeContext();drag={type:'box',button:2,sx:e.clientX,sy:e.clientY,moved:false};$('#shell').focus();$('#canvas').setPointerCapture(e.pointerId);e.preventDefault();return}const w=world(e),id=nodeHit(e),port=e.target.closest('[data-port]'),resize=e.target.closest('[data-resize]'),edge=e.target.closest('[data-edge]'),groupEl=e.target.closest('[data-group-id]'),waypoint=e.target.closest('[data-waypoint]'),segment=e.target.closest('[data-segment]');$('#shell').focus();if(segment){const [eid,index]=segment.dataset.segment.split(':');if(edgeLocked(eid)){selectedEdge=eid;drag=null;render();return}const edgeObj=doc.edges.find(v=>v.id===eid);drag={type:'segment',eid,index:Number(index),original:cl(linkPath(edgeObj)),before:cl(doc),valid:false};selectedEdge=eid;selected.clear();render()}else if(port){const sourceNode=node(port.dataset.node),sourcePort=sourceNode?.ports.find(p=>p.id===port.dataset.port);if(sourcePort?.direction!=='output'){notice('출력 포트에서 드래그를 시작하세요.');return}drag={type:'connect',from:port.dataset.node,port:port.dataset.port,start:w};$('#canvas').classList.add('connection-mode');render();e.stopPropagation()}else if(waypoint){const [eid,index]=waypoint.dataset.waypoint.split(':');if(edgeLocked(eid)){drag=null;return}drag={type:'waypoint',eid,index:Number(index),before:cl(doc)}}else if(resize){const n=node(resize.dataset.resize);if(n.locked){notice('잠긴 블록은 크기를 바꿀 수 없습니다.');return}selected=new Set([n.id]);drag={type:'resize',id:n.id,start:w,origin:cl(L(n)),before:cl(doc)}}else if(groupEl){const group=doc.layout.groups.find(g=>g.id===groupEl.dataset.groupId);selected=new Set(group.nodeIds);selectedEdge=null;if(hasLocked(selected)){drag=null;notice('잠긴 블록이 포함되어 이동할 수 없습니다.');render();return}drag={type:'move',start:w,origins:Object.fromEntries([...selected].map(id=>[id,cl(L(node(id)))])),before:cl(doc)};render()}else if(id){if(!(e.ctrlKey||e.metaKey))selectedEdges.clear();if(e.ctrlKey||e.metaKey){if(selected.has(id))selected.delete(id);else selected.add(id)}else if(!selected.has(id))selected=new Set([id]);selectedEdge=null;if(hasLocked(selected)){drag=null;notice('잠긴 블록이 포함되어 이동할 수 없습니다.');render();return}drag={type:'move',start:w,origins:Object.fromEntries([...selected].map(id=>[id,cl(L(node(id)))])),before:cl(doc)};render()}else if(edge){selectedEdge=edge.dataset.edge;selectedEdges=new Set([selectedEdge]);selected.clear();render()}else if(e.button===0){drag={type:'pan',button:0,x:e.clientX,y:e.clientY,initial:{...pan}};render()}else{drag={type:'pan',x:e.clientX,y:e.clientY,initial:{...pan}};render()}if(drag){$('#canvas').setPointerCapture(e.pointerId);updateGrid();e.preventDefault()}});
$('#canvas').addEventListener('pointermove',e=>{if(!drag)return;const w=world(e);if(drag.type==='pan'){pan={x:drag.initial.x+e.clientX-drag.x,y:drag.initial.y+e.clientY-drag.y};render()}if(drag.type==='box'){if(drag.button===2){drag.moved=drag.moved||Math.hypot(e.clientX-drag.sx,e.clientY-drag.sy)>5;if(!drag.moved)return;suppressRightContextMenu=true;rightClickBlock=null;rightClickEdge=null}const r=$('#shell').getBoundingClientRect(),sx=drag.sx-r.left,sy=drag.sy-r.top,x=e.clientX-r.left,y=e.clientY-r.top,el=$('#selectionRect');el.setAttribute('x',Math.min(sx,x));el.setAttribute('y',Math.min(sy,y));el.setAttribute('width',Math.abs(x-sx));el.setAttribute('height',Math.abs(y-sy));el.style.display='block'}if(drag.type==='connect'){$('#preview').setAttribute('d',`M ${Math.round(drag.start.x)*G} ${Math.round(drag.start.y)*G} H ${Math.round(w.x)*G} V ${Math.round(w.y)*G}`);updateConnectionTargets(e.clientX,e.clientY)}if(drag.type==='move'){if(hasLocked(selected)){drag.valid=false;return}const dx=Math.round(w.x-drag.start.x),dy=Math.round(w.y-drag.start.y),rects=[...selected].map(id=>({id,rect:{...drag.origins[id],x:drag.origins[id].x+dx,y:drag.origins[id].y+dy}}));const bad=rects.some(item=>overlap(item.id,item.rect,[...selected]));if(!bad){guideLines=[];if(rects.length===1){const r=rects[0].rect;for(const n of doc.nodes){if(selected.has(n.id))continue;const q=L(n);for(const y of [r.y,r.y+r.h/2,r.y+r.h])if([q.y,q.y+q.h/2,q.y+q.h].includes(y))guideLines.push({x1:Math.min(r.x,q.x)-2,y1:y,x2:Math.max(r.x+r.w,q.x+q.w)+2,y2:y});for(const x of [r.x,r.x+r.w/2,r.x+r.w])if([q.x,q.x+q.w/2,q.x+q.w].includes(x))guideLines.push({x1:x,y1:Math.min(r.y,q.y)-2,x2:x,y2:Math.max(r.y+r.h,q.y+q.h)+2});}}for(const item of rects)Object.assign(L(node(item.id)),item.rect);drag.valid=true;render()}else drag.valid=false}if(drag.type==='resize'){const l=L(node(drag.id)),w2=Math.max(4,drag.origin.w+Math.round(w.x-drag.start.x)),h2=Math.max(3,drag.origin.h+Math.round(w.y-drag.start.y));if(!overlap(drag.id,{...l,w:w2,h:h2})){l.w=w2;l.h=h2;l.portPositions=M.portPositions(node(drag.id).ports,w2,h2);drag.valid=true;render()}}if(drag.type==='segment'){
 const p=drag.original[drag.index],q=drag.original[drag.index+1];
 const coord=Math.round(p.y===q.y?w.y:w.x),path=moveSegmentPath(drag.original,drag.index,coord);
 if(path&&!edgeLocked(drag.eid)){doc.layout.edges??={};doc.layout.edges[drag.eid]??={};doc.layout.edges[drag.eid].manualPath=path;doc.layout.edges[drag.eid].routingMode='manual';drag.valid=true;render()}
 else {doc.layout.edges[drag.eid]=cl(drag.before.layout.edges?.[drag.eid]||{});drag.valid=false;render()}
 }if(drag.type==='waypoint'&&!edgeLocked(drag.eid)){const p=doc.layout.edges[drag.eid].waypoints[drag.index];p.x=Math.round(w.x);p.y=Math.round(w.y);drag.valid=true;render()}});
$('#canvas').addEventListener('pointerup',e=>{if(!drag)return;const w=world(e);if(drag.type==='box'&&drag.moved){
 const a=world({clientX:drag.sx,clientY:drag.sy}),x1=Math.min(a.x,w.x),y1=Math.min(a.y,w.y),x2=Math.max(a.x,w.x),y2=Math.max(a.y,w.y);
 selected=new Set(doc.nodes.filter(n=>{const l=L(n);return l.x<x2&&l.x+l.w>x1&&l.y<y2&&l.y+l.h>y1}).map(n=>n.id));
 selectedEdges=new Set(doc.edges.filter(ed=>{const pts=linkPath(ed);return pts.some((p,i)=>i<pts.length-1&&(()=>{const q=pts[i+1];if(p.y===q.y)return p.y>=y1&&p.y<=y2&&Math.max(p.x,q.x)>=x1&&Math.min(p.x,q.x)<=x2;return p.x>=x1&&p.x<=x2&&Math.max(p.y,q.y)>=y1&&Math.min(p.y,q.y)<=y2})())}).map(ed=>ed.id));
 selectedEdge=selectedEdges.size===1?[...selectedEdges][0]:null;
 $('#selectionRect').style.display='none'
}if(drag.type==='box'&&drag.button===2&&!drag.moved){suppressRightContextMenu=false}if(drag.type==='connect'){
 const actual=document.elementFromPoint(e.clientX,e.clientY),to=actual?.closest('[data-port]');
 if(!to)notice('연결되지 않았습니다. 대상 블록의 입력 포트 위에서 마우스를 놓으세요.');
 else {
  const target=to.dataset.node,port=to.dataset.port,reason=connectionFailureReason(drag.from,drag.port,target,port);
  if(reason)notice(reason);
  else {const source=node(drag.from).ports.find(p=>p.id===drag.port);transaction(()=>doc.edges.push({id:M.uid('e'),kind:source.kind,source:{nodeId:drag.from,portId:source.id},target:{nodeId:target,portId:port}}));notice('연결했습니다.');}
 }
 $('#preview').setAttribute('d','');$('#canvas').classList.remove('connection-mode')
}if(['move','resize','waypoint','segment'].includes(drag.type)&&drag.valid){const prev=drag.before;if(JSON.stringify(doc)!==JSON.stringify(prev)){past.push(prev);future=[];changed()}}drag=null;guideLines=[];render()});
$('#canvas').addEventListener('pointercancel',()=>{if(['segment','waypoint'].includes(drag?.type)&&drag.before)doc=drag.before;if(drag?.type==='box'&&drag.button===2){rightClickBlock=null;rightClickEdge=null;suppressRightContextMenu=true}drag=null;$('#canvas').classList.remove('connection-mode');$('#selectionRect').style.display='none';$('#preview').setAttribute('d','');render()});
$('#canvas').addEventListener('dblclick',e=>{const block=e.target.closest('[data-id]');if(block){const n=node(block.dataset.id);if(n.locked){notice('잠긴 블록은 편집할 수 없습니다.');return}const title=prompt('블록 제목',n.title);if(title!==null)transaction(()=>n.title=title);if(n.type==='subflow'&&n.subflow)send('openSubflow',{file:n.subflow});return}const groupEl=e.target.closest('[data-group-id]');if(groupEl){const g=doc.layout.groups.find(x=>x.id===groupEl.dataset.groupId);transaction(()=>{g.collapsed=!g.collapsed;selected.clear()});return}const edge=e.target.closest('[data-edge]');if(edge)return;const r=$('#shell').getBoundingClientRect();quick({x:e.clientX-r.left,y:e.clientY-r.top})});
$('#shell').addEventListener('wheel',e=>{e.preventDefault();if(e.ctrlKey||e.metaKey){zoomAt(e.deltaY>0?.9:1.1,e);return}const lineFactor=e.deltaMode===1?16:e.deltaMode===2?$('#shell').clientHeight:1;const dy=e.deltaY*lineFactor,dx=e.deltaX*lineFactor;if(e.shiftKey){pan.x-=dx||dy}else{pan.y-=dy;pan.x-=dx}render()},{passive:false});
$('#app').addEventListener('click',e=>{const modeButton=e.target.closest('[data-grid-mode]'),styleButton=e.target.closest('[data-grid-style]');if(modeButton){gridMode=modeButton.dataset.gridMode;gridCustom=true;updateGrid();return}if(styleButton){gridStyle=styleButton.dataset.gridStyle;gridCustom=true;updateGrid();return}const act=e.target.closest('[data-action]');if(act){action(act.dataset.action);return}const tool=e.target.closest('[data-tool]');if(tool){const r=$('#shell').getBoundingClientRect();add(tool.dataset.tool,Math.round((r.width/2-pan.x)/zoom/G),Math.round((r.height/2-pan.y)/zoom/G));return}const quickEl=e.target.closest('[data-quick]');if(quickEl){const w={x:Math.round((quick.at.x-pan.x)/zoom/G),y:Math.round((quick.at.y-pan.y)/zoom/G)};if(hotEdge)insertEdge(quickEl.dataset.quick);else {const n=add(quickEl.dataset.quick,w.x,w.y);if(n){const label=prompt('새 블록 제목',n.title);if(label!==null)transaction(()=>n.title=label)}}$('#quick').classList.add('hidden');hotEdge=null;return}const edgeAdd=e.target.closest('[data-edgeadd]');if(edgeAdd){const rect=$('#shell').getBoundingClientRect();quick({x:e.clientX-rect.left,y:e.clientY-rect.top},edgeAdd.dataset.edgeadd);return}const g=e.target.closest('[data-group]');if(g)transaction(()=>{const group=doc.layout.groups.find(x=>x.id===g.dataset.group);group.collapsed=!group.collapsed;notice('그룹 접기/펼치기 상태를 저장했습니다')});const sim=e.target.closest('[data-sim]');if(sim){if(sim.dataset.sim==='close'){$('#simPanel').classList.add('hidden');simulation=null;simState=null;render();return}try{if(sim.dataset.sim==='step')simState=simulation.step();if(sim.dataset.sim==='back')simState=simulation.back();if(sim.dataset.sim==='over'){const oldDepth=simulation.getState().depth;for(let i=0;i<100;i++){simState=simulation.step();if(simState.done||simState.depth<=oldDepth)break}}if(sim.dataset.sim==='run'){for(let i=0;i<100;i++){const state=simulation.getState();if(i>0&&state.current&&doc.nodes.some(n=>n.id===state.current&&n.breakpoint))break;simState=simulation.step();if(simState.done)break}}}catch(err){notice(err.message)}simUI()}});
$('#leftToggle').onclick=()=>setPanel('#library');$('#rightToggle').onclick=()=>setPanel('#props');document.querySelectorAll('[data-panel-toggle]').forEach(button=>button.addEventListener('click',()=>setPanel('#'+button.dataset.panelToggle)));initializePanels();$('#blockSearch').oninput=populatePalette;$('#quickSearch').oninput=fillQuick;
$('#palette').addEventListener('dragstart',e=>{const el=e.target.closest('[data-tool]');if(el){e.dataTransfer.setData('text/flowforge-type',el.dataset.tool);paletteDragging=true;updateGrid()}});$('#palette').addEventListener('dragend',()=>{paletteDragging=false;updateGrid()});$('#shell').addEventListener('dragover',e=>{if(e.dataTransfer.types.includes('text/flowforge-type'))e.preventDefault()});$('#shell').addEventListener('drop',e=>{const type=e.dataTransfer.getData('text/flowforge-type');if(type){e.preventDefault();const w=world(e);add(type,Math.round(w.x),Math.round(w.y))}paletteDragging=false;updateGrid()});
$('#inspector').addEventListener('change',e=>{const edgeId=e.target.dataset.edgeLabel;if(edgeId){const edge=doc.edges.find(x=>x.id===edgeId);if(edge?.locked){notice('잠긴 연결선은 수정할 수 없습니다.');return}if(edge)transaction(()=>edge.label=e.target.value.slice(0,160));return}const field=e.target.dataset.field,size=e.target.dataset.size,docfield=e.target.dataset.doc,n=selected.size===1?node([...selected][0]):null;if(docfield)transaction(()=>doc[docfield]=e.target.value);if(field&&n&&!n.locked)transaction(()=>{n[field]=e.target.value});if(size&&n&&!n.locked){const val=Math.max(size==='w'?4:3,Number(e.target.value)|0),l=L(n),next={...l,[size]:val};if(overlap(n.id,next))notice('블록이 겹쳐 크기 변경을 취소했습니다');else transaction(()=>{l[size]=val;l.portPositions=M.portPositions(n.ports,l.w,l.h)})}});
// Canvas-only commands are registered as configurable VSCode keybindings.
// The input fields and side panels never acquire the FlowForge canvas keybinding context.
function canvasHasFocus(){if(!$('#settingsPage').classList.contains('hidden'))return false;const active=document.activeElement;return active===$('#shell')||active===$('#canvas')||(active&&$('#canvas').contains(active))}
function syncCanvasFocus(){send('canvasFocus',{focused:canvasHasFocus()})}
document.addEventListener('focusin',syncCanvasFocus);
document.addEventListener('focusout',()=>queueMicrotask(syncCanvasFocus));
window.addEventListener('blur',()=>send('canvasFocus',{focused:false}));
function runCanvasCommand(command){if(!canvasHasFocus()||!ready)return;switch(command){
 case 'undo':undo();break;case 'redo':redo();break;case 'save':save();break;
 case 'selectAll':selected=new Set(doc.nodes.map(n=>n.id));selectedEdge=null;render();break;
 case 'copy':copy();break;case 'paste':paste();break;case 'duplicate':copy();paste();break;
 case 'group':group();break;
 case 'ungroup':transaction(()=>doc.layout.groups=doc.layout.groups.filter(g=>!g.nodeIds.some(id=>selected.has(id))));break;
 case 'delete':erase();break;case 'fit':fit();break;
 case 'toggleLock':if(selectedEdge){toggleEdgeLock(selectedEdge)}else if(selected.size){toggleLock(selected)}else notice('잠글 블록 또는 연결선을 먼저 선택하세요.');break;
 case 'escape':closeNodeContext();$('#quick').classList.add('hidden');$('#diffPanel').classList.add('hidden');selected.clear();render();break;
 }}
function showDiff(m){clearTimeout(saveLater);conflict=m;const base=m.base,local=m.local,remote=m.remote,change=M.diff(base,remote),merged=M.threeWay(base,local,remote),el=$('#diffPanel');el.classList.remove('hidden');el.innerHTML=`<div class="panelhead"><b>외부 변경 · Visual Diff</b><button data-diff="close">×</button></div><p class="tiny">${esc(m.message||'외부 파일 변경')} · 변경 ${change.length}건 · 충돌 ${merged.conflicts.length}건</p>${change.map(c=>`<div class="diffRow">${c.action==='added'?'+':c.action==='removed'?'-':'~'} ${esc(c.kind)} · ${esc(c.id)}</div>`).join('')||'<p>데이터 변경 확인 필요</p>'}${merged.conflicts.map(c=>`<label>${esc(c.field)} / ${esc(c.id)}</label><select data-conflict="${esc(c.field+':'+c.id)}"><option value="remote">외부 변경 사용</option><option value="local">내 변경 사용</option></select>`).join('')}<div class="buttonRow"><button data-diff="remote">외부 버전</button><button data-diff="local">내 편집 유지</button><button class="primary" data-diff="merge">노드별 병합</button></div>`}
$('#diffPanel').addEventListener('click',e=>{const v=e.target.dataset.diff;if(!v)return;if(v==='close'){$('#diffPanel').classList.add('hidden');return}if(v==='remote'){doc=cl(conflict.remote);base=cl(conflict.remote);saved=true;render()}if(v==='local'){doc=cl(conflict.local);changed()}if(v==='merge'){const choices={};document.querySelectorAll('[data-conflict]').forEach(x=>choices[x.dataset.conflict]=x.value);send('merge',{base:conflict.base,local:conflict.local,remote:conflict.remote,choices})}$('#diffPanel').classList.add('hidden');if(v==='remote')conflict=null;if(v==='local')conflict=null});
window.addEventListener('message',e=>{const m=e.data;if(m.type==='canvasCommand'){runCanvasCommand(m.command);return}if(m.type==='themeConfig'){applyTheme(m.theme)}if(m.type==='gridConfig'){if(!gridCustom){gridMode=['auto','on','off'].includes(m.mode)?m.mode:'auto';gridStyle=['dots','lines'].includes(m.style)?m.style:'dots';updateGrid()}}if(m.type==='load'){if(m.settings?.panels){for(const [id,key] of [['library','blockLibrary'],['props','properties']]){const closed=m.settings.panels[key]==='closed';$('#'+id).classList.toggle('closed',closed);$('#'+id+'Rail').classList.toggle('visible',closed);$('#'+(id==='library'?'leftToggle':'rightToggle')).setAttribute('aria-expanded',String(!closed))}}applyTheme(m.theme);if(!gridCustom){gridMode=['auto','on','off'].includes(m.gridMode)?m.gridMode:'auto';gridStyle=['dots','lines'].includes(m.gridStyle)?m.gridStyle:'dots'}doc=m.document;base=cl(doc);past=m.history?.past||[];future=m.history?.future||[];filename=m.filename;subflows=m.subflows||{};ready=true;populatePalette();fit();$('#status').textContent='✓ 저장됨'}if(m.type==='saved'){conflict=null;saved=true;base=cl(m.document);$('#status').textContent='✓ 저장됨'}if(m.type==='reload'){conflict=null;doc=m.document;base=cl(doc);saved=true;selected.clear();render();notice('외부 변경사항을 자동 반영했습니다.')}if(m.type==='conflict')showDiff(m);if(m.type==='merged'){conflict=null;doc=m.document;changed();render();notice('병합 완료 · 저장하여 확정하세요.')}if(m.type==='notice')notice(m.message);if(m.type==='compareResult')showCompare(m); if(m.type==='validated'){issues=m.issues;render();notice(`검증: ${issues.length}건 (오류 ${issues.filter(p=>p.severity==='error').length}건)`)}if(m.type==='sourceStatuses'){sourceStates=m.states;render()}if((m.type==='sourceLinked'||m.type==='requestSourceLink')&&!isLocked(m.nodeId))transaction(()=>{doc.bindings[m.nodeId]=m.binding||m.source});if(m.type==='subflowCreated'&&!isLocked(m.nodeId))transaction(()=>{const n=node(m.nodeId);if(n)n.subflow=m.file;subflows[m.file]=m.document})});
send('ready');

document.addEventListener('keydown',e=>{
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='a'){
  const active=document.activeElement,inside=active===$('#shell')||active===$('#canvas')||$('#shell').contains(active);
  if(inside&&!['INPUT','TEXTAREA'].includes(active.tagName)&&!active.isContentEditable){
   e.preventDefault();e.stopPropagation();selected=new Set(doc.nodes.map(n=>n.id));selectedEdges=new Set(doc.edges.map(ed=>ed.id));selectedEdge=null;render();notice(`캔버스 전체 선택 · 블록 ${selected.size}개, 연결선 ${selectedEdges.size}개`);
  }
 }
 if(e.key==='Escape'&&!$('#settingsPage').classList.contains('hidden')){e.preventDefault();closeSettings()}
});
})();
