'use strict';
let channel, lastMessageAt = 0, renderReady = false;
let liveParams = { VA:{valence:0,arousal:0}, mood:{valence:0,arousal:0} };
let lastStatus = 'idle';
const connectionStatus = document.getElementById('connection-status');
const controllerButton = document.getElementById('open-controller');
const controllerLink = document.getElementById('controller-link');
const exhibitionButton = document.getElementById('exhibition-mode');
let exhibitionMode = false;
controllerLink.href = HaiHaiSession.page('control.html');
function connectionMessage(text, state = 'idle') {
  if (connectionStatus.textContent !== text) connectionStatus.textContent = text;
  connectionStatus.dataset.state = state;
}
controllerButton.addEventListener('click', () => {
  if (lastMessageAt && performance.now()-lastMessageAt < 5000) {
    connectionMessage('Your controller is already connected. Switch to its window to use the camera controls.');
    return;
  }
  // No opener dependency: the controller can run separately from the busy
  // visualization. BroadcastChannel supplies the connection, not window.opener.
  window.open(HaiHaiSession.page('control.html'), '_blank',
    'noopener,width=800,height=850,resizable=yes,scrollbars=yes');
  // With noopener a successful open also returns null, so do not call that a
  // blocked popup. The paired link remains available in either case.
  connectionMessage('Select Start camera in the controller. If no window appeared, use “Open in a tab”.');
});
function setExhibitionMode(enabled) {
  exhibitionMode = enabled;
  document.body.classList.toggle('exhibition', enabled);
  exhibitionButton.setAttribute('aria-pressed', String(enabled));
  if (renderReady) windowResized();
  if (!enabled) exhibitionButton.focus({preventScroll:true});
}
exhibitionButton.addEventListener('click', async () => {
  if (!renderReady) return;
  const enter = document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen;
  if (!enter) { connectionMessage('Fullscreen is unavailable in this browser. Use a desktop browser with fullscreen support.', 'error'); return; }
  try {
    setExhibitionMode(true);
    await enter.call(document.documentElement);
    windowResized();
  } catch (_) {
    setExhibitionMode(false);
    connectionMessage('Fullscreen was not allowed. Try Exhibition mode again or check browser permissions.', 'error');
  }
});
function syncFullscreen() {
  if (exhibitionMode && !(document.fullscreenElement || document.webkitFullscreenElement)) setExhibitionMode(false);
}
document.addEventListener('fullscreenchange', syncFullscreen);
document.addEventListener('webkitfullscreenchange', syncFullscreen);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && exhibitionMode) {
    const leave = document.exitFullscreen || document.webkitExitFullscreen;
    if (document.fullscreenElement || document.webkitFullscreenElement) Promise.resolve(leave?.call(document)).catch(() => {});
    setExhibitionMode(false);
  }
});
function canvasSize() {
  if (exhibitionMode) return [window.innerWidth, window.innerHeight];
  const availableHeight = Math.max(300, window.innerHeight - 250);
  const w = Math.max(180, Math.min(640, window.innerWidth - 24, availableHeight * 2/3));
  return [Math.round(w), Math.round(w * 1.5)];
}
function setup() {
  try {
    pixelDensity(1);
    const canvas = createCanvas(...canvasSize(), WEBGL);
    canvas.parent('canvas-container');
    canvas.elt.setAttribute('role','img');
    canvas.elt.setAttribute('aria-label','Animated abstract visualization of simulated affective states.');
    canvas.elt.addEventListener('webglcontextlost', event => {
      event.preventDefault(); renderReady = false; noLoop();
      connectionMessage('The graphics connection was interrupted. Reload this view to resume.', 'error');
    });
    frameRate(30); initOrbitalShapes();
    channel = new BroadcastChannel(HaiHaiSession.channelName);
    channel.onmessage = event => {
      if (!HaiHaiSession.isState(event.data)) return;
      const data = event.data;
      liveParams = {VA:{...data.VA}, mood:{...data.mood}};
      lastMessageAt = performance.now(); lastStatus = data.status;
      const messages = {idle:'Controller connected. Select Start camera there.',
        loading:'Controller connected. Waiting for camera permission and model loading…',
        waiting:'No face detected. The last simulated response and mood are held.',
        live:`Receiving category estimates from ${data.faceCount} ${data.faceCount===1?'face':'faces'}; displaying the simulated response.`,
        stopped:'Camera stopped. The last simulated response and mood are held.',
        error:'The controller needs attention. Check its camera or model-loading message.'};
      connectionMessage(messages[data.status], data.status);
    };
    renderReady = true;
  } catch (error) {
    noLoop(); connectionMessage(`The visualization could not start. Check WebGL and the bundled libraries, then reload. ${error.message}`, 'error');
  }
}
function draw() {
  if (!renderReady) return;
  const dt = Math.min(deltaTime / 1000, 0.1);
  globalTime += dt * 0.6;
  drawOrbitalShapes(globalTime, parameters, liveParams, dt);
}
function windowResized() {
  if (!renderReady) return;
  resizeCanvas(...canvasSize()); easycam.setViewport([0,0,width,height]);
}
const connectionCheck = setInterval(() => {
  if (lastMessageAt && performance.now()-lastMessageAt > 5000 && lastStatus !== 'disconnected') {
    lastStatus = 'disconnected'; connectionMessage('Controller disconnected or paused. Reopen it to resume; the last state is held.');
  }
}, 1000);
window.addEventListener('pagehide', () => { clearInterval(connectionCheck); channel?.close(); });
window.addEventListener('pageshow', event => { if(event.persisted) location.reload(); });
