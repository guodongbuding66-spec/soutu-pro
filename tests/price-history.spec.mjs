import {test,expect} from '@playwright/test';

test.use({serviceWorkers:'block'});
test.setTimeout(30000);

async function ready(page){
  await page.addInitScript(()=>{
    localStorage.setItem('soutu-price-base-currency-v1','USD');
    localStorage.setItem('soutu-price-fx-cache-v1',JSON.stringify({
      USD:{base:'USD',date:'2026-10-05',provider:'QA FX',rates:{USD:1,EUR:.8,CNY:7},fetchedAt:Date.now()}
    }));
    localStorage.removeItem('soutu-price-history-v1');
    localStorage.removeItem('soutu-price-alerts-v1');
  });
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.SOUTU_PRICE_INTELLIGENCE&&window.SOUTU_PRICE_HISTORY));
}

test('V9.4 converts only explicit ISO currencies and picks the best trusted offer',async({page})=>{
  await ready(page);
  const result=await page.evaluate(()=>{
    const h=window.SOUTU_PRICE_HISTORY;
    const group=[
      {title:'US listing',price:'USD 100',snippet:'Brand: iSUNOR Model: MS86GY MPN: RY-MS86 EAN: 4006381333931',link:'https://us.example/item'},
      {title:'EU listing',price:'EUR 72',snippet:'Brand: iSUNOR Model: MS86GY MPN: RY-MS86 EAN: 4006381333931',link:'https://eu.example/item'},
      {title:'Ambiguous dollar',price:'$60',snippet:'Brand: iSUNOR Model: MS86GY MPN: RY-MS86 EAN: 4006381333931',link:'https://unknown.example/item'}
    ];
    return{
      eur:h.convertToBase(72,'EUR'),
      usd:h.convertToBase(100,'USD'),
      ambiguous:h.convertToBase(60,'$'),
      best:h.bestOffer(group)
    };
  });
  expect(result.eur).toBe(90);
  expect(result.usd).toBe(100);
  expect(result.ambiguous).toBeNull();
  expect(result.best).toMatchObject({currency:'EUR',amount:72,converted:90,source:'eu.example'});
});

test('V9.4 history deduplicates unchanged samples and persists target-price alerts',async({page})=>{
  await ready(page);
  const result=await page.evaluate(()=>{
    const p=window.SOUTU_PRICE_INTELLIGENCE,h=window.SOUTU_PRICE_HISTORY;
    h.clearHistory();
    const item={title:'Tracked item',price:'USD 100',snippet:'Brand: iSUNOR Model: MS86GY MPN: RY-MS86 EAN: 4006381333931',link:'https://track.example/item'};
    const now=Date.now();
    const first=h.recordItem(item,now);
    const duplicate=h.recordItem(item,now+100);
    const changed=h.recordItem({...item,price:'USD 90'},now+200);
    const key=`${h.productKey(item)}::USD`;
    h.saveAlert(key,'USD',95);
    const session=p.beginSession('price-history-test');
    p.capture('media',[{...item,price:'USD 90'}],{sessionId:session});
    h.ingest();
    const stored=JSON.parse(localStorage.getItem('soutu-price-alerts-v1')||'{}');
    const history=h.state.history[key]?.points||[];
    return{first,duplicate,changed,key,history,alert:stored[key]};
  });
  expect(result.first).toBe(true);
  expect(result.duplicate).toBe(false);
  expect(result.changed).toBe(true);
  expect(result.history).toHaveLength(2);
  expect(result.history.map(x=>x.amount)).toEqual([100,90]);
  expect(result.alert).toMatchObject({enabled:true,currency:'USD',target:95,lastTriggeredAmount:90});
  await expect(page.locator('#soutuPriceToast')).toContainText('达到目标价');
});

test('V9.4.1 renders price-history workbench and Best Offer for identity groups',async({page})=>{
  await ready(page);
  await page.evaluate(()=>{
    const p=window.SOUTU_PRICE_INTELLIGENCE;
    const session=p.beginSession('best-offer-ui');
    p.capture('media',[
      {title:'US Retail Listing',price:'USD 100',snippet:'Brand: iSUNOR Model: MS86GY MPN: RY-MS86 EAN: 4006381333931',link:'https://us.example/item'},
      {title:'EU Retail Listing',price:'EUR 72',snippet:'Brand: iSUNOR Model: MS86GY MPN: RY-MS86 EAN: 4006381333931',link:'https://eu.example/item'}
    ],{sessionId:session});
    const host=document.querySelector('#universalInsights');
    host.classList.remove('hidden');
    host.innerHTML='<button data-identity-group-key="qa">US Retail Listing · EU Retail Listing</button>';
    window.SOUTU_PRICE_HISTORY.refresh();
  });
  await expect(page.locator('[data-price-history-workbench]')).toHaveCount(1);
  await expect(page.locator('[data-price-history-workbench]')).toContainText('V9.4.1 · PRICE INTELLIGENCE');
  await expect(page.locator('[data-price-history-workbench]')).toContainText('USD 90 等值');
  await expect(page.locator('[data-price-history-workbench]')).toContainText('EUR 72 · eu.example');
  await expect(page.locator('[data-price-history-workbench]')).toContainText('歧义符号 $ / ¥ 不参与跨币种换算');
});

test('V9.4.1 Best Offer excludes anomalous outlier prices',async({page})=>{
  await ready(page);
  const best=await page.evaluate(()=>{
    const h=window.SOUTU_PRICE_HISTORY;
    const identity='Brand: iSUNOR Model: MS86GY MPN: RY-MS86 EAN: 4006381333931';
    return h.bestOffer([
      {title:'Normal A',price:'USD 100',snippet:identity,link:'https://a.example/item'},
      {title:'Normal B',price:'USD 105',snippet:identity,link:'https://b.example/item'},
      {title:'Broken decimal',price:'USD 1',snippet:identity,link:'https://bad.example/item'}
    ]);
  });
  expect(best).toMatchObject({currency:'USD',amount:100,source:'a.example'});
});

test('V9.4.1 target alert does not retrigger on a higher price still below target',async({page})=>{
  await ready(page);
  const result=await page.evaluate(()=>{
    const p=window.SOUTU_PRICE_INTELLIGENCE,h=window.SOUTU_PRICE_HISTORY;
    const identity='Brand: iSUNOR Model: MS86GY MPN: RY-MS86 EAN: 4006381333931';
    const item={title:'Tracked offer',price:'USD 90',snippet:identity,link:'https://alert.example/item'};
    const key=`${h.productKey(item)}::USD`;
    h.saveAlert(key,'USD',95);
    const session=p.beginSession('alert-hysteresis');
    p.capture('media',[item],{sessionId:session});h.ingest();
    const first=h.state.alerts[key].lastTriggeredAmount;
    p.capture('media',[{...item,price:'USD 91'}],{sessionId:session});h.ingest();
    const higher=h.state.alerts[key].lastTriggeredAmount;
    p.capture('media',[{...item,price:'USD 89'}],{sessionId:session});h.ingest();
    const lower=h.state.alerts[key].lastTriggeredAmount;
    return{first,higher,lower,lastObserved:h.state.alerts[key].lastObservedAmount};
  });
  expect(result).toEqual({first:90,higher:90,lower:89,lastObserved:89});
});

test('V9.4.1 history canonicalizes tracking URLs before URL-key deduplication',async({page})=>{
  await ready(page);
  const result=await page.evaluate(()=>{
    const h=window.SOUTU_PRICE_HISTORY;
    h.clearHistory();
    const a={title:'Tracked item',price:'USD 100',link:'https://track.example/item?id=7&utm_source=google#top'};
    const b={...a,link:'https://track.example/item?utm_medium=cpc&id=7&utm_source=bing'};
    const now=Date.now();
    return{
      keyA:h.productKey(a),
      keyB:h.productKey(b),
      first:h.recordItem(a,now),
      duplicate:h.recordItem(b,now+100)
    };
  });
  expect(result.keyA).toBe('url:https://track.example/item?id=7');
  expect(result.keyB).toBe(result.keyA);
  expect(result.first).toBe(true);
  expect(result.duplicate).toBe(false);
});
