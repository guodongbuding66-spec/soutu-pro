import {test,expect} from '@playwright/test';
test.use({serviceWorkers:'block'});
test.setTimeout(60000);
const base='http://127.0.0.1:4173';
const image=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="80"><rect width="100" height="80" fill="red"/></svg>');
async function setup(page,context,{fallback=false}={}){
  await context.addInitScript(({base,fallback})=>{
    window.SOUTU_CONFIG={tempUploadEndpoint:base,tempUploadProvider:'vercel',productSearchEndpoint:'',tempUploadTtlMinutes:30};
    localStorage.setItem('soutu-pro-settings-v5',JSON.stringify({tempEndpoint:base,productEndpoint:'',ttl:30,defaultPreset:'product',autoPreset:true}));
    window.__popupCalls=0;window.open=()=>{window.__popupCalls++;return null};
    if(fallback)window.BroadcastChannel=undefined;
  },{base,fallback});
  await context.route('https://lens.google.com/**',route=>route.fulfill({status:200,contentType:'text/html',body:'<h1>Lens destination</h1>'}));
  await context.route('https://www.bing.com/**',route=>route.fulfill({status:200,contentType:'text/html',body:'<h1>Bing destination</h1>'}));
  await page.route('**/api/image-proxy?**',route=>route.fulfill({status:200,contentType:'image/svg+xml',body:image}));
  await page.goto(base+'/',{waitUntil:'domcontentloaded'});
}
async function prepare(page){
  await page.locator('#fileInput').setInputFiles({name:'native.svg',mimeType:'image/svg+xml',buffer:image});
  await page.locator('[data-preset="product"]').click();await page.locator('#runSearch').click();
  await expect(page.locator('#executionModal')).toBeVisible();
}
async function clickPopup(page,link){const pending=page.waitForEvent('popup');await link.click();return pending}
function tokens(page,{failFirst=false}={}){
  let count=0;
  const install=page.route('**/api/temp-token**',async route=>{
    count++;
    if(failFirst&&count===1)return route.fulfill({status:503,contentType:'application/json',body:'{"error":"临时服务测试故障"}'});
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({uploadUrl:base+'/mock-upload/'+count,url:'https://cdn.example.com/native-'+count+'.png',expiresAt:Date.now()+600000})});
  });
  return{install,count:()=>count};
}
test('slow upload stays in the new preparation tab then redirects without a script popup',async({page,context})=>{
  await setup(page,context);const token=tokens(page);await token.install;
  let releaseUpload;const gate=new Promise(resolve=>releaseUpload=resolve);
  await page.route('**/mock-upload/**',async route=>{await gate;await route.fulfill({status:200,body:''})});
  await prepare(page);expect(token.count()).toBe(0);
  const popup=await clickPopup(page,page.locator('[data-execution-id="google"] a'));
  await expect(popup.locator('#message')).toContainText('完成后会自动');
  expect(page.url()).toBe(base+'/');expect(popup.url()).toContain('search-launch.html#');
  releaseUpload();await popup.waitForURL('https://lens.google.com/**');
  expect(popup.url()).toContain(encodeURIComponent('https://cdn.example.com/native-1.png'));
  expect(await page.evaluate(()=>window.__popupCalls)).toBe(0);
});
test('preparation failure is actionable in the new tab and retry uses a fresh upload',async({page,context})=>{
  await setup(page,context);const token=tokens(page,{failFirst:true});await token.install;
  await page.route('**/mock-upload/**',route=>route.fulfill({status:200,body:''}));await prepare(page);
  const popup=await clickPopup(page,page.locator('[data-execution-id="google"] a'));
  await expect(popup.locator('#title')).toContainText('搜索暂未打开');
  await expect(popup.locator('#message')).toContainText('临时服务测试故障');
  await expect(popup.locator('#retry')).toBeVisible();
  await popup.locator('#retry').click();await popup.waitForURL('https://lens.google.com/**');expect(token.count()).toBe(2);
  expect(page.url()).toBe(base+'/');
});
test('native link also resolves through storage events when BroadcastChannel is unavailable',async({page,context})=>{
  await setup(page,context,{fallback:true});const token=tokens(page);await token.install;
  await page.route('**/mock-upload/**',route=>route.fulfill({status:200,body:''}));await prepare(page);
  const popup=await clickPopup(page,page.locator('[data-execution-id="google"] a'));await popup.waitForURL('https://lens.google.com/**');
  expect(token.count()).toBe(1);expect(await page.evaluate(()=>Object.keys(localStorage).filter(x=>x.startsWith('soutu-search-launch-')))).toEqual([]);
});
test('batch search uploads at click time and opens a real new search tab',async({page,context})=>{
  await setup(page,context);const token=tokens(page);await token.install;
  await page.route('**/mock-upload/**',route=>route.fulfill({status:200,body:''}));
  await page.locator('[data-nav="batch"]').first().click();
  await page.locator('#batchInput').setInputFiles({name:'batch.svg',mimeType:'image/svg+xml',buffer:image});
  await expect(page.locator('.batch-row')).toHaveCount(1);await page.locator('#runBatch').click();expect(token.count()).toBe(0);
  const link=page.locator('[data-open-batch-engine="google"]');await expect(link).toHaveAttribute('href',/search-launch.html#/);
  const popup=await clickPopup(page,link);await popup.waitForURL('https://lens.google.com/**');expect(token.count()).toBe(1);
  const next=await clickPopup(page,link);await next.waitForURL('https://lens.google.com/**');expect(token.count()).toBe(2);
  expect(next.url()).toContain(encodeURIComponent('https://cdn.example.com/native-2.png'));
  expect(page.url()).toBe(base+'/');
});
test('opening the rendered link in a new tab without its click handler resolves the image',async({page,context})=>{
  await setup(page,context);const token=tokens(page);await token.install;
  await page.route('**/mock-upload/**',route=>route.fulfill({status:200,body:''}));await prepare(page);
  const href=await page.locator('[data-execution-id="google"] a').getAttribute('href');
  const tab=await context.newPage();await tab.goto(href);await tab.waitForURL('https://lens.google.com/**');expect(token.count()).toBe(1);
});
test('changing the image during upload rejects the stale search instead of sending another image',async({page,context})=>{
  await setup(page,context);const token=tokens(page);await token.install;
  let releaseUpload;const gate=new Promise(resolve=>releaseUpload=resolve);
  await page.route('**/mock-upload/**',async route=>{await gate;await route.fulfill({status:200,body:''})});await prepare(page);
  const popup=await clickPopup(page,page.locator('[data-execution-id="google"] a'));
  await expect(popup.locator('#message')).toContainText('完成后会自动');
  await expect.poll(token.count).toBe(1);
  await page.locator('[data-close="executionModal"]').click();
  await page.locator('#fileInput').setInputFiles({name:'changed.svg',mimeType:'image/svg+xml',buffer:Buffer.from(image.toString().replace('red','blue'))});
  await expect(page.locator('#fileName')).toContainText('changed.svg');
  releaseUpload();await expect(popup.locator('#message')).toContainText('图片已更换');expect(popup.url()).toContain('search-launch.html');
});
test('two concurrent search tabs share one valid upload and reach their own engines',async({page,context})=>{
  await setup(page,context);const token=tokens(page);await token.install;
  await page.route('**/mock-upload/**',route=>route.fulfill({status:200,body:''}));await prepare(page);
  const google=await context.newPage(),bing=await context.newPage();
  const g=await page.locator('[data-execution-id="google"] a').getAttribute('href'),b=await page.locator('[data-execution-id="bing"] a').getAttribute('href');
  await Promise.all([google.goto(g),bing.goto(b)]);await Promise.all([google.waitForURL('https://lens.google.com/**'),bing.waitForURL('https://www.bing.com/**')]);
  expect(token.count()).toBe(1);
});

test.describe('preparation page cache isolation',()=>{
  test.use({serviceWorkers:'allow'});
  test('opening a preparation page does not replace the offline workbench shell',async({page,context})=>{
    await page.goto(base+'/',{waitUntil:'domcontentloaded'});
    await expect.poll(async()=>{
      try{return await page.evaluate(()=>Boolean(navigator.serviceWorker.controller&&window.SOUTU_BRIDGE))}
      catch(error){if(/Execution context was destroyed|Cannot find context with specified id/.test(String(error)))return false;throw error}
    },{timeout:15000}).toBe(true);
    await page.waitForLoadState('networkidle');
    const preparation=await context.newPage();await preparation.goto(base+'/search-launch.html');
    await expect(preparation.locator('#message')).toContainText('搜索任务无效');
    // Wait for the navigation response to be cached before verifying offline behavior.
    await expect.poll(()=>page.evaluate(async()=>{const names=await caches.keys();const cache=await caches.open(names.find(x=>x.includes('-shell')));const response=await cache.match('/search-launch.html');return response?.text()})).toContain('正在准备搜索');
    await context.setOffline(true);await page.reload({waitUntil:'domcontentloaded'});
    await expect(page.locator('#uploader')).toBeVisible();await expect(page).toHaveTitle(/搜图 Pro ·/);
    await preparation.reload({waitUntil:'domcontentloaded'});await expect(preparation.locator('#message')).toContainText('搜索任务无效');
    await context.setOffline(false);
  });
});
