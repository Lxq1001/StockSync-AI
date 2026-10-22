import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { pnpmCommand } from "./pnpm-command.mjs";

test("Windows standalone pnpm.exe runs directly, preserving paths with spaces", () => {
  const executable = String.raw`C:\Users\Test User\AppData\Roaming\npm\node_modules\pnpm\pnpm.exe`;
  const args = ["--filter", "@workspace/api-server", "run", "build"];
  assert.deepEqual(pnpmCommand(executable, args, "node.exe"), { command: executable, args });
  assert.equal(pnpmCommand(executable.toUpperCase(), args).command, executable.toUpperCase());
});

test("JavaScript and extensionless pnpm entry points still run through Node", () => {
  for (const entry of ["/tools/pnpm.cjs", "/tools/pnpm.js", "/tools/pnpm.mjs", "/tools/pnpm"]) {
    assert.deepEqual(pnpmCommand(entry, ["run", "typecheck:libs"], "/tools/node"), {
      command: "/tools/node", args: [entry, "run", "typecheck:libs"],
    });
  }
});

test("the Node CLI branch forwards arguments without shell quoting", async t => {
  const dir = await mkdtemp(path.join(tmpdir(), "pnpm cli with spaces "));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const entry = path.join(dir, "pnpm.cjs");
  await writeFile(entry, "console.log(JSON.stringify(process.argv.slice(2)));");
  const args = ["--filter", "@workspace/api-server", "argument with spaces"];
  const invocation = pnpmCommand(entry, args);
  const result = spawnSync(invocation.command, invocation.args, { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), args);
});

test("the executable branch launches a real binary named .exe without Node interpreting it", async t => {
  const dir = await mkdtemp(path.join(tmpdir(), "pnpm executable with spaces "));
  t.after(() => rm(dir, { recursive: true, force: true }));
  // Linux can execute this native-binary symlink; Windows already has node.exe.
  const executable = process.platform === "win32" ? process.execPath : path.join(dir, "pnpm.exe");
  if (process.platform !== "win32") await symlink(process.execPath, executable);
  const invocation = pnpmCommand(executable, ["--version"]);
  const result = spawnSync(invocation.command, invocation.args, { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), process.version);
});
