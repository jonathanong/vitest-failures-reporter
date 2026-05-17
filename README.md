# vitest-failures-reporter

A minimal Vitest reporter that prints failed tests and a final summary without the noise from dot or default reporters.

## Install

```sh
pnpm add -D vitest-failures-reporter
```

## Usage

```sh
vitest run --reporter=vitest-failures-reporter
```

Use it with other reporters when CI needs annotations or artifacts:

```sh
vitest run \
  --reporter=vitest-failures-reporter \
  --reporter=github-actions \
  --reporter=junit \
  --outputFile=test-report.junit.xml
```

Example output:

```txt
--- FAILED TESTS ---

FAIL math.test.mts > adds numbers
  expected 1 to be 2

FAIL | 12 passed | 1 failed | 0 skipped | 3 files
```

## Development

```sh
pnpm install
pnpm test
pnpm run check
```

Tests run with this reporter as the active Vitest reporter and enforce 100% coverage for `src/`.
