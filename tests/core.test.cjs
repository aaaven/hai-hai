const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname,'..');
const affect = require('../js/affect.js');
const overlay = require('../js/camera-overlay.js');
const close = (actual, expected) => assert.ok(Math.abs(actual-expected)<1e-10, `${actual} != ${expected}`);
const reference = { happy:[.8,.5,1.06,.7,.053,.035], sad:[-.6,-.3,-.82,-.46,-.041,-.023],
  angry:[-.5,.6,-.7,.82,-.035,.041], fearful:[-.6,.6,-.82,.82,-.041,.041],
  disgusted:[-.6,.4,-.82,.58,-.041,.029], surprised:[.4,.7,.58,.94,.029,.047], neutral:[0,0,0,0,0,0] };
for (const [category, expected] of Object.entries(reference)) {
  test(`${category}: prototype, response and first mood update match the manuscript`, () => {
    const va=affect.computeVAfromEmotions([{[category]:1}]);
    const response=affect.computeAmplifiedVA(va);
    const mood=affect.updateMood({valence:0,arousal:0},response);
    [va.valence,va.arousal,response.valence,response.arousal,mood.valence,mood.arousal]
      .forEach((value,index)=>close(value,expected[index]));
  });
}
test('category weights normalize and faces have equal influence',()=>{
  const mixed=affect.computeVAfromEmotions([{happy:1},{sad:1}]);
  close(mixed.valence,.1);close(mixed.arousal,.1);
  assert.deepEqual(affect.computeVAfromEmotions([{happy:.5}]),{valence:.8,arousal:.5});
});
test('empty and invalid inputs remain finite',()=>{
  for(const input of [[],null,[null],[{}],[{happy:NaN}],[{happy:-1}]])
    assert.deepEqual(affect.computeVAfromEmotions(input),{valence:0,arousal:0});
});
test('EMA retains a constant .05 contribution rather than a lifetime mean',()=>{
  let mood={valence:0,arousal:0};
  for(let i=0;i<100;i++)mood=affect.updateMood(mood,{valence:1,arousal:1});
  const next=affect.updateMood(mood,{valence:-1,arousal:-1});
  close(next.valence,.95*mood.valence-.05);close(next.arousal,.95*mood.arousal-.05);
});
const context={HaiHaiAffect:affect,Math, map:(n,a,b,c,d)=>c+(d-c)*(n-a)/(b-a),
  color:(...values)=>values,sin:Math.sin,lerp:(a,b,t)=>a+(b-a)*t};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'vizjs/computeParams.js'),'utf8'),context);
test('signed affect and amplified extremes produce finite, visible display parameters',()=>{
  const values=[-1.3,-1,-.82,-.3,0,.4,1,1.3];
  for(const v of values)for(const a of values)for(const mv of values)for(const ma of values){
    const va={valence:v,arousal:a},mood={valence:mv,arousal:ma};
    const hsba=context.computeShapeColor(va,mood);
    assert.ok(hsba.every(Number.isFinite));assert.ok(hsba[0]>=0&&hsba[0]<360);
    assert.ok(hsba[1]>=0&&hsba[1]<=100);assert.ok(hsba[2]>=0&&hsba[2]<=100);
    assert.ok(hsba[3]>=10&&hsba[3]<=50);
    assert.ok(context.computePointJitter(va,mood)>=0);
    const d=context.computeDistortionParams(va,mood);
    assert.ok(Object.values(d).every(x=>Number.isFinite(x)&&x>=0));
    assert.ok(context.computeSystemOrbitCollapse(va,mood)>0);
    assert.ok(context.computeInertiaParams(va,mood)>0&&context.computeInertiaParams(va,mood)<1);
    assert.deepEqual(va,{valence:v,arousal:a});assert.deepEqual(mood,{valence:mv,arousal:ma});
  }
});
test('valence changes base hue and negative-arousal Sad remains visible',()=>{
  const neutral={valence:0,arousal:0};
  assert.notEqual(context.computeShapeColor({valence:-1,arousal:0},neutral)[0],context.computeShapeColor({valence:1,arousal:0},neutral)[0]);
  assert.ok(context.computeShapeColor({valence:-.82,arousal:-.46},{valence:-.041,arousal:-.023})[3]>0);
});
test('all active HTML asset references exist with exact casing',()=>{
  for(const filename of ['index.html','control.html']){
    const html=fs.readFileSync(path.join(root,filename),'utf8').replace(/<!--[\s\S]*?-->/g,'');
    for(const [,ref] of html.matchAll(/(?:src|href)="([^"]+)"/g)){
      if(/^(data:|https?:|#)/.test(ref))continue;
      let current=root;
      for(const part of ref.split('/')){assert.ok(fs.readdirSync(current).includes(part),`${filename}: missing ${ref}`);current=path.join(current,part);}
      assert.ok(fs.statSync(current).isFile());
    }
  }
});
test('required model tensors match their shard lengths',()=>{
  for(const model of ['tiny_face_detector_model','face_expression_model']){
    const manifest=JSON.parse(fs.readFileSync(path.join(root,'models',model+'-weights_manifest.json')));
    for(const group of manifest){
      const expected=group.weights.reduce((sum,w)=>sum+w.shape.reduce((a,b)=>a*b,1)*({float32:4,int32:4,bool:1,uint8:1,uint16:2}[w.quantization?.dtype||w.dtype]),0);
      const actual=group.paths.reduce((sum,p)=>sum+fs.statSync(path.join(root,'models',p)).size,0);
      assert.equal(actual,expected);
    }
  }
});
test('application and bundled JavaScript parse',()=>{
  for(const dir of ['js','vizjs','lib'])for(const name of fs.readdirSync(path.join(root,dir))){
    if(name.endsWith('.js'))new vm.Script(fs.readFileSync(path.join(root,dir,name),'utf8'),{filename:name});
  }
  new vm.Script(fs.readFileSync(path.join(root,'control.js'),'utf8'));
});
function overlayContext(){
  return {lines:[],boxes:[],save(){},restore(){},clearRect(){},strokeText(){},
    measureText(value){return {width:value.length*8};},
    fillText(value,x,y){this.lines.push({value,x,y});},
    strokeRect(...box){this.boxes.push(box);}};
}
test('camera overlay includes six system values and per-face VA/category estimates',()=>{
  const ctx=overlayContext();
  const va=affect.computeVAfromEmotions([{sad:1}]),response=affect.computeAmplifiedVA(va);
  const mood=affect.updateMood({valence:0,arousal:0},response);
  overlay.draw(ctx,640,480,{VA:va,response,mood},[{expressions:{sad:1},detection:{box:{x:240,y:150,width:180,height:200}}}]);
  const text=ctx.lines.map(line=>line.value);
  for(const label of ['Valence: -0.60','Arousal: -0.30','V′: -0.82','A′: -0.46','Mood V: -0.04','Mood A: -0.02','V: -0.60','A: -0.30','sad: 1.00'])assert.ok(text.includes(label),label);
  assert.equal(ctx.boxes.length,1);assert.equal(ctx.lines.length,15);
});
test('no-face overlay retains only held system values; narrow-screen labels remain on canvas',()=>{
  const ctx=overlayContext(),zero={valence:0,arousal:0};
  overlay.draw(ctx,640,480,{VA:zero,response:zero,mood:zero},[],350);
  assert.equal(ctx.boxes.length,0);assert.equal(ctx.lines.length,6);
  assert.ok(ctx.lines.every(line=>line.x>=0&&line.y>=0&&line.x<640&&line.y<480));
});
