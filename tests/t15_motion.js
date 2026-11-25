#!/usr/bin/env node
'use strict';
// Проверка настоящих обработчиков жестов с управляемыми кадрами и событиями.
const assert=require('assert'), fs=require('fs'), vm=require('vm');
const html=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
const script=html.match(/<script>\n([\s\S]*?)<\/script>/)[1].split('/* ============ start ============ */')[0];
let nodes=new Map(), timers=new Map(), frames=new Map(), id=0, hit=null, reduced=false, animations=[], ghost=null;
function element(){
  const classes=new Set(), listeners={};
  const e={style:{},dataset:{},attributes:{},value:'',innerHTML:'',offsetWidth:320,isConnected:true,
    classList:{add(...c){c.forEach(x=>classes.add(x));},remove(...c){c.forEach(x=>classes.delete(x));},contains:c=>classes.has(c),toggle(c,v){if(v==null)v=!classes.has(c);v?classes.add(c):classes.delete(c);}},
    addEventListener(type,fn){(listeners[type]||(listeners[type]=[])).push(fn);},removeEventListener(type,fn){listeners[type]=(listeners[type]||[]).filter(x=>x!==fn);},
    fire(type,event={}){for(const fn of [...(listeners[type]||[])])fn(event);},
    setAttribute(k,v){this.attributes[k]=v;},removeAttribute(k){delete this.attributes[k];},hasAttribute(k){return k in this.attributes;},
    querySelector:select,querySelectorAll(){return [];},matches(s){return s==='.cell'&&this.isCell;},closest(){return this.row||null;},contains(){return false;},
    appendChild(child){if(child.className==='drag-ghost')ghost=child;},remove(){this.isConnected=false;},focus(){},blur(){},getClientRects(){return [{}];},
    setPointerCapture(pointer){this.capture=pointer;},hasPointerCapture(pointer){return this.capture===pointer;},releasePointerCapture(){this.capture=null;},
    animate(keyframes,options){
      let resolve,reject;const finished=new Promise((a,b)=>{resolve=a;reject=b;});
      const a={keyframes,options,finished,resolve,cancel(){a.cancelled=true;reject(new Error('cancelled'));}};animations.push(a);return a;
    }
  };return e;
}
function select(s){if(!nodes.has(s))nodes.set(s,element());return nodes.get(s);}
const body=element(), document=element();
Object.assign(document,{body,documentElement:{outerHTML:'<html></html>'},activeElement:null,visibilityState:'visible',
  getElementById(id){return id==='seed'?{textContent:'{"v":1,"settings":{},"weeks":{},"events":[]}'}:select('#'+id);},
  createElement(){const el=element();el.firstElementChild=element();return el;},elementFromPoint(x,y){return typeof hit==='function'?hit(x,y):hit;}});
const context={console,document,navigator:{userAgent:'',platform:'',maxTouchPoints:0},location:{protocol:'file:'},
  localStorage:{getItem(){return null;},setItem(){},removeItem(){}},sessionStorage:{getItem(){return null;},setItem(){},removeItem(){}},
  matchMedia:q=>({matches:q==='(prefers-reduced-motion:reduce)'&&reduced}),
  setTimeout(fn,ms){const n=++id;timers.set(n,{fn,ms});return n;},clearTimeout:n=>timers.delete(n),setInterval(){},clearInterval(){},
  requestAnimationFrame(fn){const n=++id;frames.set(n,fn);return n;},cancelAnimationFrame:n=>frames.delete(n),
  addEventListener(){},scrollY:0,innerHeight:600,scrollTo(){},scrollBy({top}){context.scrollY=Math.max(0,Math.min(2000,context.scrollY+top));},
  confirm(){return false;},alert(){},Date,Math,JSON,String,Number,Object,Array,Set,Map,RegExp,Error,Promise,Uint8Array,ArrayBuffer,TextDecoder,TextEncoder,
  Blob:class {},URL:{createObjectURL(){return '';},revokeObjectURL(){}}
};context.window=context;
vm.runInNewContext(script+'\nglobalThis.app={bindTimeMove,bindRowSwipe,dragScrollDelta,enterMotion,modal,setState:x=>{S=x;dirty();},cancelGesture:()=>{if(cancelTimeGesture)cancelTimeGesture();},setView:()=>Object.assign(V,{week:"2026-11-23",day:0,view:"week"})};',context);
const app=context.app, week='2026-11-23';let passed=0;
function fixture(){
  app.cancelGesture();nodes=new Map();timers.clear();frames.clear();animations=[];ghost=null;hit=null;reduced=false;context.scrollY=0;document.activeElement=null;
  const state={settings:{days:6,from:9,to:12,template:[]},events:[],weeks:{[week]:{d:{0:{'10:00':'Аня'}},calc:[]}}};app.setState(state);app.setView();
  const row=element(), input=element(), slider=element();
  input.isCell=true;input.value='Аня';input.dataset={i:'0',t:'10:00',filled:''};input.setAttribute('data-filled','');input.row=row;
  row.querySelector=s=>s==='.cell'?input:s==='.rin'?slider:select(s);
  return {state,row,input,slider,before:JSON.stringify(state)};
}
function pointer(input,x=100,y=300){return {target:input,button:0,isPrimary:true,pointerType:'touch',pointerId:1,clientX:x,clientY:y,cancelable:true,preventDefault(){},stopPropagation(){}};}
function hold(){const timer=[...timers.entries()].find(([,t])=>t.ms===400);assert.ok(timer,'hold timer exists');timers.delete(timer[0]);timer[1].fn();}
function frame(time=16){const batch=[...frames.values()];frames.clear();batch.forEach(fn=>fn(time));}
function target(t){const cell=element();cell.isCell=true;cell.dataset={i:'0',t};return cell;}
function test(name,fn){fn();passed++;console.log('✓ '+name);}
test('короткое нажатие не запускает перенос и не меняет данные',()=>{
  const f=fixture();app.bindTimeMove(f.input,week);f.input.fire('pointerdown',pointer(f.input));f.input.fire('pointerup',pointer(f.input));
  assert.equal(ghost,null);assert.equal(frames.size,0);assert.equal(JSON.stringify(f.state),f.before);
});
for(const time of ['09:00','11:00'])test('удержание переносит запись на '+time+' один раз',()=>{
  const f=fixture();app.bindTimeMove(f.input,week);f.input.fire('pointerdown',pointer(f.input));hold();
  assert.equal(JSON.stringify(f.state),f.before);const cell=target(time);hit=cell;
  const p=pointer(f.input,100,time==='09:00'?200:400);f.input.fire('pointermove',p);frame();assert.ok(cell.classList.contains('move-target'));
  f.input.fire('pointerup',p);f.input.fire('pointerup',p);
  assert.equal(f.state.weeks[week].d[0][time],'Аня');assert.ok(!f.state.weeks[week].d[0]['10:00']);
  assert.equal(Object.values(f.state.weeks[week].d[0]).filter(x=>x==='Аня').length,1);assert.equal(frames.size,0);assert.equal(ghost.isConnected,false);
});
test('отпускание до следующего кадра использует точный слот под пальцем',()=>{
  const f=fixture();app.bindTimeMove(f.input,week);f.input.fire('pointerdown',pointer(f.input));hold();hit=target('09:00');
  f.input.fire('pointerup',pointer(f.input,100,200));assert.equal(f.state.weeks[week].d[0]['09:00'],'Аня');assert.equal(frames.size,0);
});
test('занятый слот защищён от перезаписи',()=>{
  const f=fixture();f.state.weeks[week].d[0]['09:00']='Боря';const before=JSON.stringify(f.state);
  app.bindTimeMove(f.input,week);f.input.fire('pointerdown',pointer(f.input));hold();hit=target('09:00');
  f.input.fire('pointermove',pointer(f.input,100,200));frame();assert.ok(hit.classList.contains('move-blocked'));
  f.input.fire('pointerup',pointer(f.input,100,200));assert.equal(JSON.stringify(f.state),before);
});
for(const type of ['pointercancel','lostpointercapture'])test(type+' отменяет перенос и очищает кадры',()=>{
  const f=fixture();app.bindTimeMove(f.input,week);f.input.fire('pointerdown',pointer(f.input));hold();hit=target('09:00');
  f.input.fire('pointermove',pointer(f.input,100,200));frame();f.input.fire(type,pointer(f.input));
  assert.equal(JSON.stringify(f.state),f.before);assert.equal(frames.size,0);assert.equal(f.row._dragActive,false);assert.equal(f.input.capture,null);assert.equal(ghost.isConnected,false);
});
test('прокрутка до удержания отменяет ожидание переноса',()=>{
  const f=fixture();context.scrollY=200;app.bindTimeMove(f.input,week);f.input.fire('pointerdown',pointer(f.input));f.input.fire('pointermove',pointer(f.input,100,250));
  assert.ok(context.scrollY>200);assert.ok(![...timers.values()].some(t=>t.ms===400));assert.equal(ghost,null);f.input.fire('pointerup',pointer(f.input));assert.equal(JSON.stringify(f.state),f.before);
});
test('потеря указателя до удержания не оставляет отложенный перенос',()=>{
  const f=fixture();app.bindTimeMove(f.input,week);f.input.fire('pointerdown',pointer(f.input));f.input.fire('lostpointercapture',pointer(f.input));
  assert.ok(![...timers.values()].some(t=>t.ms===400));assert.equal(ghost,null);assert.equal(JSON.stringify(f.state),f.before);
});
test('горизонтальный свайп не прокручивает экран',()=>{
  const f=fixture();context.scrollY=200;app.bindTimeMove(f.input,week);f.input.fire('pointerdown',pointer(f.input));f.input.fire('pointermove',pointer(f.input,20,302));
  assert.equal(context.scrollY,200);assert.equal(ghost,null);app.cancelGesture();
});
for(const y of [5,595])test('автопрокрутка у края '+y+' работает без новых движений пальца',()=>{
  const f=fixture();context.scrollY=500;app.bindTimeMove(f.input,week);f.input.fire('pointerdown',pointer(f.input));hold();
  for(let i=0;i<10;i++)f.input.fire('pointermove',pointer(f.input,100,y));assert.equal(frames.size,1);
  frame(16);const first=context.scrollY;frame(32);assert.ok(y<300?context.scrollY<first:context.scrollY>first);
  f.input.fire('pointercancel',pointer(f.input));assert.equal(frames.size,0);assert.equal(JSON.stringify(f.state),f.before);
});
test('скорость автопрокрутки зависит от расстояния, ограничена после задержки',()=>{
  assert.equal(app.dragScrollDelta(300,600,16),0);assert.ok(app.dragScrollDelta(20,600,16)<0);
  assert.ok(app.dragScrollDelta(580,600,16)>0);assert.ok(Math.abs(app.dragScrollDelta(0,600,10000))<16);
});
test('системное меню блокируется и для пустого значения атрибута data-filled',()=>{
  const f=fixture();app.bindTimeMove(f.input,week);let blocked=false;f.input.fire('contextmenu',{preventDefault(){blocked=true;}});assert.ok(blocked);
});
function touch(x,y=300){return {touches:[{clientX:x,clientY:y}],cancelable:true,preventDefault(){},stopPropagation(){},target:{closest(){return null;}}};}
test('touchcancel после полного свайпа не удаляет запись',()=>{
  const f=fixture();app.bindRowSwipe(f.row);f.row.fire('touchstart',touch(300));f.row.fire('touchmove',touch(20));assert.ok(f.row.classList.contains('full'));
  f.row.fire('touchcancel');f.row.fire('touchend',touch(20));assert.equal(JSON.stringify(f.state),f.before);assert.equal(f.slider.style.transform,'');assert.ok(!f.row.classList.contains('full'));
});
test('второе касание сбрасывает незавершённый свайп без зависшего сдвига',()=>{
  const f=fixture();app.bindRowSwipe(f.row);f.row.fire('touchstart',touch(300));f.row.fire('touchmove',touch(20));
  const second=touch(20);second.touches.push({clientX:100,clientY:300});f.row.fire('touchstart',second);
  assert.equal(f.slider.style.transform,'');assert.ok(!f.row.classList.contains('drag'));assert.equal(JSON.stringify(f.state),f.before);
});
test('полный завершённый свайп удаляет с рабочей отменой',()=>{
  const f=fixture();app.bindRowSwipe(f.row);f.row.fire('touchstart',touch(300));f.row.fire('touchmove',touch(20));f.row.fire('touchend',touch(20));
  assert.ok(!f.state.weeks[week] || !f.state.weeks[week].d[0]['10:00']);select('.toast-action').onclick();assert.equal(f.state.weeks[week].d[0]['10:00'],'Аня');
});
test('удержание отдаёт жест переносу и отключает удаление',()=>{
  const f=fixture();app.bindTimeMove(f.input,week);app.bindRowSwipe(f.row);
  f.input.fire('pointerdown',pointer(f.input));f.row.fire('touchstart',touch(300));hold();f.row.fire('touchmove',touch(20));
  f.input.fire('pointercancel',pointer(f.input));f.row.fire('touchend',touch(20));assert.equal(JSON.stringify(f.state),f.before);
});
test('второй палец отменяет перенос без записи данных',()=>{
  const f=fixture();app.bindTimeMove(f.input,week);f.input.fire('pointerdown',pointer(f.input));hold();document.fire('pointerdown',{pointerType:'touch',isPrimary:false});
  assert.equal(frames.size,0);assert.equal(ghost.isConnected,false);assert.equal(JSON.stringify(f.state),f.before);
});
(async()=>{
  fixture();const panel=element();app.enterMotion(panel,1);const first=animations[0];app.enterMotion(panel,-1);assert.ok(first.cancelled);assert.equal(panel._motion,animations[1]);
  reduced=true;app.enterMotion(panel);assert.ok(animations[1].cancelled);assert.equal(panel._motion,null);assert.equal(animations.length,2);
  passed++;console.log('✓ быстрое переключение отменяет прошлую анимацию, уменьшение движения отключает новую');
  fixture();body.style.overflow='auto';const m=app.modal('Карточка',560,{sheet:true});assert.equal(body.style.overflow,'hidden');m.close(true);
  const fallback=[...timers.values()].find(t=>t.ms===230);assert.ok(fallback);fallback.fn();m.close();assert.equal(body.style.overflow,'auto');
  animations.forEach(a=>a.resolve());await Promise.resolve();await Promise.resolve();assert.equal(body.style.overflow,'auto');
  passed++;console.log('✓ незавершённая анимация закрытия освобождает прокрутку по резервному таймеру');
  fixture();reduced=true;body.style.overflow='auto';const simple=app.modal('Карточка',560,{sheet:true});simple.close(true);assert.equal(body.style.overflow,'auto');assert.equal(animations.length,0);
  passed++;console.log('✓ закрытие с уменьшением движения происходит сразу');
  console.log('\n'+passed+' проверок жестов и анимаций пройдено');
})().catch(e=>{console.error(e);process.exitCode=1;});
