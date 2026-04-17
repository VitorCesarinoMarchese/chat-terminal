import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import { configureTestEnvironment } from "./env";
import { getTestDbArtifacts } from "./paths";

export default async function globalSetup() {
  configureTestEnvironment();

  for (const artifact of getTestDbArtifacts()) {
    rmSync(artifact, { force: true });
  }

  execSync("npx prisma generate --schema prisma/schema.prisma", {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  });

  execSync("npx prisma db push --skip-generate --schema prisma/schema.prisma", {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  });
}
