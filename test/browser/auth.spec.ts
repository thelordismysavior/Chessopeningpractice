import { expect, test } from '@playwright/test';
import { installAppStubs } from './app-stubs';

async function openSignedOut(page: Parameters<typeof installAppStubs>[0], options = {}): Promise<void> {
  await installAppStubs(page, { initialUser: null, ...options });
  await page.goto('/');
  await expect(page.locator('.auth-page')).toBeVisible();
}

test('successful email sign-in reaches the dashboard', async ({ page }) => {
  await openSignedOut(page);
  await page.getByLabel('Email').fill('test@example.com');
  await page.getByLabel('Password', { exact: true }).fill('password123');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();

  await expect(page.locator('.dashboard-intro')).toBeVisible();
});

test('wrong credentials keep the form usable and focus the mapped error', async ({ page }) => {
  await openSignedOut(page, { signInCode: 'auth/wrong-password' });
  await page.getByLabel('Email').fill('test@example.com');
  await page.getByLabel('Password', { exact: true }).fill('wrong-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();

  await expect(page.getByRole('alert')).toHaveText('Email or password is incorrect.');
  await expect(page.getByRole('alert')).toBeFocused();
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeEnabled();
});

test('sign-in shows a pending label and disables duplicate submits', async ({ page }) => {
  await openSignedOut(page, { signInDelayMs: 500 });
  await page.getByLabel('Email').fill('test@example.com');
  await page.getByLabel('Password', { exact: true }).fill('password123');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();

  await expect(page.locator('#auth-submit')).toBeDisabled();
  await expect(page.locator('#auth-submit')).toContainText('Signing in…');
});

test('the approved-email gate signs out an unapproved session', async ({ page }) => {
  await installAppStubs(page, { initialUser: { email: 'other@example.com', uid: 'other-owner' } });
  await page.goto('/');

  await expect(page.locator('.auth-page')).toBeVisible();
  await expect.poll(() => page.evaluate(() => globalThis.__authCalls.signOut)).toBe(1);
});

test('create account rejects an unapproved email before calling Firebase', async ({ page }) => {
  await openSignedOut(page);
  await page.getByRole('link', { name: 'Create account' }).click();
  await page.getByLabel('Email').fill('other@example.com');
  await page.getByLabel('Password', { exact: true }).fill('password123');
  await page.getByLabel('Confirm password').fill('password123');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();

  await expect(page.getByRole('alert')).toHaveText("This email isn't approved for this app.");
  await expect.poll(() => page.evaluate(() => globalThis.__authCalls.signUp)).toBe(0);
});

test('create account validates password length and confirmation locally', async ({ page }) => {
  await openSignedOut(page);
  await page.getByRole('link', { name: 'Create account' }).click();
  await page.getByLabel('Email').fill('test@example.com');
  await page.getByLabel('Password', { exact: true }).fill('short');
  await page.getByLabel('Confirm password').fill('short');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();

  await expect(page.getByRole('alert')).toHaveText('Use at least 8 characters.');
  await expect.poll(() => page.evaluate(() => globalThis.__authCalls.signUp)).toBe(0);

  await page.getByLabel('Password', { exact: true }).fill('password123');
  await page.getByLabel('Confirm password').fill('different123');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();

  await expect(page.getByRole('alert')).toHaveText("Those passwords don't match.");
  await expect.poll(() => page.evaluate(() => globalThis.__authCalls.signUp)).toBe(0);
});

test('completed sign-up reaches the approval screen and can return to sign in', async ({ page }) => {
  await openSignedOut(page, { signUpUid: 'new-owner-uid' });
  await page.getByRole('link', { name: 'Create account' }).click();
  await page.getByLabel('Email').fill('test@example.com');
  await page.getByLabel('Password', { exact: true }).fill('password123');
  await page.getByLabel('Confirm password').fill('password123');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();

  await expect(page.locator('.pending-page')).toBeVisible();
  await expect(page.locator('.pending-uid')).toHaveText('new-owner-uid');
  await expect(page.locator('.pending-uid')).toHaveCSS('user-select', 'text');
  await expect.poll(() => page.evaluate(() => globalThis.__authCalls.signUp)).toBe(1);
  await expect.poll(() => page.evaluate(() => globalThis.__authCalls.signOut)).toBe(1);

  await page.getByRole('button', { name: 'Back to sign in', exact: true }).click();
  await expect(page.locator('.auth-page')).toBeVisible();
  await expect(page.locator('.pending-page')).toHaveCount(0);
});

test('reset confirmation is neutral for registered and unregistered emails', async ({ browser }) => {
  const confirmations: string[] = [];
  for (const resetCode of [undefined, 'auth/user-not-found']) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await openSignedOut(page, { resetCode });
    await page.getByRole('link', { name: 'Forgot password?' }).click();
    await page.getByLabel('Email').fill(resetCode ? 'missing@example.com' : 'test@example.com');
    await page.getByRole('button', { name: 'Send reset link', exact: true }).click();
    await expect(page.locator('.auth-confirmation')).toBeVisible();
    confirmations.push(await page.locator('.auth-confirmation').innerText());
    await context.close();
  }

  expect(confirmations[0]).toBe(confirmations[1]);
  expect(confirmations[0]).toContain('If an account exists for that email, a reset link is on its way.');
});
