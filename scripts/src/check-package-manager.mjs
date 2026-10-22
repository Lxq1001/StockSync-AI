import { rmSync } from "node:fs";

if (!process.env.npm_config_user_agent?.startsWith("pnpm/")) {
  console.error("This repository uses pnpm. Run: pnpm install");
  process.exit(1);
}
for (const name of ["package-lock.json", "yarn.lock"]) {
  rmSync(name, { force: true });
}
