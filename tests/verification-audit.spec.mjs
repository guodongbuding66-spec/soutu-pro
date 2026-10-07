import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
// Fixture mutations must not be reset by an unrelated PWA installation reload.
test.use({serviceWorkers:'block'});
const evidence={id:'audit-e',title:'Audit candidate',url:'https://origin.example/photo',lineageKey:'audit-family|candidate-root|Audit candidate|https://origin.example/photo|Original candidate|candidate-root',kind:'provenance-lineage',lineage:{familyId:'audit-family',familyLabel:'Audit family',role:'candidate-root',title:'Audit candidate',url:'https://origin.example/photo',relationType:'Original candidate',directionState:'candidate-root',directionReason:'仅为候选'}};
async function seed(page){
  await page.addInitScript(e=>{if(sessionStorage.getItem('audit-seeded'))return;sessionStorage.setItem('audit-seeded','1');localStorage.setItem('soutu-pro-v9-evidence',JSON.stringify([e]));localStorage.setItem('soutu-pro-v9-cases',JSON.stringify([{id:'audit-case',name:'Audit Case',evidence:[{...e,id:'case-copy'}],results:[],weights:{visual:.5,structure:.3,text:.2}}]));localStorage.setItem('soutu-pro-v9-view',JSON.stringify('evidence'))},evidence);
  await page.goto('http://127.0.0.1:4173/');await page.waitForFunction(()=>window.SOUTU_EVIDENCE_VERIFICATION&&window.SOUTU_VERIFICATION_AUDIT);await research(page);
}
async function research(page){await page.getByRole('button',{name:'研究',exact:true}).click();}
async function open(page){await page.locator('[data-v9-mode="evidence"]').click();await page.locator('[data-open-verification]').click();await expect(page.locator('#evidenceVerificationModal')).toBeVisible();}
async function save(page,reviewer,reason){await page.locator('#verificationReviewer').fill(reviewer);await page.locator('[data-review-reason]').fill(reason);await Promise.all([page.waitForNavigation(),page.locator('[data-verification-save]').click()]);await page.waitForFunction(()=>window.SOUTU_EVIDENCE_VERIFICATION);await research(page);}
const stored=page=>page.evaluate(()=>({e:JSON.parse(localStorage.getItem('soutu-pro-v9-evidence'))[0],cases:JSON.parse(localStorage.getItem('soutu-pro-v9-cases'))}));

test('audit UI appends reviews, undo and restore; Case, real report and downloaded exports retain history',async({page})=>{
  await seed(page);await open(page);
  await page.locator('[data-review-status]').selectOption('verified');await page.locator('[data-review-note]').fill('First source verified');await page.locator('[data-review-finalized]').check();await save(page,'Alice','Original source checked');
  let data=await stored(page);const first=data.e.verificationHistory[0];expect(data.e.verification.finalized).toBe(true);expect(first.before.status).toBe('needs-review');
  await open(page);await page.locator('[data-review-status]').selectOption('rejected');await page.locator('[data-review-conflict]').check();await page.locator('[data-review-note]').fill('Earlier publication found');await save(page,'Bob','Earlier date conflicts with candidate');
  data=await stored(page);const second=data.e.verificationHistory[1];expect(data.e.verificationHistory).toHaveLength(2);expect(data.e.verificationHistory[0]).toEqual(first);
  await open(page);await page.locator('.verification-history summary').click();await page.locator('[data-audit-undo]').click();await expect(page.locator('[data-review-status]')).toHaveValue('verified');await expect(page.locator('[data-review-staged]')).toContainText('撤销');await save(page,'Silvia','Date was incorrectly interpreted');
  data=await stored(page);expect(data.e.verificationHistory).toHaveLength(3);expect(data.e.verificationHistory[2]).toMatchObject({action:'undo',targetEventId:second.id});expect(data.e.verification.conflict).toBe(false);
  await open(page);await page.locator('.verification-history summary').click();await page.locator(`[data-audit-restore="${second.id}"]`).click();await save(page,'Silvia','Restored decision after further research');
  data=await stored(page);expect(data.e.verificationHistory).toHaveLength(4);expect(data.e.verificationHistory[3]).toMatchObject({action:'restore',targetEventId:second.id});expect(data.e.lineage).toEqual(evidence.lineage);expect(data.cases[0].evidence[0].verificationHistory).toEqual(data.e.verificationHistory);expect(data.cases[0].verificationAuditSummary).toEqual({events:4,finalized:1,reversals:2});

  await page.locator('[data-v9-mode="cases"]').click();await expect(page.locator('.case-verification-summary')).toContainText('4 审计记录');await page.evaluate(()=>{const cases=JSON.parse(localStorage.getItem('soutu-pro-v9-cases'));const e=cases[0].evidence[0];e.verification=e.verificationHistory[0].after;e.verificationHistory=e.verificationHistory.slice(0,1);localStorage.setItem('soutu-pro-v9-cases',JSON.stringify(cases))});await page.locator('[data-case-open="audit-case"]').click();await page.locator('[data-v9-mode="evidence"]').click();expect((await stored(page)).e.verificationHistory).toHaveLength(4);expect((await stored(page)).cases[0].evidence[0].verificationHistory).toHaveLength(4);
  await page.evaluate(()=>{window.print=()=>{window.__auditPrinted=document.querySelector('#v9PrintReport').innerHTML}});await page.locator('#v9Print').click();await page.waitForFunction(()=>window.__auditPrinted?.includes('Verification Audit Trail'));
  const report=await page.evaluate(()=>window.__auditPrinted);for(const text of ['Alice','Bob','Silvia','First source verified','Earlier publication found','Restored decision after further research','最终裁定'])expect(report).toContain(text);
  await open(page);await page.locator('.verification-history summary').click();await expect(page.locator('.verification-history li')).toHaveCount(4);
  for(const format of ['json','csv']){const [download]=await Promise.all([page.waitForEvent('download'),page.locator(`[data-audit-export="${format}"]`).click()]);const text=await readFile(await download.path(),'utf8');expect(download.suggestedFilename()).toMatch(new RegExp(`^soutu-verification-audit-\\d+\\.${format}$`));if(format==='json'){const p=JSON.parse(text);expect(p.schema).toBe('soutu-pro.verification-audit.v1');expect(p.items[0].history).toHaveLength(4);expect(p.items[0].cases[0].id).toBe('audit-case')}else{expect(text).toContain('target_event_id');expect(text).toContain('Restored decision after further research')}}
  await expect(page.locator('.toast')).toHaveCount(0,{timeout:10000});await page.screenshot({path:'test-results/verification-audit-desktop.png'});await page.locator('[data-verification-close]').last().click();await page.emulateMedia({media:'print'});await page.pdf({path:'test-results/verification-audit-report.pdf',format:'A4',printBackground:true});
});

test('invalid save, no-op, cancel and stale workspace cannot alter audit history',async({page})=>{
  await seed(page);await open(page);await page.locator('[data-review-status]').selectOption('verified');await page.locator('[data-verification-save]').click();await expect(page.locator('#evidenceVerificationModal')).toBeVisible();expect((await stored(page)).e.verificationHistory).toBeUndefined();
  await save(page,'Alice','Checked source');let data=await stored(page);const first=data.e.verificationHistory;
  await open(page);await page.locator('[data-verification-save]').click();await expect(page.locator('#evidenceVerificationModal')).toBeHidden();expect((await stored(page)).e.verificationHistory).toEqual(first);
  await open(page);await page.locator('.verification-history summary').click();await page.locator('[data-audit-undo]').click();await page.locator('[data-verification-close]').last().click();expect((await stored(page)).e.verificationHistory).toEqual(first);
  await open(page);await page.locator('[data-review-status]').selectOption('inconclusive');await page.locator('#verificationReviewer').fill('Silvia');await page.locator('[data-review-reason]').fill('Draft review');
  await page.evaluate(()=>window.SOUTU_EVIDENCE_VERIFICATION.applyVerificationChanges([{id:'audit-e',status:'rejected',reviewer:'Other tab',reason:'New evidence'}],{reload:false}));
  await page.locator('[data-verification-save]').click();await expect(page.locator('#evidenceVerificationModal')).toBeVisible();data=await stored(page);expect(data.e.verification.status).toBe('rejected');expect(data.e.verificationHistory).toHaveLength(2);expect(data.e.verificationHistory[1].reviewer).toBe('Other tab');
});

test('re-importing lineage preserves review and audit identity',async({page})=>{
  await seed(page);await page.waitForFunction(()=>window.SOUTU_PROVENANCE_LINEAGE);
  const result=await page.evaluate(()=>{const V=window.SOUTU_EVIDENCE_VERIFICATION;V.applyVerificationChanges([{id:'audit-e',status:'verified',reviewer:'Alice',reason:'Checked'}],{reload:false});const old=JSON.parse(localStorage.getItem('soutu-pro-v9-evidence'))[0];const merged=window.SOUTU_PROVENANCE_LINEAGE.mergeLineageEvidence([old],[{...old,id:'fresh-id',verification:undefined,verificationHistory:undefined}]);return{old,merged}});
  expect(result.merged).toHaveLength(1);expect(result.merged[0].id).toBe('audit-e');expect(result.merged[0].verificationHistory).toEqual(result.old.verificationHistory);
  const handoff=await page.evaluate(()=>{const e=JSON.parse(localStorage.getItem('soutu-pro-v9-evidence'))[0];const payload={schema:'soutu-pro.provenance-lineage.v1',rows:[e.lineage],summary:{families:1,relations:0}};const result=window.SOUTU_PROVENANCE_LINEAGE.handoffToHub({mode:'new',caseName:'Re-import Case',payload,reload:false});return{result,e:JSON.parse(localStorage.getItem('soutu-pro-v9-evidence'))[0],c:JSON.parse(localStorage.getItem('soutu-pro-v9-cases'))[0]}});expect(handoff.result.ok).toBe(true);expect(handoff.e.verificationHistory).toEqual(result.old.verificationHistory);expect(handoff.c.evidence[0].verificationHistory).toEqual(result.old.verificationHistory);
});

test('mobile audit workspace stays within viewport and can review',async({page})=>{
  await page.setViewportSize({width:390,height:844});await seed(page);await open(page);await expect(page.locator('#verificationReviewer')).toBeVisible();const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);expect(overflow).toBe(false);
  await page.locator('[data-review-status]').selectOption('inconclusive');await save(page,'Silvia','Awaiting original publication');await open(page);await page.locator('.verification-history summary').click();await expect(page.locator('.verification-history li')).toHaveCount(1);const footer=await page.locator('.verification-footer').boundingBox();expect(footer.y+footer.height).toBeLessThanOrEqual(844);await expect(page.locator('.toast')).toHaveCount(0,{timeout:10000});await page.screenshot({path:'test-results/verification-audit-mobile.png'});
});
