import {test,expect} from '@playwright/test';

const fixture=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="100"><rect width="160" height="100" fill="white"/><rect x="24" y="18" width="112" height="64" rx="8" fill="#1f2937"/><circle cx="80" cy="50" r="18" fill="#60a5fa"/></svg>`);
test.use({serviceWorkers:'block'});
test.setTimeout(90000);

const iconSvg='<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><circle cx="32" cy="32" r="26" fill="#2563eb"/></svg>';

test('core product flow, local image tools, batch, projects and V9 research',async({page,context})=>{
  const consoleErrors=[];
  page.on('console',msg=>{if(msg.type()==='error')consoleErrors.push(msg.text())});
  page.on('pageerror',err=>consoleErrors.push(String(err)));

  await page.addInitScript(()=>{
    localStorage.setItem('soutu-pro-settings-v5',JSON.stringify({tempEndpoint:'',productEndpoint:'',ttl:30,defaultPreset:'product',autoPreset:true}));
    localStorage.removeItem('soutu-pro-history-v5');
    localStorage.removeItem('soutu-pro-projects-v1');
  });
  await page.route('**/api/image-proxy?**',route=>route.fulfill({status:200,contentType:'image/svg+xml',body:iconSvg}));
  await page.route('**/api/url-status?**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({alive:true,status:200,checkedAt:Date.now()})}));
  await page.route('**cdn.jsdelivr.net/npm/@techstark/opencv-js**',route=>route.abort());

  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
  await expect(page).toHaveTitle(/搜图 Pro/);
  await expect(page.locator('.engine-card')).toHaveCount(10);
  await expect(page.locator('.engine-card .engine-brand img')).toHaveCount(10);
  await expect(page.locator('.engine-card .engine-mark').first()).not.toContainText(/^G$/);
  await page.locator('#engineHealthBtn').click();
  await expect(page.locator('#engineHealthSummary')).toContainText('正常 10');
  await expect(page.locator('.engine-health.ok')).toHaveCount(10);

  await page.locator('#fileInput').setInputFiles({name:'fixture.svg',mimeType:'image/svg+xml',buffer:fixture});
  await expect(page.locator('#workbench')).toBeVisible();
  await expect(page.locator('#dims')).toContainText('160 × 100');
  await expect(page.locator('#sourceKind')).toContainText('本地文件');

  await page.locator('#rotateBtn').click();
  await expect(page.locator('#sourceToggle')).toBeVisible();
  await page.locator('#flipBtn').click();
  for(const kind of ['autocrop','contrast','sharpen','edge','upscale']){
    await page.locator(`[data-process="${kind}"]`).click();
    await expect(page.locator(`[data-process="${kind}"]`)).not.toHaveClass(/busy/);
  }

  await page.locator('#cropBtn').click();
  const stage=await page.locator('#imageStage').boundingBox();
  expect(stage).toBeTruthy();
  await page.mouse.move(stage.x+stage.width*.18,stage.y+stage.height*.18);
  await page.mouse.down();
  await page.mouse.move(stage.x+stage.width*.82,stage.y+stage.height*.82);
  await page.mouse.up();
  await expect(page.locator('#applyCrop')).toBeEnabled();
  await page.locator('#applyCrop').click();
  await expect(page.locator('#cropActions')).toBeHidden();

  const perspective=page.locator('[data-process="perspective"]');
  await perspective.click();
  await expect(perspective).not.toHaveClass(/busy/,{timeout:30000});
  await expect(page.locator('#toastStack')).toContainText(/已自动矫正透视|图片预处理失败/);

  await page.locator('[data-preset="product"]').click();
  await page.locator('#runSearch').click();
  await expect(page.locator('#executionModal')).toBeVisible();
  await expect(page.locator('#executionList .execution-row')).toHaveCount(4);
  await expect(page.locator('#executionList [data-execution-open]')).toHaveCount(4);
  await expect(page.locator('#executionList .execution-engine-brand')).toHaveCount(4);
  await expect(page.locator('[data-execution-id="bing"] small')).toContainText('点击时重新校验图片链接');
  await expect(page.locator('[data-execution-id="bing"] [data-copy-execution]')).toHaveCount(0);
  await expect(page.locator('[data-execution-id="google"] [data-copy-execution]')).toHaveCount(0);
  await expect(page.locator('[data-execution-id="yandex"] [data-copy-execution]')).toHaveCount(0);
  await page.locator('[data-close="executionModal"]').click();

  await page.locator('[data-nav="history"]').first().click();
  await expect(page.locator('#historyContent .history-card')).toHaveCount(1);

  await page.locator('[data-nav="search"]').first().click();
  await page.evaluate(()=>document.querySelector('#researchPanel')?.classList.remove('hidden'));
  page.once('dialog',d=>d.accept('QA Project'));
  await page.locator('#saveProjectBtn').click();
  await page.locator('[data-nav="projects"]').first().click();
  await expect(page.locator('#projectsContent')).toContainText('QA Project');

  await page.locator('[data-nav="search"]').first().click();
  await page.locator('#customBtn').click();
  await page.locator('#customName').fill('QA Engine');
  await page.locator('#customTemplate').fill('https://example.com/search?image={imageUrl}');
  await page.locator('#addCustom').click();
  await expect(page.locator('#engineGroups')).toContainText('QA Engine');

  await page.locator('[data-nav="batch"]').first().click();
  await page.locator('#batchInput').setInputFiles([
    {name:'a.svg',mimeType:'image/svg+xml',buffer:fixture},
    {name:'b.svg',mimeType:'image/svg+xml',buffer:fixture}
  ]);
  await expect(page.locator('#batchList .batch-row')).toHaveCount(2);
  await page.locator('#runBatch').click();
  await expect(page.locator('#batchList .batch-links')).toHaveCount(2);
  expect(await page.locator('#batchList .batch-links [data-open-batch-engine]').count()).toBeGreaterThan(0);

  await page.locator('[data-nav="research"]').first().click();
  await expect(page.locator('#v9Root')).not.toBeEmpty();
  await expect(page.locator('#researchHubView')).toBeVisible();

  await page.locator('#themeBtn').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await page.keyboard.press(process.platform==='darwin'?'Meta+K':'Control+K');
  await expect(page.locator('#commandModal')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#commandModal')).toBeHidden();

  await page.setViewportSize({width:390,height:844});
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  const relevant=consoleErrors.filter(x=>!x.includes('favicon')&&!x.includes('Failed to load resource'));
  expect(relevant).toEqual([]);
});


test('execution targets refresh expired temporary image URLs before reopening',async({page,context})=>{
  await context.grantPermissions(['clipboard-read','clipboard-write'],{origin:'http://127.0.0.1:4173'});
  await page.addInitScript(()=>{
    window.SOUTU_CONFIG={tempUploadEndpoint:'http://127.0.0.1:4173',tempUploadProvider:'vercel',productSearchEndpoint:'',tempUploadTtlMinutes:30};
    localStorage.setItem('soutu-pro-settings-v5',JSON.stringify({tempEndpoint:'http://127.0.0.1:4173',productEndpoint:'',ttl:30,defaultPreset:'product',autoPreset:true}));
  });
  let tokenCount=0;
  await page.route('**/api/temp-token**',route=>{
    tokenCount++;
    route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({uploadUrl:`http://127.0.0.1:4173/mock-upload/${tokenCount}`,url:`https://cdn.example.com/image-${tokenCount}.png`,expiresAt:Date.now()+6000})});
  });
  await page.route('**/mock-upload/**',route=>route.fulfill({status:200,body:''}));
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
  await page.locator('#fileInput').setInputFiles({name:'refresh.svg',mimeType:'image/svg+xml',buffer:fixture});
  await page.locator('[data-preset="product"]').click();
  await page.locator('#runSearch').click();
  await expect(page.locator('#executionModal')).toBeVisible();
  expect(tokenCount).toBe(0);

  await page.evaluate(()=>{window.__opened=[];window.open=(url)=>{const fake={closed:false,location:{replace:v=>window.__opened.push(v)},close(){this.closed=true}};if(url&&url!=='about:blank')window.__opened.push(url);return fake}});
  const googleRow=page.locator('[data-execution-id="google"]');
  await googleRow.locator('[data-execution-open]').click();
  await expect(googleRow.locator('.status-pill')).toContainText('已打开');
  expect(tokenCount).toBe(1);

  await page.waitForTimeout(1200);
  await googleRow.locator('[data-execution-open]').click();
  await expect(googleRow.locator('.status-pill')).toContainText('已打开');
  expect(tokenCount).toBe(2);
  const opened=await page.evaluate(()=>window.__opened||[]);
  expect(opened.filter(x=>String(x).includes('lens.google.com/uploadbyurl')).length).toBeGreaterThanOrEqual(2);
});

test('remote image can be rehosted for stronger direct search and restored',async({page})=>{
  await page.addInitScript(()=>{
    window.SOUTU_CONFIG={tempUploadEndpoint:'http://127.0.0.1:4173',tempUploadProvider:'vercel',productSearchEndpoint:'',tempUploadTtlMinutes:30};
    localStorage.setItem('soutu-pro-settings-v5',JSON.stringify({tempEndpoint:'http://127.0.0.1:4173',productEndpoint:'',ttl:30,defaultPreset:'product',autoPreset:true}));
  });
  let tokenCount=0,uploadCount=0;
  await page.route('https://remote.example.com/product.svg',route=>route.fulfill({status:200,contentType:'image/svg+xml',body:fixture}));
  await page.route('**/api/temp-token**',route=>{
    tokenCount++;
    route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({uploadUrl:'http://127.0.0.1:4173/rehost-upload',url:'https://blob.example.com/rehosted.png',deleteUrl:'http://127.0.0.1:4173/rehost-delete',expiresAt:Date.now()+600000})});
  });
  await page.route('**/rehost-upload',route=>{uploadCount++;route.fulfill({status:200,body:''})});
  await page.route('**/rehost-delete',route=>route.fulfill({status:200,body:''}));
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
  await page.locator('#urlInput').fill('https://remote.example.com/product.svg');
  await page.locator('#urlForm button').click();
  await expect(page.locator('#sourceKind')).toContainText('图片链接');
  await expect(page.locator('#tempLinkBtn')).toContainText('增强直连');

  await page.locator('#tempLinkBtn').click();
  await expect(page.locator('#tempLinkBtn')).toContainText('使用原链接');
  await expect(page.locator('#tempLinkStatus')).toContainText('增强直连');
  expect(tokenCount).toBe(1);
  expect(uploadCount).toBe(1);

  await page.locator('#tempLinkBtn').click();
  await expect(page.locator('#tempLinkBtn')).toContainText('增强直连');
  await expect(page.locator('#tempLinkStatus')).toContainText('原图可直连');
});

test('V9 investigation workspace: import, dedupe, compare, watch, evidence, cases and exports',async({page,context})=>{
  const payload={
    source:'qa-collector',
    capturedAt:Date.now(),
    results:[
      {title:'BrandX Garden Shed A',url:'https://shop.example.com/a?utm_source=qa',image:'https://img.example.com/a.jpg',price:'$199',product:{brand:'BrandX',sku:'A-100',model:'GS-01'}},
      {title:'BrandX Garden Shed A duplicate',url:'https://shop.example.com/a',image:'https://img.example.com/b.jpg',price:'$199',product:{brand:'BrandX',sku:'A-100',model:'GS-01'}},
      {title:'BrandX Supplier',url:'https://www.alibaba.com/product-detail/demo',image:'https://img.example.com/c.jpg',price:'$99',product:{brand:'BrandX',sku:'SUP-1'}}
    ]
  };
  await context.grantPermissions(['clipboard-read','clipboard-write'],{origin:'http://127.0.0.1:4173'});
  await page.addInitScript(()=>{
    localStorage.setItem('soutu-pro-settings-v5',JSON.stringify({tempEndpoint:'',productEndpoint:'',ttl:30,defaultPreset:'product',autoPreset:true}));
    for(const k of Object.keys(localStorage))if(k.startsWith('soutu-pro-v9-'))localStorage.removeItem(k);
  });
  await page.route('**/api/image-proxy?**',route=>{
    const u=new URL(route.request().url());
    const target=u.searchParams.get('url')||'';
    const isSupplier=target.includes('/c.jpg');
    const body=isSupplier
      ? '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" fill="white"/><path d="M10 82L48 10L86 82Z" fill="#111827"/><rect x="38" y="42" width="20" height="40" fill="#60a5fa"/></svg>'
      : '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" fill="white"/><circle cx="48" cy="48" r="30" fill="#111827"/><circle cx="48" cy="48" r="12" fill="#60a5fa"/></svg>';
    return route.fulfill({status:200,contentType:'image/svg+xml',body});
  });
  await page.route('**/api/url-status?**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({alive:true,status:200,title:'BrandX live product',price:'$149',product:{brand:'BrandX',sku:'A-100'}})}));
  await page.route('**/api/supplier-search?**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({enabled:false,message:'SERPAPI_KEY is not configured'})}));
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
  await page.locator('#fileInput').setInputFiles({name:'source.svg',mimeType:'image/svg+xml',buffer:fixture});
  await page.locator('[data-nav="research"]').first().click();
  await page.locator('#v9Import').setInputFiles({name:'results.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(payload))});
  await expect(page.locator('.v9-result-card')).toHaveCount(3);

  await page.locator('#v9Filter').fill('Supplier');
  await expect(page.locator('.v9-result-card')).toHaveCount(1);
  await page.locator('#v9Filter').fill('');
  await expect(page.locator('.v9-result-card')).toHaveCount(3);

  await page.locator('#v9Dedupe').click();
  await expect(page.locator('#v9Dedupe')).toContainText('显示重复项',{timeout:15000});
  await expect(page.locator('.v9-result-card')).toHaveCount(2);
  await page.locator('#v9Dedupe').click();
  await expect(page.locator('.v9-result-card')).toHaveCount(3);

  await page.locator('[data-result-select]').nth(0).check();
  await page.locator('[data-result-select]').nth(1).check();
  await page.locator('#v9Compare').click();
  await expect(page.locator('#v9CompareModal')).toBeVisible();
  await expect(page.locator('#v9CompareBody')).toContainText('BrandX');
  await page.locator('#v9CompareClose').click();
  await expect(page.locator('#v9CompareModal')).toBeHidden();

  await page.locator('.v9-result-card').first().locator('[data-label="same"]').click();
  await expect(page.locator('.v9-result-card').first().locator('[data-label="same"]')).toHaveClass(/active/);

  await page.locator('.v9-result-card').first().locator('[data-action="watch"]').click();
  await page.locator('[data-v9-mode="watch"]').click();
  await expect(page.locator('.v9-watch-list article')).toHaveCount(1);
  await page.locator('[data-watch-refresh]').click();
  await expect(page.locator('.v9-watch-list')).toContainText('$149');

  await page.locator('[data-v9-mode="results"]').click();
  await page.locator('.v9-result-card').first().locator('[data-action="evidence"]').click();
  await page.locator('[data-v9-mode="evidence"]').click();
  await expect(page.locator('.v9-evidence-list article')).toHaveCount(1);

  await page.locator('[data-v9-mode="domains"]').click();
  expect(await page.locator('.v9-domain-grid article').count()).toBeGreaterThan(0);
  await page.locator('[data-v9-mode="timeline"]').click();
  await expect(page.locator('.v9-timeline article')).toHaveCount(3);
  await page.locator('[data-v9-mode="graph"]').click();
  await expect(page.locator('.v9-graph-wrap svg')).toBeVisible();

  await page.locator('#v9Industrial').click();
  await expect(page.locator('#v9Weights')).toContainText('结构 67%');
  await page.locator('#v9Translate').click();
  await expect(page.locator('#toastStack')).toContainText('没有 OCR 文字');

  page.once('dialog',d=>d.accept('V9 QA Case'));
  await page.locator('#v9SaveCase').click();
  await page.locator('[data-v9-mode="cases"]').click();
  await expect(page.locator('.v9-case-grid')).toContainText('V9 QA Case');

  const [jsonDownload]=await Promise.all([page.waitForEvent('download'),page.locator('#v9ExportJson').click()]);
  expect(jsonDownload.suggestedFilename()).toMatch(/soutu-pro-v9-.*\.json/);

  await page.evaluate(()=>{
    window.__xlsxWritten=false;
    window.XLSX={utils:{book_new:()=>({}),json_to_sheet:x=>x,book_append_sheet:()=>{}},writeFile:()=>{window.__xlsxWritten=true}};
  });
  await page.locator('#v9ExportXlsx').click();
  await expect.poll(()=>page.evaluate(()=>window.__xlsxWritten)).toBe(true);

  await page.evaluate(()=>{window.__printed=false;window.print=()=>{window.__printed=true}});
  await page.locator('#v9Print').click();
  await expect.poll(()=>page.evaluate(()=>window.__printed)).toBe(true);

  await page.locator('#v9CopyTrade').click();
  await expect.poll(async()=>{try{return (await page.evaluate(()=>navigator.clipboard.readText())).includes('"source": "soutu-pro"')}catch{return false}}).toBe(true);

  await page.locator('#v9Slices').click();
  await expect(page.locator('#batchView')).toBeVisible();
  expect(await page.locator('#batchList .batch-row').count()).toBeGreaterThanOrEqual(5);
});

test('browser extension collector extracts product JSON-LD and image results',async({page})=>{
  await page.route('https://images.example/**',route=>route.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160"><rect width="240" height="160" fill="#ddd"/></svg>'}));
  await page.setContent(`<!doctype html><title>BrandX Product Page</title>
    <script type="application/ld+json">{"@context":"https://schema.org","@type":"Product","name":"BrandX Shed","brand":{"@type":"Brand","name":"BrandX"},"sku":"BX-100","mpn":"MPN-1","image":"https://images.example/product.jpg","offers":{"@type":"Offer","price":"299.00","priceCurrency":"USD"}}</script>
    <article><a href="https://shop.example/product"><img src="https://images.example/result.jpg" alt="BrandX Shed"></a><p>BrandX Shed $299.00 2026-09-29</p></article>`);
  await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>=120));
  await page.addScriptTag({path:'extension/collector.js'});
  const product=await page.evaluate(()=>soutuCollectPage('product'));
  expect(product.kind).toBe('product');
  expect(product.results).toHaveLength(1);
  expect(product.results[0].product.brand).toBe('BrandX');
  expect(product.results[0].product.sku).toBe('BX-100');
  expect(String(product.results[0].product.price)).toBe('299.00');

  const images=await page.evaluate(()=>soutuCollectPage('images'));
  expect(images.kind).toBe('page-images');
  expect(images.results.length).toBeGreaterThan(0);
  expect(images.results[0].width).toBeGreaterThanOrEqual(120);

  const results=await page.evaluate(()=>soutuCollectPage('results'));
  expect(results.kind).toBe('collector');
  expect(results.results.length).toBeGreaterThan(0);
  expect(results.results[0].url).toContain('shop.example');
});


test('V9 universal search: modes, filters, waterfall, favorites and history restore',async({page})=>{
  await page.addInitScript(()=>{
    localStorage.setItem('soutu-pro-settings-v5',JSON.stringify({tempEndpoint:'',productEndpoint:'',ttl:30,defaultPreset:'product',autoPreset:true}));
    localStorage.removeItem('soutu-pro-history-v5');
    localStorage.removeItem('soutu-pro-universal-favorites-v1');
  });
  await page.route('**/api/image-proxy?**',route=>route.fulfill({status:200,contentType:'image/svg+xml',body:iconSvg}));
  await page.route('**/api/media-search?**',route=>{
    const url=new URL(route.request().url());
    const body={
      enabled:true,query:url.searchParams.get('q')||'garden shed',
      filters:{country:url.searchParams.get('country')||'all',language:url.searchParams.get('language')||'all',type:url.searchParams.get('type')||'all',time:url.searchParams.get('time')||'all'},
      providers:[{name:'Openverse',enabled:true,configured:true,count:2}],
      items:[
        {provider:'Openverse',type:'image',title:'Garden Shed Original',snippet:'CC image source',link:'https://example.com/original',thumbnail:'https://example.com/original.jpg',author:'QA Author',meta:{width:1600,height:1200,license:'cc0'}},
        {provider:'Openverse',type:'video',title:'Garden Shed Video',snippet:'Video result',link:'https://example.com/video',thumbnail:'https://example.com/video.jpg',author:'QA Video',meta:{duration:42}}
      ],
      total:2
    };
    route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  });
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
  await page.locator('#fileInput').setInputFiles({name:'universal.svg',mimeType:'image/svg+xml',buffer:fixture});
  await page.evaluate(()=>document.querySelector('#researchPanel')?.classList.remove('hidden'));
  await page.evaluate(()=>{window.scrollTo(0,document.body.scrollHeight)});

  await page.locator('#addQueryBtn').click();
  const queryInputs=page.locator('[data-query-index]');
  await queryInputs.last().fill('garden shed');
  await expect(page.locator('#universalModes')).toBeVisible();

  await page.locator('[data-universal-mode="source"]').click();
  await expect(page.locator('[data-universal-mode="source"]')).toHaveClass(/active/);
  await page.locator('#expandKeywordsBtn').click();
  await expect(page.locator('#keywordExpansion .keyword-chip').first()).toBeVisible();

  await page.locator('#universalCountry').selectOption('US');
  await page.locator('#universalLanguage').selectOption('en');
  await page.locator('#universalType').selectOption('image');
  await page.locator('#universalTime').selectOption('year');

  await page.locator('#universalSearchBtn').click();
  await expect(page.locator('.universal-result-card')).toHaveCount(1);
  await page.locator('#universalType').selectOption('all');
  await expect(page.locator('.universal-result-card')).toHaveCount(2);
  await page.locator('#universalType').selectOption('image');
  await expect(page.locator('.universal-result-card')).toHaveCount(1);
  await expect(page.locator('#universalMeta')).toContainText('1 条结果');
  await expect(page.locator('.universal-result-card')).toContainText('Garden Shed Original');
  await expect(page.locator('.universal-evidence-badges')).toContainText('1600×1200');
  await expect(page.locator('.universal-evidence-badges')).toContainText('CC0');
  await expect(page.locator('.universal-confidence')).toContainText('%');

  await page.locator('#universalType').selectOption('all');
  await page.locator('#universalResolution').selectOption('1');
  await expect(page.locator('.universal-result-card')).toHaveCount(1);
  await page.locator('#universalLicense').selectOption('public-domain');
  await expect(page.locator('.universal-result-card')).toHaveCount(1);
  await page.locator('#universalResolution').selectOption('all');
  await page.locator('#universalLicense').selectOption('all');
  await expect(page.locator('.universal-result-card')).toHaveCount(2);
  await page.locator('#universalType').selectOption('image');
  await expect(page.locator('.universal-result-card')).toHaveCount(1);

  await page.locator('[data-favorite-result]').click();
  await expect(page.locator('[data-favorite-result]')).toContainText('已收藏');

  await expect(page.locator('#universalResearchbar')).toBeVisible();
  await page.locator('#universalSelectAllBtn').click();
  await expect(page.locator('#universalResearchStats')).toContainText('已选');
  await page.locator('#universalTimelineBtn').click();
  await expect(page.locator('#universalInsights')).toBeVisible();
  await page.locator('#universalTimelineBtn').click();
  await page.locator('#universalResearchBtn').click();
  await expect(page.locator('#researchHubView')).toBeVisible();
  await expect(page.locator('#v9Root .v9-result-card')).toHaveCount(1);
  await page.locator('[data-nav="search"]').first().click();

  await page.locator('[data-nav="projects"]').first().click();
  await expect(page.locator('.favorite-result-card')).toHaveCount(1);
  await expect(page.locator('#projectsContent')).toContainText('Garden Shed Original');

  await page.locator('[data-nav="history"]').first().click();
  await expect(page.locator('#historyContent .history-card')).toHaveCount(1);
  await expect(page.locator('#historyContent')).toContainText('全网搜索');
  await page.locator('[data-rerun-history]').click();
  await expect(page.locator('[data-universal-mode="source"]')).toHaveClass(/active/);

  await page.setViewportSize({width:390,height:844});
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
