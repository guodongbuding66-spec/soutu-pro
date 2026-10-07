(() => {
  'use strict';
  const SCHEMA = 'soutu-pro.verification-audit.v1';
  const statuses = new Set(['needs-review', 'verified', 'rejected', 'inconclusive']);
  const clone = value => JSON.parse(JSON.stringify(value));
  const keyOf = e => {
    if (e?.lineageKey) return String(e.lineageKey);
    if (e?.lineage) return ['familyId','role','title','url','relationType','directionState'].map(k => String(e.lineage[k] || '')).join('|');
    return `evidence:${e?.id || ''}`;
  };
  const snapshot = value => ({
    status: statuses.has(value?.status) ? value.status : 'needs-review',
    note: String(value?.note || '').trim().slice(0, 1200),
    conflict: Boolean(value?.conflict),
    finalized: statuses.has(value?.status) && value.status !== 'needs-review' && Boolean(value?.finalized),
    reviewer: String(value?.reviewer || '').trim().slice(0, 120),
    reviewedAt: Number(value?.reviewedAt) || 0
  });
  const sameDecision = (a, b) => ['status','note','conflict','finalized'].every(k => snapshot(a)[k] === snapshot(b)[k]);
  const hash = value => { let n = 2166136261; for (const c of value) n = Math.imul(n ^ c.charCodeAt(0), 16777619); return (n >>> 0).toString(16); };
  function historyOf(e) {
    if (Array.isArray(e?.verificationHistory) && e.verificationHistory.length) return clone(e.verificationHistory);
    const after = snapshot(e?.verification);
    if (!after.reviewedAt && sameDecision(after, {})) return [];
    // A legacy snapshot is not a fabricated account of earlier changes.
    return [{schema: SCHEMA, id: `legacy-${hash(keyOf(e) + JSON.stringify(after))}`, sequence: 0,
      action: 'legacy-baseline', at: after.reviewedAt, reviewer: after.reviewer || '旧版记录（审核人未知）',
      reason: '旧版核验快照；早期修改历史不可恢复', before: null, after}];
  }
  function canonical(e, copies = []) {
    const events = new Map();
    for (const item of [e, ...copies].filter(x => keyOf(x) === keyOf(e))) {
      for (const event of historyOf(item)) {
        if (events.has(event.id) && JSON.stringify(events.get(event.id)) !== JSON.stringify(event)) throw new Error('audit-event-conflict');
        events.set(event.id, event);
      }
    }
    const history = [...events.values()].sort((a,b) => a.sequence - b.sequence || a.at - b.at || a.id.localeCompare(b.id));
    const sequences=new Set();for(const h of history){if(h.sequence>0&&sequences.has(h.sequence))throw new Error('audit-sequence-conflict');sequences.add(h.sequence)}
    const latest = history.at(-1);
    return {...e, verification: snapshot(latest?.after || e.verification), verificationHistory: history};
  }
  const revision = e => JSON.stringify({verification: snapshot(e?.verification), history: historyOf(e)});
  function append(e, change, copies = []) {
    const current = canonical(e, copies);
    if (change.expectedRevision !== undefined && change.expectedRevision !== revision(current)) throw new Error('stale-review');
    const action = change.action || 'review';
    if (!['review','undo','restore'].includes(action)) throw new Error('invalid-action');
    let decision = change;
    let targetEventId = '';
    if (action !== 'review') {
      const target = action === 'undo' ? current.verificationHistory.at(-1) : current.verificationHistory.find(x => x.id === change.targetEventId);
      if (!target || (action === 'undo' && !target.before)) throw new Error('no-restore-target');
      decision = action === 'undo' ? target.before : target.after;
      targetEventId = target.id;
    } else if (!statuses.has(change.status)) throw new Error('invalid-status');
    const before = snapshot(current.verification), after = snapshot(decision);
    if (sameDecision(before, after)) return {evidence: current, changed: false};
    const reviewer = String(change.reviewer || '').trim().slice(0,120);
    const reason = String(change.reason || '').trim().slice(0,1200);
    if (!reviewer || !reason) throw new Error('reviewer-and-reason-required');
    const at = Date.now();
    after.reviewer = reviewer; after.reviewedAt = at;
    const event = {schema: SCHEMA, id: crypto.randomUUID?.() || `${at}-${Math.random().toString(16).slice(2)}`,
      sequence: Math.max(0, ...current.verificationHistory.map(x => x.sequence)) + 1,
      evidenceKey: keyOf(e), action, at, reviewer, reason, before, after, ...(targetEventId ? {targetEventId} : {})};
    return {evidence: {...current, verification: after, verificationHistory: [...current.verificationHistory, event]}, changed: true};
  }
  function summary(items) {
    const events = items.flatMap(historyOf);
    return {events: events.length, finalized: items.filter(e => snapshot(e.verification).finalized).length,
      reversals: events.filter(x => x.action === 'undo' || x.action === 'restore').length};
  }
  function payload(items, cases = []) {
    return {schema: SCHEMA, generatedAt: new Date().toISOString(),
      disclaimer: '审核历史保存在本机浏览器，可被拥有本机访问权限的人修改；不是防篡改或服务端签名的审计记录。Verified 不等同于确认原创权属。',
      summary: summary(items), items: items.map(e => ({id: e.id, lineageKey: keyOf(e), title: e.title, url: e.url,
        lineage: e.lineage, verification: snapshot(e.verification), history: historyOf(e),
        cases: cases.filter(c => (c.evidence || []).some(x => keyOf(x) === keyOf(e))).map(c => ({id: c.id, name: c.name}))}))};
  }
  function csv(items, cases = []) {
    const head = ['evidence_id','lineage_key','title','case_ids','event_id','sequence','action','reviewer','at','reason','before','after','target_event_id'];
    const rows = payload(items,cases).items.flatMap(e => e.history.map(h => [e.id,e.lineageKey,e.title,e.cases.map(c=>c.id).join(' | '),h.id,h.sequence,h.action,h.reviewer,h.at ? new Date(h.at).toISOString() : '',h.reason,JSON.stringify(h.before),JSON.stringify(h.after),h.targetEventId || '']));
    // Protect spreadsheet users from formula execution; JSON remains the lossless export.
    const quote = value => `"${String(value ?? '').replace(/^[\s]*[=+@-]/, m => "'" + m).replace(/"/g,'""')}"`;
    return '\uFEFF' + [head,...rows].map(row => row.map(quote).join(',')).join('\r\n');
  }
  window.SOUTU_VERIFICATION_AUDIT = {SCHEMA,keyOf,snapshot,sameDecision,historyOf,canonical,revision,append,summary,payload,csv};
})();
