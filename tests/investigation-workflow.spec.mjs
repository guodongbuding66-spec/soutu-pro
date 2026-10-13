import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
test.use({serviceWorkers:'block',reducedMotion:'reduce',viewport:{width:1440,height:1000}});
test.setTimeout(45000);
const fixture=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="#f5f5f5"/><rect x="40" y="30" width="220" height="120" fill="#335577"/></svg>');
async function setup(page){
  await page.route('**/api/image-proxy?**',r=>r.fulfill({status:200,contentType:'image/svg+xml',body:fixture}));
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
  await page.locator('[data-nav="research"]').first().click();await expect(page.locator('#v9Workflow')).toHaveAttribute('data-ready','true');
}
async function upload(page){await page.locator('#investigationFile').setInputFiles({name:'research-source.svg',mimeType:'image/svg+xml',buffer:fixture});await expect(page.locator('#v9Source h2')).toHaveText('research-source.svg')}
async function pageResponse(page){await page.route('**/api/url-status?**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({alive:true,status:200,title:'ACME Garden Shed 100',image:'https://images.example.com/product.png',description:'Galvanized garden storage',product:{name:'ACME Garden Shed 100',brand:'ACME',sku:'SH-100',model:'Garden 100',price:'199',currency:'EUR',image:'https://images.example.com/product.png'},price:'199 EUR',finalUrl:'https://shop.example.com/shed',checkedAt:Date.now()})}))}

test('empty research layout is horizontal and excludes demo results and foreign-trade links',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('soutu-pro-v9-results',JSON.stringify([{id:'demo-old',title:'示例商品 A',url:'https://example.com/a',engine:'demo',product:{brand:'Demo'}}])));
  await setup(page);await expect(page.locator('.v9-result-card')).toHaveCount(0);await expect(page.locator('[data-v9-demo]')).toHaveCount(0);await expect(page.locator('a[href*="ai-foreign-trade"]')).toHaveCount(0);await expect(page.locator('#v9CopyTrade')).toHaveCount(0);
  const source=await page.locator('#v9Source').boundingBox(),empty=await page.locator('#v9Source .v9-empty-inline').boundingBox();
  expect(empty.width).toBeGreaterThan(source.width-65);expect(source.height).toBeLessThan(155);
  await expect(page.locator('#investigationImageSource')).toBeDisabled();
  await expect(page.locator('#investigationCancel')).toBeHidden();
  await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  await page.locator('#v9Workflow').screenshot({path:'test-results/investigation-empty-mobile.png'});
});

test('research uploads and loads remote images without leaving the page and launches native image search',async({page,context})=>{
  await setup(page);await upload(page);await expect(page.locator('#researchHubView')).toBeVisible();await expect(page.locator('#investigationImageSource')).toBeEnabled();
  await page.locator('#investigationFile').setInputFiles({name:'renamed-source.svg',mimeType:'image/svg+xml',buffer:fixture});await expect(page.locator('#v9Source h2')).toHaveText('renamed-source.svg');
  await page.locator('#investigationImageProduct').click();await expect(page.locator('#executionModal')).toBeVisible();await expect(page.locator('[data-execution-id="google"] [data-execution-open]')).toHaveAttribute('href',/search-launch/);await page.locator('[data-close="executionModal"]').click();
  await page.route('https://image.example.com/source.svg',r=>r.fulfill({status:200,contentType:'image/svg+xml',headers:{'access-control-allow-origin':'*'},body:fixture}));
  await page.locator('#investigationImageUrl').fill('https://image.example.com/source.svg');await page.locator('#investigationLoadImage').click();await expect(page.locator('#v9Source h2')).toHaveText('source.svg');await expect(page.locator('#researchHubView')).toBeVisible();
});

test('real API results enter research while missing product aggregation produces no sample cards',async({page})=>{
  await setup(page);let requested='';
  await page.route('**/api/media-search?**',r=>{requested=r.request().url();return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({enabled:true,items:[{title:'Garden shed source',link:'https://commons.wikimedia.org/wiki/File:Garden_shed.jpg',thumbnail:'https://images.example.com/shed.jpg',provider:'Wikimedia Commons',publishedAt:'2025-04-01',meta:{width:800,height:600}}],providers:[{name:'Wikimedia Commons',enabled:true},{name:'Openverse',enabled:false}]})})});
  await page.locator('#investigationQuery').fill('garden shed ACME');await page.locator('#investigationSearch').click();await expect(page.locator('.v9-result-card')).toHaveCount(1);await expect(page.locator('#investigationStatus')).toContainText('1 条真实结果');await expect(page.locator('#investigationStatus')).toContainText('Openverse');expect(new URL(requested).searchParams.get('q')).toBe('garden shed ACME');await expect(page.locator('.v9-score-row').first()).toContainText('—');
  await page.route('**/api/product-search?**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({enabled:false,message:'SERPAPI_KEY is not configured'})}));await page.locator('#investigationScope').selectOption('product');await page.locator('#investigationSearch').click();await expect(page.locator('#investigationStatus')).toContainText('未配置');await expect(page.locator('.v9-result-card')).toHaveCount(1);await expect(page.locator('#investigationSearch')).toBeEnabled();
});

test('capturing a product page supports comparison, evidence, project restore and downloaded report data',async({page})=>{
  await setup(page);await upload(page);await pageResponse(page);await page.locator('#investigationQuery').fill('ACME SH-100');
  await page.locator('#investigationUrls').fill('https://shop.example.com/shed');await page.locator('#investigationCollect').click();await expect(page.locator('.v9-result-card')).toHaveCount(1);await expect(page.locator('.v9-result-card')).toContainText('ACME Garden Shed 100');await expect(page.locator('.v9-result-meta strong')).toHaveText('199 EUR');await expect(page.locator('.v9-result-card img')).toHaveCount(1);
  await page.locator('.v9-result-card [data-action="compare"]').click();await expect(page.locator('#v9CompareBody')).toContainText('SH-100');await page.locator('#v9CompareClose').click();
  await page.locator('.v9-result-card [data-action="evidence"]').click();await page.locator('.v9-result-card [data-action="evidence"]').click();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('soutu-pro-v9-evidence')).length)).toBe(1);
  page.once('dialog',d=>d.accept('Usable investigation'));await page.locator('#v9SaveCase').click();await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('soutu-pro-v9-cases')||'[]').length)).toBe(1);
  await page.locator('#investigationQuery').fill('another query');await page.locator('[data-v9-mode="cases"]').click();await page.locator('[data-case-open]').click();await expect(page.locator('#investigationQuery')).toHaveValue('ACME SH-100');await expect(page.locator('#v9Source h2')).toHaveText('research-source.svg');await expect(page.locator('#investigationStatus')).toContainText('预览图');
  const downloaded=page.waitForEvent('download');await page.locator('#v9ExportJson').click();const download=await downloaded;const exported=JSON.parse(await readFile(await download.path(),'utf8'));expect(exported.query).toBe('ACME SH-100');expect(exported.results[0].product.sku).toBe('SH-100');expect(exported.evidence).toHaveLength(1);expect(exported.evidence[0].image).toBe('https://images.example.com/product.png');
  await page.locator('#v9Workflow').screenshot({path:'test-results/investigation-populated-desktop.png'});
});

test('mixed collection failures are explicit and protected pages can be recorded manually',async({page})=>{
  await setup(page);await page.route('**/api/url-status?**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({alive:false,status:403})}));
  await page.locator('#investigationUrls').fill('not a URL\nhttps://protected.example.com/product');await page.locator('#investigationCollect').click();await expect(page.locator('#investigationStatus')).toContainText('采集完成');await expect(page.locator('#investigationCaptureLog li')).toHaveCount(2);await expect(page.locator('#investigationCaptureLog')).toContainText('HTTP 403');await expect(page.locator('.v9-result-card')).toHaveCount(0);
  await page.locator('.investigation-manual summary').click();await page.locator('#investigationManualUrl').fill('https://protected.example.com/product');await page.locator('#investigationManualTitle').fill('Manually checked shed');await page.locator('#investigationManualPrice').fill('EUR 220');await page.locator('#investigationManualModel').fill('SH-220');await page.locator('#investigationManualSave').click();await expect(page.locator('.v9-result-card')).toContainText('手工记录');await expect(page.locator('.v9-result-card')).toContainText('Manually checked shed');
  await page.locator('#v9Filter').fill('nothing matches');await expect(page.locator('#v9Body')).toContainText('没有匹配');await page.locator('[data-v9-reset-filter]').click();await expect(page.locator('.v9-result-card')).toHaveCount(1);
});

test('stopping a delayed query or changing keywords prevents stale results and restores controls',async({page})=>{
  await setup(page);let release;const gate=new Promise(r=>release=r);
  await page.route('**/api/media-search?**',async r=>{await gate;try{await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({enabled:true,items:[{title:'STALE RESULT',link:'https://old.example.com/source'}]})})}catch{}});
  await page.locator('#investigationQuery').fill('old query');await page.locator('#investigationSearch').click();await expect(page.locator('#investigationCancel')).toBeVisible();await page.locator('#investigationQuery').fill('new query');release();await expect(page.locator('#investigationSearch')).toBeEnabled();await expect(page.locator('.v9-result-card')).toHaveCount(0);await expect(page.locator('#investigationStatus')).toContainText('已停止');await expect(page.locator('#investigationCancel')).toBeHidden();
});

test('repeated collection updates the same candidate and invalid imports are explained',async({page})=>{
  await setup(page);await pageResponse(page);for(let i=0;i<2;i++){await page.locator('#investigationUrls').fill('https://shop.example.com/shed');await page.locator('#investigationCollect').click();await expect(page.locator('#investigationStatus')).toContainText('采集完成')}
  await expect(page.locator('.v9-result-card')).toHaveCount(1);
  await page.locator('#v9Import').setInputFiles({name:'wrong-shape.json',mimeType:'application/json',buffer:Buffer.from('{"wrong":true}')});await expect(page.locator('#toastStack')).toContainText('导入失败');
  await page.locator('.v9-result-card [data-action="remove"]').click();await expect(page.locator('.v9-result-card')).toHaveCount(0);
});

test('arbitrary page-text prices are shown as unverified clues and do not update a tracked quote',async({page})=>{
  await setup(page);await page.route('**/api/url-status?**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({alive:true,status:200,title:'Shed product page',price:'$10',priceSource:'page-text',product:{},finalUrl:'https://shop.example.com/shed',checkedAt:Date.now()})}));
  await page.locator('#investigationUrls').fill('https://shop.example.com/shed');await page.locator('#investigationCollect').click();await expect(page.locator('.v9-result-card')).toHaveCount(1);await expect(page.locator('.v9-result-meta strong')).toHaveCount(0);await expect(page.locator('.v9-result-meta')).toContainText('文本价格 $10 · 待核对');
  await page.locator('.v9-result-card [data-action="watch"]').click();await page.locator('[data-v9-mode="watch"]').click();await page.locator('[data-watch-refresh]').click();await expect(page.locator('.v9-watch-status')).toContainText('文本价格待核对');await expect(page.locator('.v9-watch-status strong')).toHaveText('价格未知');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('soutu-pro-v9-watch'))[0].history.length)).toBe(0);
});

test('replacing the source image invalidates old similarity numbers in the UI and exported report',async({page})=>{
  await setup(page);await upload(page);
  await page.evaluate(()=>window.SOUTU_V9_IMPORT({source:'QA source',results:[{title:'Candidate shed',url:'https://shop.example.com/shed',image:'https://images.example.com/shed.jpg',scores:{overall:.99,visual:.98,structure:.97}}]},{focus:false,notify:false}));
  await expect(page.locator('.v9-score-row')).toContainText('99');
  await page.locator('#investigationFile').setInputFiles({name:'changed-source.svg',mimeType:'image/svg+xml',buffer:Buffer.from(fixture.toString().replace('#335577','#993355'))});await expect(page.locator('#v9Source h2')).toHaveText('changed-source.svg');await expect(page.locator('.v9-score-row')).toContainText('—');await page.locator('[data-label="same"]').click();await expect(page.locator('.v9-score-row')).toContainText('—');
  await page.evaluate(()=>window.print=()=>{});await page.locator('#v9Print').click();await expect(page.locator('#v9PrintReport')).toContainText('未计算');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('soutu-pro-v9-results'))[0].scores)).toEqual({});
});
