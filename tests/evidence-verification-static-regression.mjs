import fs from 'node:fs';
import assert from 'node:assert/strict';

const verification=fs.readFileSync('evidence-verification.js','utf8');
const config=fs.readFileSync('config.js','utf8');
const build=fs.readFileSync('build-static.mjs','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));

assert(verification.includes('SOUTU_EVIDENCE_VERIFICATION'),'verification public API missing');
assert(verification.includes('Evidence Verification Workspace'),'workspace heading missing');
assert(verification.includes("'needs-review'"),'needs-review state missing');
assert(verification.includes('verified'),'verified state missing');
assert(verification.includes('rejected'),'rejected state missing');
assert(verification.includes('inconclusive'),'inconclusive state missing');
assert(verification.includes('冲突 Evidence'),'conflict marker missing');
assert(verification.includes('applyVerificationChanges'),'verification persistence API missing');
assert(verification.includes("soutu-pro-v9-evidence"),'V9 evidence source missing');
assert(verification.includes("soutu-pro-v9-cases"),'V9 cases source missing');
assert(verification.includes('verificationSummary'),'Case verification summary missing');
assert(verification.includes('lineageKey'),'lineage identity sync missing');
assert(verification.includes('appendVerificationReport'),'verification report integration missing');
assert(verification.includes('自动推断'),'automatic inference separation missing');
assert(verification.includes('人工状态'),'manual status report column missing');
assert(verification.includes('soutu-pro.evidence-verification.v1'),'verification export schema missing');
assert(verification.includes('data-verification-export'),'verification JSON export control missing');
assert(verification.includes('subtree:false'),'observer must avoid self-trigger loops');
assert(verification.includes("location.reload()"),'controlled V9 state refresh missing');
assert(verification.includes('不会把候选根节点自动升级为已验证原创'),'verified originality disclaimer missing');

assert(config.includes('evidence-verification.js'),'runtime loader missing verification module');
assert(config.includes('soutu-evidence-verification'),'runtime loader id missing');
assert(build.includes("'evidence-verification.js'"),'static build missing verification asset');
assert(build.includes('id="soutu-evidence-verification"'),'standalone verification module missing');
assert(sw.includes("'/evidence-verification.js'"),'service worker cache missing verification asset');
assert(pkg.scripts.check.includes('node --check evidence-verification.js'),'syntax check missing verification module');
assert(pkg.scripts.check.includes('tests/evidence-verification-static-regression.mjs'),'static suite missing verification regression');

console.log('evidence verification static regression checks passed');
