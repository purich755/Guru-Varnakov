// Одноразовый приёмник: принимает POST с текстом и кладёт в tools/.cache/<name>. node tools/recv.mjs [port]
import http from 'node:http';
import fs from 'node:fs';
const PORT = Number(process.argv[2] || 8917);
http.createServer((req, res) => {
  const h = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Private-Network': 'true', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
  if (req.method === 'OPTIONS') { res.writeHead(204, h); return res.end(); }
  if (req.method === 'GET') {
    // страница-мост: забирает window.name, оставленный предыдущей страницей вкладки
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(`<!doctype html><meta charset="utf-8"><title>bridge</title><pre id="o">…</pre><script>
      const n = window.name || ''; const q = new URLSearchParams(location.search).get('name') || 'recv.txt';
      fetch('/?name=' + q, { method: 'POST', body: n }).then(() => { o.textContent = 'saved ' + n.length; window.name = ''; });
    </script>`);
  }
  const name = (new URL(req.url, 'http://x').searchParams.get('name') || 'recv.txt').replace(/[^\w.-]/g, '_');
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => { fs.writeFileSync('tools/.cache/' + name, Buffer.concat(chunks)); console.log('saved', name, Buffer.concat(chunks).length); res.writeHead(200, h); res.end('ok'); });
}).listen(PORT, '127.0.0.1', () => console.log('recv on', PORT));
