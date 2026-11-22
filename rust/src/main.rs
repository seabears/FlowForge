use serde_json::{Value,json};
use std::{env,fs};
fn str_field<'a>(v:&'a Value,key:&str)->&'a str { v.get(key).and_then(Value::as_str).unwrap_or("") }
fn check(doc:&Value)->Vec<Value>{
 let mut out=Vec::new();let nodes=match doc.get("nodes").and_then(Value::as_array){Some(x)=>x,None=>return vec![json!({"severity":"error","message":"nodes 배열 없음"})]};
 let edges=match doc.get("edges").and_then(Value::as_array){Some(x)=>x,None=>return vec![json!({"severity":"error","message":"edges 배열 없음"})]};
 let mut ids=std::collections::HashSet::new();
 for n in nodes {let id=str_field(n,"id"); if id.is_empty()||!ids.insert(id.to_string()){out.push(json!({"severity":"error","message":format!("중복/빈 노드 ID: {id}"),"nodeId":id}));}
 let layout=&doc["layout"]["nodes"][id];if layout.is_null(){out.push(json!({"severity":"error","message":"레이아웃 누락","nodeId":id}));}else {for key in ["x","y","w","h"]{if layout[key].as_i64().is_none(){out.push(json!({"severity":"error","message":format!("잘못된 격자 값: {key}"),"nodeId":id}));}}}
 let mut ports=std::collections::HashSet::new();for p in n["ports"].as_array().into_iter().flatten(){let pid=str_field(p,"id");if !ports.insert(pid.to_string()){out.push(json!({"severity":"error","message":format!("포트 중복: {pid}"),"nodeId":id}));}}
 }
 for e in edges {let (src,dst)=(&e["source"],&e["target"]);let a=str_field(src,"nodeId");let b=str_field(dst,"nodeId");if !ids.contains(a)||!ids.contains(b){out.push(json!({"severity":"error","message":format!("연결 {}: 노드 참조 오류",str_field(e,"id"))}));continue}
 let na=nodes.iter().find(|n|str_field(n,"id")==a).unwrap();let nb=nodes.iter().find(|n|str_field(n,"id")==b).unwrap();let pa=na["ports"].as_array().and_then(|p|p.iter().find(|p|str_field(p,"id")==str_field(src,"portId")));let pb=nb["ports"].as_array().and_then(|p|p.iter().find(|p|str_field(p,"id")==str_field(dst,"portId")));match(pa,pb){(Some(x),Some(y))=>{if str_field(x,"direction")!="output"||str_field(y,"direction")!="input"||str_field(x,"kind")!=str_field(y,"kind")||str_field(x,"kind")!=str_field(e,"kind"){out.push(json!({"severity":"error","message":"포트 방향/종류 오류","nodeId":a}));}if str_field(e,"kind")=="data"&&str_field(x,"dataType")!=str_field(y,"dataType"){out.push(json!({"severity":"error","message":"Data 자료형 불일치","nodeId":b}));}},_=>out.push(json!({"severity":"error","message":"연결이 존재하지 않는 포트를 참조","nodeId":a}))};}
 out
}
fn main(){let args:Vec<String>=env::args().collect();if args.len()<3{eprintln!("usage: flowforge-core validate FILE");std::process::exit(2)}let text=match fs::read_to_string(&args[2]){Ok(t)=>t,Err(e)=>{eprintln!("{e}");std::process::exit(2)}};let doc:Value=match serde_json::from_str(&text){Ok(d)=>d,Err(e)=>{eprintln!("{e}");std::process::exit(2)}};match args[1].as_str(){"validate"=>{let errors=check(&doc);println!("{}",serde_json::to_string_pretty(&json!({"ok":errors.iter().all(|e|e["severity"]!="error"),"issues":errors})).unwrap());if errors.iter().any(|e|e["severity"]=="error"){std::process::exit(1)}},_=>{eprintln!("unknown command");std::process::exit(2)}}}
