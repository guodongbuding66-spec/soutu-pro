(() => {
  'use strict';

  const MODULE_ID='soutu-provenance-lineage';
  const BUTTON_ID='universalLineageBtn';
  const PANEL_ID='universalLineagePanel';
  const STYLE_ID='soutu-provenance-lineage-style';
  const HANDOFF_MODAL_ID='lineageHandoffModal';
  const HANDOFF_SESSION='soutu-pro-lineage-handoff-v1';
  const V9_KEYS={
    results:'soutu-pro-v9-results',
    cases:'soutu-pro-v9-cases',
    evidence:'soutu-pro-v9-evidence',
    weights:'soutu-pro-v9-weights',
    view:'soutu-pro-v9-view'
  };
  let lastFamilies=[];
  let reportObserver=null;
  let enhancingReport=false;

  const esc=(v='')=>String(v).replace(/[&<>'\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]));
  const clean=v=>String(v||'').replace(/\s+/g,' ').trim();
  const parseDate=v=>{const t=Date.parse(v||'');return Number.isFinite(t)?t:0};
  const toast=(title,desc='',tone='ok')=>window.SOUTU_BRIDGE?.toast?.(title,desc,tone);
  const uid=()=>crypto.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const readJson=(key,fallback)=>{try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback}catch{return fallback}};
  const writeJson=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}};

  function injectStyle(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');style.id=STYLE_ID;style.textContent=`
      .universal-lineage-panel{margin-top:12px;padding:14px;border:1px solid var(--line);border-radius:16px;background:var(--panel);box-shadow:var(--shadow-xs)}
      .lineage-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px}.lineage-head b{font-size:12px}.lineage-head span{display:block;margin-top:3px;font-size:9px;color:var(--muted);line-height:1.45}.lineage-head-actions{display:flex;align-items:center;gap:6px;flex-wrap:wrap;justify-content:flex-end}.lineage-head-actions button{min-height:30px;height:30px;padding:0 9px;border:1px solid var(--line);border-radius:8px;background:var(--panel);font-size:9px;font-weight:750;color:var(--text-2)}.lineage-head-actions button:hover{background:var(--panel-strong)}.lineage-head-actions [data-lineage-handoff]{border-color:color-mix(in srgb,var(--primary) 38%,var(--line));background:var(--primary-soft);color:var(--primary)}
      .lineage-summary{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}.lineage-summary span{display:inline-flex;align-items:center;gap:4px;padding:5px 7px;border:1px solid var(--line);border-radius:999px;background:var(--panel-subtle);font-size:9px;color:var(--muted)}.lineage-summary b{font-size:10px;color:var(--text)}
      .lineage-families{display:grid;gap:12px}.lineage-family{border:1px solid var(--line);border-radius:14px;padding:12px;background:var(--panel-subtle)}.lineage-family-title{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}.lineage-family-title b{font-size:11px}.lineage-family-title span{font-size:9px;color:var(--muted)}
      .lineage-root,.lineage-node{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;border:1px solid var(--line);border-radius:11px;padding:9px 10px;background:var(--panel)}.lineage-root{border-color:color-mix(in srgb,var(--primary) 32%,var(--line));background:color-mix(in srgb,var(--primary-soft) 46%,var(--panel))}.lineage-root small,.lineage-node small{display:block;margin-top:3px;font-size:8px;color:var(--muted)}.lineage-root a,.lineage-node a{font-size:9px;font-weight:750;text-decoration:none;color:var(--primary);white-space:nowrap}.lineage-root .lineage-badge{display:inline-flex;width:max-content;padding:3px 6px;border-radius:999px;background:var(--primary-soft);color:var(--primary);font-size:8px;font-weight:800;margin-bottom:4px}
      .lineage-branches{display:grid;gap:8px;margin-top:8px;padding-left:20px;position:relative}.lineage-branches:before{content:"";position:absolute;left:7px;top:0;bottom:13px;width:1px;background:var(--line-strong)}.lineage-edge{position:relative}.lineage-edge:before{content:"";position:absolute;left:-13px;top:19px;width:13px;height:1px;background:var(--line-strong)}.lineage-edge-meta{display:flex;flex-wrap:wrap;gap:5px;margin:0 0 5px 4px}.lineage-edge-meta span{font-size:8px;padding:3px 6px;border-radius:999px;border:1px solid var(--line);background:var(--panel);color:var(--muted)}.lineage-edge-meta .supported{color:var(--success);border-color:color-mix(in srgb,var(--success) 32%,var(--line));background:var(--success-soft)}.lineage-edge-meta .conflict{color:var(--danger);border-color:color-mix(in srgb,var(--danger) 32%,var(--line));background:var(--danger-soft)}.lineage-edge-meta .uncertain{color:var(--warning);border-color:color-mix(in srgb,var(--warning) 32%,var(--line));background:var(--warning-soft)}.lineage-node em{display:block;margin-top:4px;font-size:8px;font-style:normal;color:var(--muted);line-height:1.45}.lineage-empty{font-size:10px;color:var(--muted);padding:12px;text-align:center}
      .lineage-handoff-modal{max-width:560px}.lineage-handoff-grid{display:grid;gap:12px}.lineage-handoff-grid label{display:grid;gap:6px;font-size:10px;font-weight:750;color:var(--text-2)}.lineage-handoff-grid select,.lineage-handoff-grid input{width:100%;min-height:40px;border:1px solid var(--line);border-radius:10px;background:var(--panel);color:var(--text);padding:0 10px}.lineage-handoff-summary{padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:var(--panel-subtle);font-size:10px;color:var(--muted);line-height:1.55}.lineage-handoff-summary b{color:var(--text)}
      .lineage-report-section{margin-top:24px}.lineage-report-section h2{margin:0 0 6px}.lineage-report-section>p{margin:0 0 12px;font-size:11px}.lineage-report-section table{width:100%;border-collapse:collapse}.lineage-report-section th,.lineage-report-section td{padding:6px;border:1px solid #cfd6df;vertical-align:top;font-size:9px;text-align:left}.lineage-report-section small{display:block;margin-top:3px}
      @media(max-width:620px){.lineage-head{display:grid}.lineage-head-actions{justify-content:flex-start}.lineage-root,.lineage-node{grid-template-columns:1fr}.lineage-root a,.lineage-node a{justify-self:start}.lineage-branches{padding-left:14px}.lineage-edge:before{left:-7px;width:7px}}
      @media print{.lineage-report-section{break-before:page}.lineage-report-section th,.lineage-report-section td{font-size:8pt}}
    `;document.head.appendChild(style)
  }

  function ensureHandoffModal(){
    if(document.getElementById(HANDOFF_MODAL_ID))return;
    const modal=document.createElement('div');modal.id=HANDOFF_MODAL_ID;modal.className='modal-backdrop hidden';
    modal.innerHTML=`<div class="modal lineage-handoff-modal" role="dialog" aria-modal="true" aria-labelledby="lineageHandoffTitle"><div class="modal-head"><div><h2 id="lineageHandoffTitle">送入 Investigation Hub</h2><p>保存为 V9 Evidence，并可同时关联到现有 Case 或新建 Case。</p></div><button class="icon-btn" type="button" data-lineage-handoff-close aria-label="关闭"><svg><use href="#i-x"></use></svg></button></div><div class="lineage-handoff-grid"><div class="lineage-handoff-summary" id="lineageHandoffSummary"></div><label>交接方式<select id="lineageHandoffMode"><option value="evidence">仅保存到 Evidence</option><option value="new">新建 Case 并关联</option><option value="existing">关联已有 Case</option></select></label><label id="lineageNewCaseRow" class="hidden">Case 名称<input id="lineageNewCaseName" maxlength="120" placeholder="例如：产品图片来源调查"></label><label id="lineageExistingCaseRow" class="hidden">选择 Case<select id="lineageExistingCase"></select></label><div class="v9-action-row"><button class="secondary-btn" type="button" data-lineage-handoff-close>取消</button><button class="primary-btn" type="button" data-lineage-handoff-confirm>保存并进入 Hub</button></div></div></div>`;
    document.body.appendChild(modal)
  }

  function ensureUi(){
    injectStyle();ensureHandoffModal();
    const provenance=document.getElementById('universalProvenanceBtn');
    if(provenance&&!document.getElementById(BUTTON_ID)){
      const b=document.createElement('button');b.className='secondary-btn compact';b.id=BUTTON_ID;b.type='button';b.innerHTML='<svg><use href="#i-history"></use></svg>版本链';provenance.insertAdjacentElement('afterend',b)
    }
    const insights=document.getElementById('universalInsights');
    if(insights&&!document.getElementById(PANEL_ID)){
      const p=document.createElement('div');p.id=PANEL_ID;p.className='universal-lineage-panel hidden';insights.insertAdjacentElement('afterend',p)
    }
  }

  function resultMap(){
    const map=new Map();
    document.querySelectorAll('.universal-result-card').forEach(card=>{
      const title=clean(card.querySelector('.universal-result-body>b')?.textContent);if(!title)return;
      const a=card.querySelector('.universal-media[href]');
      map.set(title,{title,url:a?.href||'',domain:(()=>{try{return new URL(a?.href||'').hostname.replace(/^www\./,'')}catch{return''}})()})
    });
    return map
  }

  function timelineMap(){
    const map=new Map();
    document.querySelectorAll('#universalInsights .provenance-timeline a').forEach(a=>{
      const title=clean(a.querySelector('b')?.textContent);if(!title)return;
      const date=clean(a.querySelector('time')?.textContent),source=clean(a.querySelector('span')?.textContent);
      map.set(title,{date,time:parseDate(date),source,url:a.href||''})
    });
    return map
  }

  function directionEvidence(rootMeta,childMeta){
    if(rootMeta?.time&&childMeta?.time){
      if(rootMeta.time<=childMeta.time)return{label:'时间支持',tone:'supported',reason:`${rootMeta.date} → ${childMeta.date}`};
      return{label:'时间冲突',tone:'conflict',reason:`子项日期 ${childMeta.date} 早于候选根节点 ${rootMeta.date}`}
    }
    return{label:'方向待验证',tone:'uncertain',reason:'至少一端缺少可验证日期'}
  }

  function collect(){
    const links=resultMap(),times=timelineMap(),families=[];
    document.querySelectorAll('#universalInsights .provenance-family-card').forEach((card,index)=>{
      const familyId=card.dataset.provenanceFamily||`family-${index}`;
      const candidateTitle=clean(card.querySelector(':scope>strong')?.textContent);
      const relations=[...card.querySelectorAll('.provenance-relation')].map(row=>({
        type:clean(row.querySelector('span')?.textContent),confidence:clean(row.querySelector('b')?.textContent),title:clean(row.querySelector('small')?.textContent),reasons:clean(row.querySelector('em')?.textContent)
      })).filter(x=>x.title);
      const root=relations.find(x=>/original candidate/i.test(x.type))||relations.find(x=>x.title===candidateTitle)||{type:'Original candidate',confidence:'',title:candidateTitle,reasons:'来源证据最高候选'};
      const rootMeta=times.get(root.title)||{};
      const variants=relations.filter(x=>x!==root&&x.title!==root.title).map(x=>{
        const meta=times.get(x.title)||{},direction=directionEvidence(rootMeta,meta),link=links.get(x.title)||{};
        return{...x,...meta,...link,direction}
      });
      const rootLink=links.get(root.title)||{},rootTimeline=times.get(root.title)||{};
      families.push({id:familyId,label:clean(card.querySelector('.provenance-family-head span')?.textContent)||`图片家族 ${index+1}`,root:{...root,...rootLink,...rootTimeline},variants})
    });
    return families
  }

  function evidencePayload(families=lastFamilies){
    const rows=families.flatMap(f=>[
      {familyId:f.id,familyLabel:f.label,role:'candidate-root',title:f.root.title||'',relationType:f.root.type||'Original candidate',relationConfidence:f.root.confidence||'',directionState:'candidate-root',directionReason:'来源证据最高候选；不代表已验证原创',date:f.root.date||'',source:f.root.source||'',domain:f.root.domain||'',url:f.root.url||'',reasons:f.root.reasons||''},
      ...f.variants.map(v=>({familyId:f.id,familyLabel:f.label,role:'variant',title:v.title||'',relationType:v.type||'Variant',relationConfidence:v.confidence||'',directionState:v.direction?.label||'方向待验证',directionReason:v.direction?.reason||'',date:v.date||'',source:v.source||'',domain:v.domain||'',url:v.url||'',reasons:v.reasons||''}))
    ]);
    return{schema:'soutu-pro.provenance-lineage.v1',generatedAt:new Date().toISOString(),disclaimer:'所有根节点与传播方向均为证据候选；时间缺失或冲突时不得视为已验证原创或确定传播顺序。',summary:{families:families.length,relations:families.reduce((n,f)=>n+f.variants.length,0),timeSupported:rows.filter(r=>r.directionState==='时间支持').length,pending:rows.filter(r=>r.directionState==='方向待验证').length,timeConflicts:rows.filter(r=>r.directionState==='时间冲突').length},families,rows}
  }

  function download(name,text,type){
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000)
  }
  function exportJson(){
    const payload=evidencePayload();if(!payload.rows.length)return toast('没有可导出的版本链','请先建立版本链。','error');
    download(`soutu-lineage-${Date.now()}.json`,JSON.stringify(payload,null,2),'application/json');toast('版本链 JSON 已导出',`${payload.summary.families} 个家族 · ${payload.summary.relations} 条关系`,'ok')
  }
  function exportCsv(){
    const payload=evidencePayload();if(!payload.rows.length)return toast('没有可导出的版本链','请先建立版本链。','error');
    const headers=['family_id','family_label','role','title','relation_type','relation_confidence','direction_state','direction_reason','date','source','domain','url','reasons'];
    const values=r=>[r.familyId,r.familyLabel,r.role,r.title,r.relationType,r.relationConfidence,r.directionState,r.directionReason,r.date,r.source,r.domain,r.url,r.reasons];
    const q=v=>`\"${String(v??'').replace(/\"/g,'\"\"')}\"`,csv=[headers,...payload.rows.map(values)].map(r=>r.map(q).join(',')).join('\n');
    download(`soutu-lineage-${Date.now()}.csv`,'\uFEFF'+csv,'text/csv;charset=utf-8');toast('版本链 CSV 已导出',`${payload.rows.length} 条证据记录`,'ok')
  }

  function lineageKey(row){return [row.familyId,row.role,row.title,row.url,row.relationType,row.directionState].map(clean).join('|')}
  function lineageEvidenceRecords(payload=evidencePayload()){
    const capturedAt=Date.now();
    return payload.rows.map(row=>({
      id:uid(),capturedAt,title:row.title||row.familyLabel||'版本链证据',url:row.url||'',domain:row.domain||'',price:'',product:{},engine:'provenance-lineage',manualLabel:'',kind:'provenance-lineage',lineageKey:lineageKey(row),
      note:[row.familyLabel,row.role==='candidate-root'?'候选根节点':row.relationType,row.relationConfidence,row.directionState,row.directionReason,row.date,row.source,row.reasons].filter(Boolean).join(' · '),
      lineage:{schema:payload.schema,disclaimer:payload.disclaimer,...row}
    }))
  }
  function mergeLineageEvidence(existing,incoming,limit=120){
    const seen=new Set(),out=[];
    for(const e of [...incoming,...existing]){
      const key=e.lineageKey||((e.kind==='provenance-lineage'||e.lineage)?lineageKey(e.lineage||{}):`evidence:${e.id||uid()}`);
      if(seen.has(key))continue;seen.add(key);out.push(e);if(out.length>=limit)break
    }
    return out
  }
  function caseSourceSnapshot(){
    const src=window.SOUTU_BRIDGE?.source?.()||{},active=String(src.activeUrl||'');
    return{name:src.name||'',thumb:active.startsWith('data:')&&active.length<120000?active:''}
  }
  function handoffToHub(options={}){
    const payload=options.payload||evidencePayload();
    if(!payload.rows.length){toast('没有可保存的版本链','请先建立版本链。','error');return{ok:false,reason:'empty'}}
    const incoming=lineageEvidenceRecords(payload),existingEvidence=readJson(V9_KEYS.evidence,[]),mergedEvidence=mergeLineageEvidence(existingEvidence,incoming,120);
    if(!writeJson(V9_KEYS.evidence,mergedEvidence)){toast('Evidence 保存失败','浏览器本机存储空间不足。','error');return{ok:false,reason:'storage'}}
    const mode=options.mode||'evidence';let caseId='';
    if(mode==='new'||mode==='existing'){
      const cases=readJson(V9_KEYS.cases,[]);
      if(mode==='new'){
        const name=clean(options.caseName)||`版本链调查 ${new Date().toLocaleDateString()}`;
        const cs={id:uid(),name,createdAt:Date.now(),source:caseSourceSnapshot(),query:window.SOUTU_BRIDGE?.primaryQuery?.()||'',results:readJson(V9_KEYS.results,[]).slice(0,50),evidence:mergeLineageEvidence([],incoming,40),weights:readJson(V9_KEYS.weights,{visual:.5,structure:.3,text:.2}),lineageSummary:payload.summary};
        cases.unshift(cs);caseId=cs.id
      }else{
        const cs=cases.find(c=>c.id===options.caseId);if(!cs){toast('Case 不存在','请重新选择调查项目。','error');return{ok:false,reason:'case-not-found'}}
        cs.evidence=mergeLineageEvidence(cs.evidence||[],incoming,40);cs.lineageSummary=payload.summary;caseId=cs.id
      }
      if(!writeJson(V9_KEYS.cases,cases.slice(0,40))){toast('Case 关联失败','浏览器本机存储空间不足。','error');return{ok:false,reason:'case-storage'}}
    }
    writeJson(V9_KEYS.view,'evidence');
    const saved=mergedEvidence.filter(e=>e.kind==='provenance-lineage'||e.lineage).length;
    const result={ok:true,mode,caseId,rows:payload.rows.length,saved,summary:payload.summary};
    if(options.reload===false){toast('版本链已送入 Investigation Hub',`${payload.rows.length} 条 lineage 证据已写入${caseId?'并关联 Case':''}`,'ok');return result}
    try{sessionStorage.setItem(HANDOFF_SESSION,JSON.stringify(result))}catch{}
    location.reload();return result
  }

  function renderHandoffMode(){
    const mode=document.getElementById('lineageHandoffMode')?.value||'evidence';
    document.getElementById('lineageNewCaseRow')?.classList.toggle('hidden',mode!=='new');
    document.getElementById('lineageExistingCaseRow')?.classList.toggle('hidden',mode!=='existing')
  }
  function openHandoffModal(){
    const payload=evidencePayload();if(!payload.rows.length)return toast('没有可保存的版本链','请先建立版本链。','error');
    ensureHandoffModal();const modal=document.getElementById(HANDOFF_MODAL_ID),cases=readJson(V9_KEYS.cases,[]),select=document.getElementById('lineageExistingCase'),mode=document.getElementById('lineageHandoffMode');
    document.getElementById('lineageHandoffSummary').innerHTML=`<b>${payload.summary.families}</b> 个图片家族 · <b>${payload.rows.length}</b> 条 Evidence · ${payload.summary.timeSupported} 时间支持 · ${payload.summary.pending} 待验证 · ${payload.summary.timeConflicts} 冲突`;
    select.innerHTML=cases.length?cases.map(c=>`<option value="${esc(c.id)}">${esc(c.name||'未命名 Case')}</option>`).join(''):'<option value="">暂无 Case</option>';
    [...mode.options].find(o=>o.value==='existing').disabled=!cases.length;mode.value='evidence';document.getElementById('lineageNewCaseName').value=window.SOUTU_BRIDGE?.primaryQuery?.()||'';renderHandoffMode();modal.classList.remove('hidden')
  }
  function closeHandoffModal(){document.getElementById(HANDOFF_MODAL_ID)?.classList.add('hidden')}
  function confirmHandoff(){
    const mode=document.getElementById('lineageHandoffMode')?.value||'evidence',caseName=document.getElementById('lineageNewCaseName')?.value||'',caseId=document.getElementById('lineageExistingCase')?.value||'';
    const result=handoffToHub({mode,caseName,caseId});if(result?.ok)closeHandoffModal()
  }

  function appendReportEvidence(target=document.getElementById('v9PrintReport')){
    if(!target||target.querySelector('.lineage-report-section'))return 0;
    const rows=readJson(V9_KEYS.evidence,[]).filter(e=>e.kind==='provenance-lineage'||e.lineage).map(e=>e.lineage||{}).filter(x=>x.familyId||x.title);
    if(!rows.length)return 0;
    const disclaimer=readJson(V9_KEYS.evidence,[]).find(e=>e.lineage?.disclaimer)?.lineage?.disclaimer||'根节点与传播方向属于证据候选，不代表已验证原创或确定传播顺序。';
    const role=r=>r.role==='candidate-root'?'候选根节点':'衍生版本';
    target.insertAdjacentHTML('beforeend',`<section class="lineage-report-section"><h2>版本传播链证据</h2><p>${esc(disclaimer)}</p><table><thead><tr><th>图片家族</th><th>角色 / 节点</th><th>关系</th><th>置信度</th><th>方向状态</th><th>时间 / 来源</th><th>依据</th></tr></thead><tbody>${rows.slice(0,120).map(r=>`<tr><td>${esc(r.familyLabel||r.familyId||'')}</td><td><b>${esc(role(r))}</b><small>${esc(r.title||'')}</small></td><td>${esc(r.relationType||'')}</td><td>${esc(r.relationConfidence||'')}</td><td><b>${esc(r.directionState||'')}</b><small>${esc(r.directionReason||'')}</small></td><td>${esc(r.date||'')}<small>${esc(r.source||r.domain||'')}</small><small>${esc(r.url||'')}</small></td><td>${esc(r.reasons||'')}</td></tr>`).join('')}</tbody></table></section>`);
    return rows.length
  }
  function setupReportObserver(){
    const target=document.getElementById('v9PrintReport');if(!target||reportObserver)return;
    reportObserver=new MutationObserver(()=>{if(enhancingReport||!target.innerHTML||target.querySelector('.lineage-report-section'))return;enhancingReport=true;try{appendReportEvidence(target)}finally{enhancingReport=false}});
    reportObserver.observe(target,{childList:true,subtree:false})
  }

  function render(families){
    const panel=document.getElementById(PANEL_ID);if(!panel)return;lastFamilies=families;
    const useful=families.filter(f=>f.root?.title&&(f.variants.length||families.length===1)),edges=useful.reduce((n,f)=>n+f.variants.length,0),supported=useful.reduce((n,f)=>n+f.variants.filter(v=>v.direction.tone==='supported').length,0),uncertain=useful.reduce((n,f)=>n+f.variants.filter(v=>v.direction.tone==='uncertain').length,0),conflicts=useful.reduce((n,f)=>n+f.variants.filter(v=>v.direction.tone==='conflict').length,0);
    panel.classList.remove('hidden');
    panel.innerHTML=`<div class="lineage-head"><div><b>版本传播链</b><span>以“可能原始来源候选”为根节点，结合版本关系与发布时间建立候选方向；没有日期时不会强行推定先后。</span></div><div class="lineage-head-actions"><button type="button" data-lineage-handoff>送入 Investigation Hub</button><button type="button" data-lineage-export="json">导出 JSON</button><button type="button" data-lineage-export="csv">导出 CSV</button></div></div><div class="lineage-summary"><span><b>${useful.length}</b> 家族</span><span><b>${edges}</b> 关系</span><span><b>${supported}</b> 时间支持</span>${uncertain?`<span><b>${uncertain}</b> 待验证</span>`:''}${conflicts?`<span><b>${conflicts}</b> 时间冲突</span>`:''}</div><div class="lineage-families">${useful.length?useful.map((f,i)=>`<section class="lineage-family" data-lineage-family="${esc(f.id)}"><div class="lineage-family-title"><b>${esc(f.label||`图片家族 ${i+1}`)}</b><span>${f.variants.length+1} 个版本</span></div><div class="lineage-root"><div><span class="lineage-badge">候选根节点</span><b>${esc(f.root.title)}</b><small>${esc([f.root.date,f.root.source,f.root.domain].filter(Boolean).join(' · ')||'日期 / 来源信息不足')}</small></div>${f.root.url?`<a href="${esc(f.root.url)}" target="_blank" rel="noopener noreferrer">打开来源</a>`:''}</div><div class="lineage-branches">${f.variants.length?f.variants.map(v=>`<div class="lineage-edge"><div class="lineage-edge-meta"><span>${esc(v.type||'Variant')}</span>${v.confidence?`<span>${esc(v.confidence)}</span>`:''}<span class="${esc(v.direction.tone)}" title="${esc(v.direction.reason)}">${esc(v.direction.label)}</span></div><div class="lineage-node"><div><b>${esc(v.title)}</b><small>${esc([v.date,v.source,v.domain].filter(Boolean).join(' · ')||'日期 / 来源信息不足')}</small>${v.reasons?`<em>${esc(v.reasons)}</em>`:''}</div>${v.url?`<a href="${esc(v.url)}" target="_blank" rel="noopener noreferrer">打开来源</a>`:''}</div></div>`).join(''):'<div class="lineage-empty">当前家族没有可展示的衍生版本关系。</div>'}</div></section>`).join(''):'<div class="lineage-empty">请先运行“溯源分析”，并确保至少存在一个可识别的图片家族。</div>'}</div>`
  }

  const waitFor=(selector,timeout=15000)=>new Promise((resolve,reject)=>{const hit=document.querySelector(selector);if(hit)return resolve(hit);const observer=new MutationObserver(()=>{const el=document.querySelector(selector);if(el){observer.disconnect();clearTimeout(timer);resolve(el)}});observer.observe(document.documentElement,{childList:true,subtree:true});const timer=setTimeout(()=>{observer.disconnect();reject(new Error('等待溯源结果超时'))},timeout)});

  async function openLineage(){
    ensureUi();const button=document.getElementById(BUTTON_ID),panel=document.getElementById(PANEL_ID);if(!button||!panel)return;
    if(button.classList.contains('active')){button.classList.remove('active');panel.classList.add('hidden');return}
    button.disabled=true;button.innerHTML='<svg><use href="#i-history"></use></svg>构建中…';
    try{
      if(!document.querySelector('#universalInsights .provenance-family-card')){
        const provenance=document.getElementById('universalProvenanceBtn');if(!provenance)throw new Error('溯源分析入口不可用');
        if(!provenance.classList.contains('active'))provenance.click();
        await waitFor('#universalInsights .provenance-family-card')
      }
      const families=collect();render(families);button.classList.add('active');
      const edges=families.reduce((n,f)=>n+f.variants.length,0);toast('版本链已建立',`${families.length} 个图片家族 · ${edges} 条候选关系`,'ok')
    }catch(e){panel.classList.add('hidden');toast('版本链建立失败',e?.message||'请先完成溯源分析。','error')}
    finally{button.disabled=false;button.innerHTML='<svg><use href="#i-history"></use></svg>版本链'}
  }

  function resumeHandoff(){
    let pending=null;try{pending=JSON.parse(sessionStorage.getItem(HANDOFF_SESSION)||'null');sessionStorage.removeItem(HANDOFF_SESSION)}catch{}
    if(!pending?.ok)return;
    setTimeout(()=>{window.SOUTU_BRIDGE?.setView?.('research');toast('版本链已进入 Investigation Hub',`${pending.rows} 条 Evidence${pending.caseId?' · 已关联 Case':''}`,'ok')},0)
  }

  function mount(){
    ensureUi();setupReportObserver();resumeHandoff();
    document.getElementById(BUTTON_ID)?.addEventListener('click',openLineage);
    document.getElementById(PANEL_ID)?.addEventListener('click',e=>{const handoff=e.target.closest('[data-lineage-handoff]');if(handoff)return openHandoffModal();const b=e.target.closest('[data-lineage-export]');if(!b)return;b.dataset.lineageExport==='json'?exportJson():exportCsv()});
    document.getElementById(HANDOFF_MODAL_ID)?.addEventListener('click',e=>{if(e.target===e.currentTarget||e.target.closest('[data-lineage-handoff-close]'))return closeHandoffModal();if(e.target.closest('[data-lineage-handoff-confirm]'))return confirmHandoff()});
    document.getElementById('lineageHandoffMode')?.addEventListener('change',renderHandoffMode);
    window.addEventListener('soutu:source-changed',()=>{lastFamilies=[];document.getElementById(PANEL_ID)?.classList.add('hidden');document.getElementById(BUTTON_ID)?.classList.remove('active')});
  }

  window.SOUTU_PROVENANCE_LINEAGE={collect,directionEvidence,evidencePayload,lineageEvidenceRecords,mergeLineageEvidence,handoffToHub,appendReportEvidence,render,open:openLineage,exportJson,exportCsv};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
