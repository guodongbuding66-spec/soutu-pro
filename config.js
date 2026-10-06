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
  const version=document.querySelector('meta[name="soutu-version"]')?.content||'9.3.1';
  loadSoutuFeature(`./price-intelligence.js?v=${encodeURIComponent(version)}`,'soutu-price-intelligence');
  loadSoutuFeature(`./price-history.js?v=${encodeURIComponent(version)}`,'soutu-price-history');
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadSoutuFeatures,{once:true});else loadSoutuFeatures();