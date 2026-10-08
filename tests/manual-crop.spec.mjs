import {test,expect} from '@playwright/test';
import {coordinateFixture,imageBounds,drawSelection,expectOverlay,expectRegion} from './crop-helpers.mjs';

test.use({serviceWorkers:'block',reducedMotion:'reduce',viewport:{width:1440,height:1000}});
test.setTimeout(45000);
async function setup(page,width,height){
  await page.route('**/api/image-proxy?**',route=>route.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"/>'}));
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
  const buffer=await coordinateFixture(page,width,height);
  await page.locator('#fileInput').setInputFiles({name:'coordinate-fixture.png',mimeType:'image/png',buffer});
  await expect(page.locator('#dims')).toHaveText(`${width} × ${height}`);
  await page.locator('#cropBtn').click();await page.locator('#imageStage').scrollIntoViewIfNeeded();
}

test('the screenshot-sized image crops exactly the selected pixels despite black side margins',async({page})=>{
  await setup(page,1448,1086);
  const region={x:480,y:210,w:968,h:786};
  await drawSelection(page,region);await expectOverlay(page,region);
  await expect(page.locator('#cropHint')).toContainText('968 × 786');
  await page.locator('#applyCrop').click();await expectRegion(page,region);
});

test('portrait margins cannot start a selection or erase a valid selection',async({page})=>{
  await setup(page,300,900);
  const stage=await page.locator('#imageStage').boundingBox(),img=await imageBounds(page);
  expect(img.x-stage.x).toBeGreaterThan(100);
  const dragMargin=async()=>{await page.mouse.move(stage.x+10,img.y+20);await page.mouse.down();await page.mouse.move(img.x+img.width*.8,img.y+img.height*.8);await page.mouse.up()};
  await dragMargin();await expect(page.locator('#applyCrop')).toBeDisabled();await expect(page.locator('#cropBox')).toBeHidden();
  const region={x:50,y:100,w:190,h:650};await drawSelection(page,region);await dragMargin();
  await expectOverlay(page,region);await page.locator('#applyCrop').click();await expectRegion(page,region);
});

test('a wide image excludes top and bottom margins when drawing backwards',async({page})=>{
  await setup(page,1400,300);
  const stage=await page.locator('#imageStage').boundingBox(),img=await imageBounds(page);
  expect(img.y-stage.y).toBeGreaterThan(100);
  await page.mouse.move(img.x+10,stage.y+10);await page.mouse.down();await page.mouse.move(img.x+img.width*.8,img.y+img.height*.8);await page.mouse.up();
  await expect(page.locator('#applyCrop')).toBeDisabled();
  const region={x:110,y:50,w:1090,h:200};await drawSelection(page,region,{reverse:true});await expectOverlay(page,region);
  await page.locator('#applyCrop').click();await expectRegion(page,region);
});

test('dragging beyond the image clamps to its edges without transparent output padding',async({page})=>{
  await setup(page,900,600);const img=await imageBounds(page),stage=await page.locator('#imageStage').boundingBox();
  await page.mouse.move(img.x+img.width*.7,img.y+img.height*.25);await page.mouse.down();
  await page.mouse.move(stage.x+stage.width+30,stage.y+stage.height+25,{steps:4});await page.mouse.up();
  const region={x:630,y:150,w:270,h:450};await expectOverlay(page,region);
  await page.locator('#applyCrop').click();await expectRegion(page,region);
});

test('resizing from desktop to mobile preserves the selected image pixels',async({page})=>{
  await setup(page,800,600);const region={x:140,y:90,w:510,h:380};
  await drawSelection(page,region);await expectOverlay(page,region);
  await page.setViewportSize({width:390,height:844});await page.locator('#imageStage').scrollIntoViewIfNeeded();
  await expectOverlay(page,region);await expect(page.locator('#cropHint')).toContainText('510 × 380');
  await page.locator('#applyCrop').click();await expectRegion(page,region);
});

test('consecutive crops use processed dimensions and switching images clears an old selection',async({page})=>{
  await setup(page,800,600);await drawSelection(page,{x:100,y:80,w:600,h:400});await page.locator('#applyCrop').click();
  await expectRegion(page,{x:100,y:80,w:600,h:400});
  await page.locator('#cropBtn').click();await drawSelection(page,{x:150,y:75,w:300,h:200});await page.locator('#applyCrop').click();
  await expectRegion(page,{x:250,y:155,w:300,h:200});
  await page.locator('#cropBtn').click();await drawSelection(page,{x:30,y:20,w:200,h:100});await expect(page.locator('#applyCrop')).toBeEnabled();
  await page.locator('[data-use="original"]').click();await expect(page.locator('#dims')).toHaveText('800 × 600');
  await expect(page.locator('#applyCrop')).toBeDisabled();await expect(page.locator('#cropBox')).toBeHidden();
  await drawSelection(page,{x:620,y:410,w:120,h:150});await page.locator('#applyCrop').click();await expectRegion(page,{x:620,y:410,w:120,h:150});
});

for(const fullElement of [false,true])test(`small images crop correctly with ${fullElement?'object-fit space inside the image element':'unscaled space around the image element'}`,async({page})=>{
  await setup(page,160,100);
  if(fullElement)await page.locator('#previewImg').evaluate(img=>{img.style.width='100%';img.style.height='100%'});
  const region={x:17,y:19,w:53,h:40};await drawSelection(page,region);await expectOverlay(page,region);
  await page.locator('#applyCrop').click();await expectRegion(page,region);
});

test('rotated and flipped images crop the matching transformed pixels',async({page})=>{
  await setup(page,800,600);await page.locator('#rotateBtn').click();await expect(page.locator('#dims')).toHaveText('600 × 800');
  await page.locator('#flipBtn').click();await expect(page.locator('#imageProcessStatus')).toContainText('已水平翻转');
  await page.locator('#cropBtn').click();const region={x:30,y:80,w:200,h:300};await drawSelection(page,region);await expectOverlay(page,region);
  await page.locator('#applyCrop').click();await expectRegion(page,{...region,transpose:true});
});

test('a one-pixel selection does not expand the frame to its border thickness',async({page})=>{
  await setup(page,160,100);const region={x:80,y:50,w:1,h:1};
  await drawSelection(page,region);await expectOverlay(page,region);await expect(page.locator('#cropHint')).toContainText('1 × 1');
  await page.locator('#applyCrop').click();await expectRegion(page,region);
});

test('detected object boxes use the same image coordinate system as manual crop',async({page})=>{
  await setup(page,800,600);
  const region={x:120,y:100,w:400,h:300};
  await page.evaluate(region=>{
    window.Tesseract={recognize:async()=>({data:{text:''}})};window.tf={};
    window.mobilenet={load:async()=>({classify:async()=>[]})};
    window.cocoSsd={load:async()=>({detect:async()=>[{class:'fixture object',score:.95,bbox:[region.x,region.y,region.w,region.h]}]})};
  },region);
  await page.locator('#analyzeBtn').click();await page.locator('#objectsOutput [data-object-index="0"]').click();
  await expectOverlay(page,region);await page.locator('#applyCrop').click();await expectRegion(page,region);
});

test('replacing an image during a delayed manual crop cancels the old selection',async({page})=>{
  await setup(page,800,600);const buffer=await coordinateFixture(page,800,600);
  const remote='https://crop.example.com/manual.png';
  const response={status:200,contentType:'image/png',headers:{'access-control-allow-origin':'*','cache-control':'no-store'},body:buffer};
  await page.locator('#removeBtn').click();await page.route(remote,route=>route.fulfill(response));
  await page.locator('#urlInput').fill(remote);await page.locator('#urlForm button').click();await expect(page.locator('#sourceKind')).toContainText('图片链接');
  await page.locator('#cropBtn').click();await drawSelection(page,{x:100,y:80,w:600,h:400});
  let release;const gate=new Promise(resolve=>release=resolve);
  await page.route(remote,async route=>{await gate;await route.fulfill(response)});
  await page.locator('#applyCrop').click();await expect(page.locator('#applyCrop')).toBeDisabled();await expect(page.locator('#imageProcessStatus')).toContainText('正在应用');
  const replacement=await coordinateFixture(page,600,400);
  await page.locator('#fileInput').setInputFiles({name:'replacement.png',mimeType:'image/png',buffer:replacement});await expect(page.locator('#dims')).toHaveText('600 × 400');release();
  await expect(page.locator('#rotateBtn')).toBeEnabled();await expectRegion(page,{x:0,y:0,w:600,h:400});
  await expect(page.locator('#sourceToggle')).toBeHidden();await expect(page.locator('#cropActions')).toBeHidden();await expect(page.locator('#imageProcessStatus')).toBeHidden();
});

test('failed manual image loading restores the selection and its processing controls',async({page})=>{
  await setup(page,800,600);const buffer=await coordinateFixture(page,800,600),remote='https://crop.example.com/manual-failure.png';
  await page.locator('#removeBtn').click();await page.route(remote,route=>route.fulfill({status:200,contentType:'image/png',headers:{'access-control-allow-origin':'*'},body:buffer}));
  await page.locator('#urlInput').fill(remote);await page.locator('#urlForm button').click();await expect(page.locator('#sourceKind')).toContainText('图片链接');
  await page.locator('#cropBtn').click();const region={x:100,y:80,w:600,h:400};await drawSelection(page,region);
  await page.route(remote,route=>route.abort());await page.route('**/api/image-proxy?url=https%3A%2F%2Fcrop.example.com%2Fmanual-failure.png',route=>route.fulfill({status:502,body:'failed'}));
  await page.locator('#applyCrop').click();await expect(page.locator('#imageProcessStatus')).toContainText('处理失败');
  await expect(page.locator('#applyCrop')).toBeEnabled();await expect(page.locator('#rotateBtn')).toBeEnabled();await expectOverlay(page,region);await expect(page.locator('#dims')).toHaveText('800 × 600');await expect(page.locator('#sourceToggle')).toBeHidden();
});

test.describe('mobile touch selection',()=>{
  test.use({hasTouch:true,viewport:{width:390,height:844}});
  test('touch dragging selects actual portrait pixels without scrolling the page',async({page,context})=>{
    await setup(page,600,900);const region={x:80,y:120,w:400,h:660},img=await imageBounds(page);
    const session=await context.newCDPSession(page),scrollBefore=await page.evaluate(()=>scrollY);
    const start={x:img.x+region.x/600*img.width,y:img.y+region.y/900*img.height};
    const end={x:img.x+(region.x+region.w)/600*img.width,y:img.y+(region.y+region.h)/900*img.height};
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[start]});
    await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[end]});
    await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    expect(await page.evaluate(()=>scrollY)).toBe(scrollBefore);await expectOverlay(page,region);
    await page.locator('#applyCrop').click();await expectRegion(page,region);await session.detach();
  });
});
