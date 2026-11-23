#!/usr/bin/env node
'use strict';
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const html = fs.readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
const script = html.match(/<script>\n([\s\S]*?)<\/script>/)[1].split('/* ============ start ============ */')[0];
const empty = { addEventListener(){}, appendChild(){}, remove(){}, classList:{add(){},remove(){},toggle(){}}, style:{}, querySelector(){ return empty; }, querySelectorAll(){ return []; } };
const document = {documentElement:{outerHTML:'<html></html>'}, body:empty, getElementById(id){ return id === 'seed' ? {textContent:'{"v":1,"settings":{},"weeks":{},"events":[]}'} : empty; }, querySelector(){ return empty; }, querySelectorAll(){ return []; }, addEventListener(){}, createElement(){ return Object.assign({}, empty); }, elementFromPoint(){ return null; }};
const context = {console, document, window:null, navigator:{userAgent:'',platform:'',maxTouchPoints:0}, location:{protocol:'file:'}, localStorage:{getItem(){return null;},setItem(){},removeItem(){}}, sessionStorage:{getItem(){return null;},setItem(){},removeItem(){}}, matchMedia(){ return {matches:false}; }, addEventListener(){}, setTimeout(){ return 1; }, clearTimeout(){}, setInterval(){}, clearInterval(){}, confirm(){ return false; }, alert(){}, Date, Math, JSON, String, Number, Object, Array, Set, Map, RegExp, Error, Promise, Uint8Array, ArrayBuffer, Blob:class {}, URL:{createObjectURL(){return '';},revokeObjectURL(){}}};
context.window = context;
vm.runInNewContext(script + '\nglobalThis.__appTest={parseEntry,dayFormula,calcWeek,setState:x=>S=x};', context, {filename:'index.html'});
const app = context.__appTest; let passed = 0; const testCase = (name, fn) => { fn(); passed++; console.log('✓ ' + name); };
testCase('курс и имя ребёнка распознаются одинаково', () => { assert.equal(app.parseEntry('Мирон (1/5)').key, 'мирон'); assert.equal(app.parseEntry('1/5 Мирон').key, 'мирон'); assert.equal(app.parseEntry('Мирон 1/5 Мирон').suffix, '1/5'); });
testCase('дневная формула поддерживает ставку и поправку', () => { assert.equal(app.dayFormula('2600*N+1000', 3), 8800); assert.equal(app.dayFormula('2600*(N-1)', 3), 5200); });
testCase('недельный расчёт учитывает будни и субботу', () => { const w = {d:{0:{'09:00':'Аня'},5:{'10:00':'Боря'}},calc:[{name:'Будни',f:'100*N'},{name:'Суббота',f:'200*SB'},{name:'Итог',f:'A+B'}]}; app.setState({settings:{template:w.calc},weeks:{},events:[]}); const out = app.calcWeek(w); assert.equal(out[0].v,100); assert.equal(out[1].v,200); assert.equal(out[2].v,300); });
testCase('разметка содержит прямое редактирование, кнопку карточки и перенос удержанием', () => { assert.ok(html.includes('data-card')); assert.ok(html.includes('function bindTimeMove')); assert.ok(html.includes('homeDay')); assert.ok(html.includes('На сегодня занятия уже закончились')); });
console.log('\n' + passed + '/4 проверок пройдено');
