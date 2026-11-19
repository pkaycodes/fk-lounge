const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL = 'http://127.0.0.1:4173/';
const OUT = path.join(__dirname, 'qa');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function prep(page) {
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: 'html{scroll-behavior:auto!important}' });
  await page.evaluate(async () => {
    const step = window.innerHeight * 0.8;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 80));
    }
    await new Promise((r) => setTimeout(r, 400));
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 400));
  });
}

async function viewportShots(page, prefix, selectors) {
  for (const [name, sel] of Object.entries(selectors)) {
    const found = await page.evaluate((s) => {
      const el = document.querySelector(s);
      if (!el) return false;
      const y = el.getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, Math.max(0, y - 80));
      return true;
    }, sel);
    await sleep(500);
    if (!found) { console.log('MISSING', sel); continue; }
    await page.screenshot({ path: path.join(OUT, `${prefix}-${name}.png`) });
  }
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--hide-scrollbars', '--force-color-profile=srgb', '--font-render-hinting=none'],
  });
  const errors = [];

  // ---------- Desktop ----------
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  await prep(page);

  await page.screenshot({ path: path.join(OUT, 'desktop-full.png'), fullPage: true });
  await viewportShots(page, 'd', {
    hero: '.hero', lounge: '#lounge', experience: '.experience', menu: '#menu',
    events: '#whats-on', gallery: '#gallery', visit: '#visit', feed: '#feed', footer: '.site-footer',
  });

  // menu tabs
  for (const [name, sel] of Object.entries({ beer: '#tab-beer', spirits: '#tab-spirits' })) {
    await page.click(sel);
    await sleep(350);
    await page.evaluate(() => document.querySelector('#menu').scrollIntoView());
    await page.evaluate(() => window.scrollBy(0, -60));
    await sleep(250);
    await page.screenshot({ path: path.join(OUT, `d-menu-${name}.png`) });
    const state = await page.evaluate(() => ({
      panel: document.querySelector('.menu-panel:not([hidden])')?.id,
      selected: [...document.querySelectorAll('.menu-tab')].map((t) => t.getAttribute('aria-selected')),
      items: document.querySelectorAll('.menu-panel:not([hidden]) .menu-item').length,
      height: document.querySelector('#menu').offsetHeight,
    }));
    console.log('MENU', name, JSON.stringify(state));
  }
  await page.click('#tab-cocktails');

  // reserve dialog
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(400);
  await page.click('.hero [data-open-reserve]');
  await sleep(500);
  await page.screenshot({ path: path.join(OUT, 'd-dialog.png') });
  const dialogState = await page.evaluate(() => {
    const d = document.querySelector('#reserve-dialog');
    return { open: d.open, rect: d.getBoundingClientRect().toJSON(), overflowY: getComputedStyle(d).overflowY, active: document.activeElement?.id || document.activeElement?.name || document.activeElement?.tagName };
  });
  console.log('DIALOG', JSON.stringify(dialogState));
  await page.keyboard.press('Escape');
  await sleep(400);

  // lightbox
  await page.evaluate(() => document.querySelector('#gallery').scrollIntoView());
  await sleep(400);
  await page.evaluate(() => document.querySelector('[data-lightbox]').click());
  await sleep(550);
  await page.screenshot({ path: path.join(OUT, 'd-lightbox.png') });
  const lbState = await page.evaluate(() => {
    const lb = document.querySelector('#lightbox');
    return { hidden: lb.hidden, caption: lb.querySelector('[data-lightbox-caption]')?.textContent, img: lb.querySelector('img')?.currentSrc };
  });
  console.log('LIGHTBOX', JSON.stringify(lbState));
  await page.keyboard.press('Escape');
  await sleep(300);

  // active nav + scroll state
  await page.evaluate(() => document.querySelector('#menu').scrollIntoView());
  await sleep(400);
  console.log('NAV-ACTIVE', await page.evaluate(() => [...document.querySelectorAll('.main-nav > a')].map((a) => a.textContent.trim() + ':' + a.classList.contains('is-active')).join(' | ')));

  const metrics = await page.evaluate(() => {
    const de = document.documentElement;
    const overflow = [];
    document.querySelectorAll('body *').forEach((el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (cs.position === 'fixed' || cs.overflow !== 'visible') return;
      if (r.width > 0 && (r.right > de.clientWidth + 2 || r.left < -2) && !el.closest('.marquee, .hero-glow, .site-header, .grain')) {
        overflow.push({ tag: el.tagName, cls: (el.className || '').toString().slice(0, 60), left: Math.round(r.left), right: Math.round(r.right) });
      }
    });
    return {
      scrollHeight: de.scrollHeight,
      broken: [...document.images].filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.getAttribute('src')),
      overflow: overflow.slice(0, 25),
    };
  });
  console.log('DESKTOP', JSON.stringify(metrics, null, 2));
  await page.close();

  // ---------- Mobile ----------
  const mob = await browser.newPage();
  await mob.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await mob.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  mob.on('pageerror', (e) => errors.push('mobile pageerror: ' + e.message));
  await prep(mob);
  await mob.screenshot({ path: path.join(OUT, 'mobile-full.png'), fullPage: true });
  await viewportShots(mob, 'm', {
    hero: '.hero', lounge: '#lounge', experience: '.experience', menu: '#menu',
    events: '#whats-on', gallery: '#gallery', visit: '#visit', feed: '#feed', footer: '.site-footer',
  });

  // mobile nav
  await mob.evaluate(() => window.scrollTo(0, 0));
  await sleep(300);
  await mob.click('.nav-toggle');
  await sleep(700);
  await mob.screenshot({ path: path.join(OUT, 'm-nav.png') });
  console.log('MOBILE-NAV', JSON.stringify(await mob.evaluate(() => ({ open: document.body.classList.contains('nav-open'), navRect: document.querySelector('#main-nav').getBoundingClientRect().toJSON(), bodyOverflow: getComputedStyle(document.body).overflow }))));
  await mob.click('.nav-toggle');
  await sleep(300);

  // mobile dialog
  await mob.click('.hero [data-open-reserve]');
  await sleep(500);
  await mob.screenshot({ path: path.join(OUT, 'm-dialog.png') });
  await mob.keyboard.press('Escape');
  await sleep(250);

  const mmetrics = await mob.evaluate(() => {
    const de = document.documentElement;
    const overflow = [];
    document.querySelectorAll('body *').forEach((el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (cs.position === 'fixed' || cs.overflow !== 'visible') return;
      if (r.width > 0 && (r.right > de.clientWidth + 2 || r.left < -2) && !el.closest('.marquee, .hero-glow, .site-header, .grain, .rotating-badge')) {
        overflow.push({ tag: el.tagName, cls: (el.className || '').toString().slice(0, 60), left: Math.round(r.left), right: Math.round(r.right) });
      }
    });
    return { scrollHeight: de.scrollHeight, broken: [...document.images].filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.getAttribute('src')), overflow: overflow.slice(0, 25) };
  });
  console.log('MOBILE', JSON.stringify(mmetrics, null, 2));
  await mob.close();

  await browser.close();
  console.log('ERRORS', JSON.stringify(errors, null, 2));
})();
