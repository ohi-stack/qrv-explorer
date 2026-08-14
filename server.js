import express from 'express';

const app = express();
const PORT = Number(process.env.PORT || 3000);
const VERSION = process.env.APP_VERSION || '1.0.0';
const REGISTRY_BASE_URL = process.env.REGISTRY_BASE_URL || 'https://registry.qrv.network';
const VERIFY_BASE_URL = process.env.VERIFY_BASE_URL || 'https://verify.qrv.network';

app.disable('x-powered-by');
app.use(express.json());

async function fetchJson(url) {
  const response = await fetch(url);
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
  return { response, body };
}

function renderPage(content) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>QR-V Registry Explorer</title><style>body{font-family:Inter,Arial,sans-serif;background:#071126;color:#eef6ff;margin:0}.wrap{max-width:1100px;margin:auto;padding:40px 20px}.card{background:#101b36;border:1px solid #2d3f70;border-radius:18px;padding:24px;margin-bottom:20px}input{padding:14px;border-radius:10px;border:1px solid #40508b;background:#0f1730;color:#fff;min-width:300px}button,.btn{padding:14px 18px;border-radius:999px;background:#f2d06b;color:#091124;border:0;font-weight:800;text-decoration:none}pre{white-space:pre-wrap;background:#050b1d;padding:16px;border-radius:12px;overflow:auto}code{color:#9ec1ff}</style></head><body><main class="wrap"><section class="card"><h1>QR-V™ Registry Explorer</h1><p>Lookup public QR-V records by QRVID or hash.</p><form onsubmit="event.preventDefault();const q=document.getElementById('q').value.trim();if(q){window.location='/lookup/'+encodeURIComponent(q)}"><input id="q" placeholder="QRVID or hash"/><button>Lookup</button></form></section>${content}</main></body></html>`;
}

app.get('/healthz', (_req, res) => res.json({ status: 'ok', service: 'qrv-explorer', version: VERSION }));
app.get('/version', (_req, res) => res.json({ service: 'qrv-explorer', version: VERSION }));
app.get('/', (_req, res) => res.type('html').send(renderPage('')));

app.get('/lookup/:value', async (req, res) => {
  const value = String(req.params.value || '').trim();
  const path = value.toUpperCase().startsWith('QRV-') ? `/registry/${encodeURIComponent(value)}` : `/registry/hash/${encodeURIComponent(value)}`;
  try {
    const { response, body } = await fetchJson(`${REGISTRY_BASE_URL}${path}`);
    const verifyLink = value.toUpperCase().startsWith('QRV-') ? `<p><a class="btn" href="${VERIFY_BASE_URL}/${encodeURIComponent(value)}">Open public verification</a></p>` : '';
    return res.status(response.status).type('html').send(renderPage(`<section class="card"><h2>Lookup Result</h2>${verifyLink}<pre>${JSON.stringify(body, null, 2)}</pre></section>`));
  } catch (error) {
    return res.status(503).type('html').send(renderPage(`<section class="card"><h2>Registry unavailable</h2><p>${error.message}</p></section>`));
  }
});

app.get('/api/lookup/:value', async (req, res) => {
  const value = String(req.params.value || '').trim();
  const path = value.toUpperCase().startsWith('QRV-') ? `/registry/${encodeURIComponent(value)}` : `/registry/hash/${encodeURIComponent(value)}`;
  try {
    const { response, body } = await fetchJson(`${REGISTRY_BASE_URL}${path}`);
    return res.status(response.status).json({ source: 'qrv-explorer', query: value, result: body });
  } catch (error) {
    return res.status(503).json({ error: 'REGISTRY_UNAVAILABLE', message: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => console.log(`qrv-explorer running on ${PORT}`));
