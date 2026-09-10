(function () {
  'use strict';
  const url = new URL(location.href);
  const supplied = url.searchParams.get('session');
  const id = supplied && /^[a-zA-Z0-9_-]{16,80}$/.test(supplied) ? supplied :
    (crypto.randomUUID ? crypto.randomUUID() : Array.from(crypto.getRandomValues(new Uint8Array(16)), n => n.toString(16).padStart(2, '0')).join(''));
  url.searchParams.set('session', id);
  history.replaceState(null, '', url);
  const base = new URL('./', url);
  function page(name) { const target = new URL(name, base); target.searchParams.set('session', id); return target.href; }
  const statuses = new Set(['idle', 'loading', 'waiting', 'live', 'stopped', 'error']);
  function isState(data) {
    const vector = v => v && Number.isFinite(v.valence) && Number.isFinite(v.arousal) &&
      Math.abs(v.valence) <= 1.3 && Math.abs(v.arousal) <= 1.3;
    return data && data.type === 'hai-hai-state' && data.version === 1 && data.session === id &&
      vector(data.VA) && vector(data.mood) && statuses.has(data.status) &&
      Number.isInteger(data.faceCount) && data.faceCount >= 0 && data.faceCount <= 100;
  }
  window.HaiHaiSession = Object.freeze({ id, page, isState,
    channelName: `hai-hai:${base.pathname}:${id}`, controllerName: `hai-hai-controller-${id}` });
})();
