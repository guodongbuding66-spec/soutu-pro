(()=>{
  'use strict';
  if(window.SOUTU_PRICE_INTELLIGENCE)return;

  const state={
    items:[],
    sources:{media:[],product:[]},
    updatedAt:0,
    sessionId:0,
    sessionFingerprint:'',
    ignoredResponses:0,
    sessionStartedAt:0
  };
  const moneyCodes=['USD','EUR','GBP','CNY','RMB','JPY','CAD','AUD','CHF','HKD','SGD','KRW','INR','BRL','MXN'];
  const trustedThreshold=.7;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=v=>String(v||'').normalize('NFKC').toUpperCase().replace(/[^A-Z0-9]+/g,'');
  const fmt=n=>new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(n);

  function gtinValid(v=''){
    const s=String(v).replace(/\D/g,'');
    if(![8,12,13,14].includes(s.length))return false;
    let sum=0,weight=3;
    for(let i=s.length-2;i>=0;i--){sum+=Number(s[i])*weight;weight=weight===3?1:3}
    return (10-(sum%10))%10===Number(s.at(-1));
  }
  function labelled(text,label,max=64){
    const m=String(text||'').match(new RegExp(`(?:${label})\\s*[:#\\-]?\\s*([^|\\n,;]{2,${max}})`,'i'));
    return (m?.[1]||'').trim();
  }
  function identity(item){
    const src=item.product||{},meta=item.meta||{},text=[item.title,item.snippet,src.brand,src.model,src.mpn,src.asin,src.gtin,src.ean,src.upc,meta.brand,meta.model,meta.mpn,meta.asin,meta.gtin,meta.ean,meta.upc].filter(Boolean).join(' ');
    const brand=String(src.brand?.name||src.brand||meta.brand||labelled(text,'BRAND|品牌|MANUFACTURER|MAKER|制造商',48)).trim().replace(/[.,;:]+$/,'');
    const model=String(src.model||meta.model||labelled(text,'MODEL|型号',48)).trim().replace(/[.,;:]+$/,'');
    const mpn=String(src.mpn||meta.mpn||labelled(text,'MPN',48)).trim().replace(/[.,;:]+$/,'');
    const asin=(String(src.asin||meta.asin||labelled(text,'ASIN',16)).match(/B0[A-Z0-9]{8}/i)||[])[0]?.toUpperCase()||'';
    const candidates=[src.gtin,src.ean,src.upc,meta.gtin,meta.ean,meta.upc,...(text.match(/\b\d{8}\b|\b\d{12,14}\b/g)||[])].map(v=>String(v||'').replace(/\D/g,'')).filter(gtinValid);
    const gtin=candidates[0]||'';
    return {brand,model,mpn,asin,gtin};
  }

  function currency(raw='',hint=''){
    const h=String(hint||'').toUpperCase(),txt=String(raw||'');
    if(moneyCodes.includes(h))return h==='RMB'?'CNY':h;
    for(const code of moneyCodes){if(new RegExp(`\\b${code}\\b`,'i').test(txt))return code==='RMB'?'CNY':code}
    if(/US\$/i.test(txt))return'USD';
    if(/CA\$/i.test(txt))return'CAD';
    if(/AU\$/i.test(txt))return'AUD';
    if(/€/.test(txt))return'EUR';
    if(/£/.test(txt))return'GBP';
    if(/₹/.test(txt))return'INR';
    if(/₩/.test(txt))return'KRW';
    if(/R\$/i.test(txt))return'BRL';
    if(/¥/.test(txt))return'¥';
    if(/\$/.test(txt))return'$';
    return h||'';
  }
  function amount(raw){
    if(typeof raw==='number'&&Number.isFinite(raw)&&raw>0)return raw;
    let s=String(raw||'').normalize('NFKC').replace(/[\s'’`]/g,'').trim();
    s=s.replace(/([.,])-+$/,'$1').replace(/,-$/,'').replace(/\.-$/,'').replace(/[^0-9.,-]/g,'');
    if(!s)return 0;
    if(/^[-]?[.,]\d{1,2}$/.test(s))s=s.replace(',','.');
    const lastDot=s.lastIndexOf('.'),lastComma=s.lastIndexOf(',');
    if(lastDot>=0&&lastComma>=0){
      const decimal=lastDot>lastComma?'.':',';
      const group=decimal==='.'?',':'.';
      s=s.split(group).join('');
      if(decimal===',')s=s.replace(',','.');
    }else if(lastComma>=0){
      const tail=s.length-lastComma-1;
      if(tail===1||tail===2)s=s.replace(/\./g,'').replace(',','.');else s=s.replace(/,/g,'');
    }else if(lastDot>=0){
      const tail=s.length-lastDot-1;
      if(!(tail===1||tail===2))s=s.replace(/\./g,'');
    }
    const n=Number(s);return Number.isFinite(n)&&n>0?n:0;
  }
  function priceCandidates(raw,hint=''){
    if(typeof raw==='number'){
      const c=currency('',hint),n=amount(raw);return n&&c?[{raw:String(raw),amount:n,currency:c,kind:'standard',context:''}]:[];
    }
    const text=String(raw||'').normalize('NFKC');
    if(!text.trim())return[];
    const code='(?:US\\$|CA\\$|AU\\$|R\\$|USD|EUR|GBP|CNY|RMB|JPY|CAD|AUD|CHF|HKD|SGD|KRW|INR|BRL|MXN|[$€£¥₹₩])';
    const num="(?:\\d{1,3}(?:[\\s,.'’]\\d{3})+(?:[.,]\\d{1,2})?|\\d+(?:[.,]\\d{1,2})?|[.,]\\d{1,2})(?:,-)?";
    const re=new RegExp(`(?:${code}\\s*${num}|${num}\\s*${code})`,'gi');
    const out=[];let m;
    while((m=re.exec(text))){
      const start=m.index,end=start+m[0].length,before=text.slice(Math.max(0,start-28),start),after=text.slice(end,Math.min(text.length,end+24));
      const monthly=/(?:\/\s*(?:mo|month)|per\s+month|monthly|每月|月供|\/月|分期)/i.test(`${m[0]} ${after}`);
      const saving=/(?:save|coupon|优惠券|立减|节省|省)\s*(?:up\s+to\s*)?[:：-]?\s*$/i.test(before)||/^\s*(?:off|折扣)/i.test(after);
      const list=/(?:msrp|list\s*price|was|原价|建议零售价)\s*[:：-]?\s*$/i.test(before);
      const sale=/(?:sale|now|current\s*price|deal|our\s*price|售价|现价|到手价|促销价)\s*[:：-]?\s*$/i.test(before);
      const n=amount(m[0]),c=currency(m[0],hint);
      if(n&&c)out.push({raw:m[0],amount:n,currency:c,kind:monthly?'monthly':saving?'saving':sale?'sale':list?'list':'standard',context:`${before}${m[0]}${after}`});
    }
    if(!out.length&&hint){
      const n=amount(text),c=currency(text,hint);if(n&&c)out.push({raw:text,amount:n,currency:c,kind:'standard',context:text});
    }
    return out;
  }
  function choosePrice(raw,hint=''){
    const candidates=priceCandidates(raw,hint);
    const usable=candidates.filter(x=>!['monthly','saving'].includes(x.kind));
    if(!usable.length)return null;
    return usable.find(x=>x.kind==='sale')||usable.find(x=>x.kind==='standard')||usable[0];
  }
  function price(item){
    const src=item.product||{},meta=item.meta||{};
    let raw=item.price??src.price??meta.price??'';
    const hint=item.currency??src.currency??meta.currency??'';
    if(raw===''||raw==null){
      const text=[item.title,item.snippet].filter(Boolean).join(' ');
      const picked=choosePrice(text,hint);return picked?{raw:picked.raw,amount:picked.amount,currency:picked.currency,kind:picked.kind}:null;
    }
    const picked=choosePrice(raw,hint);return picked?{raw:picked.raw,amount:picked.amount,currency:picked.currency,kind:picked.kind}:null;
  }

  function itemTitle(x){return String(x.title||'').trim()}
  function itemUrl(x){return String(x.link||x.url||'').trim()}
  function titleWords(x){return new Set(String(itemTitle(x)||'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim().split(/\s+/).filter(w=>w.length>1))}
  function titleSimilarity(a,b){
    const A=titleWords(a),B=titleWords(b);if(!A.size||!B.size)return 0;let hit=0;for(const x of A)if(B.has(x))hit++;return (2*hit)/(A.size+B.size);
  }
  function matchBasis(a,b){
    const A=identity(a),B=identity(b),eq=(x,y)=>x&&y&&norm(x)===norm(y);
    if(A.gtin&&B.gtin&&!eq(A.gtin,B.gtin))return null;
    if(eq(A.gtin,B.gtin))return'GTIN';
    if(eq(A.asin,B.asin))return'ASIN';
    if(eq(A.brand,B.brand)&&eq(A.mpn,B.mpn))return'Brand + MPN';
    if(eq(A.brand,B.brand)&&eq(A.model,B.model))return'Brand + Model';
    if(eq(A.mpn,B.mpn))return'MPN';
    return null;
  }
  function relation(a,b){
    const au=itemUrl(a),bu=itemUrl(b);if(au&&bu&&au===bu)return{level:'exact-url',score:1,basis:'Exact URL'};
    const A=identity(a),B=identity(b),eq=(x,y)=>x&&y&&norm(x)===norm(y);
    if(A.gtin&&B.gtin&&!eq(A.gtin,B.gtin))return{level:'conflict',score:0,basis:'GTIN conflict'};
    if(eq(A.gtin,B.gtin))return{level:'gtin',score:.99,basis:'GTIN'};
    if(eq(A.asin,B.asin))return{level:'asin',score:.97,basis:'ASIN'};
    if(eq(A.brand,B.brand)&&eq(A.mpn,B.mpn))return{level:'brand-mpn',score:.94,basis:'Brand + MPN'};
    if(eq(A.brand,B.brand)&&eq(A.model,B.model))return{level:'brand-model',score:.9,basis:'Brand + Model'};
    if(eq(A.mpn,B.mpn))return{level:'mpn',score:.84,basis:'MPN'};
    const at=norm(itemTitle(a)),bt=norm(itemTitle(b));if(at&&bt&&at===bt)return{level:'title',score:.74,basis:'Normalized title'};
    const sim=titleSimilarity(a,b);if(sim>=.82)return{level:'fuzzy-title',score:.55,basis:'Fuzzy title'};
    return{level:'weak',score:.35,basis:'Weak match'};
  }
  function confidenceFor(item,items){
    if(items.length<=1)return{level:'single',score:1,basis:'Single source'};
    let best={level:'weak',score:.35,basis:'Weak match'};
    for(const other of items){if(other===item)continue;const r=relation(item,other);if(r.score>best.score)best=r}
    return best;
  }
  function groups(items){
    const n=items.length,parent=Array.from({length:n},(_,i)=>i),root=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i]}return i};
    const gtins=items.map(x=>{const g=identity(x).gtin;return new Set(g?[g]:[])});
    const merge=(i,j)=>{let a=root(i),b=root(j);if(a===b)return;const ga=gtins[a],gb=gtins[b];if(ga.size&&gb.size&&![...ga].some(x=>gb.has(x)))return;parent[b]=a;gtins[a]=new Set([...ga,...gb])};
    for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)if(matchBasis(items[i],items[j]))merge(i,j);
    const out=new Map();for(let i=0;i<n;i++){const r=root(i);if(!out.has(r))out.set(r,[]);out.get(r).push(items[i])}
    return [...out.values()].filter(g=>g.length>1);
  }
  function domain(item){try{return new URL(item.link||item.url||'').hostname.replace(/^www\./,'')}catch{return''}}
  function median(values){const v=[...values].sort((a,b)=>a-b),m=Math.floor(v.length/2);return v.length%2?v[m]:(v[m-1]+v[m])/2}
  function markAnomalies(entries){
    if(entries.length<3)return entries.map(x=>({...x,anomaly:false}));
    const baseline=median(entries.map(x=>x.amount));
    return entries.map(x=>({...x,anomaly:baseline>0&&(x.amount<baseline/8||x.amount>baseline*8||(baseline>=20&&x.amount<1))}));
  }
  function buckets(items){
    const all=items.map(item=>({item,p:price(item),confidence:confidenceFor(item,items)})).filter(x=>x.p);
    const map=new Map();for(const entry of all){const c=entry.p.currency;if(!map.has(c))map.set(c,[]);map.get(c).push({amount:entry.p.amount,item:entry.item,kind:entry.p.kind,confidence:entry.confidence})}
    return [...map.entries()].map(([currency,rawEntries])=>{
      const flagged=markAnomalies(rawEntries),trusted=flagged.filter(x=>!x.anomaly&&x.kind!=='list'&&x.confidence.score>=trustedThreshold);
      if(!trusted.length)return null;
      trusted.sort((a,b)=>a.amount-b.amount);
      const values=trusted.map(x=>x.amount),min=values[0],max=values.at(-1),mid=median(values),spread=min?((max-min)/min)*100:0,cheapest=trusted[0],highest=trusted.at(-1);
      return{currency,count:trusted.length,totalCount:flagged.length,excludedCount:flagged.length-trusted.length,anomalyCount:flagged.filter(x=>x.anomaly).length,lowConfidenceCount:flagged.filter(x=>x.confidence.score<trustedThreshold).length,listPriceCount:flagged.filter(x=>x.kind==='list').length,min,max,median:mid,spread,cheapest:{amount:cheapest.amount,title:cheapest.item.title||'',domain:domain(cheapest.item),url:itemUrl(cheapest.item),confidence:cheapest.confidence},highest:{amount:highest.amount,title:highest.item.title||'',domain:domain(highest.item),url:itemUrl(highest.item),confidence:highest.confidence}};
    }).filter(Boolean).sort((a,b)=>b.count-a.count||a.currency.localeCompare(b.currency));
  }
  function moneyLabel(b){
    const range=b.min===b.max?fmt(b.min):`${fmt(b.min)}–${fmt(b.max)}`;
    const samples=b.totalCount===b.count?`${b.count} 条可信价格`:`${b.count} 个可信价格 / ${b.totalCount} 个总样本`;
    return `${b.currency} ${range} · ${samples}${b.count>1?` · 中位 ${fmt(b.median)} · 价差 ${Math.round(b.spread)}%`:''}`;
  }

  function rebuildItems(){
    const merged=new Map();
    [...state.sources.media,...state.sources.product].forEach(x=>{
      const key=itemUrl(x)||`${itemTitle(x)}|${String(x.price||x.product?.price||'')}`;
      if(!merged.has(key))merged.set(key,x);else merged.set(key,{...merged.get(key),...x,product:{...(merged.get(key).product||{}),...(x.product||{})}})
    });
    state.items=[...merged.values()];state.updatedAt=Date.now();schedule();
  }
  function beginSession(fingerprint=''){
    state.sessionId+=1;state.sessionFingerprint=norm(fingerprint);state.sessionStartedAt=Date.now();state.sources={media:[],product:[]};state.items=[];state.updatedAt=Date.now();schedule();return state.sessionId;
  }
  function capture(kind,items,meta={}){
    if(meta.sessionId&&meta.sessionId!==state.sessionId){state.ignoredResponses+=1;return false}
    if(!state.sessionId)beginSession(meta.fingerprint||'manual');
    state.sources[kind]=Array.isArray(items)?items:[];rebuildItems();return true;
  }
  function requestFingerprint(url,args){
    try{
      const u=new URL(url,location.href),q=u.searchParams.get('q')||u.searchParams.get('query')||'';if(q)return q;
      const body=args?.[1]?.body;if(typeof body==='string'){try{const j=JSON.parse(body);return j.q||j.query||''}catch{}}
    }catch{}
    return'';
  }
  function requestKind(url){const s=String(url||'');return s.includes('/api/media-search')?'media':s.includes('/api/product-search')?'product':''}
  function ensureRequestSession(fp){
    const f=norm(fp);
    if(!state.sessionId)return beginSession(f);
    if(state.sessionFingerprint&&f&&state.sessionFingerprint!==f)return beginSession(f);
    if(!state.sessionFingerprint&&f)state.sessionFingerprint=f;
    return state.sessionId;
  }
  function bestGroupForButton(button,allGroups){
    const txt=button.textContent||'';let best=null,score=0;
    for(const g of allGroups){const hit=g.reduce((n,x)=>n+(itemTitle(x)&&txt.includes(itemTitle(x))?1:0),0);if(hit>score){score=hit;best=g}}
    return score?best:null;
  }
  function itemForCard(card){
    const href=card.querySelector('.universal-media')?.getAttribute('href')||'';
    if(href){const exact=state.items.find(x=>itemUrl(x)===href);if(exact)return exact}
    const title=card.querySelector('.universal-result-body>b')?.textContent?.trim()||'';
    const matches=state.items.filter(x=>itemTitle(x)===title);
    return matches.length===1?matches[0]:null;
  }
  function augmentIdentityGroups(){
    const insight=document.querySelector('#universalInsights');if(!insight||!insight.textContent.includes('同款候选归组'))return;
    const allGroups=groups(state.items);
    insight.querySelectorAll('[data-identity-group-key]').forEach(button=>{
      const existing=button.querySelector('[data-price-intelligence]');
      const g=bestGroupForButton(button,allGroups),bs=g?buckets(g):[];
      if(!bs.length){existing?.remove();return}
      const div=existing||document.createElement('div');div.className='identity-price-buckets';div.dataset.priceIntelligence='';
      div.innerHTML=bs.map(b=>`<div class="identity-price-bucket" title="不同币种不做直接换算；默认排除低可信、月供、优惠额、原价和异常值"><b>${esc(moneyLabel(b))}</b><small>最低价来源：${esc(b.cheapest.domain||b.cheapest.title||'未知来源')}${b.excludedCount?` · 已排除 ${b.excludedCount} 个低可信/异常样本`:''}</small></div>`).join('');
      if(!existing)button.appendChild(div);
    });
  }
  function augmentResultCards(){
    document.querySelectorAll('.universal-result-card').forEach(card=>{
      const existing=card.querySelector('[data-result-price]');
      const item=itemForCard(card);
      if(!item){existing?.remove();return}
      const p=price(item);
      if(!p||['monthly','saving'].includes(p.kind)){existing?.remove();return}
      const sourceKey=itemUrl(item)||`${itemTitle(item)}|${p.currency}|${p.amount}`;
      const target=card.querySelector('.product-identity-strip')||card.querySelector('.universal-evidence-badges');if(!target)return;
      const el=existing||document.createElement('div');el.className='product-price-strip';el.dataset.resultPrice='';el.dataset.priceSource=sourceKey;el.innerHTML=`<span>${p.kind==='list'?'List price':'Price'}</span><b>${esc(p.currency)} ${esc(fmt(p.amount))}</b>`;
      if(!existing)target.insertAdjacentElement('afterend',el);
    });
  }
  function apply(){augmentResultCards();augmentIdentityGroups()}
  let scheduled=false;
  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;apply()})}

  document.addEventListener('click',event=>{
    const trigger=event.target?.closest?.('#universalSearchBtn,#mediaSearchBtn,#federatedSearchBtn');
    if(trigger)beginSession('');
  },true);

  const originalFetch=window.fetch.bind(window);
  window.fetch=async(...args)=>{
    const input=args[0],url=typeof input==='string'?input:input?.url||'',kind=requestKind(url),fp=kind?requestFingerprint(url,args):'',sessionId=kind?ensureRequestSession(fp):state.sessionId;
    const res=await originalFetch(...args);
    if(kind){
      try{res.clone().json().then(data=>capture(kind,data?.items,{sessionId,fingerprint:fp})).catch(()=>{})}catch{}
    }
    return res;
  };

  const style=document.createElement('style');
  style.textContent=`.identity-price-buckets{display:grid;gap:5px;margin-top:8px}.identity-price-bucket{display:grid;gap:2px;padding:6px 7px;border:1px solid var(--line);border-radius:8px;background:var(--panel-subtle);text-align:left}.identity-price-bucket b{font-size:8px;color:var(--text-2)}.identity-price-bucket small{font-size:8px;color:var(--muted)}.product-price-strip{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:7px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;background:var(--panel-subtle)}.product-price-strip span{font-size:8px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em}.product-price-strip b{font-size:10px}@media(max-width:520px){.identity-price-bucket{width:100%}}`;
  document.head.appendChild(style);

  const observer=new MutationObserver(schedule);observer.observe(document.documentElement,{childList:true,subtree:true});
  window.SOUTU_PRICE_INTELLIGENCE={state,parsePrice:price,priceCandidates,identity,relation,groups,buckets,refresh:apply,capture,beginSession,confidenceFor};
})();
