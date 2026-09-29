import { issueSignedToken, presignUrl } from '@vercel/blob';

const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64');

export default async function handler(req,res){
  if(req.method!=='GET')return res.status(405).json({ok:false});
  try{
    const hasToken=!!process.env.BLOB_READ_WRITE_TOKEN;
    const hasOidc=!!process.env.VERCEL_OIDC_TOKEN&&!!process.env.BLOB_STORE_ID;
    const auth=hasToken?{token:process.env.BLOB_READ_WRITE_TOKEN}:hasOidc?{oidcToken:process.env.VERCEL_OIDC_TOKEN,storeId:process.env.BLOB_STORE_ID}:null;
    if(!auth)return res.status(503).json({ok:false,stage:'credentials'});
    const pathname=`qa/${Date.now()}-${crypto.randomUUID()}.png`,now=Date.now();
    const token=await issueSignedToken({...auth,pathname,operations:['put','get','delete'],validUntil:now+10*60_000,allowedContentTypes:['image/png'],maximumSizeInBytes:1024});
    const putUrl=(await presignUrl(token,{pathname,operation:'put',access:'private',validUntil:now+5*60_000,allowedContentTypes:['image/png'],maximumSizeInBytes:1024,addRandomSuffix:false,allowOverwrite:true})).presignedUrl;
    const getUrl=(await presignUrl(token,{pathname,operation:'get',access:'private',validUntil:now+5*60_000,useCache:false})).presignedUrl;
    const delUrl=(await presignUrl(token,{pathname,operation:'delete',access:'private',validUntil:now+5*60_000})).presignedUrl;
    const p=await fetch(putUrl,{method:'PUT',headers:{'content-type':'image/png'},body:PNG});if(!p.ok)throw new Error(`PUT ${p.status}`);
    const g=await fetch(getUrl,{cache:'no-store'});if(!g.ok)throw new Error(`GET ${g.status}`);const bytes=(await g.arrayBuffer()).byteLength;
    const d=await fetch(delUrl,{method:'DELETE'});if(!d.ok)throw new Error(`DELETE ${d.status}`);
    return res.status(200).json({ok:true,authMode:hasToken?'token':'oidc',put:true,get:true,delete:true,bytes});
  }catch(e){return res.status(500).json({ok:false,error:e?.message||'self-test failed'})}
}
