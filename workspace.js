(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const bridge=()=>window.SOUTU_BRIDGE;
  const esc=value=>String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon=name=>`<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
  let configured=false,checking=true,request=0,controller=null,imageItems=[];
  const tabs=[$('imageSearchTab'),$('keywordSearchTab')];
  function showTab(index,focus=false){
    tabs.forEach((tab,i)=>{tab.setAttribute('aria-selected',String(i===index));tab.tabIndex=i===index?0:-1;$(tab.getAttribute('aria-controls')).hidden=i!==index});
    if(focus)tabs[index].focus();
    if(index===1){const input=$('keywordQuery');if(!input.value)input.value=bridge()?.primaryQuery?.()||'';if(!focus)input.focus()}
  }
  tabs.forEach((tab,i)=>{
    tab.addEventListener('click',()=>showTab(i));
    tab.addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
      event.preventDefault();showTab(event.key==='Home'?0:event.key==='End'?1:1-i,true);
    });
  });
  $('keywordSearchForm').addEventListener('submit',event=>{event.preventDefault();if(!$('keywordQuery').value.trim()){bridge()?.toast?.('请输入关键词','输入明确的名称、品牌、型号或描述。','error');$('keywordQuery').focus();return}bridge()?.setQuery?.($('keywordQuery').value);$('universalSearchBtn').click()});
  $('engineExpandBtn').addEventListener('click',()=>{
    const expanded=$('engineGroups').classList.toggle('show-all');
    $('engineExpandBtn').setAttribute('aria-expanded',String(expanded));
    $('engineExpandBtn').textContent=expanded?'只看已选引擎':'查看全部引擎';
  });
  $('analyzeBtn').addEventListener('click',()=>{$('analysisDetails').open=true});
  const note=document.createElement('p');note.className='search-note';note.textContent='搜索引擎在新标签页打开。本地图片会创建短时链接；不支持直连的引擎需上传或粘贴图片。';
  document.querySelector('.engines-section').append(note);

  // Retry a failed thumbnail through the existing restricted public-image proxy,
  // then retain an explicit state and the working source link. Never leave blank cards.
  function imageError(event){
    const img=event.target;
    if(!(img instanceof HTMLImageElement)||!img.matches('[data-search-image],.universal-media img'))return;
    if(!img.dataset.retried){
      img.dataset.retried='true';
      const raw=img.getAttribute('src');
      if(/^https?:\/\//i.test(raw||'')){img.src=`/api/image-proxy?url=${encodeURIComponent(raw)}`;return}
    }
    img.hidden=true;
    const parent=img.parentElement;
    if(!parent.querySelector('.image-load-failed')){
      const fallback=document.createElement('span');fallback.className='image-load-failed';fallback.innerHTML=icon('image')+'<span>缩略图暂不可用</span><span>打开来源查看图片 ↗</span>';parent.append(fallback);
    }
  }
  document.addEventListener('error',imageError,true);

  function empty(title,description,action=false){
    $('imageResults').innerHTML=`<div class="search-empty">${icon('origin')}<h3>${esc(title)}</h3><p>${esc(description)}</p>${action?'<button class="secondary-btn" id="openImageEngines">打开所选引擎</button>':''}</div>`;
    $('openImageEngines')?.addEventListener('click',()=>$('runSearch').click());
  }
  function syncSource(){
    request++;controller?.abort();controller=null;imageItems=[];
    const source=bridge()?.source?.();
    $('imageAggregateBtn').disabled=!source||!configured;
    $('imageAggregateBtn').innerHTML=icon('search')+(checking?'正在检测服务…':configured?'检索图片':'站内检索未连接');
    $('imageResultsHint').textContent=configured?'Google Lens 返回的图片匹配；未计算本地相似度。':'第三方搜图可直接使用；本站尚未连接视觉结果聚合服务。';
    if(!source)empty('等待一张图片','拖入或粘贴图片，选择想找的内容，即可开始。');
    else if(configured)empty('图片已就绪','点击「检索图片」查看匹配，或打开上方搜索引擎。');
    else empty('先用搜索引擎查找这张图','打开上方推荐引擎，查看真实的图片匹配结果。站内视觉检索需要连接服务后启用。',true);
  }
  async function checkService(){
    try{const res=await fetch('/api/image-search',{cache:'no-store'}),data=await res.json();configured=res.ok&&data.enabled===true}catch{configured=false}
    checking=false;syncSource();
  }
  function renderMatches(items){
    if(!items.length){empty('没有找到图片匹配','可以裁剪主体、换一个引擎继续搜索；当前没有可展示的匹配结果。',true);return}
    $('imageResults').innerHTML=`<p class="query-result-note">${items.length} 条视觉检索候选 · 相似图片不代表已确认原作者或同款</p><div class="image-result-grid">${items.map(x=>`<article class="image-result-card"><a href="${esc(x.link)}" target="_blank" rel="noopener noreferrer">${x.thumbnail?`<img data-search-image src="${esc(x.thumbnail)}" alt="${esc(x.title)}" loading="lazy" referrerpolicy="no-referrer">`:`<span class="image-load-failed">${icon('image')}没有缩略图，打开来源查看</span>`}</a><div class="image-result-body"><div class="image-match-type">Google Lens · 视觉候选</div><h3>${esc(x.title||'图片来源')}</h3><span>${esc(x.source||new URL(x.link).hostname)}</span><br><a href="${esc(x.link)}" target="_blank" rel="noopener noreferrer">打开来源 ${icon('arrow-up-right')}</a></div></article>`).join('')}</div><button class="secondary-btn" id="saveImageMatches">送入调查中心</button>`;
    $('saveImageMatches').addEventListener('click',()=>{
      window.SOUTU_V9_IMPORT?.({source:'Google Lens image search',capturedAt:Date.now(),results:imageItems.map(x=>({title:x.title,url:x.link,image:x.thumbnail,thumbnail:x.thumbnail,source:x.source,engine:'Google Lens',captureState:'visual-search',scores:{}}))});
      bridge()?.setView?.('research');
    });
  }
  $('imageAggregateBtn').addEventListener('click',async()=>{
    if(!configured||!bridge()?.source?.())return;
    const token=++request,source=bridge().activeUrl();
    controller?.abort();controller=new AbortController();
    $('imageAggregateBtn').disabled=true;
    $('imageResults').innerHTML='<div class="loading-block"><span class="spinner"></span>正在使用图片进行视觉检索…</div>';
    try{
      const imageUrl=await bridge().publicImageUrl();
      if(token!==request||source!==bridge().activeUrl())return;
      if(!imageUrl)throw new Error('暂时无法生成图片链接，请打开搜索引擎上传或粘贴图片。');
      const res=await fetch('/api/image-search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({imageUrl}),signal:controller.signal});
      const data=await res.json();
      if(token!==request||source!==bridge().activeUrl())return;
      if(!res.ok||!data.enabled)throw new Error(data.message||'视觉检索暂不可用，请稍后重试。');
      imageItems=(data.items||[]).filter(x=>{try{return /^https?:$/.test(new URL(x.link).protocol)}catch{return false}});renderMatches(imageItems);
    }catch(error){if(token===request&&error.name!=='AbortError')empty('本次视觉检索未完成',error.message,true)}
    finally{if(token===request)$('imageAggregateBtn').disabled=false}
  });
  window.addEventListener('soutu:source-changed',syncSource);
  window.addEventListener('soutu:analysis-changed',()=>{const input=$('keywordQuery');if(document.activeElement!==input)input.value=bridge()?.primaryQuery?.()||''});
  syncSource();checkService();
})();
