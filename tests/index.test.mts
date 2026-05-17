import { afterEach, describe, expect, test, vi } from "vitest";

import FailuresReporter from "../src/index.mts";

type TestState = "passed" | "failed" | "skipped";
type EndReason = "passed" | "failed" | "interrupted";

const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

afterEach(() => {
  consoleLog.mockClear();
  consoleError.mockClear();
});

const moduleWithTests = (
  moduleId: string,
  tests: {
    fullName: string;
    state: TestState;
    errors?: { message: string; diff?: string }[];
  }[],
  options: {
    errors?: { message: string; diff?: string; stack?: string }[];
    state?: EndReason | "skipped" | "pending" | "queued";
  } = {},
) => {
  return {
    moduleId,
    errors: () => options.errors ?? [],
    state: () => options.state ?? "passed",
    children: {
      allTests: () =>
        tests.map((testCase) => ({
          fullName: testCase.fullName,
          result: () => ({
            state: testCase.state,
            errors: testCase.errors ?? [],
          }),
        })),
    },
  };
};

const runReporter = (
  modules: ReturnType<typeof moduleWithTests>[],
  unhandledErrors: { message: string; stack?: string }[] = [],
  reason: EndReason = "passed",
) => {
  new FailuresReporter().onTestRunEnd(modules as never, unhandledErrors as never, reason);
};

describe("FailuresReporter", () => {
  test("prints a passing summary without stderr sections", () => {
    runReporter([
      moduleWithTests("math.test.mts", [
        { fullName: "adds numbers", state: "passed" },
        { fullName: "subtracts numbers", state: "passed" },
      ]),
    ]);

    expect(consoleError).not.toHaveBeenCalled();
    expect(consoleLog).toHaveBeenCalledExactlyOnceWith(
      "\nPASS | 2 passed | 0 failed | 0 skipped | 1 files\n",
    );
  });

  test("prints failed tests with messages and diffs", () => {
    runReporter([
      moduleWithTests("math.test.mts", [
        { fullName: "adds numbers", state: "passed" },
        {
          fullName: "multiplies numbers",
          state: "failed",
          errors: [{ message: "expected 4 to be 5", diff: "- 4\n+ 5" }],
        },
      ]),
    ]);

    expect(consoleError).toHaveBeenCalledWith("\n--- FAILED TESTS ---\n");
    expect(consoleError).toHaveBeenCalledWith("FAIL math.test.mts > multiplies numbers");
    expect(consoleError).toHaveBeenCalledWith("  expected 4 to be 5");
    expect(consoleError).toHaveBeenCalledWith("- 4\n+ 5");
    expect(consoleLog).toHaveBeenCalledExactlyOnceWith(
      "\nFAIL | 1 passed | 1 failed | 0 skipped | 1 files\n",
    );
  });

  test("prints failed modules even when tests did not fail", () => {
    runReporter([
      moduleWithTests(
        "broken-import.test.mts",
        [{ fullName: "collected before import failure", state: "passed" }],
        {
          errors: [
            {
              message: "Cannot find module './missing'",
              stack: "Error: Cannot find module './missing'\n    at broken-import.test.mts:1:1",
            },
            {
              diff: "- import './missing'\n+ import './present'",
              message: "Import diff",
            },
          ],
          state: "failed",
        },
      ),
    ]);

    expect(consoleError).toHaveBeenCalledWith("\n--- FAILED MODULES ---\n");
    expect(consoleError).toHaveBeenCalledWith("FAIL broken-import.test.mts (failed)");
    expect(consoleError).toHaveBeenCalledWith("  Cannot find module './missing'");
    expect(consoleError).toHaveBeenCalledWith(
      "Error: Cannot find module './missing'\n    at broken-import.test.mts:1:1",
    );
    expect(consoleError).toHaveBeenCalledWith("  Import diff");
    expect(consoleError).toHaveBeenCalledWith("- import './missing'\n+ import './present'");
    expect(consoleLog).toHaveBeenCalledExactlyOnceWith(
      "\nFAIL | 1 passed | 1 failed | 0 skipped | 1 files\n",
    );
  });

  test("prints failed tests without optional diffs", () => {
    runReporter([
      moduleWithTests("strings.test.mts", [
        {
          fullName: "formats strings",
          state: "failed",
          errors: [{ message: "format failed" }],
        },
      ]),
    ]);

    expect(consoleError).toHaveBeenCalledWith("  format failed");
    expect(consoleError).not.toHaveBeenCalledWith(undefined);
    expect(consoleLog).toHaveBeenCalledExactlyOnceWith(
      "\nFAIL | 0 passed | 1 failed | 0 skipped | 1 files\n",
    );
  });

  test("counts non-passed and non-failed tests as skipped", () => {
    runReporter([
      moduleWithTests("skip.test.mts", [
        { fullName: "runs", state: "passed" },
        { fullName: "does not run", state: "skipped" },
      ]),
    ]);

    expect(consoleLog).toHaveBeenCalledExactlyOnceWith(
      "\nPASS | 1 passed | 0 failed | 1 skipped | 1 files\n",
    );
  });

  test("prints unhandled errors with optional stacks", () => {
    runReporter(
      [],
      [
        { message: "database unavailable", stack: "Error: database unavailable\n    at test" },
        { message: "cleanup failed" },
      ],
    );

    expect(consoleError).toHaveBeenCalledWith("\n--- UNHANDLED ERRORS ---\n");
    expect(consoleError).toHaveBeenCalledWith("database unavailable");
    expect(consoleError).toHaveBeenCalledWith("Error: database unavailable\n    at test");
    expect(consoleError).toHaveBeenCalledWith("cleanup failed");
    expect(consoleLog).toHaveBeenCalledExactlyOnceWith(
      "\nFAIL | 0 passed | 0 failed | 0 skipped | 0 files\n",
    );
  });

  test("prints the end reason when Vitest reports a failed run", () => {
    runReporter([], [], "failed");

    expect(consoleError).toHaveBeenCalledExactlyOnceWith("\n--- RUN ENDED: FAILED ---\n");
    expect(consoleLog).toHaveBeenCalledExactlyOnceWith(
      "\nFAIL | 0 passed | 0 failed | 0 skipped | 0 files\n",
    );
  });

  test("prints a passing summary for zero modules", () => {
    runReporter([]);

    expect(consoleError).not.toHaveBeenCalled();
    expect(consoleLog).toHaveBeenCalledExactlyOnceWith(
      "\nPASS | 0 passed | 0 failed | 0 skipped | 0 files\n",
    );
  });
});
