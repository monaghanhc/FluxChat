import { expect, test, type Page } from '@playwright/test';

const signup = async (
  page: Page,
  payload: { email: string; password: string; displayName: string },
): Promise<void> => {
  await page.goto('/');

  await page.getByTestId('mode-signup').click();
  await page.getByTestId('auth-email').fill(payload.email);
  await page.getByTestId('auth-display-name').fill(payload.displayName);
  await page.getByTestId('auth-password').fill(payload.password);
  await page.getByTestId('auth-submit').click();

  await expect(page.getByText('FluxChat')).toBeVisible({ timeout: 15_000 });
};

test('signup, join room, send realtime message to second user', async ({ browser, page }) => {
  const secondContext = await browser.newContext();
  const secondPage = await secondContext.newPage();

  const suffix = Date.now();
  const roomName = `room-${suffix}`;

  await signup(page, {
    email: `user1-${suffix}@example.com`,
    password: 'password123',
    displayName: 'User One',
  });

  await page.getByTestId('create-room-input').fill(roomName);
  await page.getByTestId('create-room-input').press('Enter');
  await expect(page.getByRole('heading', { name: `#${roomName}` })).toBeVisible();

  await signup(secondPage, {
    email: `user2-${suffix}@example.com`,
    password: 'password123',
    displayName: 'User Two',
  });

  await secondPage.locator('button.room-button', { hasText: `#${roomName}` }).first().click();
  await expect(secondPage.getByRole('heading', { name: `#${roomName}` })).toBeVisible();

  await page.getByTestId('message-input').fill('hello realtime');
  await page.getByTestId('send-message').click();

  await expect(secondPage.getByText('hello realtime')).toBeVisible({ timeout: 10_000 });

  await secondContext.close();
});
