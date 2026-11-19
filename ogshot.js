const puppeteer=require('puppeteer-core');
(async()=>{
 const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new',args:['--hide-scrollbars','--force-color-profile=srgb']});
 const p=await b.newPage();
 await p.setViewport({width:1200,height:630,deviceScaleFactor:1});
 await p.goto('http://127.0.0.1:4173/og-card.html',{waitUntil:'networkidle0'});
 await p.evaluate(()=>document.fonts.ready);
 await new Promise(r=>setTimeout(r,300));
 await p.screenshot({path:'assets/img/og.jpg',type:'jpeg',quality:92});
 await b.close();
})();
