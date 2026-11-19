const puppeteer=require('puppeteer-core');
(async()=>{const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const p=await b.newPage(); await p.setViewport({width:1440,height:1000});
await p.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle0'});
console.log(await p.evaluate(()=>{
 const s=document.querySelector('.skip-link'); const cs=getComputedStyle(s); const r=s.getBoundingClientRect();
 const doc=document.documentElement;
 return {rect:r.toJSON(), transform:cs.transform, top:cs.top, scrollW:doc.scrollWidth, clientW:doc.clientWidth, bodyScrollW:document.body.scrollWidth};
}));
await b.close();})();
