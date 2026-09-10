(function (root) {
  'use strict';
  const categories = ['neutral','happy','sad','angry','fearful','disgusted','surprised'];
  const number = value => (Number.isFinite(value) ? value : 0).toFixed(2);
  function draw(context, width, height, state, detections, displayWidth = width) {
    context.clearRect(0,0,width,height);
    const font = Math.max(16,Math.min(28,14*width/Math.max(1,displayWidth)));
    const line = font*1.25, padding = font*.45;
    context.save();
    context.font = `${font}px Arial, sans-serif`;
    context.textBaseline = 'top'; context.lineJoin = 'round';
    function text(lines,x,y) {
      const widest = Math.max(...lines.map(label=>context.measureText(label).width));
      x = Math.max(padding,Math.min(x,width-widest-padding));
      y = Math.max(padding,Math.min(y,height-lines.length*line-padding));
      context.fillStyle = '#fff'; context.strokeStyle = 'rgba(0,0,0,.7)'; context.lineWidth = 3;
      lines.forEach((label,i)=>{context.strokeText(label,x,y+i*line);context.fillText(label,x,y+i*line);});
    }
    text([
      `Valence: ${number(state.VA.valence)}`, `Arousal: ${number(state.VA.arousal)}`,
      `V′: ${number(state.response.valence)}`, `A′: ${number(state.response.arousal)}`,
      `Mood V: ${number(state.mood.valence)}`, `Mood A: ${number(state.mood.arousal)}`
    ],width*.04,height*.05);
    for (const {detection,expressions} of detections) {
      const box = detection.box;
      const x = Math.max(0,box.x), y = Math.max(0,box.y);
      const w = Math.min(box.width,width-x), h = Math.min(box.height,height-y);
      context.strokeStyle = '#fff'; context.lineWidth = 2;
      context.strokeRect(x,y,w,h);
      const va = root.HaiHaiAffect.computeVAfromEmotions([expressions]);
      text([`V: ${number(va.valence)}`,`A: ${number(va.arousal)}`],x+padding,y-2*line-padding);
      text(categories.map(category=>`${category}: ${number(root.HaiHaiAffect.clamp(expressions[category],0,1))}`),x+padding,y+padding);
    }
    context.restore();
  }
  root.HaiHaiOverlay = Object.freeze({draw});
  if (typeof module !== 'undefined' && module.exports) module.exports = root.HaiHaiOverlay;
})(globalThis);
