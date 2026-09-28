const DEFAULT='https://soutu-pro.vercel.app/';
const input=document.querySelector('#url'),status=document.querySelector('#status');
chrome.storage.sync.get('siteUrl',x=>input.value=x.siteUrl||DEFAULT);
const setStatus=(m,ok=true)=>{status.textContent=m;status.className=`status ${ok?'ok':'err'}`};
function base64url(obj){const bytes=new TextEncoder().encode(JSON.stringify(obj));let s='';for(let i=0;i<bytes.length;i+=0x8000)s+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
async function active(){const [tab]=await chrome.tabs.query({active:true,currentWindow:true});return tab}
function collector(mode){
  const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
  const domain=u=>{try{return new URL(u,location.href).hostname.replace(/^www\./,'')}catch{return''}};
  const abs=u=>{try{return new URL(u,location.href).toString()}catch{return''}};
  const priceOf=t=>{const m=clean(t).match(/(?:US\$|C\$|A\$|HK\$|\$|£|€|¥|￥)\s?\d[\d,.]*(?:\.\d{2})?/);return m?m[0]:''};
  const dateOf=t=>{const m=clean(t).match(/\b(?:20\d{2}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+20\d{2})\b/i);return m?m[0]:''};
  function products(){
    const out=[];
    document.querySelectorAll('script[type="application/ld+json"]').forEach(s=>{
      try{
        const j=JSON.parse(s.textContent),stack=Array.isArray(j)?j:[j];
        for(const root of stack){
          const list=root?.['@graph']||[root];
          for(const p of list){
            const types=Array.isArray(p?.['@type'])?p['@type']:[p?.['@type']];
            if(types.some(x=>String(x).toLowerCase()==='product')){
              const offer=Array.isArray(p.offers)?p.offers[0]:p.offers||{};
              out.push({name:p.name||'',brand:typeof p.brand==='string'?p.brand:p.brand?.name||'',sku:p.sku||'',mpn:p.mpn||'',gtin:p.gtin13||p.gtin12||p.gtin14||p.gtin||'',model:p.model||'',price:offer.price||p.price||'',currency:offer.priceCurrency||'',availability:offer.availability||'',image:Array.isArray(p.image)?p.image[0]:p.image||''});
            }
          }
        }
      }catch{}
    });
    return out;
  }
  const productList=products();
  if(mode==='product'){return{kind:'product',source:location.hostname,pageUrl:location.href,pageTitle:document.title,capturedAt:Date.now(),results:productList.map((p,i)=>({title:p.name||document.title,url:location.href,image:abs(p.image),price:p.price?`${p.price}${p.currency?` ${p.currency}`:''}`:'',domain:location.hostname.replace(/^www\./,''),product:p}))}}
  const imageRows=[...document.images].map(img=>{const rect=img.getBoundingClientRect(),src=abs(img.currentSrc||img.src),a=img.closest('a[href]'),url=abs(a?.href||location.href),box=img.closest('article,li,[role="listitem"],div'),text=clean(box?.innerText||a?.innerText||img.alt||img.title);return{src,url,title:clean(img.alt||a?.getAttribute('aria-label')||a?.title||text).slice(0,280),text:text.slice(0,420),price:priceOf(text),date:dateOf(text),width:img.naturalWidth||Math.round(rect.width),height:img.naturalHeight||Math.round(rect.height)}}).filter(x=>x.src&&x.width>=120&&x.height>=90);
  if(mode==='images'){const seen=new Set();return{kind:'page-images',source:location.hostname,pageUrl:location.href,pageTitle:document.title,capturedAt:Date.now(),results:imageRows.filter(x=>{if(seen.has(x.src))return false;seen.add(x.src);return true}).sort((a,b)=>b.width*b.height-a.width*a.height).slice(0,30).map(x=>({title:x.title||document.title,url:x.url,image:x.src,domain:domain(x.url),width:x.width,height:x.height,price:x.price,date:x.date}))}}
  const candidates=[];const seen=new Set();for(const row of imageRows){if(!row.url||seen.has(row.url+'|'+row.src))continue;seen.add(row.url+'|'+row.src);const sameProduct=productList.find(p=>p.name&&row.text.toLowerCase().includes(String(p.name).toLowerCase().slice(0,20)));candidates.push({title:row.title||row.text.slice(0,180)||'图片结果',url:row.url,image:row.src,domain:domain(row.url),price:row.price,date:row.date,snippet:row.text,product:sameProduct||{}})}
  if(productList.length&&!candidates.length)productList.forEach(p=>candidates.push({title:p.name||document.title,url:location.href,image:abs(p.image),domain:location.hostname.replace(/^www\./,''),price:p.price?`${p.price}${p.currency?` ${p.currency}`:''}`:'',product:p}));
  return{kind:'collector',source:location.hostname,pageUrl:location.href,pageTitle:document.title,capturedAt:Date.now(),results:candidates.slice(0,24)};
}
async function collect(mode){try{const tab=await active();if(!tab?.id)throw new Error('No active tab');const [{result}]=await chrome.scripting.executeScript({target:{tabId:tab.id},func:collector,args:[mode]});if(!result?.results?.length)throw new Error('当前页面没有找到可采集结果');const {siteUrl=DEFAULT}=await chrome.storage.sync.get('siteUrl');const url=new URL(siteUrl);url.hash=`collector=${base64url(result)}`;await chrome.tabs.create({url:url.toString()});setStatus(`已采集 ${result.results.length} 条`,true)}catch(e){setStatus(e.message||'采集失败',false)}}
async function evidence(){try{const tab=await active();const png=await chrome.tabs.captureVisibleTab(tab.windowId,{format:'png'});const stamp=new Date().toISOString().replace(/[:.]/g,'-');await chrome.downloads.download({url:png,filename:`soutu-evidence-${stamp}.png`,saveAs:false});const meta={capturedAt:new Date().toISOString(),url:tab.url,title:tab.title};const data='data:application/json;charset=utf-8,'+encodeURIComponent(JSON.stringify(meta,null,2));await chrome.downloads.download({url:data,filename:`soutu-evidence-${stamp}.json`,saveAs:false});setStatus('截图和元数据已下载',true)}catch(e){setStatus(e.message||'快照失败',false)}}
document.querySelector('#collect').onclick=()=>collect('results');document.querySelector('#images').onclick=()=>collect('images');document.querySelector('#product').onclick=()=>collect('product');document.querySelector('#evidence').onclick=evidence;document.querySelector('#save').onclick=()=>chrome.storage.sync.set({siteUrl:input.value.trim()||DEFAULT},()=>setStatus('地址已保存'));document.querySelector('#open').onclick=async()=>{const {siteUrl=DEFAULT}=await chrome.storage.sync.get('siteUrl');chrome.tabs.create({url:siteUrl})};