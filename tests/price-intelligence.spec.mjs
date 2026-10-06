import {test,expect} from '@playwright/test';

const fixture=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="100"><rect width="160" height="100" fill="white"/><rect x="24" y="18" width="112" height="64" rx="8" fill="#1f2937"/></svg>`);
test.use({serviceWorkers:'block'});
test.setTimeout(60000);

test('same-product price intelligence separates currencies, variants and merges product-search prices safely',async({page})=>{
  await page.addInitScript(()=>{
    localStorage.setItem('soutu-pro-settings-v5',JSON.stringify({tempEndpoint:'',productEndpoint:'http://127.0.0.1:4173',ttl:30,defaultPreset:'product',autoPreset:true}));
    localStorage.removeItem('soutu-pro-history-v5');
  });
  await page.route('**/api/media-search?**',route=>route.fulfill({
    status:200,
    contentType:'application/json',
    body:JSON.stringify({
      enabled:true,
      query:'garden shed',
      providers:[{name:'Openverse',enabled:true,configured:true,count:4}],
      total:4,
      items:[
        {provider:'Openverse',type:'image',title:'US Retail Listing',price:'$299.00',snippet:'Brand: iSUNOR Model: MS86GY MPN: RY-MS86 EAN: 4006381333931',link:'https://shop-a.example/item',thumbnail:'https://example.com/a.jpg'},
        {provider:'Openverse',type:'image',title:'US Marketplace Listing',price:'$349.00',snippet:'Brand: iSUNOR Model: MS86GY MPN: RY-MS86 EAN: 4006381333931',link:'https://shop-b.example/item',thumbnail:'https://example.com/b.jpg'},
        {provider:'Openverse',type:'image',title:'EU Retail Listing',price:'EUR 329,00',snippet:'Brand: iSUNOR Model: MS86GY MPN: RY-MS86 EAN: 4006381333931',link:'https://shop-d.example/item',thumbnail:'https://example.com/d.jpg'},
        {provider:'Openverse',type:'image',title:'Different Variant',price:'$279.00',snippet:'Brand: iSUNOR Model: MS86GY MPN: RY-MS86 EAN: 5901234123457',link:'https://shop-c.example/item',thumbnail:'https://example.com/c.jpg'}
      ]
    })
  }));
  await page.route('**/api/product-search?**',route=>route.fulfill({
    status:200,
    contentType:'application/json',
    body:JSON.stringify({enabled:true,provider:'QA Products',items:[
      {source:'QA Products',title:'US Retail Listing',price:'$319.00',snippet:'Brand: iSUNOR Model: MS86GY MPN: RY-MS86 EAN: 4006381333931',link:'https://shop-e.example/item',thumbnail:'https://example.com/e.jpg'}
    ]})
  }));

  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.SOUTU_PRICE_INTELLIGENCE));

  const parsed=await page.evaluate(()=>({
    eur:window.SOUTU_PRICE_INTELLIGENCE.parsePrice({price:'EUR 1.299,00'}),
    usd:window.SOUTU_PRICE_INTELLIGENCE.parsePrice({price:'US$ 1,299.00'}),
    cny:window.SOUTU_PRICE_INTELLIGENCE.parsePrice({price:'CNY 1,299.00'})
  }));
  expect(parsed.eur).toMatchObject({amount:1299,currency:'EUR'});
  expect(parsed.usd).toMatchObject({amount:1299,currency:'USD'});
  expect(parsed.cny).toMatchObject({amount:1299,currency:'CNY'});

  await page.locator('#fileInput').setInputFiles({name:'price.svg',mimeType:'image/svg+xml',buffer:fixture});
  await page.evaluate(()=>document.querySelector('#researchPanel')?.classList.remove('hidden'));
  await page.locator('#addQueryBtn').click();
  await page.locator('[data-query-index]').last().fill('garden shed');
  await page.locator('#universalSearchBtn').click();
  await expect(page.locator('.universal-result-card')).toHaveCount(5);

  const mediaCard=page.locator('.universal-result-card').filter({has:page.locator('a.universal-media[href="https://shop-a.example/item"]')});
  const productCard=page.locator('.universal-result-card').filter({has:page.locator('a.universal-media[href="https://shop-e.example/item"]')});
  const euCard=page.locator('.universal-result-card').filter({hasText:'EU Retail Listing'});
  await expect(mediaCard.locator('[data-result-price]')).toContainText('$ 299');
  await expect(productCard.locator('[data-result-price]')).toContainText('$ 319');
  await expect(euCard.locator('[data-result-price]')).toContainText('EUR 329');

  const bucketStats=await page.evaluate(()=>{
    const api=window.SOUTU_PRICE_INTELLIGENCE;
    const source=api.state.items.filter(x=>!String(x.title).includes('Different Variant'));
    return api.buckets(source);
  });
  expect(bucketStats.find(x=>x.currency==='$')).toMatchObject({count:3,min:299,max:349,median:319});
  expect(bucketStats.find(x=>x.currency==='$').cheapest).toMatchObject({amount:299,domain:'shop-a.example'});
  expect(bucketStats.find(x=>x.currency==='EUR')).toMatchObject({count:1,min:329,max:329,median:329});

  await page.locator('#universalIdentityGroupBtn').click();
  await expect(page.locator('#universalInsights')).toContainText('同款候选归组');
  const group=page.locator('[data-identity-group-key]').filter({hasText:'US Retail Listing'});
  await expect(group).toHaveCount(1);
  await expect(group).toContainText('4 条');
  await expect(group.locator('[data-price-intelligence]')).toContainText('$ 299–349');
  await expect(group.locator('[data-price-intelligence]')).toContainText('中位 319');
  await expect(group.locator('[data-price-intelligence]')).toContainText('价差 17%');
  await expect(group.locator('[data-price-intelligence]')).toContainText('最低价来源：shop-a.example');
  await expect(group.locator('[data-price-intelligence]')).toContainText('EUR 329');
  await expect(group.locator('[data-price-intelligence]')).not.toContainText('279');

  await group.click();
  await expect(page.locator('.universal-result-card')).toHaveCount(4);
  await expect(page.locator('#productResults')).not.toContainText('Different Variant');
});
