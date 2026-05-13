const VERT_SRC = `#version 300 es
void main() {
  // Full-screen triangle using gl_VertexID, no buffer needed
  vec2 pos[3];
  pos[0] = vec2(-1.0, -1.0);
  pos[1] = vec2( 3.0, -1.0);
  pos[2] = vec2(-1.0,  3.0);
  gl_Position = vec4(pos[gl_VertexID], 0.0, 1.0);
}`;

const DEFAULT_FRAG = `#version 300 es
precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
out vec4 fragColor;
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec3 col = 0.5 + 0.5 * cos(u_time + uv.xyx + vec3(0.0, 2.0, 4.0));
  fragColor = vec4(col, 1.0);
}`;

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true });
    if (!this.gl) throw new Error('WebGL2 not supported');

    this.program = null;
    this.startTime = performance.now();
    this.rafId = null;
    this.paused = false;
    this.pausedAt = 0;
    this.pausedElapsed = 0;
    this.uniforms = {};
    this.renderScale = 1.0;
    this.onError = null;
    this.onCompileSuccess = null;

    this._initGL();
    this.compile(DEFAULT_FRAG);
    this.start();
  }

  _initGL() {
    const gl = this.gl;
    // Empty VAO for the full-screen triangle draw call
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
  }

  _compileShader(type, src) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(log);
    }
    return shader;
  }

  // Returns null on success, or an error string on failure.
  compile(fragSrc) {
    if (!fragSrc || !fragSrc.trim()) fragSrc = DEFAULT_FRAG;
    const gl = this.gl;
    try {
      const vert = this._compileShader(gl.VERTEX_SHADER, VERT_SRC);
      const frag = this._compileShader(gl.FRAGMENT_SHADER, fragSrc);

      const prog = gl.createProgram();
      gl.attachShader(prog, vert);
      gl.attachShader(prog, frag);
      gl.linkProgram(prog);

      gl.deleteShader(vert);
      gl.deleteShader(frag);

      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        const log = gl.getProgramInfoLog(prog);
        gl.deleteProgram(prog);
        throw new Error(log);
      }

      if (this.program) gl.deleteProgram(this.program);
      this.program = prog;
      this.currentFrag = fragSrc;

      if (this.onCompileSuccess) this.onCompileSuccess();
      return null;
    } catch (err) {
      if (this.onError) this.onError(err.message);
      return err.message;
    }
  }

  setUniform(name, value) {
    this.uniforms[name] = value;
  }

  _setGLUniform(loc, type, value) {
    const gl = this.gl;
    if (type === 'float' || type === 'int') {
      gl.uniform1f(loc, value);
    } else if (type === 'bool') {
      gl.uniform1i(loc, value ? 1 : 0);
    } else if (type === 'vec2') {
      gl.uniform2fv(loc, value);
    } else if (type === 'vec3') {
      gl.uniform3fv(loc, value);
    } else if (type === 'vec4') {
      gl.uniform4fv(loc, value);
    }
  }

  _draw() {
    if (!this.program) return;
    const gl = this.gl;

    const scale = Math.max(0.05, this.renderScale) * devicePixelRatio;
    const w = Math.round(this.canvas.clientWidth * scale);
    const h = Math.round(this.canvas.clientHeight * scale);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

    gl.useProgram(this.program);

    const elapsed = this.paused
      ? this.pausedElapsed
      : this.pausedElapsed + (performance.now() - this.startTime) / 1000;

    const timeLoc = gl.getUniformLocation(this.program, 'u_time');
    if (timeLoc !== null) gl.uniform1f(timeLoc, elapsed);

    const resLoc = gl.getUniformLocation(this.program, 'u_resolution');
    if (resLoc !== null) gl.uniform2f(resLoc, gl.drawingBufferWidth, gl.drawingBufferHeight);

    for (const [name, val] of Object.entries(this.uniforms)) {
      const loc = gl.getUniformLocation(this.program, name);
      if (loc === null) continue;
      if (Array.isArray(val)) {
        if (val.length === 2) gl.uniform2fv(loc, val);
        else if (val.length === 3) gl.uniform3fv(loc, val);
        else if (val.length === 4) gl.uniform4fv(loc, val);
      } else if (typeof val === 'boolean') {
        gl.uniform1i(loc, val ? 1 : 0);
      } else {
        gl.uniform1f(loc, val);
      }
    }

    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  start() {
    if (this.rafId) return;
    this.startTime = performance.now();
    const loop = () => {
      if (!this.paused) this._draw();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  togglePause() {
    if (this.paused) {
      this.startTime = performance.now();
      this.paused = false;
    } else {
      this.pausedElapsed += (performance.now() - this.startTime) / 1000;
      this.paused = true;
    }
    return this.paused;
  }

  resetTime() {
    this.startTime = performance.now();
    this.pausedElapsed = 0;
  }
}
