const module={exports:{}};
'use strict';
const GRID=22;
const TYPES={start:{in:[],out:['next']},end:{in:['in'],out:[]},process:{in:['in'],out:['next']},condition:{in:['in'],out:['true','false']},io:{in:['in'],out:['next']},function:{in:['in'],out:['next']},loop:{in:['in'],out:['body','exit']},subflow:{in:['in'],out:['next']},conversion:{in:['in'],out:['next']}};
const clone=x=>JSON.parse(JSON.stringify(x));
function uid(prefix){return `${prefix}_${Math.random().toString(36).slice(2,10)}`}
function portsFor(type,extra=[]){let d=TYPES[type]||TYPES.process;return [...d.in.map(id=>({id,kind:'flow',direction:'input'})),...d.out.map(id=>({id,kind:'flow',direction:'output'})),...extra]}
function makeNode(type,x,y,props={}){return {id:uid('n'),type,title:type==='condition'?'조건 판단':type==='loop'?'반복':type==='subflow'?'하위 차트':type,description:'',expression:'',locked:false,ports:portsFor(type),...props,position:{x,y}}}
const empty=()=>({schemaVersion:2,documentId:uid('doc'),revision:0,name:'새 로직',variables:[],nodes:[],edges:[],layout:{gridSize:GRID,nodes:{},edges:{},groups:[]},bindings:{},extensions:{}});
function makeLayout(type,x,y){const w=type==='start'||type==='end'?6:8,h=type==='condition'||type==='loop'?4:4;return {x,y,w,h,portPositions:portPositions(portsFor(type),w,h)}}
function portPositions(ports,w,h){const result={};const ins=ports.filter(p=>p.direction==='input'),outs=ports.filter(p=>p.direction==='output');
 for(let i=0;i<ins.length;i++){const p=ins[i];result[p.id]={side:p.kind==='data'?'left':'top',offset:p.kind==='data'?Math.min(h-1,i+1):Math.min(w-1,Math.max(1,Math.round(w*(i+1)/(ins.length+1))))}}
 for(let i=0;i<outs.length;i++){const p=outs[i];result[p.id]={side:p.kind==='data'?'right':'bottom',offset:p.kind==='data'?Math.min(h-1,i+1):Math.min(w-1,Math.max(1,Math.round(w*(i+1)/(outs.length+1))))}}
 return result;}
function addNode(doc,type,x,y,props={}){const n=makeNode(type,x,y,props);doc.nodes.push(n);doc.layout.nodes[n.id]=makeLayout(type,x,y);return n}
function normalize(raw){if(raw?.schemaVersion===2){const d=clone(raw);d.layout??={};d.layout.gridSize=GRID;d.layout.nodes??={};d.layout.edges??={};d.layout.groups??=[];d.bindings??={};d.variables??=[];d.extensions??={};d.edges??=[];d.nodes??=[];for(const n of d.nodes){n.ports??=portsFor(n.type);const l=d.layout.nodes[n.id];if(!l)d.layout.nodes[n.id]=makeLayout(n.type,2,2);else{l.w??=8;l.h??=4;l.portPositions??=portPositions(n.ports,l.w,l.h)}}return {document:d,migrated:false,notes:[]}}
 if(raw?.nodes&&raw?.edges){const d=empty();d.name=raw.title||raw.name||'기존 로직';const notes=[];const mapping={decision:'condition'};
 for(const old of raw.nodes){const type=mapping[old.type]||old.type||'process',n=addNode(d,TYPES[type]?type:'process',Math.round((old.x||0)/GRID),Math.round((old.y||0)/GRID),{id:String(old.id),title:old.title||type,description:old.description||'',expression:old.type==='decision'?(old.description||''):''});if(!TYPES[type])notes.push(`${n.id}: 알 수 없는 이전 타입 ${type}`);}
 for(const e of raw.edges){const from=d.nodes.find(n=>n.id===e.from),to=d.nodes.find(n=>n.id===e.to);if(!from||!to){notes.push(`${e.id||''}: 대상이 없는 연결`);continue}let out=(from.ports.find(p=>p.direction==='output')||{}).id;if(from.type==='condition'){const label=(e.label||'').trim().toLowerCase();if(['true','yes','예','참'].includes(label))out='true';else if(['false','no','아니오','거짓'].includes(label))out='false';else{out='true';notes.push(`${e.id||''}: 조건 분기 의미 불명확 — true 임시 연결, 사용자 확인 필요`)}}
 const targetPort=(to.ports.find(p=>p.direction==='input'&&p.kind==='flow')||{}).id;if(!out||!targetPort)continue;d.edges.push({id:e.id||uid('e'),kind:'flow',source:{nodeId:from.id,portId:out},target:{nodeId:to.id,portId:targetPort},label:e.label||''});}
 return {document:d,migrated:true,notes};}
 throw Error('지원하지 않는 FlowForge 파일 형식');}
function problems(doc){const result=[],put=(severity,msg,nodeId)=>result.push({severity,message:msg,nodeId});if(!doc||doc.schemaVersion!==2||!Array.isArray(doc.nodes)||!Array.isArray(doc.edges))return [{severity:'error',message:'스키마 v2가 아닙니다'}];
 const ids=new Set(),edgeIds=new Set(),lookup=new Map();for(const n of doc.nodes){if(!n.id||ids.has(n.id))put('error',`중복/빈 노드 ID: ${n.id}`,n.id);ids.add(n.id);lookup.set(n.id,n);if(!TYPES[n.type])put('error',`알 수 없는 블록 유형 ${n.type}`,n.id);const ps=new Set();for(const p of n.ports||[]){if(!p.id||ps.has(p.id))put('error',`포트 ID 중복 ${p.id}`,n.id);ps.add(p.id);if(!['flow','data'].includes(p.kind))put('error','포트 kind 오류',n.id);if(p.kind==='data'&&!p.dataType)put('error','Data 포트 자료형 누락',n.id);}}
 const outputs=new Map(),dataInputs=new Map(),adj=new Map();for(const n of doc.nodes)adj.set(n.id,[]);
 for(const e of doc.edges){if(edgeIds.has(e.id))put('error',`간선 ID 중복: ${e.id}`);edgeIds.add(e.id);const a=lookup.get(e.source?.nodeId),b=lookup.get(e.target?.nodeId);if(!a||!b){put('error',`간선 ${e.id}: 노드가 없음`);continue;}const pa=(a.ports||[]).find(p=>p.id===e.source.portId),pb=(b.ports||[]).find(p=>p.id===e.target.portId);if(!pa||!pb){put('error',`간선 ${e.id}: 포트가 없음`,a.id);continue;}if(pa.direction!=='output'||pb.direction!=='input'||pa.kind!==pb.kind||pa.kind!==e.kind)put('error',`간선 ${e.id}: 방향 또는 종류 불일치`,a.id);
 if(e.kind==='data'){if(pa.dataType!==pb.dataType)put('error',`간선 ${e.id}: 자료형 불일치 (${pa.dataType}→${pb.dataType})`,b.id);const key=b.id+':'+pb.id;dataInputs.set(key,(dataInputs.get(key)||0)+1)}else{const key=a.id+':'+pa.id;outputs.set(key,(outputs.get(key)||0)+1);adj.get(a.id).push(b.id)}}
 for(const [k,v] of outputs)if(v>1)put('error',`출력 포트 다중 Flow 연결: ${k}`);for(const [k,v] of dataInputs)if(v>1)put('error',`Data 입력 포트 다중 연결: ${k}`);
 const layout=doc.layout?.nodes||{};for(const n of doc.nodes){const l=layout[n.id];if(!l){put('error','레이아웃이 없습니다',n.id);continue}if(![l.x,l.y,l.w,l.h].every(Number.isInteger)||l.w<=0||l.h<=0)put('error','레이아웃은 정수 격자 좌표·양수 크기여야 합니다',n.id);for(const p of n.ports||[]){const pos=l.portPositions?.[p.id];if(!pos||!['top','bottom','left','right'].includes(pos.side)||!Number.isInteger(pos.offset)||pos.offset<0||pos.offset>(['top','bottom'].includes(pos.side)?l.w:l.h))put('error',`포트 ${p.id} 좌표 오류`,n.id)}}
 for(let i=0;i<doc.nodes.length;i++)for(let j=i+1;j<doc.nodes.length;j++){const a=layout[doc.nodes[i].id],b=layout[doc.nodes[j].id];if(a&&b&&a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y)put('error',`블록 겹침: ${doc.nodes[i].id} / ${doc.nodes[j].id}`,doc.nodes[i].id)}
 const starts=doc.nodes.filter(n=>n.type==='start');if(!starts.length)put('warning','시작 블록이 없습니다');const visited=new Set(),stack=starts.map(n=>n.id);while(stack.length){const id=stack.pop();if(visited.has(id))continue;visited.add(id);stack.push(...(adj.get(id)||[]))}for(const n of doc.nodes){if(starts.length&&!visited.has(n.id))put('warning','시작 블록에서 도달할 수 없습니다',n.id);if(n.type==='condition'||n.type==='loop')for(const p of n.ports.filter(p=>p.kind==='flow'&&p.direction==='output'))if(!outputs.get(n.id+':'+p.id))put('warning',`${p.id} 분기가 연결되지 않았습니다`,n.id)}
 return result;}
function diff(base,next){const changes=[];for(const kind of ['nodes','edges']){const a=new Map((base[kind]||[]).map(v=>[v.id,v])),b=new Map((next[kind]||[]).map(v=>[v.id,v]));for(const [id,val] of b){if(!a.has(id))changes.push({kind,id,action:'added'});else if(JSON.stringify(a.get(id))!==JSON.stringify(val))changes.push({kind,id,action:'changed'})}for(const [id] of a)if(!b.has(id))changes.push({kind,id,action:'removed'});}return changes;}
function threeWay(base,local,remote,choices={}){const merged=clone(remote),conflicts=[];for(const field of ['nodes','edges']){const b=new Map((base[field]||[]).map(x=>[x.id,x])),l=new Map((local[field]||[]).map(x=>[x.id,x])),r=new Map((remote[field]||[]).map(x=>[x.id,x]));const out=new Map(r);for(const id of new Set([...b.keys(),...l.keys(),...r.keys()])){const eq=(x,y)=>JSON.stringify(x)===JSON.stringify(y),lc=!eq(b.get(id),l.get(id)),rc=!eq(b.get(id),r.get(id));if(lc&&rc&&!eq(l.get(id),r.get(id))){conflicts.push({field,id,local:l.get(id),remote:r.get(id)});if(choices[`${field}:${id}`]!=='local')continue;}if(lc&&(!rc||choices[`${field}:${id}`]==='local')){if(l.has(id))out.set(id,l.get(id));else out.delete(id)}}merged[field]=[...out.values()]}
 // Independent layout changes are merged per node, and conflicts are surfaced.
 for(const part of ['nodes','edges']){merged.layout[part]??={};const bl=base.layout?.[part]||{},ll=local.layout?.[part]||{},rl=remote.layout?.[part]||{};for(const id of new Set([...Object.keys(bl),...Object.keys(ll),...Object.keys(rl)])){const eq=(x,y)=>JSON.stringify(x)===JSON.stringify(y),lc=!eq(bl[id],ll[id]),rc=!eq(bl[id],rl[id]);if(lc&&rc&&!eq(ll[id],rl[id])){conflicts.push({field:`layout.${part}`,id,local:ll[id],remote:rl[id]});if(choices[`layout.${part}:${id}`]!=='local')continue}if(lc&&(!rc||choices[`layout.${part}:${id}`]==='local')){if(ll[id])merged.layout[part][id]=ll[id];else delete merged.layout[part][id]}}}
 merged.revision=Math.max(local.revision||0,remote.revision||0)+1;return {merged,conflicts};}
function simulator(doc, options={}){
 const subflows=options.subflows||{};
 let vars=Object.fromEntries((doc.variables||[]).map(v=>[v.id,clone(v.initialValue)]));
 const first=(d)=>d.nodes.find(n=>n.type==='start')?.id||d.nodes[0]?.id||null;
 const stack=[{document:doc,current:first(doc),returnTo:null}],trace=[],dataValues={},snapshots=[];
 let steps=0;
 const key=(d,nodeId,portId)=>[d.documentId,nodeId,portId].join(':');
 const follow=(d,nodeId,p)=>d.edges.find(e=>e.kind==='flow'&&e.source.nodeId===nodeId&&e.source.portId===p)?.target.nodeId||null;
 function expression(src){
  const expr=String(src||'').trim();if(!expr||!/^[\w\s.+*\/%()<>!=&|\-]+$/.test(expr))throw Error('지원하지 않는 표현식: '+expr);
  const tokens=expr.match(/(?:\d+(?:\.\d+)?)|(?:[a-zA-Z_]\w*)|(?:==|!=|<=|>=|&&|\|\||[+*\/%()<>!\-])/g)||[];
  if(tokens.join('')!==expr.replace(/\s/g,''))throw Error('표현식 문법 오류');let i=0;
  function atom(){const t=tokens[i++];if(t==='('){const v=or();if(tokens[i++]!==')')throw Error('닫는 괄호 누락');return v}if(t==='!')return !atom();if(t==='-')return -Number(atom());if(/^\d/.test(t||''))return Number(t);if(t==='true')return true;if(t==='false')return false;if(Object.prototype.hasOwnProperty.call(vars,t))return vars[t];throw Error('미정의 변수: '+t)}
  function level(next,ops){let v=next();while(ops.includes(tokens[i])){const op=tokens[i++],b=next();switch(op){case '*':v=Number(v)*Number(b);break;case '/':v=Number(v)/Number(b);break;case '%':v=Number(v)%Number(b);break;case '+':v=Number(v)+Number(b);break;case '-':v=Number(v)-Number(b);break;case '>':v=v>b;break;case '<':v=v<b;break;case '>=':v=v>=b;break;case '<=':v=v<=b;break;case '==':v=v===b;break;case '!=':v=v!==b;break;case '&&':v=Boolean(v)&&Boolean(b);break;case '||':v=Boolean(v)||Boolean(b);break;}}return v}
  const mul=()=>level(atom,['*','/','%']),sum=()=>level(mul,['+','-']),cmp=()=>level(sum,['>','<','>=','<=']),eq=()=>level(cmp,['==','!=']),and=()=>level(eq,['&&']),or=()=>level(and,['||']);const v=or();if(i!==tokens.length)throw Error('표현식 끝에 불필요한 값');return v;
 }
 function getState(){const frame=stack[stack.length-1];return {current:frame?.current||null,documentId:frame?.document.documentId||doc.documentId,vars:clone(vars),dataValues:clone(dataValues),trace:clone(trace),steps,depth:stack.length,done:!frame||!frame.current};}
 function step(){let frame=stack[stack.length-1];if(!frame||!frame.current)return {...getState(),done:true};if(steps>=1000)throw Error('최대 실행 단계 1000 초과');snapshots.push({stack:clone(stack),vars:clone(vars),dataValues:clone(dataValues),trace:clone(trace),steps});steps++;
  const d=frame.document,n=d.nodes.find(n=>n.id===frame.current);if(!n)throw Error('없는 노드 '+frame.current);trace.push(`${d.documentId}/${n.id}`);
  for(const input of (n.ports||[]).filter(p=>p.kind==='data'&&p.direction==='input')){
   const edge=d.edges.find(e=>e.kind==='data'&&e.target.nodeId===n.id&&e.target.portId===input.id);if(!edge)continue;
   const sourceKey=key(d,edge.source.nodeId,edge.source.portId);
   if(!Object.prototype.hasOwnProperty.call(dataValues,sourceKey))throw Error(`Data 포트 미초기화: ${edge.source.nodeId}.${edge.source.portId}`);
   vars[input.variable||input.id]=clone(dataValues[sourceKey]);
  }
  let branch='next';
  if(n.type==='condition'||n.type==='loop')branch=expression(n.expression)?(n.type==='loop'?'body':'true'):(n.type==='loop'?'exit':'false');
  if(n.type==='process'&&n.expression){const match=n.expression.match(/^\s*([a-zA-Z_]\w*)\s*(=|\+=|-=)\s*(.+)$/);if(!match)throw Error('지원하지 않는 처리식: '+n.expression);const [,name,op,rhs]=match,v=expression(rhs);if(op==='=')vars[name]=v;else vars[name]=op==='+='?Number(vars[name])+Number(v):Number(vars[name])-Number(v)}
  if(n.type==='conversion'){const output=(n.ports||[]).find(p=>p.kind==='data'&&p.direction==='output'),input=(n.ports||[]).find(p=>p.kind==='data'&&p.direction==='input');if(output&&input){const raw=vars[input.variable||input.id];if(raw===undefined)throw Error('변환 입력 미초기화');let v;switch(output.dataType){case 'string':v=String(raw);break;case 'bool':v=Boolean(raw);break;case 'i32':case 'u32':v=Math.trunc(Number(raw));break;default:v=Number(raw)}vars[output.variable||output.id]=v;}}
  for(const out of (n.ports||[]).filter(p=>p.kind==='data'&&p.direction==='output')){const varName=out.variable||out.id;if(Object.prototype.hasOwnProperty.call(vars,varName))dataValues[key(d,n.id,out.id)]=clone(vars[varName]);}
  if(n.type==='subflow'){
   const child=subflows[n.subflow];if(!child)throw Error('하위 차트를 로드하지 못함: '+(n.subflow||'경로 없음'));
   if(stack.length>=16)throw Error('최대 하위 차트 호출 깊이 16 초과');for(const v of child.variables||[])if(!Object.prototype.hasOwnProperty.call(vars,v.id))vars[v.id]=clone(v.initialValue);
   frame.returnTo=follow(d,n.id,'next');stack.push({document:child,current:first(child),returnTo:null});return {nodeId:n.id,branch:'into',...getState()};
  }
  if(n.type==='end'){
   if(stack.length>1){stack.pop();frame=stack[stack.length-1];frame.current=frame.returnTo;frame.returnTo=null;return {nodeId:n.id,branch:'return',...getState()};}
   frame.current=null;return {nodeId:n.id,branch:'end',...getState()};
  }
  frame.current=follow(d,n.id,branch);return {nodeId:n.id,branch,...getState()};
 }
 function back(){const s=snapshots.pop();if(!s)return null;stack.splice(0,stack.length,...s.stack);vars=s.vars;for(const k of Object.keys(dataValues))delete dataValues[k];Object.assign(dataValues,s.dataValues);trace.splice(0,trace.length,...s.trace);steps=s.steps;return getState()}
 return {step,back,getState};
}
module.exports={GRID,TYPES,clone,uid,portsFor,portPositions,makeLayout,addNode,empty,normalize,problems,diff,threeWay,simulator};

window.FlowModel=module.exports;
