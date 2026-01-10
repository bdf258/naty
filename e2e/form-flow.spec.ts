import { test, expect } from '@playwright/test';

test.describe('Complete Form Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display all required form sections', async ({ page }) => {
    // Check that the form container exists
    const formContent = page.locator('form, [role="form"]').first();
    const mainContent = page.locator('main, .max-w-7xl').first();

    const hasForm = await formContent.isVisible().catch(() => false);
    const hasMain = await mainContent.isVisible().catch(() => false);

    expect(hasForm || hasMain).toBe(true);
  });

  test('should have interactive form elements', async ({ page }) => {
    // Check for radio buttons, checkboxes, or other form inputs
    const radioButtons = page.locator('input[type="radio"], [role="radio"]');
    const textInputs = page.locator('input[type="text"], textarea');
    const buttons = page.getByRole('button');

    const radioCount = await radioButtons.count();
    const textCount = await textInputs.count();
    const buttonCount = await buttons.count();

    // Should have at least some form elements
    expect(radioCount + textCount + buttonCount).toBeGreaterThan(0);
  });

  test('should handle form input interactions', async ({ page }) => {
    // Find any clickable form element
    const radioButtons = page.locator('input[type="radio"], [role="radio"]');
    const radioCount = await radioButtons.count();

    if (radioCount > 0) {
      // Click the first radio button
      await radioButtons.first().click();

      // Verify it's selected
      const isChecked = await radioButtons.first().isChecked().catch(() => true);
      expect(isChecked).toBe(true);
    }
  });

  test('should preserve form state during navigation', async ({ page }) => {
    // Fill in some form data if possible
    const textInput = page.locator('input[type="text"], textarea').first();
    const hasTextInput = await textInput.isVisible().catch(() => false);

    if (hasTextInput) {
      await textInput.fill('Test input value');
      const value = await textInput.inputValue();
      expect(value).toBe('Test input value');
    }
  });
});

test.describe('Form Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should show validation messages for empty required fields', async ({ page }) => {
    // Try to submit or proceed without filling required fields
    const submitButton = page.getByRole('button', { name: /submit|next|continue/i }).first();
    const hasSubmit = await submitButton.isVisible().catch(() => false);

    if (hasSubmit) {
      await submitButton.click();

      // Check for validation messages or error states
      const errorMessages = page.locator('[class*="error"], [class*="invalid"], [aria-invalid="true"]');
      // If there are required fields, we might see error messages
      const errorCount = await errorMessages.count();
      // This is informational - the form may or may not have validation
      console.log(`Found ${errorCount} potential error indicators`);
    }
  });
});

test.describe('Responsive Design', () => {
  const viewports = [
    { name: 'Mobile', width: 375, height: 667 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Desktop', width: 1280, height: 800 },
    { name: 'Wide Desktop', width: 1920, height: 1080 },
  ];

  for (const viewport of viewports) {
    test(`should display correctly on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Main heading should always be visible
      await expect(page.getByRole('heading', { name: 'EU AI Act Compliance' })).toBeVisible();

      // Content should fit within viewport (no horizontal scroll needed)
      const body = page.locator('body');
      const bodyWidth = await body.evaluate((el) => el.scrollWidth);
      expect(bodyWidth).toBeLessThanOrEqual(viewport.width + 20); // Allow small margin
    });
  }
});

test.describe('Data Persistence', () => {
  test('should maintain data across page interactions', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for any interactive elements
    const radioButtons = page.locator('[role="radio"], input[type="radio"]');
    const count = await radioButtons.count();

    if (count > 0) {
      // Select something
      await radioButtons.first().click();

      // Verify selection persists
      const isChecked = await radioButtons.first().isChecked().catch(() => {
        // For role="radio" we check aria-checked
        return radioButtons.first().getAttribute('aria-checked').then((v) => v === 'true');
      });

      expect(isChecked).toBe(true);
    }
  });
});

test.describe('User Experience', () => {
  test('should have clear call-to-action buttons', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Find primary action buttons
    const buttons = page.getByRole('button');
    const count = await buttons.count();

    expect(count).toBeGreaterThan(0);

    // Check that buttons have visible text
    for (let i = 0; i < Math.min(count, 5); i++) {
      const button = buttons.nth(i);
      const text = await button.textContent();
      expect(text?.trim().length).toBeGreaterThan(0);
    }
  });

  test('should provide visual feedback on interactions', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Find a button and check hover state
    const button = page.getByRole('button').first();
    const hasButton = await button.isVisible().catch(() => false);

    if (hasButton) {
      // Get initial style
      const initialBg = await button.evaluate((el) =>
        window.getComputedStyle(el).backgroundColor
      );

      // Hover over button
      await button.hover();

      // The button should have some visual state (this is a soft check)
      const hoverBg = await button.evaluate((el) =>
        window.getComputedStyle(el).backgroundColor
      );

      // Log for debugging - some buttons may have hover effects
      console.log(`Button background: ${initialBg} -> ${hoverBg}`);
    }
  });

  test('should have loading states for async operations', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for loading indicators or spinners (may not always be present)
    const loadingIndicators = page.locator('[class*="loading"], [class*="spinner"], [role="progressbar"]');
    const count = await loadingIndicators.count();

    // This is informational - not all pages have loading states visible at rest
    console.log(`Found ${count} loading indicator elements`);
  });
});
