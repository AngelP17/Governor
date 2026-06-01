import { chromium } from 'playwright';

const BASE_URL = process.env.SCREENSHOT_BASE_URL ?? 'http://localhost:5173';
const SCREENSHOT_DIR = 'docs/ui-screenshots';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto(`${BASE_URL}/incidents/INC-20260422153045`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.click('text=Generate postmortem');
  await page.waitForTimeout(1500);
  await page.screenshot({
    path: `${SCREENSHOT_DIR}/10-postmortem-modal.png`,
    fullPage: false,
  });
  console.log(`  -> ${SCREENSHOT_DIR}/10-postmortem-modal.png`);

  await browser.close();
  console.log('Done!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
