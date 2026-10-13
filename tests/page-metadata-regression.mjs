import assert from 'node:assert/strict';
import dns from 'node:dns/promises';
import handler,{pageMetadata,productFromJsonLd} from '../api/url-status.js';
const html='<html><title>Fallback title</title><meta content="Storage &amp; Garden" property="og:title"><meta name="description" content="Public product details"><meta property="og:image" content="/images/shed.jpg"><meta property="article:published_time" content="2025-05-01T00:00:00Z"><script type="application/ld+json">{"@graph":[{"@type":"Organization","name":"ACME"},{"@type":"Product","name":"Garden Shed","sku":"SH-100","brand":{"name":"ACME"},"image":{"url":"/images/product.jpg"},"offers":{"price":"199","priceCurrency":"EUR"}}]}</script></html>';
assert.deepEqual(pageMetadata(html,'https://shop.example.com/products/shed'),{title:'Storage & Garden',description:'Public product details',image:'https://shop.example.com/images/shed.jpg',publishedAt:'2025-05-01T00:00:00Z'});
assert.equal(pageMetadata('<title>No image</title>','https://example.com/').image,'');
assert.equal(pageMetadata('<meta property="og:image" content="javascript:alert(1)">','https://example.com/').image,'');
assert.equal(productFromJsonLd(html).sku,'SH-100');
const originalFetch=globalThis.fetch,originalLookup=dns.lookup;
function response(){return{statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v},status(n){this.statusCode=n;return this},json(value){this.body=value;return this}}}
try{
  dns.lookup=async()=>[{address:'93.184.216.34',family:4}];
  globalThis.fetch=async()=>new Response(html,{status:200,headers:{'content-type':'text/html'}});
  const res=response();await handler({method:'GET',query:{url:'https://shop.example.com/products/shed'}},res);
  assert.equal(res.body.title,'Garden Shed');assert.equal(res.body.image,'https://shop.example.com/images/product.jpg');assert.equal(res.body.price,'199 EUR');assert.equal(res.body.priceSource,'structured-product');assert.equal(res.body.alive,true);
  let requested=false;globalThis.fetch=async()=>{requested=true;throw new Error('unexpected request')};
  const blocked=response();await handler({method:'GET',query:{url:'http://127.0.0.1/private'}},blocked);assert.equal(blocked.body.alive,false);assert.equal(requested,false);assert.match(blocked.body.error,/Private/);
}finally{globalThis.fetch=originalFetch;dns.lookup=originalLookup}
console.log('Public page metadata, product structure and blocked-target regression passed');
