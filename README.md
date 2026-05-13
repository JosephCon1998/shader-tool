# shader-tool

An AI-powered GLSL fragment shader editor with real-time WebGL2 preview, interactive parameter controls, and one-click export to React, Svelte, Vanilla JS, or raw GLSL.

---

## Features

- **AI shader generation** — describe a shader in plain English; streaming output appears in real time
- **Multiple AI providers** — Anthropic, OpenAI, Gemini, or any OpenAI-compatible local model (LM Studio, Ollama)
- **Real-time WebGL2 preview** — shader compiles and runs as code arrives
- **Auto-fix** — broken shaders are automatically sent back to the AI for correction
- **Interactive parameter controls** — sliders, color pickers, toggles, and vector controls driven by `@param` annotations in the shader source
- **Parameter animation** — per-parameter play button oscillates values automatically
- **Prompt sweeteners** — one-click technique, theme, and color phrase suggestions
- **Prompt enhancement** — AI rewrites your prompt into a more vivid, detailed description
- **Monaco editor** — full syntax-highlighted GLSL editing with auto-compile
- **History** — up to 20 shaders saved across sessions, with search, tags, and rename
- **Presets** — capture and switch between named parameter configurations
- **Undo / redo** — 50-step state stack (Cmd/Ctrl+Z)
- **Export** — GLSL · Vanilla JS · React · Svelte
- **Shader adapter** — converts external shaders to the app's conventions
- **Showcase** — browse example shaders and import them into the editor
- **Fullscreen mode** and resolution quality presets
- **Dark / light theme** with customizable accent color

---

## Quick Start

```bash
git clone <repo-url>
cd shader-tool
npm install
cp .env.example .env   # add your API key (see Providers below)
npm run dev            # auto-restarts on file change
```

Open `http://localhost:2000` (or the port set in `.env`).

For production: `npm start`.

---

## Providers

| Provider | Key in `.env` / Settings UI | Notes |
|----------|----------------------------|-------|
| **Anthropic** (default) | `ANTHROPIC_API_KEY` | Claude models; supports extended thinking |
| **OpenAI** | Set in Settings UI | GPT-4o and newer models |
| **Google Gemini** | Set in Settings UI | Gemini 2.x models |
| **Local** | Set base URL + model name in Settings | LM Studio, Ollama, any OpenAI-compatible server |

Only `ANTHROPIC_API_KEY` is read from `.env`. All other keys are entered in the Settings panel and stored in `localStorage`.

---

## Shader Conventions

Every generated shader follows these constraints:

```glsl
#version 300 es
precision highp float;

uniform float u_time;       // elapsed seconds
uniform vec2 u_resolution;  // canvas size in pixels

out vec4 fragColor;

void main() { ... }
```

Tunable uniforms use `// @param` annotations:

```glsl
uniform float u_speed;  // @param label:"Speed" min:0.0 max:2.0 default:0.5 step:0.01
uniform vec3  u_color;  // @param label:"Color" default:[1.0, 0.4, 0.1]
uniform bool  u_glow;   // @param label:"Glow" default:true
```

The `u_` prefix is stripped when generating control labels and export prop names.

---

## Architecture

```
server.js              Express backend; proxies Anthropic / OpenAI APIs via SSE
public/
  index.html           Landing page (provider selection)
  app.html             Main editor
  showcase.html        Example shader gallery
  learn.html           Educational resources
  js/
    app.js             Main controller — wires all UI, manages state, orchestrates flows
    renderer.js        WebGL2 wrapper (full-screen triangle, uniform binding, animation loop)
    parser.js          Extracts uniform + @param metadata from GLSL source
    controls.js        Builds interactive parameter UI from uniform descriptors
    exporters.js       Generates Vanilla JS / React / Svelte component code
    ai.js              SSE client for streaming shader generation
```

---

## Export Targets

| Format | What you get |
|--------|-------------|
| **GLSL** | Raw shader source |
| **Vanilla JS** | Self-contained `createShader()` function with WebGL2 setup |
| **React** | Functional component with `useRef` / `useEffect`; props for each uniform |
| **Svelte** | Svelte 5 component using runes (`$state`, `$props`, `$bindable`) |

All exports include uniform binding, device pixel ratio handling, and proper cleanup.

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | — | Required when using Anthropic as the provider |
| `PORT` | `2000` | HTTP port the server listens on |
