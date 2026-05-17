import { access } from "node:fs/promises";
import process from "node:process";

const requiredFiles = ["dist/index.mjs", "dist/index.d.mts"];

for (const file of requiredFiles) {
  try {
    await access(file);
  } catch {
    process.stderr.write(`Missing build artifact: ${file}\n`);
    process.exitCode = 1;
  }
}
