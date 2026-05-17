/* oxlint-disable no-console */
/**
 * Minimal reporter that only prints failed tests and the final summary.
 * Useful in CI where dot/default reporters produce too much noise.
 */

import type { SerializedError, TestModule, TestRunEndReason } from "vitest/node";

export default class FailuresReporter {
  onTestRunEnd(
    testModules: ReadonlyArray<TestModule>,
    unhandledErrors: ReadonlyArray<SerializedError>,
    reason: TestRunEndReason,
  ) {
    let passed = 0;
    let failed = 0;
    let skipped = 0;

    const failures: { name: string; module: string; errors: ReadonlyArray<SerializedError> }[] = [];
    const moduleFailures: {
      module: string;
      errors: ReadonlyArray<SerializedError>;
      state: string;
    }[] = [];

    for (const mod of testModules) {
      const moduleErrors = mod.errors();
      if (mod.state() === "failed" && moduleErrors.length > 0) {
        moduleFailures.push({
          module: mod.moduleId,
          errors: moduleErrors,
          state: mod.state(),
        });
      }

      for (const test of mod.children.allTests()) {
        const result = test.result();
        if (result.state === "passed") {
          passed++;
        } else if (result.state === "failed") {
          failed++;
          failures.push({
            name: test.fullName,
            module: mod.moduleId,
            errors: result.errors,
          });
        } else {
          skipped++;
        }
      }
    }

    if (moduleFailures.length > 0) {
      console.error("\n--- FAILED MODULES ---\n");
      for (const f of moduleFailures) {
        console.error(`FAIL ${f.module} (${f.state})`);
        for (const e of f.errors) {
          console.error(`  ${e.message}`);
          if (e.stack) console.error(e.stack);
          if (e.diff) console.error(e.diff);
        }
        console.error();
      }
    }

    if (failures.length > 0) {
      console.error("\n--- FAILED TESTS ---\n");
      for (const f of failures) {
        console.error(`FAIL ${f.module} > ${f.name}`);
        for (const e of f.errors) {
          console.error(`  ${e.message}`);
          if (e.diff) console.error(e.diff);
        }
        console.error();
      }
    }

    if (unhandledErrors.length > 0) {
      console.error("\n--- UNHANDLED ERRORS ---\n");
      for (const e of unhandledErrors) {
        console.error(e.message);
        if (e.stack) console.error(e.stack);
        console.error();
      }
    }

    if (reason !== "passed") {
      console.error(`\n--- RUN ENDED: ${reason.toUpperCase()} ---\n`);
    }

    const totalFailed = failed + moduleFailures.length;
    const status =
      totalFailed > 0 || unhandledErrors.length > 0 || reason !== "passed" ? "FAIL" : "PASS";
    console.log(
      `\n${status} | ${passed} passed | ${totalFailed} failed | ${skipped} skipped | ${testModules.length} files\n`,
    );
  }
}
