# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Commands

```bash
# Development (auto-restart on file change)
npm run dev

# Production
npm start
```

Requires `ANTHROPIC_API_KEY` in `.env` (see `.env.example`). Server runs at
`http://localhost:2000` by default.

No build step, no tests, no linter configured.

## Architecture

This is a single-page app: an Express backend (`server.js`) that proxies the
Anthropic API, and a vanilla JS frontend served from `public/`.

**Backend (`server.js`)**

- `POST /api/generate` — streams a shader generation request to Claude via SSE.
  Accepts `{ prompt, currentShader }`. When `currentShader` is provided, it's
  appended to the user message so Claude iterates on the existing shader rather
  than generating from scratch.
- `POST /api/random-prompt` — non-streaming call to Claude that returns a single
  creative shader description.
- `extractShader(text)` — parses Claude's response with four fallback strategies
  (named fence → generic fence with `#version` → fence with `void main` → bare
  GLSL) to recover the shader code and separate it from the explanation text.

**Frontend (`public/js/`)**

- `app.js` — main controller. Wires all DOM events, manages the `currentShader`
  state, orchestrates the generate → compile → auto-fix flow (if a shader fails
  to compile, it sends the error back to Claude once for an automatic fix
  attempt before giving up).
- `renderer.js` — `Renderer` class wrapping WebGL2. Uses a full-screen triangle
  (no vertex buffer, driven by `gl_VertexID`) to render fragment shaders.
  Manages `u_time` and `u_resolution` automatically; other uniforms are set via
  `setUniform(name, value)`. `compile()` returns `null` on success or an error
  string on failure, making it safe to call silently.
- `parser.js` — `extractUniforms(glsl)` scans the GLSL source line-by-line for
  `uniform` declarations, skipping `u_time` and `u_resolution`. Reads inline
  `// @param` annotations to populate labels, min/max/step/default metadata.
- `controls.js` — `ControlsPanel` builds the right-panel UI from uniform
  descriptors returned by `parser.js`. Calls a callback with `(name, value)` on
  every change so `app.js` can forward it to the renderer.
- `exporters.js` — four export functions (`exportGLSL`, `exportVanillaJS`,
  `exportReact`, `exportSvelte`) that embed the current shader source and
  generate self-contained component code with uniform props wired up.
- `ai.js` — `generateShader(prompt, currentShader, callbacks)` fetches
  `/api/generate` and drives the SSE stream, calling `onDelta`, `onDone`, or
  `onError`.

## Shader conventions

All generated shaders must follow these constraints (enforced by the system
prompt):

- First line: `#version 300 es`, second line: `precision highp float;`
- Required uniforms: `uniform float u_time;` and `uniform vec2 u_resolution;`
- Output: `out vec4 fragColor;`
- Tunable uniforms use `// @param` annotations on the same line:
  ```glsl
  uniform float u_speed; // @param label:"Speed" min:0.0 max:2.0 default:0.12 step:0.01
  uniform vec3 u_color;  // @param label:"Color" default:[1.0,0.5,0.2]
  uniform bool u_glow;   // @param label:"Glow" default:true
  ```
- The `u_` prefix is stripped when generating prop names for exports and control
  labels.
