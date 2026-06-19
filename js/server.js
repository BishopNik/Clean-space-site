const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
loadEnv(path.join(root, '.env'));

const port = Number(process.env.PORT) || 4173;
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/api/request') {
    return submitRequest(req, res);
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  const cleanUrl = decodeURIComponent(req.url.split('?')[0]);
  const requested = cleanUrl === '/' ? '/index.html' : cleanUrl;
  const file = path.normalize(path.join(root, requested));

  if (!file.startsWith(root)) return json(res, 403, { error: 'Forbidden' });

  fs.stat(file, (error, stats) => {
    if (error || !stats.isFile()) return json(res, 404, { error: 'Not found' });
    res.writeHead(200, {
      'Content-Type': types[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': path.extname(file) === '.png' ? 'public, max-age=604800' : 'no-cache',
    });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  });
});

server.listen(port, () => {
  console.log(`Clean Space is running at http://localhost:${port}`);
});

async function submitRequest(req, res) {
  try {
    const body = await readBody(req);
    const data = JSON.parse(body || '{}');
    if (data.company) return json(res, 200, { ok: true });

    const name = tidy(data.name, 80);
    const contact = tidy(data.contact, 120);
    const service = tidy(data.service, 80);
    const message = tidy(data.message, 800);
    const lang = tidy(data.lang, 4).toUpperCase();

    if (name.length < 2 || contact.length < 5 || !service) {
      return json(res, 400, { error: 'Please complete the required fields.' });
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) {
      console.warn('Telegram is not configured. Request:', { name, contact, service, message });
      return json(res, 503, { error: 'Telegram is not configured yet.' });
    }

    const text = [
      '✦ NEW CLEAN SPACE REQUEST',
      '',
      `Name: ${name}`,
      `Contact: ${contact}`,
      `Service: ${service}`,
      `Language: ${lang || 'EN'}`,
      message ? `Message: ${message}` : null,
      '',
      `Sent: ${new Date().toLocaleString('en-GB', { timeZone: 'Europe/Warsaw' })}`,
    ].filter(Boolean).join('\n');

    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });

    if (!response.ok) throw new Error(`Telegram API: ${await response.text()}`);
    return json(res, 200, { ok: true });
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: 'Unable to send the request.' });
  }
}

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  fs.readFileSync(file, 'utf8').split(/\r?\n/).forEach((line) => {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) return;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 100_000) reject(new Error('Payload too large'));
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function tidy(value, max) {
  return String(value || '').replace(/[<>]/g, '').trim().slice(0, max);
}

function json(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}
