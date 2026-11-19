const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL = 'http://127.0.0.1:4173/';
const OUT = path.join(__dirname, 'qa');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function shoot(browser, width, height, prefix, scale = 1) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: scale, isMobile: width < 600, hasTouch: width < 600 });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.goto(URL, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: 'html{scroll-behavior:auto!important}.site-header,.whatsapp-float,.skip-link,.grain{display:none!important}' });
  await page.evaluate(async () => {
    const step = window.innerHeight * 0.8;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 300));
  });
  const targets = { lounge: '#lounge', experience: '.experience', menu: '#menu', events: '#whats-on', gallery: '#gallery', visit: '#visit', feed: '.feed', footer: '.site-footer' };
  for (const [name, sel] of Object.entries(targets)) {
    const el = await page.$(sel);
    if (!el) { console.log('missing', sel); continue; }
    await el.screenshot({ path: path.join(OUT, `${prefix}-sec-${name}.png`) });
  }
  await page.close();
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--hide-scrollbars', '--force-color-profile=srgb'] });
  await shoot(browser, 1440, 1000, 'clean');
  await shoot(browser, 390, 844, 'cleanm', 2);
  await browser.close();
  console.log('done');
})();
