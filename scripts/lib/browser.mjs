/**
 * Launches Chromium for the smoke scripts (`axe-smoke.mjs`, `live-smoke.mjs`).
 *
 * Prefers a preinstalled Chromium (the dev sandbox ships one at
 * /opt/pw-browsers/chromium — no download, works offline) and falls back to
 * Playwright's own resolution (CI runs `npx playwright-core install
 * --with-deps chromium` first).
 */
import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';

export function launchChromium() {
  const sandboxChromium = process.env.PW_CHROMIUM_PATH || '/opt/pw-browsers/chromium';
  const launchOptions = { args: ['--no-sandbox'] };
  if (existsSync(sandboxChromium)) launchOptions.executablePath = sandboxChromium;
  return chromium.launch(launchOptions);
}
