const puppeteer=require('puppeteer-core');
(async()=>{const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const p=await b.newPage(); await p.setViewport({width:1200,height:500,deviceScaleFactor:2});
await p.goto('http://127.0.0.1:4173/font-test.html',{waitUntil:'networkidle0'}); await p.evaluate(()=>document.fonts.ready); await new Promise(r=>setTimeout(r,400));
await p.screenshot({path:'qa/font-test.png'}); await b.close();})();
