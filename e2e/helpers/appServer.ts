import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import type { AddressInfo } from "node:net";

// Serves the production build (dist/) on its own port so a test can simulate
// a deploy without touching the server the other tests share.
//
// deploy() makes the server answer like a host that received a new version:
// index.html carries a marker, and sw.js lists index.html with a new revision,
// which is what makes the browser install a new service worker.

const DIST = path.resolve(process.cwd(), "dist");

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};

export interface AppServer {
  url: string;
  /** From now on, serve the next version of the app. */
  deploy(): void;
  close(): Promise<void>;
}

export async function startAppServer(): Promise<AppServer> {
  let deployed = false;

  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url ?? "/", "http://localhost").pathname);
    let file = path.join(DIST, pathname);
    if (!file.startsWith(DIST)) file = DIST;
    // Same fallback as a real host: unknown paths get the app shell.
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, "index.html");

    let body: Buffer | string = fs.readFileSync(file);
    if (deployed && file === path.join(DIST, "index.html")) {
      body = body.toString().replace("<html", '<html data-deploy="2"');
    }
    if (deployed && file === path.join(DIST, "sw.js")) {
      const next = body.toString().replace(/(url:"index\.html",revision:")[^"]+/, "$1deploy-2");
      if (next === body.toString()) throw new Error("sw.js: index.html precache entry not found");
      body = next;
    }
    res.writeHead(200, {
      "content-type": TYPES[path.extname(file)] ?? "application/octet-stream",
      "cache-control": "no-cache",
    });
    res.end(body);
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;

  return {
    url: `http://127.0.0.1:${port}`,
    deploy: () => {
      deployed = true;
    },
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}
