import dns from 'node:dns/promises';
import net from 'node:net';

const MAX_HTML = 1_500_000;
function privateIp(ip){if(net.isIP(ip)===4){const p=ip.split('.').map(Number);return p[0]===10||p[0]===127||p[0]===0||(p[0]===169&&p[1]===254)||(p[0]===172&&p[1]>=16&&p[1]<=31)||(p[0]===192&&p[1]===168)||(p[0]===100&&p[1]>=64&&p[1]<=127)||(p[0]>=224)}if(net.isIP(ip)===6){const x=ip.toLowerCase();if(x.startsWith('::ffff:')){const mapped=x.slice(7);if(net.isIP(mapped)===4)return privateIp(mapped);const h=mapped.split(':');if(h.length===2){const hi=parseInt(h[0],16),lo=parseInt(h[1],16);if(Number.isFinite(hi)&&Number.isFinite(lo))return privateIp(`${hi>>8}.${hi&255}.${lo>>8}.${lo&255}`)}return true}return x==='::1'||x==='::'||x.startsWith('fc')||x.startsWith('fd')||x.startsWith('fe8')||x.startsWith('fe9')||x.startsWith('fea')||x.startsWith('feb')||x.startsWith('ff')}return true}
async function assertSafe(raw){const u=new URL(raw);if(!['http:','https:'].includes(u.protocol))throw new Error('Unsupported URL');const host=u.hostname.replace(/^\[|\]$/g,'');if(host==='localhost'||host.endsWith('.local'))throw new Error('Local host blocked');if(net.isIP(host)){if(privateIp(host))throw new Error('Private target blocked');return u}const ips=await dns.lookup(host,{all:true,verbatim:true});if(!ips.length||ips.some(x=>privateIp(x.address)))throw new Error('Private target blocked');return u;}
async function safeFetch(raw){let cur=raw;for(let i=0;i<4;i++){const u=await assertSafe(cur);const r=await fetch(u,{redirect:'manual',signal:AbortSignal.timeout(12000),headers:{'user-agent':'Mozilla/5.0 (compatible; SoutuPro/9)','accept':'text/html,application/xhtml+xml,application/json;q=0.8,*/*;q=0.5','accept-language':'en-US,en;q=0.8'}});if(r.status>=300&&r.status<400&&r.headers.get('location')){cur=new URL(r.headers.get('location'),u).toString();continue}return r}throw new Error('Too many redirects')}
async function limitedText(r){const reader=r.body?.getReader();if(!reader)return(await r.text()).slice(0,MAX_HTML);let chunks=[],total=0;while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>MAX_HTML)break;chunks.push(value)}return Buffer.concat(chunks.map(x=>Buffer.from(x))).toString('utf8')}
function clean(v=''){return String(v).replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim()}
function productFromJsonLd(html){const rx=/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;let m;while((m=rx.exec(html))){try{const parsed=JSON.parse(m[1]);const stack=Array.isArray(parsed)?parsed:[parsed];for(const obj of stack){const items=obj?.['@graph']||[obj];for(const p of items){const types=Array.isArray(p?.['@type'])?p['@type']:[p?.['@type']];if(types.some(x=>String(x).toLowerCase()==='product')){const offer=Array.isArray(p.offers)?p.offers[0]:p.offers||{};return{name:p.name||'',brand:typeof p.brand==='string'?p.brand:p.brand?.name||'',sku:p.sku||'',mpn:p.mpn||'',gtin:p.gtin13||p.gtin12||p.gtin14||p.gtin||'',model:p.model||'',price:offer.price??p.price??'',currency:offer.priceCurrency||'',availability:offer.availability||'',image:Array.isArray(p.image)?p.image[0]:p.image||''}}}}}catch{}}return null}
function decodeText(value=''){
  return clean(String(value).replace(/&quot;/gi,'"').replace(/&apos;|&#39;/gi,"'").replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&#(x[0-9a-f]+|[0-9]+);/gi,(match,code)=>{const point=code[0].toLowerCase()==='x'?parseInt(code.slice(1),16):parseInt(code,10);return Number.isInteger(point)&&point>=0&&point<=0x10ffff?String.fromCodePoint(point):match}));
}
function pageMetadata(html,base){
  const meta={};
  for(const tag of html.match(/<meta\b[^>]*>/gi)||[]){
    const attrs={};for(const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g))attrs[match[1].toLowerCase()]=match[2]??match[3]??'';
    const key=String(attrs.property||attrs.name||'').toLowerCase();if(key&&!meta[key])meta[key]=attrs.content||'';
  }
  const safeImage=value=>{if(!value)return '';try{const u=new URL(value,base);return /^https?:$/.test(u.protocol)&&!u.username&&!u.password?u.href:''}catch{return''}};
  return{title:decodeText(meta['og:title']||meta['twitter:title']||(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]||'').slice(0,320),description:decodeText(meta['og:description']||meta.description||meta['twitter:description']||'').slice(0,700),image:safeImage(decodeText(meta['og:image']||meta['twitter:image']||'')),publishedAt:meta['article:published_time']||meta['datepublished']||''};
}
export {pageMetadata,productFromJsonLd};
export default async function handler(req,res){
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
  const raw=String(req.query?.url||'');if(!raw||raw.length>4096)return res.status(400).json({error:'Invalid url'});
  try{
    const r=await safeFetch(raw),html=await limitedText(r),finalUrl=r.url||raw,metadata=pageMetadata(html,finalUrl),product=productFromJsonLd(html)||{};
    const rawImage=typeof product.image==='string'?product.image:product.image?.url||product.image?.contentUrl||'';
    if(rawImage)try{const u=new URL(rawImage,finalUrl);product.image=/^https?:$/.test(u.protocol)?u.href:''}catch{product.image=''}
    let price=product.price!==''&&product.price!=null?`${product.price}${product.currency?` ${product.currency}`:''}`:'',priceSource=price?'structured-product':'';
    if(!price){const match=html.match(/(?:\$|US\$|£|€|¥|C\$|A\$)\s?\d[\d,.]*(?:\.\d{2})?/);if(match){price=clean(match[0]);priceSource='page-text'}}
    res.setHeader('Cache-Control','no-store');
    return res.status(200).json({alive:r.ok,status:r.status,...metadata,title:product.name?decodeText(product.name):metadata.title,image:product.image||metadata.image,price,priceSource,product,checkedAt:Date.now(),finalUrl});
  }catch(error){return res.status(200).json({alive:false,status:0,error:error?.message||'Unable to check',checkedAt:Date.now()})}
}
