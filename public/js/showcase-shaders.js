// ── Showcase shader library ───────────────────────────────────────────────────
// To add a new shader: push a new object to this array.
// Required fields: id (unique string), name, description, glsl (full shader source).

export const SHOWCASE_SHADERS = [
  {
    id: 'plasma-waves',
    name: 'Plasma Waves',
    description: 'Layered sine-wave interference creates a pulsating chromatic plasma field in real time.',
    glsl: `#version 300 es
precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
out vec4 fragColor;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float t = u_time * 0.5;

  float v = sin(uv.x * 8.0 + t)
          + sin(uv.y * 8.0 + t * 1.1)
          + sin((uv.x + uv.y) * 6.0 + t * 1.3)
          + sin(length(uv - 0.5) * 14.0 - t * 1.5);

  vec3 col;
  col.r = 0.5 + 0.5 * sin(v + 0.0);
  col.g = 0.5 + 0.5 * sin(v + 2.094);
  col.b = 0.5 + 0.5 * sin(v + 4.189);

  fragColor = vec4(col, 1.0);
}`,
  },

  {
    id: 'aurora-borealis',
    name: 'Aurora Borealis',
    description: 'Noise-driven bands of green, teal, and violet shimmer across a star-dusted night sky.',
    glsl: `#version 300 es
precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
out vec4 fragColor;

float hash(vec2 p) {
  p = fract(p * vec2(127.1, 311.7));
  p += dot(p, p + 19.19);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1,0)), f.x),
             mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float t = u_time * 0.2;

  vec3 sky = mix(vec3(0.0, 0.01, 0.06), vec3(0.0, 0.04, 0.14), uv.y * uv.y);

  vec3 aurora = vec3(0.0);
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    float fy = 0.38 + fi * 0.1;
    float n1 = noise(vec2(uv.x * 3.0 + t + fi * 7.3, fi * 4.1));
    float n2 = noise(vec2(uv.x * 5.5 - t * 0.7 + fi * 3.2, fi * 2.9 + 1.0));
    float wave = fy + (n1 - 0.5) * 0.14 + (n2 - 0.5) * 0.07;
    float bw = 0.045 + 0.02 * sin(fi * 1.7 + t);
    float band = exp(-pow((uv.y - wave) / bw, 2.0));
    float bright = 0.5 + 0.5 * noise(vec2(uv.x * 4.0 + t * 0.5, fi + t * 0.3));
    vec3 bandColor = mix(
      vec3(0.0, 0.9, 0.3),
      mix(vec3(0.0, 0.7, 1.0), vec3(0.7, 0.0, 1.0), fi / 4.0),
      fi / 4.0
    );
    aurora += bandColor * band * bright * 0.55;
  }

  float star = hash(floor(uv * 280.0));
  float sg = star > 0.97 ? pow((star - 0.97) * 33.3, 2.0) * (0.6 + 0.4 * sin(u_time * 2.0 + star * 100.0)) : 0.0;

  vec3 col = sky + aurora + vec3(sg * 0.8);
  fragColor = vec4(col, 1.0);
}`,
  },

  {
    id: 'neon-city-grid',
    name: 'Neon City Grid',
    description: 'A synthwave perspective grid stretches to a glowing horizon beneath a magenta sun.',
    glsl: `#version 300 es
precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
out vec4 fragColor;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float t = u_time * 0.35;

  float horizon = 0.42;

  vec3 sky = mix(vec3(0.02, 0.0, 0.1), vec3(0.06, 0.0, 0.18), uv.y);
  float hg = exp(-abs(uv.y - horizon) * 22.0);
  sky += vec3(1.0, 0.12, 0.5) * hg * 0.9;

  vec3 col = sky;

  if (uv.y < horizon) {
    float fy = max(horizon - uv.y, 0.001);
    float depth = 1.0 / fy;
    float wx = (uv.x - 0.5) * depth * 0.5;
    float wz = depth * 0.5 + t * 1.5;

    vec2 gf = abs(fract(vec2(wx, wz)) - 0.5);
    float line = 1.0 - smoothstep(0.0, 0.035, min(gf.x, gf.y));
    float fog = clamp(fy * 6.0, 0.0, 1.0);
    vec3 gridCol = mix(vec3(0.9, 0.0, 0.8), vec3(0.0, 0.8, 1.0), fract(wx + 0.5));
    col += gridCol * line * (1.0 - fog * 0.85) * 1.3;
  }

  float sd = length(vec2(uv.x - 0.5, uv.y - horizon - 0.14));
  float sun = 1.0 - smoothstep(0.048, 0.052, sd);
  float sg = exp(-sd * 9.0) * 0.35;
  col += vec3(1.0, 0.2, 0.6) * (sun + sg);

  col = pow(max(col, vec3(0.0)), vec3(0.88));
  fragColor = vec4(col, 1.0);
}`,
  },

  {
    id: 'voronoi-crystals',
    name: 'Voronoi Crystals',
    description: 'Animated Voronoi cells shift and reconfigure like living crystalline structures.',
    glsl: `#version 300 es
precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
out vec4 fragColor;

float hash1(float n) { return fract(sin(n) * 43758.5453); }
vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}

vec3 voronoi(vec2 p, float t) {
  vec2 i = floor(p), f = fract(p);
  float d1 = 8.0, d2 = 8.0;
  vec2 mc;
  for (int y = -2; y <= 2; y++) {
    for (int x = -2; x <= 2; x++) {
      vec2 nb = vec2(float(x), float(y));
      vec2 cell = i + nb;
      vec2 pt = hash2(cell);
      pt = 0.5 + 0.45 * sin(t * 0.7 + 6.28318 * pt);
      vec2 diff = nb + pt - f;
      float d = dot(diff, diff);
      if (d < d1) { d2 = d1; d1 = d; mc = cell; }
      else if (d < d2) d2 = d;
    }
  }
  return vec3(sqrt(d1), sqrt(d2), hash1(dot(mc, vec2(7.0, 113.0))));
}

void main() {
  float aspect = u_resolution.x / u_resolution.y;
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 p = vec2(uv.x * aspect, uv.y) * 5.0;
  float t = u_time * 0.5;

  vec3 v = voronoi(p, t);
  float edge = 1.0 - smoothstep(0.0, 0.06, v.y - v.x);
  vec3 bc = 0.5 + 0.5 * cos(v.z * 6.28318 + t * 0.3 + vec3(0.0, 2.094, 4.189));
  vec3 col = bc * (0.4 + 0.6 * v.x);
  col = mix(col, vec3(0.9, 0.97, 1.0), edge * 0.85);
  col *= 1.0 - smoothstep(0.0, 0.025, v.x) * 0.4;

  fragColor = vec4(col, 1.0);
}`,
  },

  {
    id: 'procedural-fire',
    name: 'Procedural Fire',
    description: 'Turbulent noise flows upward through a classic fire color ramp — black, red, orange, yellow, white.',
    glsl: `#version 300 es
precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
out vec4 fragColor;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x),
             mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 6; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float t = u_time * 1.4;

  vec2 p = uv;
  p.x += (fbm(uv * 3.0 + vec2(0.0, t * 0.3)) - 0.5) * 0.3;
  p.y += (fbm(uv * 3.0 + vec2(1.7, t * 0.2)) - 0.5) * 0.1;

  float f = fbm(p * 4.5 - vec2(0.0, t));
  f = pow(f, 2.2 - uv.y * 1.8);
  f *= (1.0 - abs(uv.x - 0.5) * 2.2);
  f = clamp(f, 0.0, 1.0);

  vec3 col = vec3(0.0);
  col = mix(col, vec3(0.9, 0.05, 0.0),  smoothstep(0.0,  0.28, f));
  col = mix(col, vec3(1.0, 0.45, 0.0),  smoothstep(0.28, 0.55, f));
  col = mix(col, vec3(1.0, 0.9,  0.05), smoothstep(0.55, 0.78, f));
  col = mix(col, vec3(1.0, 1.0,  0.9),  smoothstep(0.78, 1.0,  f));

  fragColor = vec4(col, 1.0);
}`,
  },

  {
    id: 'galaxy-spiral',
    name: 'Galaxy Spiral',
    description: 'Two slowly rotating spiral arms of blue and golden light form a top-down galactic view.',
    glsl: `#version 300 es
precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
out vec4 fragColor;

float hash(float n) { return fract(sin(n) * 43758.5453); }

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
  float t = u_time * 0.08;

  float r = length(uv);
  float angle = atan(uv.y, uv.x);

  float twist = 4.0;
  float armAngle = mod(angle + t + r * twist, 3.14159);
  float arm = exp(-pow((armAngle / 3.14159 - 0.5) * 2.6, 2.0));

  float bulge = exp(-r * r * 10.0);
  float disk = exp(-r * r * 1.2);
  float density = (arm * disk * 1.4 + bulge) * 2.0;

  float starSeed = floor(r * 55.0) * 131.0 + floor(mod(angle + 6.28318, 6.28318) / 0.12) * 7.0;
  float sb = hash(starSeed) > 0.95 ? pow((hash(starSeed) - 0.95) * 20.0, 2.0) * (0.7 + 0.3 * sin(u_time * 1.5 + starSeed)) : 0.0;

  vec3 armCol = mix(vec3(0.25, 0.45, 1.0), vec3(1.0, 0.85, 0.5), bulge + arm * 0.3);
  vec3 bg = vec3(0.0, 0.0, 0.03);

  vec3 col = bg + armCol * density * 0.5 + vec3(1.0, 0.95, 0.9) * sb;
  col = col / (col + vec3(0.55));
  col = pow(col, vec3(0.88));

  fragColor = vec4(col, 1.0);
}`,
  },

  {
    id: 'lava-lamp',
    name: 'Lava Lamp',
    description: 'Warm metaball blobs drift and merge in amber liquid, their edges glowing with heat.',
    glsl: `#version 300 es
precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
out vec4 fragColor;

float blobField(vec2 uv, vec2 center, float asp) {
  vec2 d = (uv - center) * vec2(asp, 1.0);
  return 0.009 / dot(d, d);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float t = u_time * 0.38;
  float asp = u_resolution.x / u_resolution.y;

  vec2 b1 = vec2(0.5 + 0.28*sin(t*0.70),      0.5 + 0.33*cos(t*0.52));
  vec2 b2 = vec2(0.5 + 0.24*cos(t*0.88+1.0),  0.3 + 0.24*sin(t*0.61+2.1));
  vec2 b3 = vec2(0.5 + 0.29*sin(t*0.53+3.5),  0.7 + 0.19*cos(t*0.79+1.5));
  vec2 b4 = vec2(0.35 + 0.14*cos(t*1.10),      0.5 + 0.29*sin(t*0.70+0.8));
  vec2 b5 = vec2(0.65 + 0.14*sin(t*0.93+2.0), 0.5 + 0.28*cos(t*0.60+1.2));

  float field = blobField(uv,b1,asp) + blobField(uv,b2,asp) + blobField(uv,b3,asp)
              + blobField(uv,b4,asp) + blobField(uv,b5,asp);
  float inside = smoothstep(0.97, 1.08, field);

  vec3 blobCol = mix(vec3(1.0,0.28,0.0), vec3(1.0,0.75,0.0), uv.y);
  blobCol = mix(blobCol, vec3(1.0,0.05,0.15), sin(field*0.4+t)*0.35+0.35);

  vec3 bg = mix(vec3(0.06,0.03,0.0), vec3(0.12,0.08,0.0), uv.y);
  bg += vec3(0.9,0.4,0.0) * inside * 0.15;

  vec3 col = mix(bg, blobCol, inside);
  col += vec3(1.0, 0.7, 0.3) * smoothstep(1.04, 1.22, field) * 0.45;

  fragColor = vec4(col, 1.0);
}`,
  },

  {
    id: 'domain-warp',
    name: 'Domain Warp',
    description: 'Double-layered fractional Brownian motion bends space into a turbulent abstract landscape.',
    glsl: `#version 300 es
precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
out vec4 fragColor;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
}
float fbm(vec2 p) {
  float v=0.0,a=0.5; for(int i=0;i<6;i++){v+=a*noise(p);p*=2.1;a*=0.5;} return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float t = u_time * 0.14;

  vec2 q = vec2(fbm(uv + t), fbm(uv + vec2(5.2,1.3)));
  vec2 r = vec2(fbm(uv + 4.0*q + vec2(1.7,9.2) + t*0.5),
                fbm(uv + 4.0*q + vec2(8.3,2.8) + t*0.3));
  float f = fbm(uv + 4.0 * r);

  vec3 col = mix(
    mix(vec3(0.08,0.0,0.28), vec3(0.0,0.28,0.8), clamp(f*2.0,0.0,1.0)),
    mix(vec3(0.85,0.08,0.0), vec3(0.95,0.82,0.05), clamp(f*2.0-1.0,0.0,1.0)),
    clamp(f, 0.0, 1.0)
  );
  col *= f * 1.8 + 0.35;

  fragColor = vec4(col, 1.0);
}`,
  },

  {
    id: 'ocean-caustics',
    name: 'Ocean Caustics',
    description: 'Sunlight refracts through a rippling water surface and dances across a deep-blue seabed.',
    glsl: `#version 300 es
precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
out vec4 fragColor;

float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p) {
  vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
}

float caustic(vec2 p, float t) {
  float c=0.0;
  for (int i=0;i<3;i++) {
    float fi=float(i);
    vec2 off=vec2(sin(t*0.7+fi),cos(t*0.5+fi*1.3))*0.55;
    c+=(1.0-abs(2.0*noise(p*(1.5+fi*0.7)+off)-1.0))/(fi+1.5);
  }
  return c;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float t = u_time * 0.48;

  vec2 d = vec2(noise(uv*3.0+vec2(t*0.3,0.0)),
                noise(uv*3.0+vec2(0.0,t*0.4))) * 0.038 - 0.019;

  float c  = caustic(uv + d,        t);
  float c2 = caustic(uv*1.8 + d*0.5 + vec2(3.1,1.7), t*0.78);

  float bright = c * c2 * 3.2;

  vec3 deep  = vec3(0.0, 0.055, 0.18);
  vec3 light = vec3(0.08, 0.72, 0.95);

  vec3 col = mix(deep, light, pow(bright, 0.5) * 0.65);
  col += light * pow(bright, 2.2) * 0.55;

  fragColor = vec4(col, 1.0);
}`,
  },

  {
    id: 'hex-lattice',
    name: 'Hex Lattice',
    description: 'A slowly rotating hexagonal crystal grid glows with hue-shifted cell colors.',
    glsl: `#version 300 es
precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
out vec4 fragColor;

vec2 hexNearest(vec2 p) {
  float sq3 = 1.7320508;
  vec2 a = mod(p, vec2(1.0, sq3)) - vec2(0.5, sq3*0.5);
  vec2 b = mod(p - vec2(0.5, sq3*0.5), vec2(1.0, sq3)) - vec2(0.5, sq3*0.5);
  return dot(a,a) < dot(b,b) ? a : b;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5*u_resolution) / u_resolution.y;
  float t = u_time * 0.18;

  float ca=cos(t*0.08), sa=sin(t*0.08);
  vec2 rot = vec2(ca*uv.x - sa*uv.y, sa*uv.x + ca*uv.y);
  vec2 p = rot * 6.0;

  vec2 h = hexNearest(p);
  float d = length(h);

  float ring = abs(d - 0.28);
  float hex  = 1.0 - smoothstep(0.0, 0.04, ring);
  float dot_ = 1.0 - smoothstep(0.0, 0.04, d - 0.07);

  vec2 cellId = p - h;
  float hue = fract(dot(floor(cellId + 0.5), vec2(0.31,0.17)) + t*0.04);
  vec3 col = 0.5 + 0.5*cos(hue*6.28318 + vec3(0.0,2.094,4.189));

  vec3 base = vec3(0.02, 0.02, 0.05);
  vec3 result = mix(base, col * 0.85, hex);
  result = mix(result, vec3(1.0), dot_ * 0.6);
  result += col * exp(-d * 5.5) * 0.12;

  fragColor = vec4(result, 1.0);
}`,
  },
];
