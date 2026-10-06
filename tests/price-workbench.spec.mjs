import {test,expect} from '@playwright/test';

test.use({serviceWorkers:'block'});
test.setTimeout(30000);

test('V9.5 price workbench ranks landed cost and explains excluded offers',async({page})=>{
  await page.addInitScript(()=>{
    localStorage.removeItem('soutu-price-workbench-v1');
    localStorage.removeItem('soutu-price-history-v1');
    localStorage.removeItem('soutu-price-alerts-v1');
    localStorage.removeItem('soutu-price-source-reliability-v1');
  });
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.SOUTU_PRICE_INTELLIGENCE&&window.SOUTU_PRICE_RELIABILITY&&window.SOUTU_PRICE_HISTORY&&window.SOUTU_PRICE_WORKBENCH));
  await page.waitForFunction(()=>window.SOUTU_PRICE_RELIABILITY.state.migrated===true);

  await page.evaluate(()=>{
    const api=window.SOUTU_PRICE_INTELLIGENCE;
    const gtin='4006381333931';
    api.beginSession('v95-workbench');
    api.capture('product',[
      {title:'Acme X1 Garden Product',url:'https://store-a.example/products/x1?utm_source=qa',price:'USD 100',currency:'USD',shippingCost:12,tax:8,availability:'In stock',product:{gtin,brand:'Acme',model:'X1'}},
      {title:'Acme X1 Garden Product duplicate merchant offer',url:'https://store-a.example/products/x1-special?ref=affiliate',price:'USD 99',currency:'USD',shippingCost:20,availability:'In stock',product:{gtin,brand:'Acme',model:'X1'}},
      {title:'Acme X1 Garden Product',url:'https://store-b.example/item/x1',price:'USD 105',currency:'USD',availability:'In stock',product:{gtin,brand:'Acme',model:'X1'}},
      {title:'Acme X1 Garden Product',url:'https://store-c.example/item/x1',price:'USD 80',currency:'USD',availability:'Out of stock',product:{gtin,brand:'Acme',model:'X1'}}
    ],{sessionId:api.state.sessionId,fingerprint:'v95-workbench'});
    window.SOUTU_PRICE_RELIABILITY.refresh();
    window.SOUTU_PRICE_HISTORY.refresh();
    window.SOUTU_PRICE_WORKBENCH.render();
  });

  const wb=page.locator('[data-price-workbench-v95]');
  await expect(wb).toBeVisible();
  await expect(wb.getByText('价格调查工作台')).toBeVisible();
  await expect(wb.getByText('最佳到手价')).toBeVisible();
  await expect(wb.getByText('USD 105')).toBeVisible();

  const group=wb.locator('[data-wb-group]').first();
  await expect(group.locator('[data-wb-offer][data-eligible="true"]')).toHaveCount(2);
  const visibleSources=group.locator('[data-wb-offer] td:first-child b');
  await expect(visibleSources.nth(0)).toHaveText('store-b.example');
  await expect(visibleSources.nth(1)).toHaveText('store-a.example');

  await wb.locator('[data-wb-excluded]').click();
  await expect(group.locator('[data-wb-offer]')).toHaveCount(4);
  await expect(group.getByText('缺货',{exact:true})).toBeVisible();
  await expect(group.getByText(/同商家重复报价/)).toBeVisible();

  const stock=wb.locator('[data-wb-stock]');
  await stock.check();
  await expect(group.locator('[data-wb-offer][data-stock="out-of-stock"]')).toHaveCount(0);

  const alertInput=group.locator('[data-wb-alert-input]');
  await alertInput.fill('101');
  await group.locator('[data-wb-alert-save]').click();
  await expect.poll(()=>page.evaluate(()=>Object.values(window.SOUTU_PRICE_HISTORY.state.alerts).some(x=>x?.enabled&&x?.currency==='USD'&&x?.target===101))).toBe(true);

  await expect(wb.getByText(/同商家重复报价默认隐藏/)).toBeVisible();
});
