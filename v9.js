(() => {
  'use strict';

  const V9_VERSION = '9.4.4';
  const KEYS = {
    results: 'soutu-pro-v9-results',
    watch: 'soutu-pro-v9-watch',
    cases: 'soutu-pro-v9-cases',
    evidence: 'soutu-pro-v9-evidence',
    weights: 'soutu-pro-v9-weights',
    view: 'soutu-pro-v9-view'
  };
  const DEFAULT_WEIGHTS = { visual: 0.5, structure: 0.3, text: 0.2 };
  const MAX_RESULTS = 180;
  const MAX_AI_RESULTS = 16;

  const read = (k, fallback) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch { return fallback; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };
  const escapeHtml = (v='') => String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const uid = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const bridge = () => window.SOUTU_BRIDGE || null;

  const state = {
    results: read(KEYS.results, []),
    watch: read(KEYS.watch, []),
    cases: read(KEYS.cases, []),
    evidence: read(KEYS.evidence, []),
    weights: {...DEFAULT_WEIGHTS, ...read(KEYS.weights, {})},
    selected: new Set(),
    filter: '',
    domain: 'all',
    mode: read(KEYS.view, 'results'),
    sort: 'score',
    hideDuplicates: false,
    sourceFeatures: null,
    featureCache: new Map(),
    aiModel: null,
    exif: null,
    translation: '',
    importedAt: 0,
  };

  function normalizeWeights(w) {
    const safe = { visual: Math.max(.05, Number(w.visual)||0), structure: Math.max(.05, Number(w.structure)||0), text: Math.max(.05, Number(w.text)||0) };
    const sum = safe.visual + safe.structure + safe.text;
    return { visual: safe.visual/sum, structure: safe.structure/sum, text: safe.text/sum };
  }
  state.weights = normalizeWeights(state.weights);

  function compactResult(r){
    const image=String(r.image||r.thumbnail||'');
    return {...r,
      title:String(r.title||'').slice(0,320),
      snippet:String(r.snippet||'').slice(0,700),
      image:/^https?:/i.test(image)?image:'',
      thumbnail:/^https?:/i.test(String(r.thumbnail||''))?r.thumbnail:'',
      product:r.product&&typeof r.product==='object'?Object.fromEntries(Object.entries(r.product).map(([k,v])=>[k,typeof v==='string'?v.slice(0,500):v])):{}
    };
  }
  function persist() {
    let results=state.results.slice(0, MAX_RESULTS).map(compactResult);
    if(!write(KEYS.results,results)){
      results=results.slice(0,80);
      state.results=results;
      write(KEYS.results,results);
      bridge()?.toast?.('本机存储接近上限','已自动压缩研究结果，原始网页链接仍保留。','error');
    }
    if(!write(KEYS.watch,state.watch.slice(0,100)))write(KEYS.watch,state.watch.slice(0,40));
    if(!write(KEYS.cases,state.cases)||!write(KEYS.evidence,state.evidence))bridge()?.toast?.('证据保存失败','本机存储空间不足；请先导出备份，审核历史不会自动裁剪。','error');
    write(KEYS.weights,state.weights);
    write(KEYS.view,state.mode);
  }

  function root() { return document.querySelector('#v9Root'); }
  function icon(name) { return `<svg aria-hidden="true"><use href="#i-${name}"></use></svg>`; }
  function domainOf(url='') { try { return new URL(url).hostname.replace(/^www\./,''); } catch { return ''; } }
  function canonicalUrl(raw='') {
    try {
      const u = new URL(raw);
      ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','gclid','fbclid','ref','tag'].forEach(k=>u.searchParams.delete(k));
      u.hash='';
      return `${u.origin}${u.pathname}${u.search}`.replace(/\/$/,'');
    } catch { return raw; }
  }
  function tokenSet(text='') {
    return new Set(String(text).toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g,' ').split(/\s+/).filter(x=>x.length>1));
  }
  function jaccard(a,b) {
    const A=tokenSet(a),B=tokenSet(b); if(!A.size||!B.size)return 0;
    let inter=0; A.forEach(x=>{if(B.has(x))inter++});
    return inter/(A.size+B.size-inter);
  }
  function hamming(a='',b='') { if(!a||!b||a.length!==b.length)return 1; let d=0; for(let i=0;i<a.length;i++)if(a[i]!==b[i])d++; return d/a.length; }
  function cosine(a=[],b=[]) { if(!a.length||a.length!==b.length)return 0; let dot=0,aa=0,bb=0; for(let i=0;i<a.length;i++){dot+=a[i]*b[i];aa+=a[i]*a[i];bb+=b[i]*b[i]} return aa&&bb?dot/(Math.sqrt(aa)*Math.sqrt(bb)):0; }
  function clamp01(n){return Math.max(0,Math.min(1,n||0));}
  function scorePct(n){return Math.round(clamp01(n)*100);}
  function fmtDate(ts){try{return new Date(ts).toLocaleString()}catch{return '—'}}

  function proxyUrl(url) { return `/api/image-proxy?url=${encodeURIComponent(url)}`; }
  function remoteImageUrl(result) { return result.image || result.thumbnail || result.product?.image || ''; }

  function renderShell() {
    const el=root(); if(!el)return;
    el.innerHTML=`
      <section class="v9-hero">
        <div><span class="section-kicker">V9 INVESTIGATION HUB</span><h1>图片调查与商品溯源</h1><p>把 Google Lens、Bing、Yandex、商品页和供应商线索重新汇总到一个工作台，自动去重、比较、留证与追踪。</p></div>
        <div class="v9-hero-actions">
          <label class="secondary-btn v9-import">${icon('upload')}导入采集 JSON<input id="v9Import" type="file" accept="application/json,.json" hidden></label>
          <button class="secondary-btn" id="v9SaveCase">${icon('save')}保存调查项目</button>
          <button class="secondary-btn" id="v9ExportJson">${icon('download')}JSON</button>
          <button class="secondary-btn" id="v9ExportXlsx">${icon('grid')}Excel</button>
          <button class="primary-btn" id="v9Print">${icon('download')}报告 / PDF</button>
        </div>
      </section>
      <section class="v9-stats" id="v9Stats"></section>
      <section class="v9-source-card" id="v9Source"></section>
      <section class="v9-toolbar">
        <div class="v9-tabs" role="tablist">
          <button data-v9-mode="results">结果</button><button data-v9-mode="domains">域名聚类</button><button data-v9-mode="timeline">来源时间线</button><button data-v9-mode="watch">价格 / 生命周期</button><button data-v9-mode="graph">品牌关系图</button><button data-v9-mode="evidence">证据</button><button data-v9-mode="cases">调查项目</button>
        </div>
        <div class="v9-controls">
          <input id="v9Filter" placeholder="筛标题、域名、SKU…" autocomplete="off">
          <select id="v9Domain"><option value="all">全部域名</option></select>
          <select id="v9Sort"><option value="score">综合相似度</option><option value="visual">视觉相似度</option><option value="structure">结构相似度</option><option value="resolution">高清原图优先</option><option value="price">价格</option><option value="recent">最近采集</option></select>
          <button class="secondary-btn compact" id="v9AiRank">${icon('sparkles')}AI 重排</button>
          <button class="secondary-btn compact" id="v9Dedupe">${icon('grid')}智能去重</button>
          <button class="secondary-btn compact" id="v9Compare">${icon('origin')}比较选中</button>
        </div>
      </section>
      <section id="v9Body"></section>
      <section class="v9-bottom-grid">
        <article class="v9-panel"><div class="v9-panel-head"><div><span class="section-kicker">INDUSTRIAL MODE</span><h2>工业产品 / CAD 找同款</h2></div></div><p>结构优先比较轮廓、门窗、百叶、加强筋与五金节点；适合工具房、雨棚、温室、花圃和线描图。</p><div class="v9-action-row"><button class="secondary-btn" id="v9Industrial">结构优先</button><button class="secondary-btn" id="v9Edge">生成线稿增强</button><button class="secondary-btn" id="v9Slices">生成搜索切片</button></div><div id="v9Weights" class="v9-weight-row"></div></article>
        <article class="v9-panel"><div class="v9-panel-head"><div><span class="section-kicker">OCR / METADATA</span><h2>文字、品牌与 EXIF</h2></div></div><div id="v9Metadata"></div><div class="v9-translate"><select id="v9TranslateLang"><option value="zh-CN">翻译为中文</option><option value="en">Translate to English</option><option value="es">Español</option><option value="pt">Português</option></select><button class="secondary-btn compact" id="v9Translate">翻译 OCR</button></div><div id="v9Translation" class="v9-translation"></div></article>
      </section>
      <section class="v9-integration"><div><span class="section-kicker">WORKFLOW</span><h2>继续到业务工具</h2><p>把当前商品线索整理成结构化导入包，再进入 AI 外贸工作台继续开发客户。</p></div><div class="v9-action-row"><button class="secondary-btn" id="v9CopyTrade">复制外贸导入包</button><a class="primary-btn" href="https://ai-foreign-trade-os.pages.dev/" target="_blank" rel="noopener noreferrer">打开 AI 外贸工作台 ${icon('arrow-up-right')}</a></div></section>
      <div class="modal-backdrop hidden" id="v9CompareModal"><div class="modal modal-wide v9-compare-modal"><div class="modal-head"><h2>图片与商品对比</h2><button class="icon-btn" id="v9CompareClose" aria-label="关闭">${icon('x')}</button></div><div id="v9CompareBody"></div></div></div>
      <section id="v9PrintReport" class="v9-print-report" aria-hidden="true"></section>
    `;
  }

  function stats() {
    const domains = new Set(state.results.map(r=>r.domain||domainOf(r.url)).filter(Boolean));
    const products=state.results.filter(r=>r.product&&Object.keys(r.product).length).length;
    const prices=state.results.filter(r=>r.price||r.product?.price).length;
    return [
      ['采集结果',state.results.length,'list'],['独立域名',domains.size,'grid'],['商品结构',products,'shopping'],['带价格',prices,'star'],['追踪中',state.watch.length,'clock'],['证据',state.evidence.length,'save']
    ];
  }
  function renderStats(){const el=document.querySelector('#v9Stats');if(!el)return;el.innerHTML=stats().map(([t,n,i])=>`<article>${icon(i)}<div><b>${n}</b><span>${t}</span></div></article>`).join('');}

  function getAnalysis(){return bridge()?.analysis?.()||{};}
  function activeSource(){return bridge()?.source?.()||null;}
  function sourceQuery(){return bridge()?.primaryQuery?.()||'';}

  async function renderSource() {
    const el=document.querySelector('#v9Source'); if(!el)return;
    const src=activeSource(),analysis=getAnalysis();
    if(!src){el.innerHTML=`<div class="v9-empty-inline">${icon('image')}<div><b>当前没有源图片</b><p>回到“搜图”上传图片，或通过浏览器扩展采集结果页。</p></div><button class="secondary-btn" data-nav="search">去上传</button></div>`;return;}
    const brands=brandCandidates(analysis.ocr||'');
    el.innerHTML=`<div class="v9-source-thumb">${src.activeUrl?`<img src="${escapeHtml(src.activeUrl)}" alt="源图片">`:icon('image')}</div><div class="v9-source-main"><span class="section-kicker">SOURCE IMAGE</span><h2>${escapeHtml(src.name||'当前图片')}</h2><p>${escapeHtml(sourceQuery()||'尚未生成主搜索词')}</p><div class="v9-chip-row">${brands.map(x=>`<span>品牌候选 · ${escapeHtml(x)}</span>`).join('')}${(analysis.barcodes||[]).map(x=>`<span>编码 · ${escapeHtml(x)}</span>`).join('')}</div></div><div class="v9-source-actions"><button class="secondary-btn compact" id="v9RefreshSource">刷新源特征</button><button class="secondary-btn compact" id="v9AnalyzeSource">智能分析</button></div>`;
    if(!state.exif) try{state.exif=await parseExif(await bridge()?.blob?.());renderMetadata();}catch{}
  }

  function brandCandidates(text=''){
    const lines=String(text).split(/\n+/).map(x=>x.trim()).filter(Boolean); const out=[];
    for(const line of lines){const clean=line.replace(/[^A-Za-z0-9&+\- .]/g,' ').replace(/\s+/g,' ').trim();if(clean.length<2||clean.length>32)continue;if(/^\d/.test(clean))continue;const upper=(clean.match(/[A-Z]/g)||[]).length;const letters=(clean.match(/[A-Za-z]/g)||[]).length;if(letters>=2&&(upper/letters>.45||clean.split(' ').length<=2))out.push(clean)}
    return [...new Set(out)].slice(0,5);
  }

  function productText(r){const p=r.product||{};return [r.title,r.snippet,p.name,p.brand,p.sku,p.mpn,p.gtin,p.model].filter(Boolean).join(' ')}
  function resultPriceNumber(r){const raw=r.price||r.product?.price||'';const m=String(raw).replace(/,/g,'').match(/-?\d+(?:\.\d+)?/);return m?Number(m[0]):0;}
  function resultDate(r){const raw=r.date||r.published||r.capturedAt;const t=raw?Date.parse(raw)||Number(raw):0;return Number.isFinite(t)?t:0;}
  function dedupeBasic(items){const seen=new Set();return items.filter(r=>{const k=`${canonicalUrl(r.url)}|${String(r.title||'').toLowerCase().replace(/\s+/g,' ').slice(0,120)}`;if(seen.has(k))return false;seen.add(k);return true;});}
  function filteredResults(){
    let list=state.results.slice();const q=state.filter.toLowerCase().trim();
    if(q)list=list.filter(r=>productText(r).toLowerCase().includes(q)||(r.domain||'').toLowerCase().includes(q));
    if(state.domain!=='all')list=list.filter(r=>(r.domain||domainOf(r.url))===state.domain);
    if(state.hideDuplicates)list=list.filter(r=>!r.duplicateOf);
    const key=state.sort;
    list.sort((a,b)=>{
      if(key==='visual')return (b.scores?.visual||0)-(a.scores?.visual||0);
      if(key==='structure')return (b.scores?.structure||0)-(a.scores?.structure||0);
      if(key==='resolution')return ((b.width||0)*(b.height||0))-((a.width||0)*(a.height||0));
      if(key==='price')return resultPriceNumber(a)-resultPriceNumber(b);
      if(key==='recent')return resultDate(b)-resultDate(a);
      return (b.scores?.overall||0)-(a.scores?.overall||0);
    });
    return list;
  }

  function renderDomainOptions(){const sel=document.querySelector('#v9Domain');if(!sel)return;const counts={};state.results.forEach(r=>{const d=r.domain||domainOf(r.url)||'unknown';counts[d]=(counts[d]||0)+1});const current=state.domain;sel.innerHTML='<option value="all">全部域名</option>'+Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([d,n])=>`<option value="${escapeHtml(d)}">${escapeHtml(d)} (${n})</option>`).join('');sel.value=counts[current]?current:'all';state.domain=sel.value;}

  function resultCard(r){
    const img=remoteImageUrl(r),selected=state.selected.has(r.id),label=r.manualLabel||'',p=r.product||{};
    return `<article class="v9-result-card ${selected?'selected':''} ${r.duplicateOf?'duplicate':''}" data-result-id="${r.id}">
      <label class="v9-select"><input type="checkbox" data-result-select="${r.id}" ${selected?'checked':''}><span>${icon('check')}</span></label>
      <div class="v9-result-image">${img?`<img src="${escapeHtml(proxyUrl(img))}" alt="" loading="lazy" referrerpolicy="no-referrer">`:icon('image')}<span class="v9-source-badge">${escapeHtml(r.engine||r.source||'采集')}</span>${r.width&&r.height?`<em>${r.width}×${r.height}${r.quality?.sharpness?` · 清晰 ${Math.round(r.quality.sharpness*100)}`:''}</em>`:''}</div>
      <div class="v9-result-body"><div class="v9-result-title"><b>${escapeHtml(r.title||p.name||'未命名结果')}</b><small>${escapeHtml(r.domain||domainOf(r.url)||'')}</small></div>
      <div class="v9-score-row"><span title="综合">${scorePct(r.scores?.overall)}<small>综合</small></span><span title="视觉">${scorePct(r.scores?.visual)}<small>视觉</small></span><span title="结构">${scorePct(r.scores?.structure)}<small>结构</small></span></div>
      <p>${escapeHtml((r.snippet||[p.brand,p.sku,p.model].filter(Boolean).join(' · ')||'暂无摘要').slice(0,160))}</p>
      <div class="v9-result-meta">${(r.price||p.price)?`<strong>${escapeHtml(r.price||String(p.price))}${p.currency?` ${escapeHtml(p.currency)}`:''}</strong>`:''}${p.brand?`<span>${escapeHtml(p.brand)}</span>`:''}${p.sku?`<span>SKU ${escapeHtml(p.sku)}</span>`:''}${r.duplicateOf?'<span class="warn">疑似重复</span>':''}</div>
      <div class="v9-labels"><button data-label="same" class="${label==='same'?'active':''}">完全同款</button><button data-label="similar" class="${label==='similar'?'active':''}">类似</button><button data-label="irrelevant" class="${label==='irrelevant'?'active':''}">不相关</button></div>
      <div class="v9-result-actions"><a href="${escapeHtml(r.url||'#')}" target="_blank" rel="noopener noreferrer">来源 ${icon('arrow-up-right')}</a><button data-action="compare">对比</button><button data-action="watch">追踪</button><button data-action="evidence">留证</button><button data-action="supplier">找供应商</button><button data-action="batch">加入批量</button></div></div></article>`;
  }

  function renderResults(){const body=document.querySelector('#v9Body');if(!body)return;const list=filteredResults();if(!list.length){body.innerHTML=emptyCollector();return}body.innerHTML=`<div class="v9-result-grid">${list.map(resultCard).join('')}</div>`;}
  function emptyCollector(){return `<div class="v9-empty"><div>${icon('scan')}</div><h2>还没有采集结果</h2><p>安装仓库里的 Chrome / Edge 扩展后，在 Google Lens、Bing、Yandex 或任意商品页点击“采集当前页”，结果会自动回到这里。</p><div class="v9-action-row"><button class="secondary-btn" data-v9-demo>载入示例结构</button><a class="primary-btn" href="https://github.com/guodongbuding66-spec/soutu-pro/tree/main/extension" target="_blank" rel="noopener noreferrer">打开扩展目录 ${icon('arrow-up-right')}</a></div></div>`;}

  function renderDomains(){const body=document.querySelector('#v9Body');if(!body)return;const groups={};state.results.forEach(r=>{const d=r.domain||domainOf(r.url)||'unknown';(groups[d]??=[]).push(r)});body.innerHTML=`<div class="v9-domain-grid">${Object.entries(groups).sort((a,b)=>b[1].length-a[1].length).map(([d,items])=>`<article><div><b>${escapeHtml(d)}</b><span>${items.length} 条</span></div><p>${escapeHtml(items.slice(0,3).map(x=>x.title).filter(Boolean).join(' · ').slice(0,150))}</p><button data-domain-focus="${escapeHtml(d)}">只看这个域名</button></article>`).join('')||emptyCollector()}</div>`;}
  function renderTimeline(){const body=document.querySelector('#v9Body');if(!body)return;const list=state.results.slice().sort((a,b)=>resultDate(a)-resultDate(b));body.innerHTML=`<div class="v9-timeline">${list.map(r=>`<article><time>${resultDate(r)?fmtDate(resultDate(r)):'日期未知'}</time><span></span><div><b>${escapeHtml(r.title||'结果')}</b><small>${escapeHtml(r.domain||domainOf(r.url))}</small><a href="${escapeHtml(r.url||'#')}" target="_blank" rel="noopener noreferrer">打开来源</a></div></article>`).join('')||emptyCollector()}</div>`;}
  function renderWatch(){const body=document.querySelector('#v9Body');if(!body)return;body.innerHTML=`<div class="v9-watch-head"><p>本机追踪价格、页面状态与最近变化。刷新时由 Vercel Function 读取公开页面；遇到反爬站点会明确标记失败。</p><button class="primary-btn" id="v9RefreshWatch">${icon('clock')}刷新全部</button></div><div class="v9-watch-list">${state.watch.map(w=>`<article data-watch-id="${w.id}"><div><b>${escapeHtml(w.title||w.url)}</b><small>${escapeHtml(domainOf(w.url))}</small></div><div class="v9-watch-status"><strong>${escapeHtml(w.lastPrice||'价格未知')}</strong><span>${escapeHtml(w.status||'待刷新')}</span><small>${w.lastChecked?fmtDate(w.lastChecked):'尚未检查'}</small></div><a href="${escapeHtml(w.url)}" target="_blank" rel="noopener noreferrer">打开</a><button data-watch-refresh="${w.id}">刷新</button><button data-watch-remove="${w.id}">移除</button></article>`).join('')||'<div class="v9-empty-inline">暂无追踪商品。</div>'}</div>`;}
  function renderGraph(){const body=document.querySelector('#v9Body');if(!body)return;const brand=brandCandidates(getAnalysis().ocr||'')[0]||'当前产品';const domains=[...new Set(state.results.map(r=>r.domain||domainOf(r.url)).filter(Boolean))].slice(0,12);const suppliers=[...new Set(state.results.filter(r=>/alibaba|made-in-china|globalsources/i.test(r.domain||domainOf(r.url))).map(r=>r.domain||domainOf(r.url)))].slice(0,6);body.innerHTML=relationshipSvg(brand,domains,suppliers);}
  function relationshipSvg(brand,domains,suppliers){const nodes=[{id:'brand',label:brand,type:'brand'},...domains.map((d,i)=>({id:`d${i}`,label:d,type:suppliers.includes(d)?'supplier':'domain'}))];const W=1000,H=520,cx=500,cy=250,R=190;nodes.forEach((n,i)=>{if(i===0){n.x=cx;n.y=cy}else{const a=(i-1)/(nodes.length-1||1)*Math.PI*2;n.x=cx+Math.cos(a)*R;n.y=cy+Math.sin(a)*R}});return `<div class="v9-graph-wrap"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="品牌与来源关系图">${nodes.slice(1).map(n=>`<line x1="${cx}" y1="${cy}" x2="${n.x}" y2="${n.y}"/>`).join('')}${nodes.map(n=>`<g class="${n.type}"><circle cx="${n.x}" cy="${n.y}" r="${n.type==='brand'?54:36}"/><text x="${n.x}" y="${n.y+4}" text-anchor="middle">${escapeHtml(n.label.slice(0,18))}</text></g>`).join('')}</svg><p>中心为当前品牌/产品候选，外围为已采集来源；B2B 来源会按供应商节点标识。</p></div>`;}

  function renderCases(){const body=document.querySelector('#v9Body');if(!body)return;body.innerHTML=`<div class="v9-case-grid">${state.cases.map(c=>`<article data-case-id="${c.id}"><div><span class="section-kicker">CASE</span><h3>${escapeHtml(c.name)}</h3><p>${escapeHtml(c.query||'无主搜索词')}</p><small>${fmtDate(c.createdAt)} · ${(c.results||[]).length} 结果 · ${(c.evidence||[]).length} 证据</small></div><div class="v9-action-row"><button data-case-open="${c.id}">打开项目</button><button data-case-export="${c.id}">导出</button><button data-case-delete="${c.id}">删除</button></div></article>`).join('')||'<div class="v9-empty-inline">暂无调查项目。点击页面顶部“保存调查项目”即可创建。</div>'}</div>`;}
  function renderEvidence(){const body=document.querySelector('#v9Body');if(!body)return;body.innerHTML=`<div class="v9-evidence-head"><p>证据记录包含采集时间、来源 URL、标题、价格、规格和人工判断；浏览器扩展的“保存证据快照”还会同时下载当前页面截图。</p><button class="secondary-btn" id="v9EvidenceExport">导出证据 JSON</button></div><div class="v9-evidence-list">${state.evidence.map(e=>`<article><time>${fmtDate(e.capturedAt)}</time><div><b>${escapeHtml(e.title||'证据')}</b><small>${escapeHtml(e.domain||domainOf(e.url))}</small><p>${escapeHtml((e.note||e.price||'').slice(0,160))}</p></div><a href="${escapeHtml(e.url||'#')}" target="_blank" rel="noopener noreferrer">来源</a><button data-evidence-remove="${e.id}">删除</button></article>`).join('')||'<div class="v9-empty-inline">暂无证据记录。</div>'}</div>`;}

  function renderBody(){
    document.querySelectorAll('[data-v9-mode]').forEach(b=>b.classList.toggle('active',b.dataset.v9Mode===state.mode));
    if(state.mode==='domains')renderDomains();else if(state.mode==='timeline')renderTimeline();else if(state.mode==='watch')renderWatch();else if(state.mode==='graph')renderGraph();else if(state.mode==='evidence')renderEvidence();else if(state.mode==='cases')renderCases();else renderResults();
  }
  function renderWeights(){const el=document.querySelector('#v9Weights');if(!el)return;el.innerHTML=`<span>视觉 ${Math.round(state.weights.visual*100)}%</span><span>结构 ${Math.round(state.weights.structure*100)}%</span><span>文字 ${Math.round(state.weights.text*100)}%</span>`;}
  function renderMetadata(){const el=document.querySelector('#v9Metadata');if(!el)return;const a=getAnalysis(),ex=state.exif||{},brands=brandCandidates(a.ocr||'');el.innerHTML=`<dl class="v9-meta-list"><div><dt>品牌候选</dt><dd>${brands.map(escapeHtml).join(' · ')||'—'}</dd></div><div><dt>型号 / 条码</dt><dd>${(a.barcodes||[]).map(escapeHtml).join(' · ')||extractModel(a.ocr||'')||'—'}</dd></div><div><dt>相机</dt><dd>${escapeHtml([ex.Make,ex.Model].filter(Boolean).join(' ')||'—')}</dd></div><div><dt>拍摄时间</dt><dd>${escapeHtml(ex.DateTimeOriginal||ex.DateTime||'—')}</dd></div><div><dt>软件</dt><dd>${escapeHtml(ex.Software||'—')}</dd></div>${Number.isFinite(ex.latitude)?`<div><dt>GPS</dt><dd>${ex.latitude.toFixed(5)}, ${ex.longitude.toFixed(5)}</dd></div>`:''}</dl>`;}
  function render(){renderStats();renderSource();renderDomainOptions();renderWeights();renderMetadata();renderBody();}

  function extractModel(text=''){const m=String(text).match(/\b(?:model|型号|type|sku|item)\s*[:#-]?\s*([A-Z0-9][A-Z0-9._\/-]{2,24})/i);return m?m[1]:'';}

  async function imageFeatures(url) {
    if(!url)return null;if(state.featureCache.has(url))return state.featureCache.get(url);
    const p=(async()=>{
      const img=new Image();img.crossOrigin='anonymous';img.referrerPolicy='no-referrer';img.src=url.startsWith('data:')||url.startsWith('blob:')?url:proxyUrl(url);await img.decode();
      const c=document.createElement('canvas'),w=64,h=Math.max(24,Math.round(64*(img.naturalHeight/img.naturalWidth)));c.width=w;c.height=Math.min(96,h);const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,c.width,c.height);const d=ctx.getImageData(0,0,c.width,c.height).data;
      const hist=new Array(64).fill(0);let mean=0,edgeBits='';
      const gray=new Float32Array(c.width*c.height);for(let i=0,j=0;i<d.length;i+=4,j++){const g=.299*d[i]+.587*d[i+1]+.114*d[i+2];gray[j]=g;mean+=g;const ri=Math.min(3,d[i]>>6),gi=Math.min(3,d[i+1]>>6),bi=Math.min(3,d[i+2]>>6);hist[ri*16+gi*4+bi]++}mean/=gray.length;
      const dhC=document.createElement('canvas');dhC.width=9;dhC.height=8;dhC.getContext('2d').drawImage(img,0,0,9,8);const dd=dhC.getContext('2d').getImageData(0,0,9,8).data;let dh='';for(let y=0;y<8;y++)for(let x=0;x<8;x++){const a=(y*9+x)*4,b=(y*9+x+1)*4;const ga=.299*dd[a]+.587*dd[a+1]+.114*dd[a+2],gb=.299*dd[b]+.587*dd[b+1]+.114*dd[b+2];dh+=ga>gb?'1':'0'}
      const edgeC=document.createElement('canvas');edgeC.width=9;edgeC.height=8;const ectx=edgeC.getContext('2d');ectx.drawImage(img,0,0,9,8);const ed=ectx.getImageData(0,0,9,8).data,eg=[];for(let i=0;i<72;i++)eg.push(.299*ed[i*4]+.587*ed[i*4+1]+.114*ed[i*4+2]);for(let y=0;y<8;y++)for(let x=0;x<8;x++){const i=y*9+x;edgeBits+=Math.abs(eg[i+1]-eg[i])>18?'1':'0'}
      const sum=hist.reduce((a,b)=>a+b,0)||1;let edgeCount=0;for(const bit of edgeBits)if(bit==='1')edgeCount++;return{dhash:dh,edgehash:edgeBits,hist:hist.map(x=>x/sum),width:img.naturalWidth,height:img.naturalHeight,sharpness:edgeCount/Math.max(1,edgeBits.length)};
    })();state.featureCache.set(url,p);try{return await p}catch{state.featureCache.delete(url);return null}
  }
  async function sourceFeatures(){if(state.sourceFeatures)return state.sourceFeatures;const url=bridge()?.activeUrl?.();if(!url)return null;state.sourceFeatures=await imageFeatures(url);return state.sourceFeatures;}

  async function computeFeaturesForResult(r, withAI=false) {
    const imgUrl=remoteImageUrl(r); if(!imgUrl)return r;
    // Result fingerprints must not depend on source-image decoding. Dedupe compares
    // result-to-result and should continue to work even when the source image cannot
    // be decoded or is temporarily unavailable.
    const [src,feat]=await Promise.all([sourceFeatures().catch(()=>null),imageFeatures(imgUrl)]);
    if(!feat)return r;
    r.width=feat.width;
    r.height=feat.height;
    r.quality={megapixels:(feat.width*feat.height)/1e6,sharpness:feat.sharpness};
    r.features={dhash:feat.dhash,edgehash:feat.edgehash,hist:feat.hist};

    const text=jaccard(sourceQuery()||getAnalysis().ocr||'', productText(r));
    if(!src){
      r.scores={visual:r.scores?.visual||0,structure:r.scores?.structure||0,text:clamp01(text)};
      r.scores.overall=clamp01(r.scores.visual*state.weights.visual+r.scores.structure*state.weights.structure+r.scores.text*state.weights.text);
      return r;
    }

    const visual=(1-hamming(src.dhash,feat.dhash))*.62+cosine(src.hist,feat.hist)*.38;
    const structure=1-hamming(src.edgehash,feat.edgehash);
    let ai=0;
    if(withAI){try{ai=await aiSimilarity(bridge()?.activeUrl?.(),imgUrl)}catch{ai=0}}
    const visualFinal=ai?visual*.35+ai*.65:visual;
    r.scores={visual:clamp01(visualFinal),structure:clamp01(structure),text:clamp01(text)};
    r.scores.overall=clamp01(r.scores.visual*state.weights.visual+r.scores.structure*state.weights.structure+r.scores.text*state.weights.text);
    return r;
  }

  function v9Timeout(promise,ms,label='operation'){return Promise.race([Promise.resolve(promise),new Promise((_,reject)=>setTimeout(()=>reject(new Error(`${label} timed out after ${Math.round(ms/1000)}s`)),ms))])}
  async function loadScript(src,globalName,timeoutMs=15000){
    if(globalName&&window[globalName])return;
    const existing=[...document.scripts].find(s=>s.dataset.v9lib===globalName);
    if(existing?.dataset.failed==='1')existing.remove();
    await new Promise((resolve,reject)=>{
      let done=false;
      const s=(existing&&!existing.dataset.failed)?existing:document.createElement('script');
      const finish=(ok,error)=>{if(done)return;done=true;clearTimeout(timer);if(!ok){s.dataset.failed='1';s.remove();reject(error||new Error(`${globalName||'script'} load failed`))}else resolve()};
      if(!s.src){s.src=src;s.async=true;s.dataset.v9lib=globalName||src;document.head.appendChild(s)}
      s.addEventListener('load',()=>finish(true),{once:true});
      s.addEventListener('error',()=>finish(false,new Error(`${globalName||'script'} network load failed`)),{once:true});
      const timer=setTimeout(()=>finish(false,new Error(`${globalName||'script'} load timed out after ${Math.round(timeoutMs/1000)}s`)),timeoutMs);
      if(globalName&&window[globalName])finish(true)
    })
  }
  async function ensureAiModel(){if(state.aiModel)return state.aiModel;await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js','tf');await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet@2.1.1/dist/mobilenet.min.js','mobilenet');state.aiModel=await v9Timeout(window.mobilenet.load({version:2,alpha:.75}),20000,'MobileNet model');return state.aiModel;}
  async function embedding(url){const model=await ensureAiModel();const img=new Image();img.crossOrigin='anonymous';img.referrerPolicy='no-referrer';img.src=url.startsWith('data:')||url.startsWith('blob:')?url:proxyUrl(url);await v9Timeout(img.decode(),12000,'image decode');const t=model.infer(img,true);const arr=Array.from(await v9Timeout(t.data(),12000,'embedding'));t.dispose?.();return arr;}
  async function aiSimilarity(a,b){const [x,y]=await Promise.all([embedding(a),embedding(b)]);return clamp01((cosine(x,y)+1)/2);}

  async function aiRank(){
    const b=document.querySelector('#v9AiRank');if(!state.results.length||!b)return;
    b.disabled=true;b.textContent='AI 分析中…';
    try{
      const list=state.results.slice(0,MAX_AI_RESULTS);
      for(let i=0;i<list.length;i++){await computeFeaturesForResult(list[i],true);b.textContent=`AI ${i+1}/${list.length}`;renderStats()}
      state.sort='score';document.querySelector('#v9Sort').value='score';persist();render();
      bridge()?.toast?.('AI 重排完成',`已分析前 ${list.length} 个结果。`,'ok');
    }catch(e){bridge()?.toast?.('AI 重排未完成',e.message||'模型或图片加载失败。','error')}
    finally{b.disabled=false;b.innerHTML=`${icon('sparkles')}AI 重排`}
  }
  async function smartDedupe(){
    if(!state.results.length)return;
    const b=document.querySelector('#v9Dedupe');if(!b)return;b.disabled=true;b.textContent='计算指纹…';
    try{
      const list=state.results.slice(0,50);
      for(let i=0;i<list.length;i++){
        const current=list[i];
        current.duplicateOf='';
        const currentUrl=canonicalUrl(current.url||'');
        const imgUrl=remoteImageUrl(current);
        if(imgUrl){
          const feat=await imageFeatures(imgUrl);
          if(feat){
            current.width=feat.width;current.height=feat.height;
            current.quality={megapixels:(feat.width*feat.height)/1e6,sharpness:feat.sharpness};
            current.features={dhash:feat.dhash,edgehash:feat.edgehash,hist:feat.hist};
          }
        }
        for(let j=0;j<i;j++){
          const prev=list[j];
          const sameCanonical=currentUrl&&currentUrl===canonicalUrl(prev.url||'');
          const sameFingerprint=prev.features&&current.features
            && hamming(prev.features.dhash,current.features.dhash)<=.06
            && hamming(prev.features.edgehash,current.features.edgehash)<=.12;
          if(sameCanonical||sameFingerprint){current.duplicateOf=prev.id;break}
        }
      }
      state.hideDuplicates=true;persist();render();bridge()?.toast?.('智能去重完成','同链接与相似图片指纹已合并显示。','ok');
    }catch(e){bridge()?.toast?.('智能去重未完成',e.message||'部分远程图片无法读取。','error')}
    finally{b.disabled=false;b.innerHTML=state.hideDuplicates?`${icon('grid')}显示重复项`:`${icon('grid')}智能去重`}
  }

  function updateLearning(r,label){r.manualLabel=label;if(!r.scores)return;const target=label==='same'?1:label==='similar'?.55:0;const lr=.08;const features={visual:r.scores.visual||0,structure:r.scores.structure||0,text:r.scores.text||0};Object.keys(state.weights).forEach(k=>{const f=features[k];state.weights[k]=Math.max(.05,state.weights[k]+lr*(target-.45)*(f-.5))});state.weights=normalizeWeights(state.weights);state.results.forEach(x=>{if(x.scores)x.scores.overall=clamp01(x.scores.visual*state.weights.visual+x.scores.structure*state.weights.structure+x.scores.text*state.weights.text)});persist();renderWeights();}

  async function addToBatch(r){const img=remoteImageUrl(r);if(!img)return bridge()?.toast?.('没有可加入的图片','该结果没有缩略图 URL。','error');try{const resp=await fetch(proxyUrl(img));if(!resp.ok)throw new Error('image fetch failed');const blob=await resp.blob();const file=new File([blob],`${(r.title||'result').replace(/[^\w\u4e00-\u9fff-]+/g,'-').slice(0,40)}.${blob.type.includes('png')?'png':'jpg'}`,{type:blob.type||'image/jpeg'});await bridge()?.addBatch?.([file]);bridge()?.setView?.('batch');}catch(e){bridge()?.toast?.('加入批量失败',e.message||'远程图片无法读取。','error')}}
  function addEvidence(r,note=''){const e={id:uid(),capturedAt:Date.now(),title:r.title,url:r.url,domain:r.domain||domainOf(r.url),price:r.price||r.product?.price||'',product:r.product||{},engine:r.engine||r.source||'',note,manualLabel:r.manualLabel||''};state.evidence.unshift(e);persist();renderStats();if(state.mode==='evidence')renderEvidence();}
  function addWatch(r){if(!/^https?:/i.test(r.url||''))return bridge()?.toast?.('无法追踪','该结果没有有效的公开来源 URL。','error');if(state.watch.some(x=>canonicalUrl(x.url)===canonicalUrl(r.url)))return bridge()?.toast?.('已经在追踪','无需重复添加。');state.watch.unshift({id:uid(),url:r.url,title:r.title,firstSeen:Date.now(),lastChecked:0,lastPrice:r.price||r.product?.price||'',status:'待刷新',history:[]});persist();renderStats();bridge()?.toast?.('已加入追踪','可在“价格 / 生命周期”里刷新。','ok')}
  async function refreshWatchItem(w){w.status='刷新中';renderWatch();try{const resp=await fetch(`/api/url-status?url=${encodeURIComponent(w.url)}`);const data=await resp.json();w.lastChecked=Date.now();w.status=data.alive?'在线':'不可访问';if(data.title)w.title=data.title;if(data.price){w.lastPrice=data.price;w.history.push({at:w.lastChecked,price:data.price});w.history=w.history.slice(-30)}w.product=data.product||w.product||{};}catch{w.lastChecked=Date.now();w.status='检查失败'}persist();renderWatch();}
  async function refreshAllWatch(){for(const w of state.watch)await refreshWatchItem(w)}

  function compareSelected(extraId=''){if(extraId)state.selected.add(extraId);const list=state.results.filter(r=>state.selected.has(r.id)).slice(0,4);if(!list.length)return bridge()?.toast?.('请选择结果','勾选 1–4 个结果后比较。','error');const modal=document.querySelector('#v9CompareModal'),body=document.querySelector('#v9CompareBody');modal.classList.remove('hidden');const src=bridge()?.source?.();const rows=['brand','sku','model','mpn','gtin','price','currency'];body.innerHTML=`<div class="v9-compare-grid"><div class="v9-compare-source"><h3>源图片</h3>${src?.activeUrl?`<img src="${escapeHtml(src.activeUrl)}" alt="源图">`:''}<p>${escapeHtml(sourceQuery()||'')}</p></div>${list.map(r=>`<article><h3>${escapeHtml(r.title||'结果')}</h3>${remoteImageUrl(r)?`<img src="${escapeHtml(proxyUrl(remoteImageUrl(r)))}" alt="">`:''}<a href="${escapeHtml(r.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(r.domain||domainOf(r.url))}</a></article>`).join('')}</div><div class="v9-spec-table"><table><thead><tr><th>字段</th>${list.map(r=>`<th>${escapeHtml((r.title||'结果').slice(0,26))}</th>`).join('')}</tr></thead><tbody>${rows.map(k=>`<tr><td>${k.toUpperCase()}</td>${list.map(r=>`<td>${escapeHtml(String(r.product?.[k]??(k==='price'?r.price:'')??'—'))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>${list.length===1&&src?.activeUrl&&remoteImageUrl(list[0])?overlayCompare(src.activeUrl,proxyUrl(remoteImageUrl(list[0]))):''}`;bindOverlay();}
  function overlayCompare(a,b){return `<div class="v9-overlay-compare"><h3>透明叠加 / 滑块对比</h3><div class="v9-overlay-stage"><img src="${escapeHtml(a)}" alt="源图"><div class="v9-overlay-top" id="v9OverlayTop"><img src="${escapeHtml(b)}" alt="结果"></div></div><input id="v9OverlayRange" type="range" min="0" max="100" value="50"></div>`;}
  function bindOverlay(){const r=document.querySelector('#v9OverlayRange'),top=document.querySelector('#v9OverlayTop');if(r&&top)r.oninput=()=>top.style.clipPath=`inset(0 ${100-r.value}% 0 0)`;}

  async function supplierSearch(r){const q=[r.product?.brand,r.product?.model,r.product?.sku,r.title].filter(Boolean).join(' ').slice(0,160);const modal=document.querySelector('#v9CompareModal'),body=document.querySelector('#v9CompareBody');modal.classList.remove('hidden');const links=[['Alibaba',`https://www.alibaba.com/trade/search?SearchText=${encodeURIComponent(q)}`],['Made-in-China',`https://www.made-in-china.com/products-search/hot-china-products/${encodeURIComponent(q.replace(/\s+/g,'_'))}.html`],['Global Sources',`https://www.globalsources.com/search?query=${encodeURIComponent(q)}`]];body.innerHTML=`<div class="v9-supplier-panel"><h3>供应商反查 · ${escapeHtml(q)}</h3><div class="v9-supplier-links">${links.map(([n,u])=>`<a href="${u}" target="_blank" rel="noopener noreferrer">${n} ${icon('arrow-up-right')}</a>`).join('')}</div><div id="v9SupplierApi" class="v9-provider-note">正在检查站内供应商聚合…</div></div>`;try{const res=await fetch(`/api/supplier-search?q=${encodeURIComponent(q)}`),data=await res.json();const el=document.querySelector('#v9SupplierApi');if(res.ok&&data.enabled&&data.items?.length){const imported=data.items.map((x,i)=>normalizeResult({title:x.title,url:x.link,domain:domainOf(x.link),snippet:x.snippet,source:x.source}, {source:'supplier-api',capturedAt:Date.now()}, i));state.results=dedupeBasic([...imported,...state.results]).slice(0,MAX_RESULTS);persist();el.innerHTML=`<b>已聚合 ${imported.length} 条供应商线索</b><p>结果已加入研究工作台。</p>`;renderStats()}else el.innerHTML='<b>供应商聚合 API 未启用</b><p>仍可使用上方三个 B2B 平台直达入口。</p>'}catch{document.querySelector('#v9SupplierApi').innerHTML='<b>供应商聚合暂不可用</b><p>仍可使用上方直达入口。</p>'}}
  function saveCase(){
    const src=bridge()?.source?.(),name=prompt('调查项目名称',sourceQuery()||src?.name||'图片调查')||'';
    if(!name)return;
    const thumb=src?.activeUrl?.startsWith('data:')&&src.activeUrl.length<120000?src.activeUrl:'';
    const cs={id:uid(),name,createdAt:Date.now(),source:{name:src?.name||'',thumb},query:sourceQuery(),results:state.results.slice(0,50).map(compactResult),evidence:JSON.parse(JSON.stringify(state.evidence)),weights:state.weights};
    cs.verificationSummary=window.SOUTU_EVIDENCE_VERIFICATION?.summary(cs.evidence.filter(e=>e.lineage))||undefined;
    cs.verificationAuditSummary=window.SOUTU_VERIFICATION_AUDIT?.summary(cs.evidence.filter(e=>e.lineage))||undefined;
    state.cases.unshift(cs);
    if(!write(KEYS.cases,state.cases)){
      cs.results=cs.results.slice(0,20);cs.source.thumb='';
      if(!write(KEYS.cases,state.cases)){state.cases=state.cases.filter(c=>c.id!==cs.id);return bridge()?.toast?.('项目保存失败','浏览器本机存储空间不足，请先导出或删除旧项目。','error')}
    }
    persist();bridge()?.toast?.('调查项目已保存',`${cs.results.length} 条结果 · ${cs.evidence.length} 条证据`,'ok')
  }

  function download(name,blob){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
  function exportJson(){download(`soutu-pro-v9-${Date.now()}.json`,new Blob([JSON.stringify({version:V9_VERSION,exportedAt:new Date().toISOString(),query:sourceQuery(),results:state.results,evidence:state.evidence,watch:state.watch},null,2)],{type:'application/json'}))}
  async function exportXlsx(){try{await loadScript('https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js','XLSX');const rows=state.results.map(r=>({title:r.title,url:r.url,domain:r.domain||domainOf(r.url),price:r.price||r.product?.price||'',brand:r.product?.brand||'',sku:r.product?.sku||'',model:r.product?.model||'',similarity:scorePct(r.scores?.overall),visual:scorePct(r.scores?.visual),structure:scorePct(r.scores?.structure),label:r.manualLabel||''}));const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows),'Results');XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(state.evidence),'Evidence');XLSX.writeFile(wb,`soutu-pro-v9-${Date.now()}.xlsx`)}catch(e){bridge()?.toast?.('Excel 导出失败',e.message||'SheetJS 未加载。','error')}}
  function printReport(){
    const box=document.querySelector('#v9PrintReport');if(!box)return;
    const items=filteredResults().slice(0,40);
    box.innerHTML=`<h1>搜图 Pro · 图片调查报告</h1><p>生成时间：${new Date().toLocaleString()}<br>搜索词：${escapeHtml(sourceQuery())}<br>结果：${items.length} 条 · 证据：${state.evidence.length} 条</p><table><thead><tr><th>图片</th><th>标题 / 来源</th><th>价格</th><th>相似度</th><th>判断</th></tr></thead><tbody>${items.map(r=>`<tr><td>${remoteImageUrl(r)?`<img src="${escapeHtml(proxyUrl(remoteImageUrl(r)))}" alt="">`:''}</td><td><b>${escapeHtml(r.title||'')}</b><br><small>${escapeHtml(r.domain||domainOf(r.url))}</small><br>${escapeHtml(r.url||'')}</td><td>${escapeHtml(r.price||r.product?.price||'')}</td><td>${scorePct(r.scores?.overall)}%</td><td>${escapeHtml(r.manualLabel||'')}</td></tr>`).join('')}</tbody></table>`;
    requestAnimationFrame(()=>window.print());
  }

  function copyTradePackage(){const selected=state.results.filter(r=>state.selected.has(r.id));const top=(selected.length?selected:filteredResults().slice(0,5));const pack={source:'soutu-pro',createdAt:new Date().toISOString(),query:sourceQuery(),products:top.map(r=>({name:r.title,brand:r.product?.brand||'',sku:r.product?.sku||'',model:r.product?.model||'',price:r.price||r.product?.price||'',source_url:r.url,supplier_hint:/alibaba|made-in-china|globalsources/i.test(r.domain||domainOf(r.url))?r.domain||domainOf(r.url):'',similarity:scorePct(r.scores?.overall)})),evidence:state.evidence.slice(0,20)};navigator.clipboard.writeText(JSON.stringify(pack,null,2)).then(()=>bridge()?.toast?.('外贸导入包已复制','打开 AI 外贸工作台后可粘贴到项目备注或导入流程。','ok')).catch(()=>bridge()?.toast?.('复制失败','浏览器没有授予剪贴板权限，可先导出 JSON。','error'));}

  async function translateOcr(){const text=getAnalysis().ocr||'';if(!text)return bridge()?.toast?.('没有 OCR 文字','先在搜图页运行智能分析。','error');const tl=document.querySelector('#v9TranslateLang').value;const out=document.querySelector('#v9Translation');out.textContent='翻译中…';try{const url=`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(tl)}&dt=t&q=${encodeURIComponent(text.slice(0,4500))}`;const r=await fetch(url);if(!r.ok)throw new Error();const data=await r.json();state.translation=(data?.[0]||[]).map(x=>x?.[0]||'').join('');out.textContent=state.translation||'没有返回翻译结果'}catch{out.innerHTML=`公共翻译接口不可用。<a href="https://translate.google.com/?sl=auto&tl=${encodeURIComponent(tl)}&text=${encodeURIComponent(text.slice(0,1800))}" target="_blank" rel="noopener noreferrer">在 Google Translate 打开</a>`}}

  async function parseExif(blob){if(!blob||!/jpe?g/i.test(blob.type))return{};const buf=await blob.arrayBuffer(),v=new DataView(buf);if(v.getUint16(0)!==0xFFD8)return{};let off=2;while(off<buf.byteLength){if(v.getUint8(off)!==0xFF)break;const marker=v.getUint8(off+1),len=v.getUint16(off+2);if(marker===0xE1){const sig=String.fromCharCode(...new Uint8Array(buf,off+4,6));if(sig.startsWith('Exif'))return parseTiff(v,off+10)}off+=2+len}return{};}
  function parseTiff(v,start){const le=v.getUint16(start)===0x4949;const u16=o=>v.getUint16(o,le),u32=o=>v.getUint32(o,le);const base=start,first=base+u32(base+4),out={};const readAscii=(ptr,count)=>{let s='';for(let i=0;i<count-1&&ptr+i<v.byteLength;i++){const c=v.getUint8(ptr+i);if(!c)break;s+=String.fromCharCode(c)}return s};const parseIfd=(pos)=>{const n=u16(pos);for(let i=0;i<n;i++){const e=pos+2+i*12,tag=u16(e),type=u16(e+2),count=u32(e+4),size=(type===3?2:type===4?4:type===5?8:1)*count,ptr=size<=4?e+8:base+u32(e+8);if(type===2){const s=readAscii(ptr,count);if(tag===0x010F)out.Make=s;if(tag===0x0110)out.Model=s;if(tag===0x0131)out.Software=s;if(tag===0x0132)out.DateTime=s;if(tag===0x9003)out.DateTimeOriginal=s}if(tag===0x8769)parseIfd(base+u32(e+8));if(tag===0x8825)parseGps(base+u32(e+8));}};const rat=ptr=>u32(ptr)/Math.max(1,u32(ptr+4));const parseGps=(pos)=>{const n=u16(pos),g={};for(let i=0;i<n;i++){const e=pos+2+i*12,tag=u16(e),count=u32(e+4),ptr=base+u32(e+8);if(tag===1)g.latRef=String.fromCharCode(v.getUint8(e+8));if(tag===3)g.lonRef=String.fromCharCode(v.getUint8(e+8));if(tag===2&&count===3)g.lat=[rat(ptr),rat(ptr+8),rat(ptr+16)];if(tag===4&&count===3)g.lon=[rat(ptr),rat(ptr+8),rat(ptr+16)]}const d=x=>x?x[0]+x[1]/60+x[2]/3600:null;if(g.lat){out.latitude=d(g.lat)*(g.latRef==='S'?-1:1)}if(g.lon){out.longitude=d(g.lon)*(g.lonRef==='W'?-1:1)}};try{parseIfd(first)}catch{}return out;}

  function importPayload(payload){if(!payload)return;const results=(payload.results||payload.images||[]).map((r,i)=>normalizeResult(r,payload,i));if(!results.length)return;state.results=dedupeBasic([...results,...state.results]).slice(0,MAX_RESULTS);state.importedAt=Date.now();persist();render();bridge()?.setView?.('research');bridge()?.toast?.('采集结果已导入',`${results.length} 条 · ${payload.source||payload.kind||'网页采集'}`,'ok')}
  window.SOUTU_V9_IMPORT=payload=>importPayload(payload);
  window.SOUTU_V9_FINGERPRINT=url=>imageFeatures(url);
  function importPendingUniversal(){try{const raw=localStorage.getItem('soutu-pro-v9-pending-import');if(!raw)return;localStorage.removeItem('soutu-pro-v9-pending-import');importPayload(JSON.parse(raw))}catch(e){console.warn('pending universal import invalid',e)}}

  function normalizeResult(r,payload,i){const url=r.url||r.href||r.link||'',rawImg=r.image||r.thumbnail||r.src||'',img=/^https?:/i.test(rawImg)?rawImg:'';return{id:r.id||uid(),title:r.title||r.alt||r.product?.name||`结果 ${i+1}`,url:/^https?:/i.test(url)?url:'',image:img,thumbnail:/^https?:/i.test(r.thumbnail||'')?r.thumbnail:img,domain:r.domain||domainOf(url),price:r.price||r.product?.price||'',snippet:r.snippet||r.text||'',engine:r.engine||payload.source||payload.engine||'',source:r.source||payload.pageTitle||'',date:r.date||r.published||'',capturedAt:r.capturedAt||payload.capturedAt||Date.now(),product:r.product||{},scores:r.scores||{},manualLabel:r.manualLabel||'',width:r.width||0,height:r.height||0};}
  function decodeCollectorHash(){const h=location.hash||'';if(!h.startsWith('#collector='))return;try{let raw=h.slice(11).replace(/-/g,'+').replace(/_/g,'/');raw+='='.repeat((4-raw.length%4)%4);const bin=atob(raw),bytes=Uint8Array.from(bin,ch=>ch.charCodeAt(0)),json=new TextDecoder().decode(bytes);importPayload(JSON.parse(json));history.replaceState(null,'',location.pathname+location.search)}catch(e){console.warn('collector payload invalid',e)}}
  function demo(){importPayload({source:'demo',results:[{title:'示例商品 A',url:'https://example.com/a',domain:'example.com',price:'$199',product:{brand:'Demo',sku:'A-100'}},{title:'示例供应商 B',url:'https://www.alibaba.com/',domain:'alibaba.com',product:{brand:'Demo'}}]})}

  async function generateSlices(){const a=getAnalysis(),objects=a.objects||[];if(objects.length){await bridge()?.addDetectedObjects?.();return}const src=bridge()?.source?.();if(!src?.activeUrl)return bridge()?.toast?.('没有源图片','先上传图片。','error');try{const img=new Image();img.crossOrigin='anonymous';img.src=/^https?:/i.test(src.activeUrl)?proxyUrl(src.activeUrl):src.activeUrl;await img.decode();const specs=[[0,0,.5,.5],[.5,0,.5,.5],[0,.5,.5,.5],[.5,.5,.5,.5],[.2,.2,.6,.6]],files=[];for(let i=0;i<specs.length;i++){const [x,y,w,h]=specs[i],c=document.createElement('canvas');c.width=Math.round(img.naturalWidth*w);c.height=Math.round(img.naturalHeight*h);c.getContext('2d').drawImage(img,img.naturalWidth*x,img.naturalHeight*y,img.naturalWidth*w,img.naturalHeight*h,0,0,c.width,c.height);const blob=await new Promise(res=>c.toBlob(res,'image/png'));files.push(new File([blob],`slice-${i+1}.png`,{type:'image/png'}))}await bridge()?.addBatch?.(files);bridge()?.setView?.('batch');}catch{bridge()?.toast?.('生成切片失败','请尝试本地文件。','error')}}

  function bind(){
    const r=root();if(!r)return;
    r.addEventListener('click',async e=>{
      const mode=e.target.closest('[data-v9-mode]');if(mode){state.mode=mode.dataset.v9Mode;persist();renderBody();return}
      if(e.target.closest('#v9AiRank'))return aiRank();
      if(e.target.closest('#v9Dedupe')){state.hideDuplicates?(()=>{state.hideDuplicates=false;persist();render();})():smartDedupe();return}
      if(e.target.closest('#v9Compare'))return compareSelected();
      if(e.target.closest('#v9SaveCase'))return saveCase();
      if(e.target.closest('#v9ExportJson'))return exportJson();
      if(e.target.closest('#v9ExportXlsx'))return exportXlsx();
      if(e.target.closest('#v9Print'))return printReport();
      if(e.target.closest('#v9Industrial')){state.weights=normalizeWeights({visual:.18,structure:.67,text:.15});bridge()?.choosePreset?.('industrial');persist();renderWeights();bridge()?.toast?.('工业结构模式已启用','结构特征权重已提升。','ok');return}
      if(e.target.closest('#v9Edge')){bridge()?.process?.('edge');return}
      if(e.target.closest('#v9Slices'))return generateSlices();
      if(e.target.closest('#v9Translate'))return translateOcr();
      if(e.target.closest('#v9CopyTrade'))return copyTradePackage();
      if(e.target.closest('#v9RefreshSource')){state.sourceFeatures=null;state.featureCache.clear();state.exif=null;renderSource();return}
      if(e.target.closest('#v9AnalyzeSource')){await bridge()?.analyze?.();renderSource();renderMetadata();return}
      if(e.target.closest('#v9RefreshWatch'))return refreshAllWatch();
      if(e.target.closest('#v9EvidenceExport'))return download('soutu-pro-evidence.json',new Blob([JSON.stringify(state.evidence,null,2)],{type:'application/json'}));
      const domain=e.target.closest('[data-domain-focus]');if(domain){state.domain=domain.dataset.domainFocus;state.mode='results';renderDomainOptions();renderBody();return}
      const card=e.target.closest('[data-result-id]');if(card){const result=state.results.find(x=>x.id===card.dataset.resultId);if(!result)return;const label=e.target.closest('[data-label]');if(label){updateLearning(result,label.dataset.label);persist();render();return}const act=e.target.closest('[data-action]');if(act){if(act.dataset.action==='compare')compareSelected(result.id);if(act.dataset.action==='watch')addWatch(result);if(act.dataset.action==='evidence')addEvidence(result);if(act.dataset.action==='supplier')supplierSearch(result);if(act.dataset.action==='batch')addToBatch(result);return}}
      const wr=e.target.closest('[data-watch-refresh]');if(wr){const w=state.watch.find(x=>x.id===wr.dataset.watchRefresh);if(w)refreshWatchItem(w);return}
      const wd=e.target.closest('[data-watch-remove]');if(wd){state.watch=state.watch.filter(x=>x.id!==wd.dataset.watchRemove);persist();renderWatch();renderStats();return}
      const er=e.target.closest('[data-evidence-remove]');if(er){state.evidence=state.evidence.filter(x=>x.id!==er.dataset.evidenceRemove);persist();renderEvidence();renderStats();return}
      const nav=e.target.closest('[data-nav]');if(nav){bridge()?.setView?.(nav.dataset.nav);return}
      const co=e.target.closest('[data-case-open]');if(co){refreshEvidence();const cs=state.cases.find(x=>x.id===co.dataset.caseOpen);if(cs){let restored;try{const copies=[...state.evidence,...state.cases.flatMap(c=>c.evidence||[])];restored=(cs.evidence||[]).map(e=>e.lineage?window.SOUTU_VERIFICATION_AUDIT?.canonical(e,copies)||e:e)}catch{return bridge()?.toast?.('审核记录冲突','项目未打开，请导出备份并核对审计记录。','error')}state.results=cs.results||[];state.evidence=JSON.parse(JSON.stringify(restored));cs.evidence=JSON.parse(JSON.stringify(restored));state.weights=normalizeWeights(cs.weights||DEFAULT_WEIGHTS);persist();state.mode='results';render();bridge()?.toast?.('调查项目已打开',cs.name,'ok')}return}
      const ce=e.target.closest('[data-case-export]');if(ce){const cs=state.cases.find(x=>x.id===ce.dataset.caseExport);if(cs)download(`soutu-case-${Date.now()}.json`,new Blob([JSON.stringify(cs,null,2)],{type:'application/json'}));return}
      const cd=e.target.closest('[data-case-delete]');if(cd){state.cases=state.cases.filter(x=>x.id!==cd.dataset.caseDelete);persist();renderCases();return}
      if(e.target.closest('[data-v9-demo]'))return demo();
    });
    r.addEventListener('change',e=>{if(e.target.matches('[data-result-select]')){e.target.checked?state.selected.add(e.target.dataset.resultSelect):state.selected.delete(e.target.dataset.resultSelect);renderBody()}});
    document.querySelector('#v9Filter').oninput=e=>{state.filter=e.target.value;renderBody()};
    document.querySelector('#v9Domain').onchange=e=>{state.domain=e.target.value;renderBody()};
    document.querySelector('#v9Sort').onchange=e=>{state.sort=e.target.value;renderBody()};
    document.querySelector('#v9Import').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;try{importPayload(JSON.parse(await f.text()))}catch{bridge()?.toast?.('导入失败','JSON 格式不正确。','error')}e.target.value=''};
    document.querySelector('#v9CompareClose').onclick=()=>document.querySelector('#v9CompareModal').classList.add('hidden');
    document.querySelector('#v9CompareModal').addEventListener('mousedown',e=>{if(e.target.id==='v9CompareModal')e.currentTarget.classList.add('hidden')});
  }

  function refreshEvidence(){state.evidence=read(KEYS.evidence,[]);state.cases=read(KEYS.cases,[]);renderStats();renderBody()}
  window.SOUTU_V9={refreshEvidence};
  window.addEventListener('storage',e=>{if(e.key===KEYS.evidence||e.key===KEYS.cases)refreshEvidence()});

  function init(){if(!root())return;renderShell();bind();decodeCollectorHash();importPendingUniversal();render();window.addEventListener('soutu:source-changed',()=>{state.sourceFeatures=null;state.exif=null;renderSource();renderMetadata()});window.addEventListener('soutu:analysis-changed',()=>{renderSource();renderMetadata()});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();