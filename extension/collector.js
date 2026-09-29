function soutuCollectPage(mode){
  const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
  const web=u=>{try{const x=new URL(u,location.href);return /^https?:$/.test(x.protocol)?x.toString():''}catch{return''}};
  const domain=u=>{try{return new URL(u).hostname.replace(/^www\./,'')}catch{return''}};
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
              out.push({name:p.name||'',brand:typeof p.brand==='string'?p.brand:p.brand?.name||'',sku:p.sku||'',mpn:p.mpn||'',gtin:p.gtin13||p.gtin12||p.gtin14||p.gtin||'',model:p.model||'',price:offer.price||p.price||'',currency:offer.priceCurrency||'',availability:offer.availability||'',image:web(Array.isArray(p.image)?p.image[0]:p.image||'')});
            }
          }
        }
      }catch{}
    });
    return out;
  }
  const productList=products();
  if(mode==='product'){
    const rows=productList.map(p=>({title:p.name||document.title,url:location.href,image:p.image,price:p.price?`${p.price}${p.currency?` ${p.currency}`:''}`:'',domain:location.hostname.replace(/^www\./,''),product:p}));
    if(rows.length)return{kind:'product',source:location.hostname,pageUrl:location.href,pageTitle:document.title,capturedAt:Date.now(),results:rows};
  }
  const imageRows=[...document.images].map(img=>{
    const rect=img.getBoundingClientRect(),src=web(img.currentSrc||img.src),a=img.closest('a[href]'),url=web(a?.href||location.href),box=img.closest('article,li,[role="listitem"],div'),text=clean(box?.innerText||a?.innerText||img.alt||img.title);
    return{src,url,title:clean(img.alt||a?.getAttribute('aria-label')||a?.title||text).slice(0,280),text:text.slice(0,420),price:priceOf(text),date:dateOf(text),width:img.naturalWidth||Math.round(rect.width),height:img.naturalHeight||Math.round(rect.height)}
  }).filter(x=>x.src&&x.width>=120&&x.height>=90);
  if(mode==='images'){
    const seen=new Set();
    return{kind:'page-images',source:location.hostname,pageUrl:location.href,pageTitle:document.title,capturedAt:Date.now(),results:imageRows.filter(x=>{if(seen.has(x.src))return false;seen.add(x.src);return true}).sort((a,b)=>b.width*b.height-a.width*a.height).slice(0,30).map(x=>({title:x.title||document.title,url:x.url||location.href,image:x.src,domain:domain(x.url||location.href),width:x.width,height:x.height,price:x.price,date:x.date}))}
  }
  const candidates=[],seen=new Set();
  for(const row of imageRows){
    if(!row.url||seen.has(row.url+'|'+row.src))continue;
    seen.add(row.url+'|'+row.src);
    const sameProduct=productList.find(p=>p.name&&row.text.toLowerCase().includes(String(p.name).toLowerCase().slice(0,20)));
    candidates.push({title:row.title||row.text.slice(0,180)||'图片结果',url:row.url,image:row.src,domain:domain(row.url),price:row.price,date:row.date,snippet:row.text,product:sameProduct||{}})
  }
  if(productList.length&&!candidates.length)productList.forEach(p=>candidates.push({title:p.name||document.title,url:location.href,image:p.image,domain:location.hostname.replace(/^www\./,''),price:p.price?`${p.price}${p.currency?` ${p.currency}`:''}`:'',product:p}));
  return{kind:'collector',source:location.hostname,pageUrl:location.href,pageTitle:document.title,capturedAt:Date.now(),results:candidates.slice(0,24)};
}
