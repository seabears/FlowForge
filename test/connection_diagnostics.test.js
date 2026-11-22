'use strict';
const fs=require('fs'),assert=require('assert'),path=require('path');
const js=fs.readFileSync(path.join(__dirname,'../media/editor.js'),'utf8');
for(const phrase of [
 'function connectionFailureReason(',
 '같은 블록의 포트끼리는 직접 연결할 수 없습니다.',
 '입력 포트끼리는 연결할 수 없습니다.',
 '출력 포트에서 입력 포트로 연결하세요.',
 'Flow 포트끼리 또는 Data 포트끼리 연결하세요.',
 '자료형 변환 블록을 사용하세요.',
 '이미 연결된 포트입니다.',
 '대상 블록의 입력 포트 위에서 마우스를 놓으세요.',
 'data-connect-reason'
]) assert(js.includes(phrase),'missing diagnostic: '+phrase);
console.log('FlowForge connection diagnostic tests passed');
