(() => {
  'use strict';
  const QUERY_KEY='soutu-pro-investigation-query-v1';
  const HISTORY_KEY='soutu-pro-investigation-history-v1',SCOPE_KEY='soutu-pro-investigation-scope-v1';
  const $=id=>document.getElementById(id),bridge=()=>window.SOUTU_BRIDGE;
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let query='';try{query=localStorage.getItem(QUERY_KEY)||''}catch{}
  const scopes={media:'公开图片来源',product:'商品聚合',supplier:'供应商聚合'};
  let scope='media',history=[];
  try{scope=localStorage.getItem(SCOPE_KEY)||scope;const saved=JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');if(Array.isArray(saved))history=saved.filter(h=>h&&typeof h.query==='string'&&h.query.trim()&&Object.hasOwn(scopes,h.scope)).slice(0,12).map(h=>({...h,query:h.query.slice(0,160)}))}catch{}
  if(!Object.hasOwn(scopes,scope))scope='media';
  let current=null,uploading=false,captures=[],captureId=0,manualCaptureId=null;
  const url=value=>{try{const u=new URL(String(value).trim());return /^https?:$/.test(u.protocol)&&!u.username&&!u.password&&u.href.length<=4096?u.href:''}catch{return''}};
  const endpoint=()=>bridge()?.searchEndpoint?.()||location.origin;
  function status(message,error=false){const el=$('investigationStatus');if(el){el.textContent=message;el.dataset.tone=error?'error':'normal'}}
  function saveQuery(value){query=String(value||'').trim().slice(0,160);try{localStorage.setItem(QUERY_KEY,query)}catch{}bridge()?.setQuery?.(query)}
  function saveScope(value){scope=Object.hasOwn(scopes,value)?value:'media';try{localStorage.setItem(SCOPE_KEY,scope)}catch{}}
  function renderHistory(){
    const box=$('investigationHistory');if(!box)return;box.hidden=!history.length;
    $('investigationHistorySummary').textContent=`最近查询 · ${history.length}`;
    $('investigationHistoryList').innerHTML=history.map((h,i)=>`<li><button type="button" data-investigation-history="${i}" title="恢复搜索词和查询范围">${esc(h.query)}</button><span>${esc(scopes[h.scope])} · ${Number(h.count)||0} 条结果</span></li>`).join('');
  }
  function remember(job,count){history=[{query:job.query,scope:job.scope,count,at:Date.now()},...history.filter(h=>h.query!==job.query||h.scope!==job.scope)].slice(0,12);try{localStorage.setItem(HISTORY_KEY,JSON.stringify(history))}catch{}renderHistory()}
  function renderCaptures(){
    const log=$('investigationCaptureLog');if(!log)return;
    log.innerHTML=captures.map(row=>`<li data-state="${row.state}" data-capture-id="${row.id}"><div><b>${esc(row.title||row.raw)}</b><span>${esc(row.message)}</span></div><div class="investigation-capture-actions">${row.href?`<a href="${esc(row.href)}" target="_blank" rel="noopener noreferrer">打开来源 ↗</a>`:''}${['error','stopped'].includes(row.state)?`${row.href?`<button type="button" data-capture-retry="${row.id}" ${current?'disabled':''} aria-label="重试 ${esc(row.raw)}">重试</button>`:''}<button type="button" data-capture-manual="${row.id}" ${current?'disabled':''}>手工记录</button>`:''}</div></li>`).join('');
    const retry=$('investigationRetryFailed'),count=captures.filter(row=>row.href&&['error','stopped'].includes(row.state)).length;
    if(retry){retry.hidden=!count;retry.disabled=!!current;retry.textContent=`重试未完成 ${count} 条`}
  }
  function stop(message='已停止，已采集的结果保留。'){
    if(!current)return;const job=current;current=null;job.controller.abort();
    for(const row of job.rows||[])if(['pending','running'].includes(row.state)){row.state='stopped';row.message='已停止，可重试或手工记录。'}
    busy(false);renderCaptures();status(message);
  }
  function busy(value){
    for(const id of ['investigationSearch','investigationCollect','investigationManualSave'])if($(id))$(id).disabled=value;
    if($('investigationCancel'))$('investigationCancel').hidden=!value;
    $('v9Workflow')?.setAttribute('aria-busy',String(value));
    renderCaptures();
  }
  function begin(kind){stop();const job={kind,controller:new AbortController(),source:bridge()?.activeUrl?.()||'',query,scope};current=job;busy(true);return job}
  const active=job=>current===job&&!job.controller.signal.aborted;
  async function request(path,job){
    const controller=new AbortController(),abort=()=>controller.abort();
    job.controller.signal.addEventListener('abort',abort,{once:true});
    const timer=setTimeout(abort,25000);
    try{const r=await fetch(endpoint()+path,{signal:controller.signal});const data=await r.json();if(!r.ok)throw new Error(data.message||data.error||`HTTP ${r.status}`);return data}
    catch(error){if(controller.signal.aborted&&!job.controller.signal.aborted)throw new Error('请求超时，请重试或手工记录来源。');throw error}
    finally{clearTimeout(timer);job.controller.signal.removeEventListener('abort',abort)}
  }
  function finish(job){if(current===job){current=null;busy(false)}}
  function addRows(rows,source,searchQuery=query){
    return window.SOUTU_V9_IMPORT?.({source,query:searchQuery,results:rows},{focus:false,notify:false,mergeByUrl:true})||0;
  }
  function refreshLinks(){
    const q=query,items=q?[
      ['Google 图片',`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(q)}`],
      ['Bing 图片',`https://www.bing.com/images/search?q=${encodeURIComponent(q)}`],
      ['Google 商品',`https://www.google.com/search?tbm=shop&q=${encodeURIComponent(q)}`],
      ['Alibaba',`https://www.alibaba.com/trade/search?SearchText=${encodeURIComponent(q)}`]
    ]:[];
    $('investigationLinks').innerHTML=items.map(([name,href])=>`<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(name)} ↗</a>`).join('');
  }
  function refreshSource(){
    const source=bridge()?.source?.();
    for(const id of ['investigationImageSource','investigationImageProduct'])if($(id))$(id).disabled=!source||uploading;
    if($('investigationSourceHint'))$('investigationSourceHint').textContent=source?'以图搜索会打开独立标签页；把找到的商品页或来源链接粘贴到下方即可采集。':'上传源图片后，可使用 Google Lens、Bing、Yandex 查找商品或原图。也可直接输入关键词或来源网页。';
    if(current&&current.source!==(source?.activeUrl||''))stop('源图片已更换，已停止上一轮任务；未完成的网页可重试。');
  }
  async function upload(file,kind='upload'){
    if(!file||uploading)return;uploading=true;refreshSource();$('investigationFile').disabled=true;status('正在读取源图片…');
    try{if(!await bridge()?.uploadImage?.(file,kind))throw new Error('图片读取失败，请选择有效的图片文件。');bridge()?.setView?.('research');status('源图片已就绪，可启动以图搜索或采集来源网页。')}
    catch(error){status(error.message,true)}
    finally{uploading=false;$('investigationFile').disabled=false;refreshSource();$('investigationFile').value=''}
  }
  async function loadImageLink(){
    const value=url($('investigationImageUrl').value);if(!value)return status('请输入有效的 HTTP / HTTPS 图片直链。',true);
    if(uploading)return;uploading=true;refreshSource();$('investigationLoadImage').disabled=true;status('正在载入图片链接…');
    try{if(!await bridge()?.loadImageUrl?.(value))throw new Error('图片链接无法读取；可下载图片后上传本地文件。');bridge()?.setView?.('research');status('源图片已载入。')}
    catch(error){status(error.message,true)}
    finally{uploading=false;$('investigationLoadImage').disabled=false;refreshSource()}
  }
  async function search(){
    saveQuery($('investigationQuery').value);if(!query){status('请输入商品名称、品牌、型号或搜索词。',true);$('investigationQuery').focus();return}
    saveScope($('investigationScope').value);const job=begin('search');refreshLinks();status('正在查询真实来源…');
    try{
      const path=job.scope==='media'?`/api/media-search?q=${encodeURIComponent(job.query)}&type=image&providers=openverse,wikimedia-commons,internet-archive`:`/api/${job.scope==='supplier'?'supplier':'product'}-search?q=${encodeURIComponent(job.query)}`;
      const data=await request(path,job);if(!active(job))return;
      if(!data.enabled){status('站内商品／供应商聚合未配置。本次没有新增结果；可使用以图搜索，或打开上方平台后粘贴找到的网页链接。',true);return}
      const rows=(Array.isArray(data.items)?data.items:[]).filter(r=>url(r.link||r.url)).map(r=>({...r,url:r.link||r.url,image:r.thumbnail||r.image||'',engine:r.provider||r.source||data.provider||'公开图片 API',date:r.publishedAt||r.date||'',width:r.meta?.width||r.width||0,height:r.meta?.height||r.height||0,captureState:'api',query:job.query}));
      const added=addRows(rows,data.provider||'公开图片搜索',job.query);remember(job,added);
      const failures=(data.providers||[]).filter(p=>!p.enabled).map(p=>p.name);
      status(added?`本次查询已加入 ${added} 条真实结果${failures.length?`；${failures.join('、')}暂不可用`:''}。可勾选对比、打开来源或留证。`:`本次查询没有返回可用结果${failures.length?`；${failures.join('、')}暂不可用`:''}，已有调查内容保留。`);
    }catch(error){if(active(job))status(`查询失败：${error.message}；可重试或粘贴来源网页采集。`,true)}
    finally{finish(job)}
  }
  async function collect(){
    const values=[...new Set($('investigationUrls').value.split(/\n+/).map(v=>v.trim()).filter(Boolean))];
    if(!values.length)return status('粘贴商品页、供应商页或图片来源链接，每行一个。',true);
    if(values.length>10)return status('每次最多采集 10 个网页，请分批提交。',true);
    stop();manualCaptureId=null;
    captures=values.map(raw=>({id:++captureId,raw,href:url(raw),query,state:'pending',message:'等待采集'}));
    return collectRows(captures);
  }
  async function collectRows(rows){
    if(current||!rows.length)return;
    for(const row of rows){row.state='pending';row.message='等待采集'}
    const job=begin('collect');job.rows=rows;let done=0,added=0,index=0;
    status(`正在采集 0 / ${rows.length} 个网页…`);
    async function worker(){while(active(job)&&index<rows.length){
      const row=rows[index++],href=row.href;row.state='running';row.message='正在读取公开网页…';renderCaptures();
      try{
        if(!href)throw new Error('链接格式无效，仅支持 HTTP / HTTPS。');
        const data=await request(`/api/url-status?url=${encodeURIComponent(href)}`,job);if(!active(job))return;
        if(!data.alive)throw new Error(data.status?`网页返回 HTTP ${data.status}，可能需要登录或限制采集。`:'网页无法读取，可能受限或超时。');
        const product=data.product||{},title=data.title||product.name;
        if(!title&&!data.image&&!product.image)throw new Error('未提取到标题或图片，可使用手工记录。');
        added+=addRows([{title:title||href,url:url(data.finalUrl)||href,image:data.image||product.image||'',price:data.priceSource==='structured-product'||product.price!==''&&product.price!=null?data.price||String(product.price):'',observedPrice:data.priceSource==='page-text'?data.price||'':'',priceSource:data.priceSource||'',product,snippet:data.description||'',date:data.publishedAt||'',captureState:'page',query:row.query,capturedAt:data.checkedAt||Date.now()}],'网页采集',row.query);
        row.title=title||href;row.state='ok';row.message='已采集公开页面信息；同款与原作者仍需核对。';
      }catch(error){if(!active(job))return;row.state='error';row.message=error.message+' 可重试或手工记录。'}
      done++;renderCaptures();if(active(job))status(`已处理 ${done} / ${rows.length} 个网页，加入 ${added} 条来源…`);
    }}
    try{await Promise.all(Array.from({length:Math.min(2,rows.length)},()=>worker()));if(active(job))status(`采集完成：${done} 个网页，加入／更新 ${added} 条真实来源。${rows.some(row=>row.state==='error')?'未完成的链接可重试或手工记录。':''}`)}
    finally{finish(job)}
  }
  function recordCapture(row){
    if(current)return;
    const form=$('investigationManualForm');form.reset();manualCaptureId=row.id;
    $('investigationManualUrl').value=row.href||row.raw;$('investigationManualTitle').value=row.title||'';
    $('investigationManualNote').value=`网页自动采集未完成：${row.message}`.slice(0,700);
    form.closest('details').open=true;$('investigationManualTitle').focus();
    status('已填入该来源链接，请补充标题、图片或价格后加入调查。');
  }
  function manual(){
    if(current)return;
    const href=url($('investigationManualUrl').value),title=$('investigationManualTitle').value.trim();
    if(!href||!title)return status('手工记录需填写有效来源链接和标题。',true);
    const rawImage=$('investigationManualImage').value.trim(),image=rawImage?url(rawImage):'';
    if(rawImage&&!image)return status('图片直链格式无效。',true);
    const product={brand:$('investigationManualBrand').value.trim(),model:$('investigationManualModel').value.trim()};
    const capture=captures.find(row=>row.id===manualCaptureId),recordQuery=capture?.query??query;
    const count=addRows([{title,url:href,image,price:$('investigationManualPrice').value.trim(),product,snippet:$('investigationManualNote').value.trim(),captureState:'manual',query:recordQuery}],'手工记录',recordQuery);
    if(count&&capture){capture.title=title;capture.state='manual';capture.message='已手工加入调查，页面信息由人工记录。';manualCaptureId=null;renderCaptures()}
    status(count?'手工线索已加入调查，已标明记录来源；可对比、留证并保存项目。':'未加入线索，请检查链接。');
  }
  async function restore(payload){
    stop('已切换调查项目。');captures=[];manualCaptureId=null;renderCaptures();saveQuery(payload.query||'');if($('investigationQuery'))$('investigationQuery').value=query;refreshLinks();
    if(payload.source?.thumb){const blob=await(await fetch(payload.source.thumb)).blob();await upload(new File([blob],payload.source.name||'项目预览.jpg',{type:blob.type}),'project');status('调查项目已恢复，当前显示保存的预览图；精确比图可重新上传原图。')}
    else{await bridge()?.clearImage?.();status('调查项目已恢复，可继续采集来源或上传源图片。')}
  }
  function init(){
    const host=$('v9Workflow');if(!host||host.dataset.ready)return;host.dataset.ready='true';
    host.innerHTML=`<div class="investigation-heading"><div><span class="section-kicker">开始调查</span><h2>上传图片、找来源，再把真实网页加入调查</h2></div><span>所有结果与证据保存在本机</span></div>
      <div class="investigation-source-tools"><label class="secondary-btn">上传源图片<input id="investigationFile" type="file" accept="image/*" hidden></label><form id="investigationImageForm"><label class="sr-only" for="investigationImageUrl">图片直链</label><input id="investigationImageUrl" type="url" placeholder="或粘贴图片直链" maxlength="4096"><button class="secondary-btn" id="investigationLoadImage" type="submit">载入图片</button></form><button class="secondary-btn" id="investigationImageSource" disabled>以图找来源</button><button class="secondary-btn" id="investigationImageProduct" disabled>以图找商品</button></div>
      <p class="investigation-hint" id="investigationSourceHint"></p>
      <form id="investigationSearchForm" class="investigation-query-row"><label for="investigationQuery">搜索词 / 品牌 / 型号</label><input id="investigationQuery" maxlength="160" placeholder="例如 garden shed、品牌型号、条码" value="${esc(query)}"><label class="sr-only" for="investigationScope">查询范围</label><select id="investigationScope"><option value="media">公开图片来源</option><option value="product">商品聚合</option><option value="supplier">供应商聚合</option></select><button class="primary-mini" id="investigationSearch" type="submit">查询并加入调查</button></form><div class="investigation-platform-links" id="investigationLinks"></div>
      <details class="investigation-history" id="investigationHistory" hidden><summary id="investigationHistorySummary">最近查询</summary><ol id="investigationHistoryList"></ol><button class="secondary-btn compact" type="button" id="investigationClearHistory">清空查询历史</button></details>
      <div class="investigation-collect"><form id="investigationCollectForm"><label for="investigationUrls">采集找到的商品页或来源网页</label><textarea id="investigationUrls" rows="2" maxlength="45000" placeholder="粘贴网页链接，每行一个，最多 10 个"></textarea><button class="primary-mini" id="investigationCollect" type="submit">采集网页信息</button></form><p>自动读取公开页面的标题、图片、价格和规格。需要登录或限制采集的网页，可手工记录；不会生成假结果。</p></div>
      <div class="investigation-progress"><p id="investigationStatus" role="status" aria-live="polite">准备就绪。上传图片或粘贴来源网页即可开始。</p><button class="secondary-btn compact" id="investigationCancel" hidden>停止</button><button class="secondary-btn compact" type="button" id="investigationRetryFailed" hidden>重试未完成</button></div><ul class="investigation-capture-log" id="investigationCaptureLog"></ul>
      <details class="investigation-manual"><summary>网页受限？手工添加线索</summary><form id="investigationManualForm"><label>来源网页<input id="investigationManualUrl" type="url" required placeholder="https://…"></label><label>标题<input id="investigationManualTitle" required maxlength="320"></label><label>商品图片直链（可选）<input id="investigationManualImage" type="url"></label><label>页面价格（可选）<input id="investigationManualPrice" maxlength="100" placeholder="如 EUR 199"></label><label>品牌（可选）<input id="investigationManualBrand" maxlength="100"></label><label>型号（可选）<input id="investigationManualModel" maxlength="100"></label><label class="investigation-note-field">备注 / 核对记录<textarea id="investigationManualNote" rows="2" maxlength="700"></textarea></label><button class="secondary-btn" id="investigationManualSave" type="submit">加入调查</button></form></details>`;
    $('investigationFile').onchange=e=>upload(e.target.files?.[0]);
    $('investigationImageForm').onsubmit=e=>{e.preventDefault();loadImageLink()};
    $('investigationSearchForm').onsubmit=e=>{e.preventDefault();search()};
    $('investigationCollectForm').onsubmit=e=>{e.preventDefault();collect()};
    $('investigationManualForm').onsubmit=e=>{e.preventDefault();manual()};
    $('investigationCancel').onclick=()=>stop();
    $('investigationRetryFailed').onclick=()=>collectRows(captures.filter(row=>row.href&&['error','stopped'].includes(row.state)));
    $('investigationCaptureLog').onclick=e=>{const retry=e.target.closest('[data-capture-retry]'),manual=e.target.closest('[data-capture-manual]');const row=captures.find(row=>row.id===Number(retry?.dataset.captureRetry||manual?.dataset.captureManual));if(row&&!current){if(retry)collectRows([row]);if(manual)recordCapture(row)}};
    $('investigationQuery').oninput=e=>{if(current)stop('搜索词已更改，已停止上一轮任务；已采集结果保留。');saveQuery(e.target.value);refreshLinks()};
    $('investigationScope').value=scope;$('investigationScope').onchange=e=>{if(current?.kind==='search')stop('查询范围已更改，已停止上一轮查询。');saveScope(e.target.value)};
    $('investigationHistoryList').onclick=e=>{const button=e.target.closest('[data-investigation-history]'),item=button&&history[Number(button.dataset.investigationHistory)];if(!item)return;stop();saveQuery(item.query);saveScope(item.scope);$('investigationQuery').value=query;$('investigationScope').value=scope;refreshLinks();$('investigationQuery').focus();status('已恢复搜索词和查询范围，点击“查询并加入调查”可重新查询。')};
    $('investigationClearHistory').onclick=()=>{history=[];try{localStorage.removeItem(HISTORY_KEY)}catch{}renderHistory();status('查询历史已清空，调查结果与证据保留。')};
    for(const [id,preset] of [['investigationImageSource','source'],['investigationImageProduct','product']])$(id).onclick=()=>{if(bridge()?.source?.())bridge().startImageSearch(preset)};
    const source=$('v9Source');source?.addEventListener('dragover',e=>{e.preventDefault();source.classList.add('investigation-drag')});source?.addEventListener('dragleave',()=>source.classList.remove('investigation-drag'));source?.addEventListener('drop',e=>{e.preventDefault();source.classList.remove('investigation-drag');upload(e.dataTransfer?.files?.[0])});
    window.addEventListener('soutu:source-changed',refreshSource);
    window.addEventListener('soutu:analysis-changed',()=>{if(!query){query=bridge()?.primaryQuery?.()||'';$('investigationQuery').value=query;refreshLinks()}});
    refreshSource();refreshLinks();renderHistory();renderCaptures();window.dispatchEvent(new CustomEvent('soutu:investigation-ready'));
  }
  window.SOUTU_INVESTIGATION={query:()=>query,restore};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
