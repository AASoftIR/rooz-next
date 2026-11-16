// Simulates KDE 6 geometry signals: checks real anchoring, not just keywords.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../packaging/kwin/roozanchor/contents/code/main.js'), 'utf8');
function signal() {
  const listeners = [];
  return {connect(fn){listeners.push(fn)}, emit(...args){for(const fn of listeners) fn(...args)}};
}
const added=signal(), shown=signal();
function windowOf(app, caption, rect) {
  const w={
    resourceClass: app, resourceName:'', caption, fullScreen:false, minimized:false,
    frameGeometryChanged: signal(), fullScreenChanged:signal(), outputChanged:signal(), windowShown:signal()
  };
  let geometry={...rect};
  Object.defineProperty(w,'frameGeometry',{get(){return geometry},set(v){geometry=v;w.frameGeometryChanged.emit(v)}});
  return w;
}
const rooz=windowOf('ir.aasoft.rooz','Rooz — Daily Companion',{x:50,y:60,width:438,height:704});
const other=windowOf('other.app','Something else',{x:20,y:20,width:500,height:300});
const workspace={
  windowAdded:added, windowShown:shown, stackingOrder:[other,rooz],
  clientArea(kind,win){assert.equal(kind,8);assert.equal(win,rooz);return {x:0,y:0,width:1600,height:840}}
};
vm.runInNewContext(source,{workspace,KWin:{WorkArea:8},Qt:{rect:(x,y,width,height)=>({x,y,width,height})}},{timeout:2000});
assert.equal(rooz.frameGeometry.x,1150);
assert.equal(rooz.frameGeometry.y,124);
assert.equal(other.frameGeometry.x,20);
rooz.fullScreen=true;
rooz.frameGeometry={x:0,y:0,width:1600,height:900};
rooz.fullScreenChanged.emit();
assert.equal(rooz.frameGeometry.x,0,'fullscreen must never be moved');
rooz.fullScreen=false;
rooz.fullScreenChanged.emit();
assert.equal(rooz.frameGeometry.x,1150,'leaving fullscreen re-anchors');
rooz.frameGeometry={x:200,y:200,width:438,height:704};
rooz.windowShown.emit();
assert.equal(rooz.frameGeometry.x,1150,'reopening re-anchors');
const newRooz=windowOf('rooz','Rooz — Daily Companion',{x:30,y:30,width:438,height:704});
workspace.clientArea=(kind,win)=>({x:0,y:0,width:1600,height:840});
added.emit(newRooz);
assert.equal(newRooz.frameGeometry.x,1150,'newly created window re-anchors');
console.log('PASS KWin 6 anchor geometry + fullscreen + show/hide + app isolation');
