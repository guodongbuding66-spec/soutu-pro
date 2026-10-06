import assert from 'node:assert/strict';

const base=process.env.SOUTU_PRO_URL||'https://soutu-pro.vercel.app';
const expectedCommit=String(process.env.SOUTU_EXPECTED_COMMIT||process.env.GITHUB_SHA||'').trim();
const stamp=Date.now();

const releaseResponse=await fetch(`${base}/release.json?qa=${stamp}`,{cache:'no-store'});
assert.equal(releaseResponse.status,200,'release.json status');
const release=await releaseResponse.json();
if(expectedCommit)assert.equal(release.commit,expectedCommit,'workbench production commit mismatch');

const [moduleResponse,configResponse]=await Promise.all([
  fetch(`${base}/price-workbench.js?qa=${stamp}`,{cache:'no-store'}),
  fetch(`${base}/config.js?qa=${stamp}`,{cache:'no-store'})
]);
assert.equal(moduleResponse.status,200,'price-workbench.js status');
assert.equal(configResponse.status,200,'config.js status');
const moduleText=await moduleResponse.text(),configText=await configResponse.text();
assert(moduleText.includes('SOUTU_PRICE_WORKBENCH'),'production workbench runtime missing');
assert(moduleText.includes('PRICE INTELLIGENCE WORKBENCH'),'production workbench UI marker missing');
assert(moduleText.includes('最佳到手价'),'production landed-price UI missing');
assert(configText.includes('price-workbench.js'),'production loader missing workbench');

console.log(JSON.stringify({passed:true,commit:release.commit,priceWorkbench:true},null,2));
