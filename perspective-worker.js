'use strict';

const OPENCV_URL='https://cdn.jsdelivr.net/npm/@techstark/opencv-js@4.10.0-release.1/dist/opencv.js';

function orderQuad(points){
  const bySum=[...points].sort((a,b)=>(a.x+a.y)-(b.x+b.y));
  const tl=bySum[0],br=bySum[3];
  const rest=points.filter(p=>p!==tl&&p!==br).sort((a,b)=>(a.y-a.x)-(b.y-b.x));
  return [tl,rest[0],br,rest[1]];
}
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

async function getCv(){
  if(!self.cv)importScripts(OPENCV_URL);
  let cv=self.cv;
  if(cv&&typeof cv.then==='function')cv=await cv;
  if(!cv?.Mat)throw new Error('OpenCV unavailable');
  return cv;
}

self.onmessage=async event=>{
  const {width,height,buffer}=event.data||{};
  if(!width||!height||!buffer)return self.postMessage({ok:false,error:'Invalid image data'});
  let src,gray,blur,edges,contours,hier,best,srcPts,dstPts,M,dst;
  try{
    const cv=await getCv();
    const pixels=new Uint8ClampedArray(buffer);
    src=cv.matFromImageData(new ImageData(pixels,width,height));
    gray=new cv.Mat();blur=new cv.Mat();edges=new cv.Mat();contours=new cv.MatVector();hier=new cv.Mat();
    cv.cvtColor(src,gray,cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray,blur,new cv.Size(5,5),0);
    cv.Canny(blur,edges,60,160);
    cv.findContours(edges,contours,hier,cv.RETR_LIST,cv.CHAIN_APPROX_SIMPLE);

    let bestArea=0;
    for(let i=0;i<contours.size();i++){
      const cnt=contours.get(i),peri=cv.arcLength(cnt,true),approx=new cv.Mat(),area=Math.abs(cv.contourArea(cnt));
      cv.approxPolyDP(cnt,approx,.02*peri,true);
      if(approx.rows===4&&area>bestArea&&area>width*height*.12){best?.delete?.();best=approx;bestArea=area}else approx.delete();
      cnt.delete();
    }
    if(!best)throw new Error('未检测到明显四边形');
    const pts=[];
    for(let i=0;i<4;i++){const p=best.intPtr(i,0);pts.push({x:p[0],y:p[1]})}
    best.delete();best=null;
    const ordered=orderQuad(pts);
    const outW=Math.max(32,Math.round(Math.max(dist(ordered[0],ordered[1]),dist(ordered[2],ordered[3]))));
    const outH=Math.max(32,Math.round(Math.max(dist(ordered[0],ordered[3]),dist(ordered[1],ordered[2]))));
    srcPts=cv.matFromArray(4,1,cv.CV_32FC2,ordered.flatMap(p=>[p.x,p.y]));
    dstPts=cv.matFromArray(4,1,cv.CV_32FC2,[0,0,outW,0,outW,outH,0,outH]);
    M=cv.getPerspectiveTransform(srcPts,dstPts);
    dst=new cv.Mat();
    cv.warpPerspective(src,dst,M,new cv.Size(outW,outH),cv.INTER_LINEAR,cv.BORDER_REPLICATE,new cv.Scalar());
    const out=new Uint8ClampedArray(dst.data);
    self.postMessage({ok:true,width:outW,height:outH,buffer:out.buffer},[out.buffer]);
  }catch(error){
    self.postMessage({ok:false,error:error?.message||'Perspective correction failed'});
  }finally{
    for(const mat of [best,srcPts,dstPts,M,dst,src,gray,blur,edges,hier])try{mat?.delete?.()}catch{}
    try{contours?.delete?.()}catch{}
  }
};
