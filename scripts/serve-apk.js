const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8888;
const apkPath = path.join(__dirname, '../CamperSites-Pro-v1.0.apk');

const server = http.createServer((req, res) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Descargar CamperSites Pro</title>
        <style>
          body { font-family: -apple-system, sans-serif; background: #0F172A; color: #FFF; text-align: center; padding: 40px 20px; }
          .btn { display: inline-block; background: #38BDF8; color: #0F172A; padding: 18px 36px; border-radius: 14px; font-size: 18px; font-weight: bold; text-decoration: none; margin-top: 30px; box-shadow: 0 4px 14px rgba(56,189,248,0.4); }
          .card { background: #1E293B; border-radius: 20px; padding: 30px 20px; max-width: 400px; margin: 0 auto; border: 1px solid #334155; }
        </style>
      </head>
      <body>
        <div class="card">
          <div style="font-size: 48px; margin-bottom: 10px;">🚐</div>
          <h1 style="margin: 0; font-size: 24px;">CamperSites Pro</h1>
          <p style="color: #38BDF8; font-weight: 700; margin-top: 6px;">Versión 1.0 Oficial (Release)</p>
          <p style="color: #94A3B8; font-size: 14px;">43 MB · 517.363 Puntos · Radares DGT en vivo</p>
          <a class="btn" href="/download">⬇️ DESCARGAR APK</a>
        </div>
      </body>
      </html>
    `);
    return;
  }

  if (req.url === '/download' || req.url === '/CamperSites-Pro-v1.0.apk') {
    if (!fs.existsSync(apkPath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('APK no encontrado en el servidor');
      return;
    }
    const stat = fs.statSync(apkPath);
    res.writeHead(200, {
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Length': stat.size,
      'Content-Disposition': 'attachment; filename="CamperSites-Pro-v1.0.apk"',
      'Access-Control-Allow-Origin': '*',
    });
    fs.createReadStream(apkPath).pipe(res);
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
});
