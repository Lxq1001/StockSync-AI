import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createLocalGateway } from "./local-gateway.mjs";
import { pnpmCommand } from "./pnpm-command.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const pnpm = process.env.npm_execpath;
if (!pnpm) {
  console.error("Run this command from the repository root using: pnpm dev");
  process.exit(1);
}
function port(name, fallback) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < 1 || value > 65535) throw new Error(`Invalid ${name}.`);
  return value;
}
const gatewayPort = port("LOCAL_PORT", 3000);
const apiPort = port("LOCAL_API_PORT", 8080);
const webPort = port("LOCAL_WEB_PORT", 5173);
if (new Set([gatewayPort, apiPort, webPort]).size !== 3) throw new Error("Local server ports must be different.");
const children = new Set();
let gateway;
let stopping = false;
function stop(code) {
  if (stopping) return;
  stopping = true;
  gateway?.close();
  for (const child of children) child.kill("SIGTERM");
  const timer = setTimeout(() => process.exit(code), 1500);
  timer.unref();
  Promise.all([...children].map(child => new Promise(resolve => {
    if (child.exitCode !== null || child.signalCode !== null) resolve();
    else child.once("exit", resolve);
  }))).then(() => process.exit(code));
}
process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
function start(command, args, options = {}) {
  const child = spawn(command, args, { cwd: root, stdio: "inherit", ...options });
  children.add(child);
  child.on("error", error => { console.error(error.message); stop(1); });
  child.once("exit", code => {
    children.delete(child);
    if (!stopping && options.service) {
      console.error(`A local service stopped (${code ?? "signal"}).`);
      stop(code || 1);
    }
  });
  return child;
}
async function runPnpm(args) {
  const invocation = pnpmCommand(pnpm, args);
  const child = start(invocation.command, invocation.args);
  const code = await new Promise(resolve => child.once("exit", resolve));
  if (code !== 0) throw new Error(`pnpm ${args.join(" ")} failed.`);
}
async function waitFor(url) {
  for (let attempt = 0; attempt < 120; attempt++) {
    if (stopping) throw new Error("Local startup stopped.");
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
      await response.body?.cancel();
      if (response.ok) return;
    } catch { /* Servers are still starting; wait within the startup deadline. */ }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error("Local services did not become ready. Check for a port already in use.");
}
try {
  console.log("Building shared libraries and the API...");
  await runPnpm(["run", "typecheck:libs"]);
  await runPnpm(["--filter", "@workspace/api-server", "run", "build"]);
  start(process.execPath, ["--env-file-if-exists=../../.env.local", "--import", "./development.mjs", "--enable-source-maps", "./dist/index.mjs"], {
    cwd: fileURLToPath(new URL("../../artifacts/api-server/", import.meta.url)),
    env: { ...process.env, PORT: String(apiPort), NODE_ENV: "development" }, service: true,
  });
  // Start Vite directly so shutdown terminates the actual server on Windows too.
  start(process.execPath, ["./node_modules/vite/bin/vite.js", "--config", "vite.config.ts", "--host", "127.0.0.1"], {
    cwd: fileURLToPath(new URL("../../artifacts/stocksync-ai/", import.meta.url)),
    env: { ...process.env, PORT: String(webPort), BASE_PATH: "/" }, service: true,
  });
  await Promise.all([
    waitFor(`http://127.0.0.1:${apiPort}/api/healthz`),
    waitFor(`http://127.0.0.1:${webPort}/`),
  ]);
  gateway = createLocalGateway({ apiPort, webPort });
  gateway.on("error", error => { console.error(error.message); stop(1); });
  gateway.listen(gatewayPort, "127.0.0.1", () => {
    console.log(`\nStockSync is ready: http://localhost:${gatewayPort}`);
    console.log("Open this URL, not the separate Vite URL. Press Ctrl+C to stop.\n");
  });
} catch (error) {
  console.error(error.message);
  stop(1);
}
