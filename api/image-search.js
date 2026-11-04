import dns from 'node:dns/promises';
import net from 'node:net';

const publicUrl=value=>{try{const u=new URL(value);return /^https?:$/.test(u.protocol)&&!u.username&&!u.password?u.href:''}catch{return ''}};
function publicIp(ip){
  if(net.isIP(ip)===4){const p=ip.split('.').map(Number);return !([0,10,127].includes(p[0])||(p[0]===169&&p[1]===254)||(p[0]===172&&p[1]>=16&&p[1]<=31)||(p[0]===192&&p[1]===168)||(p[0]===100&&p[1]>=64&&p[1]<=127)||p[0]>=224)}
  return net.isIP(ip)===6&&/^[23][0-9a-f]{3}:/i.test(ip);
}
export async function validateImageUrl(value,lookup=dns.lookup){
  const raw=typeof value==='string'&&value.length<=4096?publicUrl(value):'';
  if(!raw)throw new Error('Invalid image URL');
  const u=new URL(raw),host=u.hostname.replace(/^\[|\]$/g,'');
  if(host==='localhost'||host.endsWith('.localhost')||host.endsWith('.local')||!host.includes('.')&&!net.isIP(host))throw new Error('Private host');
  const records=net.isIP(host)?[{address:host}]:await lookup(host,{all:true,verbatim:true});
  if(!records.length||records.some(r=>!publicIp(r.address)))throw new Error('Private host');
  return raw;
}
function send(res,status,data){res.setHeader('Cache-Control','no-store');return res.status(status).json(data)}

// Missing configuration must never substitute text results for image matches.
export default async function handler(req,res){
  if(req.method==='GET')return send(res,200,{enabled:!!process.env.SERPAPI_KEY,provider:'Google Lens',mode:'image'});
  if(req.method!=='POST')return send(res,405,{enabled:false,message:'Method not allowed'});
  if(!process.env.SERPAPI_KEY)return send(res,200,{enabled:false,code:'IMAGE_SEARCH_NOT_CONFIGURED',message:'站内视觉检索尚未连接，请使用搜索引擎入口。'});
  let imageUrl;
  try{imageUrl=await validateImageUrl(req.body?.imageUrl)}catch{return send(res,400,{enabled:false,message:'请使用有效的公开图片链接。'})}
  try{
    const url=new URL('https://serpapi.com/search.json');
    url.search=new URLSearchParams({engine:'google_lens',type:'visual_matches',url:imageUrl,api_key:process.env.SERPAPI_KEY});
    const response=await fetch(url,{signal:AbortSignal.timeout(20000)}),data=await response.json();
    if(!response.ok||data.error)throw new Error('Provider unavailable');
    const seen=new Set(),items=(Array.isArray(data.visual_matches)?data.visual_matches:[]).slice(0,60).map(x=>({title:String(x.title||'图片来源').slice(0,240),link:publicUrl(x.link),thumbnail:publicUrl(x.thumbnail),source:String(x.source||'').slice(0,120),matchType:'visual'})).filter(x=>{if(!x.link||seen.has(x.link))return false;seen.add(x.link);return true});
    return send(res,200,{enabled:true,mode:'image',provider:'Google Lens',items,total:items.length});
  }catch{return send(res,502,{enabled:false,message:'视觉检索服务暂不可用，请稍后重试或打开搜索引擎。'})}
}
