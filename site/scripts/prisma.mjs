import "dotenv/config";
import { spawnSync } from "node:child_process";

const postgres = /^postgres(ql)?:/.test(process.env.DATABASE_URL || "");
const schema = postgres ? "prisma/supabase/schema.prisma" : "prisma/schema.prisma";
const args = process.argv.slice(2);
if (postgres && args[0] === "migrate" && args[1] === "dev") {
  console.error("Use npm run db:deploy for Supabase. Cloud database resets are intentionally blocked.");
  process.exit(1);
}
const result = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", ...args, "--schema", schema], { stdio: "inherit", env: process.env });
process.exit(result.status ?? 1);
