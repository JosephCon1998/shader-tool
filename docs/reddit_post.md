# Reddit Post

**I built a tool that turns plain English into animated WebGL shaders — real-time preview, auto-generated controls, no signup**

---

I've always loved the look of GLSL shaders but found the feedback loop exhausting. So I built something to close that gap.

**ShaderTools** lets you describe a visual effect in plain English and watch it render in your browser in real time. Describe a pulsing bioluminescent creature, a storm of interference patterns, a lava lamp in slow motion — whatever you can picture. You're looking at it in under a second.

The thing I'm most proud of: when you generate a shader, you don't just get the visual. You get a live control panel — sliders and color pickers — automatically built from whatever parameters the AI decided to expose. Speed, color, intensity, zoom. You can tune it in real time without touching any code.

A few other things it does:

- When a shader doesn't work, it tries to fix itself before you ever see an error
- One-click export to React, Svelte, or vanilla JS — drop it straight into a project
- A "Surprise me" button that cycles across visual styles so you're not always staring at the same thing

It works with Claude, OpenAI, Gemini, or a local model through LM Studio — whichever you already have set up. No account, no cloud, nothing stored anywhere but your own machine.

It won't replace writing shaders by hand for serious work. But for sketching a visual idea in 30 seconds, handing a designer something they can actually play with, or just seeing what something looks like without hours of trial and error — it's become a regular part of my workflow.

Happy to answer any questions.
