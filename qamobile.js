const puppeteer = require('puppeteer-core');
const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--hide-scrollbars'] });
  const p = await b.newPage();
  await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await p.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle0' });
  await p.evaluate(() => document.fonts.ready);
  await sleep(500);
  await p.click('.nav-toggle');
  await sleep(700);
  console.log('NAV', await p.evaluate(() => {
    const nav = document.querySelector('#main-nav');
    const brand = document.querySelector('.brand');
    const toggle = document.querySelector('.nav-toggle');
    return {
      open: document.body.classList.contains('nav-open'),
      navZ: getComputedStyle(nav).zIndex,
      brandZ: getComputedStyle(brand).zIndex,
      toggleZ: getComputedStyle(document.querySelector('.header-cta')).zIndex,
      brandRect: brand.getBoundingClientRect().toJSON(),
      toggleRect: toggle.getBoundingClientRect().toJSON(),
      elAtBrand: document.elementFromPoint(60, 40)?.className,
      elAtToggle: document.elementFromPoint(355, 40)?.className,
    };
  }));
  await p.screenshot({ path: 'qa/m-nav2.png' });
  await p.click('.nav-toggle');
  await sleep(600);
  console.log('NAV CLOSED', await p.evaluate(() => ({ open: document.body.classList.contains('nav-open'), pe: getComputedStyle(document.querySelector('#main-nav')).pointerEvents })));
  await p.evaluate(() => window.scrollTo(0, 0));
  await sleep(300);
  await p.click('.hero [data-open-reserve]');
  await sleep(600);
  console.log('DIALOG', await p.evaluate(() => {
    const d = document.querySelector('#reserve-dialog');
    return { open: d.open, rect: d.getBoundingClientRect().toJSON(), bodyClass: document.body.className };
  }));
  await p.screenshot({ path: 'qa/m-dialog2.png' });
  await b.close();
})();
