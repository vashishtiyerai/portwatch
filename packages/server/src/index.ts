import * as http from 'http';
import * as url from 'url';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { getPlatformProvider, SafetyManager, PortHistoryTracker, DoctorService, identifyProject, loadConfig, saveConfig } from '@portwatch/core';

export interface ServerOptions {
  port?: number;
  openBrowser?: boolean;
}

export function startServer(options: ServerOptions = {}): http.Server {
  const port = options.port || 49200;
  const provider = getPlatformProvider();
  const safety = new SafetyManager(provider);
  const historyTracker = new PortHistoryTracker();
  const doctor = new DoctorService(provider);

  // SSE client pool
  const sseClients = new Set<http.ServerResponse>();

  // Background monitor loop for SSE clients and history tracking
  setInterval(async () => {
    try {
      const currentPorts = await provider.listPorts();
      const events = historyTracker.updateSnapshot(currentPorts);

      if (events.length > 0 && sseClients.size > 0) {
        const payload = JSON.stringify({ type: 'history', events, ports: currentPorts });
        for (const res of sseClients) {
          res.write(`data: ${payload}\n\n`);
        }
      }
    } catch {
      // Ignore background errors
    }
  }, 2000);

  const server = http.createServer(async (req, res) => {
    // Enable CORS for local development
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const parsedUrl = url.parse(req.url || '', true);
    const pathname = parsedUrl.pathname || '/';

    // SSE Stream endpoint
    if (pathname === '/api/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });
      res.write('\n');
      sseClients.add(res);

      req.on('close', () => {
        sseClients.delete(res);
      });
      return;
    }

    // API Routes
    if (pathname.startsWith('/api/')) {
      res.setHeader('Content-Type', 'application/json');

      try {
        if (pathname === '/api/ports' && req.method === 'GET') {
          const ports = await provider.listPorts();
          for (const p of ports) {
            if (p.pid) {
              const proc = await provider.inspect(p.pid);
              if (proc) {
                p.project = identifyProject(proc);
              }
            }
          }
          historyTracker.updateSnapshot(ports);
          res.writeHead(200);
          res.end(JSON.stringify(ports));
          return;
        }

        const portMatch = pathname.match(/^\/api\/ports\/(\d+)$/);
        if (portMatch && req.method === 'GET') {
          const targetPort = parseInt(portMatch[1], 10);
          const portInfo = await provider.findPort(targetPort);
          if (!portInfo) {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'Port not active' }));
            return;
          }
          if (portInfo.pid) {
            const proc = await provider.inspect(portInfo.pid);
            if (proc) portInfo.project = identifyProject(proc);
          }
          res.writeHead(200);
          res.end(JSON.stringify(portInfo));
          return;
        }

        const inspectMatch = pathname.match(/^\/api\/inspect\/(\d+)$/);
        if (inspectMatch && req.method === 'GET') {
          const pid = parseInt(inspectMatch[1], 10);
          const proc = await provider.inspect(pid);
          if (!proc) {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'Process not found' }));
            return;
          }
          const tree = await provider.getProcessTree(pid);
          res.writeHead(200);
          res.end(JSON.stringify({ process: proc, tree }));
          return;
        }

        const freeMatch = pathname.match(/^\/api\/free\/(\d+)$/);
        if (freeMatch && req.method === 'POST') {
          const targetPort = parseInt(freeMatch[1], 10);
          
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', async () => {
            let force = false;
            try {
              if (body) {
                const parsed = JSON.parse(body);
                force = Boolean(parsed.force);
              }
            } catch {}

            const result = await safety.freePort(targetPort, { force });
            res.writeHead(result.success ? 200 : 400);
            res.end(JSON.stringify(result));
          });
          return;
        }

        if (pathname === '/api/history' && req.method === 'GET') {
          const events = historyTracker.getEvents(100);
          res.writeHead(200);
          res.end(JSON.stringify(events));
          return;
        }

        if (pathname === '/api/history/clear' && req.method === 'POST') {
          historyTracker.clear();
          res.writeHead(200);
          res.end(JSON.stringify({ success: true }));
          return;
        }

        if (pathname === '/api/doctor' && req.method === 'GET') {
          const report = await doctor.runDiagnostics();
          res.writeHead(200);
          res.end(JSON.stringify(report));
          return;
        }

        if (pathname === '/api/config' && req.method === 'GET') {
          const cfg = loadConfig();
          res.writeHead(200);
          res.end(JSON.stringify(cfg));
          return;
        }

        if (pathname === '/api/config' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const parsed = JSON.parse(body);
              saveConfig(parsed);
              res.writeHead(200);
              res.end(JSON.stringify({ success: true, config: loadConfig() }));
            } catch (e: any) {
              res.writeHead(400);
              res.end(JSON.stringify({ error: 'Invalid configuration payload' }));
            }
          });
          return;
        }

        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Not found' }));
        return;
      } catch (err: any) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
        return;
      }
    }

    // Static assets fallback for UI (with directory traversal protection)
    const uiDistDir = path.resolve(__dirname, '../../ui/dist');
    const targetSubPath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const filePath = path.resolve(uiDistDir, targetSubPath);

    if (!filePath.startsWith(uiDistDir)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Forbidden');
      return;
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      serveStaticFile(res, filePath);
    } else if (fs.existsSync(path.join(uiDistDir, 'index.html'))) {
      // SPA fallback
      serveStaticFile(res, path.join(uiDistDir, 'index.html'));
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head><title>PortWatch API Server</title></head>
        <body style="font-family: sans-serif; background: #090d16; color: #f1f5f9; padding: 2rem;">
          <h2>PortWatch Server Running on http://127.0.0.1:${port}</h2>
          <p>API endpoints available at <code>/api/ports</code>, <code>/api/history</code>, <code>/api/doctor</code>.</p>
          <p>Run <code>npm run dev:ui</code> to develop the React GUI, or <code>npm run build:ui</code> to package the production frontend.</p>
        </body>
        </html>
      `);
    }
  });

  // Bind strictly to local loopback (127.0.0.1) for security
  server.listen(port, '127.0.0.1', () => {
    const urlStr = `http://127.0.0.1:${port}`;
    process.stdout.write(`\nPortWatch UI & API server active at: ${urlStr}\n`);

    if (options.openBrowser) {
      openInBrowser(urlStr);
    }
  });

  return server;
}

function serveStaticFile(res: http.ServerResponse, filePath: string): void {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
  };

  const contentType = mimeTypes[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);
}

function openInBrowser(targetUrl: string): void {
  const platform = process.platform;
  let cmd = '';
  if (platform === 'win32') {
    cmd = `start "" "${targetUrl}"`;
  } else if (platform === 'darwin') {
    cmd = `open "${targetUrl}"`;
  } else {
    cmd = `xdg-open "${targetUrl}"`;
  }
  exec(cmd, () => {});
}

// Allow direct execution: `node packages/server/dist/index.js`
if (require.main === module) {
  startServer({ openBrowser: true });
}
