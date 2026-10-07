import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

test('provenance lineage renders, exports, hands off to Hub and reports evidence',async({page})=>{
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.SOUTU_PROVENANCE_LINEAGE));
  await expect(page.locator('#universalLineageBtn')).toHaveCount(1);

  await page.evaluate(()=>{
    localStorage.removeItem('soutu-pro-v9-evidence');
    localStorage.removeItem('soutu-pro-v9-cases');
    document.querySelector('#researchPanel')?.classList.remove('hidden');
    document.querySelector('#universalResearchbar')?.classList.remove('hidden');
    const insights=document.querySelector('#universalInsights');
    insights?.classList.remove('hidden');
    if(insights)insights.innerHTML=`
      <div class="provenance-top"><a href="https://origin.example/item">打开来源</a></div>
      <div class="provenance-grid">
        <article class="provenance-family-card" data-provenance-family="visual-0">
          <div class="provenance-family-head"><span>图片家族 1</span><b>4 条</b></div>
          <strong>Original A</strong>
          <div class="provenance-relation origin"><span>Original candidate</span><b>100%</b><small>Original A</small><em>当前家族最高来源证据候选</em></div>
          <div class="provenance-relation crop"><span>Cropped / reframed</span><b>88%</b><small>Cropped B</small><em>主体 92% · 宽高比明显变化</em></div>
          <div class="provenance-relation watermark"><span>Likely text / watermark added</span><b>81%</b><small>Watermarked C</small><em>主体接近但边缘结构变化较多</em></div>
          <div class="provenance-relation modified"><span>Modified variant</span><b>76%</b><small>Earlier D</small><em>保留部分主要视觉结构</em></div>
        </article>
      </div>
      <div class="provenance-timeline">
        <a href="https://origin.example/item"><time>2025-03-01</time><span>origin.example</span><b>Original A</b></a>
        <a href="https://crop.example/item"><time>2025-05-01</time><span>crop.example</span><b>Cropped B</b></a>
        <a href="https://earlier.example/item"><time>2025-02-01</time><span>earlier.example</span><b>Earlier D</b></a>
      </div>`;
    const results=document.querySelector('#productResults');
    results?.classList.remove('hidden');
    if(results)results.innerHTML=`
      <div class="universal-result-card"><a class="universal-media" href="https://origin.example/item"></a><div class="universal-result-body"><b>Original A</b></div></div>
      <div class="universal-result-card"><a class="universal-media" href="https://crop.example/item"></a><div class="universal-result-body"><b>Cropped B</b></div></div>
      <div class="universal-result-card"><a class="universal-media" href="https://watermark.example/item"></a><div class="universal-result-body"><b>Watermarked C</b></div></div>
      <div class="universal-result-card"><a class="universal-media" href="https://earlier.example/item"></a><div class="universal-result-body"><b>Earlier D</b></div></div>`;
  });

  await page.locator('#universalLineageBtn').click();
  await expect(page.locator('#universalLineagePanel')).toBeVisible();
  await expect(page.locator('#universalLineagePanel')).toContainText('版本传播链');
  await expect(page.locator('#universalLineagePanel')).toContainText('候选根节点');
  await expect(page.locator('#universalLineagePanel')).toContainText('Original A');
  await expect(page.locator('#universalLineagePanel')).toContainText('Cropped / reframed');
  await expect(page.locator('#universalLineagePanel')).toContainText('Likely text / watermark added');
  await expect(page.locator('#universalLineagePanel')).toContainText('时间支持');
  await expect(page.locator('#universalLineagePanel')).toContainText('方向待验证');
  await expect(page.locator('#universalLineagePanel')).toContainText('时间冲突');
  await expect(page.locator('#universalLineagePanel')).not.toContainText('确定原创');
  await expect(page.locator('.lineage-edge')).toHaveCount(3);
  await expect(page.locator('[data-lineage-export="json"]')).toBeEnabled();
  await expect(page.locator('[data-lineage-export="csv"]')).toBeEnabled();
  await expect(page.locator('[data-lineage-handoff]')).toBeEnabled();

  const helper=await page.evaluate(()=>({
    supported:window.SOUTU_PROVENANCE_LINEAGE.directionEvidence({time:1,date:'A'},{time:2,date:'B'}).label,
    conflict:window.SOUTU_PROVENANCE_LINEAGE.directionEvidence({time:2,date:'B'},{time:1,date:'A'}).label,
    uncertain:window.SOUTU_PROVENANCE_LINEAGE.directionEvidence({time:0,date:''},{time:2,date:'B'}).label,
    payload:window.SOUTU_PROVENANCE_LINEAGE.evidencePayload()
  }));
  expect({supported:helper.supported,conflict:helper.conflict,uncertain:helper.uncertain}).toEqual({supported:'时间支持',conflict:'时间冲突',uncertain:'方向待验证'});
  expect(helper.payload.schema).toBe('soutu-pro.provenance-lineage.v1');
  expect(helper.payload.summary).toEqual({families:1,relations:3,timeSupported:1,pending:1,timeConflicts:1});
  expect(helper.payload.disclaimer).toContain('不得视为已验证原创');
  expect(helper.payload.rows).toHaveLength(4);

  await page.locator('[data-lineage-handoff]').click();
  await expect(page.locator('#lineageHandoffModal')).toBeVisible();
  await expect(page.locator('#lineageHandoffSummary')).toContainText('4');
  await page.locator('#lineageHandoffMode').selectOption('new');
  await expect(page.locator('#lineageNewCaseRow')).toBeVisible();
  await page.locator('[data-lineage-handoff-close]').first().click();
  await expect(page.locator('#lineageHandoffModal')).toBeHidden();

  const handoff=await page.evaluate(()=>{
    const api=window.SOUTU_PROVENANCE_LINEAGE;
    const first=api.handoffToHub({mode:'new',caseName:'Lineage Case',reload:false});
    const evidence=JSON.parse(localStorage.getItem('soutu-pro-v9-evidence')||'[]');
    const cases=JSON.parse(localStorage.getItem('soutu-pro-v9-cases')||'[]');
    const second=api.handoffToHub({mode:'existing',caseId:cases[0]?.id,reload:false});
    const evidence2=JSON.parse(localStorage.getItem('soutu-pro-v9-evidence')||'[]');
    const cases2=JSON.parse(localStorage.getItem('soutu-pro-v9-cases')||'[]');
    const report=document.querySelector('#v9PrintReport');
    report.innerHTML='<h1>Report</h1>';
    const reportRows=api.appendReportEvidence(report);
    return {first,second,evidence,evidence2,cases,cases2,reportRows,reportHtml:report.innerHTML,view:localStorage.getItem('soutu-pro-v9-view')};
  });
  expect(handoff.first.ok).toBe(true);
  expect(handoff.first.rows).toBe(4);
  expect(handoff.evidence).toHaveLength(4);
  expect(handoff.evidence.every(x=>x.kind==='provenance-lineage')).toBe(true);
  expect(handoff.evidence.find(x=>x.title==='Original A')?.lineage.role).toBe('candidate-root');
  expect(handoff.evidence.find(x=>x.title==='Cropped B')?.lineage.relationType).toBe('Cropped / reframed');
  expect(handoff.evidence.find(x=>x.title==='Cropped B')?.lineage.directionState).toBe('时间支持');
  expect(handoff.evidence.find(x=>x.title==='Watermarked C')?.lineage.directionState).toBe('方向待验证');
  expect(handoff.evidence.find(x=>x.title==='Earlier D')?.lineage.directionState).toBe('时间冲突');
  expect(handoff.cases).toHaveLength(1);
  expect(handoff.cases[0].name).toBe('Lineage Case');
  expect(handoff.cases[0].evidence).toHaveLength(4);
  expect(handoff.cases[0].lineageSummary).toEqual({families:1,relations:3,timeSupported:1,pending:1,timeConflicts:1});
  expect(handoff.second.ok).toBe(true);
  expect(handoff.evidence2).toHaveLength(4);
  expect(handoff.cases2[0].evidence).toHaveLength(4);
  expect(handoff.view).toBe('"evidence"');
  expect(handoff.reportRows).toBe(4);
  expect(handoff.reportHtml).toContain('版本传播链证据');
  expect(handoff.reportHtml).toContain('Cropped / reframed');
  expect(handoff.reportHtml).toContain('时间支持');
  expect(handoff.reportHtml).toContain('方向待验证');
  expect(handoff.reportHtml).toContain('时间冲突');
  expect(handoff.reportHtml).toContain('https://crop.example/item');

  const [jsonDownload]=await Promise.all([page.waitForEvent('download'),page.locator('[data-lineage-export="json"]').click()]);
  expect(jsonDownload.suggestedFilename()).toMatch(/^soutu-lineage-\d+\.json$/);
  const json=JSON.parse(await readFile(await jsonDownload.path(),'utf8'));
  expect(json.schema).toBe('soutu-pro.provenance-lineage.v1');
  expect(json.families[0].root.title).toBe('Original A');
  expect(json.families[0].variants.map(x=>x.direction.label).sort()).toEqual(['方向待验证','时间冲突','时间支持'].sort());

  const [csvDownload]=await Promise.all([page.waitForEvent('download'),page.locator('[data-lineage-export="csv"]').click()]);
  expect(csvDownload.suggestedFilename()).toMatch(/^soutu-lineage-\d+\.csv$/);
  const csv=await readFile(await csvDownload.path(),'utf8');
  expect(csv).toContain('"family_id"');
  expect(csv).toContain('"direction_state"');
  expect(csv).toContain('"Cropped / reframed"');
  expect(csv).toContain('"时间支持"');
  expect(csv).toContain('"方向待验证"');
  expect(csv).toContain('"时间冲突"');

  await page.locator('#universalLineageBtn').click();
  await expect(page.locator('#universalLineagePanel')).toBeHidden();
  await page.locator('#universalLineageBtn').click();
  await expect(page.locator('#universalLineagePanel')).toBeVisible();
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('soutu:source-changed')));
  await expect(page.locator('#universalLineagePanel')).toBeHidden();
  await expect(page.locator('#universalLineageBtn')).not.toHaveClass(/active/);
});
