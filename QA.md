# QA · 搜图 Pro V8

## Static checks
- `node --check app.js`: passed
- `node --check worker/src/index.js`: passed
- `node --check extension/background.js`: passed
- `node --check extension/popup.js`: passed
- JS 静态 DOM ID → HTML：0 missing
- HTML duplicate IDs：0

## Browser QA
使用 Chromium + Playwright 的内存页面运行（运行环境阻止 localhost 导航，因此用内存 origin + localStorage polyfill 做浏览器渲染验证）。

### Desktop
- viewport: 1440 × 1000
- engine cards: 10
- preset cards: 5
- selected summary: 4 / 10
- upload → workbench: passed
- group select / clear: passed
- settings modal + auto preset setting: passed
- console/page errors: none
- horizontal overflow: none

### Mobile
- viewport: 390 × 844
- engine cards: single-column
- horizontal overflow: none
- sticky top navigation remains usable
- selected state / badges / external-open control remain readable

## Functional coverage
V5–V8 feature code is present for temporary image URL, preprocessing, OCR/classification/object/barcode analysis, auto task recommendation, detected-object batch tasks, batch/CSV/projects/history/PWA, marketplace search, product aggregation, supplier aggregation and Manifest V3 extension.

## External dependencies not testable offline
- Tesseract / TensorFlow / COCO-SSD / OpenCV CDN model downloads
- Cloudflare R2 runtime
- SerpAPI live responses
- Third-party reverse-search sites and popup policies


## Vercel Functions

- `node --check` passed for `api/temp-token.js`, `api/product-search.js`, `api/supplier-search.js`, and `api/cleanup.js`.
- Vercel Blob signed-upload flow is wired for browser-direct uploads up to the product 20 MB limit.
- Live Blob / SerpAPI calls still require the Vercel project store and optional `SERPAPI_KEY`, so they cannot be end-to-end verified before a real deployment exists.