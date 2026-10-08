import {test,expect} from '@playwright/test';
test.use({serviceWorkers:'block'});
test.setTimeout(45000);
const base='http://127.0.0.1:4173';
function fixture({fill='white',width=240,height=180,content='<rect x="70" y="50" width="100" height="80" fill="#333"/>'}={}){return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${fill?`<rect width="${width}" height="${height}" fill="${fill}"/>`:''}${content}</svg>`)}
async function setup(page){
  await page.route('**/api/image-proxy?**',route=>route.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"/>'}));
  await page.goto(base+'/',{waitUntil:'domcontentloaded'});
}
async function upload(page,buffer,name='white-border.svg'){
  await page.locator('#fileInput').setInputFiles({name,mimeType:'image/svg+xml',buffer});
  await expect(page.locator('#fileName')).toContainText(name);
}
async function pixels(page){return page.evaluate(async()=>{
  const img=document.querySelector('#previewImg');await img.decode();const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;
  let dark=0,red=0,opaque=0,white=0,nearlyWhite=0;for(let i=0;i<data.length;i+=4){if(data[i+3]===255)opaque++;if(data[i]===254&&data[i+1]===254&&data[i+2]===254&&data[i+3]===255)nearlyWhite++;if(data[i]===255&&data[i+1]===255&&data[i+2]===255&&data[i+3]===255)white++;if(data[i]===51&&data[i+1]===51&&data[i+2]===51&&data[i+3]===255)dark++;if(data[i]===255&&data[i+1]===0&&data[i+2]===0&&data[i+3]===255)red++}
  return{width:canvas.width,height:canvas.height,dark,red,opaque,white,nearlyWhite,corner:Array.from(data.slice(0,4))};
})}
async function crop(page){await page.locator('[data-process="autocrop"]').click();await expect(page.locator('[data-process="autocrop"]')).toBeEnabled();}

test('pure white borders crop actual pixels and show the processed dimensions',async({page})=>{
  await setup(page);await upload(page,fixture());await crop(page);
  await expect(page.locator('#dims')).toHaveText('104 × 84');
  expect(await pixels(page)).toMatchObject({width:104,height:84,dark:8000});
  await expect(page.locator('#imageProcessStatus')).toContainText('240 × 180 → 104 × 84');
  await expect(page.locator('[data-use="processed"]')).toHaveClass(/active/);
  await page.locator('[data-use="original"]').click();await expect(page.locator('#dims')).toHaveText('240 × 180');
  await page.locator('[data-use="processed"]').click();await expect(page.locator('#dims')).toHaveText('104 × 84');
  expect(await page.evaluate(()=>({width:window.SOUTU_BRIDGE.source().width,height:window.SOUTU_BRIDGE.source().height}))).toEqual({width:104,height:84});
});
test('light gray borders and isolated compression noise do not prevent cropping',async({page})=>{
  const noise='<rect x="0" y="0" width="1" height="1" fill="#e0e0e0"/><rect x="239" y="179" width="1" height="1" fill="#e0e0e0"/>';
  await setup(page);await upload(page,fixture({fill:'#f4f4f4',content:'<rect x="70" y="50" width="100" height="80" fill="#333"/>'+noise}));await crop(page);
  await expect(page.locator('#dims')).toHaveText('104 × 84');expect(await pixels(page)).toMatchObject({width:104,height:84,dark:8000,corner:[244,244,244,255]});
});
test('transparent margins crop without losing an opaque white product',async({page})=>{
  await setup(page);await upload(page,fixture({fill:null,content:'<rect x="70" y="50" width="100" height="80" fill="white"/>'}));await crop(page);
  await expect(page.locator('#dims')).toHaveText('104 × 84');expect(await pixels(page)).toMatchObject({width:104,height:84,opaque:8000,corner:[0,0,0,0]});
});
test('thin product details survive cropping and tiny images never create zero-sized outputs',async({page})=>{
  await setup(page);await upload(page,fixture({content:'<rect x="70" y="50" width="100" height="80" fill="#333"/><rect x="20" y="89" width="50" height="1" fill="red"/>'}));await crop(page);
  expect(await pixels(page)).toMatchObject({dark:8000,red:50});
  await upload(page,fixture({width:8,height:8,content:'<rect x="3" y="3" width="2" height="2" fill="#333"/>'}),'tiny.svg');await crop(page);
  expect(await pixels(page)).toMatchObject({width:6,height:6,dark:4});await expect(page.locator('#dims')).toHaveText('6 × 6');
});
test('a second crop and a blank image show honest no-change feedback',async({page})=>{
  await setup(page);await upload(page,fixture());await crop(page);await expect(page.locator('#dims')).toHaveText('104 × 84');
  const before=await page.locator('#previewImg').getAttribute('src');await crop(page);
  expect(await page.locator('#previewImg').getAttribute('src')).toBe(before);await expect(page.locator('#imageProcessStatus')).toContainText('已无多余白边');
  await upload(page,fixture({content:''}),'empty.svg');await crop(page);
  await expect(page.locator('#imageProcessStatus')).toContainText('未识别到');await expect(page.locator('#sourceToggle')).toBeHidden();await expect(page.locator('#dims')).toHaveText('240 × 180');
});
test('an image without a white background is retained with a manual-crop explanation',async({page})=>{
  await setup(page);await upload(page,fixture({fill:'#234567'}));const before=await page.locator('#previewImg').getAttribute('src');await crop(page);
  expect(await page.locator('#previewImg').getAttribute('src')).toBe(before);await expect(page.locator('#imageProcessStatus')).toContainText('手动裁剪');await expect(page.locator('#sourceToggle')).toBeHidden();
});
test('rotation, upscaling and original switching report actual image dimensions',async({page})=>{
  await setup(page);await upload(page,fixture());await page.locator('#rotateBtn').click();await expect(page.locator('#dims')).toHaveText('180 × 240');
  await page.locator('[data-process="upscale"]').click();await expect(page.locator('#dims')).toHaveText('360 × 480');
  expect(await pixels(page)).toMatchObject({width:360,height:480});await page.locator('[data-use="original"]').click();await expect(page.locator('#dims')).toHaveText('240 × 180');
});
test('a delayed remote image displays progress and replacing it cancels the stale crop',async({page})=>{
  await setup(page);
  await page.route('https://crop.example.com/remote.svg',route=>route.fulfill({status:200,contentType:'image/svg+xml',headers:{'access-control-allow-origin':'*'},body:fixture()}));
  await page.locator('#urlInput').fill('https://crop.example.com/remote.svg');await page.locator('#urlForm button').click();await expect(page.locator('#sourceKind')).toContainText('图片链接');
  let release;const gate=new Promise(resolve=>release=resolve);
  await page.route('https://crop.example.com/remote.svg',async route=>{await gate;await route.fulfill({status:200,contentType:'image/svg+xml',headers:{'access-control-allow-origin':'*'},body:fixture()})});
  await page.locator('[data-process="autocrop"]').click();await expect(page.locator('#imageProcessStatus')).toContainText('正在');await expect(page.locator('[data-process="autocrop"]')).toBeDisabled();
  await upload(page,fixture({width:300,height:200}),'replacement.svg');release();
  await expect(page.locator('[data-process="autocrop"]')).toBeEnabled();await expect(page.locator('#dims')).toHaveText('300 × 200');expect(await pixels(page)).toMatchObject({width:300,height:200});await expect(page.locator('#sourceToggle')).toBeHidden();
});
test('a failed remote image is explained inline and processing controls recover',async({page})=>{
  await setup(page);await page.route('https://crop.example.com/failure.svg',route=>route.fulfill({status:200,contentType:'image/svg+xml',headers:{'access-control-allow-origin':'*'},body:fixture()}));
  await page.locator('#urlInput').fill('https://crop.example.com/failure.svg');await page.locator('#urlForm button').click();await expect(page.locator('#sourceKind')).toContainText('图片链接');
  await page.route('https://crop.example.com/failure.svg',route=>route.abort());
  await page.route('**/api/image-proxy?url=https%3A%2F%2Fcrop.example.com%2Ffailure.svg',route=>route.fulfill({status:502,body:'failed'}));await crop(page);
  await expect(page.locator('#imageProcessStatus')).toContainText('处理失败');await expect(page.locator('#sourceToggle')).toBeHidden();
});

test('a white product on a pale gray background retains its complete opaque pixels',async({page})=>{
  await setup(page);await upload(page,fixture({fill:'#f4f4f4',content:'<rect x="70" y="50" width="100" height="80" fill="white"/>'}));await crop(page);
  await expect(page.locator('#dims')).toHaveText('104 × 84');expect(await pixels(page)).toMatchObject({width:104,height:84,white:8000,corner:[244,244,244,255]});
});
test('high resolution cropping retains one-pixel detail between the previous sampling rows',async({page})=>{
  await setup(page);await upload(page,fixture({width:2800,height:1600,content:'<rect x="900" y="400" width="1000" height="800" fill="#333"/><rect x="500" y="699" width="400" height="1" fill="red"/>'}));await crop(page);
  await expect(page.locator('#dims')).toHaveText('1456 × 856');expect(await pixels(page)).toMatchObject({width:1456,height:856,dark:800000,red:400});
});

test('an almost-white product is not reduced to only its dark handle',async({page})=>{
  await setup(page);await upload(page,fixture({content:'<rect x="70" y="50" width="100" height="80" fill="#fefefe"/><rect x="110" y="70" width="20" height="20" fill="#333"/>'}));await crop(page);
  await expect(page.locator('#dims')).toHaveText('104 × 84');expect(await pixels(page)).toMatchObject({width:104,height:84,nearlyWhite:7600,dark:400});
});
