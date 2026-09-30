(() => {
  'use strict';

  const APP_VERSION='9.3.0';

  const MAX_FILE = 20 * 1024 * 1024;
  const MAX_BATCH = 50;
  const KEYS = {
    history:'soutu-pro-history-v5', settings:'soutu-pro-settings-v5', custom:'soutu-pro-custom-v5',
    projects:'soutu-pro-projects-v1', favorites:'soutu-pro-favorites-v1', universalFavorites:'soutu-pro-universal-favorites-v1', engineHealth:'soutu-pro-engine-health-v1', providerHealth:'soutu-pro-provider-health-v1'
  };

  const builtinEngines = [
    { id:'google', name:'Google Lens', iconUrl:'https://www.gstatic.com/images/branding/product/2x/lens_96dp.png', category:'通用', desc:'商品、文字、地点与相似内容', uploadPage:'https://lens.google.com/', direct:url=>`https://lens.google.com/uploadbyurl?url=${encodeURIComponent(url)}` },
    { id:'bing', name:'Bing Visual Search', iconUrl:'https://www.bing.com/favicon.ico', category:'通用', desc:'相似图片、购物与网页结果', uploadPage:'https://www.bing.com/visualsearch', direct:url=>`https://www.bing.com/images/searchbyimage?cbir=sbi&iss=sbi&mkt=en-US&imgurl=${encodeURIComponent(url)}` },
    { id:'yandex', name:'Yandex Images', iconUrl:'https://yandex.com/favicon.ico', category:'通用', desc:'局部物体与视觉近似匹配', uploadPage:'https://yandex.com/images/', direct:url=>`https://yandex.com/images/search?rpt=imageview&url=${encodeURIComponent(url)}` },
    { id:'tineye', name:'TinEye', iconUrl:'https://tineye.com/favicon.ico', category:'通用', desc:'追踪图片复用、修改版本与来源', uploadPage:'https://tineye.com/', direct:url=>`https://tineye.com/search?url=${encodeURIComponent(url)}` },
    { id:'google-shopping', name:'Lens · 商品', iconUrl:'https://www.gstatic.com/images/branding/product/2x/lens_96dp.png', category:'商品', desc:'同款、替代品与相关商品页', uploadPage:'https://lens.google.com/', direct:url=>`https://lens.google.com/uploadbyurl?url=${encodeURIComponent(url)}` },
    { id:'bing-shopping', name:'Bing · 商品', iconUrl:'https://www.bing.com/favicon.ico', category:'商品', desc:'视觉搜索后继续筛购物结果', uploadPage:'https://www.bing.com/visualsearch', direct:url=>`https://www.bing.com/images/searchbyimage?cbir=sbi&iss=sbi&mkt=en-US&imgurl=${encodeURIComponent(url)}` },
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
    {id:'bluesky-search',name:'Bluesky',group:'社媒',iconUrl:'https://bsky.app/static/apple-touch-icon.png',url:q=>`https://bsky.app/search?q=${encodeURIComponent(q)}`},
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

  const cachedEngineHealth=readJson(KEYS.engineHealth,{});
  const cachedProviderHealth=readJson(KEYS.providerHealth,{});
  const state = {
    source:null, originalUrl:null, processedUrl:null, useProcessed:false, cropMode:false, cropRect:null,
    selected:[], preset:'product', custom:readJson(KEYS.custom,[]), history:readJson(KEYS.history,[]), privacy:false,
    projects:readJson(KEYS.projects,[]), favorites:readJson(KEYS.favorites,[]), universalFavorites:readJson(KEYS.universalFavorites,[]), settings:{...defaultSettings,...readJson(KEYS.settings,{})},
    analysis:{ocr:'',labels:[],barcodes:[],objects:[],queries:[],running:false}, tempLink:null, tempTimer:null, tempUnavailableReason:'', tempUnavailableAt:0, forceTempLink:false, engineHealth:cachedEngineHealth.engines||{}, engineHealthCheckedAt:Number(cachedEngineHealth.checkedAt)||0, providerHealth:cachedProviderHealth.providers||[], providerHealthCheckedAt:Number(cachedProviderHealth.checkedAt)||0,
    batch:[], view:'search', installPrompt:null, presetTouched:false,
    universal:{mode:'all',platform:'all',country:'all',language:'all',time:'all',type:'all',resolution:'all',license:'all',sort:'auto',rawResults:[],results:[],providers:[],query:'',expanded:[],selected:new Set(),grouped:false,visualGrouped:false,provenanceActive:false,identityGrouped:false,timeline:false,clusterFocus:null,visualClusterFocus:null,visualGroups:{},visualFeatures:{},provenanceFamilyMap:{},provenanceRelations:{},provenanceFamilyFocus:null,provenanceMethod:'none',identityGroupMap:{},identityGroupMeta:{},identityGroupFocus:null}
  };

  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const els={
    searchView:$('#searchView'),batchView:$('#batchView'),projectsView:$('#projectsView'),historyView:$('#historyView'),researchHubView:$('#researchHubView'),tipsView:$('#tipsView'),
    uploader:$('#uploader'),workbench:$('#workbench'),dropZone:$('#dropZone'),fileInput:$('#fileInput'),chooseBtn:$('#chooseBtn'),urlForm:$('#urlForm'),urlInput:$('#urlInput'),
    previewImg:$('#previewImg'),imageStage:$('#imageStage'),cropShade:$('#cropShade'),cropBox:$('#cropBox'),cropActions:$('#cropActions'),applyCrop:$('#applyCrop'),cropReset:$('#cropReset'),
    cropBtn:$('#cropBtn'),rotateBtn:$('#rotateBtn'),flipBtn:$('#flipBtn'),copyBtn:$('#copyBtn'),downloadBtn:$('#downloadBtn'),removeBtn:$('#removeBtn'),
    fileName:$('#fileName'),sourceKind:$('#sourceKind'),dims:$('#dims'),format:$('#format'),size:$('#size'),metaTip:$('#metaTip'),sourceToggle:$('#sourceToggle'),
    analyzeBtn:$('#analyzeBtn'),researchPanel:$('#researchPanel'),reanalyzeBtn:$('#reanalyzeBtn'),saveProjectBtn:$('#saveProjectBtn'),batchObjectsBtn:$('#batchObjectsBtn'),ocrStatus:$('#ocrStatus'),ocrOutput:$('#ocrOutput'),visionStatus:$('#visionStatus'),visionOutput:$('#visionOutput'),barcodeStatus:$('#barcodeStatus'),barcodeOutput:$('#barcodeOutput'),objectsStatus:$('#objectsStatus'),objectsOutput:$('#objectsOutput'),recommendationOutput:$('#recommendationOutput'),queryList:$('#queryList'),addQueryBtn:$('#addQueryBtn'),marketplaceGrid:$('#marketplaceGrid'),federatedSearchBtn:$('#federatedSearchBtn'),supplierSearchBtn:$('#supplierSearchBtn'),mediaSearchBtn:$('#mediaSearchBtn'),productResults:$('#productResults'),universalModes:$('#universalModes'),universalPlatform:$('#universalPlatform'),universalCountry:$('#universalCountry'),universalLanguage:$('#universalLanguage'),universalTime:$('#universalTime'),universalType:$('#universalType'),universalResolution:$('#universalResolution'),universalLicense:$('#universalLicense'),keywordExpansion:$('#keywordExpansion'),expandKeywordsBtn:$('#expandKeywordsBtn'),batchOpenSourcesBtn:$('#batchOpenSourcesBtn'),universalSearchBtn:$('#universalSearchBtn'),universalMeta:$('#universalMeta'),universalResearchbar:$('#universalResearchbar'),universalResearchStats:$('#universalResearchStats'),universalSort:$('#universalSort'),universalClusterBtn:$('#universalClusterBtn'),universalVisualClusterBtn:$('#universalVisualClusterBtn'),universalProvenanceBtn:$('#universalProvenanceBtn'),universalIdentityGroupBtn:$('#universalIdentityGroupBtn'),universalTimelineBtn:$('#universalTimelineBtn'),universalSelectAllBtn:$('#universalSelectAllBtn'),universalSaveSelectedBtn:$('#universalSaveSelectedBtn'),universalExportBtn:$('#universalExportBtn'),universalExportJsonBtn:$('#universalExportJsonBtn'),universalResearchBtn:$('#universalResearchBtn'),universalInsights:$('#universalInsights'),
    tempLinkCard:$('#tempLinkCard'),tempLinkStatus:$('#tempLinkStatus'),tempLinkBtn:$('#tempLinkBtn'),
    presetGrid:$('#presetGrid'),engineGroups:$('#engineGroups'),engineHint:$('#engineHint'),engineSummary:$('#engineSummary'),selectedCount:$('#selectedCount'),runSearch:$('#runSearch'),privacyMode:$('#privacyMode'),customBtn:$('#customBtn'),engineHealthBtn:$('#engineHealthBtn'),engineHealthSummary:$('#engineHealthSummary'),
    historyContent:$('#historyContent'),clearHistory:$('#clearHistory'),projectsContent:$('#projectsContent'),clearProjects:$('#clearProjects'),
    batchDrop:$('#batchDrop'),batchChoose:$('#batchChoose'),batchInput:$('#batchInput'),batchPreset:$('#batchPreset'),applyBatchPreset:$('#applyBatchPreset'),runBatch:$('#runBatch'),batchList:$('#batchList'),batchExport:$('#batchExport'),
    themeBtn:$('#themeBtn'),settingsBtn:$('#settingsBtn'),installBtn:$('#installBtn'),commandBtn:$('#commandBtn'),versionBadge:$('#versionBadge'),updateBtn:$('#updateBtn'),settingsModal:$('#settingsModal'),customModal:$('#customModal'),commandModal:$('#commandModal'),executionModal:$('#executionModal'),shortcutModal:$('#shortcutModal'),shortcutHelp:$('#shortcutHelp'),
    defaultPreset:$('#defaultPreset'),tempEndpointInput:$('#tempEndpointInput'),productEndpointInput:$('#productEndpointInput'),ttlSelect:$('#ttlSelect'),autoPresetToggle:$('#autoPresetToggle'),refreshDiagnosticsBtn:$('#refreshDiagnosticsBtn'),resetClientCacheBtn:$('#resetClientCacheBtn'),systemStatusGrid:$('#systemStatusGrid'),providerHealthDetail:$('#providerHealthDetail'),systemStatusNote:$('#systemStatusNote'),customName:$('#customName'),customTemplate:$('#customTemplate'),addCustom:$('#addCustom'),
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
  function directSourceUrl(){return state.source?.kind==='url'&&!state.useProcessed&&!state.forceTempLink?state.source.publicUrl:null}
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
    try{const url=await fileData(file),d=await probe(url);await deleteTempLink();state.source={kind,name:file.name||'剪贴板图片',publicUrl:null,size:file.size,format:(file.type.split('/')[1]||'IMAGE').toUpperCase(),...d};state.originalUrl=url;state.processedUrl=null;state.useProcessed=false;state.forceTempLink=false;state.cropRect=null;state.cropMode=false;clearAnalysis();syncWorkbench();window.dispatchEvent(new CustomEvent('soutu:source-changed'));toast(kind==='paste'?'已读取剪贴板图片':'图片已就绪','可直接搜图，或先进行 OCR / 视觉分析。','ok');scrollTool()}catch{toast('图片读取失败','文件可能已经损坏。','error')}
  }
  async function acceptUrl(raw){
    try{const u=new URL(raw);if(!/^https?:$/.test(u.protocol))throw new Error();const d=await probe(raw);await deleteTempLink();state.source={kind:'url',name:decodeURIComponent(u.pathname.split('/').pop()||u.hostname),publicUrl:raw,size:0,format:(u.pathname.split('.').pop()||'远程').toUpperCase(),...d};state.originalUrl=raw;state.processedUrl=null;state.useProcessed=false;state.forceTempLink=false;state.cropRect=null;state.cropMode=false;clearAnalysis();syncWorkbench();window.dispatchEvent(new CustomEvent('soutu:source-changed'));toast('图片链接已载入','支持 URL 参数的引擎可直接进入结果页。','ok');scrollTool()}catch{toast('无法载入图片链接','链接可能无效、需要登录或被防盗链拦截。','error')}
  }
  function scrollTool(){requestAnimationFrame(()=>$('#toolCard')?.scrollIntoView({behavior:reduced()?'auto':'smooth',block:'center'}))}

  function syncWorkbench(){
    const has=!!state.source;els.uploader.classList.toggle('hidden',has);els.workbench.classList.toggle('hidden',!has);if(!has){els.runSearch.disabled=true;return}
    els.previewImg.src=activeUrl();els.fileName.textContent=state.source.name;els.sourceKind.textContent=state.source.kind==='url'?'图片链接':state.source.kind==='paste'?'剪贴板图片':state.source.kind==='project'?'项目缩略图':'本地文件';els.dims.textContent=`${state.source.width} × ${state.source.height}`;els.format.textContent=state.source.format;els.size.textContent=formatBytes(state.source.size);els.sourceToggle.classList.toggle('hidden',!state.processedUrl);$$('[data-use]').forEach(b=>b.classList.toggle('active',(b.dataset.use==='processed')===state.useProcessed));
    const canDirect=!!directSourceUrl()||isTempValid();const tip=canDirect?'当前图片已有可访问 URL，支持直链的引擎可以直接进入搜索结果。':'当前为本地处理图。未配置临时图片服务时，部分第三方引擎需要手动上传。';els.metaTip.innerHTML=`${icon('info')}<span>${escapeHtml(tip)}</span>`;els.engineHint.textContent=canDirect?'直链能力已就绪；不支持 URL 参数的引擎仍会打开上传页。':'配置临时图片服务后，本地图片也能获得短时 URL，提高一键搜索覆盖率。';syncTempCard();renderEngines();syncSearchButton()
  }
  async function removeSource(){await deleteTempLink();state.source=null;state.originalUrl=null;state.processedUrl=null;state.useProcessed=false;state.forceTempLink=false;state.cropMode=false;state.cropRect=null;clearAnalysis();els.uploader.classList.remove('hidden');els.workbench.classList.add('hidden');els.fileInput.value='';els.urlInput.value='';renderEngines();syncSearchButton()}

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
    if(!e.direct)return'manual';
    const u=directSourceUrl()||(isTempValid()?state.tempLink.url:null);
    if(u)return'direct';
    if(state.source&&state.settings.tempEndpoint)return'auto';
    return'manual'
  }
  function engineHealthClass(id){return state.engineHealth[id]?.state||'unknown'}
  async function checkEngineHealth({silent=false}={}){
    if(!els.engineHealthBtn)return;
    els.engineHealthBtn.disabled=true;els.engineHealthBtn.innerHTML=`${icon('scan')}检测中…`;
    const engines=builtinEngines,unique=new Map();
    for(const e of engines){const key=e.uploadPage;if(!unique.has(key))unique.set(key,[]);unique.get(key).push(e.id)}
    let ok=0,degraded=0,down=0;
    await Promise.all([...unique.entries()].map(async([url,ids])=>{
      let entry={state:'down',status:0,error:''};
      try{
        const r=await fetch(`/api/url-status?url=${encodeURIComponent(url)}`,{cache:'no-store'});
        const d=await r.json();
        const status=Number(d.status)||0;
        entry=status>=200&&status<400?{state:'ok',status}:{state:[401,403,429].includes(status)?'degraded':'down',status,error:d.error||''}
      }catch(e){entry={state:'down',status:0,error:e?.message||'network error'}}
      ids.forEach(id=>state.engineHealth[id]={...entry,checkedAt:Date.now()})
    }));
    Object.values(state.engineHealth).forEach(x=>{if(x.state==='ok')ok++;else if(x.state==='degraded')degraded++;else down++});
    state.engineHealthCheckedAt=Date.now();
    writeJson(KEYS.engineHealth,{checkedAt:state.engineHealthCheckedAt,engines:state.engineHealth});
    if(els.engineHealthSummary)els.engineHealthSummary.textContent=`正常 ${ok} · 受限 ${degraded} · 异常 ${down}`;
    els.engineHealthBtn.disabled=false;els.engineHealthBtn.innerHTML=`${icon('scan')}重新检测`;
    renderEngines();renderSystemStatus();
    if(!silent)toast('搜索引擎状态检测完成',`正常 ${ok} · 受限 ${degraded} · 异常 ${down}`,down?'error':'ok')
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
      return`<section class="engine-group engine-group-panel"><header class="engine-group-head"><div class="engine-group-title"><span class="engine-group-icon">${icon(meta.icon)}</span><span><b>${escapeHtml(meta.title)}</b><small>${escapeHtml(meta.desc)} · 已选 ${selectedInGroup}/${items.length}</small></span></div><div class="engine-group-actions"><button data-group-select="${escapeHtml(group)}">全选</button><button data-group-clear="${escapeHtml(group)}">清空</button></div></header><div class="engine-grid">${items.map(e=>{const selected=state.selected.includes(e.id),cap=engineCapability(e),tone=engineTones[e.id]||'custom';return`<article class="engine-card ${selected?'selected':''} capability-${cap}" data-engine-id="${e.id}" data-tone="${tone}"><button class="select-engine" data-engine="${e.id}" aria-pressed="${selected}">${engineBrand(e)}<span class="engine-copy"><span class="engine-title-line"><b>${escapeHtml(e.name)}</b><span class="engine-card-status"><span class="engine-health ${engineHealthClass(e.id)}" title="${escapeHtml(state.engineHealth[e.id]?.status?`HTTP ${state.engineHealth[e.id].status}`:'尚未检测')}"><i></i>${engineHealthClass(e.id)==='ok'?'正常':engineHealthClass(e.id)==='degraded'?'受限':engineHealthClass(e.id)==='down'?'异常':'未检测'}</span><span class="engine-capability ${cap}">${icon(cap==='manual'?'hand':'bolt')}${cap==='direct'?'直连':cap==='auto'?'可直连':'手动'}</span></span></span><small>${escapeHtml(e.desc)}</small><span class="engine-help">${cap==='direct'?'当前图片 URL 已就绪':cap==='auto'?'搜索时自动创建临时图片 URL':'打开后上传或粘贴图片'}</span></span><span class="engine-check ${selected?'checked':''}">${icon('check')}</span></button><button class="engine-open" type="button" data-open-engine="${escapeHtml(e.id)}" aria-label="准备并打开 ${escapeHtml(e.name)}" title="准备单引擎搜索">${icon('arrow-up-right')}</button></article>`}).join('')}</div></section>`
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
    {id:'art-institute-chicago',name:'Art Institute Chicago'},{id:'library-of-congress',name:'Library of Congress'},{id:'internet-archive',name:'Internet Archive'},
    {id:'mastodon',name:'Mastodon'},{id:'youtube',name:'YouTube'},{id:'pexels',name:'Pexels'},{id:'unsplash',name:'Unsplash'},{id:'pixabay',name:'Pixabay'},{id:'flickr',name:'Flickr'}
  ];
  const apiProviderIds=new Set(apiPlatformOptions.map(x=>x.id));
  function providerSlug(v=''){return String(v).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}
  function renderUniversalPlatforms(){if(!els.universalPlatform)return;const all=[...apiPlatformOptions,...socialPlatforms,...marketplaces].filter((x,i,a)=>a.findIndex(y=>y.id===x.id)===i),current=state.universal.platform;els.universalPlatform.innerHTML='<option value="all">全部平台</option>'+all.map(x=>`<option value="${escapeHtml(x.id)}">${escapeHtml(x.name)}</option>`).join('');els.universalPlatform.value=all.some(x=>x.id===current)?current:'all';state.universal.platform=els.universalPlatform.value}
  function renderMarketplaces(){const q=state.universal.expanded[0]||primaryQuery(),all=filteredPlatforms();renderUniversalPlatforms();els.marketplaceGrid.innerHTML=all.map(m=>q?`<a class="market-card" data-platform-id="${escapeHtml(m.id)}" href="${escapeHtml(m.url(q))}" target="_blank" rel="noopener noreferrer">${marketBrand(m)}<span><b>${escapeHtml(m.name)}</b><small>${escapeHtml(m.group)}</small></span>${icon('arrow-up-right')}</a>`:`<button class="market-card" disabled>${marketBrand(m)}<span><b>${escapeHtml(m.name)}</b><small>${escapeHtml(m.group)}</small></span>${icon('arrow-up-right')}</button>`).join('');renderKeywordExpansion()}
  function setUniversalMode(mode){state.universal.mode=mode||'all';els.universalModes?.querySelectorAll('[data-universal-mode]').forEach(b=>b.classList.toggle('active',b.dataset.universalMode===state.universal.mode));if(['source','author'].includes(state.universal.mode))choosePreset('source',false);else if(state.universal.mode==='hd')choosePreset('hd',false);else if(['product','competitor'].includes(state.universal.mode))choosePreset('product',false);state.universal.expanded=[];expandUniversalKeywords();renderMarketplaces()}
  function universalParams(){
    const p=new URLSearchParams({q:state.universal.expanded[0]||primaryQuery()});
    for(const k of ['country','language','time','type','platform'])if(state.universal[k]&&state.universal[k]!=='all')p.set(k,state.universal[k]);
    if(apiProviderIds.has(state.universal.platform))p.set('providers',state.universal.platform);
    return p
  }
  async function federatedProductSearch(){const q=primaryQuery();if(!q)return toast('先准备搜索词','可以运行智能分析或手动添加关键词。','error');const ep=state.settings.productEndpoint.trim().replace(/\/$/,'');if(!ep){els.productResults.classList.remove('hidden');els.productResults.innerHTML=`<div class="provider-empty">${icon('info')}<div><b>商品结果聚合尚未启用</b><p>平台快捷搜索可以直接使用。若要在本站展示价格与商品卡片，请在设置里配置商品聚合 API。</p></div></div>`;return}els.productResults.classList.remove('hidden');els.productResults.innerHTML='<div class="loading-block"><span class="spinner"></span>正在聚合商品结果…</div>';try{const r=await fetch(`${ep}/api/product-search?q=${encodeURIComponent(q)}`);const data=await r.json();if(!r.ok||!data.enabled)throw new Error(data.message||'provider unavailable');const items=data.items||[];els.productResults.innerHTML=items.length?`<div class="result-grid">${items.map(x=>`<a class="result-card" href="${escapeHtml(x.link||'#')}" target="_blank" rel="noopener"><div class="result-thumb">${x.thumbnail?`<img src="${escapeHtml(x.thumbnail)}" alt="">`:icon('image')}</div><div><b>${escapeHtml(x.title||'商品')}</b><span>${escapeHtml(x.price||'价格未知')}</span><small>${escapeHtml(x.source||data.provider||'')}</small></div></a>`).join('')}</div>`:'<div class="provider-empty">没有返回可展示的商品结果。</div>'}catch(e){els.productResults.innerHTML=`<div class="provider-empty">${icon('info')}<div><b>聚合服务不可用</b><p>${escapeHtml(e.message||'请检查 API 配置。')}</p></div></div>`}}

  function mediaMeta(x){const m=x.meta||{},bits=[];if(m.width&&m.height)bits.push(`${m.width}×${m.height}`);if(Number.isFinite(m.duration))bits.push(`${m.duration}s`);if(Number.isFinite(m.likes))bits.push(`${m.likes} 赞`);if(Number.isFinite(m.favourites))bits.push(`${m.favourites} 收藏`);if(m.license)bits.push(String(m.license).toUpperCase());return bits.join(' · ')}
  function universalEvidenceBadges(x){const tags=[],domain=universalDomain(x),m=x.meta||{},p=x.product||{};if(domain)tags.push(domain);if(x.publishedAt){const t=Date.parse(x.publishedAt);if(Number.isFinite(t))tags.push(new Date(t).toLocaleDateString())}if(m.width&&m.height)tags.push(`${m.width}×${m.height}`);if(m.license)tags.push(String(m.license).toUpperCase());if(m.publicDomain===true)tags.push('PUBLIC DOMAIN');if(p.price)tags.push(p.price);if(p.brand)tags.push(`Brand ${p.brand}`);if(p.model)tags.push(`Model ${p.model}`);if(p.sku)tags.push(`SKU ${p.sku}`);if(p.mpn)tags.push(`MPN ${p.mpn}`);if(p.asin)tags.push(`ASIN ${p.asin}`);if(p.gtin)tags.push(`GTIN ${p.gtin}`);return tags.slice(0,8)}
  function universalDomain(x){try{return new URL(x.link||x.url||'').hostname.replace(/^www\./,'')}catch{return''}}
  function universalDate(x){const t=Date.parse(x.publishedAt||x.date||'');return Number.isFinite(t)?t:0}
  function universalPixels(x){return (Number(x?.meta?.width)||Number(x.width)||0)*(Number(x?.meta?.height)||Number(x.height)||0)}
  function universalConfidence(x){
    let score=.18;
    if(x.author)score+=.2;if(universalDate(x))score+=.18;if(universalPixels(x)>=1000000)score+=.16;if(x.meta?.license)score+=.08;
    if(/original|source|archive|commons|library|museum/i.test([x.provider,x.snippet,x.title].filter(Boolean).join(' ')))score+=.12;
    if(universalDomain(x))score+=.08;
    return Math.min(.98,score);
  }
  function universalSourceScore(x){
    let score=0;
    if(x.author)score+=18;
    if(universalDate(x))score+=14;
    const pixels=universalPixels(x);if(pixels>=12000000)score+=18;else if(pixels>=4000000)score+=14;else if(pixels>=1000000)score+=10;
    if(x.meta?.publicDomain===true)score+=12;else if(x.meta?.license)score+=9;
    if(universalDomain(x))score+=8;
    if(/library of congress|art institute|nasa|wikimedia|internet archive|openverse/i.test(String(x.provider||x.source||'')))score+=18;
    if(x.product?.brand||x.product?.model||x.product?.sku||x.product?.mpn||x.product?.asin||x.product?.gtin)score+=8;
    return Math.min(100,score);
  }
  function universalClusterKey(x){
    const txt=(x.title||'').toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g,' ').trim().split(/\s+/).filter(w=>w.length>2);
    return txt.slice(0,4).sort().join('|')||providerSlug(x.provider||x.source||'unknown');
  }
  function universalGtinValid(value=''){
    const d=String(value).replace(/\D/g,'');if(![8,12,13,14].includes(d.length))return false;
    const body=d.slice(0,-1).split('').reverse(),sum=body.reduce((n,ch,i)=>n+Number(ch)*(i%2===0?3:1),0);
    return (10-(sum%10))%10===Number(d.at(-1))
  }
  function universalLabeledValue(text,labelRx,max=64){
    const m=text.match(new RegExp(`(?:${labelRx})\\s*[:#\\-]?\\s*([^|;,•\\n]{1,${max}})`,'i'));if(!m)return'';
    return m[1].split(/\b(?:brand|manufacturer|maker|model|sku|mpn|asin|gtin|ean|upc)\b|(?:品牌|制造商|型号|货号)/i)[0].trim()
  }
  function universalStructuredFields(x){
    const src=x.product||{},meta=x.meta||{},text=[x.title,x.snippet,meta.brand,meta.model,meta.sku,meta.mpn,meta.asin,meta.gtin,meta.ean,meta.upc].filter(Boolean).join(' ');
    const price=String(x.price||src.price||'')||((text.match(/(?:US\$|USD\s*|\$|€|£|¥|CNY\s*)\s?\d[\d,.]*(?:\.\d{1,2})?/i)||[])[0]||'');
    const pick=rx=>((text.match(rx)||[])[1]||'').trim(),clean=v=>String(v||'').trim().replace(/[.,;:]+$/,'');
    const brand=clean(src.brand?.name||src.brand||meta.brand||universalLabeledValue(text,'BRAND|品牌|MANUFACTURER|MAKER|制造商',48));
    const sku=clean(src.sku||meta.sku||pick(/(?:SKU|货号)\s*[:#\-]?\s*([A-Z0-9][A-Z0-9._\-]{2,})/i));
    const mpn=clean(src.mpn||meta.mpn||pick(/MPN\s*[:#\-]?\s*([A-Z0-9][A-Z0-9._\-]{2,})/i));
    const model=clean(src.model||meta.model||pick(/(?:MODEL|型号)\s*[:#\-]?\s*([A-Z0-9][A-Z0-9._\-]{2,})/i));
    const asin=clean(src.asin||meta.asin||pick(/ASIN\s*[:#\-]?\s*([A-Z0-9]{10})/i)||((text.match(/\b(B0[A-Z0-9]{8})\b/i)||[])[1]||'')).toUpperCase();
    const labelledGtin=clean(src.gtin||meta.gtin||pick(/GTIN\s*[:#\-]?\s*(\d{8}|\d{12,14})/i));
    const labelledEan=clean(src.ean||meta.ean||pick(/EAN(?:-13)?\s*[:#\-]?\s*(\d{13})/i));
    const labelledUpc=clean(src.upc||meta.upc||pick(/UPC(?:-A)?\s*[:#\-]?\s*(\d{12})/i));
    const numericCandidates=[labelledGtin,labelledEan,labelledUpc,...(text.match(/\b\d{8}\b|\b\d{12,14}\b/g)||[])].filter(universalGtinValid);
    const gtin=numericCandidates[0]||'',ean=labelledEan&&universalGtinValid(labelledEan)?labelledEan:(gtin.length===13?gtin:''),upc=labelledUpc&&universalGtinValid(labelledUpc)?labelledUpc:(gtin.length===12?gtin:'');
    const identity={brand,model,sku,mpn,asin,gtin,ean,upc},identityCount=['brand','model','sku','mpn','asin','gtin'].filter(k=>identity[k]).length;
    const identityScore=Math.min(100,(brand?24:0)+(model?22:0)+(sku?16:0)+(mpn?14:0)+(asin?14:0)+(gtin?18:0));
    return {price,...identity,identityCount,identityScore};
  }
  function universalAnnotated(items){
    const groups={};
    return items.map(x=>{const key=universalClusterKey(x),product={...(x.product||{}),...universalStructuredFields(x)};Object.keys(product).forEach(k=>{if(!product[k])delete product[k]});groups[key]=(groups[key]||0)+1;return {...x,product,_cluster:key,_confidence:universalConfidence(x),_sourceScore:universalSourceScore({...x,product})}}).map(x=>({...x,_clusterCount:groups[x._cluster]}));
  }
  function renderUniversalResearchStats(list){
    if(!els.universalResearchbar||!els.universalResearchStats)return;
    els.universalResearchbar.classList.toggle('hidden',!list.length);
    const domains=new Set(list.map(universalDomain).filter(Boolean)).size,authors=new Set(list.map(x=>x.author).filter(Boolean)).size,hi=list.filter(x=>universalPixels(x)>=1000000).length,identified=list.filter(x=>(x.product?.identityCount||0)>0).length;
    els.universalResearchStats.innerHTML=`<span><b>${list.length}</b>结果</span><span><b>${domains}</b>域名</span><span><b>${authors}</b>作者</span><span><b>${hi}</b>≥1MP</span><span><b>${identified}</b>有身份线索</span><span><b>${state.universal.selected.size}</b>已选</span>`;
  }
  function universalResultKey(x){return x.link||x.url||x.title||''}
  function universalBitDistance(a='',b=''){if(!a||!b||a.length!==b.length)return 1;let d=0;for(let i=0;i<a.length;i++)if(a[i]!==b[i])d++;return d/a.length}
  function universalVisualSimilarity(a,b){
    if(!a||!b)return 0;
    const dh=1-universalBitDistance(a.dhash,b.dhash),eh=1-universalBitDistance(a.edgehash,b.edgehash);
    return dh*.68+eh*.32
  }
  async function buildUniversalVisualGroups({activate=true,silent=false}={}){
    if(typeof window.SOUTU_V9_FINGERPRINT!=='function')throw new Error('V9 图像指纹模块尚未就绪');
    const candidates=state.universal.results.filter(x=>x.thumbnail).slice(0,24);
    if(candidates.length<2)throw new Error('至少需要 2 条带缩略图的结果');
    const btn=els.universalVisualClusterBtn;if(btn){btn.disabled=true;btn.innerHTML=`${icon('image')}计算中…`}
    try{
      const feats=[];
      for(const x of candidates){
        let feature=null;try{feature=await withTimeout(window.SOUTU_V9_FINGERPRINT(x.thumbnail),10000,'fingerprint')}catch{}
        if(feature?.dhash)feats.push({key:universalResultKey(x),title:x.title||'未命名',feature})
      }
      if(feats.length<2)throw new Error('可读取的结果缩略图不足');
      const groups=[];
      for(const item of feats){
        let best=null,bestScore=0;
        for(const g of groups){const score=universalVisualSimilarity(item.feature,g[0].feature);if(score>bestScore){best=g;bestScore=score}}
        if(best&&bestScore>=.84)best.push(item);else groups.push([item])
      }
      const map={},featureMap={};groups.forEach((g,i)=>g.forEach(x=>{map[x.key]=`visual-${i}`;featureMap[x.key]=x.feature}));
      state.universal.visualGroups=map;state.universal.visualFeatures=featureMap;state.universal.visualClusterFocus=null;
      if(activate){state.universal.visualGrouped=true;state.universal.provenanceActive=false;state.universal.grouped=false;state.universal.timeline=false;renderUniversalResults(state.universal.rawResults,state.universal.providers||[])}
      if(!silent)toast('视觉归组完成',`已分析 ${feats.length} 张缩略图 · ${groups.filter(g=>g.length>1).length} 个相似组`,'ok')
    }finally{if(btn){btn.disabled=false;btn.innerHTML=`${icon('image')}视觉归组`;btn.classList.toggle('active',state.universal.visualGrouped)}}
  }
  function provenanceInstitutional(x){return /library of congress|art institute|nasa|wikimedia|internet archive|openverse/i.test(String(x.provider||x.source||''))}
  function provenanceEvidence(x,family){
    const reasons=[];let score=8;
    const dates=family.map(universalDate).filter(Boolean),earliest=dates.length?Math.min(...dates):0,maxPixels=Math.max(0,...family.map(universalPixels));
    const d=universalDate(x),px=universalPixels(x);
    if(d&&d===earliest){score+=28;reasons.push('家族内最早日期')}
    if(px&&px===maxPixels){score+=18;reasons.push('家族内最大分辨率')}
    if(x.author){score+=14;reasons.push('有明确作者')}
    if(x.meta?.publicDomain===true){score+=10;reasons.push('Public Domain')}else if(x.meta?.license){score+=8;reasons.push('有许可元数据')}
    if(provenanceInstitutional(x)){score+=14;reasons.push('公共机构 / 档案来源')}
    if(universalDomain(x)){score+=5;reasons.push('有可识别域名')}
    if(x.product?.model||x.product?.sku||x.product?.mpn){score+=5;reasons.push('有型号 / SKU 线索')}
    score+=Math.round((x._sourceScore||universalSourceScore(x))*.08);
    return {score:Math.min(100,score),reasons}
  }
  function universalCosine(a=[],b=[]){if(!a.length||a.length!==b.length)return 0;let dot=0,aa=0,bb=0;for(let i=0;i<a.length;i++){dot+=a[i]*b[i];aa+=a[i]*a[i];bb+=b[i]*b[i]}return aa&&bb?dot/Math.sqrt(aa*bb):0}
  function provenanceDimensions(x){
    const f=state.universal.visualFeatures[universalResultKey(x)]||{};
    return {width:Number(x?.meta?.width)||Number(x.width)||Number(f.width)||0,height:Number(x?.meta?.height)||Number(x.height)||Number(f.height)||0}
  }
  function provenanceVersionRelation(base,x){
    if(universalResultKey(base)===universalResultKey(x))return {type:'Original candidate',tone:'origin',confidence:1,reasons:['当前家族最高来源证据候选']};
    const bf=state.universal.visualFeatures[universalResultKey(base)],xf=state.universal.visualFeatures[universalResultKey(x)];
    const bd=provenanceDimensions(base),xd=provenanceDimensions(x),bar=bd.width&&bd.height?bd.width/bd.height:0,xar=xd.width&&xd.height?xd.width/xd.height:0;
    const aspectDiff=bar&&xar?Math.abs(Math.log(xar/bar)):0,sizeDiff=bd.width&&bd.height&&xd.width&&xd.height?Math.abs(Math.log((xd.width*xd.height)/(bd.width*bd.height))):0;
    if(!bf||!xf)return {type:'Variant / uncertain',tone:'uncertain',confidence:.35,reasons:['缺少可比较的视觉指纹']};
    const dh=1-universalBitDistance(bf.dhash,xf.dhash),edge=1-universalBitDistance(bf.edgehash,xf.edgehash),hist=universalCosine(bf.hist,xf.hist);
    const pct=v=>`${Math.round(v*100)}%`,reasons=[`主体 ${pct(dh)}`,`结构 ${pct(edge)}`,`色彩 ${pct(hist)}`];
    if(aspectDiff>.075&&dh>=.72){reasons.push('宽高比明显变化');return {type:'Cropped / reframed',tone:'crop',confidence:Math.min(.95,dh*.55+edge*.3+hist*.15),reasons}}
    if(dh>=.96&&edge>=.94&&hist>=.94){
      if(sizeDiff>.08){reasons.push('宽高比接近但像素尺寸变化');return {type:'Resized / compressed',tone:'resize',confidence:Math.min(.99,(dh+edge+hist)/3),reasons}}
      return {type:'Near duplicate',tone:'duplicate',confidence:Math.min(.99,(dh+edge+hist)/3),reasons:[...reasons,'尺寸基本一致']}
    }
    if(dh>=.86&&hist>=.86&&edge<.84){reasons.push('主体接近但边缘结构变化较多');return {type:'Likely text / watermark added',tone:'watermark',confidence:Math.min(.9,dh*.5+hist*.3+(1-edge)*.2),reasons}}
    if(dh>=.76&&edge>=.72&&hist<.84){reasons.push('结构接近但色彩分布变化明显');return {type:'Color / background changed',tone:'background',confidence:Math.min(.9,dh*.45+edge*.4+(1-hist)*.15),reasons}}
    if(dh>=.8||edge>=.8){reasons.push('保留部分主要视觉结构');return {type:'Modified variant',tone:'modified',confidence:Math.min(.86,dh*.55+edge*.45),reasons}}
    return {type:'Variant / uncertain',tone:'uncertain',confidence:Math.max(.25,(dh+edge+hist)/3),reasons}
  }
  function provenanceFamiliesFor(list){
    const map=new Map(),titleCounts=new Map();
    list.forEach(x=>titleCounts.set(x._cluster,(titleCounts.get(x._cluster)||0)+1));
    list.forEach(x=>{
      const key=universalResultKey(x),visual=state.universal.visualGroups[key];
      const id=visual||((titleCounts.get(x._cluster)||0)>1?`title:${x._cluster}`:`single:${key}`);
      if(!map.has(id))map.set(id,[]);map.get(id).push(x)
    });
    return [...map.entries()].map(([id,members])=>{
      const ranked=members.map(x=>({x,...provenanceEvidence(x,members)})).sort((a,b)=>b.score-a.score||universalPixels(b.x)-universalPixels(a.x));
      const candidate=ranked[0],relations=members.map(x=>({x,...provenanceVersionRelation(candidate.x,x)}));
      return {id,members,candidate,relations,method:id.startsWith('visual-')?'视觉指纹':id.startsWith('title:')?'标题 / 元数据':'单一结果'}
    }).sort((a,b)=>b.members.length-a.members.length||b.candidate.score-a.candidate.score)
  }
  async function buildUniversalProvenance(){
    if(!state.universal.results.length)throw new Error('当前没有可分析结果');
    const btn=els.universalProvenanceBtn;if(btn){btn.disabled=true;btn.innerHTML=`${icon('origin')}分析中…`}
    try{
      if(!Object.keys(state.universal.visualGroups||{}).length&&state.universal.results.filter(x=>x.thumbnail).length>=2){
        try{await buildUniversalVisualGroups({activate:false,silent:true})}catch{}
      }
      const families=provenanceFamiliesFor(state.universal.results),visualFamilies=families.filter(f=>f.id.startsWith('visual-')&&f.members.length>1).length;
      state.universal.provenanceMethod=visualFamilies?'视觉指纹优先':'标题 / 元数据回退';
      state.universal.provenanceActive=true;state.universal.grouped=false;state.universal.visualGrouped=false;state.universal.timeline=false;state.universal.provenanceFamilyFocus=null;
      const familyMap={},relationMap={};families.forEach(f=>{f.members.forEach(x=>familyMap[universalResultKey(x)]=f.id);f.relations.forEach(r=>relationMap[universalResultKey(r.x)]={familyId:f.id,type:r.type,confidence:r.confidence,reasons:r.reasons})});state.universal.provenanceFamilyMap=familyMap;state.universal.provenanceRelations=relationMap;
      renderUniversalResults(state.universal.rawResults,state.universal.providers||[]);
      toast('溯源分析完成',`${families.length} 个图片家族 · ${visualFamilies} 个视觉家族`,'ok')
    }finally{if(btn){btn.disabled=false;btn.innerHTML=`${icon('origin')}溯源分析`;btn.classList.toggle('active',state.universal.provenanceActive)}}
  }
  function renderUniversalProvenance(list){
    const families=provenanceFamiliesFor(list),multi=families.filter(f=>f.members.length>1),overall=provenanceEvidence;
    const allRanked=list.map(x=>({x,...overall(x,list)})).sort((a,b)=>b.score-a.score||universalPixels(b.x)-universalPixels(a.x));
    const top=allRanked[0],dated=list.filter(universalDate).slice().sort((a,b)=>universalDate(a)-universalDate(b)).slice(0,8);
    els.universalInsights.classList.remove('hidden');
    els.universalInsights.innerHTML=`<div class="universal-insight-head"><div><b>图片来源溯源</b><span>${escapeHtml(state.universal.provenanceMethod)} · 候选排序，不代表确定原创归属</span></div></div>
      ${top?`<div class="provenance-top"><div class="provenance-top-copy"><span>可能原始来源候选</span><b>${escapeHtml(top.x.title||'未命名')}</b><small>${escapeHtml(universalDomain(top.x)||top.x.provider||'未知来源')}</small><div class="provenance-reasons">${top.reasons.map(r=>`<span>${escapeHtml(r)}</span>`).join('')}</div></div><strong>${top.score}<small>/100</small></strong><a href="${escapeHtml(top.x.link||top.x.url||'#')}" target="_blank" rel="noopener noreferrer">打开来源</a></div>`:''}
      <div class="provenance-grid">${(multi.length?multi:families.slice(0,6)).slice(0,8).map((f,i)=>{const c=f.candidate;return `<article class="provenance-family-card" data-provenance-family="${escapeHtml(f.id)}"><div class="provenance-family-head"><span>图片家族 ${i+1}</span><b>${f.members.length} 条</b></div><strong>${escapeHtml(c.x.title||'未命名')}</strong><small>${escapeHtml(f.method)} · 候选 ${c.score}/100</small><div class="provenance-reasons">${c.reasons.slice(0,4).map(r=>`<span>${escapeHtml(r)}</span>`).join('')}</div><div class="provenance-relations">${f.relations.slice(0,5).map(r=>`<div class="provenance-relation ${escapeHtml(r.tone)}"><span>${escapeHtml(r.type)}</span><b>${Math.round(r.confidence*100)}%</b><small>${escapeHtml(r.x.title||'未命名')}</small><em>${escapeHtml(r.reasons.slice(0,4).join(' · '))}</em></div>`).join('')}</div></article>`}).join('')}</div>
      <div class="provenance-timeline"><div class="universal-insight-head"><b>传播时间线</b><span>只使用结果自带日期；无日期结果不会被强行排序</span></div>${dated.length?dated.map(x=>`<a href="${escapeHtml(x.link||x.url||'#')}" target="_blank" rel="noopener noreferrer"><time>${new Date(universalDate(x)).toLocaleDateString()}</time><span>${escapeHtml(universalDomain(x)||x.provider||'未知')}</span><b>${escapeHtml(x.title||'未命名')}</b></a>`).join(''):'<p>当前结果缺少可验证的发布时间元数据。</p>'}</div>`
  }
  function universalIdentityNorm(v=''){return String(v||'').normalize('NFKC').toUpperCase().replace(/[^A-Z0-9]+/g,'')}
  function universalIdentityMatch(a,b){
    const A=a.product||{},B=b.product||{},eq=(x,y)=>x&&y&&universalIdentityNorm(x)===universalIdentityNorm(y);
    if(A.gtin&&B.gtin&&!eq(A.gtin,B.gtin))return {score:0,basis:'GTIN conflict',conflict:true};
    if(eq(A.gtin,B.gtin))return {score:1,basis:'GTIN',evidence:`GTIN ${A.gtin}`};
    if(eq(A.asin,B.asin))return {score:.98,basis:'ASIN',evidence:`ASIN ${A.asin}`};
    if(eq(A.brand,B.brand)&&eq(A.mpn,B.mpn))return {score:.96,basis:'Brand + MPN',evidence:`${A.brand} · ${A.mpn}`};
    if(eq(A.brand,B.brand)&&eq(A.model,B.model))return {score:.9,basis:'Brand + Model',evidence:`${A.brand} · ${A.model}`};
    if(eq(A.mpn,B.mpn))return {score:.86,basis:'MPN',evidence:`MPN ${A.mpn}`};
    return {score:0,basis:'',evidence:''}
  }
  function buildUniversalIdentityGroups(){
    const list=state.universal.results.filter(x=>(x.product?.identityCount||0)>0),n=list.length;
    const parent=Array.from({length:n},(_,i)=>i),gtins=list.map(x=>new Set(x.product?.gtin?[universalIdentityNorm(x.product.gtin)]:[])),edges=[];
    const root=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i]}return i};
    const merge=(i,j,match)=>{
      let a=root(i),b=root(j);if(a===b)return true;
      const ga=gtins[a],gb=gtins[b];if(ga.size&&gb.size&&![...ga].some(x=>gb.has(x)))return false;
      if(ga.size<gb.size){const t=a;a=b;b=t}
      parent[b]=a;gtins[a]=new Set([...gtins[a],...gtins[b]]);edges.push({i,j,...match});return true
    };
    for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){const m=universalIdentityMatch(list[i],list[j]);if(m.score>=.86&&!m.conflict)merge(i,j,m)}
    const grouped=new Map();for(let i=0;i<n;i++){const r=root(i);if(!grouped.has(r))grouped.set(r,[]);grouped.get(r).push(i)}
    const map={},meta={};let seq=0;
    for(const indexes of grouped.values()){
      if(indexes.length<2)continue;
      const memberSet=new Set(indexes),relevant=edges.filter(e=>memberSet.has(e.i)&&memberSet.has(e.j)).sort((a,b)=>b.score-a.score),best=relevant[0]||{score:.86,basis:'Identity',evidence:''};
      const id=`identity-${seq++}`,members=indexes.map(i=>list[i]);
      meta[id]={id,members,basis:best.basis,evidence:best.evidence,confidence:best.score};
      members.forEach(x=>map[universalResultKey(x)]={id,basis:best.basis,evidence:best.evidence,confidence:best.score})
    }
    state.universal.identityGroupMap=map;state.universal.identityGroupMeta=meta;state.universal.identityGroupFocus=null;state.universal.identityGrouped=true;
    state.universal.grouped=false;state.universal.visualGrouped=false;state.universal.provenanceActive=false;state.universal.identityGrouped=false;state.universal.timeline=false;
    renderUniversalResults(state.universal.rawResults,state.universal.providers||[]);
    const count=Object.keys(meta).length,items=Object.keys(map).length;
    toast('同款候选归组完成',count?`${count} 个候选组 · ${items} 条结果`:'当前结果没有足够的重复身份标识','ok')
  }
  function renderUniversalIdentityGroups(){
    const groups=Object.values(state.universal.identityGroupMeta||{}).sort((a,b)=>b.members.length-a.members.length||b.confidence-a.confidence);
    els.universalInsights.classList.remove('hidden');
    els.universalInsights.innerHTML=`<div class="universal-insight-head"><div><b>同款候选归组</b><span>使用 GTIN / ASIN / Brand+MPN / Brand+Model；GTIN 冲突会阻止合并</span></div></div><div class="identity-match-groups">${groups.length?groups.map((g,i)=>`<button data-identity-group-key="${escapeHtml(g.id)}"><div><b>候选组 ${i+1}</b><span>${g.members.length} 条</span></div><strong>${escapeHtml(g.basis)}</strong><small>${escapeHtml(g.evidence||'结构化身份字段一致')}</small><em>${Math.round(g.confidence*100)}%</em><p>${escapeHtml(g.members.slice(0,4).map(x=>x.title||'未命名').join(' / '))}</p></button>`).join(''):'<p class="identity-match-empty">当前结果没有可确认的重复身份标识；不会仅凭图片相似就判为同款。</p>'}</div>`;
  }
  function renderUniversalInsights(list){
    if(!els.universalInsights)return;
    if(!list.length){els.universalInsights.classList.add('hidden');els.universalInsights.innerHTML='';return}
    if(state.universal.identityGrouped){renderUniversalIdentityGroups();return}
    if(state.universal.provenanceActive){renderUniversalProvenance(list);return}
    if(state.universal.visualGrouped){
      const map=new Map();list.forEach(x=>{const id=state.universal.visualGroups[universalResultKey(x)];if(!id)return;if(!map.has(id))map.set(id,[]);map.get(id).push(x)});
      const groups=[...map.values()].filter(g=>g.length>1).sort((a,b)=>b.length-a.length).slice(0,12);
      els.universalInsights.classList.remove('hidden');
      els.universalInsights.innerHTML=`<div class="universal-insight-head"><b>视觉相似归组</b><span>基于 dHash + edge hash；仅用于相似候选，不等于同一原图判定</span></div><div class="universal-clusters visual">${groups.length?groups.map((g,i)=>`<button data-visual-cluster-key="${escapeHtml(state.universal.visualGroups[universalResultKey(g[0])])}"><b>视觉组 ${i+1}</b><span>${g.length} 条</span><small>${escapeHtml(g.slice(0,3).map(x=>x.title).join(' / ').slice(0,110))}</small></button>`).join(''):'<p>当前结果未发现达到阈值的视觉相似组。</p>'}</div>`;
      return;
    }
    if(state.universal.timeline){
      const dated=list.filter(universalDate).slice().sort((a,b)=>universalDate(a)-universalDate(b));
      els.universalInsights.classList.remove('hidden');
      els.universalInsights.innerHTML=`<div class="universal-insight-head"><b>来源时间线</b><span>仅显示有明确日期的结果，不代表绝对首次发布</span></div><div class="universal-timeline">${dated.length?dated.slice(0,24).map(x=>`<a href="${escapeHtml(x.link||x.url||'#')}" target="_blank" rel="noopener noreferrer"><time>${new Date(universalDate(x)).toLocaleDateString()}</time><b>${escapeHtml(x.title||'未命名')}</b><small>${escapeHtml(x.provider||x.source||universalDomain(x))}</small></a>`).join(''):'<p>当前结果没有足够的发布时间元数据。</p>'}</div>`;
      return;
    }
    if(state.universal.grouped){
      const map=new Map();list.forEach(x=>{if(!map.has(x._cluster))map.set(x._cluster,[]);map.get(x._cluster).push(x)});
      const groups=[...map.values()].sort((a,b)=>b.length-a.length).filter(g=>g.length>1).slice(0,12);
      els.universalInsights.classList.remove('hidden');
      els.universalInsights.innerHTML=`<div class="universal-insight-head"><b>相似结果归组</b><span>按标题关键词和来源线索进行轻量聚类</span></div><div class="universal-clusters">${groups.length?groups.map((g,i)=>`<button data-cluster-key="${escapeHtml(g[0]._cluster)}"><b>组 ${i+1}</b><span>${g.length} 条</span><small>${escapeHtml(g.slice(0,3).map(x=>x.title).join(' / ').slice(0,110))}</small></button>`).join(''):'<p>暂未发现明显重复或相似标题组。</p>'}</div>`;
      return;
    }
    els.universalInsights.classList.add('hidden');els.universalInsights.innerHTML='';
  }
  function selectedUniversalResults(){return state.universal.results.filter(x=>state.universal.selected.has(x.link||x.url||x.title))}
  function toggleUniversalSelect(key){state.universal.selected.has(key)?state.universal.selected.delete(key):state.universal.selected.add(key);renderUniversalResults(state.universal.rawResults,state.universal.providers||[])}
  function saveUniversalItems(items){
    const existing=new Set(state.universalFavorites.map(x=>x.link));
    const add=items.filter(x=>!existing.has(x.link||x.url||'')).map(r=>({link:r.link||r.url||'',title:r.title||'',thumbnail:r.thumbnail||'',provider:r.provider||r.source||'',type:r.type||'',savedAt:Date.now()})).filter(x=>x.link);
    state.universalFavorites=[...add,...state.universalFavorites].slice(0,100);writeJson(KEYS.universalFavorites,state.universalFavorites);renderProjects();toast('已收藏结果',`${add.length} 条新增`,'ok')
  }
  function exportUniversalCsv(){
    const list=selectedUniversalResults().length?selectedUniversalResults():state.universal.results;if(!list.length)return toast('没有可导出的结果','','error');
    const rows=[['title','provider','type','author','date','domain','width','height','confidence','brand','model','sku','mpn','asin','gtin','identity_score','identity_group','identity_basis','identity_match_confidence','family_id','version_relation','relation_confidence','url'],...list.map(x=>{const rel=state.universal.provenanceRelations[universalResultKey(x)]||{};return [x.title||'',x.provider||x.source||'',x.type||'',x.author||'',x.publishedAt||'',universalDomain(x),x.meta?.width||x.width||'',x.meta?.height||x.height||'',Math.round((x._confidence||universalConfidence(x))*100),x.product?.brand||'',x.product?.model||'',x.product?.sku||'',x.product?.mpn||'',x.product?.asin||'',x.product?.gtin||'',x.product?.identityScore||0,(state.universal.identityGroupMap[universalResultKey(x)]||{}).id||'',(state.universal.identityGroupMap[universalResultKey(x)]||{}).basis||'',(state.universal.identityGroupMap[universalResultKey(x)]||{}).confidence!=null?Math.round(state.universal.identityGroupMap[universalResultKey(x)].confidence*100):'',state.universal.provenanceFamilyMap[universalResultKey(x)]||'',rel.type||'',rel.confidence!=null?Math.round(rel.confidence*100):'',x.link||x.url||'']})];
    const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`soutu-universal-${Date.now()}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)
  }
  function exportUniversalJson(){
    const list=selectedUniversalResults().length?selectedUniversalResults():state.universal.results;if(!list.length)return toast('没有可导出的结果','','error');
    const payload={version:'V9',kind:'universal-search-export',query:state.universal.expanded[0]||primaryQuery(),mode:state.universal.mode,filters:{platform:state.universal.platform,country:state.universal.country,language:state.universal.language,time:state.universal.time,type:state.universal.type,resolution:state.universal.resolution,license:state.universal.license,sort:state.universal.sort},exportedAt:new Date().toISOString(),results:list.map(x=>({title:x.title||'',url:x.link||x.url||'',thumbnail:x.thumbnail||'',provider:x.provider||x.source||'',type:x.type||'',author:x.author||'',publishedAt:x.publishedAt||'',domain:universalDomain(x),width:x.meta?.width||x.width||0,height:x.meta?.height||x.height||0,confidence:Math.round((x._confidence||universalConfidence(x))*100),sourceScore:Math.round(x._sourceScore||universalSourceScore(x)),familyId:state.universal.provenanceFamilyMap[universalResultKey(x)]||'',versionRelation:state.universal.provenanceRelations[universalResultKey(x)]||null,identityMatch:state.universal.identityGroupMap[universalResultKey(x)]||null,product:x.product||{},license:x.meta?.license||'',snippet:x.snippet||''}))};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`soutu-universal-${Date.now()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)
  }
  function sendUniversalToResearch(){
    const list=selectedUniversalResults().length?selectedUniversalResults():state.universal.results;if(!list.length)return toast('没有可送入调查中心的结果','','error');
    const payload={source:'V9 Universal Search',capturedAt:Date.now(),results:list.map(x=>({title:x.title||'',url:x.link||x.url||'',image:x.thumbnail||'',thumbnail:x.thumbnail||'',snippet:x.snippet||'',engine:x.provider||x.source||'',source:x.provider||x.source||'',date:x.publishedAt||'',width:x.meta?.width||x.width||0,height:x.meta?.height||x.height||0,product:x.product||{},provenance:{familyId:state.universal.provenanceFamilyMap[universalResultKey(x)]||'',versionRelation:state.universal.provenanceRelations[universalResultKey(x)]||null},identityMatch:state.universal.identityGroupMap[universalResultKey(x)]||null,scores:{overall:x._confidence||universalConfidence(x),sourceEvidence:(x._sourceScore||universalSourceScore(x))/100}}))};
    if(typeof window.SOUTU_V9_IMPORT==='function'){window.SOUTU_V9_IMPORT(payload);setView('research');toast('已送入调查中心',`${list.length} 条结果`,'ok')}else{localStorage.setItem('soutu-pro-v9-pending-import',JSON.stringify(payload));setView('research');toast('已准备调查数据','调查中心将在打开时载入。','ok')}
  }

  function renderUniversalResults(items=null,providers=[]){
    if(Array.isArray(items)&&items!==state.universal.rawResults){state.universal.rawResults=items.slice();state.universal.selected=new Set();state.universal.clusterFocus=null;state.universal.visualClusterFocus=null;state.universal.visualGroups={};state.universal.visualFeatures={};state.universal.visualGrouped=false;state.universal.provenanceActive=false;state.universal.provenanceFamilyMap={};state.universal.provenanceRelations={};state.universal.provenanceFamilyFocus=null;state.universal.provenanceMethod='none';state.universal.identityGrouped=false;state.universal.identityGroupMap={};state.universal.identityGroupMeta={};state.universal.identityGroupFocus=null}
    let list=universalAnnotated(state.universal.rawResults.slice());if(state.universal.platform!=='all')list=list.filter(x=>providerSlug(x.provider||x.source||'')===state.universal.platform||String(x.platformId||'')===state.universal.platform);
    if(state.universal.type!=='all')list=list.filter(x=>(x.type||'').toLowerCase()===state.universal.type);
    if(state.universal.resolution!=='all'){const min=Number(state.universal.resolution)*1000000;list=list.filter(x=>universalPixels(x)>=min)}
    if(state.universal.license!=='all'){
      const lic=x=>String(x.meta?.license||'').toLowerCase(),pd=x=>x.meta?.publicDomain===true||['cc0','pdm','public-domain','public domain'].includes(lic(x));
      if(state.universal.license==='public-domain')list=list.filter(pd);
      else if(state.universal.license==='known')list=list.filter(x=>pd(x)||Boolean(lic(x)));
      else list=list.filter(x=>lic(x)===state.universal.license);
    }
    const seen=new Set();list=list.filter(x=>{const k=(x.link||x.url||'')+'|'+(x.title||'');if(seen.has(k))return false;seen.add(k);return true});
    if(state.universal.clusterFocus)list=list.filter(x=>x._cluster===state.universal.clusterFocus);
    if(state.universal.visualClusterFocus)list=list.filter(x=>state.universal.visualGroups[universalResultKey(x)]===state.universal.visualClusterFocus);
    if(state.universal.provenanceFamilyFocus)list=list.filter(x=>state.universal.provenanceFamilyMap[universalResultKey(x)]===state.universal.provenanceFamilyFocus);
    if(state.universal.identityGroupFocus)list=list.filter(x=>state.universal.identityGroupMap[universalResultKey(x)]?.id===state.universal.identityGroupFocus);
    const px=x=>universalPixels(x),date=x=>universalDate(x),oldest=x=>date(x)||Number.MAX_SAFE_INTEGER;
    if(state.universal.sort==='evidence')list.sort((a,b)=>(b._sourceScore||0)-(a._sourceScore||0)||px(b)-px(a));
    else if(state.universal.sort==='newest')list.sort((a,b)=>date(b)-date(a)||px(b)-px(a));
    else if(state.universal.sort==='largest')list.sort((a,b)=>px(b)-px(a));
    else if(state.universal.mode==='hd')list.sort((a,b)=>px(b)-px(a));
    else if(state.universal.mode==='source')list.sort((a,b)=>oldest(a)-oldest(b)||px(b)-px(a));
    else if(state.universal.mode==='author')list.sort((a,b)=>Number(Boolean(b.author))-Number(Boolean(a.author))||oldest(a)-oldest(b));
    state.universal.results=list;state.universal.providers=providers;
    if(providers.length){
      const merged=new Map((state.providerHealth||[]).map(p=>[p.name,p]));
      providers.forEach(p=>{const name=p.name||'Unknown';merged.set(name,{name,enabled:!!p.enabled,configured:p.configured!==false,count:Number(p.count)||0,message:p.message||'',checkedAt:Date.now()})});
      state.providerHealth=[...merged.values()].sort((a,b)=>a.name.localeCompare(b.name));state.providerHealthCheckedAt=Date.now();
      writeJson(KEYS.providerHealth,{checkedAt:state.providerHealthCheckedAt,providers:state.providerHealth})
    }
    renderUniversalResearchStats(list);renderUniversalInsights(list);
    const providerStrip=providers.length?`<div class="provider-strip">${providers.map(p=>`<span class="${p.enabled?'ok':'off'}"><b>${escapeHtml(p.name)}</b><small>${p.enabled?`${p.count||0} 条`:p.configured?'暂不可用':'未配置 Key'}</small></span>`).join('')}</div>`:'';
    const cards=list.map(x=>`<article class="universal-result-card ${state.universal.selected.has(x.link||x.url||x.title)?'selected':''}" data-result-type="${escapeHtml(x.type||'post')}"><label class="universal-select"><input type="checkbox" data-universal-select="${escapeHtml(x.link||x.url||x.title)}" ${state.universal.selected.has(x.link||x.url||x.title)?'checked':''}><span>${icon('check')}</span></label><a class="universal-media" href="${escapeHtml(x.link||x.url||'#')}" target="_blank" rel="noopener noreferrer">${x.thumbnail?`<img src="${escapeHtml(x.thumbnail)}" alt="" loading="lazy" referrerpolicy="no-referrer">`:`<span class="universal-placeholder">${icon(x.type==='video'?'play':x.type==='product'?'shopping':'image')}</span>`}<em>${escapeHtml(x.provider||x.source||'Web')}</em></a><div class="universal-result-body"><b>${escapeHtml(x.title||'未命名结果')}</b><p>${escapeHtml((x.snippet||'').slice(0,180))}</p><div><span>${escapeHtml(x.author||'')}</span><small>${escapeHtml(mediaMeta(x))}</small></div><div class="universal-evidence-badges">${universalEvidenceBadges(x).map(t=>`<span>${escapeHtml(t)}</span>`).join('')}</div>${x.product?.identityCount?`<div class="product-identity-strip"><span>Product ID</span><b>${x.product.identityScore}/100</b>${[['Brand',x.product.brand],['Model',x.product.model],['SKU',x.product.sku],['MPN',x.product.mpn],['ASIN',x.product.asin],[x.product.ean?'EAN':x.product.upc?'UPC':'GTIN',x.product.ean||x.product.upc||x.product.gtin]].filter(([,v])=>v).map(([k,v])=>`<em><small>${escapeHtml(k)}</small>${escapeHtml(v)}</em>`).join('')}</div>`:''}<div class="universal-score-row"><div class="universal-confidence"><span>候选置信度</span><b>${Math.round((x._confidence||0)*100)}%</b></div><div class="universal-source-score" title="由作者、日期、像素、许可、来源机构和结构化字段组成"><span>来源证据</span><b>${Math.round(x._sourceScore||0)}</b></div></div><div class="universal-result-actions"><a href="${escapeHtml(x.link||x.url||'#')}" target="_blank" rel="noopener noreferrer">打开来源</a><button data-copy-result="${escapeHtml(x.link||x.url||'')}">复制链接</button><button class="${state.universalFavorites.some(f=>f.link===(x.link||x.url||''))?'active':''}" data-favorite-result="${escapeHtml(x.link||x.url||'')}">${state.universalFavorites.some(f=>f.link===(x.link||x.url||''))?'已收藏':'收藏'}</button></div></div></article>`).join('');
    els.productResults.classList.remove('hidden');els.productResults.innerHTML=providerStrip+(cards?`<div class="universal-waterfall">${cards}</div>`:'<div class="provider-empty">当前筛选条件下没有可展示结果。</div>');if(els.universalMeta)els.universalMeta.textContent=`${list.length} 条结果 · ${providers.filter(p=>p.enabled).length} 个 API 可用`;
  }
  async function fetchMediaResults(){const ep=state.settings.productEndpoint.trim().replace(/\/$/,'')||location.origin;const r=await fetch(`${ep}/api/media-search?${universalParams().toString()}`);const data=await r.json();if(!r.ok||!data.enabled)throw new Error(data.error||'media providers unavailable');return data}
  async function federatedMediaSearch(){const q=primaryQuery();if(!q)return toast('先准备搜索词','可以运行智能分析或手动添加关键词。','error');state.universal.expanded=expandUniversalKeywords();els.productResults.classList.remove('hidden');els.productResults.innerHTML='<div class="loading-block"><span class="spinner"></span>正在搜索免费媒体 / 社媒 API…</div>';try{const data=await fetchMediaResults();renderUniversalResults(data.items||[],data.providers||[])}catch(e){els.productResults.innerHTML=`<div class="provider-empty">${icon('info')}<div><b>免费 API 聚合不可用</b><p>${escapeHtml(e.message||'请检查 API 配置。')}</p></div></div>`}}
  async function universalSearch(){
    const q=primaryQuery();if(!q)return toast('先准备搜索词','可运行智能分析或手动添加关键词。','error');state.universal.expanded=expandUniversalKeywords();renderKeywordExpansion();els.productResults.classList.remove('hidden');els.productResults.innerHTML='<div class="loading-block"><span class="spinner"></span>正在执行跨平台检索…</div>';
    const apiEligible=state.universal.platform==='all'||apiProviderIds.has(state.universal.platform);
    const jobs=apiEligible?[fetchMediaResults()]:[],wantProduct=['all','product','competitor'].includes(state.universal.mode);if(wantProduct){const ep=state.settings.productEndpoint.trim().replace(/\/$/,'');if(ep)jobs.push(fetch(`${ep}/api/product-search?q=${encodeURIComponent(state.universal.expanded[0]||q)}`).then(r=>r.json()).then(d=>({items:(d.items||[]).map(x=>({...x,type:'product',provider:x.source||d.provider||'Product Search',link:x.link,thumbnail:x.thumbnail})),providers:d.enabled?[{name:d.provider||'Product Search',enabled:true,configured:true,count:(d.items||[]).length}]:[]})).catch(()=>({items:[],providers:[]})))}
    const settled=await Promise.allSettled(jobs),items=[],providers=[];settled.forEach(x=>{if(x.status==='fulfilled'){items.push(...(x.value.items||[]));providers.push(...(x.value.providers||[]))}});renderUniversalResults(items,providers);if(!apiEligible&&!items.length)toast('该平台使用官方站内搜索','下方平台入口会直接打开对应网站；不会请求无关 API。','ok');
    if(!state.privacy){state.history=[{id:uid(),createdAt:Date.now(),label:`全网搜索 · ${state.universal.mode}`,query:state.universal.expanded[0]||q,preset:`universal:${state.universal.mode}`,engines:filteredPlatforms().map(x=>x.id),thumb:state.source?.thumb||'',sourceName:state.source?.name||'',mode:state.universal.mode,universalFilters:{platform:state.universal.platform,country:state.universal.country,language:state.universal.language,time:state.universal.time,type:state.universal.type,resolution:state.universal.resolution,license:state.universal.license,sort:state.universal.sort}},...state.history].slice(0,80);writeJson(KEYS.history,state.history)}
  }
  function batchOpenUniversalSources(){const q=state.universal.expanded[0]||primaryQuery();if(!q)return toast('没有搜索词','先生成或输入关键词。','error');const list=filteredPlatforms().slice(0,12),urls=list.map(m=>m.url(q));openModal('executionModal');els.executionSummary.textContent=`已准备 ${list.length} 个平台搜索 · 浏览器可能限制一次打开多个标签页`;els.executionList.innerHTML=`<div class="universal-open-grid">${urls.map((u,i)=>`<a class="secondary-btn compact execution-link" href="${escapeHtml(u)}" target="_blank" rel="noopener noreferrer">${escapeHtml(list[i].name)} ${icon('arrow-up-right')}</a>`).join('')}</div>`}
  
  async function federatedSupplierSearch(){const q=primaryQuery();if(!q)return toast('先准备搜索词','可以运行智能分析或手动添加关键词。','error');const ep=state.settings.productEndpoint.trim().replace(/\/$/,'');if(!ep){els.productResults.classList.remove('hidden');els.productResults.innerHTML=`<div class="provider-empty">${icon('info')}<div><b>供应商聚合尚未启用</b><p>Alibaba、Made-in-China 与 Global Sources 快捷入口仍可直接使用；配置聚合 API 后可在本站集中查看供应商线索。</p></div></div>`;return}els.productResults.classList.remove('hidden');els.productResults.innerHTML='<div class="loading-block"><span class="spinner"></span>正在聚合供应商线索…</div>';try{const r=await fetch(`${ep}/api/supplier-search?q=${encodeURIComponent(q)}`);const data=await r.json();if(!r.ok||!data.enabled)throw new Error(data.message||'provider unavailable');const items=data.items||[];els.productResults.innerHTML=items.length?`<div class="supplier-results">${items.map(x=>`<a class="supplier-result" href="${escapeHtml(x.link||'#')}" target="_blank" rel="noopener"><span class="supplier-source">${escapeHtml(x.source||'Supplier')}</span><div><b>${escapeHtml(x.title||'供应商线索')}</b><p>${escapeHtml(x.snippet||'')}</p></div>${icon('arrow-up-right')}</a>`).join('')}</div>`:'<div class="provider-empty">没有返回供应商线索。</div>'}catch(e){els.productResults.innerHTML=`<div class="provider-empty">${icon('info')}<div><b>供应商聚合服务不可用</b><p>${escapeHtml(e.message||'请检查 API 配置。')}</p></div></div>`}}

  async function addDetectedObjectsToBatch(){if(!state.analysis.objects?.length||!activeUrl())return toast('没有可加入的主体区域','请先运行智能分析。','error');try{const img=await loadImageSafe(activeUrl());let added=0;for(const [i,o] of state.analysis.objects.slice(0,8).entries()){const [x,y,w,h]=o.bbox,c=document.createElement('canvas');c.width=Math.max(1,Math.round(w));c.height=Math.max(1,Math.round(h));c.getContext('2d').drawImage(img,x,y,w,h,0,0,c.width,c.height);const blob=await new Promise(res=>c.toBlob(res,'image/png',.94));if(!blob)continue;const file=new File([blob],`${o.label||'object'}-${i+1}.png`,{type:'image/png'}),url=URL.createObjectURL(blob),thumb=await makeThumb(url);state.batch.push({id:uid(),file,url,thumb,name:file.name,size:file.size,preset:state.analysis.recommended||state.preset||'product',status:'ready',width:c.width,height:c.height});added++;if(state.batch.length>=MAX_BATCH)break}renderBatch();setView('batch');toast(`已加入 ${added} 个主体区域`,'可为每个区域单独选择搜索任务并执行。','ok')}catch(e){toast('主体区域加入失败',e.message||'图片可能受跨域限制。','error')}}

  function isTempValid(){return !!(state.tempLink?.url&&state.tempLink.expiresAt>Date.now()+5000)}
  function syncTempCard(){
    clearInterval(state.tempTimer);
    const ep=state.settings.tempEndpoint.trim(),remote=state.source?.kind==='url'&&!state.useProcessed;
    els.tempLinkCard?.classList.toggle('unavailable',!!state.tempUnavailableReason);
    els.tempLinkBtn.disabled=!state.source||(!ep&&!directSourceUrl());
    if(remote&&!state.forceTempLink){
      els.tempLinkStatus.textContent=ep?'原图可直连；防盗链时可重新托管':'原图已是公开 URL';
      els.tempLinkBtn.textContent=ep?'增强直连':'无需创建';
      els.tempLinkBtn.disabled=!ep;
      return
    }
    if(isTempValid()){updateTempCountdown();state.tempTimer=setInterval(updateTempCountdown,1000);els.tempLinkBtn.textContent=remote&&state.forceTempLink?'使用原链接':'重新创建';return}
    if(state.tempUnavailableReason){els.tempLinkStatus.textContent=state.tempUnavailableReason;els.tempLinkBtn.textContent='重新检测';return}
    els.tempLinkStatus.textContent=ep?(state.forceTempLink?'正在使用重新托管模式':'可创建短时 URL'):'未配置临时图片服务';
    els.tempLinkBtn.textContent='创建'
  }
  function updateTempCountdown(){if(!isTempValid()){els.tempLinkStatus.textContent='链接已过期';clearInterval(state.tempTimer);renderEngines();return}const sec=Math.max(0,Math.floor((state.tempLink.expiresAt-Date.now())/1000));els.tempLinkStatus.textContent=`${state.forceTempLink?'增强直连 · ':''}剩余 ${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`}
  async function createTempLink({silent=false}={}){
    const ep=state.settings.tempEndpoint.trim().replace(/\/$/,'');
    if(!ep){state.tempUnavailableReason='未配置临时图片服务';state.tempUnavailableAt=Date.now();syncTempCard();if(!silent)toast('未配置临时图片服务','直连搜索需要一个可用的临时公网图片服务。','error');return false}
    els.tempLinkBtn.disabled=true;els.tempLinkBtn.innerHTML='<span class="spinner"></span>上传中';
    try{
      const blob=await blobFromActive();let data;
      if(window.SOUTU_CONFIG?.tempUploadProvider==='vercel'&&ep===location.origin){
        const tokenRes=await fetch(`${ep}/api/temp-token?ttl=${Number(state.settings.ttl)||30}&size=${blob.size}&contentType=${encodeURIComponent(blob.type||'image/png')}`,{method:'POST'});
        data=await tokenRes.json().catch(()=>({}));
        if(!tokenRes.ok||!data.uploadUrl||!data.url){
          if(data.code==='BLOB_NOT_CONFIGURED'){
            state.tempUnavailableReason='Vercel Blob 未连接';state.tempUnavailableAt=Date.now();
            syncTempCard();renderEngines();
            if(!silent)toast('Vercel Blob 尚未连接','连接 Blob 后即可使用 Google / Bing / Yandex 等一键直连。','error');
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
      state.tempUnavailableReason='';state.tempUnavailableAt=0;
      state.tempLink={url:data.url,expiresAt:Number(data.expiresAt)||Date.now()+30*60_000,deleteUrl:data.deleteUrl||''};
      if(!silent)toast('临时链接已创建',`将在约 ${state.settings.ttl} 分钟后失效。`,'ok');
      syncTempCard();renderEngines();return true
    }catch(e){
      state.tempUnavailableReason=e?.message||'临时图片服务不可用';state.tempUnavailableAt=Date.now();
      if(!silent)toast('临时链接创建失败',state.tempUnavailableReason,'error');
      return false
    }finally{syncTempCard()}
  }
  async function deleteTempLink(){clearInterval(state.tempTimer);const old=state.tempLink;state.tempLink=null;if(old?.deleteUrl)fetch(old.deleteUrl,{method:'DELETE'}).catch(()=>{});syncTempCard()}
  async function ensurePublicUrl({silent=true}={}){
    const originalRemote=state.source?.kind==='url'&&!state.useProcessed?state.source.publicUrl:null;
    const direct=directSourceUrl();if(direct)return direct;
    if(isTempValid())return state.tempLink.url;
    if(state.tempUnavailableReason&&silent&&Date.now()-(state.tempUnavailableAt||0)<5000){
      if(state.forceTempLink&&originalRemote){state.forceTempLink=false;syncTempCard();renderEngines();return originalRemote}
      return null
    }
    if(state.settings.tempEndpoint){await createTempLink({silent});if(isTempValid())return state.tempLink.url}
    if(state.forceTempLink&&originalRemote){
      state.forceTempLink=false;syncTempCard();renderEngines();
      if(!silent)toast('增强直连不可用','已自动退回原始图片 URL。','error');
      return originalRemote
    }
    return null
  }

  function engineTarget(engine,publicUrl){return publicUrl&&engine.direct?engine.direct(publicUrl):engine.uploadPage}
  async function quietCopy(){try{const b=await blobFromActive();await navigator.clipboard.write([new ClipboardItem({[b.type||'image/png']:b})]);return true}catch{return false}}
  async function runSearch(){
    if(!state.source||!state.selected.length)return;
    els.runSearch.classList.add('busy');els.runSearch.querySelector('span').textContent='准备搜索…';
    const engines=allEngines().filter(e=>state.selected.includes(e.id));
    openModal('executionModal');els.executionList.innerHTML='';
    const statuses=engines.map(e=>({id:e.id,name:e.name,direct:typeof e.direct==='function',copied:false,status:'ready'}));
    renderExecution(statuses);
    const manualCount=statuses.filter(x=>!x.direct).length;
    els.executionSummary.textContent=`${statuses.length} 个结果已准备 · ${statuses.length-manualCount} 个可一键直连 · ${manualCount} 个需手动上传`;
    if(!state.privacy)await addHistory();
    els.runSearch.classList.remove('busy');els.runSearch.querySelector('span').textContent='搜索所选引擎'
  }
  function renderExecution(items){
    els.executionList.innerHTML=items.map(x=>{const e=allEngines().find(v=>v.id===x.id);return `<div class="execution-row" data-execution-id="${escapeHtml(x.id)}"><span class="execution-engine-brand">${e?engineBrand(e):icon('search')}</span><div><b>${escapeHtml(x.name)}</b><small>${x.direct?'点击时重新校验图片链接，过期会自动刷新':x.copied?'图片已复制；打开后可直接粘贴':'请先复制图片，再打开上传/粘贴'}</small></div><span class="status-pill ready">待打开</span><div class="execution-actions">${x.direct?'':`<button class="secondary-btn compact" data-copy-execution>${icon('copy')}复制图片</button>`}<button class="secondary-btn compact execution-link" type="button" data-execution-open>打开</button></div></div>`}).join('')
  }
  function prepareSearchPopup(label='搜索'){
    const popup=window.open('about:blank','_blank');
    if(!popup)return null;
    try{
      popup.document.title=`搜图 Pro · ${label}`;
      popup.document.body.innerHTML=`<main style="font-family:system-ui,-apple-system,sans-serif;display:grid;place-items:center;min-height:90vh;color:#1f2937"><div style="text-align:center"><div style="width:34px;height:34px;border:3px solid #dbe3f0;border-top-color:#4f46e5;border-radius:50%;margin:0 auto 16px;animation:s 1s linear infinite"></div><b>正在准备 ${escapeHtml(label)}</b><p style="font-size:13px;color:#6b7280">正在校验图片链接并生成搜索地址…</p><style>@keyframes s{to{transform:rotate(360deg)}}</style></div></main>`;
      popup.opener=null
    }catch{}
    return popup
  }
  async function openExecutionEngine(row){
    const id=row?.dataset.executionId,engine=allEngines().find(x=>x.id===id);if(!engine)return;
    const btn=row.querySelector('[data-execution-open]'),pill=row.querySelector('.status-pill');
    const popup=prepareSearchPopup(engine.name);
    if(!popup){toast('浏览器拦截了搜索窗口','请允许本站打开新窗口后重试。','error');return}
    if(btn){btn.disabled=true;btn.textContent='正在准备…'}if(pill){pill.className='status-pill ready';pill.textContent='校验中'}
    try{
      let target=engine.uploadPage;
      if(engine.direct){
        const publicUrl=await ensurePublicUrl({silent:false});
        if(!publicUrl)throw new Error(state.tempUnavailableReason||'临时图片服务不可用，无法生成直连搜索地址。');
        target=engineTarget(engine,publicUrl);
      }else{
        const copied=await quietCopy();
        if(!copied)throw new Error('浏览器未允许复制图片，请手动选择文件。');
      }
      if(popup&&!popup.closed)popup.location.replace(target);else throw new Error('搜索窗口已被浏览器关闭，请重试。');
      if(pill){pill.className='status-pill opened';pill.textContent='已打开'}if(btn)btn.textContent='再次打开'
    }catch(err){
      if(popup&&!popup.closed)popup.close();
      if(pill){pill.className='status-pill ready';pill.textContent='打开失败'}if(btn)btn.textContent='重试';
      toast('搜索页打开失败',err?.message||'请重试。','error')
    }finally{if(btn)btn.disabled=false}
  }
  async function prepareSingleEngine(id){
    const engine=allEngines().find(x=>x.id===id);
    if(!engine)return;
    openModal('executionModal');
    els.executionSummary.textContent='正在准备单引擎搜索…';
    els.executionList.innerHTML='<div class="loading-block"><span class="spinner"></span>正在准备临时图片链接…</div>';
    const direct=typeof engine.direct==='function';
    const item={id:engine.id,name:engine.name,direct,copied:false,status:'ready'};
    renderExecution([item]);
    els.executionSummary.textContent=`1 个结果已准备 · ${direct?'可一键直连':'需手动上传'}`;
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
    if(String(item.preset||'').startsWith('universal:')){
      state.universal.mode=item.mode||String(item.preset).replace('universal:','')||'all';
      const f=item.universalFilters||{};
      for(const key of ['platform','country','language','time','type','resolution','license','sort'])if(f[key]!=null)state.universal[key]=f[key];
      state.analysis.queries=item.query?[item.query]:[];
      setUniversalMode(state.universal.mode);
      const controls={platform:els.universalPlatform,country:els.universalCountry,language:els.universalLanguage,time:els.universalTime,type:els.universalType,resolution:els.universalResolution,license:els.universalLicense,sort:els.universalSort};
      Object.entries(controls).forEach(([key,el])=>{if(el&&state.universal[key]!=null)el.value=state.universal[key]});
      els.researchPanel.classList.remove('hidden');renderAnalysis();renderMarketplaces();toast('已恢复全网搜索','搜索模式、关键词、筛选与排序已恢复。','ok');return}
    state.preset=item.preset||'product';state.selected=[...(item.engines||presets.find(p=>p.id===state.preset)?.engines||[])];
    if(item.thumb){const d=await probe(item.thumb);state.source={kind:'project',name:item.label||'历史图片',publicUrl:null,size:0,format:'JPEG',...d};state.originalUrl=item.thumb;state.processedUrl=null;state.useProcessed=false;clearAnalysis();if(item.query)state.analysis.queries=[item.query];syncWorkbench()}
    renderPresets();renderEngines();renderAnalysis();if(item.query)els.researchPanel.classList.remove('hidden');toast('已恢复历史任务','使用缩略图和原任务设置继续搜索。','ok')
  }

  async function addBatch(files){for(const file of [...files].slice(0,MAX_BATCH-state.batch.length)){if(!file.type.startsWith('image/')||file.size>MAX_FILE)continue;try{const url=await fileData(file),d=await probe(url),thumb=await makeThumb(url);state.batch.push({id:uid(),file,url,thumb,name:file.name,size:file.size,preset:state.batchPreset||state.settings.defaultPreset||'product',status:'ready',...d})}catch{}}renderBatch()}
  function renderBatch(){
    if(!state.batch.length){els.batchList.innerHTML='<div class="batch-empty">队列为空。拖入图片后会在这里显示。</div>';return}
    els.batchList.innerHTML=state.batch.map(x=>`<article class="batch-row ${x.links?.length?'has-links':''}" data-batch-row="${x.id}"><img src="${x.thumb}" alt=""><div class="batch-name"><b>${escapeHtml(x.name)}</b><small>${x.width}×${x.height} · ${formatBytes(x.size)}</small></div><select data-batch-preset="${x.id}">${presets.map(p=>`<option value="${p.id}" ${x.preset===p.id?'selected':''}>${p.title}</option>`).join('')}</select><span class="batch-status ${x.status}">${x.status==='done'?'已准备':x.status==='running'?'准备中':x.status==='error'?'准备失败':'待准备'}</span><button class="secondary-btn compact" data-run-batch="${x.id}">${icon('play')}${x.links?.length?'重新准备':'准备结果'}</button><button class="icon-btn danger" data-del-batch="${x.id}">${icon('trash')}</button>${x.links?.length?`<div class="batch-links">${x.links.map(l=>`<button type="button" data-open-batch-engine="${escapeHtml(l.id)}" data-batch-id="${x.id}" title="${escapeHtml(l.name)}">${l.iconUrl?`<img src="${escapeHtml('/api/image-proxy?url='+encodeURIComponent(l.iconUrl))}" alt="" referrerpolicy="no-referrer">`:icon('search')}<span>${escapeHtml(l.name)}</span></button>`).join('')}</div>`:''}</article>`).join('')
  }
  function batchEngines(item){const p=presets.find(x=>x.id===item.preset)||presets[0];return allEngines().filter(e=>p.engines.includes(e.id))}
  async function createBatchPublicUrl(item){
    if(!state.settings.tempEndpoint)return null;
    const ep=state.settings.tempEndpoint.replace(/\/$/,'');
    try{
      if(window.SOUTU_CONFIG?.tempUploadProvider==='vercel'&&ep===location.origin){
        const tr=await fetch(`${ep}/api/temp-token?ttl=${state.settings.ttl}&size=${item.file.size}&contentType=${encodeURIComponent(item.file.type||'image/png')}`,{method:'POST'});
        const td=await tr.json();if(!tr.ok||!td.uploadUrl||!td.url)throw new Error(td.error||'临时链接创建失败');
        const ur=await fetch(td.uploadUrl,{method:'PUT',headers:{'content-type':item.file.type||'image/png'},body:item.file});if(!ur.ok)throw new Error(`上传失败 (${ur.status})`);
        return td.url;
      }
      const r=await fetch(`${ep}/api/upload?ttl=${state.settings.ttl}`,{method:'POST',headers:{'content-type':item.file.type||'image/png'},body:item.file});
      const data=await r.json();if(!r.ok||!data.url)throw new Error(data.error||'临时链接创建失败');return data.url
    }catch(e){throw new Error(e?.message||'临时图片服务不可用')}
  }
  async function runBatchItem(item){
    item.status='running';item.links=[];renderBatch();
    const engines=batchEngines(item);
    item.links=engines.map(e=>({id:e.id,name:e.name,direct:typeof e.direct==='function',iconUrl:e.iconUrl||''}));
    item.status='done';renderBatch()
  }
  async function openBatchEngine(item,engineId,button){
    const engine=allEngines().find(e=>e.id===engineId);if(!item||!engine)return;
    const popup=prepareSearchPopup(engine.name);
    if(!popup){toast('浏览器拦截了搜索窗口','请允许本站打开新窗口后重试。','error');return}
    const old=button?.innerHTML;if(button){button.disabled=true;button.classList.add('busy')}
    try{
      let target=engine.uploadPage;
      if(engine.direct){const publicUrl=await createBatchPublicUrl(item);if(!publicUrl)throw new Error('临时图片服务不可用');target=engineTarget(engine,publicUrl)}
      else throw new Error('该引擎暂不支持批量一键直连');
      if(popup&&!popup.closed)popup.location.replace(target);else throw new Error('搜索窗口已被浏览器关闭，请重试。')
    }catch(e){if(popup&&!popup.closed)popup.close();toast('批量搜索打开失败',e?.message||'请重试。','error')}
    finally{if(button){button.disabled=false;button.classList.remove('busy');button.innerHTML=old}}
  }
  async function runBatch(){
    if(!state.batch.length)return toast('批量队列为空','先加入需要搜索的图片。','error');
    for(const item of state.batch){await runBatchItem(item)}
    toast('批量结果已准备','点击每个引擎时会实时生成新的临时图片链接，避免过期。','ok')
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
    els.removeBtn.onclick=removeSource;els.cropBtn.onclick=()=>{state.cropMode=!state.cropMode;if(!state.cropMode)state.cropRect=null;syncCropUi();if(state.cropMode)requestAnimationFrame(()=>els.imageStage.scrollIntoView({behavior:reduced()?'auto':'smooth',block:'center'}))};els.rotateBtn.onclick=()=>transform('rotate');els.flipBtn.onclick=()=>transform('flip');els.applyCrop.onclick=()=>transform('crop');els.cropReset.onclick=()=>{state.cropRect=null;syncCropUi()};els.copyBtn.onclick=copyImage;els.downloadBtn.onclick=downloadImage;$$('[data-process]').forEach(b=>b.onclick=()=>processImage(b.dataset.process));
    let start=null;
    const cropPoint=e=>{const b=els.imageStage.getBoundingClientRect();if(!b.width||!b.height)return null;return{x:Math.max(0,Math.min(1,(e.clientX-b.left)/b.width)),y:Math.max(0,Math.min(1,(e.clientY-b.top)/b.height))}};
    const updateCrop=e=>{if(!state.cropMode||!start)return;const p=cropPoint(e);if(!p)return;state.cropRect={x:Math.min(start.x,p.x),y:Math.min(start.y,p.y),w:Math.abs(start.x-p.x),h:Math.abs(start.y-p.y)};syncCropUi()};
    els.imageStage.addEventListener('pointerdown',e=>{if(!state.cropMode)return;start=cropPoint(e);if(!start)return;state.cropRect={x:start.x,y:start.y,w:0,h:0};try{els.imageStage.setPointerCapture(e.pointerId)}catch{}syncCropUi()});
    els.imageStage.addEventListener('pointermove',updateCrop);
    els.imageStage.addEventListener('pointerup',e=>{if(start)updateCrop(e);start=null;try{els.imageStage.releasePointerCapture(e.pointerId)}catch{}});
    els.imageStage.addEventListener('pointercancel',()=>{start=null});
    els.analyzeBtn.onclick=analyzeImage;els.reanalyzeBtn.onclick=analyzeImage;els.saveProjectBtn.onclick=saveProject;if(els.batchObjectsBtn)els.batchObjectsBtn.onclick=addDetectedObjectsToBatch;if(els.engineHealthBtn)els.engineHealthBtn.onclick=()=>checkEngineHealth();els.tempLinkBtn.onclick=async()=>{state.tempUnavailableReason='';const remote=state.source?.kind==='url'&&!state.useProcessed;if(remote&&!state.forceTempLink){state.forceTempLink=true;const ok=await createTempLink({silent:false});if(!ok){state.forceTempLink=false;syncTempCard();renderEngines()}return}if(remote&&state.forceTempLink&&isTempValid()){state.forceTempLink=false;await deleteTempLink();syncWorkbench();toast('已恢复原图片链接','后续搜索将直接使用原始 URL。','ok');return}createTempLink({silent:false})};els.recommendationOutput.onclick=e=>{const b=e.target.closest('[data-accept-recommend]');if(b)choosePreset(b.dataset.acceptRecommend)};
    els.addQueryBtn.onclick=()=>{state.analysis.queries.push('');renderQueries();setTimeout(()=>$('[data-query-index]').at(-1)?.focus(),0)};els.queryList.addEventListener('input',e=>{if(e.target.matches('[data-query-index]')){state.analysis.queries[Number(e.target.dataset.queryIndex)]=e.target.value;renderMarketplaces()}});
    els.keywordExpansion?.addEventListener('click',e=>{const b=e.target.closest('[data-universal-query]');if(!b)return;const q=state.universal.expanded[Number(b.dataset.universalQuery)];if(!q)return;state.analysis.queries=[q,...state.analysis.queries.filter(x=>x!==q)].slice(0,8);renderQueries();renderMarketplaces();toast('已设为主搜索词',q,'ok')});
    els.universalInsights?.addEventListener('click',e=>{const ib=e.target.closest('[data-identity-group-key]');if(ib){const key=ib.dataset.identityGroupKey;state.universal.identityGroupFocus=state.universal.identityGroupFocus===key?null:key;renderUniversalResults(state.universal.rawResults,state.universal.providers||[]);return}const pb=e.target.closest('[data-provenance-family]');if(pb){const key=pb.dataset.provenanceFamily;state.universal.provenanceFamilyFocus=state.universal.provenanceFamilyFocus===key?null:key;renderUniversalResults(state.universal.rawResults,state.universal.providers||[]);return}const vb=e.target.closest('[data-visual-cluster-key]');if(vb){const key=vb.dataset.visualClusterKey;state.universal.visualClusterFocus=state.universal.visualClusterFocus===key?null:key;renderUniversalResults(state.universal.rawResults,state.universal.providers||[]);return}const b=e.target.closest('[data-cluster-key]');if(!b)return;const key=b.dataset.clusterKey;state.universal.clusterFocus=state.universal.clusterFocus===key?null:key;renderUniversalResults(state.universal.rawResults,state.universal.providers||[])});
    els.productResults?.addEventListener('click',e=>{const sel=e.target.closest('[data-universal-select]');if(sel){toggleUniversalSelect(sel.dataset.universalSelect);return}const b=e.target.closest('[data-copy-result]');if(b){navigator.clipboard?.writeText(b.dataset.copyResult||'').then(()=>toast('链接已复制','','ok')).catch(()=>toast('复制失败','','error'));return}const f=e.target.closest('[data-favorite-result]');if(f){const link=f.dataset.favoriteResult||'',r=state.universal.results.find(x=>(x.link||x.url||'')===link);if(!link||!r)return;const exists=state.universalFavorites.some(x=>x.link===link);state.universalFavorites=exists?state.universalFavorites.filter(x=>x.link!==link):[{link,title:r.title||'',thumbnail:r.thumbnail||'',provider:r.provider||r.source||'',type:r.type||'',savedAt:Date.now()},...state.universalFavorites].slice(0,100);writeJson(KEYS.universalFavorites,state.universalFavorites);renderUniversalResults(state.universal.rawResults,state.universal.providers||[]);toast(exists?'已取消收藏':'已收藏结果',r.title||'','ok')}});els.queryList.addEventListener('click',e=>{const r=e.target.closest('[data-remove-query]');if(r){state.analysis.queries.splice(Number(r.dataset.removeQuery),1);renderAnalysis()}const f=e.target.closest('[data-fav-query]');if(f){const q=state.analysis.queries[Number(f.dataset.favQuery)]?.trim();if(q){state.favorites=state.favorites.includes(q)?state.favorites.filter(x=>x!==q):[q,...state.favorites].slice(0,30);writeJson(KEYS.favorites,state.favorites);renderQueries()}}});
    els.objectsOutput.onclick=e=>{const b=e.target.closest('[data-object-index]');if(!b)return;const o=state.analysis.objects[Number(b.dataset.objectIndex)];if(!o||!state.source)return;const [x,y,w,h]=o.bbox;state.cropMode=true;state.cropRect={x:x/state.source.width,y:y/state.source.height,w:w/state.source.width,h:h/state.source.height};syncCropUi();els.imageStage.scrollIntoView({behavior:reduced()?'auto':'smooth',block:'center'});toast('已选择主体区域',`${o.label} · 可直接应用裁剪。`,'ok')};
els.federatedSearchBtn.onclick=federatedProductSearch;if(els.supplierSearchBtn)els.supplierSearchBtn.onclick=federatedSupplierSearch;if(els.mediaSearchBtn)els.mediaSearchBtn.onclick=federatedMediaSearch;
    if(els.universalSearchBtn)els.universalSearchBtn.onclick=universalSearch;if(els.expandKeywordsBtn)els.expandKeywordsBtn.onclick=()=>{state.universal.expanded=[];expandUniversalKeywords();renderKeywordExpansion();toast('关键词已扩展','已生成中英文、用途与任务关键词。','ok')};if(els.batchOpenSourcesBtn)els.batchOpenSourcesBtn.onclick=batchOpenUniversalSources;
    if(els.universalClusterBtn)els.universalClusterBtn.onclick=()=>{state.universal.grouped=!state.universal.grouped;state.universal.visualGrouped=false;state.universal.provenanceActive=false;state.universal.identityGrouped=false;state.universal.timeline=false;if(!state.universal.grouped)state.universal.clusterFocus=null;state.universal.visualClusterFocus=null;state.universal.provenanceFamilyFocus=null;renderUniversalResults(state.universal.rawResults,state.universal.providers||[]);els.universalClusterBtn.classList.toggle('active',state.universal.grouped);els.universalVisualClusterBtn?.classList.remove('active');els.universalProvenanceBtn?.classList.remove('active');els.universalIdentityGroupBtn?.classList.remove('active')};
    if(els.universalVisualClusterBtn)els.universalVisualClusterBtn.onclick=async()=>{if(state.universal.visualGrouped){state.universal.visualGrouped=false;state.universal.visualClusterFocus=null;renderUniversalResults(state.universal.rawResults,state.universal.providers||[]);els.universalVisualClusterBtn.classList.remove('active');return}state.universal.provenanceActive=false;state.universal.identityGrouped=false;els.universalProvenanceBtn?.classList.remove('active');els.universalIdentityGroupBtn?.classList.remove('active');els.universalIdentityGroupBtn?.classList.remove('active');try{await buildUniversalVisualGroups()}catch(e){toast('视觉归组失败',e?.message||'无法计算图片指纹','error')}};
    if(els.universalProvenanceBtn)els.universalProvenanceBtn.onclick=async()=>{state.universal.identityGrouped=false;els.universalIdentityGroupBtn?.classList.remove('active');if(state.universal.provenanceActive){state.universal.provenanceActive=false;state.universal.provenanceFamilyFocus=null;renderUniversalResults(state.universal.rawResults,state.universal.providers||[]);els.universalProvenanceBtn.classList.remove('active');return}try{await buildUniversalProvenance()}catch(e){toast('溯源分析失败',e?.message||'无法建立来源候选','error')}};
    if(els.universalIdentityGroupBtn)els.universalIdentityGroupBtn.onclick=()=>{if(state.universal.identityGrouped){state.universal.identityGrouped=false;state.universal.identityGroupFocus=null;renderUniversalResults(state.universal.rawResults,state.universal.providers||[]);els.universalIdentityGroupBtn.classList.remove('active');return}buildUniversalIdentityGroups();els.universalIdentityGroupBtn.classList.toggle('active',state.universal.identityGrouped);els.universalClusterBtn?.classList.remove('active');els.universalVisualClusterBtn?.classList.remove('active');els.universalProvenanceBtn?.classList.remove('active');els.universalIdentityGroupBtn?.classList.remove('active');els.universalTimelineBtn?.classList.remove('active')};
    if(els.universalTimelineBtn)els.universalTimelineBtn.onclick=()=>{state.universal.timeline=!state.universal.timeline;state.universal.grouped=false;state.universal.visualGrouped=false;state.universal.provenanceActive=false;state.universal.identityGrouped=false;state.universal.visualClusterFocus=null;state.universal.provenanceFamilyFocus=null;renderUniversalInsights(state.universal.results);els.universalTimelineBtn.classList.toggle('active',state.universal.timeline);els.universalClusterBtn?.classList.remove('active');els.universalVisualClusterBtn?.classList.remove('active');els.universalProvenanceBtn?.classList.remove('active');els.universalIdentityGroupBtn?.classList.remove('active')};
    if(els.universalSelectAllBtn)els.universalSelectAllBtn.onclick=()=>{const all=state.universal.results.map(x=>x.link||x.url||x.title);const every=all.length&&all.every(k=>state.universal.selected.has(k));state.universal.selected=every?new Set():new Set(all);renderUniversalResults(state.universal.rawResults,state.universal.providers||[])};
    if(els.universalSaveSelectedBtn)els.universalSaveSelectedBtn.onclick=()=>saveUniversalItems(selectedUniversalResults().length?selectedUniversalResults():state.universal.results);
    if(els.universalExportBtn)els.universalExportBtn.onclick=exportUniversalCsv;if(els.universalExportJsonBtn)els.universalExportJsonBtn.onclick=exportUniversalJson;
    if(els.universalResearchBtn)els.universalResearchBtn.onclick=sendUniversalToResearch;
    if(els.universalSort)els.universalSort.onchange=()=>{state.universal.sort=els.universalSort.value;renderUniversalResults(state.universal.rawResults,state.universal.providers||[])};
    if(els.universalModes)els.universalModes.onclick=e=>{const b=e.target.closest('[data-universal-mode]');if(b)setUniversalMode(b.dataset.universalMode)};
    [[els.universalPlatform,'platform'],[els.universalCountry,'country'],[els.universalLanguage,'language'],[els.universalTime,'time'],[els.universalType,'type'],[els.universalResolution,'resolution'],[els.universalLicense,'license']].forEach(([el,key])=>{if(el)el.onchange=()=>{state.universal[key]=el.value;state.universal.expanded=[];expandUniversalKeywords();renderMarketplaces();if(state.universal.results.length)renderUniversalResults(state.universal.rawResults,state.universal.providers||[])}});
    els.presetGrid.onclick=e=>{const b=e.target.closest('[data-preset]');if(b)choosePreset(b.dataset.preset)};els.engineGroups.onclick=e=>{const open=e.target.closest('[data-open-engine]');if(open){prepareSingleEngine(open.dataset.openEngine);return}const groupSelect=e.target.closest('[data-group-select]'),groupClear=e.target.closest('[data-group-clear]');if(groupSelect||groupClear){const group=(groupSelect||groupClear).dataset.groupSelect||(groupSelect||groupClear).dataset.groupClear,ids=allEngines().filter(x=>x.category===group).map(x=>x.id);state.selected=groupSelect?[...new Set([...state.selected,...ids])]:state.selected.filter(x=>!ids.includes(x));renderEngines();syncSearchButton();return}const s=e.target.closest('[data-engine]');if(s){const id=s.dataset.engine;state.selected=state.selected.includes(id)?state.selected.filter(x=>x!==id):[...state.selected,id];renderEngines();syncSearchButton()}};els.runSearch.onclick=runSearch;els.privacyMode.onchange=()=>state.privacy=els.privacyMode.checked;document.querySelectorAll('[data-use]').forEach(b=>b.onclick=()=>{state.useProcessed=b.dataset.use==='processed';if(!state.useProcessed)state.forceTempLink=false;deleteTempLink();syncWorkbench()});
    els.executionList.onclick=async e=>{
      const copy=e.target.closest('[data-copy-execution]');
      if(copy){const done=await quietCopy();copy.innerHTML=done?`${icon('check')}已复制`:`${icon('info')}复制失败`;if(!done)toast('复制失败','浏览器没有授予剪贴板写入权限，可在目标页面手动选择文件。','error');return}
      const open=e.target.closest('[data-execution-open]');if(!open)return;
      await openExecutionEngine(open.closest('.execution-row'))
    };
    els.clearHistory.onclick=()=>{state.history=[];localStorage.removeItem(KEYS.history);renderHistory();toast('历史记录已清空','','ok')};els.historyContent.onclick=e=>{const d=e.target.closest('[data-del-history]');if(d){state.history=state.history.filter(x=>x.id!==d.dataset.delHistory);writeJson(KEYS.history,state.history);renderHistory()}const r=e.target.closest('[data-rerun-history]');if(r)restoreHistory(r.dataset.rerunHistory);const n=e.target.closest('[data-nav]');if(n)setView(n.dataset.nav)};
    els.projectsContent.onclick=e=>{const o=e.target.closest('[data-open-project]');if(o)restoreProject(o.dataset.openProject);const d=e.target.closest('[data-del-project]');if(d){state.projects=state.projects.filter(x=>x.id!==d.dataset.delProject);writeJson(KEYS.projects,state.projects);renderProjects()}const u=e.target.closest('[data-use-fav]');if(u){const q=state.favorites[Number(u.dataset.useFav)];if(q){setView('search');state.analysis.queries=[q];els.researchPanel.classList.remove('hidden');renderAnalysis();toast('收藏搜索词已载入',q,'ok')}}const f=e.target.closest('[data-del-fav]');if(f){state.favorites.splice(Number(f.dataset.delFav),1);writeJson(KEYS.favorites,state.favorites);renderProjects()}const rf=e.target.closest('[data-del-result-fav]');if(rf){state.universalFavorites.splice(Number(rf.dataset.delResultFav),1);writeJson(KEYS.universalFavorites,state.universalFavorites);renderProjects()}};els.clearProjects.onclick=()=>{state.projects=[];writeJson(KEYS.projects,[]);renderProjects()};
    els.batchChoose.onclick=()=>els.batchInput.click();els.batchInput.onchange=()=>addBatch(els.batchInput.files);['dragenter','dragover'].forEach(ev=>els.batchDrop.addEventListener(ev,e=>{e.preventDefault();els.batchDrop.classList.add('drag')}));['dragleave','drop'].forEach(ev=>els.batchDrop.addEventListener(ev,e=>{e.preventDefault();els.batchDrop.classList.remove('drag')}));els.batchDrop.addEventListener('drop',e=>addBatch(e.dataTransfer.files));els.applyBatchPreset.onclick=()=>{state.batch.forEach(x=>x.preset=els.batchPreset.value);renderBatch()};els.runBatch.onclick=runBatch;els.batchExport.onclick=exportBatchCsv;els.batchList.onclick=e=>{const r=e.target.closest('[data-run-batch]');if(r){const item=state.batch.find(x=>x.id===r.dataset.runBatch);if(item)runBatchItem(item);return}const o=e.target.closest('[data-open-batch-engine]');if(o){const item=state.batch.find(x=>x.id===o.dataset.batchId);if(item)openBatchEngine(item,o.dataset.openBatchEngine,o);return}const d=e.target.closest('[data-del-batch]');if(d){state.batch=state.batch.filter(x=>x.id!==d.dataset.delBatch);renderBatch()}};els.batchList.onchange=e=>{if(e.target.matches('[data-batch-preset]')){const item=state.batch.find(x=>x.id===e.target.dataset.batchPreset);if(item)item.preset=e.target.value}};
    els.settingsBtn.onclick=()=>{renderSystemStatus();openModal('settingsModal');if(navigator.onLine&&Date.now()-(state.engineHealthCheckedAt||0)>12*60*60*1000)checkEngineHealth({silent:true})};if(els.refreshDiagnosticsBtn)els.refreshDiagnosticsBtn.onclick=()=>{renderSystemStatus();toast('诊断信息已刷新','','ok')};if(els.resetClientCacheBtn)els.resetClientCacheBtn.onclick=resetClientCache;
    if(els.versionBadge)els.versionBadge.onclick=()=>{renderSystemStatus();openModal('settingsModal')};els.customBtn.onclick=()=>openModal('customModal');els.commandBtn.onclick=()=>openModal('commandModal');els.shortcutHelp.onclick=()=>openModal('shortcutModal');$$('[data-close]').forEach(b=>b.onclick=()=>closeModal(b.dataset.close));$$('.modal-backdrop').forEach(m=>m.addEventListener('mousedown',e=>{if(e.target===m)closeModal(m.id)}));
    els.defaultPreset.onchange=()=>{saveSettings();choosePreset(els.defaultPreset.value,false)};els.tempEndpointInput.onchange=saveSettings;els.productEndpointInput.onchange=saveSettings;els.ttlSelect.onchange=saveSettings;if(els.autoPresetToggle)els.autoPresetToggle.onchange=saveSettings;
    els.addCustom.onclick=()=>{const name=els.customName.value.trim(),template=els.customTemplate.value.trim();if(!name||!template.includes('{imageUrl}'))return toast('模板必须包含 {imageUrl}','例如：https://example.com/search?url={imageUrl}','error');let parsed;try{parsed=new URL(template.replace('{imageUrl}',encodeURIComponent('https://example.com/image.jpg')))}catch{return toast('模板 URL 无效','请输入完整的 https:// 搜索地址。','error')}if(!['http:','https:'].includes(parsed.protocol))return toast('不支持该 URL 协议','自定义引擎仅允许 HTTP / HTTPS。','error');state.custom.push({id:`custom-${Date.now()}`,name,short:name.slice(0,2).toUpperCase(),category:'自定义',desc:'你添加的 URL 搜索引擎',uploadPage:template.replace('{imageUrl}',''),template});writeJson(KEYS.custom,state.custom);renderEngines();closeModal('customModal');els.customName.value='';els.customTemplate.value='';toast('自定义引擎已添加','','ok')};
    els.themeBtn.onclick=()=>applyTheme(document.documentElement.dataset.theme!=='dark');els.commandInput.oninput=()=>renderCommands(els.commandInput.value);els.commandList.onclick=e=>{const b=e.target.closest('[data-command-index]');if(!b)return;const c=commands()[Number(b.dataset.commandIndex)];closeModal('commandModal');c?.run()};
    els.installBtn.onclick=async()=>{if(!state.installPrompt)return;state.installPrompt.prompt();await state.installPrompt.userChoice;state.installPrompt=null;els.installBtn.hidden=true};window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();state.installPrompt=e;els.installBtn.hidden=false});
    window.addEventListener('keydown',e=>{const input=e.target.matches?.('input,textarea,select,[contenteditable=true]');if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openModal('commandModal');return}if(e.key==='Escape'){$$('.modal-backdrop:not(.hidden)').forEach(m=>closeModal(m.id));if(state.cropMode){state.cropMode=false;state.cropRect=null;syncCropUi()}return}if(input)return;const num=Number(e.key);if(num>=1&&num<=6){choosePreset(presets[num-1].id);return}if(e.key.toLowerCase()==='c'&&state.source){state.cropMode=!state.cropMode;syncCropUi();return}if(e.key.toLowerCase()==='r'&&state.source){transform('rotate');return}if(e.key.toLowerCase()==='a'&&state.source){analyzeImage();return}if(e.key.toLowerCase()==='u'){setView('search');els.fileInput.click();return}if(e.key.toLowerCase()==='p'){setView('projects');return}if(e.key.toLowerCase()==='h'){setView('history');return}if(e.key.toLowerCase()==='b'){setView('batch');return}if(e.key==='Enter'&&state.source)runSearch()});
  }

  async function initFromUrl(){const qs=new URLSearchParams(location.search),image=qs.get('image'),preset=qs.get('preset'),mode=qs.get('mode');if(preset&&presets.some(p=>p.id===preset))choosePreset(preset,false);if(image){els.urlInput.value=image;await acceptUrl(image);if(mode==='supplier'){await analyzeImage();await federatedSupplierSearch()}}}
  function guardVersionMismatch(){
    const docVersion=document.querySelector('meta[name="soutu-version"]')?.content||'';
    if(!docVersion||docVersion===APP_VERSION)return false;
    const key='soutu-version-recovery';
    if(sessionStorage.getItem(key)===docVersion)return false;
    sessionStorage.setItem(key,docVersion);
    Promise.all([
      'caches'in window?caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('soutu-pro-')).map(k=>caches.delete(k)))):Promise.resolve(),
      'serviceWorker'in navigator?navigator.serviceWorker.getRegistrations().then(rs=>Promise.all(rs.map(r=>r.update().catch(()=>{})))):Promise.resolve()
    ]).finally(()=>location.replace(location.pathname+`?refresh=${Date.now()}`+location.hash));
    return true
  }
  function approxLocalStorageBytes(){
    try{let n=0;for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i)||'',v=localStorage.getItem(k)||'';n+=(k.length+v.length)*2}return n}catch{return 0}
  }
  function renderSystemStatus(){
    if(!els.systemStatusGrid)return;
    const docVersion=document.querySelector('meta[name="soutu-version"]')?.content||'未知';
    const versionOk=docVersion===APP_VERSION;
    const swSupported='serviceWorker'in navigator,swControlled=!!navigator.serviceWorker?.controller;
    const ep=(state.settings.tempEndpoint||'').trim();
    const direct=directSourceUrl()?'原图公网 URL':isTempValid()?'短时链接就绪':ep?(state.tempUnavailableReason||'服务已配置'):'未配置';
    const health=Object.values(state.engineHealth||{}),ok=health.filter(x=>x.state==='ok').length,degraded=health.filter(x=>x.state==='degraded').length,down=health.filter(x=>x.state==='down').length;
    const healthAge=state.engineHealthCheckedAt?Date.now()-state.engineHealthCheckedAt:Infinity,healthStale=healthAge>12*60*60*1000;
    const healthText=state.engineHealthCheckedAt?`${healthStale?'已过期 · ':''}正常 ${ok} · 受限 ${degraded} · 异常 ${down}`:'尚未检测';
    const providers=state.providerHealth||[],providerOk=providers.filter(x=>x.enabled).length,providerMissing=providers.filter(x=>!x.enabled&&!x.configured).length,providerFail=providers.filter(x=>!x.enabled&&x.configured).length;
    const providerText=state.providerHealthCheckedAt?`可用 ${providerOk} · 缺 Key ${providerMissing} · 异常 ${providerFail}`:'尚无搜索记录';
    const storage=approxLocalStorageBytes();
    const items=[
      {label:'前端版本',value:`v${APP_VERSION}`,tone:versionOk?'ok':'bad'},
      {label:'页面资源版本',value:docVersion==='未知'?'未知':`v${docVersion}`,tone:versionOk?'ok':'bad'},
      {label:'Service Worker',value:!swSupported?'不支持':swControlled?'已接管':'未接管',tone:swControlled?'ok':swSupported?'warn':'bad'},
      {label:'图片直连',value:direct,tone:directSourceUrl()||isTempValid()?'ok':ep?'warn':'bad'},
      {label:'搜索引擎',value:healthText,tone:!state.engineHealthCheckedAt||healthStale?'warn':down?'bad':degraded?'warn':'ok'},
      {label:'API Providers',value:providerText,tone:!state.providerHealthCheckedAt?'warn':providerFail?'bad':providerMissing?'warn':'ok'},
      {label:'网络状态',value:navigator.onLine?'在线':'离线',tone:navigator.onLine?'ok':'bad'},
      {label:'剪贴板图片',value:navigator.clipboard&&window.ClipboardItem?'支持':'受限',tone:navigator.clipboard&&window.ClipboardItem?'ok':'warn'},
      {label:'安全上下文',value:window.isSecureContext?'HTTPS / 安全':'非安全上下文',tone:window.isSecureContext?'ok':'warn'},
      {label:'本机数据',value:storage?formatBytes(storage):'0 B',tone:storage<4*1024*1024?'ok':'warn'}
    ];
    els.systemStatusGrid.innerHTML=items.map(x=>`<div class="system-status-item ${x.tone}"><span><i></i>${escapeHtml(x.label)}</span><b title="${escapeHtml(x.value)}">${escapeHtml(x.value)}</b></div>`).join('');
    if(els.providerHealthDetail){
      els.providerHealthDetail.innerHTML=providers.length?`<div class="provider-health-title"><b>Universal API Providers</b><span>最近一次搜索状态</span></div><div class="provider-health-pills">${providers.map(p=>{const tone=p.enabled?'ok':p.configured?'bad':'warn',label=p.enabled?`${p.count||0} 条`:p.configured?'异常':'缺 Key';return `<span class="${tone}" title="${escapeHtml(p.message||'')}"><i></i><b>${escapeHtml(p.name)}</b><small>${escapeHtml(label)}</small></span>`}).join('')}</div>`:'<div class="provider-health-empty">执行一次 Universal Search 后，这里会记录各 API Provider 的真实状态。</div>';
    }
    const checked=state.engineHealthCheckedAt?new Date(state.engineHealthCheckedAt).toLocaleString():'未执行';
    const providerChecked=state.providerHealthCheckedAt?new Date(state.providerHealthCheckedAt).toLocaleString():'暂无';
    els.systemStatusNote.textContent=`引擎检测：${checked} · API 状态：${providerChecked} · 清理缓存不会删除项目、历史或收藏。`
  }
  async function resetClientCache(){
    if(els.resetClientCacheBtn){els.resetClientCacheBtn.disabled=true;els.resetClientCacheBtn.textContent='正在清理…'}
    try{
      if('caches'in window){const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('soutu-pro-')).map(k=>caches.delete(k)))}
      if('serviceWorker'in navigator){const regs=await navigator.serviceWorker.getRegistrations();await Promise.all(regs.map(r=>r.unregister().catch(()=>false)))}
      sessionStorage.removeItem('soutu-version-recovery');
      location.replace(location.pathname+`?refresh=${Date.now()}`+location.hash)
    }catch(e){
      if(els.resetClientCacheBtn){els.resetClientCacheBtn.disabled=false;els.resetClientCacheBtn.innerHTML=`${icon('rotate')}清理缓存并重载`}
      toast('缓存清理失败',e?.message||'请手动执行强制刷新。','error')
    }
  }
  function initPwa(){
    if(els.versionBadge)els.versionBadge.textContent=`v${APP_VERSION}`;
    if(!('serviceWorker'in navigator))return;
    let reloading=false;
    navigator.serviceWorker.addEventListener('controllerchange',()=>{if(reloading)return;reloading=true;location.reload()});
    navigator.serviceWorker.register('./sw.js').then(reg=>{
      const showUpdate=()=>{if(reg.waiting&&els.updateBtn){els.updateBtn.hidden=false;els.updateBtn.onclick=()=>{els.updateBtn.disabled=true;els.updateBtn.textContent='正在更新…';reg.waiting?.postMessage({type:'SKIP_WAITING'})}}};
      showUpdate();
      reg.addEventListener('updatefound',()=>{const w=reg.installing;if(!w)return;w.addEventListener('statechange',()=>{if(w.state==='installed'&&navigator.serviceWorker.controller)showUpdate()})});
      reg.update().catch(()=>{});
    }).catch(()=>{})
  }
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
  function init(){if(guardVersionMismatch())return;applyTheme(localStorage.getItem('soutu-theme')==='dark',true);initSettings();if(state.engineHealthCheckedAt&&els.engineHealthSummary){const vals=Object.values(state.engineHealth||{}),ok=vals.filter(x=>x.state==='ok').length,degraded=vals.filter(x=>x.state==='degraded').length,down=vals.filter(x=>x.state==='down').length;els.engineHealthSummary.textContent=`${Date.now()-state.engineHealthCheckedAt>12*60*60*1000?'状态已过期 · ':''}正常 ${ok} · 受限 ${degraded} · 异常 ${down}`}renderPresets();renderEngines();renderAnalysis();renderMarketplaces();renderHistory();renderProjects();renderBatch();syncSearchButton();syncTempCard();bind();initPwa();initFromUrl();}
  init();
})();