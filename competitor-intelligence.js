(()=>{
  'use strict';
  if(window.SOUTU_COMPETITOR_INTELLIGENCE)return;

  const state={analysis:null,updatedAt:0,open:false};
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clamp=(n,min=0,max=1)=>Math.max(min,Math.min(max,n));
  const norm=v=>String(v||'').normalize('NFKC').toUpperCase().replace(/[^A-Z0-9]+/g,'');
  const api=()=>window.SOUTU_PRICE_INTELLIGENCE||null;
  const reliabilityApi=()=>window.SOUTU_PRICE_RELIABILITY||null;
  const itemUrl=x=>String(x?.link||x?.url||'').trim();
  const domain=x=>{try{return new URL(itemUrl(x),location.href).hostname.replace(/^www\./,'').toLowerCase()}catch{return''}};
  const identity=x=>api()?.identity?.(x)||{};
  const sourceReliability=x=>clamp(Number(reliabilityApi()?.sourceReliability?.(x)??.5));
  const parsedPrice=x=>api()?.parsePrice?.(x)||null;
  const money=p=>p?`${esc(p.currency||'')} ${new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(p.amount)}`:'';
  const significantWords=text=>new Set(String(text||'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim().split(/\s+/).filter(w=>w.length>2));
  function titleSimilarity(a,b){
    const A=significantWords(a?.title),B=significantWords(b?.title);if(!A.size||!B.size)return 0;
    let hit=0;for(const x of A)if(B.has(x))hit++;
    return (2*hit)/(A.size+B.size);
  }
  function identityStrength(x){
    const id=identity(x);if(id.gtin)return 1;if(id.asin)return .96;if(id.brand&&id.mpn)return .92;if(id.brand&&id.model)return .86;if(id.mpn)return .78;return .25;
  }
  function sameStrong(a,b){
    const r=api()?.relation?.(a,b);return !!r&&['gtin','asin','brand-mpn','brand-model','mpn','exact-url'].includes(r.level);
  }
  function explicitGtinConflict(a,b){
    const A=identity(a),B=identity(b);return !!(A.gtin&&B.gtin&&norm(A.gtin)!==norm(B.gtin));
  }
  function supplierSignal(item){
    const host=domain(item),text=[item?.provider,item?.source,item?.title,item?.snippet,item?.description].filter(Boolean).join(' ');
    const b2b=/\b(?:alibaba|1688|made-in-china|globalsources|global sources|indiamart|dhgate|tradewheel)\b/i.test(`${host} ${text}`);
    const words=/(?:manufacturer|factory|supplier|wholesale|wholesaler|oem|odm|制造商|工厂|厂家|供应商|批发|代工)/i.test(text);
    if(!b2b&&!words)return null;
    let score=.46;const reasons=[];
    if(b2b){score+=.24;reasons.push('B2B / 批发来源')}
    if(words){score+=.16;reasons.push('页面含供应商 / 工厂信号')}
    const id=identity(item);if(id.gtin||id.asin||id.mpn||id.model){score+=.06;reasons.push('有产品身份字段')}
    const rel=sourceReliability(item);score+=Math.max(0,rel-.5)*.18;
    return {score:clamp(score),reasons};
  }
  function chooseReference(items){
    if(!items.length)return null;
    return items.slice().sort((a,b)=>{
      const A=identityStrength(a)*.58+sourceReliability(a)*.3+(parsedPrice(a)?.amount?1:0)*.12;
      const B=identityStrength(b)*.58+sourceReliability(b)*.3+(parsedPrice(b)?.amount?1:0)*.12;
      return B-A;
    })[0];
  }
  function sameProductGroups(items){
    const groups=api()?.groups?.(items)||[];
    return groups.map((members,i)=>{
      const basis=members.length>1?api()?.relation?.(members[0],members[1])?.basis||'Identity':'Identity';
      const confidence=Math.max(...members.map(x=>identityStrength(x)));
      return {id:`same-${i}`,members,basis,confidence};
    }).sort((a,b)=>b.members.length-a.members.length||b.confidence-a.confidence);
  }
  function competitorCandidates(items,reference){
    if(!reference)return[];
    const refId=identity(reference),refPrice=parsedPrice(reference);
    return items.filter(x=>x!==reference&&!sameStrong(reference,x)).map(item=>{
      const id=identity(item),sim=titleSimilarity(reference,item),reasons=[];let score=sim*.54;
      if(refId.brand&&id.brand&&norm(refId.brand)===norm(id.brand)){score+=.18;reasons.push('同品牌')}
      if(sim>=.45)reasons.push(`标题特征相似 ${Math.round(sim*100)}%`);
      const conflict=explicitGtinConflict(reference,item);if(conflict){score+=.08;reasons.push('GTIN 不同：不是同款，可作为竞品')}
      const p=parsedPrice(item);if(refPrice&&p&&refPrice.currency===p.currency){const ratio=Math.min(refPrice.amount,p.amount)/Math.max(refPrice.amount,p.amount);if(ratio>=.45){score+=.09*ratio;reasons.push('价格区间接近')}}
      const rel=sourceReliability(item);score+=Math.max(0,rel-.45)*.15;
      if(identityStrength(item)>=.78){score+=.05;reasons.push('身份字段较完整')}
      return {item,score:clamp(score),reasons,conflict,similarity:sim};
    }).filter(x=>x.score>=.42).sort((a,b)=>b.score-a.score).slice(0,12);
  }
  function supplierCandidates(items){
    return items.map(item=>{const s=supplierSignal(item);return s?{item,...s}:null}).filter(Boolean).sort((a,b)=>b.score-a.score).slice(0,12);
  }
  function analyze(items=api()?.state?.items||[]){
    const clean=[...new Map((items||[]).map(x=>[itemUrl(x)||`${x.title||''}|${x.provider||x.source||''}`,x])).values()];
    const reference=chooseReference(clean);
    const analysis={items:clean,reference,same:sameProductGroups(clean),competitors:competitorCandidates(clean,reference),suppliers:supplierCandidates(clean),generatedAt:Date.now()};
    state.analysis=analysis;state.updatedAt=Date.now();return analysis;
  }
  function identityChips(item){
    const id=identity(item),pairs=[['Brand',id.brand],['Model',id.model],['MPN',id.mpn],['ASIN',id.asin],['GTIN',id.gtin]].filter(([,v])=>v);
    return pairs.slice(0,4).map(([k,v])=>`<span><small>${esc(k)}</small>${esc(v)}</span>`).join('');
  }
  function sourceMeta(item){
    const rel=Math.round(sourceReliability(item)*100),p=parsedPrice(item);return `<div class="ci-meta"><span>${esc(domain(item)||item.provider||item.source||'未知来源')}</span><span>来源可靠 ${rel}%</span>${p?`<b>${money(p)}</b>`:''}</div>`;
  }
  function resultCard(row,kind){
    const item=row.item||row,score=Math.round((row.score??row.confidence??.5)*100),url=itemUrl(item)||'#';
    return `<article class="ci-card ${kind}"><div class="ci-card-head"><span>${kind==='supplier'?'供应商候选':kind==='competitor'?'竞品候选':'同款候选'}</span><strong>${score}%</strong></div><b>${esc(item.title||'未命名结果')}</b>${sourceMeta(item)}<div class="ci-identities">${identityChips(item)}</div>${row.reasons?.length?`<div class="ci-reasons">${row.reasons.map(x=>`<span>${esc(x)}</span>`).join('')}</div>`:''}<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">打开来源</a></article>`;
  }
  function groupCard(group,index){
    return `<article class="ci-group"><div class="ci-group-head"><div><span>同款候选组 ${index+1}</span><b>${group.members.length} 条结果</b></div><strong>${Math.round(group.confidence*100)}%</strong></div><small>依据：${esc(group.basis)} · 强身份字段才允许归为同款</small><div class="ci-group-members">${group.members.slice(0,5).map(x=>resultCard({item:x,confidence:group.confidence},'same')).join('')}</div></article>`;
  }
  function render(){
    const panel=document.querySelector('#competitorIntelligencePanel');if(!panel)return;
    const a=state.analysis||analyze();
    const ref=a.reference,refId=ref?identity(ref):{};
    panel.classList.toggle('hidden',!state.open);if(!state.open)return;
    panel.innerHTML=`<div class="ci-head"><div><span>V9.5 · COMPETITOR & SUPPLIER INTELLIGENCE</span><h4>竞品 / 供应商候选</h4><p>基于现有身份字段、价格、标题特征和来源可靠性；所有弱推断都保留为“候选”。</p></div><div class="ci-head-stats"><b>${a.items.length}</b><span>当前结果</span></div></div>${ref?`<div class="ci-reference"><span>参考商品</span><b>${esc(ref.title||'未命名')}</b><small>${esc([refId.brand,refId.model,refId.mpn,refId.gtin].filter(Boolean).join(' · ')||domain(ref)||'身份字段有限')}</small></div>`:''}<section><div class="ci-section-head"><b>同款候选</b><span>${a.same.length} 组 · GTIN 冲突强制隔离</span></div><div class="ci-groups">${a.same.length?a.same.map(groupCard).join(''):'<div class="ci-empty">没有足够的强身份字段确认同款候选。</div>'}</div></section><section><div class="ci-section-head"><b>竞品候选</b><span>${a.competitors.length} 条</span></div><div class="ci-grid">${a.competitors.length?a.competitors.map(x=>resultCard(x,'competitor')).join(''):'<div class="ci-empty">当前结果没有达到阈值的竞品候选。</div>'}</div></section><section><div class="ci-section-head"><b>供应商候选</b><span>${a.suppliers.length} 条</span></div><div class="ci-grid">${a.suppliers.length?a.suppliers.map(x=>resultCard(x,'supplier')).join(''):'<div class="ci-empty">当前结果没有明确的 B2B / 工厂 / 供应商信号。</div>'}</div></section>`;
  }
  function refresh(){if(state.open){analyze();render()}}
  function install(){
    const button=document.querySelector('#competitorIntelligenceBtn'),panel=document.querySelector('#competitorIntelligencePanel');if(!button||!panel)return false;
    if(button.dataset.ciBound)return true;button.dataset.ciBound='1';
    button.addEventListener('click',()=>{state.open=!state.open;button.classList.toggle('active',state.open);if(state.open)analyze();render()});
    document.addEventListener('click',e=>{if(e.target.closest('#universalSearchBtn,#mediaSearchBtn,#federatedSearchBtn')){state.open=false;button.classList.remove('active');panel.classList.add('hidden')}} ,true);
    return true;
  }

  const style=document.createElement('style');style.textContent=`.competitor-intelligence-panel{margin-top:12px;padding:14px;border:1px solid var(--line);border-radius:14px;background:var(--panel)}.competitor-intelligence-panel.hidden{display:none}.ci-head,.ci-section-head,.ci-group-head,.ci-reference,.ci-meta{display:flex;align-items:center;justify-content:space-between;gap:10px}.ci-head{align-items:flex-start}.ci-head>div:first-child>span{font-size:8px;letter-spacing:.08em;color:var(--muted)}.ci-head h4{margin:3px 0;font-size:14px}.ci-head p{margin:0;color:var(--muted);font-size:9px}.ci-head-stats{text-align:right}.ci-head-stats b{display:block;font-size:20px}.ci-head-stats span,.ci-section-head span,.ci-group small,.ci-reference small{font-size:8px;color:var(--muted)}.ci-reference{margin-top:10px;padding:9px 10px;border:1px solid var(--line);border-radius:10px;background:var(--panel-subtle);justify-content:flex-start;flex-wrap:wrap}.ci-reference>span{font-size:8px;color:var(--muted)}.ci-reference>b{font-size:10px}.ci-reference>small{margin-left:auto}.competitor-intelligence-panel section{margin-top:14px}.ci-section-head{margin-bottom:7px}.ci-section-head b{font-size:10px}.ci-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.ci-groups{display:grid;gap:8px}.ci-group,.ci-card{border:1px solid var(--line);border-radius:11px;padding:9px;background:var(--surface)}.ci-group-head>div{display:grid;gap:2px}.ci-group-head span,.ci-card-head span{font-size:8px;color:var(--muted)}.ci-group-head b{font-size:10px}.ci-group-head strong,.ci-card-head strong{font-size:11px}.ci-group-members{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin-top:7px}.ci-card{display:grid;gap:6px}.ci-card-head{display:flex;justify-content:space-between}.ci-card>b{font-size:10px;line-height:1.35}.ci-meta{justify-content:flex-start;flex-wrap:wrap}.ci-meta span{font-size:8px;color:var(--muted)}.ci-meta b{margin-left:auto;font-size:9px}.ci-identities,.ci-reasons{display:flex;flex-wrap:wrap;gap:4px}.ci-identities span,.ci-reasons span{font-size:8px;border:1px solid var(--line);border-radius:999px;padding:3px 5px;color:var(--muted)}.ci-identities small{margin-right:3px;opacity:.75}.ci-card>a{font-size:8px;font-weight:700;text-decoration:none;color:var(--ink)}.ci-empty{padding:12px;border:1px dashed var(--line);border-radius:10px;color:var(--muted);font-size:9px}.ci-card.supplier{border-style:dashed}@media(max-width:900px){.ci-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:560px){.ci-grid,.ci-group-members{grid-template-columns:1fr}.ci-reference>small{margin-left:0;width:100%}}`;
  document.head.appendChild(style);
  window.SOUTU_COMPETITOR_INTELLIGENCE={state,analyze,refresh,render,titleSimilarity,supplierSignal,competitorCandidates,sameProductGroups};
  if(!install()){const timer=setInterval(()=>{if(install())clearInterval(timer)},80);setTimeout(()=>clearInterval(timer),10000)}
})();