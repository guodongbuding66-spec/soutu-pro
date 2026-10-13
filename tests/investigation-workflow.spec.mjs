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

async function importCandidates(page){
  await page.evaluate(()=>window.SOUTU_V9_IMPORT({source:'QA capture',results:Array.from({length:6},(_,i)=>({id:`candidate-${i}`,title:i===0?'=SUM(1,2)\n"产品"':`Shed candidate ${i}`,url:`https://${i<3?'one':'two'}.example.com/item-${i}`,image:'https://images.example.com/item.png',query:'original investigation query',captureState:'page',capturedAt:1700000000000,price:i===0?'':'EUR 200',observedPrice:i===0?'$10':'',product:{brand:'ACME',model:`MODEL-${i}`,currency:'EUR'},manualLabel:i===1?'same':'',scores:{}}))},{focus:false,notify:false}));
}

test('selection respects filters, shows hidden selections and batches evidence and watch without duplicates',async({page})=>{
  await setup(page);await importCandidates(page);await expect(page.locator('#v9SaveSelectedEvidence')).toBeDisabled();
  await page.locator('#v9Domain').selectOption('one.example.com');await page.locator('#v9SelectVisible').click();await expect(page.locator('[data-result-select]:checked')).toHaveCount(3);await expect(page.locator('#v9SelectionCount')).toContainText('已选 3 条');
  await page.locator('#v9Domain').selectOption('two.example.com');await expect(page.locator('#v9SelectionCount')).toContainText('3 条被筛选隐藏');await expect(page.locator('[data-result-select]:checked')).toHaveCount(0);
  await page.locator('#investigationQuery').fill('changed after capture');
  for(let i=0;i<2;i++){await page.locator('#v9SaveSelectedEvidence').click();await page.locator('#v9WatchSelected').click()}
  const saved=await page.evaluate(()=>({evidence:JSON.parse(localStorage.getItem('soutu-pro-v9-evidence')),watch:JSON.parse(localStorage.getItem('soutu-pro-v9-watch'))}));
  expect(saved.evidence).toHaveLength(3);expect(saved.watch).toHaveLength(3);expect(saved.evidence.every(e=>e.url.includes('one.example.com')&&e.query==='original investigation query')).toBe(true);expect(saved.evidence.find(e=>e.title.startsWith('=')).observedPrice).toBe('$10');
  await page.locator('#v9SelectVisible').click();await expect(page.locator('#v9SelectionCount')).toContainText('已选 6 条');await expect(page.locator('#v9Compare')).toBeDisabled();await expect(page.locator('#v9SelectionCount')).toContainText('最多 4 条');
  const card=page.locator('.v9-result-card').first(),title=await card.locator('.v9-result-title b').textContent();await card.locator('[data-action="compare"]').click();await expect(page.locator('#v9CompareBody .v9-compare-grid article')).toHaveCount(1);await expect(page.locator('#v9CompareBody .v9-compare-grid article')).toContainText(title);await page.locator('#v9CompareClose').click();
  await page.locator('#v9ClearSelection').click();await expect(page.locator('#v9SelectionCount')).toHaveText('已选 0 条');await expect(page.locator('#v9SaveSelectedEvidence')).toBeDisabled();
  const checkbox=page.locator('[data-result-select]').first();await checkbox.focus();await page.keyboard.press('Space');await expect(checkbox).toBeChecked();await expect(checkbox).toBeFocused();
  await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);await page.locator('#v9SelectionBar').screenshot({path:'test-results/investigation-batch-mobile.png'});
});

function parseCsv(text){
  const rows=[];let row=[],value='',quoted=false;
  for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){value+='"';i++}else quoted=!quoted}else if(!quoted&&c===','){row.push(value);value=''}else if(!quoted&&c==='\n'){row.push(value.replace(/\r$/,''));rows.push(row);row=[];value=''}else value+=c}
  row.push(value);rows.push(row);return rows;
}
test('downloaded CSV includes exactly selected or filtered rows, quotes multiline text and leaves unknown scores empty',async({page})=>{
  await setup(page);await importCandidates(page);await page.locator('#v9Domain').selectOption('one.example.com');
  let pending=page.waitForEvent('download');await page.locator('#v9ExportCsv').click();let download=await pending;expect(download.suggestedFilename()).toContain('filtered');
  let bytes=await readFile(await download.path());expect([...bytes.subarray(0,3)]).toEqual([239,187,191]);let rows=parseCsv(bytes.toString('utf8').slice(1));expect(rows).toHaveLength(4);
  const headers=rows[0],record=rows.find(r=>r[0].includes('SUM'));expect(record[0]).toBe("'=SUM(1,2)\n\"产品\"");expect(record[headers.indexOf('页面价格')]).toBe('');expect(record[headers.indexOf('待核对文本价格')]).toBe('$10');expect(record[headers.indexOf('综合相似度 (%)')]).toBe('');expect(record[headers.indexOf('搜索词')]).toBe('original investigation query');expect(rows.every(r=>r.length===headers.length)).toBe(true);
  await page.locator('[data-result-select="candidate-1"]').check();await page.locator('#v9Domain').selectOption('two.example.com');await expect(page.locator('#v9ExportCsv')).toHaveText('导出所选 CSV');pending=page.waitForEvent('download');await page.locator('#v9ExportCsv').click();download=await pending;expect(download.suggestedFilename()).toContain('selected');rows=parseCsv((await readFile(await download.path(),'utf8')).slice(1));expect(rows).toHaveLength(2);expect(rows[1][0]).toBe('Shed candidate 1');expect(rows[1][headers.indexOf('人工判断')]).toBe('完全同款');
});

test('retrying only failed pages retains successful sources and records the original query',async({page})=>{
  await setup(page);const calls=[];let fail=true;
  await page.route('**/api/url-status?**',r=>{const href=new URL(r.request().url()).searchParams.get('url');calls.push(href);const blocked=href.endsWith('/blocked')&&fail;return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(blocked?{alive:false,status:403}:{alive:true,status:200,title:href.endsWith('/blocked')?'Recovered page':'Initial page',finalUrl:href})})});
  await page.locator('#investigationQuery').fill('first query');await page.locator('#investigationUrls').fill('https://shop.example.com/good\nhttps://shop.example.com/blocked\ninvalid');await page.locator('#investigationCollect').click();await expect(page.locator('#investigationStatus')).toContainText('采集完成');await expect(page.locator('.v9-result-card')).toHaveCount(1);await expect(page.locator('#investigationCaptureLog li')).toHaveCount(3);await expect(page.locator('#investigationCaptureLog a[href="#"]')).toHaveCount(0);await expect(page.locator('#investigationRetryFailed')).toHaveText('重试未完成 1 条');
  const recovery=page.locator('#investigationCaptureLog li').filter({hasText:'blocked'});await recovery.locator('[data-capture-manual]').click();await expect(page.locator('#investigationManualUrl')).toHaveValue('https://shop.example.com/blocked');await expect(page.locator('#investigationManualTitle')).toBeFocused();
  await page.locator('#investigationQuery').fill('second query');fail=false;await recovery.locator('[data-capture-retry]').click();await expect(page.locator('#investigationStatus')).toContainText('采集完成');await expect(page.locator('.v9-result-card')).toHaveCount(2);expect(calls.filter(u=>u.endsWith('/good'))).toHaveLength(1);expect(calls.filter(u=>u.endsWith('/blocked'))).toHaveLength(2);await expect(page.locator('#investigationRetryFailed')).toBeHidden();await expect(page.locator('#investigationCaptureLog li[data-state="error"]')).toHaveCount(1);
  const recovered=await page.evaluate(()=>JSON.parse(localStorage.getItem('soutu-pro-v9-results')).find(r=>r.title==='Recovered page'));expect(recovered.query).toBe('first query');await page.locator('.v9-result-card').filter({hasText:'Recovered page'}).locator('[data-action="evidence"]').click();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('soutu-pro-v9-evidence'))[0].query)).toBe('first query');
});

test('stopped page collection exposes queued and running links for retry and rejects late responses',async({page})=>{
  await setup(page);let delayed=true,release;const gate=new Promise(r=>release=r),calls=[];
  await page.route('**/api/url-status?**',async r=>{const old=delayed,href=new URL(r.request().url()).searchParams.get('url');calls.push(href);if(old)await gate;try{await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({alive:true,status:200,title:(old?'STALE':'Recovered')+' '+href,finalUrl:href})})}catch{}});
  await page.locator('#investigationUrls').fill('https://shop.example.com/a\nhttps://shop.example.com/b\nhttps://shop.example.com/c');await page.locator('#investigationCollect').click();await expect.poll(()=>calls.length).toBe(2);await page.locator('#investigationCancel').click();await expect(page.locator('#investigationCaptureLog li[data-state="stopped"]')).toHaveCount(3);await expect(page.locator('#investigationRetryFailed')).toHaveText('重试未完成 3 条');
  delayed=false;release();await page.locator('#investigationRetryFailed').click();await expect(page.locator('#investigationStatus')).toContainText('采集完成');await expect(page.locator('.v9-result-card')).toHaveCount(3);await expect(page.locator('#v9Body')).not.toContainText('STALE');expect(calls).toHaveLength(5);await expect(page.locator('#investigationCancel')).toBeHidden();await expect(page.locator('#investigationRetryFailed')).toBeHidden();
});

test('a protected-page recovery prefills manual recording and retains its capture query',async({page})=>{
  await setup(page);await page.route('**/api/url-status?**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({alive:false,status:403})}));
  await page.locator('#investigationQuery').fill('captured query');await page.locator('#investigationUrls').fill('https://protected.example.com/product');await page.locator('#investigationCollect').click();await expect(page.locator('#investigationStatus')).toContainText('采集完成');await page.locator('#investigationQuery').fill('unrelated later query');await page.locator('[data-capture-manual]').click();await expect(page.locator('#investigationManualUrl')).toHaveValue('https://protected.example.com/product');await expect(page.locator('#investigationManualNote')).toHaveValue(/HTTP 403/);await page.locator('#investigationManualTitle').fill('Checked product');await page.locator('#investigationManualSave').click();await expect(page.locator('#investigationCaptureLog li')).toHaveAttribute('data-state','manual');await expect(page.locator('#investigationRetryFailed')).toBeHidden();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('soutu-pro-v9-results'))[0].query)).toBe('captured query');
});

test('successful query history is bounded, deduplicated and restores scope without an automatic request',async({page})=>{
  await setup(page);let calls=0;
  await page.route('**/api/*-search?**',r=>{calls++;return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({enabled:true,items:[]})})});
  for(let i=0;i<13;i++){await page.locator('#investigationQuery').fill('query '+i);await page.locator('#investigationScope').selectOption(i===12?'product':'media');await page.locator('#investigationSearch').click();await expect(page.locator('#investigationStatus')).toContainText('没有返回可用结果')}
  await page.locator('#investigationSearch').click();await expect.poll(()=>calls).toBe(14);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('soutu-pro-investigation-history-v1')).length)).toBe(12);
  await page.reload({waitUntil:'domcontentloaded'});await page.locator('[data-nav="research"]').first().click();await expect(page.locator('#v9Workflow')).toHaveAttribute('data-ready','true');await expect(page.locator('#investigationScope')).toHaveValue('product');await page.locator('#investigationHistorySummary').click();await expect(page.locator('#investigationHistoryList li')).toHaveCount(12);
  await page.locator('[data-investigation-history="1"]').click();await expect(page.locator('#investigationQuery')).toHaveValue('query 11');await expect(page.locator('#investigationScope')).toHaveValue('media');expect(calls).toBe(14);
  await page.locator('#investigationClearHistory').click();await expect(page.locator('#investigationHistory')).toBeHidden();expect(await page.evaluate(()=>localStorage.getItem('soutu-pro-investigation-history-v1'))).toBeNull();await expect(page.locator('#investigationQuery')).toHaveValue('query 11');
});

test('batch evidence and watch report quota failures honestly and preserve existing stored records',async({page})=>{
  await setup(page);await importCandidates(page);
  const prior={id:'prior-evidence',url:'https://prior.example.com/source',title:'Preserved review',verificationHistory:[{id:'review-1',reviewer:'Previous reviewer',reason:'Retain this record'}]};
  await page.evaluate(prior=>{localStorage.setItem('soutu-pro-v9-evidence',JSON.stringify([prior]));window.__originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='soutu-pro-v9-evidence'||k==='soutu-pro-v9-watch')throw new DOMException('quota','QuotaExceededError');return window.__originalSetItem.call(this,k,v)}},prior);
  await page.locator('#v9SelectVisible').click();await page.locator('#v9SaveSelectedEvidence').click();await expect(page.locator('#toastStack')).toContainText('证据保存失败');await page.locator('#v9WatchSelected').click();await expect(page.locator('#toastStack')).toContainText('追踪保存失败');expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('soutu-pro-v9-evidence')))).toEqual([prior]);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('soutu-pro-v9-watch')||'[]'))).toEqual([]);
  await page.evaluate(()=>Storage.prototype.setItem=window.__originalSetItem);await page.locator('#v9SaveSelectedEvidence').click();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('soutu-pro-v9-evidence')).length)).toBe(7);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('soutu-pro-v9-evidence')).find(e=>e.id==='prior-evidence'))).toEqual(prior);
  await page.evaluate(()=>localStorage.setItem('soutu-pro-v9-evidence','{"unreadable":true}'));await page.locator('#v9SaveSelectedEvidence').click();await expect(page.locator('#toastStack')).toContainText('已有记录无法读取');expect(await page.evaluate(()=>localStorage.getItem('soutu-pro-v9-evidence'))).toBe('{"unreadable":true}');
});
