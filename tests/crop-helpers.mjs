import {expect} from '@playwright/test';

export async function coordinateFixture(page,width,height){
  const encoded=await page.evaluate(({width,height})=>{
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext('2d'),image=ctx.createImageData(width,height);
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const i=(y*width+x)*4;image.data[i]=x%256;image.data[i+1]=y%256;
      image.data[i+2]=((x*13)^(y*7))&255;image.data[i+3]=255;
    }
    ctx.putImageData(image,0,0);return canvas.toDataURL('image/png').split(',')[1];
  },{width,height});
  return Buffer.from(encoded,'base64');
}

export async function imageBounds(page){
  await page.locator('#previewImg').scrollIntoViewIfNeeded();
  return page.locator('#previewImg').evaluate(async img=>{
    await img.decode();await new Promise(resolve=>requestAnimationFrame(resolve));
    // Wait for finite entrance animations on the image and its ancestors before measuring.
    const animations=document.getAnimations().filter(animation=>animation.effect?.target?.contains?.(img)&&Number.isFinite(animation.effect.getComputedTiming().endTime));
    await Promise.all(animations.map(animation=>animation.finished.catch(()=>{})));
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));const box=img.getBoundingClientRect();
    const scale=Math.min(box.width/img.naturalWidth,box.height/img.naturalHeight);
    const width=img.naturalWidth*scale,height=img.naturalHeight*scale;
    return{x:box.left+(box.width-width)/2,y:box.top+(box.height-height)/2,width,height,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight};
  });
}

export async function drawSelection(page,region,{reverse=false}={}){
  await page.locator('#imageStage').scrollIntoViewIfNeeded();
  const box=await imageBounds(page);
  const a={x:box.x+region.x/box.naturalWidth*box.width,y:box.y+region.y/box.naturalHeight*box.height};
  const b={x:box.x+(region.x+region.w)/box.naturalWidth*box.width,y:box.y+(region.y+region.h)/box.naturalHeight*box.height};
  const [start,end]=reverse?[b,a]:[a,b];
  await page.mouse.move(start.x,start.y);await page.mouse.down();
  await page.mouse.move(end.x,end.y,{steps:4});await page.mouse.up();
}

export async function expectOverlay(page,region){
  await expect.poll(async()=>{
    const img=await imageBounds(page),crop=await page.locator('#cropBox').boundingBox();
    if(!crop)return Infinity;
    return Math.max(Math.abs(crop.x-(img.x+region.x/img.naturalWidth*img.width)),Math.abs(crop.y-(img.y+region.y/img.naturalHeight*img.height)),Math.abs(crop.width-region.w/img.naturalWidth*img.width),Math.abs(crop.height-region.h/img.naturalHeight*img.height));
  }).toBeLessThan(1);
}

export async function expectRegion(page,region){
  await expect(page.locator('#dims')).toHaveText(`${region.w} × ${region.h}`);
  const result=await page.locator('#previewImg').evaluate(async(img,region)=>{
    await img.decode();const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
    const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;
    let mismatches=0;
    for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
      const rx=region.x+x,ry=region.y+y,sx=region.transpose?ry:rx,sy=region.transpose?rx:ry,i=(y*canvas.width+x)*4;
      if(data[i]!==sx%256||data[i+1]!==sy%256||data[i+2]!==(((sx*13)^(sy*7))&255)||data[i+3]!==255)mismatches++;
    }
    return{width:canvas.width,height:canvas.height,mismatches};
  },region);
  expect(result).toEqual({width:region.w,height:region.h,mismatches:0});
}
