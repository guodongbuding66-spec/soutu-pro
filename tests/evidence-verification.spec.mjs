import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

const evidence=[
  {id:'e-root',title:'Original A',url:'https://origin.example/item',domain:'origin.example',capturedAt:1,kind:'provenance-lineage',lineageKey:'f1|root',lineage:{schema:'soutu-pro.provenance-lineage.v1',familyId:'f1',familyLabel:'图片家族 1',role:'candidate-root',title:'Original A',relationType:'Original candidate',relationConfidence:'100%',directionState:'candidate-root',directionReason:'来源证据最高候选；不代表已验证原创',date:'2025-03-01',source:'origin.example',url:'https://origin.example/item',reasons:'当前家族最高来源证据候选'}},
  {id:'e-crop',title:'Cropped B',url:'https://crop.example/item',domain:'crop.example',capturedAt:2,kind:'provenance-lineage',lineageKey:'f1|crop',lineage:{schema:'soutu-pro.provenance-lineage.v1',familyId:'f1',familyLabel:'图片家族 1',role:'variant',title:'Cropped B',relationType:'Cropped / reframed',relationConfidence:'88%',directionState:'时间支持',directionReason:'2025-03-01 → 2025-05-01',date:'2025-05-01',source:'crop.example',url:'https://crop.example/item',reasons:'主体 92% · 宽高比明显变化'}},
  {id:'e-water',title:'Watermarked C',url:'https://water.example/item',domain:'water.example',capturedAt:3,kind:'provenance-lineage',lineageKey:'f1|water',lineage:{schema:'soutu-pro.provenance-lineage.v1',familyId:'f1',familyLabel:'图片家族 1',role:'variant',title:'Watermarked C',relationType:'Likely text / watermark added',relationConfidence:'81%',directionState:'方向待验证',directionReason:'至少一端缺少可验证日期',date:'',source:'water.example',url:'https://water.example/item',reasons:'主体接近但边缘结构变化较多'}},
  {id:'e-early',title:'Earlier D',url:'https://earlier.example/item',domain:'earlier.example',capturedAt:4,kind:'provenance-lineage',lineageKey:'f1|early',lineage:{schema:'soutu-pro.provenance-lineage.v1',familyId:'f1',familyLabel:'图片家族 1',role:'variant',title:'Earlier D',relationType:'Modified variant',relationConfidence:'76%',directionState:'时间冲突',directionReason:'子项日期 2025-02-01 早于候选根节点 2025-03-01',date:'2025-02-01',source:'earlier.example',url:'https://earlier.example/item',reasons:'保留部分主要视觉结构'}}
];

const caseEvidence=evidence.map((e,i)=>({...e,id:`case-copy-${i}`}));

test('verification workspace persists statuses into Evidence, Case and report',async({page})=>{
  await page.addInitScript(({evidence,caseEvidence})=>{
    localStorage.setItem('soutu-pro-v9-evidence',JSON.stringify(evidence));
    localStorage.setItem('soutu-pro-v9-cases',JSON.stringify([{id:'case-1',name:'Lineage Case',createdAt:1,query:'demo',results:[],evidence:caseEvidence,weights:{visual:.5,structure:.3,text:.2}}]));
    localStorage.setItem('soutu-pro-v9-view',JSON.stringify('evidence'));
  },{evidence,caseEvidence});

  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.SOUTU_EVIDENCE_VERIFICATION));
  await expect(page.locator('#v9Body .v9-evidence-list article')).toHaveCount(4);
  await expect(page.locator('[data-open-verification]')).toHaveCount(1);
  await expect(page.locator('.evidence-review-badge')).toHaveCount(4);
  await expect(page.locator('.evidence-review-badge').first()).toContainText('待复核');

  await page.locator('[data-open-verification]').click();
  await expect(page.locator('#evidenceVerificationModal')).toBeVisible();
  await expect(page.locator('.verification-card')).toHaveCount(4);
  await expect(page.locator('#verificationSummary')).toContainText('4');
  await expect(page.locator('#verificationSummary')).toContainText('待复核');

  const root=page.locator('[data-verification-id="e-root"]');
  await root.locator('[data-review-status]').selectOption('verified');
  await root.locator('[data-review-note]').fill('人工核对发布时间与来源页面，确认其为当前候选根节点。');

  const crop=page.locator('[data-verification-id="e-crop"]');
  await crop.locator('[data-review-status]').selectOption('verified');
  await crop.locator('[data-review-note]').fill('裁切关系与时间顺序一致。');

  const water=page.locator('[data-verification-id="e-water"]');
  await water.locator('[data-review-status]').selectOption('inconclusive');
  await water.locator('[data-review-note]').fill('缺少可验证发布时间。');

  const early=page.locator('[data-verification-id="e-early"]');
  await early.locator('[data-review-status]').selectOption('rejected');
  await early.locator('[data-review-conflict]').check();
  await early.locator('[data-review-note]').fill('该节点时间早于候选根节点，拒绝当前传播方向。');

  await Promise.all([
    page.waitForNavigation({waitUntil:'domcontentloaded'}),
    page.locator('[data-verification-save]').click()
  ]);
  await page.waitForFunction(()=>Boolean(window.SOUTU_EVIDENCE_VERIFICATION));
  await expect(page.locator('[data-open-verification]')).toHaveCount(1);
  await expect(page.locator('.evidence-review-badge.verified')).toHaveCount(2);
  await expect(page.locator('.evidence-review-badge.inconclusive')).toHaveCount(1);
  await expect(page.locator('.evidence-review-badge.rejected.conflict')).toHaveCount(1);

  const stored=await page.evaluate(()=>({
    evidence:JSON.parse(localStorage.getItem('soutu-pro-v9-evidence')||'[]'),
    cases:JSON.parse(localStorage.getItem('soutu-pro-v9-cases')||'[]'),
    view:JSON.parse(localStorage.getItem('soutu-pro-v9-view')||'null')
  }));
  expect(stored.view).toBe('evidence');
  expect(stored.evidence.find(x=>x.id==='e-root')?.verification.status).toBe('verified');
  expect(stored.evidence.find(x=>x.id==='e-water')?.verification.status).toBe('inconclusive');
  expect(stored.evidence.find(x=>x.id==='e-early')?.verification).toMatchObject({status:'rejected',conflict:true});
  expect(stored.evidence.find(x=>x.id==='e-early')?.verification.note).toContain('拒绝当前传播方向');
  expect(stored.cases[0].evidence.find(x=>x.lineageKey==='f1|root')?.verification.status).toBe('verified');
  expect(stored.cases[0].evidence.find(x=>x.lineageKey==='f1|early')?.verification).toMatchObject({status:'rejected',conflict:true});
  expect(stored.cases[0].verificationSummary).toEqual({total:4,needsReview:0,verified:2,rejected:1,inconclusive:1,conflicts:1});

  await page.locator('[data-v9-mode="cases"]').click();
  await expect(page.locator('[data-case-id="case-1"] .case-verification-summary')).toContainText('2 已确认');
  await expect(page.locator('[data-case-id="case-1"] .case-verification-summary')).toContainText('1 已否决');
  await expect(page.locator('[data-case-id="case-1"] .case-verification-summary')).toContainText('1 证据不足');
  await expect(page.locator('[data-case-id="case-1"] .case-verification-summary')).toContainText('1 冲突');

  const report=await page.evaluate(()=>{
    const target=document.querySelector('#v9PrintReport');target.innerHTML='<h1>Report</h1>';
    const rows=window.SOUTU_EVIDENCE_VERIFICATION.appendVerificationReport(target);
    return{rows,html:target.innerHTML,summary:window.SOUTU_EVIDENCE_VERIFICATION.summary()};
  });
  expect(report.rows).toBe(4);
  expect(report.summary).toEqual({total:4,needsReview:0,verified:2,rejected:1,inconclusive:1,conflicts:1});
  expect(report.html).toContain('Evidence Verification');
  expect(report.html).toContain('自动推断');
  expect(report.html).toContain('人工状态');
  expect(report.html).toContain('已确认');
  expect(report.html).toContain('已否决');
  expect(report.html).toContain('证据不足');
  expect(report.html).toContain('拒绝当前传播方向');
  expect(report.html).not.toContain('已验证原创');

  await page.locator('[data-v9-mode="evidence"]').click();
  await page.locator('[data-open-verification]').click();
  const [download]=await Promise.all([
    page.waitForEvent('download'),
    page.locator('[data-verification-export]').click()
  ]);
  expect(download.suggestedFilename()).toMatch(/^soutu-evidence-verification-\d+\.json$/);
  const exported=JSON.parse(await readFile(await download.path(),'utf8'));
  expect(exported.schema).toBe('soutu-pro.evidence-verification.v1');
  expect(exported.summary).toEqual({total:4,needsReview:0,verified:2,rejected:1,inconclusive:1,conflicts:1});
  expect(exported.items.find(x=>x.id==='e-early')?.verification).toMatchObject({status:'rejected',conflict:true});
});
