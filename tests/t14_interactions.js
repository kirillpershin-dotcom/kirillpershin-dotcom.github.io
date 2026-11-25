#!/usr/bin/env node
'use strict';

// Проверка критичных правил обновления 2026-11-23.1 без браузера.
// Запуск: node tests/t14_interactions.js
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
const script = html.match(/<script>\n([\s\S]*?)<\/script>/)[1].split('/* ============ start ============ */')[0];
const empty = { addEventListener(){}, appendChild(){}, remove(){}, classList:{add(){},remove(){},toggle(){}}, style:{}, querySelector(){ return empty; }, querySelectorAll(){ return []; } };
const document = {
  documentElement:{outerHTML:'<html></html>'}, body:empty,
  getElementById(id){ return id === 'seed' ? {textContent:'{"v":1,"settings":{},"weeks":{},"events":[]}'} : empty; },
  querySelector(){ return empty; }, querySelectorAll(){ return []; }, addEventListener(){}, createElement(){ return Object.assign({}, empty); },
  elementFromPoint(){ return null; }
};
const context = {
  console, document, window:null, navigator:{userAgent:'',platform:'',maxTouchPoints:0}, location:{protocol:'file:'},
  localStorage:{getItem(){return null;},setItem(){},removeItem(){}}, sessionStorage:{getItem(){return null;},setItem(){},removeItem(){}},
  matchMedia(){ return {matches:false}; }, addEventListener(){}, setTimeout(){ return 1; }, clearTimeout(){}, setInterval(){}, clearInterval(){},
  confirm(){ return false; }, alert(){}, Date, Math, JSON, String, Number, Object, Array, Set, Map, RegExp, Error, Promise,
  Uint8Array, ArrayBuffer, TextDecoder, TextEncoder, Blob:class {}, URL:{createObjectURL(){return '';},revokeObjectURL(){}}
};
context.window = context;
vm.runInNewContext(script + '\nglobalThis.__appTest={parseEntry,compile,dayFormula,calcWeek,slotMovePlan,ghFetch,kidMovePlan,openKidMove,openSend,openKid,renderWeek,V,setState:x=>{S=x;dirty();}};', context, {filename:'index.html'});
const app = context.__appTest;

let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log('✓ ' + name); };

test('курс и имя ребёнка распознаются одинаково', () => {
  assert.equal(app.parseEntry('Мирон (1/5)').key, 'мирон');
  assert.equal(app.parseEntry('1/5 Мирон').key, 'мирон');
  assert.equal(app.parseEntry('Мирон 1/5 Мирон').suffix, '1/5');
});
test('дневная формула поддерживает ставку и поправку', () => {
  assert.equal(app.dayFormula('2600*N+1000', 3), 8800);
  assert.equal(app.dayFormula('2600*(N-1)', 3), 5200);
});
test('недельный расчёт учитывает будни и субботу', () => {
  const w = {d:{0:{'09:00':'Аня'},5:{'10:00':'Боря'}},calc:[{name:'Будни',f:'100*N'},{name:'Суббота',f:'200*SB'},{name:'Итог',f:'A+B'}]};
  app.setState({settings:{template:w.calc},weeks:{},events:[]});
  const out = app.calcWeek(w);
  assert.equal(out[0].v, 100); assert.equal(out[1].v, 200); assert.equal(out[2].v, 300);
});
test('перенос не допускает потери или перезаписи занятого слота', () => {
  const w = {d:{0:{'09:00':'Аня','10:00':'Боря'},1:{'11:00':'Вера'}}};
  assert.equal(app.slotMovePlan(w,0,'09:00',0,'10:00').state, 'occupied');
  assert.equal(app.slotMovePlan(w,0,'09:00',1,'10:00').state, 'ready');
  assert.equal(app.slotMovePlan(w,0,'09:00',0,'09:00').state, 'same');
  assert.equal(app.slotMovePlan(w,0,'08:00',0,'10:00').state, 'missing');
});
test('разметка содержит прямое редактирование, кнопку карточки и перенос удержанием', () => {
  assert.ok(!/value="\$\{esc\(val\(i,t\)\)\}" autocomplete="off"\$\{val\(i,t\) \? ' readonly'/.test(html));
  assert.ok(html.includes('data-card')); assert.ok(html.includes('function bindTimeMove')); assert.ok(html.includes('const DRAG_CFG'));
  assert.ok(html.includes('homeDay')); assert.ok(html.includes('На сегодня занятия уже закончились'));
});
test('свайп удаления не отключается ожиданием долгого нажатия', () => {
  assert.ok(!html.includes('if (row._dragPointer) return;'));
  assert.ok(html.includes('if (row._dragActive){ st = null; return; }'));
});

test('выбор одного или двух дней сохраняет исходную неделю и продолжает курс', () => {
  const state = {settings:{days:6},weeks:{'2026-11-23':{d:{0:{'09:00':'Аня 3/10'},2:{'10:00':'Аня 4/10'},4:{'11:00':'Аня 5/10'}}},'2026-11-30':{d:{2:{'10:00':'Боря'},4:{'11:00':'Аня 6/10'}}}},events:[]};
  const before = JSON.stringify(state); app.setState(state);
  const one = app.kidMovePlan('аня','2026-11-23',true,new Set([0]));
  assert.equal(one.rows.length,1); assert.equal(one.rows[0].txt,'Аня 6/10');
  const two = app.kidMovePlan('аня','2026-11-23',true,new Set([0,2]));
  assert.equal(two.rows.length,2); assert.equal(two.rows[1].txt,'Аня 7/10'); assert.equal(two.rows[1].st,'conflict');
  assert.equal(app.kidMovePlan('аня','2026-11-23',true,new Set()).rows.length,0);
  assert.equal(app.kidMovePlan('аня','2026-11-23',false,new Set([0])).rows[0].txt,'Аня');
  assert.equal(JSON.stringify(state),before);
});

// Лёгкий DOM для проверки содержимого окон и их обработчиков без Safari.
const nodes = new Map();
const node = key => {
  if (!nodes.has(key)) {
    const n = {innerHTML:'',value:'',style:{},dataset:{},classList:{add(){},remove(){},toggle(){}},addEventListener(){},removeEventListener(){},appendChild(){},remove(){},focus(){},closest(){return null;},querySelector:node,querySelectorAll(){return [];}};
    n.querySelectorAll = selector => selector==='[data-kmday]' ? [...node('#kmBox').innerHTML.matchAll(/data-kmday="(\d+)"\s*(checked)?/g)].map(m=>{const cb=node('day'+m[1]);cb.dataset.kmday=m[1];cb.checked=!!m[2];return cb;}) : [];
    n.firstElementChild=n; nodes.set(key,n);
  }
  return nodes.get(key);
};
document.querySelector=node; document.createElement=()=>node('dialog'); document.removeEventListener=()=>{};
const fixture = () => ({settings:{days:6,from:9,to:12,template:[]},events:[],weeks:{'2026-11-23':{d:{0:{'09:00':'Аня'},2:{'10:00':'Аня'},4:{'11:00':'Аня'},5:{'09:00':'Боря'}},calc:[]},'2026-11-30':{d:{0:{'09:00':'Вера'}},calc:[]}}});
test('отправка предлагает детей только выбранной недели и сбрасывает устаревший выбор', () => {
  app.setState(fixture()); app.openSend({mode:'kid',week:'2026-11-23',kid:'вера'});
  assert.ok(node('#sOpts').innerHTML.includes('Аня')); assert.ok(node('#sOpts').innerHTML.includes('Боря')); assert.ok(!node('#sOpts').innerHTML.includes('Вера'));
  assert.equal(node('#sKid').value,'аня');
  node('#sNext').onclick(); assert.equal(node('#sKid').value,'вера'); assert.ok(!node('#sOpts').innerHTML.includes('Аня'));
  node('#sNext').onclick(); assert.equal(node('#sCp').disabled,true); assert.ok(node('#sOpts').innerHTML.includes('занятий нет'));
});
test('в карточке действия выше одинаково оформленных счётчиков', () => {
  app.setState(fixture()); app.openKid('аня','2026-11-23');
  const h=node('dialog').innerHTML;
  assert.ok(h.indexOf('id="kActions"')<h.indexOf('class="kstats"')); assert.ok(h.indexOf('class="kstats"')<h.indexOf('id="kProf"'));
  assert.ok(node('#kActions').innerHTML.includes('id="kMove"')); assert.ok(node('#kActions').innerHTML.includes('id="kSend"'));
});
test('суббота сворачивается на телефоне без удаления записей', () => {
  const s=fixture(); app.setState(s); Object.assign(app.V,{view:'week',week:'2026-11-23',day:0,satOpen:false});
  const before=JSON.stringify(s);
  app.renderWeek(); assert.ok(!node('#main').innerHTML.includes('data-i="5"')); assert.ok(!node('#main').innerHTML.includes('data-day="5"')); assert.ok(!node('#main').innerHTML.includes('id="wDay"')); assert.ok(!node('#main').innerHTML.includes('data-dm='));
  context.matchMedia=q=>({matches:q==='(max-width:760px)'}); app.V.day=2;
  node('#wSaturday').onclick(); assert.equal(app.V.day,5); assert.ok(node('#main').innerHTML.includes('data-i="5"')); assert.ok(node('#main').innerHTML.includes('aria-expanded="true"'));
  node('#wSaturday').onclick(); assert.equal(app.V.day,2); assert.ok(!node('#main').innerHTML.includes('data-i="5"')); assert.ok(!node('#main').innerHTML.includes('data-day="5"'));
  app.renderWeek(); assert.equal(app.V.satOpen,false);
  for (let i=0;i<10;i++) node('#wSaturday').onclick();
  assert.equal(app.V.satOpen,false); assert.equal(JSON.stringify(s),before);
  context.matchMedia=()=>({matches:false});
  node('#wSaturday').onclick(); assert.equal(app.V.day,2); assert.ok(node('#main').innerHTML.includes('data-day="5"'));
  node('#wSaturday').onclick(); assert.ok(!node('#main').innerHTML.includes('data-day="5"'));
});
test('снятие галочки переносит только выбранные дни и сохраняет результат', () => {
  const s=fixture(), saved=new Map(); app.setState(s); context.scrollTo=()=>{}; context.localStorage.setItem=(k,v)=>saved.set(k,v);
  app.openKidMove('аня','2026-11-23'); const cb=node('day2'); cb.checked=false; cb.onchange();
  assert.ok(node('#kmSum').innerHTML.includes('<b>1</b>'));
  node('#kmGo').onclick();
  assert.equal(s.weeks['2026-11-30'].d[0]['09:00'],'Вера'); // занятое время не заменяется
  assert.equal(s.weeks['2026-11-30'].d[4]['11:00'],'Аня');
  assert.ok(!s.weeks['2026-11-30'].d[2]); assert.equal(s.weeks['2026-11-23'].d[2]['10:00'],'Аня');
  const restored=JSON.parse(saved.get('kirill-schedule-app-v1')); assert.equal(restored.weeks['2026-11-30'].d[4]['11:00'],'Аня');
});

(async () => {
  let abort, timer, cleared=false;
  context.AbortController=class {constructor(){this.signal={};} abort(){abort();}};
  context.setTimeout=(fn,ms)=>{assert.equal(ms,20000);timer=fn;return 42;};
  context.clearTimeout=id=>{assert.equal(id,42);cleared=true;};
  context.fetch=()=>new Promise((resolve,reject)=>{abort=()=>reject(Object.assign(new Error('aborted'),{name:'AbortError'}));});
  const pending=app.ghFetch('https://example.invalid',{}); timer();
  await assert.rejects(pending,/20 секунд/); assert.ok(cleared);
  passed++; console.log('✓ зависший сетевой запрос завершается и освобождает таймер');
  context.fetch=async()=>({ok:true,status:200,text:async()=>'{"ok":true}'});
  const response=await app.ghFetch('https://example.invalid',{}); assert.equal((await response.json()).ok,true);
  passed++; console.log('✓ успешная синхронизация читает ответ полностью');
  console.log(`\n${passed} проверок пройдено`);
})().catch(e=>{console.error(e);process.exitCode=1;});
