import assert from "node:assert/strict";
import http from "node:http";
import net from "node:net";
import { once } from "node:events";
import { test } from "node:test";
import { createLocalGateway } from "./local-gateway.mjs";

async function listen(server, t) {
  const sockets = new Set();
  server.on("connection", socket => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => {
    for (const socket of sockets) socket.destroy();
    server.closeAllConnections(); server.close();
  });
  return server.address().port;
}

test("local gateway serves frontend and routes API paths without rewriting them", async t => {
  const apiPort = await listen(http.createServer((req, res) => {
    let body = "";
    req.on("data", chunk => { body += chunk; });
    req.on("end", () => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ path: req.url, method: req.method, body }));
    });
  }), t);
  const webPort = await listen(http.createServer((_req, res) => {
    res.setHeader("content-type", "text/html");
    res.end("<!doctype html><title>StockSync</title>");
  }), t);
  const gatewayPort = await listen(createLocalGateway({ apiPort, webPort }), t);
  const base = `http://127.0.0.1:${gatewayPort}`;
  assert.match(await (await fetch(`${base}/inventory`)).text(), /StockSync/);
  const response = await fetch(`${base}/api/stock-dataset?source=provided`, {
    method: "POST", headers: { "content-type": "application/json" }, body: '{"test":true}',
  });
  assert.match(response.headers.get("content-type"), /application\/json/);
  assert.deepEqual(await response.json(), {
    path: "/api/stock-dataset?source=provided", method: "POST", body: '{"test":true}',
  });
  assert.equal((await (await fetch(`${base}/api`)).json()).path, "/api");
});

test("an unavailable API returns a JSON error, never the frontend HTML", async t => {
  const unavailable = http.createServer();
  unavailable.listen(0, "127.0.0.1");
  await once(unavailable, "listening");
  const apiPort = unavailable.address().port;
  await new Promise(resolve => unavailable.close(resolve));
  const webPort = await listen(http.createServer((_req, res) => res.end("<html>frontend</html>")), t);
  const gatewayPort = await listen(createLocalGateway({ apiPort, webPort }), t);
  const response = await fetch(`http://127.0.0.1:${gatewayPort}/api/stock-dataset`);
  assert.equal(response.status, 502);
  assert.match((await response.json()).error, /API server is unavailable/);
});

test("Vite hot-reload upgrades are tunneled to the frontend", { timeout: 5000 }, async t => {
  const web = http.createServer();
  web.on("upgrade", (req, socket) => {
    assert.equal(req.url, "/?token=local-test");
    socket.write("HTTP/1.1 101 Switching Protocols\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\nhmr-ready");
    socket.on("error", () => {});
  });
  const webPort = await listen(web, t);
  const apiPort = await listen(http.createServer(), t);
  const gatewayPort = await listen(createLocalGateway({ apiPort, webPort }), t);
  await new Promise((resolve, reject) => {
    const socket = net.connect({ host: "127.0.0.1", port: gatewayPort }, () => {
      socket.write("GET /?token=local-test HTTP/1.1\r\nHost: localhost\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n");
    });
    let received = "";
    socket.on("error", reject);
    socket.on("data", data => {
      received += data;
      if (received.includes("hmr-ready")) {
        assert.match(received, /101 Switching Protocols/);
        socket.destroy(); resolve();
      }
    });
    t.after(() => socket.destroy());
  });
});
