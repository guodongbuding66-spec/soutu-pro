// Runtime configuration. Vercel deployments use same-origin APIs by default.
const SOUTU_HTTP_ORIGIN = /^https?:$/.test(location.protocol) ? location.origin : '';
window.SOUTU_CONFIG = Object.assign({
  tempUploadEndpoint: SOUTU_HTTP_ORIGIN,
  tempUploadProvider: 'vercel',
  productSearchEndpoint: SOUTU_HTTP_ORIGIN,
  tempUploadTtlMinutes: 30,
  siteUrl: SOUTU_HTTP_ORIGIN,
}, window.SOUTU_CONFIG || {});

// Optional feature modules are loaded outside the main app bundle so they can be
// tested and rolled back independently without touching the core search runtime.
function loadSoutuFeature(src,id){
  if(document.getElementById(id))return;
  const script=document.createElement('script');
  script.id=id;
  script.src=src;
  script.async=false;
  document.head.appendChild(script);
}
const loadSoutuFeatures=()=>{
  const version=document.querySelector('meta[name="soutu-version"]')?.content||'9.4.7';
  loadSoutuFeature(`./price-intelligence.js?v=${encodeURIComponent(version)}`,'soutu-price-intelligence');
  loadSoutuFeature(`./price-reliability.js?v=${encodeURIComponent(version)}`,'soutu-price-reliability');
  loadSoutuFeature(`./competitor-intelligence-ui.js?v=${encodeURIComponent(version)}`,'soutu-competitor-intelligence-ui');
  loadSoutuFeature(`./competitor-intelligence.js?v=${encodeURIComponent(version)}`,'soutu-competitor-intelligence');
  loadSoutuFeature(`./price-history.js?v=${encodeURIComponent(version)}`,'soutu-price-history');
  loadSoutuFeature(`./provenance-lineage.js?v=${encodeURIComponent(version)}`,'soutu-provenance-lineage');
  loadSoutuFeature(`./verification-audit.js?v=${encodeURIComponent(version)}`,'soutu-verification-audit');
  loadSoutuFeature(`./evidence-verification.js?v=${encodeURIComponent(version)}`,'soutu-evidence-verification');
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadSoutuFeatures,{once:true});else loadSoutuFeatures();