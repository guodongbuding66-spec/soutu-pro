import {test,expect} from '@playwright/test';

const fixture=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="100"><rect width="160" height="100" fill="white"/><rect x="24" y="18" width="112" height="64" rx="8" fill="#1f2937"/><circle cx="80" cy="50" r="18" fill="#60a5fa"/></svg>`);
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
  await page.route('**cdn.jsdelivr.net/npm/@techstark/opencv-js**',route=>route.abort());

  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
  await expect(page).toHaveTitle(/搜图 Pro/);
  await expect(page.locator('.engine-card')).toHaveCount(10);
  await expect(page.locator('.engine-card .engine-brand img')).toHaveCount(10);
  await expect(page.locator('.engine-card .engine-mark').first()).not.toContainText(/^G$/);

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

  await page.locator('[data-process="perspective"]').click();
  await expect(page.locator('#toastStack')).toContainText('图片预处理失败');

  await page.locator('[data-preset="product"]').click();
  await page.locator('#runSearch').click();
  await expect(page.locator('#executionModal')).toBeVisible();
  await expect(page.locator('#executionList .execution-row')).toHaveCount(4);
  await expect(page.locator('#executionList a[data-execution-link]')).toHaveCount(4);
  await expect(page.locator('#executionList .execution-engine-brand')).toHaveCount(4);
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
  expect(await page.locator('#batchList .batch-links a').count()).toBeGreaterThan(0);

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
