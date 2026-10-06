(()=>{
'use strict';
if(window.SOUTU_PRICE_WORKBENCH)return;
const VERSION='V9.5',PREF='soutu-price-workbench-v1',ISO=/^[A-Z]{3}$/,REL=.58,CONF=.7;
const state={sort:'landed',inStockOnly:false,showExcluded:false,groupCurrency:{},signature:'',timer:0,renderedGroups:0,renderedOffers:0,excludedOffers:0};
try{Object.assign(state,JSON.parse(localStorage.getItem(PREF)||'{}')||{})}catch{}
state.groupCurrency=state.groupCurrency&&typeof state.groupCurrency==='object'?state.groupCurrency:{};
const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(Number(n)||0);
const pi=()=>window.SOUTU_PRICE_INTELLIGENCE||null,ph=()=>window.SOUTU_PRICE_HISTORY||null,pr=()=>window.SOUTU_PRICE_RELIABILITY||null;
const url=x=>String(x?.link||x?.url||'').trim(),title=x=>String(x?.title||'Untitled product').trim()||'Untitled product';
const host=x=>{try{return new URL(url(x),location.href).hostname.replace(/^www\./,'')}catch{return String(x?.provider||x?.source||'unknown')}};
const money=(c,n)=>`${esc(c||'—')} ${esc(fmt(n))}`,savePrefs=()=>{try{localStorage.setItem(PREF,JSON.stringify({sort:state.sort,inStockOnly:state.inStockOnly,showExcluded:state.showExcluded,groupCurrency:state.groupCurrency}))}catch{}};

function groups(){
  const a=pi(),h=ph();if(!a||!h)return[];
  const items=a.state?.items||[],multi=a.groups?.(items)||[],used=new Set(multi.flat());
  const singles=items.filter(x=>!used.has(x)&&a.parsePrice?.(x)).map(x=>[x]);
  return [...multi,...singles].map(g=>({group:g,key:g.length>1?h.groupKey(g):h.productKey(g[0]),title:title(g[0])}));
}
function median(v){v=v.filter(Number.isFinite).sort((a,b)=>a-b);if(!v.length)return 0;const m=Math.floor(v.length/2);return v.length%2?v[m]:(v[m-1]+v[m])/2}
function offerRows(group){
  const a=pi(),r=pr();if(!a||!r)return[];
  const rows=group.map(item=>{
    const parsed=a.parsePrice?.(item)||null,parts=r.priceComponents?.(item)||{product:parsed,shipping:null,tax:null,landed:parsed?.amount??null,availability:'unknown'};
    const confidence=a.confidenceFor?.(item,group)||{score:1,basis:'Single source'},reliability=Number(r.sourceReliability?.(item)||0);
    return{item,parsed,parts,confidence,reliability,merchant:host(item),amount:Number(parsed?.amount)||0,currency:String(parsed?.currency||''),anomaly:false,duplicate:false,eligible:false,reasons:[]};
  });
  const by=new Map();for(const row of rows)if(row.parsed){if(!by.has(row.currency))by.set(row.currency,[]);by.get(row.currency).push(row)}
  for(const set of by.values()){if(set.length<3)continue;const m=median(set.map(x=>x.amount));for(const row of set)row.anomaly=m>0&&(row.amount<m/8||row.amount>m*8||(m>=20&&row.amount<1))}
  for(const row of rows){
    if(!row.parsed)row.reasons.push('未识别到商品价');
    if(row.parsed&&['list','monthly','saving'].includes(row.parsed.kind))row.reasons.push('非当前商品售价');
    if(row.anomaly)row.reasons.push('异常价格');
    if(row.confidence.score<CONF)row.reasons.push('同款置信度不足');
    if(row.reliability<REL)row.reasons.push('来源可靠度不足');
    if(row.parts.availability==='out-of-stock')row.reasons.push('缺货');
    row.eligible=row.reasons.length===0;
  }
  const merchants=new Map();
  for(const row of rows.filter(x=>x.eligible)){
    const k=`${row.currency}|${row.merchant}`,old=merchants.get(k),landed=Number(row.parts.landed)||row.amount,oldLanded=Number(old?.parts?.landed)||old?.amount||Infinity;
    if(!old||row.reliability>old.reliability+.03||(Math.abs(row.reliability-old.reliability)<=.03&&landed<oldLanded)){
      if(old){old.duplicate=true;old.eligible=false;old.reasons.push('同商家重复报价')}
      merchants.set(k,row);
    }else{row.duplicate=true;row.eligible=false;row.reasons.push('同商家重复报价')}
  }
  return rows;
}
function grade(s){return s>=.92?'A+':s>=.85?'A':s>=.76?'B':s>=REL?'C':'D'}
function sorted(rows){
  const a=[...rows];
  if(state.sort==='reliability')return a.sort((x,y)=>y.reliability-x.reliability||(Number(x.parts.landed)||x.amount)-(Number(y.parts.landed)||y.amount));
  if(state.sort==='product')return a.sort((x,y)=>x.amount-y.amount);
  if(state.sort==='merchant')return a.sort((x,y)=>x.merchant.localeCompare(y.merchant));
  return a.sort((x,y)=>(Number(x.parts.landed)||x.amount)-(Number(y.parts.landed)||y.amount)||y.reliability-x.reliability);
}
function visible(rows){return sorted(rows).filter(x=>(state.showExcluded||x.eligible)&&(!state.inStockOnly||x.parts.availability==='in-stock'))}
function bestOffer(rows){
  const h=ph();let best=null;if(!h)return null;
  for(const row of rows.filter(x=>x.eligible&&ISO.test(x.currency))){
    const landed=Number(row.parts.landed)||row.amount,converted=h.convertToBase?.(landed,row.currency);if(converted==null)continue;
    if(!best||converted<best.converted)best={row,landed,converted};
  }
  return best;
}
function identity(item){
  const id=pi()?.identity?.(item)||{};
  return [id.gtin&&`GTIN ${id.gtin}`,id.asin&&`ASIN ${id.asin}`,id.brand&&`Brand ${id.brand}`,id.mpn&&`MPN ${id.mpn}`,id.model&&`Model ${id.model}`].filter(Boolean).slice(0,4);
}
function selectedCurrency(meta,rows){
  const all=[...new Set(rows.filter(x=>x.eligible).map(x=>x.currency).filter(Boolean))],selected=state.groupCurrency[meta.key];
  return all.includes(selected)?selected:(all[0]||'USD');
}
function badge(t,k=''){return`<span class="pwb-badge ${k}">${esc(t)}</span>`}
function rowHtml(row){
  const p=row.parts||{},landed=Number(p.landed)||null,stock=p.availability==='in-stock'?'有货':p.availability==='out-of-stock'?'缺货':'库存未知';
  const href=url(row.item)?(pr()?.canonicalUrl?.(url(row.item))||url(row.item)):'';
  return`<tr data-wb-offer data-eligible="${row.eligible}" data-stock="${esc(p.availability||'unknown')}">
  <td><b>${esc(row.merchant)}</b><small>${esc(title(row.item))}</small></td><td>${row.parsed?money(row.currency,row.amount):'—'}</td>
  <td>${p.shipping!=null?money(row.currency,p.shipping):'—'}</td><td>${p.tax!=null?money(row.currency,p.tax):'—'}</td><td><b>${landed!=null?money(row.currency,landed):'—'}</b></td>
  <td><b>${grade(row.reliability)}</b> <small>${Math.round(row.reliability*100)}%</small></td><td>${badge(stock,p.availability==='in-stock'?'good':p.availability==='out-of-stock'?'bad':'')}</td>
  <td>${badge(row.confidence.basis||row.confidence.level||'Evidence',row.confidence.score>=CONF?'good':'warn')}<small>${esc(row.reasons.join(' · ')||'可信报价')}</small></td>
  <td>${href?`<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">打开来源</a>`:''}</td></tr>`;
}
function groupHtml(meta,index){
  const rows=offerRows(meta.group),ok=rows.filter(x=>x.eligible),excluded=rows.length-ok.length,merchantCount=new Set(ok.map(x=>`${x.currency}|${x.merchant}`)).size,best=bestOffer(rows);
  const currency=selectedCurrency(meta,rows),points=ph()?.mergeGroupHistory?.(meta.group,currency)||[],low=points.length?Math.min(...points.map(x=>Number(x.amount)).filter(Number.isFinite)):null;
  const current=ok.filter(x=>x.currency===currency).length?Math.min(...ok.filter(x=>x.currency===currency).map(x=>x.amount)):null;
  const currencies=[...new Set(ok.map(x=>x.currency).filter(Boolean))],alertKey=`${meta.key}::${currency}`,alert=ph()?.state?.alerts?.[alertKey],shown=visible(rows),ids=identity(meta.group[0]);
  const bestBlock=best?`<div><span>最佳到手价</span><b>${money(ph().state.base,best.converted)}</b><small>${money(best.row.currency,best.landed)} · ${esc(best.row.merchant)} · 可靠度 ${Math.round(best.row.reliability*100)}%</small></div>`:`<div><span>最佳到手价</span><b>—</b><small>暂无可安全比较的可信报价</small></div>`;
  const alertControl=currencies.length?`<div class="pwb-alert"><select data-wb-alert-currency="${esc(meta.key)}">${currencies.map(c=>`<option value="${esc(c)}"${c===currency?' selected':''}>${esc(c)}</option>`).join('')}</select><input data-wb-alert-input type="number" min="0" step="0.01" placeholder="目标价" value="${alert?.target??''}"><button data-wb-alert-save="${esc(meta.key)}">${alert?.enabled?'更新提醒':'设置提醒'}</button>${alert?.enabled?`<button class="ghost" data-wb-alert-clear="${esc(meta.key)}">取消</button>`:''}</div>`:'<small>暂无可信币种</small>';
  return`<article class="pwb-group" data-wb-group="${index}" data-wb-key="${esc(meta.key)}">
  <header><div><b>${String(index+1).padStart(2,'0')} · ${esc(meta.title)}</b><small>${ids.map(esc).join(' · ')||`稳定身份键 ${esc(meta.key)}`}</small></div><div>${badge(`${ok.length} 可信报价`,'good')}${badge(`${merchantCount} 商家`)}${excluded?badge(`${excluded} 已排除`,'warn'):''}</div></header>
  <div class="pwb-overview">${bestBlock}<div><span>${esc(currency)} 商品价历史</span><b>${low==null?'—':money(currency,low)}</b><small>当前 ${current==null?'—':money(currency,current)} · ${points.length} 条可信记录</small></div><div><span>目标价提醒</span>${alertControl}</div></div>
  <div class="pwb-table"><table><thead><tr><th>来源</th><th>商品价</th><th>运费</th><th>税费</th><th>到手价</th><th>可靠度</th><th>库存</th><th>证据 / 状态</th><th></th></tr></thead><tbody>${shown.length?shown.map(rowHtml).join(''):'<tr><td colspan="9">当前筛选条件下没有报价</td></tr>'}</tbody></table></div>
  </article>`;
}
function render(){
  const host=$('#universalInsights'),h=ph(),a=pi(),r=pr();if(!host||!h||!a||!r)return;
  const metas=groups();if(!metas.length){host.querySelector('[data-price-workbench-v95]')?.remove();state.signature='';return}
  host.classList.remove('hidden');
  const currencies=[...new Set(metas.flatMap(m=>offerRows(m.group).filter(x=>x.eligible).map(x=>x.currency)).filter(c=>ISO.test(c)))];h.ensureFx?.(currencies)?.then?.(()=>schedule());
  const all=metas.flatMap(m=>offerRows(m.group)),ok=all.filter(x=>x.eligible),excluded=all.length-ok.length,merchants=new Set(ok.map(x=>x.merchant)).size,history=Object.values(h.state.history||{}).reduce((n,x)=>n+(x?.points?.length||0),0);
  const sig=[a.state?.updatedAt||0,h.state.base,JSON.stringify(h.state.alerts||{}),history,state.sort,state.inStockOnly,state.showExcluded,JSON.stringify(state.groupCurrency),r.state?.lastRefreshAt||0].join('|');
  const old=host.querySelector('[data-price-workbench-v95]');if(old&&sig===state.signature)return;state.signature=sig;
  const body=`<section class="price-wb" data-price-workbench-v95><div class="pwb-head"><div><span>${VERSION} · PRICE INTELLIGENCE WORKBENCH</span><h3>价格调查工作台</h3><p>统一查看商品价、运费、税费、到手价、库存、来源可靠度、同款证据与历史价格。</p></div><div class="pwb-controls">
  <label>基准币种<select data-wb-base>${['USD','EUR','CNY','GBP','JPY','CAD','AUD','CHF'].map(c=>`<option value="${c}"${c===h.state.base?' selected':''}>${c}</option>`).join('')}</select></label>
  <label>排序<select data-wb-sort><option value="landed"${state.sort==='landed'?' selected':''}>到手价</option><option value="reliability"${state.sort==='reliability'?' selected':''}>可靠度</option><option value="product"${state.sort==='product'?' selected':''}>商品价</option><option value="merchant"${state.sort==='merchant'?' selected':''}>商家</option></select></label>
  <label><input type="checkbox" data-wb-stock${state.inStockOnly?' checked':''}>仅看有货</label><button class="ghost" data-wb-excluded>${state.showExcluded?'隐藏排除样本':'查看排除样本'}</button></div></div>
  <div class="pwb-kpis"><div><span>同款组</span><b>${metas.length}</b></div><div><span>可信报价</span><b>${ok.length}</b></div><div><span>有效商家</span><b>${merchants}</b></div><div><span>已排除样本</span><b>${excluded}</b></div><div><span>历史记录</span><b>${history}</b></div></div>
  <p class="pwb-note">Best Offer 优先比较到手价；低可靠度、缺货、异常价格、低同款置信度与同商家重复报价默认隐藏。</p><div class="pwb-groups">${metas.map(groupHtml).join('')}</div></section>`;
  if(old)old.outerHTML=body;else host.insertAdjacentHTML('afterbegin',body);
  state.renderedGroups=metas.length;state.renderedOffers=ok.length;state.excludedOffers=excluded;
}
function schedule(){clearTimeout(state.timer);state.timer=setTimeout(render,80)}
document.addEventListener('change',e=>{
  const base=e.target.closest?.('[data-wb-base]');if(base){ph()?.setBase?.(base.value);schedule();return}
  const sort=e.target.closest?.('[data-wb-sort]');if(sort){state.sort=sort.value;savePrefs();state.signature='';schedule();return}
  const stock=e.target.closest?.('[data-wb-stock]');if(stock){state.inStockOnly=stock.checked;savePrefs();state.signature='';schedule();return}
  const cur=e.target.closest?.('[data-wb-alert-currency]');if(cur){state.groupCurrency[cur.dataset.wbAlertCurrency]=cur.value;savePrefs();state.signature='';schedule()}
});
document.addEventListener('click',e=>{
  const ex=e.target.closest?.('[data-wb-excluded]');if(ex){state.showExcluded=!state.showExcluded;savePrefs();state.signature='';schedule();return}
  const save=e.target.closest?.('[data-wb-alert-save]');if(save){const g=save.closest('[data-wb-group]'),k=save.dataset.wbAlertSave,c=state.groupCurrency[k]||g?.querySelector('[data-wb-alert-currency]')?.value,t=Number(g?.querySelector('[data-wb-alert-input]')?.value);if(c&&t>0)ph()?.saveAlert?.(`${k}::${c}`,c,t);schedule();return}
  const clear=e.target.closest?.('[data-wb-alert-clear]');if(clear){const g=clear.closest('[data-wb-group]'),k=clear.dataset.wbAlertClear,c=state.groupCurrency[k]||g?.querySelector('[data-wb-alert-currency]')?.value;if(c)ph()?.clearAlert?.(`${k}::${c}`);schedule()}
});
const style=document.createElement('style');style.id='soutu-price-workbench-style';style.textContent=`
.price-history-workbench{display:none!important}.price-wb{display:grid;gap:12px;margin-bottom:14px;padding:14px;border:1px solid var(--line);border-radius:14px;background:var(--panel)}
.pwb-head{display:flex;justify-content:space-between;gap:16px}.pwb-head h3{margin:3px 0 4px;font-size:16px}.pwb-head p,.pwb-head span,.pwb-note{font-size:8px;color:var(--muted);line-height:1.6}.pwb-controls{display:flex;gap:6px;align-items:center;flex-wrap:wrap}.pwb-controls label,.pwb-alert{display:flex;gap:5px;align-items:center;font-size:8px;color:var(--muted)}.pwb-controls select,.pwb-alert select,.pwb-alert input{border:1px solid var(--line);border-radius:7px;background:var(--panel-subtle);color:var(--text);padding:5px 7px;font-size:8px}.pwb-controls button,.pwb-alert button{border:1px solid var(--line);border-radius:7px;background:var(--text);color:var(--panel);padding:5px 7px;font-size:8px;cursor:pointer}.ghost{background:transparent!important;color:var(--muted)!important}
.pwb-kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}.pwb-kpis>div,.pwb-overview>div{display:grid;gap:2px;padding:8px;border:1px solid var(--line);border-radius:9px;background:var(--panel-subtle)}.pwb-kpis span,.pwb-overview span{font-size:7px;color:var(--muted)}.pwb-kpis b{font-size:14px}.pwb-note{margin:0;padding:7px 9px;border:1px dashed var(--line);border-radius:8px}.pwb-groups{display:grid;gap:9px}.pwb-group{display:grid;gap:8px;padding:10px;border:1px solid var(--line);border-radius:10px;background:var(--panel-subtle)}.pwb-group header{display:flex;justify-content:space-between;gap:10px}.pwb-group header>div{display:flex;gap:5px;flex-wrap:wrap}.pwb-group header>div:first-child{display:grid}.pwb-group header b{font-size:10px}.pwb-group header small,.pwb-overview small{font-size:7px;color:var(--muted)}.pwb-badge{display:inline-flex;padding:3px 6px;border:1px solid var(--line);border-radius:999px;font-size:7px;color:var(--muted)}.pwb-badge.good{color:var(--text)}.pwb-badge.warn{border-style:dashed}.pwb-badge.bad{text-decoration:line-through}
.pwb-overview{display:grid;grid-template-columns:1fr 1fr 1.3fr;gap:6px}.pwb-overview b{font-size:12px}.pwb-table{overflow:auto;border:1px solid var(--line);border-radius:8px;background:var(--panel)}.pwb-table table{width:100%;min-width:850px;border-collapse:collapse}.pwb-table th,.pwb-table td{padding:6px 7px;border-bottom:1px solid var(--line);font-size:8px;text-align:left;vertical-align:middle}.pwb-table th{font-size:7px;color:var(--muted)}.pwb-table td:first-child{max-width:190px}.pwb-table td small{display:block;margin-top:2px;font-size:7px;color:var(--muted)}.pwb-table a{color:var(--text);white-space:nowrap}
@media(max-width:850px){.pwb-head,.pwb-group header{display:grid}.pwb-kpis{grid-template-columns:repeat(2,1fr)}.pwb-overview{grid-template-columns:1fr}}`;document.head.appendChild(style);
const observer=new MutationObserver(schedule);observer.observe(document.documentElement,{childList:true,subtree:true});
const ready=setInterval(()=>{if(pi()&&ph()&&pr()){clearInterval(ready);render()}},50);setTimeout(()=>clearInterval(ready),10000);
window.SOUTU_PRICE_WORKBENCH={VERSION,state,render,offerRows,bestOffer,grade,groups};
})();