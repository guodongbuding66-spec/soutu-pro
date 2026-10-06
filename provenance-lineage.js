(() => {
  'use strict';

  const MODULE_ID='soutu-provenance-lineage';
  const BUTTON_ID='universalLineageBtn';
  const PANEL_ID='universalLineagePanel';
  const STYLE_ID='soutu-provenance-lineage-style';
  let lastFamilies=[];

  const esc=(v='')=>String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const clean=v=>String(v||'').replace(/\s+/g,' ').trim();
  const parseDate=v=>{const t=Date.parse(v||'');return Number.isFinite(t)?t:0};
  const toast=(title,desc='',tone='ok')=>window.SOUTU_BRIDGE?.toast?.(title,desc,tone);

  function injectStyle(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');style.id=STYLE_ID;style.textContent=`
      .universal-lineage-panel{margin-top:12px;padding:14px;border:1px solid var(--line);border-radius:16px;background:var(--panel);box-shadow:var(--shadow-xs)}
      .lineage-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px}.lineage-head b{font-size:12px}.lineage-head span{display:block;margin-top:3px;font-size:9px;color:var(--muted);line-height:1.45}.lineage-head-actions{display:flex;align-items:center;gap:6px;flex-wrap:wrap;justify-content:flex-end}.lineage-head-actions button{min-height:30px;height:30px;padding:0 9px;border:1px solid var(--line);border-radius:8px;background:var(--panel);font-size:9px;font-weight:750;color:var(--text-2)}.lineage-head-actions button:hover{background:var(--panel-strong)}
      .lineage-summary{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}.lineage-summary span{display:inline-flex;align-items:center;gap:4px;padding:5px 7px;border:1px solid var(--line);border-radius:999px;background:var(--panel-subtle);font-size:9px;color:var(--muted)}.lineage-summary b{font-size:10px;color:var(--text)}
      .lineage-families{display:grid;gap:12px}.lineage-family{border:1px solid var(--line);border-radius:14px;padding:12px;background:var(--panel-subtle)}.lineage-family-title{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}.lineage-family-title b{font-size:11px}.lineage-family-title span{font-size:9px;color:var(--muted)}
      .lineage-root,.lineage-node{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;border:1px solid var(--line);border-radius:11px;padding:9px 10px;background:var(--panel)}.lineage-root{border-color:color-mix(in srgb,var(--primary) 32%,var(--line));background:color-mix(in srgb,var(--primary-soft) 46%,var(--panel))}.lineage-root small,.lineage-node small{display:block;margin-top:3px;font-size:8px;color:var(--muted)}.lineage-root a,.lineage-node a{font-size:9px;font-weight:750;text-decoration:none;color:var(--primary);white-space:nowrap}.lineage-root .lineage-badge{display:inline-flex;width:max-content;padding:3px 6px;border-radius:999px;background:var(--primary-soft);color:var(--primary);font-size:8px;font-weight:800;margin-bottom:4px}
      .lineage-branches{display:grid;gap:8px;margin-top:8px;padding-left:20px;position:relative}.lineage-branches:before{content:"";position:absolute;left:7px;top:0;bottom:13px;width:1px;background:var(--line-strong)}.lineage-edge{position:relative}.lineage-edge:before{content:"";position:absolute;left:-13px;top:19px;width:13px;height:1px;background:var(--line-strong)}.lineage-edge-meta{display:flex;flex-wrap:wrap;gap:5px;margin:0 0 5px 4px}.lineage-edge-meta span{font-size:8px;padding:3px 6px;border-radius:999px;border:1px solid var(--line);background:var(--panel);color:var(--muted)}.lineage-edge-meta .supported{color:var(--success);border-color:color-mix(in srgb,var(--success) 32%,var(--line));background:var(--success-soft)}.lineage-edge-meta .conflict{color:var(--danger);border-color:color-mix(in srgb,var(--danger) 32%,var(--line));background:var(--danger-soft)}.lineage-edge-meta .uncertain{color:var(--warning);border-color:color-mix(in srgb,var(--warning) 32%,var(--line));background:var(--warning-soft)}.lineage-node em{display:block;margin-top:4px;font-size:8px;font-style:normal;color:var(--muted);line-height:1.45}.lineage-empty{font-size:10px;color:var(--muted);padding:12px;text-align:center}
      @media(max-width:620px){.lineage-head{display:grid}.lineage-head-actions{justify-content:flex-start}.lineage-root,.lineage-node{grid-template-columns:1fr}.lineage-root a,.lineage-node a{justify-self:start}.lineage-branches{padding-left:14px}.lineage-edge:before{left:-7px;width:7px}}
    `;document.head.appendChild(style)
  }

  function ensureUi(){
    injectStyle();
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
    const q=v=>`"${String(v??'').replace(/"/g,'""')}"`,csv=[headers,...payload.rows.map(values)].map(r=>r.map(q).join(',')).join('\n');
    download(`soutu-lineage-${Date.now()}.csv`,'\uFEFF'+csv,'text/csv;charset=utf-8');toast('版本链 CSV 已导出',`${payload.rows.length} 条证据记录`,'ok')
  }

  function render(families){
    const panel=document.getElementById(PANEL_ID);if(!panel)return;lastFamilies=families;
    const useful=families.filter(f=>f.root?.title&&(f.variants.length||families.length===1)),edges=useful.reduce((n,f)=>n+f.variants.length,0),supported=useful.reduce((n,f)=>n+f.variants.filter(v=>v.direction.tone==='supported').length,0),uncertain=useful.reduce((n,f)=>n+f.variants.filter(v=>v.direction.tone==='uncertain').length,0),conflicts=useful.reduce((n,f)=>n+f.variants.filter(v=>v.direction.tone==='conflict').length,0);
    panel.classList.remove('hidden');
    panel.innerHTML=`<div class="lineage-head"><div><b>版本传播链</b><span>以“可能原始来源候选”为根节点，结合版本关系与发布时间建立候选方向；没有日期时不会强行推定先后。</span></div><div class="lineage-head-actions"><button type="button" data-lineage-export="json">导出 JSON</button><button type="button" data-lineage-export="csv">导出 CSV</button></div></div><div class="lineage-summary"><span><b>${useful.length}</b> 家族</span><span><b>${edges}</b> 关系</span><span><b>${supported}</b> 时间支持</span>${uncertain?`<span><b>${uncertain}</b> 待验证</span>`:''}${conflicts?`<span><b>${conflicts}</b> 时间冲突</span>`:''}</div><div class="lineage-families">${useful.length?useful.map((f,i)=>`<section class="lineage-family" data-lineage-family="${esc(f.id)}"><div class="lineage-family-title"><b>${esc(f.label||`图片家族 ${i+1}`)}</b><span>${f.variants.length+1} 个版本</span></div><div class="lineage-root"><div><span class="lineage-badge">候选根节点</span><b>${esc(f.root.title)}</b><small>${esc([f.root.date,f.root.source,f.root.domain].filter(Boolean).join(' · ')||'日期 / 来源信息不足')}</small></div>${f.root.url?`<a href="${esc(f.root.url)}" target="_blank" rel="noopener noreferrer">打开来源</a>`:''}</div><div class="lineage-branches">${f.variants.length?f.variants.map(v=>`<div class="lineage-edge"><div class="lineage-edge-meta"><span>${esc(v.type||'Variant')}</span>${v.confidence?`<span>${esc(v.confidence)}</span>`:''}<span class="${esc(v.direction.tone)}" title="${esc(v.direction.reason)}">${esc(v.direction.label)}</span></div><div class="lineage-node"><div><b>${esc(v.title)}</b><small>${esc([v.date,v.source,v.domain].filter(Boolean).join(' · ')||'日期 / 来源信息不足')}</small>${v.reasons?`<em>${esc(v.reasons)}</em>`:''}</div>${v.url?`<a href="${esc(v.url)}" target="_blank" rel="noopener noreferrer">打开来源</a>`:''}</div></div>`).join(''):'<div class="lineage-empty">当前家族没有可展示的衍生版本关系。</div>'}</div></section>`).join(''):'<div class="lineage-empty">请先运行“溯源分析”，并确保至少存在一个可识别的图片家族。</div>'}</div>`
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

  function mount(){
    ensureUi();document.getElementById(BUTTON_ID)?.addEventListener('click',openLineage);
    document.getElementById(PANEL_ID)?.addEventListener('click',e=>{const b=e.target.closest('[data-lineage-export]');if(!b)return;b.dataset.lineageExport==='json'?exportJson():exportCsv()});
    window.addEventListener('soutu:source-changed',()=>{lastFamilies=[];document.getElementById(PANEL_ID)?.classList.add('hidden');document.getElementById(BUTTON_ID)?.classList.remove('active')});
  }

  window.SOUTU_PROVENANCE_LINEAGE={collect,directionEvidence,evidencePayload,render,open:openLineage,exportJson,exportCsv};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
