# Design QA · 搜图 Pro V9.1.1

- source visual truth: user-provided engine chooser screenshot in the current conversation, showing letter-only marks (G / B / Y / T / Gs / Bs / S / tr / A2 / IQ)
- implementation evidence: GitHub Actions artifact `qa-evidence-d3fdd0d285bac07a2815feadf7b0976ca3ce74ce`
- desktop production screenshot: `test-results/production-engine-ui-desktop-9.1.1.png`
- mobile production screenshot: `test-results/production-engine-ui-mobile-9.1.1.png`
- desktop viewport: 1440 × 1000 CSS px, deviceScaleFactor 1
- mobile viewport: 390 × 844 CSS px, deviceScaleFactor 1
- state: production `https://soutu-pro.vercel.app`, engine chooser visible, 4 selected engines
- implementation source: Vercel Production, not a local mock

## Full-view comparison evidence

The source screenshot used letter-only engine marks, which made unrelated services look like variants of one generic component and failed the requested brand recognition requirement.

The production implementation now renders service-owned artwork:
- Google Lens: Google-hosted Lens artwork
- Bing / Bing 商品: Bing-hosted favicon
- Yandex: Yandex-hosted favicon
- TinEye: TinEye-hosted favicon
- SauceNAO: SauceNAO-hosted favicon
- trace.moe: trace.moe-hosted SVG favicon
- Ascii2D: Ascii2D-hosted favicon
- IQDB: IQDB-hosted favicon

Production UI regression verifies:
- 10/10 engine cards contain decoded images with non-zero intrinsic dimensions.
- At least 8 distinct source URLs are present (Lens and Lens-shopping share a logo; Bing and Bing-shopping share a logo intentionally).
- Pixel-signature check finds at least 6 visibly distinct rendered brand images.
- Built-in engine markup contains no letter-only `short:` marks.
- Production screenshots visibly show distinct service branding.

## Required fidelity surfaces

### Fonts and typography
- Engine name, description, capability badge and helper line preserve the established V8/V9 hierarchy.
- No brand name is replaced with a glyph or emoji.
- Long names such as Bing Visual Search remain readable at desktop and mobile widths.

### Spacing and layout rhythm
- Desktop engine groups remain 4-column / 2-column / 4-column by section at the captured viewport.
- Mobile collapses to one card per row with no horizontal overflow.
- P1 found during QA: the sticky mobile search bar overlaid product cards in the long engine section.
- Fix: under 600px, `.search-bar` is now `position: static`, with reduced shadow/backdrop treatment.
- Post-fix mobile production screenshot confirms the search action follows the cards instead of covering them.

### Colors and visual tokens
- Selected state still uses the existing primary blue; manual-upload capability remains semantic amber.
- Brand imagery keeps original service colors instead of being recolored into the product accent color.
- Engine icon containers remain neutral so brand marks are identifiable.

### Image quality and asset fidelity
- Official/service-owned image URLs are loaded through the same-origin `/api/image-proxy` for predictable rendering and privacy/security controls.
- Production smoke verifies all 9 unique official icon resources return `200 image/*`.
- No built-in engine uses the old G/B/Y/T letter placeholders.
- Fallback exists only for upstream icon load failure and uses a neutral search SVG rather than a fake brand mark.

### Copy and content
- Group names, engine names and capability labels match actual behavior.
- Bing remains marked manual because the previously used direct `searchbyimage/upload` endpoint returned Bing 404; the product does not claim a direct path that was not verified.

## Functional QA

Latest GitHub Actions run for commit `d3fdd0d285bac07a2815feadf7b0976ca3ce74ce`:
- static regression: passed
- browser regression: 8 / 8 passed
- production smoke regression: passed
- production official-logo visual regression: passed
- Vercel deployment: READY

Browser coverage includes:
- local upload, dimensions, rotate, flip, crop, autocrop, contrast, sharpen, edge, upscale and perspective error/success recovery
- presets, group select/clear, native search execution links, history, projects and custom engine
- batch queue and native batch links
- OCR, visual classification, barcode detection, object detection and object-to-batch
- V9 JSON import, filter, smart dedupe, AI failure recovery, comparison, manual labels, watch/price refresh, evidence, domain grouping, source timeline, relationship graph, industrial mode, cases and exports
- browser extension collector with Product JSON-LD, page images and result links
- dark mode, command palette and 390px responsive overflow
- production Blob signed URL PUT → GET → DELETE round trip
- image proxy and URL status SSRF private-network guards
- real production official icon rendering on desktop and mobile

## Bugs found and fixed during this QA cycle

1. **P0 — Vercel deployments were silently failing while the old successful deployment remained online.**
   - Cause: `build-static.mjs` referenced nonexistent `qa-dom-result.json`.
   - Fix: removed the stale build artifact.
   - Evidence: subsequent Vercel deployments are READY.

2. **P1 — Mobile command bar covered engine cards.**
   - Cause: sticky search bar remained active on 390px layout.
   - Fix: mobile search bar returned to normal document flow.
   - Evidence: post-fix production mobile screenshot and computed-style assertion.

3. **QA infrastructure — smart-dedupe fixture gave all remote result images the same mock pixels.**
   - Effect: fingerprint dedupe correctly merged all three, while the test expected only canonical-URL duplicates.
   - Fix: use distinct image fingerprints for the supplier fixture; algorithm was not weakened to satisfy the test.

4. **QA infrastructure — service worker could intercept mocked watch/status calls.**
   - Fix: Playwright E2E contexts explicitly block service workers for deterministic API mocking.

## Residual / external limitations

- Third-party search sites can change their public routes and DOM without notice. Automated tests verify our generated links and collector behavior; they cannot guarantee Google/Bing/Yandex/TinEye will never change their own services.
- Bing URL-based direct visual-search route previously returned a real 404 and is therefore intentionally kept as manual upload rather than falsely labelled direct.
- Vercel Observability reports Node `DEP0169 url.parse()` deprecation warnings on several Functions. Repository search has zero `url.parse` usages; this warning currently originates from platform/dependency code and requests still pass smoke tests. It is not being reported as fixed.
- Optional SERPAPI aggregation remains disabled until `SERPAPI_KEY` is configured; the UI must continue to show that state rather than fake results.

## Comparison history

### Iteration 1
- Finding: letter-only brand marks did not satisfy brand fidelity.
- Fix: service-owned icon URLs and `engineBrand()` image renderer.
- Result: production visual regression confirms distinct brand artwork.

### Iteration 2
- Finding: CI screenshots used one mocked blue icon for every service, so they could not prove real production branding.
- Fix: added a separate production visual test that loads real official resources and compares pixel signatures.
- Result: passed.

### Iteration 3
- Finding: mobile sticky action bar covered the 商品视觉搜索 section in the production screenshot.
- Fix: disable sticky positioning below 600px.
- Result: passed; updated mobile production screenshot shows no overlay.

final result: passed
