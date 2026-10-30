import { defineConfig } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Dev only: the analysis page's figure export POSTs each PNG here and it lands in report/figures/.
export default defineConfig({
  plugins: [{
    name: 'save-figures',
    apply: 'serve',
    configureServer(server) {
      const dir = resolve(server.config.root, 'report/figures');
      server.middlewares.use('/__figure', (req, res) => {
        const name = new URL(req.url!, 'http://x').searchParams.get('name') ?? '';
        if (req.method !== 'POST' || !/^[\w-]+\.png$/.test(name)) {
          res.statusCode = 400;
          return res.end();
        }
        const chunks: Buffer[] = [];
        req.on('data', (c: Buffer) => chunks.push(c));
        req.on('end', () => {
          mkdirSync(dir, { recursive: true });
          writeFileSync(resolve(dir, name), Buffer.concat(chunks));
          res.end('ok');
        });
      });
    },
  }],
});
