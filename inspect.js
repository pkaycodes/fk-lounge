const puppeteer = require('puppeteer-core');
(async()=>{
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const p=await b.newPage();
await p.setViewport({width:1440,height:1000,deviceScaleFactor:2});
await p.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle0'});
await p.evaluate(()=>document.fonts.ready);
console.log(await p.evaluate(()=>{
 const h=document.querySelector('#lounge-title');
 const em=h.querySelector('em');
 const cs=getComputedStyle(em);
 return {html:h.outerHTML, font:cs.fontFamily, style:cs.fontStyle, weight:cs.fontWeight, stretch:cs.fontStretch, size:cs.fontSize, variation:cs.fontVariationSettings, textShadow:cs.textShadow, before:getComputedStyle(h,'::before').content, after:getComputedStyle(h,'::after').content, el:document.elementFromPoint(80,230)?.outerHTML.slice(0,100)};
}));
const h=await p.$('#lounge-title');
await h.scrollIntoView();
await new Promise(r=>setTimeout(r,500));
await h.screenshot({path:'qa/heading.png'});
await b.close();
})();
