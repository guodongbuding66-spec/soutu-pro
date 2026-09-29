import {test,expect} from '@playwright/test';

const base=process.env.SOUTU_PRO_URL||'https://soutu-pro.vercel.app';
test.use({serviceWorkers:'block'});
test.setTimeout(90000);

async function pixelSignature(locator){
  return locator.evaluate(img=>{
    const c=document.createElement('canvas');c.width=24;c.height=24;
    const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(img,0,0,24,24);
    const d=x.getImageData(0,0,24,24).data;
    let h=2166136261;
    for(let i=0;i<d.length;i+=4){
      const v=((d[i]>>4)<<8)|((d[i+1]>>4)<<4)|(d[i+2]>>4);
      h^=v;h=Math.imul(h,16777619);
    }
    return (h>>>0).toString(16);
  });
}

test('production renders distinct official search-engine brands on desktop and mobile',async({page})=>{
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});

  await page.setViewportSize({width:1440,height:1000});
  await page.goto(base+'/?official-brand-qa='+Date.now(),{waitUntil:'networkidle'});

  const imgs=page.locator('.engine-card .engine-brand img');
  await expect(imgs).toHaveCount(10);
  await expect.poll(async()=>imgs.evaluateAll(nodes=>nodes.every(i=>i.complete&&i.naturalWidth>0&&i.naturalHeight>0))).toBe(true);

  const sources=await imgs.evaluateAll(nodes=>nodes.map(i=>i.getAttribute('src')));
  expect(new Set(sources).size).toBeGreaterThanOrEqual(8);
  expect(sources.some(x=>decodeURIComponent(x||'').includes('gstatic.com/images/branding/product/2x/lens_96dp.png'))).toBeTruthy();
  expect(sources.some(x=>decodeURIComponent(x||'').includes('bing.com/favicon.ico'))).toBeTruthy();
  expect(sources.some(x=>decodeURIComponent(x||'').includes('yandex.com/favicon.ico'))).toBeTruthy();
  expect(sources.some(x=>decodeURIComponent(x||'').includes('tineye.com/favicon.ico'))).toBeTruthy();

  const signatures=[];
  for(let i=0;i<await imgs.count();i++)signatures.push(await pixelSignature(imgs.nth(i)));
  // Lens and Lens-shopping intentionally share one logo; Bing and Bing-shopping do too.
  // The remaining engines must still render visibly different official artwork.
  expect(new Set(signatures).size).toBeGreaterThanOrEqual(6);

  const texts=await page.locator('.engine-card .engine-mark').evaluateAll(nodes=>nodes.map(n=>n.textContent.trim()));
  expect(texts.every(t=>t==='')).toBeTruthy();

  await page.locator('.engines-section').screenshot({path:'test-results/production-engine-ui-desktop-9.1.1.png'});

  await page.setViewportSize({width:390,height:844});
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await expect.poll(()=>page.locator('.search-bar').evaluate(el=>getComputedStyle(el).position)).toBe('static');
  await page.locator('.engines-section').screenshot({path:'test-results/production-engine-ui-mobile-9.1.1.png'});

  const relevant=errors.filter(x=>!x.includes('favicon')&&!x.includes('Failed to load resource'));
  expect(relevant).toEqual([]);
});
