const assert=require('node:assert/strict'),M=require('../core/model');
const doc=M.empty(),a=M.addNode(doc,'start',2,2),b=M.addNode(doc,'process',2,10),c=M.addNode(doc,'condition',2,18),d=M.addNode(doc,'end',2,29);
function edge(from,out,to,input,kind='flow'){doc.edges.push({id:M.uid('edge'),kind,source:{nodeId:from.id,portId:out},target:{nodeId:to.id,portId:input}})}
edge(a,'next',b,'in');edge(b,'next',c,'in');edge(c,'true',d,'in');edge(c,'false',d,'in');
assert.deepEqual(M.problems(doc).filter(x=>x.severity==='error'),[]);
const proc=M.clone(doc);proc.nodes.find(n=>n.id===b.id).expression='Duty = Duty - 5';proc.nodes.find(n=>n.id===c.id).expression='Duty < 40';proc.variables=[{id:'Duty',dataType:'i32',initialValue:50}];let sim=M.simulator(proc);assert.equal(sim.step().nodeId,a.id);assert.equal(sim.step().nodeId,b.id);assert.equal(sim.step().vars.Duty,45);assert.equal(sim.getState().current,d.id);assert.equal(sim.getState().trace.length,3);assert.equal(sim.back().current,c.id);
const raw={version:1,title:'Legacy',nodes:[{id:'a',type:'start',x:44,y:66},{id:'b',type:'decision',x:44,y:176}],edges:[{id:'e1',from:'a',to:'b'}]};const converted=M.normalize(raw);assert.equal(converted.migrated,true);assert.equal(converted.document.layout.nodes.a.x,2);assert.equal(converted.document.nodes[1].type,'condition');
const base=M.clone(doc),local=M.clone(base),remote=M.clone(base);local.nodes[1].title='local';remote.nodes[2].title='remote';const merge=M.threeWay(base,local,remote);assert.equal(merge.conflicts.length,0);assert.equal(merge.merged.nodes[1].title,'local');assert.equal(merge.merged.nodes[2].title,'remote');
const both=M.clone(base);both.nodes[1].title='conflict';assert.equal(M.threeWay(base,local,both).conflicts.length,1);
const p0=M.addNode(doc,'process',80,80);assert(M.problems(doc).some(x=>x.severity==='warning'));
// Regression: stale edge-layout entries and reversing manual routes are discarded.
const corrupt={schemaVersion:2,documentId:'corrupt-route-test',nodes:[{id:'a',type:'start',ports:[{id:'next',kind:'flow',direction:'output'}]},{id:'b',type:'end',ports:[{id:'in',kind:'flow',direction:'input'}]}],edges:[{id:'real',kind:'flow',source:{nodeId:'a',portId:'next'},target:{nodeId:'b',portId:'in'}}],layout:{nodes:{a:{x:0,y:0,w:6,h:4,portPositions:{next:{side:'bottom',offset:3}}},b:{x:0,y:10,w:6,h:4,portPositions:{in:{side:'top',offset:3}}}},edges:{ghost:{manualPath:[{x:3,y:4},{x:3,y:5},{x:3,y:4},{x:3,y:5}]},real:{manualPath:[{x:3,y:4},{x:3,y:5},{x:3,y:8},{x:3,y:6},{x:3,y:9},{x:3,y:10}],routingMode:'manual'}}}};
const repaired=M.normalize(corrupt).document;
assert.deepEqual(Object.keys(repaired.layout.edges),['real']);
assert.equal(repaired.layout.edges.real.manualPath,undefined);
assert.equal(repaired.layout.edges.real.routingMode,'auto');

console.log('FlowForge data model tests passed');
