import { test, expect } from '@playwright/test';

/**
 * Critical end-to-end booking journey (DEMO mode, mock payment):
 * search → select schedule → select seat → passenger details → review → pay → e-ticket.
 *
 * Prerequisite: `npx playwright install chromium`. The dev server is started
 * automatically by playwright.config.ts.
 */
test('a guest can book a trip end-to-end and receive an e-ticket', async ({ page }) => {
  test.setTimeout(180_000);
  const coldPathTimeout = 60_000;

  // 1. Home + search (defaults are a valid route with trips today).
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Your Journey/i })).toBeVisible();
  await page.getByRole('button', { name: /Search Trips/i }).click();

  // 2. Results → select the first available trip.
  await page.waitForURL(/\/book\?/);
  const firstTrip = page.getByRole('button', { name: /^Select Trip$/ }).first();
  await expect(firstTrip).toBeVisible({ timeout: coldPathTimeout });
  await firstTrip.click();

  // 3. Seat selection → pick the first available seat.
  await page.waitForURL(/\/book\/[^/?]+$/);
  await expect(page.getByRole('heading', { name: /Choose your seat/i })).toBeVisible({ timeout: coldPathTimeout });
  await page.getByRole('button', { name: /Seat 4A, standard, available/i }).click();

  // 4. Passenger details.
  await page.getByLabel('Full name').fill('Kwame Test');
  await page.getByLabel('Phone number').fill('0241234567');
  await page.getByLabel('Email address').fill('kwame.test@example.com');

  // 5. Consent + continue to review.
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: /Continue to review/i }).click();

  // 6. Review → pay.
  await page.waitForURL(/\/book\/review\//, { timeout: coldPathTimeout });
  await expect(page.getByRole('heading', { name: /Review your booking/i })).toBeVisible({ timeout: coldPathTimeout });
  await page.getByRole('button', { name: /^Pay/ }).click();

  // 7. Mock gateway → approve.
  await page.waitForURL(/\/payment\/checkout/, { timeout: coldPathTimeout });
  await page.waitForLoadState('networkidle');
  await expect(page.getByText(/Demo Payment Gateway/i)).toBeVisible({ timeout: coldPathTimeout });
  const approvePayment = page.getByRole('button', { name: /Approve & pay/i });
  await expect(approvePayment).toBeEnabled({ timeout: coldPathTimeout });
  await approvePayment.click();

  // 8. Success → view e-ticket.
  await page.waitForURL(/\/payment\/status/, { timeout: coldPathTimeout });
  await expect(page.getByRole('heading', { name: /Payment successful/i })).toBeVisible({ timeout: coldPathTimeout });
  await page.getByRole('link', { name: /View e-ticket/i }).click();

  // 9. E-ticket is shown with a QR code.
  await page.waitForURL(/\/ticket\//, { timeout: coldPathTimeout });
  await expect(page.getByText(/Electronic Ticket/i)).toBeVisible({ timeout: coldPathTimeout });
  await expect(page.getByRole('img', { name: /QR code for booking/i })).toBeVisible();
});
