(() => {
  'use strict';

  const MODULE_ID='soutu-evidence-verification';
  const STYLE_ID='soutu-evidence-verification-style';
  const MODAL_ID='evidenceVerificationModal';
  const SESSION_KEY='soutu-pro-evidence-verification-saved-v1';
  const KEYS={
    evidence:'soutu-pro-v9-evidence',
    cases:'soutu-pro-v9-cases',
    view:'soutu-pro-v9-view'
  };
  const STATUS={
    'needs-review':{label:'Needs Review',cn:'待复核',tone:'pending'},
    verified:{label:'Verified',cn:'已确认',tone:'verified'},
    rejected:{label:'Rejected',cn:'已否决',tone:'rejected'},
    inconclusive:{label:'Inconclusive',cn:'证据不足',tone:'inconclusive'}
  };
  let bodyObserver=null,reportObserver=null,enhancingReport=false;

  const esc=(v='')=>String(v).replace(/[&<>\"']/g,c=>c==='&'?'&amp;':c==='<'?'&lt;':c==='>'?'&gt;':c.charCodeAt(0)===34?'&quot;':'&#39;');
  const read=(k,f)=>{try{const raw=localStorage.getItem(k);return raw?JSON.parse(raw):f}catch{return f}};
  const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch{return false}};
  const toast=(a,b='',tone='ok')=>window.SOUTU_BRIDGE?.toast?.(a,b,tone);
  const fmt=ts=>{try{return ts?new Date(ts).toLocaleString():'—'}catch{return '—'}};
  const isLineage=e=>Boolean(e&&(e.kind==='provenance-lineage'||e.lineage));
  const reviewOf=e=>({status:'needs-review',note:'',conflict:false,reviewedAt:0,reviewer:'',...(e?.verification||{})});
  const statusMeta=s=>STATUS[s]||STATUS['needs-review'];
  const matchKey=e=>String(e?.lineageKey||e?.lineage?.familyId+'|'+e?.lineage?.role+'|'+e?.lineage?.title+'|'+e?.lineage?.url+'|'+e?.lineage?.relationType+'|'+e?.lineage?.directionState||e?.id||'');

  function injectStyle(){
    if(document.getElementById(STYLE_ID))return;
    const s=document.createElement('style');s.id=STYLE_ID;s.textContent=`
      .evidence-verify-btn{white-space:nowrap}.evidence-review-badge{display:inline-flex;align-items:center;gap:5px;margin-top:6px;padding:4px 7px;border-radius:999px;border:1px solid var(--line);font-size:8px;font-weight:800}.evidence-review-badge.pending{color:var(--warning);background:var(--warning-soft)}.evidence-review-badge.verified{color:var(--success);background:var(--success-soft)}.evidence-review-badge.rejected{color:var(--danger);background:var(--danger-soft)}.evidence-review-badge.inconclusive{color:var(--muted);background:var(--panel-subtle)}.evidence-review-badge.conflict{box-shadow:0 0 0 1px color-mix(in srgb,var(--danger) 40%,transparent) inset}
      .evidence-verification-modal{max-width:1040px}.evidence-verification-headline{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.verification-summary{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 14px}.verification-summary span{padding:5px 8px;border:1px solid var(--line);border-radius:999px;background:var(--panel-subtle);font-size:9px;color:var(--muted)}.verification-summary b{color:var(--text)}.verification-list{display:grid;gap:10px;max-height:min(62vh,720px);overflow:auto;padding-right:4px}.verification-card{display:grid;grid-template-columns:minmax(220px,1fr) minmax(260px,.9fr);gap:12px;padding:12px;border:1px solid var(--line);border-radius:12px;background:var(--panel-subtle)}.verification-auto{display:grid;gap:5px;min-width:0}.verification-auto b{font-size:11px}.verification-auto small{color:var(--muted);font-size:9px;line-height:1.45;word-break:break-word}.verification-controls{display:grid;grid-template-columns:1fr auto;gap:8px}.verification-controls select,.verification-controls textarea{width:100%;border:1px solid var(--line);border-radius:9px;background:var(--panel);color:var(--text);padding:8px;font:inherit}.verification-controls textarea{grid-column:1/-1;min-height:66px;resize:vertical}.verification-controls label{display:flex;align-items:center;gap:6px;font-size:9px;color:var(--text-2);white-space:nowrap}.verification-controls input[type=checkbox]{width:15px;height:15px}.verification-footer{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-top:14px}.verification-footer small{color:var(--muted);font-size:9px}.case-verification-summary{display:flex;gap:5px;flex-wrap:wrap;margin-top:7px}.case-verification-summary span{font-size:8px;padding:3px 6px;border-radius:999px;background:var(--panel-subtle);border:1px solid var(--line);color:var(--muted)}
      .verification-report-section{margin-top:24px}.verification-report-section table{width:100%;border-collapse:collapse}.verification-report-section th,.verification-report-section td{padding:6px;border:1px solid #cfd6df;vertical-align:top;font-size:9px;text-align:left}.verification-report-section small{display:block;margin-top:3px}.verification-report-summary{display:flex;gap:10px;flex-wrap:wrap;margin:8px 0 12px;font-size:10px}
      @media(max-width:760px){.verification-card{grid-template-columns:1fr}.verification-controls{grid-template-columns:1fr}.verification-controls label,.verification-controls textarea{grid-column:1}.verification-footer{display:grid}}@media print{.verification-report-section{break-before:page}}
    `;document.head.appendChild(s)
  }

  function lineageEvidence(){return read(KEYS.evidence,[]).filter(isLineage)}
  function summary(items=lineageEvidence()){
    const out={total:items.length,needsReview:0,verified:0,rejected:0,inconclusive:0,conflicts:0};
    items.forEach(e=>{const r=reviewOf(e);if(r.status==='verified')out.verified++;else if(r.status==='rejected')out.rejected++;else if(r.status==='inconclusive')out.inconclusive++;else out.needsReview++;if(r.conflict)out.conflicts++});return out
  }
  function summaryHtml(s){return `<span><b>${s.total}</b> lineage</span><span><b>${s.needsReview}</b> 待复核</span><span><b>${s.verified}</b> 已确认</span><span><b>${s.rejected}</b> 已否决</span><span><b>${s.inconclusive}</b> 证据不足</span>${s.conflicts?`<span><b>${s.conflicts}</b> 冲突标记</span>`:''}`}

  function ensureModal(){
    if(document.getElementById(MODAL_ID))return;
    const m=document.createElement('div');m.id=MODAL_ID;m.className='modal-backdrop hidden';m.innerHTML=`<div class="modal modal-wide evidence-verification-modal" role="dialog" aria-modal="true" aria-labelledby="evidenceVerificationTitle"><div class="modal-head"><div><span class="section-kicker">EVIDENCE REVIEW</span><h2 id="evidenceVerificationTitle">Evidence Verification Workspace</h2><p>核验自动推断，不会把候选根节点自动升级为已验证原创。</p></div><button class="icon-btn" type="button" data-verification-close aria-label="关闭"><svg><use href="#i-x"></use></svg></button></div><div id="verificationSummary" class="verification-summary"></div><div id="verificationList" class="verification-list"></div><div class="verification-footer"><small>保存后会同步 V9 Evidence 和所有关联 Case，并刷新 Hub 状态。</small><div class="v9-action-row"><button class="secondary-btn" type="button" data-verification-close>取消</button><button class="primary-btn" type="button" data-verification-save>保存核验</button></div></div></div>`;document.body.appendChild(m)
  }

  function cardHtml(e){
    const l=e.lineage||{},r=reviewOf(e),meta=statusMeta(r.status),role=l.role==='candidate-root'?'候选根节点':'衍生版本';
    return `<article class="verification-card" data-verification-id="${esc(e.id)}"><div class="verification-auto"><span class="section-kicker">${esc(l.familyLabel||l.familyId||'LINEAGE')}</span><b>${esc(e.title||l.title||'版本链证据')}</b><small>${esc(role)} · ${esc(l.relationType||'')} ${l.relationConfidence?`· ${esc(l.relationConfidence)}`:''}</small><small>自动方向：${esc(l.directionState||'方向待验证')} · ${esc(l.directionReason||'')}</small><small>${esc([l.date,l.source,l.domain].filter(Boolean).join(' · ')||'时间 / 来源信息不足')}</small><small>${esc(l.reasons||'')}</small></div><div class="verification-controls"><select data-review-status aria-label="核验状态"><option value="needs-review"${r.status==='needs-review'?' selected':''}>Needs Review / 待复核</option><option value="verified"${r.status==='verified'?' selected':''}>Verified / 已确认</option><option value="rejected"${r.status==='rejected'?' selected':''}>Rejected / 已否决</option><option value="inconclusive"${r.status==='inconclusive'?' selected':''}>Inconclusive / 证据不足</option></select><label><input type="checkbox" data-review-conflict${r.conflict?' checked':''}>冲突 Evidence</label><textarea data-review-note maxlength="1200" placeholder="人工核验备注、依据或否决原因…">${esc(r.note||'')}</textarea><small>当前：${esc(meta.cn)}${r.reviewedAt?` · ${esc(fmt(r.reviewedAt))}`:''}</small></div></article>`
  }

  function openWorkspace(){
    injectStyle();ensureModal();const items=lineageEvidence();if(!items.length)return toast('没有可核验的版本链证据','请先把版本链送入 Investigation Hub。','error');
    document.getElementById('verificationSummary').innerHTML=summaryHtml(summary(items));document.getElementById('verificationList').innerHTML=items.map(cardHtml).join('');document.getElementById(MODAL_ID).classList.remove('hidden')
  }
  const closeWorkspace=()=>document.getElementById(MODAL_ID)?.classList.add('hidden');

  function normalizeChange(c){const status=STATUS[c?.status]?c.status:'needs-review';return{status,note:String(c?.note||'').trim().slice(0,1200),conflict:Boolean(c?.conflict),reviewer:String(c?.reviewer||'Manual review'),reviewedAt:status==='needs-review'&&!c?.note&&!c?.conflict?0:Number(c?.reviewedAt)||Date.now()}}
  function verificationSummaryForEvidence(items){return summary(items.filter(isLineage))}
  function applyVerificationChanges(changes,{reload=true}={}){
    const evidence=read(KEYS.evidence,[]),cases=read(KEYS.cases,[]),byId=new Map(changes.map(c=>[String(c.id),normalizeChange(c)])),changedKeys=new Map();let changed=0;
    evidence.forEach(e=>{const patch=byId.get(String(e.id));if(!patch)return;e.verification=patch;changedKeys.set(matchKey(e),patch);changed++});
    if(!changed)return{ok:false,reason:'no-match',changed:0};
    cases.forEach(cs=>{(cs.evidence||[]).forEach(e=>{const patch=byId.get(String(e.id))||changedKeys.get(matchKey(e));if(patch)e.verification={...patch}});cs.verificationSummary=verificationSummaryForEvidence(cs.evidence||[])});
    if(!write(KEYS.evidence,evidence))return{ok:false,reason:'evidence-storage',changed:0};
    if(!write(KEYS.cases,cases))return{ok:false,reason:'case-storage',changed:0};
    write(KEYS.view,'evidence');const result={ok:true,changed,summary:verificationSummaryForEvidence(evidence)};
    if(!reload){decorateCurrentView();toast('Evidence 核验已保存',`${changed} 条记录已同步 Evidence / Case`,'ok');return result}
    try{sessionStorage.setItem(SESSION_KEY,JSON.stringify(result))}catch{}location.reload();return result
  }

  function saveWorkspace(){
    const changes=[...document.querySelectorAll('#verificationList [data-verification-id]')].map(card=>({id:card.dataset.verificationId,status:card.querySelector('[data-review-status]')?.value||'needs-review',conflict:Boolean(card.querySelector('[data-review-conflict]')?.checked),note:card.querySelector('[data-review-note]')?.value||'',reviewer:'Manual review'}));
    const r=applyVerificationChanges(changes);if(r?.ok)closeWorkspace();else toast('核验保存失败','没有找到对应 Evidence 或本机存储失败。','error')
  }

  function decorateEvidenceView(){
    const list=document.querySelector('#v9Body .v9-evidence-list');if(!list)return;const evidence=read(KEYS.evidence,[]),articles=[...list.querySelectorAll(':scope>article')];articles.forEach((article,i)=>{const e=evidence[i];if(!isLineage(e))return;article.dataset.verificationEvidence=e.id||'';let badge=article.querySelector('.evidence-review-badge');if(!badge){badge=document.createElement('span');badge.className='evidence-review-badge';article.querySelector('div')?.appendChild(badge)}const r=reviewOf(e),m=statusMeta(r.status);badge.className=`evidence-review-badge ${m.tone}${r.conflict?' conflict':''}`;badge.textContent=`${m.cn}${r.conflict?' · 冲突':''}`;badge.title=r.note||m.label});
    const head=document.querySelector('#v9Body .v9-evidence-head');if(head&&!head.querySelector('[data-open-verification]')){const b=document.createElement('button');b.type='button';b.className='secondary-btn evidence-verify-btn';b.dataset.openVerification='1';b.textContent='核验证据';head.appendChild(b)}
  }

  function decorateCasesView(){
    const cases=read(KEYS.cases,[]),map=new Map(cases.map(c=>[String(c.id),c]));document.querySelectorAll('#v9Body [data-case-id]').forEach(card=>{const c=map.get(String(card.dataset.caseId));if(!c)return;let box=card.querySelector('.case-verification-summary');if(!box){box=document.createElement('div');box.className='case-verification-summary';card.querySelector('div')?.appendChild(box)}const s=c.verificationSummary||verificationSummaryForEvidence(c.evidence||[]);box.innerHTML=`<span>${s.verified||0} 已确认</span><span>${s.rejected||0} 已否决</span><span>${s.inconclusive||0} 证据不足</span><span>${s.needsReview||0} 待复核</span>${s.conflicts?`<span>${s.conflicts} 冲突</span>`:''}`})
  }
  function decorateCurrentView(){decorateEvidenceView();decorateCasesView()}

  function reportRows(){return lineageEvidence().map(e=>({e,l:e.lineage||{},r:reviewOf(e)}))}
  function appendVerificationReport(target=document.getElementById('v9PrintReport')){
    if(!target||target.querySelector('.verification-report-section'))return 0;const rows=reportRows();if(!rows.length)return 0;const s=summary(rows.map(x=>x.e));target.insertAdjacentHTML('beforeend',`<section class="verification-report-section"><h2>Evidence Verification</h2><p>人工核验状态与自动推断分开保存；“Verified”只表示审核者确认当前候选关系/方向，不代表自动取得原创权属结论。</p><div class="verification-report-summary"><b>${s.verified} 已确认</b><span>${s.rejected} 已否决</span><span>${s.inconclusive} 证据不足</span><span>${s.needsReview} 待复核</span>${s.conflicts?`<span>${s.conflicts} 冲突标记</span>`:''}</div><table><thead><tr><th>图片家族</th><th>节点</th><th>自动推断</th><th>人工状态</th><th>冲突</th><th>人工备注</th><th>审核时间</th></tr></thead><tbody>${rows.map(({e,l,r})=>{const m=statusMeta(r.status);return`<tr><td>${esc(l.familyLabel||l.familyId||'')}</td><td><b>${esc(e.title||l.title||'')}</b><small>${esc(l.role==='candidate-root'?'候选根节点':l.relationType||'衍生版本')}</small></td><td>${esc(l.directionState||'')}<small>${esc(l.directionReason||'')}</small></td><td><b>${esc(m.cn)}</b><small>${esc(m.label)}</small></td><td>${r.conflict?'是':'否'}</td><td>${esc(r.note||'')}</td><td>${esc(fmt(r.reviewedAt))}</td></tr>`}).join('')}</tbody></table></section>`);return rows.length
  }
  function setupObservers(){
    const body=document.getElementById('v9Body');if(body&&!bodyObserver){bodyObserver=new MutationObserver(()=>queueMicrotask(decorateCurrentView));bodyObserver.observe(body,{childList:true,subtree:true})}
    const report=document.getElementById('v9PrintReport');if(report&&!reportObserver){reportObserver=new MutationObserver(()=>{if(enhancingReport||!report.innerHTML||report.querySelector('.verification-report-section'))return;enhancingReport=true;try{appendVerificationReport(report)}finally{enhancingReport=false}});reportObserver.observe(report,{childList:true,subtree:false})}
  }
  function resumeSaved(){let x=null;try{x=JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null');sessionStorage.removeItem(SESSION_KEY)}catch{}if(x?.ok)setTimeout(()=>{window.SOUTU_BRIDGE?.setView?.('research');toast('Evidence 核验已保存',`${x.changed} 条记录已同步 Evidence / Case`,'ok')},0)}
  function exportVerification(){const items=lineageEvidence(),payload={schema:'soutu-pro.evidence-verification.v1',generatedAt:new Date().toISOString(),summary:summary(items),items:items.map(e=>({id:e.id,title:e.title,url:e.url,lineageKey:e.lineageKey,lineage:e.lineage,verification:reviewOf(e)}))};const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));a.download=`soutu-evidence-verification-${Date.now()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}

  function mount(){injectStyle();ensureModal();setupObservers();decorateCurrentView();resumeSaved();document.addEventListener('click',e=>{if(e.target.closest('[data-open-verification]'))return openWorkspace();if(e.target.closest('[data-verification-close]')||e.target===document.getElementById(MODAL_ID))return closeWorkspace();if(e.target.closest('[data-verification-save]'))return saveWorkspace()});}

  window.SOUTU_EVIDENCE_VERIFICATION={STATUS,reviewOf,summary,lineageEvidence,applyVerificationChanges,appendVerificationReport,open:openWorkspace,exportJson:exportVerification,decorate:decorateCurrentView};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
