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
  let workspaceItems=[],stagedActions=new Map(),workspaceFocus=null;
  const audit=()=>window.SOUTU_VERIFICATION_AUDIT;
  const relatedEvidence=()=>read(KEYS.cases,[]).flatMap(c=>c.evidence||[]);
  const canonicalEvidence=e=>audit()?.canonical(e,relatedEvidence())||e;

  const esc=(v='')=>String(v).replace(/[&<>\"']/g,c=>c==='&'?'&amp;':c==='<'?'&lt;':c==='>'?'&gt;':c.charCodeAt(0)===34?'&quot;':'&#39;');
  const read=(k,f)=>{try{const raw=localStorage.getItem(k);return raw?JSON.parse(raw):f}catch{return f}};
  const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch{return false}};
  const toast=(a,b='',tone='ok')=>window.SOUTU_BRIDGE?.toast?.(a,b,tone);
  const fmt=ts=>{try{return ts?new Date(ts).toLocaleString():'—'}catch{return '—'}};
  const isLineage=e=>Boolean(e&&(e.kind==='provenance-lineage'||e.lineage));
  const reviewOf=e=>({status:'needs-review',note:'',conflict:false,finalized:false,reviewedAt:0,reviewer:'',...(e?.verification||{})});
  const statusMeta=s=>STATUS[s]||STATUS['needs-review'];
  const matchKey=e=>audit()?.keyOf(e)||String(e?.lineageKey||e?.id||'');

  function injectStyle(){
    if(document.getElementById(STYLE_ID))return;
    const s=document.createElement('style');s.id=STYLE_ID;s.textContent=`
      .evidence-verify-btn{white-space:nowrap}.evidence-review-badge{display:inline-flex;align-items:center;gap:5px;margin-top:6px;padding:4px 7px;border-radius:999px;border:1px solid var(--line);font-size:8px;font-weight:800}.evidence-review-badge.pending{color:var(--warning);background:var(--warning-soft)}.evidence-review-badge.verified{color:var(--success);background:var(--success-soft)}.evidence-review-badge.rejected{color:var(--danger);background:var(--danger-soft)}.evidence-review-badge.inconclusive{color:var(--muted);background:var(--panel-subtle)}.evidence-review-badge.conflict{box-shadow:0 0 0 1px color-mix(in srgb,var(--danger) 40%,transparent) inset}
      .evidence-verification-modal{width:min(1040px,100%);max-width:1040px;max-height:min(92dvh,950px);display:flex;flex-direction:column;padding:0 16px 16px}.evidence-verification-modal .modal-head{flex:none;padding:12px 0}.evidence-verification-modal .modal-head p{font-size:12px;margin:8px 0}.evidence-verification-modal .verification-list{min-height:0;flex:1;max-height:none}.evidence-verification-modal .verification-summary,.evidence-verification-modal .verification-reviewer,.evidence-verification-modal .verification-footer{flex:none}.evidence-verification-headline{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.verification-summary{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 14px}.verification-summary span{padding:5px 8px;border:1px solid var(--line);border-radius:999px;background:var(--panel-subtle);font-size:9px;color:var(--muted)}.verification-summary b{color:var(--text)}.verification-list{display:grid;gap:10px;max-height:min(62vh,720px);overflow:auto;padding-right:4px}.verification-card{display:grid;grid-template-columns:minmax(220px,1fr) minmax(260px,.9fr);gap:12px;padding:12px;border:1px solid var(--line);border-radius:12px;background:var(--panel-subtle)}.verification-auto{display:grid;gap:5px;min-width:0}.verification-auto b{font-size:13px}.verification-auto small{color:var(--muted);font-size:11px;line-height:1.45;word-break:break-word}.verification-controls{display:grid;grid-template-columns:1fr auto;gap:8px}.verification-controls select,.verification-controls textarea,.verification-controls input[type=text]{width:100%;border:1px solid var(--line);border-radius:9px;background:var(--panel);color:var(--text);padding:8px;font:inherit}.verification-controls textarea{grid-column:1/-1;min-height:66px;resize:vertical}.verification-controls label{display:flex;align-items:center;gap:6px;font-size:9px;color:var(--text-2);white-space:nowrap}.verification-controls input[type=checkbox]{width:15px;height:15px}.verification-footer .v9-action-row{flex-wrap:wrap}.verification-footer{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-top:14px}.verification-footer small{color:var(--muted);font-size:9px}.case-verification-summary{display:flex;gap:5px;flex-wrap:wrap;margin-top:7px}.case-verification-summary span{font-size:8px;padding:3px 6px;border-radius:999px;background:var(--panel-subtle);border:1px solid var(--line);color:var(--muted)}
      .verification-report-section{margin-top:24px}.verification-report-section table{width:100%;border-collapse:collapse}.verification-report-section th,.verification-report-section td{padding:6px;border:1px solid #cfd6df;vertical-align:top;font-size:9px;text-align:left}.verification-report-section small{display:block;margin-top:3px}.verification-report-summary{display:flex;gap:10px;flex-wrap:wrap;margin:8px 0 12px;font-size:10px}
      .verification-reviewer{display:grid;gap:5px;margin-bottom:12px;font-size:12px}.verification-reviewer input{padding:9px;border:1px solid var(--line);border-radius:8px;background:var(--panel);color:var(--text)}.verification-history{grid-column:1/-1;font-size:12px;line-height:1.5}.verification-history ol{padding-left:20px}.verification-history li{padding:8px 0;border-bottom:1px solid var(--line);overflow-wrap:anywhere}.verification-history p{margin:4px 0;white-space:pre-wrap}.verification-history small{display:block;color:var(--muted)}.verification-history button{margin:4px 0}.verification-controls [data-review-reason],.verification-controls [data-review-finalized-label]{grid-column:1/-1}.verification-staged{grid-column:1/-1;color:var(--warning);font-size:12px}.verification-audit-report td{overflow-wrap:anywhere;white-space:pre-wrap}.verification-audit-report tr{break-inside:avoid}
      @media(max-width:760px){.verification-card{grid-template-columns:1fr}.verification-controls{grid-template-columns:1fr}.verification-controls label,.verification-controls textarea{grid-column:1}.verification-footer{display:grid}.verification-footer .v9-action-row{display:grid;grid-template-columns:1fr 1fr}.verification-footer [data-verification-save]{grid-column:1/-1}}@media print{.verification-report-section{break-before:page}}
    `;document.head.appendChild(s)
  }

  function lineageEvidence(){return read(KEYS.evidence,[]).filter(isLineage).map(canonicalEvidence)}
  function summary(items=lineageEvidence()){
    const out={total:items.length,needsReview:0,verified:0,rejected:0,inconclusive:0,conflicts:0};
    items.forEach(e=>{const r=reviewOf(e);if(r.status==='verified')out.verified++;else if(r.status==='rejected')out.rejected++;else if(r.status==='inconclusive')out.inconclusive++;else out.needsReview++;if(r.conflict)out.conflicts++});return out
  }
  function summaryHtml(s){return `<span><b>${s.total}</b> lineage</span><span><b>${s.needsReview}</b> 待复核</span><span><b>${s.verified}</b> 已确认</span><span><b>${s.rejected}</b> 已否决</span><span><b>${s.inconclusive}</b> 证据不足</span>${s.conflicts?`<span><b>${s.conflicts}</b> 冲突标记</span>`:''}`}

  function ensureModal(){
    if(document.getElementById(MODAL_ID))return;
    const m=document.createElement('div');m.id=MODAL_ID;m.className='modal-backdrop hidden';m.innerHTML=`<div class="modal modal-wide evidence-verification-modal" role="dialog" aria-modal="true" aria-labelledby="evidenceVerificationTitle"><div class="modal-head"><div><span class="section-kicker">EVIDENCE REVIEW</span><h2 id="evidenceVerificationTitle">Evidence Verification Workspace</h2><p>核验自动推断，不会把候选根节点自动升级为已验证原创。</p></div><button class="icon-btn" type="button" data-verification-close aria-label="关闭"><svg><use href="#i-x"></use></svg></button></div><div id="verificationSummary" class="verification-summary"></div><label class="verification-reviewer">审核人<input id="verificationReviewer" type="text" maxlength="120" placeholder="填写本次审核人姓名" autocomplete="name"></label><div id="verificationList" class="verification-list"></div><div class="verification-footer"><small>保存后会同步 V9 Evidence 和所有关联 Case，并刷新 Hub 状态。</small><div class="v9-action-row"><button class="secondary-btn" type="button" data-audit-export="json">审计 JSON</button><button class="secondary-btn" type="button" data-audit-export="csv">审计 CSV</button><button class="secondary-btn" type="button" data-verification-export>导出核验 JSON</button><button class="secondary-btn" type="button" data-verification-close>取消</button><button class="primary-btn" type="button" data-verification-save>保存核验</button></div></div></div>`;document.body.appendChild(m)
  }

  function cardHtml(e){
    const l=e.lineage||{},r=reviewOf(e),meta=statusMeta(r.status),role=l.role==='candidate-root'?'候选根节点':'衍生版本';
    return `<article class="verification-card" data-verification-id="${esc(e.id)}"><div class="verification-auto"><span class="section-kicker">${esc(l.familyLabel||l.familyId||'LINEAGE')}</span><b>${esc(e.title||l.title||'版本链证据')}</b><small>${esc(role)} · ${esc(l.relationType||'')} ${l.relationConfidence?`· ${esc(l.relationConfidence)}`:''}</small><small>自动方向：${esc(l.directionState||'方向待验证')} · ${esc(l.directionReason||'')}</small><small>${esc([l.date,l.source,l.domain].filter(Boolean).join(' · ')||'时间 / 来源信息不足')}</small><small>${esc(l.reasons||'')}</small></div><div class="verification-controls"><select data-review-status aria-label="核验状态"><option value="needs-review"${r.status==='needs-review'?' selected':''}>Needs Review / 待复核</option><option value="verified"${r.status==='verified'?' selected':''}>Verified / 已确认</option><option value="rejected"${r.status==='rejected'?' selected':''}>Rejected / 已否决</option><option value="inconclusive"${r.status==='inconclusive'?' selected':''}>Inconclusive / 证据不足</option></select><label><input type="checkbox" data-review-conflict${r.conflict?' checked':''}>冲突 Evidence</label><textarea data-review-note maxlength="1200" placeholder="人工核验备注、依据或否决原因…">${esc(r.note||'')}</textarea><label data-review-finalized-label><input type="checkbox" data-review-finalized${r.finalized?' checked':''}>最终裁定（重新改动仍会留痕）</label><input type="text" data-review-reason maxlength="1200" placeholder="本次修改理由（修改时必填）" aria-label="修改理由"><small>当前：${esc(meta.cn)}${r.reviewedAt?` · ${esc(fmt(r.reviewedAt))}`:''}</small><span class="verification-staged" data-review-staged></span></div>${historyHtml(e)}</article>`
  }

  function historyHtml(e){
    const events=audit()?.historyOf(e)||[];
    const stateText=r=>r?`${statusMeta(r.status).cn}${r.conflict?' · 冲突':''}${r.finalized?' · 最终裁定':''}`:'旧版快照（无前态）';
    return `<details class="verification-history"><summary>审核历史 · ${events.length} 条记录</summary>${events.length?`<button class="secondary-btn" type="button" data-audit-undo${events.at(-1).before?'':' disabled'}>撤销最近修改</button><ol>${events.map(h=>`<li><b>${esc(h.reviewer)} · ${esc(fmt(h.at))}</b><small>${esc(h.action)} · #${esc(h.sequence)} · ${esc(stateText(h.before))} → ${esc(stateText(h.after))}</small><p>${esc(h.reason)}</p><small>前备注：${esc(h.before?.note||'—')}<br>后备注：${esc(h.after?.note||'—')}</small><button class="secondary-btn" type="button" data-audit-restore="${esc(h.id)}">恢复到此记录</button></li>`).join('')}</ol>`:'<p>尚无审核记录。</p>'}</details>`
  }
  function openWorkspace(){
    injectStyle();ensureModal();let items;try{items=lineageEvidence()}catch{return toast('审核记录冲突','请先导出备份并核对记录。','error')}
    if(!items.length)return toast('没有可核验的版本链证据','请先把版本链送入 Investigation Hub。','error');
    workspaceFocus=document.activeElement;workspaceItems=items;stagedActions=new Map();
    document.getElementById('verificationSummary').innerHTML=summaryHtml(summary(items));document.getElementById('verificationList').innerHTML=items.map(cardHtml).join('');document.getElementById(MODAL_ID).classList.remove('hidden');document.getElementById('verificationReviewer').focus()
  }
  const closeWorkspace=()=>{document.getElementById(MODAL_ID)?.classList.add('hidden');workspaceItems=[];stagedActions.clear();workspaceFocus?.focus()};

  function verificationSummaryForEvidence(items){return summary(items.filter(isLineage))}
  function applyVerificationChanges(changes,{reload=true}={}){
    const evidenceRaw=localStorage.getItem(KEYS.evidence),casesRaw=localStorage.getItem(KEYS.cases);
    let evidence,cases;
    try{evidence=JSON.parse(evidenceRaw||'[]');cases=JSON.parse(casesRaw||'[]');if(!Array.isArray(evidence)||!Array.isArray(cases))throw new Error()}catch{return{ok:false,reason:'invalid-storage',changed:0}}
    if(!audit())return{ok:false,reason:'audit-unavailable',changed:0};
    const changedKeys=new Map();let changed=0;
    try{
      for(const c of changes){
        const e=evidence.find(e=>String(e.id)===String(c.id)&&isLineage(e));
        if(!e)throw new Error('no-match');
        const result=audit().append(e,c,cases.flatMap(cs=>cs.evidence||[]));
        if(result.changed){changedKeys.set(matchKey(e),result.evidence);changed++}
      }
      if(!changed)return{ok:true,changed:0,summary:verificationSummaryForEvidence(evidence)};
      evidence=evidence.map(e=>{const update=changedKeys.get(matchKey(e));return update?{...e,verification:update.verification,verificationHistory:update.verificationHistory}:e});
      cases.forEach(cs=>{cs.evidence=(cs.evidence||[]).map(e=>{const update=changedKeys.get(matchKey(e));return update?{...e,verification:{...update.verification},verificationHistory:JSON.parse(JSON.stringify(update.verificationHistory))}:e});cs.verificationSummary=verificationSummaryForEvidence(cs.evidence);cs.verificationAuditSummary=audit().summary(cs.evidence.filter(isLineage))});
    }catch(error){return{ok:false,reason:error.message,changed:0}}
    if(localStorage.getItem(KEYS.evidence)!==evidenceRaw||localStorage.getItem(KEYS.cases)!==casesRaw)return{ok:false,reason:'stale-review',changed:0};
    if(!write(KEYS.evidence,evidence))return{ok:false,reason:'evidence-storage',changed:0};
    if(!write(KEYS.cases,cases)){try{evidenceRaw===null?localStorage.removeItem(KEYS.evidence):localStorage.setItem(KEYS.evidence,evidenceRaw);casesRaw===null?localStorage.removeItem(KEYS.cases):localStorage.setItem(KEYS.cases,casesRaw)}catch{return{ok:false,reason:'rollback-failed',changed:0}}return{ok:false,reason:'case-storage',changed:0}};
    write(KEYS.view,'evidence');const result={ok:true,changed,summary:verificationSummaryForEvidence(evidence)};
    if(!reload){window.SOUTU_V9?.refreshEvidence?.();decorateCurrentView();toast('Evidence 核验已保存',`${changed} 条记录已同步 Evidence / Case`,'ok');return result}
    try{sessionStorage.setItem(SESSION_KEY,JSON.stringify(result))}catch{}location.reload();return result
  }

  function stageHistory(card,action,targetEventId){
    const e=workspaceItems.find(x=>String(x.id)===card.dataset.verificationId);if(!e)return;
    const events=audit().historyOf(e),target=action==='undo'?events.at(-1):events.find(h=>h.id===targetEventId);
    const decision=action==='undo'?target?.before:target?.after;if(!decision)return;
    card.querySelector('[data-review-status]').value=decision.status;card.querySelector('[data-review-note]').value=decision.note;
    card.querySelector('[data-review-conflict]').checked=decision.conflict;card.querySelector('[data-review-finalized]').checked=Boolean(decision.finalized);
    stagedActions.set(String(e.id),{action,targetEventId:target.id});card.querySelector('[data-review-staged]').textContent=`已准备${action==='undo'?'撤销':'恢复'} #${target.sequence}；填写理由并保存后生效。`;
  }
  function saveWorkspace(){
    const reviewer=document.getElementById('verificationReviewer').value.trim();
    const changes=[...document.querySelectorAll('#verificationList [data-verification-id]')].map(card=>{
      const e=workspaceItems.find(x=>String(x.id)===card.dataset.verificationId);
      return{id:card.dataset.verificationId,status:card.querySelector('[data-review-status]').value,conflict:card.querySelector('[data-review-conflict]').checked,finalized:card.querySelector('[data-review-finalized]').checked,note:card.querySelector('[data-review-note]').value,reviewer,reason:card.querySelector('[data-review-reason]').value,expectedRevision:audit().revision(e),...stagedActions.get(String(e.id))}
    });
    const r=applyVerificationChanges(changes);
    if(r?.ok){closeWorkspace();if(!r.changed)toast('没有核验变更','未新增审核记录。','ok')}
    else toast('核验保存失败',r.reason==='stale-review'?'记录已在其他页面更新，请重新打开核验工作区。':r.reason==='reviewer-and-reason-required'?'请填写审核人和每条修改的理由。':`未保存：${r.reason}`,'error')
  }

  function decorateEvidenceView(){
    const list=document.querySelector('#v9Body .v9-evidence-list');if(!list)return;const evidence=read(KEYS.evidence,[]),articles=[...list.querySelectorAll(':scope>article')];articles.forEach((article,i)=>{const e=evidence[i];if(!isLineage(e))return;article.dataset.verificationEvidence=e.id||'';let badge=article.querySelector('.evidence-review-badge');if(!badge){badge=document.createElement('span');badge.className='evidence-review-badge';article.querySelector('div')?.appendChild(badge)}const r=reviewOf(e),m=statusMeta(r.status);badge.className=`evidence-review-badge ${m.tone}${r.conflict?' conflict':''}`;badge.textContent=`${m.cn}${r.conflict?' · 冲突':''}${r.finalized?' · 最终裁定':''} · ${(audit()?.historyOf(e)||[]).length} 次记录`;badge.title=r.note||m.label});
    const head=document.querySelector('#v9Body .v9-evidence-head');if(head&&!head.querySelector('[data-open-verification]')){const b=document.createElement('button');b.type='button';b.className='secondary-btn evidence-verify-btn';b.dataset.openVerification='1';b.textContent='核验证据';head.appendChild(b)}
  }

  function decorateCasesView(){
    const cases=read(KEYS.cases,[]),map=new Map(cases.map(c=>[String(c.id),c]));document.querySelectorAll('#v9Body [data-case-id]').forEach(card=>{const c=map.get(String(card.dataset.caseId));if(!c)return;let box=card.querySelector('.case-verification-summary');if(!box){box=document.createElement('div');box.className='case-verification-summary';card.querySelector('div')?.appendChild(box)}const s=c.verificationSummary||verificationSummaryForEvidence(c.evidence||[]),a=audit()?.summary((c.evidence||[]).filter(isLineage));box.innerHTML=`<span>${s.verified||0} 已确认</span><span>${s.rejected||0} 已否决</span><span>${s.inconclusive||0} 证据不足</span><span>${s.needsReview||0} 待复核</span>${s.conflicts?`<span>${s.conflicts} 冲突</span>`:''}${a?`<span>${a.events} 审计记录</span><span>${a.finalized} 最终裁定</span>`:''}`})
  }
  function decorateCurrentView(){decorateEvidenceView();decorateCasesView()}

  function reportRows(){return lineageEvidence().map(e=>({e,l:e.lineage||{},r:reviewOf(e)}))}
  function appendVerificationReport(target=document.getElementById('v9PrintReport')){
    if(!target||target.querySelector('.verification-report-section'))return 0;const rows=reportRows();if(!rows.length)return 0;const s=summary(rows.map(x=>x.e));target.insertAdjacentHTML('beforeend',`<section class="verification-report-section"><h2>Evidence Verification</h2><p>人工核验状态与自动推断分开保存；“Verified”只表示审核者确认当前候选关系/方向，不代表自动取得原创权属结论。</p><div class="verification-report-summary"><b>${s.verified} 已确认</b><span>${s.rejected} 已否决</span><span>${s.inconclusive} 证据不足</span><span>${s.needsReview} 待复核</span>${s.conflicts?`<span>${s.conflicts} 冲突标记</span>`:''}</div><table><thead><tr><th>图片家族</th><th>节点</th><th>自动推断</th><th>人工状态</th><th>冲突</th><th>人工备注</th><th>审核时间</th></tr></thead><tbody>${rows.map(({e,l,r})=>{const m=statusMeta(r.status);return`<tr><td>${esc(l.familyLabel||l.familyId||'')}</td><td><b>${esc(e.title||l.title||'')}</b><small>${esc(l.role==='candidate-root'?'候选根节点':l.relationType||'衍生版本')}</small></td><td>${esc(l.directionState||'')}<small>${esc(l.directionReason||'')}</small></td><td><b>${esc(m.cn)}${r.finalized?' · 最终裁定':''}</b><small>${esc(m.label)}</small></td><td>${r.conflict?'是':'否'}</td><td>${esc(r.note||'')}</td><td>${esc(fmt(r.reviewedAt))}</td></tr>`}).join('')}</tbody></table></section>`);appendAuditReport(target);return rows.length
  }
  function appendAuditReport(target=document.getElementById('v9PrintReport')){
    if(!target||target.querySelector('.verification-audit-report')||!audit())return 0;
    const items=lineageEvidence(),events=items.flatMap(e=>audit().historyOf(e).map(h=>({e,h})));if(!events.length)return 0;
    target.insertAdjacentHTML('beforeend',`<section class="verification-report-section verification-audit-report"><h2>Verification Audit Trail</h2><p>每次修改、撤销和恢复均保留前后快照。旧版仅能保留迁移时的最后一次核验结果。审核人由用户填写，记录保存在本机浏览器。</p><table><thead><tr><th>图片家族 / 节点</th><th>操作 / 编号</th><th>审核人 / 时间</th><th>前状态 / 后状态</th><th>修改理由</th><th>前备注 / 后备注</th></tr></thead><tbody>${events.map(({e,h})=>`<tr><td>${esc(e.lineage?.familyLabel||'')}<br>${esc(e.title)}</td><td>${esc(h.action)} #${esc(h.sequence)}${h.targetEventId?`<small>目标：${esc(h.targetEventId)}</small>`:''}</td><td>${esc(h.reviewer)}<br>${esc(fmt(h.at))}</td><td>${h.before?esc(statusMeta(h.before.status).cn):'旧版快照，无前态'} → ${esc(statusMeta(h.after.status).cn)}<small>冲突：${h.before?.conflict?'是':'否'} → ${h.after.conflict?'是':'否'}；最终裁定：${h.before?.finalized?'是':'否'} → ${h.after.finalized?'是':'否'}</small></td><td>${esc(h.reason)}</td><td>${esc(h.before?.note||'—')}<br>→ ${esc(h.after.note||'—')}</td></tr>`).join('')}</tbody></table></section>`);return events.length
  }
  function exportAudit(format='json'){
    if(!audit())return;const items=lineageEvidence(),cases=read(KEYS.cases,[]);
    const text=format==='csv'?audit().csv(items,cases):JSON.stringify(audit().payload(items,cases),null,2),a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([text],{type:format==='csv'?'text/csv;charset=utf-8':'application/json'}));a.download=`soutu-verification-audit-${Date.now()}.${format==='csv'?'csv':'json'}`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)
  }
  function setupObservers(){
    const body=document.getElementById('v9Body');if(body&&!bodyObserver){bodyObserver=new MutationObserver(()=>queueMicrotask(decorateCurrentView));bodyObserver.observe(body,{childList:true,subtree:false})}
    const report=document.getElementById('v9PrintReport');if(report&&!reportObserver){reportObserver=new MutationObserver(()=>{if(enhancingReport||!report.innerHTML||report.querySelector('.verification-report-section'))return;enhancingReport=true;try{appendVerificationReport(report)}finally{enhancingReport=false}});reportObserver.observe(report,{childList:true,subtree:false})}
  }
  function resumeSaved(){let x=null;try{x=JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null');sessionStorage.removeItem(SESSION_KEY)}catch{}if(x?.ok)setTimeout(()=>{window.SOUTU_BRIDGE?.setView?.('research');toast('Evidence 核验已保存',`${x.changed} 条记录已同步 Evidence / Case`,'ok')},0)}
  function exportVerification(){const items=lineageEvidence(),payload={schema:'soutu-pro.evidence-verification.v1',generatedAt:new Date().toISOString(),summary:summary(items),items:items.map(e=>({id:e.id,title:e.title,url:e.url,lineageKey:e.lineageKey,lineage:e.lineage,verification:reviewOf(e),verificationHistory:audit()?.historyOf(e)||[]}))};const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));a.download=`soutu-evidence-verification-${Date.now()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}

  function mount(){document.addEventListener('keydown',e=>{const modal=document.getElementById(MODAL_ID);if(!modal||modal.classList.contains('hidden'))return;if(e.key==='Escape'){e.preventDefault();closeWorkspace()}if(e.key==='Tab'){const nodes=[...modal.querySelectorAll('button:not(:disabled),input,select,textarea,summary')].filter(x=>x.getClientRects().length);const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}});injectStyle();ensureModal();setupObservers();decorateCurrentView();resumeSaved();document.addEventListener('input',e=>{const card=e.target.closest('[data-verification-id]');if(card&&e.target.matches('[data-review-status],[data-review-note],[data-review-conflict],[data-review-finalized]')){stagedActions.delete(card.dataset.verificationId);card.querySelector('[data-review-staged]').textContent=''}});document.addEventListener('click',e=>{if(e.target.closest('[data-open-verification]'))return openWorkspace();if(e.target.closest('[data-verification-close]')||e.target===document.getElementById(MODAL_ID))return closeWorkspace();if(e.target.closest('[data-verification-export]'))return exportVerification();if(e.target.closest('[data-verification-save]'))return saveWorkspace();const exportButton=e.target.closest('[data-audit-export]');if(exportButton)return exportAudit(exportButton.dataset.auditExport);const card=e.target.closest('[data-verification-id]');if(card&&e.target.closest('[data-audit-undo]'))return stageHistory(card,'undo');const restore=e.target.closest('[data-audit-restore]');if(card&&restore)return stageHistory(card,'restore',restore.dataset.auditRestore)});}

  window.SOUTU_EVIDENCE_VERIFICATION={STATUS,reviewOf,summary,lineageEvidence,applyVerificationChanges,appendVerificationReport,appendAuditReport,exportAudit,open:openWorkspace,exportJson:exportVerification,decorate:decorateCurrentView};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
