// Runtime configuration. Vercel deployments use same-origin APIs by default.
const SOUTU_HTTP_ORIGIN = /^https?:$/.test(location.protocol) ? location.origin : '';
window.SOUTU_CONFIG = Object.assign({
  tempUploadEndpoint: SOUTU_HTTP_ORIGIN,
  tempUploadProvider: 'vercel',
  productSearchEndpoint: SOUTU_HTTP_ORIGIN,
  tempUploadTtlMinutes: 30,
  siteUrl: SOUTU_HTTP_ORIGIN,
}, window.SOUTU_CONFIG || {});