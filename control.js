'use strict';
const affect = HaiHaiAffect;
const session = HaiHaiSession;
const video = document.getElementById('camera-video');
const overlay = document.getElementById('face-overlay');
const drawing = overlay.getContext('2d');
const statusElement = document.getElementById('camera-status');
const startButton = document.getElementById('start-camera');
const stopButton = document.getElementById('stop-camera');
let channel = null, stream = null, timer = null, modelPromise = null, inferencePromise = null;
let generation = 0, running = false, status = 'idle', faceCount = 0;
let timingStarted = 0, timingUpdates = 0, reportedCameraFps = null;
let VA = { valence: 0, arousal: 0 };
let amplifiedVA = { valence: 0, arousal: 0 };
let mood = { valence: 0, arousal: 0 };
document.getElementById('visualization-link').href = session.page('index.html');
function publish() {
  channel?.postMessage({type:'hai-hai-state', version:1, session:session.id,
    VA:amplifiedVA, mood, status, faceCount});
}
function setStatus(next, message) {
  status = next;
  if (statusElement.textContent !== message) statusElement.textContent = message;
  statusElement.dataset.state = next; publish();
}
function clearFaces(keepSummary = false) {
  faceCount = 0; drawing.clearRect(0, 0, overlay.width, overlay.height);
  document.getElementById('face-readouts').replaceChildren();
  overlay.dataset.faceCount = '0';
  if (keepSummary) drawOverlay([]);
}
function stopCamera(message = 'Camera stopped. The last simulated state is held.', next = 'stopped') {
  generation++; running = false; clearTimeout(timer);
  if (stream) { stream.getTracks().forEach(track => track.stop()); stream = null; }
  video.srcObject = null; clearFaces();
  startButton.disabled = !channel; stopButton.disabled = true;
  startButton.textContent = 'Start camera'; setStatus(next, message);
  document.getElementById('detection-timing').textContent = 'Detection paused.';
}
function errorMessage(error) {
  switch (error.name) {
    case 'NotAllowedError': return 'Camera access was not allowed. Enable camera permission for this site, then try again.';
    case 'NotFoundError': return 'No camera was found. Connect a camera, then try again.';
    case 'NotReadableError': return 'The camera is unavailable or in use. Close other camera apps, then try again.';
    default: return error.message || 'The camera or emotion-detection models could not start. Check your connection and try again.';
  }
}
function deadline(promise, milliseconds, message) {
  let timeout;
  return Promise.race([promise, new Promise((_, reject) => {
    timeout = setTimeout(() => reject(new Error(message)), milliseconds);
  })]).finally(() => clearTimeout(timeout));
}
function loadModels() {
  if (!window.faceapi) return Promise.reject(new Error('The emotion-detection library did not load. Reload the page.'));
  if (!modelPromise) {
    const directory = new URL('./models/', location.href).href;
    modelPromise = Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(directory),
      faceapi.nets.faceExpressionNet.loadFromUri(directory)
    ]).catch(error => { modelPromise = null; throw new Error(`Models could not load. Check the models folder and connection. ${error.message}`); });
  }
  return modelPromise;
}
function readyVideo(id) {
  return new Promise((resolve, reject) => {
    const inspect = () => {
      if (id !== generation) { reject(new Error('Camera start cancelled.')); return; }
      if (video.readyState >= 2 && video.videoWidth && video.videoHeight) { resolve(); return; }
      setTimeout(inspect, 100);
    }; inspect();
  });
}
async function startCamera() {
  if (running || startButton.disabled) return;
  if (!isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    setStatus('error', 'Camera access requires HTTPS or localhost in a supported browser.'); return;
  }
  const id = ++generation;
  startButton.disabled = true; stopButton.disabled = false;
  setStatus('loading', 'Allow camera access. Loading the emotion-detection models…');
  try {
    const camera = navigator.mediaDevices.getUserMedia({video:{width:{ideal:640},height:{ideal:480},frameRate:{ideal:30},facingMode:'user'},audio:false})
      .then(result => {
        if (id !== generation) { result.getTracks().forEach(track => track.stop()); throw new Error('Camera start cancelled.'); }
        stream = result; video.srcObject = result;
        result.getVideoTracks().forEach(track => track.addEventListener('ended', () => {
          if (id === generation) stopCamera('Camera connection ended. Select Start camera to reconnect.', 'error');
        }, {once:true}));
        return video.play();
      });
    await deadline(Promise.all([camera, loadModels()]), 30000, 'Camera or model loading timed out. Check permission and connection, then try again.');
    await deadline(readyVideo(id), 10000, 'No camera frames arrived. Check the camera and try again.');
    if (id !== generation) return;
    overlay.width = video.videoWidth; overlay.height = video.videoHeight;
    document.getElementById('camera-preview').style.aspectRatio = `${video.videoWidth} / ${video.videoHeight}`;
    running = true;
    timingStarted = performance.now(); timingUpdates = 0;
    reportedCameraFps = stream.getVideoTracks()[0]?.getSettings().frameRate;
    document.getElementById('detection-timing').textContent = 'Measuring detection speed…';
    setStatus('waiting', 'Camera ready. Face the camera to begin; the last simulated state is held when no face is detected.');
    infer(id);
  } catch (error) {
    if (id === generation) stopCamera(errorMessage(error), 'error');
  }
}
function drawOverlay(detections) {
  overlay.dataset.faceCount = String(detections.length);
  HaiHaiOverlay.draw(drawing,overlay.width,overlay.height,{VA,response:amplifiedVA,mood},detections,overlay.clientWidth);
}
function showReadouts(detections) {
  const format = value => `${value.valence.toFixed(2)}, ${value.arousal.toFixed(2)}`;
  document.getElementById('input-values').textContent = format(VA);
  document.getElementById('response-values').textContent = format(amplifiedVA);
  document.getElementById('mood-values').textContent = format(mood);
  drawOverlay(detections);
  const items = detections.map(({expressions}, index) => {
    const paragraph = document.createElement('p'); paragraph.className = 'face-readout';
    paragraph.textContent = `Face ${index + 1}: ` + Object.keys(affect.VA_LOOKUP)
      .map(key => `${key} ${affect.clamp(expressions[key],0,1).toFixed(2)}`).join(' · ');
    return paragraph;
  });
  document.getElementById('face-readouts').replaceChildren(...items);
}
async function infer(id) {
  if (!running || id !== generation) return;
  const started = performance.now();
  try {
    // A cancelled prior run may still have a GPU operation in flight.
    if (inferencePromise) await inferencePromise.catch(() => {});
    if (!running || id !== generation) return;
    if (video.readyState < 2) { timer = setTimeout(() => infer(id), 200); return; }
    // One pass supplies both boxes and expression estimates from the same frame.
    const job = Promise.resolve(faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({inputSize:224})).withFaceExpressions());
    inferencePromise = job;
    let detections;
    try { detections = await job; }
    finally { if (inferencePromise === job) inferencePromise = null; }
    if (!running || id !== generation) return;
    timingUpdates++;
    const timingElapsed = performance.now()-timingStarted;
    if (timingElapsed >= 1000) {
      const cameraRate = Number.isFinite(reportedCameraFps) ? `${reportedCameraFps.toFixed(1)} fps reported` : '30 fps requested';
      document.getElementById('detection-timing').textContent = `Detection: ${(timingUpdates*1000/timingElapsed).toFixed(1)} updates/s · camera: ${cameraRate}.`;
      timingStarted = performance.now(); timingUpdates = 0;
    }
    faceCount = detections.length;
    if (faceCount) {
      VA = affect.computeVAfromEmotions(detections.map(detection => detection.expressions));
      amplifiedVA = affect.computeAmplifiedVA(VA);
      mood = affect.updateMood(mood, amplifiedVA);
      showReadouts(detections);
      setStatus('live', `${faceCount} ${faceCount === 1 ? 'face' : 'faces'} detected. The visualization is receiving a simulated response.`);
    } else {
      clearFaces(true); setStatus('waiting', 'No face detected. The last simulated response and mood are held.');
    }
    timer = setTimeout(() => infer(id), Math.max(0, 50 - (performance.now() - started)));
  } catch (error) {
    if (id === generation) stopCamera(`Emotion detection stopped. ${errorMessage(error)}`, 'error');
  }
}
try { channel = new BroadcastChannel(session.channelName); }
catch (_) { startButton.disabled = true; setStatus('error', 'This browser cannot connect the two views. Try a current desktop browser.'); }
startButton.addEventListener('click', startCamera);
stopButton.addEventListener('click', () => stopCamera());
const heartbeat = setInterval(publish, 500);
window.addEventListener('pagehide', () => { stopCamera(); clearInterval(heartbeat); channel?.close(); channel = null; });
window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
