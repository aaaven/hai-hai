// Batch the 80 particles in each orbital into one draw, keeping p5's existing
// sphere/box meshes, lighting, material, rotations and per-particle positions.
// This adapter targets the bundled p5.js 1.11.7 retained-mode renderer.
class InstancedParticles {
  constructor(renderer) {
    this.renderer = renderer;
    const gl = renderer.GL;
    const extension = gl.drawElementsInstanced ? null : gl.getExtension('ANGLE_instanced_arrays');
    this.supported = Boolean(gl.drawElementsInstanced || extension);
    if (!this.supported) return;
    this.setDivisor = gl.vertexAttribDivisor ? gl.vertexAttribDivisor.bind(gl) : extension.vertexAttribDivisorANGLE.bind(extension);
    this.drawElements = gl.drawElementsInstanced ? gl.drawElementsInstanced.bind(gl) : extension.drawElementsInstancedANGLE.bind(extension);
    this.buffer = gl.createBuffer();
    this.material = baseMaterialShader().modify({
      vertexDeclarations: 'IN vec3 aParticleOffset;',
      'vec3 getLocalPosition': '(vec3 position) { return position + aParticleOffset; }'
    });
  }
  draw(shapeType, pointSize, offsets) {
    if (!this.supported) {
      for (let i = 0; i < offsets.length; i += 3) {
        push(); translate(offsets[i], offsets[i+1], offsets[i+2]);
        if (shapeType === 0) sphere(pointSize/2,8,6); else box(pointSize);
        pop();
      }
      return;
    }
    const renderer = this.renderer, gl = renderer.GL;
    const size = shapeType === 0 ? pointSize/2 : pointSize;
    if (!this.scaled || this.scaled.length !== offsets.length) this.scaled = new Float32Array(offsets.length);
    // p5 applies the primitive's size through its model matrix; compensate so
    // the offsets stay in artwork units, while the mesh retains its usual size.
    for (let i = 0; i < offsets.length; i++) this.scaled[i] = offsets[i] / size;
    shader(this.material);
    const original = renderer._drawElements;
    renderer._drawElements = (mode, geometryId) => {
      const geometry = renderer.retainedMode.geometry[geometryId];
      const attribute = this.material.attributes.aParticleOffset;
      if (!attribute) throw new Error('Particle instancing attribute is unavailable.');
      const location = attribute.location;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
      gl.bufferData(gl.ARRAY_BUFFER, this.scaled, gl.STREAM_DRAW);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location,3,gl.FLOAT,false,0,0);
      this.setDivisor(location,1);
      try { this.drawElements(mode,geometry.vertexCount,geometry.indexBufferType,0,offsets.length/3); }
      finally { this.setDivisor(location,0); gl.disableVertexAttribArray(location); }
    };
    try { if (shapeType === 0) sphere(pointSize/2,8,6); else box(pointSize); }
    finally { renderer._drawElements = original; }
  }
}
