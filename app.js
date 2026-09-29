(() => {
  'use strict';

  const MAX_FILE = 20 * 1024 * 1024;
  const MAX_BATCH = 50;
  const KEYS = {
    history:'soutu-pro-history-v5', settings:'soutu-pro-settings-v5', custom:'soutu-pro-custom-v5',
    projects:'soutu-pro-projects-v1', favorites:'soutu-pro-favorites-v1', universalFavorites:'soutu-pro-universal-favorites-v1'
  };

  const builtinEngines = [
    { id:'google', name:'Google Lens', iconUrl:'https://www.gstatic.com/images/branding/product/2x/lens_96dp.png', category:'通用', desc:'商品、文字、地点与相似内容', uploadPage:'https://lens.google.com/', direct:url=>`https://lens.google.com/uploadbyurl?url=${encodeURIComponent(url)}` },
    { id:'bing', name:'Bing Visual Search', iconUrl:'https://www.bing.com/favicon.ico', category:'通用', desc:'相似图片、购物与网页结果', uploadPage:'https://www.bing.com/images' },
    { id:'yandex', name:'Yandex Images', iconUrl:'https://yandex.com/favicon.ico', category:'通用', desc:'局部物体与视觉近似匹配', uploadPage:'https://yandex.com/images/', direct:url=>`https://yandex.com/images/search?rpt=imageview&url=${encodeURIComponent(url)}` },
    { id:'tineye', name:'TinEye', iconUrl:'https://tineye.com/favicon.ico', category:'通用', desc:'追踪图片复用、修改版本与来源', uploadPage:'https://tineye.com/', direct:url=>`https://tineye.com/search?url=${encodeURIComponent(url)}` },
    { id:'google-shopping', name:'Lens · 商品', iconUrl:'https://www.gstatic.com/images/branding/product/2x/lens_96dp.png', category:'商品', desc:'同款、替代品与相关商品页', uploadPage:'https://lens.google.com/', direct:url=>`https://lens.google.com/uploadbyurl?url=${encodeURIComponent(url)}` },
    { id:'bing-shopping', name:'Bing · 商品', iconUrl:'https://www.bing.com/favicon.ico', category:'商品', desc:'视觉搜索后继续筛购物结果', uploadPage:'https://www.bing.com/images' },
    { id:'saucenao', name:'SauceNAO', iconUrl:'https://saucenao.com/favicon.ico', category:'动漫/插画', desc:'插画与二次元图片来源', uploadPage:'https://saucenao.com/', direct:url=>`https://saucenao.com/search.php?url=${encodeURIComponent(url)}` },
    { id:'trace', name:'trace.moe', iconUrl:'https://trace.moe/favicon.svg', category:'动漫/插画', desc:'动画截图定位作品、集数与时间点', uploadPage:'https://trace.moe/', direct:url=>`https://trace.moe/?url=${encodeURIComponent(url)}` },
    { id:'ascii2d', name:'Ascii2D', iconUrl:'https://ascii2d.net/favicon.ico', category:'动漫/插画', desc:'颜色与特征两种方式找插画来源', uploadPage:'https://ascii2d.net/', direct:url=>`https://ascii2d.net/search/url/${encodeURIComponent(url)}` },
    { id:'iqdb', name:'IQDB', iconUrl:'https://iqdb.org/favicon.ico', category:'动漫/插画', desc:'聚合多个二次元图库匹配', uploadPage:'https://iqdb.org/', direct:url=>`https://iqdb.org/?url=${encodeURIComponent(url)}` },
  ];

  const presets = [
    { id:'product', title:'商品找同款', desc:'家具、服装、零件、包装', engines:['google','bing','yandex','google-shopping'] },
    { id:'source', title:'找原图来源', desc:'出处、盗图、最早版本', engines:['tineye','google','yandex','bing'] },
    { id:'hd', title:'找高清版本', desc:'更大尺寸或低压缩版本', engines:['tineye','google','yandex'] },
    { id:'anime', title:'动漫 / 插画', desc:'番剧截图、作者与插画来源', engines:['saucenao','trace','ascii2d','iqdb'] },
    { id:'industrial', title:'工业产品找同款', desc:'结构、轮廓、五金与局部节点', engines:['google','bing','yandex','tineye'] },
    { id:'all', title:'全部搜索', desc:'覆盖尽可能多的索引', engines:builtinEngines.map(e=>e.id) },
  ];

  const marketplaces = [
    {id:'google-shop',name:'Google Shopping',group:'零售',iconUrl:'https://www.google.com/favicon.ico',url:q=>`https://www.google.com/search?tbm=shop&q=${encodeURIComponent(q)}`},
    {id:'amazon',name:'Amazon',group:'零售',iconUrl:'https://www.amazon.com/favicon.ico',url:q=>`https://www.amazon.com/s?k=${encodeURIComponent(q)}`},
    {id:'walmart',name:'Walmart',group:'零售',iconUrl:'https://www.walmart.com/favicon.ico',url:q=>`https://www.walmart.com/search?q=${encodeURIComponent(q)}`},
    {id:'homedepot',name:'Home Depot',group:'家居',iconUrl:'https://www.homedepot.com/favicon.ico',url:q=>`https://www.homedepot.com/s/${encodeURIComponent(q)}`},
    {id:'lowes',name:"Lowe's",group:'家居',iconUrl:'https://www.lowes.com/favicon.ico',url:q=>`https://www.lowes.com/search?searchTerm=${encodeURIComponent(q)}`},
    {id:'wayfair',name:'Wayfair',group:'家居',iconUrl:'https://www.wayfair.com/favicon.ico',url:q=>`https://www.wayfair.com/keyword.php?keyword=${encodeURIComponent(q)}`},
    {id:'alibaba',name:'Alibaba',group:'B2B',iconUrl:'https://www.alibaba.com/favicon.ico',url:q=>`https://www.alibaba.com/trade/search?SearchText=${encodeURIComponent(q)}`},
    {id:'aliexpress',name:'AliExpress',group:'跨境',iconUrl:'https://www.aliexpress.com/favicon.ico',url:q=>`https://www.aliexpress.com/w/wholesale-${encodeURIComponent(q.replace(/\s+/g,'-'))}.html`},
    {id:'mic',name:'Made-in-China',group:'B2B',iconUrl:'https://www.made-in-china.com/favicon.ico',url:q=>`https://www.made-in-china.com/products-search/hot-china-products/${encodeURIComponent(q.replace(/\s+/g,'_'))}.html`},
    {id:'globalsources',name:'Global Sources',group:'B2B',iconUrl:'https://s.globalsources.com/favicon.ico',url:q=>`https://www.globalsources.com/search?query=${encodeURIComponent(q)}`},
  ];

  const socialPlatforms = [
    {id:'youtube',name:'YouTube',group:'视频',iconUrl:'https://www.youtube.com/favicon.ico',url:q=>`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`},
    {id:'tiktok',name:'TikTok',group:'社媒',iconUrl:'https://www.tiktok.com/favicon.ico',url:q=>`https://www.tiktok.com/search?q=${encodeURIComponent(q)}`},
    {id:'instagram',name:'Instagram',group:'社媒',iconUrl:'https://www.instagram.com/favicon.ico',url:q=>`https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(q)}`},
    {id:'facebook',name:'Facebook',group:'社媒',iconUrl:'https://www.facebook.com/favicon.ico',url:q=>`https://www.facebook.com/search/top?q=${encodeURIComponent(q)}`},
    {id:'pinterest',name:'Pinterest',group:'灵感',iconUrl:'https://www.pinterest.com/favicon.ico',url:q=>`https://www.pinterest.com/search/pins/?q=${encodeURIComponent(q)}`},
    {id:'x',name:'X',group:'社媒',iconUrl:'https://x.com/favicon.ico',url:q=>`https://x.com/search?q=${encodeURIComponent(q)}&src=typed_query`},
    {id:'reddit',name:'Reddit',group:'社区',iconUrl:'https://www.redditstatic.com/desktop2x/img/favicon/favicon-32x32.png',url:q=>`https://www.reddit.com/search/?q=${encodeURIComponent(q)}`},
    {id:'xiaohongshu',name:'小红书',group:'国内社媒',iconUrl:'https://www.xiaohongshu.com/favicon.ico',url:q=>`https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(q)}`},
    {id:'douyin',name:'抖音',group:'国内视频',iconUrl:'https://www.douyin.com/favicon.ico',url:q=>`https://www.douyin.com/search/${encodeURIComponent(q)}`},
    {id:'bilibili',name:'哔哩哔哩',group:'国内视频',iconUrl:'https://www.bilibili.com/favicon.ico',url:q=>`https://search.bilibili.com/all?keyword=${encodeURIComponent(q)}`},
    {id:'weibo',name:'微博',group:'国内社媒',iconUrl:'https://weibo.com/favicon.ico',url:q=>`https://s.weibo.com/weibo?q=${encodeURIComponent(q)}`},
    {id:'threads',name:'Threads',group:'社媒',iconUrl:'https://www.threads.net/favicon.ico',url:q=>`https://www.threads.net/search?q=${encodeURIComponent(q)}`},
    {id:'linkedin',name:'LinkedIn',group:'职业',iconUrl:'https://www.linkedin.com/favicon.ico',url:q=>`https://www.linkedin.com/search/results/content/?keywords=${encodeURIComponent(q)}`}
  ];

  const defaultSettings = {
    defaultPreset:'product', tempEndpoint:(window.SOUTU_CONFIG?.tempUploadEndpoint||''), productEndpoint:(window.SOUTU_CONFIG?.productSearchEndpoint||''), ttl:Number(window.SOUTU_CONFIG?.tempUploadTtlMinutes||30), autoPreset:true
  };

  const state = {
    source:null, originalUrl:null, processedUrl:null, useProcessed:false, cropMode:false, cropRect:null,
    selected:[], preset:'product', custom:readJson(KEYS.custom,[]), history:readJson(KEYS.history,[]), privacy:false,
    projects:readJson(KEYS.projects,[]), favorites:readJson(KEYS.favorites,[]), universalFavorites:readJson(KEYS.universalFavorites,[]), settings:{...defaultSettings,...readJson(KEYS.settings,{})},
    analysis:{ocr:'',labels:[],barcodes:[],objects:[],queries:[],running:false}, tempLink:null, tempTimer:null, tempUnavailableReason:'',
    batch:[], view:'search', installPrompt:null, presetTouched:false,
    universal:{mode:'all',platform:'all',country:'all',language:'all',time:'all',type:'all',results:[],providers:[],query:'',expanded:[]}
  };

  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const els={
    searchView:$('#searchView'),batchView:$('#batchView'),projectsView:$('#projectsView'),historyView:$('#historyView'),researchHubView:$('#researchHubView'),tipsView:$('#tipsView'),
    uploader:$('#uploader'),workbench:$('#workbench'),dropZone:$('#dropZone'),fileInput:$('#fileInput'),chooseBtn:$('#chooseBtn'),urlForm:$('#urlForm'),urlInput:$('#urlInput'),
    previewImg:$('#previewImg'),imageStage:$('#imageStage'),cropShade:$('#cropShade'),cropBox:$('#cropBox'),cropActions:$('#cropActions'),applyCrop:$('#applyCrop'),cropReset:$('#cropReset'),
    cropBtn:$('#cropBtn'),rotateBtn:$('#rotateBtn'),flipBtn:$('#flipBtn'),copyBtn:$('#copyBtn'),downloadBtn:$('#downloadBtn'),removeBtn:$('#removeBtn'),
    fileName:$('#fileName'),sourceKind:$('#sourceKind'),dims:$('#dims'),format:$('#format'),size:$('#size'),metaTip:$('#metaTip'),sourceToggle:$('#sourceToggle'),
    analyzeBtn:$('#analyzeBtn'),researchPanel:$('#researchPanel'),reanalyzeBtn:$('#reanalyzeBtn'),saveProjectBtn:$('#saveProjectBtn'),batchObjectsBtn:$('#batchObjectsBtn'),ocrStatus:$('#ocrStatus'),ocrOutput:$('#ocrOutput'),visionStatus:$('#visionStatus'),visionOutput:$('#visionOutput'),barcodeStatus:$('#barcodeStatus'),barcodeOutput:$('#barcodeOutput'),objectsStatus:$('#objectsStatus'),objectsOutput:$('#objectsOutput'),recommendationOutput:$('#recommendationOutput'),queryList:$('#queryList'),addQueryBtn:$('#addQueryBtn'),marketplaceGrid:$('#marketplaceGrid'),federatedSearchBtn:$('#federatedSearchBtn'),supplierSearchBtn:$('#supplierSearchBtn'),mediaSearchBtn:$('#mediaSearchBtn'),productResults:$('#productResults'),universalModes:$('#universalModes'),universalPlatform:$('#universalPlatform'),universalCountry:$('#universalCountry'),universalLanguage:$('#universalLanguage'),universalTime:$('#universalTime'),universalType:$('#universalType'),keywordExpansion:$('#keywordExpansion'),expandKeywordsBtn:$('#expandKeywordsBtn'),batchOpenSourcesBtn:$('#batchOpenSourcesBtn'),universalSearchBtn:$('#universalSearchBtn'),universalMeta:$('#universalMeta'),
    tempLinkCard:$('#tempLinkCard'),tempLinkStatus:$('#tempLinkStatus'),tempLinkBtn:$('#tempLinkBtn'),
    presetGrid:$('#presetGrid'),engineGroups:$('#engineGroups'),engineHint:$('#engineHint'),engineSummary:$('#engineSummary'),selectedCount:$('#selectedCount'),runSearch:$('#runSearch'),privacyMode:$('#privacyMode'),customBtn:$('#customBtn'),
    historyContent:$('#historyContent'),clearHistory:$('#clearHistory'),projectsContent:$('#projectsContent'),clearProjects:$('#clearProjects'),
    batchDrop:$('#batchDrop'),batchChoose:$('#batchChoose'),batchInput:$('#batchInput'),batchPreset:$('#batchPreset'),applyBatchPreset:$('#applyBatchPreset'),runBatch:$('#runBatch'),batchList:$('#batchList'),batchExport:$('#batchExport'),
    themeBtn:$('#themeBtn'),settingsBtn:$('#settingsBtn'),installBtn:$('#installBtn'),commandBtn:$('#commandBtn'),settingsModal:$('#settingsModal'),customModal:$('#customModal'),commandModal:$('#commandModal'),executionModal:$('#executionModal'),shortcutModal:$('#shortcutModal'),shortcutHelp:$('#shortcutHelp'),
    defaultPreset:$('#defaultPreset'),tempEndpointInput:$('#tempEndpointInput'),productEndpointInput:$('#productEndpointInput'),ttlSelect:$('#ttlSelect'),autoPresetToggle:$('#autoPresetToggle'),customName:$('#customName'),customTemplate:$('#customTemplate'),addCustom:$('#addCustom'),
    commandInput:$('#commandInput'),commandList:$('#commandList'),executionList:$('#executionList'),executionSummary:$('#executionSummary'),toastStack:$('#toastStack')
  };

  function icon(name,cls=''){return `<svg class="${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`}
  function escapeHtml(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
  function readJson(k,f){try{return JSON.parse(localStorage.getItem(k)||'')}catch{return f}}
  function writeJson(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch{return false}}
  function reduced(){return matchMedia('(prefers-reduced-motion: reduce)').matches}
  function formatBytes(n){if(!n)return'远程图片';if(n<1024)return`${n} B`;if(n<1048576)return`${(n/1024).toFixed(1)} KB`;return`${(n/1048576).toFixed(1)} MB`}
  function uid(){return crypto.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`}
  function allEngines(){return [...builtinEngines,...state.custom.map(c=>({...c,direct:url=>c.template.replace('{imageUrl}',encodeURIComponent(url))}))]}
  function activeUrl(){return state.useProcessed&&state.processedUrl?state.processedUrl:state.originalUrl}
  function directSourceUrl(){return state.source?.kind==='url'&&!state.useProcessed?state.source.publicUrl:null}
  function toast(title,desc='',tone='default'){const div=document.createElement('div');div.className=`toast ${tone}`;div.innerHTML=`<div>${icon(tone==='ok'?'check':tone==='error'?'x':'info')}</div><span><strong>${escapeHtml(title)}</strong>${desc?`<small>${escapeHtml(desc)}</small>`:''}</span>`;els.toastStack.appendChild(div);setTimeout(()=>{div.classList.add('leaving');setTimeout(()=>div.remove(),160)},3400)}
  function animate(el,keyframes,options){if(!el||reduced())return;try{el.animate(keyframes,options)}catch{}}
  function withTimeout(promise,timeoutMs,label='operation'){return Promise.race([
    Promise.resolve(promise),
    new Promise((_,reject)=>setTimeout(()=>reject(new Error(`${label} timed out after ${Math.round(timeoutMs/1000)}s`)),timeoutMs))
  ])}
  function loadScript(src,key,timeoutMs=15000){return new Promise((resolve,reject)=>{
    if(window[key])return resolve(true);
    let settled=false,timer=null;
    const finish=(ok,value,script)=>{if(settled)return;settled=true;clearTimeout(timer);if(!ok&&script){script.dataset.failed='1';script.remove()}ok?resolve(true):reject(value instanceof Error?value:new Error(String(value||`${key} load failed`)))};
    let s=document.querySelector(`script[data-lib="${key}"]`);
    if(s?.dataset.failed==='1'){s.remove();s=null}
    if(!s){s=document.createElement('script');s.src=src;s.async=true;s.dataset.lib=key;document.head.appendChild(s)}
    s.addEventListener('load',()=>finish(true,true,s),{once:true});
    s.addEventListener('error',()=>finish(false,new Error(`${key} network load failed`),s),{once:true});
    timer=setTimeout(()=>finish(false,new Error(`${key} load timed out after ${Math.round(timeoutMs/1000)}s`),s),timeoutMs);
    if(window[key])finish(true,true,s)
  })}

  async function probe(url){const once=src=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve({width:img.naturalWidth,height:img.naturalHeight});img.onerror=reject;img.src=src});try{return await once(url)}catch(e){if(/^https?:/i.test(String(url||'')))return once(`/api/image-proxy?url=${encodeURIComponent(url)}`);throw e}}
  async function fileData(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=reject;r.readAsDataURL(file)})}
  async function loadImage(url,cors=false){return new Promise((resolve,reject)=>{const img=new Image();if(cors)img.crossOrigin='anonymous';img.onload=()=>resolve(img);img.onerror=reject;img.src=url})}
  const isHttpUrl=url=>/^https?:/i.test(String(url||''));
  const assetProxy=url=>`/api/image-proxy?url=${encodeURIComponent(url)}`;
  async function loadImageSafe(url){
    try{return await loadImage(url,true)}catch(e){
      if(isHttpUrl(url))return loadImage(assetProxy(url),false);
      return loadImage(url,false)
    }
  }
  async function fetchImageBlob(url){
    try{const r=await fetch(url);if(!r.ok)throw new Error(`fetch ${r.status}`);return r.blob()}catch(e){
      if(!isHttpUrl(url))throw e;
      const r=await fetch(assetProxy(url));if(!r.ok)throw new Error(`proxy fetch ${r.status}`);return r.blob()
    }
  }
  async function blobFromActive(){const url=activeUrl();if(!url)throw new Error('no image');return fetchImageBlob(url)}
  function clearAnalysis(){state.analysis={ocr:'',labels:[],barcodes:[],objects:[],queries:[],running:false};els.researchPanel.classList.add('hidden');renderAnalysis()}

  async function acceptFile(file,kind='upload'){
    if(!file||!file.type.startsWith('image/'))return toast('请选择图片文件','支持 JPG、PNG、WebP、GIF 等常见格式。','error');
    if(file.size>MAX_FILE)return toast('图片过大',`最大 20 MB，当前 ${formatBytes(file.size)}。`,'error');
    try{const url=await fileData(file),d=await probe(url);await deleteTempLink();state.source={kind,name:file.name||'剪贴板图片',publicUrl:null,size:file.size,format:(file.type.split('/')[1]||'IMAGE').toUpperCase(),...d};state.originalUrl=url;state.processedUrl=null;state.useProcessed=false;state.cropRect=null;state.cropMode=false;clearAnalysis();syncWorkbench();window.dispatchEvent(new CustomEvent('soutu:source-changed'));toast(kind==='paste'?'已读取剪贴板图片':'图片已就绪','可直接搜图，或先进行 OCR / 视觉分析。','ok');scrollTool()}catch{toast('图片读取失败','文件可能已经损坏。','error')}
  }
  async function acceptUrl(raw){
    try{const u=new URL(raw);if(!/^https?:$/.test(u.protocol))throw new Error();const d=await probe(raw);await deleteTempLink();state.source={kind:'url',name:decodeURIComponent(u.pathname.split('/').pop()||u.hostname),publicUrl:raw,size:0,format:(u.pathname.split('.').pop()||'远程').toUpperCase(),...d};state.originalUrl=raw;state.processedUrl=null;state.useProcessed=false;state.cropRect=null;state.cropMode=false;clearAnalysis();syncWorkbench();window.dispatchEvent(new CustomEvent('soutu:source-changed'));toast('图片链接已载入','支持 URL 参数的引擎可直接进入结果页。','ok');scrollTool()}catch{toast('无法载入图片链接','链接可能无效、需要登录或被防盗链拦截。','error')}
  }
  function scrollTool(){requestAnimationFrame(()=>$('#toolCard')?.scrollIntoView({behavior:reduced()?'auto':'smooth',block:'center'}))}

  function syncWorkbench(){
    const has=!!state.source;els.uploader.classList.toggle('hidden',has);els.workbench.classList.toggle('hidden',!has);if(!has){els.runSearch.disabled=true;return}
    els.previewImg.src=activeUrl();els.fileName.textContent=state.source.name;els.sourceKind.textContent=state.source.kind==='url'?'图片链接':state.source.kind==='paste'?'剪贴板图片':state.source.kind==='project'?'项目缩略图':'本地文件';els.dims.textContent=`${state.source.width} × ${state.source.height}`;els.format.textContent=state.source.format;els.size.textContent=formatBytes(state.source.size);els.sourceToggle.classList.toggle('hidden',!state.processedUrl);$$('[data-use]').forEach(b=>b.classList.toggle('active',(b.dataset.use==='processed')===state.useProcessed));
    const canDirect=!!directSourceUrl()||isTempValid();const tip=canDirect?'当前图片已有可访问 URL，支持直链的引擎可以直接进入搜索结果。':'当前为本地处理图。未配置临时图片服务时，部分第三方引擎需要手动上传。';els.metaTip.innerHTML=`${icon('info')}<span>${escapeHtml(tip)}</span>`;els.engineHint.textContent=canDirect?'直链能力已就绪；不支持 URL 参数的引擎仍会打开上传页。':'配置临时图片服务后，本地图片也能获得短时 URL，提高一键搜索覆盖率。';syncTempCard();renderEngines();syncSearchButton()
  }
  async function removeSource(){await deleteTempLink();state.source=null;state.originalUrl=null;state.processedUrl=null;state.useProcessed=false;state.cropMode=false;state.cropRect=null;clearAnalysis();els.uploader.classList.remove('hidden');els.workbench.classList.add('hidden');els.fileInput.value='';els.urlInput.value='';renderEngines();syncSearchButton()}

  function renderPresets(){const map={product:'shopping',source:'origin',hd:'expand',anime:'sparkles',industrial:'scan',all:'grid'};els.presetGrid.innerHTML=presets.map(p=>`<button class="preset-card ${state.preset===p.id?'active':''}" data-preset="${p.id}" aria-pressed="${state.preset===p.id}"><span class="preset-icon">${icon(map[p.id])}</span><span class="preset-check">${icon('check')}</span><strong>${p.title}</strong><span class="preset-desc">${p.desc}</span></button>`).join('')}
  function choosePreset(id,announce=true){const p=presets.find(x=>x.id===id);if(!p)return;state.preset=id;state.selected=[...p.engines];if(announce)state.presetTouched=true;renderPresets();renderEngines();syncSearchButton();if(announce)toast(`已切换：${p.title}`,'搜索引擎选择已同步。','ok')}

  const engineTones={google:'google',bing:'bing',yandex:'yandex',tineye:'tineye','google-shopping':'google', 'bing-shopping':'bing',saucenao:'sauce',trace:'trace',ascii2d:'ascii',iqdb:'iqdb'};
  const groupMeta={
    '通用':{title:'通用搜索',desc:'网页、来源、相似图与视觉检索',icon:'search'},
    '商品':{title:'商品视觉搜索',desc:'同款、替代品与购物结果',icon:'shopping'},
    '动漫/插画':{title:'动漫与插画',desc:'番剧截图、作者与图片来源',icon:'sparkles'},
    '自定义':{title:'自定义引擎',desc:'你保存的 URL 搜索模板',icon:'plus'}
  };
  function engineCapability(e){
    const u=directSourceUrl()||(isTempValid()?state.tempLink.url:null);
    if(u&&e.direct)return'direct';
    if(state.source&&e.direct&&state.settings.tempEndpoint&&!state.tempUnavailableReason)return'auto';
    return'manual'
  }
  function engineBrand(e){
    if(e.iconUrl){
      const src=`/api/image-proxy?url=${encodeURIComponent(e.iconUrl)}`;
      return `<span class="engine-mark engine-brand"><img src="${escapeHtml(src)}" alt="" loading="lazy" onerror="this.parentElement.classList.add('icon-failed');this.remove()"><span class="engine-fallback">${icon('search')}</span></span>`
    }
    return `<span class="engine-mark engine-custom-mark">${icon('plus')}</span>`
  }
  function renderEngines(){
    const groups=['通用','商品','动漫/插画','自定义'],engines=allEngines();
    const directCount=engines.filter(e=>state.selected.includes(e.id)&&['direct','auto'].includes(engineCapability(e))).length;
    const manualCount=state.selected.length-directCount;
    if(els.engineSummary)els.engineSummary.textContent=`${state.selected.length} / ${engines.length} 已选`;
    els.engineHint.textContent=state.source?`${directCount} 个可直连 · ${manualCount} 个需要在第三方页面上传/粘贴`:'选好任务与搜索引擎；上传图片后会显示实际执行方式。';
    els.engineGroups.innerHTML=groups.map(group=>{
      const items=engines.filter(e=>e.category===group);if(!items.length)return'';const meta=groupMeta[group]||{title:group,desc:'',icon:'search'};const selectedInGroup=items.filter(e=>state.selected.includes(e.id)).length;
      return`<section class="engine-group engine-group-panel"><header class="engine-group-head"><div class="engine-group-title"><span class="engine-group-icon">${icon(meta.icon)}</span><span><b>${escapeHtml(meta.title)}</b><small>${escapeHtml(meta.desc)} · 已选 ${selectedInGroup}/${items.length}</small></span></div><div class="engine-group-actions"><button data-group-select="${escapeHtml(group)}">全选</button><button data-group-clear="${escapeHtml(group)}">清空</button></div></header><div class="engine-grid">${items.map(e=>{const selected=state.selected.includes(e.id),cap=engineCapability(e),tone=engineTones[e.id]||'custom';return`<article class="engine-card ${selected?'selected':''} capability-${cap}" data-engine-id="${e.id}" data-tone="${tone}"><button class="select-engine" data-engine="${e.id}" aria-pressed="${selected}">${engineBrand(e)}<span class="engine-copy"><span class="engine-title-line"><b>${escapeHtml(e.name)}</b><span class="engine-capability ${cap}">${icon(cap==='manual'?'hand':'bolt')}${cap==='direct'?'直连':cap==='auto'?'可直连':'手动'}</span></span><small>${escapeHtml(e.desc)}</small><span class="engine-help">${cap==='direct'?'当前图片 URL 已就绪':cap==='auto'?'搜索时自动创建临时图片 URL':'打开后上传或粘贴图片'}</span></span><span class="engine-check ${selected?'checked':''}">${icon('check')}</span></button><button class="engine-open" type="button" data-open-engine="${escapeHtml(e.id)}" aria-label="准备并打开 ${escapeHtml(e.name)}" title="准备单引擎搜索">${icon('arrow-up-right')}</button></article>`}).join('')}</div></section>`
    }).join('')
  }
  function syncSearchButton(){els.selectedCount.textContent=state.selected.length;els.runSearch.disabled=!state.source||!state.selected.length}

  async function imageToCanvas(url){const img=await loadImageSafe(url);const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const ctx=c.getContext('2d',{willReadFrequently:true});if(!ctx)throw new Error('canvas');ctx.drawImage(img,0,0);return{img,c,ctx}}
  async function transform(kind){
    if(!activeUrl())return;
    try{const img=await loadImageSafe(activeUrl());let c=document.createElement('canvas'),ctx=c.getContext('2d',{willReadFrequently:true});if(!ctx)throw new Error();
      if(kind==='rotate'){c.width=img.naturalHeight;c.height=img.naturalWidth;ctx.translate(c.width,0);ctx.rotate(Math.PI/2);ctx.drawImage(img,0,0)}
      if(kind==='flip'){c.width=img.naturalWidth;c.height=img.naturalHeight;ctx.translate(c.width,0);ctx.scale(-1,1);ctx.drawImage(img,0,0)}
      if(kind==='crop'){const r=state.cropRect;if(!r)return;const sx=Math.round(r.x*img.naturalWidth),sy=Math.round(r.y*img.naturalHeight),sw=Math.max(1,Math.round(r.w*img.naturalWidth)),sh=Math.max(1,Math.round(r.h*img.naturalHeight));c.width=sw;c.height=sh;ctx.drawImage(img,sx,sy,sw,sh,0,0,sw,sh)}
      state.processedUrl=c.toDataURL('image/png');state.useProcessed=true;state.cropMode=false;state.cropRect=null;await deleteTempLink();syncCropUi();syncWorkbench();clearAnalysis();toast(kind==='crop'?'裁剪已应用':kind==='rotate'?'已旋转 90°':'已水平翻转','处理只发生在当前浏览器。','ok')
    }catch{toast('无法处理这张图片','远程图片可能受跨域限制；请下载后作为本地文件上传。','error')}
  }
  async function processImage(kind){
    if(!activeUrl())return;
    const button=$(`[data-process="${kind}"]`);button?.classList.add('busy');
    try{const img=await loadImageSafe(activeUrl());let c=document.createElement('canvas'),ctx=c.getContext('2d',{willReadFrequently:true});if(!ctx)throw new Error('canvas');
      if(kind==='upscale'){c.width=Math.min(8192,img.naturalWidth*2);c.height=Math.min(8192,img.naturalHeight*2);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(img,0,0,c.width,c.height)}
      else{c.width=img.naturalWidth;c.height=img.naturalHeight;ctx.drawImage(img,0,0);let data=ctx.getImageData(0,0,c.width,c.height),d=data.data;
        if(kind==='contrast'){const factor=1.28;for(let i=0;i<d.length;i+=4){d[i]=clamp((d[i]-128)*factor+128);d[i+1]=clamp((d[i+1]-128)*factor+128);d[i+2]=clamp((d[i+2]-128)*factor+128)}ctx.putImageData(data,0,0)}
        if(kind==='edge'){const gray=new Uint8ClampedArray(c.width*c.height);for(let i=0,j=0;i<d.length;i+=4,j++)gray[j]=.299*d[i]+.587*d[i+1]+.114*d[i+2];const out=ctx.createImageData(c.width,c.height);const od=out.data;for(let y=1;y<c.height-1;y++)for(let x=1;x<c.width-1;x++){const at=(xx,yy)=>gray[yy*c.width+xx];const gx=-at(x-1,y-1)+at(x+1,y-1)-2*at(x-1,y)+2*at(x+1,y)-at(x-1,y+1)+at(x+1,y+1);const gy=-at(x-1,y-1)-2*at(x,y-1)-at(x+1,y-1)+at(x-1,y+1)+2*at(x,y+1)+at(x+1,y+1);const v=255-Math.min(255,Math.hypot(gx,gy)*1.2);const p=(y*c.width+x)*4;od[p]=od[p+1]=od[p+2]=v;od[p+3]=255}ctx.putImageData(out,0,0)}
        if(kind==='sharpen'){const src=new Uint8ClampedArray(d),w=c.width,h=c.height,k=[0,-1,0,-1,5,-1,0,-1,0];for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){for(let ch=0;ch<3;ch++){let sum=0,ki=0;for(let yy=-1;yy<=1;yy++)for(let xx=-1;xx<=1;xx++,ki++)sum+=src[((y+yy)*w+x+xx)*4+ch]*k[ki];d[(y*w+x)*4+ch]=clamp(sum)}}ctx.putImageData(data,0,0)}
        if(kind==='autocrop'){const box=findContentBounds(d,c.width,c.height);if(box){const out=document.createElement('canvas');out.width=box.w;out.height=box.h;out.getContext('2d').drawImage(c,box.x,box.y,box.w,box.h,0,0,box.w,box.h);c=out}}
      }
      if(kind==='perspective'){c=await withTimeout(autoPerspectiveCanvas(c),12000,'Perspective correction')}
      state.processedUrl=c.toDataURL('image/png');state.useProcessed=true;await deleteTempLink();syncWorkbench();clearAnalysis();const names={autocrop:'已自动裁掉白边',contrast:'已增强对比度',sharpen:'已锐化',edge:'已生成线稿增强',perspective:'已自动矫正透视',upscale:'已放大 2×'};toast(names[kind]||'处理完成','原图仍可随时切换回来。','ok')
    }catch{toast('图片预处理失败','远程图片可能受跨域限制。','error')}finally{button?.classList.remove('busy')}
  }
  const clamp=n=>Math.max(0,Math.min(255,n));
  function findContentBounds(d,w,h){let minX=w,minY=h,maxX=-1,maxY=-1;const step=Math.max(1,Math.floor(Math.max(w,h)/1400));for(let y=0;y<h;y+=step)for(let x=0;x<w;x+=step){const i=(y*w+x)*4,a=d[i+3],brightness=(d[i]+d[i+1]+d[i+2])/3;if(a>15&&brightness<247){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y)}}if(maxX<0)return null;const pad=Math.round(Math.max(w,h)*.02);return{x:Math.max(0,minX-pad),y:Math.max(0,minY-pad),w:Math.min(w,maxX+pad)-Math.max(0,minX-pad),h:Math.min(h,maxY+pad)-Math.max(0,minY-pad)}}

  async function autoPerspectiveCanvas(sourceCanvas){
    const ctx=sourceCanvas.getContext('2d',{willReadFrequently:true});
    if(!ctx)throw new Error('Canvas unavailable');
    const imageData=ctx.getImageData(0,0,sourceCanvas.width,sourceCanvas.height);
    return new Promise((resolve,reject)=>{
      const worker=new Worker('./perspective-worker.js?v=9.1.0');
      let settled=false;
      const finish=(ok,value)=>{
        if(settled)return;
        settled=true;
        clearTimeout(timer);
        worker.terminate();
        ok?resolve(value):reject(value instanceof Error?value:new Error(String(value||'Perspective correction failed')));
      };
      const timer=setTimeout(()=>finish(false,new Error('Perspective correction timed out after 12s')),12000);
      worker.onerror=()=>finish(false,new Error('Perspective worker failed'));
      worker.onmessage=e=>{
        const data=e.data||{};
        if(!data.ok)return finish(false,new Error(data.error||'Perspective correction failed'));
        try{
          const out=document.createElement('canvas');
          out.width=data.width;out.height=data.height;
          const outCtx=out.getContext('2d');
          outCtx.putImageData(new ImageData(new Uint8ClampedArray(data.buffer),data.width,data.height),0,0);
          finish(true,out);
        }catch(error){finish(false,error)}
      };
      const copy=imageData.data.slice();
      worker.postMessage({width:imageData.width,height:imageData.height,buffer:copy.buffer},[copy.buffer]);
    })
  }

  function syncCropUi(){els.imageStage.classList.toggle('cropping',state.cropMode);els.cropShade.classList.toggle('hidden',!state.cropMode);els.cropActions.classList.toggle('hidden',!state.cropMode);els.cropBtn.classList.toggle('active',state.cropMode);if(!state.cropMode||!state.cropRect){els.cropBox.classList.add('hidden');els.applyCrop.disabled=true;return}const r=state.cropRect;els.cropBox.classList.remove('hidden');Object.assign(els.cropBox.style,{left:`${r.x*100}%`,top:`${r.y*100}%`,width:`${r.w*100}%`,height:`${r.h*100}%`});els.applyCrop.disabled=r.w<.02||r.h<.02}

  async function analyzeImage(){
    if(!state.source||state.analysis.running)return;state.analysis.running=true;els.researchPanel.classList.remove('hidden');els.ocrStatus.textContent='正在加载 OCR…';els.visionStatus.textContent='正在加载视觉模型…';els.barcodeStatus.textContent='正在检测…';els.objectsStatus.textContent='正在检测主体…';renderAnalysis();els.researchPanel.scrollIntoView({behavior:reduced()?'auto':'smooth',block:'start'});
    const url=activeUrl(),analysisUrl=isHttpUrl(activeUrl())?assetProxy(activeUrl()):activeUrl();const tasks=[];
    tasks.push((async()=>{try{await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js','Tesseract');els.ocrStatus.textContent='正在识别文字…';const r=await withTimeout(window.Tesseract.recognize(analysisUrl,'eng+chi_sim',{logger:m=>{if(m.status==='recognizing text')els.ocrStatus.textContent=`OCR ${Math.round((m.progress||0)*100)}%`}}),45000,'OCR recognition');state.analysis.ocr=(r.data?.text||'').trim();els.ocrStatus.textContent=state.analysis.ocr?'识别完成':'未识别到文字'}catch(e){els.ocrStatus.textContent='OCR 未加载';state.analysis.ocr='';}})());
    tasks.push((async()=>{try{await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js','tf');await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet@2.1.1/dist/mobilenet.min.js','mobilenet');els.visionStatus.textContent='正在分类…';const model=await withTimeout(window.mobilenet.load({version:2,alpha:1}),20000,'MobileNet model');const img=await loadImageSafe(url);const result=await withTimeout(model.classify(img,5),15000,'MobileNet classify');state.analysis.labels=result.map(x=>({label:x.className,score:x.probability}));els.visionStatus.textContent=state.analysis.labels.length?'分类完成':'没有可靠标签'}catch(e){els.visionStatus.textContent='视觉模型未加载';state.analysis.labels=[]}})());
    tasks.push((async()=>{try{await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js','tf');await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js','cocoSsd');const model=await withTimeout(window.cocoSsd.load({base:'lite_mobilenet_v2'}),20000,'COCO-SSD model');const img=await loadImageSafe(url);const list=await withTimeout(model.detect(img,8,.35),15000,'COCO-SSD detect');state.analysis.objects=list.map(x=>({label:x.class,score:x.score,bbox:x.bbox}));els.objectsStatus.textContent=list.length?`检测到 ${list.length} 个区域`:'未检测到常见对象'}catch(e){state.analysis.objects=[];els.objectsStatus.textContent='对象模型未加载'}})());
    tasks.push((async()=>{try{if(!('BarcodeDetector'in window)){els.barcodeStatus.textContent='当前浏览器不支持';return}const detector=new BarcodeDetector({formats:['qr_code','ean_13','ean_8','code_128','upc_a','upc_e','data_matrix']});const img=await loadImageSafe(url);const list=await withTimeout(detector.detect(img),10000,'Barcode detect');state.analysis.barcodes=list.map(x=>x.rawValue).filter(Boolean);els.barcodeStatus.textContent=list.length?'识别完成':'未检测到条码'}catch{els.barcodeStatus.textContent='检测失败'}})());
    await Promise.allSettled(tasks);state.analysis.running=false;generateQueries();recommendPreset();renderAnalysis();window.dispatchEvent(new CustomEvent('soutu:analysis-changed'));toast('智能分析完成','OCR、视觉标签、条码与搜索词已更新。','ok')
  }
  function normalizeOcr(text){return text.split(/\n+/).map(x=>x.replace(/\s+/g,' ').trim()).filter(x=>x.length>=2&&x.length<=90).slice(0,18)}
  function generateQueries(){const lines=normalizeOcr(state.analysis.ocr);const labels=state.analysis.labels.map(x=>x.label.split(',')[0].trim()).filter(Boolean);const codes=state.analysis.barcodes;const candidates=[];if(lines.length)candidates.push(lines.slice(0,2).join(' '));lines.slice(0,5).forEach(x=>candidates.push(x));codes.forEach(x=>candidates.push(x));if(labels.length)candidates.push(labels.slice(0,2).join(' '));if(lines[0]&&labels[0])candidates.push(`${lines[0]} ${labels[0]}`);state.analysis.queries=[...new Set(candidates.map(x=>x.trim()).filter(Boolean))].slice(0,8)}
  function recommendPreset(){const blob=`${state.analysis.ocr} ${state.analysis.labels.map(x=>x.label).join(' ')}`.toLowerCase();let rec='product';if(/anime|cartoon|comic|manga|animation|illustration/.test(blob))rec='anime';else if(!state.analysis.ocr&&state.analysis.labels.some(x=>x.score>.35))rec='source';const p=presets.find(x=>x.id===rec);state.analysis.recommended=rec;if(state.settings.autoPreset!==false&&!state.presetTouched&&state.preset!==rec)choosePreset(rec,false);els.recommendationOutput.innerHTML=`<div class="recommendation-main"><span>${icon(rec==='anime'?'sparkles':rec==='product'?'shopping':'origin')}</span><div><b>${p.title}</b><small>${p.desc}</small></div><button class="primary-mini" data-accept-recommend="${rec}">采用</button></div>`}
  function renderAnalysis(){
    const a=state.analysis;state.universal.expanded=[];if(els.batchObjectsBtn)els.batchObjectsBtn.classList.toggle('hidden',!(a.objects?.length));els.ocrOutput.classList.toggle('muted-output',!a.ocr);els.ocrOutput.textContent=a.ocr||'识别到的品牌、型号、包装文字会出现在这里。';els.visionOutput.innerHTML=a.labels.length?a.labels.map(x=>`<span class="analysis-tag"><b>${escapeHtml(x.label.split(',')[0])}</b><small>${Math.round(x.score*100)}%</small></span>`).join(''):'<span class="ghost-tag">图片分类结果</span>';els.barcodeOutput.classList.toggle('muted-output',!a.barcodes.length);els.barcodeOutput.textContent=a.barcodes.length?a.barcodes.join('\n'):'支持的浏览器会自动尝试识别。';els.objectsOutput.innerHTML=a.objects?.length?a.objects.map((o,i)=>`<button class="object-chip" data-object-index="${i}"><span><b>${escapeHtml(o.label)}</b><small>${Math.round(o.score*100)}%</small></span><em>裁剪此区域</em></button>`).join(''):'<span class="ghost-tag">检测到的对象区域</span>';renderQueries();renderMarketplaces();if(!els.recommendationOutput.innerHTML)els.recommendationOutput.innerHTML='<div class="muted-output">完成分析后自动推荐。</div>'
  }
  function renderQueries(){els.queryList.innerHTML=state.analysis.queries.length?state.analysis.queries.map((q,i)=>`<div class="query-row"><input value="${escapeHtml(q)}" data-query-index="${i}" aria-label="搜索词 ${i+1}"><button class="query-star ${state.favorites.includes(q)?'active':''}" data-fav-query="${i}" aria-label="收藏搜索词">${icon('star')}</button><button class="query-remove" data-remove-query="${i}" aria-label="删除搜索词">${icon('x')}</button></div>`).join(''):'<div class="query-empty">暂无搜索词。可先智能分析，或手动添加。</div>'}
  function primaryQuery(){return state.analysis.queries.find(Boolean)?.trim()||state.analysis.barcodes[0]||normalizeOcr(state.analysis.ocr)[0]||''}
  function marketBrand(m){const src=`/api/image-proxy?url=${encodeURIComponent(m.iconUrl||'')}`;return `<span class="market-mark market-brand"><img src="${escapeHtml(src)}" alt="" loading="lazy" onerror="this.parentElement.classList.add('icon-failed');this.remove()"><span class="market-fallback">${icon('shopping')}</span></span>`}
  const universalModeTerms={
    all:{zh:[],en:[]},social:{zh:['评测','分享','体验'],en:['review','experience','post']},video:{zh:['视频','测评'],en:['video','review']},
    inspiration:{zh:['灵感','设计','场景'],en:['inspiration','design','ideas']},source:{zh:['原图','出处','来源'],en:['original image','source','origin']},
    hd:{zh:['高清','原图','大图'],en:['high resolution','original','large image']},author:{zh:['作者','摄影师','品牌'],en:['creator','author','photographer']},
    product:{zh:['同款','型号','购买'],en:['same product','model','buy']},competitor:{zh:['竞品','替代品','类似产品'],en:['competitor','alternative','similar product']}
  };
  const bilingualLexicon=[
    [/garden shed|storage shed|tool shed|shed/i,['花园房','工具房','储物棚','garden shed','storage shed','tool shed']],
    [/greenhouse/i,['温室','花房','greenhouse','polycarbonate greenhouse']],[/pergola|louver/i,['凉亭','百叶凉亭','pergola','louvered pergola']],
    [/carport/i,['车棚','停车棚','carport','metal carport']],[/planter|raised bed/i,['花圃','种植箱','raised garden bed','planter box']],
    [/storage box|deck box/i,['户外储物箱','工具箱','outdoor storage box','deck box']],[/awning|canopy/i,['雨棚','门篷','awning','canopy']],
    [/garbage|trash|bin/i,['垃圾桶','垃圾箱','trash bin','garbage enclosure']],[/cabinet|outdoor kitchen/i,['户外厨房柜','橱柜','outdoor kitchen cabinet','outdoor cabinet']]
  ];
  function expandUniversalKeywords(){
    const base=primaryQuery().trim();if(!base)return[];
    const out=[base],lower=base.toLowerCase();for(const [rx,terms] of bilingualLexicon)if(rx.test(lower))out.push(...terms);
    const task=universalModeTerms[state.universal.mode]||universalModeTerms.all;task.zh.forEach(t=>out.push(`${base} ${t}`));task.en.forEach(t=>out.push(`${base} ${t}`));
    state.analysis.labels.slice(0,3).map(x=>x.label.split(',')[0].trim()).filter(Boolean).forEach(l=>{out.push(`${base} ${l}`);out.push(`${l} product`)});
    normalizeOcr(state.analysis.ocr).slice(0,2).forEach(x=>out.push(x));if(state.universal.country!=='all')out.push(`${base} ${state.universal.country}`);
    state.universal.expanded=[...new Set(out.map(x=>x.replace(/\s+/g,' ').trim()).filter(x=>x.length>1))].slice(0,18);return state.universal.expanded;
  }
  function renderKeywordExpansion(){if(!els.keywordExpansion)return;const list=state.universal.expanded.length?state.universal.expanded:expandUniversalKeywords();els.keywordExpansion.innerHTML=list.length?list.map((q,i)=>`<button class="keyword-chip ${state.favorites.includes(q)?'favorite':''}" data-universal-query="${i}" title="点击设为主搜索词">${escapeHtml(q)}<span>${state.favorites.includes(q)?'★':'+'}</span></button>`).join(''):'<span class="ghost-tag">运行智能分析或点击“AI 关键词扩展”</span>'}
  function platformAllowed(m){const mode=state.universal.mode;if(mode==='social')return ['社媒','国内社媒','社区','职业'].includes(m.group);if(mode==='video')return ['视频','国内视频'].includes(m.group);if(mode==='inspiration')return m.id==='pinterest';if(mode==='product'||mode==='competitor')return marketplaces.includes(m);return true}
  function filteredPlatforms(){const all=[...socialPlatforms,...marketplaces].filter(platformAllowed);return state.universal.platform==='all'?all:all.filter(x=>x.id===state.universal.platform)}
  const apiPlatformOptions=[
    {id:'openverse',name:'Openverse'},{id:'wikimedia-commons',name:'Wikimedia Commons'},{id:'nasa-images',name:'NASA Images'},
    {id:'art-institute-chicago',name:'Art Institute Chicago'},{id:'library-of-congress',name:'Library of Congress'},
    {id:'mastodon',name:'Mastodon'},{id:'bluesky',name:'Bluesky'},{id:'pexels',name:'Pexels'},{id:'unsplash',name:'Unsplash'},{id:'pixabay',name:'Pixabay'},{id:'flickr',name:'Flickr'}
  ];
  function providerSlug(v=''){return String(v).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}
  function renderUniversalPlatforms(){if(!els.universalPlatform)return;const all=[...apiPlatformOptions,...socialPlatforms,...marketplaces].filter((x,i,a)=>a.findIndex(y=>y.id===x.id)===i),current=state.universal.platform;els.universalPlatform.innerHTML='<option value="all">全部平台</option>'+all.map(x=>`<option value="${escapeHtml(x.id)}">${escapeHtml(x.name)}</option>`).join('');els.universalPlatform.value=all.some(x=>x.id===current)?current:'all';state.universal.platform=els.universalPlatform.value}
  function renderMarketplaces(){const q=state.universal.expanded[0]||primaryQuery(),all=filteredPlatforms();renderUniversalPlatforms();els.marketplaceGrid.innerHTML=all.map(m=>q?`<a class="market-card" data-platform-id="${escapeHtml(m.id)}" href="${escapeHtml(m.url(q))}" target="_blank" rel="noopener noreferrer">${marketBrand(m)}<span><b>${escapeHtml(m.name)}</b><small>${escapeHtml(m.group)}</small></span>${icon('arrow-up-right')}</a>`:`<button class="market-card" disabled>${marketBrand(m)}<span><b>${escapeHtml(m.name)}</b><small>${escapeHtml(m.group)}</small></span>${icon('arrow-up-right')}</button>`).join('');renderKeywordExpansion()}
  function setUniversalMode(mode){state.universal.mode=mode||'all';els.universalModes?.querySelectorAll('[data-universal-mode]').forEach(b=>b.classList.toggle('active',b.dataset.universalMode===state.universal.mode));if(['source','author'].includes(state.universal.mode))choosePreset('source',false);else if(state.universal.mode==='hd')choosePreset('hd',false);else if(['product','competitor'].includes(state.universal.mode))choosePreset('product',false);state.universal.expanded=[];expandUniversalKeywords();renderMarketplaces()}
  function universalParams(){const p=new URLSearchParams({q:state.universal.expanded[0]||primaryQuery()});for(const k of ['country','language','time','type','platform'])if(state.universal[k]&&state.universal[k]!=='all')p.set(k,state.universal[k]);return p}
  async function federatedProductSearch(){const q=primaryQuery();if(!q)return toast('先准备搜索词','可以运行智能分析或手动添加关键词。','error');const ep=state.settings.productEndpoint.trim().replace(/\/$/,'');if(!ep){els.productResults.classList.remove('hidden');els.productResults.innerHTML=`<div class="provider-empty">${icon('info')}<div><b>商品结果聚合尚未启用</b><p>平台快捷搜索可以直接使用。若要在本站展示价格与商品卡片，请在设置里配置商品聚合 API。</p></div></div>`;return}els.productResults.classList.remove('hidden');els.productResults.innerHTML='<div class="loading-block"><span class="spinner"></span>正在聚合商品结果…</div>';try{const r=await fetch(`${ep}/api/product-search?q=${encodeURIComponent(q)}`);const data=await r.json();if(!r.ok||!data.enabled)throw new Error(data.message||'provider unavailable');const items=data.items||[];els.productResults.innerHTML=items.length?`<div class="result-grid">${items.map(x=>`<a class="result-card" href="${escapeHtml(x.link||'#')}" target="_blank" rel="noopener"><div class="result-thumb">${x.thumbnail?`<img src="${escapeHtml(x.thumbnail)}" alt="">`:icon('image')}</div><div><b>${escapeHtml(x.title||'商品')}</b><span>${escapeHtml(x.price||'价格未知')}</span><small>${escapeHtml(x.source||data.provider||'')}</small></div></a>`).join('')}</div>`:'<div class="provider-empty">没有返回可展示的商品结果。</div>'}catch(e){els.productResults.innerHTML=`<div class="provider-empty">${icon('info')}<div><b>聚合服务不可用</b><p>${escapeHtml(e.message||'请检查 API 配置。')}</p></div></div>`}}

  function mediaMeta(x){const m=x.meta||{},bits=[];if(m.width&&m.height)bits.push(`${m.width}×${m.height}`);if(Number.isFinite(m.duration))bits.push(`${m.duration}s`);if(Number.isFinite(m.likes))bits.push(`${m.likes} 赞`);if(Number.isFinite(m.favourites))bits.push(`${m.favourites} 收藏`);if(m.license)bits.push(String(m.license).toUpperCase());return bits.join(' · ')}
  function renderUniversalResults(items=[],providers=[]){
    let list=items.slice();if(state.universal.platform!=='all')list=list.filter(x=>providerSlug(x.provider||x.source||'')===state.universal.platform||String(x.platformId||'')===state.universal.platform);
    if(state.universal.type!=='all')list=list.filter(x=>(x.type||'').toLowerCase()===state.universal.type);
    const seen=new Set();list=list.filter(x=>{const k=(x.link||x.url||'')+'|'+(x.title||'');if(seen.has(k))return false;seen.add(k);return true});
    const px=x=>(Number(x?.meta?.width)||0)*(Number(x?.meta?.height)||0),date=x=>{const t=Date.parse(x?.publishedAt||'');return Number.isFinite(t)?t:Number.MAX_SAFE_INTEGER};
    if(state.universal.mode==='hd')list.sort((a,b)=>px(b)-px(a));
    else if(state.universal.mode==='source')list.sort((a,b)=>date(a)-date(b)||px(b)-px(a));
    else if(state.universal.mode==='author')list.sort((a,b)=>Number(Boolean(b.author))-Number(Boolean(a.author))||date(a)-date(b));
    state.universal.results=list;state.universal.providers=providers;
    const providerStrip=providers.length?`<div class="provider-strip">${providers.map(p=>`<span class="${p.enabled?'ok':'off'}"><b>${escapeHtml(p.name)}</b><small>${p.enabled?`${p.count||0} 条`:p.configured?'暂不可用':'未配置 Key'}</small></span>`).join('')}</div>`:'';
    const cards=list.map(x=>`<article class="universal-result-card" data-result-type="${escapeHtml(x.type||'post')}"><a class="universal-media" href="${escapeHtml(x.link||x.url||'#')}" target="_blank" rel="noopener noreferrer">${x.thumbnail?`<img src="${escapeHtml(x.thumbnail)}" alt="" loading="lazy" referrerpolicy="no-referrer">`:`<span class="universal-placeholder">${icon(x.type==='video'?'play':x.type==='product'?'shopping':'image')}</span>`}<em>${escapeHtml(x.provider||x.source||'Web')}</em></a><div class="universal-result-body"><b>${escapeHtml(x.title||'未命名结果')}</b><p>${escapeHtml((x.snippet||'').slice(0,180))}</p><div><span>${escapeHtml(x.author||'')}</span><small>${escapeHtml(mediaMeta(x))}</small></div><div class="universal-result-actions"><a href="${escapeHtml(x.link||x.url||'#')}" target="_blank" rel="noopener noreferrer">打开来源</a><button data-copy-result="${escapeHtml(x.link||x.url||'')}">复制链接</button><button class="${state.universalFavorites.some(f=>f.link===(x.link||x.url||''))?'active':''}" data-favorite-result="${escapeHtml(x.link||x.url||'')}">${state.universalFavorites.some(f=>f.link===(x.link||x.url||''))?'已收藏':'收藏'}</button></div></div></article>`).join('');
    els.productResults.classList.remove('hidden');els.productResults.innerHTML=providerStrip+(cards?`<div class="universal-waterfall">${cards}</div>`:'<div class="provider-empty">当前筛选条件下没有可展示结果。</div>');if(els.universalMeta)els.universalMeta.textContent=`${list.length} 条结果 · ${providers.filter(p=>p.enabled).length} 个 API 可用`;
  }
  async function fetchMediaResults(){const ep=state.settings.productEndpoint.trim().replace(/\/$/,'')||location.origin;const r=await fetch(`${ep}/api/media-search?${universalParams().toString()}`);const data=await r.json();if(!r.ok||!data.enabled)throw new Error(data.error||'media providers unavailable');return data}
  async function federatedMediaSearch(){const q=primaryQuery();if(!q)return toast('先准备搜索词','可以运行智能分析或手动添加关键词。','error');state.universal.expanded=expandUniversalKeywords();els.productResults.classList.remove('hidden');els.productResults.innerHTML='<div class="loading-block"><span class="spinner"></span>正在搜索免费媒体 / 社媒 API…</div>';try{const data=await fetchMediaResults();renderUniversalResults(data.items||[],data.providers||[])}catch(e){els.productResults.innerHTML=`<div class="provider-empty">${icon('info')}<div><b>免费 API 聚合不可用</b><p>${escapeHtml(e.message||'请检查 API 配置。')}</p></div></div>`}}
  async function universalSearch(){
    const q=primaryQuery();if(!q)return toast('先准备搜索词','可运行智能分析或手动添加关键词。','error');state.universal.expanded=expandUniversalKeywords();renderKeywordExpansion();els.productResults.classList.remove('hidden');els.productResults.innerHTML='<div class="loading-block"><span class="spinner"></span>正在执行跨平台检索…</div>';
    const jobs=[fetchMediaResults()],wantProduct=['all','product','competitor'].includes(state.universal.mode);if(wantProduct){const ep=state.settings.productEndpoint.trim().replace(/\/$/,'');if(ep)jobs.push(fetch(`${ep}/api/product-search?q=${encodeURIComponent(state.universal.expanded[0]||q)}`).then(r=>r.json()).then(d=>({items:(d.items||[]).map(x=>({...x,type:'product',provider:x.source||d.provider||'Product Search',link:x.link,thumbnail:x.thumbnail})),providers:d.enabled?[{name:d.provider||'Product Search',enabled:true,configured:true,count:(d.items||[]).length}]:[]})).catch(()=>({items:[],providers:[]})))}
    const settled=await Promise.allSettled(jobs),items=[],providers=[];settled.forEach(x=>{if(x.status==='fulfilled'){items.push(...(x.value.items||[]));providers.push(...(x.value.providers||[]))}});renderUniversalResults(items,providers);
    if(!state.privacy){state.history=[{id:uid(),createdAt:Date.now(),label:`全网搜索 · ${state.universal.mode}`,query:state.universal.expanded[0]||q,preset:`universal:${state.universal.mode}`,engines:filteredPlatforms().map(x=>x.id),thumb:state.source?.thumb||'',sourceName:state.source?.name||'',mode:state.universal.mode},...state.history].slice(0,80);writeJson(KEYS.history,state.history)}
  }
  function batchOpenUniversalSources(){const q=state.universal.expanded[0]||primaryQuery();if(!q)return toast('没有搜索词','先生成或输入关键词。','error');const list=filteredPlatforms().slice(0,12),urls=list.map(m=>m.url(q));openModal('executionModal');els.executionSummary.textContent=`已准备 ${list.length} 个平台搜索 · 浏览器可能限制一次打开多个标签页`;els.executionList.innerHTML=`<div class="universal-open-grid">${urls.map((u,i)=>`<a class="secondary-btn compact execution-link" href="${escapeHtml(u)}" target="_blank" rel="noopener noreferrer">${escapeHtml(list[i].name)} ${icon('arrow-up-right')}</a>`).join('')}</div>`}
  
  async function federatedSupplierSearch(){const q=primaryQuery();if(!q)return toast('先准备搜索词','可以运行智能分析或手动添加关键词。','error');const ep=state.settings.productEndpoint.trim().replace(/\/$/,'');if(!ep){els.productResults.classList.remove('hidden');els.productResults.innerHTML=`<div class="provider-empty">${icon('info')}<div><b>供应商聚合尚未启用</b><p>Alibaba、Made-in-China 与 Global Sources 快捷入口仍可直接使用；配置聚合 API 后可在本站集中查看供应商线索。</p></div></div>`;return}els.productResults.classList.remove('hidden');els.productResults.innerHTML='<div class="loading-block"><span class="spinner"></span>正在聚合供应商线索…</div>';try{const r=await fetch(`${ep}/api/supplier-search?q=${encodeURIComponent(q)}`);const data=await r.json();if(!r.ok||!data.enabled)throw new Error(data.message||'provider unavailable');const items=data.items||[];els.productResults.innerHTML=items.length?`<div class="supplier-results">${items.map(x=>`<a class="supplier-result" href="${escapeHtml(x.link||'#')}" target="_blank" rel="noopener"><span class="supplier-source">${escapeHtml(x.source||'Supplier')}</span><div><b>${escapeHtml(x.title||'供应商线索')}</b><p>${escapeHtml(x.snippet||'')}</p></div>${icon('arrow-up-right')}</a>`).join('')}</div>`:'<div class="provider-empty">没有返回供应商线索。</div>'}catch(e){els.productResults.innerHTML=`<div class="provider-empty">${icon('info')}<div><b>供应商聚合服务不可用</b><p>${escapeHtml(e.message||'请检查 API 配置。')}</p></div></div>`}}

  async function addDetectedObjectsToBatch(){if(!state.analysis.objects?.length||!activeUrl())return toast('没有可加入的主体区域','请先运行智能分析。','error');try{const img=await loadImageSafe(activeUrl());let added=0;for(const [i,o] of state.analysis.objects.slice(0,8).entries()){const [x,y,w,h]=o.bbox,c=document.createElement('canvas');c.width=Math.max(1,Math.round(w));c.height=Math.max(1,Math.round(h));c.getContext('2d').drawImage(img,x,y,w,h,0,0,c.width,c.height);const blob=await new Promise(res=>c.toBlob(res,'image/png',.94));if(!blob)continue;const file=new File([blob],`${o.label||'object'}-${i+1}.png`,{type:'image/png'}),url=URL.createObjectURL(blob),thumb=await makeThumb(url);state.batch.push({id:uid(),file,url,thumb,name:file.name,size:file.size,preset:state.analysis.recommended||state.preset||'product',status:'ready',width:c.width,height:c.height});added++;if(state.batch.length>=MAX_BATCH)break}renderBatch();setView('batch');toast(`已加入 ${added} 个主体区域`,'可为每个区域单独选择搜索任务并执行。','ok')}catch(e){toast('主体区域加入失败',e.message||'图片可能受跨域限制。','error')}}

  function isTempValid(){return !!(state.tempLink?.url&&state.tempLink.expiresAt>Date.now()+5000)}
  function syncTempCard(){
    clearInterval(state.tempTimer);
    const ep=state.settings.tempEndpoint.trim();
    els.tempLinkCard?.classList.toggle('unavailable',!!state.tempUnavailableReason);
    els.tempLinkBtn.disabled=!state.source||(!ep&&!directSourceUrl());
    if(directSourceUrl()&&!state.useProcessed){els.tempLinkStatus.textContent='原图已经是公开 URL';els.tempLinkBtn.textContent='无需创建';els.tempLinkBtn.disabled=true;return}
    if(isTempValid()){updateTempCountdown();state.tempTimer=setInterval(updateTempCountdown,1000);els.tempLinkBtn.textContent='重新创建';return}
    if(state.tempUnavailableReason){els.tempLinkStatus.textContent=state.tempUnavailableReason;els.tempLinkBtn.textContent='重新检测';return}
    els.tempLinkStatus.textContent=ep?'可创建短时 URL':'未配置临时图片服务';
    els.tempLinkBtn.textContent='创建'
  }
  function updateTempCountdown(){if(!isTempValid()){els.tempLinkStatus.textContent='链接已过期';clearInterval(state.tempTimer);renderEngines();return}const s=Math.max(0,Math.floor((state.tempLink.expiresAt-Date.now())/1000));els.tempLinkStatus.textContent=`剩余 ${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`}
  async function createTempLink({silent=false}={}){
    const ep=state.settings.tempEndpoint.trim().replace(/\/$/,'');
    if(!ep){state.tempUnavailableReason='未配置临时图片服务 · 已使用手动上传';syncTempCard();if(!silent)toast('未配置临时图片服务','仍可复制图片后在第三方页面上传。');return false}
    els.tempLinkBtn.disabled=true;els.tempLinkBtn.innerHTML='<span class="spinner"></span>上传中';
    try{
      const blob=await blobFromActive();let data;
      if(window.SOUTU_CONFIG?.tempUploadProvider==='vercel'&&ep===location.origin){
        const tokenRes=await fetch(`${ep}/api/temp-token?ttl=${Number(state.settings.ttl)||30}&size=${blob.size}&contentType=${encodeURIComponent(blob.type||'image/png')}`,{method:'POST'});
        data=await tokenRes.json().catch(()=>({}));
        if(!tokenRes.ok||!data.uploadUrl||!data.url){
          if(data.code==='BLOB_NOT_CONFIGURED'){
            state.tempUnavailableReason='Vercel Blob 未连接 · 已自动降级';
            syncTempCard();renderEngines();
            if(!silent)toast('Vercel Blob 尚未连接','已切换为“复制图片 + 手动上传”，连接 Blob 后可恢复直连。');
            return false
          }
          throw new Error(data.error||'unable to create signed upload')
        }
        const uploadRes=await fetch(data.uploadUrl,{method:'PUT',headers:{'content-type':blob.type||'image/png'},body:blob});
        if(!uploadRes.ok)throw new Error(`Blob upload failed (${uploadRes.status})`)
      }else{
        const r=await fetch(`${ep}/api/upload?ttl=${Number(state.settings.ttl)||30}`,{method:'POST',headers:{'content-type':blob.type||'image/png'},body:blob});
        data=await r.json();if(!r.ok||!data.url)throw new Error(data.error||'upload failed')
      }
      state.tempUnavailableReason='';
      state.tempLink={url:data.url,expiresAt:Number(data.expiresAt)||Date.now()+30*60_000,deleteUrl:data.deleteUrl||''};
      if(!silent)toast('临时链接已创建',`将在约 ${state.settings.ttl} 分钟后失效。`,'ok');
      syncTempCard();renderEngines();return true
    }catch(e){
      if(!silent)toast('临时链接创建失败',e.message||'请检查临时图片服务配置。','error');
      return false
    }finally{syncTempCard()}
  }
  async function deleteTempLink(){clearInterval(state.tempTimer);const old=state.tempLink;state.tempLink=null;if(old?.deleteUrl)fetch(old.deleteUrl,{method:'DELETE'}).catch(()=>{});syncTempCard()}
  async function ensurePublicUrl({silent=true}={}){const direct=directSourceUrl();if(direct)return direct;if(isTempValid())return state.tempLink.url;if(state.tempUnavailableReason)return null;if(state.settings.tempEndpoint){await createTempLink({silent});if(isTempValid())return state.tempLink.url}return null}

  function engineTarget(engine,publicUrl){return publicUrl&&engine.direct?engine.direct(publicUrl):engine.uploadPage}
  async function quietCopy(){try{const b=await blobFromActive();await navigator.clipboard.write([new ClipboardItem({[b.type||'image/png']:b})]);return true}catch{return false}}
  async function runSearch(){
    if(!state.source||!state.selected.length)return;
    els.runSearch.classList.add('busy');els.runSearch.querySelector('span').textContent='准备搜索…';
    const engines=allEngines().filter(e=>state.selected.includes(e.id));
    openModal('executionModal');els.executionList.innerHTML='';
    const publicUrl=await ensurePublicUrl({silent:true});
    const needsManual=engines.some(e=>!(publicUrl&&e.direct));
    const copied=needsManual?await quietCopy():true;
    const statuses=engines.map(e=>{
      const direct=!!(publicUrl&&e.direct),url=engineTarget(e,publicUrl);
      return{id:e.id,name:e.name,direct,copied,status:'ready',url}
    });
    renderExecution(statuses);
    const manualCount=statuses.filter(x=>!x.direct).length;
    els.executionSummary.textContent=`${statuses.length} 个结果已准备 · ${manualCount} 个需手动上传${manualCount?(copied?' · 图片已复制':' · 请点击“复制图片”'):''}`;
    if(state.tempUnavailableReason&&needsManual)toast('已切换到手动上传模式',copied?'图片已复制；逐个打开后直接粘贴/上传。':'浏览器未允许自动复制；请在手动引擎行点击“复制图片”。');
    if(!state.privacy)await addHistory();
    els.runSearch.classList.remove('busy');els.runSearch.querySelector('span').textContent='搜索所选引擎'
  }
  function renderExecution(items){
    els.executionList.innerHTML=items.map(x=>{const e=allEngines().find(v=>v.id===x.id);return `<div class="execution-row" data-execution-id="${escapeHtml(x.id)}"><span class="execution-engine-brand">${e?engineBrand(e):icon('search')}</span><div><b>${escapeHtml(x.name)}</b><small>${x.direct?'直接使用临时图片 URL':x.copied?'图片已复制；打开后可直接粘贴':'请先复制图片，再打开上传/粘贴'}</small></div><span class="status-pill ready">待打开</span><div class="execution-actions">${x.direct?'':`<button class="secondary-btn compact" data-copy-execution>${icon('copy')}复制图片</button>`}<a class="secondary-btn compact execution-link" href="${escapeHtml(x.url)}" target="_blank" rel="noopener noreferrer" data-execution-link>打开</a></div></div>`}).join('')
  }
  async function prepareSingleEngine(id){
    const engine=allEngines().find(x=>x.id===id);
    if(!engine)return;
    openModal('executionModal');
    els.executionSummary.textContent='正在准备单引擎搜索…';
    els.executionList.innerHTML='<div class="loading-block"><span class="spinner"></span>正在准备临时图片链接…</div>';
    const publicUrl=await ensurePublicUrl({silent:true});
    const direct=!!(publicUrl&&engine.direct);
    const copied=direct?true:await quietCopy();
    const item={id:engine.id,name:engine.name,direct,copied,status:'ready',url:engineTarget(engine,publicUrl)};
    renderExecution([item]);
    els.executionSummary.textContent=`1 个结果已准备 · ${direct?'可直连':'需手动上传'}${!direct&&copied?' · 图片已复制':''}`;
  }
  async function addHistory(){let thumb='';try{thumb=await makeThumb(activeUrl())}catch{}const item={id:uid(),thumb,createdAt:Date.now(),label:state.source.name,preset:state.preset,engines:[...state.selected],source:state.source.kind,query:primaryQuery()};state.history=[item,...state.history].slice(0,30);if(!writeJson(KEYS.history,state.history)){state.history=state.history.slice(0,12).map((x,i)=>i<4?x:{...x,thumb:''});writeJson(KEYS.history,state.history)}}
  async function makeThumb(url){const img=await loadImageSafe(url);const c=document.createElement('canvas'),max=180,s=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));c.width=Math.max(1,Math.round(img.naturalWidth*s));c.height=Math.max(1,Math.round(img.naturalHeight*s));c.getContext('2d').drawImage(img,0,0,c.width,c.height);return c.toDataURL('image/jpeg',.72)}

  async function saveProject(){if(!state.source)return;const name=prompt('项目名称',state.source.name.replace(/\.[^.]+$/,''));if(!name)return;let thumb='';try{thumb=await makeThumb(activeUrl())}catch{}const p={id:uid(),name,createdAt:Date.now(),thumb,preset:state.preset,engines:[...state.selected],ocr:state.analysis.ocr,labels:state.analysis.labels,barcodes:state.analysis.barcodes,objects:state.analysis.objects,queries:state.analysis.queries};state.projects=[p,...state.projects].slice(0,50);if(!writeJson(KEYS.projects,state.projects)){p.thumb='';state.projects=state.projects.slice(0,20).map((x,i)=>i<5?x:{...x,thumb:''});if(!writeJson(KEYS.projects,state.projects))return toast('项目保存失败','浏览器本机存储空间不足，请先清理旧项目。','error')}renderProjects();toast('项目已保存','可从“项目”继续使用 OCR、关键词和搜索策略。','ok')}
  function renderProjects(){
    const fav=state.favorites.length?`<section class="favorites-section"><div class="favorites-head"><div><span class="section-kicker">KEYWORD FAVORITES</span><h2>收藏搜索词</h2></div></div><div class="favorite-chips">${state.favorites.map((q,i)=>`<span class="favorite-chip"><button data-use-fav="${i}">${icon('search')}${escapeHtml(q)}</button><button data-del-fav="${i}" aria-label="删除收藏">${icon('x')}</button></span>`).join('')}</div></section>`:'';
    const resultFav=state.universalFavorites.length?`<section class="favorites-section result-favorites-section"><div class="favorites-head"><div><span class="section-kicker">RESULT FAVORITES</span><h2>收藏结果</h2><p>保存找到的图片、视频、帖子与商品来源。</p></div></div><div class="favorite-result-grid">${state.universalFavorites.map((r,i)=>`<article class="favorite-result-card">${r.thumbnail?`<a href="${escapeHtml(r.link)}" target="_blank" rel="noopener noreferrer"><img src="${escapeHtml(r.thumbnail)}" alt="" loading="lazy" referrerpolicy="no-referrer"></a>`:`<div class="favorite-result-placeholder">${icon(r.type==='video'?'play':r.type==='product'?'shopping':'image')}</div>`}<div><span>${escapeHtml(r.provider||'Web')}</span><b>${escapeHtml(r.title||'收藏结果')}</b><div><a href="${escapeHtml(r.link)}" target="_blank" rel="noopener noreferrer">打开来源</a><button data-del-result-fav="${i}" aria-label="删除收藏">${icon('trash')}</button></div></div></article>`).join('')}</div></section>`:'';
    const projects=state.projects.length?`<div class="project-grid">${state.projects.map(p=>`<article class="project-card">${p.thumb?`<img src="${p.thumb}" alt="">`:`<div class="project-image">${icon('folder')}</div>`}<div class="project-body"><div class="project-title"><b>${escapeHtml(p.name)}</b><small>${new Date(p.createdAt).toLocaleString()}</small></div><p>${escapeHtml((p.queries||[])[0]||p.ocr?.slice(0,80)||'暂无文字线索')}</p><div class="project-tags"><span>${escapeHtml(presets.find(x=>x.id===p.preset)?.title||'搜索')}</span><span>${(p.engines||[]).length} 引擎</span></div><div class="project-actions"><button class="secondary-btn compact" data-open-project="${p.id}">继续研究</button><button class="icon-btn danger" data-del-project="${p.id}" aria-label="删除">${icon('trash')}</button></div></div></article>`).join('')}</div>`:emptyState('folder','还没有搜索项目','在研究模式中点击“保存为项目”。','search');
    els.projectsContent.innerHTML=fav+resultFav+projects;
  }

  async function restoreProject(id){const p=state.projects.find(x=>x.id===id);if(!p)return;setView('search');state.analysis={ocr:p.ocr||'',labels:p.labels||[],barcodes:p.barcodes||[],objects:p.objects||[],queries:p.queries||[],running:false,recommended:p.preset};state.preset=p.preset||'product';state.selected=[...(p.engines||presets[0].engines)];if(p.thumb){const d=await probe(p.thumb);state.source={kind:'project',name:p.name+'.jpg',publicUrl:null,size:0,format:'JPEG',...d};state.originalUrl=p.thumb;state.processedUrl=null;state.useProcessed=false;syncWorkbench()}renderPresets();renderEngines();renderAnalysis();els.researchPanel.classList.remove('hidden');toast('项目已恢复','缩略图用于继续分析；原始大图不会存入浏览器项目。','ok')}

  function renderHistory(){
    if(!state.history.length){els.historyContent.innerHTML=emptyState('history','还没有搜索记录','执行搜索后会记录任务和缩略图。','search');return}
    els.historyContent.innerHTML=`<div class="history-grid">${state.history.map(i=>{const created=i.createdAt||i.at||Date.now();const label=i.label||i.sourceName||i.query||'搜索记录';const mode=i.mode||String(i.preset||'').replace(/^universal:/,'');const presetTitle=String(i.preset||'').startsWith('universal:')?`全网 · ${mode||'all'}`:(presets.find(p=>p.id===i.preset)?.title||'搜索');const engines=Array.isArray(i.engines)?i.engines.length:0;return `<article class="history-card">${i.thumb?`<img src="${i.thumb}" alt="">`:`<div class="history-placeholder">${icon('image')}</div>`}<div><strong title="${escapeHtml(label)}">${escapeHtml(label)}</strong><span>${new Date(created).toLocaleString()}</span><small>${escapeHtml(presetTitle)} · ${engines} 个来源${i.query?` · ${escapeHtml(i.query.slice(0,34))}`:''}</small><button class="history-rerun" data-rerun-history="${i.id}">${icon('play')}重新搜索</button></div><button class="history-delete" data-del-history="${i.id}" aria-label="删除">${icon('trash')}</button></article>`}).join('')}</div>`
  }
  function emptyState(iconName,title,desc,nav){return`<div class="empty"><div class="empty-icon">${icon(iconName)}</div><h2>${title}</h2><p>${desc}</p>${nav?`<button class="primary-btn" data-nav="${nav}">${icon('search')}开始搜图</button>`:''}</div>`}

  async function restoreHistory(id){
    const item=state.history.find(x=>x.id===id);if(!item)return;setView('search');
    if(String(item.preset||'').startsWith('universal:')){state.universal.mode=item.mode||String(item.preset).replace('universal:','')||'all';state.analysis.queries=item.query?[item.query]:[];setUniversalMode(state.universal.mode);els.researchPanel.classList.remove('hidden');renderAnalysis();toast('已恢复全网搜索','搜索模式与关键词已恢复。','ok');return}
    state.preset=item.preset||'product';state.selected=[...(item.engines||presets.find(p=>p.id===state.preset)?.engines||[])];
    if(item.thumb){const d=await probe(item.thumb);state.source={kind:'project',name:item.label||'历史图片',publicUrl:null,size:0,format:'JPEG',...d};state.originalUrl=item.thumb;state.processedUrl=null;state.useProcessed=false;clearAnalysis();if(item.query)state.analysis.queries=[item.query];syncWorkbench()}
    renderPresets();renderEngines();renderAnalysis();if(item.query)els.researchPanel.classList.remove('hidden');toast('已恢复历史任务','使用缩略图和原任务设置继续搜索。','ok')
  }

  async function addBatch(files){for(const file of [...files].slice(0,MAX_BATCH-state.batch.length)){if(!file.type.startsWith('image/')||file.size>MAX_FILE)continue;try{const url=await fileData(file),d=await probe(url),thumb=await makeThumb(url);state.batch.push({id:uid(),file,url,thumb,name:file.name,size:file.size,preset:state.batchPreset||state.settings.defaultPreset||'product',status:'ready',...d})}catch{}}renderBatch()}
  function renderBatch(){
    if(!state.batch.length){els.batchList.innerHTML='<div class="batch-empty">队列为空。拖入图片后会在这里显示。</div>';return}
    els.batchList.innerHTML=state.batch.map(x=>`<article class="batch-row ${x.links?.length?'has-links':''}"><img src="${x.thumb}" alt=""><div class="batch-name"><b>${escapeHtml(x.name)}</b><small>${x.width}×${x.height} · ${formatBytes(x.size)}</small></div><select data-batch-preset="${x.id}">${presets.map(p=>`<option value="${p.id}" ${x.preset===p.id?'selected':''}>${p.title}</option>`).join('')}</select><span class="batch-status ${x.status}">${x.status==='done'?'已准备':x.status==='running'?'准备中':x.status==='error'?'准备失败':'待准备'}</span><button class="secondary-btn compact" data-run-batch="${x.id}">${icon('play')}${x.links?.length?'重新准备':'准备结果'}</button><button class="icon-btn danger" data-del-batch="${x.id}">${icon('trash')}</button>${x.links?.length?`<div class="batch-links">${x.links.map(l=>`<a href="${escapeHtml(l.url)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(l.name)}">${l.iconUrl?`<img src="${escapeHtml('/api/image-proxy?url='+encodeURIComponent(l.iconUrl))}" alt="" referrerpolicy="no-referrer">`:icon('search')}<span>${escapeHtml(l.name)}</span></a>`).join('')}</div>`:''}</article>`).join('')
  }
  function batchEngines(item){const p=presets.find(x=>x.id===item.preset)||presets[0];return allEngines().filter(e=>p.engines.includes(e.id))}
  async function runBatchItem(item){
    item.status='running';item.links=[];renderBatch();
    const engines=batchEngines(item);let publicUrl=null;
    if(state.settings.tempEndpoint){try{const ep=state.settings.tempEndpoint.replace(/\/$/,'');if(window.SOUTU_CONFIG?.tempUploadProvider==='vercel'&&ep===location.origin){const tr=await fetch(`${ep}/api/temp-token?ttl=${state.settings.ttl}&size=${item.file.size}&contentType=${encodeURIComponent(item.file.type||'image/png')}`,{method:'POST'});const td=await tr.json();if(tr.ok&&td.uploadUrl&&td.url){const ur=await fetch(td.uploadUrl,{method:'PUT',headers:{'content-type':item.file.type||'image/png'},body:item.file});if(ur.ok)publicUrl=td.url}}else{const r=await fetch(`${ep}/api/upload?ttl=${state.settings.ttl}`,{method:'POST',headers:{'content-type':item.file.type},body:item.file});const data=await r.json();if(r.ok)publicUrl=data.url}}catch{}}
    item.links=engines.map(e=>({name:e.name,url:engineTarget(e,publicUrl),direct:!!(publicUrl&&e.direct),iconUrl:e.iconUrl||''}));
    item.status='done';renderBatch()
  }
  async function runBatch(){
    if(!state.batch.length)return toast('批量队列为空','先加入需要搜索的图片。','error');
    for(const item of state.batch){await runBatchItem(item)}
    toast('批量结果已准备','逐个点击每张图片下方的搜索引擎链接即可，不再触发批量弹窗拦截。','ok')
  }
  function exportBatchCsv(){const lines=[['filename','preset','status','width','height','size_bytes'],...state.batch.map(x=>[x.name,x.preset,x.status,x.width,x.height,x.size])];const csv=lines.map(r=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n');downloadText('soutu-pro-batch.csv',csv,'text/csv;charset=utf-8')}
  function downloadText(name,text,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}

  function commands(){return[
    {title:'上传图片',hint:'U',icon:'upload',run:()=>{setView('search');els.fileInput.click()}},{title:'粘贴图片',hint:'Ctrl+V',icon:'copy',run:()=>toast('直接按 Ctrl / ⌘ + V','剪贴板里有图片时会自动载入。')},
    {title:'智能分析当前图片',hint:'A',icon:'scan',run:()=>analyzeImage()},{title:'商品找同款',hint:'1',icon:'shopping',run:()=>choosePreset('product')},{title:'找原图来源',hint:'2',icon:'origin',run:()=>choosePreset('source')},{title:'找高清版本',hint:'3',icon:'expand',run:()=>choosePreset('hd')},{title:'动漫 / 插画',hint:'4',icon:'sparkles',run:()=>choosePreset('anime')},{title:'工业产品找同款',hint:'5',icon:'scan',run:()=>choosePreset('industrial')},{title:'全部搜索',hint:'6',icon:'grid',run:()=>choosePreset('all')},
    {title:'批量搜图',hint:'B',icon:'batch',run:()=>setView('batch')},{title:'搜索项目',hint:'P',icon:'folder',run:()=>setView('projects')},{title:'搜索历史',hint:'H',icon:'history',run:()=>setView('history')},{title:'设置',hint:'',icon:'settings',run:()=>openModal('settingsModal')},{title:'切换深色模式',hint:'',icon:'moon',run:()=>applyTheme(document.documentElement.dataset.theme!=='dark')},
  ]}
  function renderCommands(filter=''){const q=filter.toLowerCase().trim();els.commandList.innerHTML=commands().filter(c=>!q||c.title.toLowerCase().includes(q)).map((c,i)=>`<button data-command-index="${commands().indexOf(c)}" class="command-item ${i===0?'focused':''}"><span>${icon(c.icon)}</span><b>${c.title}</b>${c.hint?`<kbd>${c.hint}</kbd>`:''}</button>`).join('')||'<div class="command-empty">没有匹配的命令</div>'}

  function setView(view){state.view=view;const views={search:els.searchView,batch:els.batchView,projects:els.projectsView,history:els.historyView,research:els.researchHubView,tips:els.tipsView};Object.entries(views).forEach(([k,node])=>node.classList.toggle('hidden',k!==view));$$('header [data-nav]').forEach(b=>b.classList.toggle('active',b.dataset.nav===view));if(view==='history')renderHistory();if(view==='projects')renderProjects();if(view==='batch')renderBatch();const active=views[view];animate(active,[{opacity:.6,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:180,easing:'cubic-bezier(.16,1,.3,1)'});window.scrollTo({top:0,behavior:reduced()?'auto':'smooth'})}
  function openModal(id){const m=$('#'+id);if(!m)return;m.classList.remove('closing','hidden');if(id==='commandModal'){renderCommands();setTimeout(()=>els.commandInput.focus(),20)}}
  function closeModal(id){const m=$('#'+id);if(!m||m.classList.contains('hidden'))return;if(reduced()){m.classList.add('hidden');return}m.classList.add('closing');setTimeout(()=>{m.classList.add('hidden');m.classList.remove('closing')},130)}
  function applyTheme(dark,initial=false){if(!initial){const style=document.createElement('style');style.textContent='*,*::before,*::after{transition:none!important}';document.head.appendChild(style);document.documentElement.dataset.theme=dark?'dark':'light';void document.documentElement.offsetHeight;requestAnimationFrame(()=>style.remove())}else document.documentElement.dataset.theme=dark?'dark':'light';localStorage.setItem('soutu-theme',dark?'dark':'light');els.themeBtn.setAttribute('aria-label',dark?'切换浅色模式':'切换深色模式');document.querySelector('meta[name="theme-color"]')?.setAttribute('content',dark?'#0b0f14':'#f6f8fb')}

  function initSettings(){state.preset=state.settings.defaultPreset||'product';state.selected=[...(presets.find(p=>p.id===state.preset)||presets[0]).engines];els.defaultPreset.innerHTML=presets.map(p=>`<option value="${p.id}">${p.title}</option>`).join('');els.defaultPreset.value=state.preset;els.tempEndpointInput.value=state.settings.tempEndpoint||'';els.productEndpointInput.value=state.settings.productEndpoint||'';els.ttlSelect.value=String(state.settings.ttl||30);if(els.autoPresetToggle)els.autoPresetToggle.checked=state.settings.autoPreset!==false;els.batchPreset.innerHTML=presets.map(p=>`<option value="${p.id}">${p.title}</option>`).join('');els.batchPreset.value=state.settings.defaultPreset||'product'}
  function saveSettings(){state.settings={...state.settings,defaultPreset:els.defaultPreset.value,tempEndpoint:els.tempEndpointInput.value.trim(),productEndpoint:els.productEndpointInput.value.trim(),ttl:Number(els.ttlSelect.value)||30,autoPreset:els.autoPresetToggle?els.autoPresetToggle.checked:true};state.tempUnavailableReason='';writeJson(KEYS.settings,state.settings);syncTempCard();renderEngines()}

  async function copyImage(){try{const blob=await blobFromActive();await navigator.clipboard.write([new ClipboardItem({[blob.type||'image/png']:blob})]);toast('图片已复制','可在第三方页面直接粘贴。','ok')}catch{toast('浏览器不允许直接复制','可右键图片选择“复制图片”。','error')}}
  async function downloadImage(){try{const blob=await blobFromActive(),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`soutu-pro-image.${blob.type.includes('png')?'png':blob.type.includes('webp')?'webp':'jpg'}`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1200)}catch{toast('下载失败','远程图片可能拒绝访问，请先另存到本地。','error')}}

  function bind(){
    $$('[data-nav]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.nav)));
    els.chooseBtn.onclick=()=>els.fileInput.click();els.fileInput.onchange=()=>{const f=els.fileInput.files?.[0];if(f)acceptFile(f)};
    ['dragenter','dragover'].forEach(ev=>els.dropZone.addEventListener(ev,e=>{e.preventDefault();els.dropZone.classList.add('drag')}));['dragleave','drop'].forEach(ev=>els.dropZone.addEventListener(ev,e=>{e.preventDefault();els.dropZone.classList.remove('drag')}));els.dropZone.addEventListener('drop',e=>{const f=e.dataTransfer?.files?.[0];if(f)acceptFile(f)});
    window.addEventListener('paste',e=>{if(e.target?.matches?.('input,textarea,[contenteditable=true]'))return;const item=[...(e.clipboardData?.items||[])].find(i=>i.type.startsWith('image/'));const f=item?.getAsFile();if(f){e.preventDefault();acceptFile(f,'paste')}});
    els.urlForm.onsubmit=e=>{e.preventDefault();const v=els.urlInput.value.trim();if(v)acceptUrl(v)};
    els.removeBtn.onclick=removeSource;els.cropBtn.onclick=()=>{state.cropMode=!state.cropMode;if(!state.cropMode)state.cropRect=null;syncCropUi()};els.rotateBtn.onclick=()=>transform('rotate');els.flipBtn.onclick=()=>transform('flip');els.applyCrop.onclick=()=>transform('crop');els.cropReset.onclick=()=>{state.cropRect=null;syncCropUi()};els.copyBtn.onclick=copyImage;els.downloadBtn.onclick=downloadImage;$$('[data-process]').forEach(b=>b.onclick=()=>processImage(b.dataset.process));
    let start=null;els.imageStage.addEventListener('pointerdown',e=>{if(!state.cropMode)return;const b=els.imageStage.getBoundingClientRect();start={x:Math.max(0,Math.min(1,(e.clientX-b.left)/b.width)),y:Math.max(0,Math.min(1,(e.clientY-b.top)/b.height))};state.cropRect={x:start.x,y:start.y,w:0,h:0};els.imageStage.setPointerCapture(e.pointerId);syncCropUi()});els.imageStage.addEventListener('pointermove',e=>{if(!state.cropMode||!start)return;const b=els.imageStage.getBoundingClientRect(),p={x:Math.max(0,Math.min(1,(e.clientX-b.left)/b.width)),y:Math.max(0,Math.min(1,(e.clientY-b.top)/b.height))};state.cropRect={x:Math.min(start.x,p.x),y:Math.min(start.y,p.y),w:Math.abs(start.x-p.x),h:Math.abs(start.y-p.y)};syncCropUi()});els.imageStage.addEventListener('pointerup',()=>start=null);
    els.analyzeBtn.onclick=analyzeImage;els.reanalyzeBtn.onclick=analyzeImage;els.saveProjectBtn.onclick=saveProject;if(els.batchObjectsBtn)els.batchObjectsBtn.onclick=addDetectedObjectsToBatch;els.tempLinkBtn.onclick=()=>{state.tempUnavailableReason='';createTempLink({silent:false})};els.recommendationOutput.onclick=e=>{const b=e.target.closest('[data-accept-recommend]');if(b)choosePreset(b.dataset.acceptRecommend)};
    els.addQueryBtn.onclick=()=>{state.analysis.queries.push('');renderQueries();setTimeout(()=>$('[data-query-index]').at(-1)?.focus(),0)};els.queryList.addEventListener('input',e=>{if(e.target.matches('[data-query-index]')){state.analysis.queries[Number(e.target.dataset.queryIndex)]=e.target.value;renderMarketplaces()}});
    els.keywordExpansion?.addEventListener('click',e=>{const b=e.target.closest('[data-universal-query]');if(!b)return;const q=state.universal.expanded[Number(b.dataset.universalQuery)];if(!q)return;state.analysis.queries=[q,...state.analysis.queries.filter(x=>x!==q)].slice(0,8);renderQueries();renderMarketplaces();toast('已设为主搜索词',q,'ok')});
    els.productResults?.addEventListener('click',e=>{const b=e.target.closest('[data-copy-result]');if(b){navigator.clipboard?.writeText(b.dataset.copyResult||'').then(()=>toast('链接已复制','','ok')).catch(()=>toast('复制失败','','error'));return}const f=e.target.closest('[data-favorite-result]');if(f){const link=f.dataset.favoriteResult||'',r=state.universal.results.find(x=>(x.link||x.url||'')===link);if(!link||!r)return;const exists=state.universalFavorites.some(x=>x.link===link);state.universalFavorites=exists?state.universalFavorites.filter(x=>x.link!==link):[{link,title:r.title||'',thumbnail:r.thumbnail||'',provider:r.provider||r.source||'',type:r.type||'',savedAt:Date.now()},...state.universalFavorites].slice(0,100);writeJson(KEYS.universalFavorites,state.universalFavorites);renderUniversalResults(state.universal.results,state.universal.providers||[]);toast(exists?'已取消收藏':'已收藏结果',r.title||'','ok')}});els.queryList.addEventListener('click',e=>{const r=e.target.closest('[data-remove-query]');if(r){state.analysis.queries.splice(Number(r.dataset.removeQuery),1);renderAnalysis()}const f=e.target.closest('[data-fav-query]');if(f){const q=state.analysis.queries[Number(f.dataset.favQuery)]?.trim();if(q){state.favorites=state.favorites.includes(q)?state.favorites.filter(x=>x!==q):[q,...state.favorites].slice(0,30);writeJson(KEYS.favorites,state.favorites);renderQueries()}}});
    els.objectsOutput.onclick=e=>{const b=e.target.closest('[data-object-index]');if(!b)return;const o=state.analysis.objects[Number(b.dataset.objectIndex)];if(!o||!state.source)return;const [x,y,w,h]=o.bbox;state.cropMode=true;state.cropRect={x:x/state.source.width,y:y/state.source.height,w:w/state.source.width,h:h/state.source.height};syncCropUi();els.imageStage.scrollIntoView({behavior:reduced()?'auto':'smooth',block:'center'});toast('已选择主体区域',`${o.label} · 可直接应用裁剪。`,'ok')};
els.federatedSearchBtn.onclick=federatedProductSearch;if(els.supplierSearchBtn)els.supplierSearchBtn.onclick=federatedSupplierSearch;if(els.mediaSearchBtn)els.mediaSearchBtn.onclick=federatedMediaSearch;
    if(els.universalSearchBtn)els.universalSearchBtn.onclick=universalSearch;if(els.expandKeywordsBtn)els.expandKeywordsBtn.onclick=()=>{state.universal.expanded=[];expandUniversalKeywords();renderKeywordExpansion();toast('关键词已扩展','已生成中英文、用途与任务关键词。','ok')};if(els.batchOpenSourcesBtn)els.batchOpenSourcesBtn.onclick=batchOpenUniversalSources;
    if(els.universalModes)els.universalModes.onclick=e=>{const b=e.target.closest('[data-universal-mode]');if(b)setUniversalMode(b.dataset.universalMode)};
    [[els.universalPlatform,'platform'],[els.universalCountry,'country'],[els.universalLanguage,'language'],[els.universalTime,'time'],[els.universalType,'type']].forEach(([el,key])=>{if(el)el.onchange=()=>{state.universal[key]=el.value;state.universal.expanded=[];expandUniversalKeywords();renderMarketplaces();if(state.universal.results.length)renderUniversalResults(state.universal.results,state.universal.providers||[])}});
    els.presetGrid.onclick=e=>{const b=e.target.closest('[data-preset]');if(b)choosePreset(b.dataset.preset)};els.engineGroups.onclick=e=>{const open=e.target.closest('[data-open-engine]');if(open){prepareSingleEngine(open.dataset.openEngine);return}const groupSelect=e.target.closest('[data-group-select]'),groupClear=e.target.closest('[data-group-clear]');if(groupSelect||groupClear){const group=(groupSelect||groupClear).dataset.groupSelect||(groupSelect||groupClear).dataset.groupClear,ids=allEngines().filter(x=>x.category===group).map(x=>x.id);state.selected=groupSelect?[...new Set([...state.selected,...ids])]:state.selected.filter(x=>!ids.includes(x));renderEngines();syncSearchButton();return}const s=e.target.closest('[data-engine]');if(s){const id=s.dataset.engine;state.selected=state.selected.includes(id)?state.selected.filter(x=>x!==id):[...state.selected,id];renderEngines();syncSearchButton()}};els.runSearch.onclick=runSearch;els.privacyMode.onchange=()=>state.privacy=els.privacyMode.checked;$$('[data-use]').forEach(b=>b.onclick=()=>{state.useProcessed=b.dataset.use==='processed';deleteTempLink();syncWorkbench()});
    els.executionList.onclick=async e=>{
      const copy=e.target.closest('[data-copy-execution]');
      if(copy){const done=await quietCopy();copy.innerHTML=done?`${icon('check')}已复制`:`${icon('info')}复制失败`;if(!done)toast('复制失败','浏览器没有授予剪贴板写入权限，可在目标页面手动选择文件。','error');return}
      const a=e.target.closest('[data-execution-link]');if(!a)return;
      const row=a.closest('.execution-row'),pill=row?.querySelector('.status-pill'),stateIcon=row?.querySelector('.execution-state');
      if(pill){pill.className='status-pill opened';pill.textContent='已点击'}if(stateIcon)stateIcon.className='execution-state opened';a.textContent='再次打开'
    };
    els.clearHistory.onclick=()=>{state.history=[];localStorage.removeItem(KEYS.history);renderHistory();toast('历史记录已清空','','ok')};els.historyContent.onclick=e=>{const d=e.target.closest('[data-del-history]');if(d){state.history=state.history.filter(x=>x.id!==d.dataset.delHistory);writeJson(KEYS.history,state.history);renderHistory()}const r=e.target.closest('[data-rerun-history]');if(r)restoreHistory(r.dataset.rerunHistory);const n=e.target.closest('[data-nav]');if(n)setView(n.dataset.nav)};
    els.projectsContent.onclick=e=>{const o=e.target.closest('[data-open-project]');if(o)restoreProject(o.dataset.openProject);const d=e.target.closest('[data-del-project]');if(d){state.projects=state.projects.filter(x=>x.id!==d.dataset.delProject);writeJson(KEYS.projects,state.projects);renderProjects()}const u=e.target.closest('[data-use-fav]');if(u){const q=state.favorites[Number(u.dataset.useFav)];if(q){setView('search');state.analysis.queries=[q];els.researchPanel.classList.remove('hidden');renderAnalysis();toast('收藏搜索词已载入',q,'ok')}}const f=e.target.closest('[data-del-fav]');if(f){state.favorites.splice(Number(f.dataset.delFav),1);writeJson(KEYS.favorites,state.favorites);renderProjects()}const rf=e.target.closest('[data-del-result-fav]');if(rf){state.universalFavorites.splice(Number(rf.dataset.delResultFav),1);writeJson(KEYS.universalFavorites,state.universalFavorites);renderProjects()}};els.clearProjects.onclick=()=>{state.projects=[];writeJson(KEYS.projects,[]);renderProjects()};
    els.batchChoose.onclick=()=>els.batchInput.click();els.batchInput.onchange=()=>addBatch(els.batchInput.files);['dragenter','dragover'].forEach(ev=>els.batchDrop.addEventListener(ev,e=>{e.preventDefault();els.batchDrop.classList.add('drag')}));['dragleave','drop'].forEach(ev=>els.batchDrop.addEventListener(ev,e=>{e.preventDefault();els.batchDrop.classList.remove('drag')}));els.batchDrop.addEventListener('drop',e=>addBatch(e.dataTransfer.files));els.applyBatchPreset.onclick=()=>{state.batch.forEach(x=>x.preset=els.batchPreset.value);renderBatch()};els.runBatch.onclick=runBatch;els.batchExport.onclick=exportBatchCsv;els.batchList.onclick=e=>{const r=e.target.closest('[data-run-batch]');if(r){const item=state.batch.find(x=>x.id===r.dataset.runBatch);if(item)runBatchItem(item)}const d=e.target.closest('[data-del-batch]');if(d){state.batch=state.batch.filter(x=>x.id!==d.dataset.delBatch);renderBatch()}};els.batchList.onchange=e=>{if(e.target.matches('[data-batch-preset]')){const item=state.batch.find(x=>x.id===e.target.dataset.batchPreset);if(item)item.preset=e.target.value}};
    els.settingsBtn.onclick=()=>openModal('settingsModal');els.customBtn.onclick=()=>openModal('customModal');els.commandBtn.onclick=()=>openModal('commandModal');els.shortcutHelp.onclick=()=>openModal('shortcutModal');$$('[data-close]').forEach(b=>b.onclick=()=>closeModal(b.dataset.close));$$('.modal-backdrop').forEach(m=>m.addEventListener('mousedown',e=>{if(e.target===m)closeModal(m.id)}));
    els.defaultPreset.onchange=()=>{saveSettings();choosePreset(els.defaultPreset.value,false)};els.tempEndpointInput.onchange=saveSettings;els.productEndpointInput.onchange=saveSettings;els.ttlSelect.onchange=saveSettings;if(els.autoPresetToggle)els.autoPresetToggle.onchange=saveSettings;
    els.addCustom.onclick=()=>{const name=els.customName.value.trim(),template=els.customTemplate.value.trim();if(!name||!template.includes('{imageUrl}'))return toast('模板必须包含 {imageUrl}','例如：https://example.com/search?url={imageUrl}','error');state.custom.push({id:`custom-${Date.now()}`,name,short:name.slice(0,2).toUpperCase(),category:'自定义',desc:'你添加的 URL 搜索引擎',uploadPage:template.replace('{imageUrl}',''),template});writeJson(KEYS.custom,state.custom);renderEngines();closeModal('customModal');els.customName.value='';els.customTemplate.value='';toast('自定义引擎已添加','','ok')};
    els.themeBtn.onclick=()=>applyTheme(document.documentElement.dataset.theme!=='dark');els.commandInput.oninput=()=>renderCommands(els.commandInput.value);els.commandList.onclick=e=>{const b=e.target.closest('[data-command-index]');if(!b)return;const c=commands()[Number(b.dataset.commandIndex)];closeModal('commandModal');c?.run()};
    els.installBtn.onclick=async()=>{if(!state.installPrompt)return;state.installPrompt.prompt();await state.installPrompt.userChoice;state.installPrompt=null;els.installBtn.hidden=true};window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();state.installPrompt=e;els.installBtn.hidden=false});
    window.addEventListener('keydown',e=>{const input=e.target.matches?.('input,textarea,select,[contenteditable=true]');if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openModal('commandModal');return}if(e.key==='Escape'){$$('.modal-backdrop:not(.hidden)').forEach(m=>closeModal(m.id));if(state.cropMode){state.cropMode=false;state.cropRect=null;syncCropUi()}return}if(input)return;const num=Number(e.key);if(num>=1&&num<=6){choosePreset(presets[num-1].id);return}if(e.key.toLowerCase()==='c'&&state.source){state.cropMode=!state.cropMode;syncCropUi();return}if(e.key.toLowerCase()==='r'&&state.source){transform('rotate');return}if(e.key.toLowerCase()==='a'&&state.source){analyzeImage();return}if(e.key.toLowerCase()==='u'){setView('search');els.fileInput.click();return}if(e.key.toLowerCase()==='p'){setView('projects');return}if(e.key.toLowerCase()==='h'){setView('history');return}if(e.key.toLowerCase()==='b'){setView('batch');return}if(e.key==='Enter'&&state.source)runSearch()});
  }

  async function initFromUrl(){const qs=new URLSearchParams(location.search),image=qs.get('image'),preset=qs.get('preset'),mode=qs.get('mode');if(preset&&presets.some(p=>p.id===preset))choosePreset(preset,false);if(image){els.urlInput.value=image;await acceptUrl(image);if(mode==='supplier'){await analyzeImage();await federatedSupplierSearch()}}}
  function initPwa(){if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{})}
  window.SOUTU_BRIDGE={
    source:()=>state.source?{...state.source,activeUrl:activeUrl()}:null,
    analysis:()=>JSON.parse(JSON.stringify(state.analysis||{})),
    activeUrl:()=>activeUrl(),
    blob:()=>blobFromActive(),
    primaryQuery:()=>primaryQuery(),
    addBatch:files=>addBatch(files),
    addDetectedObjects:()=>addDetectedObjectsToBatch(),
    setView:view=>setView(view),
    toast:(title,desc='',kind='')=>toast(title,desc,kind),
    analyze:()=>analyzeImage(),
    process:kind=>processImage(kind),
    choosePreset:id=>choosePreset(id),
    makeThumb:url=>makeThumb(url)
  };
  function init(){applyTheme(localStorage.getItem('soutu-theme')==='dark',true);initSettings();renderPresets();renderEngines();renderAnalysis();renderMarketplaces();renderHistory();renderProjects();renderBatch();syncSearchButton();syncTempCard();bind();initPwa();initFromUrl();}
  init();
})();