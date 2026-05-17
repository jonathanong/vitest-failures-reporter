import { readFile } from "node:fs/promises";
import { relative } from "node:path";
import { argv, cwd } from "node:process";
import process from "node:process";
import { glob } from "node:fs/promises";

const maxLines = 200;
const patterns = argv.slice(2);
const defaultPatterns = ["src/**/*.mts", "tests/**/*.mts", "scripts/**/*.mjs", "*.mts"];
const files = new Set();

for (const pattern of patterns.length > 0 ? patterns : defaultPatterns) {
  for await (const file of glob(pattern, {
    cwd: cwd(),
    exclude: ["node_modules/**", "coverage/**", "dist/**"],
  })) {
    files.add(file);
  }
}

let failed = false;
for (const file of [...files].sort()) {
  const contents = await readFile(file, "utf8");
  const lines = contents.endsWith("\n")
    ? contents.split("\n").length - 1
    : contents.split("\n").length;
  if (lines > maxLines) {
    failed = true;
    process.stderr.write(`${relative(cwd(), file)} has ${lines} lines; maximum is ${maxLines}\n`);
  }
}

if (failed) {
  process.exitCode = 1;
}
