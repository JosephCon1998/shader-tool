const SKIP = new Set(['u_time', 'u_resolution']);

// Parse @param annotation: label:"Foo" min:0.0 max:1.0 default:0.5 step:0.01
function parseAnnotation(comment) {
  const meta = {};
  const labelM = comment.match(/label:"([^"]+)"/);
  if (labelM) meta.label = labelM[1];

  const minM = comment.match(/min:([\d.e+\-]+)/);
  if (minM) meta.min = parseFloat(minM[1]);

  const maxM = comment.match(/max:([\d.e+\-]+)/);
  if (maxM) meta.max = parseFloat(maxM[1]);

  const stepM = comment.match(/step:([\d.e+\-]+)/);
  if (stepM) meta.step = parseFloat(stepM[1]);

  // default can be a scalar or array [r,g,b]
  const defArrayM = comment.match(/default:\[([\d.,\s]+)\]/);
  if (defArrayM) {
    meta.default = defArrayM[1].split(',').map(Number);
  } else {
    const defM = comment.match(/default:(true|false|[\d.e+\-]+)/);
    if (defM) {
      const v = defM[1];
      meta.default = v === 'true' ? true : v === 'false' ? false : parseFloat(v);
    }
  }

  return meta;
}

function defaultForType(type) {
  switch (type) {
    case 'float': return 0.5;
    case 'int':   return 0;
    case 'bool':  return false;
    case 'vec2':  return [0.5, 0.5];
    case 'vec3':  return [0.5, 0.5, 0.5];
    case 'vec4':  return [0.5, 0.5, 0.5, 1.0];
    default:      return 0;
  }
}

export function extractUniforms(glsl) {
  const descriptors = [];
  const lines = glsl.split('\n');

  for (const line of lines) {
    const m = line.match(/uniform\s+(float|int|bool|vec[234]|mat[234])\s+(\w+)\s*;/);
    if (!m) continue;

    const [, type, name] = m;
    if (SKIP.has(name)) continue;

    const annotationM = line.match(/\/\/\s*@param\s+(.*)/);
    const annotation = annotationM ? parseAnnotation(annotationM[1]) : {};

    const label = annotation.label || name.replace(/^u_/, '').replace(/_/g, ' ');
    const def = annotation.default ?? defaultForType(type);

    const desc = { name, type, label, default: def, value: def };

    if (type === 'float' || type === 'int') {
      desc.min = annotation.min ?? 0;
      desc.max = annotation.max ?? 1;
      desc.step = annotation.step ?? (type === 'int' ? 1 : 0.001);
    }

    descriptors.push(desc);
  }

  return descriptors;
}
