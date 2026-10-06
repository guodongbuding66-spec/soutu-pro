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
    return{eur:h.convertToBase(72,'EUR'),usd:h.convertToBase(100,'USD'),ambiguous:h.convertToBase(60,'$'),best:h.bestOffer(group)};
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
    const now=Date.now(),first=h.recordItem(item,now),duplicate=h.recordItem(item,now+100),changed=h.recordItem({...item,price:'USD 90'},now+200),key=`${h.productKey(item)}::USD`;
    h.saveAlert(key,'USD',95);
    const session=p.beginSession('price-history-test');p.capture('media',[{...item,price:'USD 90'}],{sessionId:session});h.ingest();
    const stored=JSON.parse(localStorage.getItem('soutu-price-alerts-v1')||'{}'),history=h.state.history[key]?.points||[];
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

test('V9.4.2 maps identity workbench by semantic identity evidence, not visible titles',async({page})=>{
  await ready(page);
  await page.evaluate(()=>{
    const p=window.SOUTU_PRICE_INTELLIGENCE,session=p.beginSession('stable-identity-ui');
    p.capture('media',[
      {title:'US Retail Listing',price:'USD 100',snippet:'Brand: iSUNOR Model: MS86GY MPN: RY-MS86 EAN: 4006381333931',link:'https://us.example/item'},
      {title:'EU Retail Listing',price:'EUR 72',snippet:'Brand: iSUNOR Model: MS86GY MPN: RY-MS86 EAN: 4006381333931',link:'https://eu.example/item'}
    ],{sessionId:session});
    const host=document.querySelector('#universalInsights');host.classList.remove('hidden');
    host.innerHTML='<button data-identity-group-key="identity-0"><div><b>候选组 1</b><span>2 条</span></div><strong>GTIN</strong><small>GTIN 4006381333931</small><p>完全不同的展示标题 / Localized title</p></button>';
    window.SOUTU_PRICE_HISTORY.refresh();
  });
  const panel=page.locator('[data-price-history-workbench]');
  await expect(panel).toHaveCount(1);
  await expect(panel).toContainText('V9.4.2 · PRICE INTELLIGENCE');
  await expect(panel).toContainText('USD 90 等值');
  await expect(panel).toContainText('EUR 72 · eu.example');
  await expect(panel).toContainText('稳定身份键 gtin:4006381333931');
  await expect(panel).toContainText('历史异常点不会计入最低价/趋势');
});

test('V9.4.2 keeps same-title identity groups isolated by GTIN',async({page})=>{
  await ready(page);
  await page.evaluate(()=>{
    const p=window.SOUTU_PRICE_INTELLIGENCE,session=p.beginSession('same-title-two-groups');
    p.capture('media',[
      {title:'Same Product',price:'USD 100',snippet:'EAN: 4006381333931',link:'https://a.example/item'},
      {title:'Same Product',price:'USD 110',snippet:'EAN: 4006381333931',link:'https://b.example/item'},
      {title:'Same Product',price:'USD 200',snippet:'EAN: 5901234123457',link:'https://c.example/item'},
      {title:'Same Product',price:'USD 210',snippet:'EAN: 5901234123457',link:'https://d.example/item'}
    ],{sessionId:session});
    const host=document.querySelector('#universalInsights');host.classList.remove('hidden');
    host.innerHTML='<button data-identity-group-key="identity-0"><strong>GTIN</strong><small>GTIN 4006381333931</small><p>Same Product</p></button><button data-identity-group-key="identity-1"><strong>GTIN</strong><small>GTIN 5901234123457</small><p>Same Product</p></button>';
    window.SOUTU_PRICE_HISTORY.refresh();
  });
  await expect(page.locator('[data-price-history-group]')).toHaveCount(2);
  await expect(page.locator('[data-price-identity-key="gtin:4006381333931"]')).toContainText('USD 100');
  await expect(page.locator('[data-price-identity-key="gtin:5901234123457"]')).toContainText('USD 200');
});

test('V9.4.1 Best Offer excludes anomalous outlier prices',async({page})=>{
  await ready(page);
  const best=await page.evaluate(()=>window.SOUTU_PRICE_HISTORY.bestOffer([
    {title:'Normal A',price:'USD 100',snippet:'Brand: iSUNOR Model: MS86GY MPN: RY-MS86 EAN: 4006381333931',link:'https://a.example/item'},
    {title:'Normal B',price:'USD 105',snippet:'Brand: iSUNOR Model: MS86GY MPN: RY-MS86 EAN: 4006381333931',link:'https://b.example/item'},
    {title:'Broken decimal',price:'USD 1',snippet:'Brand: iSUNOR Model: MS86GY MPN: RY-MS86 EAN: 4006381333931',link:'https://bad.example/item'}
  ]));
  expect(best).toMatchObject({currency:'USD',amount:100,source:'a.example'});
});

test('V9.4.2 quality-aware ingest rejects group outliers before persistence',async({page})=>{
  await ready(page);
  const result=await page.evaluate(()=>{
    const p=window.SOUTU_PRICE_INTELLIGENCE,h=window.SOUTU_PRICE_HISTORY;h.clearHistory();
    const id='EAN: 4006381333931',session=p.beginSession('quality-ingest');
    p.capture('media',[
      {title:'Normal A',price:'USD 100',snippet:id,link:'https://a.example/item'},
      {title:'Normal B',price:'USD 105',snippet:id,link:'https://b.example/item'},
      {title:'Broken decimal',price:'USD 1',snippet:id,link:'https://bad.example/item'}
    ],{sessionId:session});h.ingest();
    return{amounts:Object.values(h.state.history).flatMap(r=>(r.points||[]).map(x=>x.amount)),rejected:h.state.rejectedIngestSamples};
  });
  expect(result.amounts.sort((a,b)=>a-b)).toEqual([100,105]);
  expect(result.rejected).toBeGreaterThanOrEqual(1);
});

test('V9.4.2 historical trend filters legacy anomalous points',async({page})=>{
  await ready(page);
  const result=await page.evaluate(()=>{
    const h=window.SOUTU_PRICE_HISTORY;h.clearHistory();const id='EAN: 4006381333931',now=Date.now();
    const group=[
      {title:'A',price:'USD 100',snippet:id,link:'https://a.example/item'},
      {title:'B',price:'USD 105',snippet:id,link:'https://b.example/item'},
      {title:'Legacy bad',price:'USD 1',snippet:id,link:'https://bad.example/item'}
    ];
    group.forEach((item,i)=>h.recordItem(item,now+i));
    return h.mergeGroupHistory(group,'USD').map(x=>x.amount);
  });
  expect(result).toEqual([100,105]);
});

test('V9.4.1 target alert does not retrigger on a higher price still below target',async({page})=>{
  await ready(page);
  const result=await page.evaluate(()=>{
    const p=window.SOUTU_PRICE_INTELLIGENCE,h=window.SOUTU_PRICE_HISTORY,item={title:'Tracked offer',price:'USD 90',snippet:'Brand: iSUNOR Model: MS86GY MPN: RY-MS86 EAN: 4006381333931',link:'https://alert.example/item'},key=`${h.productKey(item)}::USD`;
    h.saveAlert(key,'USD',95);const session=p.beginSession('alert-hysteresis');p.capture('media',[item],{sessionId:session});h.ingest();const first=h.state.alerts[key].lastTriggeredAmount;
    p.capture('media',[{...item,price:'USD 91'}],{sessionId:session});h.ingest();const higher=h.state.alerts[key].lastTriggeredAmount;
    p.capture('media',[{...item,price:'USD 89'}],{sessionId:session});h.ingest();const lower=h.state.alerts[key].lastTriggeredAmount;
    return{first,higher,lower,lastObserved:h.state.alerts[key].lastObservedAmount};
  });
  expect(result).toEqual({first:90,higher:90,lower:89,lastObserved:89});
});

test('V9.4.1 history canonicalizes tracking URLs before URL-key deduplication',async({page})=>{
  await ready(page);
  const result=await page.evaluate(()=>{
    const h=window.SOUTU_PRICE_HISTORY;h.clearHistory();
    const a={title:'Tracked item',price:'USD 100',link:'https://track.example/item?id=7&utm_source=google#top'},b={...a,link:'https://track.example/item?utm_medium=cpc&id=7&utm_source=bing'},now=Date.now();
    return{keyA:h.productKey(a),keyB:h.productKey(b),first:h.recordItem(a,now),duplicate:h.recordItem(b,now+100)};
  });
  expect(result.keyA).toBe('url:https://track.example/item?id=7');
  expect(result.keyB).toBe(result.keyA);
  expect(result.first).toBe(true);
  expect(result.duplicate).toBe(false);
});
