function isColor(name) {
  return /col(or)?|rgb|hue/i.test(name);
}

function vecSize(type) {
  const m = type.match(/vec(\d)/);
  return m ? parseInt(m[1]) : null;
}

function toHex(rgb) {
  return '#' + rgb.map(v => {
    const b = Math.round(Math.min(1, Math.max(0, v)) * 255);
    return b.toString(16).padStart(2, '0');
  }).join('');
}

function fromHex(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b];
}

export class ControlsPanel {
  constructor(container, onUniformChange, onRenameParam) {
    this.container = container;
    this.onChange = onUniformChange;
    this.onRenameParam = onRenameParam || null;
    this.descriptors = [];
    this.values = {};
    this._animations = {};
  }

  rebuild(descriptors, savedValues = {}) {
    this._stopAllAnimations();
    this.descriptors = descriptors;
    this.values = {};
    for (const d of descriptors) {
      this.values[d.name] = structuredClone(savedValues[d.name] ?? d.default);
    }
    this._render();
    for (const d of descriptors) {
      this.onChange(d.name, this.values[d.name]);
    }
  }

  _stopAllAnimations() {
    for (const name of Object.keys(this._animations)) {
      cancelAnimationFrame(this._animations[name].rafId);
    }
    this._animations = {};
  }

  getValues() {
    return { ...this.values };
  }

  _render() {
    this.container.innerHTML = '';

    if (this.descriptors.length === 0) {
      this.container.innerHTML = '<p class="no-params">No tunable parameters found.<br>The AI will annotate uniforms with <code>// @param</code> comments.</p>';
      return;
    }

    for (const d of this.descriptors) {
      const row = this._buildControl(d);
      this.container.appendChild(row);
    }

    const resetBtn = document.createElement('button');
    resetBtn.className = 'btn btn-ghost reset-btn';
    resetBtn.textContent = 'Reset Defaults';
    resetBtn.addEventListener('click', () => {
      for (const d of this.descriptors) {
        this.values[d.name] = structuredClone(d.default);
        this.onChange(d.name, this.values[d.name]);
      }
      this._render();
    });
    this.container.appendChild(resetBtn);
  }

  _buildControl(d) {
    const wrap = document.createElement('div');
    wrap.className = 'control-row';
    wrap.dataset.uniformName = d.name;

    const labelEl = document.createElement('label');
    labelEl.className = 'control-label';
    labelEl.textContent = d.label;
    if (this.onRenameParam) {
      labelEl.title = 'Double-click to rename';
      labelEl.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'control-label-input';
        input.value = d.label;
        wrap.replaceChild(input, labelEl);
        input.select();
        let settled = false;
        const commit = () => {
          if (settled) return;
          settled = true;
          const val = input.value.trim();
          if (val && val !== d.label) {
            this.onRenameParam(d.name, val);
          } else {
            wrap.replaceChild(labelEl, input);
          }
        };
        const cancel = () => {
          if (settled) return;
          settled = true;
          wrap.replaceChild(labelEl, input);
        };
        input.addEventListener('keydown', (ev) => {
          if (ev.key === 'Enter')  { ev.preventDefault(); commit(); }
          if (ev.key === 'Escape') { ev.preventDefault(); cancel(); }
          ev.stopPropagation();
        });
        input.addEventListener('blur', commit);
        input.addEventListener('click', (ev) => ev.stopPropagation());
        input.focus();
      });
    }
    wrap.appendChild(labelEl);

    if (d.type === 'float' || d.type === 'int') {
      wrap.appendChild(this._slider(d));
    } else if (d.type === 'bool') {
      wrap.appendChild(this._toggle(d));
    } else {
      const n = vecSize(d.type);
      if (n && isColor(d.name) && n === 3) {
        wrap.appendChild(this._colorPicker(d));
      } else if (n) {
        wrap.appendChild(this._vecSliders(d, n));
      }
    }

    return wrap;
  }

  _slider(d) {
    const group = document.createElement('div');
    group.className = 'slider-group';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = d.min;
    slider.max = d.max;
    slider.step = d.step;
    slider.value = this.values[d.name];

    const num = document.createElement('input');
    num.type = 'number';
    num.className = 'num-input';
    num.min = d.min;
    num.max = d.max;
    num.step = d.step;
    num.value = parseFloat(this.values[d.name]).toFixed(3);

    const syncFromSlider = () => {
      const v = parseFloat(slider.value);
      num.value = v.toFixed(3);
      this.values[d.name] = v;
      this.onChange(d.name, v);
    };

    slider.addEventListener('input', () => {
      if (this._animations[d.name]) this._stopAnimation(d.name, playBtn);
      syncFromSlider();
    });

    num.addEventListener('input', () => {
      const v = parseFloat(num.value);
      if (!isNaN(v)) {
        if (this._animations[d.name]) this._stopAnimation(d.name, playBtn);
        slider.value = v;
        this.values[d.name] = v;
        this.onChange(d.name, v);
      }
    });

    const playBtn = document.createElement('button');
    playBtn.className = 'param-play-btn';
    playBtn.title = 'Animate';
    playBtn.innerHTML = '<iconify-icon icon="mingcute:play-fill" width="12" height="12"></iconify-icon>';

    const speedInput = document.createElement('input');
    speedInput.type = 'number';
    speedInput.className = 'param-speed-input';
    speedInput.value = '0.5';
    speedInput.min = '0.01';
    speedInput.max = '20';
    speedInput.step = '0.01';
    speedInput.title = 'Speed (cycles / sec)';

    playBtn.addEventListener('click', () => {
      if (this._animations[d.name]) {
        this._stopAnimation(d.name, playBtn);
      } else {
        this._startAnimation(d, slider, num, playBtn, speedInput);
      }
    });

    group.appendChild(slider);
    group.appendChild(num);
    group.appendChild(playBtn);
    group.appendChild(speedInput);
    return group;
  }

  _startAnimation(d, slider, num, playBtn, speedInput) {
    // Start phase from current value position so it continues smoothly
    const t0 = (this.values[d.name] - d.min) / (d.max - d.min);
    this._animations[d.name] = { rafId: null, phase: t0 * 2 }; // phase in [0, 2)

    const tick = (last) => (now) => {
      const anim = this._animations[d.name];
      if (!anim) return;
      const spd = Math.max(0.001, parseFloat(speedInput.value) || 0.5);
      anim.phase = (anim.phase + ((now - last) / 1000) * spd) % 2;
      const t = anim.phase < 1 ? anim.phase : 2 - anim.phase; // triangle 0→1→0
      const value = d.min + (d.max - d.min) * t;
      this.values[d.name] = value;
      slider.value = value;
      num.value = value.toFixed(3);
      this.onChange(d.name, value);
      anim.rafId = requestAnimationFrame(tick(now));
    };

    this._animations[d.name].rafId = requestAnimationFrame(tick(performance.now()));
    playBtn.innerHTML = '<iconify-icon icon="mingcute:pause-fill" width="12" height="12"></iconify-icon>';
    playBtn.classList.add('playing');
  }

  _stopAnimation(name, playBtn) {
    if (this._animations[name]) {
      cancelAnimationFrame(this._animations[name].rafId);
      delete this._animations[name];
    }
    if (playBtn) {
      playBtn.innerHTML = '<iconify-icon icon="mingcute:play-fill" width="12" height="12"></iconify-icon>';
      playBtn.classList.remove('playing');
    }
  }

  _toggle(d) {
    const label = document.createElement('label');
    label.className = 'toggle';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = !!this.values[d.name];
    input.addEventListener('change', () => {
      this.values[d.name] = input.checked;
      this.onChange(d.name, input.checked);
    });

    const span = document.createElement('span');
    span.className = 'toggle-track';

    label.appendChild(input);
    label.appendChild(span);
    return label;
  }

  _colorPicker(d) {
    const group = document.createElement('div');
    group.className = 'color-group';

    const swatch = document.createElement('input');
    swatch.type = 'color';
    swatch.className = 'color-swatch';
    const cur = this.values[d.name] || [1, 1, 1];
    swatch.value = toHex(cur);

    swatch.addEventListener('input', () => {
      const rgb = fromHex(swatch.value);
      this.values[d.name] = rgb;
      this.onChange(d.name, rgb);
    });

    const hexLabel = document.createElement('span');
    hexLabel.className = 'color-hex';
    hexLabel.textContent = swatch.value.toUpperCase();
    swatch.addEventListener('input', () => {
      hexLabel.textContent = swatch.value.toUpperCase();
    });

    group.appendChild(swatch);
    group.appendChild(hexLabel);
    return group;
  }

  _vecSliders(d, n) {
    const labels = ['X', 'Y', 'Z', 'W'].slice(0, n);
    const group = document.createElement('div');
    group.className = 'vec-group';

    const vals = Array.isArray(this.values[d.name])
      ? this.values[d.name]
      : new Array(n).fill(0.5);

    labels.forEach((lbl, i) => {
      const sub = document.createElement('div');
      sub.className = 'vec-sub';

      const sublabel = document.createElement('span');
      sublabel.className = 'vec-label';
      sublabel.textContent = lbl;

      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = 0;
      slider.max = 1;
      slider.step = 0.001;
      slider.value = vals[i] ?? 0.5;

      slider.addEventListener('input', () => {
        const cur = Array.isArray(this.values[d.name])
          ? [...this.values[d.name]]
          : new Array(n).fill(0.5);
        cur[i] = parseFloat(slider.value);
        this.values[d.name] = cur;
        this.onChange(d.name, cur);
      });

      sub.appendChild(sublabel);
      sub.appendChild(slider);
      group.appendChild(sub);
    });

    return group;
  }
}
