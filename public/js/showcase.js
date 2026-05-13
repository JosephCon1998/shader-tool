import { SHOWCASE_SHADERS } from './showcase-shaders.js';

// ── Minimal WebGL2 renderer ───────────────────────────────────────────────────

const VERT_SRC = `#version 300 es
void main() {
  vec2 verts[3];
  verts[0] = vec2(-1.0, -1.0);
  verts[1] = vec2( 3.0, -1.0);
  verts[2] = vec2(-1.0,  3.0);
  gl_Position = vec4(verts[gl_VertexID], 0.0, 1.0);
}`;

function mkShader(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.warn('Shader compile error:', gl.getShaderInfoLog(s));
    gl.deleteShader(s);
    return null;
  }
  return s;
}

function createRenderer(canvas, fragSrc) {
  const gl = canvas.getContext('webgl2', { antialias: false, powerPreference: 'low-power' });
  if (!gl) return null;

  const vert = mkShader(gl, gl.VERTEX_SHADER, VERT_SRC);
  const frag = mkShader(gl, gl.FRAGMENT_SHADER, fragSrc);
  if (!vert || !frag) return null;

  const prog = gl.createProgram();
  gl.attachShader(prog, vert);
  gl.attachShader(prog, frag);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn('Program link error:', gl.getProgramInfoLog(prog));
    return null;
  }
  gl.useProgram(prog);

  const uTime = gl.getUniformLocation(prog, 'u_time');
  const uRes  = gl.getUniformLocation(prog, 'u_resolution');

  let rafId = null;
  const t0 = performance.now();

  function resize() {
    const w = canvas.clientWidth  * devicePixelRatio | 0;
    const h = canvas.clientHeight * devicePixelRatio | 0;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width  = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }

  function frame() {
    rafId = requestAnimationFrame(frame);
    resize();
    if (uTime)  gl.uniform1f(uTime, (performance.now() - t0) / 1000);
    if (uRes)   gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function start() { if (!rafId) frame(); }
  function stop()  { if (rafId) { cancelAnimationFrame(rafId); rafId = null; } }

  return { start, stop, gl };
}

// ── Build grid ────────────────────────────────────────────────────────────────

const grid      = document.getElementById('showcase-grid');
const maximize  = document.getElementById('sc-maximize');
const maxCanvas = document.getElementById('sc-max-canvas');
const backBtn   = document.getElementById('sc-back-btn');
const openBtn   = document.getElementById('sc-open-btn');
const maxTitle  = document.getElementById('sc-maximize-title');
const infoName  = document.getElementById('sc-info-name');
const infoDesc  = document.getElementById('sc-info-desc');

let activeMaxRenderer = null;
let currentShaderData = null;

const cardRenderers = new Map(); // card element → renderer

function buildCard(shader) {
  const card = document.createElement('div');
  card.className = 'sc-card';

  const canvas = document.createElement('canvas');
  // Physical size set later by renderer; CSS handles display size
  canvas.width  = 640;
  canvas.height = 360;
  card.appendChild(canvas);

  const info = document.createElement('div');
  info.className = 'sc-card-info';
  info.innerHTML = `<div class="sc-card-name">${shader.name}</div>`
                 + `<div class="sc-card-desc">${shader.description}</div>`;
  card.appendChild(info);

  const renderer = createRenderer(canvas, shader.glsl);
  if (!renderer) {
    const err = document.createElement('div');
    err.className = 'sc-card-error';
    err.textContent = 'WebGL2 not supported';
    card.replaceChild(err, canvas);
  } else {
    cardRenderers.set(card, renderer);
  }

  card.addEventListener('click', () => showMaximize(shader));
  return card;
}

// Populate grid
SHOWCASE_SHADERS.forEach(shader => {
  grid.appendChild(buildCard(shader));
});

// ── IntersectionObserver: animate only visible cards ─────────────────────────

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    const renderer = cardRenderers.get(entry.target);
    if (!renderer) return;
    if (entry.isIntersecting) renderer.start();
    else renderer.stop();
  });
}, { rootMargin: '120px' });

cardRenderers.forEach((_, card) => observer.observe(card));

// ── Maximize view ─────────────────────────────────────────────────────────────

function showMaximize(shader) {
  currentShaderData = shader;

  maxTitle.textContent  = shader.name;
  infoName.textContent  = shader.name;
  infoDesc.textContent  = shader.description;

  // Pause all card renderers while maximized
  cardRenderers.forEach(r => r.stop());
  observer.disconnect();

  // Create full-res renderer on the maximize canvas
  if (activeMaxRenderer) activeMaxRenderer.stop();
  activeMaxRenderer = createRenderer(maxCanvas, shader.glsl);
  if (activeMaxRenderer) activeMaxRenderer.start();

  maximize.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function hideMaximize() {
  maximize.classList.remove('open');
  document.body.style.overflow = '';

  if (activeMaxRenderer) {
    activeMaxRenderer.stop();
    activeMaxRenderer = null;
  }

  // Reconnect observer so cards resume animating
  cardRenderers.forEach((_, card) => observer.observe(card));
}

backBtn.addEventListener('click', hideMaximize);

openBtn.addEventListener('click', () => {
  if (!currentShaderData) return;
  localStorage.setItem('shader-showcase-import', currentShaderData.glsl);
  window.location.href = '/app';
});

// Close on Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && maximize.classList.contains('open')) hideMaximize();
});

// ── Theme toggle ──────────────────────────────────────────────────────────────

const themeToggle = document.getElementById('theme-toggle');
themeToggle.addEventListener('click', () => {
  const current = localStorage.getItem('shader-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  localStorage.setItem('shader-theme', next);
  document.documentElement.setAttribute('data-theme', next);
  themeToggle.innerHTML = next === 'light'
    ? '<iconify-icon icon="mingcute:sun-line" width="18" height="18"></iconify-icon>'
    : '<iconify-icon icon="mingcute:moon-line" width="18" height="18"></iconify-icon>';
});
