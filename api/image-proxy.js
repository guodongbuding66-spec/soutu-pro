import dns from 'node:dns/promises';
import net from 'node:net';

const MAX_BYTES = 8 * 1024 * 1024;

function privateIp(ip) {
  if (net.isIP(ip) === 4) {
    const p=ip.split('.').map(Number);
    return p[0]===10||p[0]===127||p[0]===0||(p[0]===169&&p[1]===254)||(p[0]===172&&p[1]>=16&&p[1]<=31)||(p[0]===192&&p[1]===168)||(p[0]===100&&p[1]>=64&&p[1]<=127)||(p[0]>=224);
  }
  if (net.isIP(ip) === 6) {
    const x=ip.toLowerCase();
    if(x.startsWith('::ffff:')){
      const mapped=x.slice(7);
      if(net.isIP(mapped)===4)return privateIp(mapped);
      const hex=mapped.split(':');
      if(hex.length===2){
        const hi=parseInt(hex[0],16),lo=parseInt(hex[1],16);
        if(Number.isFinite(hi)&&Number.isFinite(lo))return privateIp(`${hi>>8}.${hi&255}.${lo>>8}.${lo&255}`);
      }
      return true;
    }
    return x==='::1'||x==='::'||x.startsWith('fc')||x.startsWith('fd')||x.startsWith('fe8')||x.startsWith('fe9')||x.startsWith('fea')||x.startsWith('feb')||x.startsWith('ff');
  }
  return true;
}
async function assertSafe(raw){const u=new URL(raw);if(!['http:','https:'].includes(u.protocol))throw new Error('Unsupported URL scheme');const host=u.hostname.replace(/^\[|\]$/g,'');if(['localhost','localhost.localdomain'].includes(host)||host.endsWith('.local'))throw new Error('Local hosts are blocked');if(net.isIP(host)){if(privateIp(host))throw new Error('Private network targets are blocked');return u}const records=await dns.lookup(host,{all:true,verbatim:true});if(!records.length||records.some(r=>privateIp(r.address)))throw new Error('Private network targets are blocked');return u;}
async function safeFetch(raw){let current=raw;for(let i=0;i<4;i++){const u=await assertSafe(current);const r=await fetch(u,{redirect:'manual',signal:AbortSignal.timeout(12000),headers:{'user-agent':'Mozilla/5.0 (compatible; SoutuPro/9)','accept':'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'}});if(r.status>=300&&r.status<400&&r.headers.get('location')){current=new URL(r.headers.get('location'),u).toString();continue}return r}throw new Error('Too many redirects');}

export default async function handler(req,res){
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
  const raw=String(req.query?.url||'');if(!raw||raw.length>4096)return res.status(400).json({error:'Invalid url'});
  try{
    const r=await safeFetch(raw);if(!r.ok)return res.status(r.status).json({error:`Upstream ${r.status}`});
    const type=(r.headers.get('content-type')||'').split(';')[0].trim();if(!type.startsWith('image/'))return res.status(415).json({error:'URL is not an image'});
    const len=Number(r.headers.get('content-length')||0);if(len>MAX_BYTES)return res.status(413).json({error:'Image too large'});
    const buf=Buffer.from(await r.arrayBuffer());if(buf.length>MAX_BYTES)return res.status(413).json({error:'Image too large'});
    res.setHeader('Content-Type',type);res.setHeader('Content-Length',String(buf.length));res.setHeader('Cache-Control','public, max-age=600, s-maxage=1800, stale-while-revalidate=86400');res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('X-Content-Type-Options','nosniff');return res.status(200).send(buf);
  }catch(e){return res.status(400).json({error:e?.message||'Unable to fetch image'});}
}