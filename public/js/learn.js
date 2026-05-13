import { Renderer } from './renderer.js';

// ── Section data ──────────────────────────────────────────────────────────────
const SECTIONS = [
  {
    id: 'coordinates',
    title: 'The Coordinate System',
    tags: ['gl_FragCoord', 'u_resolution', 'vec2'],
    desc: [
      `Every fragment shader runs once per pixel, every frame. The only built-in input telling you <em>which</em> pixel you're in is <code>gl_FragCoord.xy</code> — the pixel's position in screen space, measured from the bottom-left corner in pixels. A 600×400 canvas means <code>gl_FragCoord</code> ranges from <code>(0,0)</code> to <code>(600,400)</code>.`,
      `Working in pixel space is awkward because the numbers change with canvas size. Instead, we <strong>normalize</strong> coordinates to the [0, 1] range by dividing by <code>u_resolution.xy</code>. The result is called <strong>UV space</strong>: bottom-left is <code>(0,0)</code>, top-right is <code>(1,1)</code>. The example maps UV directly to red and green channels — the color gradient is a literal picture of the coordinate system.`,
      `Many shaders re-center UV to [-1, 1] with <code>uv = uv * 2.0 - 1.0</code>. This makes symmetrical math simpler and puts the origin at the center. You'll also need to correct for <strong>aspect ratio</strong> by multiplying <code>uv.x</code> by <code>width / height</code>, otherwise circles look like ovals.`,
    ],
    callout: `<strong>Key insight:</strong> every pixel runs the same program independently — there's no loop, no shared state between pixels. The position <em>is</em> the only input you start with.`,
    code: `#version 300 es
precision highp float;
uniform vec2  u_resolution;
uniform float u_time;
out vec4 fragColor;

void main() {
  // Normalize pixel to [0, 1] — this is UV space
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;

  // Use uv as color: red increases left→right,
  // green increases bottom→top
  float r = uv.x;
  float g = uv.y;
  float b = 0.5 + 0.5 * sin(u_time);   // animated blue

  fragColor = vec4(r, g, b, 1.0);
}`,
  },

  {
    id: 'shapes',
    title: 'Drawing Shapes via Distance',
    tags: ['length()', 'step()', 'aspect ratio'],
    desc: [
      `The key to drawing shapes in a shader is the <strong>distance function</strong>. For each pixel, compute how far it is from the shape's center (or edge), then threshold that distance to decide inside vs. outside. <code>length(p)</code> gives the Euclidean distance from point <code>p</code> to the origin.`,
      `To draw a circle of radius <code>r</code>, compute <code>d = length(uv - center)</code> and check if <code>d &lt; r</code>. The <code>step(edge, x)</code> function is a hard threshold — it returns 0 when <code>x &lt; edge</code> and 1 when <code>x &gt;= edge</code>. So <code>1.0 - step(r, d)</code> gives 1 inside the circle and 0 outside.`,
      `Try changing the radius value, or adding a second circle. You can layer multiple shapes by combining their masks with <code>max()</code> (union) or mixing colors.`,
    ],
    callout: `<strong>Key insight:</strong> distance to a point gives circles. Distance to a line gives half-planes. Distance to a box gives rectangles. All shapes are just different distance functions.`,
    code: `#version 300 es
precision highp float;
uniform vec2  u_resolution;
uniform float u_time;
out vec4 fragColor;

void main() {
  // Center and correct for aspect ratio
  vec2 uv = (gl_FragCoord.xy / u_resolution.xy) * 2.0 - 1.0;
  uv.x *= u_resolution.x / u_resolution.y;

  // Distance from the origin
  float d = length(uv);

  // Hard circle: 1 inside, 0 outside
  float circle = 1.0 - step(0.55, d);

  // Rings: isolines of the distance field
  float rings = step(0.97, fract(d * 5.0 - u_time * 0.4));

  vec3 col = circle * vec3(0.15, 0.55, 1.0);
  col += rings * 0.4;
  fragColor = vec4(col, 1.0);
}`,
  },

  {
    id: 'smoothstep',
    title: 'Smooth Edges & Transitions',
    tags: ['smoothstep()', 'mix()', 'anti-aliasing'],
    desc: [
      `<code>step(edge, x)</code> is a hard threshold — it produces a sharp, aliased edge. <code>smoothstep(lo, hi, x)</code> is the smooth version: it eases from 0 to 1 over the range [lo, hi] using a cubic curve. This gives anti-aliased edges and, more importantly, a powerful way to create soft gradients.`,
      `The key formula for smooth shapes is <code>smoothstep(r + eps, r - eps, dist)</code>. When the distance is just outside <code>r</code>, you get 0. Just inside, you get 1. The feather zone is <code>2 * eps</code> wide. Smaller <code>eps</code> = sharper. Larger = softer glow.`,
      `<code>mix(a, b, t)</code> is linear interpolation — it blends two values by a factor t in [0, 1]. Combined with smoothstep, it's how you blend shapes, colors, and transitions cleanly. These two functions appear in virtually every production shader.`,
    ],
    callout: `<strong>Key insight:</strong> <code>smoothstep(a, b, x)</code> is just <code>t = clamp((x-a)/(b-a), 0, 1)</code> then <code>t*t*(3-2*t)</code>. The reversed arguments <code>(r+e, r-e, d)</code> flip it so inside=1, outside=0.`,
    code: `#version 300 es
precision highp float;
uniform vec2  u_resolution;
uniform float u_time;
out vec4 fragColor;

void main() {
  vec2 uv = (gl_FragCoord.xy / u_resolution.xy) * 2.0 - 1.0;
  uv.x *= u_resolution.x / u_resolution.y;

  float d = length(uv);
  float r  = 0.55;
  float r2 = 0.35;

  // Soft outer circle
  float outer = smoothstep(r + 0.03, r - 0.03, d);
  // Soft inner hole
  float inner = smoothstep(r2 + 0.03, r2 - 0.03, d);
  // Ring = outer minus inner
  float ring  = outer - inner;

  // Glow that falls off with distance
  float glow = 0.06 / max(0.01, abs(d - r));

  // Breathing animation
  float pulse = 0.5 + 0.5 * sin(u_time * 1.5);
  vec3 ringCol = mix(vec3(0.2, 0.5, 1.0), vec3(0.8, 0.3, 1.0), pulse);

  vec3 col = ring * ringCol + glow * ringCol * 0.4;
  fragColor = vec4(col, 1.0);
}`,
  },

  {
    id: 'time',
    title: 'Time & Animation',
    tags: ['u_time', 'sin()', 'cos()', 'animation'],
    desc: [
      `The <code>u_time</code> uniform is a float that increases every frame (measured in seconds). It's the only input that changes between frames — everything else is determined purely by pixel position. By feeding <code>u_time</code> into trig functions, you create oscillating, looping animation.`,
      `<code>sin(t)</code> oscillates between -1 and 1 with a period of 2π (~6.28 seconds). <code>0.5 + 0.5 * sin(t)</code> rescales that to [0, 1]. To control speed: <code>sin(t * speed)</code>. To phase-shift between pixels: <code>sin(t + uv.x * frequency)</code> — this makes waves.`,
      `Combining <code>cos(t)</code> and <code>sin(t)</code> gives circular motion: <code>vec2(cos(t), sin(t))</code> traces a unit circle over time. This is how you orbit objects, spin patterns, or animate any polar quantity.`,
    ],
    callout: `<strong>Key insight:</strong> <code>vec2(cos(t), sin(t))</code> is a point moving in a circle. Scale it to control orbit size, multiply by different frequencies for figure-eights and Lissajous curves.`,
    code: `#version 300 es
precision highp float;
uniform vec2  u_resolution;
uniform float u_time;
out vec4 fragColor;

void main() {
  vec2 uv = (gl_FragCoord.xy / u_resolution.xy) * 2.0 - 1.0;
  uv.x *= u_resolution.x / u_resolution.y;

  // Orbiting point using sin/cos
  vec2 orbit = vec2(cos(u_time * 1.1) * 0.5,
                    sin(u_time * 0.7) * 0.4);

  float d  = length(uv - orbit);
  float d2 = length(uv - orbit * -0.7);

  // Glow falloff: intensity / distance
  float glow  = 0.06 / max(0.001, d);
  float glow2 = 0.04 / max(0.001, d2);

  // Color shifts over time
  float hShift = sin(u_time * 0.5) * 0.5 + 0.5;
  vec3 col  = glow  * mix(vec3(0.3, 0.6, 1.0), vec3(1.0, 0.4, 0.8), hShift);
  vec3 col2 = glow2 * mix(vec3(1.0, 0.8, 0.2), vec3(0.2, 1.0, 0.6), hShift);

  fragColor = vec4(col + col2, 1.0);
}`,
  },

  {
    id: 'patterns',
    title: 'Tiling with fract()',
    tags: ['fract()', 'floor()', 'mod()', 'tiling'],
    desc: [
      `<code>fract(x)</code> returns the fractional part of <code>x</code> — it subtracts <code>floor(x)</code>. This wraps any value back to [0, 1), which means it tiles space. Multiplying UV by N before taking <code>fract()</code> tiles the pattern N times: <code>vec2 tile = fract(uv * 6.0)</code> gives a 6×6 grid where each cell has the same [0,1] coordinate space.`,
      `Inside each tile, <code>tile</code> is just a local UV. You can draw any shape there — a circle, a triangle, a smiley face — and it repeats. You can also use <code>floor(uv * N)</code> to get the integer cell index, which lets you vary properties per cell (different color, different size, offset position).`,
      `<code>mod(x, y)</code> is the same idea extended: it wraps <code>x</code> to [0, y). Together with <code>floor()</code> you can do checkerboards, staggered grids, brick patterns, and hexagonal tilings.`,
    ],
    callout: `<strong>Key insight:</strong> <code>fract(uv * N)</code> tiles the canvas into an N×N grid. Use <code>floor(uv * N)</code> to get the cell index — a unique ID per tile you can hash for per-cell variation.`,
    code: `#version 300 es
precision highp float;
uniform vec2  u_resolution;
uniform float u_time;
out vec4 fragColor;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  uv.x *= u_resolution.x / u_resolution.y;

  float N    = 7.0;
  vec2 cell  = floor(uv * N);         // integer cell ID
  vec2 local = fract(uv * N) * 2.0 - 1.0;  // [-1,1] within cell

  // Each cell gets its own random radius and hue
  float r   = 0.4 + 0.5 * hash(cell);
  float hue = hash(cell + 0.5);
  float phase = hash(cell + 1.5) * 6.28;

  // Pulsing size
  float pulse = r * (0.7 + 0.3 * sin(u_time * 2.0 + phase));
  float d = length(local);
  float circle = smoothstep(pulse + 0.05, pulse - 0.05, d);

  // Simple hue-ish color from hash
  vec3 col = circle * vec3(
    0.5 + 0.5 * sin(hue * 6.28 + 0.0),
    0.5 + 0.5 * sin(hue * 6.28 + 2.1),
    0.5 + 0.5 * sin(hue * 6.28 + 4.2)
  );
  fragColor = vec4(col, 1.0);
}`,
  },

  {
    id: 'noise',
    title: 'Noise & Organic Textures',
    tags: ['hash()', 'noise()', 'fBm', 'smoothstep()'],
    desc: [
      `Shaders don't have random number generators — they're deterministic. But you can create a <strong>pseudo-random hash</strong> function: <code>fract(sin(dot(p, k)) * large)</code> maps any 2D coordinate to a value that looks random. Given the same input it always returns the same output, so it's reproducible and tileable.`,
      `Raw hash noise is blocky. <strong>Value noise</strong> smooths it by interpolating between random values at integer grid corners using a smooth curve (the cubic <code>f*f*(3-2*f)</code> instead of linear). The result is a smooth, continuous noise field. <strong>fBm (fractal Brownian motion)</strong> stacks multiple noise octaves at different scales and amplitudes — each layer adds finer detail, creating the appearance of natural textures like clouds, terrain, and fire.`,
      `The key parameters: frequency controls "zoom" (multiply UV by more = smaller features), amplitude controls "height" (multiply the noise value), and the number of octaves controls detail complexity. Each octave typically halves the amplitude and doubles the frequency.`,
    ],
    callout: `<strong>Key insight:</strong> fBm = sum of <code>noise(uv * 2^i) * 0.5^i</code> for i = 0 to N. More octaves = more detail = more computation. 4–6 octaves is typical for visual work.`,
    code: `#version 300 es
precision highp float;
uniform vec2  u_resolution;
uniform float u_time;
out vec4 fragColor;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// Value noise: smooth interpolation between grid hashes
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f); // smooth step curve
  return mix(mix(hash(i + vec2(0,0)), hash(i + vec2(1,0)), u.x),
             mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
}

// fBm: stack octaves for fractal detail
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.0; a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  uv.x *= u_resolution.x / u_resolution.y;

  // Domain-warp: distort UV by noise before sampling
  vec2 q = vec2(fbm(uv + u_time * 0.1),
                fbm(uv + vec2(1.7, 9.2) + u_time * 0.08));
  float n = fbm(uv * 2.0 + q);

  // Map noise to a warm gradient
  vec3 a = vec3(0.05, 0.1,  0.3);
  vec3 b = vec3(0.9,  0.6,  0.2);
  fragColor = vec4(mix(a, b, n), 1.0);
}`,
  },

  {
    id: 'sdf',
    title: 'Signed Distance Fields',
    tags: ['SDF', 'min()', 'max()', 'shape operations'],
    desc: [
      `A <strong>Signed Distance Field (SDF)</strong> generalizes the distance-to-circle idea. For any shape, the SDF returns the distance to the nearest point on the shape's boundary — <strong>positive outside, negative inside</strong> (hence "signed"). The sign tells you which side you're on; the magnitude tells you how far from the edge.`,
      `SDFs make shape operations trivially elegant. <strong>Union</strong> of two shapes: <code>min(d1, d2)</code>. <strong>Intersection</strong>: <code>max(d1, d2)</code>. <strong>Subtraction</strong> of shape B from A: <code>max(dA, -dB)</code>. You can also blend shapes smoothly with <code>smin()</code> — a soft minimum that rounds the join.`,
      `The SDF value also gives you automatic gradients and contour lines for free. Rendering <code>fract(d * k)</code> shows evenly-spaced rings around your shape. The edge is always exactly at <code>d == 0</code>, so <code>smoothstep(-eps, eps, d)</code> always gives a perfectly anti-aliased boundary, regardless of zoom level.`,
    ],
    callout: `<strong>Key insight:</strong> once you have a signed distance value, you have everything — fill (<code>d&lt;0</code>), anti-aliased edge (<code>smoothstep(0,eps,d)</code>), outline (<code>abs(d)&lt;w</code>), and contours (<code>fract(d*k)</code>).`,
    code: `#version 300 es
precision highp float;
uniform vec2  u_resolution;
uniform float u_time;
out vec4 fragColor;

float sdCircle(vec2 p, float r)    { return length(p) - r; }
float sdBox(vec2 p, vec2 b)        {
  vec2 d = abs(p) - b;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}
// Smooth union: blends two shapes together
float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5*(b-a)/k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

void main() {
  vec2 uv = (gl_FragCoord.xy / u_resolution.xy) * 2.0 - 1.0;
  uv.x *= u_resolution.x / u_resolution.y;

  float t  = u_time * 0.6;
  float d1 = sdCircle(uv - vec2(cos(t) * 0.35, sin(t) * 0.25), 0.3);
  float d2 = sdBox(uv - vec2(cos(t + 3.14) * 0.3, sin(t*1.3)*0.2), vec2(0.22));

  // Smooth union — shapes melt into each other
  float d = smin(d1, d2, 0.2);

  // Visualize the SDF
  vec3 col = d < 0.0
    ? mix(vec3(0.2, 0.5, 1.0), vec3(0.8, 0.3, 1.0),
          smoothstep(-0.5, 0.0, d))
    : vec3(0.04 + 0.02 * sin(d * 25.0 - u_time));

  // Sharp anti-aliased boundary
  col = mix(col, vec3(1.0), 1.0 - smoothstep(0.0, 0.006, abs(d)));
  fragColor = vec4(col, 1.0);
}`,
  },

  {
    id: 'color',
    title: 'Color Spaces & HSV',
    tags: ['HSV', 'hsv2rgb()', 'atan()', 'hue'],
    desc: [
      `RGB colors are great for the GPU but awkward for humans to manipulate. <strong>HSV (Hue, Saturation, Value)</strong> separates color into three intuitive axes: <em>hue</em> is the color wheel angle (red→yellow→green→cyan→blue→magenta→red), <em>saturation</em> is color intensity (0 = grey, 1 = fully vivid), and <em>value</em> is brightness (0 = black, 1 = full bright).`,
      `Converting HSV → RGB is a classic one-liner shader trick. The compact version uses <code>fract()</code> and vector operations to produce all three channels in one expression. Once you have it, cycling <code>hue += u_time * speed</code> animates the whole color scheme smoothly without any color artifacts.`,
      `<code>atan(y, x)</code> gives the angle of a point in polar coordinates, in the range [-π, π]. Dividing by 2π and adding 0.5 maps it to [0, 1], which is a perfect hue value. This maps any direction in space to a rainbow of colors — the foundation of color wheel visualizations.`,
    ],
    callout: `<strong>Key insight:</strong> HSV → RGB conversion is <code>c.z * mix(1, clamp(abs(fract(c.x + k) * 6 - 3) - 1, 0, 1), c.y)</code> for each R/G/B channel with different <code>k</code> offsets (0, 2/3, 1/3).`,
    code: `#version 300 es
precision highp float;
uniform vec2  u_resolution;
uniform float u_time;
out vec4 fragColor;

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
  vec2 uv = (gl_FragCoord.xy / u_resolution.xy) * 2.0 - 1.0;
  uv.x *= u_resolution.x / u_resolution.y;

  float angle = atan(uv.y, uv.x) / 6.2832 + 0.5; // 0..1
  float dist  = length(uv);

  // Color wheel: hue = angle, sat = dist, val fades at center
  float hue = angle + u_time * 0.08;
  float sat = smoothstep(0.0, 0.25, dist);
  float val = 1.0 - smoothstep(0.9, 1.05, dist);

  // Spiral arms modulate saturation
  float spiral = 0.5 + 0.5 * sin(angle * 8.0 - dist * 6.0 - u_time * 2.0);
  sat = mix(sat * 0.4, sat, spiral);

  vec3 col = hsv2rgb(vec3(hue, sat, val));
  fragColor = vec4(col, 1.0);
}`,
  },

  {
    id: 'polar',
    title: 'Polar Coordinates & Symmetry',
    tags: ['atan()', 'polar', 'symmetry', 'floor()'],
    desc: [
      `Cartesian coordinates (x, y) describe position on a grid. <strong>Polar coordinates</strong> (r, θ) describe it as a distance and angle from the origin. Converting with <code>r = length(uv)</code> and <code>theta = atan(uv.y, uv.x)</code> opens up a whole class of effects impossible or awkward in Cartesian space: spirals, petals, star shapes, kaleidoscopes.`,
      `<strong>N-fold symmetry</strong> means the pattern repeats N times around the circle. You get it by quantizing the angle: <code>theta = mod(theta, 2*PI/N)</code>. For <strong>mirror symmetry</strong> within each segment, subtract half the segment width: <code>theta = abs(theta - PI/N)</code>. These two operations together give you a kaleidoscope.`,
      `Mixing polar and Cartesian quantities creates hybrid effects. A shape defined in Cartesian space (like an SDF box) plotted in a polar-warped space creates star-like or flower-like deformations. The boundary between shapes is always at the angle where the transition happens.`,
    ],
    callout: `<strong>Key insight:</strong> <code>floor(angle / (2π/N)) * (2π/N)</code> snaps the angle to N discrete steps — instant N-fold rotational symmetry. Combined with <code>abs()</code> you get mirror symmetry too.`,
    code: `#version 300 es
precision highp float;
uniform vec2  u_resolution;
uniform float u_time;
out vec4 fragColor;

void main() {
  vec2 uv = (gl_FragCoord.xy / u_resolution.xy) * 2.0 - 1.0;
  uv.x *= u_resolution.x / u_resolution.y;

  float r     = length(uv);
  float theta = atan(uv.y, uv.x);

  // 6-fold kaleidoscope symmetry
  float N     = 6.0;
  float seg   = 6.2832 / N;
  theta       = mod(theta + u_time * 0.15, seg);
  theta       = abs(theta - seg * 0.5);    // mirror each segment

  // Reconstruct UV in the folded space
  vec2 p = vec2(cos(theta), sin(theta)) * r;

  // Animated flower SDF
  float petals = 4.0;
  float petal  = 0.35 + 0.25 * cos(theta * petals * N * 0.5 + u_time);
  float shape  = smoothstep(petal + 0.03, petal - 0.03, r);

  // Interior pattern: concentric rings with hue
  float rings = sin(r * 18.0 - u_time * 3.0) * 0.5 + 0.5;
  float hue   = theta / 3.14159 + r * 0.5 + u_time * 0.05;
  vec3 col    = shape * vec3(
    0.5 + 0.5 * sin(hue * 6.28),
    0.5 + 0.5 * sin(hue * 6.28 + 2.1),
    0.5 + 0.5 * sin(hue * 6.28 + 4.2)
  ) * (0.6 + 0.4 * rings);

  fragColor = vec4(col, 1.0);
}`,
  },
];

// ── Live section demo ─────────────────────────────────────────────────────────
class SectionDemo {
  constructor(container, code) {
    this._original = code;
    this._timer = null;

    const pane = document.createElement('div');
    pane.className = 'demo-pane';

    // Code side
    const codeWrap = document.createElement('div');
    codeWrap.className = 'demo-code-wrap';

    const codeHeader = document.createElement('div');
    codeHeader.className = 'demo-code-header';

    const codeLabel = document.createElement('span');
    codeLabel.className = 'demo-code-label';
    codeLabel.textContent = 'GLSL — edit live';

    const resetBtn = document.createElement('button');
    resetBtn.className = 'demo-reset-btn';
    resetBtn.textContent = 'Reset';
    resetBtn.addEventListener('click', () => {
      this.ta.value = this._original;
      this._compile();
    });

    codeHeader.appendChild(codeLabel);
    codeHeader.appendChild(resetBtn);

    this.ta = document.createElement('textarea');
    this.ta.className = 'demo-textarea';
    this.ta.value = code;
    this.ta.spellcheck = false;
    this.ta.autocomplete = 'off';
    this.ta.autocorrect = 'off';
    this.ta.autocapitalize = 'off';
    // Tab key inserts spaces
    this.ta.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const s = this.ta.selectionStart;
        const v = this.ta.value;
        this.ta.value = v.slice(0, s) + '  ' + v.slice(this.ta.selectionEnd);
        this.ta.selectionStart = this.ta.selectionEnd = s + 2;
      }
    });

    this.errDiv = document.createElement('div');
    this.errDiv.className = 'demo-error';

    codeWrap.appendChild(codeHeader);
    codeWrap.appendChild(this.ta);
    codeWrap.appendChild(this.errDiv);

    // Canvas side
    const canvasWrap = document.createElement('div');
    canvasWrap.className = 'demo-canvas-wrap';

    const canvasLabel = document.createElement('div');
    canvasLabel.className = 'demo-canvas-label';
    canvasLabel.textContent = 'Preview';

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'demo-canvas';

    canvasWrap.appendChild(canvasLabel);
    canvasWrap.appendChild(this.canvas);

    pane.appendChild(codeWrap);
    pane.appendChild(canvasWrap);
    container.appendChild(pane);

    // Init renderer
    this.renderer = new Renderer(this.canvas);
    this.renderer.onError = (msg) => {
      const m = msg.match(/ERROR:\s*\d+:(\d+):\s*(.*)/);
      this.errDiv.textContent = m ? `Line ${m[1]}: ${m[2]}` : msg;
      this.errDiv.style.display = 'block';
    };
    this.renderer.onCompileSuccess = () => {
      this.errDiv.style.display = 'none';
    };
    this.renderer.compile(code);

    // Live re-compile on edit (debounced)
    this.ta.addEventListener('input', () => {
      clearTimeout(this._timer);
      this._timer = setTimeout(() => this._compile(), 450);
    });
  }

  _compile() {
    this.renderer.compile(this.ta.value);
  }
}

// ── Build page ────────────────────────────────────────────────────────────────
function buildPage() {
  const toc       = document.getElementById('toc');
  const container = document.getElementById('sections-container');

  for (const [i, s] of SECTIONS.entries()) {
    // ToC entry
    const link = document.createElement('a');
    link.href = `#${s.id}`;
    link.className = 'toc-link';
    link.innerHTML = `<span class="toc-num">${String(i + 1).padStart(2, '0')}</span>${s.title}`;
    toc.appendChild(link);

    // Section
    const section = document.createElement('section');
    section.className = 'learn-section';
    section.id = s.id;

    // Header
    const header = document.createElement('div');
    header.className = 'section-header';
    header.innerHTML = `
      <span class="section-num">${String(i + 1).padStart(2, '0')}</span>
      <h2 class="section-title">${s.title}</h2>
    `;

    // Tags
    const tags = document.createElement('div');
    tags.className = 'section-tags';
    for (const tag of s.tags) {
      const t = document.createElement('span');
      t.className = 'tag';
      t.textContent = tag;
      tags.appendChild(t);
    }

    // Description
    const desc = document.createElement('div');
    desc.className = 'section-desc';
    for (const para of s.desc) {
      const p = document.createElement('p');
      p.innerHTML = para;
      desc.appendChild(p);
    }

    section.appendChild(header);
    section.appendChild(tags);
    section.appendChild(desc);

    // Demo pane
    new SectionDemo(section, s.code);

    // Callout
    if (s.callout) {
      const callout = document.createElement('div');
      callout.className = 'callout';
      callout.innerHTML = s.callout;
      section.appendChild(callout);
    }

    container.appendChild(section);
  }

  // Highlight active ToC item on scroll
  const tocLinks = toc.querySelectorAll('.toc-link');
  const sections = container.querySelectorAll('.learn-section');
  const observer = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (e.isIntersecting) {
        const id = e.target.id;
        for (const l of tocLinks) {
          l.classList.toggle('active', l.getAttribute('href') === `#${id}`);
        }
      }
    }
  }, { threshold: 0.3 });

  for (const s of sections) observer.observe(s);
}

// ── Theme sync ────────────────────────────────────────────────────────────────
function applyTheme() {
  const saved = localStorage.getItem('shader-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.innerHTML = saved === 'light'
    ? '<iconify-icon icon="mingcute:sun-line" width="18" height="18"></iconify-icon>'
    : '<iconify-icon icon="mingcute:moon-line" width="18" height="18"></iconify-icon>';
}

document.getElementById('theme-toggle')?.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.innerHTML = next === 'light'
    ? '<iconify-icon icon="mingcute:sun-line" width="18" height="18"></iconify-icon>'
    : '<iconify-icon icon="mingcute:moon-line" width="18" height="18"></iconify-icon>';
  localStorage.setItem('shader-theme', next);
});

applyTheme();
buildPage();
