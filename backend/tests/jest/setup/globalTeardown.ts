import { rmSync } from "node:fs";
import { getTestDbArtifacts } from "./paths";

export default async function globalTeardown() {
  for (const artifact of getTestDbArtifacts()) {
    rmSync(artifact, { force: true });
  }
}
