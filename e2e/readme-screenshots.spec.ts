import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect, type Page } from '@playwright/test';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(repoRoot, 'docs', 'images');

mkdirSync(outDir, { recursive: true });

async function openAppPage(page: Page, storedPage: string) {
  await page.addInitScript(
    ({ storageKey, pageId, themeId }) => {
      localStorage.setItem(storageKey, pageId);
      localStorage.setItem('music-studio-theme', themeId);
    },
    { storageKey: 'music-studio-page', pageId: storedPage, themeId: 'metronome-manuscript' },
  );
  await page.goto('/');
  await page.locator('main').waitFor({ state: 'visible' });
  await expect(page.locator('.app-header')).toBeVisible();
  await page.waitForLoadState('domcontentloaded');
}

test.describe('README screenshots', () => {
  test('home', async ({ page }) => {
    await openAppPage(page, 'home');
    await page.screenshot({ path: join(outDir, 'readme-home.png'), fullPage: true });
  });

  test('metronome', async ({ page }) => {
    await openAppPage(page, 'metronome-full');
    await page.screenshot({ path: join(outDir, 'readme-metronome.png'), fullPage: true });
  });

  test('fourier', async ({ page }) => {
    await openAppPage(page, 'fourier');
    await page.screenshot({ path: join(outDir, 'readme-fourier.png'), fullPage: true });
  });

  test('sonic lab', async ({ page }) => {
    await openAppPage(page, 'sonic-lab');
    await page.screenshot({ path: join(outDir, 'readme-sonic-lab.png'), fullPage: true });
  });
});
