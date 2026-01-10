# End-to-End Tests

This directory contains Playwright E2E tests for the EU AI Act Compliance application.

## Prerequisites

1. Install Playwright browsers:
   ```bash
   npx playwright install
   ```

2. For Linux containers/Docker, you may need additional dependencies:
   ```bash
   npx playwright install-deps
   ```

## Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI mode
npm run test:e2e:ui

# Run specific browser
npm run test:e2e -- --project=chromium
npm run test:e2e -- --project=firefox
npm run test:e2e -- --project=webkit
```

## Test Structure

- `app.spec.ts` - Core application tests (title, navigation, accessibility)
- `form-flow.spec.ts` - Form interaction and validation tests

## Notes

- Tests automatically start the dev server on port 5173
- Visual regression tests are skipped by default (run `--update-snapshots` to generate baselines)
- Some tests may fail in containerized environments without proper browser dependencies
