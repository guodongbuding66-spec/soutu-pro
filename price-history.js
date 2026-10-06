(()=>{
  'use strict';
  if(window.SOUTU_PRICE_HISTORY)return;

  const HISTORY_KEY='soutu-price-history-v1';
  const ALERT_KEY='soutu-price-alerts-v1';
  const BASE_KEY='soutu-price-base-currency-v1';
  const FX_CACHE_KEY='soutu-price-fx-cache-v1';
  const MAX_PRODUCTS=200;
  const MAX_POINTS=60;
  const SAME_SAMPLE_WINDOW=12*60*60*1000;
  const ISO=/^[A-Z]{3}$/;
  const TRACKING_PARAM=/^(?:utm_.+|fbclid|gclid|msclkid|mc_cid|mc_eid)$/i;
  const BASE_CHOICES=['USD','EUR','CNY','GBP','JPY','CAD','AUD','CHF'];

  const state={
    base:localStorage.getItem(BASE_KEY)||'USD',
    history:readJson(HISTORY_KEY,{}),
    alerts:readJson(ALERT_KEY,{}),
    fx:readJson(FX_CACHE_KEY,{}),
    fxLoading:false,
    fxError:'',
    lastPriceUpdateAt:0,
    renderSignature:'',
    syncTimer:0
  };
  if(!BASE_CHOICES.includes(state.base))state.base='USD';

  function readJson(key,fallback){
    try{return JSON.parse(localStorage.getItem(key)||'null')||fallback}catch{return fallback}
  }
  function writeJson(key,value){
    try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}
  }
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]))}
  function norm(v){return String(v||'').normalize('NFKC').toUpperCase().replace(/[^A-Z0-9]+/g,'')}
  function domain(url){try{return new URL(url).hostname.replace(/^www\./,'')}catch{return''}}
  function fmt(n){return new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(n)}
  function money(code,n){return `${code} ${fmt(n)}`}

  function priceApi(){return window.SOUTU_PRICE_INTELLIGENCE||null}
  function itemUrl(item){return String(item?.link||item?.url||'').trim()}
  function itemTitle(item){return String(item?.title||'').trim()}
  function canonicalProductUrl(raw){
    const value=String(raw||'').trim();if(!value)return'';
    try{
      const u=new URL(value,location.href);u.hash='';
      for(const key of [...u.searchParams.keys()])if(TRACKING_PARAM.test(key))u.searchParams.delete(key);
      u.searchParams.sort();return u.toString();
    }catch{return value}
  }

  function productKey(item){
    const api=priceApi();
    const id=api?.identity?.(item)||{};
    if(id.gtin)return`gtin:${id.gtin}`;
    if(id.asin)return`asin:${norm(id.asin)}`;
    if(id.brand&&id.mpn)return`brand-mpn:${norm(id.brand)}:${norm(id.mpn)}`;
    if(id.brand&&id.model)return`brand-model:${norm(id.brand)}:${norm(id.model)}`;
    const url=canonicalProductUrl(itemUrl(item));if(url)return`url:${url}`;
    return`title:${norm(itemTitle(item))}`;
  }
  function groupKey(group){
    const api=priceApi();
    const ids=group.map(x=>api?.identity?.(x)||{});
    for(const field of ['gtin','asin']){
      const vals=[...new Set(ids.map(x=>norm(x[field])).filter(Boolean))];
      if(vals.length===1)return`${field}:${vals[0]}`;
    }
    for(const fields of [['brand','mpn'],['brand','model']]){
      const vals=[...new Set(ids.map(x=>fields.map(f=>norm(x[f])).join(':')).filter(v=>v.split(':').every(Boolean)))];
      if(vals.length===1)return`${fields.join('-')}:${vals[0]}`;
    }
    return productKey(group[0]||{});
  }
  function historyKey(item,currency){return`${productKey(item)}::${currency}`}
  function groupHistoryKey(group,currency){return`${groupKey(group)}::${currency}`}

  function pruneHistory(){
    const entries=Object.entries(state.history).sort((a,b)=>(b[1]?.updatedAt||0)-(a[1]?.updatedAt||0));
    state.history=Object.fromEntries(entries.slice(0,MAX_PRODUCTS));
  }
  function saveHistory(){
    pruneHistory();
    if(writeJson(HISTORY_KEY,state.history))return;
    for(const rec of Object.values(state.history))rec.points=(rec.points||[]).slice(-20);
    pruneHistory();writeJson(HISTORY_KEY,state.history);
  }
  function saveAlerts(){writeJson(ALERT_KEY,state.alerts)}

  function canonicalCurrency(code){
    const c=String(code||'').toUpperCase();
    return ISO.test(c)?c:'';
  }
  function pointFor(item,p,now){
    const rawUrl=itemUrl(item),url=canonicalProductUrl(rawUrl);
    return{ts:now,amount:p.amount,currency:p.currency,source:domain(rawUrl)||String(item.source||item.provider||''),url,title:itemTitle(item)};
  }
  function shouldAppend(points,point){
    const last=[...points].reverse().find(x=>(x.url&&point.url&&x.url===point.url)||(!x.url&&x.source===point.source));
    if(!last)return true;
    return last.amount!==point.amount||point.ts-last.ts>=SAME_SAMPLE_WINDOW;
  }

  function recordItem(item,now=Date.now()){
    const api=priceApi(),p=api?.parsePrice?.(item);
    if(!p||p.kind==='list'||p.kind==='monthly'||p.kind==='saving')return false;
    const key=historyKey(item,p.currency);
    const rec=state.history[key]||{key,productKey:productKey(item),currency:p.currency,title:itemTitle(item),createdAt:now,updatedAt:now,points:[]};
    const point=pointFor(item,p,now);
    if(!shouldAppend(rec.points||[],point))return false;
    rec.title=rec.title||itemTitle(item);rec.updatedAt=now;rec.points=[...(rec.points||[]),point].sort((a,b)=>a.ts-b.ts).slice(-MAX_POINTS);
    state.history[key]=rec;
    return true;
  }

  function mergeGroupHistory(group,currency){
    const keys=new Set(group.map(item=>historyKey(item,currency)));
    keys.add(groupHistoryKey(group,currency));
    const points=[];
    for(const key of keys){const rec=state.history[key];if(rec?.points)points.push(...rec.points)}
    const seen=new Set();
    return points.sort((a,b)=>a.ts-b.ts).filter(p=>{
      const k=`${p.ts}|${p.amount}|${p.url||p.source}`;if(seen.has(k))return false;seen.add(k);return true;
    }).slice(-MAX_POINTS);
  }

  function notify(title,message){
    let box=document.querySelector('#soutuPriceToast');
    if(!box){box=document.createElement('div');box.id='soutuPriceToast';box.className='price-history-toast';document.body.appendChild(box)}
    box.innerHTML=`<b>${esc(title)}</b><span>${esc(message)}</span>`;box.classList.add('show');
    clearTimeout(box._hideTimer);box._hideTimer=setTimeout(()=>box.classList.remove('show'),4800);
  }
  function trustedBuckets(group){
    const api=priceApi();return api?.buckets?.(group)||[];
  }
  function checkAlerts(items){
    const api=priceApi();if(!api)return;
    const best=new Map();
    for(const item of items){
      const p=api.parsePrice(item);if(!p||p.kind==='list')continue;
      const key=historyKey(item,p.currency),entry=best.get(key);
      if(!entry||p.amount<entry.amount)best.set(key,{amount:p.amount,item,p});
    }
    for(const group of api.groups?.(items)||[]){
      for(const currency of groupCurrencies(group)){
        const amount=currentBest(group,currency);if(amount==null)continue;
        const bucket=trustedBuckets(group).find(x=>x.currency===currency),cheap=bucket?.cheapest;
        const item=group.find(x=>itemUrl(x)===cheap?.url)||group.find(x=>api.parsePrice(x)?.currency===currency)||group[0];
        best.set(groupHistoryKey(group,currency),{amount,item,p:{amount,currency,kind:'standard'}});
      }
    }
    let changed=false;const now=Date.now();
    for(const [key,alert] of Object.entries(state.alerts)){
      if(!alert?.enabled||!(alert.target>0))continue;
      const entry=best.get(key);if(!entry)continue;
      const prevObserved=Number(alert.lastObservedAmount),hasObserved=Number.isFinite(prevObserved)&&prevObserved>0;
      const prevTriggered=Number(alert.lastTriggeredAmount),hasTriggered=Number.isFinite(prevTriggered)&&prevTriggered>0;
      if(!hasObserved||prevObserved!==entry.amount){alert.lastObservedAmount=entry.amount;alert.lastObservedAt=now;changed=true}
      if(entry.amount>alert.target)continue;
      const crossed=!hasObserved?!hasTriggered:prevObserved>alert.target;
      const newLow=hasTriggered&&entry.amount<prevTriggered;
      if(!crossed&&!newLow)continue;
      if(hasTriggered&&prevTriggered===entry.amount&&now-(alert.lastTriggeredAt||0)<24*60*60*1000)continue;
      alert.lastTriggeredAmount=entry.amount;alert.lastTriggeredAt=now;changed=true;
      notify('达到目标价',`${itemTitle(entry.item)||'商品'} · ${money(entry.p?.currency||alert.currency,entry.amount)} ≤ ${money(alert.currency,alert.target)}`);
    }
    if(changed)saveAlerts();
  }

  function ingest(){
    const api=priceApi();if(!api)return false;
    const items=api.state?.items||[];
    if(!items.length)return false;
    let changed=false,now=Date.now();
    for(const item of items)changed=recordItem(item,now)||changed;
    if(changed)saveHistory();
    checkAlerts(items);
    return changed;
  }

  function fxFresh(entry){return entry&&Date.now()-(entry.fetchedAt||0)<6*60*60*1000}
  function fxRates(){const entry=state.fx[state.base];return fxFresh(entry)?entry:null}
  async function ensureFx(currencies){
    const quotes=[...new Set(currencies.map(canonicalCurrency).filter(c=>c&&c!==state.base))].sort();
    if(!quotes.length)return null;
    const cached=fxRates();
    if(cached&&quotes.every(q=>Number(cached.rates?.[q])>0))return cached;
    if(state.fxLoading)return null;
    state.fxLoading=true;state.fxError='';scheduleSync();
    try{
      const url=new URL('/api/fx-rates',location.origin);url.searchParams.set('base',state.base);url.searchParams.set('quotes',quotes.join(','));
      const r=await fetch(url,{headers:{accept:'application/json'}});const data=await r.json();
      if(!r.ok||!data.enabled)throw new Error(data.message||`FX ${r.status}`);
      const base=canonicalCurrency(data.base);if(base!==state.base)throw new Error('FX base mismatch');
      const rates={[base]:1};
      for(const quote of quotes){const rate=Number(data.rates?.[quote]);if(!(rate>0))throw new Error(`FX rate missing: ${quote}`);rates[quote]=rate}
      const entry={base,date:data.date||'',provider:data.provider||'Frankfurter',rates,fetchedAt:Date.now()};
      state.fx[state.base]=entry;writeJson(FX_CACHE_KEY,state.fx);return entry;
    }catch(error){state.fxError=error?.message||'FX unavailable';return null}
    finally{state.fxLoading=false;scheduleSync()}
  }
  function convertToBase(amount,currency){
    const c=canonicalCurrency(currency);if(!c)return null;
    if(c===state.base)return amount;
    const rate=fxRates()?.rates?.[c];return Number(rate)>0?amount/Number(rate):null;
  }

  function confidenceOk(item,group){
    const api=priceApi();const c=api?.confidenceFor?.(item,group);return !c||c.score>=.7;
  }
  function bestOffer(group){
    let best=null;
    for(const bucket of trustedBuckets(group)){
      const converted=convertToBase(bucket.min,bucket.currency);if(converted==null)continue;
      const cheap=bucket.cheapest||{},candidate={converted,amount:bucket.min,currency:bucket.currency,title:cheap.title||'',source:cheap.domain||'',url:cheap.url||''};
      if(!best||candidate.converted<best.converted)best=candidate;
    }
    return best;
  }
  function groupCurrencies(group){
    const trusted=trustedBuckets(group).map(x=>x.currency).filter(Boolean);if(trusted.length)return[...new Set(trusted)];
    const api=priceApi();return [...new Set(group.map(x=>api?.parsePrice?.(x)?.currency).filter(Boolean))];
  }
  function currentBest(group,currency){
    const bucket=trustedBuckets(group).find(x=>x.currency===currency);return bucket?bucket.min:null;
  }

  function sparkline(points){
    if(points.length<2)return'';
    const vals=points.map(p=>p.amount),min=Math.min(...vals),max=Math.max(...vals),span=max-min||1,w=150,h=34,pad=3;
    const coords=points.map((p,i)=>`${pad+(i/(points.length-1))*(w-pad*2)},${h-pad-((p.amount-min)/span)*(h-pad*2)}`).join(' ');
    return`<svg class="price-history-spark" viewBox="0 0 ${w} ${h}" aria-label="价格趋势"><polyline points="${coords}" fill="none" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>`;
  }
  function trendInfo(points){
    if(!points.length)return null;
    const latest=points.at(-1),prev=[...points].reverse().find(p=>p.amount!==latest.amount),low=Math.min(...points.map(p=>p.amount));
    const pct=prev?((latest.amount-prev.amount)/prev.amount)*100:0;
    return{latest:latest.amount,low,pct,hasPrevious:!!prev};
  }

  function bestGroupForCard(card,groups){
    const text=card.textContent||'';let best=null,score=0;
    for(const g of groups){const hits=g.reduce((n,item)=>n+(itemTitle(item)&&text.includes(itemTitle(item))?1:0),0);if(hits>score){score=hits;best=g}}
    return score?best:null;
  }
  function existingIdentityGroups(){
    const api=priceApi();if(!api)return[];
    const all=api.groups?.(api.state?.items||[])||[];
    const cards=[...document.querySelectorAll('[data-identity-group-key]')];
    return cards.map(card=>({card,group:bestGroupForCard(card,all)})).filter(x=>x.group);
  }

  function alertFor(group,currency){
    const sharedKey=groupHistoryKey(group,currency);if(state.alerts[sharedKey])return{key:sharedKey,alert:state.alerts[sharedKey]};
    for(const item of group){const k=historyKey(item,currency);if(state.alerts[k])return{key:k,alert:state.alerts[k]}}
    return{key:sharedKey,alert:null};
  }
  function groupCard(group,index){
    const currencies=groupCurrencies(group),best=bestOffer(group),fx=fxRates();
    const primary=group[0]||{},title=itemTitle(primary)||`同款组 ${index+1}`;
    const historyRows=currencies.map(currency=>{
      const points=mergeGroupHistory(group,currency),trend=trendInfo(points),alertState=alertFor(group,currency),current=currentBest(group,currency);
      const trendText=trend?.hasPrevious?`${trend.pct>0?'+':''}${trend.pct.toFixed(1)}%`:'—';
      return`<div class="price-history-row">
        <div class="price-history-row-main"><b>${esc(currency)}</b><span>当前 ${current==null?'—':esc(fmt(current))}</span><span>历史最低 ${trend?esc(fmt(trend.low)):'—'}</span><span>变化 ${esc(trendText)}</span><span>${points.length} 个记录</span></div>
        ${sparkline(points)}
        <div class="price-alert-control"><input type="number" min="0" step="0.01" placeholder="目标价" value="${alertState.alert?.target??''}" data-price-alert-input="${esc(encodeURIComponent(alertState.key))}" data-price-alert-currency="${esc(currency)}"><button type="button" data-price-alert-save="${esc(encodeURIComponent(alertState.key))}" data-price-alert-currency="${esc(currency)}">${alertState.alert?.enabled?'更新提醒':'设置提醒'}</button>${alertState.alert?.enabled?`<button type="button" class="ghost" data-price-alert-clear="${esc(encodeURIComponent(alertState.key))}">取消</button>`:''}</div>
      </div>`;
    }).join('');
    const bestHtml=best?`<div class="price-best-offer"><span>Best Offer</span><b>${esc(money(state.base,best.converted))} 等值</b><small>${esc(money(best.currency,best.amount))} · ${esc(best.source||best.title||'未知来源')}${fx?.date?` · FX ${esc(fx.date)}`:''}</small></div>`:`<div class="price-best-offer muted"><span>Best Offer</span><small>${state.fxLoading?'正在获取汇率…':state.fxError?'汇率不可用，保持币种隔离':'当前没有可安全换算的 ISO 币种价格'}</small></div>`;
    return`<article class="price-history-card" data-price-history-group="${index}"><div class="price-history-card-head"><div><b>${esc(title)}</b><small>${group.length} 个同款来源</small></div>${bestHtml}</div>${historyRows}</article>`;
  }

  function render(){
    const host=document.querySelector('#universalInsights');if(!host)return;
    const mapped=existingIdentityGroups();
    let panel=host.querySelector('[data-price-history-workbench]');
    if(!mapped.length){panel?.remove();state.renderSignature='';return}
    const currencies=[...new Set(mapped.flatMap(x=>groupCurrencies(x.group)).map(canonicalCurrency).filter(Boolean))];
    ensureFx(currencies);
    const fx=fxRates();
    const body=`<section class="price-history-workbench" data-price-history-workbench>
      <div class="price-history-head"><div><span class="price-history-kicker">V9.4 · PRICE INTELLIGENCE</span><b>价格历史与 Best Offer</b><small>价格历史保存在本浏览器；目标价提醒仅在打开搜图 Pro 并检测到新价格时触发。</small></div><label>基准币种<select data-price-base>${BASE_CHOICES.map(c=>`<option value="${c}"${c===state.base?' selected':''}>${c}</option>`).join('')}</select></label></div>
      <div class="price-history-meta">${fx?`汇率：${esc(fx.provider)} · ${esc(fx.date||'latest')}`:state.fxLoading?'正在获取汇率…':state.fxError?`汇率不可用：${esc(state.fxError)}`:'仅比较相同或可安全换算的 ISO 币种'} · 歧义符号 $ / ¥ 不参与跨币种换算</div>
      <div class="price-history-list">${mapped.map((x,i)=>groupCard(x.group,i)).join('')}</div>
    </section>`;
    const signature=`${state.base}|${priceApi()?.state?.updatedAt||0}|${JSON.stringify(state.alerts)}|${JSON.stringify(fx||{})}|${mapped.map(x=>groupKey(x.group)).join(',')}|${Object.values(state.history).reduce((n,r)=>n+(r.points?.length||0),0)}`;
    if(signature===state.renderSignature&&panel)return;
    state.renderSignature=signature;
    if(panel)panel.outerHTML=body;else host.insertAdjacentHTML('afterbegin',body);
  }

  function setBase(base){
    const next=String(base||'').toUpperCase();if(!BASE_CHOICES.includes(next)||next===state.base)return;
    state.base=next;localStorage.setItem(BASE_KEY,next);state.fxError='';state.renderSignature='';scheduleSync();
  }
  function saveAlert(key,currency,target){
    if(!(target>0))return false;
    state.alerts[key]={enabled:true,currency,target,createdAt:state.alerts[key]?.createdAt||Date.now(),updatedAt:Date.now(),lastTriggeredAmount:null,lastTriggeredAt:0,lastObservedAmount:null,lastObservedAt:0};saveAlerts();state.renderSignature='';notify('降价提醒已保存',`${money(currency,target)} · 打开搜图 Pro 时检测`);scheduleSync();return true;
  }
  function clearAlert(key){delete state.alerts[key];saveAlerts();state.renderSignature='';scheduleSync();notify('降价提醒已取消','该目标价不再检测。')}
  function clearHistory(){state.history={};writeJson(HISTORY_KEY,state.history);state.renderSignature='';scheduleSync()}

  document.addEventListener('change',event=>{
    const select=event.target.closest?.('[data-price-base]');if(select)setBase(select.value);
  });
  document.addEventListener('click',event=>{
    const save=event.target.closest?.('[data-price-alert-save]');
    if(save){
      event.preventDefault();event.stopPropagation();
      const key=decodeURIComponent(save.dataset.priceAlertSave||''),currency=save.dataset.priceAlertCurrency||'';
      const input=document.querySelector(`[data-price-alert-input="${CSS.escape(encodeURIComponent(key))}"]`);const target=Number(input?.value);
      if(!saveAlert(key,currency,target))notify('目标价无效','请输入大于 0 的价格。');return;
    }
    const clear=event.target.closest?.('[data-price-alert-clear]');
    if(clear){event.preventDefault();event.stopPropagation();clearAlert(decodeURIComponent(clear.dataset.priceAlertClear||''))}
  },true);

  const style=document.createElement('style');style.textContent=`
    .price-history-workbench{display:grid;gap:10px;margin:0 0 12px;padding:12px;border:1px solid var(--line);border-radius:12px;background:var(--panel)}
    .price-history-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}.price-history-head>div{display:grid;gap:3px}.price-history-head>b{font-size:12px}.price-history-head small,.price-history-meta{font-size:9px;color:var(--muted);line-height:1.5}.price-history-kicker{font-size:8px;letter-spacing:.08em;color:var(--muted)}
    .price-history-head label{display:flex;align-items:center;gap:6px;font-size:9px;color:var(--muted)}.price-history-head select{border:1px solid var(--line);border-radius:7px;background:var(--panel-subtle);color:var(--text);padding:5px 7px}
    .price-history-list{display:grid;gap:8px}.price-history-card{display:grid;gap:8px;padding:10px;border:1px solid var(--line);border-radius:10px;background:var(--panel-subtle)}.price-history-card-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.price-history-card-head>div:first-child{display:grid;gap:2px}.price-history-card-head small{font-size:8px;color:var(--muted)}
    .price-best-offer{display:grid;text-align:right;gap:1px}.price-best-offer span{font-size:7px;letter-spacing:.08em;color:var(--muted);text-transform:uppercase}.price-best-offer b{font-size:11px}.price-best-offer small{font-size:8px}.price-best-offer.muted{max-width:240px}
    .price-history-row{display:grid;grid-template-columns:minmax(0,1fr) 150px auto;gap:10px;align-items:center;padding-top:7px;border-top:1px solid var(--line)}.price-history-row-main{display:flex;flex-wrap:wrap;gap:5px 9px;align-items:center}.price-history-row-main b{font-size:10px}.price-history-row-main span{font-size:8px;color:var(--muted)}.price-history-spark{width:150px;height:34px;color:var(--text-2)}
    .price-alert-control{display:flex;gap:5px;align-items:center}.price-alert-control input{width:86px;border:1px solid var(--line);border-radius:7px;background:var(--panel);color:var(--text);padding:5px 6px;font-size:9px}.price-alert-control button{border:1px solid var(--line);border-radius:7px;background:var(--text);color:var(--panel);padding:5px 7px;font-size:8px;cursor:pointer}.price-alert-control button.ghost{background:transparent;color:var(--muted)}
    .price-history-toast{position:fixed;right:18px;bottom:18px;z-index:10000;display:grid;gap:3px;max-width:340px;padding:11px 13px;border:1px solid var(--line);border-radius:10px;background:var(--panel);color:var(--text);box-shadow:0 12px 32px rgba(0,0,0,.2);opacity:0;transform:translateY(8px);pointer-events:none;transition:.18s ease}.price-history-toast.show{opacity:1;transform:none}.price-history-toast b{font-size:10px}.price-history-toast span{font-size:9px;color:var(--muted)}
    @media(max-width:760px){.price-history-head,.price-history-card-head{display:grid}.price-best-offer{text-align:left}.price-history-row{grid-template-columns:1fr}.price-history-spark{width:100%;max-width:240px}.price-alert-control{flex-wrap:wrap}}
  `;document.head.appendChild(style);

  function sync(){
    const api=priceApi();if(!api)return;
    if((api.state?.updatedAt||0)!==state.lastPriceUpdateAt){state.lastPriceUpdateAt=api.state.updatedAt||0;ingest();state.renderSignature=''}
    render();
  }
  function scheduleSync(){clearTimeout(state.syncTimer);state.syncTimer=setTimeout(sync,50)}
  const observer=new MutationObserver(scheduleSync);observer.observe(document.documentElement,{childList:true,subtree:true});
  const readyTimer=setInterval(()=>{if(priceApi()){clearInterval(readyTimer);sync()}},50);setTimeout(()=>clearInterval(readyTimer),10000);

  window.SOUTU_PRICE_HISTORY={state,productKey,groupKey,recordItem,ingest,convertToBase,bestOffer,mergeGroupHistory,setBase,saveAlert,clearAlert,clearHistory,ensureFx,refresh:sync};
})();