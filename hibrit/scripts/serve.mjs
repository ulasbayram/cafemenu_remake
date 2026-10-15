import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve, extname, sep } from "node:path";

const root = fileURLToPath(
  new URL(process.argv[2] === "dist" ? "../dist/" : "../", import.meta.url),
);
const port = Number(process.env.PORT || 5174);
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
};
const server = createServer(async (request, response) => {
  try {
    if (!["GET", "HEAD"].includes(request.method)) {
      response.writeHead(405, { Allow: "GET, HEAD" }).end();
      return;
    }
    const pathname = decodeURIComponent(
      new URL(request.url, "http://localhost").pathname,
    );
    const path = resolve(
      root,
      `.${pathname === "/" ? "/index.html" : pathname}`,
    );
    if (
      !path.startsWith(root.endsWith(sep) ? root : root + sep) ||
      ![
        ".html",
        ".css",
        ".js",
        ".svg",
        ".png",
        ".jpg",
        ".woff2",
        ".txt",
      ].includes(extname(path))
    ) {
      response.writeHead(404).end("Bulunamadı");
      return;
    }
    const info = await stat(path);
    if (!info.isFile()) throw new Error("Not a file");
    response.writeHead(200, {
      "Content-Type": types[extname(path)] || "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    });
    response.end(request.method === "HEAD" ? undefined : await readFile(path));
  } catch {
    response.writeHead(404).end("Bulunamadı");
  }
});
server.listen(port, "127.0.0.1", () =>
  console.log(`Hibrit: http://localhost:${port}`),
);
