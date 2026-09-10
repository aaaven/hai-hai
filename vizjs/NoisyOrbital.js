// === GLOBAL VISUAL PARAMETERS ===
let parameters = {
  numElements: 100,                 // Number of orbital entities
  numPointsPerShape: 80,          // Number of points per spiral shape
  radiusRange: [50, 300],          // Distance of orbit from center
  spreadFactorRange: [0.1, 0.6],   // Angular spread of spirals
  localOscillationFrequency: [0.5, 2.5], // Controls curve undulation
  noiseScale: [0.8, 1.8],          // Internal randomness strength
  noiseStrengthRange: [3, 120],    // External shape distortion via noise
  pointSize: 10,                    // Size of each point drawn
  baseColor: [245, 237, 0],        // RGB fill color
  alphaRange: [10, 40],            // Transparency range
  globalRotationSpeed: 1          // Rotation speed of the full system
};

let easycam;

let globalTime = 0;
let simplexNoise;
let orbitalShapes = [];
let particleRenderer;

function initOrbitalShapes(){
  easycam = createEasyCam({ distance: 1200 }); // 🔶 enable orbit control
  simplexNoise = new SimplexNoise();
  colorMode(HSB, 360, 100, 100, 100);
  particleRenderer = new InstancedParticles(p5.instance._renderer);

  // Instantiate all orbital elements with randomized params
  for (let i = 0; i < parameters.numElements; i++) {
    orbitalShapes.push(new NoisyOrbital(parameters));
  }
  // noStroke();
  colorMode(HSB, 360, 100, 100, 100)
}

function drawOrbitalShapes(t, params,_liveParams, dt = 1/30) {
  
  // let breath = map(sin(frameCount*0.05), -1, 1, 1600, 1000);
  let breath = computeBreathingParams(_liveParams.VA, _liveParams.mood, t / 0.6, dt);
  easycam.setDistance(breath * (exhibitionMode ? Math.max(1, height/width) : 1));

  let collapseFactor = computeSystemOrbitCollapse(_liveParams.VA, _liveParams.mood);
  // Shared visual controls are constant across this frame, not per particle.
  const frame = {
    collapse: collapseFactor,
    inertia: 1-Math.pow(1-computeInertiaParams(_liveParams.VA, _liveParams.mood),dt*60),
    distortion: computeDistortionParams(_liveParams.VA, _liveParams.mood),
    deformation: computeShapeDeformationBias(_liveParams.VA, _liveParams.mood),
    jitter: computePointJitter(_liveParams.VA, _liveParams.mood)/10,
    shapeColor: computeShapeColor(_liveParams.VA, _liveParams.mood)
  };

  // Adjust radius and spread factor ranges
  params.radiusRange = [
    50 * collapseFactor,
    300 * collapseFactor
  ];

  params.spreadFactorRange = [
    0.1 * collapseFactor,
    0.6 * collapseFactor
  ];
  
  
  // 🔶 LIGHTING SETUP
  background(0);
  let ambientCol = computeAmbientLight(_liveParams.mood);
  ambientLight(ambientCol);
  // ambientLight(60, 60, 60);
  directionalLight(color(0,0,100), 0.5, 1, -1);
  let lx = 300 * sin(t);
  let ly = 300 * cos(t);
  pointLight(color(0,0,100), lx, ly, 200);
  
  //drawVisuals
  push();
  rotateY(radians(t * 100 * params.globalRotationSpeed));
  ambientMaterial(frame.shapeColor);
  noStroke();
  for (let i = 0; i < params.numElements; i++) {
    orbitalShapes[i].display(i, t, params, frame);
  }
  pop();
}

class NoisyOrbital {
  constructor(params) {
    this.baseRadius = random(...params.radiusRange);               // Distance from center
    this.spreadFactor = random(...params.spreadFactorRange);      // Angular spiral spread
    this.targetRadius = this.baseRadius;
    this.targetSpread = this.spreadFactor;
    this.waveFreq = random(...params.localOscillationFrequency);  // Oscillation frequency
    this.seed = random(10, 1000);                                  // Noise seed
    this.offsetAngle = random(TWO_PI);                             // Start angle
    this.noiseScale = random(...params.noiseScale);                // Noise strength
    this.color = color(                                            // Color with random alpha
      ...params.baseColor,
      random(...params.alphaRange)
    );
    this.shapeType = floor(random(2)); // Preserve the two implemented shapes: sphere and box.
    this.particleOffsets = new Float32Array(params.numPointsPerShape * 3);
    
    // 🔶 Randomized 3D rotation per orbital (replaces index-based layout)
    this.initialRotation = {
      x: random(TWO_PI),
      y: random(TWO_PI),
      z: random(TWO_PI)
    };
  }

  display(index, t, p, frame) {
    push();
    
    // 🔶 Rotate each orbital uniquely in 3D space
    rotateX(this.initialRotation.x);
    rotateY(this.initialRotation.y);
    rotateZ(this.initialRotation.z);

    let collapse = frame.collapse;
    let targetR = map(index, 0, p.numElements, 50, 300) * collapse;
    let targetSpread = map(index, 0, p.numElements, 0.1, 0.6) * collapse;

    // this.baseRadius = lerp(this.baseRadius, targetR, 0.05);
    // this.spreadFactor = lerp(this.spreadFactor, targetSpread, 0.05);

    let inertia = frame.inertia;
    this.baseRadius = lerp(this.baseRadius, targetR, inertia);
    this.spreadFactor = lerp(this.spreadFactor, targetSpread, inertia);

    let { distortionAmplitude, distortionCoherence, distortionSpeed } = frame.distortion;

    for (let i = 0; i < p.numPointsPerShape; i++) {
      let progress = i / p.numPointsPerShape;
      let theta = this.offsetAngle + this.spreadFactor * TWO_PI * progress;

      // Oscillation offsets
      let rad = 1.3;
      let freq = 2;
      // let phase = 2 * PI * (freq * progress - t);
      let phase = 2 * PI * (freq * progress - t * distortionSpeed);

      let radX = rad * cos(phase);
      let radY = rad * sin(phase);
      let radZ = rad * sin(phase + HALF_PI); // 🔶 phase-shifted third axis

      // let noiseStrengthBase = map(mouseX, 0, width, ...p.noiseStrengthRange);
      let noiseStrengthBase = distortionAmplitude;
      let deformationBias = frame.deformation;
      let noiseStrength = deformationBias * noiseStrengthBase;

      // ✅ Real 3D noise inputs
      // let noiseX = simplexNoise.noise3D(this.seed, radX, radY, radZ);
      // let noiseY = simplexNoise.noise3D(this.seed + 100, radY, radZ, radX);
      // let noiseZ = simplexNoise.noise3D(this.seed + 200, radZ, radX, radY);

      let noiseX = simplexNoise.noise3D(this.seed, radX * distortionCoherence, radY * distortionCoherence);
      let noiseY = simplexNoise.noise3D(this.seed + 100, radY * distortionCoherence, radZ * distortionCoherence);
      let noiseZ = simplexNoise.noise3D(this.seed + 200, radZ * distortionCoherence, radX * distortionCoherence);

      let x = this.baseRadius * sin(theta) + noiseStrength * noiseX;
      let y = this.baseRadius * cos(theta) + noiseStrength * noiseY;
      let z = noiseStrength * noiseZ;
      
      let jitter = frame.jitter;
      // translate(x, y, z);
      let jx = random(-jitter, jitter);
      let jy = random(-jitter, jitter);
      let jz = random(-jitter, jitter);
      this.particleOffsets[i*3] = x + jx;
      this.particleOffsets[i*3+1] = y + jy;
      this.particleOffsets[i*3+2] = z + jz;
    }
    particleRenderer.draw(this.shapeType,p.pointSize,this.particleOffsets);
    pop();
  }
}
