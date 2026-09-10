(function (root) {
  'use strict';
  // Manuscript implementation prototypes, not measurements of felt emotion.
  const VA_LOOKUP = Object.freeze(Object.fromEntries(Object.entries({
    happy: { v: 0.8, a: 0.5 }, sad: { v: -0.6, a: -0.3 },
    angry: { v: -0.5, a: 0.6 }, fearful: { v: -0.6, a: 0.6 },
    disgusted: { v: -0.6, a: 0.4 }, surprised: { v: 0.4, a: 0.7 },
    neutral: { v: 0, a: 0 }
  }).map(([key, value]) => [key, Object.freeze(value)])));
  const MOOD_ALPHA = 0.05;
  const finite = value => Number.isFinite(value) ? value : 0;
  const clamp = (value, low, high) => Math.max(low, Math.min(high, finite(value)));
  function computeVAfromEmotions(faces) {
    let v = 0, a = 0, count = 0;
    for (const face of Array.isArray(faces) ? faces : []) {
      if (!face || typeof face !== 'object') continue;
      let fv = 0, fa = 0, weight = 0;
      for (const [category, point] of Object.entries(VA_LOOKUP)) {
        const p = clamp(face[category], 0, 1);
        fv += p * point.v; fa += p * point.a; weight += p;
      }
      if (weight > 0) { v += fv / weight; a += fa / weight; count++; }
    }
    return count ? { valence: v / count, arousal: a / count } : { valence: 0, arousal: 0 };
  }
  function computeAmplifiedVA(input, factor = 1.2, bias = 0.1) {
    const transform = value => finite(value) * factor + Math.sign(finite(value)) * bias;
    return { valence: transform(input.valence), arousal: transform(input.arousal) };
  }
  function updateMood(previous, current, alpha = MOOD_ALPHA) {
    const weight = clamp(alpha, 0, 1);
    return {
      valence: (1 - weight) * finite(previous.valence) + weight * finite(current.valence),
      arousal: (1 - weight) * finite(previous.arousal) + weight * finite(current.arousal)
    };
  }
  const api = { VA_LOOKUP, MOOD_ALPHA, computeVAfromEmotions, computeAmplifiedVA, updateMood,
    clamp, signed: value => clamp(value, -1, 1), activation: value => (clamp(value, -1, 1) + 1) / 2 };
  root.HaiHaiAffect = Object.freeze(api);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(globalThis);
