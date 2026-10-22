// npm_execpath can be a native executable (standalone pnpm on Windows),
// not just the JavaScript entry point used by npm/Corepack installations.
export function pnpmCommand(pnpmPath, args, nodePath = process.execPath) {
  if (/\.exe$/i.test(pnpmPath)) {
    return { command: pnpmPath, args: [...args] };
  }
  return { command: nodePath, args: [pnpmPath, ...args] };
}
