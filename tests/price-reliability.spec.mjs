import {test,expect} from '@playwright/test';

test.use({serviceWorkers:'block'});
test.setTimeout(30000);

async function ready(page,init=null){
  await page.addInitScript(payload=>{
    localStorage.removeItem('soutu-price-history-v1');
    localStorage.removeItem('soutu-price-history');
    localStorage.removeItem('soutu-price-history-v0');
    localStorage.removeItem('soutu-price-history-schema-v2');
    localStorage.removeItem('soutu-price-source-reliability-v1');
    localStorage.removeItem('soutu-price-alerts-v1');
    if(payload?.legacy)localStorage.setItem('soutu-price-history',JSON.stringify(payload.legacy));
    if(payload?.sources)localStorage.setItem('soutu-price-source-reliability-v1',JSON.stringify(payload.sources));
  },init);
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.SOUTU_PRICE_INTELLIGENCE&&window.SOUTU_PRICE_RELIABILITY&&window.SOUTU_PRICE_HISTORY));
  await page.waitForFunction(()=>window.SOUTU_PRICE_RELIABILITY.state.migrated===true);
}

const identity='Brand: iSUNOR Model: MS86GY MPN: RY-MS86 EAN: 4006381333931';

test('V9.4.3 separates product price, shipping, tax and availability',async({page})=>{
  await ready(page);
  const result=await page.evaluate(identity=>{
    const r=window.SOUTU_PRICE_RELIABILITY;
    const componentOnly={title:'Shipping quote',snippet:'Shipping: USD 12.00',link:'https://ship.example/item'};
    const item={title:'Retail offer',price:'USD 100',shippingCost:12,tax:8,availability:'In stock',snippet:identity,link:'https://retail.example/item'};
    return{componentOnly:r.reliableParsePrice(componentOnly),parts:r.priceComponents(item)};
  },identity);
  expect(result.componentOnly).toBeNull();
  expect(result.parts).toMatchObject({shipping:12,tax:8,landed:120,availability:'in-stock'});
  expect(result.parts.product).toMatchObject({amount:100,currency:'USD'});
});

test('V9.4.3 collapses duplicate merchant quotes and excludes unavailable offers',async({page})=>{
  await ready(page);
  const bucket=await page.evaluate(identity=>{
    const r=window.SOUTU_PRICE_RELIABILITY;
    const group=[
      {title:'Store A primary',price:'USD 100',snippet:identity,availability:'In stock',link:'https://a.example/item?utm_source=one'},
      {title:'Store A duplicate',price:'USD 98',snippet:identity,availability:'In stock',link:'https://a.example/item?ref=affiliate'},
      {title:'Store B',price:'USD 105',snippet:identity,availability:'In stock',link:'https://b.example/item'},
      {title:'Store C stale',price:'USD 80',snippet:identity,availability:'Out of stock',link:'https://c.example/item'}
    ];
    return r.reliabilityBuckets(group)[0];
  },identity);
  expect(bucket).toMatchObject({currency:'USD',count:2,merchantCount:2,duplicateMerchantCount:1,outOfStockCount:1,min:98,max:105});
  expect(bucket.cheapest).toMatchObject({amount:98,domain:'a.example',availability:'in-stock'});
});

test('V9.4.3 migrates legacy history into canonical schema-v2 records',async({page})=>{
  const legacy={
    'url:https://shop.example/item?utm_source=old::USD':{
      title:'Legacy item',currency:'USD',updatedAt:1700000000000,
      points:[{timestamp:1690000000000,price:100,url:'https://shop.example/item?utm_campaign=x#top',source:'shop.example'}]
    }
  };
  await ready(page,{legacy});
  const result=await page.evaluate(()=>({
    history:window.SOUTU_PRICE_HISTORY.state.history,
    schema:JSON.parse(localStorage.getItem('soutu-price-history-schema-v2')||'{}'),
    migration:window.SOUTU_PRICE_RELIABILITY.state
  }));
  const keys=Object.keys(result.history);
  expect(keys).toContain('url:https://shop.example/item::USD');
  const record=result.history['url:https://shop.example/item::USD'];
  expect(record.schemaVersion).toBe(2);
  expect(record.points).toHaveLength(1);
  expect(record.points[0]).toMatchObject({amount:100,url:'https://shop.example/item',schemaVersion:2});
  expect(result.schema.version).toBe(2);
  expect(result.migration.importedLegacyRecords).toBeGreaterThanOrEqual(1);
});

test('V9.4.3 stale source history decays instead of permanently biasing reliability',async({page})=>{
  const old=Date.now()-365*24*60*60*1000;
  await ready(page,{sources:{'retail.example':{observed:50,ema:.2,lastSeen:old,firstSeen:old}}});
  const stale=await page.evaluate(identity=>window.SOUTU_PRICE_RELIABILITY.sourceReliability({title:'Offer',price:'USD 100',snippet:identity,availability:'In stock',link:'https://retail.example/item'}),identity);
  await page.evaluate(()=>{
    const stats=JSON.parse(localStorage.getItem('soutu-price-source-reliability-v1')||'{}');
    stats['retail.example']={observed:50,ema:.2,lastSeen:Date.now(),firstSeen:Date.now()-1000};
    localStorage.setItem('soutu-price-source-reliability-v1',JSON.stringify(stats));
    window.SOUTU_PRICE_RELIABILITY.state.sourceStats=stats;
  });
  const recent=await page.evaluate(identity=>window.SOUTU_PRICE_RELIABILITY.sourceReliability({title:'Offer',price:'USD 100',snippet:identity,availability:'In stock',link:'https://retail.example/item'}),identity);
  expect(stale).toBeGreaterThan(recent);
  expect(stale).toBeGreaterThan(.8);
});
