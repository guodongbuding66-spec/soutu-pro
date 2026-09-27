# Design QA · 搜图 Pro V8

- source visual truth: `/mnt/data/QQ_1790470700867.png` (user-provided current/baseline engine chooser; redesign target is intentional improvement, not pixel fidelity)
- implementation screenshot: `/mnt/data/soutu-pro/qa-engines-desktop.png`
- comparison image: `/mnt/data/soutu-pro/design-compare.png`
- desktop viewport: 1440 × 1000 CSS px, deviceScaleFactor 1
- mobile viewport: 390 × 844 CSS px, deviceScaleFactor 1
- state: local image loaded, 商品找同款 preset, 4 selected engines

## Full-view comparison evidence
Baseline problems: card text collides, capability wording is repeated and italicized, selected state is weak, external-open controls sit awkwardly, section grouping is visually thin, and four-column content becomes hard to scan.

V8 changes: group panels and semantic headers, consistent 42px engine marks, compact capability pills, fixed title/description/help hierarchy, dedicated selection check, separated external-open control, group selection controls, compact sticky command bar.

## Focused surfaces
- Fonts/typography: card titles increased to 14px, descriptions to 12px; no italic status text; wrapping is bounded.
- Spacing/layout: consistent 15px card padding; responsive minmax grid; grouped panels; 44px action targets preserved.
- Colors/tokens: primary blue only indicates action/selection; warning amber only means manual upload; success green only means direct capability.
- Image/assets: UI uses the existing SVG sprite and letter marks; no emoji or placeholder raster assets.
- Copy/content: manual upload wording shortened to `手动`; detailed explanation moved to helper text to prevent title-line collision.

## Interaction QA
- engine group select / clear: passed
- card toggle: passed
- settings modal: passed
- auto preset toggle present and defaults on
- upload → workbench: passed
- desktop/mobile horizontal overflow: none
- browser page errors during tested states: none

## Comparison history
### Iteration 1
Finding: original engine cards used DOM class names that did not match the CSS design system, causing raw inline-looking layout and text collision.
Fix: replaced engine rendering markup and added a single coherent V8 engine-card system.
Post-fix evidence: `qa-engines-desktop.png`, `qa-engines-mobile.png`, `design-compare.png`.

## Residual gaps
External CDN models, Cloudflare R2, SerpAPI and live third-party search pages require network/account configuration and were not end-to-end exercised in this container.

final result: passed