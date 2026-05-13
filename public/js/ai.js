function providerHeaders() {
  const provider = localStorage.getItem('shader-provider') || 'anthropic';
  const h = { 'Content-Type': 'application/json', 'X-Provider': provider };

  if (provider === 'local') {
    const url   = localStorage.getItem('shader-local-url');
    const model = localStorage.getItem('shader-local-model');
    if (url)   h['X-Local-URL']   = url;
    if (model) h['X-Local-Model'] = model;
  } else {
    const key = localStorage.getItem('shader-api-key');
    if (key) h['X-API-Key'] = key;
  }

  return h;
}

export async function generateShader(prompt, currentShader, referenceImage, { onDelta, onThinking, onDone, onError }) {
  const body = { prompt };
  if (currentShader) body.currentShader = currentShader;
  if (referenceImage) {
    body.imageBase64    = referenceImage.base64;
    body.imageMediaType = referenceImage.mediaType;
  }

  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: providerHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      onError(json.error || 'Server error');
    } catch {
      onError(text || `HTTP ${res.status}`);
    }
    return;
  }

  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop();

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const event = JSON.parse(line.slice(6));
        if (event.type === 'thinking' && onThinking) onThinking(event.text);
        if (event.type === 'delta'   && onDelta)    onDelta(event.text);
        if (event.type === 'done')                  onDone(event.shader, event.explanation);
        if (event.type === 'error')                 onError(event.message);
      } catch {
        // malformed line — skip
      }
    }
  }
}
