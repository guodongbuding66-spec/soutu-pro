export async function openKeywordSearch(page,query){
  await page.locator('#keywordSearchTab').click();
  if(query!==undefined)await page.locator('#keywordQuery').fill(query);
}
export async function openKeywordOptions(page){
  const details=page.locator('.keyword-options');
  if(await details.getAttribute('open')===null)await details.locator('summary').click();
}
export async function openResultTools(page){
  const details=page.locator('.result-advanced-actions');
  if(await details.getAttribute('open')===null)await details.locator('summary').click();
}
export async function showAllEngines(page){
  if(await page.locator('#engineExpandBtn').getAttribute('aria-expanded')!=='true')await page.locator('#engineExpandBtn').click();
}
export async function revealFixtureAnalysis(page){
  await page.evaluate(()=>document.querySelector('#researchPanel').classList.remove('hidden'));
  const details=page.locator('#analysisDetails');
  if(await details.getAttribute('open')===null)await details.locator('summary').click();
}
