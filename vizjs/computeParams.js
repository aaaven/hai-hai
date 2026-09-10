// Keep the original HSB endpoints: cyan (negative) to red (positive).
const h1 = 0, h2 = 188;
let previousBreath = 1300;
const signed = HaiHaiAffect.signed;
const activation = HaiHaiAffect.activation;
const displayClamp = HaiHaiAffect.clamp;
// Display-only normalization: signed arousal [-1,1] becomes activation [0,1].
// Raw VA', EMA mood and manuscript coordinates are never overwritten/clipped.
function computePointJitter(VA, mood) { return 10 * activation(VA.arousal) * (1 + activation(mood.arousal)); }
function computeShapeColor(VA, mood) {
  const v = signed(VA.valence), mv = signed(mood.valence);
  const baseHue = displayClamp(map(v, -0.5, 0.5, h2, h1), Math.min(h1,h2), Math.max(h1,h2));
  const jitter = computePointJitter(VA, mood) / 10;
  const hue = (baseHue + jitter + 360) % 360;
  const saturation = displayClamp(map(v,-1,1,40,90),0,100);
  const brightness = displayClamp(map(v,-1,1,50,100)+jitter,0,100);
  const opacity = map(displayClamp(activation(VA.arousal) * (1-mv),0,1),0,1,10,50);
  return color(hue, saturation, brightness, opacity);
}
function computeAmbientLight(mood) {
  return color(map(signed(mood.valence),-1,1,h2,h1),
    map(activation(mood.arousal),0,1,30,90), map(signed(mood.valence),-1,1,30,80));
}
function computeShapeDeformationBias(VA, mood) { return map(activation(VA.arousal),0,1,0.2,1.5) * (1-signed(mood.valence)); }
function computeSystemOrbitCollapse(VA, mood) {
  return map(signed(VA.valence),-1,1,0.3,1.2) * (1+activation(mood.arousal)*0.5);
}
function computeBreathingParams(VA, mood, seconds, dt = 1/60) {
  const frequency = map(activation(VA.arousal),0,1,1.2,4.8);
  const amplitude = map(signed(mood.valence),-1,1,150,500);
  const target = 1300 + amplitude * sin(seconds * frequency);
  previousBreath = lerp(previousBreath,target,1-Math.pow(0.95,dt*60));
  return previousBreath;
}
function computeInertiaParams(VA, mood) {
  // A larger interpolation fraction means a faster response at higher activation.
  return map(activation(mood.arousal),0,1,0.01,0.15);
}
function computeDistortionParams(VA, mood) {
  return {distortionAmplitude:map(activation(VA.arousal),0,1,3,100),
    distortionCoherence:map(signed(mood.valence),-1,1,0.1,1),
    distortionSpeed:map(activation(mood.arousal),0,1,0.01,0.2)};
}
