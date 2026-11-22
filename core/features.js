'use strict';
/* Feature utilities shared by the VSCode host and webview. No filesystem access. */
function compare(a,b){
 const out=[];for(const kind of ['nodes','edges']){
  const left=new Map((a[kind]||[]).map(x=>[x.id,x])),right=new Map((b[kind]||[]).map(x=>[x.id,x]));
  for(const id of new Set([...left.keys(),...right.keys()])){
   const before=left.get(id),after=right.get(id);
   if(!before)out.push({kind,id,status:'added'});
   else if(!after)out.push({kind,id,status:'removed'});
   else if(JSON.stringify(before)!==JSON.stringify(after))out.push({kind,id,status:'modified'});
  }
 }
 for(const kind of ['nodes','edges']){
  const l=a.layout?.[kind]||{},r=b.layout?.[kind]||{};
  for(const id of new Set([...Object.keys(l),...Object.keys(r)]))if(JSON.stringify(l[id])!==JSON.stringify(r[id]))out.push({kind:'layout.'+kind,id,status:'layout'});
 }
 return out;
}
function executeTests(document,cases,model,subflows={}){
 return cases.map(test=>{
  const d=JSON.parse(JSON.stringify(document));
  const initial=test.inputs||{};
  d.variables=(d.variables||[]).map(v=>Object.prototype.hasOwnProperty.call(initial,v.id)?{...v,initialValue:initial[v.id]}:v);
  for(const [name,value] of Object.entries(initial))if(!d.variables.some(v=>v.id===name))d.variables.push({id:name,type:typeof value==='boolean'?'bool':'f32',initialValue:value});
  try{
   const sim=model.simulator(d,{subflows}),limit=Math.max(1,Math.min(1000,Number(test.maxSteps)||500));let state=sim.getState(),last=state;
   for(let k=0;k<limit&&!state.done;k++){last=sim.step();state=sim.getState();}
   if(!state.done)return {name:test.name||'Unnamed',status:'ERROR',reason:'실행 단계 제한 초과',actual:state.vars};
   const output=test.expected||{},mismatches=Object.entries(output).filter(([key,value])=>JSON.stringify(state.vars[key])!==JSON.stringify(value));
   const trace=(state.trace||[]).map(x=>x.split('/').slice(1).join('/'));
   const expectedPath=test.expectedPath||[];
   const pathMatches=expectedPath.length===0||expectedPath.every((id,i)=>trace[i]===id);
   const ok=!mismatches.length&&pathMatches;
   return {name:test.name||'Unnamed',status:ok?'PASS':'FAIL',reason:[...mismatches.map(([k])=>'출력 '+k+' 불일치'),...(!pathMatches?['실행 경로 불일치']:[])].join(', '),actual:state.vars,trace};
  }catch(e){return {name:test.name||'Unnamed',status:'ERROR',reason:e.message||String(e)};}
 });
}
// Use user-triggered optimization only; generate proposal for unlocked auto-routed edges.
function optimizeRoutes(edges,layout,routeFor,score){
 const candidates=[];
 for(const e of edges){const stored=layout.edges?.[e.id];if(stored?.waypoints?.length||stored?.routingMode==='manual')continue;
  const original=routeFor(e);
  if(original.length<3)continue;
  // Candidate generation is constrained; never move blocks or manual waypoints.
  // The caller decides whether any candidate is better and requires user approval.
  candidates.push({edgeId:e.id,before:original,after:original});
 }
 return candidates.filter(x=>score(x.after)<score(x.before));
}
const api={compare,executeTests,optimizeRoutes};
if(typeof module!=='undefined')module.exports=api;
if(typeof window!=='undefined')window.FlowFeatures=api;
