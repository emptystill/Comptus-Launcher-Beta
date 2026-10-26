// Traducción de descripciones (por ejemplo las de RAWG, que vienen en inglés).
//  - Sin clave: MyMemory (servicio gratuito, con límite diario y máx. 500 bytes por consulta).
//  - Con tu clave de DeepL (plan gratuito): DeepL, mejor calidad y más cuota.
// `getJson(url)` y `postJson(url, body, headers)` se inyectan (en la app usan net.fetch).

const MAX_CHUNK = 400; // caracteres; así cabe de sobra en los 500 bytes de MyMemory

function decodeEntities(s) {
  return String(s || '')
    .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

// Parte el texto en trozos de hasta MAX_CHUNK caracteres sin cortar frases (y respetando los saltos de línea)
function splitText(text) {
  const lines = String(text || '').split('\n');
  const chunks = []; // { line, text }
  lines.forEach((line, li) => {
    if (!line.trim()) return;
    const sentences = line.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) || [line];
    let cur = '';
    const flush = () => { if (cur.trim()) chunks.push({ line: li, text: cur.trim() }); cur = ''; };
    for (let s of sentences) {
      while (s.length > MAX_CHUNK) { // frase enorme: se corta en un espacio
        let cut = s.lastIndexOf(' ', MAX_CHUNK);
        if (cut < 50) cut = MAX_CHUNK;
        if ((cur + s.slice(0, cut)).length > MAX_CHUNK) flush();
        cur += s.slice(0, cut);
        flush();
        s = s.slice(cut);
      }
      if ((cur + s).length > MAX_CHUNK) flush();
      cur += s;
    }
    flush();
  });
  return { lines, chunks };
}

function join(parts, translated) {
  const out = parts.lines.map(() => []);
  parts.chunks.forEach((c, i) => out[c.line].push(translated[i]));
  return out.map((p) => p.join(' ')).join('\n').trim();
}

async function viaMyMemory(chunks, { from, to, getJson }) {
  const res = [];
  for (const c of chunks) {
    const d = await getJson(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(c.text)}&langpair=${from}|${to}`);
    const t = d && d.responseData && d.responseData.translatedText;
    const status = Number(d && d.responseStatus);
    if (/MYMEMORY WARNING|QUOTA/i.test(String(t || '')) || status === 429) throw Object.assign(new Error('quota'), { code: 'quota' });
    if (status !== 200 || !t) throw Object.assign(new Error('fail'), { code: 'fail' });
    res.push(decodeEntities(t));
  }
  return res;
}

async function viaDeepL(chunks, { from, to, deeplKey, postJson }) {
  const host = /:fx$/.test(deeplKey) ? 'https://api-free.deepl.com' : 'https://api.deepl.com';
  const res = [];
  for (let i = 0; i < chunks.length; i += 40) {
    const batch = chunks.slice(i, i + 40).map((c) => c.text);
    const d = await postJson(`${host}/v2/translate`, { text: batch, source_lang: from.toUpperCase(), target_lang: to.toUpperCase() },
      { Authorization: `DeepL-Auth-Key ${deeplKey}` });
    const tr = d && d.translations;
    if (!tr || tr.length !== batch.length) throw Object.assign(new Error('fail'), { code: 'fail' });
    res.push(...tr.map((t) => t.text));
  }
  return res;
}

async function translateText(text, { from = 'en', to = 'es', deeplKey = '', getJson, postJson } = {}) {
  const parts = splitText(text);
  if (!parts.chunks.length) return { text: '', provider: 'none' };
  const key = String(deeplKey || '').trim();
  const out = key
    ? await viaDeepL(parts.chunks, { from, to, deeplKey: key, postJson })
    : await viaMyMemory(parts.chunks, { from, to, getJson });
  return { text: join(parts, out), provider: key ? 'deepl' : 'mymemory' };
}

// Mensaje legible para el usuario según el error
function explain(e, usedKey) {
  if (e && e.code === 'quota') return usedKey
    ? 'Se acabó la cuota de DeepL por ahora.'
    : 'Se acabó el límite diario del traductor gratuito. Inténtalo mañana o agrega una clave de DeepL en Configuración > Información.';
  if (e && e.code === 'auth') return 'DeepL rechazó la clave. Revísala en Configuración > Información.';
  return 'No se pudo traducir. Revisa tu conexión.';
}

module.exports = { translateText, splitText, explain, decodeEntities };
