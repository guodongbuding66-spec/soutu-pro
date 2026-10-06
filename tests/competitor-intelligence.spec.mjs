import {test,expect} from '@playwright/test';

test.use({serviceWorkers:'block'});
test.setTimeout(60000);

test('competitor intelligence mounts and separates same product competitor and supplier candidates',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#competitorIntelligenceBtn')).toHaveCount(1,{timeout:10000});
  await expect(page.locator('#competitorIntelligencePanel')).toHaveCount(1);

  await page.evaluate(()=>{
    const items=[
      {title:'Acme 8x6 Metal Garden Shed Gray',link:'https://retail-a.example/acme-shed',price:'USD 399',product:{brand:'Acme',model:'S86',mpn:'S86-GY',asin:'B0ABCDEF12'}},
      {title:'Acme S86 8x6 Gray Garden Shed',link:'https://retail-b.example/acme-shed',price:'USD 419',product:{brand:'Acme',model:'S86',mpn:'S86-GY',asin:'B0ABCDEF12'}},
      {title:'Acme 8x6 Metal Garden Shed Charcoal',link:'https://retail-c.example/acme-competitor',price:'USD 389',product:{brand:'Acme',model:'S87',mpn:'S87-CH',asin:'B0ABCDEF13'}},
      {title:'8x6 Metal Garden Shed Manufacturer OEM Supplier',link:'https://supplier.alibaba.com/product/8x6-shed',price:'USD 210',provider:'Alibaba',snippet:'Factory wholesale OEM ODM manufacturer supplier',product:{brand:'FactoryCo',model:'OEM86',mpn:'OEM86'}}
    ];
    window.SOUTU_PRICE_INTELLIGENCE.state.items=items;
    window.SOUTU_PRICE_INTELLIGENCE.state.sources={media:items,product:items};
    document.querySelector('#universalResearchbar')?.classList.remove('hidden');
  });
  await expect(page.locator('#competitorIntelligenceBtn')).toBeVisible();

  await page.locator('#competitorIntelligenceBtn').click();
  const panel=page.locator('#competitorIntelligencePanel');
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('V9.5 · COMPETITOR & SUPPLIER INTELLIGENCE');
  await expect(panel).toContainText('GTIN 冲突强制隔离');
  await expect(panel.locator('.ci-group')).toHaveCount(1);
  await expect(panel.locator('.ci-group')).toContainText('2 条结果');
  await expect(panel.locator('.ci-card.competitor')).toContainText('Shed Charcoal');
  await expect(panel.locator('.ci-card.supplier')).toContainText('Manufacturer OEM Supplier');
  await expect(panel.locator('.ci-card.supplier .ci-reasons')).toContainText('B2B / 批发来源');
  await expect(panel.locator('.ci-card').first()).toContainText(/来源可靠 \d+%/);
  const unsafe=await panel.locator('a').evaluateAll(as=>as.some(a=>a.target!=='_blank'||!a.rel.includes('noopener')));
  expect(unsafe).toBeFalsy();

  await page.setViewportSize({width:390,height:844});
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  expect(errors).toEqual([]);
});