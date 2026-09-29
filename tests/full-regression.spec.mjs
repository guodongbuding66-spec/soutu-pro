import {test,expect} from '@playwright/test';

const fixture=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200"><rect width="320" height="200" fill="white"/><rect x="40" y="30" width="240" height="140" rx="12" fill="#1f2937"/><circle cx="160" cy="100" r="42" fill="#60a5fa"/><rect x="112" y="82" width="96" height="36" fill="#f8fafc"/></svg>`);
test.use({serviceWorkers:'block'});
test.setTimeout(90000);

const iconSvg='<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><circle cx="32" cy="32" r="25" fill="#2563eb"/><circle cx="32" cy="32" r="11" fill="white"/></svg>';

async function clean(page){
  await page.addInitScript(()=>{
    for(const k of Object.keys(localStorage)) if(k.startsWith('soutu-pro-')) localStorage.removeItem(k);
    localStorage.setItem('soutu-pro-settings-v5',JSON.stringify({tempEndpoint:'',productEndpoint:'',ttl:30,defaultPreset:'product',autoPreset:true}));
    window.print=()=>{window.__soutuPrinted=true};
    class FakeBarcodeDetector{constructor(){} async detect(){return[{rawValue:'0123456789012'}]}}
    window.BarcodeDetector=FakeBarcodeDetector;
  });
  await page.route('**/api/image-proxy?**',route=>route.fulfill({status:200,contentType:'image/svg+xml',body:iconSvg}));
}

async function uploadFixture(page){
  await page.locator('#fileInput').setInputFiles({name:'product.svg',mimeType:'image/svg+xml',buffer:fixture});
  await expect(page.locator('#workbench')).toBeVisible();
}

test('official engine brands render as real images at desktop and mobile',async({page})=>{
  await clean(page);
  await page.setViewportSize({width:1440,height:1000});
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('.engine-card')).toHaveCount(10);
  await expect(page.locator('.engine-card .engine-brand img')).toHaveCount(10);
  const marks=await page.locator('.engine-card .engine-brand').evaluateAll(nodes=>nodes.map(n=>({text:n.textContent.trim(),w:n.getBoundingClientRect().width,h:n.getBoundingClientRect().height,imgW:n.querySelector('img')?.getBoundingClientRect().width||0})));
  expect(marks.every(x=>!x.text&&x.w>=44&&x.h>=44&&x.imgW>=30)).toBeTruthy();
  await page.locator('.engines-section').screenshot({path:'test-results/engine-ui-desktop-9.1.1.png'});
  await page.setViewportSize({width:390,height:844});
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await page.locator('.engines-section').screenshot({path:'test-results/engine-ui-mobile-9.1.1.png'});
});

test('OCR vision barcode object detection and object-to-batch flow',async({page})=>{
  await clean(page);
  await page.route(/tesseract\.js@5/,route=>route.fulfill({status:200,contentType:'application/javascript',body:`window.Tesseract={recognize:async()=>({data:{text:'ACME\\nMODEL X100\\nSKU 12345'}})};`}));
  await page.route(/@tensorflow\/tfjs@4\.22\.0/,route=>route.fulfill({status:200,contentType:'application/javascript',body:'window.tf={};'}));
  await page.route(/@tensorflow-models\/mobilenet@2\.1\.1/,route=>route.fulfill({status:200,contentType:'application/javascript',body:`window.mobilenet={load:async()=>({classify:async()=>[{className:'tool shed',probability:.93}],infer:()=>({data:async()=>new Float32Array([1,0,0,0]),dispose(){}})})};`}));
  await page.route(/@tensorflow-models\/coco-ssd@2\.2\.3/,route=>route.fulfill({status:200,contentType:'application/javascript',body:`window.cocoSsd={load:async()=>({detect:async()=>[{class:'bench',score:.91,bbox:[35,25,180,110]}]})};`}));
  await page.goto('http://127.0.0.1:4173/');
  await uploadFixture(page);
  await page.locator('#analyzeBtn').click();
  await expect(page.locator('#ocrStatus')).toHaveText('识别完成',{timeout:15000});
  await expect(page.locator('#ocrOutput')).toContainText('MODEL X100');
  await expect(page.locator('#visionOutput')).toContainText('tool shed');
  await expect(page.locator('#barcodeOutput')).toContainText('0123456789012');
  await expect(page.locator('#objectsOutput .object-chip')).toHaveCount(1);
  await expect(page.locator('#queryList input').first()).toHaveValue(/MODEL X100|ACME/);
  await expect(page.locator('#batchObjectsBtn')).toBeVisible();
  await page.locator('#batchObjectsBtn').click();
  await expect(page.locator('#batchView')).toBeVisible();
  await expect(page.locator('#batchList .batch-row')).toHaveCount(1);
});

test('V9 result investigation modes, labels, watch, evidence, supplier, cases and exports',async({page,context})=>{
  await clean(page);
  await context.grantPermissions(['clipboard-read','clipboard-write'],{origin:'http://127.0.0.1:4173'});
  await page.route('**/api/url-status?**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({alive:true,status:200,title:'Tracked Product',price:'$188',product:{brand:'Demo',sku:'A-100'}})}));
  await page.route('**/api/supplier-search?**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({enabled:false,provider:'SerpAPI',message:'not configured'})}));
  await page.route(/xlsx\.full\.min\.js/,route=>route.fulfill({status:200,contentType:'application/javascript',body:`window.XLSX={utils:{book_new:()=>({sheets:[]}),json_to_sheet:x=>x,book_append_sheet:(wb,s,n)=>wb.sheets.push([n,s])},writeFile:(wb,n)=>{window.__xlsxWritten=n}};`}));
  await page.goto('http://127.0.0.1:4173/');
  await uploadFixture(page);
  await page.locator('[data-nav="research"]').first().click();
  await page.locator('[data-v9-demo]').click();
  await expect(page.locator('.v9-result-card')).toHaveCount(2);

  const first=page.locator('.v9-result-card').first();
  await first.locator('[data-label="same"]').click();
  await expect(page.locator('.v9-result-card').first().locator('[data-label="same"]')).toHaveClass(/active/);

  await page.locator('.v9-result-card').first().locator('[data-action="compare"]').click();
  await expect(page.locator('#v9CompareModal')).toBeVisible();
  await expect(page.locator('#v9CompareBody')).toContainText('示例商品 A');
  await page.locator('#v9CompareClose').click();

  await page.locator('.v9-result-card').first().locator('[data-action="watch"]').click();
  await page.locator('[data-v9-mode="watch"]').click();
  await expect(page.locator('.v9-watch-list article')).toHaveCount(1);
  await page.locator('[data-watch-refresh]').click();
  await expect(page.locator('.v9-watch-list')).toContainText('$188');
  await expect(page.locator('.v9-watch-list')).toContainText('在线');

  await page.locator('[data-v9-mode="results"]').click();
  await page.locator('.v9-result-card').first().locator('[data-action="evidence"]').click();
  await page.locator('[data-v9-mode="evidence"]').click();
  await expect(page.locator('.v9-evidence-list article')).toHaveCount(1);

  await page.locator('[data-v9-mode="results"]').click();
  await page.locator('.v9-result-card').first().locator('[data-action="supplier"]').click();
  await expect(page.locator('#v9CompareModal')).toBeVisible();
  await expect(page.locator('#v9CompareBody')).toContainText('供应商聚合 API 未启用');
  await expect(page.locator('#v9CompareBody a')).toHaveCount(3);
  await page.locator('#v9CompareClose').click();

  for(const mode of ['domains','timeline','graph']){
    await page.locator(`[data-v9-mode="${mode}"]`).click();
    await expect(page.locator('#v9Body')).not.toBeEmpty();
  }

  await page.locator('#v9Industrial').click();
  await expect(page.locator('#toastStack')).toContainText('工业结构模式已启用');

  page.once('dialog',d=>d.accept('Full QA Case'));
  await page.locator('#v9SaveCase').click();
  await page.locator('[data-v9-mode="cases"]').click();
  await expect(page.locator('.v9-case-grid')).toContainText('Full QA Case');

  const jsonDownload=page.waitForEvent('download');
  await page.locator('#v9ExportJson').click();
  expect((await jsonDownload).suggestedFilename()).toMatch(/soutu-pro-v9-.*\.json/);

  await page.locator('#v9ExportXlsx').click();
  await expect.poll(()=>page.evaluate(()=>window.__xlsxWritten||'')).toMatch(/\.xlsx$/);

  await page.locator('#v9Print').click();
  await expect.poll(()=>page.evaluate(()=>window.__soutuPrinted===true)).toBeTruthy();

  await page.locator('#v9CopyTrade').click();
  const clip=await page.evaluate(()=>navigator.clipboard.readText());
  expect(clip).toContain('"source": "soutu-pro"');
});

test('V9 JSON import, smart dedupe and AI controls always recover from failures',async({page})=>{
  await clean(page);
  await page.goto('http://127.0.0.1:4173/');
  await uploadFixture(page);
  await page.locator('[data-nav="research"]').first().click();
  const payload={source:'qa-import',results:[
    {title:'Same Product A',url:'https://example.com/a',image:'https://example.com/a.svg',product:{brand:'ACME',sku:'X1'}},
    {title:'Same Product B',url:'https://example.com/b',image:'https://example.com/b.svg',product:{brand:'ACME',sku:'X1'}}
  ]};
  await page.locator('#v9Import').setInputFiles({name:'results.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(payload))});
  await expect(page.locator('.v9-result-card')).toHaveCount(2);
  await page.locator('#v9Dedupe').click();
  await expect(page.locator('#v9Dedupe')).toBeEnabled({timeout:15000});
  await expect(page.locator('#v9Dedupe')).toContainText(/显示重复项|智能去重/);

  await page.route(/@tensorflow\/tfjs@4\.22\.0/,route=>route.abort());
  await page.route(/@tensorflow-models\/mobilenet@2\.1\.1/,route=>route.abort());
  await page.locator('#v9AiRank').click();
  await expect(page.locator('#v9AiRank')).toBeEnabled({timeout:25000});
  await expect(page.locator('#v9AiRank')).toContainText('AI 重排');
});

test('group controls, presets 1-6, native search links, remove source and URL source',async({page})=>{
  await clean(page);
  await page.route('https://example.com/remote.svg',route=>route.fulfill({status:200,contentType:'image/svg+xml',headers:{'access-control-allow-origin':'*'},body:fixture}));
  await page.goto('http://127.0.0.1:4173/');
  const firstGroup=page.locator('.engine-group-panel').first();
  await firstGroup.locator('[data-group-clear]').click();
  await expect(firstGroup.locator('.engine-card.selected')).toHaveCount(0);
  await firstGroup.locator('[data-group-select]').click();
  await expect(firstGroup.locator('.engine-card.selected')).toHaveCount(4);

  for(let n=1;n<=6;n++){await page.keyboard.press(String(n));await expect(page.locator('.preset-card.active')).toHaveCount(1)}

  await page.locator('#urlInput').fill('https://example.com/remote.svg');
  await page.locator('#urlForm button').click();
  await expect(page.locator('#workbench')).toBeVisible();
  await expect(page.locator('#sourceKind')).toContainText('图片链接');
  await page.locator('[data-preset="source"]').click();
  await page.locator('#runSearch').click();
  await expect(page.locator('#executionList [data-execution-open]')).toHaveCount(4);
  await expect(page.locator('#executionList [data-execution-open]')).toBeEnabled();
  await page.locator('[data-close="executionModal"]').click();
  await page.locator('#removeBtn').click();
  await expect(page.locator('#uploader')).toBeVisible();
});
