import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = 'docs/ui-screenshots';

const pages = [
  { path: '/command-center', name: '01-command-center' },
  { path: '/replay', name: '02-replay' },
  { path: '/incidents', name: '03-incidents' },
  { path: '/incidents/INC-20260422153045', name: '04-incident-detail' },
  { path: '/runbooks', name: '05-runbooks' },
  { path: '/slos', name: '06-slos' },
  { path: '/topology', name: '07-topology' },
  { path: '/controls', name: '08-controls' },
  { path: '/demo', name: '09-demo' },
];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  for (const { path, name } of pages) {
    console.log(`Screenshotting ${path}...`);
    await page.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/${name}.png`,
      fullPage: false,
    });
    console.log(`  -> ${SCREENSHOT_DIR}/${name}.png`);
  }

  await browser.close();
  console.log('Done!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
