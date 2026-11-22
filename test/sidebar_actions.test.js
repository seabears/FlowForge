'use strict';
const fs=require('fs'),assert=require('assert'),path=require('path');
const ext=fs.readFileSync(path.join(__dirname,'../extension.js'),'utf8');
const pkg=JSON.parse(fs.readFileSync(path.join(__dirname,'../package.json'),'utf8'));
for(const label of ['새 차트 만들기','기존 차트 열기','최근 차트 열기']) assert(ext.includes(label),'missing sidebar action '+label);
for(const cmd of ['flowforge.new','flowforge.open','flowforge.openRecent']) assert(ext.includes("command:'"+cmd+"'"),'missing command '+cmd);
assert(pkg.contributes.viewsWelcome[0].contents.includes('[최근 차트 열기]'));
console.log('FlowForge sidebar actions tests passed');
