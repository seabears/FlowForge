'use strict';
const vscode=require('vscode'),fs=require('fs'),path=require('path'),crypto=require('crypto'),os=require('os'),cp=require('child_process');
const model=require('./core/model');
const openPanels=new Map();let context;let diagnostics;let focusedCanvas=null;
function setCanvasFocus(entry,focused){if(focused){focusedCanvas=entry;}else if(focusedCanvas===entry){focusedCanvas=null;}vscode.commands.executeCommand('setContext','flowforge.canvasFocus',Boolean(focusedCanvas?.panel.active&&focusedCanvas.canvasFocused));}

async function sourceStatuses(entry){const bindings=entry.live?.bindings||entry.base?.bindings||{},states={};for(const [nodeId,b] of Object.entries(bindings)){if(!b?.file)continue;const full=path.resolve(path.dirname(entry.uri.fsPath),b.file);try{const text=await fs.promises.readFile(full,'utf8');const lines=text.split(/\r?\n/),snippet=b.range?lines.slice(Math.max(0,b.range.startLine-1),b.range.endLine).join('\n'):text;states[nodeId]=hash(snippet)===b.digest?'linked':'changed'}catch{states[nodeId]='missing'}}entry.panel.webview.postMessage({type:'sourceStatuses',states});}


const RECENT_KEY='flowforge.recentFiles';
const SETTINGS_FILE='settings.json';
const DEFAULT_SETTINGS={version:1,appearance:{theme:'dark'},grid:{mode:'auto',style:'dots',spacing:22},panels:{blockLibrary:'open',properties:'open'},editor:{defaultZoom:1,minimap:'auto'},shortcuts:{toggleLock:'q'},recentFiles:[]};
let appSettings=JSON.parse(JSON.stringify(DEFAULT_SETTINGS)),settingsReady;
function mergeSettings(base,patch){for(const [k,v] of Object.entries(patch||{})){if(v&&typeof v==='object'&&!Array.isArray(v)){if(!base[k]||typeof base[k]!=='object')base[k]={};mergeSettings(base[k],v)}else base[k]=v}return base}
async function saveAppSettings(){await fs.promises.mkdir(context.globalStorageUri.fsPath,{recursive:true});const target=path.join(context.globalStorageUri.fsPath,SETTINGS_FILE),tmp=target+'.tmp';await fs.promises.writeFile(tmp,JSON.stringify(appSettings,null,2),'utf8');await fs.promises.rename(tmp,target)}
async function loadAppSettings(){
 await fs.promises.mkdir(context.globalStorageUri.fsPath,{recursive:true});
 const target=path.join(context.globalStorageUri.fsPath,SETTINGS_FILE);
 try{appSettings=mergeSettings(JSON.parse(JSON.stringify(DEFAULT_SETTINGS)),JSON.parse(await fs.promises.readFile(target,'utf8')))}
 catch{
  const old=vscode.workspace.getConfiguration('flowforge');
  appSettings.appearance.theme=old.get('theme','dark');appSettings.grid.mode=old.get('gridMode','auto');appSettings.grid.style=old.get('gridStyle','dots');
  appSettings.recentFiles=context.globalState.get('flowforge.recentFiles',[]);
  await saveAppSettings();
 }
 settingsReady=true;
 return appSettings;
}
function publicSettings(){return JSON.parse(JSON.stringify(appSettings))}

let recentProvider;
async function rememberRecent(uri){
 await settingsReady;const old=appSettings.recentFiles||[];
 const next=[uri.fsPath,...old.filter(p=>p!==uri.fsPath)].slice(0,12);
 appSettings.recentFiles=next;await saveAppSettings();
 recentProvider?.refresh();
}
class RecentFlowFilesProvider{
 constructor(){this.emitter=new vscode.EventEmitter();this.onDidChangeTreeData=this.emitter.event;}
 refresh(){this.emitter.fire();}
 async getChildren(){
  const actions=[
   {label:'새 차트 만들기',command:'flowforge.new',icon:'add'},
   {label:'기존 차트 열기',command:'flowforge.open',icon:'folder-opened'},
   {label:'최근 차트 열기',command:'flowforge.openRecent',icon:'history'}
  ].map(a=>{const item=new vscode.TreeItem(a.label,vscode.TreeItemCollapsibleState.None);item.iconPath=new vscode.ThemeIcon(a.icon);item.command={command:a.command,title:a.label};return item;});
  await settingsReady;const paths=appSettings.recentFiles||[],items=[],valid=[];
  for(const p of paths){try{await fs.promises.access(p);valid.push(p);const item=new vscode.TreeItem(path.basename(p),vscode.TreeItemCollapsibleState.None);item.description=path.dirname(p);item.tooltip=p;item.resourceUri=vscode.Uri.file(p);item.iconPath=new vscode.ThemeIcon('file-code');item.command={command:'flowforge.openRecentItem',title:'Open FlowForge file',arguments:[vscode.Uri.file(p)]};items.push(item);}catch{}}
  if(valid.length!==paths.length){appSettings.recentFiles=valid;await saveAppSettings();}
  return [...actions,...items];
 }
 getTreeItem(item){return item;}
}
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
async function loadSubflows(uri,document,seen=new Set(),depth=0){const result={};if(depth>=8)return result;for(const node of document.nodes||[]){if(node.type!=='subflow'||!node.subflow)continue;const next=path.resolve(path.dirname(uri.fsPath),node.subflow);if(seen.has(next))continue;seen.add(next);try{const raw=JSON.parse(await fs.promises.readFile(next,'utf8')),child=model.normalize(raw).document;result[node.subflow]=child;Object.assign(result,await loadSubflows(vscode.Uri.file(next),child,seen,depth+1))}catch{}}return result;}
const serialize=x=>JSON.stringify(x,null,2)+'\n';
const historyPath=(uri)=>{const folder=vscode.workspace.getWorkspaceFolder(uri)?.uri.fsPath||path.dirname(uri.fsPath);return path.join(folder,'.flowforge','history',hash(uri.fsPath).slice(0,18)+'.json')};
async function writeHistory(uri,value){const p=historyPath(uri);await fs.promises.mkdir(path.dirname(p),{recursive:true});await fs.promises.writeFile(p,serialize(value));}
async function readHistory(uri){try{return JSON.parse(await fs.promises.readFile(historyPath(uri),'utf8'))}catch{return {past:[],future:[]}}}
function rustBinary(){const specified=vscode.workspace.getConfiguration('flowforge').get('rustBinary');if(specified&&fs.existsSync(specified))return specified;const local=path.join(context.extensionPath,'rust','target','release',process.platform==='win32'?'flowforge-core.exe':'flowforge-core');return fs.existsSync(local)?local:null}
async function rustValidate(document){const exe=rustBinary();if(!exe)return null;const folder=await fs.promises.mkdtemp(path.join(os.tmpdir(),'flowforge-'));const file=path.join(folder,'validate.flow.json');try{await fs.promises.writeFile(file,serialize(document));const result=await new Promise((resolve,reject)=>cp.execFile(exe,['validate',file],{timeout:12000},(err,out,stderr)=>{try{resolve(JSON.parse(out))}catch{reject(new Error(stderr||out||err?.message||'Rust 검증 실패'))}}));return result.issues||[]}finally{await fs.promises.rm(folder,{recursive:true,force:true})}}
async function readDisk(uri){return Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8')}
async function writeSafe(uri,data,expected){const current=await readDisk(uri);if(hash(current)!==expected)throw Error('외부 파일 변경이 감지되어 덮어쓰기를 중단했습니다. Diff에서 병합하세요.');
 const folder=path.dirname(uri.fsPath),tmp=path.join(folder,'.'+path.basename(uri.fsPath)+'.'+process.pid+'.tmp');try{await fs.promises.writeFile(tmp,serialize(data));await fs.promises.rename(tmp,uri.fsPath)}finally{await fs.promises.unlink(tmp).catch(()=>{})}return hash(serialize(data))}
function updateDiagnostics(uri,issues){const d=issues.map((p,i)=>{const problem=new vscode.Diagnostic(new vscode.Range(0,0,0,1),p.message,p.severity==='error'?vscode.DiagnosticSeverity.Error:vscode.DiagnosticSeverity.Warning);problem.source='FlowForge';problem.code=p.nodeId||`issue-${i}`;return problem});diagnostics.set(uri,d)}
async function openDiagram(uri){if(!uri){const picked=await vscode.window.showOpenDialog({canSelectMany:false,filters:{'FlowForge':['json']}});if(!picked?.length)return;uri=picked[0]}const key=uri.toString();if(openPanels.has(key)){openPanels.get(key).panel.reveal();return}
 let disk=await readDisk(uri),parsed;try{parsed=JSON.parse(disk)}catch(e){return vscode.window.showErrorMessage('JSON 파싱 실패: '+e.message)}
 let norm;try{norm=model.normalize(parsed)}catch(e){return vscode.window.showErrorMessage(e.message)}
 if(norm.migrated){const pick=await vscode.window.showInformationMessage('구형 FlowForge 문서입니다. 백업한 뒤 v2로 변환할까요?',{modal:true},'변환','읽기 전용');if(!pick)return;if(pick==='변환'){const backup=uri.fsPath+'.v1-backup-'+Date.now()+'.json';await fs.promises.copyFile(uri.fsPath,backup);disk=await writeSafe(uri,norm.document,hash(disk)).then(()=>serialize(norm.document));vscode.window.showInformationMessage('기존 파일 백업: '+backup+(norm.notes.length?' · 주의: '+norm.notes.join('; '):''))}else {vscode.window.showInformationMessage('변환되지 않은 문서는 JSON 텍스트로 열립니다.');return vscode.window.showTextDocument(await vscode.workspace.openTextDocument(uri))}}
 const panel=vscode.window.createWebviewPanel('flowforgeEditor',`◇ ${path.basename(uri.fsPath)}`,vscode.ViewColumn.One,{enableScripts:true,retainContextWhenHidden:true,localResourceRoots:[vscode.Uri.joinPath(context.extensionUri,'media'),vscode.Uri.joinPath(context.extensionUri,'core')]});const entry={panel,uri,base:JSON.parse(disk),diskHash:hash(disk),dirty:false,history:await readHistory(uri)};openPanels.set(key,entry);await rememberRecent(uri);
 panel.onDidDispose(()=>{entry.canvasFocused=false;setCanvasFocus(entry,false);openPanels.delete(key);watcher.dispose();sub.dispose()});
 panel.onDidChangeViewState(()=>{if(!panel.active){entry.canvasFocused=false;setCanvasFocus(entry,false)}else if(entry.canvasFocused)setCanvasFocus(entry,true)});
 const nonce=crypto.randomBytes(18).toString('hex'),source=f=>panel.webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri,'media',f));
 panel.webview.html=`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${panel.webview.cspSource}; script-src 'nonce-${nonce}';"><link rel="stylesheet" href="${source('editor.css')}"></head><body><div id="app"></div><script nonce="${nonce}" src="${source('model.js')}"></script><script nonce="${nonce}" src="${panel.webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri,'core','features.js'))}"></script><script nonce="${nonce}" src="${source('editor.js')}"></script></body></html>`;
 const send=(type,payload={})=>panel.webview.postMessage({type,...payload});
 panel.webview.onDidReceiveMessage(async msg=>{try{
  if(msg.type==='canvasFocus'){entry.canvasFocused=Boolean(msg.focused);setCanvasFocus(entry,entry.canvasFocused);return;}
  if(msg.type==='ready'){await settingsReady;send('load',{document:entry.base,history:entry.history,filename:path.basename(uri.fsPath),settings:publicSettings(),gridMode:appSettings.grid.mode,gridStyle:appSettings.grid.style,theme:appSettings.appearance.theme,subflows:await loadSubflows(uri,entry.base)});sourceStatuses(entry)}
  if(msg.type==='comparePick'){
   const choice=await vscode.window.showQuickPick([{label:'다른 .flow.json 파일과 비교',value:'file'},{label:'Git 커밋과 비교',value:'git'},{label:'수동 스냅샷과 비교',value:'snapshot'},{label:'현재 버전의 수동 스냅샷 저장',value:'saveSnapshot'}],{placeHolder:'로직 비교 기준 선택'});
   if(!choice)return;
   const current=entry.live||entry.base;
   const snapshotsPath=path.join(path.dirname(uri.fsPath),'.flowforge','snapshots');
   if(choice.value==='saveSnapshot'){
    await fs.promises.mkdir(snapshotsPath,{recursive:true});
    const name=path.basename(uri.fsPath)+'-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';
    await fs.promises.writeFile(path.join(snapshotsPath,name),JSON.stringify(current,null,2),'utf8');
    send('notice',{message:'수동 스냅샷 저장: '+name});return;
   }
   let previous,sourceName;
   if(choice.value==='file'){
    const picks=await vscode.window.showOpenDialog({canSelectMany:false,filters:{'FlowForge JSON':['json']}});if(!picks?.length)return;
    previous=JSON.parse(await readDisk(picks[0]));sourceName=picks[0].fsPath;
   }else if(choice.value==='snapshot'){
    const names=(await fs.promises.readdir(snapshotsPath).catch(()=>[])).filter(x=>x.startsWith(path.basename(uri.fsPath)+'-')&&x.endsWith('.json'));
    if(!names.length){send('notice',{message:'저장된 수동 스냅샷이 없습니다.'});return;}
    const selected=await vscode.window.showQuickPick(names.sort().reverse());if(!selected)return;
    previous=JSON.parse(await fs.promises.readFile(path.join(snapshotsPath,selected),'utf8'));sourceName=selected;
   }else{
    const cp=require('child_process');const exec=(args)=>new Promise((resolve,reject)=>cp.execFile('git',args,{cwd:path.dirname(uri.fsPath),maxBuffer:4*1024*1024},(err,stdout)=>err?reject(err):resolve(stdout)));
    const relative=path.relative(await exec(['rev-parse','--show-toplevel']).then(x=>x.trim()),uri.fsPath).replace(/\\/g,'/');
    const revisions=(await exec(['log','-n','30','--format=%h %s','--',relative])).split('\n').filter(Boolean);
    if(!revisions.length){send('notice',{message:'사용할 Git 이력이 없습니다.'});return;}
    const picked=await vscode.window.showQuickPick(revisions);if(!picked)return;
    const revision=picked.split(' ')[0];previous=JSON.parse(await exec(['show',revision+':'+relative]));sourceName='Git '+revision;
   }
   send('compareResult',{left:previous,right:current,source:sourceName});
  }
  if(msg.type==='openGridSettings'||msg.type==='openVSCodeSettings'){await vscode.commands.executeCommand('workbench.action.openSettings','@ext:local-dev.flowforge-rust');return;}
  if(msg.type==='openKeybindings'){await vscode.commands.executeCommand('workbench.action.openGlobalKeybindings','FlowForge');return;}
  if(msg.type==='updateThemeSetting'){if(['dark','midnight','light','vscode'].includes(msg.theme)){appSettings.appearance.theme=msg.theme;await saveAppSettings();for(const e of openPanels.values())e.panel.webview.postMessage({type:'themeConfig',theme:msg.theme})}return;}
  if(msg.type==='updateGridSettings'){if(['auto','on','off'].includes(msg.mode))appSettings.grid.mode=msg.mode;if(['dots','lines'].includes(msg.style))appSettings.grid.style=msg.style;await saveAppSettings();for(const e of openPanels.values())e.panel.webview.postMessage({type:'gridConfig',mode:appSettings.grid.mode,style:appSettings.grid.style});return;}
  if(msg.type==='updatePanelSettings'){if(msg.panel==='library'||msg.panel==='props')appSettings.panels[msg.panel==='library'?'blockLibrary':'properties']=msg.closed?'closed':'open';await saveAppSettings();return;}
  if(msg.type==='updateGeneralSettings'){mergeSettings(appSettings,msg.settings||{});await saveAppSettings();return;}
  if(msg.type==='dirty'){entry.dirty=msg.dirty;entry.live=msg.document;entry.history=msg.history||entry.history;await writeHistory(uri,entry.history)}
  if(msg.type==='save'){const issues=model.problems(msg.document).filter(p=>p.severity==='error'&&/(ID|포트|간선|레이아웃|자료형|겹침)/.test(p.message));if(issues.length){send('notice',{message:'저장할 수 없는 구조 오류: '+issues[0].message});return}try{const h=await writeSafe(uri,msg.document,entry.diskHash);entry.diskHash=h;entry.base=model.clone(msg.document);entry.dirty=false;entry.live=null;entry.history=msg.history;await writeHistory(uri,entry.history);send('saved',{document:entry.base});sourceStatuses(entry)}catch(e){const latest=await readDisk(uri);send('conflict',{base:entry.base,remote:JSON.parse(latest),local:msg.document,message:e.message})}}
  if(msg.type==='validate'){const issues=model.problems(msg.document);let rustUsed=false;try{const extra=await rustValidate(msg.document);if(extra){rustUsed=true;for(const p of extra)if(!issues.some(q=>q.message===p.message&&q.nodeId===p.nodeId))issues.push(p)}}catch(e){send('notice',{message:'Rust 검증 실행 실패 · JavaScript 검증 사용: '+e.message})}updateDiagnostics(uri,issues);send('validated',{issues,rustUsed});vscode.window.showInformationMessage(`FlowForge 검증: 오류 ${issues.filter(i=>i.severity==='error').length}, 경고 ${issues.filter(i=>i.severity==='warning').length}`)}
  if(msg.type==='merge'){const result=model.threeWay(msg.base,msg.local,msg.remote,msg.choices);send('merged',{document:result.merged,conflicts:result.conflicts});entry.base=model.clone(msg.remote);entry.diskHash=hash(await readDisk(uri));entry.dirty=true}
  if(msg.type==='openSource'){const binding=msg.binding||{};if(!binding.file)return;const target=vscode.Uri.file(path.resolve(path.dirname(uri.fsPath),binding.file));const doc=await vscode.workspace.openTextDocument(target);const editor=await vscode.window.showTextDocument(doc,{viewColumn:vscode.ViewColumn.Beside,preview:false});let line=Math.max(0,(binding.range?.startLine||1)-1);if(binding.symbol){const symbols=await vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider',target);const flatten=s=>(s||[]).flatMap(o=>[o,...flatten(o.children)]);const found=flatten(symbols).find(s=>s.name===binding.symbol);if(found)line=found.range.start.line}const pos=new vscode.Position(Math.min(line,doc.lineCount-1),0);editor.selection=new vscode.Selection(pos,pos);editor.revealRange(new vscode.Range(pos,pos),vscode.TextEditorRevealType.InCenter)}
  if(msg.type==='linkSource'){const ed=vscode.window.visibleTextEditors.find(e=>e.document.uri.toString()!==uri.toString());if(!ed){send('notice',{message:'연결할 소스 파일을 옆 편집기에 열고 범위를 선택하세요.'});return}const rel=path.relative(path.dirname(uri.fsPath),ed.document.uri.fsPath).replace(/\\/g,'/');const range=ed.selection.isEmpty?undefined:{startLine:ed.selection.start.line+1,endLine:ed.selection.end.line+1};const text=range?ed.document.getText(ed.selection):ed.document.getText();let symbol=msg.symbol||'';try{const symbols=await vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider',ed.document.uri);const flatten=a=>(a||[]).flatMap(x=>[x,...flatten(x.children)]);const current=flatten(symbols).filter(x=>x.range.contains(ed.selection.active)).sort((a,b)=>(a.range.end.line-a.range.start.line)-(b.range.end.line-b.range.start.line));if(current.length)symbol=current[0].name}catch{}send('sourceLinked',{nodeId:msg.nodeId,binding:{file:rel,language:ed.document.languageId,range,symbol,digest:hash(text)}})}
  if(msg.type==='openSubflow'){const rel=msg.file;if(!rel)return;await openDiagram(vscode.Uri.file(path.resolve(path.dirname(uri.fsPath),rel)))}
  if(msg.type==='createSubflow'){const file=msg.file||'subflow.flow.json';const dst=vscode.Uri.file(path.resolve(path.dirname(uri.fsPath),file));if(fs.existsSync(dst.fsPath)){send('notice',{message:'하위 차트 파일이 이미 있습니다'});return}const d=model.empty();model.addNode(d,'start',4,4);model.addNode(d,'end',4,12);await vscode.workspace.fs.writeFile(dst,Buffer.from(serialize(d)));send('subflowCreated',{nodeId:msg.nodeId,file,document:d});await openDiagram(dst)}
  if(msg.type==='showText'){await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(uri),{viewColumn:vscode.ViewColumn.Beside,preview:false})}
 }catch(e){send('notice',{message:e.message||String(e)})}});
 let watchTimer;const checkExternal=async()=>{clearTimeout(watchTimer);watchTimer=setTimeout(async()=>{try{const text=await readDisk(uri),h=hash(text);if(h===entry.diskHash)return;const remote=JSON.parse(text);if(entry.dirty)send('conflict',{base:entry.base,remote,local:entry.live||entry.base,message:'외부 파일 변경'});else{entry.diskHash=h;entry.base=remote;send('reload',{document:remote})}}catch(e){send('notice',{message:'외부 파일을 읽을 수 없습니다: '+e.message})}},180)};
 const watcher=vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(path.dirname(uri.fsPath),path.basename(uri.fsPath)));watcher.onDidChange(checkExternal);watcher.onDidCreate(checkExternal);
 const sub=vscode.workspace.onDidChangeTextDocument(e=>{if(e.document.uri.toString()===uri.toString())checkExternal()});
 return panel;}
async function newDiagram(){const root=vscode.workspace.workspaceFolders?.[0]?.uri,uri=await vscode.window.showSaveDialog({defaultUri:root?vscode.Uri.joinPath(root,'new-logic.flow.json'):undefined,filters:{'FlowForge':['json']}});if(!uri)return;const out=uri.fsPath.endsWith('.flow.json')?uri:vscode.Uri.file(uri.fsPath.replace(/\.json$/,'')+'.flow.json');if(fs.existsSync(out.fsPath)){vscode.window.showWarningMessage('파일이 존재합니다. 기존 파일을 열어주세요.');return}const d=model.empty();const a=model.addNode(d,'start',4,4),b=model.addNode(d,'process',4,12),c=model.addNode(d,'end',4,20);d.edges.push({id:model.uid('e'),kind:'flow',source:{nodeId:a.id,portId:'next'},target:{nodeId:b.id,portId:'in'}},{id:model.uid('e'),kind:'flow',source:{nodeId:b.id,portId:'next'},target:{nodeId:c.id,portId:'in'}});await vscode.workspace.fs.writeFile(out,Buffer.from(serialize(d)));await openDiagram(out)}
async function linkFromCode(){const source=vscode.window.activeTextEditor;if(!source||source.document.uri.fsPath.endsWith('.flow.json'))return vscode.window.showWarningMessage('소스코드 편집기에서 실행하세요.');const candidates=[...openPanels.values()];if(!candidates.length)return vscode.window.showWarningMessage('먼저 FlowForge 문서를 열어주세요.');const selected=await vscode.window.showQuickPick(candidates.flatMap(entry=>entry.base.nodes.map(n=>({label:n.title,description:path.basename(entry.uri.fsPath),nodeId:n.id,entry}))));if(!selected)return;selected.entry.panel.reveal(vscode.ViewColumn.One);selected.entry.panel.webview.postMessage({type:'requestSourceLink',nodeId:selected.nodeId,source:{file:path.relative(path.dirname(selected.entry.uri.fsPath),source.document.uri.fsPath).replace(/\\/g,'/'),language:source.document.languageId,range:{startLine:source.selection.start.line+1,endLine:source.selection.end.line+1},digest:hash(source.document.getText(source.selection))}})}
function activate(ctx){context=ctx;settingsReady=loadAppSettings();vscode.commands.executeCommand('setContext','flowforge.canvasFocus',false);for(const [key] of [['undo'],['redo'],['selectAll'],['copy'],['paste'],['duplicate'],['group'],['ungroup'],['delete'],['save'],['fit'],['escape'],['toggleLock']]){ctx.subscriptions.push(vscode.commands.registerCommand('flowforge.canvas.'+key,()=>{const entry=focusedCanvas;if(!entry||!entry.canvasFocused||!entry.panel.active)return;entry.panel.webview.postMessage({type:'canvasCommand',command:key});}));}ctx.subscriptions.push(vscode.window.onDidChangeActiveColorTheme(()=>{for(const entry of openPanels.values()){const c=vscode.workspace.getConfiguration('flowforge',entry.uri);if(c.get('theme','dark')==='vscode')entry.panel.webview.postMessage({type:'themeConfig',theme:'vscode'});}}));ctx.subscriptions.push(vscode.workspace.onDidSaveTextDocument(doc=>{for(const entry of openPanels.values())if(Object.values(entry.live?.bindings||entry.base?.bindings||{}).some(b=>b?.file&&path.resolve(path.dirname(entry.uri.fsPath),b.file)===doc.uri.fsPath))sourceStatuses(entry)}));diagnostics=vscode.languages.createDiagnosticCollection('FlowForge');ctx.subscriptions.push(diagnostics);recentProvider=new RecentFlowFilesProvider();ctx.subscriptions.push(recentProvider.emitter);ctx.subscriptions.push(vscode.window.registerTreeDataProvider('flowforge.diagrams',recentProvider));
 ctx.subscriptions.push(vscode.commands.registerCommand('flowforge.openRecentItem',uri=>openDiagram(uri)));
 ctx.subscriptions.push(vscode.commands.registerCommand('flowforge.openRecent',async()=>{await settingsReady;const paths=appSettings.recentFiles||[],items=[];for(const p of paths){try{await fs.promises.access(p);items.push({label:path.basename(p),description:p,uri:vscode.Uri.file(p)})}catch{}}if(!items.length)return vscode.window.showInformationMessage('최근 플로우차트가 없습니다.');const pick=await vscode.window.showQuickPick(items,{placeHolder:'최근 작업한 플로우차트 선택'});if(pick)openDiagram(pick.uri)}));for(const [cmd,fn] of [['flowforge.new',newDiagram],['flowforge.open',openDiagram],['flowforge.linkSource',linkFromCode],['flowforge.validate',async()=>{const ed=vscode.window.activeTextEditor;if(ed?.document.uri.fsPath.endsWith('.flow.json')){const problems=model.problems(model.normalize(JSON.parse(ed.document.getText())).document);updateDiagnostics(ed.document.uri,problems);vscode.window.showInformationMessage(`검증: ${problems.length}건`)}else vscode.window.showInformationMessage('FlowForge 편집기 상단의 검증 버튼을 사용하세요.')}]] )ctx.subscriptions.push(vscode.commands.registerCommand(cmd,fn));}
module.exports={activate,deactivate(){}};
