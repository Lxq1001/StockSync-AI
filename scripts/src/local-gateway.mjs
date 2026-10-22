import http from "node:http";
import net from "node:net";

/** Local equivalent of Replit's shared path router; no frontend API URL changes. */
export function createLocalGateway({ apiPort, webPort }) {
  const server = http.createServer((request, response) => {
    const pathname = new URL(request.url, "http://localhost").pathname;
    const isApi = pathname === "/api" || pathname.startsWith("/api/");
    const upstream = http.request({
      hostname: "127.0.0.1", port: isApi ? apiPort : webPort,
      method: request.method, path: request.url, headers: request.headers,
    }, incoming => {
      response.writeHead(incoming.statusCode ?? 502, incoming.headers);
      incoming.on("error", () => response.destroy());
      incoming.pipe(response);
    });
    upstream.on("error", () => {
      if (response.headersSent) { response.destroy(); return; }
      response.writeHead(502, { "content-type": "application/json" });
      response.end(JSON.stringify({
        error: `${isApi ? "API" : "Frontend"} server is unavailable. Check the pnpm dev terminal.`,
      }));
    });
    request.on("aborted", () => upstream.destroy());
    request.pipe(upstream);
  });
  // Pass through Vite's hot-reload WebSocket without adding a dependency.
  server.on("upgrade", (request, socket, head) => {
    if (request.url === "/api" || request.url?.startsWith("/api/")) { socket.destroy(); return; }
    const upstream = net.connect({ host: "127.0.0.1", port: webPort }, () => {
      const headers = [];
      for (let i = 0; i < request.rawHeaders.length; i += 2) {
        headers.push(`${request.rawHeaders[i]}: ${request.rawHeaders[i + 1]}`);
      }
      upstream.write(`${request.method} ${request.url} HTTP/${request.httpVersion}\r\n${headers.join("\r\n")}\r\n\r\n`);
      if (head.length) upstream.write(head);
      socket.pipe(upstream).pipe(socket);
    });
    upstream.on("error", () => socket.destroy());
    socket.on("error", () => upstream.destroy());
    socket.on("close", () => upstream.destroy());
    upstream.on("close", () => socket.destroy());
  });
  return server;
}
