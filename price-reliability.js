(()=>{
  'use strict';
  if(window.SOUTU_PRICE_RELIABILITY)return;

  const HISTORY_KEY='soutu-price-history-v1';
  const ALERT_KEY='soutu-price-alerts-v1';
  const SCHEMA_KEY='soutu-price-history-schema-v2';
  const SOURCE_KEY='soutu-price-source-reliability-v1';
  const LEGACY_HISTORY_KEYS=['soutu-price-history','soutu-price-history-v0'];
  const TRACKING_PARAM=/^(?:utm_.+|fbclid|gclid|msclkid|mc_cid|mc_eid|ref|ref_|affiliate|affid|aff_id)$/i;
  const SHIPPING=/(?:shipping|delivery|postage|freight|运费|配送费|邮费|物流费)/i;
  const TAX=/(?:sales\s*tax|vat|taxes?|含税|税费|税额)/i;
  const OUT_OF_STOCK=/(?:out\s+of\s+stock|sold\s+out|unavailable|temporarily\s+unavailable|缺货|售罄|无货|暂时缺货)/i;
  const IN_STOCK=/(?:in\s+stock|available\s+now|ready\s+to\s+ship|ships?\s+(?:today|now)|现货|有货|库存充足)/i;
  const PRODUCT_PRICE=/(?:sale|now|current\s*price|our\s*price|price|售价|现价|到手价|促销价|商品价)/i;
  const DAY=24*60*60*1000;
  const SOURCE_TTL=180*DAY;
  const MAX_SOURCES=160;

  const state={
    migrated:false,
    migratedRecords:0,
    migratedPoints:0,
    importedLegacyRecords:0,
    duplicateMerchantSamples:0,
    componentOnlyRejected:0,
    unavailableRejected:0,
    sourceStats:readJson(SOURCE_KEY,{}),
    lastRefreshAt:0
  };

  function readJson(key,fallback){
    try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback}catch{return fallback}
  }
  function writeJson(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}}
  function clamp(n,min=0,max=1){return Math.max(min,Math.min(max,n))}
  function norm(v){return String(v||'').normalize('NFKC').toUpperCase().replace(/[^A-Z0-9]+/g,'')}
  function num(v){const n=Number(v);return Number.isFinite(n)&&n>0?n:null}
  function canonicalUrl(raw){
    const value=String(raw||'').trim();if(!value)return'';
    try{
      const u=new URL(value,location.href);u.hash='';
      for(const key of [...u.searchParams.keys()])if(TRACKING_PARAM.test(key))u.searchParams.delete(key);
      u.searchParams.sort();return u.toString();
    }catch{return value}
  }
  function domain(raw){try{return new URL(raw,location.href).hostname.replace(/^www\./,'').toLowerCase()}catch{return''}}
  function itemUrl(item){return String(item?.link||item?.url||'').trim()}
  function itemText(item){
    const p=item?.product||{},m=item?.meta||{};
    return [item?.title,item?.snippet,item?.description,p?.description,m?.description,item?.availability,p?.availability,m?.availability].filter(Boolean).join(' ');
  }
  function api(){return window.SOUTU_PRICE_INTELLIGENCE||null}
  function historyApi(){return window.SOUTU_PRICE_HISTORY||null}
  function currencyHint(item){const p=item?.product||{},m=item?.meta||{};return item?.currency||p?.currency||m?.currency||''}
  function explicitPriceRaw(item){
    const p=item?.product||{},m=item?.meta||{};
    return item?.price??p?.price??m?.price??'';
  }
  function original(){
    const p=api();return p?{
      parsePrice:p.__soutuOriginalParsePrice||p.parsePrice,
      priceCandidates:p.__soutuOriginalPriceCandidates||p.priceCandidates,
      buckets:p.__soutuOriginalBuckets||p.buckets,
      capture:p.__soutuOriginalCapture||p.capture
    }:null
  }

  function splitCandidateContext(candidate){
    const context=String(candidate?.context||''),raw=String(candidate?.raw||'');
    const idx=raw?context.indexOf(raw):-1;
    if(idx<0)return{before:context,after:''};
    return{before:context.slice(0,idx),after:context.slice(idx+raw.length)};
  }
  function componentKind(candidate){
    const {before,after}=splitCandidateContext(candidate);
    const beforeTail=before.slice(-22),afterHead=after.slice(0,18);
    if(SHIPPING.test(beforeTail)&&/shipping|delivery|postage|freight|运费|配送费|邮费|物流费/i.test(beforeTail))return'shipping';
    if(/^\s*(?:shipping|delivery|postage|freight|运费|配送费|邮费|物流费)\b/i.test(afterHead))return'shipping';
    if(TAX.test(beforeTail)&&/(?:sales\s*tax|vat|taxes?|含税|税费|税额)/i.test(beforeTail))return'tax';
    if(/^\s*(?:sales\s*tax|vat|taxes?|含税|税费|税额)\b/i.test(afterHead))return'tax';
    return'';
  }
  function candidatesForItem(item){
    const o=original();if(!o?.priceCandidates)return[];
    const raw=explicitPriceRaw(item),hint=currencyHint(item);
    if(raw!==''&&raw!=null)return o.priceCandidates(raw,hint)||[];
    return o.priceCandidates(itemText(item),hint)||[];
  }
  function reliableParsePrice(item){
    const o=original();if(!o)return null;
    const candidates=candidatesForItem(item);
    if(candidates.length){
      const usable=candidates.filter(c=>!['monthly','saving'].includes(c.kind)&&!componentKind(c));
      const selected=usable.find(c=>c.kind==='sale')||usable.find(c=>c.kind==='standard')||usable.find(c=>c.kind==='list');
      if(selected)return{raw:selected.raw,amount:selected.amount,currency:selected.currency,kind:selected.kind};
      if(candidates.some(c=>componentKind(c)))state.componentOnlyRejected+=1;
      return null;
    }
    const fallback=o.parsePrice?.(item)||null;
    if(!fallback)return null;
    const text=String(explicitPriceRaw(item)||itemText(item));
    if((SHIPPING.test(text)||TAX.test(text))&&!PRODUCT_PRICE.test(text)){state.componentOnlyRejected+=1;return null}
    return fallback;
  }

  function directComponent(item,names){
    const p=item?.product||{},m=item?.meta||{};
    for(const name of names){for(const obj of [item,p,m]){const value=obj?.[name];if(value==null||value==='')continue;const n=num(value);if(n)return n;const parsed=original()?.priceCandidates?.(value,currencyHint(item))?.[0];if(parsed?.amount)return parsed.amount}}
    return null;
  }
  function componentFromText(item,type){
    const list=original()?.priceCandidates?.(itemText(item),currencyHint(item))||[];
    const hit=list.find(c=>componentKind(c)===type);return hit?.amount||null;
  }
  function availability(item){
    const p=item?.product||{},m=item?.meta||{},direct=item?.availability??item?.stockStatus??p?.availability??p?.stockStatus??m?.availability??m?.stockStatus;
    if(typeof direct==='boolean')return direct?'in-stock':'out-of-stock';
    const text=[direct,itemText(item)].filter(Boolean).join(' ');
    if(OUT_OF_STOCK.test(text))return'out-of-stock';
    if(IN_STOCK.test(text))return'in-stock';
    return'unknown';
  }
  function priceComponents(item){
    const product=reliableParsePrice(item),shipping=directComponent(item,['shippingCost','shipping','deliveryCost','freight'])??componentFromText(item,'shipping'),tax=directComponent(item,['tax','taxAmount','vat','salesTax'])??componentFromText(item,'tax');
    const sameCurrency=product?.currency&&Number.isFinite(product?.amount);
    const landed=sameCurrency?product.amount+(shipping||0)+(tax||0):null;
    return{product,shipping,tax,landed,availability:availability(item)};
  }

  function sourceKey(item){return domain(itemUrl(item))||norm(item?.provider||item?.source||'unknown').toLowerCase()||'unknown'}
  function identityStrength(item){
    const id=api()?.identity?.(item)||{};
    if(id.gtin)return .2;
    if(id.asin)return .18;
    if(id.brand&&id.mpn)return .15;
    if(id.brand&&id.model)return .12;
    if(id.mpn)return .1;
    return 0;
  }
  function liveSourceScore(item){
    const url=itemUrl(item),host=domain(url),parts=priceComponents(item),p=parts.product;
    let score=.48;
    if(host)score+=.08;
    if(/^https:\/\//i.test(url))score+=.04;
    score+=identityStrength(item);
    if(explicitPriceRaw(item)!==''&&explicitPriceRaw(item)!=null)score+=.08;
    if(p&&/^[A-Z]{3}$/.test(String(p.currency||'')))score+=.05;
    if(parts.availability==='in-stock')score+=.04;
    if(parts.availability==='out-of-stock')score-=.22;
    const evidence=Number(item?._sourceScore??item?.sourceScore);
    if(Number.isFinite(evidence))score+=Math.min(.12,Math.max(0,evidence)/100*.12);
    if(!host)score-=.06;
    if(p&&['$','¥'].includes(p.currency))score-=.08;
    return clamp(score);
  }
  function sourceReliability(item){
    const key=sourceKey(item),live=liveSourceScore(item),saved=state.sourceStats[key];
    if(!saved)return live;
    const age=Math.max(0,Date.now()-(saved.lastSeen||0)),freshness=Math.exp(-age/SOURCE_TTL),historical=clamp(Number(saved.ema)||live);
    return clamp(live*.72+historical*.28*freshness+live*.28*(1-freshness));
  }
  function rememberSources(items){
    const now=Date.now();
    for(const item of items||[]){
      const key=sourceKey(item);if(!key||key==='unknown')continue;
      const current=liveSourceScore(item),prev=state.sourceStats[key]||{observed:0,ema:current,firstSeen:now};
      prev.observed=(prev.observed||0)+1;prev.ema=clamp((Number(prev.ema)||current)*.82+current*.18);prev.lastSeen=now;
      const stock=availability(item);if(stock==='in-stock')prev.inStock=(prev.inStock||0)+1;if(stock==='out-of-stock')prev.outOfStock=(prev.outOfStock||0)+1;
      state.sourceStats[key]=prev;
    }
    const entries=Object.entries(state.sourceStats).sort((a,b)=>(b[1]?.lastSeen||0)-(a[1]?.lastSeen||0)).slice(0,MAX_SOURCES);
    state.sourceStats=Object.fromEntries(entries);writeJson(SOURCE_KEY,state.sourceStats);
  }

  function median(values){const v=values.filter(Number.isFinite).sort((a,b)=>a-b);if(!v.length)return 0;const m=Math.floor(v.length/2);return v.length%2?v[m]:(v[m-1]+v[m])/2}
  function markAnomalies(entries){
    if(entries.length<3)return entries.map(x=>({...x,anomaly:false}));
    const baseline=median(entries.map(x=>x.amount));
    return entries.map(x=>({...x,anomaly:baseline>0&&(x.amount<baseline/8||x.amount>baseline*8||(baseline>=20&&x.amount<1))}));
  }
  function merchantKey(item){return sourceKey(item)}
  function reliabilityBuckets(items){
    const p=api();if(!p)return[];
    const rows=(items||[]).map(item=>{
      const parsed=reliableParsePrice(item),parts=priceComponents(item),confidence=p.confidenceFor?.(item,items)||{score:1};
      return{item,p:parsed,parts,confidence,reliability:sourceReliability(item),merchant:merchantKey(item)};
    }).filter(x=>x.p);
    const byCurrency=new Map();for(const row of rows){const c=row.p.currency;if(!byCurrency.has(c))byCurrency.set(c,[]);byCurrency.get(c).push(row)}
    return [...byCurrency.entries()].map(([currency,raw])=>{
      const flagged=markAnomalies(raw.map(x=>({...x,amount:x.p.amount})));
      const usable=flagged.filter(x=>!x.anomaly&&x.p.kind!=='list'&&x.confidence.score>=.7&&x.reliability>=.58&&x.parts.availability!=='out-of-stock');
      state.unavailableRejected+=flagged.filter(x=>x.parts.availability==='out-of-stock').length;
      const merchantMap=new Map();
      for(const row of usable){
        const old=merchantMap.get(row.merchant),landed=row.parts.landed??row.amount,oldLanded=old?.parts?.landed??old?.amount;
        if(!old||row.reliability>old.reliability+.03||(Math.abs(row.reliability-old.reliability)<=.03&&landed<oldLanded))merchantMap.set(row.merchant,row);
      }
      const trusted=[...merchantMap.values()];state.duplicateMerchantSamples+=Math.max(0,usable.length-trusted.length);
      if(!trusted.length)return null;
      trusted.sort((a,b)=>a.amount-b.amount||b.reliability-a.reliability);
      const values=trusted.map(x=>x.amount),min=values[0],max=values.at(-1),mid=median(values),spread=min?((max-min)/min)*100:0,cheap=trusted[0],high=trusted.at(-1);
      const offer=x=>({amount:x.amount,title:x.item?.title||'',domain:domain(itemUrl(x.item)),url:canonicalUrl(itemUrl(x.item)),confidence:x.confidence,reliability:x.reliability,shipping:x.parts.shipping,tax:x.parts.tax,landed:x.parts.landed,availability:x.parts.availability});
      return{currency,count:trusted.length,totalCount:flagged.length,merchantCount:trusted.length,excludedCount:flagged.length-trusted.length,duplicateMerchantCount:Math.max(0,usable.length-trusted.length),anomalyCount:flagged.filter(x=>x.anomaly).length,lowConfidenceCount:flagged.filter(x=>x.confidence.score<.7).length,lowReliabilityCount:flagged.filter(x=>x.reliability<.58).length,outOfStockCount:flagged.filter(x=>x.parts.availability==='out-of-stock').length,listPriceCount:flagged.filter(x=>x.p.kind==='list').length,min,max,median:mid,spread,cheapest:offer(cheap),highest:offer(high)};
    }).filter(Boolean).sort((a,b)=>b.count-a.count||a.currency.localeCompare(b.currency));
  }

  function normalizePoint(point,record,now){
    if(point==null)return null;
    if(typeof point==='number')point={amount:point};
    const amount=num(point.amount??point.price??point.value);if(!amount)return null;
    const ts=Number(point.ts??point.timestamp??point.time)||Date.parse(point.date||'')||Number(record?.updatedAt||record?.createdAt)||now;
    const rawUrl=point.url||point.link||'',url=canonicalUrl(rawUrl),source=domain(url)||String(point.source||point.provider||'').trim();
    return{...point,ts,amount,currency:String(point.currency||record?.currency||'').toUpperCase(),source,url,title:String(point.title||record?.title||''),schemaVersion:2,reliability:clamp(Number(point.reliability)||.5),availability:point.availability||'unknown'};
  }
  function normalizeRecord(key,record,now){
    const rec=Array.isArray(record)?{points:record}:({...record||{}}),points=(rec.points||rec.history||rec.prices||[]).map(p=>normalizePoint(p,rec,now)).filter(Boolean);
    if(!points.length)return null;
    let newKey=String(rec.key||key||'');
    const match=newKey.match(/^url:(.+)::([A-Z¥$]{1,3})$/);if(match)newKey=`url:${canonicalUrl(match[1])}::${match[2]}`;
    return{...rec,key:newKey,productKey:rec.productKey||newKey.replace(/::[^:]+$/,''),currency:String(rec.currency||points[0].currency||'').toUpperCase(),title:rec.title||points[0].title||'',createdAt:Number(rec.createdAt)||Math.min(...points.map(p=>p.ts)),updatedAt:Number(rec.updatedAt)||Math.max(...points.map(p=>p.ts)),schemaVersion:2,points};
  }
  function dedupePoints(points){
    const seen=new Set();return [...points].sort((a,b)=>a.ts-b.ts).filter(p=>{const k=`${p.ts}|${p.amount}|${canonicalUrl(p.url)||p.source}`;if(seen.has(k))return false;seen.add(k);return true}).slice(-60)
  }
  function migrateHistory(){
    const h=historyApi();if(!h?.state)return false;
    const now=Date.now(),source={...(h.state.history||{})};
    for(const legacyKey of LEGACY_HISTORY_KEYS){
      const legacy=readJson(legacyKey,null);if(!legacy)continue;
      if(Array.isArray(legacy))legacy.forEach((r,i)=>{source[`legacy:${i}`]=r});else if(typeof legacy==='object')Object.assign(source,legacy);
    }
    const next={},keyMap={};let records=0,points=0,imports=Math.max(0,Object.keys(source).length-Object.keys(h.state.history||{}).length);
    for(const [key,record] of Object.entries(source)){
      const normalized=normalizeRecord(key,record,now);if(!normalized)continue;
      const target=normalized.key||key;keyMap[key]=target;
      if(next[target]){
        next[target].points=dedupePoints([...(next[target].points||[]),...(normalized.points||[])]);next[target].updatedAt=Math.max(next[target].updatedAt||0,normalized.updatedAt||0);
      }else{normalized.points=dedupePoints(normalized.points||[]);next[target]=normalized}
      records+=1;points+=normalized.points.length;
    }
    h.state.history=next;writeJson(HISTORY_KEY,next);
    const alerts=h.state.alerts||readJson(ALERT_KEY,{}),migratedAlerts={};
    for(const [key,value] of Object.entries(alerts)){const target=keyMap[key]||key;migratedAlerts[target]=migratedAlerts[target]||value}
    h.state.alerts=migratedAlerts;writeJson(ALERT_KEY,migratedAlerts);
    writeJson(SCHEMA_KEY,{version:2,migratedAt:now,records:Object.keys(next).length});
    state.migrated=true;state.migratedRecords=records;state.migratedPoints=points;state.importedLegacyRecords=imports;
    return true;
  }

  function install(){
    const p=api();if(!p||p.__soutuReliabilityInstalled)return false;
    p.__soutuOriginalParsePrice=p.parsePrice;p.__soutuOriginalPriceCandidates=p.priceCandidates;p.__soutuOriginalBuckets=p.buckets;p.__soutuOriginalCapture=p.capture;
    p.parsePrice=reliableParsePrice;
    p.buckets=reliabilityBuckets;
    p.capture=function(kind,items,meta={}){const ok=p.__soutuOriginalCapture.call(p,kind,items,meta);if(ok)rememberSources(Array.isArray(items)?items:[]);return ok};
    p.__soutuReliabilityInstalled=true;
    return true;
  }
  function attachHistory(){
    const h=historyApi();if(!h)return false;
    if(!state.migrated)migrateHistory();
    h.refresh?.();return true;
  }
  function refresh(){
    install();attachHistory();state.lastRefreshAt=Date.now();
  }

  window.SOUTU_PRICE_RELIABILITY={state,refresh,reliableParsePrice,priceComponents,sourceReliability,reliabilityBuckets,migrateHistory,canonicalUrl,availability};
  refresh();
  const timer=setInterval(()=>{refresh();if(api()&&historyApi())clearInterval(timer)},50);setTimeout(()=>clearInterval(timer),10000);
})();
