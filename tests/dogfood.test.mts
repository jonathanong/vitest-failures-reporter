import { spawn } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

test("can be used as the active Vitest reporter", async () => {
  const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
  const tempRoot = join(repoRoot, ".tmp");
  await mkdir(tempRoot, { recursive: true });
  const fixtureDir = await mkdtemp(join(tempRoot, "dogfood-"));
  const fixtureFile = join(fixtureDir, "fixture.test.mts");
  await writeFile(
    fixtureFile,
    [
      "import { expect, test } from 'vitest'",
      "test('passes loudly', () => expect(1).toBe(1))",
      "test('fails loudly', () => expect(1).toBe(2))",
      "",
    ].join("\n"),
  );
  const configFile = join(fixtureDir, "vitest.config.mts");
  await writeFile(
    configFile,
    `export default { root: ${JSON.stringify(repoRoot)}, test: { include: [${JSON.stringify(fixtureFile)}] } }\n`,
  );

  const reporterPath = fileURLToPath(new URL("../src/index.mts", import.meta.url));
  const result = await execFile("pnpm", [
    "exec",
    "vitest",
    "run",
    `--config=${configFile}`,
    `--reporter=${reporterPath}`,
  ]);
  const output = `${result.stdout}\n${result.stderr}`;

  expect(result.code).toBe(1);
  expect(output).toContain("--- FAILED TESTS ---");
  expect(output).toContain("--- RUN ENDED: FAILED ---");
  expect(output).toContain("FAIL");
  expect(output).toContain("fails loudly");
  expect(output).toContain("FAIL | 1 passed | 1 failed | 0 skipped | 1 files");
});

const execFile = (file: string, args: string[]) => {
  return new Promise<{ code: number; stdout: string; stderr: string }>((resolvePromise) => {
    const child = spawn(file, args, {
      cwd: resolve(fileURLToPath(new URL("..", import.meta.url))),
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("close", (code) => {
      resolvePromise({ code: code ?? 0, stdout, stderr });
    });
  });
};
