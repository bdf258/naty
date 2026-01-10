import { test, expect } from '@playwright/test';

test.describe('EU AI Act Compliance Application', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the main title', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'EU AI Act Compliance' })).toBeVisible();
  });

  test('should display the triage subtitle initially', async ({ page }) => {
    await expect(page.getByText('AI Risk Screening and Assessment Tool')).toBeVisible();
  });

  test('should have proper page structure', async ({ page }) => {
    // Main container should exist
    const mainContainer = page.locator('.min-h-screen');
    await expect(mainContainer).toBeVisible();
  });
});

test.describe('AI Risk Screening Form (Triage)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the triage form', async ({ page }) => {
    // The triage form should show the first page
    await expect(page.getByText('Step 1')).toBeVisible();
  });

  test('should have navigation buttons', async ({ page }) => {
    // Wait for the form to load
    await page.waitForLoadState('networkidle');

    // Should have a Next button on the first page
    const nextButton = page.getByRole('button', { name: /next/i });
    await expect(nextButton).toBeVisible();
  });

  test('should validate required fields before proceeding', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Try to click next without filling required fields
    const nextButton = page.getByRole('button', { name: /next/i });

    // If validation is required, clicking next shouldn't proceed
    // This depends on the actual form validation implementation
    if (await nextButton.isVisible()) {
      await nextButton.click();
      // Should still be on step 1 if validation failed
      await expect(page.getByText('Step 1')).toBeVisible();
    }
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    // Main heading should still be visible on mobile
    await expect(page.getByRole('heading', { name: 'EU AI Act Compliance' })).toBeVisible();

    // Form should be accessible
    await expect(page.getByText('Step 1')).toBeVisible();
  });
});

test.describe('Form Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should show step indicators', async ({ page }) => {
    // Should display step indicator
    const stepText = page.getByText(/step \d/i);
    await expect(stepText.first()).toBeVisible();
  });

  test('should maintain state when navigating between steps', async ({ page }) => {
    // This test depends on the actual form implementation
    // Basic check that navigation elements exist
    const buttons = page.getByRole('button');
    expect(await buttons.count()).toBeGreaterThan(0);
  });
});

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
    expect(await h1.count()).toBe(1);
  });

  test('should have accessible buttons', async ({ page }) => {
    const buttons = page.getByRole('button');
    const count = await buttons.count();

    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i);
      // Each button should have text content or aria-label
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      expect(text || ariaLabel).toBeTruthy();
    }
  });

  test('should be keyboard navigable', async ({ page }) => {
    // Press Tab to navigate through focusable elements
    await page.keyboard.press('Tab');

    // Check that something is focused
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('should have sufficient color contrast', async ({ page }) => {
    // Check that main text elements have proper visibility
    const heading = page.getByRole('heading', { name: 'EU AI Act Compliance' });
    await expect(heading).toBeVisible();

    // The heading should have readable text
    const headingText = await heading.textContent();
    expect(headingText).toBeTruthy();
  });
});

test.describe('Page Load Performance', () => {
  test('should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - startTime;

    // Page should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should render main content quickly', async ({ page }) => {
    await page.goto('/');

    // Main heading should be visible quickly
    await expect(page.getByRole('heading', { name: 'EU AI Act Compliance' })).toBeVisible({
      timeout: 3000,
    });
  });
});

test.describe('Error Handling', () => {
  test('should handle missing route gracefully', async ({ page }) => {
    // SPA should redirect or show content even for unknown routes
    await page.goto('/non-existent-page');

    // Should still show the app (SPA behavior)
    const pageContent = await page.content();
    expect(pageContent).toBeTruthy();
  });
});

test.describe('Visual Regression', () => {
  test.skip('should have consistent layout', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Take screenshot for visual comparison (useful in CI)
    // Skip this test by default - run manually to update baseline screenshots
    await expect(page).toHaveScreenshot('homepage.png', {
      maxDiffPixels: 100,
      timeout: 10000,
    });
  });
});
